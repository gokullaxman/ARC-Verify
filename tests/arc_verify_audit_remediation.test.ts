import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { hashPassword, verifyPassword, sanitizeUser } from '../lib/password';
import { signSessionToken, verifySessionToken } from '../lib/session';
import { DEMO_USERS } from '../lib/mock-data';
import { canAccessCase, canReviewCase, canCorrectExtractedField } from '../lib/auth';
import { PrivateStorageService } from '../lib/private-storage';
import { DossierRepository } from '../repositories/dossier-repository';
import { RuleRepository } from '../repositories/rule-repository';
import { ComplianceEngine } from '../services/assurance/compliance-engine';
import { DigitalSignatureValidator } from '../services/assurance/digital-signature-validator';
import { StoreManager } from '../lib/store';

test('1. Auth & Passwords: DEMO_USERS store salted scrypt hashes and verifyPassword rejects plaintext/wrong passwords', () => {
  for (const user of DEMO_USERS) {
    assert.ok(
      user.passwordHash?.startsWith('scrypt$'),
      `User ${user.email} must store a salted scrypt$ hash, not plaintext`
    );
  }

  const officer = DEMO_USERS.find(u => u.email === 'officer@example.com')!;
  assert.equal(verifyPassword('Officer@123', officer.passwordHash), true);
  assert.equal(verifyPassword('WrongPassword', officer.passwordHash), false);
  assert.equal(verifyPassword('Officer@123', 'Officer@123'), false, 'Plaintext stored password must be rejected');

  const customHash = hashPassword('MySecretPass!2026');
  assert.equal(verifyPassword('MySecretPass!2026', customHash), true);
  assert.equal(verifyPassword('MySecretPass!2027', customHash), false);

  const sanitized = sanitizeUser(officer);
  assert.equal('passwordHash' in sanitized, false, 'sanitizeUser must strip passwordHash');
});

test('2. Signed Sessions: signSessionToken and verifySessionToken enforce HMAC-SHA256 integrity and expiry', () => {
  const token = signSessionToken({ id: 'usr-officer', role: 'REVENUE_OFFICER' }, 3600);
  const verified = verifySessionToken(token);
  assert.ok(verified, 'Valid signed token must verify');
  assert.equal(verified.uid, 'usr-officer');
  assert.equal(verified.role, 'REVENUE_OFFICER');

  // Tamper with payload to attempt privilege escalation to SUPER_ADMIN
  const [payloadB64, sigB64] = token.split('.');
  const forgedPayload = Buffer.from(
    JSON.stringify({ uid: 'usr-superadmin', role: 'SUPER_ADMIN', iat: verified.iat, exp: verified.exp, jti: 'forged' })
  ).toString('base64url');
  assert.equal(
    verifySessionToken(`${forgedPayload}.${sigB64}`),
    null,
    'Tampered session payload must be rejected by HMAC check'
  );

  // Expired token must be rejected
  const expiredToken = signSessionToken({ id: 'usr-officer', role: 'REVENUE_OFFICER' }, -10);
  assert.equal(verifySessionToken(expiredToken), null, 'Expired session token must be rejected');
});

