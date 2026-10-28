/**
 * Domain: Extracted Field — OCR/LayoutLM field extraction candidates.
 *
 * Used by:
 *  - types/index.ts (re-exports)
 *  - repositories/dossier-repository.ts (ExtractedFieldCandidate)
 *  - services/assurance/compliance-engine.ts (ExtractedFieldCandidate)
 *  - app/api/cases/[id]/documents/route.ts (ExtractedFieldCandidate)
 */

export interface ExtractedFieldCandidate {
  id: string;
  documentId: string;
  caseId: string;
  fieldName: string;
  fieldLabel: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
  pageNumber: number;
  bbox?: [number, number, number, number];
  extractorVersion?: string;
  isManuallyCorrected?: boolean;
  originalOcrValue?: string;
  correctedByActorId?: string;
  correctedByActorName?: string;
  correctionReason?: string;
  correctedAt?: string;
}
