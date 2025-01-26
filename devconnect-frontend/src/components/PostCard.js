// frontend/src/components/PostCard.js

import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion } from 'framer-motion';

export default function PostCard({ post, onLike, onDelete }) {
  const { auth } = useContext(AuthContext);

  // For inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  // Check if current user is the owner of this post
  const canEdit = Number(post.user_id) === Number(auth.user?.id);

  /*******************************************************
   * TOGGLE LIKE
   *******************************************************/
  const toggleLike = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to like/unlike');
      return;
    }
    try {
      if (post.isLiked) {
        // UNLIKE: Send DELETE to /api/posts/:id/like
        await axios.delete(`http://localhost:5000/api/posts/${post.id}/like`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        // Update post locally
        onLike({ ...post, likeCount: post.likeCount - 1, isLiked: 0 });
        toast.info('Post unliked.');
      } else {
        // LIKE: Send POST to /api/posts/:id/like
        await axios.post(
          `http://localhost:5000/api/posts/${post.id}/like`,
          {},
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        // Update post locally
        onLike({ ...post, likeCount: post.likeCount + 1, isLiked: 1 });
        toast.success('Post liked!');
      }
    } catch (err) {
      // Handle specific status codes if needed
      const message =
        err.response?.data?.message ||
        (post.isLiked ? 'Error unliking post' : 'Error liking post');
      toast.error(message);
    }
  };

  /*******************************************************
   * EDIT POST (Inline)
   *******************************************************/
  const handleEdit = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to edit');
      return;
    }
    try {
      await axios.put(
        `http://localhost:5000/api/posts/${post.id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setIsEditing(false);
      toast.success('Post updated!');
      // Update post content locally
      onLike({ ...post, content: editContent });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error editing post');
    }
  };

  /*******************************************************
   * DELETE POST (with confirmation)
   *******************************************************/
  const handleDelete = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to delete');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      onDelete(post.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting post');
    }
  };

  return (
    <div className="border rounded p-4 mb-4 bg-white dark:bg-gray-700 shadow hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar 
            name={post.username || 'User'} 
            size="40" 
            round={true} 
            className="mr-2" 
          />
          <h3 className="font-bold text-lg">@{post.username || 'User'}</h3>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            {isEditing ? (
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                aria-label="Save Post"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                aria-label="Edit Post"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              aria-label="Delete Post"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Inline Edit or Normal Display */}
      {isEditing ? (
        <textarea
          className="border border-gray-300 dark:border-gray-600 w-full p-2 rounded mt-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
          rows="3"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
      ) : (
        <p className="mb-2 mt-2 text-gray-800 dark:text-gray-200">{post.content}</p>
      )}

      <small className="text-gray-500 dark:text-gray-400">
        Posted on {new Date(post.created_at).toLocaleString()}
      </small>

      {/* Action Buttons: Like */}
      <div className="mt-3 flex items-center space-x-3">
        {/* Like/Unlike Button & Count */}
        <button
          onClick={toggleLike}
          className={`text-sm px-2 py-1 rounded transition-colors duration-300 
            ${post.isLiked ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'}`}
          aria-label={post.isLiked ? 'Unlike Post' : 'Like Post'}
        >
          {post.isLiked ? 'Unlike ✖' : 'Like ❤️'}
        </button>
        <span className="text-gray-700 dark:text-gray-300 text-sm">{post.likeCount} Likes</span>
      </div>
    </div>
  );
}
