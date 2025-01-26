// frontend/src/pages/Profile.js

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion } from 'framer-motion';

export default function Profile() {
  const { auth } = useContext(AuthContext);
  const [profile, setProfile] = useState({ bio: '', skills: '', github_link: '', profile_picture: null });
  const [activeTab, setActiveTab] = useState('edit');
  const [selectedImage, setSelectedImage] = useState(null); // For image preview

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
      const formData = new FormData();
      formData.append('bio', profile.bio);
      formData.append('skills', profile.skills);
      formData.append('github_link', profile.github_link);
      if (selectedImage) {
        formData.append('profile_picture', selectedImage);
      }

      await axios.post('http://localhost:5000/api/profile', formData, {
        headers: { 
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'multipart/form-data'
        },
      });
      toast.success('Profile updated!');
      setSelectedImage(null); // Reset selected image
      getMyProfile();
    } catch (err) {
      console.error(err);
      toast.error('Error updating profile.');
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Optional: Validate file size and type on the client-side
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size exceeds 5MB.');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and GIF files are allowed.');
        return;
      }
      setSelectedImage(file);
      // Optionally, create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, profile_picture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    getMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4 pt-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-6"
      >
        <Avatar 
          src={profile.profile_picture}
          name={auth.user.username}
          size="100" 
          round={true} 
        />
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
          {/* Profile Picture Upload */}
          <div>
            <label className="block font-semibold mb-1" htmlFor="profile_picture">
              Profile Picture
            </label>
            <input
              type="file"
              name="profile_picture"
              id="profile_picture"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-900 dark:text-gray-200
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-gray-200
              "
            />
            {profile.profile_picture && (
              <div className="mt-2">
                <img 
                  src={profile.profile_picture} 
                  alt="Profile Preview" 
                  className="w-24 h-24 object-cover rounded-full"
                />
              </div>
            )}
          </div>

          {/* Bio Field */}
          <div>
            <label className="block font-semibold mb-1">Bio</label>
            <textarea
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              rows="3"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>

          {/* Skills Field */}
          <div>
            <label className="block font-semibold mb-1">Skills (comma separated)</label>
            <input
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              value={profile.skills}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
            />
          </div>

          {/* GitHub Link Field */}
          <div>
            <label className="block font-semibold mb-1">GitHub Link</label>
            <input
              className="border border-gray-300 dark:border-gray-600 rounded w-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
              value={profile.github_link}
              onChange={(e) => setProfile({ ...profile, github_link: e.target.value })}
            />
          </div>

          {/* Submit Button */}
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
          {profile.profile_picture && (
            <div className="mt-4 flex justify-center">
              <img 
                src={profile.profile_picture} 
                alt="Profile" 
                className="w-32 h-32 object-cover rounded-full"
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
