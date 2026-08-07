import { NextResponse } from 'next/server';
import { searchMemories } from '@/lib/everos';
import { llmComplete } from '@/lib/llm';
import { getSid } from '@/lib/session';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const sid = await getSid();
    if (!sid) {
      return NextResponse.json({
        answer: 'Connect X and run a sync first — I can only answer from your own saves.',
        sources: [],
        costUsd: 0,
      });
    }
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question required' }, { status: 400 });
    }
    const memories = await searchMemories(sid, question);
    if (!memories.length) {
      return NextResponse.json({
        answer: "I couldn't find anything about that in your bookmarks yet — sync more or ask differently.",
        sources: [],
        costUsd: 0,
      });
    }
    const context = memories.map((m, i) => `[${i + 1}] ${m.text}`).join('\n');
    const res = await llmComplete('ask',
      `Answer using ONLY these notes saved from the user's X bookmarks. Cite note numbers like [1]. If none are relevant, say so.\nNotes:\n${context}\nQuestion: ${question}\nAnswer in 1-2 sentences.`,
      sid);
    return NextResponse.json({
      answer: res.text.trim(),
      sources: memories.map((m) => ({ text: m.text })),
      costUsd: res.costUsd,
    });
  } catch (err: any) {
    console.error('ask failed:', err);
    return NextResponse.json({ error: err?.message ?? 'ask failed' }, { status: 500 });
  }
}
