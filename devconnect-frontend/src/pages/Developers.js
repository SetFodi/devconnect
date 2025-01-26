// frontend/src/pages/Developers.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Developers() {
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState('');

  const fetchProfiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile');
      setProfiles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter((p) => {
    if (!filter) return true;
    return p.skills?.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="max-w-3xl mx-auto p-4 pt-24">
      <h1 className="text-3xl font-bold mb-4">Developers</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by skill..."
          className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500 transition-all"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {/* Developer Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className="border rounded shadow p-4 bg-white hover:shadow-lg transform transition duration-300 hover:-translate-y-1"
          >
            <p className="font-semibold mb-1">Bio: {profile.bio}</p>
            <p className="mb-1">
              <strong>Skills:</strong> {profile.skills}
            </p>
            {profile.github_link && (
              <p>
                <a 
                  href={profile.github_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 underline"
                >
                  GitHub
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
