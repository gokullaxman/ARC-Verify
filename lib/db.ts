import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AUDIT_KEY } from './env';
import { hashPassword } from './password';
import {
  User,
  UserRole,
  Role,
  PermissionKey,
  VerificationCase,
  DossierDocument,
  ExtractedFieldCandidate,
  ProcessingRun,
  AssuranceFinding,
  ReviewDecision,
  ScrutinyReport,
  ExternalIntegrationEvent,
  DossierStatus,
} from '@/types';
import { INITIAL_SYNTHETIC_DOSSIERS } from './arc-verify-Priority-seeds';

export interface AuditEventRecord {
  id: string;
  sequenceNumber: number;
  caseId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  previousHash: string;
  eventHash: string;
  timestampUtc: string;
  details?: any;
}

export interface AuditSnapshot {
  id: string;
  createdAt: string;
  upToSequenceNumber: number;
  headEventHash: string;
  snapshotSignature: string;
  totalEvents: number;
}

const ARC_VERIFY_PERMISSIONS: { key: PermissionKey; label: string; category: string }[] = [
  { key: 'CASE_VIEW', label: 'View Dossier Cases', category: 'Dossier' },
  { key: 'CASE_CREATE', label: 'Create Dossier Application', category: 'Dossier' },
  { key: 'CASE_ANALYZE', label: 'Execute Compliance Verification Engine', category: 'Dossier' },
  { key: 'CASE_REVIEW', label: 'Record Scrutiny Decision / Approval', category: 'Dossier' },
  { key: 'REPORT_GENERATE', label: 'Generate Statutory Scrutiny Report', category: 'Dossier' },
  { key: 'RULE_VIEW', label: 'View AICTE Regulatory Rule Handbook', category: 'Rules' },
  { key: 'RULE_CONFIGURE', label: 'Configure Rule Benchmarks & Tolerances', category: 'Rules' },
  { key: 'DOCUMENT_VIEW', label: 'View Uploaded Dossier Documents', category: 'Documents' },
  { key: 'DOCUMENT_UPLOAD', label: 'Upload Affidavits, NOCs & Certificates', category: 'Documents' },
  { key: 'DOCUMENT_DELETE', label: 'Delete Erroneous Document Submissions', category: 'Documents' },
  { key: 'DOCUMENT_PROCESS', label: 'Run Forensics & OCR Extraction', category: 'Documents' },
  { key: 'DOCUMENT_DOWNLOAD', label: 'Download Verified Evidence Documents', category: 'Documents' },
  { key: 'USER_VIEW', label: 'View Platform Officers & Users', category: 'Administration' },
  { key: 'USER_CREATE', label: 'Provision New Officers', category: 'Administration' },
  { key: 'USER_EDIT', label: 'Update User Profile & Designation', category: 'Administration' },
  { key: 'USER_DISABLE', label: 'Deactivate / Terminate User Access', category: 'Administration' },
  { key: 'ROLE_VIEW', label: 'View Security Roles & Policies', category: 'Administration' },
  { key: 'ROLE_CREATE', label: 'Create New Security Role', category: 'Administration' },
  { key: 'ROLE_EDIT', label: 'Modify Role Permissions', category: 'Administration' },
  { key: 'ROLE_DELETE', label: 'Delete Custom Security Role', category: 'Administration' },
  { key: 'AUDIT_VIEW', label: 'Inspect Tamper-Evident HMAC Audit Ledger', category: 'Security' },
  { key: 'ANALYTICS_VIEW', label: 'View Compliance & Scrutiny Metrics', category: 'Analytics' },
  { key: 'SYSTEM_SETTINGS', label: 'Manage Platform & Security Settings', category: 'Settings' },
];

const DEFAULT_SYSTEM_ROLES: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    description: 'Supreme statutory administrator with unrestricted access to all dossiers, security policies, and system controls.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: ARC_VERIFY_PERMISSIONS.map(p => p.key),
  },
  {
    id: 'role-admin',
    name: 'Compliance Administrator',
    code: 'ADMIN',
    description: 'Administrative supervisor managing cases, scrutiny queues, rules, and user roles.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'CASE_VIEW', 'CASE_CREATE', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
      'RULE_VIEW', 'RULE_CONFIGURE',
      'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
      'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DISABLE',
      'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT',
      'AUDIT_VIEW', 'ANALYTICS_VIEW',
    ],
  },
  {
    id: 'role-scrutiny-officer',
    name: 'AICTE Scrutiny Officer',
    code: 'SCRUTINY_OFFICER',
    description: 'Statutory verification officer conducting cross-document scrutiny, AI forensic analysis, and approving approvals.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'CASE_VIEW', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
      'RULE_VIEW',
      'DOCUMENT_VIEW', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
      'AUDIT_VIEW', 'ANALYTICS_VIEW',
    ],
  },
  {
    id: 'role-compliance-auditor',
    name: 'Compliance Auditor',
    code: 'COMPLIANCE_AUDITOR',
    description: 'Independent inspector verifying audit chain continuity, forensic anomalies, and procedural compliance.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'CASE_VIEW', 'RULE_VIEW', 'REPORT_GENERATE', 'DOCUMENT_VIEW',
      'AUDIT_VIEW', 'ANALYTICS_VIEW',
    ],
  },
  {
    id: 'role-applicant',
    name: 'Institutional Applicant',
    code: 'APPLICANT',
    description: 'College / Trust applicant authorized to upload application documents and monitor case progress.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'CASE_VIEW', 'CASE_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
    ],
  },
  {
    id: 'role-demo-operator',
    name: 'Demo Evaluation Operator',
    code: 'DEMO_OPERATOR',
    description: 'Operator account for hackathon evaluation and interactive demonstration testing.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'CASE_VIEW', 'CASE_CREATE', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
      'RULE_VIEW', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
      'AUDIT_VIEW', 'ANALYTICS_VIEW',
    ],
  },
  {
    id: 'role-viewer',
    name: 'Public / Read-Only Observer',
    code: 'VIEWER',
    description: 'Read-only observer restricted from viewing private applicant documents or modifying decisions.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: ['RULE_VIEW'],
  },
];

