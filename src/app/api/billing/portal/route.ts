import { NextResponse } from 'next/server';
import { getAccountId } from '@/lib/session';
import { getOrCreateCustomer, getStripe } from '@/lib/billing';

// Stripe customer portal: manage payment method, cancel, invoices.
export async function POST() {
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'Connect a source first' }, { status: 401 });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const customer = await getOrCreateCustomer(accountId);
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${appUrl}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('billing portal failed:', err);
    return NextResponse.json({ error: err?.message ?? 'portal failed' }, { status: 500 });
  }
}
