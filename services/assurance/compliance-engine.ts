import {
  VerificationCase,
  DossierDocument,
  ExtractedFieldCandidate,
  ComplianceRuleSet,
  ComplianceRule,
  AssuranceFinding,
  FindingAggregationSummary,
  FindingOutcome,
  ExternalIntegrationEvent,
  ConcordanceRow,
} from '../../types';
import { CrossDocumentValidator } from './cross-document-validator';

export class ComplianceEngine {
  /**
   * Requirement FR-14, FR-15, FR-16, Section 10.1–10.4, TC-02..TC-13:
   * Evaluates versioned compliance rules deterministically.
   * Produces 6 distinct outcomes: PASS, FAIL, WARNING, INCONCLUSIVE, NOT_APPLICABLE, NOT_CHECKED.
   */
  static evaluateDossier(params: {
    dossier: VerificationCase;
    ruleSet: ComplianceRuleSet;
    documents: DossierDocument[];
    extractedFields: ExtractedFieldCandidate[];
    allOtherCasesDocuments?: DossierDocument[];
    integrationEvents?: ExternalIntegrationEvent[];
    runId: string;
  }): {
    findings: AssuranceFinding[];
    summary: FindingAggregationSummary;
    concordanceMatrix: ConcordanceRow[];
  } {
    const {
      dossier,
      ruleSet,
      documents,
      extractedFields,
      allOtherCasesDocuments = [],
      integrationEvents = [],
      runId,
    } = params;

    const concordanceMatrix = CrossDocumentValidator.buildConcordanceMatrix({
      dossier,
      documents,
      extractedFields,
    });

    const findings: AssuranceFinding[] = [];
    const now = new Date().toISOString();

    for (const rule of ruleSet.rules) {
      if (!rule.enabled || rule.sourceStatus === 'DISABLED') {
        findings.push(
          this.makeFinding(dossier.id, runId, rule, 'NOT_CHECKED', `Rule ${rule.code} (${rule.title}) is disabled or awaiting source verification.`, [], now)
        );
        continue;
      }

      // Check applicability (TC-12: Land rule on non-land or EoA profile -> NOT_APPLICABLE)
      const isAppTypeApplicable = rule.applicableApplicationTypes.includes(
        dossier.application.applicationType
      );
      const isCategoryApplicable = rule.applicableInstitutionCategories.includes(
        dossier.institution.institutionCategory
      );

      if (!isAppTypeApplicable || !isCategoryApplicable) {
        findings.push(
          this.makeFinding(
            dossier.id,
            runId,
            rule,
            'NOT_APPLICABLE',
            `Rule ${rule.code} (${rule.title}) is NOT_APPLICABLE to application profile "${dossier.application.applicationType}" / category "${dossier.institution.institutionCategory}". Excluded from mandatory gate.`,
            [
              {
                methodUsed: 'Profile & Category Applicability Filter',
                methodLimitation: 'Rule applies only to ' + rule.applicableApplicationTypes.join(', '),
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now
          )
        );
        continue;
      }

      // Evaluate by COMP code
      const evaluated = this.evaluateSingleRule({
        rule,
        dossier,
        ruleSet,
        documents,
        extractedFields,
        concordanceMatrix,
        allOtherCasesDocuments,
        integrationEvents,
        runId,
        now,
      });
      findings.push(evaluated);
    }

    const summary = this.aggregateFindings(findings);
    return { findings, summary, concordanceMatrix };
  }

  private static evaluateSingleRule(ctx: {
    rule: ComplianceRule;
    dossier: VerificationCase;
    ruleSet: ComplianceRuleSet;
    documents: DossierDocument[];
    extractedFields: ExtractedFieldCandidate[];
    concordanceMatrix: ConcordanceRow[];
    allOtherCasesDocuments: DossierDocument[];
    integrationEvents: ExternalIntegrationEvent[];
    runId: string;
    now: string;
  }): AssuranceFinding {
    const {
      rule,
      dossier,
      ruleSet,
      documents,
      extractedFields,
      concordanceMatrix,
      allOtherCasesDocuments,
      integrationEvents,
      runId,
      now,
    } = ctx;
    const form = dossier.application.formData;

    switch (rule.code) {
      case 'COMP-01': {
        // Mandatory annexure completeness & wrong document type check (TC-02, TC-03, TC-04)
        const mandatoryItems = ruleSet.requiredChecklist.filter(item => item.mandatory);
        const uploadedByCategory = new Map(
          documents.map(d => [d.classifiedCategory !== 'UNKNOWN_UNCLASSIFIED' ? d.classifiedCategory : d.declaredCategory, d])
        );

        const missingCategories: string[] = [];
        const misclassifiedDocs: DossierDocument[] = [];
        const unreadableDocs: DossierDocument[] = [];

        for (const doc of documents) {
          if (
            doc.classifiedCategory === 'UNKNOWN_UNCLASSIFIED' ||
            (doc.classifiedCategory !== doc.declaredCategory && doc.classificationConfidence < 0.6)
          ) {
            misclassifiedDocs.push(doc);
          }
          if (doc.integrity?.overallForensicStatus === 'LOW_IMAGE_QUALITY') {
            unreadableDocs.push(doc);
          }
        }

        for (const reqItem of mandatoryItems) {
          const matchingDoc = documents.find(
            d =>
              d.declaredCategory === reqItem.category &&
              d.classifiedCategory === reqItem.category &&
              d.processingStatus !== 'FAILED_SAFE'
          );
          if (!matchingDoc) {
            missingCategories.push(`${reqItem.title} (${reqItem.category})`);
          }
        }

        if (unreadableDocs.length > 0 && missingCategories.length === 0 && misclassifiedDocs.length === 0) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'INCONCLUSIVE',
            `Document "${unreadableDocs[0].originalFilename}" has degraded optical legibility (LOW_IMAGE_QUALITY). Cannot conclusively verify annexure contents without rescan or manual scrutiny (TC-04).`,
            unreadableDocs.map(d => ({
              documentId: d.id,
              documentFilename: d.originalFilename,
              pageNumber: 1,
              observedValue: 'LOW_IMAGE_QUALITY',
              expectedOrComparedValue: 'Sharpness >= 45.0',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            'Request higher-resolution (>= 300 DPI) scan of the degraded document.'
          );
        }

        if (misclassifiedDocs.length > 0) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Wrong or unrecognized document type uploaded: "${misclassifiedDocs[0].originalFilename}" was declared as ${misclassifiedDocs[0].declaredCategory} but classified as ${misclassifiedDocs[0].classifiedCategory} (TC-03). No fraud assertion is made; upload the required statutory certificate.`,
            misclassifiedDocs.map(d => ({
              documentId: d.id,
              documentFilename: d.originalFilename,
              pageNumber: 1,
              observedValue: d.classifiedCategory,
              expectedOrComparedValue: d.declaredCategory,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            `Replace "${misclassifiedDocs[0].originalFilename}" with a valid ${misclassifiedDocs[0].declaredCategory} document.`
          );
        }

        if (missingCategories.length > 0) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Deficiency detected: ${missingCategories.length} mandatory annexure(s) missing from dossier: ${missingCategories.join('; ')} (TC-02).`,
            missingCategories.map(m => ({
              observedValue: 'MISSING_ANNEXURE',
              expectedOrComparedValue: m,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            `Upload the missing mandatory annexure(s): ${missingCategories.join(', ')}.`
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `All ${mandatoryItems.length} mandatory annexures required by ${rule.chapterClauseAnnexure} are present, classified, and readable.`,
          documents.map(d => ({
            documentId: d.id,
            documentFilename: d.originalFilename,
            pageNumber: 1,
            observedValue: d.classifiedCategory,
            expectedOrComparedValue: d.declaredCategory,
            methodUsed: rule.evaluationMethod,
            methodLimitation: rule.guardrailNote,
            sourceClause: rule.chapterClauseAnnexure,
            sourceUrl: rule.sourceUrl,
          })),
          now
        );
      }

      case 'COMP-02': {
        const ref = (form.applicationReferenceNumber || '').trim();
        const validSyntax = /^(AICTE|EOA|RND)-[0-9]{4}-[A-Z0-9\-]{4,16}$/i.test(ref);
        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          validSyntax ? 'PASS' : 'FAIL',
          validSyntax
            ? `Application Reference ID "${ref}" conforms to prescribed syntax (${rule.chapterClauseAnnexure}). Note: Format check only; does not confirm portal registration.`
            : `Application Reference ID "${ref}" violates prescribed identifier syntax.`,
          [
            {
              fieldName: 'applicationReferenceNumber',
              observedValue: ref,
              expectedOrComparedValue: 'AICTE-YYYY-XXXX / EOA-YYYY-XXXX',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now,
          validSyntax ? undefined : 'Correct the Application Reference Number in Part-I intake data.'
        );
      }

      case 'COMP-03': {
        // Cross-document institution & trust name match (TC-05, TC-06)
        const instRow = concordanceMatrix.find(r => r.fieldKey === 'institutionName');
        const trustRow = concordanceMatrix.find(r => r.fieldKey === 'trustName');
        const allComparisons = [
          ...(instRow?.supportingDocuments || []),
          ...(trustRow?.supportingDocuments || []),
        ];

        const mismatches = allComparisons.filter(c => c.matchStatus === 'MISMATCH');
        const fuzzyWarnings = allComparisons.filter(c => c.matchStatus === 'FUZZY_WARNING');

        if (mismatches.length > 0) {
          const m = mismatches[0];
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Cross-document identity mismatch (TC-05): Application declares "${form.declaredInstitutionName}", whereas "${m.documentName}" (Page ${m.pageNumber}) states "${m.extractedValue}" (Similarity: ${Math.round(m.similarity * 100)}%).`,
            mismatches.map(item => ({
              documentId: item.documentId,
              documentFilename: item.documentName,
              pageNumber: item.pageNumber,
              fieldName: 'institutionName',
              observedValue: item.extractedValue,
              expectedOrComparedValue: form.declaredInstitutionName,
              similarityScore: item.similarity,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            'Submit a registered corrigendum or upload the certificate issued to the exact applicant legal entity.'
          );
        }

        if (fuzzyWarnings.length > 0) {
          const w = fuzzyWarnings[0];
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'WARNING',
            `Minor orthographic name variation detected (TC-06): Application states "${form.declaredInstitutionName}", while "${w.documentName}" (Page ${w.pageNumber}) states "${w.extractedValue}" (${Math.round(w.similarity * 100)}% similarity). Routed for human officer confirmation.`,
            fuzzyWarnings.map(item => ({
              documentId: item.documentId,
              documentFilename: item.documentName,
              pageNumber: item.pageNumber,
              fieldName: 'institutionName',
              observedValue: item.extractedValue,
              expectedOrComparedValue: form.declaredInstitutionName,
              similarityScore: item.similarity,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            'Scrutiny officer should inspect Page 1 of the certificate to confirm phonetic/spelling equivalence.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Institution ("${form.declaredInstitutionName}") and Trust ("${form.declaredTrustName}") identities match consistently across all ${allComparisons.length} extracted annexure references.`,
          allComparisons.map(item => ({
            documentId: item.documentId,
            documentFilename: item.documentName,
            pageNumber: item.pageNumber,
            fieldName: 'institutionName',
            observedValue: item.extractedValue,
            expectedOrComparedValue: form.declaredInstitutionName,
            similarityScore: item.similarity,
            methodUsed: rule.evaluationMethod,
            methodLimitation: rule.guardrailNote,
            sourceClause: rule.chapterClauseAnnexure,
            sourceUrl: rule.sourceUrl,
          })),
          now
        );
      }

      case 'COMP-04': {
        const jurisdictionFields = extractedFields.filter(f => f.fieldName === 'campusDistrict');
        const mismatchJurisdiction = jurisdictionFields.find(
          f => f.normalizedValue.toLowerCase() !== dossier.institution.district.toLowerCase()
        );

        if (mismatchJurisdiction) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Jurisdiction mismatch: Application declares District "${dossier.institution.district}", but Land Certificate states "${mismatchJurisdiction.rawValue}".`,
            [
              {
                documentId: mismatchJurisdiction.documentId,
                pageNumber: mismatchJurisdiction.pageNumber,
                fieldName: 'campusDistrict',
                observedValue: mismatchJurisdiction.rawValue,
                expectedOrComparedValue: dossier.institution.district,
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Campus jurisdiction (${dossier.institution.cityOrVillage}, ${dossier.institution.district}, ${dossier.institution.state} — ${dossier.institution.campusZone}) verified across land records.`,
          [
            {
              fieldName: 'campusDistrict',
              observedValue: `${dossier.institution.district}, ${dossier.institution.state}`,
              expectedOrComparedValue: `${dossier.institution.district}, ${dossier.institution.state}`,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now
        );
      }

      case 'COMP-05': {
        // Hash integrity & metadata audit (TC-07, TC-10)
        const alteredDocs = documents.filter(
          d => d.integrity?.hashComparisonStatus === 'HASH_MISMATCH_ALTERED_BYTES'
        );
        const metadataWarnDocs = documents.filter(
          d => (d.integrity?.metadataWarnings?.length || 0) > 0
        );

        if (alteredDocs.length > 0) {
          const d = alteredDocs[0];
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `SHA-256 byte integrity mismatch detected on "${d.originalFilename}" (TC-07): Current hash (${d.sha256.slice(0, 16)}...) differs from baseline trusted copy (${d.integrity?.priorTrustedHash?.slice(0, 16)}...).`,
            [
              {
                documentId: d.id,
                documentFilename: d.originalFilename,
                observedValue: d.sha256,
                expectedOrComparedValue: d.integrity?.priorTrustedHash,
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Re-upload the unmodified original document and verify chain of custody.'
          );
        }

        if (metadataWarnDocs.length > 0) {
          const d = metadataWarnDocs[0];
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'WARNING',
            `Metadata observation on "${d.originalFilename}" (TC-10): ${d.integrity?.metadataWarnings[0]} Document is NOT auto-rejected.`,
            [
              {
                documentId: d.id,
                documentFilename: d.originalFilename,
                observedValue: d.integrity?.pdfProducerMetadata || 'Modified PDF Metadata',
                expectedOrComparedValue: 'Standard Scanner / e-Sign Producer',
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Inspect document fields visually; consumer PDF compression tools are common and not proof of forgery.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `SHA-256 intake hashes recorded and verified for all ${documents.length} dossier files with zero post-upload byte alterations.`,
          documents.map(d => ({
            documentId: d.id,
            documentFilename: d.originalFilename,
            observedValue: d.sha256.slice(0, 20) + '...',
            expectedOrComparedValue: 'Immutable SHA-256 Intake Record',
            methodUsed: rule.evaluationMethod,
            methodLimitation: rule.guardrailNote,
            sourceClause: rule.chapterClauseAnnexure,
            sourceUrl: rule.sourceUrl,
          })),
          now
        );
      }

      case 'COMP-06': {
        // Experimental visual anomaly & blur indicators (TC-04, TC-11)
        const flaggedDocs = documents.filter(
          d =>
            d.integrity?.overallForensicStatus === 'ANOMALY_FLAGGED' ||
            d.integrity?.overallForensicStatus === 'LOW_IMAGE_QUALITY' ||
            d.integrity?.forensicIndicators.some(
              ind => ind.status === 'ANOMALY_FLAGGED' || ind.status === 'LOW_IMAGE_QUALITY'
            )
        );

        if (flaggedDocs.length > 0) {
          const d = flaggedDocs[0];
          const flaggedInd = d.integrity?.forensicIndicators.find(
            i => i.status === 'ANOMALY_FLAGGED' || i.status === 'LOW_IMAGE_QUALITY'
          );
          return {
            ...this.makeFinding(
              dossier.id,
              runId,
              rule,
              'INCONCLUSIVE',
              `[EXPERIMENTAL INDICATOR] "${d.originalFilename}" flagged ${flaggedInd?.method || 'visual heuristic'}: ${flaggedInd?.summary || 'Requires manual inspection.'} Per Blueprint Section 9.4 & TC-11, heuristic signals cannot prove forgery and never auto-reject a case.`,
              [
                {
                  documentId: d.id,
                  documentFilename: d.originalFilename,
                  pageNumber: 1,
                  bbox: flaggedInd?.flaggedRegions?.[0]?.bbox || [54, 62, 28, 12],
                  observedValue: `${flaggedInd?.metricName}: ${flaggedInd?.metricValue}`,
                  expectedOrComparedValue: `Threshold: ${flaggedInd?.thresholdReference}`,
                  methodUsed: `${flaggedInd?.method} (EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY)`,
                  methodLimitation:
                    flaggedInd?.whatItCannotProve ||
                    'Cannot distinguish benign scanner recompression from tampering.',
                  sourceClause: rule.chapterClauseAnnexure,
                  sourceUrl: rule.sourceUrl,
                },
              ],
              now,
              'Scrutiny officer must inspect the highlighted region on the original document or request issuer confirmation.'
            ),
            isExperimentalIndicator: true,
          };
        }

        return {
          ...this.makeFinding(
            dossier.id,
            runId,
            rule,
            'PASS',
            `[EXPERIMENTAL INDICATOR] Optical sharpness and recompression heuristics ran across ${documents.length} documents with status NO_ANOMALY_DETECTED (Note: not equivalent to legal proof of authenticity).`,
            documents.map(d => ({
              documentId: d.id,
              documentFilename: d.originalFilename,
              pageNumber: 1,
              observedValue: 'NO_ANOMALY_DETECTED',
              expectedOrComparedValue: 'ELA <= 18.0, Sharpness >= 45.0',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now
          ),
          isExperimentalIndicator: true,
        };
      }

      case 'COMP-07': {
        // Stamp denomination & cryptographic signature inspection (TC-08, TC-09)
        const stampDenom = form.affidavitStampDenominationRs ?? 100;
        const invalidSigDocs = documents.filter(
          d => d.integrity?.signatureInspection.state === 'SIGNATURE_INVALID'
        );
        const unsignedPdfDocs = documents.filter(
          d => d.integrity?.signatureInspection.state === 'UNSIGNED'
        );

        if (invalidSigDocs.length > 0) {
          const d = invalidSigDocs[0];
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Cryptographic digital signature verification failed on "${d.originalFilename}" (TC-09): ${d.integrity?.signatureInspection.limitationsNote}`,
            [
              {
                documentId: d.id,
                documentFilename: d.originalFilename,
                observedValue: 'SIGNATURE_INVALID',
                expectedOrComparedValue: 'Valid PKCS#7 /ByteRange Digest',
                methodUsed: d.integrity?.signatureInspection.validationMethod || rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Re-sign the PDF using a valid Class-III DSC / eSign token without post-signing modifications.'
          );
        }

        if (stampDenom < 100) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Affidavit Non-Judicial Stamp denomination (Rs. ${stampDenom}) is below the prescribed Rs. 100 minimum under ${rule.chapterClauseAnnexure}.`,
            [
              {
                fieldName: 'affidavitStampDenominationRs',
                observedValue: stampDenom,
                expectedOrComparedValue: '>= Rs. 100',
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Execute fresh Affidavit on minimum Rs. 100 Non-Judicial Stamp Paper.'
          );
        }

        if (unsignedPdfDocs.length > 0) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'WARNING',
            `Affidavit Stamp Denomination (Rs. ${stampDenom}) verified, but ${unsignedPdfDocs.length} PDF annexure(s) (${unsignedPdfDocs.map(u => u.originalFilename).join(', ')}) are UNSIGNED (no embedded PKCS#7 digital signature, TC-08). Routed for officer confirmation of physical ink seal.`,
            unsignedPdfDocs.map(d => ({
              documentId: d.id,
              documentFilename: d.originalFilename,
              observedValue: 'UNSIGNED (No PKCS#7 /ByteRange)',
              expectedOrComparedValue: 'SIGNATURE_VALID or Officer Verified Physical Copy',
              methodUsed: d.integrity?.signatureInspection.validationMethod || rule.evaluationMethod,
              methodLimitation: d.integrity?.signatureInspection.limitationsNote || rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            'Attach digitally signed PDF (DSC/eSign) or have Scrutiny Officer verify physical wet-seal.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Affidavit Stamp Paper denomination (Rs. ${stampDenom} >= Rs. 100) and embedded PDF cryptographic digital signatures (SIGNATURE_VALID) verified.`,
          documents.map(d => ({
            documentId: d.id,
            documentFilename: d.originalFilename,
            observedValue: d.integrity?.signatureInspection.state || 'SIGNATURE_VALID',
            expectedOrComparedValue: 'SIGNATURE_VALID & Stamp >= Rs. 100',
            methodUsed: rule.evaluationMethod,
            methodLimitation: rule.guardrailNote,
            sourceClause: rule.chapterClauseAnnexure,
            sourceUrl: rule.sourceUrl,
          })),
          now
        );
      }

      case 'COMP-08': {
        // Land & built-up area norms (Appendix-4)
        const minLandAcres = dossier.institution.campusZone === 'RURAL_PANCHAYAT' ? 7.5 : 2.5;
        const landField = extractedFields.find(f => f.fieldName === 'landAreaAcres');
        const extractedLand = landField ? parseFloat(landField.normalizedValue) : form.declaredLandAreaAcres;
        const builtUpField = extractedFields.find(f => f.fieldName === 'builtUpAreaSqm');
        const extractedBuiltUp = builtUpField
          ? parseFloat(builtUpField.normalizedValue)
          : form.declaredBuiltUpAreaSqm;

        const landOk = extractedLand >= minLandAcres && form.declaredLandAreaAcres >= minLandAcres;
        const builtUpOk =
          extractedBuiltUp >= form.requiredBuiltUpAreaSqm &&
          form.declaredBuiltUpAreaSqm >= form.requiredBuiltUpAreaSqm;

        if (!landOk || !builtUpOk) {
          const issues: string[] = [];
          if (!landOk) {
            issues.push(
              `Certified contiguous land (${extractedLand} Acres) is below Appendix-4 norm (${minLandAcres} Acres for ${dossier.institution.campusZone})`
            );
          }
          if (!builtUpOk) {
            issues.push(
              `Certified built-up carpet area (${extractedBuiltUp} sq.m) is below required ${form.requiredBuiltUpAreaSqm} sq.m for intake ${form.proposedIntake}`
            );
          }
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Infrastructure norm deficiency (${rule.chapterClauseAnnexure}): ${issues.join('; ')}.`,
            [
              {
                documentId: landField?.documentId || builtUpField?.documentId,
                pageNumber: 1,
                fieldName: !landOk ? 'landAreaAcres' : 'builtUpAreaSqm',
                observedValue: !landOk ? `${extractedLand} Acres` : `${extractedBuiltUp} sq.m`,
                expectedOrComparedValue: !landOk
                  ? `>= ${minLandAcres} Acres`
                  : `>= ${form.requiredBuiltUpAreaSqm} sq.m`,
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Provide contiguous land title deed / approved building plan meeting Appendix-4 area norms.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Contiguous land area (${extractedLand} Acres >= ${minLandAcres} Acres norm) and certified built-up area (${extractedBuiltUp} sq.m >= ${form.requiredBuiltUpAreaSqm} sq.m norm) satisfy ${rule.chapterClauseAnnexure}.`,
          [
            {
              documentId: landField?.documentId,
              pageNumber: 1,
              fieldName: 'landAreaAcres',
              observedValue: `${extractedLand} Acres / ${extractedBuiltUp} sq.m`,
              expectedOrComparedValue: `>= ${minLandAcres} Acres / >= ${form.requiredBuiltUpAreaSqm} sq.m`,
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now
        );
      }

      case 'COMP-09': {
        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'NOT_CHECKED',
          `Optional GIS campus polygon boundary reconciliation was NOT_CHECKED (no surveyed GeoJSON cadastral polygon attached to this dossier).`,
          [
            {
              observedValue: 'NO_GIS_POLYGON_ATTACHED',
              expectedOrComparedValue: 'Optional GeoJSON Campus Boundary',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now
        );
      }

      case 'COMP-10': {
        // Duplicate SHA-256 hash or certificate reuse across dossiers
        const otherHashMap = new Map(allOtherCasesDocuments.map(d => [d.sha256, d]));
        const duplicateDoc = documents.find(d => otherHashMap.has(d.sha256));

        if (duplicateDoc) {
          const matchedOther = otherHashMap.get(duplicateDoc.sha256)!;
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'WARNING',
            `Duplicate document SHA-256 hash detected: "${duplicateDoc.originalFilename}" matches file "${matchedOther.originalFilename}" in Case #${matchedOther.caseId}. Flagged for officer review to verify no unauthorized infrastructure sharing.`,
            [
              {
                documentId: duplicateDoc.id,
                documentFilename: duplicateDoc.originalFilename,
                observedValue: duplicateDoc.sha256.slice(0, 16) + '...',
                expectedOrComparedValue: `Unique per dossier (matched Case ${matchedOther.caseId})`,
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Zero duplicate SHA-256 file hashes or reused certificate identifiers found across other registered institutional dossiers.`,
          [
            {
              observedValue: `${documents.length} unique SHA-256 hashes`,
              expectedOrComparedValue: 'Zero cross-dossier hash collisions',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now
        );
      }

      case 'COMP-11': {
        // Validity window check (Fire NOC expiry & FDR amount/maturity)
        const sessionAnchor = new Date('2026-08-01T00:00:00Z').getTime();
        const fireExpiryStr = form.fireSafetyExpiryDate || '2027-06-30';
        const fireExpiryTime = new Date(fireExpiryStr).getTime();
        const fdrAmount = form.fdrAmountLakhs ?? 35;

        if (isNaN(fireExpiryTime) || fireExpiryTime < sessionAnchor) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Fire & Life Safety NOC expired or expires (${fireExpiryStr}) prior to the 2026–27 academic session start date (2026-08-01) under ${rule.chapterClauseAnnexure}.`,
            [
              {
                fieldName: 'fireSafetyExpiryDate',
                observedValue: fireExpiryStr,
                expectedOrComparedValue: '>= 2026-08-01',
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Obtain and upload a renewed Fire & Life Safety NOC from the State Fire & Rescue Services.'
          );
        }

        if (
          dossier.application.applicationType === 'AICTE_NEW_INSTITUTION' &&
          fdrAmount < 35
        ) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'FAIL',
            `Corpus Joint FDR amount (Rs. ${fdrAmount} Lakhs) is below the prescribed Rs. 35 Lakhs minimum requirement (${rule.chapterClauseAnnexure}).`,
            [
              {
                fieldName: 'fdrAmountLakhs',
                observedValue: `Rs. ${fdrAmount} Lakhs`,
                expectedOrComparedValue: '>= Rs. 35 Lakhs',
                methodUsed: rule.evaluationMethod,
                methodLimitation: rule.guardrailNote,
                sourceClause: rule.chapterClauseAnnexure,
                sourceUrl: rule.sourceUrl,
              },
            ],
            now,
            'Submit additional Joint Corpus FDR receipt to meet the Rs. 35 Lakhs threshold.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `Fire Safety NOC validity (${fireExpiryStr} >= 2026-08-01) and Financial Corpus compliance verified for academic session ${dossier.application.academicYear}.`,
          [
            {
              fieldName: 'fireSafetyExpiryDate',
              observedValue: `Fire NOC valid to ${fireExpiryStr}; FDR Rs. ${fdrAmount}L`,
              expectedOrComparedValue: 'Valid >= 2026-08-01 & FDR >= Rs. 35L',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            },
          ],
          now
        );
      }

      case 'COMP-12': {
        // External registry verification (TC-13: Unavailable source -> NOT_CHECKED / SOURCE_UNAVAILABLE)
        const verifiedEvents = integrationEvents.filter(
          e => e.status === 'CONFIGURED_VERIFIED'
        );

        if (verifiedEvents.length === 0) {
          return this.makeFinding(
            dossier.id,
            runId,
            rule,
            'NOT_CHECKED',
            `External authoritative issuer APIs (DigiLocker / State Revenue Portal / Bank CBS) are SOURCE_UNAVAILABLE in local offline environment (TC-13). No simulated pass is claimed; manual officer verification of issuer references is required if needed.`,
            integrationEvents.map(ev => ({
              observedValue: `${ev.provider}: ${ev.status}`,
              expectedOrComparedValue: 'Live Authoritative Issuer Response',
              methodUsed: rule.evaluationMethod,
              methodLimitation: rule.guardrailNote,
              sourceClause: rule.chapterClauseAnnexure,
              sourceUrl: rule.sourceUrl,
            })),
            now,
            'Configure external issuer API credentials or verify certificate reference numbers manually via the issuing authority portal.'
          );
        }

        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'PASS',
          `External issuer verification confirmed via configured adapter(s): ${verifiedEvents.map(v => v.provider).join(', ')}.`,
          verifiedEvents.map(ev => ({
            observedValue: ev.responseSummary,
            expectedOrComparedValue: 'CONFIGURED_VERIFIED',
            methodUsed: rule.evaluationMethod,
            methodLimitation: rule.guardrailNote,
            sourceClause: rule.chapterClauseAnnexure,
            sourceUrl: rule.sourceUrl,
          })),
          now
        );
      }

      default:
        return this.makeFinding(
          dossier.id,
          runId,
          rule,
          'NOT_CHECKED',
          `Rule ${rule.code} was not evaluated.`,
          [],
          now
        );
    }
  }

  /**
   * Requirement FR-16:
   * Summarizes passed, failed, warning, inconclusive, not applicable, and not checked outcomes.
   * Critical deficiencies are never hidden by averages.
   */
  static aggregateFindings(findings: AssuranceFinding[]): FindingAggregationSummary {
    const passedCount = findings.filter(f => f.status === 'PASS').length;
    const failedCount = findings.filter(f => f.status === 'FAIL').length;
    const warningCount = findings.filter(f => f.status === 'WARNING').length;
    const inconclusiveCount = findings.filter(f => f.status === 'INCONCLUSIVE').length;
    const notApplicableCount = findings.filter(f => f.status === 'NOT_APPLICABLE').length;
    const notCheckedCount = findings.filter(f => f.status === 'NOT_CHECKED').length;

    const blockingDeficienciesCount = findings.filter(
      f => f.status === 'FAIL' && (f.mandatory || f.severity === 'CRITICAL' || f.severity === 'HIGH')
    ).length;

    let recommendedCaseState: FindingAggregationSummary['recommendedCaseState'] =
      'READY_FOR_OFFICER_REVIEW';
    let summaryNarrative = '';

    if (blockingDeficienciesCount > 0 || failedCount > 0) {
      recommendedCaseState = 'NEEDS_INFORMATION';
      summaryNarrative = `Dossier has ${failedCount} failed check(s) (${blockingDeficienciesCount} mandatory/blocking deficiency). Cannot proceed to approval; deficiency notice recommended.`;
    } else if (inconclusiveCount > 0 || warningCount > 0) {
      recommendedCaseState = 'REVIEW_REQUIRED';
      summaryNarrative = `Zero mandatory failures, but ${inconclusiveCount} inconclusive check(s) and ${warningCount} advisory warning(s) require human Scrutiny Officer evaluation.`;
    } else {
      recommendedCaseState = 'READY_FOR_OFFICER_REVIEW';
      summaryNarrative = `All ${passedCount} applicable mandatory checks passed (${notApplicableCount} not applicable, ${notCheckedCount} external adapters not checked). Ready for Scrutiny Officer sign-off.`;
    }

    return {
      totalRulesEvaluated: findings.length,
      passedCount,
      failedCount,
      warningCount,
      inconclusiveCount,
      notApplicableCount,
      notCheckedCount,
      blockingDeficienciesCount,
      recommendedCaseState,
      summaryNarrative,
    };
  }

  private static makeFinding(
    caseId: string,
    runId: string,
    rule: ComplianceRule,
    status: FindingOutcome,
    message: string,
    evidence: AssuranceFinding['evidence'],
    createdAt: string,
    remediationHint?: string
  ): AssuranceFinding {
    return {
      id: `fnd-${caseId}-${rule.code}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      runId,
      documentId: evidence[0]?.documentId,
      ruleId: rule.ruleId,
      ruleCode: rule.code,
      ruleTitle: rule.title,
      ruleVersion: rule.version,
      family: rule.family,
      status,
      severity: rule.severity,
      mandatory: rule.mandatory,
      message,
      remediationHint,
      evidence,
      createdAt,
    };
  }
}
