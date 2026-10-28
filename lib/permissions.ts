import { PermissionKey } from '@/types';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: string;
  description: string;
}

export const ARC_VERIFY_PERMISSIONS: PermissionDefinition[] = [
  // Dossier & Scrutiny
  {
    key: 'CASE_VIEW',
    label: 'View Application Dossiers',
    category: 'Dossier Scrutiny',
    description: 'Inspect institutional approval dossiers, submission forms, and campus profiles.',
  },
  {
    key: 'CASE_CREATE',
    label: 'Create Application Dossier',
    category: 'Dossier Scrutiny',
    description: 'Submit a new institutional approval application dossier to AICTE.',
  },
  {
    key: 'CASE_ANALYZE',
    label: 'Execute Compliance Scrutiny Engine',
    category: 'Dossier Scrutiny',
    description: 'Run automated regulatory rule evaluation (COMP-01 to COMP-12) and cross-document concordance.',
  },
  {
    key: 'CASE_REVIEW',
    label: 'Record Scrutiny Decisions',
    category: 'Dossier Scrutiny',
    description: 'Issue statutory approval, rejection, or request remediation on an institutional dossier.',
  },
  {
    key: 'REPORT_GENERATE',
    label: 'Generate Statutory Scrutiny Reports',
    category: 'Dossier Scrutiny',
    description: 'Compile and download explainable compliance audit reports with cryptographic evidence.',
  },

  // Regulatory Rules
  {
    key: 'RULE_VIEW',
    label: 'View Regulatory Rule Handbook',
    category: 'Regulatory Rules',
    description: 'Browse the AICTE Approval Process Handbook (2024–27) statutory clauses and benchmarks.',
  },
  {
    key: 'RULE_CONFIGURE',
    label: 'Configure Rule Benchmarks & Tolerances',
    category: 'Regulatory Rules',
    description: 'Adjust land thresholds, area tolerances, and corpus fund requirements.',
  },

  // Document Management
  {
    key: 'DOCUMENT_VIEW',
    label: 'View Uploaded Evidence Documents',
    category: 'Documents',
    description: 'Inspect private PDFs, NOCs, land titles, and affidavit scans.',
  },
  {
    key: 'DOCUMENT_UPLOAD',
    label: 'Upload Evidence Documents',
    category: 'Documents',
    description: 'Ingest institutional certificates and evidence into private storage with SHA-256 digests.',
  },
  {
    key: 'DOCUMENT_DOWNLOAD',
    label: 'Download Verified Evidence',
    category: 'Documents',
    description: 'Download original or annotated document files for audit archives.',
  },
  {
    key: 'DOCUMENT_DELETE',
    label: 'Delete Erroneous Documents',
    category: 'Documents',
    description: 'Remove invalid or superseded evidence uploads from a dossier.',
  },
  {
    key: 'DOCUMENT_PROCESS',
    label: 'Run Forensics & OCR Extraction',
    category: 'Documents',
    description: 'Execute pixel forensic analysis, ELA, and OCR field extraction pipelines.',
  },

  // Administration & Security
  {
    key: 'USER_VIEW',
    label: 'View Officer Directory',
    category: 'Administration',
    description: 'Inspect directory of registered scrutiny officers and institution applicants.',
  },
  {
    key: 'USER_CREATE',
    label: 'Provision New Officers',
    category: 'Administration',
    description: 'Register new platform officers and assign jurisdiction profiles.',
  },
  {
    key: 'USER_EDIT',
    label: 'Edit User Profiles',
    category: 'Administration',
    description: 'Update personnel details, designations, and department affiliations.',
  },
  {
    key: 'USER_DISABLE',
    label: 'Deactivate / Terminate User Access',
    category: 'Administration',
    description: 'Immediately revoke active sessions and debar user accounts.',
  },
  {
    key: 'ROLE_VIEW',
    label: 'View Security Roles & Policies',
    category: 'Administration',
    description: 'Inspect RBAC privilege matrices and role definitions.',
  },
  {
    key: 'ROLE_CREATE',
    label: 'Create Custom Roles',
    category: 'Administration',
    description: 'Create new role templates with selected statutory privileges.',
  },
  {
    key: 'ROLE_EDIT',
    label: 'Modify Role Permissions',
    category: 'Administration',
    description: 'Adjust privilege assignments for custom administrative roles.',
  },
  {
    key: 'ROLE_DELETE',
    label: 'Delete Custom Roles',
    category: 'Administration',
    description: 'Remove custom roles with active user check guards.',
  },

  // Audit & Analytics
  {
    key: 'AUDIT_VIEW',
    label: 'Inspect HMAC Audit Ledger',
    category: 'Audit & Analytics',
    description: 'Verify tamper-evident SHA-256 hash chains, block sequences, and snapshot proofs.',
  },
  {
    key: 'ANALYTICS_VIEW',
    label: 'View Assurance Analytics',
    category: 'Audit & Analytics',
    description: 'Analyze approval ratios, common deficiency patterns, and regional compliance.',
  },
  {
    key: 'SYSTEM_SETTINGS',
    label: 'Manage Platform Settings',
    category: 'Settings',
    description: 'Configure cryptographic keys, OCR timeouts, and regulatory thresholds.',
  },
];

export const ALL_PERMISSIONS = ARC_VERIFY_PERMISSIONS;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: ARC_VERIFY_PERMISSIONS.map(p => p.key),
  ADMIN: [
    'CASE_VIEW', 'CASE_CREATE', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
    'RULE_VIEW', 'RULE_CONFIGURE',
    'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
    'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DISABLE',
    'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT',
    'AUDIT_VIEW', 'ANALYTICS_VIEW',
  ],
  SCRUTINY_OFFICER: [
    'CASE_VIEW', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
    'RULE_VIEW',
    'DOCUMENT_VIEW', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
    'AUDIT_VIEW', 'ANALYTICS_VIEW',
  ],
  COMPLIANCE_AUDITOR: [
    'CASE_VIEW', 'RULE_VIEW', 'REPORT_GENERATE', 'DOCUMENT_VIEW',
    'AUDIT_VIEW', 'ANALYTICS_VIEW',
  ],
  APPLICANT: [
    'CASE_VIEW', 'CASE_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
  ],
  DEMO_OPERATOR: [
    'CASE_VIEW', 'CASE_CREATE', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
    'RULE_VIEW', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
    'AUDIT_VIEW', 'ANALYTICS_VIEW',
  ],
  VIEWER: ['RULE_VIEW'],
  REVENUE_OFFICER: [
    'CASE_VIEW', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
    'RULE_VIEW', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD',
  ],
  VERIFICATION_OFFICER: [
    'CASE_VIEW', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
    'RULE_VIEW', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD',
  ],
  DATA_ENTRY_OPERATOR: [
    'CASE_VIEW', 'CASE_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
  ],
  GIS_OFFICER: [
    'CASE_VIEW', 'RULE_VIEW', 'DOCUMENT_VIEW',
  ],
  AUDITOR: [
    'CASE_VIEW', 'RULE_VIEW', 'REPORT_GENERATE', 'DOCUMENT_VIEW',
    'AUDIT_VIEW', 'ANALYTICS_VIEW',
  ],
};