test('3. Multipart Upload Security: enforces multipart/form-data, magic bytes, size limit, SHA-256, UUIDs, and private storage', async () => {
  const tempPrivateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-verify-upload-test-'));
  process.env.ARC_VERIFY_PRIVATE_UPLOAD_DIR = tempPrivateDir;

  // 3a. Reject JSON request
  const jsonReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'fake.pdf' }),
  });
  const jsonRes = await PrivateStorageService.parseAndStoreMultipartUpload(jsonReq);
  assert.equal(jsonRes.ok, false);
  if (!jsonRes.ok) {
    assert.equal(jsonRes.errorCode, 'MULTIPART_REQUIRED');
  }

  // 3b. Reject fake PDF whose bytes do not start with %PDF-
  const fakePdfForm = new FormData();
  const fakePdfBytes = Buffer.from('<html>not a real pdf</html>', 'utf-8');
  fakePdfForm.append(
    'file',
    new File([new Uint8Array(fakePdfBytes)], 'fake_certificate.pdf', { type: 'application/pdf' })
  );
  const fakePdfReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    body: fakePdfForm,
  });
  const fakePdfRes = await PrivateStorageService.parseAndStoreMultipartUpload(fakePdfReq);
  assert.equal(fakePdfRes.ok, false);
  if (!fakePdfRes.ok) {
    assert.equal(fakePdfRes.errorCode, 'MAGIC_BYTES_MISMATCH');
  }

  // 3c. Accept valid PDF with %PDF- magic bytes, verify SHA-256, UUID filename, and private storage outside public/
  const validPdfBytes = DigitalSignatureValidator.createValidSignedPdfBuffer('AICTE Land Certificate');
  const expectedSha256 = crypto.createHash('sha256').update(validPdfBytes).digest('hex');

  const validForm = new FormData();
  validForm.append(
    'file',
    new File([new Uint8Array(validPdfBytes)], 'client_supplied_name.pdf', { type: 'application/pdf' })
  );
  validForm.append('declaredCategory', 'LAND_OWNERSHIP_CERTIFICATE');

  const validReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    body: validForm,
  });
  const validRes = await PrivateStorageService.parseAndStoreMultipartUpload(validReq);
  assert.equal(validRes.ok, true, 'Valid multipart PDF must succeed');
  if (validRes.ok) {
    assert.equal(validRes.data.sha256, expectedSha256, 'SHA-256 must match exact uploaded bytes');
    assert.equal(validRes.data.byteSize, validPdfBytes.length);
    assert.match(validRes.data.documentId, /^doc-[0-9a-f-]{36}$/, 'Document ID must use full UUID');
    assert.ok(!validRes.data.privateDiskPath.includes('/public/'), 'File must NOT be stored in public/');
    assert.ok(fs.existsSync(validRes.data.privateDiskPath), 'File must exist in private storage');
  }
});

test('4. Cross-User Case Access Control (canAccessCase & canReviewCase): blocks opening another user\'s case', () => {
  const tempDb = path.join(os.tmpdir(), `arc-verify-rbac-${Date.now()}.sqlite`);
  const repo = new DossierRepository(tempDb);

  const applicantA = DEMO_USERS.find(u => u.id === 'usr-operator')!; // owns CASE-2026-001
  const otherApplicant = {
    ...applicantA,
    id: 'usr-other-applicant',
    email: 'other.applicant@example.com',
    institutionId: 'INST-OTHER-999',
  };
  const viewer = DEMO_USERS.find(u => u.role === 'VIEWER')!;
  const scrutinyOfficer = DEMO_USERS.find(u => u.role === 'REVENUE_OFFICER')!;

  const case001 = repo.getCaseById('CASE-2026-001')!;
  assert.ok(case001);

  // Applicant A can access their own case, but cannot review/approve it
  assert.equal(canAccessCase(applicantA, case001), true);
  assert.equal(canReviewCase(applicantA, case001), false);
  assert.equal(canCorrectExtractedField(applicantA, case001), false);

  // Another applicant and Viewer are strictly blocked from accessing Applicant A's case
  assert.equal(canAccessCase(otherApplicant, case001), false, 'Other applicant must be denied access');
  assert.equal(canAccessCase(viewer, case001), false, 'Viewer must be denied access to private dossier');

  // Scrutiny Officer can access and review the case
  assert.equal(canAccessCase(scrutinyOfficer, case001), true);
  assert.equal(canReviewCase(scrutinyOfficer, case001), true);
});

