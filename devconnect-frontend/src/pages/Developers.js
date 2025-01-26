// frontend/src/pages/Developers.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { motion } from 'framer-motion';
import Avatar from 'react-avatar';
import ClipLoader from 'react-spinners/ClipLoader'; // Ensure this is installed
import { toast } from 'react-toastify'; // Import toast

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
      toast.error('Error fetching profiles.'); // Now toast is defined
    } finally {
      setLoading(false);
    }
  };

  // Debounce the search input to prevent excessive API calls
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
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-24">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-gradient bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Developers
      </h1>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by skill or username..."
          className="border border-gray-300 dark:border-gray-600 rounded w-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm dark:bg-gray-600 dark:text-gray-200"
          value={filter}
          onChange={handleSearchChange}
        />
      </div>
      {loading ? (
        <div className="flex justify-center">
          <ClipLoader color="#3b82f6" loading={loading} size={30} />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-700 p-6 rounded shadow hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center space-x-4 mb-4">
                  {/* Conditionally Render Profile Picture or Avatar */}
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={`${profile.username}'s profile`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <Avatar 
                      name={profile.username || 'User'} 
                      size="50" 
                      round={true} 
                      className="mr-2" 
                    />
                  )}
                  <h3 className="text-xl font-semibold">@{profile.username || 'User'}</h3>
                </div>
                <p className="mb-2 text-gray-800 dark:text-gray-200">{profile.bio || 'No bio available.'}</p>
                <p className="mb-2">
                  <strong>Skills:</strong> {profile.skills || 'No skills listed.'}
                </p>
                {profile.github_link && (
                  <a
                    href={profile.github_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    GitHub Profile
                  </a>
                )}
              </motion.div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 col-span-full">No developers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
