import crypto from 'crypto';
import { readToken, saveToken, type StoredToken } from './tokens';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

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

export async function exchangeGoogleCode(sid: string, code: string): Promise<void> {
  const token = await tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: googleRedirectUri(),
  }));
  const existing = await readToken(sid, 'google');
  if (!token.refreshToken && existing?.refreshToken) token.refreshToken = existing.refreshToken;
  await saveToken(sid, 'google', token);
}

export async function getGoogleAccessToken(sid: string): Promise<string | null> {
  const google = await readToken(sid, 'google');
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
  await saveToken(sid, 'google', token);
  return token.accessToken;
}

// startNaive is wall-clock time in America/Los_Angeles with no offset suffix;
// Google interprets dateTime against the given timeZone
export async function insertCalendarEvent(sid: string, summary: string, startNaive: string, durationMin: number): Promise<string> {
  const token = await getGoogleAccessToken(sid);
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
