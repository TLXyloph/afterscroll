import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { insertCalendarEvent } from '@/lib/google';
import { getAccountId } from '@/lib/session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const accountId = await getAccountId();
    if (!accountId) return NextResponse.json({ error: 'no session' }, { status: 401 });
    const rows = await q<any>(
      `SELECT TITLE, START_TS, DURATION_MIN FROM EVENT_SUGGESTIONS WHERE ID = ? AND ACCOUNT_ID = ?`,
      [id, accountId],
    );
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const e = rows[0];
    const p = (n: number) => String(n).padStart(2, '0');
    let startNaive: string;
    if (e.START_TS) {
      startNaive = String(e.START_TS);
    } else {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      startNaive = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T09:00:00`;
    }
    await insertCalendarEvent(accountId, e.TITLE, startNaive, Number(e.DURATION_MIN ?? 30));
    await q(`UPDATE EVENT_SUGGESTIONS SET ADDED = 1 WHERE ID = ? AND ACCOUNT_ID = ?`, [id, accountId]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('calendar add failed:', err?.message);
    return NextResponse.json({ error: 'could not add to calendar' }, { status: 500 });
  }
}
