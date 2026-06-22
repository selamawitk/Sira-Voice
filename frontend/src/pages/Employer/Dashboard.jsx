import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Loader2, UserPlus, Sparkles, Map, List } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { useNavigate } from 'react-router-dom';

// Fix for default Leaflet marker icon asset paths in React builds
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const ChangeMapView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const EmployerDashboard = () => {
  const auth = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const langCtx = useContext(LanguageContext);
  const t = langCtx?.copy || {};
  const activeLang = langCtx?.lang || 'en';
  
  const employerId = auth?.user?._id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [hiringWorkerId, setHiringWorkerId] = useState('');
  
  const [viewMode, setViewMode] = useState('list'); 

  const defaultCenter = [9.0192, 38.7468];

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

  // Sort intentionally by match score, distance, & rating
  const rankedByDistanceAndRating = useMemo(() => {
    return [...matches].sort((a, b) => {
      const scoreA = Number(a.score ?? 0);
      const scoreB = Number(b.score ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;

      const da = Number(a.distance ?? 9999);
      const db = Number(b.distance ?? 9999);
      if (da !== db) return da - db;

      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
  }, [matches]);

  const mapCenterCoordinates = useMemo(() => {
    const selectedJob = jobs.find(j => String(j._id) === String(selectedJobId));
    if (selectedJob?.location?.coordinates && selectedJob.location.coordinates.length === 2) {
      return [Number(selectedJob.location.coordinates[1]), Number(selectedJob.location.coordinates[0])];
    }
    if (selectedJob?.latitude && selectedJob?.longitude) {
      return [Number(selectedJob.latitude), Number(selectedJob.longitude)];
    }
    return defaultCenter;
  }, [jobs, selectedJobId]);

  const hire = async (workerId) => {
    if (!selectedJobId || hiringWorkerId) return;

    try {
      setHiringWorkerId(workerId);

      const res = await api.get(`/applications/job/${selectedJobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find(a => String(a.worker?._id ?? a.worker) === String(workerId));

      if (!app?._id) {
        toast?.show?.(
          activeLang === 'am' ? 'ሰራተኛው ገና ለዚህ ስራ አላመለከተም::' : 
          activeLang === 'or' ? 'Hojjetaan kun ammallee hojii kanaaf hin iyyanne.' : 
          'Worker has not applied to this job yet.', 
          'error'
        );
        setHiringWorkerId('');
        return;
      }

      const contractCheck = await api.get(`/contracts/employer/${employerId}`);
      const existing = (contractCheck.data?.data ?? []).find(
        (c) => String(c.workerId?._id ?? c.workerId) === String(workerId) && 
               String(c.jobId?._id ?? c.jobId) === String(selectedJobId) &&
               c.status !== 'cancelled'
      );

      if (existing) {
        toast?.show?.(
          activeLang === 'am' ? 'ለዚህ ቅጥር ውል አስቀድሞ አለ::' : 
          activeLang === 'or' ? 'Waliigalteen qaxara kanaaf duraan ni jira.' : 
          'A contract already exists for this hiring.', 
          'info'
        );
        navigate('/contracts');
        return;
      }

      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });

      await api.post('/contracts', {
        employerId,
        workerId,
        jobId: selectedJobId,
        agreedAmount: app?.expectedSalary || 500,
        paymentType: 'daily',
      });

      toast?.show?.(
        activeLang === 'am' ? 'ሰራተኛው ተቀጥሯል! ወደ ውሎች እየተዛወረ ነው...' : 
        activeLang === 'or' ? 'Hojjetaan qaxarameera! Gara waliigalteetti darbaa jira...' : 
        'Worker hired! Redirecting to contracts...', 
        'success'
      );

      setTimeout(() => {
        navigate('/contracts');
      }, 1000);

    } catch (err) {
      console.error("Hire workflow error:", err);
      toast?.show?.(
        err.response?.data?.message || 
        (activeLang === 'am' ? 'የቅጥር ሂደቱ አልተሳካም::' : activeLang === 'or' ? 'Adeemsi qaxaraa hin milkoofne.' : 'Hiring process failed.'), 
        'error'
      );
      setHiringWorkerId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-0 pb-8">
      
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold text-white capitalize">
              {t.employerDashboard || "Employer Dashboard"}
            </h1>
            {auth?.user?.isVerified && (
              <div className="flex items-center gap-2 rounded-full bg-[#2BB8B8]/10 px-3 py-1 border border-[#2BB8B8]/20">
                <ShieldCheck className="w-4 h-4 text-[#2BB8B8]" />
                <span className="text-xs font-medium text-[#2BB8B8] normal-case">
                  {activeLang === 'am' ? 'የተረጋገጠ' : activeLang === 'or' ? 'Mirkanaa’e' : 'Verified'}
                </span>
              </div>
            )}
          </div>
          <p className="text-white/40 mt-2 font-medium normal-case">
            {t.employerSub || "Smart matching. Secure contracts. Seamless payments."}
          </p>
        </div>

        <button
          onClick={() => navigate('/post-job')}
          className="px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 transition-all shadow-lg shadow-[#2BB8B8]/10 normal-case"
        >
          {t.postNewJob || "Post New Job"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <GlassCard className="h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white/60 font-semibold text-sm capitalize tracking-wide">
              {t.yourOpenings || "Your Openings"}
            </h2>
            {loading && <Loader2 className="w-4 h-4 text-[#2BB8B8] animate-spin" />}
          </div>

          <div className="space-y-3">
            {jobs.length === 0 && !loading && (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-white/20 text-xs font-semibold capitalize">
                  {activeLang === 'am' ? 'ምንም ንቁ ስራ የለም' : activeLang === 'or' ? 'Hojiin socho’u hin jiru' : 'No active jobs'}
                </p>
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
                <p className={`font-semibold capitalize transition-colors ${selectedJobId === job._id ? 'text-white' : 'text-white/70'}`}>
                  {job.title}
                </p>
                <p className="text-[#2BB8B8] font-bold text-sm mt-1">
                  {job.salary} {activeLang === 'am' ? 'ብር' : activeLang === 'or' ? 'ETB' : 'ETB'}
                </p>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-white font-semibold text-2xl capitalize">
                {t.aiMatchmaking || "AI Matchmaking"}
              </h2>
              <p className="text-white/40 text-xs font-medium tracking-wide mt-1 normal-case">
                {activeLang === 'am' ? 'በቅርበት እና በክህሎት ተዛማጅነት የተደረደሩ እጩዎች' :
                 activeLang === 'or' ? 'Iyyattoota dhiheenya fi dandeettiin adda baafaman' :
                 'Intelligent profiles organized by geographical metric proximity and tag compliance'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {matchesLoading && <Loader2 className="w-5 h-5 text-[#2BB8B8] animate-spin" />}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#2BB8B8] text-slate-950 font-bold' : 'text-white/60 hover:text-white'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-[#2BB8B8] text-slate-950 font-bold' : 'text-white/60 hover:text-white'}`}
                  title="Map View"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-4">
              {rankedByDistanceAndRating.length === 0 && !matchesLoading && (
                <div className="text-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/5">
                  <p className="text-white/20 font-semibold capitalize">
                    {t.noAppsFoundJob || "No applications found for this job"}
                  </p>
                </div>
              )}

              {rankedByDistanceAndRating.map((w, index) => {
                const isAiMatch = index === 0 && Number(w.score ?? 0) >= 70;

                return (
                  <div
                    key={w._id}
                    className={`flex justify-between items-center p-5 border rounded-2xl transition-all group relative ${
                      isAiMatch 
                        ? 'bg-[#2BB8B8]/5 border-[#2BB8B8]/30 hover:bg-[#2BB8B8]/10' 
                        : 'bg-white/2 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    {isAiMatch && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 z-10 flex items-center gap-1 px-3 py-0.5 bg-gradient-to-r from-[#2BB8B8] to-emerald-500 rounded-full shadow-md border border-white/10">
                        <Sparkles className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                        <span className="text-slate-950 font-black text-[9px] tracking-wider uppercase">
                          {activeLang === 'am' ? 'በሲራ የተመከረ' : activeLang === 'or' ? 'AIn Kan Mirkanae' : 'AI Recommended Match'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                        isAiMatch 
                          ? 'bg-gradient-to-br from-[#2BB8B8] to-emerald-500 border-white/20' 
                          : 'bg-gradient-to-br from-[#2BB8B8]/20 to-transparent border-white/10'
                      }`}>
                        <span className={`font-semibold text-lg ${isAiMatch ? 'text-slate-950' : 'text-white'}`}>
                          {w.fullName?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-lg capitalize tracking-tight group-hover:text-[#2BB8B8] transition-colors">
                            {w.fullName}
                          </p>
                          {w.isVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold uppercase tracking-normal">
                              ✓ {activeLang === 'am' ? 'የተረጋገጠ' : activeLang === 'or' ? 'Mirkanaa’e' : 'Verified'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-yellow-500 font-bold text-xs flex items-center gap-1">
                            ⭐ {w.rating ? Number(w.rating).toFixed(1) : '4.8'}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <span className={`text-xs font-semibold normal-case ${isAiMatch ? 'text-[#2BB8B8]' : 'text-white/40'}`}>
                            {w.distance} {activeLang === 'am' ? 'ኪ.ሜ ርቀት ላይ' : activeLang === 'or' ? 'KM FAGAA' : 'KM away'}
                          </span>
                          {w.score && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-white/10" />
                              <span className="text-emerald-400 font-bold text-xs">
                                {w.score}% Match
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => hire(w._id)}
                      disabled={!!hiringWorkerId}
                      className="relative flex items-center gap-2 px-8 py-3 bg-[#2BB8B8] text-slate-950 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 normal-case"
                    >
                      {hiringWorkerId === w._id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          {t.rateButton || (activeLang === 'am' ? 'ቅጠር' : activeLang === 'or' ? 'Qaxari' : 'Hire')} 
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 🗺️ Leaflet Geospatial Candidate Visualizer Container */
            <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0">
              <MapContainer 
                center={mapCenterCoordinates} 
                zoom={13} 
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <ChangeMapView center={mapCenterCoordinates} />

                {jobs.find(j => String(j._id) === String(selectedJobId)) && (
                  <Marker position={mapCenterCoordinates}>
                    <Popup>
                      <div className="p-1 text-slate-900 font-sans">
                        <p className="font-bold text-xs">Your Posted Opening Location</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {rankedByDistanceAndRating.map((w) => {
                  const lat = w.location?.coordinates?.[1] || w.latitude;
                  const lng = w.location?.coordinates?.[0] || w.longitude;
                  
                  if (!lat || !lng) return null;

                  return (
                    <Marker 
                      key={w._id} 
                      position={[Number(lat), Number(lng)]}
                    >
                      <Popup>
                        <div className="p-1 min-w-[180px] text-slate-900 font-sans">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-sm capitalize">{w.fullName}</span>
                            {w.isVerified && (
                              <span className="text-[9px] font-bold text-emerald-600 border border-emerald-600/40 px-1 rounded uppercase bg-emerald-50">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                            <div>⭐ {w.rating ? Number(w.rating).toFixed(1) : '4.8'} • {w.distance} KM away</div>
                            {w.score && (
                              <div className="text-emerald-600 font-bold text-xs mt-1">
                                {w.score}% Match Score
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => hire(w._id)}
                            disabled={!!hiringWorkerId}
                            className="w-full mt-2 py-1.5 bg-[#2BB8B8] text-slate-950 text-xs font-bold rounded-lg hover:bg-[#229494] transition-colors flex items-center justify-center gap-1"
                          >
                            {hiringWorkerId === w._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                {activeLang === 'am' ? 'ቅጠር' : activeLang === 'or' ? 'Qaxari' : 'Hire Worker'}
                              </>
                            )}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default EmployerDashboard;