// Run: node stacker.test.js
const assert = require("assert");
const { normalizeAddress, stack, toCSV } = require("./stacker.js");
const data = require("./sample-data.js");
let n = 0;
function test(name, fn) { fn(); n++; console.log("ok -", name); }

test("address variants collapse to one key", () => {
  const k = normalizeAddress("1234 West Oakey Boulevard, Las Vegas NV 89102");
  assert.strictEqual(k, "1234 w oakey blvd");
  assert.strictEqual(normalizeAddress("1234 W OAKEY BLVD"), k);
  assert.strictEqual(normalizeAddress("1234 W. Oakey Blvd."), k);
});
test("unit numbers are dropped", () => {
  assert.strictEqual(normalizeAddress("872 Sunset Rd #B, Henderson"), "872 sunset rd");
});
const rows = stack(data);
test("house on all three lists ranks first", () => {
  assert.strictEqual(rows[0].key, "1234 w oakey blvd");
  assert.deepStrictEqual(rows[0].lists.sort(), ["code", "probate", "tax"]);
});
test("score is the sum of its reasons", () => {
  rows.forEach(r => {
    const sum = r.reasons.reduce((s, x) => s + parseInt(x.slice(1), 10), 0);
    assert.strictEqual(sum, r.score, r.address);
  });
});
test("top lead score: probate 40 + NOD 25 + code 20 + lien 15 + tax 15 + 2 extra lists 20 + 31 yrs 5 = 140", () => {
  assert.strictEqual(rows[0].score, 140);
});
test("every input property appears once", () => {
  assert.strictEqual(rows.length, 8); // 5 probate + 2 new from code + 1 new from tax
  assert.strictEqual(new Set(rows.map(r => r.key)).size, rows.length);
});
test("CSV has a header and one line per property", () => {
  const lines = toCSV(rows).split("\n");
  assert.strictEqual(lines[0], "score,address,owner,lists,reasons");
  assert.strictEqual(lines.length, rows.length + 1);
});
console.log(`\n${n} tests passed`);
