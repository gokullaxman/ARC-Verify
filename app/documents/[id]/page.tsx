'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  FileText,
  ArrowLeft,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Download,
  Eye,
  Cpu,
  Layers,
  Sparkles,
  MapPin,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  UploadCloud,
  XCircle
} from 'lucide-react';
import { DocumentRecord, RecognizedToken } from '@/types';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeToken, setActiveToken] = useState<RecognizedToken | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (id) fetchDocument();
  }, [id]);

  async function fetchDocument() {
    try {
      setLoading(true);
      // Try direct ID endpoint first
      const directRes = await fetch(`/api/documents/${id}`);
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData.success && directData.data?.document) {
          setDocument(directData.data.document);
          return;
        }
      }

      // Fallback to all documents list
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find((d: DocumentRecord) => d.id === id);
        setDocument(found || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRunProcessing = async () => {
    if (!document) return;
    setProcessing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`/api/documents/${document.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);

      const data = await res.json();
      if (data.success) {
        if (data.data?.document) {
          setDocument(data.data.document);
        } else {
          fetchDocument();
        }
      } else {
        alert(data.message || 'Processing failed');
      }
    } catch (err: any) {
      alert(err.name === 'AbortError' ? 'Processing timed out. Please try again.' : err.message || 'Error running pipeline');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Document Details" requiredPermission="DOCUMENT_VIEW">
        <div className="p-8 text-center text-xs text-slate-400">Loading document details...</div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout title="Document Not Found" requiredPermission="DOCUMENT_VIEW">
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">The requested document could not be found.</p>
          <Link
            href="/documents"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold"
          >
            Return to Documents
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isPdfDoc = document.mimeType?.includes('pdf') || document.fileName.toLowerCase().endsWith('.pdf');
  const isWrongDocument = document.status === 'FLAGGED' || document.extractedData?.isWrongDocument || document.extractedData?.isLandRecord === false;

  return (
    <AppLayout
      title={`Document: ${document.fileName}`}
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
      requiredPermission="DOCUMENT_VIEW"
    >
      <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <Link
                href="/documents"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Document Repository</span>
              </Link>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{document.fileName}</h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
                  {document.documentType}
                </span>
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded font-semibold border ${
                    document.status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isWrongDocument
                      ? 'bg-rose-100 text-rose-900 border-rose-400 font-bold'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isWrongDocument ? 'WRONG DOCUMENT / FLAGGED' : document.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunProcessing}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{processing ? 'Running AI Engine...' : 'Run / Re-run Pipeline'}</span>
              </button>

              <Link
                href="/verification"
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition"
              >
                <span>Verification Queue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* WRONG PDF / WRONG PHOTO UPLOADED BANNER */}
          {isWrongDocument && (
            <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                      <span>{isPdfDoc ? 'Wrong PDF Uploaded' : 'Wrong Photo Uploaded'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-semibold uppercase">
                        Format Mismatch
                      </span>
                    </h3>
                    <p className="text-xs text-rose-700 font-medium">
                      Document does not match Patta or land revenue record format.
                    </p>
                  </div>
                </div>
                <Link
                  href="/documents/upload"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition self-start sm:self-center"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Correct Patta Document</span>
                </Link>
              </div>

              <div className="bg-white/90 border border-rose-200 rounded-lg p-3 text-xs text-rose-900 space-y-1">
                <div className="font-semibold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Rejection Details:</span>
                </div>
                <p className="text-rose-900 pl-5 font-mono text-[11px]">
                  {document.extractedData?.rejectionReason || 'The extracted text lacks cadastral survey coordinates, patta title identifiers, or village administrative endorsements.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white/70 border border-rose-200 rounded">
                  <span className="text-[10px] uppercase font-mono text-rose-600 block">Patta / Title Terminology</span>
                  <span className="font-bold text-rose-800">❌ Not Detected</span>
                </div>
                <div className="p-2.5 bg-white/70 border border-rose-200 rounded">
                  <span className="text-[10px] uppercase font-mono text-rose-600 block">Cadastral Survey Number</span>
                  <span className="font-bold text-rose-800">❌ Missing (e.g. 145/2B)</span>
                </div>
                <div className="p-2.5 bg-white/70 border border-rose-200 rounded">
                  <span className="text-[10px] uppercase font-mono text-rose-600 block">Revenue Land Extent</span>
                  <span className="font-bold text-rose-800">❌ Missing (Acres / Hectares)</span>
                </div>
              </div>

              <p className="text-[11px] text-rose-700 italic">
                💡 Note: The AI OCR Engine successfully read your file. Inspect the <strong>Raw Extracted Text</strong> console below to see the actual content extracted from your uploaded file before it was rejected.
              </p>
            </div>
          )}

          {/* Main Inspection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Document Scan or PDF Viewer */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>{isPdfDoc ? 'PDF Document Stream' : 'Document Raster Scan & Bounding Overlay'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>OCR Confidence:</span>
                  <span className="text-slate-800 font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {Math.round((document.ocrConfidence || document.confidence || 0.88) * 100)}%
                  </span>
                </div>
              </div>

              {/* Viewport: PDF iframe or Image with Bounding Boxes */}
              {document.mimeType?.includes('pdf') || document.fileName.toLowerCase().endsWith('.pdf') ? (
                <div className="rounded-lg overflow-hidden border border-slate-300 bg-slate-100 flex flex-col h-[520px]">
                  <div className="px-3 py-2 bg-slate-800 text-white text-xs flex items-center justify-between font-mono">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span className="truncate max-w-xs">{document.fileName}</span>
                      <span className="text-[10px] bg-rose-900/60 text-rose-200 px-1.5 py-0.5 rounded border border-rose-700">PDF</span>
                    </span>
                    <a
                      href={document.previewUrl || document.fileUrl || document.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Full Window
                    </a>
                  </div>
                  <iframe
                    src={document.previewUrl || document.fileUrl || document.filePath}
                    title={document.fileName}
                    className="w-full flex-1 border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="relative bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[440px] border border-slate-800">
                  <img
                    src={document.previewUrl || document.fileUrl || document.filePath || '/documents/sample-patta-1.jpg'}
                    alt={document.fileName}
                    className="max-h-[500px] w-auto object-contain"
                  />

                  {/* Real Bounding Box Tokens */}
                  {document.tokens && (
                    <div className="absolute inset-0 pointer-events-none">
                      {document.tokens.map((token, i) => (
                        <div
                          key={i}
                          className={`absolute border-2 transition-all ${
                            (activeToken?.word || activeToken?.text) === (token.word || token.text)
                              ? 'border-amber-400 bg-amber-400/25 ring-2 ring-amber-300'
                              : 'border-emerald-500/70 bg-emerald-500/10'
                          }`}
                          style={{
                            left: `${token.bbox[0]}%`,
                            top: `${token.bbox[1]}%`,
                            width: `${token.bbox[2]}%`,
                            height: `${token.bbox[3]}%`
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Raw Extracted Document Text Console */}
              <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 text-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                      Raw Extracted Text (Ground Truth from File)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      {document.extractedData?.rawText
                        ? `${document.extractedData.rawText.split('\n').filter(Boolean).length} lines • ${document.extractedData.rawText.length} chars`
                        : '0 lines'}
                    </span>
                    {document.extractedData?.rawText && (
                      <button
                        type="button"
                        onClick={() => {
                          if (document.extractedData?.rawText) {
                            navigator.clipboard.writeText(document.extractedData.rawText);
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }
                        }}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 rounded border border-slate-700 flex items-center gap-1"
                      >
                        {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {document.extractedData?.rawText ? (
                  <pre className="text-xs font-mono text-emerald-300/90 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text p-2 bg-slate-900/90 rounded border border-slate-800/80">
                    {document.extractedData.rawText}
                  </pre>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 font-mono">
                    <p>No text extracted yet. Run the AI pipeline to analyze the content of this file.</p>
                    <button
                      onClick={handleRunProcessing}
                      disabled={processing}
                      className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" /> Run Dynamic OCR Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Extracted Metadata & Recognition Result */}
            <div className="lg:col-span-5 space-y-6">
              {/* Extracted Key-Value Entity Fields */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Extracted Legal Entities
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                    {document.language}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {isWrongDocument && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Registration Blocked: Wrong Document Type</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-700">
                        Entity registration and ULPIN (Bhu-Aadhaar) generation are blocked because the extracted text fails Patta / Land Revenue validation.
                      </p>
                    </div>
                  )}

                  <div className={`p-3 rounded border ${isWrongDocument ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Primary Landowner</span>
                    <span className={`font-bold text-sm ${isWrongDocument ? 'text-rose-900' : 'text-slate-900'}`}>
                      {document.extractedData?.ownerName || (document.status === 'UPLOADED' ? '[Pending Pipeline Execution]' : '[Unspecified in Scan]')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded border ${isWrongDocument ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">Survey Number</span>
                      <span className={`font-bold font-mono ${isWrongDocument ? 'text-rose-700' : 'text-slate-900'}`}>
                        {document.extractedData?.surveyNumber || (document.status === 'UPLOADED' ? '[Pending]' : '[Not Detected]')}
                      </span>
                    </div>
                    <div className={`p-3 rounded border ${isWrongDocument ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">Registered Extent</span>
                      <span className={`font-bold font-mono ${isWrongDocument ? 'text-rose-700' : 'text-slate-900'}`}>
                        {document.extractedData?.extentAcres || (document.status === 'UPLOADED' ? '[Pending]' : '[Pending Measurement]')}
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded border ${isWrongDocument ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Generated ULPIN / Bhu-Aadhaar</span>
                    <span className={`font-bold font-mono text-xs ${isWrongDocument ? 'text-rose-700' : 'text-indigo-700'}`}>
                      {document.extractedData?.ulpin || (document.status === 'UPLOADED' ? '[Generated on Extraction]' : '[Pending Verification]')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Administrative Jurisdiction</span>
                    <span className="text-slate-700 font-medium">
                      {document.village}, {document.taluk}, {document.district}, {document.state}
                    </span>
                  </div>

                  <div className="p-2.5 bg-indigo-50/60 rounded border border-indigo-100 text-[11px] font-mono text-indigo-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 block mb-0.5">Indic Recognition Model:</span>
                    <span>{document.extractedData?.matchedDataset || 'c3rl/IIIT-INDIC-HW-WORDS-Tamil'}</span>
                  </div>
                </div>
              </div>

              {/* Indic Word / Token Stream */}
              {document.tokens && document.tokens.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      Indic HTR Recognized Tokens ({document.tokens.length})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Hover token to locate</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                    {document.tokens.map((tok, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setActiveToken(tok)}
                        onMouseLeave={() => setActiveToken(null)}
                        className={`text-xs px-2.5 py-1 rounded font-medium border transition ${
                          (activeToken?.word || activeToken?.text) === (tok.word || tok.text)
                            ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                            : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span>{tok.word || tok.text}</span>
                        <span className="ml-1 text-[9px] font-mono text-slate-400">
                          {Math.round(tok.confidence * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </AppLayout>
  );
}
