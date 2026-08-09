import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getStripe } from '@/lib/billing';
import { assertRateLimit, isGuardrailError, clientIp, RATE_LIMITS } from '@/lib/guardrails';

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Admin-only promo code minting, guarded by the x-admin-key header.
// Body: { code?, percentOff? (default 100), maxRedemptions?, durationInMonths? }
export async function POST(req: Request) {
  try {
    // throttle guess attempts by source IP before touching the key
    await assertRateLimit(clientIp(req), 'admin-promo', RATE_LIMITS.adminPromo);
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey || adminKey.length < 24) return NextResponse.json({ error: 'admin disabled' }, { status: 503 });
    if (!timingSafeEqualStr(req.headers.get('x-admin-key') ?? '', adminKey)) {
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
    if (isGuardrailError(err)) return NextResponse.json({ error: err.message }, { status: 429 });
    console.error('promo create failed:', err?.message);
    return NextResponse.json({ error: 'promo create failed' }, { status: 500 });
  }
}
