import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { sq } from '@/lib/snowflake';
import { fetchBookmarksFromX } from '@/lib/x';
import { extractFromBookmark } from '@/lib/extract';
import { storeMemory, flushMemories } from '@/lib/everos';
import { getSid } from '@/lib/session';
import type { RawBookmark } from '@/lib/types';

export const maxDuration = 300;

async function fetchBookmarks(sid: string): Promise<RawBookmark[]> {
  if (process.env.SEED_MODE === 'true') {
    return JSON.parse(await readFile(path.join(process.cwd(), 'seed', 'bookmarks.json'), 'utf8'));
  }
  return fetchBookmarksFromX(sid);
}

export async function POST() {
  try {
    const sid = await getSid();
    if (!sid) return NextResponse.json({ error: 'Connect X first' }, { status: 401 });

    const all = await fetchBookmarks(sid);
    const existing = new Set(
      (await sq<{ TWEET_ID: string }>('SELECT TWEET_ID FROM BOOKMARKS WHERE USER_ID = ?', [sid])).map((r) => r.TWEET_ID),
    );
    const fresh = all.filter((b) => !existing.has(b.tweetId));
    let todos = 0, events = 0, insights = 0, needsReview = 0, costUsd = 0;

    async function processBookmark(b: RawBookmark) {
      const ex = await extractFromBookmark(b, sid!);
      costUsd += ex.costUsd;
      await sq(
        `INSERT INTO BOOKMARKS (TWEET_ID, USER_ID, AUTHOR, TEXT, URL, MEDIA_TYPE, SYNCED_AT, STATUS) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP(),?)`,
        [b.tweetId, sid, b.author, b.text, b.url, b.mediaType, ex.parsed ? 'extracted' : 'needs_review'],
      );
      if (!ex.parsed) { needsReview++; return; }
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
        const everosId = await storeMemory(sid!, `${i.text} (category: ${ex.parsed.category}) Source: ${b.url}`)
          .catch((err) => { console.error('everos store failed', err); return ''; });
        await sq(
          `INSERT INTO INSIGHTS (ID, USER_ID, TWEET_ID, TEXT, CATEGORY, EVEROS_ID, CREATED_AT) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), sid, b.tweetId, i.text, ex.parsed.category, everosId],
        );
        insights++;
      }
    }

    const CONCURRENCY = 5;
    for (let i = 0; i < fresh.length; i += CONCURRENCY) {
      await Promise.all(fresh.slice(i, i + CONCURRENCY).map(processBookmark));
    }
    if (insights > 0) await flushMemories(sid);
    return NextResponse.json({ synced: fresh.length, todos, events, insights, needsReview, costUsd });
  } catch (err: any) {
    console.error('sync failed:', err);
    return NextResponse.json({ error: err?.message ?? 'sync failed' }, { status: 500 });
  }
}
