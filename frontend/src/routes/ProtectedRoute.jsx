import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextInstance.jsx';

const ProtectedRoute = ({ children }) => {
  const auth = useContext(AuthContext);
  const location = useLocation();

  // Parse the URL for a token (Google Auth redirect scenario)
  const searchParams = new URLSearchParams(location.search);
  const tokenInUrl = searchParams.get('token');

  /**
   * If the AuthContext is currently fetching user data, 
   * or if we just arrived with a token in the URL that hasn't 
   * been processed by the context yet, show a loading spinner.
   */
  if (auth?.loading || (tokenInUrl && !auth?.isAuthenticated)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A2E35] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2BB8B8]"></div>
          <span className="mt-4 font-medium text-white/70">Securing your session...</span>
        </div>
      </div>
    );
  }

  /**
   * Final Guard:
   * If the context says we aren't authenticated AND there is no 
   * token in the URL to rescue us, redirect to login.
   */
  if (!auth?.isAuthenticated && !tokenInUrl) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;