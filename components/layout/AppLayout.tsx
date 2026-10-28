'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/components/auth/AuthContext';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PermissionKey, UserRole } from '@/types';

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
  requiredRoles
}) => {
  const { currentUser, switchUser, hasPermission, hasRole, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isDenied =
    (requiredPermission && !hasPermission(requiredPermission)) ||
    (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        onSwitchUser={switchUser}
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
                onSwitchUser={switchUser}
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
