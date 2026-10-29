# Findings & Discoveries

## Architecture State
- Repo contains a mix of Land Records verification (PS 26018) and AICTE Approval Dossier verification (ARC-Verify PS 26261).
- `lib/store.ts` and `lib/mock-data.ts` hold in-memory legacy records, parcels, and users.
- Several pages (`dashboard/page.tsx`, `documents/upload/page.tsx`, `app/api/audit/route.ts`, `app/api/dashboard/stats/route.ts`) import both legacy store and dossier repository.
- Node.js runtime is v24.14.0 on Windows.

