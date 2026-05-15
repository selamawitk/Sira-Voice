import React, { useContext, useState } from 'react';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';

const TalkToSira = () => {
  const { isListening, transcript, isProcessing, startListening, stopListening } = useVoice();
  const [editable, setEditable] = useState('');
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);
  const [jobs, setJobs] = useState([]);

  const start = async () => {
    await startListening((result) => {
      setEditable(result?.transcript ?? '');
      if (result?.actionTaken === 'JOB_SEARCH_RESULTS') {
        setJobs(result?.data ?? []);
        toast?.show?.('AI found jobs for you!', 'success');
      } else if (result?.actionTaken === 'PROFILE_UPDATED') {
        toast?.show?.('Profile updated with voice!', 'success');
      } else if (result?.actionTaken === 'JOB_CREATED') {
        toast?.show?.('Job posted successfully!', 'success');
      } else {
        toast?.show?.('Voice processed.', 'info');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Talk to Sira</h1>
        <p className="text-gray-400 mt-2">
          Speak in Amharic, Afaan Oromo, or English. You can edit what Sira heard before taking action.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={isListening ? stopListening : start}
            className="relative w-40 h-40 rounded-full bg-[#1A2E35] border border-white/10 grid place-items-center"
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            {/* Pulsing green ring */}
            <span
              className={`absolute inset-0 rounded-full ${
                isListening ? 'animate-ping bg-[#2BB8B8]/20' : 'bg-transparent'
              }`}
            />
            <span
              className={`absolute inset-[-12px] rounded-full border ${
                isListening ? 'border-[#2BB8B8]/60 shadow-[0_0_50px_rgba(43,184,184,0.28)]' : 'border-white/10'
              }`}
            />
            <span className="text-5xl">🎤</span>
          </button>

          <div className="text-center">
            <p className="text-white font-bold">
              {isListening ? 'Listening… speak now' : isProcessing ? 'Sira is thinking…' : 'Tap to speak'}
            </p>
            <p className="text-gray-500 text-sm mt-1">Auto-stops after ~10 seconds.</p>
          </div>

          <div className="w-full">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              Transcribed text (editable)
            </label>
            <textarea
              value={editable || transcript}
              onChange={(e) => setEditable(e.target.value)}
              rows={5}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#2BB8B8]/50 placeholder:text-gray-600"
              placeholder={lang?.copy?.micPlaceholder ?? 'Your speech will appear here…'}
            />
          </div>

          <div className="w-full flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition"
              onClick={() => setEditable('')}
            >
              Clear
            </button>
          </div>

          {jobs.length > 0 ? (
            <div className="w-full mt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-3">
                Suggested jobs
              </p>
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div key={j._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                    <p className="text-white font-black">{j.title}</p>
                    <p className="text-white/45 text-sm mt-1">{j.location?.address ?? 'Addis Ababa'} • {j.salary ?? 0} ETB</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TalkToSira;

