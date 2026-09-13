import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../services/api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check URL parameters for OAuth errors on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
      // Clean error parameter from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Check current session on mount
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authApi.getCurrentUser();
      if (res && res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      // Unauthenticated session
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loginWithGoogle = () => {
    authApi.loginWithGoogle();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout notification error:', err.message);
    } finally {
      setUser(null);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const value = {
    user,
    isAdmin: user?.role === 'ADMIN',
    isAuthenticated: Boolean(user),
    isLoading,
    authError,
    loginWithGoogle,
    logout,
    clearAuthError,
    refreshUser: checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
