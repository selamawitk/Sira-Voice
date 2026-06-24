import React, { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Loader2, DollarSign, Star, Briefcase, CheckCircle2, MessageSquare, MapPin } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const statusPill = (status) => {
  const base = 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border';
  if (status === 'accepted') return `${base} bg-[#2BB8B8]/15 text-[#2BB8B8] border-[#2BB8B8]/25`;
  if (status === 'completed') return `${base} bg-white/10 text-white border-white/10`;
  if (status === 'rejected') return `${base} bg-red-500/15 text-red-300 border-red-500/20`;
  if (status === 'active') return `${base} bg-emerald-500/15 text-emerald-400 border-emerald-500/25`;
  return `${base} bg-white/5 text-white/60 border-white/10`;
};

const ApplicationHistory = () => {
  const { copy } = useContext(LanguageContext);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ totalEarnings: 0, completedJobs: 0, avgRating: 0 });
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [appRes, contractRes, ratingsRes, histRes] = await Promise.all([
          api.get('/applications/history'),
          api.get(`/contracts/worker/${auth?.user?._id}`).catch(() => ({ data: { data: [] } })),
          api.get(`/ratings/${auth?.user?._id}`).catch(() => ({ data: { data: [] } })),
          api.get('/applications/worker-history').catch(() => ({ data: { data: {} } })),
        ]);
        setApplications(appRes.data?.data ?? []);
        setContracts(contractRes.data?.data ?? []);
        setRatings(ratingsRes.data?.data ?? []);
        
        const histData = histRes.data?.data || histRes.data || {};
        const completedJobsCount = Array.isArray(histData.completedJobs) ? histData.completedJobs.length : (histData.completedJobs || 0);
        const allRatings = Array.isArray(histData.ratings) ? histData.ratings : [];
        const avgRating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + (r.overall || r.score || 0), 0) / allRatings.length : 0;
        const totalEarnings = Array.isArray(histData.contracts) ? histData.contracts.reduce((sum, c) => sum + (c.agreedAmount || 0), 0) : 0;
        setStats({
          totalEarnings,
          completedJobs: completedJobsCount,
          avgRating,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [auth?.user?._id]);

  const handleMessage = useCallback(async (application) => {
    try {
      const employerId = application.job?.employer?._id || application.job?.employer;
      const res = await api.post('/chat/conversations', {
        jobId: application.job?._id || application.job,
        workerId: auth?.user?._id,
        employerId,
      });
      if (res.data?.success) {
        navigate('/chat', { state: { autoSelectConversation: res.data.data } });
      }
    } catch {}
  }, [auth?.user?._id, navigate]);

  return (
    <div className="max-w-6xl mx-auto page-enter">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white">{copy.applicationHistoryTitle || 'Application History'}</h1>
        <p className="text-white/60 mt-2">{copy.trackHistorySubtitle || 'Track your applications, contracts, and earnings'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-[#2BB8B8] mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Earnings</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.totalEarnings.toLocaleString()} ETB</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Completed</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.completedJobs}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Star className="w-4 h-4 fill-yellow-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Avg Rating</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.avgRating ? Number(stats.avgRating).toFixed(1) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard>
            <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#2BB8B8]" />
              Applications ({applications.length})
            </h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#2BB8B8]" /></div>
            ) : applications.length === 0 ? (
              <p className="text-white/50 text-sm">{copy.noApplicationsYet || 'No applications yet'}</p>
            ) : (
              <div className="space-y-3">
                {applications.map((a) => (
                  <div key={a._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{a.job?.title ?? 'Job'}</p>
                        <p className="text-white/45 text-xs mt-1 truncate">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {a.job?.location?.address || 'Addis Ababa'} • {a.job?.salary ?? 0} ETB
                        </p>
                        {a.workerSnapshot?.includeCv && (
                          <p className="text-[#2BB8B8] text-[10px] font-semibold mt-1">
                            CV attached • {a.workerSnapshot?.skills?.join(', ') || 'General'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={statusPill(a.status)}>{a.status}</span>
                        {a.appliedByAI && (
                          <span className="px-2 py-1 rounded-full text-[9px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => setExpandedApp(expandedApp === a._id ? null : a._id)}
                        className="text-[10px] text-white/40 hover:text-white font-semibold uppercase tracking-wider"
                      >
                        {expandedApp === a._id ? 'Less' : 'Details'}
                      </button>
                      {a.status === 'accepted' && (
                        <button
                          onClick={() => handleMessage(a)}
                          className="text-[10px] text-[#2BB8B8] hover:text-white font-semibold uppercase tracking-wider flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Message
                        </button>
                      )}
                    </div>
                    {expandedApp === a._id && (
                      <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/50 space-y-1 animate-fade-in">
                        <p>Applied: {new Date(a.createdAt).toLocaleDateString()}</p>
                        <p>Updated: {new Date(a.updatedAt).toLocaleDateString()}</p>
                        {a.matchScore && <p>AI Match Score: {a.matchScore}%</p>}
                        {a.expectedSalary && <p>Expected Salary: {a.expectedSalary} ETB</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              Active Contracts ({contracts.filter(c => c.status === 'active').length})
            </h3>
            {contracts.filter(c => c.status === 'active').length === 0 ? (
              <p className="text-white/50 text-sm">No active contracts</p>
            ) : (
              <div className="space-y-3">
                {contracts.filter(c => c.status === 'active').map((c) => (
                  <div key={c._id} className="bg-[#1A2E35]/70 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-white font-semibold text-sm truncate">{c.jobId?.title || 'Contract'}</p>
                    <p className="text-emerald-400 text-xs font-bold mt-1">{c.agreedAmount} ETB</p>
                    <a href={`/chat?jobId=${c.jobId?._id}`} className="text-[10px] text-[#2BB8B8] hover:underline mt-1 inline-block">
                      Message Employer →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              Recent Ratings ({ratings.length})
            </h3>
            {ratings.length === 0 ? (
              <p className="text-white/50 text-sm">No ratings yet</p>
            ) : (
              <div className="space-y-3">
                {ratings.slice(0, 5).map((r) => (
                  <div key={r._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      {'★'.repeat(Math.round(r.overall || r.score || 0))}
                      {'☆'.repeat(5 - Math.round(r.overall || r.score || 0))}
                    </div>
                    <p className="text-white/60 text-[10px] mt-1 line-clamp-2">{r.comment || 'No comment'}</p>
                    <p className="text-white/30 text-[9px] mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ApplicationHistory;