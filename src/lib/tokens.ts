import { q } from './db';

export type StoredToken = { accessToken: string; refreshToken?: string; expiresAt: number };
export type Service = 'x' | 'google';

export async function readToken(accountId: string, service: Service): Promise<StoredToken | null> {
  const rows = await q<any>(
    `SELECT ACCESS_TOKEN, REFRESH_TOKEN, EXPIRES_AT FROM TOKENS WHERE ACCOUNT_ID = ? AND SERVICE = ?`,
    [accountId, service],
  );
  if (!rows.length) return null;
  return {
    accessToken: rows[0].ACCESS_TOKEN,
    refreshToken: rows[0].REFRESH_TOKEN ?? undefined,
    expiresAt: Number(rows[0].EXPIRES_AT),
  };
}

export async function saveToken(accountId: string, service: Service, t: StoredToken): Promise<void> {
  await q(
    `INSERT INTO TOKENS (ACCOUNT_ID, SERVICE, ACCESS_TOKEN, REFRESH_TOKEN, EXPIRES_AT) VALUES (?,?,?,?,?)
     ON CONFLICT(ACCOUNT_ID, SERVICE) DO UPDATE SET ACCESS_TOKEN = excluded.ACCESS_TOKEN, REFRESH_TOKEN = excluded.REFRESH_TOKEN, EXPIRES_AT = excluded.EXPIRES_AT`,
    [accountId, service, t.accessToken, t.refreshToken ?? null, t.expiresAt],
  );
}
