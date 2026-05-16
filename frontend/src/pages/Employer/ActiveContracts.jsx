import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Added for URL handling
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { Loader2, CheckCircle2, Clock, CreditCard, PartyPopper } from 'lucide-react';

const ActiveContracts = () => {
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // 1. Standardized Load Function
  const loadContracts = useCallback(async () => {
    if (!auth?.user?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/contracts/employer/${auth.user._id}`);
      setContracts(res.data.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast?.show?.('Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  }, [auth?.user?._id, toast]);

  // 2. Handle Chapa Redirect Return & Initial Load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setShowSuccessBanner(true);
      toast?.show?.('Payment Successful!', 'success');
      // Clean the URL so the banner doesn't stay forever on refresh
      navigate(location.pathname, { replace: true });
    }
    
    loadContracts();
  }, [location.search, loadContracts, navigate]);

  // 3. Prevent Double Payment Logic
  const payWorker = async (contract) => {
    // UI Guard: prevent action if already paying or already paid
    if (payingId || contract.status === 'paid') return;

    try {
      setPayingId(contract._id);
      
      // Standardized Endpoint: /payments/initialize
      const res = await api.post('/payments/initialize', {
        amount: contract.agreedAmount,
        purpose: 'job_payment',
        workerId: contract.workerId?._id,
        contractId: contract._id,
        jobId: contract.jobId?._id,
      });

      if (res.data.checkoutUrl) {
        // Redirect to Chapa
        window.location.href = res.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast?.show?.(err.response?.data?.message || 'Payment initialization failed', 'error');
      setPayingId(''); // Reset if failed
    }
  };

  const completeContract = async (id) => {
    try {
      await api.put(`/contracts/${id}/complete`);
      toast?.show?.('Contract marked as completed', 'success');
      loadContracts();
    } catch (err) {
      console.error('Completion error:', err);
      toast?.show?.('Failed to update contract', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* SUCCESS BANNER */}
      {showSuccessBanner && (
        <div className="mb-6 flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-green-400 font-bold">
            <PartyPopper className="w-5 h-5" />
            <span>PAYMENT VERIFIED & CONTRACT UPDATED</span>
          </div>
          <button 
            onClick={() => setShowSuccessBanner(false)}
            className="text-green-400/50 hover:text-green-400 text-xs font-black uppercase"
          >
            DISMISS
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black text-white italic tracking-tighter">
          ACTIVE <span className="text-[#2BB8B8]">CONTRACTS</span>
        </h1>
        <p className="text-white/40 mt-2 font-medium">
          Manage your workforce, track progress, and release payments securely.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Syncing Escrow Vault</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg font-black italic uppercase tracking-tighter">No Active Contracts Found</p>
            <button onClick={() => navigate('/dashboard')} className="text-[#2BB8B8] text-sm mt-4 inline-block hover:underline">
              Hire your first worker →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {contracts.map((contract) => (
              <div key={contract._id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-white font-black text-xl uppercase italic tracking-tight">
                        {contract.workerId?.fullName || 'Anonymous Worker'}
                      </h2>
                      <StatusBadge status={contract.status} />
                    </div>
                    
                    <p className="text-white/50 font-bold text-xs uppercase tracking-widest">
                      Project: {contract.jobId?.title || 'General Engagement'}
                    </p>

                    <div className="flex items-center gap-6 mt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">Net Payment</p>
                        <p className="text-[#2BB8B8] font-black text-xl">{contract.agreedAmount} ETB</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">Structure</p>
                        <p className="text-white/80 font-black text-sm uppercase">{contract.paymentType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* PAY BUTTON: Hidden if already paid */}
                    {contract.status !== 'paid' && (
                      <button
                        onClick={() => payWorker(contract)}
                        disabled={!!payingId || contract.status === 'paid'}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black hover:bg-[#34d4d4] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {payingId === contract._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        {payingId === contract._id ? 'INITIALIZING...' : 'RELEASE PAYMENT'}
                      </button>
                    )}

                    {/* COMPLETION BUTTON: Only for active status */}
                    {contract.status === 'active' && (
                      <button
                        onClick={() => completeContract(contract._id)}
                        disabled={!!payingId}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-white font-black hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        MARK AS DONE
                      </button>
                    )}
                    
                    {/* PAID STATE */}
                    {contract.status === 'paid' && (
                      <div className="flex items-center gap-2 text-green-400 font-black italic text-sm bg-green-500/10 px-5 py-3 rounded-2xl border border-green-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        ESCROW RELEASED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    completed: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const icons = {
    paid: <CheckCircle2 className="w-3 h-3" />,
    completed: <Clock className="w-3 h-3" />,
    active: <Loader2 className="w-3 h-3 animate-spin" />,
  };

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${styles[status] || styles.active}`}>
      {icons[status] || icons.active}
      {status}
    </span>
  );
};

export default ActiveContracts;