'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu } from 'lucide-react';

export default function DocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/documents/upload');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-200">
      <div className="flex flex-col items-center gap-3 p-6 bg-slate-950/80 border border-slate-800 rounded-xl shadow-xl max-w-sm text-center">
        <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Opening Document Ingestion Terminal</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">Loading Indic-HTR OCR Auto-Detection Engine...</p>
        </div>
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mt-2"></div>
      </div>
    </div>
  );
}
