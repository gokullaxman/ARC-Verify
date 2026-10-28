'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Settings,
  Database,
  Shield,
  Sliders,
  Server,
  Layers,
  Key,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Languages,
  Check,
  RotateCcw
} from 'lucide-react';
import { SystemSettings } from '@/types';
import { MASTER_STATES } from '@/lib/mock-data';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(90);
  const [areaTolerance, setAreaTolerance] = useState<number>(15);
  const [duplicateThreshold, setDuplicateThreshold] = useState<number>(85);
  const [languages, setLanguages] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setSettings(d);
        setConfidenceThreshold(d.confidenceThreshold);
        setAreaTolerance(d.areaTolerancePercent);
        setDuplicateThreshold(d.duplicateMatchThreshold);
        setLanguages(d.supportedLanguages || []);
        setDocTypes(d.documentTypes || []);
        setRules(d.validationRulesEnabled || {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confidenceThreshold,
          areaTolerancePercent: areaTolerance,
          duplicateMatchThreshold: duplicateThreshold,
          supportedLanguages: languages,
          documentTypes: docTypes,
          validationRulesEnabled: rules
        })
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setError(json.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with settings server');
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleDocType = (type: string) => {
    setDocTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleRule = (ruleKey: string) => {
    setRules(prev => ({
      ...prev,
      [ruleKey]: !prev[ruleKey]
    }));
  };

  const ALL_LANGUAGES = ['Tamil', 'Hindi', 'Marathi', 'Bengali', 'Gujarati', 'Kannada', 'Telugu', 'English'];
  const ALL_DOC_TYPES = ['Patta', 'Chitta', 'Adangal', 'Sale deed', 'Mutation record', 'Survey record', 'Historical register', 'Land ownership register'];

  return (
    <AppLayout
      title="System Settings & Administrative Configuration"
      subtitle="Configure Human-in-the-Loop confidence thresholds, GIS spatial tolerance limits, validation rules, and Indic language policies"
      requiredPermission="SYSTEM_SETTINGS"
    >
      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* Action Header Banner */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configured Operational Parameters</h2>
              <p className="text-xs text-slate-500">
                Changes saved here dynamically govern newly ingested documents, validation triggers, and verification routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings Saved & Active
              </span>
            )}
            {error && (
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </span>
            )}

            <button
              type="button"
              onClick={fetchSettings}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (7 Cols): Dynamic Thresholds & Rules */}
          <div className="lg:col-span-7 space-y-6">

            {/* AI PIPELINE & CONFIDENCE THRESHOLDS (FULLY WORKING) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  AI Pipeline & Confidence Thresholds
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Adjusting these sliders directly controls the automated verification routing engine.
                </p>
              </div>

              {/* Slider 1: HITL Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    Human-in-the-Loop Trigger Threshold (%)
                  </label>
                  <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>60% (Permissive)</span>
                  <span>90% (Standard Government Default)</span>
                  <span>98% (Strict Review)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Any land record or field with optical recognition confidence below{' '}
                  <strong className="text-indigo-700">{confidenceThreshold}%</strong> will automatically be routed to the officer verification queue.
                </p>
              </div>

              {/* Slider 2: GIS Area Tolerance */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    GIS Spatial Cadastral Area Tolerance Limit (%)
                  </label>
                  <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                    {areaTolerance}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={areaTolerance}
                  onChange={(e) => setAreaTolerance(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1% (Precision RTK Survey)</span>
                  <span>15% (Revenue Standard)</span>
                  <span>30% (Hilly / Legacy Cadastre)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Difference between document stated area and GIS parcel polygon exceeding{' '}
                  <strong className="text-emerald-700">{areaTolerance}%</strong> will trigger a spatial validation warning.
                </p>
              </div>

              {/* Slider 3: Duplicate Match Threshold */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    Fuzzy Duplicate Claim Matching Threshold (%)
                  </label>
                  <span className="font-mono font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                    {duplicateThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="99"
                  value={duplicateThreshold}
                  onChange={(e) => setDuplicateThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <p className="text-[11px] text-slate-500">
                  Levenshtein distance similarity score threshold on owner name and survey numbers that flags conflicting claims.
                </p>
              </div>
            </div>

            {/* STATUTORY VALIDATION RULES SWITCHES */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Statutory Business Validation Rules
                </h3>
                <p className="text-[11px] text-slate-500">Toggle administrative rules enforced by the validation engine.</p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { key: 'RULE_SURVEY_FORMAT', label: 'Cadastral Survey Number Alphanumeric Format Verification' },
                  { key: 'RULE_VILLAGE_EXISTS', label: 'Village Existence Check in Taluk Revenue Master' },
                  { key: 'RULE_TALUK_EXISTS', label: 'Taluk Consistency with District Administration Master' },
                  { key: 'RULE_DISTRICT_EXISTS', label: 'District Belongs to Permitted State Jurisdiction' },
                  { key: 'RULE_AREA_POSITIVE', label: 'Strict Positive Extent Area Enforcement (> 0.00)' },
                  { key: 'RULE_AREA_UNIT_VALID', label: 'Standardized Area Unit Validation (acre, hectare, bigha, sq.m)' },
                  { key: 'RULE_DUPLICATE_CHECK', label: 'Cross-Registry Duplicate Title & Survey Number Collision' },
                  { key: 'RULE_OWNER_CONFLICT', label: 'Judicial Caveat & Civil Court Restriction Detection' },
                  { key: 'RULE_GIS_AREA_TOLERANCE', label: 'PostGIS Polygon Boundary Area Tolerance Check' }
                ].map((item) => {
                  const isChecked = rules[item.key] !== false;
                  return (
                    <label
                      key={item.key}
                      onClick={() => toggleRule(item.key)}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition"
                    >
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition ${isChecked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column (5 Cols): Languages, Document Types, Interoperability */}
          <div className="lg:col-span-5 space-y-6">

            {/* SUPPORTED INDIC LANGUAGES */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Languages className="w-4 h-4 text-indigo-600" />
                Configured Indic Script Engines
              </h3>
              <p className="text-[11px] text-slate-500">Enable or disable primary script processing engines:</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {ALL_LANGUAGES.map((lang) => {
                  const active = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`p-2 rounded border text-left flex items-center justify-between transition ${
                        active
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{lang}</span>
                      {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DOCUMENT TYPES */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Recognized Revenue Document Types
              </h3>
              <p className="text-[11px] text-slate-500">Permitted document formats for schema extraction:</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {ALL_DOC_TYPES.map((type) => {
                  const active = docTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleDocType(type)}
                      className={`p-2 rounded border text-left flex items-center justify-between transition ${
                        active
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="truncate">{type}</span>
                      {active && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GOVERNMENT INTEROPERABILITY */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-700" />
                Interoperability & Database Ports
              </h3>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Relational Database:</span>
                  <span className="font-mono font-bold text-slate-900">PostgreSQL + PostGIS 3.4</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Spatial Reference System:</span>
                  <span className="font-mono text-slate-900">EPSG:4326 (WGS 84)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Bhu-Aadhaar Standard:</span>
                  <span className="font-mono text-indigo-700 font-semibold">14-Digit ULPIN v2.0</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Cloud Readiness:</span>
                  <span className="font-mono text-emerald-700 font-semibold">MeghRaj / NIC Ready</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </form>
    </AppLayout>
  );
}
