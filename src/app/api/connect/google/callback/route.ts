import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode, saveGoogleToken } from '@/lib/google';
import { getSid, bindIdentity, SID_COOKIE } from '@/lib/session';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const secure = process.env.NODE_ENV === 'production';
  try {
    const currentSid = await getSid();
    const saved = (await cookies()).get('g_oauth')?.value;
    if (!code || !saved || !state || state !== saved) throw new Error('missing session or mismatched oauth state');
    const { token, googleUserId } = await exchangeGoogleCode(code);
    const { sid, accountId } = await bindIdentity(currentSid, 'google', googleUserId);
    await saveGoogleToken(accountId, token);
    const res = NextResponse.redirect(`${appUrl}/dashboard`);
    res.cookies.set(SID_COOKIE, sid, { httpOnly: true, secure, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
    res.cookies.delete('g_oauth');
    return res;
  } catch (err: any) {
    console.error('google oauth callback failed:', err?.message);
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_connect`);
  }
}
