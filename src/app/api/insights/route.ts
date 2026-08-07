import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';

export async function GET() {
  const rows = await sq<any>(
    `SELECT I.ID, I.TWEET_ID, I.TEXT, I.CATEGORY, I.CREATED_AT, B.URL FROM INSIGHTS I LEFT JOIN BOOKMARKS B ON I.TWEET_ID = B.TWEET_ID ORDER BY I.CREATED_AT DESC`);
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
