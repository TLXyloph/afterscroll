import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';

export async function GET() {
  try {
    const rows = await sq<{ C: number; CALLS: number; TOK: number }>(
      `SELECT COALESCE(SUM(COST_USD),0) AS C, COUNT(*) AS CALLS, COALESCE(SUM(PROMPT_TOKENS+COMPLETION_TOKENS),0) AS TOK FROM TOKEN_LEDGER`);
    const r = rows[0] ?? { C: 0, CALLS: 0, TOK: 0 };
    return NextResponse.json({ lifetimeCostUsd: r.C, totalCalls: r.CALLS, totalTokens: r.TOK });
  } catch {
    return NextResponse.json({ lifetimeCostUsd: 0, totalCalls: 0, totalTokens: 0 });
  }
}
