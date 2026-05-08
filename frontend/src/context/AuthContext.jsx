import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { AuthContext } from './AuthContextInstance.jsx';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me'); // Get user profile
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async ({ phone, password }) => {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data?.token) localStorage.setItem('token', data.token);
    await fetchMe();
    return data;
  };

  const voiceAuth = async (transcript) => {
    const { data } = await api.post('/auth/voice-auth', { transcript, action: 'login' });
    if (data?.token) localStorage.setItem('token', data.token);
    await fetchMe();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        fetchMe,
        voiceAuth,
        isAuthenticated: Boolean(user),
        role: user?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;