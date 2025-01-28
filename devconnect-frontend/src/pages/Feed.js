// frontend/src/pages/Feed.js

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext'; // Import SocketContext
import PostCard from '../components/PostCard';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import InfiniteScroll from 'react-infinite-scroll-component';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaImage, FaTimes } from 'react-icons/fa';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const { auth } = useContext(AuthContext);
  const socket = useContext(SocketContext); // Use centralized socket
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Socket.IO setup
  useEffect(() => {
    if (socket) {
      // Join feed room for real-time updates
      socket.emit('joinFeed');

// Listen for new posts
socket.on('postCreated', (newPost) => {
  setPosts((prevPosts) => [newPost, ...prevPosts]);
  toast.success('New post created!');
});
socket.on('commentAdded', ({ postId, total }) => {
  setPosts(prevPosts => 
    prevPosts.map(post => 
      post.id === postId 
        ? { ...post, commentCount: total }
        : post
    )
  );
});

socket.on('commentDeleted', ({ postId, total }) => {
  setPosts(prevPosts => 
    prevPosts.map(post => 
      post.id === postId 
        ? { ...post, commentCount: total }
        : post
    )
  );
});
      // Listen for post likes
      socket.on('postLikeUpdated', ({ postId, userId, action, likeCount }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === postId) {
              let updatedLikeCount = post.likeCount;
              let isLiked = post.isLiked;
              if (action === 'like') {
                updatedLikeCount += 1;
                if (userId === auth.user?.id) isLiked = 1;
              } else if (action === 'unlike') {
                updatedLikeCount -= 1;
                if (userId === auth.user?.id) isLiked = 0;
              }
              return { ...post, likeCount: updatedLikeCount, isLiked };
            }
            return post;
          })
        );
      });

      // Listen for post deletions
      socket.on('postDeleted', (deletedPostId) => {
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
      });

      // Listen for post updates
      socket.on('postUpdated', ({ postId, content, image_url }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id === postId) {
              return { ...post, content, image_url };
            }
            return post;
          })
        );
      });

      // Cleanup event listeners on unmount
      return () => {
        socket.off('postCreated');
        socket.off('postLikeUpdated');
        socket.off('postDeleted');
        socket.off('postUpdated');
        socket.off('commentAdded');
        socket.off('commentDeleted');
      };
    }
  }, [socket, auth.user?.id]);

  // Initial posts fetch
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      if (!file.type.match('image.*')) {
        toast.error('Only image files are allowed');
        return;
      }
      setPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setPostImage(null);
    setImagePreview(null);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !postImage) {
      toast.warning('Post must have either text content or an image.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', newPost);
      if (postImage) {
        formData.append('image', postImage);
      }
  

      const res = await axios.post(
        'http://localhost:5000/api/posts',
        formData,
  
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
  
      socket.emit('newPost', res.data.post);
      // No need to manually add the post; Socket.io will handle it

      setNewPost('');
      setPostImage(null);
      setImagePreview(null);
      toast.success('Post created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating post.');
    }
  };

  const fetchPosts = async (currentPage = 1) => {
    setLoading(true);
    try {
      const endpoint = auth.token
        ? `http://localhost:5000/api/posts/me?page=${currentPage}`
        : `http://localhost:5000/api/posts?page=${currentPage}`;

      const config = auth.token
        ? { headers: { Authorization: `Bearer ${auth.token}` } }
        : {};

      const res = await axios.get(endpoint, config);
      const fetchedPosts = res.data;

      if (fetchedPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => {
          const newPosts = fetchedPosts.filter(
            (fetchedPost) => !prev.some((prevPost) => prevPost.id === fetchedPost.id)
          );
          return currentPage === 1 ? fetchedPosts : [...prev, ...newPosts];
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading posts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreData = () => {
    const nextPage = page + 1;
    fetchPosts(nextPage);
    setPage(nextPage);
  };

  const handleLike = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  const handleDelete = async (deletedPostId) => {
    try {
      await axios.delete(`http://localhost:5000/api/posts/${deletedPostId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      // Emit delete event
      socket.emit('deletePost', deletedPostId);

      // Update local state
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
      toast.success('Post deleted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting post');
    }
  };

  if (!auth.token) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Welcome to DevConnect!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            To view and interact with the developer feed, please log in or register an account.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors duration-300"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-24">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-gradient bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Developer Feed
      </h1>

      {auth.token && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white dark:bg-gray-700 p-4 rounded shadow"
        >
          <textarea
            className="border border-gray-300 dark:border-gray-600 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm dark:bg-gray-600 dark:text-gray-200"
            rows="3"
            placeholder="Share something amazing..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            aria-label="New Post Content"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreatePost();
              }
            }}
          />

          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="cursor-pointer flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              <FaImage />
              <span>Add Image</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
            </label>

            <button
              onClick={handleCreatePost}
              className="bg-green-500 text-white px-5 py-2 rounded hover:bg-green-600 transition-all"
              aria-label="Create Post"
            >
              Post
            </button>
          </div>

          {imagePreview && (
            <div className="mt-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-lg"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove Image"
              >
                <FaTimes />
              </button>
            </div>
          )}
        </motion.div>
      )}

      <InfiniteScroll
        dataLength={posts.length}
        next={fetchMoreData}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center">
            <ClipLoader color="#3b82f6" loading={loading} size={30} />
          </div>
        }
        endMessage={
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
            Yay! You have seen it all.
          </p>
        }
      >
        <div className="grid gap-4">
          <AnimatePresence>
            {posts.length > 0 ? (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <PostCard 
                    post={post} 
                    onLike={handleLike} 
                    onDelete={handleDelete}
                    socket={socket} 
                  />
                </motion.div>
              ))
            ) : (
              !loading && (
                <motion.p
                  className="text-center text-gray-500 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No posts available. Be the first to post!
                </motion.p>
              )
            )}
          </AnimatePresence>
        </div>
      </InfiniteScroll>
    </div>
  );
}
