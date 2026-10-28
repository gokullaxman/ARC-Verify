import { NextResponse } from 'next/server';
import { canAccessCase, canCorrectExtractedField } from '@/lib/auth';
import { getSessionUserFromCookies } from '@/lib/session';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { RuleRepository } from '@/repositories/rule-repository';
import { CrossDocumentValidator } from '@/services/assurance/cross-document-validator';
import { ReportBuilderService } from '@/services/assurance/report-builder';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUserFromCookies(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

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
        {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Forbidden: You do not have access to this dossier (TC-14).',
        },
        { status: 403 }
      );
    }

    const ruleSet = RuleRepository.resolveActiveRuleSetForProfile(
      dossier.application.applicationType
    );
    const documents = repo.listDocumentsByCase(id);
    const extractedFields = repo.listFieldsByCase(id);
    const findings = repo.listFindingsByCase(id);
    const decisions = repo.listDecisionsByCase(id);
    const runs = repo.listRunsByCase(id);
    const reports = repo.listReportsByCase(id);
    const integrationEvents = repo.listIntegrationEventsByCase(id);
    const auditEvents = repo.auditRepo.listEvents({ caseId: id, limit: 50 });
    const concordanceMatrix = CrossDocumentValidator.buildConcordanceMatrix({
      dossier,
      documents,
      extractedFields,
    });
    const remediationPlan = ReportBuilderService.buildRemediationPlan(findings);

    return NextResponse.json({
      success: true,
      data: {
        dossier,
        ruleSet,
        documents,
        extractedFields,
        findings,
        concordanceMatrix,
        remediationPlan,
        decisions,
        runs,
        reports,
        integrationEvents,
        auditEvents,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', message: 'Failed to load dossier details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUserFromCookies(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

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
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: Access denied.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === 'correct_field') {
      if (!canCorrectExtractedField(caller, dossier)) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'FORBIDDEN',
            message: 'Forbidden: Reviewer authorization required to correct extracted fields.',
          },
          { status: 403 }
        );
      }

      if (!body.fieldId || !body.newValue || !body.reason || body.reason.trim().length < 3) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'VALIDATION_ERROR',
            message: 'fieldId, newValue, and a substantive reason are required.',
          },
          { status: 400 }
        );
      }

      const updatedField = repo.correctField({
        fieldId: body.fieldId,
        newValue: String(body.newValue),
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        reason: String(body.reason).trim(),
      });

      return NextResponse.json({ success: true, data: updatedField });
    }

    if (body.action === 'what_if_simulate') {
      const docs = repo.listDocumentsByCase(id);
      const fields = repo.listFieldsByCase(id);
      const simResult = ReportBuilderService.runWhatIfSimulation({
        dossier,
        documents: docs,
        extractedFields: fields,
        hypotheticalFormOverrides: body.hypotheticalFormOverrides,
        hypotheticalAddedCategories: body.hypotheticalAddedCategories,
        hypotheticalCampusZone: body.hypotheticalCampusZone,
      });
      return NextResponse.json({ success: true, data: simResult });
    }

    return NextResponse.json(
      { success: false, errorCode: 'INVALID_ACTION', message: 'Unsupported PATCH action.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', message: 'Failed to update dossier.' },
      { status: 500 }
    );
  }
}
