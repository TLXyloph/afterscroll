import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode } from '@/lib/google';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  try {
    const saved = (await cookies()).get('g_oauth')?.value;
    if (!code || !saved || state !== saved) throw new Error('missing/mismatched oauth state');
    await exchangeGoogleCode(code);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err: any) {
    console.error('google oauth callback failed:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?error=google_connect`);
  }
}
