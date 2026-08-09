import crypto from 'crypto';
import { readToken, saveToken, type StoredToken } from './tokens';
import type { RawBookmark } from './types';

const AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const API = 'https://api.x.com/2';
const SCOPES = 'tweet.read users.read bookmark.read offline.access';

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:3000';
}

export function xRedirectUri(): string {
  return `${appUrl()}/api/connect/x/callback`;
}

export function buildXAuthUrl(): { url: string; verifier: string; state: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: xRedirectUri(),
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return { url: `${AUTH_URL}?${p.toString()}`, verifier, state };
}

async function tokenRequest(body: URLSearchParams): Promise<StoredToken> {
  const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body,
  });
  if (!r.ok) throw new Error(`X token endpoint → ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in ?? 7200) * 1000,
  };
}

// exchanges the code and identifies the X user; caller binds identity → account
export async function exchangeXCode(code: string, verifier: string): Promise<{ token: StoredToken; xUserId: string }> {
  const token = await tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: xRedirectUri(),
    code_verifier: verifier,
    client_id: process.env.X_CLIENT_ID!,
  }));
  const meR = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token.accessToken}` } });
  if (!meR.ok) throw new Error(`X /users/me → ${meR.status}: ${await meR.text()}`);
  const xUserId = String((await meR.json()).data.id);
  return { token, xUserId };
}

export async function getXAccessToken(accountId: string): Promise<string | null> {
  const x = await readToken(accountId, 'x');
  if (!x) return null;
  if (Date.now() < x.expiresAt - 60_000) return x.accessToken;
  if (!x.refreshToken) return null;
  const token = await tokenRequest(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: x.refreshToken,
    client_id: process.env.X_CLIENT_ID!,
  }));
  await saveToken(accountId, 'x', token);
  return token.accessToken;
}

export async function fetchBookmarksFromX(accountId: string): Promise<RawBookmark[]> {
  const token = await getXAccessToken(accountId);
  if (!token) throw new Error('X is not connected — click Connect X first');
  const headers = { Authorization: `Bearer ${token}` };

  const meR = await fetch(`${API}/users/me`, { headers });
  if (!meR.ok) throw new Error(`X /users/me → ${meR.status}: ${await meR.text()}`);
  const myId = (await meR.json()).data.id;

  const p = new URLSearchParams({
    max_results: '50',
    expansions: 'author_id,attachments.media_keys',
    'tweet.fields': 'attachments,entities',
    'user.fields': 'username',
    'media.fields': 'type',
  });
  const bR = await fetch(`${API}/users/${myId}/bookmarks?${p.toString()}`, { headers });
  if (!bR.ok) throw new Error(`X bookmarks → ${bR.status}: ${await bR.text()}`);
  const d = await bR.json();

  const tweets: any[] = d.data ?? [];
  const users = Object.fromEntries(((d.includes?.users ?? []) as any[]).map((u) => [u.id, u.username]));
  const media: any[] = d.includes?.media ?? [];
  return tweets.map((t) => {
    let text: string = t.text ?? '';
    for (const u of t.entities?.urls ?? []) {
      if (u.url && u.expanded_url) text = text.replace(u.url, u.expanded_url);
    }
    return {
      tweetId: String(t.id),
      author: users[t.author_id] ?? String(t.author_id ?? 'unknown'),
      text,
      url: `https://x.com/i/status/${t.id}`,
      mediaType: media.some((m) => (t.attachments?.media_keys ?? []).includes(m.media_key) && m.type === 'video') ? 'video' : 'text',
    };
  });
}
