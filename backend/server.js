/*******************************************************
 * server.js - Full DevConnect Backend with Socket.io
 *******************************************************/
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
// NEW: Import http and socket.io
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const app = express();

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using the current timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Extract the file extension
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const fileFilter = (req, file, cb) => {
  if (IMAGE_MIME_TYPES.includes(file.mimetype) || VIDEO_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only image and video files are allowed'));
};

// Initialize Multer with storage and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for videos
  fileFilter: fileFilter
});

// 2) JWT Auth Middleware
async function getLikeCount(postId) {
  return await pool.query(
    'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
    [postId]
  );
}
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    // Fetch user details to check if banned
    const [rows] = await pool.query('SELECT is_banned, role FROM users WHERE id = ?', [decoded.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    if (user.is_banned) {
      return res.status(403).json({ message: 'You have been banned from this platform' });
    }

    req.user = { userId: decoded.userId, role: user.role };
    next();
  });
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
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

    // Create JWT including role
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role, // Include role in response
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
    res.json(rows[0]); // Includes 'profile_picture' field
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* admin routes and privileges */

/**
 * Ban a User
 * POST /api/admin/users/:id/ban
 */
app.post('/api/admin/users/:id/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.query('UPDATE users SET is_banned = TRUE WHERE id = ?', [userId]);
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Unban a User
 * POST /api/admin/users/:id/unban
 */
app.post('/api/admin/users/:id/unban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.query('UPDATE users SET is_banned = FALSE WHERE id = ?', [userId]);
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Promote a User to Admin
 * POST /api/admin/users/:id/promote
 */
app.post('/api/admin/users/:id/promote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    await pool.query('UPDATE users SET role = "admin" WHERE id = ?', [userId]);
    res.json({ message: 'User promoted to admin successfully' });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Demote an Admin to User
 * POST /api/admin/users/:id/demote
 */
app.post('/api/admin/users/:id/demote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    // Prevent demoting yourself
    if (userId == req.user.userId) {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }
    await pool.query('UPDATE users SET role = "user" WHERE id = ?', [userId]);
    res.json({ message: 'User demoted to regular user successfully' });
  } catch (error) {
    console.error('Demote user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Create or Update profile
 * POST /api/profile
 */

/**
 * Create or Update profile with profile picture
 * POST /api/profile
 */
app.post('/api/profile', authMiddleware, upload.single('profile_picture'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio, skills, github_link } = req.body;
    let profilePicturePath = null;

    if (req.file) {
      // Assuming the server serves static files from '/uploads'
      profilePicturePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (rows.length > 0) {
      // Update existing profile
      await pool.query(
        'UPDATE profiles SET bio=?, skills=?, github_link=?, profile_picture=? WHERE user_id=?',
        [bio, skills, github_link, profilePicturePath || rows[0].profile_picture, userId]
      );
      return res.json({ message: 'Profile updated' });
    } else {
      // Create new profile
      await pool.query(
        'INSERT INTO profiles (user_id, bio, skills, github_link, profile_picture) VALUES (?,?,?,?,?)',
        [userId, bio, skills, github_link, profilePicturePath]
      );
      return res.status(201).json({ message: 'Profile created' });
    }
  } catch (error) {
    console.error('Upsert profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get All Users (Admin Only)
 * GET /api/admin/users
 */
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, email, role, is_banned, is_muted
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all profiles (public)
 * GET /api/profile
 */
app.get('/api/profile', async (req, res) => {
  try {
    const search = req.query.search || '';
    const [rows] = await pool.query(`
      SELECT p.profile_picture, u.username, p.bio, p.skills, p.github_link
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.skills LIKE ? OR u.username LIKE ?
    `, [`%${search}%`, `%${search}%`]);    

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
app.post('/api/posts', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { content } = req.body;
    
    if (!content.trim() && !req.files.image && !req.files.video) {
      return res.status(400).json({ message: 'Post must have content, an image, or a video' });
    }

    let imageUrl = null;
    let videoUrl = null;

    if (req.files.image) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.image[0].filename}`;
    }

    if (req.files.video) {
      videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.video[0].filename}`;
    }

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content, image_url, video_url) VALUES (?, ?, ?, ?)',
      [userId, content, imageUrl, videoUrl]
    );
    
    // Fetch the created post with additional data
    const [rows] = await pool.query(`
      SELECT 
        p.id, 
        p.user_id, 
        p.content,
        p.image_url,
        p.video_url,
        p.created_at, 
        u.username,
        pr.profile_picture, 
        COUNT(l.post_id) AS likeCount,
        0 AS isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN likes l ON l.post_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [result.insertId]);

    res.status(201).json({ message: 'Post created', post: rows[0] });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Edit Post Route
app.put('/api/posts/:id', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content.trim()) {
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

    let imageUrl = rows[0].image_url;
    let videoUrl = rows[0].video_url;

    if (req.files.image) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.image[0].filename}`;
    }

    if (req.files.video) {
      videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.files.video[0].filename}`;
    }

    // Perform update
    await pool.query(
      'UPDATE posts SET content=?, image_url=?, video_url=? WHERE id=?',
      [content, imageUrl, videoUrl, postId]
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
// In the POST /api/posts/:id/like endpoint:
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if already liked
      const [exists] = await connection.query(
        'SELECT id FROM likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      if (exists.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: 'Already liked' });
      }

      // Add like
      await connection.query(
        'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
        [postId, userId]
      );

      // Get updated count
      const [countResult] = await connection.query(
        'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
        [postId]
      );

      await connection.commit();
      connection.release();

      // Emit socket event with accurate count
      io.emit('postLikeUpdated', {
        postId,
        userId,
        action: 'like',
        likeCount: countResult[0].count
      });

      res.json({ 
        message: 'Post liked!',
        likeCount: countResult[0].count
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/chat/clear', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM chat_messages');
    // Notify all connected clients to clear their chat
    io.emit('chatCleared');
    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// server.js (Fix in DELETE /api/comments/:id)
app.delete('/api/comments/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const commentId = req.params.id;

    // Check if user owns the comment or the post
    const [rows] = await pool.query(`
      SELECT c.*, p.user_id as post_owner_id 
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `, [commentId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = rows[0];
    if (comment.user_id !== userId && comment.post_owner_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    const postId = comment.post_id;

    // Delete the comment
    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

    // Get updated comment count
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
      [postId]
    );

    // Emit commentDeleted event to all clients
    io.emit('commentDeleted', {
      postId,
      commentId,
      total: countRows[0].total
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete Specific Chat Message
 * DELETE /api/admin/chat/message/:id
 */
app.delete('/api/admin/chat/message/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const messageId = req.params.id;
    // Check if message exists
    const [rows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }
    // Delete the message
    await pool.query('DELETE FROM chat_messages WHERE id = ?', [messageId]);
    // Notify all clients to remove the message
    io.emit('chatMessageDeleted', { id: messageId });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
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
    io.emit('postLikeUpdated', {
      postId,
      userId,
      action: 'unlike',
      likeCount: (await getLikeCount(postId))[0].count
    });
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
// server.js (Partial Corrections)

app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT 
        p.*, 
        u.username, 
        pr.profile_picture,
        p.image_url,
        p.video_url,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json(rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/posts/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(`
      SELECT 
        p.*,
        u.username,
        pr.profile_picture,
        p.image_url,
        p.video_url,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
        CASE WHEN EXISTS (
          SELECT 1 FROM likes l2 
          WHERE l2.post_id = p.id AND l2.user_id = ?
        ) THEN 1 ELSE 0 END AS isLiked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

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
// server.js (Delete Post Route Optimization)

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verify post ownership
      const [rows] = await connection.query(
        'SELECT * FROM posts WHERE id = ? AND user_id = ?', 
        [postId, userId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(403).json({ message: 'Not authorized or post not found' });
      }

      // Delete the post (cascade will handle likes and comments)
      await connection.query('DELETE FROM posts WHERE id = ?', [postId]);

      // Commit transaction
      await connection.commit();
      connection.release();

      res.json({ message: 'Post deleted successfully' });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
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
// In server.js, update the create comment endpoint

// server.js (Consistency in POST /api/comments)

// Replace the existing POST /api/comments endpoint with this:
app.post('/api/comments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, content } = req.body;
    
    if (!postId || !content) {
      return res.status(400).json({ message: 'Post ID and content are required' });
    }

    // Check if the post exists
    const [postRows] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Insert the comment
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content]
    );

    // Fetch the created comment with user details and profile picture
    const [commentRows] = await pool.query(`
      SELECT 
        c.*, 
        u.username,
        p.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.id = ?
    `, [result.insertId]);

    // Get updated comment count
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
      [postId]
    );

    // Use io instead of socket to emit the event to all clients
    io.emit('commentAdded', {
      postId,
      comment: commentRows[0],
      total: countRows[0].total
    });

    res.status(201).json({ 
      message: 'Comment created',
      comment: commentRows[0],
      total: countRows[0].total
    });
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count of comments
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
      [postId]
    );
    const total = countRows[0].total;

    // Fetch comments with user details
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        u.username,
        p.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [postId, limit, offset]);

    res.json({
      comments: rows,
      total,
      hasMore: offset + rows.length < total
    });
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

io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.emit('error', 'No token provided');
    socket.disconnect();
    return;
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      socket.emit('error', 'Invalid token');
      socket.disconnect();
      return;
    }
    try {
      // Fetch user details
      const [rows] = await pool.query('SELECT username, is_banned, role FROM users WHERE id = ?', [decoded.userId]);
      const user = rows[0];
      if (!user) {
        socket.emit('error', 'User not found');
        socket.disconnect();
        return;
      }
      if (user.is_banned) {
        socket.emit('error', 'You have been banned from this platform');
        socket.disconnect();
        return;
      }

      // Attach user info to socket
      socket.user = { id: decoded.userId, role: user.role, username: user.username };

      // Send existing chat history to the newly connected client
      try {
        // Fetch chat messages along with user profile pictures
        const [chatRows] = await pool.query(`
          SELECT cm.*, u.username, p.profile_picture
          FROM chat_messages cm
          JOIN users u ON cm.user = u.username
          LEFT JOIN profiles p ON u.id = p.user_id
          ORDER BY cm.created_at ASC
        `);
        socket.emit('chatHistory', chatRows);
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }

      // Handle chatMessage
      socket.on('chatMessage', async (msg) => {
        if (!socket.user) return;

        try {
          // Fetch the user's profile picture
          const [userRows] = await pool.query(`
            SELECT p.profile_picture
            FROM users u
            JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
            LIMIT 1
          `, [socket.user.id]);

          let profilePicture = null;
          if (userRows.length > 0) {
            profilePicture = userRows[0].profile_picture;
          }

          // Check if the user is muted
          const [muteRows] = await pool.query('SELECT is_muted FROM users WHERE id = ?', [socket.user.id]);
          if (muteRows[0].is_muted) {
            socket.emit('error', 'You are muted and cannot send messages');
            return;
          }

          // Insert the new message into 'chat_messages'
          const [result] = await pool.query(
            'INSERT INTO chat_messages (user, text, time) VALUES (?, ?, ?)',
            [socket.user.username, msg.text, msg.time]
          );

          // Prepare the message object with profile_picture
          const messageWithPicture = {
            id: result.insertId,
            user: socket.user.username,
            text: msg.text,
            time: msg.time,
            profile_picture: profilePicture, // Can be null if not set
          };

          // Broadcast to everyone
          io.emit('chatMessage', messageWithPicture);
        } catch (err) {
          console.error('Error inserting chat message:', err);
        }
      });

      // Listen for "typing"
      socket.on('typing', (username) => {
        socket.broadcast.emit('userTyping', username);
      });

      // Handle clearChat
      socket.on('clearChat', () => {
        if (socket.user.role !== 'admin') {
          socket.emit('error', 'Access denied: Admins only');
          return;
        }

        // Clear chat messages in the database
        pool.query('DELETE FROM chat_messages')
          .then(() => {
            // Notify all clients to clear their chat
            io.emit('chatCleared');
            // Optionally, log this action
            console.log(`Chat cleared by admin user ID: ${socket.user.id}`);
          })
          .catch((err) => {
            console.error('Error clearing chat via Socket.io:', err);
            socket.emit('error', 'Failed to clear chat');
          });
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      socket.emit('error', 'Server error');
      socket.disconnect();
    }
  });
// Add these inside the connection handler, after the existing chat socket events
socket.on('joinFeed', () => {
  socket.join('feed');
});

socket.on('newPost', (post) => {
  io.to('feed').emit('postCreated', post);
});

socket.on('postLiked', async ({ postId, userId, action }) => {
  try {
    // Fetch updated like count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
      [postId]
    );

    // Broadcast to all other clients except the sender
    socket.broadcast.emit('postLikeUpdated', {
      postId,
      userId,
      action,
      likeCount: countResult[0].count
    });
  } catch (error) {
    console.error('Error handling postLiked event:', error);
  }
});

socket.on('newComment', async ({ postId, comment }) => {
  try {
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
      [postId]
    );

    io.emit('commentAdded', {
      postId,
      comment,
      total: countRows[0].total
    });
  } catch (error) {
    console.error('Error handling newComment event:', error);
  }
});

// In your server.js socket connection handler, update the deleteComment event handler

socket.on('deleteComment', async ({ postId, commentId }) => {
  try {
    // Get updated comment count after deletion
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE post_id = ?',
      [postId]
    );

    // Emit to all clients including sender
    io.emit('commentDeleted', {
      postId,
      commentId,
      total: countRows[0].total
    });
  } catch (error) {
    console.error('Error handling deleteComment event:', error);
  }
});

socket.on('deletePost', (postId) => {
  // Broadcast to all other clients except the sender
  socket.broadcast.emit('postDeleted', postId);
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
