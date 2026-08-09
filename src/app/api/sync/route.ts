import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { q } from '@/lib/db';
import { fetchBookmarksFromX } from '@/lib/x';
import { fetchLikedVideos } from '@/lib/google';
import { extractFromBookmark } from '@/lib/extract';
import { getAccountId } from '@/lib/session';
import { assertRateLimit, isGuardrailError, RATE_LIMITS } from '@/lib/guardrails';
import { isPaywallError, requireEntitlement } from '@/lib/billing';
import type { RawBookmark } from '@/lib/types';

export const maxDuration = 300;

async function fetchBookmarks(accountId: string): Promise<RawBookmark[]> {
  if (process.env.SEED_MODE === 'true') {
    return JSON.parse(await readFile(path.join(process.cwd(), 'seed', 'bookmarks.json'), 'utf8'));
  }
  const [x, yt] = await Promise.all([
    fetchBookmarksFromX(accountId),
    fetchLikedVideos(accountId).catch((err) => {
      console.error('youtube fetch skipped:', err?.message);
      return [];
    }),
  ]);
  return [...x, ...yt];
}

export async function POST() {
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'Connect X first' }, { status: 401 });
    await requireEntitlement(accountId);
    await assertRateLimit(accountId, 'sync', RATE_LIMITS.sync);

    const all = await fetchBookmarks(accountId);
    const existing = new Set(
      (await q<{ TWEET_ID: string }>('SELECT TWEET_ID FROM BOOKMARKS WHERE ACCOUNT_ID = ?', [accountId])).map((r) => r.TWEET_ID),
    );
    const fresh = all.filter((b) => !existing.has(b.tweetId));
    let todos = 0, events = 0, insights = 0, needsReview = 0, costUsd = 0;

    async function processBookmark(b: RawBookmark) {
      const ex = await extractFromBookmark(b, accountId!);
      costUsd += ex.costUsd;
      await q(
        `INSERT INTO BOOKMARKS (TWEET_ID, ACCOUNT_ID, AUTHOR, TEXT, URL, MEDIA_TYPE, STATUS) VALUES (?,?,?,?,?,?,?)`,
        [b.tweetId, accountId, b.author, b.text, b.url, b.mediaType, ex.parsed ? 'extracted' : 'needs_review'],
      );
      if (!ex.parsed) { needsReview++; return; }
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

    const CONCURRENCY = 5;
    for (let i = 0; i < fresh.length; i += CONCURRENCY) {
      await Promise.all(fresh.slice(i, i + CONCURRENCY).map(processBookmark));
    }
    return NextResponse.json({ synced: fresh.length, todos, events, insights, needsReview, costUsd });
  } catch (err: any) {
    if (isPaywallError(err)) {
      return NextResponse.json({ error: 'Free trial or subscription required', paywall: true }, { status: 402 });
    }
    if (isGuardrailError(err)) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error('sync failed:', err);
    return NextResponse.json({ error: 'sync failed' }, { status: 500 });
  }
}
