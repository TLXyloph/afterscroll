function ns(sid: string): { user: string; session: string } {
  return { user: `afterscroll-${sid}`, session: `bm-${sid}` };
}

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

export async function storeMemory(sid: string, text: string): Promise<string> {
  const { user, session } = ns(sid);
  const j = await ev('/api/v2/memory/add', {
    session_id: session,
    messages: [{ sender_id: user, role: 'user', timestamp: Date.now(), content: text }],
  });
  return String(j?.request_id ?? '');
}

// extraction is async server-side; flush once after a batch of stores so
// memories are searchable within the demo window
export async function flushMemories(sid: string): Promise<void> {
  const { user, session } = ns(sid);
  await ev('/api/v2/memory/flush', { session_id: session, user_id: user }).catch((err) => {
    console.error('everos flush failed (non-fatal):', err);
  });
}

export async function searchMemories(sid: string, query: string): Promise<{ text: string; score: number }[]> {
  const { user } = ns(sid);
  const j = await ev('/api/v2/memory/search', { query, user_id: user, top_k: 5 });
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
