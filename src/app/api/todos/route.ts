import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';
import { getSid } from '@/lib/session';

export async function GET() {
  const sid = await getSid();
  if (!sid) return NextResponse.json({ todos: [] });
  const rows = await sq<any>(
    `SELECT ID, TWEET_ID, TITLE, CATEGORY, DONE, CREATED_AT FROM TODOS WHERE USER_ID = ? ORDER BY DONE ASC, CREATED_AT DESC`,
    [sid],
  );
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
