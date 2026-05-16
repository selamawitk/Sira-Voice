import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link and useNavigate
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Mic, MicOff, Loader2, ShieldCheck, Info, ArrowLeft } from 'lucide-react';

const PostJob = () => {
  const toast = useContext(ToastContext);
  const lang = useContext(LanguageContext);
  const navigate = useNavigate(); // Hook for smooth SPA navigation
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [salary, setSalary] = useState('');
  const [description, setDescription] = useState('');
  const [paymentType, setPaymentType] = useState('daily');
  const [useEscrow, setUseEscrow] = useState(true);
  
  const [loading, setLoading] = useState(false);
  // Employer voice features moved to Sira assistant — navigate there instead
  const openSira = () => {
    navigate('/sira');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title || !salary) {
      toast?.show?.('Title and Salary are required.', 'info');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        category: category || title,
        description,
        salary: Number(salary || 0),
        paymentType,
        escrowEnabled: useEscrow,
        location: {
          address: address || 'Addis Ababa',
          type: 'Point',
          coordinates: [38.7578, 8.9806],
        },
      };
      
      await api.post('/jobs', payload);
      toast?.show?.('Your job is live! Finding matches...', 'success');
      
      // Clean SPA redirect
      navigate('/employer-dashboard');
    } catch (err) {
      console.error(err);
      toast?.show?.(err.response?.data?.message || 'Failed to post job. Please check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header with Back Button */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1 text-white/40 hover:text-[#2BB8B8] transition-colors text-sm font-medium mb-4"
          >
            <ArrowLeft className="w-3 h-3" /> {lang?.copy?.cancel ?? 'Back'}
          </button>
          <h1 className="text-4xl text-white italic tracking-tighter leading-none font-semibold">
            {lang?.copy?.jobPostTitle ?? 'Post a Job'}
          </h1>
          <p className="text-white/40 mt-3 font-medium max-w-md">
            {lang?.copy?.jobPostSubtitle ?? 'Describe your needs. Sira AI handles the rest.'}
          </p>
        </div>
      </div>

      {/* Voice features for employers now available in Sira assistant */}
      <div className="mb-8 bg-white/5 border border-white/10 rounded-4xl p-6 backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium mb-1">{lang?.copy?.voiceModeLabel ?? 'Voice Mode'}</p>
            <h3 className="text-white text-lg font-semibold">{lang?.copy?.talkToSira ?? 'Talk to Sira'}</h3>
          </div>
          <div>
            <button
              onClick={openSira}
              className="px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 transition-all shadow-sm"
            >
              {lang?.copy?.talkToSira ?? 'Open Sira'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white/3 border border-white/10 rounded-4xl p-8 space-y-6 backdrop-blur-md relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.fieldTitle ?? 'Title'}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all"
              placeholder="e.g. Professional Plumber"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.fieldCategory ?? 'Category'}</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all"
              placeholder="e.g. Maintenance"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.fieldLocation ?? 'Location'}</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all"
              placeholder="Addis Ababa, Bole Area"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.fieldSalary ?? 'Salary (ETB)'}</label>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[#2BB8B8] font-black outline-none focus:border-[#2BB8B8] focus:bg-[#2BB8B8]/5 transition-all"
              placeholder="0.00"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.paymentFrequency ?? 'Payment Frequency'}</label>
            <div className="relative">
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 transition-all appearance-none cursor-pointer"
              >
                <option value="daily" className="bg-slate-900">Daily Rate</option>
                <option value="hourly" className="bg-slate-900">Hourly Rate</option>
                <option value="fixed" className="bg-slate-900">Fixed Contract</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group/escrow">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 transition-colors ${useEscrow ? 'text-[#2BB8B8]' : 'text-white/20'}`} />
              <span className="text-white text-xs font-medium">{lang?.copy?.escrowLabel ?? 'Secure with Escrow'}</span>
            </div>
            <button
              type="button"
              onClick={() => setUseEscrow(!useEscrow)}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${useEscrow ? 'bg-[#2BB8B8]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-950 transition-all ${useEscrow ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-white/40 ml-1 font-medium">{lang?.copy?.fieldDescription ?? 'Description'}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 focus:bg-white/10 transition-all resize-none"
            placeholder="Describe any specific requirements or tools needed..."
          />
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5">
          <div className="flex items-start gap-2 text-white/30 text-[10px] font-medium max-w-[250px]">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {lang?.copy?.escrowHint ?? 'Workers prioritize jobs with "Funds Secured" badges.'}
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => navigate('/employer-dashboard')}
              className="flex-1 md:flex-none px-10 py-4 rounded-2xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all"
            >
              {lang?.copy?.cancel ?? 'Cancel'}
            </button>
            <button
              disabled={loading}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-4 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#2BB8B8]/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'POST JOB NOW'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostJob;