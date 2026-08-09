import crypto from 'crypto';
import { readToken, saveToken, type StoredToken } from './tokens';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/youtube.readonly';

export function googleRedirectUri(): string {
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/api/connect/google/callback`;
}

export function buildGoogleAuthUrl(): { url: string; state: string } {
  const state = crypto.randomBytes(16).toString('hex');
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return { url: `${AUTH_URL}?${p.toString()}`, state };
}

async function tokenRequest(body: URLSearchParams): Promise<StoredToken> {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`Google token endpoint → ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
}

// exchanges the code and identifies the Google user; caller binds identity → account
export async function exchangeGoogleCode(code: string): Promise<{ token: StoredToken; googleUserId: string }> {
  const token = await tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: googleRedirectUri(),
  }));
  const uiR = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!uiR.ok) throw new Error(`Google userinfo → ${uiR.status}: ${await uiR.text()}`);
  const googleUserId = String((await uiR.json()).sub);
  return { token, googleUserId };
}

export async function saveGoogleToken(accountId: string, token: StoredToken): Promise<void> {
  const existing = await readToken(accountId, 'google');
  if (!token.refreshToken && existing?.refreshToken) token.refreshToken = existing.refreshToken;
  await saveToken(accountId, 'google', token);
}

export async function getGoogleAccessToken(accountId: string): Promise<string | null> {
  const google = await readToken(accountId, 'google');
  if (!google) return null;
  if (Date.now() < google.expiresAt - 60_000) return google.accessToken;
  if (!google.refreshToken) return null;
  const token = await tokenRequest(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: google.refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  }));
  if (!token.refreshToken) token.refreshToken = google.refreshToken;
  await saveToken(accountId, 'google', token);
  return token.accessToken;
}

// startNaive is wall-clock time in America/Los_Angeles with no offset suffix;
// Google interprets dateTime against the given timeZone
export async function insertCalendarEvent(accountId: string, summary: string, startNaive: string, durationMin: number): Promise<string> {
  const token = await getGoogleAccessToken(accountId);
  if (!token) throw new Error('Google Calendar is not connected — click Connect Calendar first');
  const start = new Date(startNaive);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  const naive = (d: Date) =>
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  const r = await fetch(`${CAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary,
      start: { dateTime: naive(start), timeZone: 'America/Los_Angeles' },
      end: { dateTime: naive(end), timeZone: 'America/Los_Angeles' },
    }),
  });
  if (!r.ok) throw new Error(`Google Calendar insert → ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.htmlLink ?? '';
}

// user's recently liked YouTube videos, mapped into the same pipeline shape
export async function fetchLikedVideos(accountId: string): Promise<import('./types').RawBookmark[]> {
  const token = await getGoogleAccessToken(accountId);
  if (!token) return [];
  const p = new URLSearchParams({ part: 'snippet', myRating: 'like', maxResults: '10' });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?${p.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`YouTube liked videos → ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.items ?? []).map((v: any) => ({
    tweetId: `yt-${v.id}`,
    author: v.snippet?.channelTitle ?? 'YouTube',
    text: `${v.snippet?.title ?? ''}. ${(v.snippet?.description ?? '').slice(0, 500)}`,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    mediaType: 'video' as const,
  }));
}
