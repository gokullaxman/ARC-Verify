import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, handleRouteError } from '@/lib/guard';

export async function GET(request: NextRequest) {
  try {
    const caller = await requireUser(request, 'AUDIT_VIEW');

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const createSnapshot = searchParams.get('snapshot') === 'true';

    const events = dbService.listAuditEvents({ caseId, action, limit });
    const chainIntegrity = dbService.verifyChainIntegrity();

    let snapshot = null;
    if (createSnapshot && caller.role === 'SUPER_ADMIN') {
      snapshot = dbService.createAuditSnapshot();
    }

    const mappedEvents = events.map(e => ({
      ...e,
      timestamp: e.timestampUtc,
      userId: e.actorId,
      userName: e.actorName,
      userRole: e.actorRole,
      details: typeof e.details === 'object' && e.details !== null
        ? JSON.stringify(e.details)
        : (e.reason || 'System event committed'),
      recordId: e.entityId,
    }));

    return NextResponse.json({
      success: true,
      count: mappedEvents.length,
      source: 'tamper_evident_hmac_ledger',
      chainIntegrity,
      snapshot,
      data: mappedEvents,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
