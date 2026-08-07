import AnthropicFoundry from '@anthropic-ai/foundry-sdk';
import { sq } from './snowflake';
import { MODEL, costUsd } from './rates';

let client: AnthropicFoundry | null = null;
let webFetchSupported = true;

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
  sid: string,
): Promise<{ text: string; costUsd: number }> {
  const params: any = {
    model: MODEL,
    max_tokens: 4096,
    // effort is beta on Foundry — if the request 400s naming output_config, delete this line
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }],
  };
  // let Claude open links found in the post to pull dates/details
  if (callType === 'extract' && webFetchSupported) {
    params.tools = [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 3 }];
  }

  let res: any;
  try {
    res = await getClient().messages.create(params);
  } catch (err: any) {
    if (params.tools && /web_fetch|tool/i.test(err?.message ?? '')) {
      webFetchSupported = false;
      delete params.tools;
      res = await getClient().messages.create(params);
    } else {
      throw err;
    }
  }

  let pt = res.usage?.input_tokens ?? 0;
  let ct = res.usage?.output_tokens ?? 0;
  let guard = 0;
  while (res.stop_reason === 'pause_turn' && guard++ < 3) {
    params.messages = [...params.messages, { role: 'assistant', content: res.content }];
    res = await getClient().messages.create(params);
    pt += res.usage?.input_tokens ?? 0;
    ct += res.usage?.output_tokens ?? 0;
  }

  if (res.stop_reason === 'refusal') throw new Error('model declined this content');
  const text = res.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const cost = costUsd(MODEL, pt, ct);
  await sq(
    `INSERT INTO TOKEN_LEDGER (ID, USER_ID, CALL_TYPE, MODEL, PROMPT_TOKENS, COMPLETION_TOKENS, COST_USD, CREATED_AT) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP())`,
    [crypto.randomUUID(), sid, callType, MODEL, pt, ct, cost],
  );
  return { text, costUsd: cost };
}
