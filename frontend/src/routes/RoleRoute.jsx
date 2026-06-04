import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextInstance.jsx';

const normalizeRole = (role) => {
  if (!role) return role;
  return role === 'user' ? 'worker' : role;
};

const RoleRoute = ({ allow, children }) => {
  const auth = useContext(AuthContext);
  const authRole = normalizeRole(auth?.role);

  console.debug('[RoleRoute]', {
    pathname: window.location.pathname,
    authReady: auth?.isReady,
    loading: auth?.loading,
    isAuthenticated: auth?.isAuthenticated,
    authRole,
    allow,
  });

  if (!auth) return <Navigate to="/login" replace />;
  if (!auth.isReady || auth.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A2E35] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2BB8B8]"></div>
          <span className="mt-4 font-medium text-white/70">Verifying permissions…</span>
        </div>
      </div>
    );
  }
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(allow) ? allow : [allow];
  if (!allowedRoles.includes(authRole)) return <Navigate to="/" replace />;

  return children;
};

export default RoleRoute;

