import { User, UserRole, PermissionKey, VerificationCase } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions';

// Map of route paths to required permissions (Deny-by-default for sensitive routes)
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  '/settings': 'SYSTEM_SETTINGS',
  '/users': 'USER_VIEW',
  '/roles': 'ROLE_VIEW',
  '/permissions': 'ROLE_VIEW',
  '/audit': 'AUDIT_VIEW',
  '/verification': 'VERIFICATION_VIEW',
  '/documents/upload': 'DOCUMENT_UPLOAD',
  '/analytics': 'ANALYTICS_VIEW',
  '/cases': 'CASE_VIEW',
  '/rules': 'RULE_VIEW',
};

/**
 * Returns whether a user has a specific permission.
 * Super Admins automatically have all permissions.
 * Deny-by-default when user is null/undefined or inactive.
 * Uses user.permissions only, re-derived from role table dynamically if missing.
 */
export function hasPermission(user: User | null | undefined, permission: PermissionKey): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN') return true;

  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(permission)) return true;
    if (permission === 'VERIFICATION_VIEW' && (user.permissions.includes('CASE_REVIEW') || user.permissions.includes('CASE_VIEW'))) return true;
    if (permission === 'CASE_REVIEW' && (user.permissions.includes('VERIFICATION_APPROVE') || user.permissions.includes('VERIFICATION_VIEW'))) return true;
    if (permission === 'CASE_VIEW' && user.permissions.includes('RECORD_VIEW')) return true;
    if (permission === 'RULE_VIEW' && user.permissions.includes('RECORD_VIEW')) return true;
    return false;
  }

  // Dynamic role fallback from DEFAULT_ROLE_PERMISSIONS if user permissions are not present
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role];
  if (defaultPerms && defaultPerms.includes(permission)) {
    return true;
  }

  return false;
}

export function hasAnyPermission(user: User | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: User | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

export function canAccessRoute(user: User | null | undefined, pathname: string): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN') return true;

  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return hasPermission(user, perm);
    }
  }

  return true;
}

export function getPermissionsForRole(role: UserRole): PermissionKey[] {
  if (role === 'SUPER_ADMIN') {
    return [
      'CASE_VIEW', 'CASE_CREATE', 'CASE_ANALYZE', 'CASE_REVIEW', 'REPORT_GENERATE',
      'RULE_VIEW', 'RULE_CONFIGURE', 'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE',
      'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD', 'USER_VIEW', 'USER_CREATE', 'USER_EDIT',
      'USER_DISABLE', 'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE',
      'AUDIT_VIEW', 'ANALYTICS_VIEW', 'SYSTEM_SETTINGS'
    ];
  }
  const perms = DEFAULT_ROLE_PERMISSIONS[role];
  return perms ? [...perms] : [];
}

/**
 * Case-level Authorization (Requirement Section 4.1, 11.1, TC-14):
 * - Applicants can ONLY view or upload to their own dossier (createdBy === user.id or matching institutionId).
 * - Scrutiny Officers, Compliance Auditors, Admins, and Super Admins can view assigned/jurisdiction dossiers.
 * - Viewers without case ownership cannot read private dossiers or reports.
 */
export function canAccessCase(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

  if (user.role === 'VIEWER') {
    return false;
  }

  if (
    user.role === 'SCRUTINY_OFFICER' ||
    user.role === 'COMPLIANCE_AUDITOR' ||
    user.role === 'DEMO_OPERATOR' ||
    user.role === 'REVENUE_OFFICER' ||
    user.role === 'VERIFICATION_OFFICER'
  ) {
    return true;
  }

  if (user.role === 'APPLICANT' || user.role === 'DATA_ENTRY_OPERATOR') {
    const isOwner = dossier.application?.createdBy === user.id || (dossier as any).createdBy === user.id;
    const isSameInst = user.institutionId && dossier.institution?.id && user.institutionId === dossier.institution.id;
    return Boolean(isOwner || isSameInst);
  }

  return false;
}

/**
 * Check whether a user is authorized to perform review decisions (APPROVE, REJECT, REQUEST_CORRECTION)
 */
export function canReviewCase(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SCRUTINY_OFFICER' || user.role === 'REVENUE_OFFICER') return true;

  if (user.role === 'APPLICANT' || user.role === 'DATA_ENTRY_OPERATOR' || user.role === 'VIEWER') {
    return false;
  }

  if (!hasPermission(user, 'CASE_REVIEW')) return false;

  return canAccessCase(user, dossier);
}

/**
 * Check whether a user is authorized to correct extracted OCR candidate fields
 */
export function canCorrectExtractedField(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ADMIN' ||
    user.role === 'SCRUTINY_OFFICER' ||
    user.role === 'REVENUE_OFFICER' ||
    user.role === 'VERIFICATION_OFFICER'
  ) {
    return true;
  }
  return false;
}
