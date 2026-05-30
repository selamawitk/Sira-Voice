import React, { useEffect, useState, useContext } from 'react';
import { Search, Filter, Clock, MessageSquare, Lock, Loader2 } from 'lucide-react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';
import { useNavigate } from 'react-router-dom';

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [q, setQ] = useState('');
  
  const navigate = useNavigate();
  const lang = useContext(LanguageContext);
  const auth = useContext(AuthContext);
  
  const copy = lang?.copy;
  const currentUser = auth?.user;

  useEffect(() => {
    const fetchJobsAndApplications = async () => {
      setLoading(true);
      try {
        const jobsRes = await api.get('/jobs', { params: q ? { category: q } : {} });
        const fetchedJobs = jobsRes.data?.data ?? [];
        setJobs(fetchedJobs);

        if (currentUser?._id) {
          const appsRes = await api.get('/applications/history');
          if (appsRes.data?.success) {
            const appMap = {};
            appsRes.data.data.forEach((app) => {
              const jobId = app.job?._id || app.job;
              if (jobId) appMap[jobId] = app.status;
            });
            setApplications(appMap);
          }
        }
      } catch (error) {
        console.error("Error loading job feed dependencies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobsAndApplications();
  }, [q, currentUser?._id]);

  const handleMessageEmployer = async (e, job) => {
    e.stopPropagation();
    if (!job) return;
    
    setActionLoading(job._id);
    try {
      const response = await api.post('/chat/conversations', {
        jobId: job._id,
        workerId: currentUser._id,
        employerId: job.employer?._id || job.employer
      });

      if (response.data?.success) {
        navigate('/chat', { state: { autoSelectConversation: response.data.data } });
      }
    } catch (error) {
      console.error('Failed to establish secured chat context path:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black text-white">
          {copy?.exploreJobs ?? 'Explore Jobs'}
        </h2>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-[#2BB8B8]/40 outline-none w-full placeholder:text-white/30"
              placeholder={copy?.search ?? "Search jobs..."}
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
            <p className="text-white/50 text-sm font-medium">...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <p className="text-white/30 text-lg italic">{copy?.noMatchesYet ?? 'No jobs found matching your criteria.'}</p>
          </div>
        ) : (
          jobs.map((job) => {
            const currentStatus = applications[job._id];
            return (
              <div 
                key={job._id} 
                onClick={() => navigate(`/jobs/${job._id}`)}
                className="group cursor-pointer bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] hover:border-[#2BB8B8]/30 hover:bg-white/[0.05] transition-all flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      {job.location?.address ?? 'Addis Ababa'}
                    </span>
                    <span className="text-white font-black text-lg">{job.salary?.toLocaleString() ?? 0} ETB</span>
                  </div>
                  
                  <h4 className="text-white font-bold text-lg mb-2 line-clamp-1">{job.title}</h4>
                  
                  <div className="mb-4">
                    {currentStatus === 'hired' ? (
                      <button
                        onClick={(e) => handleMessageEmployer(e, job)}
                        disabled={actionLoading !== null}
                        className="w-full flex items-center justify-center gap-2 bg-[#2BB8B8] text-slate-950 font-black text-[11px] py-2.5 px-4 rounded-xl shadow-md tracking-wider hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {actionLoading === job._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                        MESSAGE EMPLOYER
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-950/20 border border-white/5 rounded-xl py-2 px-3.5 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                        <Lock className="w-3 h-3 text-white/20 shrink-0" />
                        <span className="truncate">Chat unlocks upon hiring status</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase">
                    <Clock className="w-3 h-3" /> 
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                  </span>
                  <button className="text-[#2BB8B8] text-xs font-black uppercase tracking-widest group-hover:underline">
                    {copy?.detailsArrow ?? 'Details →'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JobList;