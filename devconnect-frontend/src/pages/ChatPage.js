// frontend/src/pages/ChatPage.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

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
    };
    socket.emit('chatMessage', msgObj);
    setMessage('');
  };

  return (
    <div className="max-w-xl mx-auto p-4 pt-24">
      <h2 className="text-2xl font-bold mb-4">Community Chat</h2>

      <div className="border rounded p-4 h-64 mb-2 overflow-auto bg-white shadow space-y-2">
        {messages.map((m, idx) => (
          <div key={m.id ? m.id : idx} className="mb-2">
            <strong>{m.user}:</strong> {m.text}
            <span className="text-gray-500 text-sm"> ({m.time})</span>
          </div>
        ))}
      </div>

      {typing && <p className="text-sm italic text-gray-500 h-4 mb-2">{typing}</p>}

      <div className="flex">
        <input
          className="border p-2 rounded-l w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
