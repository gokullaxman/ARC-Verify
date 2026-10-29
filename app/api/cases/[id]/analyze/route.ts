import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUser, handleRouteError, HttpError } from '@/lib/guard';
import { canAccessCase, canReviewCase, hasPermission } from '@/lib/auth';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { RuleRepository } from '@/repositories/rule-repository';
import { ComplianceEngine } from '@/services/assurance/compliance-engine';
import { dbService } from '@/lib/db';
import { AI_SERVICE_BASE_URL } from '@/lib/env';
import { ReviewDecision, ReviewOutcome, DossierStatus, ProcessingRun } from '@/types';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(req);
    const { id } = await context.params;

    const repo = getDossierRepository();
    const dossier = repo.getCaseById(id);

    if (!dossier) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: `Dossier ${id} not found.` },
        { status: 404 }
      );
    }

    if (!canAccessCase(caller, dossier)) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: You do not have access to this dossier.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'analyze') {
      if (!hasPermission(caller, 'CASE_ANALYZE')) {
        throw new HttpError(403, 'Forbidden: Missing CASE_ANALYZE privilege.', 'FORBIDDEN');
      }

      const ruleSet = RuleRepository.resolveActiveRuleSetForProfile(
        dossier.application.applicationType
      );
      const documents = repo.listDocumentsByCase(id);
      const extractedFields = repo.listFieldsByCase(id);

      const runId = `run-${crypto.randomUUID()}`;
      const evaluation = ComplianceEngine.evaluateDossier({
        dossier,
        ruleSet,
        documents,
        extractedFields,
        runId,
      });

      // Optional: Enrich priority findings with plain-language Gemini explanations
      try {
        const priorityFindings = evaluation.findings.filter(
          f => f.status === 'FAIL' || f.status === 'WARNING'
        );
        for (const f of priorityFindings.slice(0, 3)) {
          const explainRes = await fetch(`${AI_SERVICE_BASE_URL}/findings/explain`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-ARC-Verify-Internal': 'true',
            },
            body: JSON.stringify({
              rule_id: f.ruleCode,
              rule_title: f.ruleTitle,
              outcome: f.status,
              severity: f.severity,
              message: f.message,
              details: f.evidence?.[0] || {},
            }),
            signal: AbortSignal.timeout(2500),
          });
          if (explainRes.ok) {
            const exp = await explainRes.json();
            if (exp.plain_language_explanation) {
              f.remediationHint = `${exp.plain_language_explanation} Action: ${exp.recommended_reviewer_action}`;
            }
          }
        }
      } catch {
        // Safe degrade if AI service is offline
      }

      const caseStatus: DossierStatus =
        evaluation.summary.blockingDeficienciesCount > 0
          ? 'NEEDS_INFORMATION'
          : 'READY_FOR_OFFICER_REVIEW';

      const run: ProcessingRun = {
        id: runId,
        caseId: id,
        ruleSetId: ruleSet.id,
        ruleSetVersion: ruleSet.version,
        idempotencyKey: `idem-${id}-${Date.now()}`,
        status: 'COMPLETED',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        findingSummary: evaluation.summary,
        triggeredBy: caller.id,
      };

      repo.recordProcessingRun(run, evaluation.findings);

      dossier.status = caseStatus;
      repo.saveCase(dossier);

      dbService.appendAuditEvent({
        caseId: id,
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        action: 'CASE_ANALYZE',
        entityType: 'VerificationCase',
        entityId: id,
        reason: `Automated AICTE regulatory compliance scrutiny run ${run.id} finished with status ${run.status}.`,
        details: {
          findingsCount: evaluation.findings.length,
          violationsCount: evaluation.summary.blockingDeficienciesCount,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Compliance evaluation completed successfully.',
        data: {
          run,
          findings: evaluation.findings,
          summary: evaluation.summary,
          caseStatus: dossier.status,
        },
      });
    }

    if (action === 'review_decision') {
      if (!canReviewCase(caller, dossier)) {
        throw new HttpError(
          403,
          'Forbidden: Only an authorized Scrutiny Officer, Admin, or Super Admin can record statutory review decisions.',
          'REVIEW_ROLE_REQUIRED'
        );
      }

      const { decision, reason } = body;

      const validOutcomes: ReviewOutcome[] = [
        'APPROVE',
        'REJECT',
        'RETURN_FOR_CORRECTION',
        'ESCALATE',
      ];

      // Also accept REQUEST_CORRECTION mapping to RETURN_FOR_CORRECTION
      const normalizedOutcome: ReviewOutcome =
        decision === 'REQUEST_CORRECTION' ? 'RETURN_FOR_CORRECTION' : (decision as ReviewOutcome);

      if (!decision || !validOutcomes.includes(normalizedOutcome)) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'INVALID_DECISION',
            message: `Decision must be one of: ${validOutcomes.join(', ')}`,
          },
          { status: 400 }
        );
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'INVALID_REASON',
            message: 'Statutory review decision requires a descriptive reason (minimum 5 characters).',
          },
          { status: 400 }
        );
      }

      let resultingStatus: DossierStatus = 'UNDER_SCRUTINY';
      if (normalizedOutcome === 'APPROVE') resultingStatus = 'APPROVED';
      else if (normalizedOutcome === 'REJECT') resultingStatus = 'REJECTED';
      else if (normalizedOutcome === 'RETURN_FOR_CORRECTION') resultingStatus = 'NEEDS_INFORMATION';
      else if (normalizedOutcome === 'ESCALATE') resultingStatus = 'REVIEW_REQUIRED';

      const reviewDecision: ReviewDecision = {
        id: `dec-${crypto.randomUUID()}`,
        caseId: id,
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        outcome: normalizedOutcome,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
      };

      repo.recordReviewDecision(reviewDecision);

      dbService.appendAuditEvent({
        caseId: id,
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        action: `DECISION_${normalizedOutcome}`,
        entityType: 'ReviewDecision',
        entityId: reviewDecision.id,
        reason: `Officer ${caller.name} (${caller.role}) decided ${normalizedOutcome}: "${reason.trim()}" resulting in status ${resultingStatus}.`,
      });

      return NextResponse.json({
        success: true,
        message: `Decision recorded: ${normalizedOutcome}`,
        data: {
          decision: reviewDecision,
          caseStatus: resultingStatus,
        },
      });
    }

    return NextResponse.json(
      { success: false, errorCode: 'BAD_REQUEST', message: "Invalid action. Supported actions: 'analyze', 'review_decision'." },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
