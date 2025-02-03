import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password.trim())
      newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setErrors({});
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      toast.success('Registration successful! Logging you in...');
      // Auto-login after registration
      const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
        email: formData.email,
        password: formData.password,
      });
      login(loginRes.data.token, loginRes.data.user);
      navigate('/');
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Error registering';
      toast.error(message);
      if (message.includes('Username')) {
        setErrors({ username: message });
      } else if (message.includes('Email')) {
        setErrors({ email: message });
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 p-4">
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          Register
        </h2>

        {/* Username Field */}
        <div className="mb-4">
          <label
            className="block text-gray-700 dark:text-gray-300 mb-2"
            htmlFor="username"
          >
            Username
          </label>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <FaUser className="text-gray-400 mx-2" />
            <input
              type="text"
              name="username"
              id="username"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              aria-invalid={errors.username ? 'true' : 'false'}
              aria-describedby="username-error"
            />
          </div>
          {errors.username && (
            <p id="username-error" className="text-red-500 text-sm mt-1">
              {errors.username}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label
            className="block text-gray-700 dark:text-gray-300 mb-2"
            htmlFor="email"
          >
            Email
          </label>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <FaEnvelope className="text-gray-400 mx-2" />
            <input
              type="email"
              name="email"
              id="email"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby="email-error"
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-red-500 text-sm mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-6">
          <label
            className="block text-gray-700 dark:text-gray-300 mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <FaLock className="text-gray-400 mx-2" />
            <input
              type="password"
              name="password"
              id="password"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby="password-error"
            />
          </div>
          {errors.password && (
            <p id="password-error" className="text-red-500 text-sm mt-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center"
        >
          Register
        </button>

        {/* Link to Login */}
        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Login here
          </Link>
          .
        </p>
      </motion.form>
    </div>
  );
}
