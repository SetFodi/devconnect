// frontend/src/components/Navbar.js

import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Avatar from 'react-avatar';
import { FaSun, FaMoon } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation(); // To determine active link

  useEffect(() => {
    // Close mobile menu on route change
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    // Check local storage for theme preference
    if (localStorage.getItem('theme') === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  // Animation variants for mobile menu
  const menuVariants = {
    open: {
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.3,
      },
    },
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  // Function to determine active link
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-500 dark:bg-gray-800 text-white shadow-lg fixed w-full z-20 top-0 left-0 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link to="/" className="font-extrabold text-lg md:text-xl tracking-wider">
          DevConnect
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
                onClick={() => { logout(); }}
                className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-2"
                aria-label="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" 
                        strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
              <Link to="/profile">
                <Avatar 
                  name={auth.user.username || 'User'} 
                  size="30" 
                  round={true} 
                  className="ml-2"  
                />
              </Link>
              {/* Dark Mode Toggle */}
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
              {/* Dark Mode Toggle */}
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

        {/* Mobile Menu Toggle (Hamburger) */}
        <div className="md:hidden flex items-center">
          <button 
            className="text-white focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" 
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {menuOpen ? (
                // Close Icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
              ) : (
                // Hamburger Icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16" />
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
            <div className="flex flex-col space-y-1 p-4">
              <Link 
                to="/developers" 
                className={`px-3 py-2 rounded transition-colors duration-300 ${
                  isActive('/developers')
                    ? 'bg-blue-600 dark:bg-gray-700'
                    : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Developers
              </Link>
              {auth.token ? (
                <>
                  <Link 
                    to="/profile" 
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/profile')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMenuOpen(false)}
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
                    onClick={() => setMenuOpen(false)}
                  >
                    Chat
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition-colors duration-300 flex items-center space-x-2"
                    aria-label="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" 
                         fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" 
                            strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                  <Link to="/profile" className="mt-2">
                    <Avatar 
                      name={auth.user.username || 'User'} 
                      size="30" 
                      round={true} 
                      className="mx-auto" 
                    />
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
                    className={`px-3 py-2 rounded transition-colors duration-300 ${
                      isActive('/login')
                        ? 'bg-blue-600 dark:bg-gray-700'
                        : 'hover:bg-blue-600 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMenuOpen(false)}
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
                    onClick={() => setMenuOpen(false)}
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
