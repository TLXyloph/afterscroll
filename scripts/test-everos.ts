import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });
import { storeMemory, flushMemories, searchMemories } from '../src/lib/everos';

const SID = 'script-test';

async function main() {
  const id = await storeMemory(SID, 'Prewarm your cache before traffic spikes. Source: https://x.com/i/status/test');
  console.log('stored id:', id);
  await flushMemories(SID);
  for (let attempt = 1; attempt <= 5; attempt++) {
    await new Promise((r) => setTimeout(r, 6000));
    const hits = await searchMemories(SID, 'what was the tip about caches?');
    console.log(`attempt ${attempt}:`, hits.length, 'hits');
    if (hits.length) {
      console.log(hits[0]);
      return;
    }
  }
  throw new Error('no hits after 30s — check flush/extraction or search shape');
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