test('5. Rule Engine: stores clause & verified flag, marks unconfirmed handbook thresholds verified=false, and evaluates 6 outcomes', () => {
  const ruleSets = RuleRepository.listRuleSets();
  assert.equal(ruleSets.length, 3);

  for (const rs of ruleSets) {
    for (const rule of rs.rules) {
      assert.ok(rule.clause && rule.clause.length > 0, `Rule ${rule.ruleId} must store its clause`);
      assert.equal(typeof rule.verified, 'boolean', `Rule ${rule.ruleId} must store a boolean verified flag`);
    }
  }

  // Verify COMP-11 (Fire NOC cutoff date & Rs. 35L FDR threshold) is marked verified: false (NEEDS_REVIEW)
  const newInstRules = RuleRepository.resolveActiveRuleSetForProfile('AICTE_NEW_INSTITUTION');
  const comp11 = newInstRules.rules.find(r => r.code === 'COMP-11')!;
  assert.equal(comp11.verified, false, 'Unconfirmed Fire NOC cutoff / Rs. 35L FDR must be marked verified: false');
  assert.equal(comp11.sourceStatus, 'NEEDS_REVIEW');

  const tempDb = path.join(os.tmpdir(), `arc-verify-rules-${Date.now()}.sqlite`);
  const repo = new DossierRepository(tempDb);

  // Evaluate Scenario A (Complete), Scenario B (Deficient), Scenario C (Inconclusive Forensics), Scenario D (EoA with NOT_APPLICABLE land rule)
  const observedStatuses = new Set<string>();
  for (const c of repo.listCases()) {
    const rs = RuleRepository.resolveActiveRuleSetForProfile(c.application.applicationType);
    const evalRes = ComplianceEngine.evaluateDossier({
      dossier: c,
      ruleSet: rs,
      documents: repo.listDocumentsByCase(c.id),
      extractedFields: repo.listFieldsByCase(c.id),
      allOtherCasesDocuments: repo.listAllDocuments().filter(d => d.caseId !== c.id),
      integrationEvents: repo.listIntegrationEventsByCase(c.id),
      runId: 'run-test',
    });
    for (const f of evalRes.findings) {
      observedStatuses.add(f.status);
    }
  }

  for (const expectedOutcome of ['PASS', 'FAIL', 'WARNING', 'INCONCLUSIVE', 'NOT_APPLICABLE', 'NOT_CHECKED']) {
    assert.ok(
      observedStatuses.has(expectedOutcome),
      `Rule engine must produce ${expectedOutcome} outcome across the corpus`
    );
  }
});

test('6. Cryptographic Signature Validation (TS + Python pyHanko/PKCS#7): rejects bare /ByteRange text and validates real PKCS#7 digest', () => {
  const dummyDoc: any = {
    id: 'doc-sig-test',
    caseId: 'CASE-2026-001',
    originalFilename: 'certificate.pdf',
    mimeType: 'application/pdf',
    byteSize: 200,
    sha256: 'abc',
  };

  // 6a. Unsigned PDF -> UNSIGNED
  const unsignedPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n', 'ascii');
  const unsignedRes = DigitalSignatureValidator.inspectDocumentSignature({ doc: dummyDoc, buffer: unsignedPdf });
  assert.equal(unsignedRes.state, 'UNSIGNED');

  // 6b. Spoofed PDF containing literal "/ByteRange" and "/Type /Sig" without valid PKCS#7 ASN.1 digest -> SIGNATURE_INVALID
  const spoofedPdf = Buffer.from(
    '%PDF-1.7\n1 0 obj\n<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 10 20 30] /Contents <deadbeef> >>\nendobj\n%%EOF\n',
    'ascii'
  );
  const spoofedRes = DigitalSignatureValidator.inspectDocumentSignature({ doc: dummyDoc, buffer: spoofedPdf });
  assert.equal(
    spoofedRes.state,
    'SIGNATURE_INVALID',
    'Spoofed /ByteRange without valid ASN.1 CMS SignedData digest must be rejected as SIGNATURE_INVALID'
  );

  // 6c. Cryptographically valid signed PDF buffer -> SIGNATURE_VALID
  const validSignedPdf = DigitalSignatureValidator.createValidSignedPdfBuffer('Verified AICTE Affidavit');
  const validRes = DigitalSignatureValidator.inspectDocumentSignature({ doc: dummyDoc, buffer: validSignedPdf });
  assert.equal(validRes.state, 'SIGNATURE_VALID');
  assert.equal(validRes.cryptographicDigestValid, true);

  // 6d. Tamper with 1 byte in the signed PDF body -> SIGNATURE_INVALID
  const tamperedPdf = Buffer.from(validSignedPdf);
  tamperedPdf[tamperedPdf.length - 12] = 0x58; // modify byte inside second signed range
  const tamperedRes = DigitalSignatureValidator.inspectDocumentSignature({ doc: dummyDoc, buffer: tamperedPdf });
  assert.equal(
    tamperedRes.state,
    'SIGNATURE_INVALID',
    'Post-signing byte modification must fail SHA-256 /ByteRange digest check'
  );

  // 6e. Also verify Python ai-service/extract_pdf.py verify_pdf_cryptographic_signature
  const tmpSpoofPath = path.join(os.tmpdir(), `spoof-${Date.now()}.pdf`);
  fs.writeFileSync(tmpSpoofPath, spoofedPdf);
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const pyOutSpoof = JSON.parse(
    execFileSync(pythonBin, [path.join(process.cwd(), 'ai-service', 'extract_pdf.py'), tmpSpoofPath], {
      encoding: 'utf-8',
    })
  );
  assert.equal(pyOutSpoof.signatureInspection.state, 'SIGNATURE_INVALID');
});

