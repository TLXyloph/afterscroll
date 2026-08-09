import { cookies } from 'next/headers';
import crypto from 'crypto';
import { q } from './db';

export const SID_COOKIE = 'as_uid';
const SESSION_TTL_DAYS = 30;

export async function getSid(): Promise<string | null> {
  return (await cookies()).get(SID_COOKIE)?.value ?? null;
}

export function newSid(): string {
  return crypto.randomBytes(16).toString('hex');
}

// account this browser session belongs to (null until a provider is connected).
// Enforces a rolling TTL — a session older than SESSION_TTL_DAYS is dead.
export async function getAccountId(): Promise<string | null> {
  const sid = await getSid();
  if (!sid) return null;
  const rows = await q<{ ACCOUNT_ID: string }>(
    `SELECT ACCOUNT_ID FROM SESSIONS WHERE SID = ? AND CREATED_AT > datetime('now', ?)`,
    [sid, `-${SESSION_TTL_DAYS} day`],
  );
  return rows[0]?.ACCOUNT_ID ?? null;
}

// Binds (provider, providerId) → account and ALWAYS rotates the session id.
// Rotation is the fix for session fixation: the pre-auth cookie value is never
// bound to an account, so an attacker who planted a known sid cannot inherit
// the victim's account — the caller sets the returned fresh sid as the cookie.
// Returns the new sid plus the account it maps to.
export async function bindIdentity(
  currentSid: string | null,
  provider: 'x' | 'google',
  providerId: string,
): Promise<{ sid: string; accountId: string }> {
  const existing = await q<{ ACCOUNT_ID: string }>(
    `SELECT ACCOUNT_ID FROM IDENTITIES WHERE PROVIDER = ? AND PROVIDER_ID = ?`,
    [provider, providerId],
  );
  let accountId = existing[0]?.ACCOUNT_ID;

  if (!accountId) {
    // link a brand-new identity into the session's current account only if that
    // session is itself authenticated (already has an account); otherwise a
    // fresh account. This is what makes "connect X then Google" link, while a
    // never-authenticated planted session can't absorb a new identity's tokens.
    const current = currentSid
      ? await q<{ ACCOUNT_ID: string }>(`SELECT ACCOUNT_ID FROM SESSIONS WHERE SID = ?`, [currentSid])
      : [];
    accountId = current[0]?.ACCOUNT_ID ?? crypto.randomUUID();
    await q(`INSERT OR IGNORE INTO ACCOUNTS (ACCOUNT_ID) VALUES (?)`, [accountId]);
    await q(`INSERT OR IGNORE INTO IDENTITIES (PROVIDER, PROVIDER_ID, ACCOUNT_ID) VALUES (?,?,?)`, [provider, providerId, accountId]);
  }

  // rotate: retire the old sid, mint a fresh one bound to the account
  if (currentSid) await q(`DELETE FROM SESSIONS WHERE SID = ?`, [currentSid]);
  const sid = newSid();
  await q(`INSERT INTO SESSIONS (SID, ACCOUNT_ID) VALUES (?,?)`, [sid, accountId]);
  return { sid, accountId };
}

export async function destroySession(sid: string): Promise<void> {
  await q(`DELETE FROM SESSIONS WHERE SID = ?`, [sid]);
}
