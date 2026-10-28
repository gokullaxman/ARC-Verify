# ARC-Verify Regulatory Source Registry, Verification Status & Security Compliance Report

**Problem Statement:** SIH 2026 — PS 26261  
**Primary Reference Source:** AICTE Approval Process Handbook (APH) 2024–25 to 2026–27 (`https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf`)  
**Updated:** 28 October 2026  

---

## 1. Regulatory Rule Source Mapping (`COMP-01` to `COMP-12`) & Honest Verification Status

Each rule in `config/rules/**` carries both a `clause` string and an explicit `verified: boolean` flag (`sourceStatus: 'VERIFIED_SOURCE' | 'NEEDS_REVIEW'`). Clauses, session cutoff dates (such as the `2026-08-01` Fire NOC anchor date), and specific financial thresholds (such as the Rs. 35 Lakh FDR figure) that could not be independently confirmed verbatim against the primary AICTE handbook PDF are explicitly marked `verified: false` (`NEEDS_REVIEW`) rather than overstated as verified.

| Rule Code | Rule Title | Clause Stored in Rule | `verified` Flag | `sourceStatus` | Guardrail Enforced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COMP-01** | Mandatory Annexure Completeness & Category Check | `Chapter I, Clause 1.4 & Annexure-1 Checklist` | `true` | `VERIFIED_SOURCE` | Missing/misclassified files report `FAIL` deficiency; never assert fraud. |
| **COMP-02** | Application Reference & Statutory Identifier Syntax | `Chapter I, Clause 1.3 (Portal Application Identification)` | `true` | `VERIFIED_SOURCE` | Syntax pass does not imply live portal registration. |
| **COMP-03** | Cross-Document Institution & Trust Identity Match | `Chapter I, Clause 1.5 (Applicant Legal Entity Consistency)` | `true` | `VERIFIED_SOURCE` | Exact mismatch = `FAIL`; fuzzy orthographic match (0.78–0.98) = `WARNING` for officer review. |
| **COMP-04** | State, District & Campus Jurisdiction Hierarchy | `Chapter I, Clause 1.6.2 (Location & Jurisdiction Classification)` | `false` | `NEEDS_REVIEW` | Cross-references declared campus location against Land Certificate. |
| **COMP-05** | SHA-256 Byte Integrity & PDF Metadata Audit | `Annexure-1 Digital Submission Integrity Controls` | `true` | `VERIFIED_SOURCE` | Consumer PDF editor metadata produces `WARNING` only, never auto-rejection (`TC-10`). |
| **COMP-06** | Experimental Visual Anomaly & Sharpness Heuristics | `ARC-Verify Blueprint Section 9.4 & 9.5` | `true` | `VERIFIED_SOURCE` | Strictly labelled `EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY`; routes to `INCONCLUSIVE`, never auto-rejects (`TC-11`). |
| **COMP-07** | Affidavit Stamp Denomination & PDF Signature | `Appendix-17 / Annexure-2 Affidavit & Digital Signature Norms` | `false` | `NEEDS_REVIEW` | Separates stamp denomination check from cryptographic `pyHanko` / PKCS#7 `/ByteRange` verification (`TC-08`, `TC-09`). |
| **COMP-08** | Contiguous Land Area & Built-Up Carpet Area Norms | `Appendix-4, Clause 4.1 & 4.2 (Land & Built-Up Area Requirements)` | `false` | `NEEDS_REVIEW` | Evaluates campus land/built-up area; returns `NOT_APPLICABLE` for EoA/Generic (`TC-12`). |
| **COMP-09** | Optional GIS Campus Polygon Boundary Check | `Chapter I, Clause 1.6.3 (Spatial Verification)` | `false` | `NEEDS_REVIEW` | Returns `NOT_CHECKED` when no surveyed GeoJSON polygon is attached. |
| **COMP-10** | Cross-Dossier Duplicate Checksum & Certificate Reuse | `Chapter I, Clause 1.12 (Prevention of Duplicate / Shared Infrastructure)` | `false` | `NEEDS_REVIEW` | Flags duplicate SHA-256 hashes across dossiers for officer review. |
| **COMP-11** | Fire Safety NOC & Corpus FDR Validity Window | `Chapter I, Clause 1.7.4 & Clause 1.9` | `false` | `NEEDS_REVIEW` | Cutoff date (`2026-08-01`) and Rs. 35 Lakh FDR threshold are prototype parameters marked `verified: false` (`NEEDS_REVIEW`) pending institutional category table confirmation. |
| **COMP-12** | External Authoritative Registry & Issuer Adapter | `Chapter I, Clause 1.11 (External Verification)` | `false` | `NEEDS_REVIEW` | Returns `NOT_CHECKED` (`SOURCE_UNAVAILABLE`) when live external APIs are unconfigured (`TC-13`). |

