import React, { useContext, useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { useVoice } from '../../hooks/useVoice.js';
import { voiceHire } from '../../services/voiceService.js';

const Applicants = () => {
  const toast = useContext(ToastContext);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [hiringId, setHiringId] = useState('');
  const [voiceHiring, setVoiceHiring] = useState(false);

  const { isListening, startListening, stopListening } = useVoice();

  const urlJobId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('jobId') || '';
  }, []);

  useEffect(() => {
    setJobId(urlJobId);
  }, [urlJobId]);

  useEffect(() => {
    const run = async () => {
      if (!jobId) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/jobs/${jobId}/matches`);
        const matches = res.data?.matches ?? [];
        setCandidates(matches);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [jobId]);

  const hire = async (workerId) => {
    if (!jobId) return;
    setHiringId(workerId);
    try {
      const res = await api.get(`/applications/job/${jobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find((a) => String(a.worker?._id ?? a.worker) === String(workerId));
      if (!app?._id) {
        toast?.show?.('No application found for this worker yet.', 'error');
        return;
      }
      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });
      toast?.show?.('Success — worker hired!', 'success');
    } catch {
      toast?.show?.('Hire failed. Please try again.', 'error');
    } finally {
      setHiringId('');
    }
  };

  const handleVoiceHire = async () => {
    if (!jobId) {
      toast?.show?.('Please select a job first.', 'error');
      return;
    }

    setVoiceHiring(true);
    try {
      await startListening(async (audioBlob) => {
        try {
          const result = await voiceHire(jobId, audioBlob);
          toast?.show?.(result.message, 'success');

          // Refresh candidates list
          const res = await api.get(`/jobs/${jobId}/matches`);
          const matches = res.data?.matches ?? [];
          setCandidates(matches);
        } catch (error) {
          toast?.show?.(error.response?.data?.message || 'Voice hiring failed. Please try again.', 'error');
        }
      });
    } catch {
      toast?.show?.('Failed to start voice recording.', 'error');
    } finally {
      setVoiceHiring(false);
    }
  };

  const stopVoiceHire = () => {
    stopListening();
    setVoiceHiring(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Applicants</h1>
        <p className="text-gray-400 mt-2">
          AI-ranked candidates for this job. Pick the best and hire in 1 click.
        </p>
        {jobId && (
          <div className="mt-4 flex gap-3">
            <button
              className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                voiceHiring || isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-[#2BB8B8] text-slate-950 hover:brightness-110'
              }`}
              onClick={voiceHiring || isListening ? stopVoiceHire : handleVoiceHire}
              disabled={!jobId}
            >
              {isListening ? '🎤 Listening...' : voiceHiring ? '⏹️ Stop' : '🎤 Voice Hire'}
            </button>
            <p className="text-gray-500 text-sm self-center">
              Say "hire [worker name]" to hire via voice
            </p>
          </div>
        )}
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
        {!jobId ? (
          <p className="text-gray-400">Open from your job card to see candidates.</p>
        ) : loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="text-gray-400">No ranked candidates yet.</p>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <div key={c._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-black">{c.fullName}</p>
                    <p className="text-gray-500 text-sm">
                      ⭐ {c.rating ?? 0} • {c.distance} km • score {c.score}
                      {c.isVerified ? ' • ✔ verified' : ''}
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 rounded-xl bg-[#2BB8B8] text-slate-950 font-black text-xs hover:brightness-110 transition"
                    disabled={hiringId === c._id}
                    onClick={() => hire(c._id)}
                  >
                    {hiringId === c._id ? 'Hiring…' : '1-Click Hire'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applicants;

