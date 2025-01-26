/*******************************************************
 * server.js - Full DevConnect Backend with Socket.io
 *******************************************************/
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// NEW: Import http and socket.io
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

// 1) Connect to MySQL using Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 2) JWT Auth Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded; // { userId: ... }
    next();
  });
}

/*******************************************************
 * AUTH ROUTES
 *******************************************************/
/**
 * Register a new user
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered', userId: result.insertId });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username or Email already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Login a user
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Find user by email
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials (user not found)' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials (wrong password)' });
    }

    // Create JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/*******************************************************
 * PROFILE ROUTES
 *******************************************************/
/**
 * Get current user's profile (JWT-protected)
 * GET /api/profile/me
 */
app.get('/api/profile/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      return res.json(null);
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create or Update profile
 * POST /api/profile
 */
app.post('/api/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio, skills, github_link } = req.body;

    const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (rows.length > 0) {
      // Update
      await pool.query(
        'UPDATE profiles SET bio=?, skills=?, github_link=? WHERE user_id=?',
        [bio, skills, github_link, userId]
      );
      return res.json({ message: 'Profile updated' });
    } else {
      // Create
      await pool.query(
        'INSERT INTO profiles (user_id, bio, skills, github_link) VALUES (?,?,?,?)',
        [userId, bio, skills, github_link]
      );
      return res.status(201).json({ message: 'Profile created' });
    }
  } catch (error) {
    console.error('Upsert profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all profiles (public)
 * GET /api/profile
 */
app.get('/api/profile', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profiles');
    res.json(rows);
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/*******************************************************
 * POSTS & COMMENTS
 *******************************************************/
/**
 * Create Post
 * POST /api/posts
 */
app.post('/api/posts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    await pool.query('INSERT INTO posts (user_id, content) VALUES (?, ?)', [userId, content]);
    res.status(201).json({ message: 'Post created' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Edit Post
 * PUT /api/posts/:id
 */
app.put('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Check if this post belongs to the user
    const [rows] = await pool.query(
      'SELECT * FROM posts WHERE id=? AND user_id=?',
      [postId, userId]
    );
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized or post not found' });
    }

    // Perform update
    await pool.query(
      'UPDATE posts SET content=? WHERE id=?',
      [content, postId]
    );

    res.json({ message: 'Post updated!' });
  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Like Post
 * POST /api/posts/:id/like
 */
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // 1) Check if the user has already liked this post
    const [rows] = await pool.query(
      'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
    if (rows.length > 0) {
      return res.status(400).json({ message: 'You already liked this post' });
    }

    // 2) Insert into likes table
    await pool.query(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    return res.json({ message: 'Post liked!' });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Unlike Post
 * DELETE /api/posts/:id/like
 */
app.delete('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // Check if user has actually liked the post before
    const [rows] = await pool.query(
      'SELECT * FROM likes WHERE post_id=? AND user_id=?',
      [postId, userId]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }

    // Remove the row from the likes table
    await pool.query(
      'DELETE FROM likes WHERE post_id=? AND user_id=?',
      [postId, userId]
    );
    res.json({ message: 'Post unliked' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all posts
 * GET /api/posts
 */
app.get('/api/posts', async (req, res) => {
  try {
    // We JOIN the "likes" table and GROUP BY post IDs to count how many times each post was liked
    const [rows] = await pool.query(`
      SELECT 
        p.*, 
        u.username, 
        COUNT(l.post_id) AS likeCount
      FROM posts p
      JOIN users u 
        ON p.user_id = u.id
      LEFT JOIN likes l 
        ON l.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get All Posts For Auth'd User (with isLiked)
 * GET /api/posts/me
 */
app.get('/api/posts/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    // We LEFT JOIN to get likeCount
    // Then also LEFT JOIN specifically for this user's like (alias l2)
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.content,
        p.created_at,
        u.username,
        COUNT(l1.post_id) AS likeCount,
        CASE WHEN l2.id IS NOT NULL THEN 1 ELSE 0 END AS isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l1 ON l1.post_id = p.id
      LEFT JOIN likes l2 ON (l2.post_id = p.id AND l2.user_id = ?)
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json(rows);
  } catch (error) {
    console.error('Get posts/me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete a post (must be the owner)
 * DELETE /api/posts/:id
 */
app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    // Verify post ownership
    const [rows] = await pool.query('SELECT * FROM posts WHERE id=? AND user_id=?', [postId, userId]);
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized or post not found' });
    }

    // Start a transaction to ensure atomicity
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete associated likes
      await connection.query('DELETE FROM likes WHERE post_id=?', [postId]);

      // If you have comments, delete them similarly
      // await connection.query('DELETE FROM comments WHERE post_id=?', [postId]);

      // Delete the post
      await connection.query('DELETE FROM posts WHERE id=?', [postId]);

      // Commit the transaction
      await connection.commit();
      res.json({ message: 'Post and associated likes deleted successfully' });
    } catch (transError) {
      // Rollback the transaction in case of error
      await connection.rollback();
      console.error('Transaction error:', transError);
      res.status(500).json({ message: 'Server error during deletion' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create a comment
 * POST /api/comments
 */
app.post('/api/comments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, content } = req.body;
    if (!postId || !content) {
      return res.status(400).json({ message: 'postId and content are required' });
    }
    await pool.query('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [postId, userId, content]);
    res.status(201).json({ message: 'Comment created' });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get comments by post
 * GET /api/comments/:postId
 */
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const [rows] = await pool.query(`
      SELECT c.*, u.username 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id=?
      ORDER BY c.created_at ASC
    `, [postId]);
    res.json(rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/*******************************************************
 * START SERVER WITH SOCKET.IO
 *******************************************************/
// 1. Import http and socket.io (already done at the top)
// 2. Create an HTTP server from the Express app:
const httpServer = http.createServer(app);

// 3. Create the Socket.io server, pass in `httpServer`:
const io = new Server(httpServer, {
  cors: {
    origin: "*", // or your frontend URL, e.g. "http://localhost:3000"
  }
});

// 4. Listen for connections:
io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);

  // 1) Send existing chat history to the *newly connected* client
  try {
    const [rows] = await pool.query('SELECT * FROM chat_messages ORDER BY created_at ASC');
    // We'll send an event like "chatHistory" with all messages
    socket.emit('chatHistory', rows);
  } catch (err) {
    console.error('Error fetching chat history:', err);
  }

  // 2) Listen for new messages
  socket.on('chatMessage', async (msg) => {
    // Insert the new message into 'chat_messages'
    try {
      await pool.query(
        'INSERT INTO chat_messages (user, text, time) VALUES (?, ?, ?)',
        [msg.user, msg.text, msg.time]
      );
      // Once inserted, broadcast to everyone
      io.emit('chatMessage', msg);
    } catch (err) {
      console.error('Error inserting chat message:', err);
    }
  });

  // Listen for "typing"
  socket.on('typing', (username) => {
    socket.broadcast.emit('userTyping', username);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/*******************************************************
 * START SERVER
 *******************************************************/
// 5. Finally, listen on the same port:
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server + Socket.io listening on port ${PORT}`);
});
