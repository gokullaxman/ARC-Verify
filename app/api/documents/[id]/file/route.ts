import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/session';
import { canAccessCase, hasPermission } from '@/lib/auth';
import { dbStore } from '@/lib/store';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { PrivateStorageService } from '@/lib/private-storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getSessionUserFromCookies(request);
  if (!caller) {
    return NextResponse.json(
      { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
      { status: 401 }
    );
  }

  if (!hasPermission(caller, 'DOCUMENT_VIEW')) {
    return NextResponse.json(
      { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: DOCUMENT_VIEW permission required.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const repo = getDossierRepository();
  const dossierDoc = repo.getDocumentById(id);

  if (dossierDoc) {
    const dossier = repo.getCaseById(dossierDoc.caseId);
    if (!dossier || !canAccessCase(caller, dossier)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: Access to this dossier document is denied.' },
        { status: 403 }
      );
    }

    const storageFile = dossierDoc.originalStorageKey.replace(/^private:\/\//, '');
    const fullPath = path.join(PrivateStorageService.resolvePrivateUploadsDir(), path.basename(storageFile));
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': dossierDoc.mimeType,
          'Content-Disposition': `inline; filename="${dossierDoc.originalFilename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    }
  }

  const doc = dbStore.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ success: false, message: 'Document file not found.' }, { status: 404 });
  }

  if (doc.caseId) {
    const dossier = repo.getCaseById(doc.caseId);
    if (dossier && !canAccessCase(caller, dossier)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: Access denied.' },
        { status: 403 }
      );
    }
  } else if (
    (caller.role === 'APPLICANT' || caller.role === 'DATA_ENTRY_OPERATOR' || caller.role === 'VIEWER') &&
    doc.uploadedBy !== caller.id &&
    doc.uploadedBy !== caller.name
  ) {
    return NextResponse.json(
      { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: Access denied.' },
      { status: 403 }
    );
  }

  if (doc.filePath && fs.existsSync(doc.filePath)) {
    const buf = fs.readFileSync(doc.filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `inline; filename="${doc.fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return NextResponse.json({ success: false, message: 'Stored binary not found on disk.' }, { status: 404 });
}
