import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowLeft, DollarSign, Briefcase, User } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const txRef = searchParams.get('tx_ref');

  const [verifying, setVerifying] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!txRef) {
      setVerifying(false);
      setError('No transaction reference found.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/payments/verify-transaction', { tx_ref: txRef });
        const chapaData = res.data?.data?.data || {};
        if (res.data?.success) {
          setPayment({
            amount: Number(chapaData.amount) || 0,
            currency: chapaData.currency || 'ETB',
            workerName: chapaData.first_name || auth?.user?.fullName || 'Worker',
            jobTitle: chapaData?.customization?.description || 'Job Payment',
            employerName: auth?.user?.fullName || 'Employer',
            tx_ref: txRef,
            paidAt: chapaData.updated_at || new Date().toISOString()
          });
        } else {
          setError('Payment verification failed. Please contact support.');
        }
      } catch {
        setError('Could not verify payment. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [txRef, auth]);

  return (
    <div className="min-h-screen bg-[#060D0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {verifying ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
            <p className="text-white/60 font-bold text-sm">Verifying payment...</p>
          </div>
        ) : error ? (
          <div className="bg-white/5 border border-red-500/20 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-3xl">!</span>
            </div>
            <h1 className="text-xl font-black text-white">Verification Error</h1>
            <p className="text-white/50 text-sm">{error}</p>
            <button
              onClick={() => navigate(auth?.user?.role === 'employer' ? '/employer-dashboard' : '/dashboard')}
              className="inline-flex items-center gap-2 bg-[#2BB8B8] text-slate-950 px-6 py-3 rounded-xl font-black text-sm hover:scale-105 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white">Payment Successful</h1>
              <p className="text-emerald-400/70 text-sm">Your transaction has been completed</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 animate-slide-up">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#2BB8B8]/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#2BB8B8]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Amount</p>
                  <p className="text-white font-black text-xl">
                    {payment?.amount?.toLocaleString()} <span className="text-sm font-bold text-emerald-400">{payment?.currency || 'ETB'}</span>
                  </p>
                </div>
              </div>

              {payment?.workerName && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Worker</p>
                    <p className="text-white font-bold">{payment.workerName}</p>
                  </div>
                </div>
              )}

              {payment?.jobTitle && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Job</p>
                    <p className="text-white font-bold">{payment.jobTitle}</p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10">
                <p className="text-white/30 text-[10px] font-mono">TX Ref: {payment?.tx_ref}</p>
                <p className="text-white/30 text-[10px] font-mono mt-1">
                  {payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(auth?.user?.role === 'employer' ? '/employer-dashboard' : '/dashboard')}
              className="w-full bg-[#2BB8B8] text-slate-950 py-4 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
