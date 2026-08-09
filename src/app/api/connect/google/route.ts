import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/lib/google';
import { getSid, newSid, SID_COOKIE } from '@/lib/session';

export async function GET() {
  const sid = (await getSid()) ?? newSid();
  const { url, state } = buildGoogleAuthUrl();
  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(SID_COOKIE, sid, { httpOnly: true, secure, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  res.cookies.set('g_oauth', state, { httpOnly: true, secure, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
