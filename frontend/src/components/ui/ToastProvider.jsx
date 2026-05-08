import React, { createContext, useCallback, useMemo, useState } from 'react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message, variant = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => remove(id), 2800);
  }, [remove]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-2xl border backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.4)]
              ${t.variant === 'success'
                ? 'bg-[#1A2E35]/80 border-[#2BB8B8]/30 text-white'
                : 'bg-[#1A2E35]/80 border-white/10 text-white'}
            `}
          >
            <p className="text-sm font-black">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

