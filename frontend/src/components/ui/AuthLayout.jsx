import React from 'react';
import { Mic } from 'lucide-react';
import authBg from '../../assets/images/auth bg img.png';
import robotImg from '../../assets/images/robot.png';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-cover bg-center"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      {/* Darkened Overlay */}
      <div className="absolute inset-0 bg-[#1A2E35]/85 backdrop-blur-[2px] z-0"></div>

      <div className="absolute left-[-10%] top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2BB8B8] opacity-[0.14] blur-[150px] rounded-full z-1"></div>
      <div className="absolute right-[-5%] bottom-[-10%] w-[600px] h-[600px] bg-[#2BB8B8] opacity-[0.10] blur-[120px] rounded-full z-1"></div>

      {/* Main Container */}
      <div className="container mx-auto max-w-7xl w-full flex flex-col md:flex-row items-center justify-center md:justify-between z-20 px-4 sm:px-8 lg:px-20 py-6 md:py-10">
        
        {/* LEFT SIDE: LOGO, TEXT, ROBOT - Hidden on small screens */}
        <div className="hidden md:flex flex-col h-full justify-between items-start space-y-12">
          
          <div className="space-y-4 -mt-10"> 
            <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
        >
          <Mic className="w-6 h-6 text-[#2BB8B8] drop-shadow-md" />
          <div className="text-white text-2xl font-black tracking-tight">
            Sira-<span className="text-[#2BB8B8]">Voice</span>
          </div>
        </div>
            <h1 className="text-4xl lg:text-4xl mt-6 font-black text-white leading-tight tracking-tight">
              Voice → AI → 
              <span className="text-[#2BB8B8] drop-shadow-[0_0_20px_rgba(43,184,184,0.28)]"> Agent Match</span>
            </h1>
          </div>

          <div className="relative w-[320px] h-[320px] lg:w-[400px] lg:h-[400px] -mt-4 rounded-[3rem] border-2 border-[#2BB8B8]/20 p-2 backdrop-blur-md overflow-hidden bg-gradient-to-tr from-[#1A2E35]/40 to-transparent shadow-2xl">
             <img 
               src={robotImg} 
               alt="AI Agent" 
               className="w-full h-full object-cover opacity-90 scale-110"
             />
             <div className="absolute bottom-8 left-0 w-full flex justify-center gap-1.5">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-1 bg-[#2BB8B8] opacity-50 rounded-full animate-bounce" style={{ height: `${10 + (i % 3) * 6}px`, animationDelay: `${i * 0.15}s` }}></div>
                ))}
             </div>
          </div>
        </div>

        {/* ✅ RIGHT SIDE: CARD - Full width on mobile, fills available space on desktop */}
        <div className="relative z-50 mt-0 md:mt-2 flex justify-center w-full md:flex-1">
          <div className="w-full max-w-[95vw] sm:max-w-[540px] md:max-w-[640px] bg-[#1A2E35]/70 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_30px_50px_rgba(0,0,0,0.6)] border-b-white/20">
             
             <div className="mb-6">
               <h2 className="text-2xl font-black -mt-4 text-center text-white mb-1 tracking-tight">{title}</h2>
               <p className="text-gray-400 text-center text-[13px] font-medium leading-relaxed">{subtitle}</p>
             </div>

             <div className="flex flex-col">
               {children}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;