'use client';

import React, { useEffect, useState } from 'react';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
import { Scale, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';

export default function RulesPage() {
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('RULESET-AICTE-NEW-2024-27-V1');

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setRuleSets(json.data || []);
        }
      });
  }, []);

  const activeSet = ruleSets.find(r => r.id === selectedSetId) || ruleSets[0];

  usePageHeader({
    title: 'Versioned Regulatory Rule Sets & Source Governance',
    subtitle: 'Deterministic COMP-01 to COMP-12 Rule Registry with Source Clause & Applicability Mapping',
    requiredPermission: 'RULE_VIEW',
  });

  return (
    <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {ruleSets.map(rs => (
            <button
              key={rs.id}
              onClick={() => setSelectedSetId(rs.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                activeSet?.id === rs.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {rs.name} (v{rs.version})
            </button>
          ))}
        </div>

        {activeSet && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-2xs">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{activeSet.name}</h2>
                <p className="text-xs text-slate-600">
                  Source: <strong>{activeSet.sourceTitle}</strong> • Effective: {activeSet.effectiveFrom} to{' '}
                  {activeSet.effectiveTo || 'Current'}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-mono font-bold">
                {activeSet.sourceStatus}
              </span>
            </div>

            <div className="space-y-3">
              {activeSet.rules.map((r: any) => (
                <div key={r.ruleId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                        {r.code}
                      </span>
                      <span className="font-bold text-slate-900">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 bg-white border border-slate-300 rounded">
                        {r.sourceStatus}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                        Severity: {r.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700">{r.description}</p>
                  <div className="text-[11px] font-mono text-slate-500">
                    <strong>Clause:</strong> {r.chapterClauseAnnexure} | <strong>Guardrail:</strong>{' '}
                    {r.guardrailNote}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

  );
}
