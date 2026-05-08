import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Mic, TrendingUp, Star, CheckCircle2, Map as MapIcon, Mic2 } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';
import api from '../../services/api.js';
import { jobService } from '../../services/jobService.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LocationContext } from '../../context/LocationContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastProvider.jsx';
import VoiceActionComponent from '../../components/voice/VoiceActionComponent.jsx';

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const toast = useContext(ToastContext);
  const location = useContext(LocationContext);

  const { isListening, startListening, stopListening, isProcessing } = useVoice();

  const [appsLoading, setAppsLoading] = useState(true);
  const [applications, setApplications] = useState([]);

  const [jobsLoading, setJobsLoading] = useState(true);
  const [nearbyJobs, setNearbyJobs] = useState([]);

  const [voiceJobs, setVoiceJobs] = useState([]);
  const [voiceApplyJob, setVoiceApplyJob] = useState(null); // Job being applied to with voice

  useEffect(() => {
    const run = async () => {
      setAppsLoading(true);
      try {
        const res = await api.get('/applications/history');
        setApplications(res.data?.data ?? []);
      } finally {
        setAppsLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setJobsLoading(true);
      try {
        const res = await api.get('/jobs', {
          params: {
            lat: location?.coords?.lat,
            lng: location?.coords?.lng,
            distance: 5,
          },
        });
        setNearbyJobs(res.data?.data ?? []);
      } catch {
        setNearbyJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };
    run();
  }, [location?.coords?.lat, location?.coords?.lng]);

  const stats = useMemo(() => {
    const completed = applications.filter((a) => a.status === 'completed' || a.job?.status === 'completed');
    const active = applications.filter((a) => ['pending', 'accepted'].includes(a.status));
    const rating =
      user?.workerProfile?.averageRating ??
      user?.workerProfile?.rating ??
      0;

    return {
      weeklyEarningsETB: 0, // not available in backend yet (no fake numbers)
      rating: Number(rating || 0),
      activeApplications: active.length,
      completedJobs: completed.length,
    };
  }, [applications, user]);

  const recommendedJobs = useMemo(() => {
    const fromVoice = Array.isArray(voiceJobs) && voiceJobs.length > 0 ? voiceJobs : [];
    const fromNearby = Array.isArray(nearbyJobs) && nearbyJobs.length > 0 ? nearbyJobs : [];
    const merged = [...fromVoice, ...fromNearby];
    const seen = new Set();
    return merged.filter((j) => {
      const id = j?._id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 4);
  }, [voiceJobs, nearbyJobs]);

  const startVoiceSearch = async () => {
    await startListening((res) => {
      if (res?.actionTaken === 'JOB_SEARCH') {
        setVoiceJobs(Array.isArray(res?.data) ? res.data : []);
        toast?.show?.('Voice search updated your matches.', 'success');
      } else {
        toast?.show?.('Voice captured. Try again with “find jobs near me”.', 'success');
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      
      {/* 🎙️ VOICE INTERACTION HERO */}
      <div className="relative group overflow-hidden bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#2BB8B8]/10 to-transparent"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center md:text-left space-y-4">
            <span className="bg-[#2BB8B8]/15 text-[#2BB8B8] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              AI Matching Active
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              እንኳን ደህና መጡ! <br /> <span className="text-gray-400">Hello, {user?.fullName ?? 'Worker'}.</span>
            </h1>
            <p className="text-gray-500 font-medium max-w-md">
              Your voice agent is hunting for <span className="text-white">{user?.workerProfile?.skills?.[0] ?? 'jobs'}</span>{' '}
              near <span className="text-white">{user?.location?.address ?? 'you'}</span>.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button 
              onMouseDown={() => startVoiceSearch()}
              onMouseUp={() => stopListening()}
              className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl
                ${isListening 
                  ? 'bg-red-500 scale-110 shadow-red-500/40' 
                  : 'bg-[#2BB8B8] hover:scale-105 shadow-[#2BB8B8]/25'}
              `}
            >
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
              )}
              <Mic className={`w-10 h-10 text-white ${isListening ? 'animate-pulse' : ''}`} />
            </button>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                {isListening ? "Recording..." : isProcessing ? "Analyzing Voice..." : "Hold to speak"}
              </p>
              <p className="text-[11px] text-[#2BB8B8] font-bold mt-1 opacity-60 italic">"Find jobs near me"</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Weekly Earnings', val: `${stats.weeklyEarningsETB} ETB`, sub: 'Calculated soon', icon: TrendingUp },
          { label: 'Worker Rating', val: `${stats.rating.toFixed(1)} / 5.0`, sub: `${stats.completedJobs} completed jobs`, icon: Star },
          { label: 'Active Applications', val: String(stats.activeApplications).padStart(2, '0'), sub: appsLoading ? 'Loading…' : 'Live from history', icon: CheckCircle2 },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/[0.04] transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
              <stat.icon className="w-4 h-4 text-[#2BB8B8] opacity-40" />
            </div>
            <h3 className="text-2xl font-black text-white">{stat.val}</h3>
            <p className="text-[10px] text-[#2BB8B8] font-bold mt-1 tracking-tight">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT MATCHES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Best Matches For You</h3>
            <a href="/available-jobs" className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest hover:underline">
              View All
            </a>
          </div>
          
          <div className="space-y-4">
            {jobsLoading && recommendedJobs.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 p-5 rounded-3xl">
                <p className="text-white/60 font-bold">Loading matches…</p>
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 p-5 rounded-3xl">
                <p className="text-white/70 font-bold">No matches yet.</p>
                <p className="text-white/45 text-sm mt-1">Try voice search or open the map to explore jobs.</p>
              </div>
            ) : (
              recommendedJobs.map((job) => (
                <div key={job._id} className="group bg-white/[0.03] border border-white/10 p-5 rounded-3xl flex items-center justify-between hover:border-[#2BB8B8]/30 transition-all">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-[#1A2E35] flex items-center justify-center text-[#2BB8B8] font-black text-xl shrink-0">
                      {(job.title?.[0] ?? 'J').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-bold group-hover:text-[#2BB8B8] transition-colors truncate">{job.title}</h4>
                      <div className="flex gap-4 mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                        <span>💰 {job.salary ?? 0} ETB</span>
                        <span className="truncate">📍 {job.location?.address ?? 'Addis Ababa'}</span>
                      </div>                    {/* Verified Badge and Rating Stars */}
                    {job.employer?.employerProfile?.isVerified && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full">
                          <span className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        </div>
                        {job.employer?.employerProfile?.employerRating && (
                          <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-yellow-400 text-[10px] font-black">
                              {Number(job.employer.employerProfile.employerRating).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-gray-600 font-black">
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'now'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await jobService.applyToJob(job._id);
                            toast?.show?.('Applied successfully.', 'success');
                          } catch {
                            toast?.show?.('Apply failed. Try again.', 'error');
                          }
                        }}
                        className="bg-[#2BB8B8]/10 text-[#2BB8B8] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase group-hover:bg-[#2BB8B8] group-hover:text-slate-950 transition-all"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => setVoiceApplyJob(job)}
                        className="bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-purple-500 hover:text-white transition-all flex items-center gap-1"
                      >
                        <Mic2 className="w-3 h-3" />
                        Voice
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SIDEBAR TOOLS */}
        <div className="space-y-6">
          <div className="bg-linear-to-br from-[#2BB8B8] to-cyan-500 p-8 rounded-[3rem] shadow-2xl shadow-[#2BB8B8]/15 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-white font-black text-lg">Generate Voice-CV</h4>
              <p className="text-white/70 text-xs mt-2 leading-relaxed">Let Sira-AI build your professional profile from a 30-second recording.</p>
              <a href="/voice-to-cv" className="block text-center mt-6 w-full bg-white text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg">
                Start Now
              </a>
            </div>
            <Mic className="absolute -bottom-4 -right-4 w-32 h-32 text-black/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-black text-sm">Nearby Jobs</h4>
              <MapIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="aspect-square rounded-3xl bg-[#1A2E35] border border-white/10 relative overflow-hidden opacity-80 hover:opacity-100 transition-all duration-700">
              <div className="absolute inset-0 bg-linear-to-tr from-black/30 via-transparent to-[#2BB8B8]/10" />
              <div className="absolute inset-0 bg-linear-to-t from-[#0F1D22] to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <a href="/job-map" className="block text-center w-full bg-white/10 backdrop-blur-md border border-white/10 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">
                  Open Job Map
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Apply Modal */}
      {voiceApplyJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black text-lg">Apply with Voice</h3>
              <button
                onClick={() => setVoiceApplyJob(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white/70 text-sm mb-2">Applying for:</p>
              <p className="text-white font-bold">{voiceApplyJob.title}</p>
              <p className="text-white/50 text-sm">{voiceApplyJob.location?.address}</p>
            </div>

            <VoiceActionComponent
              action="apply-job"
              buttonText="Speak to Apply"
              placeholder="Say something like 'I am experienced in this work and available tomorrow'..."
              jobId={voiceApplyJob._id}
              onSuccess={(result) => {
                setVoiceApplyJob(null);
                // Refresh applications
                const run = async () => {
                  try {
                    const res = await api.get('/applications/history');
                    setApplications(res.data?.data ?? []);
                  } catch {}
                };
                run();
              }}
              onError={() => {
                // Modal stays open for retry
              }}
            />

            <div className="mt-4 text-xs text-gray-500">
              Your voice will be transcribed and attached to your application.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;