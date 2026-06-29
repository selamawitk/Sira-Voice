import React, { useContext, useState, useEffect, useRef } from 'react';
import { Mic, Star, CheckCircle2, XCircle, Loader2, User, MessageSquare } from 'lucide-react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const VoiceRatingComponent = ({ jobId, targetUserId, onComplete, onCancel }) => {
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);
  const activeLang = lang?.lang || 'en';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [overall, setOverall] = useState(5);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('idle');

  const recognitionRef = useRef(null);
  const finalRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast?.show?.('Speech recognition not supported', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = finalRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += `${t} `;
        else interim += t;
      }
      finalRef.current = final;
      setTranscript(`${final} ${interim}`.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast?.show?.('Speech recognition error', 'error');
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [toast]);

  const startListening = () => {
    setTranscript('');
    finalRef.current = '';
    setExtracted(null);
    setStep('listening');
    setIsListening(true);
    recognitionRef.current?.start();
  };

  const stopListening = async () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsProcessing(true);

    try {
      const text = finalRef.current.trim();
      if (!text) {
        toast?.show?.('No speech detected', 'error');
        setIsProcessing(false);
        setStep('idle');
        return;
      }

      const res = await api.post('/voice/voice-rating', {
        text,
        lang: activeLang,
        jobId: jobId || undefined,
      });

      const data = res.data;
      if (data.success && data.extracted) {
        setExtracted(data.extracted);
        setOverall(data.data?.overall || data.extracted.rating || 5);
        setComment(data.data?.comment || data.extracted.comment || '');
        setStep('preview');
      } else {
        setExtracted({ targetName: data.targetName || 'Unknown', rating: 0, comment: '' });
        setStep('preview');
        toast?.show?.(data.message || 'Partial extraction', 'info');
      }
    } catch {
      toast?.show?.('Failed to process voice rating', 'error');
      setStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!targetUserId) {
      toast?.show?.('Missing target user', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        targetUserId,
        jobId: jobId || undefined,
        overall,
        comment,
        roleAtTime: 'employer',
      };

      if (extracted?.rating && !overall) {
        payload.overall = extracted.rating;
      }

      await api.post('/ratings', payload);
      toast?.show?.('Rating submitted successfully!', 'success');
      onComplete?.();
    } catch {
      toast?.show?.('Failed to submit rating', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'listening' || step === 'idle') {
    return (
      <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6 flex flex-col items-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40 mb-4">
          {activeLang === 'am' ? 'በድምጽ ደረጃ ይስጡ' : activeLang === 'or' ? 'Sagaleen Sadarkaa Kenni' : 'Voice Rating'}
        </p>
        <button
          onClick={isListening ? stopListening : startListening}
          className="relative w-28 h-28 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10 transition-transform active:scale-95"
        >
          <span className={`absolute inset-0 rounded-full transition-opacity ${isListening ? 'animate-ping bg-[#2BB8B8]/20 opacity-100' : 'opacity-0'}`} />
          <span className={`absolute -inset-3 rounded-full border transition-colors ${isListening ? 'border-[#2BB8B8]/70 shadow-[0_0_60px_rgba(43,184,184,0.35)]' : 'border-white/10'}`} />
          <Mic className={`w-12 h-12 ${isListening ? 'text-[#2BB8B8]' : 'text-white/80'}`} />
        </button>
        <p className="text-center text-white font-black mt-6">
          {isListening
            ? (activeLang === 'am' ? 'እያዳመጠ ነው...' : activeLang === 'or' ? 'Dhaggeeffachaa...' : 'Listening...')
            : isProcessing
              ? (activeLang === 'am' ? 'እያሰራ ነው...' : activeLang === 'or' ? 'Aktuu...' : 'Processing...')
              : (activeLang === 'am' ? 'ደረጃ ለመስጠት ይንኩ' : activeLang === 'or' ? 'Sadarkaa kennuuf cuqqaali' : 'Tap to rate with voice')}
        </p>
        {transcript && (
          <p className="text-white/50 text-sm mt-4 italic text-center max-w-sm">{transcript}</p>
        )}
        {onCancel && (
          <button onClick={onCancel} className="mt-4 text-white/40 text-xs hover:text-white/70 transition">
            {activeLang === 'am' ? 'ሰርዝ' : activeLang === 'or' ? 'Haqi' : 'Cancel'}
          </button>
        )}
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="bg-[#1A2E35]/70 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            {activeLang === 'am' ? 'የተወሰደው ደረጃ' : activeLang === 'or' ? 'Sadarkaa Baname' : 'Extracted Rating'}
          </p>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="bg-[#0F171A]/60 border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#2BB8B8]" />
            <span className="text-white/70 text-sm font-medium">
              {activeLang === 'am' ? 'ለማን' : activeLang === 'or' ? 'Eenitif' : 'Target'}:
            </span>
            <span className="text-white font-semibold">{extracted?.targetName || 'Unknown'}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white/70 text-sm font-medium">
                {activeLang === 'am' ? 'ደረጃ' : activeLang === 'or' ? 'Sadarkaa' : 'Rating'}:
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setOverall(n)}
                  className={`w-10 h-10 rounded-lg border text-sm font-black transition-all ${
                    overall >= n ? 'bg-[#2BB8B8] text-slate-950 border-[#2BB8B8]/50' : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-[#2BB8B8]" />
              <span className="text-white/70 text-sm font-medium">
                {activeLang === 'am' ? 'አስተያየት' : activeLang === 'or' ? 'Yaada' : 'Comment'}:
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full bg-[#0F171A]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#2BB8B8]/40 placeholder:text-white/30 resize-none text-sm"
              placeholder={activeLang === 'am' ? 'አስተያየት ያስገቡ...' : activeLang === 'or' ? 'Yaada galchi...' : 'Enter feedback...'}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel || (() => setStep('idle'))}
            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black hover:bg-white/10 transition text-sm"
          >
            <XCircle className="w-4 h-4 inline-block mr-1.5" />
            {activeLang === 'am' ? 'ሰርዝ' : activeLang === 'or' ? 'Haqi' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black hover:brightness-110 active:scale-95 transition disabled:opacity-50 text-sm"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin inline-block" />
            ) : (
              <CheckCircle2 className="w-4 h-4 inline-block mr-1.5" />
            )}
            {activeLang === 'am' ? 'አስገባ' : activeLang === 'or' ? 'Galchi' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default VoiceRatingComponent;
