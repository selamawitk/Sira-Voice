import React, { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BriefcaseBusiness, 
  Mic, 
  MapPin, 
  ClipboardList, 
  Settings, 
  UserCircle, 
  Globe, 
  FileText, 
  ShieldAlert, 
  Star, 
  X,
  Wallet,
  Bell,
  MessageSquare
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { SocketContext } from '../../context/SocketContextInstance.jsx';
import api from '../../services/api.js';

const Sidebar = ({ onClose }) => {
  const auth = useContext(AuthContext);
  const langCtx = useContext(LanguageContext);
  const socket = useContext(SocketContext);
  
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  const role = auth?.role ?? 'worker';
  const currentUser = auth?.user;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    const fetchUnreadCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await api.get('/chat/conversations');
        if (response.data?.success) {
          const conversations = response.data.data;
          const count = conversations.reduce((acc, conv) => {
            if (conv.lastMessage && conv.lastMessage.sender !== currentUser._id && !conv.lastMessage.read) {
              return acc + 1;
            }
            return acc;
          }, 0);
          setUnreadChatCount(count);
        }
      } catch (error) {
        console.error('Error handling chat badges inside sidebar:', error);
      }
    };

    fetchUnreadCount();
  }, [currentUser?._id]);

  useEffect(() => {
    if (!socket || !currentUser?._id) return;

    const handleLiveMessageBadge = () => {
      if (window.location.pathname === '/chat') return;
      setUnreadChatCount((prev) => prev + 1);
    };

    socket.on('conversation_updated', handleLiveMessageBadge);

    return () => {
      socket.off('conversation_updated', handleLiveMessageBadge);
    };
  }, [socket, currentUser?._id]);

  const getFallbackLabel = (key, englishDefault, amharicDefault, oromoDefault) => {
    if (langCtx?.lang === 'am') return amharicDefault;
    if (langCtx?.lang === 'or') return oromoDefault;
    return englishDefault;
  };

  const chatMenuItem = {
    icon: MessageSquare,
    label: langCtx?.copy?.messages ?? getFallbackLabel('messages', "Messages", "መልእክቶች", "Ergaalee"),
    path: "/chat",
    badgeCount: unreadChatCount
  };

  const workerMenu = [
    { 
      icon: LayoutDashboard, 
      label: langCtx?.copy?.dashboard ?? getFallbackLabel('dashboard', "Dashboard", "ዳሽቦርድ", "Daashboordii"), 
      path: "/dashboard" 
    },
    { 
      icon: BriefcaseBusiness, 
      label: langCtx?.copy?.availableJobs ?? getFallbackLabel('availableJobs', "Available Jobs", "ክፍት ስራዎች", "Hojiiwwan Banamaa"), 
      path: "/available-jobs" 
    },
    { 
      icon: Mic, 
      label: langCtx?.copy?.talkToSira ?? getFallbackLabel('talkToSira', "Talk to Sira", "ከስራ ጋር ይነጋገሩ", "Siraa Wajjin Dubbadhu"), 
      path: "/talk-to-sira", 
      isVoice: true 
    },
    chatMenuItem,
    { 
      icon: FileText, 
      label: langCtx?.copy?.voiceToCV ?? getFallbackLabel('voiceToCV', "Voice-to-CV", "ድምፅ ወደ ሲቪ", "Sagalee Gara CV"), 
      path: "/voice-to-cv", 
      isVoice: true 
    },
    { 
      icon: MapPin, 
      label: langCtx?.copy?.jobMap ?? getFallbackLabel('jobMap', "Job Map", "የስራ ካርታ", "Kaartaa Hojii"), 
      path: "/job-map" 
    },
    { 
      icon: ClipboardList, 
      label: langCtx?.copy?.history ?? getFallbackLabel('history', "History", "ታሪክ", "Seenaa"), 
      path: "/application-history" 
    },
    { 
      icon: Wallet, 
      label: langCtx?.copy?.paymentsTitle ?? getFallbackLabel('paymentsTitle', "Payments", "ክፍያዎች", "Kaffaltiiwwan"), 
      path: "/payments" 
    },
    { 
      icon: Star, 
      label: langCtx?.copy?.ratings ?? getFallbackLabel('ratings', "Ratings", "ደረጃዎች", "Sadarkaa"), 
      path: "/ratings" 
    },
    { 
      icon: UserCircle, 
      label: langCtx?.copy?.profile ?? getFallbackLabel('profile', "My Profile", "የእኔ መገለጫ", "Profaayilii Koo"), 
      path: "/profile" 
    },
  ];

  const employerMenu = [
    { 
      icon: LayoutDashboard, 
      label: langCtx?.copy?.employerDashboard ?? getFallbackLabel('employerDashboard', "Employer Dashboard", "የቀጣሪ ዳሽቦርድ", "Daashboordii Qaxaraa"), 
      path: "/employer-dashboard" 
    },
    { 
      icon: BriefcaseBusiness, 
      label: langCtx?.copy?.postJob ?? getFallbackLabel('postJob', "Post a Job", "ስራ ይለጥፉ", "Hojii Baasi"), 
      path: "/post-job", 
      isVoice: true 
    },
    { 
      icon: ClipboardList, 
      label: langCtx?.copy?.applicants ?? getFallbackLabel('applicants', "Applicants", "የስራ አመልካቾች", "Iyyattoota"), 
      path: "/applicants" 
    },
    chatMenuItem,
    { 
      icon: Star, 
      label: langCtx?.copy?.ratings ?? getFallbackLabel('ratings', "Ratings", "ደረጃዎች", "Sadarkaa"), 
      path: "/ratings" 
    },
  ];

  const adminMenu = [
    { 
      icon: LayoutDashboard, 
      label: langCtx?.copy?.adminDashboard ?? getFallbackLabel('adminDashboard', "Admin Dashboard", "የአስተዳዳሪ ዳሽቦርድ", "የአስተዳዳሪ ዳሽቦርድ"), 
      path: "/admin-dashboard" 
    },
    chatMenuItem,
    { 
      icon: ShieldAlert, 
      label: langCtx?.copy?.scamLog ?? getFallbackLabel('scamLog', "Scam Log", "የማጭበርበር ምዝግብ ማስታወሻ", "የማጭበርበር ምዝግብ ማስታወሻ"), 
      path: "/admin-scam-log" 
    },
    { 
      icon: Bell, 
      label: langCtx?.copy?.notifications ?? getFallbackLabel('notifications', "Notifications", "ማሳወቂያዎች", "Beeksisoota"), 
      path: "/notifications" 
    },
  ];

  const menuItems = role === 'admin' ? adminMenu : role === 'employer' ? employerMenu : workerMenu;

  // Only apply scrollbar hiding fixes for standard legacy browsers on workers
  const workerScrollbarHiddenStyle = role === 'worker' ? {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  } : {};

  return (
    <div className="fixed top-0 left-0 z-50 w-70 h-screen bg-linear-to-b from-[#1A2E35] to-[#0F1D22] flex flex-col p-5 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.2)] overflow-hidden select-none">
      {/* Target style hiding strictly restricted to workers */}
      {role === 'worker' && (
        <style dangerouslySetInnerHTML={{__html: `
          .worker-nav-no-scroll::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}} />
      )}

      <div className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-[#2BB8B8]/12 to-transparent"></div>

      {/* Header Margin: Restored to original layout rules */}
      <div className={`flex flex-col gap-2 relative z-10 shrink-0 ${role === 'worker' ? 'mb-3' : 'mb-6'}`}>
        <div className="flex items-center justify-between text-2xl font-black text-[#2BB8B8]">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-[0_0_15px_rgba(43,184,184,0.28)]">🎙️</span> Sira-Voice
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] font-semibold text-white/60">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Navigation Spacing: space-y-1 for worker, restored original space-y-2 for employers/admins */}
      <nav 
        style={workerScrollbarHiddenStyle}
        className={`flex-1 min-h-0 relative z-10 overflow-y-auto pr-1 ${
          role === 'worker' 
            ? 'space-y-1 worker-nav-no-scroll' 
            : 'space-y-2 custom-sidebar-scroll'
        }`}
      >
        {menuItems.map((item) => (
          <NavLink 
            key={item.label}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 rounded-xl transition-all duration-200 group relative
              ${role === 'worker' ? 'py-2' : 'py-3'} 
              ${isActive 
                ? 'bg-white/5 text-white shadow-[0_8px_16px_rgba(0,0,0,0.25)] font-semibold' 
                : 'text-gray-400 hover:text-white hover:bg-white/2'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                />

                {/* Icon Sizes: w-5 for worker, original w-[18px] layout for employers */}
                <item.icon
                  className={`transition-colors duration-200 ${role === 'worker' ? 'w-5 h-5' : 'w-[18px] h-[18px]'} ${
                    isActive
                      ? item.isVoice
                        ? 'text-[#2BB8B8]'
                        : 'text-white'
                      : item.isVoice
                        ? 'text-[#2BB8B8]/70 group-hover:text-[#2BB8B8]'
                        : 'text-gray-500 group-hover:text-white'
                  }`}
                />

                {/* Text Sizes: custom text-[13px] for worker, original text-[14px] layout for employers */}
                <span className={`tracking-tight flex-1 ${role === 'worker' ? 'text-[13px]' : 'text-[14px]'}`}>{item.label}</span>
                
                {item.badgeCount > 0 && (
                  <span className="relative z-20 bg-rose-500 text-white font-bold text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-slate-950/20 mr-4 animate-pulse">
                    {item.badgeCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Margins: worker stays compact, employer/admin restores mt-6 pt-6 */}
      <div className={`border-t border-white/5 relative z-10 shrink-0 ${role === 'worker' ? 'mt-3 pt-3' : 'mt-6 pt-6'}`}>
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2">
          {langCtx?.copy?.systemLanguage ?? getFallbackLabel('systemLanguage', 'Language', 'ቋንቋ', 'Afaan')}
          <Globe className="w-2.5 h-2.5 text-gray-500" />
        </div>

        <div className="bg-[#15252B] border border-white/5 rounded-xl p-1 flex items-center justify-between gap-1">
          {[
            { key: 'am', name: 'አማ' },
            { key: 'en', name: 'Eng' },
            { key: 'or', name: 'Oro' },
          ].map(({ key, name }) => {
            const isSelected = langCtx?.lang === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => langCtx?.setLang?.(key)}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[11px] font-bold tracking-tight transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#2BB8B8] text-white shadow-[0_2px_8px_rgba(43,184,184,0.3)] scale-[1.02]'
                    : 'text-gray-400 hover:text-white hover:bg-white/2'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;