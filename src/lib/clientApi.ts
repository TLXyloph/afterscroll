import { fixture } from './fixtures';

export const USE_FIXTURES = false; // flip to true to develop UI without the backend

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (USE_FIXTURES) return fixture(path, init) as T;
  const r = await fetch(path, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) {
    const err = new Error(body.error ?? `${path} → ${r.status}`) as Error & { paywall?: boolean };
    if (r.status === 402 || body.paywall === true) err.paywall = true;
    throw err;
  }
  return body as T;
}

// True when a route answered 402 — free trial / subscription required.
export function isPaywallResponse(err: unknown): boolean {
  return err instanceof Error && (err as Error & { paywall?: boolean }).paywall === true;
}

// Kicks off Stripe Checkout (7-day free trial, $5/mo after).
export async function startCheckout(): Promise<void> {
  const r = await api<{ url: string }>("/api/billing/checkout", { method: "POST" });
  if (r.url) window.location.href = r.url;
}
