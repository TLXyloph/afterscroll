import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sq } from '@/lib/snowflake';
import { extractFromBookmark } from '@/lib/extract';
import { storeMemory, flushMemories } from '@/lib/everos';
import { getSid } from '@/lib/session';
import type { RawBookmark } from '@/lib/types';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const sid = await getSid();
    if (!sid) return NextResponse.json({ error: 'Connect a source first' }, { status: 401 });
    const { url } = await req.json();
    let parsed: URL;
    try {
      parsed = new URL(String(url ?? ''));
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol');
    } catch {
      return NextResponse.json({ error: 'That does not look like a link — paste a full https:// URL' }, { status: 400 });
    }

    const id = `link-${crypto.createHash('sha256').update(parsed.href).digest('hex').slice(0, 16)}`;
    const dupe = await sq<{ TWEET_ID: string }>(
      `SELECT TWEET_ID FROM BOOKMARKS WHERE TWEET_ID = ? AND USER_ID = ?`, [id, sid]);
    if (dupe.length) {
      return NextResponse.json({ synced: 0, todos: 0, events: 0, insights: 0, needsReview: 0, costUsd: 0 });
    }

    const b: RawBookmark = {
      tweetId: id,
      author: parsed.hostname,
      text: `Saved link to read: ${parsed.href} — fetch this link with web_fetch and extract from the page content.`,
      url: parsed.href,
      mediaType: 'text',
    };

    const ex = await extractFromBookmark(b, sid);
    await sq(
      `INSERT INTO BOOKMARKS (TWEET_ID, USER_ID, AUTHOR, TEXT, URL, MEDIA_TYPE, SYNCED_AT, STATUS) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP(),?)`,
      [b.tweetId, sid, b.author, b.text, b.url, b.mediaType, ex.parsed ? 'extracted' : 'needs_review'],
    );
    let todos = 0, events = 0, insights = 0;
    if (ex.parsed) {
      for (const t of ex.parsed.todos) {
        await sq(
          `INSERT INTO TODOS (ID, USER_ID, TWEET_ID, TITLE, CATEGORY, DONE, CREATED_AT) VALUES (?,?,?,?,?,FALSE,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), sid, b.tweetId, t.title, ex.parsed.category],
        );
        todos++;
      }
      for (const e of ex.parsed.events) {
        await sq(
          `INSERT INTO EVENT_SUGGESTIONS (ID, USER_ID, TWEET_ID, TITLE, START_TS, DURATION_MIN, ADDED, CREATED_AT) VALUES (?,?,?,?,TRY_TO_TIMESTAMP_NTZ(?),?,FALSE,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), sid, b.tweetId, e.title, e.start_iso, e.duration_min],
        );
        events++;
      }
      for (const i of ex.parsed.insights) {
        const everosId = await storeMemory(sid, `${i.text} (category: ${ex.parsed.category}) Source: ${b.url}`)
          .catch(() => '');
        await sq(
          `INSERT INTO INSIGHTS (ID, USER_ID, TWEET_ID, TEXT, CATEGORY, EVEROS_ID, CREATED_AT) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), sid, b.tweetId, i.text, ex.parsed.category, everosId],
        );
        insights++;
      }
      if (insights > 0) await flushMemories(sid);
    }
    return NextResponse.json({
      synced: 1, todos, events, insights,
      needsReview: ex.parsed ? 0 : 1,
      costUsd: ex.costUsd,
    });
  } catch (err: any) {
    console.error('import failed:', err);
    return NextResponse.json({ error: err?.message ?? 'import failed' }, { status: 500 });
  }
}