---

## 2. Security, Storage & Verification Remediation Summary

1. **Signed HttpOnly Sessions & Salted Scrypt Passwords**: Replaced plain `sih_user_id` cookies and plaintext passwords with `scrypt` salted hashes (`lib/password.ts`) and HMAC-SHA256 signed `httpOnly` session tokens (`lib/session.ts`). Disabled passwordless login-by-role.
2. **Real SQLite Relational Persistence & Strict RLS**: Replaced in-memory-only state with `.arc-verify-data/arc_verify.sqlite` (`lib/sqlite-db.ts`) and removed all `USING (true)` policies from `supabase/migrations/20260909000000_ilrdvs_master_schema.sql`.
3. **Multipart Upload, Magic Bytes, SHA-256 & Private Storage**: Rewrote `/api/documents` and `/api/cases/[id]/documents` to require `multipart/form-data`, verify binary magic bytes (`%PDF-`, `FF D8 FF`, `89 50 4E 47`), compute `SHA-256` over raw bytes, use UUID filenames, and store files in `.arc-verify-data/private_uploads/` served only via `/api/documents/[id]/file`.
4. **No Silent OCR Fallbacks or Hardcoded Document IDs**: Removed hardcoded `doc-005` checks from `services/validation.ts` and removed silent `1.0` acre and `"Unspecified"` fallbacks from `services/document-processing.ts`.
5. **Cryptographic PDF Signature Validation (`pyHanko` + PKCS#7 ASN.1)**: Updated `ai-service/requirements.txt` and `ai-service/extract_pdf.py` to validate PDF signatures via `pyHanko` and `/ByteRange` + CMS PKCS#7 ASN.1 digest inspection rather than substring matching `/ByteRange`.

---

## 3. Controller of Certifying Authorities (CCA India) Root CA Trust Store & Offline Policy

### 3.1 Verification Architecture
ARC-Verify employs a dual-stage digital signature validation pipeline:
1. **Cryptographic Digest & Structural Verification (`services/assurance/digital-signature-validator.ts` & `ai-service/extract_pdf.py`)**:
   - Parses the exact `/ByteRange [offset1 length1 offset2 length2]` array from the PDF binary structure.
   - Computes the SHA-256 digest over the combined signed byte ranges `[0..length1] + [offset2..offset2+length2]`.
   - Parses the `/Contents` hex-encoded ASN.1 DER CMS `SignedData` container (OID `1.2.840.113549.1.7.2`).
   - Verifies that the computed SHA-256 digest strictly matches the embedded `messageDigest` signed attribute.
   - Confirms that any post-signing byte modifications produce `SIGNATURE_INVALID` (`TC-09`).

2. **Certificate Chain & Revocation Checking (`pyHanko` + `pyhanko-certvalidator`)**:
   - When deployed in environments with access to the Indian National PKI, pyHanko validates certificate paths up to the **India PKI CCA Root CA** (issued by the Controller of Certifying Authorities under the IT Act 2000).
   - Supported Sub-CAs include eMudhra, National Informatics Centre (NIC Sub-CA), Capricorn CA, SafeScrypt, and IDSign CA.

### 3.2 Offline Sandbox Limitations & Honest Transparency
- **Sandbox Trust State**: In local demo environments without live external network routing, live Online Certificate Status Protocol (OCSP) and Certificate Revocation List (CRL) checks to CCA issuing authorities cannot complete.
- **Fail-Safe Behavior**: Rather than falsely claiming live root revocation checks in an offline environment, the system flags trust chain status as `SELF_SIGNED_OR_UNVERIFIED_CHAIN` unless a pre-loaded local trust anchor bundle is provided, while still cryptographically validating that the document bytes have not been altered since signing.

### 3.3 Production Deployment Instructions
To configure live CCA India Root CA validation in a production deployment:
1. Download the official India PKI Root CA certificates from the CCA portal (`https://cca.gov.in/root.html`):
   - `India PKI Root CA (2014 / 2022)`
   - Sub-CA certificates for eMudhra, NIC, and licensed DSC providers.
2. Place PEM certificates in `/etc/ssl/certs/cca_india_root.pem` or set:
   ```bash
   export ARC_VERIFY_CCA_TRUST_STORE="/path/to/cca_india_bundle.pem"
   export ARC_VERIFY_ENABLE_ONLINE_OCSP="true"
   ```
3. PyHanko will automatically use `ValidationContext(trust_roots=[...], allow_fetching=True)` for real-time revocation and trust tree path building.

