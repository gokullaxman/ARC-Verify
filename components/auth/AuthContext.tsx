'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionKey, UserRole } from '@/types';
import { hasPermission as checkPermission } from '@/lib/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshSession: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  hasPermission: () => false,
  hasRole: () => false,
  refreshSession: async () => {},
  setUser: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCurrentUser(data.data);
          return;
        }
      }
      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setUser = (user: User | null) => {
    setCurrentUser(user);
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setCurrentUser(null);
      window.location.href = '/login';
    }
  };

  const hasPerm = (permission: PermissionKey): boolean => {
    if (!currentUser) return false;
    return checkPermission(currentUser, permission);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return roles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        hasPermission: hasPerm,
        hasRole,
        refreshSession: fetchSession,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
