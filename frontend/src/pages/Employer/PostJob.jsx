import React, { useContext, useState } from 'react';
import api from '../../services/api.js';
import { useVoice } from '../../hooks/useVoice.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import VoiceActionComponent from '../../components/voice/VoiceActionComponent.jsx';

const PostJob = () => {
  const toast = useContext(ToastContext);
  const lang = useContext(LanguageContext);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [salary, setSalary] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);

  const { startListening, isListening, isProcessing, stopListening } = useVoice();

  const runVoice = async () => {
    await startListening((res) => {
      const intent = res?.aiInterpreted ?? {};
      const transcript = res?.transcript ?? '';
      const createdJob = res?.actionTaken === 'JOB_CREATED' ? res?.data : null;

      // Prefer the created job fields (authoritative), else fall back to AI intent, else keep existing.
      const nextTitle =
        createdJob?.title ||
        intent.title ||
        (intent.category ? `${intent.category} Job` : '') ||
        title;
      const nextCategory = createdJob?.category || intent.category || category;
      const nextAddress = createdJob?.location?.address || intent.location || address;
      const nextSalary =
        createdJob?.salary != null ? String(createdJob.salary) : intent.salary != null ? String(intent.salary) : salary;
      const nextDescription = createdJob?.description || transcript || description;

      if (nextTitle) setTitle(nextTitle);
      if (nextCategory) setCategory(nextCategory);
      if (nextAddress) setAddress(nextAddress);
      if (nextSalary) setSalary(nextSalary);
      if (nextDescription) setDescription(nextDescription);

      toast?.show?.('Voice parsed — form auto-filled.', 'success');
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Minimal job create; coordinates optional if you later add GPS picker
      const payload = {
        title,
        category: category || title,
        description,
        salary: Number(salary || 0),
        location: {
          address: address || 'Addis Ababa',
          type: 'Point',
          coordinates: [38.7578, 8.9806],
        },
      };
      await api.post('/jobs', payload);
      toast?.show?.('Job posted successfully.', 'success');
      window.location.href = '/employer-dashboard';
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">{lang?.copy?.jobPostTitle ?? 'Post a Job'}</h1>
        <p className="text-gray-400 mt-2">
          {lang?.copy?.jobPostSubtitle ?? 'Voice-first job posting: describe it once, Sira fills the form.'}
        </p>
      </div>

      {/* Voice mode */}
      <div className="mb-5 bg-white/[0.03] border border-white/10 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-black">{lang?.copy?.voiceModeLabel ?? 'Voice Mode'}</p>
            <p className="text-white/50 text-sm mt-1">{lang?.copy?.voiceModeHint ?? 'Speak: role, location, pay, date/time.'}</p>
          </div>
          <button
            type="button"
            onClick={() => setVoiceMode((v) => !v)}
            className={`px-4 py-2 rounded-2xl border font-black text-xs transition ${
              voiceMode
                ? 'bg-[#2BB8B8] text-slate-950 border-[#2BB8B8]/40'
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            {voiceMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {voiceMode ? (
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={isListening ? stopListening : runVoice}
              className="relative w-16 h-16 rounded-full grid place-items-center bg-[#1A2E35] border border-white/10"
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <span className={`absolute inset-0 rounded-full ${isListening ? 'animate-ping bg-[#2BB8B8]/20' : 'bg-transparent'}`} />
              <span className={`absolute inset-[-10px] rounded-full border ${isListening ? 'border-[#2BB8B8]/70 shadow-[0_0_60px_rgba(43,184,184,0.35)]' : 'border-white/10'}`} />
              <span className="text-2xl">🎤</span>
            </button>
            <div>
              <p className="text-white font-black">
                {isListening ? 'Listening…' : isProcessing ? 'Processing…' : (lang?.copy?.voiceModeTap ?? 'Tap mic to describe the job')}
              </p>
              <p className="text-white/50 text-sm mt-1">{lang?.copy?.voiceModeExample ?? 'Example: “Need 2 cleaners tomorrow in Bole, 500 birr.”'}</p>
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang?.copy?.fieldTitle ?? 'Title'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/50"
              placeholder="Cleaner, Plumber, Construction…"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang?.copy?.fieldCategory ?? 'Category'}
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/50"
              placeholder="Cleaning, Plumbing…"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang?.copy?.fieldLocation ?? 'Location'}
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/50"
              placeholder="Bole, near Edna Mall"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              {lang?.copy?.fieldSalary ?? 'Salary (ETB)'}
            </label>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/50"
              placeholder="500"
              inputMode="numeric"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
            {lang?.copy?.fieldDescription ?? 'Description'}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full bg-[#1A2E35]/60 border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-[#2BB8B8]/50"
            placeholder="Need 2 cleaners tomorrow morning…"
          />
        </div>

        <div className="flex justify-end gap-3">
          <a
            href="/employer-dashboard"
            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition"
          >
            Cancel
          </a>
          <button
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-black hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? 'Posting…' : (lang?.copy?.postJob ?? 'Post Job')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJob;

