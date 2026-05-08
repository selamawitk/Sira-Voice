import React, { useContext, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocationContext } from '../../context/LocationContextInstance.jsx';
import api from '../../services/api.js';
import { useVoice } from '../../hooks/useVoice.js';
import { jobService } from '../../services/jobService.js';
import { LanguageContext } from '../../context/LanguageContext.jsx';

const jobPin = new L.DivIcon({
  className: '',
  html: `
    <div style="
      width: 14px; height: 14px;
      border-radius: 999px;
      background: rgba(148,163,184,0.9);
      border: 2px solid rgba(255,255,255,0.7);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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
      } catch {
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
      try { await navigator.share(sharePayload); } catch {}
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(sharePayload.url);
        window.alert('Job link copied to clipboard.');
      } catch {
        window.alert('Copy failed. Manual URL: ' + sharePayload.url);
      }
      return;
    }
    window.prompt('Copy job link', sharePayload.url);
  };

  return (
    <div className="h-75 md:h-150 w-full rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative">
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-red-600 text-white text-center py-2 text-sm font-bold">
          Offline Mode - Viewing Cached Jobs
        </div>
      )}
      
      {isLoading && (
        <div className="absolute top-4 left-4 z-20 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <MapContainer center={center} zoom={13} className="h-full w-full z-0">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <RecenterMap coords={center} />
        <Marker position={center} icon={userDot} />
        {jobs.filter(j => {
          if (!j.location?.coordinates) return false;
          const pos = normalizeCoordinates(j.location.coordinates);
          return pos ? getDistance(center[0], center[1], pos[0], pos[1]) <= 5000 : false;
        }).map(job => {
          const pos = normalizeCoordinates(job.location.coordinates);
          return pos ? (
            <Marker key={job._id} position={pos} icon={jobPin}>
              <Popup>
                <div className="p-1 min-w-37.5">
                  <h4 className="font-bold text-slate-900">{job.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{job.location?.address || 'Addis Ababa'}</p>
                  <p className="text-xs font-bold text-[#2BB8B8] mt-1">{job.salary ?? 0} ETB</p>
                  <button
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-[#2BB8B8] text-white font-bold text-[10px] uppercase tracking-wider hover:brightness-110 transition disabled:opacity-50"
                    onClick={() => handleApply(job._id)}
                    disabled={applyJobId === job._id && (isListening || isProcessing)}
                  >
                    {applyJobId === job._id && (isListening || isProcessing) ? 'Processing...' : (lang?.copy?.mapApplyCta || 'Speak to Apply')}
                  </button>
                  <button
                    type="button"
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-white/20 transition"
                    onClick={() => handleShare(job)}
                  >
                    {navigator.share ? 'Share Job' : 'Copy Job Link'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null;
        })}
      </MapContainer>

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#0b1820]/80">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-12 w-12 rounded-full border-4 border-t-[#2BB8B8] border-white/20 animate-spin" />
            <span className="text-sm uppercase tracking-[0.2em] text-white/70">Loading jobs...</span>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 z-10 bg-[#1A2E35]/80 backdrop-blur-md border border-white/10 p-3 px-5 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#2BB8B8] rounded-full animate-pulse"></div>
          <span className="text-white font-black text-[10px] uppercase tracking-widest">
            {jobs.length} {lang?.copy?.availableJobs?.toLowerCase() ?? 'jobs found nearby'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Map;