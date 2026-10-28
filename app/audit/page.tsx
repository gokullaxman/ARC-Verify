'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
    <AppLayout
      title="Administrative Audit Trail & Security Ledger"
      subtitle="Statutory compliance log tracking document uploads, OCR extractions, human field corrections, and revenue sign-offs"
      requiredPermission="AUDIT_VIEW"
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Event Ledger ({logs.length} entries)
            </h3>
            <p className="text-[11px] text-slate-500">Tamper-evident administrative history</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-700"
            >
              <option value="ALL">All Events</option>
              <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
              <option value="FIELDS_EXTRACTED">Fields Extracted</option>
              <option value="FIELD_CORRECTED">Field Corrected (HITL)</option>
              <option value="VALIDATION_EXECUTED">Validation Executed</option>
              <option value="RECORD_APPROVED">Record Approved</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Officer / Agent</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Event Description / Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.userRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-indigo-700">
                    {log.recordId || log.documentId || 'System'}
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">
                    <div>{log.details}</div>
                    {log.previousValue !== undefined && log.newValue !== undefined && (
                      <div className="mt-1 text-[11px] font-mono bg-amber-50 p-1.5 rounded border border-amber-200">
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
    </AppLayout>
  );
}
