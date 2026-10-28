import crypto from 'crypto';
import {
  VerificationCase,
  DossierDocument,
  ExtractedFieldCandidate,
  AssuranceFinding,
  FindingAggregationSummary,
  ScrutinyReport,
  CampusZoneType,
} from '../../types';
import { RuleRepository } from '../../repositories/rule-repository';
import { ComplianceEngine } from './compliance-engine';

export interface RemediationPlanItem {
  ruleCode: string;
  ruleTitle: string;
  severity: string;
  findingStatus: string;
  deficiencySummary: string;
  remediationAction: string;
  estimatedResolutionDays: number;
  statutoryReference: string;
}

export interface RemediationPlan {
  totalDeficiencies: number;
  criticalBlockers: number;
  warningCount: number;
  items: RemediationPlanItem[];
  generatedAt: string;
}

export interface WhatIfSimulationParams {
  dossier: VerificationCase;
  documents: DossierDocument[];
  extractedFields: ExtractedFieldCandidate[];
  hypotheticalFormOverrides?: Partial<VerificationCase['application']['formData']>;
  hypotheticalAddedCategories?: string[];
  hypotheticalCampusZone?: CampusZoneType;
}

export interface WhatIfSimulationResult {
  simulatedCaseId: string;
  originalFindingSummary?: FindingAggregationSummary;
  simulatedFindingSummary: FindingAggregationSummary;
  deltaSummary: {
    criticalBlockersResolved: number;
    warningsResolved: number;
    rulesNewlyPassing: string[];
    rulesRemainingDeficient: string[];
  };
  simulatedFindings: AssuranceFinding[];
}

