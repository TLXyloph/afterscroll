import { z } from 'zod';
import { llmComplete } from './llm';
import type { RawBookmark } from './types';

const ExtractionSchema = z.object({
  category: z.enum(['coding', 'fitness', 'career', 'finance', 'life', 'other']),
  todos: z.array(z.object({ title: z.string().min(1) })),
  events: z.array(z.object({
    title: z.string().min(1),
    start_iso: z.string().nullable(),
    duration_min: z.number().positive(),
  })),
  insights: z.array(z.object({ text: z.string().min(1) })),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export async function extractFromBookmark(
  b: Pick<RawBookmark, 'author' | 'text' | 'mediaType'>,
): Promise<{ parsed: Extraction | null; costUsd: number }> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const prompt = `You turn saved social-media posts into actions. Today is ${today}, timezone America/Los_Angeles.
Post by @${b.author} (type: ${b.mediaType}):
"""${b.text}"""
Return ONLY strict JSON (no markdown fences, no commentary) matching exactly:
{"category":"coding|fitness|career|finance|life|other","todos":[{"title":"..."}],"events":[{"title":"...","start_iso":"2026-08-08T07:00:00 or null","duration_min":30}],"insights":[{"text":"..."}]}
Rules:
- todos: concrete actions the person who saved this should do. Imperative, short.
- events: ONLY if the post implies a specific date/time; resolve relative dates ("tomorrow 7am","next Friday 6pm") from today. Otherwise leave events empty and use a todo.
- insights: tips/knowledge worth remembering later; one self-contained sentence each.
- Empty arrays are fine. Never invent content not in the post.`;
  const res = await llmComplete('extract', prompt);
  try {
    const cleaned = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    return { parsed: ExtractionSchema.parse(JSON.parse(cleaned)), costUsd: res.costUsd };
  } catch (err) {
    console.error('extraction parse failed:', err, 'raw:', res.text.slice(0, 200));
    return { parsed: null, costUsd: res.costUsd };
  }
}
