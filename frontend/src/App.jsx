import React from 'react';
import AppRouter from './routes/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ToastProvider } from './components/ui/ToastProvider.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

const App = () => {
  console.debug('[App render]');
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#2BB8B8] focus:text-slate-950 focus:rounded-2xl focus:font-black focus:outline-none">
        Skip to content
      </a>
      <div id="main-content">
      <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <LanguageProvider>
            <LocationProvider>
              <AppRouter />
            </LocationProvider>
          </LanguageProvider>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
      </div>
    </>
  );
};

export default App;