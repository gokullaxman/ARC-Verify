'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  Scale,
  BarChart3,
  History,
  Settings,
  Users,
  KeyRound,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_USERS } from '@/lib/mock-data';
import { hasPermission } from '@/lib/auth';

interface SidebarProps {
  currentUser?: any;
  onSwitchUser?: (userId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser = DEMO_USERS[0],
  onSwitchUser,
  isOpen = false,
  onClose
}) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Application Dossiers', href: '/cases', icon: FolderKanban, badge: '4', badgeColor: 'bg-indigo-100 text-indigo-800', permission: 'RECORD_VIEW' },
    { name: 'Document Intake & OCR', href: '/documents/upload', icon: FileText, permission: 'DOCUMENT_VIEW' },
    { name: 'Scrutiny Workbench', href: '/verification', icon: CheckSquare, badge: '3', badgeColor: 'bg-amber-100 text-amber-800', permission: 'VERIFICATION_VIEW' },
    { name: 'Regulatory Rule Sets', href: '/rules', icon: Scale, badge: 'COMP-12', badgeColor: 'bg-emerald-100 text-emerald-800', permission: 'RECORD_VIEW' },
    { name: 'Audit Hash Ledger', href: '/audit', icon: History, permission: 'AUDIT_VIEW' },
    { name: 'Assurance Analytics', href: '/analytics', icon: BarChart3, permission: 'ANALYTICS_VIEW' },
    { name: 'Users & Officers', href: '/users', icon: Users, permission: 'USER_VIEW' },
    { name: 'Roles & Access Policy', href: '/roles', icon: KeyRound, permission: 'ROLE_VIEW' },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'System Settings', href: '/settings', icon: Settings, permission: 'SYSTEM_SETTINGS' },
  ];

  const visibleNavItems = navItems.filter(
    item => !item.permission || hasPermission(currentUser, item.permission as any)
  );

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 text-slate-300 z-50',
          'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:z-auto h-full min-h-screen',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-indigo-400/80 shadow-md flex-shrink-0 bg-indigo-950 flex items-center justify-center ring-2 ring-indigo-500/30">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono leading-tight">
                  SIH 2026 • PS 26261
                </div>
                <div className="text-sm font-bold text-white tracking-tight">ARC-Verify Platform</div>
                <div className="text-[10px] text-slate-400 font-mono">Dossier & Rule Scrutiny</div>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
                title="Close Navigation"
              >
                <span className="text-lg font-bold leading-none">&times;</span>
              </button>
            )}
          </div>

          <div className="mt-3 text-[10px] px-2.5 py-1 bg-amber-950/50 border border-amber-800/60 rounded text-amber-300 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>GIGW 3.0 • NIC MEGHRAJ READY</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider">
            Regulatory Scrutiny & Assurance
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border-l-4 border-indigo-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-slate-500')} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono font-bold', item.badgeColor || 'bg-slate-800 text-slate-300')}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Active Role Session</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              {currentUser?.role?.replace('_', ' ')}
            </span>
          </div>

          {onSwitchUser && (
            <div>
              <select
                value={currentUser?.id || DEMO_USERS[0].id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role.replace('_', ' ')}: {u.name.split(',')[0].slice(0, 20)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
            <span className="truncate">Domain:</span>
            <span className="text-slate-200 font-bold truncate max-w-[130px]">AICTE 2024–27 + Generic</span>
          </div>
        </div>
      </aside>
    </>
  );
};
