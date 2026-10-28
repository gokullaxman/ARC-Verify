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
import { DatabaseService } from '../lib/db';
import { INITIAL_SYNTHETIC_DOSSIERS } from '../lib/arc-verify-Priority-seeds';

export class DossierRepository {
  public auditRepo: AuditRepository = new AuditRepository();
  public db: DatabaseService;

  constructor(customDbPath?: string) {
    this.db = DatabaseService.getInstance(customDbPath);
    this.syncAuditFromDb();
  }

  public syncAuditFromDb(): void {
    try {
      const rows = this.db.db.prepare('SELECT * FROM audit_events ORDER BY sequence_number ASC').all() as any[];
      this.auditRepo.setAllChronological(
        rows.map(e => ({
          id: e.id,
          eventId: e.id,
          sequenceNumber: e.sequence_number,
          caseId: e.case_id || undefined,
          actorId: e.actor_id,
          actorName: e.actor_name,
          actorRole: e.actor_role,
          action: e.action,
          entityType: e.entity_type,
          entityId: e.entity_id,
          reasonOrSummary: e.reason,
          previousHash: e.previous_hash,
          eventHash: e.event_hash,
          timestamp: e.timestamp_utc,
          timestampUtc: e.timestamp_utc,
          details: e.details_json ? JSON.parse(e.details_json) : undefined,
        }))
      );
    } catch {
      // In-memory fallback during isolated test setups
    }
  }

  getDatabasePath(): string {
    return this.db.dbPath;
  }

  loadFromSqliteOrSeed(): void {
    this.syncAuditFromDb();
  }

  saveToSqlite(): void {
    try {
      const memEvents = this.auditRepo.getAllChronological();
      const existingIds = new Set(
        (this.db.db.prepare('SELECT id FROM audit_events').all() as any[]).map(r => r.id)
      );

      const insertEvent = this.db.db.prepare(`
        INSERT OR REPLACE INTO audit_events (
          id, sequence_number, case_id, actor_id, actor_name, actor_role, action,
          entity_type, entity_id, reason, previous_hash, event_hash, timestamp_utc, details_json
        ) VALUES (
          @id, @sequenceNumber, @caseId, @actorId, @actorName, @actorRole, @action,
          @entityType, @entityId, @reason, @previousHash, @eventHash, @timestampUtc, @detailsJson
        )
      `);

      const saveTransaction = this.db.db.transaction(() => {
        for (const ev of memEvents) {
          if (!existingIds.has(ev.id)) {
            insertEvent.run({
              id: ev.id,
              sequenceNumber: ev.sequenceNumber,
              caseId: ev.caseId || null,
              actorId: ev.actorId,
              actorName: ev.actorName,
              actorRole: ev.actorRole,
              action: ev.action,
              entityType: ev.entityType,
              entityId: ev.entityId,
              reason: ev.reasonOrSummary || (ev as any).reason || '',
              previousHash: ev.previousHash,
              eventHash: ev.eventHash,
              timestampUtc: ev.timestampUtc || ev.timestamp,
              detailsJson: ev.details ? JSON.stringify(ev.details) : null,
            });
          }
        }
      });

      saveTransaction();
    } catch (err) {
      console.warn('[DossierRepository] saveToSqlite error:', err);
    }
  }

  saveToDisk(): void {}

  resetToSyntheticSeeds(preserveNonDemo: boolean = true): void {
    const seeded = INITIAL_SYNTHETIC_DOSSIERS();
    for (const c of seeded.cases) {
      this.db.saveCase(c);
    }
    for (const d of seeded.documents) {
      this.db.saveDocument(d);
    }
    for (const f of seeded.extractedFields) {
      this.db.saveExtractedField(f);
    }
    for (const ev of seeded.auditInputs) {
      this.auditRepo.appendEvent(ev);
    }
  }

  listCases(filter?: { status?: string; institutionId?: string }): VerificationCase[] {
    return this.db.listCases(filter);
  }

  getCaseById(id: string): VerificationCase | null {
    return this.db.getCaseById(id);
  }

  saveCase(c: VerificationCase): void {
    this.db.saveCase(c);
  }

  createCase(c: VerificationCase): void {
    this.saveCase(c);
  }

  listDocuments(caseId: string): DossierDocument[] {
    return this.db.listDocuments(caseId);
  }

  listDocumentsByCase(caseId: string): DossierDocument[] {
    return this.listDocuments(caseId);
  }

