import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Briefcase, DollarSign, User, Loader2 } from 'lucide-react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { AuthContext } from '../../context/AuthContextInstance.jsx';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const lang = useContext(LanguageContext);
  const auth = useContext(AuthContext);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const copy = lang?.copy;

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        if (res.data?.success) {
          setJob(res.data.data);
        }
      } catch {
        navigate('/available-jobs', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2BB8B8]" />
      </div>
    );
  }

  if (!job) return null;

  const isOwner = auth?.user?._id === (job.employer?._id || job.employer);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/available-jobs')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </button>

      <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] space-y-6">
        <div>
          <span className="bg-[#2BB8B8]/10 text-[#2BB8B8] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {job.category}
          </span>
          <h2 className="text-2xl font-black text-white mt-3">{job.title}</h2>
        </div>

        <p className="text-white/70 leading-relaxed">{job.description}</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <DollarSign className="w-4 h-4 text-[#2BB8B8]" />
            {job.salary?.toLocaleString()} ETB ({job.paymentType})
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="w-4 h-4 text-[#2BB8B8]" />
            {job.location?.address}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Briefcase className="w-4 h-4 text-[#2BB8B8]" />
            {job.status}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4 text-[#2BB8B8]" />
            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
          </div>
        </div>

        {!isOwner && (
          <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-sm text-white/50">
            <User className="w-4 h-4 shrink-0" />
            Posted by: {job.employer?.fullName ?? 'Employer'}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
