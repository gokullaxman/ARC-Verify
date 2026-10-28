import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { canAccessCase, hasPermission } from '@/lib/auth';
import { getSessionUserFromCookies } from '@/lib/session';
import { getDossierRepository } from '@/repositories/dossier-repository';
import { RuleRepository } from '@/repositories/rule-repository';
import { ApplicationProfileType, InstitutionCategory, CampusZoneType, VerificationCase } from '@/types';

export async function GET(request: Request) {
  try {
    const caller = await getSessionUserFromCookies(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const repo = getDossierRepository();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const profileFilter = searchParams.get('applicationType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // TC-14: Filter cases strictly to those caller is authorized to access
    let accessibleCases = repo.listCases().filter(c => canAccessCase(caller, c));

    if (statusFilter && statusFilter !== 'ALL') {
      accessibleCases = accessibleCases.filter(c => c.status === statusFilter);
    }
    if (profileFilter && profileFilter !== 'ALL') {
      accessibleCases = accessibleCases.filter(
        c => c.application.applicationType === profileFilter
      );
    }

    const total = accessibleCases.length;
    const paginated = accessibleCases.slice((page - 1) * limit, page * limit);

    const enriched = paginated.map(c => ({
      ...c,
      documentCount: repo.listDocumentsByCase(c.id).length,
      findingsCount: repo.listFindingsByCase(c.id).length,
      latestRun: repo.listRunsByCase(c.id)[0] || null,
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      data: enriched,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', message: 'Failed to list cases.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const caller = await getSessionUserFromCookies(request);
    if (!caller) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!hasPermission(caller, 'CASE_CREATE')) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'FORBIDDEN',
          message: 'Forbidden: CASE_CREATE / DOCUMENT_UPLOAD permission required to create a dossier.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const repo = getDossierRepository();

    if (body.action === 'reset_demo') {
      repo.resetToSyntheticSeeds(true);
      repo.auditRepo.appendEvent({
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        action: 'DEMO_FIXTURES_RESET',
        entityType: 'SYSTEM',
        entityId: 'DEMO_CORPUS',
        reasonOrSummary: 'Reset synthetic demonstration scenarios (preserving non-demo dossiers).',
      });
      return NextResponse.json({
        success: true,
        message: 'Synthetic demonstration scenarios reset safely.',
        data: repo.listCases().filter(c => canAccessCase(caller, c)),
      });
    }

    const applicationType: ApplicationProfileType =
      body.applicationType || 'AICTE_NEW_INSTITUTION';
    const institutionName = (body.institutionName || '').trim();
    const trustName = (body.trustName || '').trim();
    const academicYear = (body.academicYear || '2026-27').trim();

    if (!institutionName || !trustName) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: 'Both institutionName and trustName are required to create a dossier.',
        },
        { status: 400 }
      );
    }

    const ruleSet = RuleRepository.resolveActiveRuleSetForProfile(applicationType);
    const shortUuid = crypto.randomUUID().split('-')[0].toUpperCase();
    const caseId = `CASE-2026-${shortUuid}`;
    const appId = `APP-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
    const instId = `INST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const newCase: VerificationCase = {
      id: caseId,
      applicationId: appId,
      institution: {
        id: instId,
        legalName: institutionName,
        trustOrSocietyName: trustName,
        institutionCategory:
          (body.institutionCategory as InstitutionCategory) || 'ENGINEERING_AND_TECHNOLOGY',
        campusZone: (body.campusZone as CampusZoneType) || 'URBAN_MUNICIPAL',
        state: body.state || 'Tamil Nadu',
        district: body.district || 'Chennai',
        cityOrVillage: body.cityOrVillage || 'Guindy',
        pincode: body.pincode || '600032',
        aictePermanentId: body.aictePermanentId,
        createdAt: now,
      },
      application: {
        id: appId,
        institutionId: instId,
        applicationType,
        academicYear,
        referenceNumber:
          body.referenceNumber || `AICTE-${academicYear.slice(0, 4)}-${shortUuid}`,
        createdBy: caller.id,
        createdAt: now,
        formData: {
          declaredInstitutionName: institutionName,
          declaredTrustName: trustName,
          applicationReferenceNumber:
            body.referenceNumber || `AICTE-${academicYear.slice(0, 4)}-${shortUuid}`,
          academicYear,
          proposedIntake: Number(body.proposedIntake) || 300,
          declaredLandAreaAcres: Number(body.declaredLandAreaAcres) || 3.0,
          declaredBuiltUpAreaSqm: Number(body.declaredBuiltUpAreaSqm) || 11000,
          requiredBuiltUpAreaSqm: Number(body.requiredBuiltUpAreaSqm) || 10000,
          fireSafetyCertificateNumber: body.fireSafetyCertificateNumber || 'FRS-2026-9001',
          fireSafetyExpiryDate: body.fireSafetyExpiryDate || '2027-09-30',
          affidavitStampDenominationRs: Number(body.affidavitStampDenominationRs) || 100,
          fdrAmountLakhs: Number(body.fdrAmountLakhs) || 35,
          previousEoaReferenceNumber: body.previousEoaReferenceNumber,
          facultyStudentRatio: body.facultyStudentRatio || '1:18',
          declaredSignatoryName: body.declaredSignatoryName || caller.name,
        },
      },
      status: 'DRAFT',
      activeRuleSetId: ruleSet.id,
      activeRuleSetVersion: ruleSet.version,
      updatedAt: now,
      isSyntheticDemo: Boolean(body.isSyntheticDemo),
    };

    repo.createCase(newCase);
    repo.auditRepo.appendEvent({
      caseId: newCase.id,
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'DOSSIER_CREATED',
      entityType: 'DOSSIER',
      entityId: newCase.id,
      reasonOrSummary: `Created dossier ${newCase.id} (${applicationType}) for "${institutionName}" under rule set ${ruleSet.id} v${ruleSet.version}.`,
    });

    return NextResponse.json(
      { success: true, data: newCase, checklist: ruleSet.requiredChecklist },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, errorCode: 'INTERNAL_ERROR', message: 'Failed to create dossier.' },
      { status: 500 }
    );
  }
}
