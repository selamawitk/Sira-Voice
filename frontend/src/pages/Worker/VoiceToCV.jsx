import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import api from '../../services/api.js';

const SkillCard = ({ skill }) => (
  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
    <p className="text-white font-black text-lg">{skill}</p>
    <p className="text-white/50 text-sm mt-1">Extracted by Sira Agent</p>
  </div>
);

const VoiceToCV = () => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  const [result, setResult] = useState(null);
  const lang = useContext(LanguageContext);

  const extractedSkills = useMemo(() => {
    // Backend /ai/voice-action returns: { transcript, aiInterpreted, actionTaken, data }
    // For profile intent, aiInterpreted.skills often exists; sometimes skills are on data.skills
    const skillsFromIntent = result?.aiInterpreted?.skills;
    const skillsFromData = result?.data?.skills;
    const skills = (skillsFromIntent ?? skillsFromData ?? []).filter(Boolean);
    return Array.from(new Set(skills));
  }, [result]);

  useEffect(() => {
    if (extractedSkills.length > 0 && result) {
      // Save extracted skills to user profile
      api.put('/user/profile', { skills: extractedSkills })
        .then(() => {
          console.log('Profile updated with skills:', extractedSkills);
        })
        .catch((err) => {
          console.error('Failed to update profile:', err);
        });
    }
  }, [extractedSkills, result]);

  const magicLine = lang?.copy?.magicLine ?? 'Just speak — Sira finds, applies, and manages jobs for you.';

  const onStart = async () => {
    setResult(null);
    await startListening((res) => setResult(res));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
          Your Voice becomes your <span className="text-[#2BB8B8] drop-shadow-[0_0_18px_rgba(43,184,184,0.25)]">CV</span>
        </h1>
        <p className="mt-4 text-white/65 text-lg max-w-2xl mx-auto">{magicLine}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice capture card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
          {/* Ambient glow */}
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.07] blur-[140px] pointer-events-none" />

          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            Voice‑First Capture
          </p>

          <div className="flex flex-col items-center gap-6 py-4">
            <button
              onClick={isListening ? stopListening : onStart}
              className="relative w-44 h-44 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10"
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              {/* Pulsing outer ring */}
              <span
                className={`absolute inset-[-16px] rounded-full border transition ${
                  isListening
                    ? 'border-[#2BB8B8]/70 shadow-[0_0_70px_rgba(43,184,184,0.35)]'
                    : 'border-white/10'
                }`}
              />
              <span
                className={`absolute inset-0 rounded-full ${
                  isListening ? 'animate-ping bg-[#2BB8B8]/20' : 'bg-transparent'
                }`}
              />

              <span className="text-6xl select-none">🎤</span>
            </button>

            <div className="text-center">
              <p className="text-white font-black text-lg">
                {isListening ? 'Listening…' : isProcessing ? 'Sira is processing…' : 'Tap the mic and speak'}
              </p>
              <p className="text-white/45 text-sm mt-1">Amharic • Afaan Oromo • English</p>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">
              What Sira heard
            </label>
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-4 min-h-[120px]">
              <p className="text-white/80 leading-relaxed">
                {result?.transcript ?? transcript ?? ''}
                {!result?.transcript && !transcript ? (
                  <span className="text-white/30"> {lang?.copy?.micPlaceholder ?? 'Speak your skill, experience, and location…'}</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Extracted Skills card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40 mb-4">
            Extracted Skills
          </p>

          {isProcessing ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white font-black">Sira is building your profile…</p>
              <p className="text-white/50 text-sm mt-2">This usually takes a few seconds.</p>
            </div>
          ) : extractedSkills.length === 0 ? (
            <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6">
              <p className="text-white/70">
                Speak something like:
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-white/50">“I am a plumber with 3 years experience in Megenagna.”</p>
                <p className="text-white/50">“እኔ የቤት ሰራተኛ ነኝ፣ ቦሌ እኖራለሁ…”</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {extractedSkills.map((s) => (
                <SkillCard key={s} skill={s} />
              ))}
            </div>
          )}

          {result?.aiInterpreted ? (
            <div className="mt-6 bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                AI Interpretation
              </p>
              <pre className="text-white/70 text-xs mt-3 whitespace-pre-wrap break-words">
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

