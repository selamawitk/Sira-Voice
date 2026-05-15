import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Fingerprint } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const translations = {
  en: {
    title: "Login",
    subtitle: "Find your next opportunity with Sira.",
    identifier: "Phone Number",
    password: "Password",
    forgot: "Forgot Password?",
    loginBtn: "Login",
    biometricBtn: "Sign in with Passkey",
    processing: "Processing...",
    or: "or",
    google: "Continue with Google",
    noAccount: "Don’t have an account?",
    registerLink: "Register here.",
    toastError: "Please enter your phone and password.",
    toastSuccess: "Login successful.",
    toastOAuthFail: "Google authentication failed. Please try again.",
    toastProfileFail: "Failed to fetch user profile.",
    biometricError: "Biometric login failed. Please use your password."
  },
  am: {
    title: "ይግቡ",
    subtitle: "በሲራ ቀጣይ እድልዎን ያግኙ።",
    identifier: "ስልክ ቁጥር",
    password: "የይለፍ ቃል",
    forgot: "የይለፍ ቃል ረስተዋል?",
    loginBtn: "ይግቡ",
    biometricBtn: "በጣት አሻራ ይግቡ",
    processing: "በማከናወን ላይ...",
    or: "ወይም",
    google: "በጉግል ይቀጥሉ",
    noAccount: "አካውንት የለዎትም?",
    registerLink: "እዚህ ይመዝገቡ።",
    toastError: "እባክዎን ስልክ እና የይለፍ ቃል ያስገቡ።",
    toastSuccess: "በተሳካ ሁኔታ ገብተዋል።",
    toastOAuthFail: "የጉግል ማረጋገጫ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
    toastProfileFail: "የተጠቃሚ መገለጫ ማምጣት አልተቻለም።",
    biometricError: "የጣት አሻራ መግቢያ አልተሳካም። እባክዎ የይለፍ ቃልዎን ይጠቀሙ።"
  },
  or: {
    title: "Seeni",
    subtitle: "Carra kee itti aanu Sira wajjiin bari.",
    identifier: "Lakkoofsa Bilbilaa",
    password: "Jecha Icchitii",
    forgot: "Jecha icchitii dagattee?",
    loginBtn: "Seeni",
    biometricBtn: "Mallattoo qubaatiin seeni",
    processing: "Hojjechaa jira...",
    or: "ykn",
    google: "Google'n itti fufi",
    noAccount: "Account hin qabduu?",
    registerLink: "Asitti galmaa'i.",
    toastError: "Maaloo bilbila fi jecha icchitii galchi.",
    toastSuccess: "Milkaa'inaan seenteetta.",
    toastOAuthFail: "Mirkaneessi Google hin milkoofne. Maaloo irra deebi'i yaali.",
    toastProfileFail: "Proofayilii fiduun hin danda'amne.",
    biometricError: "Mallattoo qubaatiin seenuun hin danda'amne. Jecha icchitii kee fayyadami."
  }
};

const LoginPage = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = translations[lang];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const getRedirectPath = (role) => {
    if (role === 'employer') return '/employer-dashboard';
    if (role === 'admin') return '/admin-dashboard';
    return '/dashboard';
  };

  const getGoogleAuthUrl = () => {
    let base = (import.meta.env.VITE_API_URL || 'http://localhost:5001');
    base = base.replace(/\/$/, '').replace(/\/api$/, '');
    return `${base}/api/auth/google`;
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast?.show?.(t.toastError, 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await auth.login({ phone: identifier.trim(), password });
      const role = data?.role || auth?.user?.role;
      toast?.show?.(t.toastSuccess, 'success');
      navigate(getRedirectPath(role));
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || error?.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!identifier.trim()) {
      toast?.show?.(t.identifier + " is required", 'error');
      return;
    }

    setBiometricLoading(true);
    try {
      const data = await auth.loginWithPasskey(identifier.trim());
      toast?.show?.(t.toastSuccess, 'success');
      navigate(getRedirectPath(data?.role));
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || t.biometricError, 'error');
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const processOAuthResult = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (error === 'google_auth_failed') {
        localStorage.removeItem('token');
        toast?.show?.(t.toastOAuthFail, 'error');
        navigate('/login', { replace: true });
        return;
      }

      if (token) {
        try {
          localStorage.setItem('token', token);
          const user = await auth.fetchMe();
          if (isMounted) {
            navigate(getRedirectPath(user?.role), { replace: true });
          }
        } catch {
          localStorage.removeItem('token');
          toast?.show?.(t.toastProfileFail, 'error');
          navigate('/login', { replace: true });
        }
      }
    };
    processOAuthResult();
    return () => { isMounted = false; };
  }, [auth, navigate, toast, t.toastOAuthFail, t.toastProfileFail]);

  return (
    <AuthLayout 
      title={t.title} 
      subtitle={t.subtitle}
    >
      <div className="flex justify-center gap-2 mb-6">
        {['en', 'am', 'or'].map((l) => (
          <button
            key={l}
            onClick={() => handleLangChange(l)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
              lang === l 
              ? 'bg-[#2BB8B8] text-slate-950 shadow-lg scale-105' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {l === 'en' ? 'English' : l === 'am' ? 'አማርኛ' : 'Oromoo'}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={handleLogin}>
        <Input 
          icon={Mail} 
          type="text" 
          placeholder={t.identifier}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        
        <div className="space-y-1">
          <Input 
            icon={Lock} 
            type="password" 
            placeholder={t.password}
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
              {t.forgot}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || biometricLoading}
          className="w-full bg-[#2BB8B8] text-slate-950 py-2 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 disabled:opacity-60"
        >
          {loading ? t.processing : t.loginBtn} <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleBiometricLogin}
          disabled={loading || biometricLoading}
          className="w-full bg-white/5 border border-white/10 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
        >
          <Fingerprint className="w-4 h-4 text-[#2BB8B8]" />
          {biometricLoading ? t.processing : t.biometricBtn}
        </button>

        <div className="relative my-4 text-center">
          <span className="bg-[#1A2E35] px-3 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{t.or}</span>
          <hr className="absolute top-1/2 w-full border-white/5" />
        </div>

        <div className="space-y-3">
          <a 
            href={getGoogleAuthUrl()}
            className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition shadow-xl"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
            {t.google}
          </a>
        </div>
      </form>

      <p className="mt-6 text-center text-gray-500 text-[12px] font-medium">
        {t.noAccount} 
        <button 
          onClick={() => navigate('/register')} 
          className="text-[#2BB8B8] font-black ml-1 hover:underline underline-offset-4"
        >
          {t.registerLink}
        </button>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;