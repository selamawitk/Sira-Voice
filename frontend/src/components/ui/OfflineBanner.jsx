import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); setDismissed(false); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    if (navigator.onLine) {
      setIsOnline(true);
      window.location.reload();
    } else {
      setTimeout(() => setRetrying(false), 2000);
    }
  };

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white py-2 px-4 text-xs font-bold flex items-center justify-center gap-3 shadow-lg">

      <WifiOff className="w-3.5 h-3.5 shrink-0" />

      <span className="flex-1 text-center">You are offline. Cached data is still available.</span>

      <button
        onClick={handleRetry}
        disabled={retrying}
        className="bg-white/20 hover:bg-white/30 disabled:opacity-50 px-3 py-1 rounded-lg transition flex items-center gap-1.5 shrink-0"
      >
        <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
        Retry
      </button>

      <button
        onClick={() => setDismissed(true)}
        className="text-white/60 hover:text-white transition p-0.5 shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default OfflineBanner;
