/**
 * Domain: Document — Types for dossier-level documents, integrity forensics, and signature inspection.
 *
 * Used by:
 *  - types/index.ts (re-exports)
 *  - domain/compliance-rule.ts (DocumentCategory)
 *  - services/assurance/digital-signature-validator.ts (DossierDocument, SignatureInspectionResult, DigitalSignatureState)
 *  - services/assurance/compliance-engine.ts (DossierDocument)
 *  - repositories/dossier-repository.ts (DossierDocument)
 *  - app/api/cases/[id]/documents/route.ts (DossierDocument, DocumentCategory)
 */

export type DocumentCategory =
  | 'APPLICATION_FORM'
  | 'LAND_OWNERSHIP_CERTIFICATE'
  | 'BUILDING_PLAN_APPROVAL'
  | 'FIRE_SAFETY_NOC'
  | 'BANK_FDR_CORPUS_RECEIPT'
  | 'TRUST_SOCIETY_DEED'
  | 'NON_JUDICIAL_AFFIDAVIT'
  | 'PREVIOUS_EOA_LETTER'
  | 'FACULTY_COMPLIANCE_ROSTER'
  | 'ACCREDITATION_CERTIFICATE'
  | 'OTHER_SUPPORTING'
  | 'UNKNOWN_UNCLASSIFIED';

export type DigitalSignatureState =
  | 'SIGNATURE_VALID'
  | 'SIGNATURE_INVALID'
  | 'UNSIGNED'
  | 'SIGNATURE_UNAVAILABLE'
  | 'UNSUPPORTED_FORMAT';

export type TrustChainStatus =
  | 'TRUSTED_ROOT'
  | 'SELF_SIGNED_OR_UNVERIFIED_CHAIN'
  | 'NOT_APPLICABLE';

export type ForensicStatus =
  | 'NO_ANOMALY_DETECTED'
  | 'ANOMALY_FLAGGED'
  | 'LOW_IMAGE_QUALITY';

export type DocumentProcessingStatus =
  | 'PENDING'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'FAILED_SAFE';

export interface SignatureInspectionResult {
  state: DigitalSignatureState;
  hasEmbeddedSignature: boolean;
  signerCommonName?: string;
  issuerAuthority?: string;
  signingTimestampUtc?: string;
  certificateValidFrom?: string;
  certificateValidTo?: string;
  cryptographicDigestValid?: boolean;
  trustChainStatus: TrustChainStatus;
  validationMethod: string;
  limitationsNote: string;
  summary?: string;
}

export interface ForensicIndicator {
  method: string;
  metricName: string;
  metricValue: number | string;
  thresholdReference: string;
  status: ForensicStatus;
  summary: string;
  whatItCannotProve?: string;
  flaggedRegions?: Array<{
    bbox: [number, number, number, number];
    description?: string;
  }>;
}

export interface DocumentIntegrity {
  sha256AtIngestion: string;
  priorTrustedHash?: string;
  hashComparisonStatus: 'MATCH' | 'HASH_MISMATCH_ALTERED_BYTES' | 'NO_PRIOR_BASELINE';
  pdfProducerMetadata?: string;
  metadataWarnings: string[];
  signatureInspection: SignatureInspectionResult;
  overallForensicStatus: ForensicStatus;
  forensicIndicators: ForensicIndicator[];
}

export interface DossierDocument {
  id: string;
  caseId: string;
  declaredCategory: DocumentCategory;
  classifiedCategory: DocumentCategory;
  classificationConfidence: number;
  originalFilename: string;
  originalStorageKey: string;
  derivedPreviewUrl: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  pageCount: number;
  language: string;
  uploadActorId: string;
  uploadActorName: string;
  uploadedAt: string;
  processingStatus: DocumentProcessingStatus;
  rawExtractedText?: string;
  integrity?: DocumentIntegrity;
}
