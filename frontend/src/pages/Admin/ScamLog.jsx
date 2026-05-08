import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const riskColor = (score) => {
  if (score == null) return 'text-white/50';
  const n = Number(score);
  if (n >= 70) return 'text-rose-300';
  if (n >= 40) return 'text-amber-300';
  return 'text-[#2BB8B8]';
};

const riskBadge = (score) => {
  if (score == null) return 'text-white/50 bg-white/5 border-white/10';
  if (score >= 70) return 'text-red-200 bg-red-600/10 border-red-400/20';
  return 'text-[#2BB8B8] bg-[#2BB8B8]/10 border-[#2BB8B8]/20';
};

const ScamLog = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [analysisByJobId, setAnalysisByJobId] = useState({});
  const [analyzingId, setAnalyzingId] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/jobs');
        setJobs(res.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const analyze = async (jobId) => {
    setAnalyzingId(jobId);
    try {
      const res = await api.get(`/ai/verify-safety/${jobId}`);
      const analysis = res.data?.analysis ?? null;
      setAnalysisByJobId((prev) => ({ ...prev, [jobId]: analysis }));
    } finally {
      setAnalyzingId('');
    }
  };

  const rows = useMemo(() => {
    return jobs.map((j) => {
      const analysis = analysisByJobId[j._id];
      return {
        job: j,
        analysis,
      };
    });
  }, [jobs, analysisByJobId]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white">Scam Detection Log</h1>
        <p className="text-white/60 mt-2">
          Run AI safety checks on job posts and review the <span className="text-white font-bold">Risk Score</span>.
        </p>
      </div>

      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.05] blur-[140px] pointer-events-none" />

        {loading ? (
          <p className="text-white/50 relative z-10">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/50 relative z-10">No jobs found.</p>
        ) : (
          <div className="space-y-3 relative z-10">
            {rows.slice(0, 20).map(({ job, analysis }) => (
              <div key={job._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-black truncate">{job.title}</p>
                    <p className="text-white/45 text-sm mt-1">
                      {job.location?.address ?? 'Addis Ababa'} • {job.salary ?? 0} ETB
                    </p>
                    {analysis ? (
                      <p className="text-white/55 text-sm mt-2">
                        {analysis.reason}
                      </p>
                    ) : (
                      <p className="text-white/35 text-sm mt-2">
                        Not analyzed yet.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-2xl font-black ${riskColor(analysis?.score)}`}>
                        {analysis?.score ?? '--'}/100
                      </p>
                      <p className="text-white/35 text-xs font-black uppercase tracking-[0.22em]">
                        risk score
                      </p>
                    </div>

                    <span className={`text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${riskBadge(analysis?.score)}`}>
                      {analysis?.score == null ? 'Not analyzed' : analysis?.score >= 70 ? 'High Risk' : 'Low Risk'}
                    </span>

                    <button
                      onClick={() => analyze(job._id)}
                      disabled={analyzingId === job._id}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 transition disabled:opacity-60"
                    >
                      {analyzingId === job._id ? 'Analyzing…' : 'Analyze'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-white/30 text-xs mt-5 relative z-10">
          Note: This calls `GET /api/ai/verify-safety/:jobId` per job. For scale, we’ll add a backend endpoint to batch analyze.
        </p>
      </GlassCard>
    </div>
  );
};

export default ScamLog;

