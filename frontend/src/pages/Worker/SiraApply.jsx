import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Send, FileText, User, MapPin, DollarSign, MessageSquare, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';
import { useVoice } from '../../hooks/useVoice.js';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const SiraApply = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState('choose');
  const [voiceText, setVoiceText] = useState('');
  const [coverMessage, setCoverMessage] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [availability, setAvailability] = useState('immediate');
  const [includeCv, setIncludeCv] = useState(true);
  const [cvInfo, setCvInfo] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        if (res.data?.success) setJob(res.data.data);
        else navigate('/available-jobs', { replace: true });
      } catch {
        navigate('/available-jobs', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  useEffect(() => {
    if (transcript && transcript.trim()) {
      setVoiceText(transcript);
      setCoverMessage(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const fetchCV = async () => {
      try {
        const res = await api.get(`/users/profile/${auth?.user?._id}`);
        const profile = res.data?.data?.workerProfile;
        if (profile) {
          setCvInfo({
            skills: profile.skills || [],
            bio: profile.bio || '',
            experienceYears: profile.experienceYears || 0,
          });
          setSkills((profile.skills || []).join(', '));
          setExperience(profile.experienceYears ? String(profile.experienceYears) : '');
        }
      } catch {}
    };
    fetchCV();
  }, [auth?.user?._id]);

  const handleSubmit = async () => {
    if (!job || submitting) return;
    setSubmitting(true);
    try {
      const source = mode === 'voice' ? 'VOICE' : 'FORM';
      const message = mode === 'voice' ? voiceText : coverMessage;

      await api.post(`/applications/${job._id}/apply`, {
        includeCv,
        source,
        message,
      });
      setSubmitted(true);
      toast?.show?.('Application submitted successfully!', 'success');
      setTimeout(() => navigate(`/jobs/${job._id}`), 2000);
    } catch (err) {
      toast?.show?.(err.response?.data?.message || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2BB8B8]" />
      </div>
    );
  }

  if (!job) return null;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center page-enter">
        <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white">{copy?.applicationSubmitted ?? 'Application Submitted'}</h2>
          <p className="text-white/60">{copy?.yourApplicationFor ?? 'Your application for'} "{job.title}" {copy?.hasBeenSent ?? 'has been sent'}</p>
          <p className="text-white/40 text-sm">{copy?.redirectingToJobDetails ?? 'Redirecting to job details...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <button
        onClick={() => navigate(`/jobs/${id}`)}
        className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> {copy?.backToJob ?? 'Back to Job'}
      </button>

      <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2BB8B8]/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#2BB8B8]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{copy?.applyThroughSira ?? 'Apply Through Sira'}</h2>
            <p className="text-white/50 text-sm">{job.title} • {job.location?.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
          <MapPin className="w-4 h-4 text-[#2BB8B8] shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">{job.location?.locationName || job.location?.address}</p>
            <p className="text-white/40 text-xs">{job.salary?.toLocaleString()} ETB ({job.paymentType})</p>
          </div>
        </div>

        {mode === 'choose' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('voice')}
              className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl hover:border-[#2BB8B8]/40 transition-all text-center space-y-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#2BB8B8]/10 mx-auto flex items-center justify-center group-hover:bg-[#2BB8B8]/20 transition-all">
                <Mic className="w-8 h-8 text-[#2BB8B8]" />
              </div>
              <h3 className="text-white font-bold">{copy?.voiceApplication ?? 'Voice Application'}</h3>
              <p className="text-white/40 text-xs">{copy?.speakYourApplicationDesc ?? 'Speak your application'}</p>
            </button>
            <button
              onClick={() => setMode('form')}
              className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl hover:border-[#2BB8B8]/40 transition-all text-center space-y-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center group-hover:bg-white/10 transition-all">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold">{copy?.manualForm ?? 'Manual Form'}</h3>
              <p className="text-white/40 text-xs">{copy?.fillManuallyDesc ?? 'Fill in the form manually'}</p>
            </button>
          </div>
        )}

        {mode === 'voice' && (
          <div className="space-y-4">
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6 text-center">
              <button
                onClick={isListening ? stopListening : () => startListening()}
                className={`relative w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500/20 border-2 border-red-500/50'
                    : 'bg-[#2BB8B8] hover:scale-105'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-10 h-10 text-red-400" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
                {isListening && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
                )}
              </button>
              <p className="text-white/60 text-sm mt-4">
                {isListening ? (copy?.listeningTapToStop ?? 'Listening... tap to stop') : isProcessing ? (copy?.processing ?? 'Processing...') : (copy?.tapToSpeakApplication ?? 'Tap to speak')}
              </p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">
                {copy?.generatedApplicationText ?? 'Your application text'}
              </label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 transition-all resize-none"
                placeholder={copy?.spokenAppPlaceholder ?? 'Your spoken application will appear here...'}
              />
              <p className="text-[10px] text-white/30 mt-1">{copy?.editToCorrect ?? 'Edit to correct any mistakes'}</p>
            </div>

            <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={includeCv}
                onChange={(e) => setIncludeCv(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2BB8B8]"
              />
              <div>
                <p className="text-white text-sm font-semibold">{copy?.attachCVWithApplication ?? 'Attach CV with application'}</p>
                {cvInfo && (
                  <p className="text-white/40 text-xs mt-0.5">{cvInfo.skills?.join(', ') || 'General'} • {cvInfo.experienceYears} {copy?.yrsExp ?? 'yrs exp'}</p>
                )}
              </div>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting || !voiceText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#2BB8B8] text-slate-950 font-black text-sm py-4 rounded-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {copy?.apply ?? 'Apply'}
            </button>
          </div>
        )}

        {mode === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">{copy?.coverMessage ?? 'Cover Message'}</label>
              <textarea
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 transition-all resize-none"
                placeholder={copy?.writeMessagePlaceholder ?? 'Write your message...'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">{copy?.experienceYears ?? 'Experience (Years)'}</label>
                <input
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  placeholder={copy?.experiencePlaceholder ?? 'e.g. 5'}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">{copy?.availability ?? 'Availability'}</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                >
                  <option value="immediate" className="bg-[#1A2E35]">{copy?.immediate ?? 'Immediate'}</option>
                  <option value="within_week" className="bg-[#1A2E35]">{copy?.withinWeek ?? 'Within a Week'}</option>
                  <option value="within_month" className="bg-[#1A2E35]">{copy?.withinMonth ?? 'Within a Month'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 block">{copy?.skillsLabel ?? 'Skills'}</label>
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                placeholder={copy?.skillsPlaceholder ?? 'e.g. Plumbing, Carpentry'}
              />
            </div>

            <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={includeCv}
                onChange={(e) => setIncludeCv(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2BB8B8]"
              />
              <div>
                <p className="text-white text-sm font-semibold">{copy?.attachCVWithApplication ?? 'Attach CV with application'}</p>
                {cvInfo && (
                  <p className="text-white/40 text-xs mt-0.5">{cvInfo.skills?.join(', ') || 'General'} • {cvInfo.experienceYears} {copy?.yrsExp ?? 'yrs exp'}</p>
                )}
              </div>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting || !coverMessage.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#2BB8B8] text-slate-950 font-black text-sm py-4 rounded-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {copy?.apply ?? 'Apply'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiraApply;
