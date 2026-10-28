import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { persistAuditLogToSupabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth';
import { getDossierRepository } from '@/repositories/dossier-repository';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    if (!currentUser || !hasPermission(currentUser, 'AUDIT_VIEW')) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Forbidden: AUDIT_VIEW privilege required to view security audit ledger.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId') || undefined;
    const recordId = searchParams.get('recordId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const repo = getDossierRepository();
    const hashChainEvents = repo.auditRepo.listEvents({ caseId, action, limit });
    const chainVerification = repo.auditRepo.verifyHashChainIntegrity();

    let legacyLogs = dbStore.getAuditLogs();
    if (recordId) {
      legacyLogs = legacyLogs.filter(l => l.recordId === recordId);
    }
    if (action) {
      legacyLogs = legacyLogs.filter(l => l.action === action);
    }

    const mappedChainEvents = hashChainEvents.map(ev => ({
      id: ev.eventId,
      timestamp: ev.timestampUtc,
      userId: ev.actorId,
      userName: ev.actorName,
      userRole: ev.actorRole as any,
      action: ev.action,
      caseId: ev.caseId,
      recordId: ev.entityId,
      details: ev.reasonOrSummary,
      previousHash: ev.previousHash,
      eventHash: ev.eventHash,
    }));

    const combined = caseId ? mappedChainEvents : [...mappedChainEvents, ...legacyLogs].slice(0, limit);

    return NextResponse.json({
      success: true,
      count: combined.length,
      source: 'tamper_evident_hash_chain',
      chainIntegrity: chainVerification,
      data: combined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', error: 'Failed to load audit events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      userName,
      userRole,
      action,
      caseId,
      recordId,
      documentId,
      details,
      beforeState,
      afterState,
      diff,
    } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    const repo = getDossierRepository();
    const chainEvent = repo.auditRepo.appendEvent({
      caseId,
      actorId: userId || 'usr-system',
      actorName: userName || 'System Auditor',
      actorRole: userRole || 'AUDITOR',
      action,
      entityType: caseId ? 'DOSSIER' : documentId ? 'DOCUMENT' : 'SYSTEM',
      entityId: caseId || recordId || documentId || 'SYS-EVENT',
      reasonOrSummary: details || `Audit event recorded: ${action}`,
    });
    repo.saveToDisk();

    const logEntry = dbStore.addAuditLog({
      userId: userId || 'usr-system',
      userName: userName || 'System Auditor',
      userRole: userRole || 'AUDITOR',
      action,
      caseId,
      recordId,
      documentId,
      details: details || `Audit event recorded: ${action}`,
      previousHash: chainEvent.previousHash,
      eventHash: chainEvent.eventHash,
    });

    await persistAuditLogToSupabase({
      actor_id: userId || 'usr-system',
      actor_name: userName || 'System Auditor',
      actor_role: userRole || 'AUDITOR',
      action,
      resource_type: caseId ? 'DOSSIER' : recordId ? 'RECORD' : documentId ? 'DOCUMENT' : 'SYSTEM',
      resource_id: caseId || recordId || documentId || 'SYS-EVENT',
      before_state: beforeState,
      after_state: afterState,
      diff: diff,
      remarks: details,
    });

    return NextResponse.json({ success: true, data: logEntry, chainEvent }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal error recording audit event' },
      { status: 500 }
    );
  }
}
