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
  );
};

export default App;