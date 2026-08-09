import { NextResponse } from 'next/server';
import { getAccountId } from '@/lib/session';
import { ensurePrice, getOrCreateCustomer, getStripe } from '@/lib/billing';

export const maxDuration = 60;

// Starts a Stripe Checkout session: $5/mo subscription, 7-day free trial.
export async function POST() {
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'Connect a source first' }, { status: 401 });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const customer = await getOrCreateCustomer(accountId);
    const price = await ensurePrice();
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { trial_period_days: 7, metadata: { accountId } },
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('billing checkout failed:', err);
    return NextResponse.json({ error: err?.message ?? 'checkout failed' }, { status: 500 });
  }
}
