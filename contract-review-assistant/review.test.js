const assert = require("assert");
const R = require("./review.js");
const { SAMPLE_CONTRACT: T, SAMPLE_AI: AI } = require("./sample.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", name); };

t("splits 10 sections", () => assert.strictEqual(R.sections(T).length, 10));
const res = Object.fromEntries(R.runRules(T).map(r => [r.id, r]));
t("governing law flagged: BC vs Ontario", () => { assert.strictEqual(res.law.status, "flag"); assert.match(res.law.note, /British Columbia/); assert.match(res.law.section, /^10\./); });
t("payment 45 days flagged at 30", () => { assert.strictEqual(res.pay.status, "flag"); assert.match(res.pay.note, /^45 days/); });
t("renewal notice 30 flagged at 60", () => assert.strictEqual(res.renew.status, "flag"));
t("liability cap 3 months flagged at 12", () => assert.strictEqual(res.cap.status, "flag"));
t("confidentiality 2 years passes", () => assert.strictEqual(res.conf.status, "pass"));
t("one-sided assignment flagged", () => { assert.strictEqual(res.assign.status, "flag"); assert.match(res.assign.note, /^Supplier/); });
t("playbook change flips result", () => {
  const r = Object.fromEntries(R.runRules(T, { pay: 60, law: "British Columbia" }).map(x => [x.id, x]));
  assert.strictEqual(r.pay.status, "pass"); assert.strictEqual(r.law.status, "pass");
});
const v = R.verifyPoints(T, AI.points);
t("4 real quotes verified", () => assert.strictEqual(v.filter(p => p.verified).length, 4));
t("invented quote rejected", () => assert.strictEqual(v[4].verified, false));
t("quote check ignores spacing and case", () => assert.ok(R.verifyQuote(T, "client shall   INDEMNIFY, defend")));
console.log(n + " tests passed");
