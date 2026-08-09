import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });
import { q } from '../src/lib/db';

// clears synced content; keeps accounts, sessions, tokens, and spend log
async function main() {
  for (const t of ['TODOS', 'EVENT_SUGGESTIONS', 'INSIGHTS', 'BOOKMARKS']) {
    await q(`DELETE FROM ${t}`);
    console.log('cleared', t);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
