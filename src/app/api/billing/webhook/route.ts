import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  getStripe,
  resolveAccountId,
  subscriptionPeriodEnd,
  upsertSubscriptionRow,
} from '@/lib/billing';

// Stripe webhook: mirrors subscription state into SUBSCRIPTIONS.
// Signature is verified against STRIPE_WEBHOOK_SECRET — unsigned/mis-signed
// posts get a 400 and never touch the database.
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err: any) {
    console.error('webhook signature verification failed:', err?.message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'checkout.session.completed': {
        // Trial starts here; fetch the subscription for its full state.
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      default:
        // Unknown events are acknowledged so Stripe stops retrying them.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('webhook handling failed:', err);
    return NextResponse.json({ error: err?.message ?? 'webhook failed' }, { status: 500 });
  }
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const accountId = await resolveAccountId(sub);
  if (!accountId) {
    console.error('webhook: no accountId for subscription', sub.id);
    return;
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  await upsertSubscriptionRow(accountId, customerId, sub.status, sub.trial_end ?? null, subscriptionPeriodEnd(sub));
}
