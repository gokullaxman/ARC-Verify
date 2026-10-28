import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Security Fix (SIH 26261 Blueprint Section 2.2 & 13.1):
 * Removed hard-coded fallback Supabase URL and anon JWT key.
 * If environment variables are not configured, getSupabaseClient() returns null
 * and persistence safely routes through the local persistent repository.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
  : null;

export function getServerSupabaseClient(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && serviceKey) {
    return createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });
  }
  return supabase;
}

export async function persistDocumentToSupabase(doc: {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  checksum_sha256: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  document_type?: string;
  language?: string;
  status?: string;
  ocr_confidence?: number;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('documents').upsert([doc]);
    if (error) {
      console.warn('[Supabase] persistDocument warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistDocument exception:', err);
    return null;
  }
}

export async function persistAuditLogToSupabase(log: {
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before_state?: any;
  after_state?: any;
  diff?: any;
  remarks?: string;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('audit_logs').insert([log]);
    if (error) {
      console.warn('[Supabase] persistAuditLog warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistAuditLog exception:', err);
    return null;
  }
}

export async function persistFeedbackToSupabase(feedback: {
  land_record_id: string;
  document_id?: string;
  field_name: string;
  original_prediction: string;
  corrected_value: string;
  model_name?: string;
  confidence?: number;
  correction_reason: string;
  corrected_by?: string;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('feedback_corrections').insert([feedback]);
    if (error) {
      console.warn('[Supabase] persistFeedback warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistFeedback exception:', err);
    return null;
  }
}

export async function persistLandRecordToSupabase(record: {
  id: string;
  document_id?: string;
  survey_number: string;
  subdivision_number?: string;
  patta_number?: string;
  khasra_number?: string;
  khata_number?: string;
  owner_name: string;
  father_name?: string;
  land_area: number;
  area_unit: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  ulpin?: string;
  status?: string;
  overall_confidence?: number;
}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('land_records').upsert([record]);
    if (error) {
      console.warn('[Supabase] persistLandRecord warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistLandRecord exception:', err);
    return null;
  }
}
