/**
 * Domain: Review Decision — Scrutiny officer decisions, processing runs, reports,
 * and external integration events.
 *
 * Used by:
 *  - types/index.ts (re-exports)
 *  - repositories/dossier-repository.ts (ReviewDecision, ScrutinyReport, ProcessingRun, ExternalIntegrationEvent)
 *  - services/assurance/compliance-engine.ts (ExternalIntegrationEvent, ProcessingRun)
 *  - app/api/cases/[id]/route.ts (ReportBuilderService uses these types)
 */

import type { DossierStatus } from './application-dossier';
import type { FindingAggregationSummary } from './finding';

export type ReviewOutcome =
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN_FOR_CORRECTION'
  | 'ESCALATE';

export interface ReviewDecision {
  id: string;
  caseId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  outcome: ReviewOutcome;
  reason: string;
  conditions?: string;
  createdAt: string;
}

export type ProcessingRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

export interface ProcessingRun {
  id: string;
  caseId: string;
  ruleSetId: string;
  ruleSetVersion: string;
  idempotencyKey: string;
  status: ProcessingRunStatus;
  startedAt: string;
  completedAt?: string;
  findingSummary?: FindingAggregationSummary;
  triggeredBy: string;
  errorMessage?: string;
}

export type IntegrationProvider =
  | 'DIGILOCKER'
  | 'STATE_REVENUE_PORTAL'
  | 'BANK_CBS'
  | 'AADHAAR_EKYC'
  | 'AICTE_PORTAL';

export type IntegrationStatus =
  | 'CONFIGURED_VERIFIED'
  | 'SOURCE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'CREDENTIAL_MISSING'
  | 'NOT_CONFIGURED';

export interface ExternalIntegrationEvent {
  id: string;
  caseId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  requestedAt: string;
  respondedAt?: string;
  responseSummary?: string;
  errorMessage?: string;
}

export interface ScrutinyReport {
  id: string;
  caseId: string;
  runId: string;
  generatedAt: string;
  generatedBy: string;
  findingSummary: FindingAggregationSummary;
  recommendedStatus: DossierStatus;
  narrative: string;
  remediationItems: Array<{
    ruleCode: string;
    ruleTitle: string;
    hint: string;
    severity: string;
  }>;
}
