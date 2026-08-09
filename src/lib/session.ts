import { cookies } from 'next/headers';
import crypto from 'crypto';
import { q } from './db';

export const SID_COOKIE = 'as_uid';

export async function getSid(): Promise<string | null> {
  return (await cookies()).get(SID_COOKIE)?.value ?? null;
}

export function newSid(): string {
  return crypto.randomBytes(16).toString('hex');
}

// account this browser session belongs to (null until a provider is connected)
export async function getAccountId(): Promise<string | null> {
  const sid = await getSid();
  if (!sid) return null;
  const rows = await q<{ ACCOUNT_ID: string }>(`SELECT ACCOUNT_ID FROM SESSIONS WHERE SID = ?`, [sid]);
  return rows[0]?.ACCOUNT_ID ?? null;
}

// called from OAuth callbacks: identity (provider, providerId) → account.
// Existing identity wins (reconnect from any device recovers the account);
// otherwise the identity joins the session's current account, or a new one.
export async function bindIdentity(sid: string, provider: 'x' | 'google', providerId: string): Promise<string> {
  const existing = await q<{ ACCOUNT_ID: string }>(
    `SELECT ACCOUNT_ID FROM IDENTITIES WHERE PROVIDER = ? AND PROVIDER_ID = ?`,
    [provider, providerId],
  );
  let accountId = existing[0]?.ACCOUNT_ID;
  if (!accountId) {
    const current = await q<{ ACCOUNT_ID: string }>(`SELECT ACCOUNT_ID FROM SESSIONS WHERE SID = ?`, [sid]);
    accountId = current[0]?.ACCOUNT_ID ?? crypto.randomUUID();
    await q(`INSERT OR IGNORE INTO ACCOUNTS (ACCOUNT_ID) VALUES (?)`, [accountId]);
    await q(`INSERT OR IGNORE INTO IDENTITIES (PROVIDER, PROVIDER_ID, ACCOUNT_ID) VALUES (?,?,?)`, [provider, providerId, accountId]);
  }
  await q(`INSERT INTO SESSIONS (SID, ACCOUNT_ID) VALUES (?,?) ON CONFLICT(SID) DO UPDATE SET ACCOUNT_ID = excluded.ACCOUNT_ID`, [sid, accountId]);
  return accountId;
}
