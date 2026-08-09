import crypto from 'crypto';
import { q } from './db';

// Abuse guardrails: per-account daily spend cap + DB-backed rate limiting
// (DB-backed so it works on serverless where in-memory counters reset per invocation).

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Per-account request ceilings, per hour.
export const RATE_LIMITS = {
  sync: 6,
  ask: 30,
  explain: 30,
  import: 20,
  capture: 60,
  // failed-auth probes to the extension capture endpoint, per IP
  captureAuth: 30,
  // admin promo minting, per IP — throttles key-guessing
  adminPromo: 20,
} as const;

// Throws BudgetExceededError if the account has spent >= the daily cap in the last 24h.
export async function assertSpendAllowed(accountId: string): Promise<void> {
  const cap = Number(process.env.SPEND_CAP_USD_PER_DAY ?? '2.00');
  const rows = await q<{ TOTAL: number | null }>(
    `SELECT SUM(COST_USD) AS TOTAL FROM SPEND_LOG WHERE ACCOUNT_ID = ? AND CREATED_AT > datetime('now','-1 day')`,
    [accountId],
  );
  if ((rows[0]?.TOTAL ?? 0) >= cap) {
    throw new BudgetExceededError('Daily AI budget reached — resets within 24h');
  }
}

// Records the request, then throws RateLimitError if the caller has exceeded
// maxPerHour requests for this route in the last hour. `accountId` may also be
// an IP string for unauthenticated guards (e.g. capture auth failures).
export async function assertRateLimit(accountId: string, route: string, maxPerHour: number): Promise<void> {
  await q(
    `INSERT INTO REQUEST_LOG (ID, ACCOUNT_ID, ROUTE) VALUES (?,?,?)`,
    [crypto.randomUUID(), accountId, route],
  );
  if (Math.random() < 0.05) {
    await q(`DELETE FROM REQUEST_LOG WHERE CREATED_AT < datetime('now','-1 day')`);
  }
  const rows = await q<{ N: number }>(
    `SELECT COUNT(*) AS N FROM REQUEST_LOG WHERE ACCOUNT_ID = ? AND ROUTE = ? AND CREATED_AT > datetime('now','-1 hour')`,
    [accountId, route],
  );
  if ((rows[0]?.N ?? 0) > maxPerHour) {
    throw new RateLimitError('Too many requests — please wait a bit and try again');
  }
}

// True for guardrail errors that routes should surface as HTTP 429.
export function isGuardrailError(err: unknown): err is BudgetExceededError | RateLimitError {
  return err instanceof BudgetExceededError || err instanceof RateLimitError;
}

// Strips untrusted-content delimiter tags from text before it is wrapped in
// <untrusted_content>...</untrusted_content>, preventing delimiter breakout.
export function sanitizeUntrusted(text: string): string {
  return text.replace(/<\/?\s*untrusted_content\s*>/gi, '');
}

// Trusted client IP. Prefer platform headers set by the edge (Cloudflare's
// CF-Connecting-IP, Vercel's x-real-ip) over the client-spoofable left-most
// x-forwarded-for hop.
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || 'unknown';
}
