# ARC-Verify — AI-Powered Application Validation, Document Authentication & Regulatory Compliance Verification

**Smart India Hackathon 2026 • Problem Statement 26261**  
**Initial Domain:** AICTE Institutional Approval Scrutiny (New Technical Institution & Extension of Approval) + Reusable Generic Regulatory Profiles  
**Core Principle:** *AI extracts and highlights evidence; deterministic rules evaluate documented requirements; authorized human reviewers make consequential decisions.*

---

## 1. Overview & Architecture

**ARC-Verify** transforms the legacy single-record prototype into a multi-document **ApplicationDossier** verification platform for **SIH 2026 Problem Statement 26261**.

### Core Capabilities Implemented
1. **Multi-Document Dossier Aggregate (`domain/*`, `repositories/dossier-repository.ts`)**:
   - Models `Institution`, `ApplicationEntity`, `VerificationCase`, `DossierDocument`, `ExtractedFieldCandidate`, `ComplianceRuleSet`, `AssuranceFinding`, `ReviewDecision`, `ProcessingRun`, and `ScrutinyReport`.
   - Supports three distinct configurable rule profiles out of the box:
     - `AICTE_NEW_INSTITUTION` (AICTE Approval Process Handbook 2024–27 New Technical Institution Profile)
     - `AICTE_EXTENSION_OF_APPROVAL` (AICTE Annual EoA Renewal Profile — marks initial land acquisition norms `NOT_APPLICABLE`)
     - `GENERIC_REGULATORY_DEMO` (Institutional R&D Grant & Lab Safety Profile — demonstrates domain extensibility without AICTE/land assumptions)
2. **Upload Security, Original Preservation & SHA-256 Hashing (`services/assurance/document-integrity.ts`)**:
   - Enforces file size limits, path traversal protection, extension & MIME whitelist, and binary magic-byte header verification (`%PDF-`, `FF D8 FF`, `89 50 4E 47`).
   - Computes SHA-256 intake checksums and compares against prior baseline copies (`MATCHES_PRIOR_COPY` vs `HASH_MISMATCH_ALTERED_BYTES`).
3. **PDF Digital Signature Inspection & Experimental Forensic Indicators (`services/assurance/digital-signature-validator.ts`, `ai-service/main.py`)**:
   - Separates cryptographic PDF `/ByteRange` PKCS#7 signature inspection (`SIGNATURE_VALID`, `SIGNATURE_INVALID`, `UNSIGNED`, `SIGNATURE_UNAVAILABLE`, `UNSUPPORTED_FORMAT`) from optical stamp/seal detection.
   - Computes experimental visual anomaly heuristics (**Error Level Analysis (ELA)** recompression variance, **Laplacian sharpness/blur** legibility index, and **HSV seal chrominance** mask) explicitly labelled `EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY`. Heuristic flags route to human scrutiny (`INCONCLUSIVE` / `WARNING`) and **never automatically reject** a dossier.
4. **Deterministic Regulatory Rule Engine (`services/assurance/compliance-engine.ts`)**:
   - Evaluates versioned rules (`COMP-01` to `COMP-12`) with explicit source clauses, effective dates, and 6 distinct outcomes: `PASS`, `FAIL`, `WARNING`, `INCONCLUSIVE`, `NOT_APPLICABLE`, and `NOT_CHECKED`.
   - Degrades unconfigured external issuer integrations (DigiLocker, AICTE portal, Bank CBS) to `NOT_CHECKED` (`SOURCE_UNAVAILABLE`) rather than fabricating passes.
5. **High-Value Extra Features Added**:
   - **Interactive Cross-Document Evidence Concordance Matrix**: Side-by-side field reconciliation across Application Form, Land RoR, Building Plan, Fire NOC, Affidavit, and Bank FDR with Levenshtein + Soundex similarity and page/bounding-box links.
   - **"What-If" Regulatory Compliance Simulator & Remediation Planner**: Allows officers or applicants to simulate curing missing annexures or updating land/built-up/FDR figures and auto-generates a prioritized `P0_BLOCKING` / `P1_HIGH` / `P2_ADVISORY` remediation plan.
   - **Cryptographic Tamper-Evident SHA-256 Audit Hash Chain**: Every case creation, upload, analysis run, field correction, and reviewer decision is linked via `SHA-256(previousHash | eventPayload)` with a live integrity verifier.

---

## 2. Reproducible Demo Scenarios (Seeded by Default)

| Scenario | Case ID | Profile | Key Demonstration Highlights | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario A — Complete Dossier** | `CASE-2026-001` | `AICTE_NEW_INSTITUTION` | All 6 mandatory annexures attached, exact cross-document concordance, `SIGNATURE_VALID`, 3.2 Acres Urban (>=2.5 Ac norm), 11,800 sq.m built-up. | `READY_FOR_OFFICER_REVIEW` |
| **Scenario B — Deficient Dossier** | `CASE-2026-002` | `AICTE_NEW_INSTITUTION` | Missing Fire NOC & FDR, wrong catering invoice uploaded for Building Plan (`TC-03`), substantive institution name mismatch (`TC-05`), Rural land shortfall (4.8 < 7.5 Ac), Rs. 50 stamp shortfall. | `NEEDS_INFORMATION` |
| **Scenario C — Inconclusive Authenticity** | `CASE-2026-003` | `AICTE_NEW_INSTITUTION` | Fuzzy spelling variance ("Ganga Vally", `TC-06`), Experimental ELA score 24.8 > 18.0 (`TC-11`), low sharpness 38.5 < 45.0 (`TC-04`), consumer PDF producer warning (`TC-10`). | `REVIEW_REQUIRED` (Never auto-rejected) |
| **Scenario D — EoA Profile** | `CASE-2026-004` | `AICTE_EXTENSION_OF_APPROVAL` | Demonstrates profile-specific checklist and marks initial land acquisition (`COMP-08`) as `NOT_APPLICABLE` (`TC-12`). | `READY_FOR_OFFICER_REVIEW` |

---

## 3. Windows Local Setup & Verification

```powershell
# 1. Install Node dependencies
npm ci

# 2. Configure local environment (no hard-coded fallback secrets)
Copy-Item .env.example .env.local

# 3. Start Python FastAPI Document AI & Forensics Microservice (Optional in local serverless mode)
cd ai-service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000

# 4. Run Test Suite & Start Next.js Application
npm test
npm run dev
```

---

## 4. Limitations & Non-Official Notice

- **Prototype Scope**: ARC-Verify is an explainable decision-support prototype for SIH 2026 PS 26261. It does **not** issue official AICTE Letters of Approval (LoA) or Extensions of Approval (EoA).
- **Forensic Heuristics**: ELA, Laplacian blur, and HSV seal masks are triage indicators only and do not constitute legal proof of document genuineness or forgery.
- **External Integrations**: Live government registries require official API credentials; when unconfigured, checks explicitly report `NOT_CHECKED` (`SOURCE_UNAVAILABLE`).
