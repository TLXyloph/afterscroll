import { readFileSync } from 'fs';
import path from 'path';

// One query surface for the whole app:
//   q<T>(sql, params) — SELECT returns rows (column names as written in schema,
//   uppercase), everything else returns [].
//
// Two backends behind the same interface:
//   - Cloudflare D1 (production): resolved per-request from the Workers binding.
//   - better-sqlite3 (local dev / `npm run dev`): a file at .data/dev.db.
// The SQL is identical SQLite dialect either way.

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

// Returns the D1 database binding when running on Cloudflare, else null.
async function getD1(): Promise<any | null> {
  if (!process.env.CF_D1) return null; // set by wrangler when the binding exists
  try {
    // dynamic import so local/Node builds never resolve the Workers-only module
    const mod: any = await import('@opennextjs/cloudflare');
    return mod.getCloudflareContext().env.DB ?? null;
  } catch {
    return null;
  }
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
