export function fixture(path: string, _init?: RequestInit): unknown {
  if (path === '/api/connections') return { x: true, google: false };
  if (path === '/api/sync') return { synced: 3, todos: 2, events: 1, insights: 2, needsReview: 0, costUsd: 0.0042 };
  if (path === '/api/todos') return { todos: [
    { id: 't1', tweetId: 'seed-001', title: 'Set up cache prewarming on deploy', category: 'coding', done: false, createdAt: '2026-08-07T11:00:00' },
    { id: 't2', tweetId: 'seed-004', title: 'Write 3 STAR stories before next interview', category: 'career', done: true, createdAt: '2026-08-07T11:00:00' },
  ] };
  if (path.startsWith('/api/todos/')) return { ok: true };
  if (path === '/api/events') return { events: [
    { id: 'e1', tweetId: 'seed-002', title: 'Zone 2 morning routine', startTs: '2026-08-08T07:00:00', durationMin: 12, added: false },
    { id: 'e2', tweetId: 'seed-003', title: 'AI infra meetup — Menlo Park', startTs: '2026-08-14T18:00:00', durationMin: 120, added: false },
  ] };
  if (path.startsWith('/api/events/')) return { ok: true };
  if (path === '/api/insights') return { insights: [
    { id: 'i1', tweetId: 'seed-001', text: 'Prewarm caches on deploy, not on first request.', category: 'coding', sourceUrl: 'https://x.com/i/status/seed-001', createdAt: '2026-08-07T11:00:00' },
    { id: 'i2', tweetId: 'seed-005', text: 'Auto-transfer 10% of each paycheck to savings on payday.', category: 'finance', sourceUrl: 'https://x.com/i/status/seed-005', createdAt: '2026-08-07T11:00:00' },
  ] };
  if (path === '/api/ask') return { answer: 'You saved a tip about prewarming caches on deploy so traffic spikes never hit a cold cache. [1]', sources: [{ text: 'Prewarm caches on deploy, not on first request. Source: https://x.com/i/status/seed-001' }], costUsd: 0.0009 };
  if (path === '/api/economics') return { lifetimeCostUsd: 0.0873, totalCalls: 21, totalTokens: 18450 };
  throw new Error(`no fixture for ${path}`);
}
