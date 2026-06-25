/* eslint-disable react-hooks/set-state-in-effect */
import React, { useContext, useEffect, useState } from 'react';
import { Mic, Star, Briefcase, MessageSquare, User } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';

const DEFAULT_DIMENSIONS = {
  employer: [
    { key: 'skill', label: 'Skill & Quality', icon: 'Briefcase' },
    { key: 'reliability', label: 'Reliability', icon: 'Star' },
    { key: 'quality', label: 'Work Quality', icon: 'Briefcase' },
  ],
  worker: [
    { key: 'communication', label: 'Communication', icon: 'MessageSquare' },
    { key: 'payment', label: 'Payment', icon: 'Briefcase' },
    { key: 'experience', label: 'Experience', icon: 'User' },
  ],
};

const RatingModal = ({ open, onClose, onSubmit, initialComment = '', role = 'employer' }) => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();

  const dimensions = DEFAULT_DIMENSIONS[role] || DEFAULT_DIMENSIONS.employer;
  const [scores, setScores] = useState({});
  const [overall, setOverall] = useState(5);
  const [comment, setComment] = useState(initialComment);
  const lang = useContext(LanguageContext);

  useEffect(() => {
    if (open) {
      setComment(initialComment);
      setOverall(5);
      const initial = {};
      dimensions.forEach(d => { initial[d.key] = 5; });
      setScores(initial);
    }
  }, [open, initialComment]);

  useEffect(() => {
    if (transcript && transcript.trim() !== '') {
      setComment(transcript);
    }
  }, [transcript]);

  const setDimensionScore = (key, val) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = () => {
    const dims = dimensions.map(d => ({
      label: d.label,
      score: scores[d.key] || 5,
    }));
    onSubmit({ dimensions: dims, overall, comment });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9998 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-xl bg-[#0F171A] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
        
        <div className="absolute -top-40 -right-40 w-130 h-130 bg-[#2BB8B8] opacity-[0.06] blur-[140px] pointer-events-none" />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-white">
              {lang?.copy?.voiceRatingTitle ?? 'Rate your experience'}
            </h3>
            <p className="text-white/60 mt-2">
              {lang?.copy?.voiceRatingSubtitle ?? 'Rate each aspect, then add voice or text feedback.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black text-xs hover:bg-white/10 transition"
          >
            {lang?.copy?.close ?? 'Close'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5 flex flex-col items-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40 mb-6">
              {lang?.copy?.speakLabel ?? 'Speak'}
            </p>
            
            <button
              onClick={isListening ? stopListening : () => startListening()}
              className="relative w-28 h-28 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10 transition-transform active:scale-95"
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <span className={`absolute inset-0 rounded-full transition-opacity ${isListening ? 'animate-ping bg-[#2BB8B8]/20 opacity-100' : 'opacity-0'}`} />
              
              <span className={`absolute -inset-3 rounded-full border transition-colors ${isListening ? 'border-[#2BB8B8]/70 shadow-[0_0_60px_rgba(43,184,184,0.35)]' : 'border-white/10'}`} />
              <Mic className={`w-12 h-12 ${isListening ? 'text-[#2BB8B8]' : 'text-white/80'}`} />
            </button>

            <p className="text-center text-white font-black mt-6">
              {isListening
                ? (lang?.copy?.listening ?? 'Listening…')
                : isProcessing
                  ? (lang?.copy?.transcribing ?? 'Transcribing…')
                  : (lang?.copy?.tapToSpeak ?? 'Tap to speak')}
            </p>
          </div>

          <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5 space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40 mb-3 text-center md:text-left">
              Rate Dimensions
            </p>
            
            {dimensions.map((dim) => (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/80 text-xs font-semibold">{dim.label}</span>
                  <span className="text-[#2BB8B8] text-xs font-black">{scores[dim.key] || 5}/5</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDimensionScore(dim.key, n)}
                      className={`flex-1 h-7 rounded-lg border text-xs font-black transition-all ${
                        (scores[dim.key] || 5) >= n
                          ? 'bg-[#2BB8B8] text-slate-950 border-[#2BB8B8]/50'
                          : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-bold">Overall</span>
                <span className="text-[#2BB8B8] text-xs font-black">{overall}/5</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setOverall(n)}
                    className={`flex-1 h-8 rounded-lg border font-black text-sm transition-all ${
                      overall >= n
                        ? 'bg-[#2BB8B8] text-slate-950 border-[#2BB8B8]/50 scale-105'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs font-black uppercase tracking-[0.22em] text-white/40 mt-2">
              {lang?.copy?.feedbackLabel ?? 'Feedback'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/40 placeholder:text-white/30 resize-none transition-colors"
              placeholder="Type or use voice…"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black hover:bg-white/10 transition"
          >
            {lang?.copy?.cancel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black hover:brightness-110 active:scale-95 transition"
          >
            {lang?.copy?.submitRating ?? 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;