import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';

// snowflake-sdk returns TIMESTAMP_NTZ as a JS Date with the naive value in UTC
// fields; rebuild the naive ISO string so browsers treat it as local wall time
function naiveIso(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string | Date);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
}

export async function GET() {
  const rows = await sq<any>(
    `SELECT ID, TWEET_ID, TITLE, START_TS, DURATION_MIN, ADDED FROM EVENT_SUGGESTIONS ORDER BY ADDED ASC, CREATED_AT DESC`);
  return NextResponse.json({
    events: rows.map((r) => ({
      id: r.ID,
      tweetId: r.TWEET_ID,
      title: r.TITLE,
      startTs: naiveIso(r.START_TS),
      durationMin: Number(r.DURATION_MIN ?? 30),
      added: !!r.ADDED,
    })),
  });
}
