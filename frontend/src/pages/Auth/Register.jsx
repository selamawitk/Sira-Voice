import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, LogIn, Fingerprint } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

  const translations = {
    en: {
      title: "Create Account",
      subtitle: "Join Sira and find your match today.",
      roleWorker: "I am a Worker",
      roleEmployer: "I am an Employer",
      fullName: "Full Name",
      identifier: "Phone Number",
      password: "Password",
      confirm: "Confirm",
      registerBtn: "Create Account",
      biometricBtn: "Register Biometric",
      processing: "Processing...",
      or: "or",
      google: "Sign up with Google",
      hasAccount: "Already have an account?",
      loginLink: "Login here.",
      toastErrorFields: "Please complete all required fields.",
      toastErrorMatch: "Passwords do not match.",
      toastSuccess: "Account created successfully.",
      toastOAuthFail: "Google registration failed. Please try again.",
      biometricSuccess: "Biometric registered! You can now login with your face or fingerprint.",
      biometricError: "Failed to register biometric."
    },
    am: {
      title: "አካውንት ይፍጠሩ",
      subtitle: "ሲራን በመቀላቀል ስራዎን ዛሬ ያግኙ።",
      roleWorker: "እኔ ሰራተኛ ነኝ",
      roleEmployer: "እኔ አሰሪ ነኝ",
      fullName: "ሙሉ ስም",
      identifier: "ስልክ ቁጥር",
      password: "የይለፍ ቃል",
      confirm: "ያረጋግጡ",
      registerBtn: "አካውንት ይፍጠሩ",
      biometricBtn: "የጣት አሻራ/ፊት ይመዝገቡ",
      processing: "በማከናወን ላይ...",
      or: "ወይም",
      google: "በጉግል ይመዝገቡ",
      hasAccount: "አካውንት አለዎት?",
      loginLink: "እዚህ ይግቡ።",
      toastErrorFields: "እባክዎን ሁሉንም መስኮች ይሙሉ::",
      toastErrorMatch: "የይለፍ ቃሉ አይዛመድም::",
      toastSuccess: "አካውንትዎ በተሳካ ሁኔታ ተፈጥሯል።",
      toastOAuthFail: "የጉግል ምዝገባ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
      biometricSuccess: "የጣት አሻራ/ፊት ተመዝግቧል! አሁን በፊትዎ ወይም በጣት አሻራዎ መግባት ይችላሉ።",
      biometricError: "የጣት አሻራ/ፊት መመዝገብ አልተቻለም።"
    },
    or: {
      title: "Account Uumi",
      subtitle: "Sira'n walitti makamuun hojii kee har'a argadhu.",
      roleWorker: "Ani Hojjataadha",
      roleEmployer: "Ani Qaxaraadha",
      fullName: "Maqaa Guutuu",
      identifier: "Lakkoofsa Bilbilaa",
      password: "Jecha Icchitii",
      confirm: "Mirkaneessi",
      registerBtn: "Account Uumi",
      biometricBtn: "Mallattoo qubaa/fuulaa galmeessi",
      processing: "Hojjechaa jira...",
      or: "ykn",
      google: "Google'n galmaa'i",
      hasAccount: "Account qabduu?",
      loginLink: "Asitti seeni.",
      toastErrorFields: "Maaloo hunda guuti.",
      toastErrorMatch: "Jechi iccitii wal hin fakkaatu.",
      toastSuccess: "Milkaa'inaan galmoofteetta.",
      toastOAuthFail: "Galmeen Google hin milkoofne. Maaloo irra deebi'i yaali.",
      biometricSuccess: "Mallatoon qubaa/fuulaa galmaa'eera! Amma fuula kee ykn mallattoo qubaatiin seenuu dandeessa.",
      biometricError: "Mallattoo qubaa/fuulaa galmeessuun hin danda'amne."
    }
  };

