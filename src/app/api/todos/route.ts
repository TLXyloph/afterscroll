import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export async function GET() {
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ todos: [] });
  const rows = await q<any>(
    `SELECT ID, TWEET_ID, TITLE, CATEGORY, DONE, CREATED_AT FROM TODOS WHERE ACCOUNT_ID = ? ORDER BY DONE ASC, CREATED_AT DESC`,
    [accountId],
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
