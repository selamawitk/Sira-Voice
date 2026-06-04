import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api.js';
import { SocketContext } from '../../context/SocketContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import ChatWindow from '../../components/chat/ChatWindow.jsx';
import { MessageSquare, Briefcase, User, Search, Loader2 } from 'lucide-react';

const ChatLayout = () => {
  const socket = useContext(SocketContext);
  const auth = useContext(AuthContext);
  const lang = useContext(LanguageContext);
  
  const currentUser = auth?.user;
  const activeLang = lang?.lang || 'en';

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get('/chat/conversations');
        if (response.data?.success) {
          setConversations(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket || !currentUser?._id) return;

    const handleConversationUpdate = (data) => {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c._id === data.conversationId) {
            return {
              ...c,
              lastMessage: data.lastMessage,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
        return [...updated].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('conversation_updated', handleConversationUpdate);

    return () => {
      socket.off('conversation_updated', handleConversationUpdate);
    };
  }, [socket, currentUser?._id]);

  const getParticipantDetails = (conversation) => {
    if (currentUser?.role === 'employer') {
      return {
        name: conversation.worker?.name || 'Worker',
        avatar: conversation.worker?.avatar,
        email: conversation.worker?.email
      };
    }
    return {
      name: conversation.employer?.name || 'Employer',
      avatar: conversation.employer?.avatar,
      email: conversation.employer?.email
    };
  };

  const filteredConversations = conversations.filter((c) => {
    const details = getParticipantDetails(c);
    const jobTitle = c.job?.title || '';
    const query = searchQuery.toLowerCase();
    return (
      details.name.toLowerCase().includes(query) || 
      jobTitle.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8 h-[calc(100vh-120px)] flex gap-6">
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/3 border border-white/10 rounded-4xl overflow-hidden backdrop-blur-md shrink-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <h1 className="text-xl text-white font-semibold tracking-tight italic px-1">
            {activeLang === 'am' ? 'መልእክቶች' : activeLang === 'or' ? 'Ergaalee' : 'Messages'}
          </h1>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeLang === 'am' ? 'ፈልግ...' : activeLang === 'or' ? 'Barbaadi...' : 'Search chat or job...'}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all text-xs font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <Loader2 className="w-6 h-6 text-[#2BB8B8] animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-xs normal-case">
              {activeLang === 'am' ? 'ምንም መልእክት አልተገኘም' : 'No active connections found.'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const party = getParticipantDetails(c);
              const isSelected = selectedConversation?._id === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => setSelectedConversation(c)}
                  className={`w-full p-3.5 rounded-2xl flex items-start gap-3 transition-all text-left ${
                    isSelected 
                      ? 'bg-[#2BB8B8]/10 border border-[#2BB8B8]/30' 
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 relative">
                    {party.avatar ? (
                      <img src={party.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold text-sm truncate">{party.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-white/50 text-[11px] font-medium truncate">
                      <Briefcase className="w-3 h-3 shrink-0 opacity-60" />
                      <span className="truncate">{c.job?.title}</span>
                    </div>
                    {c.lastMessage && (
                      <p className="text-white/30 text-xs truncate normal-case pt-0.5">
                        {c.lastMessage.text}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 bg-white/3 border border-white/10 rounded-4xl overflow-hidden backdrop-blur-md flex flex-col">
        {selectedConversation ? (
          <ChatWindow 
            conversation={selectedConversation} 
            currentUser={currentUser}
            activeLang={activeLang}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 shadow-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-semibold text-base">
                {activeLang === 'am' ? 'ውይይት ይምረጡ' : activeLang === 'or' ? 'Waliigaltee Filadhu' : 'Select a Conversation'}
              </h3>
              <p className="text-white/40 text-xs max-w-xs mx-auto normal-case">
                {activeLang === 'am' 
                  ? 'ስለ ስራው ዝርዝር ሁኔታ ለመወያየት ከግራ በኩል ሰራተኛ ወይም አሰሪ ይምረጡ::' 
                  : 'Choose a thread from the sidebar workspace to sync parameters, negotiate contract scopes, or wire payments.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;