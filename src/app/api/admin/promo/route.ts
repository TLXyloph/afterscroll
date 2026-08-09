import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/billing';

// Admin-only promo code minting, guarded by the x-admin-key header.
// Body: { code?, percentOff? (default 100), maxRedemptions?, durationInMonths? }
export async function POST(req: Request) {
  try {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) return NextResponse.json({ error: 'admin disabled' }, { status: 503 });
    if (req.headers.get('x-admin-key') !== adminKey) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const percentOff = Number(body?.percentOff ?? 100);
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return NextResponse.json({ error: 'percentOff must be between 1 and 100' }, { status: 400 });
    }
    const maxRedemptions = body?.maxRedemptions == null ? null : Number(body.maxRedemptions);
    if (maxRedemptions != null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      return NextResponse.json({ error: 'maxRedemptions must be a positive integer' }, { status: 400 });
    }
    const durationInMonths = body?.durationInMonths == null ? null : Number(body.durationInMonths);
    if (durationInMonths != null && (!Number.isInteger(durationInMonths) || durationInMonths < 1)) {
      return NextResponse.json({ error: 'durationInMonths must be a positive integer' }, { status: 400 });
    }
    const code = body?.code == null ? null : String(body.code);

    const stripe = getStripe();
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      ...(durationInMonths
        ? { duration: 'repeating' as const, duration_in_months: durationInMonths }
        : { duration: 'forever' as const }),
    });
    const promo = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      ...(code ? { code } : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
    });
    return NextResponse.json({ code: promo.code, id: promo.id });
  } catch (err: any) {
    console.error('promo create failed:', err);
    return NextResponse.json({ error: err?.message ?? 'promo create failed' }, { status: 500 });
  }
}
