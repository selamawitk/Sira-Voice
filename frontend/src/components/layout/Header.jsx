import React, { useContext, useEffect, useState } from 'react';
import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContext.jsx';
import { ToastContext } from '../../components/ui/ToastProvider.jsx';
import { connectSocket, disconnectSocket } from '../../services/socketService.js';

const Header = ({ onMobileMenuToggle }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  const handleLogout = () => {
    auth?.logout?.();
    navigate('/login');
  };

  useEffect(() => {
    if (!user?._id) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(user._id);
    const handleNotification = (payload) => {
      setHasUnread(true);
      toast?.show?.(payload?.message ?? 'New notification received', 'success');
    };

    const handleMatch = (payload) => {
      setHasUnread(true);
      toast?.show?.(payload?.message ?? 'New job match available', 'success');
    };

    const handleApplicationStatus = (payload) => {
      setHasUnread(true);
      toast?.show?.(payload?.message ?? 'Application status updated', 'success');
    };

    socket.on('notification', handleNotification);
    socket.on('new_match', handleMatch);
    socket.on('new_job_match', handleMatch);
    socket.on('application_status', handleApplicationStatus);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('new_match', handleMatch);
      socket.off('new_job_match', handleMatch);
      socket.off('application_status', handleApplicationStatus);
    };
  }, [user?._id, toast]);

  const clearNotifications = () => {
    setHasUnread(false);
  };

  return (
    <header className="px-6 md:px-10 py-6 flex justify-between items-center sticky top-0 bg-[#1A2E35]/70 backdrop-blur-md z-30 border-b border-white/5">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 text-white/60" onClick={onMobileMenuToggle}>
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block w-64 lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder={lang?.copy?.headerSearchPlaceholder ?? 'Search jobs by voice or text…'}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-white text-sm outline-none focus:border-[#2BB8B8]/40 transition-all placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Language switcher */}
        <div className="hidden sm:block">
          <select
            value={lang?.lang ?? 'en'}
            onChange={(e) => lang?.setLang?.(e.target.value)}
            className="bg-[#1A2E35] border border-[#2BB8B8] text-[#2BB8B8] rounded-2xl px-4 py-2 text-sm font-bold outline-none shadow-inner shadow-[#2BB8B8]/10 focus:border-[#2BB8B8]"
          >
            {(lang?.options ?? []).map((opt) => (
              <option key={opt.key} value={opt.key} className="bg-[#1A2E35] text-[#2BB8B8]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={clearNotifications}
          className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-[#2BB8B8] transition-all"
        >
          <Bell className="w-5 h-5" />
          {hasUnread ? (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1A2E35] animate-ping" />
          ) : null}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-white">{user?.fullName ?? 'Guest'}</p>
            <p className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest">
              {user?.role ? `${user.role}` : 'Not signed in'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-[#2BB8B8] to-cyan-400 p-0.5 shadow-lg shadow-[#2BB8B8]/10">
            <div className="w-full h-full rounded-[14px] bg-[#1A2E35] flex items-center justify-center text-white font-black">
              {(user?.fullName?.[0] ?? 'S').toUpperCase()}
            </div>
          </div>
          {auth?.isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-3 p-2 rounded-xl bg-[#1A2E35]/80 border border-white/10 text-white/70 hover:text-[#2BB8B8] transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;

