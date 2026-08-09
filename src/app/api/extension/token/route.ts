import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { q } from '@/lib/db';
import { getAccountId } from '@/lib/session';

// mints (or rotates) the device token the browser extension authenticates with
export async function POST() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: 'Connect X or Google first' }, { status: 401 });
  const token = `ext_${crypto.randomBytes(24).toString('base64url')}`;
  await q(`DELETE FROM EXT_TOKENS WHERE ACCOUNT_ID = ?`, [accountId]);
  await q(`INSERT INTO EXT_TOKENS (TOKEN, ACCOUNT_ID) VALUES (?,?)`, [token, accountId]);
  return NextResponse.json({ token });
}
