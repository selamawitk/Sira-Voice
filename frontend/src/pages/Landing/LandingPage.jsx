import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import heroAgentImg from '../../assets/images/hero-ai-agent.png';
import employerDashboardImg from '../../assets/images/employer-dashboard.png';
import workerInterfaceImg from '../../assets/images/worker-interface-v2.png';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="font-sans antialiased bg-[#1A2E35] text-white">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden px-6 md:px-16 bg-[#1A2E35]">
        {/* Decorative Background Glow */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="w-full h-full bg-[#2BB8B8] blur-[120px] rounded-full translate-x-1/2"></div>
        </div>

        <div className="container mx-auto flex flex-col-reverse lg:flex-row gap-12 items-center relative z-10">
          
          {/* Left Side: Content */}
          <div className="text- space-y-8">
            <h1 className="text-5xl md:text-5xl font-black leading-[1.1] tracking-tight">
              Sira-Voice: <br/>The AI Agent for Everyday Workers
            </h1>
            <p className="text-xl text-gray-300 max-w-lg leading-relaxed font-medium">
              Speak your skills, get hired, and let Sira-Voice handle the matching. 
              Amharic, Afan Oromo, English—your voice is your CV.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-6">
              <button 
                onClick={() => navigate('/register?role=worker')}
                className="bg-[#FF8A00] px-10 py-4 rounded-full font-bold hover:scale-105 transition shadow-xl text-gray-800 flex flex-col items-center leading-tight group"
              >
                <span>I'm a Worker →</span>
                <span className="text-[10px] font-normal opacity-90 uppercase tracking-wider">Go to Voice Profile</span>
              </button>
              <button 
                onClick={() => navigate('/register?role=employer')}
                className="bg-[#2BB8B8] px-10 py-4 rounded-full font-bold hover:scale-105 transition shadow-xl text-slate-950 flex flex-col items-center leading-tight group"
              >
                <span>I'm an Employer →</span>
                <span className="text-[10px] font-normal opacity-90 uppercase tracking-wider">Post a Job</span>
              </button>
            </div>
            
            {/* Status Footer */}
            <div className="flex items-center gap-4 pt-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#2BB8B8] rounded-full animate-ping opacity-25"></div>
                <div className="relative w-12 h-12 bg-[#2BB8B8] rounded-full flex items-center justify-center text-xl shadow-lg text-slate-950">🎙️</div>
              </div>
              <div className="h-0.5 w-32 bg-linear-to-r from-[#2BB8B8] to-transparent"></div>
              <span className="text-xs text-[#2BB8B8] font-black uppercase tracking-[0.2em]">Voice → AI → Job Match</span>
            </div>
          </div>

          {/* Right Side */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative group overflow-hidden rounded-[4rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] border border-white/10 -mt-20 transition-all duration-700">
              <img 
                src={heroAgentImg} 
                alt="Sira Voice AI Agent" 
                className="w-full h-full max-w-md object-contain max-h-[40vh] sm:max-h-[50vh] lg:max-h-[60vh] transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                style={{ minHeight: '350px' }} 
              />
              
              <div className="absolute inset-0 bg-linear-to-t from-[#1A2E35]/80 via-transparent to-transparent opacity-90"></div>
              
                <div className="absolute bottom-6 left-6 bg-[#2BB8B8] text-slate-950 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Your AI Job Agent
                </div>
            </div>
          </div>

        </div>
      </section>
      
      {/* --- THE BIG SHIFT (ABOUT) SECTION --- */}
      <section id="about" className="py-20 bg-[#FDF8EE]">
        <div className="container mx-auto px-6 md:px-16">
          <div className="text-center mb-8 space-y-2">
            <p className="text-[#FF8A00] font-black uppercase tracking-widest text-xs">The Big Shift 🧠</p>
            <h2 className="text-3xl md:text-5xl font-black italic text-gray-800 leading-tight">
              Just speak <span className="text-[#2BB8B8]">Sira</span> finds, applies, and manages jobs for you.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Agency Card */}
            <div className="space-y-4 bg-white p-8 rounded-[3rem] shadow-xl border border-orange-100">
              <h3 className="text-2xl font-black border-b pb-4 text-gray-800">Agency-Level Impact</h3>
              <div className="space-y-6">
                <div className="opacity-40">
                  <p className="font-bold text-red-500 line-through text-sm">❌ Before: Manual Effort</p>
                  <p className="text-xs">Users search jobs and apply manually. Too much friction.</p>
                </div>
                <div className="bg-green-50 p-6 rounded-2xl border-l-8 border-green-500">
                  <p className="font-bold text-green-700 text-xl">✅ Now: AI Agency</p>
                  <p className="text-sm font-semibold text-green-900 mt-2">
                    User speaks. AI Agent does EVERYTHING—creates profile, finds matches, and applies automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Feature Cards */}
            <div className="space-y-8">
              <div className="flex gap-6 items-center">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-md text-3xl flex items-center justify-center shrink-0">🤖</div>
                <div>
                  <h4 className="font-black text-xl mb-1 text-gray-800">AI Job Agent</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">It’s not a job board; it’s a personal assistant. It monitors jobs and applies for you while you sleep.</p>
                </div>
              </div>
              <div className="flex gap-6 items-center">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-md text-3xl flex items-center justify-center shrink-0">🇪🇹</div>
                <div>
                  <h4 className="font-black text-xl mb-1 text-gray-800">Local Language Mastery</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">Built for Ethiopia. Speak in Amharic, Afan Oromo, or English. Sira understands your skills perfectly.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section id="how-it-works" className="py-24 bg-[#FDF8EE]">
        <div className="container mx-auto px-6 md:px-16">
          <div className="text-center mb-16 space-y-4">
            <p className="text-[#FF8A00] font-black uppercase tracking-widest text-sm">Step-by-Step 🛠️</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-800">
              Your Voice Becomes Your CV
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-6 bg-white p-10 rounded-[3rem] shadow-xl border border-orange-100 border-l-8 border-l-[#FF8A00]">
              <div className="flex items-center gap-4">
                <span className="bg-[#FF8A00] text-gray-800 w-10 h-10 rounded-full flex items-center justify-center font-black">1</span>
                <h3 className="text-2xl font-black italic text-gray-800">Speak Skills</h3>
              </div>
              <p className="text-gray-600 font-medium leading-relaxed">
                Just speak naturally. AI extracts your skills, experience, and preferred locations directly from your voice.
              </p>
              <div className="flex gap-2 pt-2">
                <span className="bg-orange-50 px-3 py-1 rounded-lg text-xs font-bold text-[#FF8A00]">AMHARIC</span>
                <span className="bg-orange-50 px-3 py-1 rounded-lg text-xs font-bold text-[#FF8A00]">OROMO</span>
              </div>
            </div>

            <div className="space-y-6 bg-white/5 p-10 rounded-[3rem] shadow-xl border border-white/10 border-l-8 border-l-[#2BB8B8]">
              <div className="flex items-center gap-4">
                <span className="bg-[#2BB8B8] text-slate-950 w-10 h-10 rounded-full flex items-center justify-center font-black">2</span>
                <h3 className="text-2xl font-black italic text-gray-800">AI Matches</h3>
              </div>
              <p className="text-gray-600 font-medium leading-relaxed">
                The Gemini Agent reasons about job postings and sends push notifications for the best fits instantly.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[#2BB8B8] font-bold text-xs uppercase tracking-tighter">
                <span>✨ Gemini Agent Technology</span>
              </div>
            </div>

            <div className="space-y-6 bg-white/5 p-10 rounded-[3rem] shadow-xl border border-white/10 border-l-8 border-l-white/30">
              <div className="flex items-center gap-4">
                <span className="bg-white/10 text-gray-800 w-10 h-10 rounded-full flex items-center justify-center font-black">3</span>
                <h3 className="text-2xl font-black italic text-gray-800">Get Verified</h3>
              </div>
              <p className="text-gray-600 font-medium leading-relaxed">
                GPS tracking ensures trustworthy work, and proof-of-completion photos confirm your tasks are done.
              </p>
              <div className="flex items-center gap-2 pt-2">
                 <span className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-500 underline decoration-green-400">📍 GPS VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- EMPLOYER SECTION --- */}
      <section id="employers" className="py-24 bg-[#FDF8EE]">
        <div className="container mx-auto px-6 md:px-16 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <p className="text-[#2BB8B8] font-black uppercase tracking-widest text-sm">Smart Employer Agent</p>
            <h2 className="text-5xl font-black text-gray-800 leading-tight">Hire Quality Talent, <br/> Effortlessly.</h2>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-50">
                <h4 className="font-bold text-gray-800 text-lg mb-2">🎙️ Voice Job Posting</h4>
                <p className="text-gray-600 text-sm">Speak your requirements; AI structures the job post and categorizes it automatically.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-50">
                <h4 className="font-bold text-gray-800 text-lg mb-2">⚡ 1-Click Hiring</h4>
                <p className="text-gray-600 text-sm">Review AI-ranked candidates based on skill and distance. Hire instantly with one tap.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="w-full h-auto min-h-100 rounded-[3rem] shadow-2xl flex items-center justify-center overflow-hidden border border-teal-50">
              <img 
                src={employerDashboardImg} 
                alt="Sira Voice Employer Dashboard Interface" 
                className="w-full h-auto max-w-lg transform group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- WORKER SECTION --- */}
      <section id="workers" className="py-17 bg-white">
        <div className="container mx-auto px-6 md:px-16">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-[#2A3F46] w-full h-112.5 rounded-[3rem] shadow-2xl flex items-center justify-center overflow-hidden">
                 <img 
                    src={workerInterfaceImg} 
                    alt="Sira Voice Worker Multilingual CV Interface" 
                    className="w-full h-auto object-contain"
                 />
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-2xl border border-orange-100 hidden md:block z-10">
                <p className="text-[#FF8A00] font-black text-sm uppercase">Voice AI Match</p>
                <p className="text-gray-800 font-bold">12 Nearby Jobs Found</p>
              </div>
            </div>

            <div className="space-y-6 order-1 md:order-2">
              <div className="space-y-2">
                <p className="text-[#FF8A00] font-black uppercase tracking-widest text-sm text-center">Built for Workers</p>
                <h2 className="text-5xl font-black text-gray-800 leading-tight">Build Your Digital Voice CV & Get Hired</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="bg-[#FFF4E6] h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-xl">🎙️</div>
                  <div>
                    <h4 className="font-bold text-lg">1. Voice-First CV Creation</h4>
                    <p className="text-gray-600">Create a full profile by speaking your skills. No internet? Just call and speak.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-[#FFF4E6] h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-xl">📍</div>
                  <div>
                    <h4 className="font-bold text-lg">2. Find Local Opportunities</h4>
                    <p className="text-gray-600">Discover nearby, verified jobs. Our AI Agent matches you with the best fits instantly.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-[#FFF4E6] h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-xl">💰</div>
                  <div>
                    <h4 className="font-bold text-lg">3. Get Hired & Paid Faster</h4>
                    <p className="text-gray-600">Track applications, get direct offers, and secure reliable payment verification.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/register?role=worker')}
                className="bg-[#FF8A00] text-gray-800 px-8 py-4 rounded-full font-bold hover:shadow-lg transition-all"
              >
                Create Your Voice Profile Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT / FOOTER SECTION --- */}
      <footer id="contact" className="bg-[#1A2E35] text-gray-800 pt-24 pb-12 px-6 border-t border-white/5">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-16 border-b border-white/10 pb-20">
            <div className="space-y-6">
              <div className="text-[#2BB8B8] text-3xl font-black flex items-center gap-2">
                <span>🎙️</span> Sira-Voice
              </div>
              <p className="text-gray-400 leading-relaxed">
                We didn’t build a job app. We built an AI agent that works for the informal workforce.
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-lg font-bold">Platform</h4>
              <ul className="space-y-4 text-gray-400 font-medium">
                <li><button onClick={() => navigate('/register')} className="hover:text-[#2BB8B8] transition">Join as Worker</button></li>
                <li><button onClick={() => navigate('/register')} className="hover:text-[#2BB8B8] transition">Join as Employer</button></li>
                <li><a href="#how-it-works" className="hover:text-[#2BB8B8] transition">How it Works</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-lg font-bold">Connect</h4>
              <p className="text-gray-400">Addis Ababa, Ethiopia</p>
              <p className="text-[#2BB8B8] font-bold text-xl underline">hello@sira-voice.com</p>
            </div>
          </div>
          <div className="mt-12 text-center text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">
            © 2026 SIRA-VOICE — Redefining Work with AI Agent Agency
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;