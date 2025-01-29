// frontend/src/context/SocketContext.js

import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    let newSocket;

    if (auth.token) {
      try {
        newSocket = io('http://localhost:5000', {
          auth: { token: auth.token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
        });

        // Listen for active users updates
        newSocket.on('activeUsers', (users) => {
          console.log('Received activeUsers:', users);
          setActiveUsers(users);
        });

        // Listen for chat history
        newSocket.on('chatHistory', (history) => {
          // Optionally, manage chat history here or within specific components
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          toast.error('Connection error. Retrying...');
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // The disconnection was initiated by the server, reconnect manually
            newSocket.connect();
          }
        });

        newSocket.on('error', (error) => {
          console.error('Socket error:', error);
          toast.error('Socket error occurred');
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Socket initialization error:', error);
        toast.error('Failed to initialize socket connection');
      }
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [auth.token]);

  return (
    <SocketContext.Provider value={{ socket, activeUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
