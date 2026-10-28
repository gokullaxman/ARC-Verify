import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const PYTHON_SQLITE_DRIVER = `
import sys, json, sqlite3

db_path = sys.argv[1]
op = sys.argv[2]
payload = json.loads(sys.stdin.read() or "{}")

conn = sqlite3.connect(db_path, timeout=15.0)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.executescript('''
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  institution_id TEXT,
  state TEXT,
  district TEXT,
  taluk TEXT,
  village TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  application_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  is_synthetic_demo INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dossier_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  declared_category TEXT NOT NULL,
  classified_category TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  upload_actor_id TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extracted_fields (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  confidence REAL NOT NULL,
  is_manually_corrected INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  mandatory INTEGER NOT NULL DEFAULT 1,
  message TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processing_runs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  resulting_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scrutiny_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  sequence_number INTEGER NOT NULL,
  case_id TEXT,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  timestamp_utc TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_documents (
  id TEXT PRIMARY KEY,
  sha256 TEXT,
  uploaded_by TEXT,
  district TEXT,
  taluk TEXT,
  uploaded_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_records (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  status TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legacy_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  timestamp TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  record_id TEXT,
  document_id TEXT,
  field_name TEXT,
  timestamp TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);
''')

if op == "load_dossier_state":
    out = {}
    for tbl in ["cases", "dossier_documents", "extracted_fields", "findings", "processing_runs", "review_decisions", "scrutiny_reports", "integration_events"]:
        rows = cur.execute(f"SELECT payload_json FROM {tbl}").fetchall()
        out[tbl] = [json.loads(r["payload_json"]) for r in rows]
    audit_rows = cur.execute("SELECT payload_json FROM audit_events ORDER BY sequence_number ASC").fetchall()
    out["audit_events"] = [json.loads(r["payload_json"]) for r in audit_rows]
    print(json.dumps(out))

elif op == "save_dossier_state":
    cur.execute("DELETE FROM cases")
    for c in payload.get("cases", []):
        cur.execute(
            "INSERT INTO cases (id, application_id, institution_id, application_type, status, created_by, is_synthetic_demo, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (c["id"], c["applicationId"], c["institution"]["id"], c["application"]["applicationType"], c["status"], c["application"]["createdBy"], 1 if c.get("isSyntheticDemo") else 0, c["updatedAt"], json.dumps(c))
        )

    cur.execute("DELETE FROM dossier_documents")
    for d in payload.get("documents", []):
        cur.execute(
            "INSERT INTO dossier_documents (id, case_id, declared_category, classified_category, original_filename, storage_key, mime_type, byte_size, sha256, upload_actor_id, uploaded_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (d["id"], d["caseId"], d["declaredCategory"], d["classifiedCategory"], d["originalFilename"], d["originalStorageKey"], d["mimeType"], int(d["byteSize"]), d["sha256"], d["uploadActorId"], d["uploadedAt"], json.dumps(d))
        )

    cur.execute("DELETE FROM extracted_fields")
    for f in payload.get("extractedFields", []):
        cur.execute(
            "INSERT INTO extracted_fields (id, case_id, document_id, field_name, raw_value, normalized_value, confidence, is_manually_corrected, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (f["id"], f["caseId"], f["documentId"], f["fieldName"], str(f["rawValue"]), str(f["normalizedValue"]), float(f["confidence"]), 1 if f.get("isManuallyCorrected") else 0, json.dumps(f))
        )

    cur.execute("DELETE FROM findings")
    for f in payload.get("findings", []):
        cur.execute(
            "INSERT INTO findings (id, case_id, run_id, rule_id, rule_code, status, severity, mandatory, message, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (f["id"], f["caseId"], f["runId"], f["ruleId"], f["ruleCode"], f["status"], f["severity"], 1 if f.get("mandatory") else 0, f["message"], json.dumps(f))
        )

    cur.execute("DELETE FROM processing_runs")
    for r in payload.get("runs", []):
        cur.execute(
            "INSERT INTO processing_runs (id, case_id, idempotency_key, status, started_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
            (r["id"], r["caseId"], r.get("idempotencyKey"), r["status"], r["startedAt"], json.dumps(r))
        )

    cur.execute("DELETE FROM review_decisions")
    for d in payload.get("decisions", []):
        cur.execute(
            "INSERT INTO review_decisions (id, case_id, reviewer_id, decision, resulting_status, reason, created_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (d["id"], d["caseId"], d["reviewerId"], d["decision"], d["resultingCaseStatus"], d["reason"], d["createdAt"], json.dumps(d))
        )

    cur.execute("DELETE FROM scrutiny_reports")
    for r in payload.get("reports", []):
        cur.execute(
            "INSERT INTO scrutiny_reports (id, case_id, generated_at, payload_json) VALUES (?, ?, ?, ?)",
            (r["id"], r["caseId"], r["generatedAt"], json.dumps(r))
        )

    cur.execute("DELETE FROM integration_events")
    for e in payload.get("integrationEvents", []):
        cur.execute(
            "INSERT INTO integration_events (id, case_id, provider, status, checked_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
            (e["id"], e["caseId"], e["provider"], e["status"], e["checkedAt"], json.dumps(e))
        )

    cur.execute("DELETE FROM audit_events")
    for idx, a in enumerate(payload.get("auditEvents", [])):
        seq = int(a.get("sequenceNumber") if a.get("sequenceNumber") is not None else (idx + 1))
        t_utc = a.get("timestampUtc") or a.get("timestamp") or ""
        cur.execute(
            "INSERT INTO audit_events (id, sequence_number, case_id, actor_id, actor_role, action, entity_type, entity_id, previous_hash, event_hash, timestamp_utc, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (a["id"], seq, a.get("caseId"), a.get("actorId", ""), a.get("actorRole", ""), a.get("action", ""), a.get("entityType", ""), a.get("entityId", ""), a.get("previousHash", ""), a.get("eventHash", ""), t_utc, json.dumps(a))
        )

    conn.commit()
    print(json.dumps({"ok": True}))

elif op == "load_store_state":
    out = {}
    for tbl in ["users", "legacy_documents", "legacy_records", "legacy_audit_logs", "ai_feedback"]:
        rows = cur.execute(f"SELECT payload_json FROM {tbl}").fetchall()
        out[tbl] = [json.loads(r["payload_json"]) for r in rows]
    settings_row = cur.execute("SELECT payload_json FROM system_settings WHERE key = 'default'").fetchone()
    out["system_settings"] = json.loads(settings_row["payload_json"]) if settings_row else None
    print(json.dumps(out))

elif op == "save_store_state":
    if "users" in payload:
        cur.execute("DELETE FROM users")
        for u in payload["users"]:
            cur.execute(
                "INSERT INTO users (id, email, name, role, status, password_hash, institution_id, state, district, taluk, village, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (u["id"], u["email"].lower(), u["name"], u["role"], u["status"], u.get("passwordHash", ""), u.get("institutionId"), u.get("state"), u.get("district"), u.get("taluk"), u.get("village"), json.dumps(u))
            )
    if "documents" in payload:
        cur.execute("DELETE FROM legacy_documents")
        for d in payload["documents"]:
            cur.execute(
                "INSERT INTO legacy_documents (id, sha256, uploaded_by, district, taluk, uploaded_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (d["id"], d.get("sha256", ""), d.get("uploadedBy", ""), d.get("district", ""), d.get("taluk", ""), d.get("uploadedAt", ""), json.dumps(d))
            )
    if "landRecords" in payload:
        cur.execute("DELETE FROM legacy_records")
        for r in payload["landRecords"]:
            cur.execute(
                "INSERT INTO legacy_records (id, document_id, status, payload_json) VALUES (?, ?, ?, ?)",
                (r["id"], r.get("documentId", ""), r.get("status", ""), json.dumps(r))
            )
    if "auditLogs" in payload:
        cur.execute("DELETE FROM legacy_audit_logs")
        for a in payload["auditLogs"]:
            cur.execute(
                "INSERT INTO legacy_audit_logs (id, user_id, action, timestamp, payload_json) VALUES (?, ?, ?, ?, ?)",
                (a["id"], a.get("userId", ""), a.get("action", ""), a.get("timestamp", ""), json.dumps(a))
            )
    if "aiFeedback" in payload:
        cur.execute("DELETE FROM ai_feedback")
        for fb in payload["aiFeedback"]:
            cur.execute(
                "INSERT INTO ai_feedback (id, record_id, document_id, field_name, timestamp, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
                (fb["id"], fb.get("recordId", ""), fb.get("documentId", ""), fb.get("fieldName", ""), fb.get("timestamp", ""), json.dumps(fb))
            )
    if "systemSettings" in payload and payload["systemSettings"]:
        cur.execute(
            "INSERT OR REPLACE INTO system_settings (key, payload_json) VALUES ('default', ?)",
            (json.dumps(payload["systemSettings"]),)
        )
    conn.commit()
    print(json.dumps({"ok": True}))

conn.close()
`;

export class SqliteDatabase {
  static resolveDbPath(customPath?: string): string {
    if (customPath) {
      const dir = path.dirname(customPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return customPath;
    }
    if (process.env.ARC_VERIFY_SQLITE_PATH) {
      const envPath = process.env.ARC_VERIFY_SQLITE_PATH;
      const dir = path.dirname(envPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return envPath;
    }
    try {
      const dataDir = path.join(process.cwd(), '.arc-verify-data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return path.join(dataDir, 'arc_verify.sqlite');
    } catch {
      return path.join(os.tmpdir(), 'arc_verify.sqlite');
    }
  }

  static getPythonCommand(): string {
    if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  static executeOp(dbPath: string, op: string, payload: Record<string, any> = {}): any {
    const resolved = this.resolveDbPath(dbPath);
    const pythonCmd = this.getPythonCommand();
    const stdout = execFileSync(pythonCmd, ['-c', PYTHON_SQLITE_DRIVER, resolved, op], {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(stdout.trim() || '{}');
  }
}
