import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';
import { insertCalendarEvent } from '@/lib/google';
import { getSid } from '@/lib/session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const sid = await getSid();
    if (!sid) return NextResponse.json({ error: 'no session' }, { status: 401 });
    const rows = await sq<any>(
      `SELECT TITLE, START_TS, DURATION_MIN FROM EVENT_SUGGESTIONS WHERE ID = ? AND USER_ID = ?`,
      [id, sid],
    );
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const e = rows[0];
    const p = (n: number) => String(n).padStart(2, '0');
    let startNaive: string;
    if (e.START_TS) {
      const d = new Date(e.START_TS);
      startNaive = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
    } else {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      startNaive = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T09:00:00`;
    }
    await insertCalendarEvent(sid, e.TITLE, startNaive, Number(e.DURATION_MIN ?? 30));
    await sq(`UPDATE EVENT_SUGGESTIONS SET ADDED = TRUE WHERE ID = ? AND USER_ID = ?`, [id, sid]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('calendar add failed:', err);
    return NextResponse.json({ error: err?.message ?? 'calendar add failed' }, { status: 500 });
  }
}
