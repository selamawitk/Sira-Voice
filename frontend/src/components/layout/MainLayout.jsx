import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import InstallPrompt from '../ui/InstallPrompt.jsx';

const MainLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    /* Changed min-h-screen to h-screen to lock the overall app shell viewport height */
    <div className="flex h-screen bg-[#1A2E35] overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className={`fixed inset-0 z-50 md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
        <div className="absolute left-0 top-0 h-full w-80 bg-[#1A2E35] transform transition-transform duration-300 ease-in-out">
          <Sidebar onClose={() => setIsMobileOpen(false)} />
        </div>
      </div>

      {/* Main Wrapper Container 
        REMOVED: 'overflow-y-auto' from here so the header stays anchored.
        ADDED: 'h-full' to preserve the structural boundary.
      */}
      <div className="flex-1 md:ml-70 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-[#2BB8B8] opacity-[0.05] blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400 opacity-[0.03] blur-[100px] pointer-events-none"></div>

        <Header onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} />

        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 pt-6 py-8 relative z-10 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <InstallPrompt />
      </div>
    </div>
  );
};

export default MainLayout;