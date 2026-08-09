import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode, saveGoogleToken } from '@/lib/google';
import { getSid, bindIdentity } from '@/lib/session';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  try {
    const sid = await getSid();
    const saved = (await cookies()).get('g_oauth')?.value;
    if (!sid || !code || !saved || state !== saved) throw new Error('missing session or mismatched oauth state');
    const { token, googleUserId } = await exchangeGoogleCode(code);
    const accountId = await bindIdentity(sid, 'google', googleUserId);
    await saveGoogleToken(accountId, token);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err: any) {
    console.error('google oauth callback failed:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_connect`);
  }
}
