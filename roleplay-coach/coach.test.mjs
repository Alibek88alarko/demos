import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, validateScenario, parseJudge, weightedScore, toXapi, judgeSchema, actorSystemPrompt } from "./coach.js";
import { SAMPLE } from "./sample.js";

const s = SCENARIOS[0];

test("built-in scenarios are valid", () => {
  for (const sc of SCENARIOS) assert.deepEqual(validateScenario(sc), []);
});

test("broken scenario is reported", () => {
  const errs = validateScenario({ id: "x", title: "", persona: {}, rubric: [{ id: "a", name: "A", weight: 0 }] });
  assert.ok(errs.some(e => e.includes("title")));
  assert.ok(errs.some(e => e.includes("weight")));
});

test("sample judge output parses and quotes are found", () => {
  const r = parseJudge(JSON.stringify(SAMPLE.judge), s, SAMPLE.turns);
  assert.equal(r.ok, true);
  assert.equal(r.criteria.length, s.rubric.length);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.score, 78);
});

test("non-JSON reply goes to human review", () => {
  const r = parseJudge("Sorry, I cannot score this.", s, SAMPLE.turns);
  assert.equal(r.ok, false);
  assert.match(r.error, /human review/);
});

test("JSON inside extra text is still read", () => {
  const r = parseJudge("Here you go: " + JSON.stringify(SAMPLE.judge), s, SAMPLE.turns);
  assert.equal(r.ok, true);
});

test("missing criterion and bad score are rejected", () => {
  const missing = { ...SAMPLE.judge, criteria: SAMPLE.judge.criteria.slice(1) };
  assert.equal(parseJudge(missing, s, SAMPLE.turns).ok, false);
  const bad = { ...SAMPLE.judge, criteria: SAMPLE.judge.criteria.map((c, i) => i ? c : { ...c, score: 7 }) };
  assert.equal(parseJudge(bad, s, SAMPLE.turns).ok, false);
});

test("made-up quote is flagged", () => {
  const fake = { ...SAMPLE.judge, criteria: SAMPLE.judge.criteria.map((c, i) => i ? c : { ...c, evidence: "I promise a 50% discount." }) };
  const r = parseJudge(fake, s, SAMPLE.turns);
  assert.equal(r.ok, true);
  assert.equal(r.criteria[0].quoteFound, false);
  assert.equal(r.warnings.length, 1);
});

test("weighted score edges", () => {
  assert.equal(weightedScore(s.rubric.map(c => ({ ...c, score: 5 }))), 100);
  assert.equal(weightedScore(s.rubric.map(c => ({ ...c, score: 1 }))), 0);
});

test("xAPI statement shape", () => {
  const r = parseJudge(SAMPLE.judge, s, SAMPLE.turns);
  const st = toXapi({ learnerName: "A", learnerEmail: "a@example.com", scenario: s, result: r, startedAt: SAMPLE.startedAt, endedAt: SAMPLE.endedAt });
  assert.equal(st.result.score.scaled, 0.78);
  assert.equal(st.result.success, true);
  assert.equal(st.result.duration, "PT11M40S");
  assert.equal(st.context.extensions["https://example.com/xapi/rubric"]["next-step"], 5);
});

test("schema and prompts use the scenario", () => {
  assert.deepEqual(judgeSchema(s).properties.criteria.items.properties.id.enum, s.rubric.map(c => c.id));
  assert.match(actorSystemPrompt(s), /Dana Ortiz/);
});
