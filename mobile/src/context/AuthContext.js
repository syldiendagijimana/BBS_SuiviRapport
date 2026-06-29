//src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export { AuthContext };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const savedToken = await AsyncStorage.getItem('bbs_token');
      if (savedToken) {
        const me = await authAPI.me();
        setUser(me);
        setToken(savedToken);
      }
    } catch {
      await AsyncStorage.removeItem('bbs_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await authAPI.login(email, password);
    await AsyncStorage.setItem('bbs_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try { await authAPI.logout(); } catch {}
    await AsyncStorage.removeItem('bbs_token');
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';
  const isSuperviseur = user?.role === 'superviseur';
  const isTechnicien = user?.role === 'technicien';
  const canManageUsers = isAdmin;
  const canManageTechniciens = isAdmin || isSuperviseur;

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAdmin, isSuperviseur, isTechnicien,
      canManageUsers, canManageTechniciens
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
