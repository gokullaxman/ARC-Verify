'use client';

import React, { useEffect, useState } from 'react';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  UserCheck,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AuditLog } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [chainIntegrity, setChainIntegrity] = useState<{
    valid: boolean;
    totalEventsChecked: number;
    brokenAtIndex?: number;
  } | null>(null);

  usePageHeader({
    title: 'Administrative Audit Trail & Security Ledger',
    subtitle: 'Tamper-evident HMAC-SHA256 ledger tracking regulatory filings, document uploads, and human verification sign-offs',
    requiredPermission: 'AUDIT_VIEW',
  });

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const url = new URL('/api/audit', window.location.origin);
      if (actionFilter !== 'ALL') url.searchParams.set('action', actionFilter);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.data || []);
          if (data.chainIntegrity) {
            setChainIntegrity(data.chainIntegrity);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Cryptographic Ledger Health Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {chainIntegrity?.valid !== false ? (
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>HMAC-SHA256 Hash Chain: Verified Cryptographically Intact</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Tamper Alert: Ledger Sequence Compromised at Index {chainIntegrity?.brokenAtIndex}</span>
            </div>
          )}
          <span className="text-slate-500 font-mono">
            ({chainIntegrity?.totalEventsChecked ?? logs.length} immutable events chained)
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Algorithm: HMAC-SHA256 • Storage: SQLite WAL Ledger
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Tamper-Evident System Journal</h2>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Recorded Actions</option>
              <option value="DOCUMENT_ATTACHED_TO_DOSSIER">Document Ingestion</option>
              <option value="CASE_ANALYZE">Compliance Scrutiny Run</option>
              <option value="REVIEW_DECISION_RECORDED">Review Decisions</option>
              <option value="FIELD_MANUALLY_CORRECTED">HITL Corrections</option>
              <option value="USER_LOGIN">User Logins</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Officer / Actor</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Associated Target</th>
                <th className="px-4 py-3">Operational Details</th>
                <th className="px-4 py-3">Ledger Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading cryptographically verifiable ledger entries...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No audit logs matching selection filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const timestampStr = log.timestamp || (log as any).timestampUtc;
                  const userNameStr = log.userName || (log as any).actorName || 'System';
                  const userRoleStr = log.userRole || (log as any).actorRole || 'SYSTEM';
                  const targetStr = log.recordId || log.documentId || log.caseId || (log as any).entityId || '—';
                  const eventHashStr = log.eventHash || (log as any).event_hash;

                  let detailsText = '';
                  if (typeof log.details === 'string') {
                    detailsText = log.details;
                  } else if (typeof log.details === 'object' && log.details !== null) {
                    detailsText = JSON.stringify(log.details);
                  } else {
                    detailsText = (log as any).reason || 'System event recorded';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(timestampStr)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{userNameStr}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{userRoleStr}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-indigo-600 whitespace-nowrap">
                        {targetStr}
                      </td>
                      <td className="px-4 py-3 max-w-md truncate text-slate-600">
                        {detailsText}
                        {log.fieldName && (
                          <div className="mt-0.5 text-[11px] font-mono">
                            <span className="text-slate-400 mr-1">Field [{log.fieldName}]:</span>
                            <span className="text-rose-700 line-through mr-2">Old: {log.previousValue}</span>
                            <span className="text-emerald-700 font-bold">New: {log.newValue}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {eventHashStr ? (
                          <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                            {eventHashStr.slice(0, 10)}...
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
