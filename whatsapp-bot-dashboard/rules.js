// Reply-rule engine: decides whether the bot answers a group message, and why.
(function (root) {
  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s:]/gu, " ").replace(/\s+/g, " ").trim();
  }

  function inHours(range, date) {
    var m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(range).replace(/\s/g, ""));
    if (!m) throw new Error("Bad hours range: " + range);
    var mins = date.getHours() * 60 + date.getMinutes();
    var from = +m[1] * 60 + +m[2], to = +m[3] * 60 + +m[4];
    return mins >= from && mins < to;
  }

  function appliesTo(rule, groupId) {
    return rule.groups === "all" || (rule.groups || []).indexOf(groupId) !== -1;
  }

  function matches(rule, text, date) {
    var t = norm(text);
    if (rule.type === "exact") return t === norm(rule.trigger);
    if (rule.type === "keyword") {
      var padded = " " + t + " ";
      return rule.trigger.split(",").some(function (k) {
        k = norm(k);
        return k && padded.indexOf(" " + k + " ") !== -1;
      });
    }
    if (rule.type === "hours") return !inHours(rule.trigger, date);
    throw new Error("Unknown rule type: " + rule.type);
  }

  // Returns { reply, rule, reason }. reply is null when the bot stays silent.
  function decide(rules, groups, msg, date) {
    var group = groups.filter(function (g) { return g.id === msg.groupId; })[0];
    if (!group) return { reply: null, rule: null, reason: "unknown group" };
    if (!group.enabled) return { reply: null, rule: null, reason: "group paused" };
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.enabled && appliesTo(r, msg.groupId) && matches(r, msg.text, date || new Date())) {
        return { reply: r.reply, rule: r, reason: "rule: " + r.name };
      }
    }
    return { reply: null, rule: null, reason: "no rule matched" };
  }

  var api = { decide: decide, matches: matches, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rules = api;
})(this);
