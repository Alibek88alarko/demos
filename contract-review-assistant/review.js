// Contract review engine: deterministic playbook rules + verification of AI quotes.
// Works in the browser (window.Review) and in Node (module.exports).
(function (root) {
  var WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
    fifteen: 15, twenty: 20, thirty: 30, "forty-five": 45, sixty: 60, ninety: 90 };

  function norm(s) { return String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase(); }

  // Split "1. Title ... text" sections so every finding can point to a section number.
  function sections(text) {
    var out = [], re = /^(\d+)\.\s+([^\n]+)\n([\s\S]*?)(?=^\d+\.\s|\s*$(?![\s\S]))/gm, m;
    while ((m = re.exec(text))) out.push({ num: m[1], title: m[2].trim(), body: m[3].trim() });
    return out;
  }
  function find(text, re) {
    var secs = sections(text);
    for (var i = 0; i < secs.length; i++) {
      var m = secs[i].body.match(re);
      if (m) return { section: secs[i].num + ". " + secs[i].title, quote: m[0], groups: m };
    }
    return null;
  }
  function num(word, digits) { return digits ? parseInt(digits, 10) : WORDS[String(word).toLowerCase()]; }

  var RULES = [
    { id: "law", label: "Governing law", param: "Ontario", unit: "province",
      check: function (t, p) {
        var f = find(t, /governed by the laws of the Province of ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/);
        if (!f) return { status: "missing", note: "No governing law clause found." };
        var ok = f.groups[1].toLowerCase() === String(p).toLowerCase();
        return { status: ok ? "pass" : "flag", section: f.section, quote: f.quote,
          note: ok ? "Matches the playbook." : "Contract says " + f.groups[1] + ", playbook requires " + p + "." };
      } },
    { id: "pay", label: "Payment terms, max days", param: 30, unit: "days",
      check: function (t, p) {
        var f = find(t, /within ([a-z-]+) \((\d+)\) days (?:of|after) (?:receipt of )?(?:each |the )?invoice/i);
        if (!f) return { status: "missing", note: "No payment period found." };
        var d = num(f.groups[1], f.groups[2]);
        return { status: d <= p ? "pass" : "flag", section: f.section, quote: f.quote,
          note: d + " days" + (d <= p ? ", within " : ", above the ") + p + "-day limit." };
      } },
    { id: "renew", label: "Auto-renewal notice, min days", param: 60, unit: "days",
      check: function (t, p) {
        var f = find(t, /automatically renew[\s\S]*?at least ([a-z-]+) \((\d+)\) days/i);
        if (!f) return { status: "pass", note: "No automatic renewal." };
        var d = num(f.groups[1], f.groups[2]);
        return { status: d >= p ? "pass" : "flag", section: f.section, quote: f.quote,
          note: d + " days notice" + (d >= p ? ", meets " : ", less than ") + "the " + p + "-day minimum." };
      } },
    { id: "cap", label: "Liability cap, min months of fees", param: 12, unit: "months",
      check: function (t, p) {
        var f = find(t, /shall not exceed the (?:total )?fees paid[^.]*?in the ([a-z-]+) \((\d+)\) months?/i);
        if (!f) return { status: "missing", note: "No liability cap found." };
        var mth = num(f.groups[1], f.groups[2]);
        return { status: mth >= p ? "pass" : "flag", section: f.section, quote: f.quote,
          note: "Cap equals " + mth + " months of fees" + (mth >= p ? "." : ", playbook asks for at least " + p + ".") };
      } },
    { id: "conf", label: "Confidentiality survives, min years", param: 2, unit: "years",
      check: function (t, p) {
        var f = find(t, /for ([a-z-]+) \((\d+)\) years? (?:after|following) (?:the )?(?:termination|expiry)/i);
        if (!f) return { status: "missing", note: "No survival period for confidentiality." };
        var y = num(f.groups[1], f.groups[2]);
        return { status: y >= p ? "pass" : "flag", section: f.section, quote: f.quote,
          note: y + " years" + (y >= p ? ", meets the minimum." : ", below the " + p + "-year minimum.") };
      } },
    { id: "assign", label: "No assignment without consent", param: true, unit: "",
      check: function (t) {
        var f = find(t, /(\w+) may assign this Agreement[^.]*without (?:the )?(?:prior )?(?:written )?consent[^.]*\./i);
        if (!f) return { status: "pass", note: "No one-sided assignment right found." };
        return { status: "flag", section: f.section, quote: f.quote, note: f.groups[1] + " can assign without consent." };
      } }
  ];

  function runRules(text, params) {
    return RULES.map(function (r) {
      var p = params && params[r.id] !== undefined ? params[r.id] : r.param;
      var res = r.check(text, p);
      res.id = r.id; res.label = r.label; res.param = p;
      return res;
    });
  }

  // An AI review point is shown to a lawyer only if its quote exists in the document word for word.
  function verifyQuote(text, quote) { return !!quote && norm(text).indexOf(norm(quote)) !== -1; }
  function verifyPoints(text, points) {
    return points.map(function (pt) { var c = Object.assign({}, pt); c.verified = verifyQuote(text, pt.quote); return c; });
  }

  var api = { sections: sections, runRules: runRules, verifyQuote: verifyQuote, verifyPoints: verifyPoints, RULES: RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Review = api;
})(this);
