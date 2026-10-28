import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { ValidationEngine } from '@/services/validation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = dbStore.getLandRecordById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const validationResult = ValidationEngine.validateRecord(record);
    record.validationResult = validationResult;

    // Check if record now qualifies for VERIFIED or requires verification
    if (validationResult.overallStatus === 'PASSED' && record.overallConfidence >= 0.90) {
      // Auto-re-evaluate status
      if (record.status === 'REQUIRES_VERIFICATION') {
        record.status = 'PENDING_VALIDATION';
      }
    }

    dbStore.updateLandRecord(id, record);

    dbStore.addAuditLog({
      userId: dbStore.getCurrentUser().id,
      userName: dbStore.getCurrentUser().name,
      userRole: dbStore.getCurrentUser().role,
      action: 'VALIDATION_EXECUTED',
      recordId: record.id,
      documentId: record.documentId,
      details: `Re-ran validation rules for record #${record.id}. Result: ${validationResult.overallStatus} (${validationResult.rulesPassed}/${validationResult.rulesTotal} passed).`
    });

    return NextResponse.json({
      success: true,
      message: 'Validation rules executed successfully',
      data: {
        record,
        validationResult
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
