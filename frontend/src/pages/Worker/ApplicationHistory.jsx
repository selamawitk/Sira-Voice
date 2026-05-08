import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';

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
  return `${base} bg-white/5 text-white/60 border-white/10`;
};

const ApplicationHistory = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/applications/history');
        setItems(res.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const grouped = useMemo(() => {
    // Simple list (timeline-style)
    return items;
  }, [items]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white">Application History</h1>
        <p className="text-white/60 mt-2">Track every application, hire, and completion in one place.</p>
      </div>

      <GlassCard>
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-white/50">No applications yet.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map((a) => (
              <div key={a._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-white font-black">{a.job?.title ?? 'Job'}</p>
                    <p className="text-white/45 text-sm mt-1">
                      {a.job?.location?.address ?? 'Addis Ababa'} • {a.job?.salary ?? 0} ETB
                    </p>
                    <p className="text-white/45 text-sm mt-1">
                      Updated: <span className="text-white/70 font-bold">{new Date(a.updatedAt ?? a.createdAt).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={statusPill(a.status)}>{a.status}</span>
                    {a.appliedByAI ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-[#2BB8B8]/10 text-[#2BB8B8] border border-[#2BB8B8]/20">
                        AI Applied
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default ApplicationHistory;

