import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeXCode } from '@/lib/x';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  try {
    const raw = (await cookies()).get('x_oauth')?.value;
    if (!raw || !code) throw new Error('missing oauth state');
    const { verifier, state: saved } = JSON.parse(raw);
    if (state !== saved) throw new Error('state mismatch');
    await exchangeXCode(code, verifier);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err: any) {
    console.error('x oauth callback failed:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?error=x_connect`);
  }
}
