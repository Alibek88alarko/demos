// List stacking: merge distress lists by normalized address, score each property, explain the score.
(function (root) {
  var SUFFIX = { street: "st", st: "st", avenue: "ave", ave: "ave", av: "ave", drive: "dr", dr: "dr", road: "rd", rd: "rd",
    boulevard: "blvd", blvd: "blvd", lane: "ln", ln: "ln", court: "ct", ct: "ct", circle: "cir", cir: "cir", place: "pl", pl: "pl",
    way: "way", parkway: "pkwy", pkwy: "pkwy", terrace: "ter", ter: "ter" };
  var DIR = { north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w" };

  // "1234 West Oakey Boulevard, Las Vegas NV 89102" and "1234 W OAKEY BLVD" become the same key.
  function normalizeAddress(addr) {
    var line = String(addr || "").split(",")[0].toLowerCase();
    line = line.replace(/#\s*\w+|\b(apt|unit|ste|suite)\s*\w+/g, " ").replace(/[^a-z0-9\s]/g, " ");
    var words = line.split(/\s+/).filter(Boolean).map(function (w) { return SUFFIX[w] || DIR[w] || w; });
    return words.join(" ");
  }

  var DEFAULT_WEIGHTS = {
    probate: 40,
    probate_foreclosure: 25,   // extra on top of probate when a foreclosure notice is filed
    code_violation: 20,
    code_lien: 15,             // extra when the violation became a lien
    tax_delinquent: 15,
    stack_bonus: 10,           // per additional distinct list beyond the first
    years_owned_20: 5
  };

  function stack(lists, weights) {
    var w = weights || DEFAULT_WEIGHTS, props = {};
    Object.keys(lists).forEach(function (source) {
      lists[source].forEach(function (rec) {
        var key = normalizeAddress(rec.address);
        if (!key) return;
        var p = props[key] || (props[key] = { key: key, address: rec.address, owner: rec.owner || "", sources: {}, records: [] });
        if (!p.owner && rec.owner) p.owner = rec.owner;
        p.sources[source] = true;
        p.records.push({ source: source, rec: rec });
      });
    });

    return Object.keys(props).map(function (k) {
      var p = props[k], score = 0, reasons = [];
      function add(points, why) { score += points; reasons.push("+" + points + " " + why); }
      p.records.forEach(function (r) {
        var rec = r.rec;
        if (r.source === "probate") {
          add(w.probate, "probate case " + rec.case_no + " filed " + rec.filed);
          if (rec.foreclosure_notice) add(w.probate_foreclosure, "notice of default on a probate property");
        } else if (r.source === "code") {
          add(w.code_violation, "code violation: " + rec.violation);
          if (rec.lien) add(w.code_lien, "violation turned into a lien ($" + rec.lien_amount + ")");
        } else if (r.source === "tax") {
          add(w.tax_delinquent, "tax delinquent $" + rec.amount_due + " (" + rec.years + " yr)");
        }
      });
      var n = Object.keys(p.sources).length;
      if (n > 1) add(w.stack_bonus * (n - 1), "on " + n + " lists");
      var yrs = p.records.map(function (r) { return r.rec.years_owned || 0; }).reduce(function (a, b) { return Math.max(a, b); }, 0);
      if (yrs >= 20) add(w.years_owned_20, "owned " + yrs + " years (likely high equity)");
      return { address: p.address, key: p.key, owner: p.owner, lists: Object.keys(p.sources), score: score, reasons: reasons };
    }).sort(function (a, b) { return b.score - a.score || a.address.localeCompare(b.address); });
  }

  function toCSV(rows) {
    var head = ["score", "address", "owner", "lists", "reasons"];
    function q(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return [head.join(",")].concat(rows.map(function (r) {
      return [r.score, r.address, r.owner, r.lists.join(" + "), r.reasons.join("; ")].map(q).join(",");
    })).join("\n");
  }

  var api = { normalizeAddress: normalizeAddress, stack: stack, toCSV: toCSV, DEFAULT_WEIGHTS: DEFAULT_WEIGHTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Stacker = api;
})(this);
