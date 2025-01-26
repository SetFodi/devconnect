// frontend/src/pages/AdminDashboard.js

import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function AdminDashboard() {
  const { auth } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  useEffect(() => {
    // Fetch all users (Admins only)
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
    if (!window.confirm('Are you sure you want to clear the entire chat?')) {
      return;
    }
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
      // Update user role locally
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
      // Update user role locally
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
    if (!window.confirm('Are you sure you want to ban this user?')) {
      return;
    }
    setAdminActionLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('User banned successfully.');
      // Update user status locally
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
      // Update user status locally
      setUsers(users.map(user => user.id === userId ? { ...user, is_banned: false } : user));
    } catch (err) {
      console.error('Unban user error:', err);
      toast.error('Failed to unban user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Handler to delete a specific chat message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    setAdminActionLoading(true);
    try {
      await axios.delete(`http://localhost:5000/api/admin/chat/message/${messageId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('Message deleted successfully.');
    } catch (err) {
      console.error('Delete message error:', err);
      toast.error('Failed to delete message.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pt-24">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Clear Chat Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Chat Management</h2>
        <button
          onClick={handleClearChat}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-300"
          disabled={adminActionLoading}
        >
          {adminActionLoading ? 'Clearing...' : 'Clear Chat'}
        </button>
      </div>

      {/* User Management Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">User Management</h2>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : (
          <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Username</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Role</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="text-center">
                  <td className="py-2 px-4 border-b">{user.username}</td>
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b capitalize">{user.role}</td>
                  <td className="py-2 px-4 border-b">
                    {user.is_banned ? 'Banned' : 'Active'}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {user.role !== 'admin' ? (
                      <button
                        onClick={() => promoteToAdmin(user.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-2 transition-colors duration-300"
                        disabled={adminActionLoading}
                      >
                        Promote
                      </button>
                    ) : (
                      <button
                        onClick={() => demoteToUser(user.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-2 transition-colors duration-300"
                        disabled={adminActionLoading}
                      >
                        Demote
                      </button>
                    )}

                    {user.is_banned ? (
                      <button
                        onClick={() => unbanUser(user.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors duration-300"
                        disabled={adminActionLoading}
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => banUser(user.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors duration-300"
                        disabled={adminActionLoading}
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
