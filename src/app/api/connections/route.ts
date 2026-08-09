import { NextResponse } from 'next/server';
import { readToken } from '@/lib/tokens';
import { getAccountId } from '@/lib/session';

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ x: false, google: false });
  const [x, google] = await Promise.all([readToken(accountId, 'x'), readToken(accountId, 'google')]);
  return NextResponse.json({ x: !!x, google: !!google });
}
