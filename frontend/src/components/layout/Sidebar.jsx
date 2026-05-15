import React, { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BriefcaseBusiness, Mic, MapPin, ClipboardList, Settings, UserCircle, Globe, FileText, ShieldAlert, Star, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';

const Sidebar = ({ onClose }) => {
  const auth = useContext(AuthContext);
  const langCtx = useContext(LanguageContext);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const role = auth?.role ?? 'worker';

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

  const workerMenu = [
    { icon: LayoutDashboard, label: langCtx?.copy?.dashboard ?? "Dashboard", path: "/dashboard" },
    { icon: BriefcaseBusiness, label: langCtx?.copy?.availableJobs ?? "Available Jobs", path: "/available-jobs" },
    { icon: Mic, label: langCtx?.copy?.talkToSira ?? "Talk to Sira", path: "/talk-to-sira", isVoice: true },
    { icon: FileText, label: langCtx?.copy?.voiceToCV ?? "Voice-to-CV", path: "/voice-to-cv", isVoice: true },
    { icon: MapPin, label: langCtx?.copy?.jobMap ?? "Job Map", path: "/job-map" },
    { icon: ClipboardList, label: langCtx?.copy?.history ?? "History", path: "/application-history" },
    { icon: Star, label: langCtx?.copy?.ratings ?? "Ratings", path: "/ratings" },
    { icon: UserCircle, label: langCtx?.copy?.profile ?? "My Profile", path: "/profile" },
  ];

  const employerMenu = [
    { icon: LayoutDashboard, label: langCtx?.copy?.employerDashboard ?? "Employer Dashboard", path: "/employer-dashboard" },
    { icon: BriefcaseBusiness, label: langCtx?.copy?.postJob ?? "Post a Job", path: "/post-job", isVoice: true },
    { icon: ClipboardList, label: langCtx?.copy?.applicants ?? "Applicants", path: "/applicants" },
    { icon: Star, label: langCtx?.copy?.ratings ?? "Ratings", path: "/ratings" },
  ];

  const adminMenu = [
    { icon: LayoutDashboard, label: langCtx?.copy?.adminDashboard ?? "Admin Dashboard", path: "/admin-dashboard" },
    { icon: ShieldAlert, label: langCtx?.copy?.scamLog ?? "Scam Log", path: "/admin-scam-log" },
  ];

  const menuItems = role === 'admin' ? adminMenu : role === 'employer' ? employerMenu : workerMenu;

  return (
    <div className="w-70 h-screen bg-linear-to-b from-[#1A2E35] to-[#0F1D22] flex flex-col p-6 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.2)] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-[#2BB8B8]/12 to-transparent"></div>

      {/* Sira-Voice Branding */}
      <div className="flex flex-col gap-4 mb-8 relative z-10">
        <div className="flex items-center justify-between text-2xl font-black text-[#2BB8B8]">
          <div className="flex items-center gap-2">
            <span className="text-3xl drop-shadow-[0_0_15px_rgba(43,184,184,0.28)]">🎙️</span> Sira-Voice
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] font-semibold text-white/80">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-2 relative z-10">
        {menuItems.map((item) => (
          <NavLink 
            key={item.label}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative
              ${isActive 
                ? 'bg-white/6 text-white shadow-[0_10px_20px_rgba(0,0,0,0.35)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/4'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active indicator (required): red dot */}
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                />

                <item.icon
                  className={`w-5 h-5 ${
                    isActive
                      ? item.isVoice
                        ? 'text-[#2BB8B8]'
                        : 'text-white'
                      : item.isVoice
                        ? 'text-[#2BB8B8]/70 group-hover:text-[#2BB8B8]'
                        : 'text-gray-500 group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Language Section */}
      <div className="mt-auto pt-6 border-t border-white/5 relative z-10">
        <div className="flex items-center justify-between text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">
          {langCtx?.copy?.systemLanguage ?? 'System Language'}
          <Globe className="w-3 h-3 text-gray-700" />
        </div>

        <div className="bg-[#1A2E35] border border-white/10 rounded-2xl p-4 space-y-3">
          {[
            { key: 'am', flag: '🇪🇹', name: 'አማርኛ' },
            { key: 'en', flag: '🇬🇧', name: 'English' },
            { key: 'or', flag: '🇪🇹', name: 'Afaan Oromoo' },
          ].map(({ key, flag, name }) => (
            <button
              key={key}
              onClick={() => langCtx?.setLang?.(key)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                langCtx?.lang === key
                  ? 'border-[#2BB8B8] bg-[#133538]'
                  : 'border-white/10 bg-[#1A2E35] hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs">{flag}</span>
                <span className={`text-sm font-bold ${
                  'text-[#2BB8B8]'
                }`}>
                  {name}
                </span>
              </div>
              {langCtx?.lang === key && (
                <div className="w-2 h-2 bg-[#2BB8B8] rounded-full shadow-[0_0_8px_rgba(43,184,184,0.45)]" />
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Sidebar;