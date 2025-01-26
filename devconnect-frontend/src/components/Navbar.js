// frontend/src/components/Navbar.js
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-lg fixed w-full z-10 top-0 left-0">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link to="/" className="font-extrabold text-2xl tracking-wider">
          DevConnect
        </Link>

        {/* Mobile Menu Toggle (Hamburger) */}
        <button 
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" 
               viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Links */}
        <div className={`md:flex space-x-4 items-center ${menuOpen ? 'block' : 'hidden'} md:block`}>
          <Link 
            to="/developers" 
            className="hover:bg-blue-600 px-3 py-1 rounded transition-colors duration-300"
          >
            Developers
          </Link>

          {auth.token ? (
            <>
              <Link 
                to="/profile" 
                className="hover:bg-blue-600 px-3 py-1 rounded transition-colors duration-300"
              >
                Profile
              </Link>
              <Link 
                to="/chat" 
                className="hover:bg-blue-600 px-3 py-1 rounded transition-colors duration-300"
              >
                Chat
              </Link>
              <button
                onClick={logout}
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="hover:bg-blue-600 px-3 py-1 rounded transition-colors duration-300"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="hover:bg-blue-600 px-3 py-1 rounded transition-colors duration-300"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
