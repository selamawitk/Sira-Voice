import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Mic, TrendingUp, Star, CheckCircle2, Map as MapIcon, Mic2, Sparkles, Zap, ZapOff, MapPin, DollarSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../../hooks/useVoice.js';
import api from '../../services/api.js';
import { jobService } from '../../services/jobService.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LocationContext } from '../../context/LocationContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import VoiceActionComponent from '../../components/voice/VoiceActionComponent.jsx';

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const toast = useContext(ToastContext);
  const location = useContext(LocationContext);
  const { copy } = useContext(LanguageContext);
  const navigate = useNavigate();

  const { isListening, startListening, stopListening, isProcessing } = useVoice();

  const [appsLoading, setAppsLoading] = useState(true);
  const [applications, setApplications] = useState([]);

  const [jobsLoading, setJobsLoading] = useState(true);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  
  const [passiveMatches, setPassiveMatches] = useState([]);
  const [isAutoApplyActive, setIsAutoApplyActive] = useState(user?.workerProfile?.autoApplyEnabled || false);
  const [togglingAutoApply, setTogglingAutoApply] = useState(false);

  const [voiceJobs, setVoiceJobs] = useState([]);
  const [voiceApplyJob, setVoiceApplyJob] = useState(null);

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

  useEffect(() => {
    const fetchPassiveMatches = async () => {
      try {
        const res = await api.get('/jobs/passive-matches');
        if (res.data?.success) {
          setPassiveMatches(res.data.matches || []);
        }
      } catch (err) {
        console.error('Error fetching autonomous agent background matches:', err);
      }
    };
    fetchPassiveMatches();
  }, []);

  const handleToggleAutoApply = async () => {
    if (togglingAutoApply) return;
    setTogglingAutoApply(true);
    const targetState = !isAutoApplyActive;
    
    try {
      const res = await api.put('/worker/profile', { autoApplyEnabled: targetState });
      if (res.data?.success) {
        setIsAutoApplyActive(targetState);
        toast?.show?.(
          targetState 
            ? 'Autonomous Auto-Apply Active! Sira will pitch jobs for you.' 
            : 'Background Auto-Apply disabled.', 
          'success'
        );
      }
    } catch (err) {
      toast?.show?.('Failed to modify Agent parameters.', 'error');
    } finally {
      setTogglingAutoApply(false);
    }
  };

  const stats = useMemo(() => {
    const completed = applications.filter((a) => a.status === 'completed' || a.job?.status === 'completed');
    const active = applications.filter((a) => ['pending', 'accepted'].includes(a.status));
    const rating =
      user?.workerProfile?.averageRating ??
      user?.workerProfile?.rating ??
      0;

    return {
      weeklyEarningsETB: 0,
      rating: Number(rating || 0),
      activeApplications: active.length,
      completedJobs: completed.length,
    };
  }, [applications, user]);

  const recommendedJobs = useMemo(() => {
    const fromVoice = Array.isArray(voiceJobs) && voiceJobs.length > 0 ? voiceJobs : [];
    const fromPassive = Array.isArray(passiveMatches) && passiveMatches.length > 0 ? passiveMatches : [];
    const fromNearby = Array.isArray(nearbyJobs) && nearbyJobs.length > 0 ? nearbyJobs : [];
    
    // Prioritize passive background matches to prevent unnecessary refreshing
    const merged = [...fromVoice, ...fromPassive, ...fromNearby];
    const seen = new Set();
    
    return merged.filter((j) => {
      const id = j?._id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 5);
  }, [voiceJobs, passiveMatches, nearbyJobs]);

  const startVoiceSearch = async () => {
    navigate('/sira');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      
      <div className="relative group overflow-hidden bg-white/[0.03] border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#2BB8B8]/10 to-transparent"></div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center lg:text-left space-y-4">
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              <span className="bg-[#2BB8B8]/15 text-[#2BB8B8] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-pulse" />
                {copy.aiMatchingActive || 'AI Agent Monitor Engine Active'}
              </span>
              
              <button 
                onClick={handleToggleAutoApply}
                disabled={togglingAutoApply}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all outline-none border ${
                  isAutoApplyActive 
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/10'
                }`}
              >
                {isAutoApplyActive ? <Zap className="w-3 h-3 fill-current" /> : <ZapOff className="w-3 h-3" />}
                <span>Auto-Apply: {isAutoApplyActive ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              {copy.welcomeBack} <br /> <span className="text-gray-400">Hello, {user?.fullName ?? 'Worker'}.</span>
            </h1>
            <p className="text-gray-500 font-medium max-w-md">
              Your voice agent is hunting for <span className="text-white">{user?.workerProfile?.skills?.[0] ?? 'jobs'}</span>{' '}
              near <span className="text-white">{user?.location?.address ?? 'you'}</span>.
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={() => startVoiceSearch()}
              className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl bg-[#2BB8B8] hover:scale-105 shadow-[#2BB8B8]/25 group/mic"
            >
              <span className="absolute inset-0 rounded-full bg-[#2BB8B8]/20 animate-ping opacity-70 group-hover/mic:opacity-100" />
              <Mic className="w-10 h-10 text-white relative z-10" />
            </button>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                {copy.clickVoiceSira}
              </p>
              <p className="text-[11px] text-[#2BB8B8] font-semibold mt-1 opacity-60 italic">"{copy.talkToFindJobs}"</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: copy.weeklyEarnings, val: `${stats.weeklyEarningsETB} ETB`, sub: copy.calculatedSoon, icon: TrendingUp },
          { label: copy.workerRating, val: `${stats.rating.toFixed(1)} / 5.0`, sub: `${stats.completedJobs} ${copy.completedJobsCount}`, icon: Star },
          { label: copy.activeApplications, val: String(stats.activeApplications).padStart(2, '0'), sub: appsLoading ? '...' : copy.liveFromHistory, icon: CheckCircle2 },
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
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {copy.bestMatchesForYou}
              <span className="text-xs font-normal text-[#2BB8B8] bg-[#2BB8B8]/10 px-2.5 py-0.5 rounded-full border border-teal-500/10">AI Calibrated</span>
            </h3>
            <a href="/available-jobs" className="text-[10px] text-[#2BB8B8] font-black uppercase tracking-widest hover:underline">
              {copy.viewAll}
            </a>
          </div>
          
          <div className="space-y-4">
            {jobsLoading && recommendedJobs.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 p-5 rounded-3xl animate-pulse">
                <p className="text-white/60 font-bold">Fetching matching options...</p>
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 p-5 rounded-3xl">
                <p className="text-white/70 font-bold">{copy.noMatchesYet}</p>
                <p className="text-white/45 text-sm mt-1">{copy.voiceSearchMapHint}</p>
              </div>
            ) : (
              recommendedJobs.map((job) => {
                const matchScore = job.matchScore ?? 0;
                
                return (
                  <div key={job._id} className="group bg-white/[0.03] border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between hover:border-[#2BB8B8]/30 transition-all gap-4 relative overflow-hidden">
                    
                    {matchScore > 0 && (
                    <div className="absolute top-0 right-0 bg-[#2BB8B8]/10 border-bl border-white/10 text-[#2BB8B8] text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                      {matchScore}% Compatibility
                    </div>
                    )}

                    <div className="flex items-center gap-5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#1A2E35] flex items-center justify-center text-[#2BB8B8] font-black text-xl shrink-0 border border-white/5 shadow-inner">
                        {(job.title?.[0] ?? 'J').toUpperCase()}
                      </div>
                      <div className="min-w-0 pr-12">
                        <h4 className="text-white font-bold group-hover:text-[#2BB8B8] transition-colors truncate text-base">{job.title}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                          <span className="text-emerald-400"><DollarSign className="w-3 h-3 inline-block mr-0.5" />{job.salary ?? 0} ETB</span>
                          <span className="truncate"><MapPin className="w-3 h-3 inline-block mr-0.5" />{job.location?.address ?? 'Addis Ababa'}</span>
                        </div>
                        {job.employer?.employerProfile?.isVerified && (
                          <div className="flex items-center gap-1 mt-2">
                            <div className="bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full">
                              <span className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {copy.verifiedBadge}
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
                        )}
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t border-white/5 md:border-0 pt-3 md:pt-0">
                      <span className="text-[10px] text-gray-600 font-black hidden md:block">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'now'}
                      </span>
                      <div className="flex gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={async () => {
                            try {
                              await jobService.applyToJob(job._id);
                              toast?.show?.('Applied successfully via dashboard pitch.', 'success');
                              setNearbyJobs(prev => prev.filter(n => n._id !== job._id));
                              setPassiveMatches(prev => prev.filter(p => p._id !== job._id));
                            } catch {
                              toast?.show?.('Apply failed. Try again.', 'error');
                            }
                          }}
                          className="bg-[#2BB8B8]/10 text-[#2BB8B8] px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#2BB8B8] hover:text-slate-950 transition-all shadow-md"
                        >
                          {copy.mapApplyCta || 'Apply Now'}
                        </button>
                        <button
                          onClick={() => setVoiceApplyJob(job)}
                          className="bg-purple-500/10 text-purple-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-purple-500 hover:text-white transition-all flex items-center gap-1"
                        >
                          <Mic2 className="w-3 h-3" />
                          {copy.speakLabel || 'Voice Pitch'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-linear-to-br from-[#2BB8B8] to-cyan-500 p-8 rounded-[3rem] shadow-2xl shadow-[#2BB8B8]/15 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-white font-black text-lg">{copy.generateVoiceCv}</h4>
              <p className="text-white/70 text-xs mt-2 leading-relaxed">{copy.voiceCvSubtitle}</p>
              <a href="/voice-to-cv" className="block text-center mt-6 w-full bg-white text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-lg">
                {copy.startNow}
              </a>
            </div>
            <Mic className="absolute -bottom-4 -right-4 w-32 h-32 text-black/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-black text-sm">{copy.nearbyJobs}</h4>
              <MapIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="aspect-square rounded-3xl bg-[#1A2E35] border border-white/10 relative overflow-hidden opacity-80 hover:opacity-100 transition-all duration-700">
              <div className="absolute inset-0 bg-linear-to-tr from-black/30 via-transparent to-[#2BB8B8]/10" />
              <div className="absolute inset-0 bg-linear-to-t from-[#0F1D22] to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <a href="/job-map" className="block text-center w-full bg-white/10 backdrop-blur-md border border-white/10 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">
                  {copy.openJobMap}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {voiceApplyJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full relative shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black text-lg">{copy.voiceRatingTitle ? 'Apply with Voice' : 'Apply with Voice'}</h3>
              <button
                onClick={() => setVoiceApplyJob(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-white/50 text-xs uppercase tracking-widest font-bold">Target Position</p>
              <p className="text-white font-bold text-lg mt-1">{voiceApplyJob.title}</p>
              <p className="text-white/60 text-sm mt-0.5"><MapPin className="w-3.5 h-3.5 inline-block mr-1" />{voiceApplyJob.location?.address}</p>
            </div>

            <VoiceActionComponent
              action="apply-job"
              buttonText={copy.mapApplyCta || 'Submit Application'}
              placeholder="..."
              jobId={voiceApplyJob._id}
              onSuccess={() => {
                setVoiceApplyJob(null);
                toast?.show?.('Voice application dispatched to employer!', 'success');
                const run = async () => {
                  try {
                    const res = await api.get('/applications/history');
                    setApplications(res.data?.data ?? []);
                  } catch (err) {
                    console.error(err);
                  }
                };
                run();
              }}
              onError={() => {
                toast?.show?.('Could not transmit your statement. Try again.', 'error');
              }}
            />

            <div className="mt-4 text-[11px] text-gray-500 italic text-center">
              Your speech statement will be parsed, attached, and directly transmitted to the matching manager profile.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;