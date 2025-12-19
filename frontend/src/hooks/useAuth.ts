// GenAgenTa - Auth Hook

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import type { AuthState } from '../types';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    personalAccess: false,
    isLoading: true,
  });

  // Verifica token all'avvio
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      try {
        const user = await api.getMe();
        setState({
          user,
          token,
          personalAccess: false,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem('token');
        setState({
          user: null,
          token: null,
          personalAccess: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    setState({
      user,
      token,
      personalAccess: false,
      isLoading: false,
    });
    return user;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setState({
      user: null,
      token: null,
      personalAccess: false,
      isLoading: false,
    });
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const { personal_access } = await api.verifyPin(pin);
    setState((s) => ({ ...s, personalAccess: personal_access }));
    return personal_access;
  }, []);

  const exitPersonalMode = useCallback(() => {
    // Resetta al token normale (senza accesso personale)
    setState((s) => ({ ...s, personalAccess: false }));
  }, []);

  return {
    user: state.user,
    isAuthenticated: !!state.user,
    personalAccess: state.personalAccess,
    isLoading: state.isLoading,
    login,
    logout,
    verifyPin,
    exitPersonalMode,
  };
}
