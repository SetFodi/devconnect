// frontend/src/App.js

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext'; // Correctly import ThemeProvider as named import
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard
import Developers from './pages/Developers'; // Import Developers Page
import NotFound from './pages/NotFound'; // Create a NotFound component

function App() {
  const { auth } = useContext(AuthContext);

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (!auth.token) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // Admin Route Component
  const AdminRoute = ({ children }) => {
    if (!auth.token || auth.user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/developers" element={<Developers />} /> {/* Define Developers Route */}
        <Route path="/login" element={!auth.token ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!auth.token ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="*" element={<NotFound />} /> {/* Catch-all Route */}
      </Routes>
    </Router>
  );
}

export default function WrappedApp() {
  return (
    <AuthProvider>
      <SocketProvider> {/* Wrap with SocketProvider */}
      <ThemeProvider> {/* Wrap with ThemeProvider */}
        <App />
      </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
