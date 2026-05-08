import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextInstance.jsx';

const RoleRoute = ({ allow, children }) => {
  const auth = useContext(AuthContext);

  if (!auth) return <Navigate to="/login" replace />;
  if (auth.loading) return <div className="text-gray-200">Loading…</div>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(allow) ? allow : [allow];
  if (!allowedRoles.includes(auth.role)) return <Navigate to="/" replace />;

  return children;
};

export default RoleRoute;

