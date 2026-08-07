import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });
import { sq } from '../src/lib/snowflake';

// clears synced content so a demo starts fresh; TOKEN_LEDGER is kept on
// purpose — lifetime cost is part of the pitch
async function main() {
  for (const t of ['TODOS', 'EVENT_SUGGESTIONS', 'INSIGHTS', 'BOOKMARKS']) {
    await sq(`DELETE FROM ${t}`);
    console.log('cleared', t);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