  listAllDocuments(): DossierDocument[] {
    const rows = this.db.db.prepare('SELECT payload_json FROM dossier_documents').all() as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  getDocumentById(id: string): DossierDocument | null {
    return this.db.getDocumentById(id);
  }

  saveDocument(doc: DossierDocument): void {
    this.db.saveDocument(doc);
  }

  addDocument(doc: DossierDocument): void {
    this.saveDocument(doc);
  }

  deleteDocument(id: string): boolean {
    const row = this.db.getDocumentById(id);
    if (!row) return false;
    this.db.db.prepare('DELETE FROM dossier_documents WHERE id = ?').run(id);
    return true;
  }

  replaceFieldsForDocument(documentId: string, fields: ExtractedFieldCandidate[]): void {
    this.db.db.prepare('DELETE FROM extracted_fields WHERE document_id = ?').run(documentId);
    for (const f of fields) {
      this.saveExtractedField(f);
    }
  }

  listExtractedFields(caseId: string): ExtractedFieldCandidate[] {
    return this.db.listExtractedFields(caseId);
  }

  listExtractedFieldsByCase(caseId: string): ExtractedFieldCandidate[] {
    return this.listExtractedFields(caseId);
  }

  listFieldsByCase(caseId: string): ExtractedFieldCandidate[] {
    return this.listExtractedFields(caseId);
  }

  listFieldsByDocument(documentId: string): ExtractedFieldCandidate[] {
    return this.db.listExtractedFieldsByDocument(documentId);
  }

  correctField(params: {
    fieldId: string;
    newValue: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    reason: string;
  }): ExtractedFieldCandidate {
    const existing = this.db.getFieldById(params.fieldId);
    if (!existing) {
      throw new Error(`Field not found: ${params.fieldId}`);
    }
    const updated: ExtractedFieldCandidate = {
      ...existing,
      originalOcrValue: existing.originalOcrValue || existing.rawValue,
      rawValue: params.newValue,
      normalizedValue: params.newValue,
      isManuallyCorrected: true,
      confidence: 1.0,
      correctedByActorId: params.actorId,
      correctedByActorName: params.actorName,
      correctionReason: params.reason,
      correctedAt: new Date().toISOString(),
    };
    this.saveExtractedField(updated);
    return updated;
  }

  saveExtractedField(field: ExtractedFieldCandidate): void {
    this.db.saveExtractedField(field);
  }

  recordProcessingRun(run: ProcessingRun, findings: AssuranceFinding[]): void {
    this.db.saveProcessingRun(run, findings);
  }

  listRuns(caseId: string): ProcessingRun[] {
    const rows = this.db.db.prepare('SELECT payload_json FROM processing_runs WHERE case_id = ? ORDER BY started_at DESC').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  listRunsByCase(caseId: string): ProcessingRun[] {
    return this.listRuns(caseId);
  }

  listFindings(caseId: string): AssuranceFinding[] {
    return this.db.listFindings(caseId);
  }

  listFindingsByCase(caseId: string): AssuranceFinding[] {
    return this.listFindings(caseId);
  }

  recordReviewDecision(decision: ReviewDecision): void {
    this.db.saveReviewDecision(decision);
  }

  listReviewDecisions(caseId: string): ReviewDecision[] {
    return this.db.listReviewDecisions(caseId);
  }

  listDecisionsByCase(caseId: string): ReviewDecision[] {
    return this.listReviewDecisions(caseId);
  }

  saveScrutinyReport(report: ScrutinyReport): void {
    this.db.db.prepare(`
      INSERT INTO scrutiny_reports (id, case_id, generated_at, generated_by, report_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET report_json = excluded.report_json
    `).run(report.id, report.caseId, report.generatedAt, report.generatedBy, JSON.stringify(report));
  }

  getScrutinyReport(caseId: string): ScrutinyReport | null {
    const row = this.db.db.prepare('SELECT report_json FROM scrutiny_reports WHERE case_id = ? ORDER BY generated_at DESC LIMIT 1').get(caseId) as any;
    if (!row) return null;
    return JSON.parse(row.report_json);
  }

  listReportsByCase(caseId: string): ScrutinyReport[] {
    const report = this.getScrutinyReport(caseId);
    return report ? [report] : [];
  }

  recordIntegrationEvent(event: ExternalIntegrationEvent): void {
    this.db.db.prepare(`
      INSERT OR REPLACE INTO integration_events (id, case_id, adapter_name, external_system, status, timestamp, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(event.id, event.caseId, event.provider, event.provider, event.status, event.requestedAt, JSON.stringify(event));
  }

  listIntegrationEvents(caseId: string): ExternalIntegrationEvent[] {
    const rows = this.db.db.prepare('SELECT payload_json FROM integration_events WHERE case_id = ? ORDER BY timestamp DESC').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  listIntegrationEventsByCase(caseId: string): ExternalIntegrationEvent[] {
    return this.listIntegrationEvents(caseId);
  }
}

// Global Singleton
let globalDossierRepo: DossierRepository | null = null;

export function getDossierRepository(): DossierRepository {
  if (!globalDossierRepo) {
    globalDossierRepo = new DossierRepository();
  }
  return globalDossierRepo;
}
