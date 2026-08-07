import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { sq } from '@/lib/snowflake';
import { fetchBookmarksFromX } from '@/lib/x';
import { extractFromBookmark } from '@/lib/extract';
import { storeMemory, flushMemories } from '@/lib/everos';
import type { RawBookmark } from '@/lib/types';

async function fetchBookmarks(): Promise<RawBookmark[]> {
  if (process.env.SEED_MODE === 'true') {
    return JSON.parse(await readFile(path.join(process.cwd(), 'seed', 'bookmarks.json'), 'utf8'));
  }
  return fetchBookmarksFromX();
}

export async function POST() {
  try {
    const all = await fetchBookmarks();
    const existing = new Set((await sq<{ TWEET_ID: string }>('SELECT TWEET_ID FROM BOOKMARKS')).map((r) => r.TWEET_ID));
    const fresh = all.filter((b) => !existing.has(b.tweetId));
    let todos = 0, events = 0, insights = 0, needsReview = 0, costUsd = 0;

    async function processBookmark(b: RawBookmark) {
      const ex = await extractFromBookmark(b);
      costUsd += ex.costUsd;
      await sq(
        `INSERT INTO BOOKMARKS (TWEET_ID, AUTHOR, TEXT, URL, MEDIA_TYPE, SYNCED_AT, STATUS) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP(),?)`,
        [b.tweetId, b.author, b.text, b.url, b.mediaType, ex.parsed ? 'extracted' : 'needs_review'],
      );
      if (!ex.parsed) { needsReview++; return; }
      for (const t of ex.parsed.todos) {
        await sq(
          `INSERT INTO TODOS (ID, TWEET_ID, TITLE, CATEGORY, DONE, CREATED_AT) VALUES (?,?,?,?,FALSE,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), b.tweetId, t.title, ex.parsed.category],
        );
        todos++;
      }
      for (const e of ex.parsed.events) {
        await sq(
          `INSERT INTO EVENT_SUGGESTIONS (ID, TWEET_ID, TITLE, START_TS, DURATION_MIN, ADDED, CREATED_AT) VALUES (?,?,?,TRY_TO_TIMESTAMP_NTZ(?),?,FALSE,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), b.tweetId, e.title, e.start_iso, e.duration_min],
        );
        events++;
      }
      for (const i of ex.parsed.insights) {
        const everosId = await storeMemory(
          `${i.text} (category: ${ex.parsed.category}) Source: ${b.url}`,
          { category: ex.parsed.category, tweetId: b.tweetId },
        ).catch((err) => { console.error('everos store failed', err); return ''; });
        await sq(
          `INSERT INTO INSIGHTS (ID, TWEET_ID, TEXT, CATEGORY, EVEROS_ID, CREATED_AT) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP())`,
          [crypto.randomUUID(), b.tweetId, i.text, ex.parsed.category, everosId],
        );
        insights++;
      }
    }

    const CONCURRENCY = 5;
    for (let i = 0; i < fresh.length; i += CONCURRENCY) {
      await Promise.all(fresh.slice(i, i + CONCURRENCY).map(processBookmark));
    }
    if (insights > 0) await flushMemories();
    return NextResponse.json({ synced: fresh.length, todos, events, insights, needsReview, costUsd });
  } catch (err: any) {
    console.error('sync failed:', err);
    return NextResponse.json({ error: err?.message ?? 'sync failed' }, { status: 500 });
  }
}
