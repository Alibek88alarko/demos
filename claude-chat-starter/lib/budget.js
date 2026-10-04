// Monthly spend cap. Cost is computed from the token usage the API returns on every reply.
// Prices: USD per 1M tokens (Anthropic first-party rates). Thinking tokens bill as output tokens.
export const PRICES = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function costUSD(model, usage) {
  const p = PRICES[model];
  if (!p) throw new Error(`No price for model ${model}; add it to PRICES`);
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  return (input * p.input + (usage.output_tokens || 0) * p.output) / 1e6;
}

export function monthKey(date = new Date()) {
  return `spend:${date.toISOString().slice(0, 7)}`; // spend:2026-10
}

// Storage: Upstash Redis REST (works on Vercel and Netlify). In-memory fallback for local tests only.
export function makeStore(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL, token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const mem = new Map();
    return {
      get: async (k) => Number(mem.get(k) || 0),
      add: async (k, v) => { const n = Number(mem.get(k) || 0) + v; mem.set(k, n); return n; },
    };
  }
  const call = async (path) => {
    const r = await fetch(`${url}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Spend store error ${r.status}`);
    return (await r.json()).result;
  };
  return {
    get: async (k) => Number((await call(`get/${encodeURIComponent(k)}`)) || 0),
    add: async (k, v) => Number(await call(`incrbyfloat/${encodeURIComponent(k)}/${v.toFixed(6)}`)),
  };
}

export async function underCap(store, capUSD, date) {
  const spent = await store.get(monthKey(date));
  return { ok: spent < capUSD, spent };
}
