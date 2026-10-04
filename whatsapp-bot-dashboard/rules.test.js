// Run: node rules.test.js
const assert = require("assert");
const { decide } = require("./rules.js");

const groups = [
  { id: "bakery", enabled: true },
  { id: "football", enabled: false },
  { id: "support", enabled: true }
];
const rules = [
  { id: 1, name: "Prices", type: "keyword", trigger: "price, how much, cost", reply: "PRICE LIST", groups: ["bakery"], enabled: true },
  { id: 2, name: "Group rules", type: "exact", trigger: "rules", reply: "RULES", groups: "all", enabled: true },
  { id: 3, name: "After hours", type: "hours", trigger: "09:00-18:00", reply: "WE ARE CLOSED", groups: ["support"], enabled: true },
  { id: 4, name: "Disabled", type: "keyword", trigger: "hello", reply: "HI", groups: "all", enabled: false }
];
const at = h => new Date(2026, 9, 4, h, 30);
let n = 0;
function test(name, fn) { fn(); n++; console.log("ok -", name); }

test("keyword matches inside a sentence, any case", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "bakery", text: "Hi! How much is the sourdough?" }, at(12)).reply, "PRICE LIST");
});
test("keyword needs a whole word: 'priceless' is not 'price'", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "bakery", text: "That cake was priceless" }, at(12)).reply, null);
});
test("rule limited to one group doesn't fire in another", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "support", text: "what's the price" }, at(12)).reason, "no rule matched");
});
test("exact rule needs the whole message", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "support", text: "Rules?" }, at(12)).reply, "RULES");
  assert.strictEqual(decide(rules, groups, { groupId: "support", text: "what are the rules here" }, at(12)).reply, null);
});
test("paused group: bot stays silent", () => {
  const d = decide(rules, groups, { groupId: "football", text: "rules" }, at(12));
  assert.strictEqual(d.reply, null);
  assert.strictEqual(d.reason, "group paused");
});
test("after-hours rule fires only outside working hours", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "support", text: "my login is broken" }, at(21)).reply, "WE ARE CLOSED");
  assert.strictEqual(decide(rules, groups, { groupId: "support", text: "my login is broken" }, at(11)).reply, null);
});
test("disabled rule never fires", () => {
  assert.strictEqual(decide(rules, groups, { groupId: "bakery", text: "hello" }, at(12)).reply, null);
});
console.log(`\n${n} tests passed`);
