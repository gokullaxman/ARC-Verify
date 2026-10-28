'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  FolderKanban,
  FileCheck2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  Scale,
  Lock,
} from 'lucide-react';

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [profileFilter, setProfileFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newTrustName, setNewTrustName] = useState('');
  const [newProfile, setNewProfile] = useState('AICTE_NEW_INSTITUTION');
  const [newZone, setNewZone] = useState('URBAN_MUNICIPAL');
  const [newLandAcres, setNewLandAcres] = useState('3.2');
  const [newBuiltUpSqm, setNewBuiltUpSqm] = useState('11500');

  async function loadCases() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cases?status=${encodeURIComponent(statusFilter)}&applicationType=${encodeURIComponent(profileFilter)}`
      );
      const json = await res.json();
      if (json.success) {
        setCases(json.data || []);
      }
    } catch (err) {
      console.error('Error loading cases:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, [statusFilter, profileFilter]);

  async function handleCreateDossier(e: React.FormEvent) {
    e.preventDefault();
    if (!newInstName.trim() || !newTrustName.trim()) return;
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionName: newInstName,
        trustName: newTrustName,
        applicationType: newProfile,
        campusZone: newZone,
        declaredLandAreaAcres: parseFloat(newLandAcres) || 3.0,
        declaredBuiltUpAreaSqm: parseFloat(newBuiltUpSqm) || 11000,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setShowCreateModal(false);
      setNewInstName('');
      setNewTrustName('');
      loadCases();
    }
  }

  async function handleResetDemo() {
    await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_demo' }),
    });
    loadCases();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_OFFICER_REVIEW':
      case 'REVIEWER_DECISION_RECORDED':
      case 'REVIEW_COMPLETE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'NEEDS_INFORMATION':
      case 'REJECTED_BY_REVIEWER':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'REVIEW_REQUIRED':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <AppLayout
      title="Application Dossiers & Scrutiny Cases"
      subtitle="Multi-Document Institutional Approval & Regulatory Compliance Dossiers (SIH PS 26261)"
    >
      <div className="space-y-5">
        {/* Top Action Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded text-[11px] font-bold font-mono">
                SIH 26261 • ARC-VERIFY
              </span>
              <span className="text-xs text-slate-500">
                AI Extracts Evidence • Deterministic Rules Evaluate Requirements • Reviewers Decide
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Active Regulatory Verification Cases ({cases.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDemo}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset 3 Demo Scenarios
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" /> New Application Dossier
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <span className="font-semibold text-slate-700">Filter Status:</span>
          {['ALL', 'READY_FOR_OFFICER_REVIEW', 'NEEDS_INFORMATION', 'REVIEW_REQUIRED', 'DRAFT'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] border transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="font-semibold text-slate-700 ml-auto">Profile:</span>
          <select
            value={profileFilter}
            onChange={e => setProfileFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
          >
            <option value="ALL">All Regulatory Profiles</option>
            <option value="AICTE_NEW_INSTITUTION">AICTE New Institution Approval (2024–27)</option>
            <option value="AICTE_EXTENSION_OF_APPROVAL">AICTE Extension of Approval (EoA)</option>
            <option value="GENERIC_REGULATORY_DEMO">Generic R&D Lab Safety Profile</option>
          </select>
        </div>

        {/* Cases List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="p-8 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-500">
              Loading persisted dossiers...
            </div>
          ) : (
            cases.map(c => {
              const summary = c.latestRun?.summary;
              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-indigo-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-700">{c.id}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">
                        {c.application.applicationType}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${getStatusBadge(c.status)}`}
                      >
                        {c.status}
                      </span>
                      {c.demoScenarioCode && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                          SYNTHETIC: {c.demoScenarioCode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">
                      {c.institution.legalName}{' '}
                      <span className="font-normal text-slate-500">
                        ({c.institution.cityOrVillage}, {c.institution.district}, {c.institution.state})
                      </span>
                    </h3>

                    <p className="text-xs text-slate-600">
                      Trust/Entity: <strong>{c.institution.trustOrSocietyName}</strong> • Ref:{' '}
                      <code className="font-mono">{c.application.referenceNumber}</code> • Rule Set:{' '}
                      <code className="font-mono">{c.activeRuleSetId} (v{c.activeRuleSetVersion})</code>
                    </p>

                    {summary && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                          PASS: {summary.passedCount}
                        </span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded">
                          FAIL: {summary.failedCount}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                          WARNING: {summary.warningCount}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded">
                          INCONCLUSIVE: {summary.inconclusiveCount}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                          N/A: {summary.notApplicableCount}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded">
                          NOT_CHECKED: {summary.notCheckedCount}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start lg:self-center">
                    <Link
                      href={`/cases/${c.id}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                    >
                      Inspect Dossier & Report <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-900">Create New Application Dossier</h3>
              <form onSubmit={handleCreateDossier} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Rule Profile</label>
                  <select
                    value={newProfile}
                    onChange={e => setNewProfile(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5"
                  >
                    <option value="AICTE_NEW_INSTITUTION">AICTE New Technical Institution (2024–27)</option>
                    <option value="AICTE_EXTENSION_OF_APPROVAL">AICTE Extension of Approval (EoA Renewal)</option>
                    <option value="GENERIC_REGULATORY_DEMO">Generic R&D Lab Safety Profile</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution Legal Name</label>
                  <input
                    type="text"
                    required
                    value={newInstName}
                    onChange={e => setNewInstName(e.target.value)}
                    placeholder="e.g. Cauvery College of Engineering"
                    className="w-full border border-slate-300 rounded px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Trust / Society Name</label>
                  <input
                    type="text"
                    required
                    value={newTrustName}
                    onChange={e => setNewTrustName(e.target.value)}
                    placeholder="e.g. Cauvery Educational Trust"
                    className="w-full border border-slate-300 rounded px-3 py-1.5"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Campus Zone</label>
                    <select
                      value={newZone}
                      onChange={e => setNewZone(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="URBAN_MUNICIPAL">Urban (Min 2.5 Ac)</option>
                      <option value="RURAL_PANCHAYAT">Rural (Min 7.5 Ac)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Land (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newLandAcres}
                      onChange={e => setNewLandAcres(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Built-Up (Sqm)</label>
                    <input
                      type="number"
                      value={newBuiltUpSqm}
                      onChange={e => setNewBuiltUpSqm(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded font-semibold"
                  >
                    Create Dossier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
