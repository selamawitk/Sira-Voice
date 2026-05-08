import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, KeySquare, CheckCircle2, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    // Your logic to update password here
    navigate('/login');
  };

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Use the 6-digit code sent to your phone to create a new password."
    >
      <form onSubmit={handleReset} className="space-y-3">
        
        {/* OTP Input - Centered for focus */}
        <div className="mb-4">
          <label className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-[0.2em] ml-1 mb-2 block">
            Verification Code
          </label>
          <Input 
            icon={KeySquare} 
            type="text" 
            placeholder="0 0 0 0 0 0" 
            maxLength="6"
            className="text-center tracking-[0.5em] text-lg font-black"
          />
        </div>

        {/* Password Grid - Keeps the card height short */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">New Pass</label>
            <Input 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Confirm</label>
            <Input 
              icon={Lock} 
              type="password" 
              placeholder="••••••••" 
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-[#2BB8B8] text-slate-950 py-3.5 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
        >
          Update Password <CheckCircle2 className="w-5 h-5" />
        </button>

        {/* Resend Logic */}
        <div className="text-center mt-4">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
            Didn't get the code? 
            <button type="button" className="text-[#2BB8B8] ml-2 hover:underline transition-all">
              Resend OTP
            </button>
          </p>
        </div>
      </form>

      {/* Footer link to go back */}
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