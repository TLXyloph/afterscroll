import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAccountId } from '@/lib/session';
import { ingestBookmark } from '@/lib/ingest';
import { assertRateLimit, isGuardrailError, RATE_LIMITS } from '@/lib/guardrails';
import type { RawBookmark } from '@/lib/types';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'Connect a source first' }, { status: 401 });
    const { url } = await req.json();
    if (typeof url === 'string' && url.length > 2048) {
      return NextResponse.json({ error: 'URL too long (max 2048 characters)' }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(String(url ?? ''));
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol');
    } catch {
      return NextResponse.json({ error: 'That does not look like a link — paste a full https:// URL' }, { status: 400 });
    }
    await assertRateLimit(accountId, 'import', RATE_LIMITS.import);

    const b: RawBookmark = {
      tweetId: `link-${crypto.createHash('sha256').update(parsed.href).digest('hex').slice(0, 16)}`,
      author: parsed.hostname,
      text: `Saved link to read: ${parsed.href} — fetch this link with web_fetch and extract from the page content.`,
      url: parsed.href,
      mediaType: 'text',
    };
    const result = await ingestBookmark(accountId, b);
    return NextResponse.json(result);
  } catch (err: any) {
    if (isGuardrailError(err)) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error('import failed:', err);
    return NextResponse.json({ error: err?.message ?? 'import failed' }, { status: 500 });
  }
}
