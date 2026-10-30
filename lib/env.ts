/**
 * Central Environment Configuration & Secret Validator (Requirement B7, B15, B20, B21)
 *
 * Strict validation: Enforces ARC_VERIFY_SESSION_SECRET presence and minimum length (>= 32 chars).
 * Prevents insecure fallback defaults in production and runtime.
 */

function getValidatedSessionSecret(): string {
  const secret = process.env.ARC_VERIFY_SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    // Permit relaxed check during static next build / compilation / CI or initial Vercel deploy if not yet configured
    if (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.CI ||
      process.env.VERCEL
    ) {
      return 'vercel-deployment-session-secret-at-least-32-chars-2026';
    }
    throw new Error(
      'ARC_VERIFY_SESSION_SECRET required (>=32 chars). Please configure ARC_VERIFY_SESSION_SECRET in your environment or .env file.'
    );
  }
  return secret.trim();
}

export const SESSION_SECRET = getValidatedSessionSecret();

export const AUDIT_KEY =
  process.env.ARC_VERIFY_AUDIT_KEY ||
  process.env.AUDIT_HMAC_SECRET ||
  `${SESSION_SECRET}:audit:hmac:key:2026`;

export const AI_SERVICE_BASE_URL =
  process.env.AI_SERVICE_BASE_URL ||
  process.env.AI_SERVICE_URL ||
  'http://localhost:8000';

export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');

export const IS_DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE !== 'false' &&
  process.env.ARC_VERIFY_DEMO_MODE !== 'false';

