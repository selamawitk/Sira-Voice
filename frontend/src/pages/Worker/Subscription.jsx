import React, { useState, useContext } from 'react';
import { Zap, CheckCircle2, Crown, ShieldCheck, Loader2 } from 'lucide-react';
import { upgradeSubscription } from '../../services/paymentService.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';

const Subscription = () => {
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (planType) => {
    if (planType === 'basic') {
      try {
        setLoading(planType);
        await upgradeSubscription(planType);
        toast?.show?.('Successfully subscribed to Basic plan!', 'success');
        await auth.fetchMe(); // Refresh user data
      } catch (err) {
        toast?.show?.(err?.response?.data?.message || 'Upgrade failed.', 'error');
      } finally {
        setLoading(null);
      }
      return;
    }

    try {
      setLoading(planType);
      const response = await upgradeSubscription(planType);
      
      if (response.checkoutUrl) {
        // Redirect to Chapa checkout
        window.location.href = response.checkoutUrl;
      } else {
        toast?.show?.('Payment initialization failed.', 'error');
      }
    } catch (err) {
      toast?.show?.(err?.response?.data?.message || 'Payment initialization failed.', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-white tracking-tight">Upgrade Your Sira</h2>
        <p className="text-gray-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
          Get hired faster with AI background matching and a verified professional profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FREE PLAN CARD */}
        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] relative flex flex-col group">
          <div className="mb-8">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-[0.2em] mb-2">Basic Worker</h3>
            <div className="text-white text-4xl font-black">Free</div>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            {['Manual Job Search', '1 Voice-CV Generation', 'Standard Listings'].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-gray-600" /> {feat}
              </li>
            ))}
          </ul>

          <button 
            onClick={() => handleUpgrade('basic')}
            disabled={loading === 'basic'}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading === 'basic' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Select Plan'}
          </button>
        </div>

        {/* PRO PLAN CARD (PREMIUM) */}
        <div className="relative group">
          {/* Subtle Glow behind the card */}
          <div className="absolute -inset-0.5 bg-linear-to-r from-[#2BB8B8] to-cyan-400 rounded-[2.6rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          
          <div className="relative bg-[#1A2E35] border-2 border-[#2BB8B8]/40 p-8 rounded-[2.5rem] flex flex-col h-full shadow-[0_20px_50px_rgba(43,184,184,0.12)]">
            {/* "Popular" Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#2BB8B8] text-slate-950 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
              Recommended
            </div>

            <div className="mb-8 flex justify-between items-start">
              <div>
                <h3 className="text-[#2BB8B8] font-black text-xs uppercase tracking-[0.2em] mb-2">Sira Pro</h3>
                <div className="text-white text-4xl font-black">500 ETB<span className="text-sm text-gray-500 font-bold ml-1">/mo</span></div>
              </div>
              <Crown className="w-8 h-8 text-[#2BB8B8] drop-shadow-[0_0_10px_rgba(43,184,184,0.35)]" />
            </div>
            
            <ul className="space-y-4 mb-10 flex-1">
              {[
                { text: 'AI Auto-Apply to Jobs', icon: Zap },
                { text: 'Background Matching 24/7', icon: Zap },
                { text: 'Verified Worker Badge', icon: ShieldCheck },
                { text: 'Unlimited Voice-CVs', icon: Zap },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white text-sm font-bold">
                  <item.icon className="w-4 h-4 text-[#2BB8B8] fill-[#2BB8B8]/20" /> {item.text}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleUpgrade('pro')}
              disabled={loading === 'pro'}
              className="w-full py-4 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black text-xs uppercase tracking-widest shadow-xl hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading === 'pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade with Chapa'}
            </button>
          </div>
        </div>

        {/* BUSINESS PLAN CARD */}
        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] relative flex flex-col group">
          <div className="mb-8">
            <h3 className="text-gray-500 font-black text-xs uppercase tracking-[0.2em] mb-2">Business</h3>
            <div className="text-white text-4xl font-black">1500 ETB<span className="text-sm text-gray-500 font-bold ml-1">/3mo</span></div>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            {[
              'Everything in Pro',
              'Unlimited Job Posts',
              'Advanced Analytics',
              'Priority Support'
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-gray-600" /> {feat}
              </li>
            ))}
          </ul>

          <button 
            onClick={() => handleUpgrade('business')}
            disabled={loading === 'business'}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading === 'business' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade with Chapa'}
          </button>
        </div>

      </div>

      {/* Trust Badge / Footer */}
      <p className="text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
        Secure Payment processed by Chapa Financial Technologies
      </p>
    </div>
  );
};

export default Subscription;