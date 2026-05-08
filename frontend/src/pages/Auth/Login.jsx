import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Mic, Loader2 } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastProvider.jsx';
import { useVoice } from '../../hooks/useVoice.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const { startListening, isListening, isProcessing } = useVoice();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getRedirectPath = (role) => {
    if (role === 'employer') return '/employer-dashboard';
    if (role === 'admin') return '/admin-dashboard';
    return '/dashboard';
  };

  /**
   * FIXED URL HELPER
   * This logic ensures we don't end up with /api/api.
   * It strips any existing /api from the VITE_API_URL before adding it back cleanly.
   */
  const getGoogleAuthUrl = () => {
    // 1. Get base URL from env or fallback
    let base = (import.meta.env.VITE_API_URL || 'http://localhost:5001');
    
    // 2. Remove trailing slash and remove '/api' if it already exists to prevent doubling
    base = base.replace(/\/$/, '').replace(/\/api$/, '');
    
    // 3. Return clean absolute URL
    return `${base}/api/auth/google`;
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast?.show?.('Please enter your phone and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await auth.login({ phone: identifier.trim(), password });
      const role = data?.role || auth?.user?.role;
      toast?.show?.('Login successful.', 'success');
      navigate(getRedirectPath(role));
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || error?.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceAuth = () => {
    // startListening takes a callback that receives the transcript or audio blob
    startListening(async (result) => {
      setLoading(true);
      try {
        // Ensuring your AuthContext has a voiceAuth method to talk to /api/auth/voice-auth
        const data = await auth.voiceAuth(result.transcript);
        toast?.show?.(`Welcome back, ${data.fullName}`, 'success');
        navigate(getRedirectPath(data.role));
      } catch (error) {
        toast?.show?.(error?.response?.data?.message || 'Voice authentication failed.', 'error');
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;
    const processToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        localStorage.setItem('token', token);
        const user = await auth.fetchMe();
        if (isMounted) {
          navigate(getRedirectPath(user?.role));
        }
      }
    };
    processToken();
    return () => { isMounted = false; };
  }, [auth, navigate]);

  return (
    <AuthLayout 
      title="Login" 
      subtitle="Your voice is your CV. Login to find jobs."
    >
      <form className="space-y-3" onSubmit={handleLogin}>
        <Input 
          icon={Mail} 
          type="text" 
          placeholder="Email or Phone Number"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        
        <div className="space-y-1">
          <Input 
            icon={Lock} 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end px-1">
            <button 
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-[10px] font-bold text-gray-500 hover:text-[#2BB8B8] transition-colors uppercase tracking-wider"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2BB8B8] text-slate-950 py-2 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 disabled:opacity-60"
        >
          {loading ? 'Processing...' : 'Login'} <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="relative my-4 text-center">
          <span className="bg-[#1A2E35] px-3 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">or</span>
          <hr className="absolute top-1/2 w-full border-white/5" />
        </div>

        <div className="space-y-3">
          <a 
            href={getGoogleAuthUrl()}
            className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition shadow-xl"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
            Continue with Google
          </a>

          <button 
            type="button"
            onClick={handleVoiceAuth}
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
                {isListening ? 'Listening...' : isProcessing ? 'Analyzing Voice...' : 'Login with Voice'}
              </span>
            </div>
            <div className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Sira Identity
            </div>
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-gray-500 text-[12px] font-medium">
        Don’t have an account? 
        <button 
          onClick={() => navigate('/register')} 
          className="text-[#2BB8B8] font-black ml-1 hover:underline underline-offset-4"
        >
          Register here.
        </button>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;