import React, { useEffect, useState } from 'react';
import { Search, Filter, Clock } from 'lucide-react';
import api from '../../services/api.js';
import { useVoice } from '../../hooks/useVoice.js';
import { LanguageContext } from '../../context/LanguageContext.jsx';
import { useNavigate } from 'react-router-dom';

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const { startListening, isListening, isProcessing, result, transcript, error } = useVoice();
  const lang = React.useContext(LanguageContext);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/jobs', { params: q ? { category: q } : {} });
        setJobs(res.data?.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [q]);

  useEffect(() => {
    if (result && result.intent === 'job_search') {
      navigate('/jobs', { state: { filterLocation: result.location } });
    }
  }, [result, navigate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black text-white">Explore Jobs</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#2BB8B8]/40 outline-none w-full placeholder:text-white/30"
              placeholder="Search jobs..."
            />
          </div>
          <button className="bg-white/5 border border-white/10 p-2 rounded-xl text-gray-400"><Filter className="w-5 h-5" /></button>
          <button
            onClick={() => { console.log('🎙️ Voice Search button clicked'); startListening(lang?.lang); }}
            disabled={isListening || isProcessing}
            className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white font-black hover:bg-white/10 transition disabled:opacity-50"
          >
            {isProcessing ? 'Processing…' : isListening ? '🎙️ Listening...' : '🎙️ Voice Search'}
          </button>
        </div>
      </div>
      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          Error: {error}
        </div>
      )}
      {transcript ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/80">
          <p className="font-bold">Transcript:</p>
          <p>{transcript}</p>
        </div>
      ) : isListening ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white/80">
          Speak now...
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : (
          jobs.map((job) => (
            <div key={job._id} className="group bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] hover:border-[#2BB8B8]/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {job.location?.address ?? 'Addis Ababa'}
                </span>
                <span className="text-white font-black text-lg">{job.salary ?? 0} ETB</span>
              </div>
              <h4 className="text-white font-bold text-lg mb-4">{job.title}</h4>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase">
                  <Clock className="w-3 h-3" /> {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                </span>
                <button className="text-[#2BB8B8] text-xs font-black uppercase tracking-widest group-hover:underline">Details →</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobList;