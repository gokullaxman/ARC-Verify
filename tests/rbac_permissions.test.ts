import test from 'node:test';
import assert from 'node:assert';
import { DEMO_USERS, INITIAL_ROLES } from '../lib/mock-data';
import { hasPermission, canAccessRoute } from '../lib/auth';
import { dbStore } from '../lib/store';

test('RBAC: Super Admin has full permissions across all routes', () => {
  const superAdmin = DEMO_USERS.find(u => u.role === 'SUPER_ADMIN');
  assert.ok(superAdmin, 'Super Admin demo user must exist');

  assert.strictEqual(hasPermission(superAdmin, 'SYSTEM_SETTINGS'), true);
  assert.strictEqual(hasPermission(superAdmin, 'USER_VIEW'), true);
  assert.strictEqual(hasPermission(superAdmin, 'ROLE_VIEW'), true);
  assert.strictEqual(hasPermission(superAdmin, 'AUDIT_VIEW'), true);
  assert.strictEqual(hasPermission(superAdmin, 'DOCUMENT_UPLOAD'), true);
  assert.strictEqual(hasPermission(superAdmin, 'RECORD_APPROVE'), true);

  assert.strictEqual(canAccessRoute(superAdmin, '/settings'), true);
  assert.strictEqual(canAccessRoute(superAdmin, '/users'), true);
  assert.strictEqual(canAccessRoute(superAdmin, '/roles'), true);
  assert.strictEqual(canAccessRoute(superAdmin, '/audit'), true);
  assert.strictEqual(canAccessRoute(superAdmin, '/verification'), true);
  assert.strictEqual(canAccessRoute(superAdmin, '/documents/upload'), true);
});

test('RBAC: Admin has operational access but is denied root System Settings', () => {
  const admin = DEMO_USERS.find(u => u.role === 'ADMIN');
  assert.ok(admin, 'Admin demo user must exist');

  assert.strictEqual(hasPermission(admin, 'SYSTEM_SETTINGS'), false);
  assert.strictEqual(hasPermission(admin, 'USER_VIEW'), true);
  assert.strictEqual(hasPermission(admin, 'ROLE_VIEW'), true);
  assert.strictEqual(hasPermission(admin, 'AUDIT_VIEW'), true);

  assert.strictEqual(canAccessRoute(admin, '/settings'), false);
  assert.strictEqual(canAccessRoute(admin, '/users'), true);
  assert.strictEqual(canAccessRoute(admin, '/roles'), true);
  assert.strictEqual(canAccessRoute(admin, '/audit'), true);
});

test('RBAC: Revenue Officer has operational verify/approve access but is denied Users, Roles, Audit, Settings', () => {
  const officer = DEMO_USERS.find(u => u.role === 'REVENUE_OFFICER');
  assert.ok(officer, 'Revenue Officer demo user must exist');

  assert.strictEqual(hasPermission(officer, 'RECORD_APPROVE'), true);
  assert.strictEqual(hasPermission(officer, 'DOCUMENT_UPLOAD'), true);
  assert.strictEqual(hasPermission(officer, 'VERIFICATION_VIEW'), true);

  assert.strictEqual(hasPermission(officer, 'USER_VIEW'), false);
  assert.strictEqual(hasPermission(officer, 'ROLE_VIEW'), false);
  assert.strictEqual(hasPermission(officer, 'AUDIT_VIEW'), false);
  assert.strictEqual(hasPermission(officer, 'SYSTEM_SETTINGS'), false);

  assert.strictEqual(canAccessRoute(officer, '/records'), true);
  assert.strictEqual(canAccessRoute(officer, '/verification'), true);
  assert.strictEqual(canAccessRoute(officer, '/documents/upload'), true);
  assert.strictEqual(canAccessRoute(officer, '/users'), false);
  assert.strictEqual(canAccessRoute(officer, '/roles'), false);
  assert.strictEqual(canAccessRoute(officer, '/audit'), false);
  assert.strictEqual(canAccessRoute(officer, '/settings'), false);
});

