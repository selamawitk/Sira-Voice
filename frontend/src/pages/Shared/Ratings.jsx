import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import RatingModal from '../../components/trust/RatingModal.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Star, MapPin, DollarSign, User, Briefcase, Calendar } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Ratings = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);
  const [searchParams] = useSearchParams();

  const t = lang?.copy || {};
  const activeLang = lang?.lang || 'en';

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [reviewsReceived, setReviewsReceived] = useState([]);
  const [reviewsGiven, setReviewsGiven] = useState([]);
  const [activeTab, setActiveTab] = useState('rate');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [appRes, receivedRes, givenRes] = await Promise.all([
          api.get('/applications/history'),
          api.get(`/ratings/${user?._id}`).catch(() => ({ data: { data: [] } })),
          api.get('/ratings/job-given-ratings').catch(() => ({ data: { data: [] } })),
        ]);
        setApps(appRes.data?.data ?? []);
        setReviewsReceived(receivedRes.data?.data ?? []);
        setReviewsGiven(givenRes.data?.data ?? []);

        const jobIdFromUrl = searchParams.get('jobId');
        if (jobIdFromUrl) {
          const target = appRes.data?.data?.find(a => (a.job?._id || a.job)?.toString() === jobIdFromUrl);
          if (target) {
            const targetUserId =
              user?.role === 'worker'
                ? target.employer?._id ?? target.employer
                : target.worker?._id ?? target.worker;
            setActive({
              jobId: jobIdFromUrl,
              targetUserId,
              roleAtTime: user?.role
            });
            setModalOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?._id) fetchAll();
  }, [user?._id, searchParams]);

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

  const handleRatingSubmit = async ({ dimensions, overall, comment }) => {
    if (!active) return;
    try {
      await api.post('/ratings', {
        targetUserId: active.targetUserId,
        jobId: active.jobId,
        overall,
        dimensions: dimensions || [],
        comment,
        roleAtTime: active.roleAtTime,
      });

      setModalOpen(false);
      setActive(null);

      const [appRes, givenRes] = await Promise.all([
        api.get('/applications/history'),
        api.get('/ratings/job-given-ratings').catch(() => ({ data: { data: [] } })),
      ]);
      setApps(appRes.data?.data ?? []);
      setReviewsGiven(givenRes.data?.data ?? []);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white tracking-tight normal-case">
          {t.ratingsTitle || 'Ratings & Feedback'}
        </h1>
        <p className="text-white/60 mt-2 font-medium text-sm normal-case">
          {t.ratingsSubtitle || 'Rate completed jobs to build trust and verified badges.'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {['rate', 'received', 'given'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-[#2BB8B8] text-slate-950'
                : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/20'
            }`}
          >
            {tab === 'rate' ? (activeLang === 'am' ? 'ደረጃ ስጥ' : activeLang === 'or' ? 'Sadarkaa Kenni' : 'Rate') : ''}
            {tab === 'received' ? (activeLang === 'am' ? 'የተቀበሉት' : activeLang === 'or' ? 'Kan Argamte' : 'Reviews Received') : ''}
            {tab === 'given' ? (activeLang === 'am' ? 'የሰጡት' : activeLang === 'or' ? 'Kan Kennitan' : 'Reviews Given') : ''}
          </button>
        ))}
      </div>

      {activeTab === 'rate' && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />

          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-4" />
              <p className="text-white/50 font-medium normal-case">
                {activeLang === 'am' ? 'ታሪክ በመጫን ላይ...' : activeLang === 'or' ? 'Seenaa fe`aa jira...' : 'Loading history...'}
              </p>
            </div>
          ) : completed.length === 0 ? (
            <div className="py-20 text-center">
              <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-lg normal-case">
                {activeLang === 'am' ? 'እስካሁን ደረጃ የሚሰጠው የተጠናቀቀ ስራ የለም።' : activeLang === 'or' ? 'Hojiin xumurame kan sadarkaan kennamuuf jiru ammallee hin jiru.' : 'No completed jobs to rate yet.'}
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
                        <p className="text-white text-lg font-semibold capitalize">
                          {a.job?.title || (activeLang === 'am' ? 'ያልተሰየመ ስራ' : activeLang === 'or' ? 'Hojii Mata-duree Hin Qabne' : 'Untitled Job')}
                        </p>
                        {a.employer?.isVerified && (
                          <span className="text-[#2BB8B8] text-xs font-medium normal-case">
                            ✓ {activeLang === 'am' ? 'የተረጋገጠ' : activeLang === 'or' ? 'Mirkanaa\u2019e' : 'Verified'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 normal-case">
                        <p className="text-white/60 text-sm">
                          <MapPin className="w-3.5 h-3.5 inline-block mr-1" />{a.job?.location?.address || (activeLang === 'am' ? 'አዲስ አበባ' : 'Addis Ababa')}
                        </p>
                        <p className="text-[#2BB8B8] text-sm font-semibold">
                          <DollarSign className="w-3.5 h-3.5 inline-block mr-0.5" />{(a.job?.salary || 0).toLocaleString()} {activeLang === 'am' ? 'ብር' : 'ETB'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openRate(a)}
                      className="w-full md:w-auto px-8 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(43,184,184,0.2)] normal-case"
                    >
                      {t.rateButton || (activeLang === 'am' ? 'ደረጃ ስጥ' : activeLang === 'or' ? 'Sadarkaa Kenni' : 'Rate Experience')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'received' && (
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            {activeLang === 'am' ? 'የተቀበሉት አስተያየቶች' : activeLang === 'or' ? 'Kan Argamte' : 'Reviews Received'} ({reviewsReceived.length})
          </h2>
          {reviewsReceived.length === 0 ? (
            <p className="text-white/40 text-center py-8">{activeLang === 'am' ? 'እስካሁን ምንም አስተያየት አልተቀበሉም' : activeLang === 'or' ? 'Ammaallee kan argamte hin jirtu' : 'No reviews received yet'}</p>
          ) : (
            <div className="space-y-3">
              {reviewsReceived.map((r) => (
                <div key={r._id} className="bg-[#1A2E35]/40 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#2BB8B8]" />
                      <span className="text-white font-semibold text-sm">{r.from?.fullName || 'User'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                      {'★'.repeat(Math.round(r.overall || 0))}{'☆'.repeat(5 - Math.round(r.overall || 0))}
                    </div>
                  </div>
                  {r.comment && <p className="text-white/60 text-sm ml-6">{r.comment}</p>}
                  <p className="text-white/30 text-xs mt-2 ml-6 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'given' && (
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            {activeLang === 'am' ? 'የሰጡት አስተያየቶች' : activeLang === 'or' ? 'Kan Kennitan' : 'Reviews Given'} ({reviewsGiven.length})
          </h2>
          {reviewsGiven.length === 0 ? (
            <p className="text-white/40 text-center py-8">{activeLang === 'am' ? 'እስካሁን ምንም አስተያየት አልሰጡም' : activeLang === 'or' ? 'Ammaallee kan kennitan hin jirtu' : 'No reviews given yet'}</p>
          ) : (
            <div className="space-y-3">
              {reviewsGiven.map((r) => (
                <div key={r._id} className="bg-[#1A2E35]/40 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#2BB8B8]" />
                      <span className="text-white font-semibold text-sm">{r.job?.title || 'Job'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                      {'★'.repeat(Math.round(r.overall || 0))}{'☆'.repeat(5 - Math.round(r.overall || 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <User className="w-3 h-3 text-white/40" />
                    <span className="text-white/50 text-xs">To: {r.to?.fullName || 'User'}</span>
                  </div>
                  {r.comment && <p className="text-white/60 text-sm ml-6 mt-1">{r.comment}</p>}
                  <p className="text-white/30 text-xs mt-2 ml-6 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      <RatingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleRatingSubmit}
        role={active?.roleAtTime || 'employer'}
      />
    </div>
  );
};

export default Ratings;