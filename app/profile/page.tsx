'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/components/auth/AuthContext';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Building,
  MapPin,
  Lock,
  CheckCircle2,
  Calendar,
  Layers,
  Fingerprint
} from 'lucide-react';
import { User } from '@/types';

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPass !== confirmPass) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setSavingPass(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          newPassword: newPass
        })
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error occurred.' });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <AppLayout
      title="Official Personnel Profile & Jurisdiction"
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
    >
      <div className="max-w-5xl w-full mx-auto space-y-6">
          {/* Official ID Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-amber-600 via-indigo-600 to-emerald-600"></div>
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 border-2 border-indigo-200 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{currentUser?.name}</h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      {currentUser?.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {currentUser?.designation} • {currentUser?.department}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Employee ID: <span className="text-slate-700 font-semibold">{currentUser?.employeeId}</span>
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 w-full sm:w-auto">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Assigned Role</div>
                <div className="text-sm font-bold text-indigo-700 font-mono mt-0.5">
                  {currentUser?.role.replace('_', ' ')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {currentUser?.permissions?.length || 0} capabilities authorized
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Jurisdiction & Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Jurisdiction Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Administrative Revenue Jurisdiction</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">State Jurisdiction</span>
                    <span className="font-bold text-slate-900 text-sm">{currentUser?.state || 'Tamil Nadu'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Revenue District</span>
                    <span className="font-bold text-slate-900 text-sm">{currentUser?.district || 'Madurai'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Sub-Division / Taluk</span>
                    <span className="font-bold text-slate-800">{currentUser?.taluk || 'All Taluks (State/District Scope)'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Village / Revenue Circle</span>
                    <span className="font-bold text-slate-800">{currentUser?.village || 'All Revenue Villages'}</span>
                  </div>
                </div>
              </div>

              {/* Authorized Security Permissions */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Authorized Capabilities ({currentUser?.permissions?.length || 0})</span>
                </h3>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                  {currentUser?.permissions?.map(perm => (
                    <span
                      key={perm}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Password & Session */}
            <div className="space-y-6">
              {/* Change Password Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Update Password</span>
                </h3>

                {message && (
                  <div
                    className={`p-3 rounded-md text-xs mb-4 ${
                      message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPass}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded shadow transition disabled:opacity-50"
                  >
                    {savingPass ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>

              {/* Session Security Details */}
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                  <Fingerprint className="w-4 h-4" />
                  <span>NIC Network Security</span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 space-y-1">
                  <div>Session: <span className="text-emerald-400">ENCRYPTED (TLS 1.3)</span></div>
                  <div>Origin IP: 127.0.0.1 (NIC Intranet)</div>
                  <div>Auth Method: Role Token Session</div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </AppLayout>
  );
}
