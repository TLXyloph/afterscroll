import { NextResponse } from 'next/server';
import { readToken } from '@/lib/tokens';
import { getSid } from '@/lib/session';

export async function GET() {
  const sid = await getSid();
  if (!sid) return NextResponse.json({ x: false, google: false });
  const [x, google] = await Promise.all([readToken(sid, 'x'), readToken(sid, 'google')]);
  return NextResponse.json({ x: !!x, google: !!google });
}
