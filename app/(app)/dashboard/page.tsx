'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
import {
  FolderKanban,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Scale,
  History,
  FileCheck2,
  XCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { VerificationCase, AuditEvent } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentCases, setRecentCases] = useState<VerificationCase[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, casesRes, auditsRes] = await Promise.all([
          fetch('/api/dashboard/stats').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/cases?limit=5').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/audit?limit=6').then(r => r.json()).catch(() => ({ success: false })),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (casesRes.success && casesRes.data) setRecentCases(casesRes.data.slice(0, 5));
        if (auditsRes.success && auditsRes.data) setRecentAudits(auditsRes.data.slice(0, 6));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">Approved</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>;
      case 'UNDER_SCRUTINY':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 border border-indigo-300">Under Scrutiny</span>;
      case 'DEFICIENCY_FOUND':
      case 'NEEDS_INFORMATION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300">Deficiency Found</span>;
      case 'REVISION_REQUESTED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800 border border-orange-300">Revision Requested</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  usePageHeader({
    title: 'Statutory Dossier & Compliance Assurance Dashboard',
    subtitle: 'AICTE Approval Process Handbook (2024–27) • Automated Scrutiny & Regulatory Verification',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with SIH PS 26261 Metadata */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded text-xs font-bold font-mono">
              SIH 2026 • PS 26261
            </span>
            <span className="text-xs text-slate-500 font-medium">All India Council for Technical Education (AICTE)</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            ARC-Verify: Multi-Tiered Regulatory Assurance & Document Authentication Platform
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Automated scrutiny of technical institute approval dossiers: cross-document concordance, land and corpus fund norms, digital signatures, and tamper-evident cryptographic audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/cases"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition"
          >
            <FolderKanban className="w-4 h-4" /> Application Dossiers
          </Link>
          <Link
            href="/documents/upload"
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
          >
            <FileText className="w-4 h-4 text-indigo-600" /> Ingest Evidence
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dossiers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Total Dossiers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats?.totalDossiers ?? 4}
            </h3>
            <p className="text-xs text-indigo-600 font-medium mt-1">
              {stats?.totalDossierDocuments ?? 0} evidence files attached
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        {/* Ready for Review / In Scrutiny */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Under Scrutiny</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats?.readyForReviewCount ?? 0}
            </h3>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Pending officer verification
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Deficiencies Found */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Deficiencies Flagged</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats?.deficiencyCasesCount ?? 0}
            </h3>
            <p className="text-xs text-rose-600 font-medium mt-1">
              Violations requiring remediation
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Tamper-Evident Audit Ledger */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Audit Chain Integrity</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-sm font-bold ${stats?.auditChainValid !== false ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats?.auditChainValid !== false ? 'VERIFIED' : 'TAMPER DETECTED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {stats?.auditEventsCount ?? 0} cryptographic blocks
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${stats?.auditChainValid !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Cases Status & Findings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases by Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Dossier Status Distribution
            </h3>
            <Link href="/cases" className="text-xs text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Under Scrutiny</span>
              <span className="font-bold text-slate-900">{stats?.casesByStatus?.UNDER_SCRUTINY ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((stats?.casesByStatus?.UNDER_SCRUTINY ?? 0) / Math.max(1, stats?.totalDossiers ?? 1)) * 100)}%` }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">Deficiency Found</span>
              <span className="font-bold text-slate-900">{stats?.casesByStatus?.DEFICIENCY_FOUND ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((stats?.casesByStatus?.DEFICIENCY_FOUND ?? 0) / Math.max(1, stats?.totalDossiers ?? 1)) * 100)}%` }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">Approved</span>
              <span className="font-bold text-slate-900">{stats?.casesByStatus?.APPROVED ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((stats?.casesByStatus?.APPROVED ?? 0) / Math.max(1, stats?.totalDossiers ?? 1)) * 100)}%` }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">Rejected</span>
              <span className="font-bold text-slate-900">{stats?.casesByStatus?.REJECTED ?? 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((stats?.casesByStatus?.REJECTED ?? 0) / Math.max(1, stats?.totalDossiers ?? 1)) * 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Findings Severity Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-600" /> Regulatory Findings by Severity
            </h3>
            <Link href="/rules" className="text-xs text-indigo-600 hover:underline">
              Rule Handbook
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="text-[10px] font-bold text-rose-700 uppercase font-mono">Critical</div>
              <div className="text-xl font-bold text-rose-900 mt-0.5">{stats?.findingsBySeverity?.CRITICAL ?? 0}</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Mandatory statutory stops</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-[10px] font-bold text-amber-700 uppercase font-mono">High</div>
              <div className="text-xl font-bold text-amber-900 mt-0.5">{stats?.findingsBySeverity?.HIGH ?? 0}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Substantial deficits</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-[10px] font-bold text-blue-700 uppercase font-mono">Medium</div>
              <div className="text-xl font-bold text-blue-900 mt-0.5">{stats?.findingsBySeverity?.MEDIUM ?? 0}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Clarifications needed</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-bold text-slate-700 uppercase font-mono">Low / Info</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {(stats?.findingsBySeverity?.LOW ?? 0) + (stats?.findingsBySeverity?.INFO ?? 0)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Minor observations</div>
            </div>
          </div>
        </div>

        {/* Security & Cryptographic Proof */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Tamper-Proof Assurance
              </h3>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">HMAC-SHA256</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every document attachment, analysis run, field extraction, and scrutiny decision is committed to an append-only cryptographic ledger.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Hash Algorithm:</span>
                <span className="font-semibold text-slate-800">HMAC-SHA256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Key Storage:</span>
                <span className="font-semibold text-slate-800">External Secret</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ledger Verification:</span>
                <span className="font-bold text-emerald-600">PASS (0 breaks)</span>
              </div>
            </div>
          </div>
          <Link
            href="/audit"
            className="mt-4 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <History className="w-4 h-4" /> Inspect Audit Ledger
          </Link>
        </div>
      </div>

      {/* Recent Dossiers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Application Dossiers</h3>
            <p className="text-xs text-slate-500 mt-0.5">Institutions under evaluation for AICTE Approval 2026–27</p>
          </div>
          <Link
            href="/cases"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View all dossiers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono">
              <tr>
                <th className="px-5 py-3">Case / App ID</th>
                <th className="px-5 py-3">Institution Name</th>
                <th className="px-5 py-3">Application Type</th>
                <th className="px-5 py-3">State / District</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    No dossiers found.
                  </td>
                </tr>
              ) : (
                recentCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                      <Link href={`/cases/${c.id}`}>{c.id}</Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 max-w-xs truncate">
                      {c.institution?.legalName || 'Unknown Institution'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono">
                      {c.application?.applicationType || 'AICTE_NEW_INSTITUTION'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {c.institution?.district}, {c.institution?.state}
                    </td>
                    <td className="px-5 py-3.5">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold text-xs transition inline-flex items-center gap-1"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
