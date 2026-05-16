import React, { useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import RatingModal from '../../components/trust/RatingModal.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Star } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Ratings = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api.get('/applications/history');
        setApps(res.data?.data ?? []);
      } catch (error) {
        console.error("Failed to fetch application history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const completed = useMemo(() => {
    return apps.filter((a) => a.status === 'completed' || a.job?.status === 'completed');
  }, [apps]);

  const openRate = (application) => {
    const jobId = application.job?._id ?? application.job;
    if (!jobId || !user) return;

    const targetUserId =
      user.role === 'worker'
        ? application.employer?._id ?? application.employer
        : application.worker?._id ?? application.worker;

    setActive({
      jobId,
      targetUserId,
      roleAtTime: user.role
    });
    setModalOpen(true);
  };

  const handleRatingSubmit = async ({ score, comment }) => {
    if (!active) return;
    try {
      await api.post('/ratings', {
        targetUserId: active.targetUserId,
        jobId: active.jobId,
        score,
        comment,
        roleAtTime: active.roleAtTime,
      });

      setModalOpen(false);
      setActive(null);

      const res = await api.get('/applications/history');
      setApps(res.data?.data ?? []);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">
          {lang?.copy?.ratingsTitle || 'Ratings & Feedback'}
        </h1>
        <p className="text-white/60 mt-2">
          {lang?.copy?.ratingsSubtitle || 'Rate completed jobs to build trust and verified badges.'}
        </p>
      </div>

      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-4" />
            <p className="text-white/50 font-medium">Loading history...</p>
          </div>
        ) : completed.length === 0 ? (
          <div className="py-20 text-center">
            <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">
              {lang?.copy?.noCompletedJobs || 'No completed jobs to rate yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {completed.map((a) => (
              <div
                key={a._id}
                className="group bg-[#1A2E35]/40 border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-lg font-semibold">{a.job?.title || 'Untitled Job'}</p>
                      {a.employer?.isVerified && (
                        <span className="text-[#2BB8B8] text-xs font-medium">✓ Verified</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <p className="text-white/60 text-sm">
                        📍 {a.job?.location?.address || 'Addis Ababa'}
                      </p>
                      <p className="text-[#2BB8B8] text-sm font-semibold">
                        💰 {(a.job?.salary || 0).toLocaleString()} ETB
                      </p>
                      <p className="text-white/60 text-xs uppercase">
                        Status: <span className="text-white/80">{a.status}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openRate(a)}
                    className="w-full md:w-auto px-8 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(43,184,184,0.2)]"
                  >
                    {lang?.copy?.rateButton || 'Rate Experience'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <RatingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
};

export default Ratings;