import { NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/lib/google';

export async function GET() {
  const { url, state } = buildGoogleAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set('g_oauth', state, { httpOnly: true, maxAge: 600, path: '/' });
  return res;
}
