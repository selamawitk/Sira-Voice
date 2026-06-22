import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { checkJobSafety } from '../../services/aiService';

const SafetyBadge = ({ jobId }) => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    checkJobSafety(jobId).then((data) => setReport(data.analysis));
  }, [jobId]);

  if (!report) return <span className="text-gray-400 text-xs">Scanning...</span>;

  return (
    <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold ${
      report.riskLevel === 'low'
        ? 'bg-[#2BB8B8]/10 text-[#2BB8B8] border border-[#2BB8B8]/20'
        : 'bg-red-600/10 text-red-200 border border-red-400/20'
    }`}>
      {report.riskLevel === 'low' ? <><Shield className="w-3 h-3" /> Safe Job</> : <><AlertTriangle className="w-3 h-3" /> High Risk</>}
    </div>
  );
};

export default SafetyBadge;
