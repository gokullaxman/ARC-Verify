'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  FileText,
} from 'lucide-react';

export default function VerificationQueuePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCases(data.data);
        }
      })
      .catch(err => console.error('Failed to load dossier verification queue', err))
      .finally(() => setLoading(false));
  }, []);

  usePageHeader({
    title: 'Human-in-the-Loop (HITL) Dossier Scrutiny Queue',
    subtitle: 'Administrative triage for regulatory dossiers with missing annexures, cross-document discrepancies, or inconclusive forensic indicators',
    requiredPermission: 'VERIFICATION_VIEW',
  });

  return (
    <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-950">
              ARC-Verify Assurance Principle: AI Extracts Evidence • Rules Evaluate • Authorized Officers Decide
            </div>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Experimental forensic heuristics (ELA recompression, Laplacian sharpness, HSV seal masks) and fuzzy orthographic entity matches never auto-reject a dossier. All flagged items route here for human Scrutiny Officer decision recording.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Active Scrutiny Dossiers ({cases.length})
              </h3>
              <p className="text-[11px] text-slate-500">Ordered by deficiency status and regulatory profile</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded font-semibold">
              SIH 26261 Workbench
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading scrutiny queue...</div>
            ) : cases.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">Queue Cleared!</div>
              </div>
            ) : (
              cases.map((c) => (
                <div key={c.id} className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{c.id}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono">
                        {c.application?.applicationType}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-mono font-bold">
                        {c.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {c.institution?.legalName} • <span className="text-slate-500">{c.institution?.trustOrSocietyName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {c.documentCount || 0} Annexures
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> {c.findingsCount || 0} Evaluated Rules
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/cases/${c.id}`}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <span>Open Scrutiny Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

  );
}
