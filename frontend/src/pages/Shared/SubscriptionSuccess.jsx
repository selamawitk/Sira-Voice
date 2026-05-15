import React, { useEffect, useContext } from 'react';
import { CheckCircle, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);

  useEffect(() => {
    // Refresh user data to get updated subscription status
    const refreshUser = async () => {
      try {
        await auth.fetchMe();
        toast?.show?.('Welcome to your premium plan! 🎉', 'success');
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    };
    refreshUser();
  }, [auth, toast]);

  const handleContinue = () => {
    if (auth.user?.role === 'worker') {
      navigate('/dashboard');
    } else {
      navigate('/employer-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2E35] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6">
        
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute -inset-1 bg-[#2BB8B8] rounded-full blur opacity-25"></div>
            <div className="relative bg-[#2BB8B8] p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-slate-950" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Payment Successful!</h1>
          <p className="text-gray-400 text-sm font-medium">
            Your subscription has been activated. Welcome to premium features!
          </p>
        </div>

        {/* Features */}
        <div className="bg-[#2BB8B8]/10 border border-[#2BB8B8]/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3 text-white text-sm font-bold">
            <Crown className="w-4 h-4 text-[#2BB8B8]" />
            Premium Subscription Active
          </div>
          <div className="text-gray-300 text-xs space-y-1">
            <p>• AI-powered job matching</p>
            <p>• Auto-apply to relevant jobs</p>
            <p>• Verified profile badge</p>
            <p>• Priority support</p>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-[#2BB8B8] text-slate-950 py-3 rounded-xl font-black text-sm hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
        >
          Continue to Dashboard
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Footer */}
        <p className="text-gray-500 text-[10px] font-medium">
          Thank you for choosing Sira Voice!
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;