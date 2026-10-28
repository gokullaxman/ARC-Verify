import { User, UserRole, PermissionKey, VerificationCase } from '@/types';
import { ALL_PERMISSIONS, INITIAL_ROLES } from './mock-data';

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
  '/gis': 'GIS_VIEW',
  '/maps': 'GIS_VIEW',
  '/records': 'RECORD_VIEW',
  '/cases': 'CASE_VIEW',
  '/rules': 'RULE_VIEW',
};

/**
 * Returns whether a user has a specific permission.
 * Super Admins automatically have all permissions.
 * Deny-by-default when user is null/undefined or inactive.
 */
export function hasPermission(user: User | null | undefined, permission: PermissionKey): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN') return true;

  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(permission)) return true;
  }

  const roleObj = INITIAL_ROLES.find(r => r.code === user.role);
  if (roleObj && roleObj.permissions.includes(permission)) {
    return true;
  }

  // Implicit permission mapping between legacy roles and ARC-Verify dossier permissions
  const legacyToDossierMap: Partial<Record<PermissionKey, PermissionKey>> = {
    CASE_VIEW: 'RECORD_VIEW',
    CASE_CREATE: 'DOCUMENT_UPLOAD',
    CASE_ANALYZE: 'VALIDATION_RUN',
    CASE_REVIEW: 'VERIFICATION_APPROVE',
    REPORT_GENERATE: 'RECORD_VIEW',
    RULE_VIEW: 'RECORD_VIEW',
    RULE_CONFIGURE: 'VALIDATION_CONFIGURE',
  };

  const mappedPerm = legacyToDossierMap[permission];
  if (mappedPerm) {
    if (user.permissions?.includes(mappedPerm)) return true;
    if (roleObj?.permissions.includes(mappedPerm)) return true;
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
    return ALL_PERMISSIONS.map(p => p.key);
  }
  const roleObj = INITIAL_ROLES.find(r => r.code === role);
  return roleObj ? [...roleObj.permissions] : [];
}

/**
 * Case-level Authorization (Section 4.1, 11.1, TC-14):
 * - Applicants/Submitters can ONLY view or upload to their own dossier (createdBy === user.id or matching institutionId).
 * - Scrutiny Officers, Compliance Auditors, Admins, and Super Admins can view assigned/jurisdiction dossiers.
 * - Viewers without case ownership cannot read private dossiers or reports.
 */
export function canAccessCase(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

  if (user.role === 'VIEWER') {
    return false;
  }

  if (user.role === 'APPLICANT' || user.role === 'DATA_ENTRY_OPERATOR') {
    return (
      dossier.application.createdBy === user.id ||
      (Boolean(user.institutionId) && dossier.institution.id === user.institutionId)
    );
  }

  if (
    user.role === 'SCRUTINY_OFFICER' ||
    user.role === 'REVENUE_OFFICER' ||
    user.role === 'VERIFICATION_OFFICER' ||
    user.role === 'COMPLIANCE_AUDITOR' ||
    user.role === 'AUDITOR' ||
    user.role === 'DEMO_OPERATOR'
  ) {
    return hasPermission(user, 'CASE_VIEW');
  }

  return false;
}

/**
 * Determines whether a user is authorized to record a reviewer decision on a dossier (FR-17).
 * Submitters, Operators, and Auditors cannot record scrutiny approval/rejection decisions.
 */
export function canReviewCase(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (!canAccessCase(user, dossier)) return false;

  const allowedReviewerRoles: UserRole[] = [
    'SUPER_ADMIN',
    'ADMIN',
    'SCRUTINY_OFFICER',
    'REVENUE_OFFICER',
    'VERIFICATION_OFFICER',
  ];

  if (!allowedReviewerRoles.includes(user.role)) {
    return false;
  }

  // Prevent self-approval if reviewer created the application
  if (dossier.application.createdBy === user.id && user.role !== 'SUPER_ADMIN') {
    return false;
  }

  return hasPermission(user, 'CASE_REVIEW');
}

/**
 * Determines whether a user can modify extraction values with an audited reason (FR-09).
 */
export function canCorrectExtractedField(user: User | null | undefined, dossier: VerificationCase): boolean {
  if (!user || user.status === 'INACTIVE') return false;
  if (!canAccessCase(user, dossier)) return false;

  const allowedRoles: UserRole[] = [
    'SUPER_ADMIN',
    'ADMIN',
    'SCRUTINY_OFFICER',
    'REVENUE_OFFICER',
    'VERIFICATION_OFFICER',
  ];
  return allowedRoles.includes(user.role) && hasPermission(user, 'VERIFICATION_EDIT');
}
