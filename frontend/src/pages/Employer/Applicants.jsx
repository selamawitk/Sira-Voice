import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Loader2, UserCheck, Mic, Sparkles, Map, List, MessageSquare } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon asset paths in React production builds
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

const Applicants = () => {
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);
  const lang = useContext(LanguageContext);
  const navigate = useNavigate();

  const t = lang?.copy || {};
  const activeLang = lang?.lang || 'en';

  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [hiringId, setHiringId] = useState('');
  const [jobLocation, setJobLocation] = useState(null);
  
  const [viewMode, setViewMode] = useState('list'); 

  const defaultCenter = [9.0192, 38.7468];

  const urlJobId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('jobId') || '';
  }, []);

  useEffect(() => {
    setJobId(urlJobId);
  }, [urlJobId]);

  useEffect(() => {
    const fetchJobAndMatches = async () => {
      if (!jobId) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [matchRes, appRes] = await Promise.all([
          api.get(`/jobs/${jobId}/matches`),
          api.get(`/applications/job/${jobId}`),
        ]);
        const matchedWorkers = matchRes.data?.matches ?? [];
        const applications = appRes.data?.data ?? [];

        const applicantIds = new Set(applications.map((a) => a.worker?._id || a.worker));
        const applied = matchedWorkers.filter((w) => applicantIds.has(w._id));

        setCandidates(applied.length > 0 ? applied : matchedWorkers);

        const jobRes = await api.get(`/jobs/${jobId}`);
        const jobData = jobRes.data?.data;
        if (jobData?.location?.coordinates && jobData.location.coordinates.length === 2) {
          setJobLocation([Number(jobData.location.coordinates[1]), Number(jobData.location.coordinates[0])]);
        } else if (jobData?.latitude && jobData?.longitude) {
          setJobLocation([Number(jobData.latitude), Number(jobData.longitude)]);
        }
      } catch (err) {
        console.error(err);
        toast?.show?.(
          activeLang === 'am' ? 'አመልካቾችን ማምጣት አልተሳካም።' : 
          activeLang === 'or' ? 'Iyyattoota fiduun hin danda’amne.' : 
          'Failed to fetch applicants.', 
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndMatches();
  }, [jobId, toast, activeLang]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const scoreA = Number(a.score ?? 0);
      const scoreB = Number(b.score ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;

      const distA = Number(a.distance ?? 9999);
      const distB = Number(b.distance ?? 9999);
      if (distA !== distB) return distA - distB;

      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
  }, [candidates]);

  const mapCenterCoordinates = useMemo(() => {
    if (jobLocation) return jobLocation;
    return defaultCenter;
  }, [jobLocation]);

  const hire = async (workerId) => {
    if (!jobId || hiringId) return;

    setHiringId(workerId);

    try {
      const contractCheck = await api.get(`/contracts/employer/${auth?.user?._id}`);
      const existing = (contractCheck.data?.data ?? []).find(
        (c) => String(c.workerId?._id ?? c.workerId) === String(workerId) && 
               String(c.jobId?._id ?? c.jobId) === String(jobId) &&
               c.status !== 'cancelled'
      );

      if (existing) {
        toast?.show?.(
          activeLang === 'am' ? 'ለዚህ ሰራተኛ አስቀድሞ ውል አለ።' : 
          activeLang === 'or' ? 'Hojjetaa kanaaf waliigalteen duraan ni jira.' : 
          'A contract for this worker already exists.', 
          'info'
        );
        navigate('/contracts');
        return;
      }

      const res = await api.get(`/applications/job/${jobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find((a) => String(a.worker?._id ?? a.worker) === String(workerId));

      if (!app?._id) {
        toast?.show?.(
          activeLang === 'am' ? 'ለዚህ ሰራተኛ ምንም ንቁ ማመልከቻ አልተገኘም።' : 
          activeLang === 'or' ? 'Hojjetaa kanaaf iyyannoon hojjataa jiru hin argamne.' : 
          'No active application found for this worker.', 
          'error'
        );
        return;
      }

      const jobRes = await api.get(`/jobs/${jobId}`);
      const job = jobRes.data?.data;

      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });

      await api.post('/contracts', {
        employerId: auth?.user?._id,
        workerId,
        jobId,
        agreedAmount: app?.expectedSalary || job?.salary || 500,
        paymentType: 'daily',
        status: 'active',
      });

      toast?.show?.(
        activeLang === 'am' ? 'ሰራተኛው በስኬት ተቀጥሯል!' : 
        activeLang === 'or' ? 'Hojjetaan milkiidhaan qaxarameera!' : 
        'Worker hired successfully!', 
        'success'
      );
      
      setTimeout(() => {
        navigate('/contracts');
      }, 1000);

    } catch (err) {
      console.error(err);
      toast?.show?.(
        activeLang === 'am' ? 'ቅጥሩ አልተሳካም። እባክዎ እንደገና ይሞክሩ።' : 
        activeLang === 'or' ? 'Qaxarriin hin milkoofne. Maaloo irra deebi’ii yaali.' : 
        'Hiring failed. Please try again.', 
        'error'
      );
      setHiringId('');
    }
  };

  const [messageLoading, setMessageLoading] = useState(null);
  const handleMessage = async (workerId, e) => {
    if (e) e.stopPropagation();
    setMessageLoading(workerId);
    try {
      const res = await api.post('/chat/conversations', {
        jobId,
        workerId,
        employerId: auth?.user?._id,
      });
      if (res.data?.success) navigate('/chat', { state: { autoSelectConversation: res.data.data } });
    } catch {
      toast?.show?.('Could not open chat', 'error');
    } finally {
      setMessageLoading(null);
    }
  };

  const handleVoiceHire = () => {
    if (!jobId) {
      toast?.show?.(
        activeLang === 'am' ? 'እባክዎ መጀመሪያ ስራ ይምረጡ።' : 
        activeLang === 'or' ? 'Maaloo jalqaba hojii filadhu.' : 
        'Please select a job first.', 
        'error'
      );
      return;
    }
    window.location.href = '/sira';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-0 pb-8">
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl text-white tracking-tight font-semibold">
            {t.applicants || 'Applicants'}
          </h1>
          <p className="text-white/40 mt-2 font-medium text-sm normal-case">
            {activeLang === 'am' ? 'ለተመረጠው ፕሮጀክት በቅርበት እና በክህሎት የተደረደሩ ምርጥ እጩዎች' : 
             activeLang === 'or' ? 'Iyyattoota dhiheenya fi dandeettiin adda baafaman' : 
             'Top matches automatically organized by geographic distance and skill compliance'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {jobId && (
            <>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#2BB8B8] text-slate-950 font-bold' : 'text-white/60 hover:text-white'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'map' ? 'bg-[#2BB8B8] text-slate-950 font-bold' : 'text-white/60 hover:text-white'}`}
                  title="Map View"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>

              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all bg-white/10 text-white hover:bg-white/20 border border-white/10 normal-case"
                onClick={handleVoiceHire}
              >
                <Mic className="w-4 h-4" />
                {activeLang === 'am' ? 'የድምፅ ትዕዛዝ' : activeLang === 'or' ? 'Ajaja Sagalee' : 'Voice Command'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {!jobId ? (
          <div className="py-20 text-center">
            <p className="text-white/20 font-medium normal-case">
              {t.noJobSelected || (activeLang === 'am' ? 'ምንም ስራ አልተመረጠም' : activeLang === 'or' ? 'Hojiin filatame hin jiru' : 'No job selected')}
            </p>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
            <p className="text-white/30 text-xs font-medium normal-case">
              {activeLang === 'am' ? 'የመረጃ ቋቱን በመፈተሽ ላይ...' : activeLang === 'or' ? 'Kuusaa daataa sakatta’aa jira...' : 'Scanning database...'}
            </p>
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-white/20 font-medium normal-case">
              {t.noMatchesYet || (activeLang === 'am' ? 'እስካሁን ምንም እጩዎች አላመለከቱም።' : activeLang === 'or' ? 'Ammallee iyyattoonni iyyatan hin jiran.' : 'No candidates have applied yet.')}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-white/5">
            {sortedCandidates.map((c, index) => {
              const scoreNum = Number(c.score ?? 0);
              const isAiMatch = index === 0 && scoreNum >= 70;

              return (
                <div
                  key={c._id}
                  className={`p-6 hover:bg-white/2 transition-all group relative ${
                    isAiMatch ? 'bg-[#2BB8B8]/5 hover:bg-[#2BB8B8]/10' : ''
                  }`}
                >
                  {isAiMatch && (
                    <div className="absolute top-0 right-6 -translate-y-1/2 z-10 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-[#2BB8B8] to-emerald-500 rounded-full shadow-lg border border-white/10">
                      <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
                      <span className="text-slate-950 font-black text-[9px] tracking-wider uppercase">
                        {activeLang === 'am' ? 'በሲራ የተመከረ' : activeLang === 'or' ? 'AIn Kan Mirkanae' : 'AI Recommended Match'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                        isAiMatch 
                          ? 'bg-gradient-to-br from-[#2BB8B8] to-emerald-500 border-white/20' 
                          : 'bg-gradient-to-br from-[#2BB8B8]/20 to-transparent border-white/10'
                      }`}>
                        <span className={`text-lg font-semibold ${isAiMatch ? 'text-slate-950' : 'text-white'}`}>
                          {c.fullName?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-lg font-semibold capitalize">{c.fullName}</p>
                          {c.isVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-semibold uppercase tracking-normal">
                              ✓ {activeLang === 'am' ? 'የተረጋገጠ' : activeLang === 'or' ? 'Mirkanaa’e' : 'Verified'}
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs mt-0.5 normal-case">
                          <span className="text-yellow-500 font-bold">⭐ {c.rating ? Number(c.rating).toFixed(1) : '4.8'}</span> •{' '}
                          <span className={isAiMatch ? 'text-[#2BB8B8] font-semibold' : ''}>
                            {c.distance ?? 0} {activeLang === 'am' ? 'ኪ.ሜ ርቀት' : activeLang === 'or' ? 'KM fagaa' : 'KM away'}
                          </span>{' '}
                          • {activeLang === 'am' ? 'ተዛማጅነት' : activeLang === 'or' ? 'Madaalawaa' : 'Match'}:{' '}
                          <span className="text-emerald-400 font-bold">{scoreNum}%</span>
                        </p>
                      </div>
                    </div>

                    <button
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-medium hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale normal-case"
                      disabled={!!hiringId}
                      onClick={() => hire(c._id)}
                    >
                      {hiringId === c._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {hiringId === c._id 
                        ? (activeLang === 'am' ? 'እየቀጠረ ነው...' : activeLang === 'or' ? 'Qaxaraa jira...' : 'Hiring...') 
                        : (t.rateButton || (activeLang === 'am' ? 'ቅጠር' : activeLang === 'or' ? 'Qaxari' : 'Hire'))
                      }
                    </button>
                    <button
                      onClick={(e) => handleMessage(c._id, e)}
                      disabled={!!messageLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 normal-case"
                    >
                      {messageLoading === c._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                      Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-[550px] relative z-0">
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

              {jobLocation && (
                <Marker position={jobLocation}>
                  <Popup>
                    <div className="p-1 text-slate-900 font-sans">
                      <p className="font-bold text-xs">Your Posted Job Location Anchor</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {sortedCandidates.map((c) => {
                const lat = c.location?.coordinates?.[1] || c.latitude;
                const lng = c.location?.coordinates?.[0] || c.longitude;

                if (!lat || !lng) return null;

                return (
                  <Marker key={c._id} position={[Number(lat), Number(lng)]}>
                    <Popup>
                      <div className="p-1 min-w-[190px] text-slate-900 font-sans">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-sm capitalize">{c.fullName}</span>
                          {c.isVerified && (
                            <span className="text-[9px] font-bold text-emerald-600 border border-emerald-600/40 px-1 rounded uppercase bg-emerald-50">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                          <div>⭐ {c.rating ? Number(c.rating).toFixed(1) : '4.8'} • {c.distance ?? 0} KM away</div>
                          <div className="text-emerald-600 font-bold text-xs mt-1">
                            {c.score ?? 0}% Match Score
                          </div>
                        </div>
                        <button
                          onClick={() => hire(c._id)}
                          disabled={!!hiringId}
                          className="w-full mt-3 py-2 bg-[#2BB8B8] text-slate-950 text-xs font-bold rounded-xl hover:bg-[#229494] transition-colors flex items-center justify-center gap-1"
                        >
                          {hiringId === c._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              {activeLang === 'am' ? 'ቅጠር' : activeLang === 'or' ? 'Qaxari' : 'Hire'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleMessage(c._id)}
                          disabled={!!messageLoading}
                          className="w-full mt-2 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                        >
                          {messageLoading === c._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <MessageSquare className="w-3 h-3" />
                          )}
                          Message
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Applicants;