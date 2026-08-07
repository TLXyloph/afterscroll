import { NextResponse } from 'next/server';
import { buildXAuthUrl } from '@/lib/x';
import { getSid, newSid, SID_COOKIE } from '@/lib/session';

export async function GET() {
  const sid = (await getSid()) ?? newSid();
  const { url, verifier, state } = buildXAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set(SID_COOKIE, sid, { httpOnly: true, maxAge: 60 * 60 * 24 * 365, path: '/' });
  res.cookies.set('x_oauth', JSON.stringify({ verifier, state }), {
    httpOnly: true,
    maxAge: 600,
    path: '/',
  });
  return res;
}
