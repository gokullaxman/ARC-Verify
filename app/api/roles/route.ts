import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, handleRouteError, HttpError } from '@/lib/guard';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, 'ROLE_VIEW');
    const roles = dbService.listRoles();
    return NextResponse.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireUser(req, 'ROLE_CREATE');
    const body = await req.json();
    const { name, code, description, permissions } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, errorCode: 'BAD_REQUEST', message: 'Role name and role code are required.' },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = dbService.getRoleByCode(cleanCode);
    if (existing) {
      return NextResponse.json(
        { success: false, errorCode: 'CONFLICT', message: `A role with code '${cleanCode}' already exists.` },
        { status: 409 }
      );
    }

    const newRole = dbService.createRole({
      id: `role-${cleanCode.toLowerCase().replace(/_/g, '-')}`,
      code: cleanCode as any,
      name: String(name).trim(),
      description: description || '',
      isSystem: false,
      permissions: Array.isArray(permissions) ? permissions : [],
      createdAt: new Date().toISOString(),
    });

    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'ROLE_CREATE',
      entityType: 'Role',
      entityId: newRole.code,
      reason: `Role ${newRole.name} (${newRole.code}) created by ${caller.name}`,
    });

    return NextResponse.json(
      {
        success: true,
        data: newRole,
        message: 'Role created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = await requireUser(req, 'ROLE_EDIT');
    const body = await req.json();
    const { code, permissions } = body;

    if (!code || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, errorCode: 'BAD_REQUEST', message: 'Role code and permissions array are required.' },
        { status: 400 }
      );
    }

    const existing = dbService.getRoleByCode(code);
    if (!existing) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'Role not found' },
        { status: 404 }
      );
    }

    const updated = dbService.updateRole(code, permissions);

    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'ROLE_EDIT',
      entityType: 'Role',
      entityId: code,
      reason: `Permissions for role ${code} updated by ${caller.name}`,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Role permissions updated successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireUser(req, 'ROLE_DELETE');
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, errorCode: 'BAD_REQUEST', message: 'Role code is required for deletion.' },
        { status: 400 }
      );
    }

    const result = dbService.deleteRole(code);
    if (!result.success) {
      return NextResponse.json(
        { success: false, errorCode: 'CONFLICT', message: result.error || 'Failed to delete role' },
        { status: 409 }
      );
    }

    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'ROLE_DELETE',
      entityType: 'Role',
      entityId: code,
      reason: `Custom role ${code} deleted by ${caller.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
