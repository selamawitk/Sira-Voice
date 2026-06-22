import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import api from '../../services/api.js';
import { SocketContext } from '../../context/SocketContextInstance.jsx';
import { Send, User, ShieldCheck, Loader2 } from 'lucide-react';

const ChatWindow = ({ conversation, currentUser, activeLang }) => {
  const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  const targetParticipant = currentUser?.role === 'employer' ? conversation.worker : conversation.employer;

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/chat/conversations/${conversation._id}/messages`);
        if (response.data?.success) {
          setMessages(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching chat histories:', error);
      } finally {
        setLoading(false);
      }
    };

    if (conversation?._id) {
      fetchMessages();
    }
  }, [conversation._id]);

  useEffect(() => {
    if (!socket || !conversation._id) return;

    socket.emit('join_conversation', conversation._id);

    if (currentUser?._id) {
      socket.emit('messages_read', { conversationId: conversation._id });
    }

    const handleIncomingMessage = (message) => {
      if (message.conversationId === conversation._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTyping = ({ userId }) => {
      if (userId !== currentUser?._id) {
        setTypingUser(userId);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };

    socket.on('receive_message', handleIncomingMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.emit('leave_conversation', conversation._id);
      socket.off('receive_message', handleIncomingMessage);
      socket.off('typing', handleTyping);
      clearTimeout(typingTimerRef.current);
    };
  }, [socket, conversation._id, currentUser?._id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (socket && conversation._id) {
      socket.emit('typing', { conversationId: conversation._id, userId: currentUser?._id });
    }
  }, [socket, conversation._id, currentUser?._id]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !socket) return;

    const payload = {
      conversationId: conversation._id,
      senderId: currentUser._id,
      receiverId: targetParticipant?._id,
      text: newMessageText.trim()
    };

    socket.emit('send_message', payload);
    setNewMessageText('');
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 relative">
            {targetParticipant?.avatar ? (
              <img src={targetParticipant.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-1.5 leading-snug">
              {targetParticipant?.name || 'User'}
              {targetParticipant?.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            </h3>
            <p className="text-[10px] text-white/40 tracking-wide font-medium uppercase mt-0.5">
              {conversation.job?.title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <Loader2 className="w-6 h-6 text-[#2BB8B8] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-xs italic">
            {activeLang === 'am' ? 'የመልእክት ታሪክ ባዶ ነው:: የመጀመሪያውን መልእክት ይላኩ::' : 'No message records found. Type a message below to start.'}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUser?._id;
            return (
              <div key={msg._id || msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium tracking-wide break-words shadow-md transition-all normal-case ${
                  isMe 
                    ? 'bg-[#2BB8B8] text-slate-950 rounded-tr-none' 
                    : 'bg-white/5 border border-white/5 text-white rounded-tl-none'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <span className={`text-[9px] block text-right mt-1 font-bold ${isMe ? 'text-slate-950/40' : 'text-white/20'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {typingUser && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/5 text-white/60 px-4 py-2 rounded-2xl rounded-tl-none text-xs italic">
              {activeLang === 'am' ? 'በማተም ላይ...' : activeLang === 'or' ? 'Barreessaa jira...' : 'Typing...'}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-slate-900/20 backdrop-blur-md flex gap-3 items-center">
        <input
          type="text"
          value={newMessageText}
          onChange={(e) => { setNewMessageText(e.target.value); handleTyping(); }}
          placeholder={activeLang === 'am' ? 'መልእክት ይፃፉ...' : activeLang === 'or' ? 'Ergaa barreessi...' : 'Type your message here...'}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-xs font-medium"
        />
        <button
          type="submit"
          disabled={!newMessageText.trim()}
          aria-label="Send message"
          className="w-10 h-10 rounded-xl bg-[#2BB8B8] text-slate-950 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 shadow-md shadow-[#2BB8B8]/10 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
