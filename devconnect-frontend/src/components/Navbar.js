// frontend/src/components/Navbar.js
import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import Avatar from 'react-avatar';
import { FaSun, FaMoon, FaTools } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from './logo.png'; // Make sure your logo image exists

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Fetch profile picture if authenticated
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (auth.token) {
        try {
          const res = await axios.get('http://localhost:5000/api/profile/me', {
            headers: { Authorization: `Bearer ${auth.token}` },
          });
          setProfilePicture(res.data?.profile_picture || null);
        } catch (err) {
          console.error('Error fetching profile picture:', err);
          setProfilePicture(null);
        }
      } else {
        setProfilePicture(null);
      }
    };

    fetchProfilePicture();
  }, [auth.token]);

  // Mobile menu animation variants
  const menuVariants = {
    open: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
    closed: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  };

  // Determine active link styling
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-500 dark:bg-gray-800 text-white shadow-lg fixed w-full z-20 top-0 left-0 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={logo}
            alt="DevConnect Logo"
            className="h-12 w-12 md:h-14 md:w-14 object-contain filter invert"
          />
          <span className="font-extrabold text-lg md:text-xl tracking-wider">
            DevConnect
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/developers"
            className={`px-3 py-2 rounded transition-colors duration-300 ${
              isActive('/developers')
                ? 'bg-blue-600 dark:bg-gray-700'
                : 'hover:bg-blue-600 dark:hover:bg-gray-700'
            }`}
          >
            Developers
          </Link>

          {auth.token ? (
            <>
              {auth.user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-1 ${
                    isActive('/admin')
                      ? 'bg-blue-600 dark:bg-gray-700'
                      : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                  }`}
                >
                  <FaTools />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to="/profile"
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/profile')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
              >
                Profile
              </Link>
              <Link
                to="/chat"
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/chat')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
              >
                Chat
              </Link>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-2"
                aria-label="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
              <Link to="/profile">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-8 h-8 rounded-full ml-2 object-cover"
                  />
                ) : (
                  <Avatar
                    name={auth.user.username || 'User'}
                    size="30"
                    round={true}
                    className="ml-2"
                  />
                )}
              </Link>
              <button
                onClick={toggleDarkMode}
                className="ml-4 text-white focus:outline-none"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/login')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/register')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
              >
                Register
              </Link>
              <button
                onClick={toggleDarkMode}
                className="ml-4 text-white focus:outline-none"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden bg-blue-700 dark:bg-gray-800 overflow-hidden"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex flex-col space-y-2 p-4">
              <Link
                to="/developers"
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/developers')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
              >
                Developers
              </Link>

              {auth.token && auth.user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-1 ${
                    isActive('/admin')
                      ? 'bg-blue-600 dark:bg-gray-700'
                      : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                  }`}
                >
                  <FaTools />
                  <span>Admin</span>
                </Link>
              )}

              {auth.token ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/profile')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/chat"
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/chat')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    Chat
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-2"
                    aria-label="Logout"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Logout</span>
                  </button>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full mx-auto object-cover"
                      />
                    ) : (
                      <Avatar
                        name={auth.user.username || 'User'}
                        size="30"
                        round={true}
                        className="mx-auto"
                      />
                    )}
                  </Link>
                  {/* Dark Mode Toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="mt-4 text-white focus:outline-none mx-auto"
                    aria-label="Toggle Dark Mode"
                  >
                    {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/login')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/register')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    Register
                  </Link>
                  {/* Dark Mode Toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="mt-4 text-white focus:outline-none mx-auto"
                    aria-label="Toggle Dark Mode"
                  >
                    {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
