'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionKey, UserRole } from '@/types';
import { DEMO_USERS } from '@/lib/mock-data';
import { hasPermission as checkPermission } from '@/lib/auth';

const DEMO_DEFAULT_PASSWORDS: Record<string, string> = {
  'superadmin@example.com': 'SuperAdmin@123',
  'admin@example.com': 'Admin@123',
  'officer@example.com': 'Officer@123',
  'verifier@example.com': 'Verifier@123',
  'operator@example.com': 'Operator@123',
  'gis@example.com': 'Gis@123',
  'auditor@example.com': 'Auditor@123',
  'viewer@example.com': 'Viewer@123',
};

interface AuthContextType {
  currentUser: User;
  loading: boolean;
  switchUser: (userId: string, password?: string) => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: DEMO_USERS[0],
  loading: true,
  switchUser: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
  refreshSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCurrentUser(data.data);
        }
      }
    } catch {
      // session unauthenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const switchUser = async (userId: string, explicitPassword?: string) => {
    const user = DEMO_USERS.find(u => u.id === userId);
    if (!user) return;
    const password = explicitPassword || DEMO_DEFAULT_PASSWORDS[user.email.toLowerCase()] || '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentUser(data.data);
      }
    } catch (err) {
      console.error('Switch user error:', err);
    }
  };

  const hasPerm = (permission: PermissionKey): boolean => {
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
        switchUser,
        hasPermission: hasPerm,
        hasRole,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
