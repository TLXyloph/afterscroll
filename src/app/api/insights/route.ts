import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ insights: [] });
  const rows = await q<any>(
    `SELECT I.ID, I.TWEET_ID, I.TEXT, I.CATEGORY, I.CREATED_AT, B.URL FROM INSIGHTS I LEFT JOIN BOOKMARKS B ON I.TWEET_ID = B.TWEET_ID AND B.ACCOUNT_ID = I.ACCOUNT_ID WHERE I.ACCOUNT_ID = ? ORDER BY I.CREATED_AT DESC`,
    [accountId],
  );
  return NextResponse.json({
    insights: rows.map((r) => ({
      id: r.ID,
      tweetId: r.TWEET_ID,
      text: r.TEXT,
      category: r.CATEGORY,
      sourceUrl: r.URL ?? '#',
      createdAt: String(r.CREATED_AT),
    })),
  });
}
