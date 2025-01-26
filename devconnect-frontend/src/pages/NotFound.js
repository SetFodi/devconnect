// frontend/src/pages/NotFound.js

import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <h1 className="text-6xl font-bold text-gray-800 dark:text-gray-100">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">Page Not Found</p>
      <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
        Go Home
      </Link>
    </div>
  );
}
