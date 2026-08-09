import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = await getAccountId();
  if (!accountId) return NextResponse.json({ error: 'no session' }, { status: 401 });
  const { done } = await req.json();
  await q(`UPDATE TODOS SET DONE = ? WHERE ID = ? AND ACCOUNT_ID = ?`, [!!done, id, accountId]);
  return NextResponse.json({ ok: true });
}
