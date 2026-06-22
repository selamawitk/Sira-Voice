import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import api from '../../services/api.js';
import { Keyboard, Send, Mic, Square, CheckCircle2, Pencil, MapPin } from 'lucide-react';

const SkillsExtracted = ({ skills, experience, location }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {skills?.filter(Boolean).map((s, i) => (
      <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 backdrop-blur-md">
        <p className="text-white font-black text-lg">{s}</p>
        {experience > 0 && (
          <p className="text-[#2BB8B8] text-sm mt-1">{experience} year{experience > 1 ? 's' : ''} experience</p>
        )}
        {location && <p className="text-white/50 text-sm mt-1"><MapPin className="w-3.5 h-3.5 inline-block mr-1" />{location}</p>}
      </div>
    ))}
  </div>
);

const VoiceToCV = () => {
  const {
    isListening,
    transcript,
    isProcessing: isVoiceProcessing,
    result,
    error: voiceError,
    startListening,
    stopListening,
  } = useVoice();

  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editableProfile, setEditableProfile] = useState({
    skill: '',
    experienceYears: 0,
    location: '',
  });

  const { copy } = useContext(LanguageContext);
  const toast = useContext(ToastContext);

  const handleVoiceResult = (voiceResult) => {
    if (voiceResult?.profile) {
      setPreview(voiceResult);
      setEditableProfile({
        skill: voiceResult.profile.skill || '',
        experienceYears: voiceResult.profile.experienceYears || 0,
        location: voiceResult.profile.location || '',
      });
      setSaved(false);
    }
  };

  const onStart = async () => {
    setPreview(null);
    setSaved(false);
    setManualResult(null);
    await startListening(handleVoiceResult, { action: 'profile' });
  };

  const [manualResult, setManualResult] = useState(null);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim() || isManualSubmitting) return;

    setIsManualSubmitting(true);
    try {
      const response = await api.post('/voice/cv-preview', {
        text: manualText,
        lang: 'am',
      });
      const data = response.data;
      if (data?.profile) {
        setPreview(data);
        setEditableProfile({
          skill: data.profile.skill || '',
          experienceYears: data.profile.experienceYears || 0,
          location: data.profile.location || '',
        });
        setSaved(false);
      }
    } catch (err) {
      console.error(err);
      toast?.show?.('Failed to process text', 'error');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsSaving(true);
    try {
      await api.post('/voice/cv-save', {
        transcript: preview.transcript || '',
        translatedText: preview.translatedText || '',
        profile: editableProfile,
        detectedLanguage: preview.detectedLanguage || 'am',
      });
      setSaved(true);
      toast?.show?.('Profile saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      toast?.show?.('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeResult = manualResult || result;
  const isProcessing = isVoiceProcessing || isManualSubmitting;
  const hasPreview = preview && preview.profile;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          {copy?.voiceBecomesCvTitle?.split('CV')[0] || 'Your Voice becomes your '}
          <span className="text-[#2BB8B8] drop-shadow-[0_0_18px_rgba(43,184,184,0.25)]">CV</span>
        </h1>
        <p className="mt-4 text-white/65 text-lg max-w-2xl mx-auto">
          {copy?.magicLine || 'Just speak — Sira extracts your skills, experience, and location.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.07] blur-[140px] pointer-events-none" />

          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
              {copy?.voiceFirstCapture || 'Voice‑First Capture'}
            </p>

            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex items-center gap-4 w-full justify-center">
                <button
                  type="button"
                  onClick={isListening ? stopListening : onStart}
                  disabled={isProcessing}
                  className="relative w-40 h-40 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10 group disabled:opacity-40 transition-all cursor-pointer"
                  aria-label={isListening ? 'Stop recording' : 'Start recording'}
                >
                  <span
                    className={`absolute inset-[-12px] rounded-full border transition-all ${
                      isListening
                        ? 'border-red-500/70 shadow-[0_0_70px_rgba(239,68,68,0.35)]'
                        : 'border-white/10 group-hover:border-[#2BB8B8]/30'
                    }`}
                  />
                  <span
                    className={`absolute inset-0 rounded-full transition-all ${
                      isListening ? 'animate-ping bg-red-500/20' : 'bg-transparent'
                    }`}
                  />
                  {isListening ? (
                    <Square className="w-12 h-12 text-red-500 fill-red-500" />
                  ) : (
                    <Mic className="w-12 h-12 text-[#2BB8B8]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowKeyboardFallback(!showKeyboardFallback)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    showKeyboardFallback
                      ? 'bg-[#2BB8B8]/20 border-[#2BB8B8] text-[#2BB8B8]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                  title="Switch to Typing Input"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center">
                <p className="text-white font-black text-lg">
                  {isListening
                    ? (copy?.listening || 'Listening… speak now')
                    : isProcessing
                    ? (copy?.processingVoice || 'Sira is thinking…')
                    : (copy?.tapMicAndSpeak || 'Tap the mic and speak')}
                </p>
                {voiceError && <p className="text-red-400 text-xs mt-1">{voiceError}</p>}
                <p className="text-white/45 text-sm mt-1">
                  {copy?.speakThreeLanguagesHint ? 'አማርኛ • Afaan Oromoo • English' : 'Amharic • Afaan Oromo • English'}
                </p>
              </div>
            </div>

            {showKeyboardFallback && (
              <form onSubmit={handleManualSubmit} className="mb-6 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={copy?.typeFallbackPlaceholder || 'Type skills or experience manually...'}
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={!manualText.trim() || isProcessing}
                  className="bg-[#1A2E35] border border-white/10 hover:border-[#2BB8B8]/40 text-[#2BB8B8] p-3 rounded-2xl transition-all cursor-pointer disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">
              {copy?.whatSiraHeard || 'What Sira heard'}
            </label>
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-4 min-h-[120px] flex flex-col justify-between">
              <p className="text-white/80 leading-relaxed text-sm">
                {preview?.transcript ?? transcript ?? ''}
                {!preview?.transcript && !transcript ? (
                  <span className="text-white/30">{copy?.micPlaceholder || 'Speak your skill, experience, and location…'}</span>
                ) : null}
              </p>
              {preview?.translatedText && preview.translatedText !== preview.transcript && (
                <p className="text-[#2BB8B8]/70 text-xs mt-2 italic">Translated: {preview.translatedText}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            {saved ? '✓ Saved Profile' : hasPreview ? 'Preview & Edit' : 'Extracted Profile'}
          </p>

          {isProcessing ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white font-black">{copy?.transcribing || 'Sira is building your profile…'}</p>
              <p className="text-white/50 text-sm mt-2">{copy?.autoStopHint || 'This usually takes a few seconds.'}</p>
            </div>
          ) : saved ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-black text-lg">Profile Saved!</p>
              <p className="text-white/50 text-sm mt-1">Your skills and experience are now on your profile.</p>
            </div>
          ) : hasPreview ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Skill</label>
                <input
                  type="text"
                  value={editableProfile.skill}
                  onChange={(e) => setEditableProfile({ ...editableProfile, skill: e.target.value })}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  value={editableProfile.experienceYears}
                  onChange={(e) => setEditableProfile({ ...editableProfile, experienceYears: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-1 block">Location</label>
                <input
                  type="text"
                  value={editableProfile.location}
                  onChange={(e) => setEditableProfile({ ...editableProfile, location: e.target.value })}
                  className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                />
              </div>

              <SkillsExtracted
                skills={[editableProfile.skill]}
                experience={editableProfile.experienceYears}
                location={editableProfile.location}
              />

              <button
                onClick={handleSave}
                disabled={isSaving || !editableProfile.skill}
                className="w-full bg-[#2BB8B8] text-slate-950 font-black py-4 rounded-2xl hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Saving...' : '✓ Save to Profile'}
              </button>
            </div>
          ) : (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white/70 font-semibold">
                {copy?.speakExampleHint1 ? 'Example hints:' : 'Speak something like:'}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-white/50 italic">
                  "{copy?.speakExampleHint1 || 'I am a plumber with 3 years experience in Megenagna.'}"
                </p>
                <p className="text-white/50 italic">
                  "{copy?.speakExampleHint2 || 'እኔ የቤት ሰራተኛ ነኝ፣ ቦሌ እኖራለሁ…'}"
                </p>
              </div>
            </div>
          )}

          {hasPreview && (
            <div className="mt-6 bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">AI Interpretation</p>
              <pre className="text-white/70 text-xs mt-3 whitespace-pre-wrap break-words font-mono bg-black/20 p-3 rounded-xl border border-white/5">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceToCV;
