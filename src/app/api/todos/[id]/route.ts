import { NextResponse } from 'next/server';
import { sq } from '@/lib/snowflake';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { done } = await req.json();
  await sq(`UPDATE TODOS SET DONE = ? WHERE ID = ?`, [!!done, id]);
  return NextResponse.json({ ok: true });
}
