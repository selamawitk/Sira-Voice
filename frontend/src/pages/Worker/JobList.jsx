import React, { useEffect, useState } from 'react';
import { Search, Filter, Clock } from 'lucide-react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { useNavigate } from 'react-router-dom';

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const lang = React.useContext(LanguageContext);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/jobs', { params: q ? { category: q } : {} });
        setJobs(res.data?.data ?? []);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black text-white">
          {lang?.copy?.exploreJobsTitle ?? 'Explore Jobs'}
        </h2>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#2BB8B8]/40 outline-none w-full placeholder:text-white/30"
              placeholder={lang?.copy?.searchPlaceholder ?? "Search jobs..."}
            />
          </div>
          
          <button className="bg-white/5 border border-white/10 p-2 rounded-xl text-gray-400 hover:bg-white/10 transition">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-10 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#2BB8B8]/20 border-t-[#2BB8B8] rounded-full animate-spin mb-2" />
            <p className="text-white/50 text-sm font-medium">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <p className="text-white/30 text-lg italic">No jobs found matching your criteria.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div 
              key={job._id} 
              onClick={() => navigate(`/jobs/${job._id}`)}
              className="group cursor-pointer bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] hover:border-[#2BB8B8]/30 hover:bg-white/[0.05] transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {job.location?.address ?? 'Addis Ababa'}
                </span>
                <span className="text-white font-black text-lg">{job.salary?.toLocaleString() ?? 0} ETB</span>
              </div>
              
              <h4 className="text-white font-bold text-lg mb-4 line-clamp-1">{job.title}</h4>
              
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase">
                  <Clock className="w-3 h-3" /> 
                  {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                </span>
                <button className="text-[#2BB8B8] text-xs font-black uppercase tracking-widest group-hover:underline">
                  Details →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobList;