import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { Mic, MapPin, DollarSign, ZapOff, Copy, Trash2 } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const SiraTalkPage = () => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  const [editable, setEditable] = useState('');
  const [jobs, setJobs] = useState([]);
  const [voiceMode, setVoiceMode] = useState('general'); // 'general', 'search', 'job_creation'

  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);

  const modeToAction = {
    general: 'post-job-ai',
    search: 'search-jobs',
    job_creation: 'post-job-ai',
  };

  const start = async () => {
    await startListening(result => {
      setEditable(result?.transcript ?? '');

      if (result?.actionTaken === 'JOB_SEARCH_RESULTS') {
        setJobs(result?.data ?? []);
        toast?.show?.('AI found jobs for you!', 'success');
      } else if (result?.actionTaken === 'PROFILE_UPDATED') {
        toast?.show?.('Profile updated with voice!', 'success');
      } else if (result?.actionTaken === 'JOB_CREATED') {
        toast?.show?.('Job posted successfully!', 'success');
      } else if (result?.actionTaken === 'APPLICATION_SUBMITTED') {
        toast?.show?.('Application submitted!', 'success');
      } else {
        toast?.show?.('Voice processed.', 'info');
      }
    }, { action: modeToAction[voiceMode] || 'post-job-ai' });
  };

  const copyToClipboard = () => {
    if (!editable) return;
    navigator.clipboard.writeText(editable);
    toast?.show?.('Copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white">
          {lang?.copy?.siraTalkTitle || 'Talk to Sira'}
        </h1>
        <p className="text-white/60 mt-2">
          {lang?.copy?.siraTalkSubtitle ||
            'Use voice to search jobs, create profiles, or manage your work'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { id: 'general', label: 'General Chat', icon: '💬' },
          { id: 'search', label: 'Search Jobs', icon: '🔍' },
          { id: 'job_creation', label: 'Post Job', icon: '📝' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setVoiceMode(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              voiceMode === mode.id
                ? 'bg-[#2BB8B8] text-slate-950'
                : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/20'
            }`}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      <GlassCard className="relative overflow-hidden mb-8">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#2BB8B8] opacity-[0.03] blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8 py-8">
          <button
            onClick={isListening ? stopListening : start}
            className="relative w-40 h-40 rounded-full bg-gradient-to-br from-[#2BB8B8]/20 to-[#2BB8B8]/5 border-2 border-[#2BB8B8]/40 grid place-items-center hover:border-[#2BB8B8]/60 transition-all group"
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full animate-pulse bg-[#2BB8B8]/20" />
                <span className="absolute inset-[-8px] rounded-full border border-[#2BB8B8]/40 animate-pulse" />
              </>
            )}

            <div className="relative z-10 group-hover:scale-110 transition-transform">
              <Mic className={`w-12 h-12 ${isListening ? 'text-[#2BB8B8]' : 'text-white/80'}`} />
            </div>
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {isListening
                ? 'Listening… speak now'
                : isProcessing
                  ? 'Sira is processing…'
                  : 'Tap the mic to speak'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              Supports Amharic, Afaan Oromo, and English
            </p>
          </div>
        </div>
      </GlassCard>

      {(editable || transcript) && (
        <GlassCard className="relative overflow-hidden mb-8">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-400 opacity-[0.03] blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-white">
                Transcribed Text (editable)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditable('')}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Clear text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={editable || transcript}
              onChange={e => setEditable(e.target.value)}
              rows={6}
              className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/40 placeholder:text-white/30"
              placeholder="Your speech will appear here…"
            />
          </div>
        </GlassCard>
      )}

      {jobs.length > 0 && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500 opacity-[0.03] blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-xl font-semibold text-white mb-6">
              {lang?.copy?.suggestedJobs || 'Suggested Jobs'} ({jobs.length})
            </h2>
            <div className="space-y-4">
              {jobs.map(job => (
                <div
                  key={job._id}
                  className="group bg-[#1A2E35]/40 border border-white/5 hover:border-[#2BB8B8]/40 rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">
                        {job.title || 'Untitled Job'}
                      </h3>
                      <p className="text-white/60 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5 inline-block mr-1" />{job.location?.address || 'Addis Ababa'}
                      </p>
                      <p className="text-[#2BB8B8] font-semibold mt-2">
                        <DollarSign className="w-3.5 h-3.5 inline-block mr-0.5" />{(job.salary || 0).toLocaleString()} ETB
                      </p>
                    </div>
                    {user?.role === 'worker' && (
                      <button
                        onClick={() => navigate(`/sira-apply/${job._id}`)}
                        className="px-6 py-2 rounded-xl bg-[#2BB8B8] text-slate-950 font-semibold hover:scale-105 transition-transform"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {!editable && !transcript && jobs.length === 0 && (
        <GlassCard className="text-center py-12">
          <Mic className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">
            {voiceMode === 'search'
              ? 'Speak a job description to find matches'
              : voiceMode === 'job_creation'
                ? 'Describe a job you want to post'
                : 'Start speaking to interact with Sira'}
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default SiraTalkPage;
