import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { getSessionUserFromCookies } from '@/lib/session';
import { canAccessCase, hasPermission } from '@/lib/auth';
import { getDossierRepository } from '@/repositories/dossier-repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getSessionUserFromCookies(request);
  if (!caller) {
    return NextResponse.json(
      { success: false, errorCode: 'UNAUTHORIZED', error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!hasPermission(caller, 'DOCUMENT_VIEW')) {
    return NextResponse.json(
      { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: DOCUMENT_VIEW permission required' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const repo = getDossierRepository();

  // Check if document belongs to a dossier case
  const dossierDoc = repo.getDocumentById(id);
  if (dossierDoc) {
    const parentCase = repo.getCaseById(dossierDoc.caseId);
    if (parentCase && !canAccessCase(caller, parentCase)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: You do not have access to this dossier document' },
        { status: 403 }
      );
    }
    const fields = repo.listFieldsByDocument(id);
    return NextResponse.json({
      success: true,
      data: { document: dossierDoc, extractedFields: fields },
    });
  }

  const doc = dbStore.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
  }

  if (doc.caseId) {
    const parentCase = repo.getCaseById(doc.caseId);
    if (parentCase && !canAccessCase(caller, parentCase)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: You do not have access to this case document' },
        { status: 403 }
      );
    }
  } else if (
    caller.role === 'APPLICANT' ||
    caller.role === 'DATA_ENTRY_OPERATOR' ||
    caller.role === 'VIEWER'
  ) {
    if (doc.uploadedBy !== caller.id && doc.uploadedBy !== caller.name) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: Document belongs to another user or jurisdiction' },
        { status: 403 }
      );
    }
  }

  const record = doc.recordId ? dbStore.getLandRecordById(doc.recordId) : null;
  return NextResponse.json({ success: true, data: { document: doc, record } });
}
