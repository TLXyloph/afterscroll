import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';

export async function GET() {
  const rows = await sq<any>(
    `SELECT ID, TWEET_ID, TITLE, CATEGORY, DONE, CREATED_AT FROM TODOS ORDER BY DONE ASC, CREATED_AT DESC`);
  return NextResponse.json({
    todos: rows.map((r) => ({
      id: r.ID,
      tweetId: r.TWEET_ID,
      title: r.TITLE,
      category: r.CATEGORY,
      done: !!r.DONE,
      createdAt: String(r.CREATED_AT),
    })),
  });
}
