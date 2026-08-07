import AnthropicFoundry from '@anthropic-ai/foundry-sdk';
import { sq } from './snowflake';
import { MODEL, costUsd } from './rates';

let client: AnthropicFoundry | null = null;

function getClient(): AnthropicFoundry {
  if (!client) {
    // env accepts a bare Foundry resource name or the full endpoint URL
    const raw = process.env.AZURE_ANTHROPIC_RESOURCE!;
    const resource = raw.startsWith('http') ? new URL(raw).hostname.split('.')[0] : raw;
    client = new AnthropicFoundry({
      apiKey: process.env.AZURE_ANTHROPIC_API_KEY!,
      resource,
    });
  }
  return client;
}

export async function llmComplete(
  callType: 'extract' | 'ask',
  prompt: string,
): Promise<{ text: string; costUsd: number }> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    // effort is beta on Foundry — if the request 400s naming output_config, delete this line
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }],
  } as any);
  if (res.stop_reason === 'refusal') throw new Error('model declined this content');
  const text = res.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const pt = res.usage?.input_tokens ?? 0;
  const ct = res.usage?.output_tokens ?? 0;
  const cost = costUsd(MODEL, pt, ct);
  await sq(
    `INSERT INTO TOKEN_LEDGER (ID, CALL_TYPE, MODEL, PROMPT_TOKENS, COMPLETION_TOKENS, COST_USD, CREATED_AT) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP())`,
    [crypto.randomUUID(), callType, MODEL, pt, ct, cost],
  );
  return { text, costUsd: cost };
}
