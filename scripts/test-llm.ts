import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });
import { llmComplete } from '../src/lib/llm';

llmComplete('extract', 'Reply with exactly: PONG').then((r) => {
  console.log('text:', r.text, '| cost:', r.costUsd);
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
