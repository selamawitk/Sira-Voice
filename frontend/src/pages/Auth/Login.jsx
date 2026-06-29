import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Fingerprint } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { baseAPI } from '../../services/api.js';

const translations = {
  en: {
    title: "Login",
    subtitle: "Find your next opportunity with Sira.",
    identifier: "Email",
    password: "Password",
    forgot: "Forgot Password?",
    loginBtn: "Login",
    biometricBtn: "Sign in with Biometrics",
    processing: "Processing...",
    or: "or",
    google: "Continue with Google",
    noAccount: "Don’t have an account?",
    registerLink: "Register here.",
    toastError: "Please enter your email and password.",
    toastSuccess: "Login successful.",
    toastOAuthFail: "Google authentication failed. Please try again.",
    toastProfileFail: "Failed to fetch user profile.",
    biometricError: "Biometric login failed. Please use your password."
  },
  am: {
    title: "ይግቡ",
    subtitle: "በሲራ ቀጣይ እድልዎን ያግኙ።",
    identifier: "ኢሜይል",
    password: "የይለፍ ቃል",
    forgot: "የይለፍ ቃል ረስተዋል?",
    loginBtn: "ይግቡ",
    biometricBtn: "በጣት አሻራ/ፊት ይግቡ",
    processing: "በማከናወን ላይ...",
    or: "ወይም",
    google: "በጉግል ይቀጥሉ",
    noAccount: "አካውንት ለዎትም?",
    registerLink: "እእዚህ ይመዝገቡ።",
    toastError: "እባክዎን ኢሜይል እና የይለፍ ቃል ያስገቡ።",
    toastSuccess: "በተሳካ ሁኔታ ገብተዋል።",
    toastOAuthFail: "የጉግል ማረጋገጫ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
    toastProfileFail: "የተጠቃሚ መገለጫ ማምጣት አልተቻለም።",
    biometricError: "የጣት አሻራ መግቢያ አልተሳካም። እባክዎ የይለፍ ቃልዎን ይጠቀሙ።"
  },
  or: {
    title: "Seeni",
    subtitle: "Carra kee itti aanu Sira wajjiin bari.",
    identifier: "Imeelii",
    password: "Jecha Icchitii",
    forgot: "Jecha icchitii dagattee?",
    loginBtn: "Seeni",
    biometricBtn: "Mallattoo qubaa/fuulaan seeni",
    processing: "Hojjechaa jira...",
    or: "ykn",
    google: "Google'n itti fufi",
    noAccount: "Account hin qabduu?",
    registerLink: "Asitti galmaa'i.",
    toastError: "Maaloo imeelii fi jecha icchitii galchi.",
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeRole = (role) => {
    if (!role) return role;
    return role === 'user' ? 'worker' : role;
  };

  const getRedirectPath = useCallback((role) => {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === 'employer') return '/employer-dashboard';
    if (normalizedRole === 'admin') return '/admin-dashboard';
    return '/dashboard';
  }, []);

  const getGoogleAuthUrl = () => `${baseAPI}/auth/google`;

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast?.show?.(t.toastError, 'error');
      return;
    }

    setLoading(true);

    try {
      const data = await auth.login({
        email: email.trim(),
        password,
      });

      toast?.show?.(t.toastSuccess, 'success');

      const loggedInUser = data?.user || auth?.user;
      const userRole = normalizeRole(loggedInUser?.role);
      const redirectPath = getRedirectPath(userRole);

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      toast?.show?.(
        error?.response?.data?.message ||
        error?.message ||
        'Login failed.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const result = email.trim()
        ? await auth.loginWithPasskey(email.trim())
        : await auth.loginWithPasskeyDiscoverable();

      if (result?.token) {
        toast?.show?.(t.toastSuccess, 'success');
        const userRole = normalizeRole(result?.user?.role || auth?.user?.role);
        navigate(getRedirectPath(userRole), { replace: true });
      }
    } catch (error) {
      toast?.show?.(
        error?.response?.data?.message ||
        error?.message ||
        t.biometricError,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error === 'google_auth_failed') {
      localStorage.removeItem('token');
      toast?.show?.(t.toastOAuthFail, 'error');
      navigate('/login', { replace: true });
    }
  }, [navigate, toast, t.toastOAuthFail]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      navigate(getRedirectPath(auth.user.role), { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate, getRedirectPath]);

  return (
    <AuthLayout title={t.title} subtitle={t.subtitle}>
      <div className="flex flex-col justify-between min-h-[460px] md:min-h-[490px]">
        <div>
          <div className="flex justify-center gap-2 mb-6">
            {['en', 'am', 'or'].map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all ${
                  lang === l
                    ? 'bg-[#2BB8B8] text-slate-950 shadow-lg scale-105'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {l === 'en' ? 'English' : l === 'am' ? 'አማርኛ' : 'Oromoo'}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              icon={Mail}
              type="email"
              placeholder={t.identifier}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1.5">
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

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2BB8B8] text-slate-950 py-2.5 rounded-xl font-black text-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 group"
              >
                {loading ? t.processing : t.loginBtn}
                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4 text-[#2BB8B8]" />
                {loading ? t.processing : t.biometricBtn}
              </button>
            </div>

            <div className="relative text-center my-4">
              <span className="bg-[#1A2E35] px-3 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">
                {t.or}
              </span>
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
        </div>

        <p className="mt-6 text-center text-gray-500 text-[11px] font-medium">
          {t.noAccount}
          <button
            onClick={() => navigate('/register')}
            className="text-[#2BB8B8] font-black ml-1 hover:underline underline-offset-4"
          >
            {t.registerLink}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;