/**
 * Domain: Finding — Compliance engine finding outcomes, aggregation summaries,
 * and cross-document concordance matrix.
 *
 * Used by:
 *  - types/index.ts (re-exports)
 *  - services/assurance/compliance-engine.ts (AssuranceFinding, FindingOutcome, FindingAggregationSummary, ConcordanceRow)
 *  - repositories/dossier-repository.ts (AssuranceFinding)
 */

import type { RuleFamily, RuleSeverity } from './compliance-rule';
import type { DossierStatus } from './application-dossier';

export type FindingOutcome =
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'INCONCLUSIVE'
  | 'NOT_APPLICABLE'
  | 'NOT_CHECKED';

export interface AssuranceFindingEvidence {
  documentId?: string;
  documentFilename?: string;
  pageNumber?: number;
  bbox?: [number, number, number, number];
  fieldName?: string;
  observedValue?: string | number;
  expectedOrComparedValue?: string | number;
  similarityScore?: number;
  methodUsed?: string;
  methodLimitation?: string;
  sourceClause?: string;
  sourceUrl?: string;
}

export interface AssuranceFinding {
  id: string;
  caseId: string;
  runId: string;
  documentId?: string;
  ruleId: string;
  ruleCode: string;
  ruleTitle: string;
  ruleVersion: string;
  family: RuleFamily;
  status: FindingOutcome;
  severity: RuleSeverity;
  mandatory: boolean;
  message: string;
  summaryText?: string;
  sourceClause?: string;
  remediationHint?: string;
  evidence: AssuranceFindingEvidence[];
  createdAt: string;
  isExperimentalIndicator?: boolean;
}

export interface FindingAggregationSummary {
  totalRulesEvaluated: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  inconclusiveCount: number;
  notApplicableCount: number;
  notCheckedCount: number;
  blockingDeficienciesCount: number;
  passCount?: number;
  failCount?: number;
  warningsCount?: number;
  criticalFailures?: number;
  recommendedCaseState: Extract<DossierStatus, 'NEEDS_INFORMATION' | 'REVIEW_REQUIRED' | 'READY_FOR_OFFICER_REVIEW'>;
  summaryNarrative: string;
}

export type ConcordanceMatchStatus = 'MATCH' | 'MISMATCH' | 'FUZZY_WARNING';

export interface ConcordanceSupportingDoc {
  documentId: string;
  documentName: string;
  pageNumber: number;
  extractedValue: string;
  matchStatus: ConcordanceMatchStatus;
  similarity: number;
}

export interface ConcordanceRow {
  fieldKey: string;
  fieldLabel: string;
  declaredValue: string;
  supportingDocuments: ConcordanceSupportingDoc[];
}
