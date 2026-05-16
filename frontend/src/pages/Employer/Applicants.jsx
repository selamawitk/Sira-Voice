import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for redirect
import api from '../../services/api.js';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
// Voice hiring removed from Employer UI; redirect to Sira assistant instead
import { Loader2, UserCheck, Mic, Square } from 'lucide-react';

const Applicants = () => {
  const toast = useContext(ToastContext);
  const auth = useContext(AuthContext);
  const lang = useContext(LanguageContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [hiringId, setHiringId] = useState('');
  const [voiceHiring, setVoiceHiring] = useState(false);

  // const { isListening, startListening, stopListening } = useVoice();

  const urlJobId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('jobId') || '';
  }, []);

  useEffect(() => {
    setJobId(urlJobId);
  }, [urlJobId]);

  useEffect(() => {
    const fetchMatches = async () => {
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
      } catch (err) {
        console.error(err);
        toast?.show?.('Failed to fetch applicants.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [jobId, toast]);

  // SYNCED HIRE LOGIC (Matches EmployerDashboard)
  const hire = async (workerId) => {
    if (!jobId || hiringId) return;

    setHiringId(workerId);

    try {
      // 1. Double-check for existing contract first
      const contractCheck = await api.get(`/contracts/employer/${auth?.user?._id}`);
      const existing = (contractCheck.data?.data ?? []).find(
        (c) => String(c.workerId?._id ?? c.workerId) === String(workerId) && 
               String(c.jobId?._id ?? c.jobId) === String(jobId) &&
               c.status !== 'cancelled'
      );

      if (existing) {
        toast?.show?.('A contract for this worker already exists.', 'info');
        navigate('/contracts');
        return;
      }

      // 2. Get Application to sync agreedAmount
      const res = await api.get(`/applications/job/${jobId}`);
      const apps = res.data?.data ?? [];
      const app = apps.find((a) => String(a.worker?._id ?? a.worker) === String(workerId));

      if (!app?._id) {
        toast?.show?.('No active application found for this worker.', 'error');
        return;
      }

      // 3. Get Job for fallback salary
      const jobRes = await api.get(`/jobs/${jobId}`);
      const job = jobRes.data?.data;

      // 4. Update status & Create Contract
      await api.put(`/applications/${app._id}/status`, { status: 'accepted' });

      await api.post('/contracts', {
        employerId: auth?.user?._id,
        workerId,
        jobId,
        agreedAmount: app?.expectedSalary || job?.salary || 500, // Sync with logic in Dashboard
        paymentType: 'daily',
        status: 'active',
      });

      toast?.show?.('Worker hired successfully!', 'success');
      
      // Delay redirect so they see the success toast
      setTimeout(() => {
        navigate('/contracts');
      }, 1000);

    } catch (err) {
      console.error(err);
      toast?.show?.('Hiring failed. Please try again.', 'error');
      setHiringId('');
    }
  };

  const handleVoiceHire = () => {
    if (!jobId) {
      toast?.show?.('Please select a job first.', 'error');
      return;
    }
    // Redirect employers to Sira assistant for voice operations
    window.location.href = '/sira';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl text-white italic tracking-tighter font-semibold">
            {lang?.copy?.applicants ?? 'Applicants'}
          </h1>
          <p className="text-white/40 mt-2 font-medium text-sm">
            AI-ranked candidates · verified talent
          </p>
        </div>

        {jobId && (
            <button
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all bg-white/10 text-white hover:bg-white/20 border border-white/10`}
              onClick={handleVoiceHire}
            >
              <Mic className="w-4 h-4" />
              Voice Command (Sira)
            </button>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {!jobId ? (
          <div className="py-20 text-center">
            <p className="text-white/20 font-medium italic">No job selected</p>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
            <p className="text-white/30 text-xs font-medium">Scanning database...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-white/20 font-medium italic">No candidates have applied yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {candidates.map((c) => (
              <div
                key={c._id}
                className="p-6 hover:bg-white/2 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2BB8B8]/20 to-transparent flex items-center justify-center border border-white/10">
                      <span className="text-white text-lg font-semibold">{c.fullName?.[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-lg font-semibold">{c.fullName}</p>
                        {c.isVerified && <span className="text-[#2BB8B8] text-[10px] font-medium border border-[#2BB8B8]/30 px-1.5 rounded">Verified</span>}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">
                        ⭐ {c.rating ?? 'New'} • {c.distance} KM away • Match: {c.score}%
                      </p>
                    </div>
                  </div>

                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2BB8B8] text-slate-950 font-medium hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                    disabled={!!hiringId}
                    onClick={() => hire(c._id)}
                  >
                    {hiringId === c._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    {hiringId === c._id ? 'Hiring...' : 'Hire'}
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