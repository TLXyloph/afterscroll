import Stripe from 'stripe';
import { q } from './db';

// Stripe billing: $5/month subscription with a 7-day free trial.
// SUBSCRIPTIONS is the local mirror of Stripe state, kept fresh by the
// /api/billing/webhook route. Entitlement is only enforced when
// BILLING_ENFORCED=true (dev/rollout bypass otherwise, real status still reported).

export const PRICE_LOOKUP_KEY = 'afterscroll_monthly';

export class PaywallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaywallError';
  }
}

// True for paywall errors that routes should surface as HTTP 402.
export function isPaywallError(err: unknown): err is PaywallError {
  return err instanceof PaywallError;
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  stripeClient = new Stripe(key);
  return stripeClient;
}

let cachedPriceId: string | null = null;

// $5.00 USD / month price, found by lookup_key or created (with its product) once.
export async function ensurePrice(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;
  const stripe = getStripe();
  const existing = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
  if (existing.data[0]) {
    cachedPriceId = existing.data[0].id;
    return cachedPriceId;
  }
  const product = await stripe.products.create({ name: 'afterscroll' });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 500,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: PRICE_LOOKUP_KEY,
  });
  cachedPriceId = price.id;
  return cachedPriceId;
}

export async function getOrCreateCustomer(accountId: string): Promise<string> {
  const rows = await q<{ STRIPE_CUSTOMER_ID: string | null }>(
    `SELECT STRIPE_CUSTOMER_ID FROM SUBSCRIPTIONS WHERE ACCOUNT_ID = ?`,
    [accountId],
  );
  if (rows[0]?.STRIPE_CUSTOMER_ID) return rows[0].STRIPE_CUSTOMER_ID;
  const customer = await getStripe().customers.create({ metadata: { accountId } });
  await q(
    `INSERT INTO SUBSCRIPTIONS (ACCOUNT_ID, STRIPE_CUSTOMER_ID, UPDATED_AT) VALUES (?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(ACCOUNT_ID) DO UPDATE SET STRIPE_CUSTOMER_ID = excluded.STRIPE_CUSTOMER_ID, UPDATED_AT = CURRENT_TIMESTAMP`,
    [accountId, customer.id],
  );
  return customer.id;
}

export type Entitlement = {
  entitled: boolean;
  status: string;
  trialEnd: number | null;
  currentPeriodEnd: number | null;
};

const ENTITLED_STATUSES = new Set(['trialing', 'active', 'past_due']);

export async function getEntitlement(accountId: string): Promise<Entitlement> {
  const rows = await q<{ STATUS: string | null; TRIAL_END: number | null; CURRENT_PERIOD_END: number | null }>(
    `SELECT STATUS, TRIAL_END, CURRENT_PERIOD_END FROM SUBSCRIPTIONS WHERE ACCOUNT_ID = ?`,
    [accountId],
  );
  const status = rows[0]?.STATUS ?? 'none';
  // Enforcement is opt-in: without BILLING_ENFORCED=true everyone is entitled,
  // but the real Stripe status is still reported so the UI stays truthful.
  const entitled = process.env.BILLING_ENFORCED !== 'true' || ENTITLED_STATUSES.has(status);
  return {
    entitled,
    status,
    trialEnd: rows[0]?.TRIAL_END ?? null,
    currentPeriodEnd: rows[0]?.CURRENT_PERIOD_END ?? null,
  };
}

// Throws PaywallError (→ HTTP 402 in routes) when the account is not entitled.
export async function requireEntitlement(accountId: string): Promise<void> {
  const e = await getEntitlement(accountId);
  if (!e.entitled) throw new PaywallError('Free trial or subscription required');
}

// Mirror a Stripe subscription into SUBSCRIPTIONS (called from the webhook).
export async function upsertSubscriptionRow(
  accountId: string,
  customerId: string | null,
  status: string,
  trialEnd: number | null,
  currentPeriodEnd: number | null,
): Promise<void> {
  await q(
    `INSERT INTO SUBSCRIPTIONS (ACCOUNT_ID, STRIPE_CUSTOMER_ID, STATUS, TRIAL_END, CURRENT_PERIOD_END, UPDATED_AT)
     VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(ACCOUNT_ID) DO UPDATE SET
       STRIPE_CUSTOMER_ID = COALESCE(excluded.STRIPE_CUSTOMER_ID, STRIPE_CUSTOMER_ID),
       STATUS = excluded.STATUS,
       TRIAL_END = excluded.TRIAL_END,
       CURRENT_PERIOD_END = excluded.CURRENT_PERIOD_END,
       UPDATED_AT = CURRENT_TIMESTAMP`,
    [accountId, customerId, status, trialEnd, currentPeriodEnd],
  );
}

// accountId for a Stripe subscription: metadata first, then our own
// SUBSCRIPTIONS row keyed by customer id (we always create the customer).
export async function resolveAccountId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.accountId;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const rows = await q<{ ACCOUNT_ID: string }>(
    `SELECT ACCOUNT_ID FROM SUBSCRIPTIONS WHERE STRIPE_CUSTOMER_ID = ?`,
    [customerId],
  );
  return rows[0]?.ACCOUNT_ID ?? null;
}

// Basil API moved current_period_end onto subscription items; older payloads
// still carry it top-level. Accept both.
export function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const topLevel = (sub as unknown as { current_period_end?: number }).current_period_end;
  return topLevel ?? sub.items?.data?.[0]?.current_period_end ?? null;
}
