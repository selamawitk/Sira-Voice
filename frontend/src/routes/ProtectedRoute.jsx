import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextInstance.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isReady, user } = useContext(AuthContext);
  const location = useLocation();

  console.debug('[ProtectedRoute]', {
    pathname: location.pathname,
    isReady,
    loading,
    isAuthenticated,
    userExists: !!user,
  });

  // 1. If we are still checking the token or completing auth bootstrap, show loading
  if (!isReady || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A2E35] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2BB8B8]"></div>
          <span className="mt-4 font-medium text-white/70">Securing your session...</span>
        </div>
      </div>
    );
  }

  // 2. If finished loading and not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Otherwise, render the protected content
  return children;
};

export default ProtectedRoute;