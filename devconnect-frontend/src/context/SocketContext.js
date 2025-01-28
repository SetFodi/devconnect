import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify'; // Import toast if you're using it

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { auth } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

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

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          toast.error('Connection error. Retrying...');
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // the disconnection was initiated by the server, reconnect manually
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
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};