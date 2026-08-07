export const MODEL = 'claude-opus-5';

const RATES: Record<string, { inp: number; out: number }> = {
  'claude-opus-5': { inp: 5, out: 25 },
}; // USD per 1M tokens, standard API rates (Foundry bills at these)

export function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const r = RATES[model] ?? { inp: 5, out: 25 };
  return (promptTokens * r.inp + completionTokens * r.out) / 1_000_000;
}
