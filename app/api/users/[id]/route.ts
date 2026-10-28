import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, sanitizeUser, handleRouteError, HttpError } from '@/lib/guard';
import { hashPassword } from '@/lib/password';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(req, 'USER_VIEW');
    const { id } = await params;

    const user = dbService.getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Non-admins can only view their own detailed user profile
    if (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN' && caller.id !== id) {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden to inspect other personnel records.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(req, 'USER_EDIT');
    const { id } = await params;

    const existingUser = dbService.getUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Whitelist updatable fields
    const { name, phone, designation, department, state, district, status, role } = body;
    const updates: any = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (designation !== undefined) updates.designation = String(designation).trim();
    if (department !== undefined) updates.department = String(department).trim();
    if (state !== undefined) updates.state = String(state).trim();
    if (district !== undefined) updates.district = String(district).trim();

    // Role modification checks
    if (role !== undefined && role !== existingUser.role) {
      // ONLY Super Admin may change user roles
      if (caller.role !== 'SUPER_ADMIN') {
        throw new HttpError(403, 'Forbidden: Only a Super Admin may modify or elevate user roles.', 'ROLE_CHANGE_FORBIDDEN');
      }

      // Block self-demote
      if (caller.id === id && role !== 'SUPER_ADMIN') {
        throw new HttpError(403, 'Self-demotion is forbidden. A Super Admin cannot demote their own account.', 'SELF_DEMOTE_FORBIDDEN');
      }

      updates.role = role;
    }

    // Status modification checks
    if (status !== undefined) {
      if (status !== 'ACTIVE' && status !== 'INACTIVE') {
        return NextResponse.json({ success: false, message: 'Status must be ACTIVE or INACTIVE' }, { status: 400 });
      }

      // Block self-deactivate
      if (caller.id === id && status === 'INACTIVE') {
        throw new HttpError(403, 'Self-deactivation is forbidden. You cannot deactivate your own account.', 'SELF_DEACTIVATE_FORBIDDEN');
      }

      updates.status = status;
    }

    const updatedUser = dbService.updateUser(id, updates);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Audit event
    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'USER_EDIT',
      entityType: 'User',
      entityId: id,
      reason: `User ${id} updated by ${caller.name}: ${JSON.stringify(updates)}`,
    });

    return NextResponse.json({
      success: true,
      data: sanitizeUser(updatedUser),
      message: 'User profile updated successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'toggle_status') {
      const caller = await requireUser(req, 'USER_DISABLE');
      const existing = dbService.getUserById(id);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const nextStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      if (caller.id === id && nextStatus === 'INACTIVE') {
        throw new HttpError(403, 'Cannot deactivate your own account.', 'SELF_DEACTIVATE_FORBIDDEN');
      }

      const updated = dbService.updateUser(id, { status: nextStatus });
      dbService.appendAuditEvent({
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        action: 'USER_STATUS_CHANGE',
        entityType: 'User',
        entityId: id,
        reason: `User ${existing.name} status changed to ${nextStatus} by ${caller.name}`,
      });

      return NextResponse.json({
        success: true,
        data: sanitizeUser(updated!),
        message: `User status changed to ${nextStatus}`,
      });
    }

    if (body.action === 'reset_password') {
      const caller = await requireUser(req, 'USER_EDIT');
      const newPass = body.newPassword || 'Reset@12345';
      const newHash = hashPassword(newPass);

      const updated = dbService.updateUser(id, {}, newHash);
      if (!updated) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      dbService.appendAuditEvent({
        actorId: caller.id,
        actorName: caller.name,
        actorRole: caller.role,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: id,
        reason: `Password reset for user ${updated.name} by ${caller.name}`,
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await requireUser(req, 'USER_DELETE');
    const { id } = await params;

    // Block self-delete
    if (caller.id === id) {
      throw new HttpError(403, 'Cannot delete your own account.', 'SELF_DELETE_FORBIDDEN');
    }

    const existing = dbService.getUserById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    const deleted = dbService.deleteUser(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, errorCode: 'NOT_FOUND', message: 'User could not be deleted' },
        { status: 404 }
      );
    }

    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'USER_DELETE',
      entityType: 'User',
      entityId: id,
      reason: `User ${existing.name} (${existing.email}) deleted by ${caller.name}`,
    });

    return NextResponse.json({
      success: true,
      message: 'User removed from registry.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
