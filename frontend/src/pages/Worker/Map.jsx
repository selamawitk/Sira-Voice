import React, { useContext, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocationContext } from '../../context/LocationContextInstance.jsx';
import api from '../../services/api.js';
import { useVoice } from '../../hooks/useVoice.js';
import { jobService } from '../../services/jobService.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { MapPin, Navigation, Share2, Mic, Info } from 'lucide-react';

const jobPin = new L.DivIcon({
  className: '',
  html: `
    <div style="
      width: 16px; height: 16px;
      border-radius: 999px;
      background: #8B5CF6;
      border: 2px solid rgba(255,255,255,0.9);
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
      transition: transform 0.2s;
    " class="hover:scale-125"></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

const userDot = new L.DivIcon({
  className: '',
  html: `
    <div style="position: relative; width: 18px; height: 18px;">
      <div style="
        position:absolute; inset:-10px;
        border-radius:999px;
        background: rgba(43,184,184,0.18);
        animation: pulse 1.4s infinite;
      "></div>
      <div style="
        position:absolute; inset:0;
        border-radius:999px;
        background: #2BB8B8;
        border: 2px solid rgba(255,255,255,0.85);
        box-shadow: 0 0 30px rgba(43,184,184,0.35);
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(0.8); opacity: 0.35; }
        70% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .dark-map-popup .leaflet-popup-content-wrapper {
        background: #0B1519 !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 1.5rem !important;
        padding: 4px !important;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5) !important;
      }
      .dark-map-popup .leaflet-popup-tip {
        background: #0B1519 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .dark-map-popup .leaflet-popup-close-button {
        color: rgba(255,255,255,0.4) !important;
        padding: 8px 8px 0 0 !important;
      }
    </style>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const normalizeCoordinates = (coords = []) => {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  return [coords[1], coords[0]];
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, map.getZoom());
    }
  }, [coords, map]);
  return null;
}

const Map = () => {
  const location = useContext(LocationContext);
  const lang = useContext(LanguageContext);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isListening, isProcessing, startListening } = useVoice();
  const [applyJobId, setApplyJobId] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const center = useMemo(() => {
    return [location?.coords?.lat ?? 9.03, location?.coords?.lng ?? 38.74];
  }, [location?.coords?.lat, location?.coords?.lng]);

  useEffect(() => {
    let isMounted = true;
    const fetchNearbyJobs = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/jobs/nearby', {
          params: { lat: center[0], lng: center[1] },
        });
        if (isMounted) {
          const data = res.data?.data || [];
          setJobs(data);
          localStorage.setItem('sira_jobs_cache', JSON.stringify(data));
        }
      } catch {
        if (isMounted) {
          const cached = localStorage.getItem('sira_jobs_cache');
          if (cached) setJobs(JSON.parse(cached));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchNearbyJobs();

    const handleOnline = () => {
      setIsOnline(true);
      fetchNearbyJobs();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [center]);

  const handleApply = (jobId) => {
    setApplyJobId(jobId);
    startListening(async () => {
      try {
        await jobService.applyToJob(jobId);
      } catch (err) {
        console.error('Job apply failed:', err);
      } finally {
        setApplyJobId('');
      }
    });
  };

  const handleShare = async (job) => {
    const sharePayload = {
      title: job.title,
      text: `${job.title} • ${job.location?.address || 'Addis Ababa'} • ${job.salary ?? 0} ETB`,
      url: `${window.location.origin}/job/${job._id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
      } catch (err) {
        console.error('Share failed:', err);
      }
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(sharePayload.url);
        window.alert('Job link copied to clipboard.');
      } catch (err) {
        console.error('Copy failed:', err);
        window.alert('Copy failed. Manual URL: ' + sharePayload.url);
      }
      return;
    }
    window.prompt('Copy job link', sharePayload.url);
  };

  return (
    <div className="h-75 md:h-150 w-full rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative bg-[#060D0F]">
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-red-600 text-white text-center py-2 text-xs font-black uppercase tracking-wider shadow-md">
          Offline Mode - Viewing Cached Jobs
        </div>
      )}
      
      {isLoading && (
        <div className="absolute top-4 left-4 z-20 space-y-3 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#0B1519]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl w-64 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                  <div className="h-2 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <MapContainer center={center} zoom={13} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <RecenterMap coords={center} />
        
        <Marker position={center} icon={userDot} />
        
        {jobs.filter(j => {
          if (!j.location?.coordinates) return false;
          const pos = normalizeCoordinates(j.location.coordinates);
          // Standard tracking limit bound configuration
          return pos ? getDistance(center[0], center[1], pos[0], pos[1]) <= 15000 : false;
        }).map(job => {
          const pos = normalizeCoordinates(job.location.coordinates);
          if (!pos) return null;

          const distanceInMeters = getDistance(center[0], center[1], pos[0], pos[1]);
          const distanceInKm = (distanceInMeters / 1000).toFixed(1);

          return (
            <Marker key={job._id} position={pos} icon={jobPin}>
              <Popup className="dark-map-popup" maxWidth={260}>
                <div className="p-2 space-y-3">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest bg-[#2BB8B8]/10 w-max px-2.5 py-1 rounded-md mb-2">
                      <Navigation className="w-2.5 h-2.5 fill-current" />
                      <span>{distanceInKm} km away</span>
                    </div>
                    <h4 className="font-black text-white text-sm tracking-tight leading-snug">{job.title}</h4>
                    <p className="text-[11px] text-white/40 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-[#2BB8B8] shrink-0" />
                      <span className="truncate">{job.location?.address || 'Addis Ababa'}</span>
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 p-2 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-white/40 font-bold">Est. Compensation</span>
                    <span className="font-black text-emerald-400">{job.salary ?? 0} ETB</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    <button
                      className="col-span-4 px-3 py-2.5 rounded-xl bg-[#2BB8B8] hover:bg-[#229494] text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/10"
                      onClick={() => handleApply(job._id)}
                      disabled={applyJobId === job._id && (isListening || isProcessing)}
                    >
                      <Mic className="w-3 h-3" />
                      <span className="truncate">
                        {applyJobId === job._id && (isListening || isProcessing) ? 'Processing...' : (lang?.copy?.mapApplyCta || 'Speak to Apply')}
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      className="col-span-1 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                      onClick={() => handleShare(job)}
                      title={navigator.share ? 'Share Job' : 'Copy Job Link'}
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#060D0F]/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#2BB8B8] animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Triangulating Proximity Coordinates...</span>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 z-10 bg-[#0B1519]/90 backdrop-blur-md border border-white/5 p-2.5 px-4 rounded-xl shadow-xl flex items-center gap-3">
        <div className="w-2 h-2 bg-[#2BB8B8] rounded-full animate-pulse"></div>
        <span className="text-white/80 font-black text-[10px] uppercase tracking-widest">
          {jobs.length} {lang?.copy?.availableJobs?.toLowerCase() ?? 'gigs mapped dynamic'}
        </span>
      </div>
    </div>
  );
};

export default Map;