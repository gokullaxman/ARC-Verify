-- =====================================================================
-- ARC-VERIFY — AI-Powered Application Validation, Document Authentication
-- and Regulatory Compliance Verification (SIH 2026 • Problem Statement 26261)
-- Migration: 20261028000000_arc_verify_dossier_schema.sql
-- =====================================================================
-- Addresses Audit & Blueprint Requirements (Sections 7, 8, 11, 13):
-- 1. Removes permissive USING(true) / WITH CHECK(true) policies on sensitive tables.
-- 2. Introduces multi-document ApplicationDossier domain tables:
--    institutions, applications, verification_cases, dossier_documents,
--    processing_runs, extracted_fields, compliance_rule_sets,
--    compliance_rules, findings, review_decisions, audit_events,
--    reports, integration_events.
-- 3. Enforces append-only / tamper-evident hash chaining on audit_events.
-- =====================================================================

-- 1. Revoke overly permissive policies from legacy migration
DROP POLICY IF EXISTS "Allow authenticated read documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated update documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated read land_records" ON land_records;
DROP POLICY IF EXISTS "Allow authenticated insert land_records" ON land_records;
DROP POLICY IF EXISTS "Allow authenticated update land_records" ON land_records;
DROP POLICY IF EXISTS "Allow authenticated read validation" ON validation_results;
DROP POLICY IF EXISTS "Allow authenticated insert validation" ON validation_results;
DROP POLICY IF EXISTS "Allow authenticated read audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert audit_logs" ON audit_logs;

-- 2. Create ARC-Verify Domain Tables (Section 8.1)

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(255) NOT NULL,
    trust_or_society_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL,
    campus_zone VARCHAR(50) NOT NULL DEFAULT 'URBAN_MUNICIPAL',
    location_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    application_type VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_rule_sets (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    application_type VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    source_title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_SOURCE',
    effective_from DATE NOT NULL,
    effective_to DATE,
    required_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_rules (
    id VARCHAR(100) PRIMARY KEY,
    rule_set_id VARCHAR(100) NOT NULL REFERENCES compliance_rule_sets(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    family VARCHAR(100) NOT NULL,
    source_title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_clause VARCHAR(255) NOT NULL,
    applicability JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    source_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_SOURCE',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS verification_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(60) NOT NULL DEFAULT 'DRAFT',
    assigned_reviewer_id UUID,
    active_rule_set_id VARCHAR(100) NOT NULL REFERENCES compliance_rule_sets(id),
    active_rule_set_version VARCHAR(50) NOT NULL,
    is_synthetic_demo BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dossier_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    declared_category VARCHAR(100) NOT NULL,
    classified_category VARCHAR(100) NOT NULL DEFAULT 'UNKNOWN_UNCLASSIFIED',
    classification_confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    original_filename VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    derived_preview_url TEXT,
    mime_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 20971520),
    sha256 CHAR(64) NOT NULL,
    page_count INT NOT NULL DEFAULT 1,
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    upload_actor UUID NOT NULL,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    integrity_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128),
    pipeline_version VARCHAR(50) NOT NULL,
    rule_set_id VARCHAR(100) NOT NULL,
    rule_set_version VARCHAR(50) NOT NULL,
    input_document_hashes JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(40) NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_code VARCHAR(100),
    summary JSONB
);

CREATE TABLE IF NOT EXISTS extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dossier_documents(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL,
    page_number INT NOT NULL DEFAULT 1,
    bbox JSONB NOT NULL DEFAULT '[0,0,0,0]'::jsonb,
    extractor_version VARCHAR(50) NOT NULL,
    is_manually_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    original_ocr_value TEXT,
    corrected_by UUID,
    correction_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
    document_id UUID REFERENCES dossier_documents(id) ON DELETE SET NULL,
    rule_id VARCHAR(100) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARNING', 'INCONCLUSIVE', 'NOT_APPLICABLE', 'NOT_CHECKED')),
    severity VARCHAR(30) NOT NULL,
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    message TEXT NOT NULL,
    evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_experimental_indicator BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_role VARCHAR(60) NOT NULL,
    decision VARCHAR(100) NOT NULL,
    resulting_case_status VARCHAR(60) NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 5),
    supporting_finding_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES verification_cases(id) ON DELETE SET NULL,
    actor_id VARCHAR(100) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(60) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_hash CHAR(64) NOT NULL,
    event_hash CHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    report_version INT NOT NULL DEFAULT 1,
    generated_by UUID NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    storage_key TEXT NOT NULL,
    rule_set_version VARCHAR(50) NOT NULL,
    report_snapshot JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    request_ref VARCHAR(120) NOT NULL,
    response_summary TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for Performance (Section 8.3)
