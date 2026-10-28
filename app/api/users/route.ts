import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    if (!currentUser || !hasPermission(currentUser, 'USER_VIEW')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: USER_VIEW privilege required to inspect personnel directory.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    let users = dbStore.getUsers();

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
        (u.employeeId && u.employeeId.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    if (!currentUser || !hasPermission(currentUser, 'USER_CREATE')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: USER_CREATE privilege required to onboard personnel.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.email || !body.role) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and role are mandatory fields.' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existing = dbStore.getUserByEmail(body.email);
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'A user with this email address already exists.' },
        { status: 409 }
      );
    }

    const newUser = dbStore.addUser(body);

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User registered successfully.'
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
