import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { useVoice } from '../../hooks/useVoice.js';
import { useNavigate } from 'react-router-dom';
import VoiceActionComponent from '../../components/voice/VoiceActionComponent.jsx';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-white/70">
    {children}
  </span>
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

  const { isListening, result, transcript, error } = useVoice();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/jobs');
        const all = res.data?.data ?? [];
        // Backend has no "my jobs" endpoint yet; filter client-side by employer._id.
        const mine = all.filter((j) => String(j?.employer?._id ?? j?.employer) === String(employerId));
        const active = mine.filter((j) => (j.status ?? 'open') === 'open');
        setJobs(active);
        setSelectedJobId(active?.[0]?._id ?? '');
      } finally {
        setLoading(false);
      }
    };

    if (employerId) run();
  }, [employerId]);

  useEffect(() => {
    const run = async () => {
      if (!selectedJobId) {
        setMatches([]);
        return;
      }
      setMatchesLoading(true);
      try {
        const res = await api.get(`/jobs/${selectedJobId}/matches`);
        setMatches(res.data?.matches ?? []);
      } finally {
        setMatchesLoading(false);
      }
    };
    run();
  }, [selectedJobId]);

  useEffect(() => {
    if (result && result.intent === 'hire_worker') {
      navigate('/create-job', { state: { voiceData: result } });
    }
  }, [result, navigate]);

  const rankedByDistanceAndRating = useMemo(() => {
    // Feature #4: distance asc, rating desc
    return [...matches].sort((a, b) => {
      const da = Number(a.distance ?? 9999);
      const db = Number(b.distance ?? 9999);
      if (da !== db) return da - db;
      const ra = Number(a.rating ?? 0);
      const rb = Number(b.rating ?? 0);
      return rb - ra;
    });
  }, [matches]);

  const hire = async (workerId) => {
    if (!selectedJobId) return;
    setHiringWorkerId(workerId);
    try {
      // 1) Find applicationId for (jobId, workerId)
      const res = await api.get(`/applications/job/${selectedJobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find((a) => String(a.worker?._id ?? a.worker) === String(workerId));
      if (!app?._id) {
        toast?.show?.('No application found for this worker yet.', 'error');
        return;
      }

      // 2) Accept
      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });
      toast?.show?.('Success — worker hired!', 'success');
    } catch {
      toast?.show?.('Hire failed. Please try again.', 'error');
    } finally {
      setHiringWorkerId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-white">Employer Dashboard</h1>
            {auth?.user?.isVerified ? (
              <div className="flex items-center gap-2 rounded-full bg-[#2BB8B8]/10 px-3 py-1">
                <ShieldCheck className="w-4 h-4 text-[#2BB8B8]" />
                <span className="text-xs font-black text-[#2BB8B8]">Verified</span>
              </div>
            ) : null}
          </div>
          <p className="text-white/60 mt-2">
            Post jobs, then let Sira rank the best workers by distance and trust.
          </p>
        </div>
        <a
          href="/post-job"
          className="px-5 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black hover:brightness-110 transition"
        >
          Post a Job
        </a>
        <VoiceActionComponent
          action="post-job"
          buttonText="Voice Post Job"
          placeholder="Say something like 'I need a plumber in Bole for 500 birr'..."
          onSuccess={(result) => {
            if (result.actionTaken === 'JOB_CREATED') {
              toast?.show?.('Job posted successfully!', 'success');
              // Refresh jobs list
              const run = async () => {
                try {
                  const res = await api.get('/jobs');
                  const all = res.data?.data ?? [];
                  const mine = all.filter((j) => String(j?.employer?._id ?? j?.employer) === String(employerId));
                  const active = mine.filter((j) => (j.status ?? 'open') === 'open');
                  setJobs(active);
                  setSelectedJobId(active?.[0]?._id ?? '');
                } catch (err) {
                  console.error(err);
                }
              };
              run();
            }
          }}
          onError={(error) => {
            console.error('Voice post job error:', error);
          }}
          className="px-5 py-3 rounded-2xl"
        />
      </div>
      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 mb-6">
          Error: {error}
        </div>
      )}
      {transcript ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 mb-6">
          <p className="font-bold">Transcript:</p>
          <p>{transcript}</p>
        </div>
      ) : isListening ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/80 mb-6">
          Speak now...
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active posts */}
        <GlassCard className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black text-lg">Active Posts</h2>
            <Badge>{jobs.length} open</Badge>
          </div>

          {loading ? (
            <p className="text-white/50">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-5">
              <p className="text-white font-black">No active posts yet.</p>
              <p className="text-white/50 text-sm mt-2">Create a job, then view AI-ranked candidates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const active = job._id === selectedJobId;
                return (
                  <button
                    key={job._id}
                    onClick={() => setSelectedJobId(job._id)}
                    className={`w-full text-left bg-[#1A2E35]/70 border rounded-2xl p-4 transition ${
                      active ? 'border-[#2BB8B8]/40 shadow-[0_0_0_1px_rgba(43,184,184,0.15)]' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <p className="text-white font-black">{job.title}</p>
                    <p className="text-white/50 text-sm mt-1">
                      {job.location?.address ?? 'Addis Ababa'} • {job.salary ?? 0} ETB
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* AI ranked candidates */}
        <GlassCard className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.06] blur-[140px] pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h2 className="text-white font-black text-lg">AI‑Ranked Candidates</h2>
              <p className="text-white/50 text-sm mt-1">
                Sorted by <span className="text-white/70 font-bold">distance</span> and <span className="text-white/70 font-bold">rating</span>.
              </p>
            </div>
            <a
              className="text-[#2BB8B8] font-black text-sm hover:underline"
              href={selectedJobId ? `/applicants?jobId=${selectedJobId}` : '/applicants'}
            >
              Open full list →
            </a>
          </div>

          {!selectedJobId ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-5 relative z-10">
              <p className="text-white/70">Select a job to see ranked candidates.</p>
            </div>
          ) : matchesLoading ? (
            <p className="text-white/50 relative z-10">Ranking candidates…</p>
          ) : rankedByDistanceAndRating.length === 0 ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-5 relative z-10">
              <p className="text-white font-black">No matches yet.</p>
              <p className="text-white/50 text-sm mt-2">Try a broader category or location.</p>
            </div>
          ) : (
            <div className="space-y-3 relative z-10">
              {rankedByDistanceAndRating.slice(0, 8).map((w) => (
                <div key={w._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-black">{w.fullName}</p>
                      <p className="text-white/55 text-sm mt-1">
                        ⭐ {w.rating ?? 0} • {w.distance} km • score {w.score}
                        {w.isVerified ? <span className="text-[#2BB8B8] font-black"> • ✔ verified</span> : null}
                      </p>
                    </div>
                    <button
                      className="px-4 py-2 rounded-xl bg-[#2BB8B8] text-slate-950 font-black text-xs hover:brightness-110 transition"
                      disabled={hiringWorkerId === w._id}
                      onClick={() => hire(w._id)}
                    >
                      {hiringWorkerId === w._id ? 'Hiring…' : '1‑Click Hire'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default EmployerDashboard;

