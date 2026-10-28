'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  UploadCloud,
  FileCheck2,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { VerificationCase, DocumentCategory } from '@/types';

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; description: string }[] = [
  {
    value: 'APPLICATION_FORM',
    label: 'AICTE Application Form (Part 1 & 2)',
    description: 'Statutory application submission form declaring institutional capacity, courses, and intake.',
  },
  {
    value: 'LAND_OWNERSHIP_CERTIFICATE',
    label: 'Registered Land Deed / Ownership Title',
    description: 'Registered sale deed, gift deed, or government lease deed for the proposed campus land.',
  },
  {
    value: 'BUILDING_PLAN_APPROVAL',
    label: 'Building Plan Approval by Competent Authority',
    description: 'Sanctioned architectural building plan from local municipal corporation or town planning authority.',
  },
  {
    value: 'FIRE_SAFETY_NOC',
    label: 'Fire Safety NOC / Certificate',
    description: 'Valid No Objection Certificate issued by State Fire Services Department.',
  },
  {
    value: 'BANK_FDR_CORPUS_RECEIPT',
    label: 'Bank Fixed Deposit Receipt (Corpus Fund)',
    description: 'FDR receipt in joint name of Regional Officer AICTE & Trust/Society for statutory corpus.',
  },
  {
    value: 'TRUST_SOCIETY_DEED',
    label: 'Trust / Society Registration Deed & Bylaws',
    description: 'Registered trust deed or society memorandum of association and governing board bylaws.',
  },
  {
    value: 'NON_JUDICIAL_AFFIDAVIT',
    label: 'Non-Judicial Affidavit on Stamp Paper',
    description: 'Affidavit in prescribed AICTE Format 1 / 2 on required non-judicial stamp denomination.',
  },
  {
    value: 'FACULTY_COMPLIANCE_ROSTER',
    label: 'Faculty Compliance Roster & Cadre Ratio',
    description: 'Certified faculty roster fulfilling required Cadre Ratio and Faculty-to-Student Ratio norms.',
  },
  {
    value: 'OTHER_SUPPORTING',
    label: 'Other Statutory Supporting Document',
    description: 'Any additional statutory proof, accreditation certificate, or varsity affiliation letter.',
  },
];

export default function DocumentUploadPage() {
  const router = useRouter();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [declaredCategory, setDeclaredCategory] = useState<DocumentCategory>('LAND_OWNERSHIP_CERTIFICATE');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingCases, setLoadingCases] = useState<boolean>(true);

  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setCases(data.data);
            if (data.data.length > 0) {
              setSelectedCaseId(data.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoadingCases(false);
      }
    }
    fetchCases();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setErrorMessage('Please select a target application dossier.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select an evidence document file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('declaredCategory', declaredCategory);

      const response = await fetch(`/api/cases/${selectedCaseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(result.message || 'Document ingestion failed.');
      } else {
        setUploadSuccess(result.data);
        setFile(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout
      title="Statutory Document Ingestion & Forensic Intake"
      subtitle="AICTE Approval Process Handbook (2024–27) • Zero-Trust Server-Side Evidence Intake"
      requiredPermission="DOCUMENT_UPLOAD"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Evidence Document to Dossier</h2>
              <p className="text-xs text-slate-500">
                All uploads are cryptographically hashed (SHA-256), signature inspected, and committed to the audit ledger.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ingestion Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm text-emerald-900">Document Successfully Ingested!</p>
                <p className="mt-1">
                  File <span className="font-mono font-semibold">{uploadSuccess.originalFilename}</span> was verified and attached to dossier <span className="font-mono font-semibold">{uploadSuccess.caseId}</span>.
                </p>
                <div className="mt-2 text-[11px] font-mono bg-white/70 p-2 rounded border border-emerald-300">
                  SHA-256: {uploadSuccess.sha256}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/cases/${uploadSuccess.caseId}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-800 hover:text-emerald-900 underline"
                  >
                    Open Dossier Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5">
            {/* Target Case Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
                Target Application Dossier <span className="text-rose-500">*</span>
              </label>
              {loadingCases ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading dossiers...
                </div>
              ) : cases.length === 0 ? (
                <div className="text-xs text-amber-700 p-3 bg-amber-50 rounded border border-amber-200">
                  No accessible application dossiers found. Please create or request access to a dossier first.
                </div>
              ) : (
                <select
                  value={selectedCaseId}
                  onChange={e => setSelectedCaseId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.institution?.legalName || 'Unknown Institution'} ({c.application?.applicationType || 'AICTE'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Declared Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
                Declared Statutory Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={declaredCategory}
                onChange={e => setDeclaredCategory(e.target.value as DocumentCategory)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {DOCUMENT_CATEGORIES.find(c => c.value === declaredCategory)?.description}
              </p>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
                Select File (PDF, JPEG, PNG • Max 15 MB) <span className="text-rose-500">*</span>
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • {file.type}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Click to browse or drag and drop statutory document</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF (with digital signature checks), JPEG, PNG</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                href="/cases"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isUploading || !file || !selectedCaseId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Ingesting & Hashing...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" /> Ingest Evidence Document
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Notice Card */}
        <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-white">Zero-Client-Trust Integrity Pipeline</h4>
            <p className="text-slate-400 leading-relaxed">
              Uploaded files are stored in isolated private storage outside web-accessible roots. Cryptographic SHA-256 digests, page count extraction, and digital certificate checks are strictly executed server-side.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
