import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, ShieldCheck, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { phone: phone.trim() });
      if (response.data?.success) {
        setSuccess(response.data.message || 'OTP sent successfully!');
        startCooldown();
        setTimeout(() => {
          navigate('/reset-password', { state: { phone: phone.trim() } });
        }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Forgot Password?" 
      subtitle="Don't worry! Enter your phone number to get back in."
    >
      <form onSubmit={handleSendOTP} className="space-y-4">
        <div className="bg-[#2BB8B8]/5 border border-[#2BB8B8]/20 p-4 rounded-2xl mb-2 flex items-start gap-3">
           <ShieldCheck className="w-5 h-5 text-[#2BB8B8] shrink-0 mt-0.5" />
           <p className="text-[11px] text-gray-400 leading-relaxed font-medium uppercase tracking-tight">
             We will send a 6-digit security code to your registered phone number.
           </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400 font-medium">{success}</p>
          </div>
        )}

        <Input 
          icon={Phone} 
          type="tel" 
          placeholder="+251 9XXXXXXXX" 
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
        />

        <button 
          type="submit"
          disabled={loading || cooldown > 0}
          className="w-full bg-[#2BB8B8] text-slate-950 py-3.5 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            <>Send OTP Code <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
        <button 
          onClick={() => navigate('/login')} 
          className="flex items-center gap-2 text-gray-500 hover:text-white font-bold text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          Back to Login
        </button>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
