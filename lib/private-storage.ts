import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { DocumentIntegrityService, UploadSecurityValidationResult } from '@/services/assurance/document-integrity';

export interface ValidatedMultipartFile {
  documentId: string;
  originalFilename: string;
  sanitizedOriginalName: string;
  serverStorageFilename: string;
  privateDiskPath: string;
  privateStorageUri: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  byteSize: number;
  sha256: string;
  buffer: Buffer;
  detectedHeader: string;
  fields: Record<string, string>;
}

export class PrivateStorageService {
  static resolvePrivateUploadsDir(): string {
    if (process.env.ARC_VERIFY_PRIVATE_UPLOAD_DIR) {
      const custom = process.env.ARC_VERIFY_PRIVATE_UPLOAD_DIR;
      if (!fs.existsSync(custom)) fs.mkdirSync(custom, { recursive: true });
      return custom;
    }
    try {
      const dir = path.join(process.cwd(), '.arc-verify-data', 'private_uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return dir;
    } catch {
      const fallback = path.join(os.tmpdir(), 'arc_verify_private_uploads');
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    }
  }

  static detectMagicMime(buffer: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
    if (!buffer || buffer.length < 4) return null;
    if (buffer.slice(0, 5).toString('ascii') === '%PDF-') {
      return 'application/pdf';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }
    return null;
  }

  static async parseAndStoreMultipartUpload(
    request: Request
  ): Promise<{ ok: true; data: ValidatedMultipartFile } | { ok: false; status: number; errorCode: string; message: string }> {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return {
        ok: false,
        status: 400,
        errorCode: 'MULTIPART_REQUIRED',
        message: 'Uploads must use multipart/form-data with a binary file attachment. Raw JSON/base64 uploads are rejected.',
      };
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err: any) {
      return {
        ok: false,
        status: 400,
        errorCode: 'INVALID_FORM_DATA',
        message: `Failed to parse multipart form data: ${err?.message || 'Malformed payload'}`,
      };
    }

    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string' || typeof (fileEntry as any).arrayBuffer !== 'function') {
      return {
        ok: false,
        status: 400,
        errorCode: 'MISSING_FILE_FIELD',
        message: 'Multipart form data must contain a binary "file" field.',
      };
    }

    const fileObj = fileEntry as File;
    const rawBuffer = Buffer.from(await fileObj.arrayBuffer());
    const byteSize = rawBuffer.length;
    const clientName = fileObj.name || 'uploaded_document.pdf';
    const magicMime = this.detectMagicMime(rawBuffer);

    const declaredMime = (fileObj.type || magicMime || '').toLowerCase();
    const secCheck: UploadSecurityValidationResult = DocumentIntegrityService.validateUploadSecurity({
      filename: clientName,
      mimeType: declaredMime,
      byteSize,
      buffer: rawBuffer,
    });

    if (!secCheck.valid || !magicMime) {
      return {
        ok: false,
        status: 400,
        errorCode: secCheck.errorCode || 'MAGIC_BYTES_MISMATCH',
        message: secCheck.valid
          ? 'File binary header does not match PDF (%PDF-), JPEG (FF D8 FF), or PNG (89 50 4E 47) magic bytes.'
          : (secCheck.message || 'File failed security validation.'),
      };
    }

    const uuid = crypto.randomUUID();
    const documentId = `doc-${uuid}`;
    const canonicalExt =
      magicMime === 'application/pdf' ? '.pdf' : magicMime === 'image/png' ? '.png' : '.jpg';
    const serverStorageFilename = `${uuid}${canonicalExt}`;
    const privateDir = this.resolvePrivateUploadsDir();
    const privateDiskPath = path.join(privateDir, serverStorageFilename);

    fs.writeFileSync(privateDiskPath, rawBuffer, { mode: 0o600 });
    const sha256 = DocumentIntegrityService.computeSha256(rawBuffer);

    const fields: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (key !== 'file' && typeof value === 'string') {
        fields[key] = value;
      }
    });

    return {
      ok: true,
      data: {
        documentId,
        originalFilename: clientName,
        sanitizedOriginalName: secCheck.sanitizedFilename,
        serverStorageFilename,
        privateDiskPath,
        privateStorageUri: `private://${serverStorageFilename}`,
        mimeType: magicMime,
        byteSize,
        sha256,
        buffer: rawBuffer,
        detectedHeader: secCheck.detectedHeader,
        fields,
      },
    };
  }
}
