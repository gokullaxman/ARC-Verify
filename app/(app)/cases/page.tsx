'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePageHeader } from '@/components/layout/PageHeaderContext';
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
  Search,
  Loader2,
} from 'lucide-react';

function CasesContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

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

  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery !== null) {
      setSearchTerm(urlQuery);
    }
  }, [searchParams]);

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
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'UNDER_SCRUTINY':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'DEFICIENCY_FOUND':
      case 'NEEDS_INFORMATION':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'REVISION_REQUESTED':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const filteredCases = cases.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const idMatch = c.id?.toLowerCase().includes(term);
    const nameMatch = c.institution?.legalName?.toLowerCase().includes(term);
    const trustMatch = c.institution?.trustOrSocietyName?.toLowerCase().includes(term);
    const typeMatch = c.application?.applicationType?.toLowerCase().includes(term);
    const cityMatch = c.institution?.cityOrVillage?.toLowerCase().includes(term);
    const districtMatch = c.institution?.district?.toLowerCase().includes(term);
    return idMatch || nameMatch || trustMatch || typeMatch || cityMatch || districtMatch;
  });

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded text-[11px] font-bold font-mono">
              SIH 26261 • ARC-VERIFY
            </span>
            <span className="text-xs text-slate-500">
              Deterministic Rules Evaluate Requirements • Explainable Scrutiny • Reviewers Decide
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Active Regulatory Verification Cases ({filteredCases.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDemo}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Scenarios
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> New Application Dossier
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Dossier ID, Institution, Trust..."
            className="w-full bg-white border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <span className="font-semibold text-slate-700">Filter Status:</span>
        {['ALL', 'UNDER_SCRUTINY', 'DEFICIENCY_FOUND', 'APPROVED', 'REJECTED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-2.5 py-1 rounded font-mono text-[11px] border transition cursor-pointer ${
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
          <div className="p-8 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading persisted dossiers...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-500">
            No application dossiers match the search/filter criteria.
          </div>
        ) : (
          filteredCases.map(c => {
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
                      {c.application?.applicationType || c.applicationType}
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
                    {c.institution?.legalName || c.institutionName}{' '}
                    <span className="font-normal text-slate-500">
                      ({c.institution?.cityOrVillage || 'Campus'}, {c.institution?.district || ''}, {c.institution?.state || ''})
                    </span>
                  </h3>

                  <p className="text-xs text-slate-600">
                    Trust/Entity: <strong>{c.institution?.trustOrSocietyName || c.trustName}</strong> • Ref:{' '}
                    <code className="font-mono">{c.application?.referenceNumber || c.applicationId}</code> • Rule Set:{' '}
                    <code className="font-mono">{c.activeRuleSetId || 'ruleset-aicte-new-2026-27'}</code>
                  </p>

                  {summary && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                        PASS: {summary.passedCount}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded">
                        VIOLATIONS: {summary.violationsCount}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                        WARNINGS: {summary.warningsCount}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded">
                        CONFIDENCE: {Math.round(summary.compositeConfidenceScore * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-slate-500 hidden sm:block">
                    <div>{c.documentCount ?? 0} Evidence Files</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {c.findingsCount ?? 0} Findings
                    </div>
                  </div>
                  <Link
                    href={`/cases/${c.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                  >
                    Inspect Dossier <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Creating New Dossier */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Institutional Dossier</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDossier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newInstName}
                  onChange={e => setNewInstName(e.target.value)}
                  placeholder="e.g., Saraswati College of Engineering & Technology"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trust / Sponsoring Society Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTrustName}
                  onChange={e => setNewTrustName(e.target.value)}
                  placeholder="e.g., Saraswati Vidya Educational Trust"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Approval Profile</label>
                  <select
                    value={newProfile}
                    onChange={e => setNewProfile(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="AICTE_NEW_INSTITUTION">AICTE New Institution</option>
                    <option value="AICTE_EXTENSION_OF_APPROVAL">AICTE Extension (EoA)</option>
                    <option value="GENERIC_REGULATORY_DEMO">Generic R&D Profile</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Zone</label>
                  <select
                    value={newZone}
                    onChange={e => setNewZone(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="URBAN_MUNICIPAL">Urban / Municipal</option>
                    <option value="RURAL">Rural</option>
                    <option value="MEGA_METRO">Mega / Metro</option>
                    <option value="HILL_REGION">Hill Region</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Land (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLandAcres}
                    onChange={e => setNewLandAcres(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Built-Up Area (Sqm)</label>
                  <input
                    type="number"
                    value={newBuiltUpSqm}
                    onChange={e => setNewBuiltUpSqm(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Create Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  usePageHeader({
    title: 'Application Dossiers & Scrutiny Cases',
    subtitle: 'Multi-Document Institutional Approval & Regulatory Compliance Dossiers (SIH PS 26261)',
    requiredPermission: 'CASE_VIEW',
  });

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading cases workspace...</div>}>
      <CasesContent />
    </Suspense>
  );
}
