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
  Wallet 
} from 'lucide-react';
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
    // 🌍 Fixed English Fallback: Defaulting to Amharic if context translations aren't loaded yet
    { icon: Wallet, label: langCtx?.copy?.paymentsTitle ?? "ክፍያዎች", path: "/payments" },
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
    /* 👉 THE SCROLL FIX:
      Changed from simple dimensions to 'fixed top-0 left-0 h-screen z-40'. 
      This locks the component canvas to the device screen viewport. It cannot scroll.
    */
    <div className="fixed top-0 left-0 z-40 w-70 h-screen bg-linear-to-b from-[#1A2E35] to-[#0F1D22] flex flex-col p-5 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.2)] relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-[#2BB8B8]/12 to-transparent"></div>

      {/* Sira-Voice Branding */}
      <div className="flex flex-col gap-2 mb-5 relative z-10 flex-shrink-0">
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

      {/* Primary Navigation */}
      <nav className="flex-1 min-h-0 space-y-1 relative z-10 overflow-y-auto pr-1 custom-sidebar-scroll">
        {menuItems.map((item) => (
          <NavLink 
            key={item.label}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 group relative
              ${isActive 
                ? 'bg-white/5 text-white shadow-[0_8px_16px_rgba(0,0,0,0.25)] font-semibold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active Red Indicator Dot */}
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}
                />

                <item.icon
                  className={`w-[18px] h-[18px] transition-colors duration-200 ${
                    isActive
                      ? item.isVoice
                        ? 'text-[#2BB8B8]'
                        : 'text-white'
                      : item.isVoice
                        ? 'text-[#2BB8B8]/70 group-hover:text-[#2BB8B8]'
                        : 'text-gray-500 group-hover:text-white'
                  }`}
                />
                <span className="text-xs tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Compact Language Selector Section (Replaced Stack with Inline Row Button Matrix) */}
      <div className="mt-4 pt-4 border-t border-white/5 relative z-10 flex-shrink-0">
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2">
          {langCtx?.copy?.systemLanguage ?? 'Language'}
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
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
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