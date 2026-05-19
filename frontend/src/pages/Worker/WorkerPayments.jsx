import React, { useContext, useEffect, useState, useMemo } from 'react';
import { TrendingUp, Download, Eye, EyeOff, ArrowDownRight } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const WorkerPayments = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);
  const copy = lang?.copy;
  const toast = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // Visibility state for masking financial values
  const [showBalances, setShowBalances] = useState(true);

  // Form input elements state for Chapa withdrawals
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchPayments = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await api.get('/transactions/worker/history');
      if (res.data?.success) {
        setPayments(res.data.data || []);
        setWalletBalance(res.data.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch worker payments:', error);
      toast?.show?.(copy?.failedToLoadTransactions || 'Failed to load transaction history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user?._id, toast]);

  const stats = useMemo(() => {
    const successfulEarnings = payments.filter(p => p.status === 'success' && p.purpose.includes('Earning'));
    const pendingWithdrawals = payments.filter(p => p.status === 'pending' && p.purpose.includes('payout'));

    return {
      totalReceived: successfulEarnings.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingAmount: pendingWithdrawals.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalPayments: successfulEarnings.length,
      pendingPayments: pendingWithdrawals.length
    };
  }, [payments]);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (Number(amount) > walletBalance) {
      toast?.show?.('Insufficient available wallet balance', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        amount: Number(amount),
        account_name: accountName,
        account_number: accountNumber,
        bank_code: bankCode
      };

      const res = await api.post('/transactions/worker/payout', payload);
      if (res.data?.success) {
        toast?.show?.('Payout initiated successfully!', 'success');
        setAmount('');
        setAccountName('');
        setAccountNumber('');
        setBankCode('');
        setShowWithdrawForm(false);
        fetchPayments();
      }
    } catch (error) {
      console.error('Payout initiation failed:', error);
      toast?.show?.(error.response?.data?.message || 'Chapa transfer initialization failed', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-white/60 bg-white/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick action button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">
            {copy?.walletAndEarningsTitle || 'Your Wallet & Earnings'}
          </h1>
          <p className="text-gray-400 mt-2">
            {copy?.walletSubtitle || 'Track your balance, statement history, and request bank disbursements.'}
          </p>
        </div>
        <button
          onClick={() => setShowWithdrawForm(!showWithdrawForm)}
          className="bg-[#2BB8B8] hover:bg-[#239696] text-white px-6 py-3 rounded-2xl font-medium shadow-lg shadow-[#2BB8B8]/10 transition-all flex items-center justify-center gap-2 self-start sm:self-center"
        >
          <ArrowDownRight className="w-5 h-5" />
          {showWithdrawForm ? (copy?.close || 'Close') : (copy?.withdrawFunds || 'Withdraw Funds')}
        </button>
      </div>

      {/* Hidden Collapsible Slide Form */}
      {showWithdrawForm && (
        <GlassCard className="border-[#2BB8B8]/30 max-w-xl animate-fadeIn">
          <h2 className="text-xl font-semibold text-white mb-4">Request Chapa Payout</h2>
          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">{copy?.fieldSalary || 'Salary (ETB)'}</label>
                <input type="number" min="10" placeholder="e.g. 500" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#2BB8B8]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Destination Bank Provider</label>
                <select value={bankCode} onChange={e => setBankCode(e.target.value)} required className="w-full bg-[#1e2330] border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#2BB8B8]">
                  <option value="" className="bg-[#181d29]">-- Select Provider --</option>
                  <option value="966" className="bg-[#181d29]">CBE (Commercial Bank of Ethiopia)</option>
                  <option value="telebirr" className="bg-[#181d29]">Telebirr SuperApp</option>
                  <option value="122" className="bg-[#181d29]">Awash Bank</option>
                  <option value="044" className="bg-[#181d29]">Dashen Bank</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Account Holder Name</label>
              <input type="text" placeholder="Exactly as registered on account" value={accountName} onChange={e => setAccountName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#2BB8B8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Account Number / Recipient Phone</label>
              <input type="text" placeholder="Enter matching bank account digits" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none focus:border-[#2BB8B8]" />
            </div>
            <button type="submit" disabled={submitLoading} className="w-full bg-[#2BB8B8] text-white p-3 rounded-xl font-medium hover:bg-[#239696] transition-all disabled:bg-white/10">
              {submitLoading ? 'Authorizing Chapa Transfer...' : `${copy?.withdrawFunds || 'Withdraw Funds'} ${amount ? amount + ' ETB' : ''}`}
            </button>
          </form>
        </GlassCard>
      )}

      {/* Stats Cards Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Cashable Balance */}
        <GlassCard className="relative overflow-hidden border-teal-500/20 bg-gradient-to-br from-teal-500/[0.05] to-transparent">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500 opacity-[0.05] blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-teal-400 font-medium text-sm">{copy?.availableBalance || 'Available Balance'}</p>
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <p className="text-4xl font-bold text-white">
              {showBalances ? walletBalance.toLocaleString() : '••••'} <span className="text-xl font-light text-white/60">ETB</span>
            </p>
            <p className="text-white/40 text-xs mt-2">{copy?.readyForImmediateWithdrawal || 'Ready for immediate withdrawal'}</p>
          </div>
        </GlassCard>

        {/* Total Lifetime Earnings */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500 opacity-[0.03] blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 font-medium text-sm">{copy?.totalLifetimeEarned || 'Total Lifetime Earned'}</p>
              <Download className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-semibold text-white">
              {showBalances ? `${stats.totalReceived.toLocaleString()} ETB` : '•••• ETB'}
            </p>
            <p className="text-white/40 text-xs mt-2">
              {(copy?.fromJobAllocations || 'From completed job allocations').replace('{count}', stats.totalPayments)}
            </p>
          </div>
        </GlassCard>

        {/* Pending Processing Items with Functional Eye Toggle Button */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500 opacity-[0.03] blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/60 font-medium text-sm">{copy?.inTransferProcessing || 'In Transfer Processing'}</p>
              <button 
                onClick={() => setShowBalances(!showBalances)} 
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-yellow-400 focus:outline-none"
                aria-label="Toggle balance visibility"
              >
                {showBalances ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-3xl font-semibold text-white">
              {showBalances ? `${stats.pendingAmount.toLocaleString()} ETB` : '•••• ETB'}
            </p>
            <p className="text-white/40 text-xs mt-2">
              {stats.pendingPayments === 0 
                ? (copy?.cashoutEventsAwaiting || '0 cashout events awaiting transit') 
                : `${stats.pendingPayments} ${(copy?.inTransferProcessing || 'In Transfer Processing').toLowerCase()}`
              }
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Unified Transaction Table History Display */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-white mb-6">
            {copy?.statementLedger || 'Statement Transaction Ledger'}
          </h2>

          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-4" />
              <p className="text-white/50 font-medium">{copy?.scanningDatabase || 'Scanning database...'}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-white/40 text-lg">
                {copy?.noTransactionsLogged || 'No transactions logged on this account yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-3 px-4 text-white/60 font-medium text-sm">{copy?.fieldDescription || 'Description'}</th>
                    <th className="py-3 px-4 text-white/60 font-medium text-sm">Counterparty Target</th>
                    <th className="py-3 px-4 text-white/60 font-medium text-sm text-right">Transaction Amount</th>
                    <th className="py-3 px-4 text-white/60 font-medium text-sm text-center">Status</th>
                    <th className="py-3 px-4 text-white/60 font-medium text-sm">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map(payment => {
                    const isWithdrawal = payment.purpose?.includes('payout_withdrawal');
                    return (
                      <tr key={payment._id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white font-medium">
                              {payment.job?.title || (isWithdrawal ? 'Chapa Wallet Outflow Payout' : 'Platform Operations')}
                            </p>
                            <p className="text-white/40 text-xs mt-1 truncate max-w-xs">
                              Ref: {payment.tx_ref}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white/70">
                          {isWithdrawal ? 'Personal Bank Account' : (payment.employer?.fullName || 'Sira Platform')}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className={`font-semibold ${isWithdrawal ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {showBalances 
                              ? `${isWithdrawal ? '-' : '+'}${payment.amount?.toLocaleString()} ETB`
                              : '•••• ETB'
                            }
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {payment.status === 'success' || payment.status === 'completed' ? '✓ Settled' : payment.status === 'pending' ? '⏱ Pending' : '✗ Failed'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-white/60 text-sm">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default WorkerPayments;