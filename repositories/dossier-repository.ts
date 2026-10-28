import {
  VerificationCase,
  DossierDocument,
  ExtractedFieldCandidate,
  AssuranceFinding,
  ProcessingRun,
  ReviewDecision,
  ScrutinyReport,
  ExternalIntegrationEvent,
} from '../types';
import { AuditRepository } from './audit-repository';
import { INITIAL_SYNTHETIC_DOSSIERS } from '../lib/arc-verify-Priority-seeds';
import { SqliteDatabase } from '../lib/sqlite-db';

export class DossierRepository {
  private cases: VerificationCase[] = [];
  private documents: DossierDocument[] = [];
  private extractedFields: ExtractedFieldCandidate[] = [];
  private runs: ProcessingRun[] = [];
  private findings: AssuranceFinding[] = [];
  private decisions: ReviewDecision[] = [];
  private reports: ScrutinyReport[] = [];
  private integrationEvents: ExternalIntegrationEvent[] = [];
  public auditRepo: AuditRepository = new AuditRepository();
  private sqliteDbPath: string;

  constructor(customDbPath?: string) {
    this.sqliteDbPath = SqliteDatabase.resolveDbPath(customDbPath);
    this.loadFromSqliteOrSeed();
  }

  getDatabasePath(): string {
    return this.sqliteDbPath;
  }

  loadFromSqliteOrSeed(): void {
    try {
      const state = SqliteDatabase.executeOp(this.sqliteDbPath, 'load_dossier_state');
      if (Array.isArray(state.cases) && state.cases.length > 0) {
        this.cases = state.cases;
        this.documents = state.dossier_documents || [];
        this.extractedFields = state.extracted_fields || [];
        this.runs = state.processing_runs || [];
        this.findings = state.findings || [];
        this.decisions = state.review_decisions || [];
        this.reports = state.scrutiny_reports || [];
        this.integrationEvents = state.integration_events || [];
        this.auditRepo.setAllChronological(state.audit_events || []);
        return;
      }
    } catch (err) {
      console.warn('[DossierRepository] Failed to read SQLite database, seeding synthetic corpus:', err);
    }

    this.resetToSyntheticSeeds();
  }

  saveToSqlite(): void {
    try {
      SqliteDatabase.executeOp(this.sqliteDbPath, 'save_dossier_state', {
        cases: this.cases,
        documents: this.documents,
        extractedFields: this.extractedFields,
        runs: this.runs,
        findings: this.findings,
        decisions: this.decisions,
        reports: this.reports,
        integrationEvents: this.integrationEvents,
        auditEvents: this.auditRepo.getAllChronological(),
      });
    } catch (err) {
      console.warn('[DossierRepository] SQLite persist warning:', err);
    }
  }

  saveToDisk(): void {
    this.saveToSqlite();
  }

  /**
   * Requirement FR-22: Reset synthetic demo data safely without deleting non-demo records.
   */
  resetToSyntheticSeeds(preserveNonDemo: boolean = true): void {
    const nonDemoCases = preserveNonDemo ? this.cases.filter(c => !c.isSyntheticDemo) : [];
    const nonDemoCaseIds = new Set(nonDemoCases.map(c => c.id));

    const seeded = INITIAL_SYNTHETIC_DOSSIERS();
    this.cases = [...nonDemoCases, ...seeded.cases];
    this.documents = [
      ...(preserveNonDemo ? this.documents.filter(d => nonDemoCaseIds.has(d.caseId)) : []),
      ...seeded.documents,
    ];
    this.extractedFields = [
      ...(preserveNonDemo ? this.extractedFields.filter(f => nonDemoCaseIds.has(f.caseId)) : []),
      ...seeded.extractedFields,
    ];
    this.runs = [
      ...(preserveNonDemo ? this.runs.filter(r => nonDemoCaseIds.has(r.caseId)) : []),
      ...seeded.runs,
    ];
    this.findings = [
      ...(preserveNonDemo ? this.findings.filter(f => nonDemoCaseIds.has(f.caseId)) : []),
      ...seeded.findings,
    ];
    this.decisions = [
      ...(preserveNonDemo ? this.decisions.filter(d => nonDemoCaseIds.has(d.caseId)) : []),
      ...seeded.decisions,
    ];
    this.reports = [
      ...(preserveNonDemo ? this.reports.filter(r => nonDemoCaseIds.has(r.caseId)) : []),
      ...seeded.reports,
    ];
    this.integrationEvents = [
      ...(preserveNonDemo ? this.integrationEvents.filter(e => nonDemoCaseIds.has(e.caseId)) : []),
      ...seeded.integrationEvents,
    ];

    if (this.auditRepo.getAllChronological().length === 0 || !preserveNonDemo) {
      this.auditRepo = new AuditRepository();
      for (const seedAudit of seeded.auditInputs) {
        this.auditRepo.appendEvent(seedAudit);
      }
    }

    this.saveToSqlite();
  }

