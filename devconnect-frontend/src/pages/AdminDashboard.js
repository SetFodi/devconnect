// frontend/src/pages/AdminDashboard.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import ClipLoader from 'react-spinners/ClipLoader';

export default function AdminDashboard() {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Fetch all users (Admins only)
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error('Fetch users error:', err);
        toast.error('Failed to fetch users.');
      } finally {
        setLoadingUsers(false);
      }
    };

    if (auth.user.role === 'admin') {
      fetchUsers();
    }
  }, [auth]);

  // Handler to clear the chat
  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear the entire chat?')) return;
    setAdminActionLoading(true);
    try {
      await axios.delete('http://localhost:5000/api/admin/chat/clear', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('Chat cleared successfully.');
    } catch (err) {
      console.error('Clear chat error:', err);
      toast.error('Failed to clear chat.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Handler to promote a user to admin
  const promoteToAdmin = async (userId) => {
    setAdminActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/promote`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('User promoted to admin.');
      setUsers(users.map(user => user.id === userId ? { ...user, role: 'admin' } : user));
    } catch (err) {
      console.error('Promote user error:', err);
      toast.error('Failed to promote user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Handler to demote an admin to user
  const demoteToUser = async (userId) => {
    setAdminActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/demote`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('User demoted to regular user.');
      setUsers(users.map(user => user.id === userId ? { ...user, role: 'user' } : user));
    } catch (err) {
      console.error('Demote user error:', err);
      toast.error('Failed to demote user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Handler to ban a user
  const banUser = async (userId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    setAdminActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('User banned successfully.');
      setUsers(users.map(user => user.id === userId ? { ...user, is_banned: true } : user));
    } catch (err) {
      console.error('Ban user error:', err);
      toast.error('Failed to ban user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Handler to unban a user
  const unbanUser = async (userId) => {
    setAdminActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/unban`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('User unbanned successfully.');
      setUsers(users.map(user => user.id === userId ? { ...user, is_banned: false } : user));
    } catch (err) {
      console.error('Unban user error:', err);
      toast.error('Failed to unban user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pt-24 space-y-8">
      {/* Hero Header */}
      <motion.h1
        className="text-4xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Admin Dashboard
      </motion.h1>

      {/* Chat Management Section */}
      <motion.div
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Chat Management</h2>
        <button
          onClick={handleClearChat}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded transition-colors duration-300"
          disabled={adminActionLoading}
        >
          {adminActionLoading ? 'Clearing Chat...' : 'Clear Chat'}
        </button>
      </motion.div>

      {/* User Management Section */}
      <motion.div
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">User Management</h2>
        {loadingUsers ? (
          <div className="flex justify-center">
            <ClipLoader color="#3b82f6" size={40} />
          </div>
        ) : (
          <AnimatePresence>
            {users.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {users.map(user => (
                  <motion.div
                    key={user.id}
                    className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-3">
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{user.username}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm">
                        <span className="font-semibold">Role: </span>
                        <span className="capitalize">{user.role}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Status: </span>
                        {user.is_banned ? (
                          <span className="text-red-500">Banned</span>
                        ) : (
                          <span className="text-green-500">Active</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.role !== 'admin' ? (
                        <button
                          onClick={() => promoteToAdmin(user.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          disabled={adminActionLoading}
                        >
                          Promote
                        </button>
                      ) : (
                        <button
                          onClick={() => demoteToUser(user.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          disabled={adminActionLoading}
                        >
                          Demote
                        </button>
                      )}
                      {user.is_banned ? (
                        <button
                          onClick={() => unbanUser(user.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          disabled={adminActionLoading}
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => banUser(user.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          disabled={adminActionLoading}
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.p
                className="text-center text-gray-500 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No users found.
              </motion.p>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
