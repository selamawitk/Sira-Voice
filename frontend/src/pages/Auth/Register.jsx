import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Mic, Loader2 } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';
import { useVoice } from '../../hooks/useVoice.js';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastProvider.jsx';

const RegisterPage = () => {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);
  const [role, setRole] = useState('worker');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isListening, isProcessing, startListening } = useVoice();

  /**
   * FIXED URL HELPER
   * Prevents /api/api and ensures absolute path for OAuth
   */
  const getGoogleAuthUrl = () => {
    let base = (import.meta.env.VITE_API_URL || 'http://localhost:5001');
    // Remove trailing slash and any existing /api to prevent doubling
    base = base.replace(/\/$/, '').replace(/\/api$/, '');
    return `${base}/api/auth/google`;
  };

  const getRedirectPath = (roleValue) => {
    if (roleValue === 'employer') return '/employer-dashboard';
    if (roleValue === 'admin') return '/admin-dashboard';
    return '/dashboard';
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!fullName.trim() || !identifier.trim() || !password.trim()) {
      toast?.show?.('Please complete all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast?.show?.('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      const isEmail = trimmedIdentifier.includes('@');
      
      const payload = {
        fullName: fullName.trim(),
        phone: trimmedIdentifier,
        email: isEmail ? trimmedIdentifier : `user_${Date.now()}@sira.com`,
        password,
        role
      };

      const { data } = await api.post('/auth/register', payload);

      if (data?.token) {
        localStorage.setItem('token', data.token);
        await auth?.fetchMe?.();
      }

      toast?.show?.('Account created successfully.', 'success');
      navigate(getRedirectPath(data?.role || role));
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceRegister = () => {
    startListening(async (result) => {
      setLoading(true);
      try {
        const data = await auth.voiceAuth(result.transcript);
        toast?.show?.(`Sira-Voice identified you as ${data.fullName}!`, 'success');
        navigate(getRedirectPath(data.role));
      } catch {
        toast?.show?.('Voice capture failed. Please speak clearly in Amharic, Oromiffa, or English.', 'error');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle="Join Sira-Voice and find your match today."
    >
      <form className="space-y-2.5" onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-1">
          <button
            type="button"
            onClick={() => setRole('worker')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              role === 'worker' 
                ? 'bg-[#2BB8B8] border-[#2BB8B8] text-slate-950 shadow-[0_0_15px_rgba(43,184,184,0.18)]' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            I am a Worker
          </button>
          <button
            type="button"
            onClick={() => setRole('employer')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              role === 'employer' 
                ? 'bg-[#2BB8B8] border-[#2BB8B8] text-slate-950 shadow-[0_0_15px_rgba(43,184,184,0.18)]' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            I am an Employer
          </button>
        </div>

        <Input 
          icon={User} 
          type="text" 
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        
        <Input 
          icon={Mail} 
          type="text" 
          placeholder="Email or Phone Number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input 
            icon={Lock} 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input 
            icon={Lock} 
            type="password" 
            placeholder="Confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2BB8B8] text-slate-950 py-2 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] mt-1 disabled:opacity-60"
        >
          {loading ? 'Processing...' : 'Create Account'}
        </button>

        <div className="relative text-center">
          <span className="bg-[#1A2E35] px-3 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">or</span>
          <hr className="absolute top-1/2 w-full border-white/5" />
        </div>

        <button 
          type="button"
          onClick={handleVoiceRegister}
          disabled={loading || isListening || isProcessing}
          className="w-full group flex items-center justify-between bg-[#2BB8B8]/5 border border-[#2BB8B8]/20 hover:border-[#2BB8B8]/50 p-2 pr-4 rounded-2xl transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="bg-[#2BB8B8] p-2 rounded-xl shadow-[0_0_15px_rgba(43,184,184,0.25)] group-hover:scale-110 transition-transform">
              {isListening ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : isProcessing ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Mic className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-white text-xs font-bold tracking-tight">
              {isListening ? 'Listening (አማርኛ/Afan Oromo)...' : isProcessing ? 'Extracting Identity...' : 'Register with Voice'}
            </span>
          </div>
          <div className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Instant Sign-up
          </div>
        </button>

        <a 
          href={getGoogleAuthUrl()}
          className="w-full bg-white/5 border border-white/10 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition shadow-xl"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
          Sign up with Google
        </a>
      </form>

      <p className="mt-5 text-center text-gray-500 text-[12px] font-medium">
        Already have an account? 
        <button 
          onClick={() => navigate('/login')} 
          className="text-[#2BB8B8] font-black ml-1 hover:underline underline-offset-4"
        >
          Login here.
        </button>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;