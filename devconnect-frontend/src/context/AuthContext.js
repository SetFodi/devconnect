// frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the context
export const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  // Initialize auth state from localStorage synchronously
  const [auth, setAuth] = useState(() => {
    const storedAuth = localStorage.getItem('auth');
    return storedAuth ? JSON.parse(storedAuth) : { token: null, user: null };
  });

  // Save auth to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(auth));
  }, [auth]);

  // Axios interceptor to add token to headers
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (auth.token) {
          config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [auth.token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      setAuth({
        token: res.data.token,
        user: res.data.user, // Includes role
      });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
      return { success: true, userId: res.data.userId };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
