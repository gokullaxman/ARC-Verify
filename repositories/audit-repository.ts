/**
 * Repository: Audit Repository — Append-only SHA-256 hash chain for tamper-evident audit events.
 *
 * Used by:
 *  - repositories/dossier-repository.ts (AuditRepository)
 *  - app/api/cases/route.ts (appendEvent)
 *  - app/api/cases/[id]/route.ts (listEvents)
 *  - app/api/cases/[id]/documents/route.ts (appendEvent)
 *  - tests/arc_verify_audit_remediation.test.ts (verifyChainIntegrity)
 */

import crypto from 'crypto';

export interface AuditEventInput {
  caseId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reasonOrSummary: string;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  eventId?: string;
  sequenceNumber: number;
  timestamp: string;
  timestampUtc: string;
  previousHash: string;
  eventHash: string;
}

/**
 * Append-only audit log with SHA-256 hash chain.
 * Each event's `eventHash` = SHA-256(`previousHash` + `id` + `timestamp` + `action` + `entityId`).
 * Tampering with or reordering any event breaks the chain.
 */
export class AuditRepository {
  private events: AuditEvent[] = [];

  appendEvent(input: AuditEventInput): AuditEvent {
    const previousHash =
      this.events.length > 0
        ? this.events[this.events.length - 1].eventHash
        : '0000000000000000000000000000000000000000000000000000000000000000';

    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;
    const timestamp = new Date().toISOString();
    const sequenceNumber = this.events.length + 1;

    const hashPayload = `${previousHash}|${id}|${timestamp}|${input.action}|${input.entityId}`;
    const eventHash = crypto
      .createHash('sha256')
      .update(hashPayload)
      .digest('hex');

    const event: AuditEvent = {
      ...input,
      id,
      eventId: id,
      sequenceNumber,
      timestamp,
      timestampUtc: timestamp,
      previousHash,
      eventHash,
    };

    this.events.push(event);
    return event;
  }

  listEvents(filter?: { caseId?: string; limit?: number; action?: string }): AuditEvent[] {
    let result = [...this.events].reverse();

    if (filter?.caseId) {
      result = result.filter(e => e.caseId === filter.caseId);
    }
    if (filter?.action) {
      result = result.filter(e => e.action === filter.action);
    }
    if (filter?.limit && filter.limit > 0) {
      result = result.slice(0, filter.limit);
    }

    return result.map(e => ({ ...e, eventId: e.id }));
  }

  verifyHashChainIntegrity() {
    const res = this.verifyChainIntegrity();
    return {
      isValid: res.valid,
      valid: res.valid,
      totalEventsChecked: this.events.length,
      brokenAtIndex: res.brokenAtIndex,
      expectedHash: res.expectedHash,
      actualHash: res.actualHash,
    };
  }

  getAllChronological(): AuditEvent[] {
    return [...this.events];
  }

  setAllChronological(events: AuditEvent[]): void {
    this.events = [...events];
  }

  /**
   * Verifies the integrity of the entire hash chain.
   * Returns { valid: true } if no tampering detected, or
   * { valid: false, brokenAtIndex, expectedHash, actualHash } on the first break.
   */
  verifyChainIntegrity(): {
    valid: boolean;
    brokenAtIndex?: number;
    expectedHash?: string;
    actualHash?: string;
  } {
    if (this.events.length === 0) {
      return { valid: true };
    }

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const expectedPreviousHash =
        i === 0
          ? '0000000000000000000000000000000000000000000000000000000000000000'
          : this.events[i - 1].eventHash;

      if (event.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          brokenAtIndex: i,
          expectedHash: expectedPreviousHash,
          actualHash: event.previousHash,
        };
      }

      const recomputedPayload = `${event.previousHash}|${event.id}|${event.timestamp}|${event.action}|${event.entityId}`;
      const recomputedHash = crypto
        .createHash('sha256')
        .update(recomputedPayload)
        .digest('hex');

      if (recomputedHash !== event.eventHash) {
        return {
          valid: false,
          brokenAtIndex: i,
          expectedHash: recomputedHash,
          actualHash: event.eventHash,
        };
      }
    }

    return { valid: true };
  }
}
