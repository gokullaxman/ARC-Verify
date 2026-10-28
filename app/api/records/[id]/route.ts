import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = dbStore.getLandRecordById(id);
  if (!record) {
    return NextResponse.json({ success: false, error: 'Land record not found' }, { status: 404 });
  }

  const document = dbStore.getDocumentById(record.documentId);
  const parcel = record.gisParcelId ? dbStore.getParcelById(record.gisParcelId) : null;

  // Ensure tokens are populated for character-level inspection
  if ((!record.tokens || record.tokens.length === 0) && document) {
    const { generateIndicTokensForDoc } = await import('@/services/document-processing');
    record.tokens = generateIndicTokensForDoc(document);
  }

  return NextResponse.json({
    success: true,
    data: {
      record,
      document,
      parcel
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    if (!currentUser || (!hasPermission(currentUser, 'RECORD_EDIT') && !hasPermission(currentUser, 'VERIFICATION_EDIT'))) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: RECORD_EDIT or VERIFICATION_EDIT privilege required to correct field data.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fieldName, newValue, officerComment } = body;

    if (!fieldName || newValue === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing fieldName or newValue in request body' },
        { status: 400 }
      );
    }

    const updatedRecord = dbStore.correctField(id, fieldName, newValue, officerComment);
    if (!updatedRecord) {
      return NextResponse.json({ success: false, error: 'Record or field not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Field "${fieldName}" updated successfully with audit trail and AI feedback entry`,
      data: updatedRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
