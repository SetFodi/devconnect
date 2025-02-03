// frontend/src/pages/ChatPage.js
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback
} from 'react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { toast } from 'react-toastify';
import Avatar from 'react-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaArrowDown, FaPaperPlane } from 'react-icons/fa';

export default function ChatPage() {
  const { auth } = useContext(AuthContext);
  const { socket, activeUsers } = useContext(SocketContext);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const directMessagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [directMessages, setDirectMessages] = useState({});
  const [directMessage, setDirectMessage] = useState('');

  const [unreadMessages, setUnreadMessages] = useState(() => {
    const stored = localStorage.getItem('unreadMessages');
    return stored ? JSON.parse(stored) : {};
  });

  const [searchTerm, setSearchTerm] = useState('');
  const userId = Number(auth.user.id);

  // Debugging logs for active users
  useEffect(() => {
    console.log('Current userId:', userId);
    console.log('Active Users:', activeUsers);
  }, [activeUsers, userId]);

  // Setup Socket.IO listeners with animations for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('chatHistory', (history) => {
      console.log('Received chatHistory:', history);
      setMessages(history);
    });

    socket.on('chatMessage', (msg) => {
      console.log('Received chatMessage:', msg);
      setMessages((prev) => [...prev, msg]);
      if (!isAtBottomRef.current) setShowScrollButton(true);
      setTyping('');
    });

    socket.on('chatCleared', () => {
      setMessages([]);
      toast.info('Chat has been cleared by an administrator.');
    });

    socket.on('userTyping', (user) => {
      setTyping(user ? `${user} is typing...` : '');
    });

    socket.on('directMessage', (message) => {
      console.log('Received directMessage:', message);
      const otherUserId = message.senderId === userId ? message.recipientId : message.senderId;
      setDirectMessages((prev) => {
        const userMessages = prev[otherUserId] || [];
        if (!userMessages.some((c) => c.id === message.id)) {
          return { ...prev, [otherUserId]: [...userMessages, message] };
        }
        return prev;
      });

      if (message.senderId !== userId && otherUserId !== selectedUser?.userId) {
        setUnreadMessages((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
        toast.info(`New message from ${message.senderUsername}`);
      } else if (message.senderId !== userId) {
        toast.info(`New message from ${message.senderUsername}`);
      }
    });

    socket.on('activeUsers', (users) => {
      console.log('Updated active users:', users);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'A socket error occurred');
    });

    socket.emit('requestChatHistory');

    return () => {
      socket.off('chatHistory');
      socket.off('chatMessage');
      socket.off('chatCleared');
      socket.off('userTyping');
      socket.off('directMessage');
      socket.off('activeUsers');
      socket.off('error');
    };
  }, [socket, userId, selectedUser]);

  useEffect(() => {
    localStorage.setItem('unreadMessages', JSON.stringify(unreadMessages));
  }, [unreadMessages]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollToDirectMessagesBottom = useCallback(() => {
    if (directMessagesEndRef.current) {
      directMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleUserClick = async (user) => {
    if (Number(user.userId) === userId) {
      toast.warning("You cannot send messages to yourself.");
      return;
    }
    setSelectedUser(user);
    setIsDirectMessageOpen(true);
    setUnreadMessages((prev) => {
      const updated = { ...prev };
      delete updated[user.userId];
      return updated;
    });

    if (!directMessages[user.userId]) {
      try {
        const response = await fetch(`http://localhost:5000/api/messages/${user.userId}`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch direct messages');
        }
        const data = await response.json();
        const parsedData = data.map((msg) => ({
          ...msg,
          senderId: Number(msg.senderId),
          recipientId: Number(msg.recipientId),
        }));
        setDirectMessages((prev) => ({ ...prev, [user.userId]: parsedData }));
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    }
  };

  const sendDirectMessage = () => {
    if (selectedUser && directMessage.trim()) {
      const directMessageObj = {
        senderId: userId,
        recipientId: selectedUser.userId,
        message: directMessage.trim(),
      };
      console.log('Sending directMessage:', directMessageObj);
      socket.emit('directMessage', directMessageObj);
      setDirectMessage('');
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', e.target.value.trim() ? auth.user.username : '');
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const msgObj = {
      user: auth.user.username,
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    console.log('Sending chatMessage:', msgObj);
    socket.emit('chatMessage', msgObj);
    setMessage('');
  };

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight <= 50) {
      isAtBottomRef.current = true;
      setShowScrollButton(false);
    } else {
      isAtBottomRef.current = false;
    }
  };

  const handleScrollButtonClick = () => {
    scrollToBottom();
    setShowScrollButton(false);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useLayoutEffect(() => {
    if (selectedUser && isAtBottomRef.current) {
      scrollToDirectMessagesBottom();
    }
  }, [directMessages, selectedUser, scrollToDirectMessagesBottom]);

  const handleClearChat = () => {
    if (!auth.token || auth.user.role !== 'admin') {
      toast.error('Access denied: Admins only');
      return;
    }
    if (!window.confirm('Are you sure you want to clear the entire chat?')) return;
    socket.emit('clearChat');
  };

  // Variants for modal animations
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  // Variants for message bubbles
  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar for Active Users */}
      <div className="w-1/4 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex items-center mb-4">
          <FaSearch className="text-gray-500 dark:text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search Users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search Users"
          />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">Active Users</h3>
        <ul className="flex-1 overflow-auto">
          {activeUsers
            .filter((user) => Number(user.userId) !== userId)
            .filter((user) =>
              user.username.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((user) => (
              <li
                key={user.userId}
                onClick={() => handleUserClick(user)}
                className={`flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  unreadMessages[user.userId] > 0 ? 'bg-blue-100 dark:bg-blue-700' : ''
                }`}
                aria-label={`Chat with ${user.username}`}
              >
                <Avatar
                  src={user.profile_picture}
                  name={user.username}
                  size="40"
                  round={true}
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {user.username}
                  </span>
                </div>
                {unreadMessages[user.userId] > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                    {unreadMessages[user.userId]}
                  </span>
                )}
              </li>
            ))}
        </ul>
      </div>

      {/* Main Chat Area */}
      <div className="w-3/4 flex flex-col">
        {/* Header Bar */}
        <motion.div
          className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-2xl font-bold">Community Chat</h2>
          {auth.user.role === 'admin' && (
            <button
              onClick={handleClearChat}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors duration-300"
              aria-label="Clear Chat"
            >
              Clear Chat
            </button>
          )}
        </motion.div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4" ref={messagesContainerRef}>
            {messages.map((m, idx) => (
              <motion.div
                key={m.id ? m.id : idx}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 }}
                className={`flex ${m.user === auth.user.username ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-md flex items-end space-x-2">
                  {m.user !== auth.user.username && (
                    <Avatar
                      src={m.profile_picture}
                      name={m.user}
                      size="40"
                      round={true}
                      className="w-10 h-10"
                    />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        @{m.user}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {m.time}
                      </span>
                    </div>
                    <p
                      className={`px-4 py-2 rounded-lg ${
                        m.user === auth.user.username
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {typing && (
            <motion.p
              className="text-sm italic text-gray-500 dark:text-gray-400 mt-2"
              aria-live="polite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } }}
            >
              {typing}
            </motion.p>
          )}

          {showScrollButton && (
            <motion.button
              onClick={handleScrollButtonClick}
              className="fixed bottom-24 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              aria-label="Scroll to bottom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FaArrowDown />
            </motion.button>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          <input
            className="flex-1 border border-gray-300 dark:border-gray-600 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            placeholder="Type your message..."
            value={message}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            aria-label="Type your message"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors flex items-center justify-center"
            aria-label="Send Message"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>

      {/* Direct Messaging Modal */}
      <AnimatePresence>
        {isDirectMessageOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              className="bg-white dark:bg-gray-800 w-11/12 md:w-3/4 lg:w-1/2 rounded-xl shadow-2xl p-6 relative"
            >
              <button
                onClick={() => setIsDirectMessageOpen(false)}
                className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                aria-label="Close Direct Message"
              >
                <FaTimes size={20} />
              </button>
              <div className="flex items-center mb-4">
                <Avatar
                  src={selectedUser.profile_picture}
                  name={selectedUser.username}
                  size="50"
                  round={true}
                  className="flex-shrink-0 mr-3"
                />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Chat with {selectedUser.username}
                </h3>
              </div>
              <div className="space-y-4 mb-4 overflow-auto h-80">
                {(directMessages[selectedUser.userId] || []).map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-md flex items-end space-x-2">
                      {message.senderId !== userId && (
                        <Avatar
                          src={message.profile_picture}
                          name={message.senderUsername}
                          size="35"
                          round={true}
                          className="flex-shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {message.senderId === userId ? 'You' : `@${message.senderUsername}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p
                          className={`px-4 py-2 rounded-lg ${
                            message.senderId === userId
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                          }`}
                        >
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={directMessagesEndRef} />
              </div>
              <div className="flex space-x-2">
                <input
                  className="flex-1 border border-gray-300 dark:border-gray-600 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Type your message..."
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendDirectMessage()}
                  aria-label="Type your direct message"
                />
                <button
                  onClick={sendDirectMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition-colors flex items-center justify-center"
                  aria-label="Send Direct Message"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
