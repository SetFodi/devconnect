// frontend/src/pages/ChatPage.js

import React, { useContext, useEffect, useLayoutEffect, useState, useRef } from 'react';
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

  // Refs for managing scroll behavior
  const messagesEndRef = useRef(null); // Reference to the bottom of the messages
  const messagesContainerRef = useRef(null); // Reference to the messages container
  const isAtBottomRef = useRef(true); // Tracks if the user is at the bottom
  const [showScrollButton, setShowScrollButton] = useState(false); // New state

  useEffect(() => {
    socket = io('http://localhost:5000', {
      auth: {
        token: auth.token,
      },
    });

    // Receive chat history with profile pictures
    socket.on('chatHistory', (history) => {
      setMessages(history);
    });

    // Receive new chat messages
    socket.on('chatMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);

      if (!isAtBottomRef.current) {
        setShowScrollButton(true); // Show button when not at bottom
      }

      setTyping('');
    });

    // Listen for chatCleared event
    socket.on('chatCleared', () => {
      setMessages([]);
      toast.info('Chat has been cleared by an administrator.');
    });

    // Receive typing indicators
    socket.on('userTyping', (user) => {
      setTyping(user ? `${user} is typing...` : '');
    });

    socket.on('connect_error', () => {
      toast.error('Connection to chat failed.');
    });

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Option 1: Using scrollIntoView with smooth behavior
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });

      // Option 2: Directly setting scrollTop (commented out)
      // const container = messagesContainerRef.current;
      // container.scrollTop = container.scrollHeight;
    }
  };

  // Handle input change and emit typing status
  const handleChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      socket.emit('typing', auth.user.username);
    } else {
      socket.emit('typing', '');
    }
  };

  // Send a new message
  const sendMessage = () => {
    if (!message.trim()) return;
    const msgObj = {
      user: auth.user.username,
      text: message,
      time: new Date().toLocaleTimeString(),
      // profile_picture is handled by the backend
    };
    socket.emit('chatMessage', msgObj);
    setMessage('');
  };

  // Handle scroll events to determine if user is at the bottom
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Determine if user is within 50px from the bottom
    if (scrollHeight - scrollTop - clientHeight <= 50) {
      isAtBottomRef.current = true;
      setShowScrollButton(false); // Hide button when at bottom
    } else {
      isAtBottomRef.current = false;
    }
  };

  // Function to handle clicking the scroll button
  const handleScrollButtonClick = () => {
    scrollToBottom();
    setShowScrollButton(false);
  };

  // Attach scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    // Cleanup the event listener on unmount
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useLayoutEffect to handle scrolling after messages update
  useLayoutEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Handler to clear chat (Admins only)
  const handleClearChat = () => {
    if (!auth.token || auth.user.role !== 'admin') {
      toast.error('Access denied: Admins only');
      return;
    }

    if (!window.confirm('Are you sure you want to clear the entire chat?')) {
      return;
    }

    socket.emit('clearChat');
  };

  return (
    <div className="max-w-xl mx-auto p-4 pt-24 relative"> {/* Added 'relative' for positioning */}
      <h2 className="text-2xl font-bold mb-4 text-center">Community Chat</h2>

      {/* Admin Clear Chat Button */}
      {auth.user.role === 'admin' && (
        <div className="mb-4 text-right">
          <button
            onClick={handleClearChat}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-300"
            aria-label="Clear Chat"
          >
            Clear Chat
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div
        className="border rounded p-4 h-80 mb-2 overflow-auto bg-white dark:bg-gray-700 shadow space-y-2"
        ref={messagesContainerRef} // Attach the ref to the container
      >
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
              <Avatar
                name={m.user}
                size="40"
                round={true}
              />
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

        {/* Dummy div to anchor scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typing && <p className="text-sm italic text-gray-500 dark:text-gray-400 h-4 mb-2">{typing}</p>}

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={handleScrollButtonClick}
          className="absolute bottom-24 right-4 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}

      {/* Message Input */}
      <div className="flex">
        <input
          className="border border-gray-300 dark:border-gray-600 p-2 rounded-l w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
          placeholder="Type your message..."
          value={message}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          aria-label="Type your message"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700 transition-all"
          aria-label="Send Message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
