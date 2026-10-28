import { NextResponse } from 'next/server';
import { DocumentProcessingService } from '@/services/document-processing';
import { getSessionUserFromCookies } from '@/lib/session';
import { canAccessCase, hasPermission } from '@/lib/auth';
import { dbStore } from '@/lib/store';
import { getDossierRepository } from '@/repositories/dossier-repository';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUserFromCookies(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!hasPermission(caller, 'DOCUMENT_PROCESS')) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: DOCUMENT_PROCESS permission required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const repo = getDossierRepository();
    const dossierDoc = repo.getDocumentById(id);
    if (dossierDoc) {
      const dossier = repo.getCaseById(dossierDoc.caseId);
      if (dossier && !canAccessCase(caller, dossier)) {
        return NextResponse.json(
          { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: Cannot process a document from another user\'s dossier' },
          { status: 403 }
        );
      }
    }

    const doc = dbStore.getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (doc.caseId) {
      const dossier = repo.getCaseById(doc.caseId);
      if (dossier && !canAccessCase(caller, dossier)) {
        return NextResponse.json(
          { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: Cannot process a document from another user\'s case' },
          { status: 403 }
        );
      }
    } else if (
      (caller.role === 'APPLICANT' || caller.role === 'DATA_ENTRY_OPERATOR') &&
      doc.uploadedBy !== caller.id &&
      doc.uploadedBy !== caller.name
    ) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', error: 'Forbidden: You can only process documents you uploaded' },
        { status: 403 }
      );
    }

    const result = await DocumentProcessingService.processDocument(id);
    return NextResponse.json({
      success: true,
      message: 'Document processed through OCR, Field Extraction, and Compliance Engine',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
