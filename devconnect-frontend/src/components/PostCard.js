// frontend/src/components/PostCard.js

import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext'; // Import SocketContext
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaTimes, FaComment } from 'react-icons/fa';


export default function PostCard({ post, onLike, onDelete, }) {
  const { auth } = useContext(AuthContext);
  const socket = useContext(SocketContext); // Use centralized socket
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [newImage, setNewImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Comment states
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  const canEdit = Number(post.user_id) === Number(auth.user?.id);

  // No need for additional Socket.io listeners here
  // All real-time updates are handled by Feed.js

  // Fetch comments when comments section is opened
  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);
  useEffect(() => {
    if (socket) {
      socket.on('commentAdded', ({ postId, comment, total }) => {
        if (postId === post.id) {
          setComments(prev => [comment, ...prev]);
          setCommentCount(total);
        }
      });

      socket.on('commentDeleted', ({ postId, commentId, total }) => {
        if (postId === post.id) {
          setComments(prev => prev.filter(c => c.id !== commentId));
          setCommentCount(total);
        }
      });

      return () => {
        socket.off('commentAdded');
        socket.off('commentDeleted');
      };
    }
  }, [socket, post.id]);
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await axios.get(`http://localhost:5000/api/comments/${post.id}`);
      setComments(res.data.comments);
      setCommentCount(res.data.total);
    } catch (err) {
      toast.error('Error loading comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to comment');
      return;
    }
  
    if (!newComment.trim()) {
      toast.warning('Comment cannot be empty');
      return;
    }
  
    try {
      const res = await axios.post(
        'http://localhost:5000/api/comments',
        { postId: post.id, content: newComment },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
  
      if (socket) {
        socket.emit('newComment', {
          postId: post.id,
          comment: res.data.comment
        });
      }
  
      setNewComment('');
      toast.success('Comment added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding comment');
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await axios.delete(`http://localhost:5000/api/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      // No need to manually remove the comment; Socket.io will handle it

      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Error deleting comment');
    }
  };

  const handleImageChange = (e) => {
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
      setNewImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setNewImage(null);
    setPreviewUrl(null);
  };

  const toggleLike = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to like/unlike');
      return;
    }
    try {
      if (post.isLiked) {
        await axios.delete(`http://localhost:5000/api/posts/${post.id}/like`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        // Emit socket event for unlike
        socket.emit('postLiked', {
          postId: post.id,
          userId: auth.user.id,
          action: 'unlike',
        });

        onLike({ ...post, likeCount: post.likeCount - 1, isLiked: 0 });
        toast.info('Post unliked.');
      } else {
        await axios.post(
          `http://localhost:5000/api/posts/${post.id}/like`,
          {},
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );

        // Emit socket event for like
        socket.emit('postLiked', {
          postId: post.id,
          userId: auth.user.id,
          action: 'like',
        });

        onLike({ ...post, likeCount: post.likeCount + 1, isLiked: 1 });
        toast.success('Post liked!');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (post.isLiked ? 'Error unliking post' : 'Error liking post');
      toast.error(message);
    }
  };

  const handleEdit = async () => {
    if (!auth.token) {
      toast.error('You must be logged in to edit');
      return;
    }

    const formData = new FormData();
    formData.append('content', editContent);
    if (newImage) {
      formData.append('image', newImage);
    }

    try {
      await axios.put(
        `http://localhost:5000/api/posts/${post.id}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data',
          } 
        }
      );
      setIsEditing(false);
      toast.success('Post updated!');
      onLike({ 
        ...post, 
        content: editContent,
        image_url: previewUrl || post.image_url 
      });

      // Emit socket event for post update
      socket.emit('postUpdated', {
        postId: post.id,
        content: editContent,
        image_url: previewUrl || post.image_url,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error editing post');
    }
  };

  return (
    <motion.div 
      className="border rounded p-4 mb-4 bg-white dark:bg-gray-700 shadow hover:shadow-xl transition-shadow duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {post.profile_picture ? (
            <img
              src={post.profile_picture}
              alt={`${post.username}'s profile`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <Avatar
              name={post.username || 'User'}
              size="40"
              round={true}
            />
          )}
          <h3 className="font-bold text-lg">@{post.username || 'User'}</h3>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            {isEditing ? (
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                aria-label="Save Edit"
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                aria-label="Edit Post"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => onDelete(post.id)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              aria-label="Delete Post"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            className="border border-gray-300 dark:border-gray-600 w-full p-2 rounded bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
            rows="3"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            aria-label="Edit Post Content"
          />
          
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              <FaImage />
              <span>Change Image</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
            {(previewUrl || post.image_url) && (
              <button
                onClick={removeImage}
                className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                aria-label="Remove Image"
              >
                <FaTimes />
                <span>Remove Image</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-gray-800 dark:text-gray-200">{post.content}</p>
          {post.image_url && (
            <div className="mb-4">
              <img
                src={post.image_url}
                alt="Post content"
                className="rounded-lg max-h-96 w-auto mx-auto"
                loading="lazy"
              />
            </div>
          )}
        </>
      )}

      {isEditing && (previewUrl || post.image_url) && (
        <div className="mt-4">
          <img
            src={previewUrl || post.image_url}
            alt="Preview"
            className="rounded-lg max-h-96 w-auto mx-auto"
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{new Date(post.created_at).toLocaleString()}</span>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLike}
            className={`flex items-center space-x-2 px-3 py-1 rounded transition-colors ${
              post.isLiked 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500'
            }`}
            aria-label={post.isLiked ? 'Unlike Post' : 'Like Post'}
          >
            <span>{post.isLiked ? '❤️' : '🤍'}</span>
            <span>{post.likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
            aria-label="Toggle Comments"
          >
            <FaComment />
            <span>{commentCount} Comments</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t pt-4"
          >
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-gray-200"
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                aria-label="New Comment"
              />
              <button
                onClick={handleComment}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                aria-label="Add Comment"
              >
                Comment
              </button>
            </div>

            {loadingComments ? (
              <div className="text-center py-4">Loading comments...</div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start space-x-3"
                  >
                    {comment.profile_picture ? (
                      <img
                        src={comment.profile_picture}
                        alt={`${comment.username}'s profile`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar
                        name={comment.username}
                        size="32"
                        round={true}
                      />
                    )}
                    <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold">@{comment.username}</span>
                        {(comment.user_id === auth.user?.id || post.user_id === auth.user?.id) && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-500 hover:text-red-600"
                            aria-label="Delete Comment"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-gray-800 dark:text-gray-200">{comment.content}</p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
