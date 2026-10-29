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
  FileText
} from 'lucide-react';
import { AuditLog } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');

  usePageHeader({
    title: 'Administrative Audit Trail & Security Ledger',
    subtitle: 'Statutory compliance log tracking document uploads, OCR extractions, human field corrections, and revenue sign-offs',
    requiredPermission: 'AUDIT_VIEW',
  });

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  async function fetchLogs() {
    try {
      const url = new URL('/api/audit', window.location.origin);
      if (actionFilter !== 'ALL') url.searchParams.set('action', actionFilter);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }

  return (
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
            <option value="DOCUMENT_UPLOADED">Document Ingestion</option>
            <option value="OCR_EXTRACTION_SUCCESS">OCR Inferences</option>
            <option value="FIELD_MANUALLY_CORRECTED">HITL Corrections</option>
            <option value="RECORD_VERIFIED">Officer Approval</option>
            <option value="RECORD_REJECTED">Officer Rejections</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Timestamp (UTC+5:30)</th>
              <th className="px-4 py-3">Officer / Actor</th>
              <th className="px-4 py-3">Action Event</th>
              <th className="px-4 py-3">Associated Target</th>
              <th className="px-4 py-3">Operational Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading cryptographically verifiable ledger entries...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No audit logs matching selection filter.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-semibold text-slate-900">{log.userName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-indigo-600 whitespace-nowrap">
                  {log.recordId || log.documentId || log.caseId || '—'}
                </td>
                <td className="px-4 py-3 max-w-md truncate text-slate-600">
                  {log.details || 'System event committed'}
                  {log.fieldName && (
                    <div className="mt-0.5 text-[11px] font-mono">
                      <span className="text-slate-400 mr-1">Field [{log.fieldName}]:</span>
                      <span className="text-rose-700 line-through mr-2">Old: {log.previousValue}</span>
                      <span className="text-emerald-700 font-bold">New: {log.newValue}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