test('RBAC: Auditor is strictly read-only and restricted from mutation actions', () => {
  const auditor = DEMO_USERS.find(u => u.role === 'AUDITOR');
  assert.ok(auditor, 'Auditor demo user must exist');

  assert.strictEqual(hasPermission(auditor, 'AUDIT_VIEW'), true);
  assert.strictEqual(hasPermission(auditor, 'ANALYTICS_VIEW'), true);
  assert.strictEqual(hasPermission(auditor, 'RECORD_VIEW'), true);

  assert.strictEqual(hasPermission(auditor, 'RECORD_APPROVE'), false);
  assert.strictEqual(hasPermission(auditor, 'RECORD_EDIT'), false);
  assert.strictEqual(hasPermission(auditor, 'DOCUMENT_UPLOAD'), false);
  assert.strictEqual(hasPermission(auditor, 'SYSTEM_SETTINGS'), false);
  assert.strictEqual(hasPermission(auditor, 'USER_VIEW'), false);

  assert.strictEqual(canAccessRoute(auditor, '/audit'), true);
  assert.strictEqual(canAccessRoute(auditor, '/analytics'), true);
  assert.strictEqual(canAccessRoute(auditor, '/documents/upload'), false);
  assert.strictEqual(canAccessRoute(auditor, '/users'), false);
  assert.strictEqual(canAccessRoute(auditor, '/settings'), false);
});

test('RBAC: Viewer is restricted to public approved records and GIS maps', () => {
  const viewer = DEMO_USERS.find(u => u.role === 'VIEWER');
  assert.ok(viewer, 'Viewer demo user must exist');

  assert.strictEqual(hasPermission(viewer, 'RECORD_VIEW'), true);
  assert.strictEqual(hasPermission(viewer, 'GIS_VIEW'), true);

  // All administrative & mutation permissions MUST be denied
  assert.strictEqual(hasPermission(viewer, 'DOCUMENT_UPLOAD'), false);
  assert.strictEqual(hasPermission(viewer, 'RECORD_EDIT'), false);
  assert.strictEqual(hasPermission(viewer, 'RECORD_APPROVE'), false);
  assert.strictEqual(hasPermission(viewer, 'RECORD_REJECT'), false);
  assert.strictEqual(hasPermission(viewer, 'VERIFICATION_VIEW'), false);
  assert.strictEqual(hasPermission(viewer, 'USER_VIEW'), false);
  assert.strictEqual(hasPermission(viewer, 'ROLE_VIEW'), false);
  assert.strictEqual(hasPermission(viewer, 'AUDIT_VIEW'), false);
  assert.strictEqual(hasPermission(viewer, 'SYSTEM_SETTINGS'), false);
  assert.strictEqual(hasPermission(viewer, 'ANALYTICS_VIEW'), false);

  // Route access checks
  assert.strictEqual(canAccessRoute(viewer, '/records'), true);
  assert.strictEqual(canAccessRoute(viewer, '/gis'), true);
  assert.strictEqual(canAccessRoute(viewer, '/dashboard'), true);

  assert.strictEqual(canAccessRoute(viewer, '/documents/upload'), false);
  assert.strictEqual(canAccessRoute(viewer, '/verification'), false);
  assert.strictEqual(canAccessRoute(viewer, '/analytics'), false);
  assert.strictEqual(canAccessRoute(viewer, '/users'), false);
  assert.strictEqual(canAccessRoute(viewer, '/roles'), false);
  assert.strictEqual(canAccessRoute(viewer, '/audit'), false);
  assert.strictEqual(canAccessRoute(viewer, '/settings'), false);
});

test('RBAC: Store always populates user permissions accurately on retrieval', () => {
  for (const demoUser of DEMO_USERS) {
    const userFromStore = dbStore.getUserById(demoUser.id);
    assert.ok(userFromStore, `User ${demoUser.id} must be returned by store`);
    assert.ok(
      userFromStore.permissions && userFromStore.permissions.length > 0,
      `User ${userFromStore.name} (${userFromStore.role}) must have populated permissions array`
    );
  }
});
