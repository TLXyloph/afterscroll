import { readFileSync } from 'fs';
import path from 'path';

// One query surface for the whole app:
//   q<T>(sql, params) — SELECT returns rows (UPPERCASE column names per schema),
//   everything else returns [].
//
// Two backends behind the same interface, chosen at runtime:
//   - Cloudflare D1 (production): the Workers binding, via OpenNext context.
//   - better-sqlite3 (local dev): a file at .data/dev.db.
// Identical SQLite dialect either way.

// Resolve the D1 binding for this request. On Node/local, getCloudflareContext
// throws (or the module isn't a Worker context) → null → the sqlite path runs.
// Resolved per call: the binding must be read within the active request scope.
async function getD1(): Promise<any | null> {
  try {
    const mod: any = await import('@opennextjs/cloudflare');
    return mod.getCloudflareContext?.()?.env?.DB ?? null;
  } catch {
    return null;
  }
}

let sqliteDriver: { all: (s: string, p: unknown[]) => unknown[]; run: (s: string, p: unknown[]) => void } | null = null;

function getSqlite() {
  if (sqliteDriver) return sqliteDriver;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const file = process.env.DB_FILE ?? path.join(process.cwd(), '.data', 'dev.db');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('fs').mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf8'));
  sqliteDriver = {
    all: (sql, params) => db.prepare(sql).all(...(params as [])),
    run: (sql, params) => { db.prepare(sql).run(...(params as [])); },
  };
  return sqliteDriver;
}

export async function q<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  const normalized = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
  const d1 = await getD1();
  if (d1) {
    const stmt = d1.prepare(sql).bind(...normalized);
    if (/^\s*select/i.test(sql)) {
      const res = await stmt.all();
      return (res.results ?? []) as T[];
    }
    await stmt.run();
    return [];
  }
  const s = getSqlite();
  if (/^\s*select/i.test(sql)) return s.all(sql, normalized) as T[];
  s.run(sql, normalized);
  return [];
}
