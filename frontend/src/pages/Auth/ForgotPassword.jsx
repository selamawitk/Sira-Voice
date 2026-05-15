import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, ShieldCheck, Send } from 'lucide-react';
import AuthLayout from '../../components/ui/AuthLayout';
import Input from '../../components/ui/Input';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const handleSendOTP = (e) => {
    e.preventDefault();
    // Logic to send OTP would go here
    navigate('/reset-password'); // Move to the OTP entry screen
  };

  return (
    <AuthLayout 
      title="Forgot Password?" 
      subtitle="Don't worry! Enter your phone number to get back in."
    >
      <form onSubmit={handleSendOTP} className="space-y-4">
        {/* Security Hint */}
        <div className="bg-[#2BB8B8]/5 border border-[#2BB8B8]/20 p-4 rounded-2xl mb-2 flex items-start gap-3">
           <ShieldCheck className="w-5 h-5 text-[#2BB8B8] shrink-0 mt-0.5" />
           <p className="text-[11px] text-gray-400 leading-relaxed font-medium uppercase tracking-tight">
             We will send a 6-digit security code to your registered phone number.
           </p>
        </div>

        <Input 
          icon={Phone} 
          type="tel" 
          placeholder="+251 9XXXXXXXX" 
          required
        />

        <button 
          type="submit"
          className="w-full bg-[#2BB8B8] text-slate-950 py-3.5 rounded-xl font-black text-md hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
        >
          Send OTP Code <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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