import { NextResponse } from 'next/server';
import { getAccountId } from '@/lib/session';
import { getEntitlement } from '@/lib/billing';

// Entitlement snapshot for the UI. No 401: anonymous sessions just aren't entitled.
export async function GET() {
  try {
    const accountId = await getAccountId();
    if (!accountId) {
      return NextResponse.json({ entitled: false, status: 'none', trialEnd: null, currentPeriodEnd: null });
    }
    return NextResponse.json(await getEntitlement(accountId));
  } catch (err: any) {
    console.error('billing status failed:', err);
    return NextResponse.json({ error: err?.message ?? 'status failed' }, { status: 500 });
  }
}
