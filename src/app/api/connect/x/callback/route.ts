import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeXCode } from '@/lib/x';
import { saveToken } from '@/lib/tokens';
import { getSid, bindIdentity, SID_COOKIE } from '@/lib/session';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const secure = process.env.NODE_ENV === 'production';
  try {
    const currentSid = await getSid();
    const raw = (await cookies()).get('x_oauth')?.value;
    if (!raw || !code) throw new Error('missing session/oauth state');
    const { verifier, state: saved } = JSON.parse(raw);
    if (!state || state !== saved) throw new Error('state mismatch');
    const { token, xUserId } = await exchangeXCode(code, verifier);
    const { sid, accountId } = await bindIdentity(currentSid, 'x', xUserId);
    await saveToken(accountId, 'x', token);
    const res = NextResponse.redirect(`${appUrl}/dashboard`);
    res.cookies.set(SID_COOKIE, sid, { httpOnly: true, secure, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
    res.cookies.delete('x_oauth');
    return res;
  } catch (err: any) {
    console.error('x oauth callback failed:', err?.message);
    return NextResponse.redirect(`${appUrl}/dashboard?error=x_connect`);
  }
}
