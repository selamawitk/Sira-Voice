import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import api from '../../services/api.js';
import { Keyboard, Send, Mic, Square } from 'lucide-react';

const SkillCard = ({ skill, extractedByText }) => (
  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
    <p className="text-white font-black text-lg">{skill}</p>
    <p className="text-white/50 text-sm mt-1">{extractedByText || 'Extracted by Sira Agent'}</p>
  </div>
);

const VoiceToCV = () => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  const [result, setResult] = useState(null);
  
  // Noisy environment fallback typing configuration states
  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Consume language safely from core provider context stack
  const { copy } = useContext(LanguageContext);

  const extractedSkills = useMemo(() => {
    const skillsFromIntent = result?.aiInterpreted?.skills;
    const skillsFromData = result?.data?.skills;
    const skills = (skillsFromIntent ?? skillsFromData ?? []).filter(Boolean);
    return Array.from(new Set(skills));
  }, [result]);

  useEffect(() => {
    if (extractedSkills.length > 0 && result) {
      api.put('/user/profile', { skills: extractedSkills })
        .then(() => {
          console.log('Profile updated with skills:', extractedSkills);
        })
        .catch((err) => {
          console.error('Failed to update profile:', err);
        });
    }
  }, [extractedSkills, result]);

  const onStart = async () => {
    setResult(null);
    await startListening((res) => setResult(res));
  };

  // Manual fallback submissions for loud street locations or low bandwidth edge connections
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim() || isManualSubmitting) return;

    setIsManualSubmitting(true);
    setResult(null);

    try {
      // Direct integration pipeline routing into matching natural processing architecture nodes
      const response = await api.post('/ai/voice-action', { 
        text: manualText,
        intent: 'profile' 
      });
      setResult(response.data);
      setManualText('');
    } catch (err) {
      console.error('Failed processing manual typing entry node context:', err);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
      
      {/* Dynamic Header Section Layer */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          {copy?.voiceBecomesCvTitle?.split('CV')[0] || 'Your Voice becomes your '}
          <span className="text-[#2BB8B8] drop-shadow-[0_0_18px_rgba(43,184,184,0.25)]">CV</span>
        </h1>
        <p className="mt-4 text-white/65 text-lg max-w-2xl mx-auto">
          {copy?.magicLine || 'Just speak — Sira finds, applies, and manages jobs for you.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Voice Capture Container Block */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.07] blur-[140px] pointer-events-none" />

          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
              {copy?.voiceFirstCapture || 'Voice‑First Capture'}
            </p>

            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex items-center gap-4 w-full justify-center">
                
                {/* Microphoned System Input Button Node */}
                <button
                  type="button"
                  onClick={isListening ? stopListening : onStart}
                  disabled={isProcessing || isManualSubmitting}
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

                {/* 🚨 Side-by-Side Low-Data Street Accessibility Typing Fallback Toggle */}
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
                    : isProcessing || isManualSubmitting 
                    ? (copy?.processingVoice || 'Sira is thinking…') 
                    : (copy?.tapMicAndSpeak || 'Tap the mic and speak')}
                </p>
                <p className="text-white/45 text-sm mt-1">
                  {copy?.speakThreeLanguagesHint ? 'አማርኛ • Afaan Oromoo • English' : 'Amharic • Afaan Oromo • English'}
                </p>
              </div>
            </div>

            {/* Dynamic Sliding Keyboard Input Form Tray Panel */}
            {showKeyboardFallback && (
              <form onSubmit={handleManualSubmit} className="mb-6 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={copy?.typeFallbackPlaceholder || "Type skills or experience manually..."}
                  className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#2BB8B8]/50 transition-all"
                  disabled={isListening || isProcessing || isManualSubmitting}
                />
                <button
                  type="submit"
                  disabled={!manualText.trim() || isListening || isProcessing || isManualSubmitting}
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
                {result?.transcript ?? transcript ?? ''}
                {!result?.transcript && !transcript ? (
                  <span className="text-white/30">
                    {copy?.micPlaceholder || 'Speak your skill, experience, and location…'}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Skill Parsing Grid Block Component Matrix */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            {copy?.extractedSkills || 'Extracted Skills'}
          </p>

          {isProcessing || isManualSubmitting ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white font-black">
                {copy?.transcribing ? `${copy.transcribing}` : 'Sira is building your profile…'}
              </p>
              <p className="text-white/50 text-sm mt-2">
                {copy?.autoStopHint || 'This usually takes a few seconds.'}
              </p>
            </div>
          ) : extractedSkills.length === 0 ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white/70 font-semibold">
                {copy?.speakExampleHint1 ? 'Example hints:' : 'Speak something like:'}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-white/50 italic">
                  “{copy?.speakExampleHint1 || 'I am a plumber with 3 years experience in Megenagna.'}”
                </p>
                <p className="text-white/50 italic">
                  “{copy?.speakExampleHint2 || 'እኔ የቤት ሰራተኛ ነኝ፣ ቦሌ እኖራለሁ…'}”
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {extractedSkills.map((s) => (
                <SkillCard 
                  key={s} 
                  skill={s} 
                  extractedByText={copy?.liveFromHistory ? `${copy.liveFromHistory}` : undefined} 
                />
              ))}
            </div>
          )}

          {result?.aiInterpreted ? (
            <div className="mt-6 bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                {copy?.aiAgentPreferences || 'AI Interpretation'}
              </p>
              <pre className="text-white/70 text-xs mt-3 whitespace-pre-wrap break-words font-mono bg-black/20 p-3 rounded-xl border border-white/5">
                {JSON.stringify(result.aiInterpreted, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default VoiceToCV;