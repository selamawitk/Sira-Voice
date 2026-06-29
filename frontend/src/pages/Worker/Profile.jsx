import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Award, ShieldCheck, Edit3, Save, X, Sparkles, TrendingUp, History, ShieldAlert, CheckCircle, Briefcase, DollarSign, ArrowLeft, Loader2, Banknote, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const auth = useContext(AuthContext);
  const currentUser = auth?.user;
  const lang = useContext(LanguageContext);
  const copy = lang?.copy;
  const toast = useContext(ToastContext);

  const isPublicView = Boolean(id && id !== currentUser?._id);

  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [jobHistory, setJobHistory] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    headline: '',
    category: '',
    bio: '',
    skills: '',
    experienceYears: 0,
    preferredLanguage: 'amharic'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTargetProfile = async () => {
      if (!isPublicView) {
        setProfileUser(currentUser);
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        const res = await api.get(`/users/worker/${id}`);
        setProfileUser(res.data?.data || res.data);
      } catch (err) {
        console.error(err);
        toast?.show?.('Could not load worker profile', 'error');
        navigate(-1);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchTargetProfile();
  }, [id, currentUser, isPublicView, navigate]);

  useEffect(() => {
    if (profileUser) {
      setFormData({
        title: profileUser?.workerProfile?.title || '',
        headline: profileUser?.workerProfile?.headline || '',
        category: profileUser?.workerProfile?.category || '',
        bio: profileUser?.workerProfile?.bio || '',
        skills: profileUser?.workerProfile?.skills?.join(', ') || '',
        experienceYears: profileUser?.workerProfile?.experienceYears ?? 0,
        preferredLanguage: profileUser?.workerProfile?.preferredLanguage || 'amharic'
      });
    }
  }, [profileUser]);

  useEffect(() => {
    const fetchHistoryLogs = async () => {
      try {
        setHistoryLoading(true);
        const endpoint = isPublicView 
          ? `/transactions/worker/${id}/history` 
          : '/transactions/worker/history';
        const res = await api.get(endpoint);
        setJobHistory(res.data?.data || []);
      } catch (err) {
        console.error(err);
        setJobHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    
    if (profileUser?._id) {
      fetchHistoryLogs();
    }
  }, [id, isPublicView, profileUser?._id]);

  const skills = profileUser?.workerProfile?.skills ?? [];
  const rating = profileUser?.workerProfile?.averageRating ?? profileUser?.workerProfile?.rating ?? 0;

  const completedGigsCount = jobHistory.filter(h => h.status === 'success' || h.status === 'completed').length;
  const totalEarningsAccumulated = jobHistory
    .filter(h => h.status === 'success' || h.status === 'completed')
    .reduce((sum, current) => sum + (current.payout || 0), 0);

  const isAutoApplyActive = !!(
    profileUser?.workerProfile?.autoApplyEnabled || 
    profileUser?.workerProfile?.agentPreferences?.autoApply
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const skillsArray = formData.skills.split(',').map((s) => s.trim()).filter((s) => s !== '');
      await api.put('/users/profile', {
        workerProfile: {
          ...currentUser?.workerProfile,
          title: formData.title,
          headline: formData.headline,
          category: formData.category,
          bio: formData.bio,
          skills: skillsArray,
          experienceYears: Number(formData.experienceYears) || 0,
          preferredLanguage: formData.preferredLanguage
        }
      });

      await auth.fetchMe();
        toast?.show?.('Profile updated', 'success');
      setIsEditing(false);
    } catch (err) {
        toast?.show?.('Update failed', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoApply = async () => {
    if (loading || isPublicView) return;
    setLoading(true);
    try {
      const newStatus = !isAutoApplyActive;
      await api.put('/users/agent-preferences', { autoApply: newStatus });
      await auth.fetchMe();
        toast?.show?.(newStatus ? 'Auto-apply ON' : 'Auto-apply OFF', 'success');
    } catch (err) {
        toast?.show?.('Could not toggle Auto-Apply', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-[#2BB8B8] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-white/40">Loading profile workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-500 pb-10">
      
      {isPublicView && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer mb-2 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Applicants</span>
        </button>
      )}

      <div className="relative bg-white/3 border border-white/10 rounded-4xl p-6 backdrop-blur-3xl overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2BB8B8]/10 blur-[80px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative">
            <div className={`w-24 h-24 rounded-[1.8rem] p-0.5 shadow-xl transition-all ${
              profileUser?.isVerified || rating >= 4.5 ? 'bg-gradient-to-tr from-emerald-500 to-[#2BB8B8]' : 'bg-gradient-to-tr from-amber-500 to-orange-500'
            }`}>
              <div className="w-full h-full rounded-[1.7rem] bg-[#1A2E35] flex items-center justify-center text-3xl font-black text-white">
                {(profileUser?.fullName?.[0] ?? 'W').toUpperCase()}
              </div>
            </div>
            {!isEditing && !isPublicView && (
              <button 
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 bg-[#2BB8B8] p-2 rounded-lg text-white hover:scale-110 transition-transform shadow-lg cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-3xl font-black text-white tracking-tight">{profileUser?.fullName ?? 'Profile'}</h1>
              
              {(profileUser?.isVerified || rating >= 4.5) ? (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Safe</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Pending Audit</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <MapPin className="w-3 h-3 text-[#2BB8B8]" /> {profileUser?.location?.address ?? 'Addis Ababa'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <Award className="w-3 h-3 text-amber-400" /> {Number(rating).toFixed(1)} / 5.0 Rating Score
              </span>
            </div>
          </div>

          {isEditing && !isPublicView && (
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} className="bg-[#2BB8B8] text-slate-950 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                <Save className="w-4 h-4" /> {copy?.saveLabel ?? 'Save Changes'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-white/5 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-white/10">
                <X className="w-4 h-4" /> {copy?.cancelLabel ?? 'Cancel'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-[#2BB8B8]/30 transition-all">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Fulfilled Gigs</p>
            <h2 className="text-3xl font-black text-white tracking-tight">{completedGigsCount} Tasks</h2>
            <p className="text-[9px] text-emerald-400/80 font-medium">100% Contract Completion Rate</p>
          </div>
          <Briefcase className="w-12 h-12 text-white/5 absolute -right-2 -bottom-2 group-hover:scale-110 group-hover:text-[#2BB8B8]/10 transition-all duration-300" />
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Aggregated Rating</p>
            <h2 className="text-3xl font-black text-white tracking-tight">{Number(rating).toFixed(1)} / 5.0</h2>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, idx) => (
                <span key={idx} className={`text-xs ${idx < Math.floor(rating) ? 'text-amber-400' : 'text-white/20'}`}>★</span>
              ))}
            </div>
          </div>
          <Award className="w-12 h-12 text-white/5 absolute -right-2 -bottom-2 group-hover:scale-110 group-hover:text-amber-500/10 transition-all duration-300" />
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Accumulated Financial Volume</p>
            <h2 className="text-3xl font-black text-emerald-400 tracking-tight">{totalEarningsAccumulated.toLocaleString()} ETB</h2>
            <p className="text-[9px] text-white/40 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Transacted via decentralized trust
            </p>
          </div>
          <DollarSign className="w-12 h-12 text-white/5 absolute -right-2 -bottom-2 group-hover:scale-110 group-hover:text-emerald-500/10 transition-all duration-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.bioLabel ?? 'Bio Statement'}</h3>
          {isEditing ? (
            <textarea 
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none min-h-25 focus:border-[#2BB8B8]/50 transition-all resize-none"
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {profileUser?.workerProfile?.bio || (copy?.noBioProvided ?? 'No validation bio profile configured.')}
            </p>
          )}
        </div>

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.headlineLabel ?? 'Profile Headline'}</h3>
          {isEditing ? (
            <input 
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50 transition-all"
              placeholder="Experienced Local Professional Available Now"
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {profileUser?.workerProfile?.headline || (copy?.noHeadline ?? 'Add a short headline to make your profile stand out.')}
            </p>
          )}
        </div>

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.skillsLabel ?? 'Verified Capability Matrix'}</h3>
          {isEditing ? (
            <input 
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50 transition-all"
              placeholder="Plumbing, Carpentry, Wiring..."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? skills.map((skill) => (
                <span key={skill} className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#2BB8B8]/20 tracking-wider">
                  {skill}
                </span>
              )) : (
                <span className="text-white/40 text-xs">{copy?.noSkillsAdded ?? 'No targeted competencies added.'}</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.categoryLabel ?? 'Specialty Category'}</h3>
          {isEditing ? (
            <input 
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50 transition-all"
              placeholder="Carpentry, Electrical, Plumbing..."
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              {profileUser?.workerProfile?.category || (copy?.noCategory ?? 'No specialty category set.')}
            </p>
          )}
        </div>

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.experienceLabel ?? 'Field Tenure Tracking'}</h3>
          {isEditing ? (
            <input
              type="number"
              min="0"
              value={formData.experienceYears}
              onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50 transition-all"
            />
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed font-semibold">
              {profileUser?.workerProfile?.experienceYears ?? 0} {copy?.yearsExperience ?? 'Years Active Professional Tenure'}
            </p>
          )}
        </div>

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold text-sm mb-3">{copy?.preferredLanguageLabel ?? 'Acoustic Dialect Preference'}</h3>
          {isEditing ? (
            <select
              value={formData.preferredLanguage}
              onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50 transition-all cursor-pointer"
            >
              <option value="amharic">Amharic (አማርኛ)</option>
              <option value="oromigna">Oromigna (Afaan Oromoo)</option>
              <option value="english">English</option>
            </select>
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed uppercase font-black tracking-widest text-[#2BB8B8]">
              {profileUser?.workerProfile?.preferredLanguage || 'Amharic'}
            </p>
          )}
        </div>

        {(!isPublicView || isAutoApplyActive) && (
          <div className="bg-white/3 border border-white/10 rounded-3xl p-6 md:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2BB8B8] animate-pulse" />
                  {copy?.aiAgentPreferences ?? 'AI Autonomous Agent Settings'}
                </h3>
                <p className="text-[10px] text-white/30">{copy?.autoMatchingSubtitle ?? 'Configures background matching telemetry and auto-apply engines'}</p>
              </div>
              
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5 w-full sm:w-auto justify-between">
                <span className="text-gray-300 text-xs font-black uppercase tracking-wider text-[10px]">{copy?.autoApplyLabel ?? 'Background Auto-Apply'}</span>
                <button
                  type="button"
                  disabled={loading || isPublicView}
                  onClick={toggleAutoApply}
                  className={`w-11 h-6 rounded-full transition-all relative ${
                    isAutoApplyActive ? 'bg-[#2BB8B8]' : 'bg-white/10'
                  } ${loading || isPublicView ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${
                    isAutoApplyActive ? 'translate-x-6 shadow-md shadow-black/40' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!isPublicView && (
          <PaymentInfoSection userId={currentUser?._id} />
        )}

        <div className="bg-white/3 border border-white/10 rounded-3xl p-6 md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <History className="w-4 h-4 text-[#2BB8B8]" />
            <div>
              <h3 className="text-white font-bold text-sm">Cryptographic Engagement Logs</h3>
              <p className="text-[10px] text-white/30">Verified history directly authenticated by employers without middle-men brokers</p>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#2BB8B8] border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Auditing transaction history...</p>
            </div>
          ) : jobHistory.length === 0 ? (
            <div className="py-8 text-center bg-black/10 rounded-2xl border border-dashed border-white/5">
              <p className="text-xs text-white/30 font-medium">No verified historical engagements found on record ledger.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {jobHistory.map((log) => (
                <div key={log._id} className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-black/30 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold text-xs tracking-tight">{log.title}</h4>
                      <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 font-medium">Client Node: <span className="text-white/60">{log.employer}</span> • Completed on {log.date || 'Recent'}</p>
                  </div>

                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    <span className="text-xs font-black text-emerald-400">+{log.payout} ETB</span>
                    {log.rating && (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 mt-0.5">
                        ★ {Number(log.rating).toFixed(1)}
                      </span>
                    )}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const PaymentInfoSection = ({ userId }) => {
  const [paymentProfile, setPaymentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/payments/profile');
        if (res.data?.success) {
          setPaymentProfile(res.data.data.paymentProfile);
          setBankName(res.data.data.paymentProfile?.bankName || '');
          setAccountName(res.data.data.paymentProfile?.accountName || '');
          setAccountNumber(res.data.data.paymentProfile?.accountNumber || '');
          setStripeAccountId(res.data.data.paymentProfile?.stripeAccountId || '');
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/payments/profile', {
        bankName,
        accountName,
        accountNumber,
        stripeAccountId
      });
      if (res.data?.success) {
        setPaymentProfile(res.data.data);
        toast?.show?.('Payment information saved', 'success');
        setEditing(false);
      }
    } catch {
        toast?.show?.('Failed to save payment information', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isReady = paymentProfile?.paymentReady;

  return (
    <div className="bg-white/3 border border-white/10 rounded-3xl p-6 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#2BB8B8]" />
          <div>
            <h3 className="text-white font-bold text-sm">Payment Information</h3>
            <p className="text-[10px] text-white/30">Required to receive payments from employers</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-white hover:bg-white/10 transition-all"
          >
            <Edit3 className="w-3 h-3" />
            {paymentProfile?.bankName ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-4 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#2BB8B8] border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] text-white/40">Loading payment info...</span>
        </div>
      ) : (
        <>
          {isReady && !editing && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-xs font-bold">Ready for payment</span>
            </div>
          )}
          {!isReady && !editing && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold">Add payment information to receive payments</span>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Option 1: Bank Account</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Commercial Bank of Ethiopia"
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Full name on account"
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Option 2: Stripe Account</p>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1">Stripe Account ID</label>
                  <input
                    type="text"
                    value={stripeAccountId}
                    onChange={(e) => setStripeAccountId(e.target.value)}
                    placeholder="acct_..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-[#2BB8B8]/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#2BB8B8] text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Payment Info
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setBankName(paymentProfile?.bankName || '');
                    setAccountName(paymentProfile?.accountName || '');
                    setAccountNumber(paymentProfile?.accountNumber || '');
                    setStripeAccountId(paymentProfile?.stripeAccountId || '');
                  }}
                  className="flex items-center gap-2 bg-white/5 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(paymentProfile?.bankName || paymentProfile?.accountName || paymentProfile?.accountNumber) && (
                <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-2">Bank Account</p>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-white/30 text-[10px]">Bank</p>
                      <p className="text-white font-semibold">{paymentProfile?.bankName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px]">Account Holder</p>
                      <p className="text-white font-semibold">{paymentProfile?.accountName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px]">Account Number</p>
                      <p className="text-white font-semibold">{paymentProfile?.accountNumber ? `****${paymentProfile.accountNumber.slice(-4)}` : '-'}</p>
                    </div>
                  </div>
                </div>
              )}
              {paymentProfile?.stripeAccountId && (
                <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#2BB8B8]" />
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Stripe Account</p>
                      <p className="text-white text-xs font-semibold">{paymentProfile.stripeAccountId}</p>
                    </div>
                  </div>
                </div>
              )}
              {!paymentProfile?.bankName && !paymentProfile?.stripeAccountId && (
                <p className="text-white/30 text-xs italic">No payment information added yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;