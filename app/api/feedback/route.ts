import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { supabase, persistFeedbackToSupabase } from '@/lib/supabase';
import { getSessionUserFromCookies } from '@/lib/session';

export async function GET() {
  const caller = await getSessionUserFromCookies();
  if (!caller) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('feedback_corrections')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          recordId: row.land_record_id || 'rec-001',
          documentId: row.document_id || 'doc-001',
          fieldName: row.field_name,
          originalValue: row.original_prediction,
          correctedValue: row.corrected_value,
          confidence: Number(row.confidence || 0.95),
          documentType: 'Land Ownership Certificate',
          language: 'Tamil',
          officerId: row.corrected_by || 'usr-officer',
          timestamp: row.created_at,
        }));
        return NextResponse.json({
          success: true,
          count: mapped.length,
          source: 'supabase',
          description: 'Active learning feedback dataset for OCR & field extraction human corrections',
          data: mapped,
        });
      }
    }
  } catch {
    // Fallback to local SQLite store
  }

  const feedback = dbStore.getAIFeedback();
  return NextResponse.json({
    success: true,
    count: feedback.length,
    source: 'sqlite',
    description: 'Active learning feedback dataset for OCR & field extraction human corrections',
    data: feedback,
  });
}

export async function POST(request: Request) {
  try {
    const caller = await getSessionUserFromCookies();
    if (!caller) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { recordId, fieldName, newValue, comment } = body;

    if (!recordId || !fieldName || newValue === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: recordId, fieldName, newValue' },
        { status: 400 }
      );
    }

    const updatedRecord = dbStore.correctField(recordId, fieldName, newValue, comment);
    if (!updatedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record or field not found' },
        { status: 404 }
      );
    }

    const latestFeedback = dbStore.getAIFeedback()[0];
    if (latestFeedback) {
      await persistFeedbackToSupabase({
        land_record_id: latestFeedback.recordId,
        document_id: latestFeedback.documentId,
        field_name: latestFeedback.fieldName,
        original_prediction: String(latestFeedback.originalValue),
        corrected_value: String(latestFeedback.correctedValue),
        correction_reason: comment || 'Manual correction',
        confidence: latestFeedback.confidence,
        corrected_by: caller.id,
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: 'Field updated and logged to AI active learning feedback repository',
      data: updatedRecord,
      feedbackEntries: dbStore.getAIFeedback().slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
