import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { llmComplete } from '@/lib/llm';
import { getAccountId } from '@/lib/session';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'no session' }, { status: 401 });
    const { insightId } = await req.json();
    if (!insightId || typeof insightId !== 'string') {
      return NextResponse.json({ error: 'insightId required' }, { status: 400 });
    }
    const rows = await q<any>(
      `SELECT I.TEXT AS INSIGHT, B.TEXT AS POST_TEXT, B.AUTHOR FROM INSIGHTS I LEFT JOIN BOOKMARKS B ON I.TWEET_ID = B.TWEET_ID AND B.ACCOUNT_ID = I.ACCOUNT_ID WHERE I.ID = ? AND I.ACCOUNT_ID = ?`,
      [insightId, accountId],
    );
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const r = rows[0];
    const res = await llmComplete('explain',
      `Explain this saved post in the simplest possible words — two short sentences max, no jargon, like you're telling a friend what it says and why it's useful.
Post by @${r.AUTHOR ?? 'unknown'}:
"""${r.POST_TEXT ?? r.INSIGHT}"""
Saved takeaway: ${r.INSIGHT}`,
      accountId);
    return NextResponse.json({ explanation: res.text.trim() });
  } catch (err: any) {
    console.error('explain failed:', err);
    return NextResponse.json({ error: err?.message ?? 'explain failed' }, { status: 500 });
  }
}
