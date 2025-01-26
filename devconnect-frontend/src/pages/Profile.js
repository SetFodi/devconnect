// frontend/src/pages/Profile.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function Profile() {
  const { auth } = useContext(AuthContext);
  const [profile, setProfile] = useState({ bio: '', skills: '', github_link: '' });

  const getMyProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile/me', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/profile', profile, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      alert('Profile updated!');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getMyProfile();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
      <form onSubmit={updateProfile} className="space-y-4">
        <div>
          <label className="block font-semibold">Bio</label>
          <textarea
            className="border w-full p-2 rounded"
            name="bio"
            rows="3"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
        <div>
          <label className="block font-semibold">Skills (comma separated)</label>
          <input
            className="border w-full p-2 rounded"
            name="skills"
            value={profile.skills}
            onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
          />
        </div>
        <div>
          <label className="block font-semibold">GitHub Link</label>
          <input
            className="border w-full p-2 rounded"
            name="github_link"
            value={profile.github_link}
            onChange={(e) => setProfile({ ...profile, github_link: e.target.value })}
          />
        </div>
        <button className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
          Save Profile
        </button>
      </form>
    </div>
  );
}
