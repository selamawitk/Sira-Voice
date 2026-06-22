import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; 
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Loader2, CheckCircle2, Clock, CreditCard, PartyPopper } from 'lucide-react';

const ActiveContracts = () => {
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const lang = useContext(LanguageContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const t = lang?.copy || {};

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setShowSuccessBanner(true);
      toast?.show?.('Payment Successful!', 'success');
      navigate(location.pathname, { replace: true });
    }
    
    loadContracts();
  }, [location.search, loadContracts, navigate]);

  const payWorker = async (contract) => {
    if (payingId || contract.status === 'paid') return;

    try {
      setPayingId(contract._id);
      
      const res = await api.post('/payments/initialize', {
        amount: contract.agreedAmount,
        purpose: 'job_payment',
        workerId: contract.workerId?._id,
        contractId: contract._id,
        jobId: contract.jobId?._id,
      });

      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast?.show?.(err.response?.data?.message || 'Payment initialization failed', 'error');
      setPayingId(''); 
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
            {t.close || 'DISMISS'}
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black text-white italic tracking-tighter">
          {lang?.lang === 'am' ? (
            <>ንቁ <span className="text-[#2BB8B8]">ውሎች</span></>
          ) : lang?.lang === 'or' ? (
            <>WALIIGALTEE <span className="text-[#2BB8B8]">HOJJACHAA JIRAN</span></>
          ) : (
            <>ACTIVE <span className="text-[#2BB8B8]">CONTRACTS</span></>
          )}
        </h1>
        <p className="text-white/40 mt-2 font-medium">
          {t.employerSub || 'Smart matching. Secure contracts. Seamless payments.'}
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
              {t.transcribing || 'Syncing Escrow Vault...'}
            </p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg font-black italic uppercase tracking-tighter">
              {lang?.lang === 'am' ? 'ምንም ንቁ ውሎች አልተገኙም' : lang?.lang === 'or' ? 'Waliigaltee Hojii Hin Argamne' : 'No Active Contracts Found'}
            </p>
            <button onClick={() => navigate('/dashboard')} className="text-[#2BB8B8] text-sm mt-4 inline-block hover:underline">
              {lang?.lang === 'am' ? 'የመጀመሪያ ሰራተኛዎን ይቅጠሩ →' : lang?.lang === 'or' ? 'Hojjetaa kee jalqabaa qaxari →' : 'Hire your first worker →'}
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
                      <StatusBadge status={contract.status} langKey={lang?.lang} />
                    </div>
                    
                    <p className="text-white/50 font-bold text-xs uppercase tracking-widest">
                      {lang?.lang === 'am' ? 'ፕሮጀክት' : lang?.lang === 'or' ? 'Hojii' : 'Project'}: {contract.jobId?.title || 'General Engagement'}
                    </p>

                    <div className="flex items-center gap-6 mt-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">
                          {lang?.lang === 'am' ? 'የተጣራ ክፍያ' : lang?.lang === 'or' ? 'Kafaltii Qulqulluu' : 'Net Payment'}
                        </p>
                        <p className="text-[#2BB8B8] font-black text-xl">{contract.agreedAmount} ETB</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">
                          {lang?.lang === 'am' ? 'መዋቅር' : lang?.lang === 'or' ? 'Akkaataa Kafaltii' : 'Structure'}
                        </p>
                        <p className="text-white/80 font-black text-sm uppercase">
                          {contract.paymentType === 'daily' && (t.dailyRate || 'Daily')}
                          {contract.paymentType === 'hourly' && (t.hourlyRate || 'Hourly')}
                          {contract.paymentType === 'fixed' && (t.fixedContract || 'Fixed')}
                          {!['daily', 'hourly', 'fixed'].includes(contract.paymentType) && contract.paymentType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
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
                        {payingId === contract._id ? (
                          lang?.lang === 'am' ? 'በማስጀመር ላይ...' : lang?.lang === 'or' ? 'JALQABSIISAA...' : 'INITIALIZING...'
                        ) : (
                          lang?.lang === 'am' ? 'ክፍያ ልቀቅ' : lang?.lang === 'or' ? 'KAFALTII GADI LAKKISI' : 'RELEASE PAYMENT'
                        )}
                      </button>
                    )}

                    {contract.status === 'active' && (
                      <button
                        onClick={() => completeContract(contract._id)}
                        disabled={!!payingId}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-white font-black hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {lang?.lang === 'am' ? 'ተጠናቋል በል' : lang?.lang === 'or' ? 'AKKA XUMURAMETTI MALLATTEESSI' : 'MARK AS DONE'}
                      </button>
                    )}
                    
                    {contract.status === 'paid' && (
                      <div className="flex items-center gap-2 text-green-400 font-black italic text-sm bg-green-500/10 px-5 py-3 rounded-2xl border border-green-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        {lang?.lang === 'am' ? 'ክፍያው ተለቋል' : lang?.lang === 'or' ? 'KAFALTIIN GADI LAKKIFAMEERA' : 'ESCROW RELEASED'}
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

const StatusBadge = ({ status, langKey }) => {
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

  const labels = {
    am: { paid: 'የተከፈለ', completed: 'የተጠናቀቀ', active: 'በስራ ላይ' },
    or: { paid: 'Kan Kaffalame', completed: 'Kan Xumurame', active: 'Hojjechaa jira' },
    en: { paid: 'Paid', completed: 'Completed', active: 'Active' }
  };

  const currentLabel = labels[langKey]?.[status] || labels.en?.[status] || status;

  return (
    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${styles[status] || styles.active}`}>
      {icons[status] || icons.active}
      {currentLabel}
    </span>
  );
};

export default ActiveContracts;