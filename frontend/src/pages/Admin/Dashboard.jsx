import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx'; 
import { Loader2, ShieldAlert, TrendingUp } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-5 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Stat = ({ label, value, sub }) => (
  <GlassCard>
    <p className="text-white/45 text-xs font-bold uppercase tracking-[0.22em]">{label}</p>
    <p className="text-white text-3xl font-black mt-1">{value}</p>
    {sub ? <p className="text-white/45 text-xs mt-2">{sub}</p> : null}
  </GlassCard>
);

const Dashboard = () => {
  const lang = useContext(LanguageContext); 
  const activeLang = lang?.lang || 'en'; 

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data?.data ?? null);
      } catch (err) {
        console.error("Admin stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* HEADER SECTION - BALANCED WEIGHT WITH SHRUNK MARGINS */}
      <div className="mb-4">
        <h1 className="text-4xl font-semibold text-white/90 font-sans">
          {activeLang === 'am' ? (
            <>የአስተዳዳሪ <span className="text-[#2BB8B8] font-medium">ትንታኔ</span></>
          ) : activeLang === 'or' ? (
            <>XIINXALA <span className="text-[#2BB8B8] font-medium">ALEEWWAAN</span></>
          ) : (
            <>Admin <span className="text-[#2BB8B8] font-medium">Analytics</span></>
          )}
        </h1>
        <p className="text-white/50 text-sm mt-1 font-medium">
          {activeLang === 'am' 
            ? 'ለዳኞች፣ ለደህንነት እና ለደህንነት ቁጥጥር ስራዎች አጠቃላይ የስርዓት እይታ::' 
            : activeLang === 'or' 
            ? 'Abbootii seeraa, nageenyaa fi hojiiwwan amanamummaatiif ilaalcha guutuu sirnichaa.' 
            : 'System overview for judges, safety, and trust operations.'}
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-[#2BB8B8] animate-spin" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
            {activeLang === 'am' ? 'ዳታ በመጫን ላይ...' : activeLang === 'or' ? 'Deetaa fe’aa jira...' : 'Syncing Admin Center...'}
          </p>
        </div>
      ) : (
        <>
          {/* STATS MATRIX LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat 
              label={activeLang === 'am' ? 'ሰራተኞች' : activeLang === 'or' ? 'Hojjettoota' : 'Workers'} 
              value={stats?.users?.workers ?? 0} 
            />
            <Stat 
              label={activeLang === 'am' ? 'ቀጣሪዎች' : activeLang === 'or' ? 'Qaxartoota' : 'Employers'} 
              value={stats?.users?.employers ?? 0} 
            />
            <Stat 
              label={activeLang === 'am' ? 'ስራዎች (በጠቅላላ)' : activeLang === 'or' ? 'Hojiiwwan (Waliigala)' : 'Jobs (total)'} 
              value={stats?.jobs?.total ?? 0} 
              sub={`${activeLang === 'am' ? 'ንቁ ስራዎች' : activeLang === 'or' ? 'Hojii Socho’aa' : 'Active'}: ${stats?.jobs?.active ?? 0}`}
            />
            <Stat 
              label={activeLang === 'am' ? 'ግጥምጥሞሾች' : activeLang === 'or' ? 'Wal-gitiinsa' : 'Matches'} 
              value={stats?.matches ?? 0} 
              sub={`${activeLang === 'am' ? 'የታገዱ ስራዎች' : activeLang === 'or' ? 'Hojii Saaxilame' : 'Flagged jobs'}: ${stats?.jobs?.flagged ?? 0}`}
            />
          </div>

          {/* LOWER OPERATIONAL GLASS PANELS */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard className="lg:col-span-2 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-[#2BB8B8] opacity-[0.05] blur-[140px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-2 text-[#2BB8B8] mb-1 relative z-10">
                  <ShieldAlert className="w-4 h-4" />
                  <h2 className="text-white font-bold text-base uppercase tracking-wider">
                    {activeLang === 'am' ? 'የደህንነት እና ማጭበርበር ቁጥጥር' : activeLang === 'or' ? 'Nageenya & Hordoffii Hanna' : 'Safety & Scam Monitoring'}
                  </h2>
                </div>
                <p className="text-white/50 text-xs mb-4 relative z-10">
                  {activeLang === 'am' 
                    ? 'አጠራጣሪ ልጥፎችን ይገምግሙ እና የAI ደህንነት ፍተሻዎችን ይከታተሉ::' 
                    : activeLang === 'or' 
                    ? 'Maxxansaalee shakkisiisoo ta’an sakatta’i fi nagaummaa AI hordofi.' 
                    : 'Review suspicious posts and track AI safety checks.'}
                </p>
              </div>

              <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-bold uppercase text-xs tracking-wide">
                      {activeLang === 'am' ? 'የማጭበርበር መዝገብ ማውጫ' : activeLang === 'or' ? 'Kuusaa Riskii Hanna' : 'Scam Detection Log'}
                    </p>
                    <p className="text-white/45 text-xs mt-0.5">
                      {activeLang === 'am' 
                        ? 'በእያንዳንዱ የስራ መደብ ላይ የAI ስጋት ደረጃን ይመልከቱ::' 
                        : activeLang === 'or' 
                        ? 'Hojii tokkoon tokkoon irratti sadarkaa riskii AI ilaali.' 
                        : 'See AI risk score per job post.'}
                    </p>
                  </div>
                  <a
                    href="/admin-scam-log"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition duration-300 text-center whitespace-nowrap"
                  >
                    {activeLang === 'am' ? 'መዝገቡን ክፈት →' : activeLang === 'or' ? 'Kuusaa Bani →' : 'Open Log →'}
                  </a>
                </div>
              </div>
            </GlassCard>

            {/* PLATFORM ECONOMIC IMPACT SUMMARY */}
            <GlassCard>
              <div className="flex items-center gap-2 text-[#2BB8B8] mb-3">
                <TrendingUp className="w-4 h-4" />
                <h2 className="text-white font-bold text-base uppercase tracking-wider">
                  {activeLang === 'am' ? 'ተፅዕኖ' : activeLang === 'or' ? 'Dhiibbaa' : 'Impact'}
                </h2>
              </div>
              <div className="space-y-2">
                <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-3.5">
                  <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.22em]">
                    {activeLang === 'am' ? 'አጠቃላይ ገቢ' : activeLang === 'or' ? 'Galii Waliigalaa' : 'Total earnings'}
                  </p>
                  <p className="text-white text-xl font-black mt-0.5">{stats?.impact?.totalEarningsETB ?? 0} ETB</p>
                </div>
                <div className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-3.5">
                  <p className="text-white/45 text-[10px] font-bold uppercase tracking-[0.22em]">
                    {activeLang === 'am' ? 'የተጠናቀቁ ስራዎች' : activeLang === 'or' ? 'Hojiiwwan Xumuraman' : 'Completed jobs'}
                  </p>
                  <p className="text-white text-xl font-black mt-0.5">{stats?.jobs?.completed ?? 0}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;