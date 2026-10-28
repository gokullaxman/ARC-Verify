'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/components/auth/AuthContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PermissionKey, UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  requiredPermission?: PermissionKey;
  requiredRoles?: UserRole[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  requiredPermission,
  requiredRoles,
}) => {
  const { currentUser, hasPermission, hasRole, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-200">
        <div className="flex flex-col items-center gap-3 p-6 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xl max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <div>
            <h2 className="text-sm font-bold text-white">Authenticating Session</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Verifying HMAC session token & role privileges...</p>
          </div>
        </div>
      </div>
    );
  }

  const isDenied =
    (requiredPermission && !hasPermission(requiredPermission)) ||
    (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {isDenied ? (
              <AccessDenied
                currentUser={currentUser}
                requiredPermission={requiredPermission}
                requiredRoles={requiredRoles}
              />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