const RegisterPage = () => {
  const navigate = useNavigate();
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);

  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = translations[lang];

  const [role, setRole] = useState('worker');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const getGoogleAuthUrl = () => {
    let base = (import.meta.env.VITE_API_URL || 'http://localhost:5001');
    base = base.replace(/\/$/, '').replace(/\/api$/, '');
    localStorage.setItem('pending_role', role);
    return `${base}/api/auth/google?role=${role}&prompt=select_account`;
  };

  const getRedirectPath = (roleValue) => {
    if (roleValue === 'employer') return '/employer-dashboard';
    if (roleValue === 'admin') return '/admin-dashboard';
    return '/dashboard';
  };

  const handleBiometricRegister = async () => {
    setBiometricLoading(true);
    try {
      await auth.registerPasskey();
      toast?.show?.(t.biometricSuccess, 'success');
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || t.biometricError, 'error');
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (error) {
        toast?.show?.(t.toastOAuthFail, 'error');
        navigate('/register', { replace: true });
        return;
      }

      if (token) {
        localStorage.setItem('token', token);
        try {
          const user = await auth?.fetchMe?.();
          localStorage.removeItem('pending_role');
          if (isMounted) {
            navigate(getRedirectPath(user?.role), { replace: true });
          }
        } catch (err) {
          localStorage.removeItem('token');
          navigate('/register', { replace: true });
        }
      }
    };
    handleOAuthCallback();
    return () => { isMounted = false; };
  }, [auth, navigate, toast, t.toastOAuthFail]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!fullName.trim() || !identifier.trim() || !password.trim()) {
      toast?.show?.(t.toastErrorFields, 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast?.show?.(t.toastErrorMatch, 'error');
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

      const data = await auth.register(payload);
      toast?.show?.(t.toastSuccess, 'success');
      
      navigate(getRedirectPath(data?.role || role));
    } catch (error) {
      toast?.show?.(error?.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.title} subtitle={t.subtitle}>
      <div className="flex justify-center gap-2 mb-4">
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

      <form className="space-y-2" onSubmit={handleSubmit}>
        <div className="flex gap-2 mb-4">
          {['worker', 'employer'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                role === r 
                  ? 'bg-[#2BB8B8] border-[#2BB8B8] text-slate-950 shadow-[0_0_15px_rgba(43,184,184,0.18)]' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {r === 'worker' ? t.roleWorker : t.roleEmployer}
            </button>
          ))}
        </div>

        <Input 
          icon={User} 
          type="text" 
          placeholder={t.fullName}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        
        <Input 
          icon={Mail} 
          type="text" 
          placeholder={t.identifier}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input 
            icon={Lock} 
            type="password" 
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input 
            icon={Lock} 
            type="password" 
            placeholder={t.confirm}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || biometricLoading}
          className="w-full bg-[#2BB8B8] text-slate-950 py-2 rounded-xl font-black text-sm hover:brightness-110 transition-all active:scale-[0.98] mt-1 disabled:opacity-60 flex items-center justify-center gap-2 group"
        >
          {loading ? t.processing : t.registerBtn} <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={handleBiometricRegister}
          disabled={loading || biometricLoading}
          className="w-full bg-white/5 border border-white/10 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
        >
          <Fingerprint className="w-4 h-4 text-[#2BB8B8]" />
          {biometricLoading ? t.processing : t.biometricBtn}
        </button>

        <div className="relative text-center my-1">
          <span className="bg-[#1A2E35] px-3 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{t.or}</span>
          <hr className="absolute top-1/2 w-full border-white/5" />
        </div>

        <a 
          href={getGoogleAuthUrl()}
          className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition shadow-xl"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t.google}
        </a>
      </form>

      <p className="mt-4 text-center text-gray-500 text-[11px] font-medium">
        {t.hasAccount} 
        <button 
          onClick={() => navigate('/login')} 
          className="text-[#2BB8B8] font-black ml-1 hover:underline underline-offset-4"
        >
          {t.loginLink}
        </button>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;