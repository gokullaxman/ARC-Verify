'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import {
  Shield,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  UserCheck,
  User,
  Check,
} from 'lucide-react';

const DEMO_PRESETS = [
  {
    role: 'SCRUTINY_OFFICER',
    label: 'Scrutiny Officer',
    name: 'Dr. M. S. Sundaram',
    email: 'officer@example.com',
    password: 'Officer@123',
    icon: UserCheck,
    description: 'Case scrutiny, rule verification, deficiency notices',
  },
  {
    role: 'ADMIN',
    label: 'Compliance Admin',
    name: 'Smt. Radhika Raman',
    email: 'admin@example.com',
    password: 'Admin@123',
    icon: Shield,
    description: 'Operational manager, approvals & case assignment',
  },
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    name: 'Dr. Amitabh K. Sharma',
    email: 'superadmin@example.com',
    password: 'SuperAdmin@123',
    icon: ShieldCheck,
    description: 'Full root access, audit ledger, role configuration',
  },
  {
    role: 'COMPLIANCE_AUDITOR',
    label: 'Forensic Auditor',
    name: 'Vikramaditya Bose',
    email: 'auditor@example.com',
    password: 'Auditor@123',
    icon: KeyRound,
    description: 'Forensic oversight, ledger hashes, tamper detection',
  },
  {
    role: 'APPLICANT',
    label: 'College Applicant',
    name: 'Rajesh G. Kulkarni',
    email: 'operator@example.com',
    password: 'Operator@123',
    icon: Building2,
    description: 'Institutional applicant, form & document submission',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  // Default demo mode to true on Vercel/production unless explicitly disabled with NEXT_PUBLIC_DEMO_MODE=false
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

  const [email, setEmail] = useState(isDemoMode ? 'officer@example.com' : '');
  const [password, setPassword] = useState(isDemoMode ? 'Officer@123' : '');
  const [selectedRole, setSelectedRole] = useState<string>(isDemoMode ? 'SCRUTINY_OFFICER' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectPreset = (preset: typeof DEMO_PRESETS[number]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setSelectedRole(preset.role);
    setError(null);
  };

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

      // Immediately synchronize authenticated user into client AuthContext
      if (data.data) {
        setUser(data.data);
      }

      // Direct full-window navigation ensures serverless session cookies and layouts load cleanly
      window.location.href = '/cases';
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCredentials(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-600"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border-2 border-indigo-500 shadow-xs flex-shrink-0 bg-slate-950 flex items-center justify-center text-white font-mono font-bold text-sm">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono">
                SIH 2026 • Problem Statement 26261
              </div>
              <div className="text-base font-bold text-slate-900 tracking-tight">
                ARC-Verify Platform
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                AICTE Regulatory Compliance & Multi-Document Assurance
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Signed httpOnly Session + Rate Limiter: Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-bold text-indigo-700 font-mono mb-4">
                <Shield className="w-3.5 h-3.5" /> SECURE STATUTORY SIGN-IN
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to Officer Console
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your registered credentials to access AICTE approval dossiers and verification workbenches.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleStandardLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Officer Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading ? (
                    'Authenticating...'
                  ) : (
                    <>
                      <span>Sign In to Platform</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {isDemoMode && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      1-Click Role Switcher
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-medium">
                      Demo Mode
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DEMO_PRESETS.map((preset) => {
                      const isCurrent = email === preset.email;
                      return (
                        <button
                          key={preset.role}
                          type="button"
                          onClick={() => selectPreset(preset)}
                          title={`${preset.name} (${preset.email})`}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400 font-mono mt-6">
              HMAC-SHA256 Session • Rate-Limited Authentication
            </div>
          </div>

          <div className="bg-slate-900 text-slate-200 p-8 sm:p-10 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" /> Architectural Highlights
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                AICTE Approval Process Handbook (2024–27) Scrutiny
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Deterministic validation against 12 statutory clauses (COMP-01 to COMP-12): land ownership titles, fire NOC cutoffs, FDR corpus funds, affidavit stamps, and faculty-student ratios.
              </p>

              {isDemoMode && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Quick-Fill Demo Credentials (5 Roles)
                    </div>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                      Click to auto-fill
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {DEMO_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const isCurrent = email === preset.email;
                      return (
                        <button
                          key={preset.email}
                          type="button"
                          onClick={() => selectPreset(preset)}
                          className={`w-full p-2.5 rounded-lg border text-left transition group cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? 'bg-indigo-950/80 border-indigo-500 ring-1 ring-indigo-500'
                              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-indigo-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                                isCurrent
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-indigo-950 border border-indigo-700 text-indigo-300'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition truncate">
                                  {preset.name}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-mono">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {preset.email} • <span className="text-slate-300">{preset.password}</span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono flex-shrink-0 ml-2 ${
                              isCurrent
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            }`}
                          >
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
              ARC-Verify • Smart India Hackathon 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
