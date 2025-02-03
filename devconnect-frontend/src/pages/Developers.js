// frontend/src/pages/Developers.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from 'react-avatar';
import ClipLoader from 'react-spinners/ClipLoader';
import { toast } from 'react-toastify';

export default function Developers() {
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async (searchTerm = '') => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/profile', {
        params: { search: searchTerm },
      });
      setProfiles(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching profiles.');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search to limit API calls
  const debouncedFetch = debounce((value) => {
    fetchProfiles(value);
  }, 500);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilter(value);
    debouncedFetch(value);
  };

  useEffect(() => {
    fetchProfiles();
    return () => {
      debouncedFetch.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Define variants for the cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pt-24">
      {/* Hero Header */}
      <motion.h1
        className="text-5xl font-extrabold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Our Developer Community
      </motion.h1>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-10 flex justify-center"
      >
        <input
          type="text"
          placeholder="Search by skill or username..."
          className="w-full max-w-md p-3 rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md dark:bg-gray-600 dark:text-gray-200 transition-all duration-300"
          value={filter}
          onChange={handleSearchChange}
          aria-label="Search Developers"
        />
      </motion.div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="flex justify-center">
          <ClipLoader color="#3b82f6" loading={loading} size={40} />
        </div>
      ) : (
        <AnimatePresence>
          {profiles.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
              layout
            >
              {profiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ scale: 1.03, boxShadow: "0px 8px 20px rgba(0,0,0,0.15)" }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    {profile.profile_picture ? (
                      <img
                        src={profile.profile_picture}
                        alt={`${profile.username}'s profile`}
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : (
                      <Avatar 
                        name={profile.username || 'User'} 
                        size="56" 
                        round={true} 
                      />
                    )}
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      @{profile.username || 'User'}
                    </h3>
                  </div>
                  <p className="mb-2 text-gray-700 dark:text-gray-300 line-clamp-3">
                    {profile.bio || 'No bio available.'}
                  </p>
                  <p className="mb-2">
                    <span className="font-bold">Skills:</span> {profile.skills || 'No skills listed.'}
                  </p>
                  {profile.github_link && (
                    <a
                      href={profile.github_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 transition-colors"
                    >
                      GitHub Profile
                    </a>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.p
              className="text-center text-gray-500 dark:text-gray-400 col-span-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No developers found.
            </motion.p>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
