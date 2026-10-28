import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { DocumentRecord, DocumentType } from '@/types';
import { DocumentProcessingService } from '@/services/document-processing';
import { canAccessCase, hasPermission } from '@/lib/auth';
import { getSessionUserFromCookies } from '@/lib/session';
import { PrivateStorageService } from '@/lib/private-storage';
import { getDossierRepository } from '@/repositories/dossier-repository';

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromCookies(request);
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const repo = getDossierRepository();
    const documents = dbStore.getDocuments(user).filter(doc => {
      if (doc.caseId) {
        const dossier = repo.getCaseById(doc.caseId);
        if (dossier && !canAccessCase(user, dossier)) {
          return false;
        }
      }
      return true;
    });

    return NextResponse.json({ success: true, count: documents.length, data: documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUserFromCookies(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!hasPermission(currentUser, 'DOCUMENT_UPLOAD')) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: DOCUMENT_UPLOAD privilege required.' },
        { status: 403 }
      );
    }

    const uploadResult = await PrivateStorageService.parseAndStoreMultipartUpload(request);
    if (!uploadResult.ok) {
      return NextResponse.json(
        {
          success: false,
          errorCode: uploadResult.errorCode,
          error: uploadResult.message,
          message: uploadResult.message,
        },
        { status: uploadResult.status }
      );
    }

    const {
      documentId,
      sanitizedOriginalName,
      privateDiskPath,
      mimeType,
      byteSize,
      sha256,
      fields,
    } = uploadResult.data;

    const caseId = fields.caseId?.trim() || undefined;
    if (caseId) {
      const repo = getDossierRepository();
      const dossier = repo.getCaseById(caseId);
      if (!dossier) {
        return NextResponse.json(
          { success: false, errorCode: 'NOT_FOUND', message: `Dossier ${caseId} not found.` },
          { status: 404 }
        );
      }
      if (!canAccessCase(currentUser, dossier)) {
        return NextResponse.json(
          { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: You cannot upload to another user\'s dossier.' },
          { status: 403 }
        );
      }
    }

    const documentType = (fields.documentType || 'Land Ownership Certificate') as DocumentType;
    const language = fields.language || 'English';
    const state = fields.state || currentUser.state || 'Tamil Nadu';
    const district = fields.district || currentUser.district || 'Madurai';
    const taluk = fields.taluk || currentUser.taluk || 'Madurai North';
    const village = fields.village || currentUser.village || 'Kovilur';
    const isPdf = mimeType === 'application/pdf';

    const newDoc: DocumentRecord = {
      id: documentId,
      caseId,
      sha256,
      fileName: sanitizedOriginalName,
      fileSize: byteSize,
      mimeType,
      filePath: privateDiskPath,
      previewUrl: `/api/documents/${documentId}/file`,
      fileUrl: `/api/documents/${documentId}/file`,
      documentType,
      pages: 1,
      language,
      state,
      district,
      taluk,
      village,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.id,
      status: 'UPLOADED',
      processingSteps: [
        {
          step: 'Document Ingestion & Magic-Byte Verification',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
          details: `${sanitizedOriginalName} (${isPdf ? 'PDF' : 'Image'}, ${byteSize} bytes, SHA-256: ${sha256.slice(0, 16)}...) stored in private vault`,
        },
        { step: 'Image / PDF Preprocessing', status: 'PENDING' },
        { step: 'Text Detection & Segmentation', status: 'PENDING' },
        { step: 'Multilingual OCR Engine', status: 'PENDING' },
        { step: 'Field Extraction (LayoutLMv3)', status: 'PENDING' },
        { step: 'Regulatory Compliance Validation', status: 'PENDING' },
      ],
    };

    const savedDoc = dbStore.addDocument(newDoc);

    if (fields.autoProcess === 'true') {
      try {
        const processResult = await DocumentProcessingService.processDocument(savedDoc.id);
        return NextResponse.json(
          {
            success: true,
            data: processResult.document,
            record: processResult.record,
            processed: true,
            message: 'Document uploaded to private storage and analyzed.',
          },
          { status: 201 }
        );
      } catch (procErr: any) {
        console.warn('Auto-processing warning:', procErr);
      }
    }

    return NextResponse.json({ success: true, data: savedDoc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
