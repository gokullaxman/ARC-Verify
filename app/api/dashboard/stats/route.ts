import { NextResponse } from 'next/server';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { dbService } from '@/lib/db';
import { getSessionUserFromCookies } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const caller = await getSessionUserFromCookies(request);
    const repo = getDossierRepository();
    const cases = repo.listCases();
    const docs = repo.listAllDocuments();
    const chainVerification = dbService.verifyChainIntegrity();

    // Aggregate findings across cases
    const allFindings = dbService.db.prepare('SELECT payload_json FROM findings').all() as any[];
    const findings = allFindings.map(f => JSON.parse(f.payload_json));

    const findingsBySeverity = {
      CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      LOW: findings.filter(f => f.severity === 'LOW').length,
      INFO: findings.filter(f => f.severity === 'INFO').length,
    };

    const casesByStatus = {
      SUBMITTED: cases.filter(c => c.status === 'SUBMITTED').length,
      UNDER_SCRUTINY: cases.filter(c => c.status === 'UNDER_SCRUTINY').length,
      NEEDS_INFORMATION: cases.filter(c => c.status === 'NEEDS_INFORMATION').length,
      REVIEW_REQUIRED: cases.filter(c => c.status === 'REVIEW_REQUIRED').length,
      READY_FOR_OFFICER_REVIEW: cases.filter(c => c.status === 'READY_FOR_OFFICER_REVIEW').length,
      APPROVED: cases.filter(c => c.status === 'APPROVED').length,
      REJECTED: cases.filter(c => c.status === 'REJECTED').length,
    };

    const readyForReviewCount = cases.filter(
      c => c.status === 'READY_FOR_OFFICER_REVIEW' || c.status === 'REVIEW_REQUIRED' || c.status === 'UNDER_SCRUTINY' || c.status === 'SUBMITTED'
    ).length;

    const completedDecisionsCount = cases.filter(
      c => c.status === 'APPROVED' || c.status === 'REJECTED'
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        totalDossiers: cases.length,
        totalDossierDocuments: docs.length,
        readyForReviewCount,
        deficiencyCasesCount: casesByStatus.NEEDS_INFORMATION + casesByStatus.REVIEW_REQUIRED,
        completedDecisionsCount,
        casesByStatus,
        findingsBySeverity,
        auditChainValid: chainVerification.valid,
        auditEventsCount: chainVerification.totalEventsChecked,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', message: 'Failed to compute dashboard metrics.' },
      { status: 500 }
    );
  }
}