  // Case CRUD
  listCases(): VerificationCase[] {
    return [...this.cases].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getCaseById(caseId: string): VerificationCase | undefined {
    return this.cases.find(c => c.id === caseId);
  }

  createCase(newCase: VerificationCase): VerificationCase {
    this.cases.unshift(newCase);
    this.saveToSqlite();
    return newCase;
  }

  updateCase(caseId: string, updates: Partial<VerificationCase>): VerificationCase | undefined {
    const idx = this.cases.findIndex(c => c.id === caseId);
    if (idx === -1) return undefined;
    this.cases[idx] = {
      ...this.cases[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveToSqlite();
    return this.cases[idx];
  }

  // Documents
  listDocumentsByCase(caseId: string): DossierDocument[] {
    return this.documents.filter(d => d.caseId === caseId);
  }

  listAllDocuments(): DossierDocument[] {
    return [...this.documents];
  }

  getDocumentById(docId: string): DossierDocument | undefined {
    return this.documents.find(d => d.id === docId);
  }

  addDocument(doc: DossierDocument): DossierDocument {
    this.documents.push(doc);
    this.saveToSqlite();
    return doc;
  }

  updateDocument(docId: string, updates: Partial<DossierDocument>): DossierDocument | undefined {
    const idx = this.documents.findIndex(d => d.id === docId);
    if (idx === -1) return undefined;
    this.documents[idx] = { ...this.documents[idx], ...updates };
    this.saveToSqlite();
    return this.documents[idx];
  }

  // Extracted Fields
  listFieldsByCase(caseId: string): ExtractedFieldCandidate[] {
    return this.extractedFields.filter(f => f.caseId === caseId);
  }

  listFieldsByDocument(docId: string): ExtractedFieldCandidate[] {
    return this.extractedFields.filter(f => f.documentId === docId);
  }

  replaceFieldsForDocument(docId: string, fields: ExtractedFieldCandidate[]): void {
    this.extractedFields = this.extractedFields.filter(
      f => f.documentId !== docId || f.isManuallyCorrected
    );
    const manuallyCorrectedNames = new Set(
      this.extractedFields.filter(f => f.documentId === docId).map(f => f.fieldName)
    );
    for (const field of fields) {
      if (!manuallyCorrectedNames.has(field.fieldName)) {
        this.extractedFields.push(field);
      }
    }
    this.saveToSqlite();
  }

  correctField(params: {
    fieldId: string;
    newValue: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    reason: string;
  }): ExtractedFieldCandidate | undefined {
    const idx = this.extractedFields.findIndex(f => f.id === params.fieldId);
    if (idx === -1) return undefined;
    const existing = this.extractedFields[idx];
    const originalOcr = existing.originalOcrValue ?? existing.rawValue;

    const updated: ExtractedFieldCandidate = {
      ...existing,
      rawValue: params.newValue,
      normalizedValue: params.newValue.trim(),
      isManuallyCorrected: true,
      originalOcrValue: originalOcr,
      correctedByActorId: params.actorId,
      correctedByActorName: params.actorName,
      correctionReason: params.reason,
      correctedAt: new Date().toISOString(),
    };
    this.extractedFields[idx] = updated;

    this.auditRepo.appendEvent({
      caseId: existing.caseId,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: 'EXTRACTED_FIELD_CORRECTED',
      entityType: 'EXTRACTED_FIELD',
      entityId: existing.id,
      reasonOrSummary: `Field "${existing.fieldLabel}" corrected from "${originalOcr}" to "${params.newValue}". Reason: ${params.reason}`,
    });

    this.saveToSqlite();
    return updated;
  }

  // Processing Runs & Findings
  getRunByIdempotencyKey(caseId: string, idempotencyKey: string): ProcessingRun | undefined {
    return this.runs.find(r => r.caseId === caseId && r.idempotencyKey === idempotencyKey);
  }

  listRunsByCase(caseId: string): ProcessingRun[] {
    return this.runs.filter(r => r.caseId === caseId);
  }

  saveRun(run: ProcessingRun): ProcessingRun {
    const idx = this.runs.findIndex(r => r.id === run.id);
    if (idx === -1) {
      this.runs.unshift(run);
    } else {
      this.runs[idx] = run;
    }
    this.saveToSqlite();
    return run;
  }

  replaceFindingsForCase(caseId: string, newFindings: AssuranceFinding[]): void {
    this.findings = this.findings.filter(f => f.caseId !== caseId);
    this.findings.push(...newFindings);
    this.saveToSqlite();
  }

  listFindingsByCase(caseId: string): AssuranceFinding[] {
    return this.findings.filter(f => f.caseId === caseId);
  }

  // Review Decisions
  addReviewDecision(decision: ReviewDecision): ReviewDecision {
    this.decisions.unshift(decision);
    this.saveToSqlite();
    return decision;
  }

  listDecisionsByCase(caseId: string): ReviewDecision[] {
    return this.decisions.filter(d => d.caseId === caseId);
  }

  // Integration Events
  replaceIntegrationEventsForCase(caseId: string, events: ExternalIntegrationEvent[]): void {
    this.integrationEvents = this.integrationEvents.filter(e => e.caseId !== caseId);
    this.integrationEvents.push(...events);
    this.saveToSqlite();
  }

  listIntegrationEventsByCase(caseId: string): ExternalIntegrationEvent[] {
    return this.integrationEvents.filter(e => e.caseId === caseId);
  }

  // Reports
  saveReport(report: ScrutinyReport): ScrutinyReport {
    this.reports.unshift(report);
    this.saveToSqlite();
    return report;
  }

  listReportsByCase(caseId: string): ScrutinyReport[] {
    return this.reports.filter(r => r.caseId === caseId);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __arcVerifyDossierRepo: DossierRepository | undefined;
}

export function getDossierRepository(): DossierRepository {
  if (!global.__arcVerifyDossierRepo) {
    global.__arcVerifyDossierRepo = new DossierRepository();
  }
  return global.__arcVerifyDossierRepo;
}
