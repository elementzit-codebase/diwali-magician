import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setLoading(true);
    try {
      const statusRes = await api.get('/api/auth/setup-status');
      setSetupRequired(statusRes.setupRequired);

      if (!statusRes.setupRequired) {
        try {
          const meRes = await api.get('/api/auth/me');
          setAdmin(meRes.admin);
        } catch (err) {
          setAdmin(null);
        }
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    setAdmin(res.admin);
    return res;
  }

  async function setup(fullName, email, password) {
    const res = await api.post('/api/auth/setup', { fullName, email, password });
    setAdmin(res.admin);
    setSetupRequired(false);
    return res;
  }

  async function logout() {
    await api.post('/api/auth/logout');
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        setupRequired,
        login,
        setup,
        logout,
        checkStatus,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

