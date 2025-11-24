// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginWithPassword, me, logoutAppUser, setAuthToken } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('hv_token');
        if (token) {
          setAuthToken(token);
          const profile = await me().catch(() => null);
          if (profile) setUser(profile);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (destination, password) => {
    const { token, app_user } = await loginWithPassword(destination, password);
    setAuthToken(token);
    await SecureStore.setItemAsync('hv_token', token);
    setUser(app_user);
    return app_user;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('hv_token');
    setAuthToken(null);
    setUser(null);
    try { await logoutAppUser(); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
