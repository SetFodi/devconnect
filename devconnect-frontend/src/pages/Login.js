// frontend/src/pages/Login.js
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      alert(err.response.data.message || 'Error logging in');
    }
  };

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <form onSubmit={handleSubmit} className="shadow p-6 bg-white rounded">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <div className="mb-2">
          <label className="block">Email</label>
          <input
            type="email"
            name="email"
            className="border w-full p-2 rounded"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="mb-2">
          <label className="block">Password</label>
          <input
            type="password"
            name="password"
            className="border w-full p-2 rounded"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 w-full transition-all">
          Login
        </button>
      </form>
    </div>
  );
}
