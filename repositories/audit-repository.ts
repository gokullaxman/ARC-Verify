/**
 * Repository: Audit Repository — Append-only HMAC-SHA256 hash chain for tamper-evident audit events.
 * Key outside the DB (AUDIT_KEY).
 *
 * Payload: [prev, id, ts, caseId, actorId, actorRole, action, entityType, entityId, reason]
 */

import crypto from 'crypto';
import { AUDIT_KEY } from '@/lib/env';

export interface AuditEventInput {
  caseId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reasonOrSummary: string;
  details?: any;
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

    // Canonical payload: [prev, id, ts, caseId, actorId, actorRole, action, entityType, entityId, reason]
    const hashPayload = [
      previousHash,
      id,
      timestamp,
      input.caseId || '',
      input.actorId,
      input.actorRole,
      input.action,
      input.entityType,
      input.entityId,
      input.reasonOrSummary,
    ].join('|');

    const eventHash = crypto
      .createHmac('sha256', AUDIT_KEY)
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
   * Verifies the integrity of the entire hash chain using HMAC-SHA256 and AUDIT_KEY.
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

      // Recompute HMAC payload: [prev, id, ts, caseId, actorId, actorRole, action, entityType, entityId, reason]
      const recomputedPayload = [
        event.previousHash,
        event.id,
        event.timestamp || event.timestampUtc,
        event.caseId || '',
        event.actorId,
        event.actorRole,
        event.action,
        event.entityType,
        event.entityId,
        event.reasonOrSummary,
      ].join('|');

      const recomputedHash = crypto
        .createHmac('sha256', AUDIT_KEY)
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
