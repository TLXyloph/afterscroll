import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ events: [] });
  const rows = await q<any>(
    `SELECT ID, TWEET_ID, TITLE, START_TS, DURATION_MIN, ADDED FROM EVENT_SUGGESTIONS WHERE ACCOUNT_ID = ? ORDER BY ADDED ASC, CREATED_AT DESC`,
    [accountId],
  );
  return NextResponse.json({
    events: rows.map((r) => ({
      id: r.ID,
      tweetId: r.TWEET_ID,
      title: r.TITLE,
      startTs: r.START_TS ?? null,
      durationMin: Number(r.DURATION_MIN ?? 30),
      added: !!r.ADDED,
    })),
  });
}
