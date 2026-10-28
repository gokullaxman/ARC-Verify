'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Landmark, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { User, PermissionKey, UserRole } from '@/types';
import { DEMO_USERS } from '@/lib/mock-data';

interface AccessDeniedProps {
  currentUser?: User | null;
  requiredPermission?: PermissionKey;
  requiredRoles?: UserRole[];
  onSwitchUser?: (userId: string) => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentUser,
  requiredPermission,
  requiredRoles,
  onSwitchUser
}) => {
  const router = useRouter();

  const handleRoleChange = async (userId: string) => {
    if (onSwitchUser) {
      onSwitchUser(userId);
    } else {
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        window.location.reload();
      } catch (err) {
        console.error('Failed to switch role', err);
      }
    }
  };

  const getRoleDescription = (role?: UserRole) => {
    switch (role) {
      case 'VIEWER':
        return 'Citizen Public Services Liaison accounts have read-only access limited strictly to approved Records and Cadastral GIS Maps. Ingestion, verification, administrative management, and security logs are restricted.';
      case 'DATA_ENTRY_OPERATOR':
        return 'Data Entry Operators are authorized for document intake and OCR field correction only. Verification sign-offs, spatial GIS edits, audit trails, and system settings are restricted.';
      case 'AUDITOR':
        return 'Statutory Auditors hold read-only oversight permissions over Audit Trails, Analytics, and Records. Mutation, document uploading, verification triage, and configuration are restricted.';
      case 'GIS_OFFICER':
        return 'GIS Officers are restricted to spatial cadastral layers and parcel geometry editing. Verification queues, revenue approvals, and system administrative settings are restricted.';
      case 'VERIFICATION_OFFICER':
        return 'Verification Officers review queue triage and flag discrepancies. Final system configuration, root user administration, and document ingestion pipelines are restricted.';
      case 'REVENUE_OFFICER':
        return 'Revenue Officers (Tahsildars/RDOs) manage field verification, revenue sign-offs, and Bhu-Aadhaar issuance. Root system settings and user directory modifications are restricted.';
      case 'ADMIN':
        return 'Operational Administrators manage users, roles, and district progress. Root system thresholds and cryptographic policies are reserved for Super Admin.';
      default:
        return 'Your current administrative role does not possess the statutory privileges required to access this resource under DoLR guidelines.';
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-2 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-rose-200 rounded-xl shadow-lg overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-rose-50 border-b border-rose-100 p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono tracking-wider uppercase border border-rose-200">
                HTTP 403 • STATUTORY ACCESS DENIED
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Restricted Administrative Domain
            </h2>
            <p className="text-xs text-rose-700 mt-0.5">
              DoLR Protocol: Strict Separation of Administrative Concerns
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Active Session Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Officer Session:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono">
                {currentUser?.role?.replace('_', ' ') || 'UNAUTHENTICATED'}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              {currentUser?.name || 'Anonymous Session'}
            </div>
            <div className="text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Jurisdiction: {currentUser?.district || 'All Districts'} ({currentUser?.state || 'National'})</span>
              <span className="text-[11px] text-slate-500">{currentUser?.designation}</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p className="font-medium text-slate-800">
              {getRoleDescription(currentUser?.role)}
            </p>
            {requiredPermission && (
              <p className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 break-all">
                Required Security Privilege: <span className="font-bold text-indigo-700">{requiredPermission}</span>
              </p>
            )}
            {requiredRoles && requiredRoles.length > 0 && (
              <p className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200 break-all">
                Authorized Roles: <span className="font-bold text-indigo-700">{requiredRoles.join(', ')}</span>
              </p>
            )}
          </div>

          {/* Quick Evaluator Role Switcher */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hackathon Evaluator Quick Role Switcher:</span>
            </label>
            <div className="flex gap-2">
              <select
                value={currentUser?.id || DEMO_USERS[0].id}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role.replace('_', ' ')} — {u.name.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Switch back to <strong>Super Admin</strong> or an authorized officer to inspect this view.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-3 border-t border-slate-100">
            <Link
              href="/dashboard"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>
            <Link
              href="/records"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-300"
            >
              <span>View Approved Records</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
