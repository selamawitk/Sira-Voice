import React, { useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const { isInstallable, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-6 md:w-96 z-[9999] animate-slide-up">
      <div className="bg-[#1A2E35] border border-[#2BB8B8]/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-[#2BB8B8]/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-[#2BB8B8]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold">Install Sira Voice</p>
          <p className="text-gray-400 text-xs">Get the best experience with our app</p>
        </div>

        <button
          onClick={install}
          className="bg-[#2BB8B8] text-slate-950 px-4 py-2 rounded-xl font-black text-xs hover:brightness-110 transition-all active:scale-95 shrink-0"
        >
          Install
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-white transition p-1 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
