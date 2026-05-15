import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { AuthContext } from './AuthContextInstance.jsx';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common.Authorization;
    }
  };

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        return null;
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch (error) {
      console.error("FetchMe error:", error);
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const handleUrlToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        setAuthToken(token);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        await fetchMe();
      } else {
        fetchMe();
      }
    };

    handleUrlToken();
  }, [fetchMe]);

  const login = async ({ phone, password }) => {
    const { data } = await api.post('/auth/login', { phone, password });
    if (data?.token) {
      setAuthToken(data.token);
      await fetchMe();
    }
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data?.token) {
      setAuthToken(data.token);
      await fetchMe();
    }
    return data;
  };

  /**
   * UPDATED: registerPasskey
   * Now explicitly ensures the token is present before calling options
   * to avoid "Not Authorized" errors.
   */
  const registerPasskey = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error("Authentication token missing. Please log in again.");
    }

    try {
      // 1. Get Registration Options
      // We explicitly set the header here to be 100% safe
      const { data: options } = await api.get('/auth/passkey/register-options', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Start Biometric Ceremony
      const attestationResponse = await startRegistration(options);

      // 3. Verify Registration with Backend
      const { data: verification } = await api.post(
        '/auth/passkey/verify-registration', 
        attestationResponse,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return verification;
    } catch (err) {
      console.error("Passkey registration error:", err);
      throw err;
    }
  };

  const loginWithPasskey = async (phone) => {
    // Note: Login is public, so we don't need a token here
    const { data: options } = await api.post('/auth/passkey/login-options', { phone });
    
    const assertionResponse = await startAuthentication(options);
    
    const { data } = await api.post('/auth/passkey/verify-login', {
      phone,
      body: assertionResponse,
    });

    if (data?.token) {
      setAuthToken(data.token);
      await fetchMe();
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        fetchMe,
        registerPasskey,
        loginWithPasskey,
        isAuthenticated: Boolean(user),
        role: user?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;