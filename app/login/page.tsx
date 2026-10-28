'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  FileCheck,
  Eye,
  FileSpreadsheet,
  Landmark,
  Compass,
} from 'lucide-react';
import { DEMO_USERS } from '@/lib/mock-data';

const DEMO_ACCOUNT_PASSWORDS: Record<string, string> = {
  'superadmin@example.com': 'SuperAdmin@123',
  'admin@example.com': 'Admin@123',
  'officer@example.com': 'Officer@123',
  'verifier@example.com': 'Verifier@123',
  'operator@example.com': 'Operator@123',
  'gis@example.com': 'Gis@123',
  'auditor@example.com': 'Auditor@123',
  'viewer@example.com': 'Viewer@123',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('officer@example.com');
  const [password, setPassword] = useState('Officer@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitCredentials = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed. Please verify email and password.');
        setLoading(false);
        return;
      }

      router.push('/cases');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCredentials(email, password);
  };

  const handleFillDemoAccount = (user: (typeof DEMO_USERS)[0]) => {
    const pwd = DEMO_ACCOUNT_PASSWORDS[user.email.toLowerCase()] || '';
    setEmail(user.email);
    setPassword(pwd);
    setError(null);
  };

  const roleIcons: Record<string, any> = {
    SUPER_ADMIN: Shield,
    ADMIN: Landmark,
    REVENUE_OFFICER: FileSpreadsheet,
    VERIFICATION_OFFICER: FileCheck,
    DATA_ENTRY_OPERATOR: Users,
    GIS_OFFICER: Compass,
    AUDITOR: KeyRound,
    VIEWER: Eye,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-600"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-indigo-500 shadow flex-shrink-0 bg-slate-950 flex items-center justify-center text-white font-mono font-bold text-sm">
              AV
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono">
                SIH 2026 • Problem Statement 26261
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                ARC-Verify — Regulatory Dossier &amp; Compliance Assurance Workbench
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Signed HttpOnly Session Gateway • Scrypt Salted Password Verification
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
                  Authenticated Scrutiny Access
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">ARC-Verify Credential Sign-In</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Passwordless login-by-role is disabled. Sessions use HMAC-SHA256 signed HttpOnly cookies and salted scrypt password verification.
              </p>
            </div>
          </div>

          {error && (
            <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authentication Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <form onSubmit={handleStandardLogin} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Sign In with Email &amp; Password
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Issues an HMAC-SHA256 signed, HttpOnly session cookie (`arc_verify_session`).</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-md shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Verifying Credentials...' : 'Sign In with Password'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="lg:col-span-7">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evaluator Test Accounts (Click to Fill Email &amp; Password)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">Salted Scrypt Hashes in DB</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEMO_USERS.map((user) => {
                  const Icon = roleIcons[user.role] || Shield;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleFillDemoAccount(user)}
                      className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Icon className="w-3.5 h-3.5 text-indigo-600" />
                            {user.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            {user.role}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600">{user.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
