import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Stat = ({ label, value, sub }) => (
  <GlassCard>
    <p className="text-white/45 text-xs font-black uppercase tracking-[0.22em]">{label}</p>
    <p className="text-white text-4xl font-black mt-2">{value}</p>
    {sub ? <p className="text-white/45 text-sm mt-3">{sub}</p> : null}
  </GlassCard>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data?.data ?? null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white">Admin Analytics</h1>
        <p className="text-white/60 mt-2">System overview for judges, safety, and trust operations.</p>
      </div>

      {loading ? (
        <p className="text-white/50">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Stat label="Workers" value={stats?.users?.workers ?? 0} />
            <Stat label="Employers" value={stats?.users?.employers ?? 0} />
            <Stat label="Jobs (total)" value={stats?.jobs?.total ?? 0} sub={`Active: ${stats?.jobs?.active ?? 0}`} />
            <Stat label="Matches" value={stats?.matches ?? 0} sub={`Flagged jobs: ${stats?.jobs?.flagged ?? 0}`} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 relative overflow-hidden">
              <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.05] blur-[140px] pointer-events-none" />

              <h2 className="text-white font-black text-lg mb-2 relative z-10">Safety & Scam Monitoring</h2>
              <p className="text-white/50 text-sm mb-5 relative z-10">
                Review suspicious posts and track AI safety checks.
              </p>

              <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-5 relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-black">Scam Detection Log</p>
                    <p className="text-white/45 text-sm mt-1">
                      See AI risk score per job post.
                    </p>
                  </div>
                  <a
                    href="/admin-scam-log"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 transition"
                  >
                    Open Log →
                  </a>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-white font-black text-lg mb-2">Impact</h2>
              <div className="space-y-3 mt-4">
                <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                  <p className="text-white/45 text-xs font-black uppercase tracking-[0.22em]">Total earnings</p>
                  <p className="text-white text-2xl font-black mt-1">{stats?.impact?.totalEarningsETB ?? 0} ETB</p>
                </div>
                <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                  <p className="text-white/45 text-xs font-black uppercase tracking-[0.22em]">Completed jobs</p>
                  <p className="text-white text-2xl font-black mt-1">{stats?.jobs?.completed ?? 0}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