const INITIAL_DEMO_USERS: Array<Omit<User, 'permissions'> & { plaintextPassword?: string }> = [
  {
    id: 'usr-superadmin',
    name: 'Dr. Amitabh K. Sharma',
    email: 'superadmin@example.com',
    role: 'SUPER_ADMIN',
    designation: 'Chief Vigilance & Compliance Director',
    department: 'AICTE Headquarters & Vigilance Wing',
    state: 'Delhi',
    district: 'New Delhi',
    phone: '+91-98100-11223',
    status: 'ACTIVE',
    plaintextPassword: 'SuperAdmin@123',
  },
  {
    id: 'usr-admin',
    name: 'Smt. Radhika Raman',
    email: 'admin@example.com',
    role: 'ADMIN',
    designation: 'Director of Approvals',
    department: 'Approval Process Bureau',
    state: 'Delhi',
    district: 'New Delhi',
    phone: '+91-98100-22334',
    status: 'ACTIVE',
    plaintextPassword: 'Admin@123',
  },
  {
    id: 'usr-scrutiny',
    name: 'Dr. M. S. Sundaram',
    email: 'officer@example.com',
    role: 'SCRUTINY_OFFICER',
    designation: 'Senior Scrutiny Committee Chairman',
    department: 'Southern Regional Scrutiny Board',
    state: 'Tamil Nadu',
    district: 'Chennai',
    institutionId: 'INST-2026-001',
    phone: '+91-98400-33445',
    status: 'ACTIVE',
    plaintextPassword: 'Officer@123',
  },
  {
    id: 'usr-auditor',
    name: 'Vikramaditya Bose',
    email: 'auditor@example.com',
    role: 'COMPLIANCE_AUDITOR',
    designation: 'Chief Forensic Assurance Officer',
    department: 'Central Vigilance Commission Audit Cell',
    state: 'Delhi',
    district: 'New Delhi',
    phone: '+91-98100-44556',
    status: 'ACTIVE',
    plaintextPassword: 'Auditor@123',
  },
  {
    id: 'usr-operator',
    name: 'Rajesh G. Kulkarni',
    email: 'operator@example.com',
    role: 'APPLICANT',
    designation: 'Trust Secretary & Authorized Signatory',
    department: 'Apex Educational and Research Charitable Trust',
    state: 'Tamil Nadu',
    district: 'Chennai',
    institutionId: 'INST-2026-001',
    phone: '+91-98400-55667',
    status: 'ACTIVE',
    plaintextPassword: 'Operator@123',
  },
  {
    id: 'usr-viewer',
    name: 'Ananya Deshmukh',
    email: 'viewer@example.com',
    role: 'VIEWER',
    designation: 'Observer',
    department: 'Public Inspection Portal',
    state: 'Maharashtra',
    district: 'Mumbai',
    phone: '+91-98200-66778',
    status: 'ACTIVE',
    plaintextPassword: 'Viewer@123',
  },
];

export class DatabaseService {
  private static instances: Map<string, DatabaseService> = new Map();
  public db: Database.Database;
  public dbPath: string;

  private constructor(customPath?: string) {
    const dbPath = customPath || process.env.ARC_VERIFY_DB_PATH || path.join(process.cwd(), '.arc-verify-data', 'arc_verify.db');
    this.dbPath = dbPath;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath, { timeout: 20000 });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 20000');
    this.db.pragma('foreign_keys = ON');

