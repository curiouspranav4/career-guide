'use client';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { getProfile } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getProfile();
      if (data) {
        const normalized = {
          id: data._id || data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          plan: data.plan,
          credits: data.credits,
          companyName: data.companyName,
          recruiterStatus: data.recruiterStatus,
        };
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        return normalized;
      }
    } catch {
      // Ignore if token expired or offline
    }
    return null;
  }, []);

  const isJobSeeker =
    user?.role === 'job_seeker_fresher' ||
    user?.role === 'job_seeker_experienced';
  const isFresher = user?.role === 'job_seeker_fresher';
  const isRecruiter = user?.role === 'recruiter';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
        isJobSeeker,
        isFresher,
        isRecruiter,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}