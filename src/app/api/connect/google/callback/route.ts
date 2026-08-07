import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode } from '@/lib/google';
import { getSid } from '@/lib/session';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  try {
    const sid = await getSid();
    const saved = (await cookies()).get('g_oauth')?.value;
    if (!sid || !code || !saved || state !== saved) throw new Error('missing session or mismatched oauth state');
    await exchangeGoogleCode(sid, code);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err: any) {
    console.error('google oauth callback failed:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_connect`);
  }
}
