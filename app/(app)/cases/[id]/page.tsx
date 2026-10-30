'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
import {
  ArrowLeft,
  Play,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Download,
  Scale,
  Sliders,
  History,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export default function CaseDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'FINDINGS' | 'CONCORDANCE' | 'DOCUMENTS_FORENSICS' | 'WHAT_IF_SIMULATOR' | 'REPORT'
  >('FINDINGS');
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [decisionType, setDecisionType] = useState('REQUEST_CLARIFICATION_OR_DOCUMENTS');
  const [decisionReason, setDecisionReason] = useState('');
  const [simLandAcres, setSimLandAcres] = useState<string>('7.8');
  const [simBuiltUpSqm, setSimBuiltUpSqm] = useState<string>('13000');
  const [simStampRs, setSimStampRs] = useState<string>('100');
  const [simFdrLakhs, setSimFdrLakhs] = useState<string>('40');
  const [simFireExpiry, setSimFireExpiry] = useState<string>('2027-12-31');
  const [simResult, setSimResult] = useState<any>(null);
  const [runningSim, setRunningSim] = useState<boolean>(false);

  usePageHeader({
    title: loading || !data
      ? `Dossier Scrutiny: ${id || ''}`
      : `Dossier Workbench: ${data.dossier.id} — ${data.dossier.institution.legalName}`,
    subtitle: data
      ? `Rule Profile: ${data.ruleSet.name} (v${data.ruleSet.version})`
      : 'Loading dossier assurance workbench...',
    requiredPermission: 'CASE_VIEW',
  });

  async function loadCase() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  async function handleRunAnalysis() {
    setRunningAnalysis(true);
    try {
      await fetch(`/api/cases/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      });
      await loadCase();
    } finally {
      setRunningAnalysis(false);
    }
  }

  async function handleRecordDecision(e: React.FormEvent) {
    e.preventDefault();
    if (decisionReason.trim().length < 5) return;
    const res = await fetch(`/api/cases/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review_decision',
        decision: decisionType,
        reason: decisionReason,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setDecisionReason('');
      loadCase();
    }
  }

  async function handleRunWhatIf() {
    setRunningSim(true);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'what_if_simulate',
          hypotheticalFormOverrides: {
            declaredLandAreaAcres: parseFloat(simLandAcres) || 0,
            declaredBuiltUpAreaSqm: parseFloat(simBuiltUpSqm) || 0,
            affidavitStampDenominationRs: parseFloat(simStampRs) || 0,
            fdrAmountLakhs: parseFloat(simFdrLakhs) || 0,
            fireSafetyExpiryDate: simFireExpiry,
          },
          hypotheticalAddedCategories: [
            'APPLICATION_FORM',
            'LAND_OWNERSHIP_CERTIFICATE',
            'BUILDING_PLAN_APPROVAL',
            'FIRE_SAFETY_NOC',
            'NON_JUDICIAL_AFFIDAVIT',
            'BANK_FDR_CORPUS_RECEIPT',
          ],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSimResult(json.data);
      }
    } catch (err) {
      console.error('What-If simulation failed:', err);
    } finally {
      setRunningSim(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">Loading dossier assurance workbench...</div>
    );
  }

  const {
    dossier,
    ruleSet,
    documents,
    findings,
    concordanceMatrix,
    remediationPlan,
    decisions,
    reports,
  } = data;
  const latestReport = reports?.[0];
  const remediationItems: any[] = Array.isArray(remediationPlan)
    ? remediationPlan
    : (remediationPlan?.items || []);

  const getOutcomeBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FAIL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'WARNING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'INCONCLUSIVE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'NOT_APPLICABLE':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-5">
        {/* Non-Official Prototype Disclaimer Banner */}
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-center justify-between gap-3">
          <div>
            <strong>PROTOTYPE ASSURANCE NOTICE:</strong> AI extracts evidence & page coordinates; deterministic rules evaluate documented requirements; human Scrutiny Officers make all consequential decisions. Not an official AICTE approval instrument.
          </div>
          <Link href="/cases" className="text-indigo-700 font-bold whitespace-nowrap flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dossiers
          </Link>
        </div>

        {/* Header Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-indigo-700">{dossier.id}</span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white">
                {dossier.status}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Ref: {dossier.application.referenceNumber} ({dossier.application.academicYear})
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{dossier.institution.legalName}</h2>
            <p className="text-xs text-slate-600">
              Trust: {dossier.institution.trustOrSocietyName} • Zone: {dossier.institution.campusZone} • Land:{' '}
              {dossier.application.formData.declaredLandAreaAcres} Acres • Built-Up:{' '}
              {dossier.application.formData.declaredBuiltUpAreaSqm} sq.m
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={runningAnalysis}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              {runningAnalysis ? 'Running Assurance Engine...' : 'Re-Run Assurance Pipeline'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          {[
            { id: 'FINDINGS', label: `1. Rule Findings (${findings.length})`, icon: Scale },
            { id: 'CONCORDANCE', label: '2. Cross-Document Concordance Matrix', icon: FileCheck },
            { id: 'DOCUMENTS_FORENSICS', label: `3. Documents, Signatures & Forensics (${documents.length})`, icon: FileText },
            { id: 'WHAT_IF_SIMULATOR', label: '4. What-If Simulator & Remediation Plan', icon: Sliders },
            { id: 'REPORT', label: '5. Scrutiny Report & Officer Decision', icon: Download },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-md flex items-center gap-1.5 transition ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Findings */}
        {activeTab === 'FINDINGS' && (
          <div className="space-y-3">
            {findings.map((f: any) => (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                      {f.ruleCode}
                    </span>
                    <span
                      className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded border ${getOutcomeBadge(f.status)}`}
                    >
                      {f.status}
                    </span>
                    {f.isExperimentalIndicator && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded font-bold">
                        EXPERIMENTAL HEURISTIC SIGNAL ONLY
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900">{f.ruleTitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Rule v{f.ruleVersion} • Severity: {f.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{f.message}</p>

                {f.remediationHint && (
                  <div className="text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded">
                    <strong>Remediation Action:</strong> {f.remediationHint}
                  </div>
                )}

                {f.evidence && f.evidence.length > 0 && (
                  <div className="pt-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    {f.evidence.slice(0, 2).map((ev: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <div>
                          <strong>Source Clause:</strong> {ev.sourceClause || 'AICTE APH 2024–27'}
                        </div>
                        <div>
                          <strong>Observed:</strong> {String(ev.observedValue ?? 'N/A')} |{' '}
                          <strong>Expected:</strong> {String(ev.expectedOrComparedValue ?? 'N/A')}
                        </div>
                        <div className="text-slate-500">
                          <strong>Limitation:</strong> {ev.methodLimitation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Concordance Matrix */}
        {activeTab === 'CONCORDANCE' && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Multi-Document Entity Concordance & Cross-Verification Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Reconciles application form declarations against OCR-extracted fields across attached annexures.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="p-3 font-bold">Field / Attribute</th>
                    <th className="p-3 font-bold">Application Form Declared Value</th>
                    <th className="p-3 font-bold">Supporting Document Evidence (Page & Similarity)</th>
                    <th className="p-3 font-bold">Concordance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {concordanceMatrix.map((row: any) => (
                    <tr key={row.fieldKey} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{row.fieldLabel}</td>
                      <td className="p-3 font-mono text-slate-800">{row.applicationFormValue}</td>
                      <td className="p-3 space-y-1">
                        {row.supportingDocuments.length === 0 ? (
                          <span className="text-slate-400 italic">No supporting field extracted</span>
                        ) : (
                          row.supportingDocuments.map((sd: any, i: number) => (
                            <div key={i} className="text-[11px] font-mono flex items-center gap-2">
                              <span className="font-semibold text-indigo-700">{sd.documentName} (p.{sd.pageNumber}):</span>
                              <span>&quot;{sd.extractedValue}&quot;</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                                {Math.round(sd.similarity * 100)}% ({sd.matchStatus})
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] ${
                            row.overallConcordance === 'CONSISTENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : row.overallConcordance === 'CONFLICT_DETECTED'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {row.overallConcordance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Documents, Signatures & Experimental Forensics */}
        {activeTab === 'DOCUMENTS_FORENSICS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc: any) => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{doc.originalFilename}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Declared: {doc.declaredCategory} → Classified: {doc.classifiedCategory} (
                      {Math.round(doc.classificationConfidence * 100)}%)
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold">
                    {doc.integrity?.overallForensicStatus}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono space-y-1">
                  <div>
                    <strong>SHA-256:</strong> {doc.sha256.slice(0, 32)}...
                  </div>
                  <div>
                    <strong>Digital Signature:</strong>{' '}
                    <span className="font-bold text-indigo-700">
                      {doc.integrity?.signatureInspection?.state}
                    </span>{' '}
                    ({doc.integrity?.signatureInspection?.validationMethod})
                  </div>
                  <div className="text-slate-500">
                    {doc.integrity?.signatureInspection?.limitationsNote}
                  </div>
                </div>

                {doc.integrity?.forensicIndicators?.map((ind: any, idx: number) => (
                  <div
                    key={`${doc.id}-${ind.method}-${idx}`}
                    className="p-2.5 bg-purple-50/60 border border-purple-200 rounded text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-purple-950">
                      <span>{ind.method}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-900 rounded">
                        {ind.experimentalLabel}
                      </span>
                    </div>
                    <p className="text-slate-700">{ind.summary}</p>
                    <p className="text-[10px] text-slate-500">
                      <strong>Cannot Prove:</strong> {ind.whatItCannotProve}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: What-If Compliance Simulator & Remediation Plan */}
        {activeTab === 'WHAT_IF_SIMULATOR' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> What-If Regulatory Compliance Simulator
              </h3>
              <p className="text-xs text-slate-600">
                Simulate how curing missing annexures or updating land/built-up/FDR values changes COMP-01..12 rule outcomes before re-submission.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hypothetical Land (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simLandAcres}
                    onChange={e => setSimLandAcres(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hypothetical Built-Up (Sqm)</label>
                  <input
                    type="number"
                    value={simBuiltUpSqm}
                    onChange={e => setSimBuiltUpSqm(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stamp Denomination (Rs.)</label>
                  <input
                    type="number"
                    value={simStampRs}
                    onChange={e => setSimStampRs(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Corpus FDR (Rs. Lakhs)</label>
                  <input
                    type="number"
                    value={simFdrLakhs}
                    onChange={e => setSimFdrLakhs(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Hypothetical Fire NOC Expiry Date</label>
                  <input
                    type="date"
                    value={simFireExpiry}
                    onChange={e => setSimFireExpiry(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
              <button
                onClick={handleRunWhatIf}
                disabled={runningSim}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {runningSim ? 'Running Simulation...' : 'Run What-If Simulation (Include All Mandatory Annexures)'}
              </button>

              {simResult && (() => {
                const summary = simResult.simulatedFindingSummary || simResult.summary || {};
                const targetState =
                  summary.recommendedCaseState ||
                  simResult.simulatedCaseState ||
                  (summary.failedCount === 0 ? 'READY_FOR_OFFICER_REVIEW' : 'NEEDS_INFORMATION');
                return (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-emerald-950">
                        Simulated Recommended Outcome:
                      </span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-200 text-emerald-900 border border-emerald-300">
                        {targetState}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-emerald-800 bg-white/80 p-2 rounded border border-emerald-200 flex flex-wrap gap-x-3 gap-y-1">
                      <span>PASS: <strong className="text-emerald-700">{summary.passedCount ?? 0}</strong></span>
                      <span>FAIL: <strong className="text-rose-700">{summary.failedCount ?? 0}</strong></span>
                      <span>WARNING: <strong className="text-amber-700">{summary.warningCount ?? 0}</strong></span>
                      <span>INCONCLUSIVE: <strong className="text-slate-700">{summary.inconclusiveCount ?? 0}</strong></span>
                      <span>BLOCKERS: <strong className="text-rose-800">{summary.blockingDeficienciesCount ?? 0}</strong></span>
                    </div>

                    {simResult.deltaSummary && (
                      <div className="pt-1.5 border-t border-emerald-200/80 text-[11px] space-y-1">
                        <div className="font-semibold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Simulation Impact:
                        </div>
                        <p className="text-emerald-800">
                          • Critical Blockers Resolved: <strong>{simResult.deltaSummary.criticalBlockersResolved ?? 0}</strong>
                        </p>
                        {simResult.deltaSummary.rulesNewlyPassing?.length > 0 && (
                          <p className="text-emerald-800">
                            • Newly Passing Rules: <span className="font-mono font-bold">{simResult.deltaSummary.rulesNewlyPassing.join(', ')}</span>
                          </p>
                        )}
                        {simResult.deltaSummary.rulesRemainingDeficient?.length > 0 && (
                          <p className="text-rose-800">
                            • Remaining Deficiencies: <span className="font-mono font-bold">{simResult.deltaSummary.rulesRemainingDeficient.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  Prioritized Deficiency Remediation Action Plan ({remediationItems.length})
                </h3>
                {remediationPlan?.criticalBlockers !== undefined && remediationPlan.criticalBlockers > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                    {remediationPlan.criticalBlockers} Critical Blocker{remediationPlan.criticalBlockers > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {remediationItems.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center space-y-1">
                  <p className="text-xs font-semibold text-emerald-800">Zero open deficiencies requiring remediation.</p>
                  <p className="text-[11px] text-emerald-600">All mandatory statutory annexures and handbook thresholds are satisfied.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {remediationItems.map((rem: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span className="text-rose-700">
                          [{rem.severity || rem.priority || 'HIGH'}] {rem.ruleCode}: {rem.ruleTitle}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          (rem.findingStatus || rem.currentOutcome) === 'FAIL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {rem.findingStatus || rem.currentOutcome || 'FAIL'}
                        </span>
                      </div>
                      {rem.deficiencySummary && (
                        <p className="text-slate-600 font-medium leading-relaxed">{rem.deficiencySummary}</p>
                      )}
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-950 font-medium">
                        <strong>Remediation Action:</strong> {rem.remediationAction || rem.requiredApplicantAction}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                        <span>Source: {rem.statutoryReference || rem.sourceClause || 'AICTE APH 2024–27'}</span>
                        {rem.estimatedResolutionDays && (
                          <span className="text-slate-600 font-semibold">Est. Resolution: ~{rem.estimatedResolutionDays} days</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Report & Reviewer Decision */}
        {activeTab === 'REPORT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Authorized Scrutiny Officer Decision (FR-17)
              </h3>
              <form onSubmit={handleRecordDecision} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reviewer Decision</label>
                  <select
                    value={decisionType}
                    onChange={e => setDecisionType(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="RECOMMEND_APPROVAL_WITHIN_AUTHORITY">
                      Recommend Approval Within System Authority (REVIEWER_DECISION_RECORDED)
                    </option>
                    <option value="REQUEST_CLARIFICATION_OR_DOCUMENTS">
                      Issue Deficiency Notice / Request Information (NEEDS_INFORMATION)
                    </option>
                    <option value="ESCALATE_FOR_MANUAL_SCRUTINY">
                      Escalate for Physical Committee Scrutiny (REVIEW_REQUIRED)
                    </option>
                    <option value="RECORD_REJECTION_OR_RETURN">
                      Record Dossier Return / Rejection (REJECTED_BY_REVIEWER)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mandatory Scrutiny Justification (Audited)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={decisionReason}
                    onChange={e => setDecisionReason(e.target.value)}
                    placeholder="Cite specific rule codes (e.g. COMP-01, COMP-08) and evidence pages..."
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded"
                >
                  Record Audited Reviewer Decision
                </button>
              </form>

              {decisions.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase">Recorded Decisions</div>
                  {decisions.map((d: any) => (
                    <div key={d.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                      <div className="font-bold text-slate-900">
                        {d.decision} → {d.resultingCaseStatus}
                      </div>
                      <div className="text-slate-600">{d.reason}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        By {d.reviewerName} ({d.reviewerRole})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  Generated Scrutiny & Deficiency Report Snapshot (v{latestReport?.reportVersion || 1})
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Rule Set: {latestReport?.ruleSetId} (v{latestReport?.ruleSetVersion})
                </span>
              </div>
              <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-96">
                {JSON.stringify(latestReport, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
  );
}