export class ReportBuilderService {
  /**
   * Requirement FR-18: Constructs an actionable remediation plan from compliance findings.
   */
  static buildRemediationPlan(findings: AssuranceFinding[]): RemediationPlan {
    const deficientFindings = findings.filter(
      f => f.status === 'FAIL' || f.status === 'WARNING' || f.status === 'INCONCLUSIVE'
    );

    const items: RemediationPlanItem[] = deficientFindings.map(f => {
      const clauseStr = f.sourceClause || f.evidence?.[0]?.sourceClause || 'AICTE APH';
      let remediationAction = `Review statutory requirement under ${clauseStr}.`;
      let estimatedResolutionDays = 3;

      switch (f.ruleCode) {
        case 'COMP-01':
          remediationAction =
            'Upload missing statutory annexure PDF files through the Private Uploads tab, ensuring filenames clearly reflect document types.';
          estimatedResolutionDays = 2;
          break;
        case 'COMP-02':
          remediationAction =
            'Verify and re-enter AICTE portal application reference number to match the 1-xxxxxxxxxx or APP-2026 format.';
          estimatedResolutionDays = 1;
          break;
        case 'COMP-03':
          remediationAction =
            'Resolve legal entity naming orthographic discrepancy. Submit formal gazette notification, trust resolution, or rectification deed.';
          estimatedResolutionDays = 7;
          break;
        case 'COMP-04':
          remediationAction =
            'Harmonize campus jurisdiction details with registered land revenue records and municipal boundary survey.';
          estimatedResolutionDays = 4;
          break;
        case 'COMP-05':
          remediationAction =
            'Re-export document directly from official source portal without using consumer PDF manipulation utilities (Canva, SmallPDF).';
          estimatedResolutionDays = 1;
          break;
        case 'COMP-06':
          remediationAction =
            'Provide high-resolution flatbed scanner copy (>= 300 DPI, uncompressed color) of the original paper certificate.';
          estimatedResolutionDays = 2;
          break;
        case 'COMP-07':
          remediationAction =
            'Ensure sworn affidavit is executed on non-judicial stamp paper of >= Rs. 100 denomination and cryptographically signed with Class-3 DSC.';
          estimatedResolutionDays = 3;
          break;
        case 'COMP-08':
          remediationAction =
            'Submit registered continuous land title deed meeting minimum land area norm (1.5 acres urban / 4.0 acres rural) or sanctioned built-up plan.';
          estimatedResolutionDays = 14;
          break;
        case 'COMP-11':
          remediationAction =
            'Renew Fire Safety NOC with State Fire & Rescue Services Department or revalidate Bank Fixed Deposit Receipt corpus with branch manager.';
          estimatedResolutionDays = 10;
          break;
        default:
          remediationAction = `Address deficiency noted in: ${f.summaryText || f.message}`;
          break;
      }

      return {
        ruleCode: f.ruleCode,
        ruleTitle: f.ruleTitle,
        severity: f.severity,
        findingStatus: f.status,
        deficiencySummary: f.summaryText || f.message,
        remediationAction,
        estimatedResolutionDays,
        statutoryReference: clauseStr,
      };
    });

    const criticalBlockers = items.filter(
      i => i.severity === 'CRITICAL' && (i.findingStatus === 'FAIL' || i.findingStatus === 'INCONCLUSIVE')
    ).length;
    const warningCount = items.filter(i => i.findingStatus === 'WARNING').length;

    return {
      totalDeficiencies: items.length,
      criticalBlockers,
      warningCount,
      items,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Requirement FR-22: What-If Compliance Simulator.
   * Simulates outcome of changing inputs (e.g. adding missing documents, changing land area, etc.)
   */
  static runWhatIfSimulation(params: WhatIfSimulationParams): WhatIfSimulationResult {
    const {
      dossier,
      documents,
      extractedFields,
      hypotheticalFormOverrides,
      hypotheticalAddedCategories,
      hypotheticalCampusZone,
    } = params;

    // Deep copy dossier
    const simulatedDossier: VerificationCase = JSON.parse(JSON.stringify(dossier));
    if (hypotheticalFormOverrides) {
      simulatedDossier.application.formData = {
        ...simulatedDossier.application.formData,
        ...hypotheticalFormOverrides,
      };
    }
    if (hypotheticalCampusZone) {
      simulatedDossier.institution.campusZone = hypotheticalCampusZone;
    }

    // Clone documents and add synthetic documents for hypothetical categories
    const simulatedDocs: DossierDocument[] = JSON.parse(JSON.stringify(documents));
    if (Array.isArray(hypotheticalAddedCategories) && hypotheticalAddedCategories.length > 0) {
      const existingCats = new Set(simulatedDocs.map(d => d.declaredCategory));
      for (const cat of hypotheticalAddedCategories) {
        if (!existingCats.has(cat as any)) {
          const fakeDocId = `doc-sim-${crypto.randomUUID().slice(0, 8)}`;
          simulatedDocs.push({
            id: fakeDocId,
            caseId: dossier.id,
            declaredCategory: cat as any,
            classifiedCategory: cat as any,
            classificationConfidence: 0.98,
            originalFilename: `hypothetical_${cat.toLowerCase()}.pdf`,
            originalStorageKey: `private://hypothetical_${fakeDocId}.pdf`,
            derivedPreviewUrl: `/api/documents/${fakeDocId}/file`,
            mimeType: 'application/pdf',
            byteSize: 245000,
            sha256: crypto.createHash('sha256').update(`sim-${cat}-${Date.now()}`).digest('hex'),
            pageCount: 2,
            language: 'English',
            uploadActorId: 'sim-user',
            uploadActorName: 'What-If Simulation Engine',
            uploadedAt: new Date().toISOString(),
            processingStatus: 'ANALYZED',
            rawExtractedText: `Hypothetical extracted text for ${cat}`,
          });
        }
      }
    }

    const ruleSet = RuleRepository.resolveActiveRuleSetForProfile(
      simulatedDossier.application.applicationType
    );

    const simEval = ComplianceEngine.evaluateDossier({
      dossier: simulatedDossier,
      ruleSet,
      documents: simulatedDocs,
      extractedFields,
      runId: `run-sim-${Date.now()}`,
    });

    const originalEval = ComplianceEngine.evaluateDossier({
      dossier,
      ruleSet,
      documents,
      extractedFields,
      runId: `run-orig-${Date.now()}`,
    });

    const origFailCodes = new Set(
      originalEval.findings.filter(f => f.status === 'FAIL').map(f => f.ruleCode)
    );
    const simPassCodes = new Set(
      simEval.findings.filter(f => f.status === 'PASS').map(f => f.ruleCode)
    );
    const rulesNewlyPassing = Array.from(origFailCodes).filter(c => simPassCodes.has(c));
    const rulesRemainingDeficient = simEval.findings
      .filter(f => f.status === 'FAIL')
      .map(f => f.ruleCode);

    return {
      simulatedCaseId: dossier.id,
      originalFindingSummary: originalEval.summary,
      simulatedFindingSummary: simEval.summary,
      deltaSummary: {
        criticalBlockersResolved:
          originalEval.summary.blockingDeficienciesCount - simEval.summary.blockingDeficienciesCount,
        warningsResolved:
          originalEval.summary.warningCount - simEval.summary.warningCount,
        rulesNewlyPassing,
        rulesRemainingDeficient,
      },
      simulatedFindings: simEval.findings,
    };
  }

  /**
   * Requirement FR-18: Constructs downloadable Scrutiny & Deficiency Report.
   */
  static buildScrutinyReport(params: {
    dossier: VerificationCase;
    runId: string;
    findingSummary: FindingAggregationSummary;
    findings: AssuranceFinding[];
    generatedBy: string;
  }): ScrutinyReport {
    const { dossier, runId, findingSummary, findings, generatedBy } = params;
    const plan = this.buildRemediationPlan(findings);

    const isClearPass = (findingSummary.blockingDeficienciesCount === 0 && findingSummary.failedCount === 0);
    const recommendedStatus = isClearPass
      ? 'READY_FOR_OFFICER_REVIEW'
      : findingSummary.blockingDeficienciesCount > 0
      ? 'REJECTED'
      : 'NEEDS_INFORMATION';

    const narrative = `Automated institutional compliance evaluation for ${dossier.institution.legalName} (${dossier.id}) produced ${findingSummary.passedCount} PASS, ${findingSummary.failedCount} FAIL, ${findingSummary.warningCount} WARNING, and ${findingSummary.inconclusiveCount} INCONCLUSIVE findings across statutory AICTE norms.`;

    return {
      id: `report-${crypto.randomUUID().slice(0, 8)}`,
      caseId: dossier.id,
      runId,
      generatedAt: new Date().toISOString(),
      generatedBy,
      findingSummary,
      recommendedStatus,
      narrative,
      remediationItems: plan.items.map(i => ({
        ruleCode: i.ruleCode,
        ruleTitle: i.ruleTitle,
        hint: i.remediationAction,
        severity: i.severity,
      })),
    };
  }
}