    try {
      this.initSchema();
      this.seedDefaultsIfEmpty();
    } catch (err: any) {
      if (err.code !== 'SQLITE_BUSY') {
        throw err;
      }
    }
  }

  public static getInstance(customPath?: string): DatabaseService {
    const resolved = customPath || process.env.ARC_VERIFY_DB_PATH || path.join(process.cwd(), '.arc-verify-data', 'arc_verify.db');
    if (!DatabaseService.instances.has(resolved)) {
      DatabaseService.instances.set(resolved, new DatabaseService(resolved));
    }
    return DatabaseService.instances.get(resolved)!;
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        permissions_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        designation TEXT,
        department TEXT,
        state TEXT,
        district TEXT,
        taluk TEXT,
        village TEXT,
        institution_id TEXT,
        phone TEXT,
        password_hash TEXT NOT NULL,
        permissions_json TEXT,
        last_login TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        payload_json TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        institution_id TEXT NOT NULL,
        application_type TEXT NOT NULL,
        academic_year TEXT,
        status TEXT NOT NULL,
        trust_name TEXT,
        institution_name TEXT,
        is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dossier_documents (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        declared_category TEXT NOT NULL,
        classified_category TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        page_count INTEGER DEFAULT 1,
        upload_actor_id TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        processing_status TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS extracted_fields (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        raw_value TEXT,
        normalized_value TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        is_manually_corrected INTEGER NOT NULL DEFAULT 0,
        corrected_by TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS processing_runs (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        idempotency_key TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        rule_code TEXT NOT NULL,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        mandatory INTEGER NOT NULL DEFAULT 1,
        message TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_decisions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT NOT NULL,
        reviewer_role TEXT NOT NULL,
        decision TEXT NOT NULL,
        resulting_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        decided_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scrutiny_reports (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        generated_by TEXT NOT NULL,
        report_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS integration_events (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        adapter_name TEXT NOT NULL,
        external_system TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        sequence_number INTEGER UNIQUE NOT NULL,
        case_id TEXT,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        event_hash TEXT NOT NULL,
        timestamp_utc TEXT NOT NULL,
        details_json TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        up_to_sequence_number INTEGER NOT NULL,
        head_event_hash TEXT NOT NULL,
        snapshot_signature TEXT NOT NULL,
        total_events INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL DEFAULT '{}',
        payload_json TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        link TEXT
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        window_start INTEGER NOT NULL
      );
    `);
  }

  private seedDefaultsIfEmpty(): void {
    const roleCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as any).cnt;
    if (roleCount === 0) {
      const insertRole = this.db.prepare(`
        INSERT INTO roles (id, code, name, description, is_system, permissions_json, created_at)
        VALUES (@id, @code, @name, @description, @isSystem, @permissionsJson, @createdAt)
      `);
      const insertManyRoles = this.db.transaction((roles: Role[]) => {
        for (const r of roles) {
          insertRole.run({
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            isSystem: r.isSystem ? 1 : 0,
            permissionsJson: JSON.stringify(r.permissions),
            createdAt: r.createdAt,
          });
        }
      });
      insertManyRoles(DEFAULT_SYSTEM_ROLES);
    }

    const userCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
    if (userCount === 0) {
      const now = new Date().toISOString();
      const insertUser = this.db.prepare(`
        INSERT INTO users (
          id, email, name, role, status, designation, department, state, district,
          taluk, village, institution_id, phone, password_hash, permissions_json,
          last_login, created_at, updated_at, payload_json
        ) VALUES (
          @id, @email, @name, @role, @status, @designation, @department, @state, @district,
          @taluk, @village, @institutionId, @phone, @passwordHash, @permissionsJson,
          @lastLogin, @createdAt, @updatedAt, @payloadJson
        )
      `);

      const insertManyUsers = this.db.transaction((users: typeof INITIAL_DEMO_USERS) => {
        for (const u of users) {
          const roleRecord = this.getRoleByCode(u.role);
          const perms = roleRecord ? roleRecord.permissions : [];
          insertUser.run({
            id: u.id,
            email: u.email.toLowerCase().trim(),
            name: u.name,
            role: u.role,
            status: u.status,
            designation: u.designation || null,
            department: u.department || null,
            state: u.state || null,
            district: u.district || null,
            taluk: u.taluk || null,
            village: u.village || null,
            institutionId: u.institutionId || null,
            phone: u.phone || null,
            passwordHash: hashPassword(u.plaintextPassword || 'Demo@12345'),
            permissionsJson: JSON.stringify(perms),
            lastLogin: null,
            createdAt: now,
            updatedAt: now,
            payloadJson: JSON.stringify(u),
          });
        }
      });
      insertManyUsers(INITIAL_DEMO_USERS);
    }

    const caseCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM cases').get() as any).cnt;
    if (caseCount === 0) {
      this.seedSyntheticDossiers();
    }
  }

  public seedSyntheticDossiers(): void {
    const seeded = INITIAL_SYNTHETIC_DOSSIERS();
    const insertCase = this.db.prepare(`
      INSERT OR REPLACE INTO cases (
        id, application_id, institution_id, application_type, academic_year, status,
        trust_name, institution_name, is_synthetic_demo, created_by, created_at, updated_at, payload_json
      ) VALUES (
        @id, @applicationId, @institutionId, @applicationType, @academicYear, @status,
        @trustName, @institutionName, @isSyntheticDemo, @createdBy, @createdAt, @updatedAt, @payloadJson
      )
    `);

    const insertDoc = this.db.prepare(`
      INSERT OR REPLACE INTO dossier_documents (
        id, case_id, declared_category, classified_category, original_filename,
        storage_key, mime_type, byte_size, sha256, page_count, upload_actor_id,
        uploaded_at, processing_status, payload_json
      ) VALUES (
        @id, @caseId, @declaredCategory, @classifiedCategory, @originalFilename,
        @storageKey, @mimeType, @byteSize, @sha256, @pageCount, @uploadActorId,
        @uploadedAt, @processingStatus, @payloadJson
      )
    `);

    const insertField = this.db.prepare(`
      INSERT OR REPLACE INTO extracted_fields (
        id, case_id, document_id, field_name, raw_value, normalized_value,
        confidence, is_manually_corrected, corrected_by, payload_json
      ) VALUES (
        @id, @caseId, @documentId, @fieldName, @rawValue, @normalizedValue,
        @confidence, @isManuallyCorrected, @correctedBy, @payloadJson
      )
    `);

    const seedTransaction = this.db.transaction(() => {
      for (const c of seeded.cases) {
        insertCase.run({
          id: c.id,
          applicationId: c.applicationId,
          institutionId: c.institution.id,
          applicationType: c.application.applicationType,
          academicYear: c.application.academicYear,
          status: c.status,
          trustName: c.institution.trustOrSocietyName,
          institutionName: c.institution.legalName,
          isSyntheticDemo: c.isSyntheticDemo ? 1 : 0,
          createdBy: c.application.createdBy,
          createdAt: c.institution.createdAt,
          updatedAt: c.updatedAt,
          payloadJson: JSON.stringify(c),
        });
      }

      for (const d of seeded.documents) {
        insertDoc.run({
          id: d.id,
          caseId: d.caseId,
          declaredCategory: d.declaredCategory,
          classifiedCategory: d.classifiedCategory,
          originalFilename: d.originalFilename,
          storageKey: d.originalStorageKey,
          mimeType: d.mimeType,
          byteSize: d.byteSize,
          sha256: d.sha256,
          pageCount: d.pageCount || 1,
          uploadActorId: 'usr-operator',
          uploadedAt: d.uploadedAt || new Date().toISOString(),
          processingStatus: 'ANALYZED',
          payloadJson: JSON.stringify(d),
        });
      }

      for (const f of seeded.extractedFields) {
        insertField.run({
          id: f.id,
          caseId: f.caseId,
          documentId: f.documentId,
          fieldName: f.fieldName,
          rawValue: f.rawValue,
          normalizedValue: f.normalizedValue != null ? String(f.normalizedValue) : null,
          confidence: f.confidence,
          isManuallyCorrected: f.isManuallyCorrected ? 1 : 0,
          correctedBy: f.correctedByActorId || null,
          payloadJson: JSON.stringify(f),
        });
      }

      for (const ev of seeded.auditInputs) {
        this.appendAuditEvent({
          caseId: ev.caseId,
          actorId: ev.actorId,
          actorName: ev.actorName,
          actorRole: ev.actorRole,
          action: ev.action,
          entityType: ev.entityType,
          entityId: ev.entityId,
          reason: ev.reasonOrSummary,
        });
      }
    });

    seedTransaction();
  }

  // =========================================================================
  // USER METHODS
  // =========================================================================

  public getUserById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapUserRow(row);
  }

  public getUserByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
    if (!row) return null;
    return this.mapUserRow(row);
  }

  public listUsers(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY name ASC').all() as any[];
    return rows.map(r => this.mapUserRow(r));
  }

  public createUser(user: Omit<User, 'permissions'>, passwordHash: string): User {
    const roleRecord = this.getRoleByCode(user.role);
    const perms = roleRecord ? roleRecord.permissions : [];
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO users (
        id, email, name, role, status, designation, department, state, district,
        taluk, village, institution_id, phone, password_hash, permissions_json,
        last_login, created_at, updated_at, payload_json
      ) VALUES (
        @id, @email, @name, @role, @status, @designation, @department, @state, @district,
        @taluk, @village, @institutionId, @phone, @passwordHash, @permissionsJson,
        @lastLogin, @createdAt, @updatedAt, @payloadJson
      )
    `).run({
      id: user.id,
      email: user.email.toLowerCase().trim(),
      name: user.name,
      role: user.role,
      status: user.status || 'ACTIVE',
      designation: user.designation || null,
      department: user.department || null,
      state: user.state || null,
      district: user.district || null,
      taluk: user.taluk || null,
      village: user.village || null,
      institutionId: user.institutionId || null,
      phone: user.phone || null,
      passwordHash,
      permissionsJson: JSON.stringify(perms),
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
      payloadJson: JSON.stringify(user),
    });

    return this.getUserById(user.id)!;
  }

  public updateUser(
    id: string,
    updates: Partial<Pick<User, 'name' | 'phone' | 'designation' | 'department' | 'state' | 'district' | 'status' | 'role' | 'lastLogin'>>,
    newPasswordHash?: string
  ): User | null {
    const existing = this.getUserById(id);
    if (!existing) return null;

    let rolePerms = existing.permissions;
    if (updates.role && updates.role !== existing.role) {
      const roleRecord = this.getRoleByCode(updates.role);
      rolePerms = roleRecord ? roleRecord.permissions : [];
      // Role change: revoke active sessions for this user
      this.revokeUserSessions(id);
    }

    if (updates.status === 'INACTIVE') {
      this.revokeUserSessions(id);
    }

    const fields: string[] = ['updated_at = @updatedAt'];
    const params: any = { id, updatedAt: new Date().toISOString() };

    if (updates.name !== undefined) { fields.push('name = @name'); params.name = updates.name; }
    if (updates.phone !== undefined) { fields.push('phone = @phone'); params.phone = updates.phone; }
    if (updates.designation !== undefined) { fields.push('designation = @designation'); params.designation = updates.designation; }
    if (updates.department !== undefined) { fields.push('department = @department'); params.department = updates.department; }
    if (updates.state !== undefined) { fields.push('state = @state'); params.state = updates.state; }
    if (updates.district !== undefined) { fields.push('district = @district'); params.district = updates.district; }
    if (updates.status !== undefined) { fields.push('status = @status'); params.status = updates.status; }
    if (updates.role !== undefined) {
      fields.push('role = @role');
      params.role = updates.role;
      fields.push('permissions_json = @permissionsJson');
      params.permissionsJson = JSON.stringify(rolePerms);
    }
    if (updates.lastLogin !== undefined) { fields.push('last_login = @lastLogin'); params.lastLogin = updates.lastLogin; }
    if (newPasswordHash) {
      fields.push('password_hash = @passwordHash');
      params.passwordHash = newPasswordHash;
      this.revokeUserSessions(id);
    }

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
    this.db.prepare(sql).run(params);

    return this.getUserById(id);
  }

  public deleteUser(id: string): boolean {
    this.revokeUserSessions(id);
    const info = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return info.changes > 0;
  }

  private mapUserRow(row: any): User {
    let perms: PermissionKey[] = [];
    try {
      perms = JSON.parse(row.permissions_json || '[]');
    } catch {
      perms = [];
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      status: row.status as 'ACTIVE' | 'INACTIVE',
      designation: row.designation || '',
      department: row.department || '',
      state: row.state || '',
      district: row.district || '',
      taluk: row.taluk || '',
      village: row.village || '',
      institutionId: row.institution_id || '',
      phone: row.phone || '',
      passwordHash: row.password_hash,
      permissions: perms,
      lastLogin: row.last_login || undefined,
    };
  }

  // =========================================================================
  // ROLES METHODS
  // =========================================================================

  public listRoles(): Role[] {
    const roles = this.db.prepare('SELECT * FROM roles ORDER BY name ASC').all() as any[];
    return roles.map(r => {
      const userCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get(r.code) as any).cnt;
      return {
        id: r.id,
        code: r.code as UserRole,
        name: r.name,
        description: r.description || '',
        isSystem: Boolean(r.is_system),
        userCount,
        createdAt: r.created_at,
        permissions: JSON.parse(r.permissions_json || '[]'),
      };
    });
  }

  public getRoleByCode(code: string): Role | null {
    const r = this.db.prepare('SELECT * FROM roles WHERE code = ?').get(code) as any;
    if (!r) return null;
    const userCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get(r.code) as any).cnt;
    return {
      id: r.id,
      code: r.code as UserRole,
      name: r.name,
      description: r.description || '',
      isSystem: Boolean(r.is_system),
      userCount,
      createdAt: r.created_at,
      permissions: JSON.parse(r.permissions_json || '[]'),
    };
  }

  public createRole(role: Omit<Role, 'userCount'>): Role {
    this.db.prepare(`
      INSERT INTO roles (id, code, name, description, is_system, permissions_json, created_at)
      VALUES (@id, @code, @name, @description, @isSystem, @permissionsJson, @createdAt)
    `).run({
      id: role.id || `role-${crypto.randomUUID().slice(0, 8)}`,
      code: role.code,
      name: role.name,
      description: role.description || '',
      isSystem: role.isSystem ? 1 : 0,
      permissionsJson: JSON.stringify(role.permissions),
      createdAt: role.createdAt || new Date().toISOString(),
    });
    return this.getRoleByCode(role.code)!;
  }

  public updateRole(code: string, permissions: PermissionKey[]): Role | null {
    const role = this.getRoleByCode(code);
    if (!role) return null;

    const updateTransaction = this.db.transaction(() => {
      this.db.prepare('UPDATE roles SET permissions_json = ? WHERE code = ?').run(
        JSON.stringify(permissions),
        code
      );
      // Update all users who currently have this role
      this.db.prepare('UPDATE users SET permissions_json = ? WHERE role = ?').run(
        JSON.stringify(permissions),
        code
      );
    });
    updateTransaction();

    return this.getRoleByCode(code);
  }

  public deleteRole(code: string): { success: boolean; error?: string } {
    const role = this.getRoleByCode(code);
    if (!role) return { success: false, error: 'Role not found' };
    if (role.isSystem) return { success: false, error: 'System roles cannot be deleted' };

    const count = (this.db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get(code) as any).cnt;
    if (count > 0) {
      return {
        success: false,
        error: `Cannot delete role '${code}': ${count} active user(s) currently assigned. Reassign users first.`,
      };
    }

    this.db.prepare('DELETE FROM roles WHERE code = ?').run(code);
    return { success: true };
  }

  // =========================================================================
  // SESSION TRACKING WITH JTI & REVOCATION
  // =========================================================================

  public createSession(jti: string, userId: string, role: string, ttlSeconds = 43200): void {
    const nowSec = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO sessions (jti, user_id, role, created_at, expires_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, NULL)
    `).run(jti, userId, role, nowSec, nowSec + ttlSeconds);
  }

  public isSessionActive(jti: string): boolean {
    const nowSec = Math.floor(Date.now() / 1000);
    const row = this.db.prepare(`
      SELECT revoked_at, expires_at FROM sessions WHERE jti = ?
    `).get(jti) as any;

    if (!row) return false;
    if (row.revoked_at !== null) return false;
    if (row.expires_at <= nowSec) return false;
    return true;
  }

  public revokeSession(jti: string): void {
    const nowSec = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE sessions SET revoked_at = ? WHERE jti = ?').run(nowSec, jti);
  }

  public revokeUserSessions(userId: string): void {
    const nowSec = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(nowSec, userId);
  }

  // =========================================================================
  // RATE LIMITING
  // =========================================================================

  public checkRateLimit(key: string, maxAttempts = 10, windowSeconds = 60): { allowed: boolean; remaining: number } {
    const nowSec = Math.floor(Date.now() / 1000);
    const cleanKey = `rl:${key.trim().toLowerCase()}`;

    const existing = this.db.prepare('SELECT attempts, window_start FROM rate_limits WHERE key = ?').get(cleanKey) as any;
    if (!existing || nowSec - existing.window_start >= windowSeconds) {
      this.db.prepare(`
        INSERT OR REPLACE INTO rate_limits (key, attempts, window_start)
        VALUES (?, 1, ?)
      `).run(cleanKey, nowSec);
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.attempts >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    const nextAttempts = existing.attempts + 1;
    this.db.prepare('UPDATE rate_limits SET attempts = ? WHERE key = ?').run(nextAttempts, cleanKey);
    return { allowed: true, remaining: maxAttempts - nextAttempts };
  }

  // =========================================================================
  // TAMPER-EVIDENT AUDIT CHAIN (HMAC-SHA256 with key outside DB)
  // =========================================================================

  public appendAuditEvent(input: {
    caseId?: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string;
    details?: any;
  }): AuditEventRecord {
    const appendTransaction = this.db.transaction(() => {
      const lastRow = this.db.prepare(`
        SELECT sequence_number, event_hash FROM audit_events ORDER BY sequence_number DESC LIMIT 1
      `).get() as any;

      const sequenceNumber = lastRow ? lastRow.sequence_number + 1 : 1;
      const previousHash = lastRow
        ? lastRow.event_hash
        : '0000000000000000000000000000000000000000000000000000000000000000';

      const id = `aud-${crypto.randomUUID()}`;
      const timestampUtc = new Date().toISOString();

      // Canonical payload hashed with HMAC-SHA256 using AUDIT_KEY
      const payloadString = [
        previousHash,
        id,
        timestampUtc,
        input.caseId || '',
        input.actorId,
        input.actorRole,
        input.action,
        input.entityType,
        input.entityId,
        input.reason,
      ].join('|');

      const eventHash = crypto
        .createHmac('sha256', AUDIT_KEY)
        .update(payloadString)
        .digest('hex');

      this.db.prepare(`
        INSERT INTO audit_events (
          id, sequence_number, case_id, actor_id, actor_name, actor_role, action,
          entity_type, entity_id, reason, previous_hash, event_hash, timestamp_utc, details_json
        ) VALUES (
          @id, @sequenceNumber, @caseId, @actorId, @actorName, @actorRole, @action,
          @entityType, @entityId, @reason, @previousHash, @eventHash, @timestampUtc, @detailsJson
        )
      `).run({
        id,
        sequenceNumber,
        caseId: input.caseId || null,
        actorId: input.actorId,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        previousHash,
        eventHash,
        timestampUtc,
        detailsJson: input.details ? JSON.stringify(input.details) : null,
      });

      return {
        id,
        sequenceNumber,
        caseId: input.caseId,
        actorId: input.actorId,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        previousHash,
        eventHash,
        timestampUtc,
        details: input.details,
      };
    });

    return appendTransaction();
  }

  public listAuditEvents(filter?: { caseId?: string; action?: string; limit?: number }): AuditEventRecord[] {
    let sql = 'SELECT * FROM audit_events';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.caseId) {
      conditions.push('case_id = ?');
      params.push(filter.caseId);
    }
    if (filter?.action) {
      conditions.push('action = ?');
      params.push(filter.action);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY sequence_number DESC';

    if (filter?.limit && filter.limit > 0) {
      sql += ` LIMIT ${filter.limit}`;
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      sequenceNumber: r.sequence_number,
      caseId: r.case_id || undefined,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      reason: r.reason,
      previousHash: r.previous_hash,
      eventHash: r.event_hash,
      timestampUtc: r.timestamp_utc,
      details: r.details_json ? JSON.parse(r.details_json) : undefined,
    }));
  }

  public verifyChainIntegrity(): {
    valid: boolean;
    totalEventsChecked: number;
    brokenAtIndex?: number;
    expectedHash?: string;
    actualHash?: string;
  } {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY sequence_number ASC').all() as any[];
    if (rows.length === 0) {
      return { valid: true, totalEventsChecked: 0 };
    }

    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < rows.length; i++) {
      const ev = rows[i];
      if (ev.previous_hash !== prev) {
        return {
          valid: false,
          totalEventsChecked: rows.length,
          brokenAtIndex: i,
          expectedHash: prev,
          actualHash: ev.previous_hash,
        };
      }

      const payload = [
        prev,
        ev.id,
        ev.timestamp_utc,
        ev.case_id || '',
        ev.actor_id,
        ev.actor_role,
        ev.action,
        ev.entity_type,
        ev.entity_id,
        ev.reason,
      ].join('|');

      const computedHash = crypto
        .createHmac('sha256', AUDIT_KEY)
        .update(payload)
        .digest('hex');

      if (computedHash !== ev.event_hash) {
        return {
          valid: false,
          totalEventsChecked: rows.length,
          brokenAtIndex: i,
          expectedHash: computedHash,
          actualHash: ev.event_hash,
        };
      }

      prev = ev.event_hash;
    }

    return { valid: true, totalEventsChecked: rows.length };
  }

  public createAuditSnapshot(): AuditSnapshot {
    const lastRow = this.db.prepare(`
      SELECT sequence_number, event_hash FROM audit_events ORDER BY sequence_number DESC LIMIT 1
    `).get() as any;

    if (!lastRow) {
      throw new Error('Cannot snapshot an empty audit chain');
    }

    const snapshotId = `snap-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const upToSequenceNumber = lastRow.sequence_number;
    const headEventHash = lastRow.event_hash;

    const signaturePayload = `${snapshotId}|${createdAt}|${upToSequenceNumber}|${headEventHash}`;
    const snapshotSignature = crypto
      .createHmac('sha256', AUDIT_KEY)
      .update(signaturePayload)
      .digest('hex');

    this.db.prepare(`
      INSERT INTO audit_snapshots (id, created_at, up_to_sequence_number, head_event_hash, snapshot_signature, total_events)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(snapshotId, createdAt, upToSequenceNumber, headEventHash, snapshotSignature, upToSequenceNumber);

    return {
      id: snapshotId,
      createdAt,
      upToSequenceNumber,
      headEventHash,
      snapshotSignature,
      totalEvents: upToSequenceNumber,
    };
  }

  public verifyAuditSnapshot(snapshotId: string): { valid: boolean; snapshot?: AuditSnapshot } {
    const row = this.db.prepare('SELECT * FROM audit_snapshots WHERE id = ?').get(snapshotId) as any;
    if (!row) return { valid: false };

    const expectedSig = crypto
      .createHmac('sha256', AUDIT_KEY)
      .update(`${row.id}|${row.created_at}|${row.up_to_sequence_number}|${row.head_event_hash}`)
      .digest('hex');

    if (expectedSig !== row.snapshot_signature) {
      return { valid: false };
    }

    return {
      valid: true,
      snapshot: {
        id: row.id,
        createdAt: row.created_at,
        upToSequenceNumber: row.up_to_sequence_number,
        headEventHash: row.head_event_hash,
        snapshotSignature: row.snapshot_signature,
        totalEvents: row.total_events,
      },
    };
  }

  // =========================================================================
  // DOSSIER CASES & DOCUMENTS
  // =========================================================================

  public listCases(filter?: { status?: string; institutionId?: string }): VerificationCase[] {
    let sql = 'SELECT payload_json FROM cases';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.institutionId) {
      conditions.push('institution_id = ?');
      params.push(filter.institutionId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  public getCaseById(id: string): VerificationCase | null {
    const row = this.db.prepare('SELECT payload_json FROM cases WHERE id = ?').get(id) as any;
    if (!row) return null;
    return JSON.parse(row.payload_json);
  }

  public saveCase(c: VerificationCase): void {
    const now = new Date().toISOString();
    c.updatedAt = now;
    this.db.prepare(`
      INSERT INTO cases (
        id, application_id, institution_id, application_type, academic_year, status,
        trust_name, institution_name, is_synthetic_demo, created_by, created_at, updated_at, payload_json
      ) VALUES (
        @id, @applicationId, @institutionId, @applicationType, @academicYear, @status,
        @trustName, @institutionName, @isSyntheticDemo, @createdBy, @createdAt, @updatedAt, @payloadJson
      )
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
    `).run({
      id: c.id,
      applicationId: c.applicationId,
      institutionId: c.institution.id,
      applicationType: c.application.applicationType,
      academicYear: c.application.academicYear,
      status: c.status,
      trustName: c.institution.trustOrSocietyName,
      institutionName: c.institution.legalName,
      isSyntheticDemo: c.isSyntheticDemo ? 1 : 0,
      createdBy: c.application.createdBy,
      createdAt: c.institution.createdAt || now,
      updatedAt: now,
      payloadJson: JSON.stringify(c),
    });
  }

  public listDocuments(caseId: string): DossierDocument[] {
    const rows = this.db.prepare('SELECT payload_json FROM dossier_documents WHERE case_id = ? ORDER BY uploaded_at ASC').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  public getDocumentById(id: string): DossierDocument | null {
    const row = this.db.prepare('SELECT payload_json FROM dossier_documents WHERE id = ?').get(id) as any;
    if (!row) return null;
    return JSON.parse(row.payload_json);
  }

  public saveDocument(doc: DossierDocument): void {
    this.db.prepare(`
      INSERT INTO dossier_documents (
        id, case_id, declared_category, classified_category, original_filename,
        storage_key, mime_type, byte_size, sha256, page_count, upload_actor_id,
        uploaded_at, processing_status, payload_json
      ) VALUES (
        @id, @caseId, @declaredCategory, @classifiedCategory, @originalFilename,
        @storageKey, @mimeType, @byteSize, @sha256, @pageCount, @uploadActorId,
        @uploadedAt, @processingStatus, @payloadJson
      )
      ON CONFLICT(id) DO UPDATE SET
        classified_category = excluded.classified_category,
        processing_status = excluded.processing_status,
        payload_json = excluded.payload_json
    `).run({
      id: doc.id,
      caseId: doc.caseId,
      declaredCategory: doc.declaredCategory,
      classifiedCategory: doc.classifiedCategory,
      originalFilename: doc.originalFilename,
      storageKey: doc.originalStorageKey,
      mimeType: doc.mimeType,
      byteSize: doc.byteSize,
      sha256: doc.sha256,
      pageCount: doc.pageCount || 1,
      uploadActorId: 'usr-operator',
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
      processingStatus: 'ANALYZED',
      payloadJson: JSON.stringify(doc),
    });
  }

  public listExtractedFields(caseId: string): ExtractedFieldCandidate[] {
    const rows = this.db.prepare('SELECT payload_json FROM extracted_fields WHERE case_id = ?').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  public getFieldById(id: string): ExtractedFieldCandidate | null {
    const row = this.db.prepare('SELECT payload_json FROM extracted_fields WHERE id = ?').get(id) as any;
    return row ? JSON.parse(row.payload_json) : null;
  }

  public listExtractedFieldsByDocument(documentId: string): ExtractedFieldCandidate[] {
    const rows = this.db.prepare('SELECT payload_json FROM extracted_fields WHERE document_id = ?').all(documentId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  public saveExtractedField(field: ExtractedFieldCandidate): void {
    this.db.prepare(`
      INSERT INTO extracted_fields (
        id, case_id, document_id, field_name, raw_value, normalized_value,
        confidence, is_manually_corrected, corrected_by, payload_json
      ) VALUES (
        @id, @caseId, @documentId, @fieldName, @rawValue, @normalizedValue,
        @confidence, @isManuallyCorrected, @correctedBy, @payloadJson
      )
      ON CONFLICT(id) DO UPDATE SET
        raw_value = excluded.raw_value,
        normalized_value = excluded.normalized_value,
        confidence = excluded.confidence,
        is_manually_corrected = excluded.is_manually_corrected,
        corrected_by = excluded.corrected_by,
        payload_json = excluded.payload_json
    `).run({
      id: field.id,
      caseId: field.caseId,
      documentId: field.documentId,
      fieldName: field.fieldName,
      rawValue: field.rawValue,
      normalizedValue: field.normalizedValue != null ? String(field.normalizedValue) : null,
      confidence: field.confidence,
      isManuallyCorrected: field.isManuallyCorrected ? 1 : 0,
      correctedBy: field.correctedByActorId || null,
      payloadJson: JSON.stringify(field),
    });
  }

  public saveProcessingRun(run: ProcessingRun, findings: AssuranceFinding[]): void {
    const saveTransaction = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO processing_runs (id, case_id, idempotency_key, status, started_at, completed_at, payload_json)
        VALUES (@id, @caseId, @idempotencyKey, @status, @startedAt, @completedAt, @payloadJson)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          completed_at = excluded.completed_at,
          payload_json = excluded.payload_json
      `).run({
        id: run.id,
        caseId: run.caseId,
        idempotencyKey: run.idempotencyKey || null,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt || null,
        payloadJson: JSON.stringify(run),
      });

      const insertFinding = this.db.prepare(`
        INSERT OR REPLACE INTO findings (id, case_id, run_id, rule_id, rule_code, status, severity, mandatory, message, payload_json)
        VALUES (@id, @caseId, @runId, @ruleId, @ruleCode, @status, @severity, @mandatory, @message, @payloadJson)
      `);

      for (const f of findings) {
        insertFinding.run({
          id: f.id,
          caseId: f.caseId,
          runId: f.runId,
          ruleId: f.ruleId,
          ruleCode: f.ruleCode,
          status: f.status,
          severity: f.severity,
          mandatory: f.mandatory ? 1 : 0,
          message: f.message,
          payloadJson: JSON.stringify(f),
        });
      }
    });

    saveTransaction();
  }

  public listFindings(caseId: string): AssuranceFinding[] {
    const rows = this.db.prepare('SELECT payload_json FROM findings WHERE case_id = ?').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  public saveReviewDecision(decision: ReviewDecision): void {
    const decisionTransaction = this.db.transaction(() => {
      const resultingStatus: DossierStatus =
        decision.outcome === 'APPROVE'
          ? 'APPROVED'
          : decision.outcome === 'REJECT'
          ? 'REJECTED'
          : 'NEEDS_INFORMATION';

      this.db.prepare(`
        INSERT OR REPLACE INTO review_decisions (
          id, case_id, reviewer_id, reviewer_name, reviewer_role, decision, resulting_status, reason, decided_at, payload_json
        ) VALUES (
          @id, @caseId, @reviewerId, @reviewerName, @reviewerRole, @decision, @resultingStatus, @reason, @decidedAt, @payloadJson
        )
      `).run({
        id: decision.id,
        caseId: decision.caseId,
        reviewerId: decision.actorId,
        reviewerName: decision.actorName,
        reviewerRole: decision.actorRole,
        decision: decision.outcome,
        resultingStatus,
        reason: decision.reason,
        decidedAt: decision.createdAt,
        payloadJson: JSON.stringify(decision),
      });

      const caseObj = this.getCaseById(decision.caseId);
      if (caseObj) {
        caseObj.status = resultingStatus;
        this.saveCase(caseObj);
      }
    });

    decisionTransaction();
  }

  public listReviewDecisions(caseId: string): ReviewDecision[] {
    const rows = this.db.prepare('SELECT payload_json FROM review_decisions WHERE case_id = ? ORDER BY decided_at DESC').all(caseId) as any[];
    return rows.map(r => JSON.parse(r.payload_json));
  }

  // =========================================================================
  // SYSTEM SETTINGS
  // =========================================================================

  public getSystemSettings(): any {
    const row = this.db.prepare('SELECT value_json FROM system_settings WHERE key = ?').get('global') as any;
    if (row) {
      try {
        return JSON.parse(row.value_json);
      } catch {
        // fallback
      }
    }
    return {
      confidenceThreshold: 0.85,
      areaTolerancePercent: 2.0,
      duplicateMatchThreshold: 0.9,
      maxUploadSizeMb: 15,
      maxPdfPages: 50,
      enableExperimentalForensics: true,
      activeDefaultRuleSetId: 'ruleset-aicte-new-2026-27',
      supportedLanguages: ['English', 'Hindi', 'Tamil', 'Marathi', 'Kannada'],
      documentTypes: [
        'APPLICATION_FORM',
        'LAND_OWNERSHIP_TITLE',
        'BUILDING_PLAN_APPROVAL',
        'FIRE_SAFETY_NOC',
        'BANK_FDR_CORPUS',
        'TRUST_SOCIETY_DEED',
        'NON_JUDICIAL_AFFIDAVIT',
        'FACULTY_COMPLIANCE_ROSTER',
      ],
      validationRulesEnabled: {
        'COMP-01': true,
        'COMP-02': true,
        'COMP-03': true,
        'COMP-04': true,
        'COMP-05': true,
        'COMP-06': true,
        'COMP-07': true,
        'COMP-08': true,
        'COMP-09': true,
        'COMP-10': true,
        'COMP-11': true,
        'COMP-12': true,
      },
      notificationsEnabled: true,
      emailAlertsEnabled: false,
      autoExtractLayoutLM: true,
      dilrmpApiSync: false,
    };
  }

  public updateSystemSettings(updates: any, updatedBy?: string): any {
    const current = this.getSystemSettings();
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString(), updatedBy };
    this.db.prepare(`
      INSERT INTO system_settings (key, value_json)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
    `).run('global', JSON.stringify(merged));
    return merged;
  }

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  public listNotifications(userId?: string): any[] {
    const rows = this.db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all() as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type,
      read: Boolean(r.read),
      createdAt: r.created_at,
      link: r.link,
    }));
  }

  public markNotificationRead(id: string): void {
    this.db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  }

  public markAllNotificationsRead(userId?: string): void {
    this.db.prepare('UPDATE notifications SET read = 1').run();
  }
}

export const dbService = DatabaseService.getInstance();
