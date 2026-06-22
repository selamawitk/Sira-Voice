import React, { useEffect, useMemo, useState, useContext } from 'react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const riskColor = (score) => {
  if (score == null) return 'text-white/50';
  const n = Number(score);
  if (n >= 70) return 'text-rose-300';
  if (n >= 40) return 'text-amber-300';
  return 'text-[#2BB8B8]';
};

const riskBadge = (score) => {
  if (score == null) return 'text-white/50 bg-white/5 border-white/10';
  if (score >= 70) return 'text-red-200 bg-red-600/10 border-red-400/20';
  return 'text-[#2BB8B8] bg-[#2BB8B8]/10 border-[#2BB8B8]/20';
};

const ScamLog = () => {
  const lang = useContext(LanguageContext);
  const activeLang = lang?.lang || 'en';

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [analysisByJobId, setAnalysisByJobId] = useState({});
  const [analyzingId, setAnalyzingId] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/scam-history');
        const data = res.data?.data ?? [];
        setJobs(data.map((h) => h.jobId ?? {}));
        const map = {};
        data.forEach((h) => {
          if (h.jobId?._id) {
            map[h.jobId._id] = { score: h.score, reason: h.reason, isSafe: h.isSafe };
          }
        });
        setAnalysisByJobId(map);
      } catch (err) {
        console.error('Failed to load scam history:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const analyze = async (jobId) => {
    setAnalyzingId(jobId);
    try {
      const res = await api.get(`/ai/verify-safety/${jobId}`);
      const analysis = res.data?.analysis ?? null;
      setAnalysisByJobId((prev) => ({ ...prev, [jobId]: analysis }));
    } catch (err) {
      console.error('Failed to perform analysis:', err);
    } finally {
      setAnalyzingId('');
    }
  };

  const rows = useMemo(() => {
    return jobs.map((j) => {
      const analysis = analysisByJobId[j._id];
      return {
        job: j,
        analysis,
      };
    });
  }, [jobs, analysisByJobId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-2">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-white ">
          {activeLang === 'am' ? (
            <>የማጭበርበር <span className="text-[#2BB8B8]">ቁጥጥር መዝገብ</span></>
          ) : activeLang === 'or' ? (
            <>KUUSAA <span className="text-[#2BB8B8]">SAXILAMAA HANNAA</span></>
          ) : (
            <>Scam Detection <span className="text-[#2BB8B8]">Log</span></>
          )}
        </h1>
        <p className="text-white/60 mt-2 font-medium">
          {activeLang === 'am' ? (
            <>በስራ ማስታወቂያዎች ላይ የAI ደህንነት ፍተሻዎችን ያሂዱ እና <span className="text-white font-bold">የስጋት ደረጃን</span> ይገምግሙ::</>
          ) : activeLang === 'or' ? (
            <>Maxxansaalee hojii irratti sakatta’iinsa nageenya AI gaggeessi fi <span className="text-white font-bold">Qabxii Riskii</span> sakatta’i.</>
          ) : (
            <>Run AI safety checks on job posts and review the <span className="text-white font-bold">Risk Score</span>.</>
          )}
        </p>
      </div>

      <GlassCard className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.05] blur-[140px] pointer-events-none" />

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3 relative z-10">
            <Loader2 className="w-6 h-6 text-[#2BB8B8] animate-spin" />
            <p className="text-white/50 font-medium">
              {activeLang === 'am' ? 'በመጫን ላይ...' : activeLang === 'or' ? 'Fe’aa jira...' : 'Loading safety matrix…'}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-white/50 relative z-10 text-center py-12 font-bold italic uppercase">
            {activeLang === 'am' ? 'ምንም ስራዎች አልተገኙም::' : activeLang === 'or' ? 'Hojiin argame hin jiru.' : 'No jobs found.'}
          </p>
        ) : (
          <div className="space-y-3 relative z-10">
            {rows.slice(0, 20).map(({ job, analysis }) => (
              <div key={job._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-black truncate text-lg uppercase tracking-tight">{job.title}</p>
                    <p className="text-white/45 text-xs font-bold uppercase tracking-wider mt-1">
                      {job.location?.address ?? 'Addis Ababa'} • {job.salary ?? 0} {job.currency || 'ETB'}
                    </p>
                    
                    {analysis ? (
                      <p className="text-white/70 text-sm mt-3 bg-white/[0.02] border border-white/5 rounded-xl p-3 font-medium">
                        {analysis.reason}
                      </p>
                    ) : (
                      <p className="text-white/35 text-xs italic font-medium mt-3">
                        {activeLang === 'am' ? 'ገና አልተመረመረም::' : activeLang === 'or' ? 'Hanga ammaatti hin xiinxalamne.' : 'Not analyzed yet.'}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
                    <div className="text-left md:text-right min-w-[85px]">
                      <p className={`text-2xl font-black ${riskColor(analysis?.score)}`}>
                        {analysis?.score ?? '--'}/100
                      </p>
                      <p className="text-white/35 text-[9px] font-black uppercase tracking-[0.22em] mt-0.5">
                        {activeLang === 'am' ? 'የስጋት ነጥብ' : activeLang === 'or' ? 'Qabxii Riskii' : 'risk score'}
                      </p>
                    </div>

                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border ${riskBadge(analysis?.score)}`}>
                      {analysis?.score == null 
                        ? (activeLang === 'am' ? 'አልተመረመረም' : activeLang === 'or' ? 'Hin xiinxalamne' : 'Not analyzed') 
                        : analysis?.score >= 70 
                        ? (activeLang === 'am' ? 'ከፍተኛ ስጋት' : activeLang === 'or' ? 'Riskii Guddaa' : 'High Risk') 
                        : (activeLang === 'am' ? 'አነስተኛ ስጋት' : activeLang === 'or' ? 'Riskii Xiqqaa' : 'Low Risk')}
                    </span>

                    <button
                      type="button"
                      onClick={() => analyze(job._id)}
                      disabled={analyzingId === job._id}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {analyzingId === job._id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{activeLang === 'am' ? 'በመረመር ላይ...' : activeLang === 'or' ? 'Xiinxalaa...' : 'Analyzing…'}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>{activeLang === 'am' ? 'መርምር' : activeLang === 'or' ? 'Xiinxali' : 'Analyze'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-white/30 text-[11px] font-medium mt-6 relative z-10 border-t border-white/5 pt-4">
          {activeLang === 'am' 
            ? 'ማሳሰቢያ፡ ይህ ለእያንዳንዱ ስራ `GET /api/ai/verify-safety/:jobId` ይጠራል። ለወደፊቱ በጅምላ ለመተንተን የጀርባ መጋጠሚያ (backend endpoint) ይጨመራል::' 
            : activeLang === 'or' 
            ? 'Hubachiisa: Kun hojii tokkoon tokkoon hundaaf `GET /api/ai/verify-safety/:jobId` waama. Gara fuulduraatti walitti qabuuf backend dabalama.' 
            : 'Note: This evaluates safety using single `GET /api/ai/verify-safety/:jobId` requests per execution. For enterprise horizontal scaling, backend pipeline endpoints will manage batch evaluations asynchronously.'}
        </p>
      </GlassCard>
    </div>
  );
};

export default ScamLog;