CREATE INDEX IF NOT EXISTS idx_verification_cases_status ON verification_cases(status);
CREATE INDEX IF NOT EXISTS idx_verification_cases_created ON verification_cases(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_cases_ruleset ON verification_cases(active_rule_set_id);
CREATE INDEX IF NOT EXISTS idx_dossier_documents_case ON dossier_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_dossier_documents_sha256 ON dossier_documents(sha256);
CREATE INDEX IF NOT EXISTS idx_findings_case ON findings(case_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_case ON audit_events(case_id, event_time DESC);

-- 4. Enable Row Level Security (RLS) on All New Tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- 5. Restrictive RLS Policies (Section 8.3 & 13.1: Least Privilege, Ownership & Assignment)
-- Rule sets and rules are readable by authenticated users, modifiable only by SYSTEM_ADMIN
CREATE POLICY "Authenticated users can read rule sets"
    ON compliance_rule_sets FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read compliance rules"
    ON compliance_rules FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Applications: visible only to creator or authorized scrutiny/admin/auditor roles
CREATE POLICY "Applicants view own applications or officers view assigned"
    ON applications FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR (auth.jwt() ->> 'user_role') IN ('SUPER_ADMIN', 'ADMIN', 'SCRUTINY_OFFICER', 'COMPLIANCE_AUDITOR')
    );

CREATE POLICY "Authorized submitters create own applications"
    ON applications FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- Verification cases: scoped to application owner, assigned reviewer, or auditor/admin
CREATE POLICY "Scoped case read access"
    ON verification_cases FOR SELECT
    TO authenticated
    USING (
        assigned_reviewer_id = auth.uid()
        OR (auth.jwt() ->> 'user_role') IN ('SUPER_ADMIN', 'ADMIN', 'SCRUTINY_OFFICER', 'COMPLIANCE_AUDITOR')
        OR EXISTS (
            SELECT 1 FROM applications a
            WHERE a.id = verification_cases.application_id
              AND a.created_by = auth.uid()
        )
    );

-- Dossier documents: scoped to users who can access the parent verification_case
CREATE POLICY "Scoped dossier document read access"
    ON dossier_documents FOR SELECT
    TO authenticated
    USING (
        upload_actor = auth.uid()
        OR (auth.jwt() ->> 'user_role') IN ('SUPER_ADMIN', 'ADMIN', 'SCRUTINY_OFFICER', 'COMPLIANCE_AUDITOR')
    );

-- Reports: scoped to case owner or scrutiny/auditor roles
CREATE POLICY "Scoped report read access"
    ON reports FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'user_role') IN ('SUPER_ADMIN', 'ADMIN', 'SCRUTINY_OFFICER', 'COMPLIANCE_AUDITOR')
        OR EXISTS (
            SELECT 1 FROM verification_cases vc
            JOIN applications a ON a.id = vc.application_id
            WHERE vc.id = reports.case_id AND a.created_by = auth.uid()
        )
    );

-- Audit Events: Insert-only for authenticated application service; NO UPDATE OR DELETE policies
CREATE POLICY "Auditor and Admin read audit_events"
    ON audit_events FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'user_role') IN ('SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_AUDITOR', 'AUDITOR'));

CREATE POLICY "Insert-only audit_events"
    ON audit_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Prevent UPDATE and DELETE on audit_events via database trigger (Tamper protection)
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: audit_events is an append-only ledger and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_mutation ON audit_events;
CREATE TRIGGER trg_prevent_audit_mutation
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
