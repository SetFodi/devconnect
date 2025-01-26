// frontend/src/pages/Profile.js

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion } from 'framer-motion';

export default function Profile() {
  const { auth } = useContext(AuthContext);
  const [profile, setProfile] = useState({ bio: '', skills: '', github_link: '' });
  const [activeTab, setActiveTab] = useState('edit');

  const getMyProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile/me', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.data) setProfile(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching profile.');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/profile', profile, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success('Profile updated!');
      getMyProfile();
    } catch (err) {
      console.error(err);
      toast.error('Error updating profile.');
    }
  };

  useEffect(() => {
    getMyProfile();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4 pt-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-6"
      >
        <Avatar name={auth.user.username} size="100" round={true} />
        <h2 className="text-3xl font-bold mt-4">@{auth.user.username}</h2>
      </motion.div>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'edit' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          } transition-colors duration-300`}
          onClick={() => setActiveTab('edit')}
        >
          Edit Profile
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          } transition-colors duration-300`}
          onClick={() => setActiveTab('preview')}
        >
          Preview Profile
        </button>
      </div>

      {activeTab === 'edit' && (
        <motion.form
          onSubmit={updateProfile}
          className="space-y-4 bg-white dark:bg-gray-700 p-6 rounded shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <label className="block font-semibold mb-1">Bio</label>
            <textarea
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              rows="3"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Skills (comma separated)</label>
            <input
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              value={profile.skills}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">GitHub Link</label>
            <input
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              value={profile.github_link}
              onChange={(e) => setProfile({ ...profile, github_link: e.target.value })}
            />
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors duration-300">
            Save Profile
          </button>
        </motion.form>
      )}

      {activeTab === 'preview' && (
        <motion.div
          className="bg-white dark:bg-gray-700 p-6 rounded shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h3 className="text-xl font-semibold mb-2">Bio:</h3>
          <p className="text-gray-800 dark:text-gray-200">{profile.bio || 'No bio available.'}</p>
          <h3 className="text-xl font-semibold mt-4 mb-2">Skills:</h3>
          <p className="text-gray-800 dark:text-gray-200">{profile.skills || 'No skills provided.'}</p>
          {profile.github_link && (
            <p className="mt-4">
              <a
                href={profile.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                GitHub Profile
              </a>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
