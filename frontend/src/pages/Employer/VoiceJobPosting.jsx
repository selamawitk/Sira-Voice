import React, { useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { useVoice } from '../../hooks/useVoice.js';
import {
  Mic, Square, Keyboard, Send, CheckCircle2,
  Briefcase, MapPin, Calendar, DollarSign, Users,
} from 'lucide-react';

const VoiceJobPosting = () => {
  const toast = useContext(ToastContext);
  const lang = useContext(LanguageContext);
  const navigate = useNavigate();
  const copy = lang?.copy || {};
  const activeLang = lang?.lang || 'en';

  const {
    isListening,
    transcript,
    isProcessing,
    startListening,
    stopListening,
  } = useVoice();

  const [showKeyboard, setShowKeyboard] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [createdJobId, setCreatedJobId] = useState(null);

  const [editableJob, setEditableJob] = useState({
    jobTitle: '',
    quantity: 1,
    location: '',
    urgency: 'flexible',
    salary: 0,
    paymentType: 'daily',
    description: '',
  });

  const handleVoiceResult = (voiceResult) => {
    if (voiceResult?.job) {
      setPreview(voiceResult);
      setEditableJob({
        jobTitle: voiceResult.job.jobTitle || '',
        quantity: voiceResult.job.quantity || 1,
        location: voiceResult.job.location || '',
        urgency: voiceResult.job.urgency || 'flexible',
        salary: voiceResult.job.salary || 0,
        paymentType: voiceResult.job.paymentType || 'daily',
        description: voiceResult.transcript || '',
      });
      setSaved(false);
      toast?.show?.('Voice processed! Review the details below.', 'success');
    }
  };

  const startVoice = async () => {
    setPreview(null);
    setSaved(false);
    await startListening(handleVoiceResult, { action: 'post-job-ai' });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim() || isLocalProcessing) return;
    setIsLocalProcessing(true);
    try {
      const res = await api.post('/voice/job-preview', {
        text: manualText,
        lang: activeLang,
      });
      const data = res.data;
      if (data?.job) {
        setPreview(data);
        setEditableJob({
          jobTitle: data.job.jobTitle || '',
          quantity: data.job.quantity || 1,
          location: data.job.location || '',
          urgency: data.job.urgency || 'flexible',
          salary: data.job.salary || 0,
          paymentType: data.job.paymentType || 'daily',
          description: data.transcript || '',
        });
        setSaved(false);
      }
    } catch (err) {
      toast?.show?.('Failed to process text', 'error');
    } finally {
      setIsLocalProcessing(false);
    }
  };

  const handleCreateJob = async () => {
    if (!editableJob.jobTitle) {
      toast?.show?.('Please provide a job title', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.post('/voice/job-create', {
        transcript: preview?.transcript || '',
        job: editableJob,
        detectedLanguage: preview?.detectedLanguage || 'en',
      });
      if (res.data?.success && res.data?.job?._id) {
        setCreatedJobId(res.data.job._id);
        setSaved(true);
        toast?.show?.('Job posted successfully!', 'success');
      }
    } catch (err) {
      toast?.show?.(err.response?.data?.message || 'Failed to create job', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isProcessing || isLocalProcessing || isSaving;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          Voice{' '}
          <span className="text-[#2BB8B8] drop-shadow-[0_0_18px_rgba(43,184,184,0.25)]">Job Posting</span>
        </h1>
        <p className="mt-4 text-white/65 text-lg max-w-2xl mx-auto">
          Speak your job requirements — Sira will extract the details for you to review before posting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.07] blur-[140px] pointer-events-none" />

          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            Speak Your Job
          </p>

          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-4 w-full justify-center">
              <button
                onClick={isListening ? stopListening : startVoice}
                disabled={isBusy}
                className="relative w-40 h-40 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10 group disabled:opacity-40 transition-all cursor-pointer"
                aria-label={isListening ? 'Stop recording' : 'Start recording'}
              >
                <span className={`absolute inset-[-12px] rounded-full border transition-all ${
                  isListening
                    ? 'border-red-500/70 shadow-[0_0_70px_rgba(239,68,68,0.35)]'
                    : 'border-white/10 group-hover:border-[#2BB8B8]/30'
                }`} />
                <span className={`absolute inset-0 rounded-full transition-all ${
                  isListening ? 'animate-ping bg-red-500/20' : 'bg-transparent'
                }`} />
                {isListening ? (
                  <Square className="w-12 h-12 text-red-500 fill-red-500" />
                ) : (
                  <Mic className="w-12 h-12 text-[#2BB8B8]" />
                )}
              </button>

              <button
                onClick={() => setShowKeyboard(!showKeyboard)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  showKeyboard
                    ? 'bg-[#2BB8B8]/20 border-[#2BB8B8] text-[#2BB8B8]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
                title="Type instead"
              >
                <Keyboard className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-white font-black text-lg">
                {isListening
                  ? 'Listening… say your job requirements'
                  : isBusy
                  ? 'Processing…'
                  : 'Tap the mic and speak'}
              </p>
              <p className="text-white/45 text-sm mt-1">
                "I need 2 cleaners tomorrow in Bole"
              </p>
            </div>
          </div>

          {showKeyboard && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type your job requirement..."
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                disabled={isBusy}
              />
              <button
                type="submit"
                disabled={!manualText.trim() || isBusy}
                className="bg-[#1A2E35] border border-white/10 hover:border-[#2BB8B8]/40 text-[#2BB8B8] p-3 rounded-2xl transition-all cursor-pointer disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}

          {preview?.transcript && (
            <div className="mt-6">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                What Sira heard
              </label>
              <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-4">
                <p className="text-white/80 text-sm">{preview.transcript}</p>
                {preview.translatedText && preview.translatedText !== preview.transcript && (
                  <p className="text-[#2BB8B8]/70 text-xs mt-2 italic">Translated: {preview.translatedText}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            {saved ? '✓ Job Posted!' : preview ? 'Review & Post' : 'Job Details'}
          </p>

          {isBusy && !preview ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white font-black">Processing your voice…</p>
              <p className="text-white/50 text-sm mt-2">This takes a few seconds.</p>
            </div>
          ) : saved && createdJobId ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-white font-black text-lg">Job Posted Successfully!</p>
              <button
                onClick={() => navigate(`/contracts`)}
                className="bg-[#2BB8B8] text-slate-950 font-black px-6 py-3 rounded-2xl hover:brightness-110 transition-all"
              >
                View Contracts
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Job Title</label>
                <input
                  type="text"
                  value={editableJob.jobTitle}
                  onChange={(e) => setEditableJob({ ...editableJob, jobTitle: e.target.value })}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={editableJob.quantity}
                    onChange={(e) => setEditableJob({ ...editableJob, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Urgency</label>
                  <select
                    value={editableJob.urgency}
                    onChange={(e) => setEditableJob({ ...editableJob, urgency: e.target.value })}
                    className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  >
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this week">This Week</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Location</label>
                <input
                  type="text"
                  value={editableJob.location}
                  onChange={(e) => setEditableJob({ ...editableJob, location: e.target.value })}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Salary (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    value={editableJob.salary}
                    onChange={(e) => setEditableJob({ ...editableJob, salary: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Payment</label>
                  <select
                    value={editableJob.paymentType}
                    onChange={(e) => setEditableJob({ ...editableJob, paymentType: e.target.value })}
                    className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Description</label>
                <textarea
                  value={editableJob.description}
                  onChange={(e) => setEditableJob({ ...editableJob, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all resize-none"
                />
              </div>

              <button
                onClick={handleCreateJob}
                disabled={isSaving || !editableJob.jobTitle}
                className="w-full bg-[#2BB8B8] text-slate-950 font-black py-4 rounded-2xl hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Posting...' : '✓ Post Job'}
              </button>
            </div>
          ) : (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white/70 font-semibold">Example:</p>
              <p className="text-white/50 italic mt-2 text-sm">
                "I need 2 cleaners tomorrow in Bole, paying 500 ETB daily"
              </p>
              <p className="text-white/50 italic mt-1 text-sm">
                "ለአንድ ቀን 2 ፕላምበር ቦሌ ያስፈልገኛል"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceJobPosting;
