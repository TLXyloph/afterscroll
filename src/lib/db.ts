import { readFileSync } from 'fs';
import path from 'path';

// One query surface for the whole app:
//   q<T>(sql, params) — SELECT returns rows (column names as written in schema,
//   uppercase), everything else returns [].
// Local/dev: better-sqlite3 file at .data/dev.db.
// Production (Cloudflare): workstream G replaces getDriver() with the D1
// binding — same SQL, same placeholders, nothing else changes.

type Driver = {
  all: (sql: string, params: unknown[]) => unknown[];
  run: (sql: string, params: unknown[]) => void;
};

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const file = process.env.DB_FILE ?? path.join(process.cwd(), '.data', 'dev.db');
  require('fs').mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(readFileSync(path.join(process.cwd(), 'src', 'lib', 'schema.sql'), 'utf8'));
  driver = {
    all: (sql, params) => db.prepare(sql).all(...(params as [])),
    run: (sql, params) => { db.prepare(sql).run(...(params as [])); },
  };
  return driver;
}

export async function q<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  const d = getDriver();
  const normalized = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
  if (/^\s*select/i.test(sql)) return d.all(sql, normalized) as T[];
  d.run(sql, normalized);
  return [];
}
