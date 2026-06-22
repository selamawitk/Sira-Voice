import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, KeySquare, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!phone) {
      navigate('/forgot-password');
    }
  }, [phone, navigate]);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim() || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (attempts >= 5) {
      setError('Too many failed attempts. Please request a new code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        phone,
        code: code.trim(),
        newPassword
      });
      if (response.data?.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(msg);
      setAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccess('');
    setAttempts(0);

    try {
      const response = await api.post('/auth/forgot-password', { phone });
      if (response.data?.success) {
        setSuccess('New code sent!');
        startResendCooldown();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      setError(msg);
    }
  };

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Use the 6-digit code sent to your phone to create a new password."
    >
      <form onSubmit={handleReset} className="space-y-3">
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

        <div className="mb-4">
          <label className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-[0.2em] ml-1 mb-2 block">
            Verification Code
          </label>
          <Input 
            icon={KeySquare} 
            type="text" 
            placeholder="0 0 0 0 0 0" 
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            className="text-center tracking-[0.5em] text-lg font-black"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">New Pass</label>
            <Input 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Confirm</label>
            <Input 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#2BB8B8] text-slate-950 py-3.5 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
          ) : (
            <>Update Password <CheckCircle2 className="w-5 h-5" /></>
          )}
        </button>

        <div className="text-center mt-4">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
            Didn't get the code? 
            <button 
              type="button" 
              onClick={handleResendOTP}
              disabled={resendCooldown > 0}
              className="text-[#2BB8B8] ml-2 hover:underline transition-all disabled:text-gray-500 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </p>
        </div>
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

export default ResetPasswordPage;
