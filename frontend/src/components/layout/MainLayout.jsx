import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';

const MainLayout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#1A2E35] overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden ${isMobileOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
        <div className="absolute left-0 top-0 h-full w-80 bg-[#1A2E35] transform transition-transform duration-300 ease-in-out">
          <Sidebar onClose={() => setIsMobileOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-[#2BB8B8] opacity-[0.05] blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400 opacity-[0.03] blur-[100px] pointer-events-none"></div>

        <Header onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} />

        {/* Dynamic Content */}
        <main className="px-4 sm:px-6 lg:px-8 pt-20 py-8 relative z-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;