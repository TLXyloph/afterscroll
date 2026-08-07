import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';
import { getSid } from '@/lib/session';

export async function GET() {
  const sid = await getSid();
  if (!sid) return NextResponse.json({ insights: [] });
  const rows = await sq<any>(
    `SELECT I.ID, I.TWEET_ID, I.TEXT, I.CATEGORY, I.CREATED_AT, B.URL FROM INSIGHTS I LEFT JOIN BOOKMARKS B ON I.TWEET_ID = B.TWEET_ID AND B.USER_ID = I.USER_ID WHERE I.USER_ID = ? ORDER BY I.CREATED_AT DESC`,
    [sid],
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
