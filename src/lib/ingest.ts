import crypto from 'crypto';
import { q } from './db';
import { extractFromBookmark } from './extract';
import type { RawBookmark } from './types';

export type IngestResult = {
  synced: number;
  todos: number;
  events: number;
  insights: number;
  needsReview: number;
};

// single-bookmark pipeline shared by /api/import and /api/extension/capture
export async function ingestBookmark(accountId: string, b: RawBookmark): Promise<IngestResult> {
  const dupe = await q<{ TWEET_ID: string }>(
    `SELECT TWEET_ID FROM BOOKMARKS WHERE TWEET_ID = ? AND ACCOUNT_ID = ?`, [b.tweetId, accountId]);
  if (dupe.length) return { synced: 0, todos: 0, events: 0, insights: 0, needsReview: 0 };

  const ex = await extractFromBookmark(b, accountId);
  await q(
    `INSERT INTO BOOKMARKS (TWEET_ID, ACCOUNT_ID, AUTHOR, TEXT, URL, MEDIA_TYPE, STATUS) VALUES (?,?,?,?,?,?,?)`,
    [b.tweetId, accountId, b.author, b.text, b.url, b.mediaType, ex.parsed ? 'extracted' : 'needs_review'],
  );
  let todos = 0, events = 0, insights = 0;
  if (ex.parsed) {
    for (const t of ex.parsed.todos) {
      await q(
        `INSERT INTO TODOS (ID, ACCOUNT_ID, TWEET_ID, TITLE, CATEGORY, DONE) VALUES (?,?,?,?,?,0)`,
        [crypto.randomUUID(), accountId, b.tweetId, t.title, ex.parsed.category],
      );
      todos++;
    }
    for (const e of ex.parsed.events) {
      await q(
        `INSERT INTO EVENT_SUGGESTIONS (ID, ACCOUNT_ID, TWEET_ID, TITLE, START_TS, DURATION_MIN, ADDED) VALUES (?,?,?,?,?,?,0)`,
        [crypto.randomUUID(), accountId, b.tweetId, e.title, e.start_iso, e.duration_min],
      );
      events++;
    }
    for (const i of ex.parsed.insights) {
      await q(
        `INSERT INTO INSIGHTS (ID, ACCOUNT_ID, TWEET_ID, TEXT, CATEGORY) VALUES (?,?,?,?,?)`,
        [crypto.randomUUID(), accountId, b.tweetId, i.text, ex.parsed.category],
      );
      insights++;
    }
  }
  return { synced: 1, todos, events, insights, needsReview: ex.parsed ? 0 : 1 };
}
