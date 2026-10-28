import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';

import { dbService } from '../lib/db';
import {
  signSessionToken,
  verifySessionToken,
  getSessionUserFromCookies,
  SESSION_COOKIE_NAME,
} from '../lib/session';
import { sanitizeUser } from '../lib/guard';
import { hasPermission, canReviewCase, canAccessCase } from '../lib/auth';
import type { User, VerificationCase } from '../types';

test('1. Security Hardening: Forged & legacy sih_user_id cookies are strictly rejected', async () => {
  // Legacy unsigned cookie impersonating Super Admin
  const legacyReq = new Request('http://localhost:3000/api/cases', {
    headers: {
      cookie: 'sih_user_id=usr-superadmin',
    },
  });
  const legacyUser = await getSessionUserFromCookies(legacyReq);
  assert.equal(legacyUser, null, 'Unsigned legacy sih_user_id cookie must be completely ignored');

  // Forged random session token
  const forgedReq = new Request('http://localhost:3000/api/cases', {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=forged.token.payload.signature`,
    },
  });
  const forgedUser = await getSessionUserFromCookies(forgedReq);
  assert.equal(forgedUser, null, 'Forged session token without valid HMAC signature must return null');

  // Valid session token for Super Admin
  const adminUser = dbService.getUserByEmail('superadmin@example.com');
  assert.ok(adminUser, 'superadmin user must exist in DB');
  const validToken = signSessionToken({ id: adminUser.id, role: adminUser.role }, 3600);

  const validReq = new Request('http://localhost:3000/api/cases', {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
    },
  });
  const resolvedUser = await getSessionUserFromCookies(validReq);
  assert.ok(resolvedUser, 'Legitimate HMAC-SHA256 session token must resolve successfully');
  assert.equal(resolvedUser.email, 'superadmin@example.com');
});

test('2. RBAC Hardening: Non-privileged users cannot elevate role or access restricted permissions', () => {
  const applicant = dbService.getUserByEmail('operator@example.com');
  assert.ok(applicant, 'Applicant user must exist');

  // Applicant must not possess administrative or officer permissions
  assert.equal(hasPermission(applicant, 'CASE_REVIEW'), false);
  assert.equal(hasPermission(applicant, 'RULE_CONFIGURE'), false);
  assert.equal(hasPermission(applicant, 'USER_EDIT'), false);
  assert.equal(hasPermission(applicant, 'USER_DELETE'), false);
  assert.equal(hasPermission(applicant, 'ROLE_DELETE'), false);
  assert.equal(hasPermission(applicant, 'SYSTEM_SETTINGS'), false);

  // Applicant must only possess appropriate applicant permissions
  assert.equal(hasPermission(applicant, 'CASE_VIEW'), true);
  assert.equal(hasPermission(applicant, 'DOCUMENT_UPLOAD'), true);

  // Super Admin possesses full root permissions
  const superAdmin = dbService.getUserByEmail('superadmin@example.com')!;
  assert.equal(hasPermission(superAdmin, 'SYSTEM_SETTINGS'), true);
  assert.equal(hasPermission(superAdmin, 'USER_DELETE'), true);
  assert.equal(hasPermission(superAdmin, 'CASE_REVIEW'), true);
});

test('3. Credential Hygiene: sanitizeUser completely strips passwordHash from responses', () => {
  const users = dbService.listUsers();
  assert.ok(users.length > 0, 'Must have seeded users');

  for (const rawUser of users) {
    const cleanUser = sanitizeUser(rawUser);
    assert.equal(
      'passwordHash' in cleanUser,
      false,
      `sanitizeUser must strip passwordHash for user ${rawUser.email}`
    );
    assert.equal((cleanUser as any).passwordHash, undefined);
    assert.ok(cleanUser.id, 'Must preserve user id');
    assert.ok(cleanUser.email, 'Must preserve user email');
  }
});

test('4. Session Revocation: Token JTI revocation takes effect immediately', () => {
  const auditor = dbService.getUserByEmail('auditor@example.com')!;
  assert.ok(auditor, 'Auditor user must exist in DB');
  const token = signSessionToken({ id: auditor.id, role: auditor.role }, 3600);

  // Token is initially valid
  const verifiedBefore = verifySessionToken(token);
  assert.ok(verifiedBefore, 'Newly minted token must verify');
  assert.equal(verifiedBefore.uid, auditor.id);
  assert.equal(dbService.isSessionActive(verifiedBefore.jti), true);

  // Revoke session in SQLite via JTI
  dbService.revokeSession(verifiedBefore.jti);
  assert.equal(dbService.isSessionActive(verifiedBefore.jti), false);

  // Immediately subsequent verification attempts MUST fail
  const verifiedAfter = verifySessionToken(token);
  assert.equal(
    verifiedAfter,
    null,
    'Revoked session token must be immediately rejected on next verification'
  );
});

test('5. Reviewer Authorization & Scrutiny Guard: Only authorized officers can review cases', () => {
  const applicant = dbService.getUserByEmail('operator@example.com')!;
  const scrutinyOfficer = dbService.getUserByEmail('officer@example.com')!;
  assert.ok(applicant, 'Applicant must exist');
  assert.ok(scrutinyOfficer, 'Scrutiny officer must exist');

  const mockCase: VerificationCase = {
    id: 'CASE-2026-TEST',
    applicationId: 'APP-TEST-001',
    institution: {
      id: 'INST-TEST',
      legalName: 'Test Institute of Technology',
      trustOrSocietyName: 'Test Educational Trust',
      institutionCategory: 'ENGINEERING_AND_TECHNOLOGY',
      campusZone: 'URBAN_MUNICIPAL',
      state: 'Maharashtra',
      district: 'Pune',
      cityOrVillage: 'Pune',
      pincode: '411001',
      createdAt: new Date().toISOString(),
    },
    application: {
      id: 'APP-TEST-001',
      institutionId: 'INST-TEST',
      applicationType: 'AICTE_NEW_INSTITUTION',
      academicYear: '2026-2027',
      referenceNumber: 'AICTE/WRO/2026/TEST',
      createdBy: applicant.id,
      createdAt: new Date().toISOString(),
      formData: {
        declaredInstitutionName: 'Test Institute',
        declaredTrustName: 'Test Trust',
        applicationReferenceNumber: 'AICTE/WRO/2026/TEST',
        academicYear: '2026-2027',
        proposedIntake: 300,
        declaredLandAreaAcres: 5.5,
        declaredBuiltUpAreaSqm: 12000,
        requiredBuiltUpAreaSqm: 10000,
      },
    },
    status: 'READY_FOR_OFFICER_REVIEW',
    activeRuleSetId: 'AICTE_APH_2026_CORE',
    activeRuleSetVersion: '2026.1',
    updatedAt: new Date().toISOString(),
    isSyntheticDemo: true,
  };

  // Applicant cannot review their own or any case
  assert.equal(
    canReviewCase(applicant, mockCase),
    false,
    'Applicant must NOT be permitted to execute case review decisions'
  );

  // Scrutiny Officer with CASE_REVIEW is permitted
  assert.equal(
    canReviewCase(scrutinyOfficer, mockCase),
    true,
    'Scrutiny officer must be permitted to review cases'
  );
});

test('6. Audit Hash Chain Integrity: Cryptographic HMAC ledger detects record tampering', () => {
  // Chain must initially be valid
  const initialCheck = dbService.verifyChainIntegrity();
  assert.equal(initialCheck.valid, true, 'Initial audit chain must be cryptographically valid');

  // Append a test audit event
  const createdEvent = dbService.appendAuditEvent({
    caseId: 'CASE-2026-001',
    actorId: 'usr-scrutiny',
    actorName: 'Dr. M. S. Sundaram',
    actorRole: 'SCRUTINY_OFFICER',
    action: 'TEST_TAMPER_AUDIT_ACTION',
    entityType: 'VerificationCase',
    entityId: 'CASE-2026-001',
    reason: 'Initial authentic audit event before simulated malicious tampering.',
  });

  const verifiedBeforeTamper = dbService.verifyChainIntegrity();
  assert.equal(verifiedBeforeTamper.valid, true, 'Audit chain must remain valid after normal append');

  try {
    // Maliciously tamper with the event directly in the SQLite database (change actor_id)
    dbService.db
      .prepare('UPDATE audit_events SET actor_id = ? WHERE id = ?')
      .run('usr-attacker-injected', createdEvent.id);

    // Verify that chain verification detects the hash mismatch
    const verifiedAfterTamper = dbService.verifyChainIntegrity();
    assert.equal(
      verifiedAfterTamper.valid,
      false,
      'Tampered audit record MUST cause verifyChainIntegrity() to report invalid'
    );
    assert.ok(
      verifiedAfterTamper.brokenAtIndex !== undefined,
      'Chain validation must locate broken index'
    );
    assert.notEqual(
      verifiedAfterTamper.expectedHash,
      verifiedAfterTamper.actualHash,
      'Expected HMAC hash must differ from stored hash'
    );
  } finally {
    // Clean up test event so the database remains in its authentic clean state
    dbService.db.prepare('DELETE FROM audit_events WHERE id = ?').run(createdEvent.id);
    const restoredCheck = dbService.verifyChainIntegrity();
    assert.equal(restoredCheck.valid, true, 'Restoring authentic record restores audit chain integrity');
  }
});

test('7. Environment Secret Entropy: ARC_VERIFY_SESSION_SECRET requires at least 32 characters', () => {
  const checkScript = path.resolve(__dirname, '../lib/env.ts');

  // Running a node subprocess without the secret or with a short secret (< 32 chars) must throw an error
  assert.throws(
    () => {
      execSync(
        `node -e "process.env.ARC_VERIFY_SESSION_SECRET = 'too-short'; require('${checkScript.replace(/\\/g, '/')}')"`,
        { stdio: 'pipe' }
      );
    },
    (err: any) => {
      const stderr = err.stderr ? err.stderr.toString() : '';
      return stderr.includes('ARC_VERIFY_SESSION_SECRET required (>=32 chars)');
    },
    'env.ts must refuse to boot when ARC_VERIFY_SESSION_SECRET is shorter than 32 characters'
  );
});
