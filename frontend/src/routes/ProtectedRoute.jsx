import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextInstance.jsx';

const ProtectedRoute = ({ children }) => {
  const auth = useContext(AuthContext);

  if (!auth) return <Navigate to="/login" replace />;
  if (auth.loading) return <div className="text-gray-200">Loading…</div>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;

