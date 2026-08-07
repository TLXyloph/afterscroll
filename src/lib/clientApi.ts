import { fixture } from './fixtures';

export const USE_FIXTURES = false; // flip to true to develop UI without the backend

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_FIXTURES) return fixture(path, init) as T;
  const r = await fetch(path, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(body.error ?? `${path} → ${r.status}`);
  return body as T;
}
