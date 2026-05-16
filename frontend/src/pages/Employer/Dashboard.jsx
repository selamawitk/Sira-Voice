import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { ShieldCheck, Loader2, UserPlus } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { useNavigate } from 'react-router-dom';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const EmployerDashboard = () => {
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const employerId = auth?.user?._id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [hiringWorkerId, setHiringWorkerId] = useState('');

  // 1. Fetch Employer Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!employerId) return;
      try {
        setLoading(true);
        const res = await api.get('/jobs');
        const all = res.data?.data ?? [];
        const mine = all.filter(j => String(j?.employer?._id ?? j?.employer) === String(employerId));
        const active = mine.filter(j => (j.status ?? 'open') === 'open');

        setJobs(active);
        if (active.length > 0 && !selectedJobId) setSelectedJobId(active[0]._id);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [employerId, selectedJobId]);

  // 2. Fetch Matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!selectedJobId) {
        setMatches([]);
        return;
      }
      setMatchesLoading(true);
      try {
        const res = await api.get(`/jobs/${selectedJobId}/matches`);
        setMatches(res.data?.matches ?? []);
      } catch (err) {
        console.error("Match fetch error:", err);
      } finally {
        setMatchesLoading(false);
      }
    };
    fetchMatches();
  }, [selectedJobId]);

  const rankedByDistanceAndRating = useMemo(() => {
    return [...matches].sort((a, b) => {
      const da = Number(a.distance ?? 9999);
      const db = Number(b.distance ?? 9999);
      if (da !== db) return da - db;
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
  }, [matches]);

  // 3. Optimized Hire Logic
  const hire = async (workerId) => {
    // Prevent double clicks and multiple parallel hires
    if (!selectedJobId || hiringWorkerId) return;

    try {
      setHiringWorkerId(workerId);

      // A. Verify Application exists first
      const res = await api.get(`/applications/job/${selectedJobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find(a => String(a.worker?._id ?? a.worker) === String(workerId));

      if (!app?._id) {
        toast?.show?.('Worker has not applied to this job yet.', 'error');
        setHiringWorkerId('');
        return;
      }

      // B. Check for existing active contract to prevent duplicates
      const contractCheck = await api.get(`/contracts/employer/${employerId}`);
      const existing = (contractCheck.data?.data ?? []).find(
        (c) => String(c.workerId?._id ?? c.workerId) === String(workerId) && 
               String(c.jobId?._id ?? c.jobId) === String(selectedJobId) &&
               c.status !== 'cancelled'
      );

      if (existing) {
        toast?.show?.('A contract already exists for this hiring.', 'info');
        navigate('/contracts');
        return;
      }

      // C. Process Hire (Update status + Create Contract)
      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });

      await api.post('/contracts', {
        employerId,
        workerId,
        jobId: selectedJobId,
        agreedAmount: app?.expectedSalary || 500,
        paymentType: 'daily',
      });

      toast?.show?.('Worker hired! Redirecting to contracts...', 'success');

      // Small delay for better UX before navigation
      setTimeout(() => {
        navigate('/contracts');
      }, 1000);

    } catch (err) {
      console.error("Hire workflow error:", err);
      toast?.show?.(err.response?.data?.message || 'Hiring process failed.', 'error');
      setHiringWorkerId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold text-white">
              Employer Dashboard
            </h1>
            {auth?.user?.isVerified && (
              <div className="flex items-center gap-2 rounded-full bg-[#2BB8B8]/10 px-3 py-1 border border-[#2BB8B8]/20">
                <ShieldCheck className="w-4 h-4 text-[#2BB8B8]" />
                <span className="text-xs font-medium text-[#2BB8B8] uppercase">Verified</span>
              </div>
            )}
          </div>
          <p className="text-white/40 mt-2 font-medium">Smart matching. Secure contracts. Seamless payments.</p>
        </div>

        <button
          onClick={() => navigate('/post-job')}
          className="px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 transition-all shadow-lg shadow-[#2BB8B8]/10"
        >
          Post New Job
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Selector */}
        <GlassCard className="h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-black uppercase italic tracking-widest text-sm text-white/60">Your Openings</h2>
            {loading && <Loader2 className="w-4 h-4 text-[#2BB8B8] animate-spin" />}
          </div>

          <div className="space-y-3">
            {jobs.length === 0 && !loading && (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-white/20 text-xs font-bold uppercase">No active jobs</p>
              </div>
            )}
            {jobs.map((job) => (
              <button
                key={job._id}
                onClick={() => setSelectedJobId(job._id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                  selectedJobId === job._id 
                  ? 'bg-[#2BB8B8]/20 border-[#2BB8B8]/50 ring-1 ring-[#2BB8B8]/30' 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
              >
                <p className={`font-black uppercase italic transition-colors ${selectedJobId === job._id ? 'text-white' : 'text-white/70'}`}>
                  {job.title}
                </p>
                <p className="text-[#2BB8B8] font-black text-sm mt-1">{job.salary} ETB</p>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Right Column: AI Ranking */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-white font-black text-2xl uppercase italic tracking-tighter">AI Matchmaking</h2>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Top candidates for selected project</p>
            </div>
            {matchesLoading && <Loader2 className="w-6 h-6 text-[#2BB8B8] animate-spin" />}
          </div>

          <div className="space-y-4">
            {rankedByDistanceAndRating.length === 0 && !matchesLoading && (
              <div className="text-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/5">
                <p className="text-white/20 font-black italic uppercase">No applications found for this job</p>
              </div>
            )}

            {rankedByDistanceAndRating.map((w) => (
              <div
                key={w._id}
                className="flex justify-between items-center p-5 bg-white/2 border border-white/5 rounded-2xl hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2BB8B8]/20 to-transparent flex items-center justify-center border border-white/10">
                    <span className="text-white font-black text-lg">{w.fullName?.[0]}</span>
                  </div>
                  <div>
                    <p className="text-white font-black text-lg uppercase tracking-tight group-hover:text-[#2BB8B8] transition-colors">
                      {w.fullName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-yellow-500 font-bold text-xs flex items-center gap-1">
                         ⭐ {w.rating || 'N/A'}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-white/40 font-bold text-xs uppercase">{w.distance} KM AWAY</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => hire(w._id)}
                  disabled={!!hiringWorkerId}
                  className="relative flex items-center gap-2 px-8 py-3 bg-[#2BB8B8] text-slate-950 font-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
                >
                  {hiringWorkerId === w._id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      HIRE
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default EmployerDashboard;