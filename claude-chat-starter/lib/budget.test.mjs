// Run: node lib/budget.test.mjs
import assert from "node:assert";
import { costUSD, makeStore, monthKey, underCap } from "./budget.js";
let n = 0; const test = async (name, fn) => { await fn(); n++; console.log("ok -", name); };

await test("cost from usage: 1M input + 1M output on Opus 5.5 = $24", () => {
  assert.strictEqual(costUSD("claude-opus-5-5", { input_tokens: 1e6, output_tokens: 1e6 }), 24);
});
await test("a typical chat reply costs fractions of a cent", () => {
  const c = costUSD("claude-opus-5-5", { input_tokens: 1200, output_tokens: 250 });
  assert.ok(Math.abs(c - 0.0098) < 1e-9, c);
});
await test("unknown model is refused, not guessed", () => {
  assert.throws(() => costUSD("some-model", { input_tokens: 1 }), /No price/);
});
await test("month key rolls over each month", () => {
  assert.strictEqual(monthKey(new Date("2026-10-31T23:00:00Z")), "spend:2026-10");
  assert.strictEqual(monthKey(new Date("2026-11-01T00:00:00Z")), "spend:2026-11");
});
await test("cap blocks once spend reaches the limit", async () => {
  const store = makeStore({}); const d = new Date("2026-10-05T00:00:00Z");
  assert.strictEqual((await underCap(store, 1, d)).ok, true);
  await store.add(monthKey(d), 0.6); await store.add(monthKey(d), 0.4);
  assert.strictEqual((await underCap(store, 1, d)).ok, false);
});
console.log(`\n${n} tests passed`);
