// frontend/src/pages/Feed.js
import React, { useEffect, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import PostCard from '../components/PostCard';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader';
import InfiniteScroll from 'react-infinite-scroll-component';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaImage, FaVideo, FaTimes, FaArrowUp } from 'react-icons/fa';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [postVideo, setPostVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const { auth } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Listen to window scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Log socket instance for debugging
  useEffect(() => {
    console.log('Socket Instance:', socket);
  }, [socket]);

  // Setup Socket.IO listeners
  useEffect(() => {
    if (socket) {
      if (socket.connected) {
        socket.emit('joinFeed');
      } else {
        socket.on('connect', () => {
          socket.emit('joinFeed');
        });
      }

      socket.on('postCreated', (newPost) => {
        setPosts((prevPosts) => [newPost, ...prevPosts]);
        toast.success('New post created!');
      });

      socket.on('commentAdded', ({ postId, total }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, commentCount: total } : post
          )
        );
      });

      socket.on('commentDeleted', ({ postId, total }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId ? { ...post, commentCount: total } : post
          )
        );
      });

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

      socket.on('postDeleted', (deletedPostId) => {
        setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
      });

      socket.on('postUpdated', ({ postId, content, image_url, video_url }) => {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, content, image_url, video_url }
              : post
          )
        );
      });

      return () => {
        socket.off('postCreated');
        socket.off('commentAdded');
        socket.off('commentDeleted');
        socket.off('postLikeUpdated');
        socket.off('postDeleted');
        socket.off('postUpdated');
      };
    }
  }, [socket, auth.user?.id]);

  // Fetch posts on mount and when token changes
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  // Handler for selecting an image file
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

  // Handler for selecting a video file
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video must be less than 50MB');
        return;
      }
      if (!file.type.startsWith('video/')) {
        toast.error('Only video files are allowed');
        return;
      }
      setPostVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = useCallback(() => {
    setPostImage(null);
    setImagePreview(null);
  }, []);

  const removeVideo = useCallback(() => {
    setPostVideo(null);
    setVideoPreview(null);
  }, []);

  // Create a new post (with text, image, and/or video)
  const handleCreatePost = async () => {
    if (!newPost.trim() && !postImage && !postVideo) {
      toast.warning('Post must have text, an image, or a video.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', newPost);
      if (postImage) formData.append('image', postImage);
      if (postVideo) formData.append('video', postVideo);

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

      // Emit new post event via socket
      socket.emit('newPost', res.data.post);

      // Reset form states
      setNewPost('');
      setPostImage(null);
      setImagePreview(null);
      setPostVideo(null);
      setVideoPreview(null);
      toast.success('Post created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating post.');
    }
  };

  // Fetch posts from backend with pagination
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
          // Avoid duplicate posts
          const newPosts = fetchedPosts.filter(
            (fetchedPost) =>
              !prev.some((prevPost) => prevPost.id === fetchedPost.id)
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

  // Load more posts (for infinite scroll)
  const fetchMoreData = () => {
    const nextPage = page + 1;
    fetchPosts(nextPage);
    setPage(nextPage);
  };

  // Update local post when liked/unliked
  const handleLike = useCallback((updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  }, []);

  // Delete a post
  const handleDelete = async (deletedPostId) => {
    try {
      await axios.delete(`http://localhost:5000/api/posts/${deletedPostId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      socket.emit('deletePost', deletedPostId);
      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== deletedPostId)
      );
      toast.success('Post deleted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting post');
    }
  };

  // Render prompt for non-authenticated users
  if (!auth.token) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Welcome to DevConnect!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            To view and interact with the developer feed, please log in or register.
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
    <div className="max-w-4xl mx-auto p-4 pt-24">
      {/* Hero Header */}
      <motion.h1
        className="text-5xl font-extrabold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Developer Feed
      </motion.h1>

      {/* New Post Creation Section */}
      {auth.token && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg"
        >
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Create a Post
          </h2>
          <textarea
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-600 text-gray-800 dark:text-gray-200 transition-all duration-200"
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

          {/* Media Upload Buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
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

            <label className="cursor-pointer flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">
              <FaVideo />
              <span>Add Video</span>
              <input
                type="file"
                className="hidden"
                accept="video/*"
                onChange={handleVideoSelect}
              />
            </label>

            <button
              onClick={handleCreatePost}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-all"
              aria-label="Create Post"
            >
              Post
            </button>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <motion.div
              className="mt-4 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 rounded-lg object-cover w-full"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove Image"
              >
                <FaTimes />
              </button>
            </motion.div>
          )}

          {/* Video Preview */}
          {videoPreview && (
            <motion.div
              className="mt-4 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <video
                src={videoPreview}
                controls
                className="max-h-64 rounded-lg w-full"
              >
                Your browser does not support the video tag.
              </video>
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove Video"
              >
                <FaTimes />
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Posts Feed with Infinite Scroll */}
      <InfiniteScroll
        dataLength={posts.length}
        next={fetchMoreData}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center py-4">
            <ClipLoader color="#3b82f6" loading={loading} size={35} />
          </div>
        }
        endMessage={
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
            Yay! You have seen it all.
          </p>
        }
      >
        <div className="grid gap-6">
          <AnimatePresence>
            {posts.length > 0 ? (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
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

      {/* Back to Top Button */}
      {showBackToTop && (
        <motion.button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-label="Back to Top"
        >
          <FaArrowUp />
        </motion.button>
      )}
    </div>
  );
}
