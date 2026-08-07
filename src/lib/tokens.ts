import { sq } from './snowflake';

export type StoredToken = { accessToken: string; refreshToken?: string; expiresAt: number };
export type Service = 'x' | 'google';

export async function readToken(sid: string, service: Service): Promise<StoredToken | null> {
  const rows = await sq<any>(
    `SELECT ACCESS_TOKEN, REFRESH_TOKEN, EXPIRES_AT FROM TOKENS WHERE SID = ? AND SERVICE = ?`,
    [sid, service],
  );
  if (!rows.length) return null;
  return {
    accessToken: rows[0].ACCESS_TOKEN,
    refreshToken: rows[0].REFRESH_TOKEN ?? undefined,
    expiresAt: Number(rows[0].EXPIRES_AT),
  };
}

export async function saveToken(sid: string, service: Service, t: StoredToken): Promise<void> {
  await sq(`DELETE FROM TOKENS WHERE SID = ? AND SERVICE = ?`, [sid, service]);
  await sq(
    `INSERT INTO TOKENS (SID, SERVICE, ACCESS_TOKEN, REFRESH_TOKEN, EXPIRES_AT) VALUES (?,?,?,?,?)`,
    [sid, service, t.accessToken, t.refreshToken ?? null, t.expiresAt],
  );
}
