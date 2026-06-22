/* eslint-disable react-hooks/set-state-in-effect */
import React, { useContext, useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';

const RatingModal = ({ open, onClose, onSubmit, initialComment = '' }) => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  
  // Initialize state directly from props to avoid the "syncing" effect
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState(initialComment);
  const lang = useContext(LanguageContext);

  // Reset local state only when the modal is specifically opened
  useEffect(() => {
    if (open) {
      setComment(initialComment);
      setScore(5);
    }
  }, [open, initialComment]);

  // Sync transcript from the voice hook
  useEffect(() => {
    if (transcript && transcript.trim() !== '') {
      setComment(transcript);
    }
  }, [transcript]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9998 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-xl bg-[#0F171A] border border-white/10 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
        
        {/* Optimized Tailwind Classes: w-130/h-130 for 520px */}
        <div className="absolute -top-40 -right-40 w-130 h-130 bg-[#2BB8B8] opacity-[0.06] blur-[140px] pointer-events-none" />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-white">
              {lang?.copy?.voiceRatingTitle ?? 'Voice Rating'}
            </h3>
            <p className="text-white/60 mt-2">
              {lang?.copy?.voiceRatingSubtitle ?? 'Speak your feedback, then adjust text if needed.'}
            </p>
          </div>
          <button
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
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
              
              {/* Optimized Tailwind Class: -inset-3 instead of inset-[-12px] */}
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

          <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40 mb-3 text-center md:text-left">
              Rating
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`w-10 h-10 rounded-2xl border font-black transition-all ${
                    score >= n
                      ? 'bg-[#2BB8B8] text-slate-950 border-[#2BB8B8]/50 scale-105'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <label className="block text-xs font-black uppercase tracking-[0.22em] text-white/40 mt-6 mb-2">
              {lang?.copy?.feedbackLabel ?? 'Feedback'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/40 placeholder:text-white/30 resize-none transition-colors"
              placeholder="Type or use voice…"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-black hover:bg-white/10 transition"
          >
            {lang?.copy?.cancel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ score, comment })}
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