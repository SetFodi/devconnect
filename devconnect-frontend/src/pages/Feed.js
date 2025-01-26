// frontend/src/pages/Feed.js

import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { toast } from 'react-toastify';
import ClipLoader from 'react-spinners/ClipLoader'; // For loading spinner
import InfiniteScroll from 'react-infinite-scroll-component';
import { motion, AnimatePresence } from 'framer-motion';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch posts with pagination
  const fetchPosts = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(
        auth.token 
          ? `http://localhost:5000/api/posts/me?page=${currentPage}`
          : `http://localhost:5000/api/posts?page=${currentPage}`,
        auth.token 
          ? { headers: { Authorization: `Bearer ${auth.token}` } }
          : {}
      );
      const fetchedPosts = res.data;

      if (fetchedPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => {
          // Prevent duplication by ensuring unique posts
          const newPosts = fetchedPosts.filter(
            (fetchedPost) => !prev.some((prevPost) => prevPost.id === fetchedPost.id)
          );
          return [...prev, ...newPosts];
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [auth.token]);

  // Handle creating a new post
  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast.warning('Post content cannot be empty.');
      return;
    }
    try {
      const res = await axios.post(
        'http://localhost:5000/api/posts',
        { content: newPost },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setNewPost('');
      toast.success('Post created successfully!');
      // Prepend the new post to the posts list
      const createdPost = res.data.post; // Ensure your backend returns the created post
      setPosts((prev) => [createdPost, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating post.');
    }
  };

  // Fetch more data for InfiniteScroll
  const fetchMoreData = () => {
    const nextPage = page + 1;
    fetchPosts(nextPage);
    setPage(nextPage);
  };

  // Handle liking/unliking a post
  const handleLike = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  // Handle deleting a post
  const handleDelete = (deletedPostId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
    toast.success('Post deleted successfully.');
  };

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
          />
          <button
            onClick={handleCreatePost}
            className="bg-blue-500 text-white px-5 py-2 mt-2 rounded hover:bg-blue-600 transition-all"
            aria-label="Create Post"
          >
            Post
          </button>
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
                  No posts available.
                </motion.p>
              )
            )}
          </AnimatePresence>
        </div>
      </InfiniteScroll>
    </div>
  );
}
