// frontend/src/components/PostCard.js

import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function PostCard({ post, onRefresh }) {
  const { auth } = useContext(AuthContext);

  // For inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  // For toggling likes
  const isLiked = post.isLiked === 1;

  // Check if current user is the owner of this post
  const canEdit = Number(post.user_id) === Number(auth.user?.id);

  /*******************************************************
   * TOGGLE LIKE
   *******************************************************/
  const toggleLike = async () => {
    if (!auth.token) {
      alert('You must be logged in to like/unlike');
      return;
    }
    try {
      if (isLiked) {
        // UNLIKE: Send DELETE to /api/posts/:id/like
        await axios.delete(`http://localhost:5000/api/posts/${post.id}/like`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
      } else {
        // LIKE: Send POST to /api/posts/:id/like
        await axios.post(
          `http://localhost:5000/api/posts/${post.id}/like`,
          {},
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
      }
      // After toggling, re-fetch or re-trigger parent's update
      onRefresh();
    } catch (err) {
      // Handle specific status codes if needed
      const message =
        err.response?.data?.message ||
        (isLiked ? 'Error unliking post' : 'Error liking post');
      alert(message);
    }
  };

  /*******************************************************
   * EDIT POST (Inline)
   *******************************************************/
  const handleEdit = async () => {
    if (!auth.token) {
      alert('You must be logged in to edit');
      return;
    }
    try {
      await axios.put(
        `http://localhost:5000/api/posts/${post.id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setIsEditing(false);
      onRefresh(); // refresh posts in parent
    } catch (err) {
      alert(err.response?.data?.message || 'Error editing post');
    }
  };

  /*******************************************************
   * DELETE POST (with confirmation)
   *******************************************************/
  const handleDelete = async () => {
    if (!auth.token) {
      alert('You must be logged in to delete');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      onRefresh(); // re-fetch
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting post');
    }
  };

  return (
    <div className="border rounded p-4 mb-4 bg-white shadow hover:shadow-xl transition-shadow duration-300">
      <h3 className="font-bold mb-2">@{post.username}</h3>

      {/* Inline Edit or Normal Display */}
      {isEditing ? (
        <textarea
          className="border w-full p-2 rounded"
          rows="3"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
      ) : (
        <p className="mb-2">{post.content}</p>
      )}

      <small className="text-gray-500">
        Posted on {new Date(post.created_at).toLocaleString()}
      </small>

      {/* Action Buttons: Like, Edit, Delete */}
      <div className="mt-3 flex items-center space-x-3">
        {/* Like/Unlike Button & Count */}
        <button
          onClick={toggleLike}
          className={`text-sm px-2 py-1 rounded transition-colors duration-300 
            ${isLiked ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'}`}
        >
          {isLiked ? 'Unlike ✖' : 'Like ❤️'}
        </button>
        <span className="text-gray-700 text-sm">{post.likeCount} Likes</span>

        {/* If this is my post, show edit/delete */}
        {canEdit && (
          <>
            {isEditing ? (
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
