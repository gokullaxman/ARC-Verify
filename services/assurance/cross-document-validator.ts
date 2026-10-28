/**
 * Cross-Document Validator — Builds a concordance matrix comparing
 * declared institution/trust names with values extracted from each annexure document.
 *
 * Used by:
 *  - services/assurance/compliance-engine.ts (CrossDocumentValidator.buildConcordanceMatrix)
 *  - app/api/cases/[id]/route.ts (CrossDocumentValidator.buildConcordanceMatrix)
 */

import type { VerificationCase } from '../../domain/application-dossier';
import type { DossierDocument } from '../../domain/document';
import type { ExtractedFieldCandidate } from '../../domain/extracted-field';
import type { ConcordanceRow, ConcordanceMatchStatus, ConcordanceSupportingDoc } from '../../domain/finding';

export class CrossDocumentValidator {
  /**
   * Builds a concordance matrix comparing application-declared fields
   * (institution name, trust name, district, etc.) against OCR/LayoutLM
   * extracted values from each uploaded document.
   *
   * Returns concordance rows for key identity fields (institution name, trust name).
   */
  static buildConcordanceMatrix(params: {
    dossier: VerificationCase;
    documents: DossierDocument[];
    extractedFields: ExtractedFieldCandidate[];
  }): ConcordanceRow[] {
    const { dossier, documents, extractedFields } = params;
    const form = dossier.application.formData;

    const rows: ConcordanceRow[] = [];

    // Build institution name concordance
    rows.push(
      this.buildRow({
        fieldKey: 'institutionName',
        fieldLabel: 'Institution Legal Name',
        declaredValue: form.declaredInstitutionName,
        documents,
        extractedFields,
        fieldNames: ['institutionName', 'collegeName', 'instituteLegalName'],
      })
    );

    // Build trust/society name concordance
    rows.push(
      this.buildRow({
        fieldKey: 'trustName',
        fieldLabel: 'Trust / Society Name',
        declaredValue: form.declaredTrustName,
        documents,
        extractedFields,
        fieldNames: ['trustName', 'societyName', 'promoterTrustName'],
      })
    );

    // Build campus district concordance
    rows.push(
      this.buildRow({
        fieldKey: 'campusDistrict',
        fieldLabel: 'Campus District',
        declaredValue: dossier.institution.district,
        documents,
        extractedFields,
        fieldNames: ['campusDistrict', 'district', 'locationDistrict'],
      })
    );

    return rows;
  }

  private static buildRow(params: {
    fieldKey: string;
    fieldLabel: string;
    declaredValue: string;
    documents: DossierDocument[];
    extractedFields: ExtractedFieldCandidate[];
    fieldNames: string[];
  }): ConcordanceRow {
    const { fieldKey, fieldLabel, declaredValue, documents, extractedFields, fieldNames } = params;
    const supportingDocuments: ConcordanceSupportingDoc[] = [];

    const relevantFields = extractedFields.filter(ef =>
      fieldNames.includes(ef.fieldName)
    );

    for (const field of relevantFields) {
      const doc = documents.find(d => d.id === field.documentId);
      if (!doc) continue;

      const similarity = this.computeNormalizedSimilarity(
        declaredValue,
        field.normalizedValue || field.rawValue
      );

      let matchStatus: ConcordanceMatchStatus;
      if (similarity >= 0.98) {
        matchStatus = 'MATCH';
      } else if (similarity >= 0.78) {
        matchStatus = 'FUZZY_WARNING';
      } else {
        matchStatus = 'MISMATCH';
      }

      supportingDocuments.push({
        documentId: doc.id,
        documentName: doc.originalFilename,
        pageNumber: field.pageNumber || 1,
        extractedValue: field.normalizedValue || field.rawValue,
        matchStatus,
        similarity,
      });
    }

    return {
      fieldKey,
      fieldLabel,
      declaredValue,
      supportingDocuments,
    };
  }

  /**
   * Computes a normalized string similarity score (0.0–1.0) using
   * Dice coefficient on character bigrams. Case-insensitive, whitespace-normalized.
   */
  static computeNormalizedSimilarity(a: string, b: string): number {
    const normalize = (s: string): string =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const na = normalize(a);
    const nb = normalize(b);

    if (na === nb) return 1.0;
    if (na.length < 2 || nb.length < 2) return na === nb ? 1.0 : 0.0;

    const bigrams = (s: string): Set<string> => {
      const set = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        set.add(s.substring(i, i + 2));
      }
      return set;
    };

    const bigramsA = bigrams(na);
    const bigramsB = bigrams(nb);
    let intersection = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) intersection++;
    }

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
  }
}
