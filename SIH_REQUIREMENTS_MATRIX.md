# SIH 2026 Problem Statement 26261 — Requirements & Traceability Matrix (ARC-Verify)

**Problem Statement:** SIH 26261 — AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification  
**System Name:** ARC-Verify  
**Version:** 2026.1.0  

| Req ID | Requirement Name | Implementation Module(s) | API / UI Route | Verification Test(s) | Actual Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Dossier creation & persistence | `domain/application-dossier.ts`, `repositories/dossier-repository.ts` | `POST /api/cases`, `/cases` | `TC-01`, `TC-17` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-02** | Configurable application profiles (New Institution & EoA) | `config/rules/aicte-2024-27/new-institution.ts`, `extension-of-approval.ts` | `GET /api/rules`, `/rules` | `TC-12` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-03** | Multi-document upload per dossier | `domain/document.ts`, `repositories/dossier-repository.ts` | `POST /api/cases/:id/documents` | `TC-01`, `TC-02` | **IMPLEMENTED** |
| **FR-04** | Upload security (size, MIME, magic bytes, path traversal) | `services/assurance/document-integrity.ts` | `POST /api/cases/:id/documents` | `TC-15` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-05** | Original preservation separate from derived previews | `domain/document.ts` (`originalStorageKey` vs `derivedPreviewUrl`) | `/cases/[id]` | `TC-07` | **IMPLEMENTED** |
| **FR-06** | SHA-256 hashing & prior-copy comparison | `services/assurance/document-integrity.ts`, `ai-service/extract_pdf.py` | `/cases/[id]` | `TC-07` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-07** | Document category classification with explicit unknown | `services/real-ocr.ts`, `services/assurance/compliance-engine.ts` (`COMP-01`) | `/cases/[id]` | `TC-03` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-08** | OCR & field extraction with page/bbox coordinates | `domain/extracted-field.ts`, `services/real-ocr.ts` | `/cases/[id]`, `/documents/[id]` | `serverless_ocr.test.ts`, `TC-05` | **IMPLEMENTED** |
| **FR-09** | Audited manual field correction preserving original OCR | `repositories/dossier-repository.ts` (`correctField`) | `PATCH /api/cases/:id` | `TC-18` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-10** | Annexure completeness checks against active profile | `services/assurance/compliance-engine.ts` (`COMP-01`) | `/cases/[id]` | `TC-02` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-11** | Cross-document consistency & Concordance Matrix | `services/assurance/cross-document-validator.ts` (`COMP-03`, `COMP-04`) | `/cases/[id]` (Tab 2) | `TC-05`, `TC-06` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-12** | PDF digital signature inspection | `services/assurance/digital-signature-validator.ts` (`COMP-07`) | `/cases/[id]` (Tab 3) | `TC-08`, `TC-09` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-13** | Experimental visual anomaly indicators (ELA, Blur, HSV) | `services/assurance/document-integrity.ts`, `ai-service/main.py` (`COMP-06`) | `POST /forensics/analyze`, `/cases/[id]` | `TC-04`, `TC-11` (`tests/arc_verify_suite.test.ts`) | **EXPERIMENTAL** (Labelled & Guardrailed) |
| **FR-14** | Versioned regulatory rules (`COMP-01`..`COMP-12`) | `config/rules/**`, `services/assurance/compliance-engine.ts` | `GET /api/rules`, `/rules` | `TC-02`..`TC-13` | **IMPLEMENTED** |
| **FR-15** | External issuer adapter with `SOURCE_UNAVAILABLE` state | `services/assurance/compliance-engine.ts` (`COMP-12`) | `/cases/[id]` | `TC-13` (`tests/arc_verify_suite.test.ts`) | **NOT CHECKED / SOURCE_UNAVAILABLE** (By Design) |
| **FR-16** | Six-state finding aggregation without hiding blockers | `services/assurance/compliance-engine.ts` (`aggregateFindings`) | `/cases/[id]` | `TC-02`, `TC-19` | **IMPLEMENTED** |
| **FR-17** | Authorized human reviewer workflow & decisions | `lib/auth.ts` (`canReviewCase`), `app/api/cases/[id]/analyze/route.ts` | `POST /api/cases/:id/analyze` | `TC-14`, `TC-18` | **IMPLEMENTED** |
| **FR-18** | Downloadable Scrutiny & Deficiency Report + Remediation Plan | `services/assurance/report-builder.ts` | `GET /api/cases/:id/report`, `/cases/[id]` | `TC-19` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-19** | Tamper-evident SHA-256 hash-chained audit trail | `repositories/audit-repository.ts` (`verifyHashChainIntegrity`) | `GET /api/audit`, `/audit` | `TC-18` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-20** | Real persisted dashboard metrics | `app/api/dashboard/stats/route.ts` | `/dashboard` | `TC-01` | **IMPLEMENTED** |
| **FR-21** | Generic second application profile (`GENERIC_REGULATORY_DEMO`) | `config/rules/generic-demo.ts` | `/cases`, `/rules` | `TC-12` (`tests/arc_verify_suite.test.ts`) | **IMPLEMENTED** |
| **FR-22** | Safe demo reset & What-If Compliance Simulator | `repositories/dossier-repository.ts`, `services/assurance/report-builder.ts` | `POST /api/cases`, `PATCH /api/cases/:id` | `TC-01` | **IMPLEMENTED** |
