import { NextResponse } from 'next/server';
import { buildXAuthUrl } from '@/lib/x';
import { getSid, newSid, SID_COOKIE } from '@/lib/session';

export async function GET() {
  const sid = (await getSid()) ?? newSid();
  const { url, verifier, state } = buildXAuthUrl();
  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(SID_COOKIE, sid, { httpOnly: true, secure, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  res.cookies.set('x_oauth', JSON.stringify({ verifier, state }), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
