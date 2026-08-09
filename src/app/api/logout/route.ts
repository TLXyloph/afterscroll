import { NextResponse } from 'next/server';
import { getSid, destroySession, SID_COOKIE } from '@/lib/session';

export async function POST() {
  const sid = await getSid();
  if (sid) await destroySession(sid);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SID_COOKIE);
  return res;
}
