import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { getDossierRepository } from '@/repositories/dossier-repository';

export async function GET() {
  const legacyStats = dbStore.getStats();
  const repo = getDossierRepository();
  const cases = repo.listCases();
  const docs = repo.listAllDocuments();
  const chainVerification = repo.auditRepo.verifyHashChainIntegrity();

  const readyForReviewCount = cases.filter(
    c => c.status === 'READY_FOR_OFFICER_REVIEW' || c.status === 'REVIEW_REQUIRED'
  ).length;
  const deficiencyCasesCount = cases.filter(c => c.status === 'NEEDS_INFORMATION').length;
  const completedDecisionsCount = cases.filter(
    c =>
      c.status === 'APPROVED' ||
      c.status === 'REJECTED' ||
      (c.status as string) === 'REVIEWER_DECISION_RECORDED' ||
      (c.status as string) === 'REVIEW_COMPLETE' ||
      (c.status as string) === 'APPROVED_BY_REVIEWER'
  ).length;

  return NextResponse.json({
    success: true,
    data: {
      ...legacyStats,
      totalDossiers: cases.length,
      totalDossierDocuments: docs.length,
      readyForReviewCount,
      deficiencyCasesCount,
      completedDecisionsCount,
      auditChainValid: chainVerification.isValid,
      auditEventsCount: chainVerification.totalEventsChecked,
    },
  });
}
