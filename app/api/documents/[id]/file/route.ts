import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleRouteError } from '@/lib/guard';
import { canAccessCase } from '@/lib/auth';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { PrivateStorageService } from '@/lib/private-storage';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(request, 'DOCUMENT_VIEW');
    const { id } = await context.params;

    const repo = getDossierRepository();
    const dossierDoc = repo.getDocumentById(id);

    if (!dossierDoc) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'Document record not found.' },
        { status: 404 }
      );
    }

    const dossier = repo.getCaseById(dossierDoc.caseId);
    if (!dossier || !canAccessCase(caller, dossier)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: Access to this dossier document is restricted.' },
        { status: 403 }
      );
    }

    const storageFile = dossierDoc.originalStorageKey.replace(/^private:\/\//, '');
    const fullPath = path.join(PrivateStorageService.resolvePrivateUploadsDir(), path.basename(storageFile));

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, errorCode: 'FILE_NOT_FOUND', message: 'Document binary not found in private storage.' },
        { status: 404 }
      );
    }

    const fileBuf = fs.readFileSync(fullPath);
    return new NextResponse(fileBuf, {
      status: 200,
      headers: {
        'Content-Type': dossierDoc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${dossierDoc.originalFilename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
