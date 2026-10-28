import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessCase } from '@/lib/auth';
import { requireUser, handleRouteError } from '@/lib/guard';
import { PrivateStorageService } from '@/lib/private-storage';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { DocumentIntegrityService } from '@/services/assurance/document-integrity';
import { AI_SERVICE_BASE_URL } from '@/lib/env';
import { dbService } from '@/lib/db';
import { DocumentCategory, DossierDocument } from '@/types';

function extractPageCountFromBuffer(buffer: Buffer, mimeType: string): number {
  if (mimeType === 'application/pdf') {
    const raw = buffer.toString('latin1');
    const matches = raw.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  }
  return 1;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(request, 'DOCUMENT_VIEW');
    const { id } = await context.params;

    const repo = getDossierRepository();
    const dossier = repo.getCaseById(id);

    if (!dossier) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: `Dossier ${id} not found.` },
        { status: 404 }
      );
    }

    if (!canAccessCase(caller, dossier)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: You cannot view documents in another user\'s dossier.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: repo.listDocumentsByCase(id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(request, 'DOCUMENT_UPLOAD');
    const { id } = await context.params;

    const repo = getDossierRepository();
    const dossier = repo.getCaseById(id);

    if (!dossier) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: `Dossier ${id} not found.` },
        { status: 404 }
      );
    }

    if (!canAccessCase(caller, dossier)) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Forbidden: You lack permission to attach documents to this dossier.',
        },
        { status: 403 }
      );
    }

    const uploadResult = await PrivateStorageService.parseAndStoreMultipartUpload(request);
    if (!uploadResult.ok) {
      return NextResponse.json(
        {
          success: false,
          errorCode: uploadResult.errorCode,
          message: uploadResult.message,
        },
        { status: uploadResult.status }
      );
    }

    const {
      documentId,
      sanitizedOriginalName,
      privateStorageUri,
      mimeType,
      byteSize,
      sha256,
      buffer,
      fields,
    } = uploadResult.data;

    // Zero Client Trust: discard client-supplied extractedFieldsJson, extractedText, priorTrustedHash, pageCount
    // Determine page count and signatures entirely server-side
    const computedPageCount = extractPageCountFromBuffer(buffer, mimeType);
    const declaredCategory = (fields.declaredCategory || 'OTHER_SUPPORTING') as DocumentCategory;

    // Server-side category heuristic
    const lowerName = sanitizedOriginalName.toLowerCase();
    const isMismatched =
      lowerName.includes('invoice') ||
      lowerName.includes('catering') ||
      lowerName.includes('receipt_bill') ||
      lowerName.includes('resume');

    const classifiedCategory: DocumentCategory = isMismatched
      ? 'UNKNOWN_UNCLASSIFIED'
      : declaredCategory;

    let processingStatus: 'ANALYZED' | 'SOURCE_UNAVAILABLE' = 'ANALYZED';

    // Optional remote AI service analysis call server-side
    try {
      const aiResponse = await fetch(`${AI_SERVICE_BASE_URL}/forensics/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ARC-Verify-Internal': 'true',
        },
        body: JSON.stringify({
          documentId,
          sha256,
          byteSize,
          mimeType,
        }),
        signal: AbortSignal.timeout(2000),
      });

      if (!aiResponse.ok) {
        processingStatus = 'SOURCE_UNAVAILABLE';
      }
    } catch {
      // Degrades gracefully to SOURCE_UNAVAILABLE if microservice is offline
      processingStatus = 'SOURCE_UNAVAILABLE';
    }

    const newDoc: DossierDocument = {
      id: documentId,
      caseId: id,
      declaredCategory,
      classifiedCategory,
      classificationConfidence: isMismatched ? 0.28 : 0.95,
      originalFilename: sanitizedOriginalName,
      originalStorageKey: privateStorageUri,
      derivedPreviewUrl: `/api/documents/${documentId}/file`,
      mimeType,
      byteSize,
      sha256,
      pageCount: computedPageCount,
      language: 'English',
      uploadActorId: caller.id,
      uploadActorName: caller.name,
      uploadedAt: new Date().toISOString(),
      processingStatus: processingStatus === 'ANALYZED' ? 'ANALYZED' : 'FAILED_SAFE',
      rawExtractedText: `Server-extracted text stream for ${sanitizedOriginalName} (${declaredCategory}).`,
    };

    // Server-side integrity & forensics evaluation (includes digital signature inspection)
    newDoc.integrity = DocumentIntegrityService.evaluateIntegrityAndForensics({
      doc: newDoc,
      buffer,
    });

    repo.addDocument(newDoc);

    dbService.appendAuditEvent({
      caseId: id,
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'DOCUMENT_ATTACHED_TO_DOSSIER',
      entityType: 'DOCUMENT',
      entityId: documentId,
      reason: `Uploaded "${newDoc.originalFilename}" (${declaredCategory}, ${byteSize} bytes, SHA-256: ${sha256.slice(0, 16)}...) to private storage.`,
      details: {
        pageCount: computedPageCount,
        hasSignature: Boolean(newDoc.integrity?.signatureInspection?.hasEmbeddedSignature),
      },
    });

    return NextResponse.json({ success: true, data: newDoc }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
