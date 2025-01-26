// frontend/src/pages/Feed.js
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const { auth } = useContext(AuthContext);

  const fetchPosts = async () => {
    try {
      // We'll use the "me" route if user is logged in
      if (auth.token) {
        const res = await axios.get('http://localhost:5000/api/posts/me', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setPosts(res.data);
      } else {
        // Or fallback to public route if not logged in
        const res = await axios.get('http://localhost:5000/api/posts');
        setPosts(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [auth.token]); // re-fetch if token changes

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    try {
      await axios.post(
        'http://localhost:5000/api/posts',
        { content: newPost },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setNewPost('');
      fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating post');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pt-24">
      <h1 className="text-3xl font-bold mb-4">Developer Feed</h1>

      {auth.token && (
        <div className="mb-6">
          <textarea
            className="border w-full p-2 rounded"
            rows="3"
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <button
            onClick={handleCreatePost}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all mt-2"
          >
            Post
          </button>
        </div>
      )}

      <div>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onRefresh={fetchPosts}
          />
        ))}
      </div>
    </div>
  );
}
