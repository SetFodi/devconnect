// frontend/src/pages/Profile.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { auth } = useContext(AuthContext);
  const [profile, setProfile] = useState({ bio: '', skills: '', github_link: '', profile_picture: null });
  const [activeTab, setActiveTab] = useState('edit');
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch the user profile from backend
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

  // Update the profile with form data
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
      setSelectedImage(null);
      getMyProfile();
    } catch (err) {
      console.error(err);
      toast.error('Error updating profile.');
    }
  };

  // Handle image selection and preview
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds 5MB.');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and GIF files are allowed.');
        return;
      }
      setSelectedImage(file);
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

  // Variants for tab animations
  const tabVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="max-w-2xl mx-auto p-8 pt-24">
      {/* Profile Header with Gradient Halo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-10"
      >
        <div className="p-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-500">
          <Avatar 
            src={profile.profile_picture}
            name={auth.user.username}
            size="100" 
            round={true} 
          />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          @{auth.user.username}
        </h2>
      </motion.div>

      {/* Tab Buttons */}
      <div className="flex justify-center space-x-6 mb-8">
        {['edit', 'preview'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full transition-colors duration-300 focus:outline-none
              ${activeTab === tab
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`
            }
          >
            {tab === 'edit' ? 'Edit Profile' : 'Preview Profile'}
          </button>
        ))}
      </div>

      {/* Animated Tab Content */}
      <AnimatePresence exitBeforeEnter>
        {activeTab === 'edit' ? (
          <motion.form
            key="edit"
            onSubmit={updateProfile}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={tabVariants}
            className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl"
          >
            {/* Profile Picture Upload */}
            <div>
              <label htmlFor="profile_picture" className="block text-lg font-semibold mb-2">
                Profile Picture
              </label>
              <input
                type="file"
                name="profile_picture"
                id="profile_picture"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-900 dark:text-gray-200
                  file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-gray-200"
              />
              {profile.profile_picture && (
                <div className="mt-4">
                  <img 
                    src={profile.profile_picture} 
                    alt="Profile Preview" 
                    className="w-28 h-28 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}
            </div>

            {/* Bio Field */}
            <div>
              <label className="block text-lg font-semibold mb-2">Bio</label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                rows="4"
                placeholder="Tell us a little about yourself..."
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>

            {/* Skills Field */}
            <div>
              <label className="block text-lg font-semibold mb-2">Skills (comma separated)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="e.g. JavaScript, React, Node.js"
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              />
            </div>

            {/* GitHub Link Field */}
            <div>
              <label className="block text-lg font-semibold mb-2">GitHub Link</label>
              <input
                type="url"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="https://github.com/yourusername"
                value={profile.github_link}
                onChange={(e) => setProfile({ ...profile, github_link: e.target.value })}
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition duration-300"
            >
              Save Profile
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="preview"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={tabVariants}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl space-y-6"
          >
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bio</h3>
              <p className="text-gray-700 dark:text-gray-300">{profile.bio || 'No bio available.'}</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Skills</h3>
              <p className="text-gray-700 dark:text-gray-300">{profile.skills || 'No skills provided.'}</p>
            </div>
            {profile.github_link && (
              <div>
                <a
                  href={profile.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline text-lg font-semibold hover:text-blue-700 transition-colors"
                >
                  Visit GitHub Profile
                </a>
              </div>
            )}
            {profile.profile_picture && (
              <div className="flex justify-center mt-4">
                <img 
                  src={profile.profile_picture} 
                  alt="Profile" 
                  className="w-32 h-32 object-cover rounded-full border-4 border-blue-500"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
