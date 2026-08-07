import { NextResponse } from 'next/server';
import { readTokens } from '@/lib/tokens';

export async function GET() {
  const store = await readTokens();
  return NextResponse.json({ x: !!store.x, google: !!store.google });
}
