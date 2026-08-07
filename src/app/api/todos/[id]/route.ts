import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';
import { getSid } from '@/lib/session';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = await getSid();
  if (!sid) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const { done } = await req.json();
  await sq(`UPDATE TODOS SET DONE = ? WHERE ID = ? AND USER_ID = ?`, [!!done, id, sid]);
  return NextResponse.json({ ok: true });
}
