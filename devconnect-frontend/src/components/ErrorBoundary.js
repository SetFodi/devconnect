// frontend/src/components/ErrorBoundary.js

import React from 'react';
import { toast } from 'react-toastify';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state to display fallback UI on next render
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error (you can also send this to an external logging service)
    console.error('ErrorBoundary caught an error', error, errorInfo);
    toast.error('An unexpected error occurred.');
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">Something went wrong.</h1>
          <p className="text-gray-600 dark:text-gray-300">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
