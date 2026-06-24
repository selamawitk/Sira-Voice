import React, { useContext, useEffect, useState } from 'react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { Loader2, Receipt, CheckCircle2, Clock, AlertCircle, DollarSign, User, Briefcase } from 'lucide-react';

const PaymentHistory = () => {
  const lang = useContext(LanguageContext);
  const auth = useContext(AuthContext);
  const t = lang?.copy || {};

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await api.get('/payments/employer-history');
      if (res.data?.success) {
        setPayments(res.data.data || []);
        setTotalPaid(res.data.totalPaid || 0);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status) => {
    const normalize = status?.toLowerCase();
    
    const statusLabels = {
      am: { success: 'ተሳክቷል', pending: 'በጥበቃ ላይ', failed: 'አልተሳካም' },
      or: { success: 'Milkaa’eera', pending: 'Eeggamaa jira', failed: 'Kufeera' },
      en: { success: 'Success', pending: 'Pending', failed: 'Failed' }
    };

    const activeLang = lang?.lang || 'en';

    switch (normalize) {
      case 'completed':
      case 'success':
        return {
          bg: 'bg-green-500/10',
          text: 'text-green-400',
          border: 'border-green-500/20',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: statusLabels[activeLang]?.success || 'Success'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-400',
          border: 'border-yellow-500/20',
          icon: <Clock className="w-3 h-3" />,
          label: statusLabels[activeLang]?.pending || 'Pending'
        };
      case 'failed':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          border: 'border-red-500/20',
          icon: <AlertCircle className="w-3 h-3" />,
          label: statusLabels[activeLang]?.failed || 'Failed'
        };
      default:
        return {
          bg: 'bg-white/5',
          text: 'text-white/40',
          border: 'border-white/10',
          icon: null,
          label: status || ''
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white italic tracking-tighter">
          {lang?.lang === 'am' ? (
            <>የክፍያ <span className="text-[#2BB8B8]">ታሪክ</span></>
          ) : lang?.lang === 'or' ? (
            <>SEENAA <span className="text-[#2BB8B8]">KAFALTII</span></>
          ) : (
            <>PAYMENT <span className="text-[#2BB8B8]">HISTORY</span></>
          )}
        </h1>
        <p className="text-white/40 mt-2 font-medium uppercase text-xs tracking-widest">
          {lang?.lang === 'am' 
            ? 'የተረጋገጡ የባንክ ዝውውሮች እና የባለአደራ ክፍያዎች' 
            : lang?.lang === 'or' 
            ? 'Dambii kafaltii mirkanaa’ee fi gadi lakkifama dhiyeessii' 
            : 'Verified transactions and escrow releases'}
        </p>
      </div>

      {totalPaid > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <DollarSign className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Total Paid</p>
            <p className="text-emerald-400 font-black text-2xl">{totalPaid.toLocaleString()} ETB</p>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#2BB8B8] animate-spin" />
            <p className="text-white/20 font-black uppercase text-xs">
              {lang?.lang === 'am' ? 'መዝገቡን በመፈተሽ ላይ...' : lang?.lang === 'or' ? 'Kuusaa Maallaqa Sakatta’aa Jira...' : 'Accessing Ledger...'}
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/20 font-black italic uppercase">
              {lang?.lang === 'am' ? 'ምንም የክፍያ ታሪክ አልተገኘም' : lang?.lang === 'or' ? 'Seenaan kafaltii hin argamne' : 'No payment history found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {payments.map((payment) => {
              const styles = getStatusStyles(payment.status);
              return (
                <div
                  key={payment._id}
                  className="p-6 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#2BB8B8]/30 transition-colors">
                        <Receipt className="w-5 h-5 text-white/40 group-hover:text-[#2BB8B8] transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-white/30" />
                          <h2 className="text-white font-black uppercase italic tracking-tight text-lg">
                            {payment.workerId?.fullName || 'Worker'}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Briefcase className="w-3 h-3 text-white/30" />
                          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                            {payment.jobId?.title || 'Job Service'}
                          </p>
                        </div>
                        <p className="text-white/20 text-[10px] font-mono mt-1">
                          TXID: {payment.tx_ref || payment._id}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2">
                      <p className="text-[#2BB8B8] font-black text-xl italic">
                        {payment.amount?.toLocaleString()} <span className="text-[10px] not-italic opacity-60">{payment.currency || 'ETB'}</span>
                      </p>
                      
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
                        {styles.icon}
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {styles.label}
                        </span>
                      </div>
                      
                      <p className="hidden md:block text-white/20 text-[10px] font-bold uppercase mt-1">
                        {new Date(payment.createdAt).toLocaleDateString(lang?.lang === 'am' ? 'am-ET' : lang?.lang === 'or' ? 'om-ET' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;