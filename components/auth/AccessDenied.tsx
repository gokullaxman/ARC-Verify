'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, KeyRound, LogIn } from 'lucide-react';
import { User, PermissionKey, UserRole } from '@/types';

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
}) => {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl shadow-xs text-center">
      <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-mono font-bold mb-3">
        HTTP 403 • ACCESS RESTRICTED
      </div>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Privilege Elevation Required</h2>

      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
        Your current session profile does not possess the statutory privileges required to access this workspace.
      </p>

      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500">Current Officer:</span>
          <span className="font-semibold text-slate-900">{currentUser?.name || 'Unauthenticated'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Active Role:</span>
          <span className="font-semibold text-indigo-700">{currentUser?.role || 'NONE'}</span>
        </div>
        {requiredPermission && (
          <div className="flex justify-between">
            <span className="text-slate-500">Required Privilege:</span>
            <span className="font-semibold text-rose-600">{requiredPermission}</span>
          </div>
        )}
        {requiredRoles && requiredRoles.length > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Authorized Roles:</span>
            <span className="font-semibold text-rose-600">{requiredRoles.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        <Link
          href="/login"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <LogIn className="w-4 h-4" /> Log In with Different Account
        </Link>
      </div>
    </div>
  );
};
