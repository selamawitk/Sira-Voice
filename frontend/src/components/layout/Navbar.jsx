import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Menu, X } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useContext(LanguageContext);
  const t = lang?.copy || {};

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={`fixed w-full z-[100] transition-all duration-300 ${
      isScrolled ? 'bg-[#1A2E35]/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
    }`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
        >
          <Mic className="w-6 h-6 text-[#2BB8B8] drop-shadow-md" />
          <div className="text-white text-2xl font-black tracking-tight">
            Sira-<span className="text-[#2BB8B8]">Voice</span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-white/90 font-semibold text-sm">
          <button onClick={() => scrollTo('about')} className="hover:text-[#2BB8B8] transition-colors">{t.navAbout || 'About'}</button>
          <button onClick={() => scrollTo('how-it-works')} className="hover:text-[#2BB8B8] transition-colors">{t.navHowItWorks || 'How it Works'}</button>
          <button onClick={() => scrollTo('employers')} className="hover:text-[#2BB8B8] transition-colors">{t.navEmployers || 'Employers'}</button>
          <button onClick={() => scrollTo('workers')} className="hover:text-[#2BB8B8] transition-colors">{t.navWorkers || 'Workers'}</button>
          <button onClick={() => scrollTo('contact')} className="hover:text-[#2BB8B8] transition-colors">{t.navContact || 'Contact Us'}</button>
          
          <button 
            onClick={() => navigate('/login')}
            className="border-2 border-[#2BB8B8] text-white px-7 py-1.5 rounded-full font-bold hover:bg-[#2BB8B8] hover:text-slate-950 transition-all duration-300"
          >
            {t.login || 'Login'}
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden text-white cursor-pointer" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'}>
          {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#1A2E35]/95 backdrop-blur-md border-t border-white/10">
          <div className="container mx-auto px-6 py-4 space-y-4">
            <button onClick={() => { scrollTo('about'); setIsOpen(false); }} className="block w-full text-left text-white/90 hover:text-[#2BB8B8] transition-colors">{t.navAbout || 'About'}</button>
            <button onClick={() => { scrollTo('how-it-works'); setIsOpen(false); }} className="block w-full text-left text-white/90 hover:text-[#2BB8B8] transition-colors">{t.navHowItWorks || 'How it Works'}</button>
            <button onClick={() => { scrollTo('employers'); setIsOpen(false); }} className="block w-full text-left text-white/90 hover:text-[#2BB8B8] transition-colors">{t.navEmployers || 'Employers'}</button>
            <button onClick={() => { scrollTo('workers'); setIsOpen(false); }} className="block w-full text-left text-white/90 hover:text-[#2BB8B8] transition-colors">{t.navWorkers || 'Workers'}</button>
            <button onClick={() => { scrollTo('contact'); setIsOpen(false); }} className="block w-full text-left text-white/90 hover:text-[#2BB8B8] transition-colors">{t.navContact || 'Contact Us'}</button>
            <button 
              onClick={() => { navigate('/login'); setIsOpen(false); }}
              className="block w-full text-left border-2 border-[#2BB8B8] text-white px-4 py-2 rounded-full font-bold hover:bg-[#2BB8B8] hover:text-slate-950 transition-all duration-300"
            >
              {t.login || 'Login'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;