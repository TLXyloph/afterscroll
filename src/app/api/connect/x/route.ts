import { NextResponse } from 'next/server';
import { buildXAuthUrl } from '@/lib/x';

export async function GET() {
  const { url, verifier, state } = buildXAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set('x_oauth', JSON.stringify({ verifier, state }), {
    httpOnly: true,
    maxAge: 600,
    path: '/',
  });
  return res;
}
