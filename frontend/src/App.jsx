import React from 'react';
import AppRouter from './routes/AppRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ToastProvider } from './components/ui/ToastProvider.jsx';

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <LanguageProvider>
          <LocationProvider>
            <AppRouter />
          </LocationProvider>
        </LanguageProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;