# Master Engineering Task: ARC-Verify Production Readiness & Gemini Help Chat

## Goal
Implement a Gemini-powered floating AI Help Chat, perform a full-scale audit and bug fixing across frontend, backend, security, and data integrity, verify production builds and automated test suites, prepare deployment configuration, and produce an evidence-based deployment readiness report.

## Phase Breakdown
- [ ] Phase 1: Repository Discovery, Configuration & Baseline Verification
- [ ] Phase 2: Full-Scale Code & Bug Audit (Frontend, Backend, Database, APIs)
- [ ] Phase 3: Security Hardening (Auth, CSRF/Cookies, File Handling, AI Guardrails)
- [ ] Phase 4: Implement Gemini AI Help Chat (UI Widget, Next.js API, Python Gemini Chat, Unit & Integration Tests)
- [ ] Phase 5: Data Integrity & Functional Workflow Verification (Concordance, Evidence Links)
- [ ] Phase 6: Dependency, Docker & Environment Configuration Audit
- [ ] Phase 7: Production Build, Test Suite Execution & Multi-Framework Validation
- [ ] Phase 8: Deployment Configuration & Simulation Check
- [ ] Phase 9: Comprehensive Deployment Readiness Report (`docs/DEPLOYMENT_READINESS_REPORT.md`)

## Key Success Criteria
1. Gemini AI Help Chat operates smoothly with collapse/expand, suggested questions, rate limiting, and grounded assistant responses.
2. `npx tsc --noEmit` passes with 0 errors.
3. Next.js test suite (`npm test`) passes 100%.
4. Python test suite (`pytest ai-service/tests`) passes 100%.
5. `npm run build` succeeds cleanly for all routes in production mode.
6. `docs/DEPLOYMENT_READINESS_REPORT.md` created with verified evidence.
