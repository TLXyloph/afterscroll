import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { q } from '@/lib/db';
import { ingestBookmark } from '@/lib/ingest';
import { assertRateLimit, isGuardrailError, clientIp, RATE_LIMITS } from '@/lib/guardrails';
import { isPaywallError, requireEntitlement } from '@/lib/billing';
import type { RawBookmark } from '@/lib/types';

export const maxDuration = 120;

// browser-extension capture endpoint: Bearer device token → account
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      // IP guard on failed-auth probes (throws RateLimitError → 429 below)
      await assertRateLimit(clientIp(req), 'capture-auth', RATE_LIMITS.captureAuth);
      return NextResponse.json({ error: 'missing token' }, { status: 401 });
    }
    const rows = await q<{ ACCOUNT_ID: string }>(`SELECT ACCOUNT_ID FROM EXT_TOKENS WHERE TOKEN = ?`, [token]);
    if (!rows.length) {
      await assertRateLimit(clientIp(req), 'capture-auth', RATE_LIMITS.captureAuth);
      return NextResponse.json({ error: 'invalid token' }, { status: 401 });
    }
    const accountId = rows[0].ACCOUNT_ID;
    await requireEntitlement(accountId);
    await assertRateLimit(accountId, 'capture', RATE_LIMITS.capture);

    const body = await req.json();
    const text = String(body?.text ?? '').slice(0, 5000).trim();
    const author = String(body?.author ?? 'unknown').slice(0, 200);
    const source = String(body?.source ?? 'extension').slice(0, 40);
    let url: URL;
    try {
      url = new URL(String(body?.url ?? ''));
      if (!/^https?:$/.test(url.protocol)) throw new Error('bad protocol');
    } catch {
      return NextResponse.json({ error: 'valid url required' }, { status: 400 });
    }
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

    const b: RawBookmark = {
      tweetId: `${source}-${crypto.createHash('sha256').update(url.href).digest('hex').slice(0, 16)}`,
      author,
      text,
      url: url.href,
      mediaType: 'text',
    };
    const result = await ingestBookmark(accountId, b);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    if (isPaywallError(err)) {
      return NextResponse.json({ error: 'Free trial or subscription required', paywall: true }, { status: 402 });
    }
    if (isGuardrailError(err)) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error('extension capture failed:', err);
    return NextResponse.json({ error: err?.message ?? 'capture failed' }, { status: 500 });
  }
}
