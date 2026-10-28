import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    const body = await request.json().catch(() => ({}));
    const { action = 'APPROVE', reason, officerName } = body;

    const requiredPerm = action === 'REJECT' ? 'RECORD_REJECT' : 'RECORD_APPROVE';
    if (!currentUser || !hasPermission(currentUser, requiredPerm)) {
      return NextResponse.json(
        { success: false, message: `Forbidden: ${requiredPerm} privilege required for record sign-off/rejection.` },
        { status: 403 }
      );
    }

    const currentOfficer = officerName || currentUser.name;

    if (action === 'REJECT') {
      const rejected = dbStore.rejectRecord(id, reason || 'Rejected by verification officer');
      return NextResponse.json({ success: true, message: 'Record marked as REJECTED', data: rejected });
    }

    const verified = dbStore.verifyRecord(id, currentOfficer);
    if (!verified) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Record #${id} officially verified and marked as VERIFIED in Land Registry`,
      data: verified
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