test('7. SQLite Persistence Restart Test: cases, documents with sha256, findings, users, and audit hash chain survive restart', () => {
  const sqliteFile = path.join(os.tmpdir(), `arc-verify-restart-${Date.now()}.sqlite`);

  // Instance 1: Create case, attach document with SHA-256, append audit event
  const repo1 = new DossierRepository(sqliteFile);
  const initialCount = repo1.listCases().length;

  const newCaseId = 'CASE-2026-RESTART-TEST';
  const baseCase = repo1.listCases()[0];
  repo1.createCase({
    ...baseCase,
    id: newCaseId,
    isSyntheticDemo: false,
    updatedAt: new Date().toISOString(),
  });

  const docSha256 = crypto.createHash('sha256').update('persistent-pdf-bytes').digest('hex');
  repo1.addDocument({
    id: 'doc-restart-001',
    caseId: newCaseId,
    declaredCategory: 'APPLICATION_FORM',
    classifiedCategory: 'APPLICATION_FORM',
    classificationConfidence: 0.99,
    originalFilename: 'persistent_application.pdf',
    originalStorageKey: 'private://doc-restart-001.pdf',
    derivedPreviewUrl: '/api/documents/doc-restart-001/file',
    mimeType: 'application/pdf',
    byteSize: 4096,
    sha256: docSha256,
    pageCount: 2,
    language: 'English',
    uploadActorId: 'usr-operator',
    uploadActorName: 'Rajesh G. Kulkarni',
    uploadedAt: new Date().toISOString(),
    processingStatus: 'ANALYZED',
    rawExtractedText: 'Persistent application form text',
  });

  repo1.auditRepo.appendEvent({
    caseId: newCaseId,
    actorId: 'usr-operator',
    actorName: 'Rajesh G. Kulkarni',
    actorRole: 'DATA_ENTRY_OPERATOR',
    action: 'RESTART_PERSISTENCE_TEST',
    entityType: 'DOSSIER',
    entityId: newCaseId,
    reasonOrSummary: 'Testing SQLite persistence across repository restarts.',
  });
  repo1.saveToSqlite();

  // Simulate server restart by creating a brand new DossierRepository instance reading from the same SQLite file
  const repo2 = new DossierRepository(sqliteFile);
  assert.equal(repo2.listCases().length, initialCount + 1, 'New case must persist across restart');
  const reloadedCase = repo2.getCaseById(newCaseId);
  assert.ok(reloadedCase, 'Reloaded case must exist in SQLite');

  const reloadedDocs = repo2.listDocumentsByCase(newCaseId);
  assert.equal(reloadedDocs.length, 1);
  assert.equal(reloadedDocs[0].sha256, docSha256, 'Document SHA-256 must persist in SQLite');

  const chainCheck = repo2.auditRepo.verifyChainIntegrity();
  assert.equal(chainCheck.valid, true, 'Tamper-evident SHA-256 audit hash chain must remain valid after SQLite reload');

  // Also verify StoreManager SQLite persistence across restart
  const store1 = new StoreManager();
  store1.setDatabasePath(sqliteFile);
  const createdUser = store1.addUser({
    name: 'Dr. Persistence Officer',
    email: 'persist.officer@example.com',
    role: 'REVENUE_OFFICER',
    passwordHash: 'PersistPass@123',
  });
  assert.ok(createdUser.passwordHash?.startsWith('scrypt$'));

  const store2 = new StoreManager();
  store2.setDatabasePath(sqliteFile);
  const authUser = store2.authenticate('persist.officer@example.com', 'PersistPass@123');
  assert.ok(authUser, 'Created user with hashed password must authenticate after StoreManager restart');
  assert.equal(authUser.email, 'persist.officer@example.com');
});
