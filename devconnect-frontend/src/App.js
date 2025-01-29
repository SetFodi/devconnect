// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext'; // Ensure ThemeProvider is correctly exported
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard'; // Ensure this component exists
import Developers from './pages/Developers'; // Ensure this component exists
import NotFound from './pages/NotFound'; // Ensure this component exists
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/developers" element={<Developers />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { auth } = React.useContext(AuthContext);
  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { auth } = React.useContext(AuthContext);
  if (!auth.token || auth.user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Login Route Component
const LoginRoute = () => {
  const { auth } = React.useContext(AuthContext);
  if (auth.token) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
};

// Register Route Component
const RegisterRoute = () => {
  const { auth } = React.useContext(AuthContext);
  if (auth.token) {
    return <Navigate to="/" replace />;
  }
  return <Register />;
};

export default function WrappedApp() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
