import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Briefcase, DollarSign, User, Loader2, Send, FileText, CheckCircle2, Star, Navigation, Sparkles } from 'lucide-react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const lang = useContext(LanguageContext);
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [includeCv, setIncludeCv] = useState(false);
  const [cvInfo, setCvInfo] = useState(null);
  const [myApplication, setMyApplication] = useState(null);

  const copy = lang?.copy;
  const isWorker = auth?.role === 'worker';
  const isOwner = auth?.user?._id === (job?.employer?._id || job?.employer);
  const localeMap = { am: 'am-ET', or: 'om-ET', en: 'en-US' };

  const tr = (key, fallback) => copy?.[key] ?? fallback;

  const translateValue = (prefix, value) => {
    if (!value) return '—';
    const key = prefix + value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, '');
    return copy?.[key] || value;
  };

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        if (res.data?.success) {
          const jobData = res.data.data;
          setJob(jobData);
          if (isWorker) {
            try {
              const appRes = await api.get('/applications/history');
              const apps = appRes.data?.data ?? [];
              const mine = apps.find(a => {
                const jobId = a.job?._id || a.job;
                return String(jobId) === String(id);
              });
              if (mine) setMyApplication(mine);
            } catch {}
          }
        }
      } catch {
        navigate('/available-jobs', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate, isWorker]);

  useEffect(() => {
    if (!isWorker) return;
    const fetchCV = async () => {
      try {
        const res = await api.get(`/users/profile/${auth?.user?._id}`);
        const profile = res.data?.data?.workerProfile;
        if (profile?.skills?.length || profile?.bio) {
          setCvInfo({
            skills: profile.skills || [],
            bio: profile.bio || '',
            experienceYears: profile.experienceYears || 0,
          });
          setIncludeCv(true);
        }
      } catch {}
    };
    fetchCV();
  }, [isWorker]);

  const handleApply = async () => {
    if (!job || actionLoading) return;
    setActionLoading('apply');
    try {
      await api.post(`/applications/${job._id}/apply`, { includeCv });
      toast?.show?.('Application submitted successfully!', 'success');
    } catch {
      toast?.show?.('Failed to apply', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-[#1A2E35] min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#2BB8B8]" />
      </div>
    );
  }

  if (!job) return <div className="min-h-screen bg-[#1A2E35]" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <button
        onClick={() => navigate('/available-jobs')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> {copy?.backToJobs ?? 'Back to Jobs'}
      </button>

      <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] space-y-6 animate-fade-in">
        <div>
          <span className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {job.category}
          </span>
          <h2 className="text-2xl font-black text-white mt-3">{job.title}</h2>
        </div>

        <p className="text-white/70 leading-relaxed">{job.description}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <DollarSign className="w-4 h-4 text-[#2BB8B8]" />
            {job.salary?.toLocaleString()} ETB
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="w-4 h-4 text-[#2BB8B8]" />
            {job.location?.address}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Briefcase className="w-4 h-4 text-[#2BB8B8]" />
            {tr('statusLabel', 'Status')}: {translateValue('jobStatus', job.status)}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4 text-[#2BB8B8]" />
            {tr('postedDateLabel', 'Posted')}: {job.createdAt ? new Date(job.createdAt).toLocaleDateString(localeMap[lang?.lang] || 'en-US') : '—'}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <DollarSign className="w-4 h-4 text-[#2BB8B8]" />
          {job.paymentType && `${tr('paymentTypeLabel', 'Payment')}: ${translateValue('paymentType', job.paymentType)}`}
        </div>

        {!isOwner && job.employer?.employerProfile?.employerRating && (
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-sm text-white/50">
            <Star className="w-4 h-4 shrink-0 text-yellow-400 fill-yellow-400" />
            {copy?.employerRating ?? 'Employer Rating'} {Number(job.employer.employerProfile.employerRating).toFixed(1)}
          </div>
        )}

        {!isOwner && (
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-sm text-white/50">
            <User className="w-4 h-4 shrink-0" />
            {copy?.postedBy ?? 'Posted by'} {job.employer?.fullName ?? tr('employerLabel', 'Employer')}
          </div>
        )}

        {myApplication && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {copy?.alreadyAppliedStatus ?? 'Status:'} {translateValue('applicationStatus', myApplication.status)}
          </div>
        )}

        {job.location?.coordinates && (
          <button
            onClick={() => navigate(`/job-map?jobId=${job._id}`)}
            className="flex items-center justify-center gap-2 w-full p-3 bg-[#2BB8B8]/5 border border-[#2BB8B8]/20 rounded-xl text-[#2BB8B8] text-sm font-semibold hover:bg-[#2BB8B8]/10 transition-all"
          >
            <Navigation className="w-4 h-4" />
            {copy?.viewJobAddress ?? 'View Job Address'}
          </button>
        )}

        {isWorker && job.status === 'open' && !myApplication && (
          <div className="space-y-3 pt-2">
            {cvInfo && (
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={includeCv}
                  onChange={(e) => setIncludeCv(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2BB8B8] focus:ring-[#2BB8B8]"
                />
                <div>
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <FileText className="w-4 h-4 text-[#2BB8B8]" />
                    {copy?.sendCVWithApplication ?? 'Send CV with application'}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">
                    {cvInfo.skills?.join(', ') || tr('generalLabel', 'General')} • {cvInfo.experienceYears} yrs exp
                  </p>
                </div>
              </label>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/sira-apply/${job._id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black text-sm py-3 rounded-xl hover:bg-purple-500/30 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {copy?.applyThroughSira ?? 'Apply Through Sira'}
                </button>
                <button
                  onClick={handleApply}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#2BB8B8] text-slate-950 font-black text-sm py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'apply' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {copy?.quickApply ?? 'Quick Apply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
