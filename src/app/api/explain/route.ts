import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';
import { llmComplete } from '@/lib/llm';
import { getSid } from '@/lib/session';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const sid = await getSid();
    if (!sid) return NextResponse.json({ error: 'no session' }, { status: 401 });
    const { insightId } = await req.json();
    if (!insightId || typeof insightId !== 'string') {
      return NextResponse.json({ error: 'insightId required' }, { status: 400 });
    }
    const rows = await sq<any>(
      `SELECT I.TEXT AS INSIGHT, B.TEXT AS POST_TEXT, B.AUTHOR FROM INSIGHTS I LEFT JOIN BOOKMARKS B ON I.TWEET_ID = B.TWEET_ID AND B.USER_ID = I.USER_ID WHERE I.ID = ? AND I.USER_ID = ?`,
      [insightId, sid],
    );
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const r = rows[0];
    const res = await llmComplete('explain',
      `Explain this saved X post in the simplest possible words — two short sentences max, no jargon, like you're telling a friend what it says and why it's useful.
Post by @${r.AUTHOR ?? 'unknown'}:
"""${r.POST_TEXT ?? r.INSIGHT}"""
Saved takeaway: ${r.INSIGHT}`,
      sid);
    return NextResponse.json({ explanation: res.text.trim(), costUsd: res.costUsd });
  } catch (err: any) {
    console.error('explain failed:', err);
    return NextResponse.json({ error: err?.message ?? 'explain failed' }, { status: 500 });
  }
}
