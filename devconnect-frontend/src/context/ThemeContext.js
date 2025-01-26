// frontend/src/context/ThemeContext.js

import React, { createContext, useState, useEffect } from 'react';

// Create the ThemeContext
export const ThemeContext = createContext();

// Create the ThemeProvider component
export function ThemeProvider({ children }) {
  // Initialize theme state from localStorage or default to light mode
  const [darkMode, setDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('darkMode');
    return storedTheme ? JSON.parse(storedTheme) : false;
  });

  // Update the `dark` class on the <html> element and save theme preference to localStorage
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Toggle function to switch themes
  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
