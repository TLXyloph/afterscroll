const USER = 'afterscroll-live';
const SESSION = 'bookmarks';

function base(): string {
  const raw = (process.env.EVEROS_BASE_URL ?? 'https://api.evermind.ai').replace(/\/+$/, '');
  return raw.replace(/\/api\/v[12]$/, '');
}

async function ev(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EVEROS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`EverOS ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function storeMemory(text: string, _metadata: Record<string, string>): Promise<string> {
  const j = await ev('/api/v2/memory/add', {
    session_id: SESSION,
    messages: [{ sender_id: USER, role: 'user', timestamp: Date.now(), content: text }],
  });
  return String(j?.request_id ?? '');
}

// extraction is async server-side; flush once after a batch of stores so
// memories are searchable within the demo window
export async function flushMemories(): Promise<void> {
  await ev('/api/v2/memory/flush', { session_id: SESSION, user_id: USER }).catch((err) => {
    console.error('everos flush failed (non-fatal):', err);
  });
}

export async function searchMemories(query: string): Promise<{ text: string; score: number }[]> {
  const j = await ev('/api/v2/memory/search', { query, user_id: USER, top_k: 5 });
  const d = j?.data ?? {};
  const out: { text: string; score: number }[] = [];
  for (const e of d.episodes ?? []) {
    const text = String(e.episode ?? e.summary ?? '');
    if (text) out.push({ text, score: Number(e.score ?? 0) });
  }
  if (!out.length) {
    for (const m of d.unprocessed_messages ?? []) {
      const c = m.content;
      const text = typeof c === 'string'
        ? c
        : Array.isArray(c) ? c.map((i: any) => i?.text ?? '').join(' ') : '';
      if (text) out.push({ text, score: 0 });
    }
  }
  return out;
}
