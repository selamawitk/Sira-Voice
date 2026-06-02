import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api.js';
import { AuthContext } from './AuthContextInstance.jsx';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const normalizeRole = (role) => {
  if (!role) return role;
  return role === 'user' ? 'worker' : role;
};

const resolveResponsePayload = (response) => {
  if (!response || typeof response !== 'object') return null;
  const body = response.data;
  if (!body || typeof body !== 'object') return body;
  if (body.data !== undefined) return body.data;
  return body;
};

const resolveUserPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.user !== undefined) return payload.user;
  return payload;
};

const resolveToken = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return payload.token || payload?.data?.token || null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const authRequestId = useRef(0);

  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common.Authorization;
    }
  };

  const clearAuthState = useCallback(() => {
    authRequestId.current += 1;
    setAuthToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    setInitializing(false);
  }, [clearAuthState]);

  const fetchMe = useCallback(
    async ({ logoutOnFailure = true } = {}) => {
      const requestId = ++authRequestId.current;
      setLoading(true);

      try {
        const token = localStorage.getItem('token');

        if (!token) {
          if (logoutOnFailure) {
            clearAuthState();
          }
          return null;
        }

        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        const response = await api.get('/auth/me');
        const payload = resolveResponsePayload(response);
        const userData = resolveUserPayload(payload);

        if (!userData || (typeof userData === 'object' && !userData.role && !userData._id)) {
          if (logoutOnFailure) {
            clearAuthState();
          }
          return null;
        }

        if (authRequestId.current !== requestId) {
          return null;
        }

        const normalizedUser = {
          ...userData,
          role: normalizeRole(userData.role),
        };

        setUser(normalizedUser);
        return normalizedUser;
      } catch (error) {
        const status = error?.response?.status;
        const isAuthError = status === 401 || status === 403;

        if (isAuthError && logoutOnFailure) {
          clearAuthState();
        }

        return null;
      } finally {
        if (authRequestId.current === requestId) {
          setLoading(false);
        }
      }
    },
    [clearAuthState]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('token');

      if (tokenFromUrl) {
        setAuthToken(tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const token = localStorage.getItem('token');
      if (!token) {
        clearAuthState();
        setInitializing(false);
        return;
      }

      await fetchMe();
      setInitializing(false);
    };

    initializeAuth();
  }, [fetchMe, clearAuthState]);

  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
    };

    window.addEventListener('auth_logout', handleAuthLogout);
    return () => window.removeEventListener('auth_logout', handleAuthLogout);
  }, [logout]);

  const login = useCallback(
    async ({ email, password }) => {
      setLoading(true);
      const requestId = ++authRequestId.current;

      try {
        const response = await api.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });

        const payload = resolveResponsePayload(response);
        const token = resolveToken(payload);
        const loginUser = resolveUserPayload(payload);

        if (!token) {
          throw new Error('Authentication token missing from response');
        }

        setAuthToken(token);

        const normalizedUser = loginUser
          ? {
              ...loginUser,
              role: normalizeRole(loginUser.role),
            }
          : null;

        if (normalizedUser) {
          setUser(normalizedUser);
        }

        const verifiedUser = await fetchMe({ logoutOnFailure: true });
        const finalUser = verifiedUser || normalizedUser;

        if (!finalUser) {
          throw new Error('Unable to verify authenticated user after login.');
        }

        setUser(finalUser);

        return {
          token,
          user: {
            _id: finalUser._id,
            fullName: finalUser.fullName,
            email: finalUser.email,
            role: finalUser.role,
          },
        };
      } finally {
        if (authRequestId.current === requestId) {
          setLoading(false);
        }
      }
    },
    [fetchMe]
  );

  const register = useCallback(
    async (payload) => {
      const response = await api.post('/auth/register', payload);
      const payloadData = resolveResponsePayload(response);
      const token = resolveToken(payloadData);
      const registerUser = resolveUserPayload(payloadData);

      if (!token) {
        throw new Error('Authentication token missing');
      }

      setAuthToken(token);

      const normalizedUser = registerUser
        ? {
            ...registerUser,
            role: normalizeRole(registerUser.role),
          }
        : null;

      if (normalizedUser) {
        setUser(normalizedUser);
      }

      fetchMe({ logoutOnFailure: false })
        .then((me) => {
          if (me) {
            setUser(me);
          }
        })
        .catch((error) => {
          console.warn('Register background profile refresh failed:', error);
        });

      return payloadData;
    },
    [fetchMe]
  );

  const registerPasskey = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token missing');
    }

    const { data: options } = await api.get('/auth/passkey/register-options');
    const attestationResponse = await startRegistration(options);
    const { data: verification } = await api.post('/auth/passkey/verify-registration', attestationResponse);

    return verification;
  }, []);

  const loginWithPasskey = useCallback(
    async (email) => {
      const { data: options } = await api.post('/auth/passkey/login-options', {
        email: email.trim().toLowerCase(),
      });

      const assertionResponse = await startAuthentication(options);
      const response = await api.post('/auth/passkey/verify-login', {
        email: email.trim().toLowerCase(),
        body: assertionResponse,
      });

      const payload = resolveResponsePayload(response);
      const token = resolveToken(payload);
      const loginUser = resolveUserPayload(payload);

      if (!token) {
        throw new Error('Authentication token missing');
      }

      setAuthToken(token);

      const normalizedUser = loginUser
        ? {
            ...loginUser,
            role: normalizeRole(loginUser.role),
          }
        : null;

      if (normalizedUser) {
        setUser(normalizedUser);
      }

      fetchMe({ logoutOnFailure: false })
        .then((me) => {
          if (me) {
            setUser(me);
          }
        })
        .catch((error) => {
          console.warn('Passkey login background profile refresh failed:', error);
        });

      return {
        token,
        user: normalizedUser
          ? {
              _id: normalizedUser._id,
              fullName: normalizedUser.fullName,
              role: normalizedUser.role,
            }
          : null,
      };
    },
    [fetchMe]
  );

  const normalizedRole = normalizeRole(user?.role);

  const authValue = useMemo(
    () => ({
      user,
      loading,
      initializing,
      isReady: !initializing,
      login,
      register,
      logout,
      fetchMe,
      registerPasskey,
      loginWithPasskey,
      isAuthenticated: !!user?._id,
      role: normalizedRole || null,
    }),
    [user, loading, initializing, login, register, logout, fetchMe, registerPasskey, loginWithPasskey, normalizedRole]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
