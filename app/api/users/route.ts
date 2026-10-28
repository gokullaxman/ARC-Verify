import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db';
import { requireUser, sanitizeUser, handleRouteError } from '@/lib/guard';
import { hashPassword } from '@/lib/password';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const caller = await requireUser(req, 'USER_VIEW');

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    let users = dbService.listUsers();

    if (role && role !== 'ALL') {
      users = users.filter(u => u.role === role);
    }

    if (status && status !== 'ALL') {
      users = users.filter(u => u.status === status);
    }

    if (search) {
      users = users.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.district.toLowerCase().includes(search) ||
        (u.designation && u.designation.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      data: users.map(u => sanitizeUser(u)),
      count: users.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireUser(req, 'USER_CREATE');

    const body = await req.json();
    const { name, email, role, designation, department, state, district, phone, initialPassword } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, errorCode: 'BAD_REQUEST', message: 'Name, email, and role are mandatory fields.' },
        { status: 400 }
      );
    }

    // Role elevation guard: only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && caller.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, errorCode: 'FORBIDDEN', message: 'Only a Super Admin can provision another Super Admin.' },
        { status: 403 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = dbService.getUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { success: false, errorCode: 'CONFLICT', message: 'A user with this email address already exists.' },
        { status: 409 }
      );
    }

    const newId = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = hashPassword(initialPassword || 'Welcome@123');

    const created = dbService.createUser(
      {
        id: newId,
        name: String(name).trim(),
        email: cleanEmail,
        role,
        designation: designation || 'Officer',
        department: department || 'Scrutiny Committee',
        state: state || 'Delhi',
        district: district || 'New Delhi',
        phone: phone || '',
        status: 'ACTIVE',
      },
      passwordHash
    );

    // Audit event written server-side
    dbService.appendAuditEvent({
      actorId: caller.id,
      actorName: caller.name,
      actorRole: caller.role,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: created.id,
      reason: `Officer ${caller.name} created user account for ${created.name} (${created.role}).`,
    });

    return NextResponse.json(
      {
        success: true,
        data: sanitizeUser(created),
        message: 'User registered successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
