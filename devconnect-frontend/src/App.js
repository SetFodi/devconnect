// frontend/src/App.js
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for better performance
const Feed = lazy(() => import('./pages/Feed'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Developers = lazy(() => import('./pages/Developers'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { auth } = React.useContext(AuthContext);
  return auth.token ? children : <Navigate to="/login" replace />;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { auth } = React.useContext(AuthContext);
  return auth.token && auth.user.role === 'admin' ? children : <Navigate to="/" replace />;
};

// Route Components for Login/Register that redirect if already logged in
const LoginRoute = () => {
  const { auth } = React.useContext(AuthContext);
  return auth.token ? <Navigate to="/" replace /> : <Login />;
};

const RegisterRoute = () => {
  const { auth } = React.useContext(AuthContext);
  return auth.token ? <Navigate to="/" replace /> : <Register />;
};

function App() {
  return (
    <Router>
      <Navbar />
      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
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
      </Suspense>
      <ToastContainer />
    </Router>
  );
}

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
