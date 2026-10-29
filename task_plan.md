# ARC-Verify Overhaul & Decoupling Task Plan

## Goal
Decouple legacy land-record app completely, harden identity/authorization/sessions, streamline data layer with unified transactional DB, implement true HMAC-SHA256 tamper-evident audit ledger, enforce server-side validation/forensics/OCR, modernize frontend architecture, and add comprehensive regression tests.

## Architecture & Scope
- **App Scope**: ARC-Verify (AICTE Approval Process Handbook 2024–27 Verification & Assurance - PS 26261).
- **Legacy Scope**: Quarantine land-record modules (PS 26018) into `legacy/` and sever all dependencies.
- **Security Scope**: `lib/guard.ts`, `lib/env.ts`, `proxy.ts`, JTI session revocation table, rate limiting, HMAC audit chain.

## Phase Breakdown
- [ ] Phase 1: Planning, Environment & Dependency Investigation
- [ ] Phase 2: Quarantine Legacy Land-Record Modules & Purge Mixed References
- [ ] Phase 3: Unified Data Layer (`lib/db.ts` with SQLite/Postgres support, users/roles/sessions/cases/audit)
- [ ] Phase 4: Identity, Authorization, Session JTI Tracking & `lib/guard.ts`
- [ ] Phase 5: Tamper-Evident HMAC Audit Chain & Zero Client Trust on Uploads
- [ ] Phase 6: Frontend Overhaul (`app/(app)/layout.tsx`, Route Grouping, Clean Dossier UI)
- [ ] Phase 7: Secrets, Docker, Fonts & Deployment Modernization (`proxy.ts`, `lib/env.ts`)
- [ ] Phase 8: Comprehensive Regression Test Suite & Verification

## Key Success Criteria
1. `npx tsc --noEmit` exits with 0.
2. `npm test` passes all tests including 7 new security/RBAC/audit tests.
3. `npm run build` succeeds cleanly.
4. Legacy land-record endpoints, mock-data, and in-memory store completely isolated or removed.

