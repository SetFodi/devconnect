// frontend/src/pages/ChatPage.js

import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion } from 'framer-motion';

let socket;

export default function ChatPage() {
  const { auth } = useContext(AuthContext);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState('');

  useEffect(() => {
    socket = io('http://localhost:5000');

    // 1) On connect, the server will emit "chatHistory"
    socket.on('chatHistory', (history) => {
      setMessages(history);
    });

    // 2) Listen for chatMessage events (real-time new messages)
    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      setTyping('');
    });

    // 3) Listen for "userTyping" event
    socket.on('userTyping', (user) => {
      setTyping(user ? `${user} is typing...` : '');
    });

    socket.on('connect_error', () => {
      toast.error('Connection to chat failed.');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      socket.emit('typing', auth.user.username);
    } else {
      socket.emit('typing', '');
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const msgObj = {
      user: auth.user.username,
      text: message,
      // We can store time as a string or actual DATETIME
      time: new Date().toLocaleTimeString(),
      // profile_picture will be handled by the backend
    };
    socket.emit('chatMessage', msgObj);
    setMessage('');
  };

  return (
    <div className="max-w-xl mx-auto p-4 pt-24">
      <h2 className="text-2xl font-bold mb-4 text-center">Community Chat</h2>

      <div className="border rounded p-4 h-80 mb-2 overflow-auto bg-white dark:bg-gray-700 shadow space-y-2">
        {messages.map((m, idx) => (
          <motion.div
            key={m.id ? m.id : idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-start space-x-2 ${
              m.user === auth.user.username ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Conditionally Render Profile Picture or Avatar */}
            {m.profile_picture ? (
              <img
                src={m.profile_picture}
                alt={`${m.user}'s profile`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <Avatar name={m.user} size="40" round={true} />
            )}

            <div className={`flex flex-col ${m.user === auth.user.username ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">@{m.user}</span>
                <span className="text-gray-500 text-sm">{m.time}</span>
              </div>
              <p className="bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg max-w-xs">
                {m.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {typing && <p className="text-sm italic text-gray-500 dark:text-gray-400 h-4 mb-2">{typing}</p>}

      <div className="flex">
        <input
          className="border border-gray-300 dark:border-gray-600 p-2 rounded-l w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
          placeholder="Type your message..."
          value={message}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}
