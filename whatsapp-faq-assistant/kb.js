// Grounded FAQ bot core: retrieval over approved entries + answers built only from retrieved data.
// Browser: window.KB ; Node: module.exports
(function (root) {
  var STOP = "a an the is are am i you we our your my me it to of for in on at and or do does did can could would will with what how when where which who this that there any about please hi hello hey".split(" ");
  var SYN = { refund: "return", refunds: "return", returning: "return", returns: "return", send: "return", back: "return",
    delivery: "shipping", deliver: "shipping", ship: "shipping", shipped: "shipping", arrive: "shipping", arrives: "shipping",
    dimensions: "size", dimension: "size", sizes: "size", big: "size", large: "size", measurements: "size", fit: "size",
    cost: "price", much: "price", prices: "price", stock: "available", availability: "available", have: "available", left: "available",
    broken: "damaged", damage: "damaged", cracked: "damaged", track: "tracking", where: "tracking", order: "order",
    throw: "blanket", blankets: "blanket", towels: "towel", candles: "candle", rugs: "rug", vases: "vase", baskets: "basket" };
  function tokens(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w && STOP.indexOf(w) < 0; })
      .reduce(function (out, w) { out.push(w); if (SYN[w]) out.push(SYN[w]); return out; }, []);
  }
  // Policy questions (returns, shipping, damage, tracking) are answered from the FAQ even if a product is named.
  var POLICY = ["return", "shipping", "damaged", "tracking", "refund"];
  function isPolicy(q) { var t = tokens(q); return POLICY.some(function (w) { return t.indexOf(w) >= 0; }); }
  function entryText(e) { return e.type === "faq" ? e.title + " " + e.keywords + " " + e.answer : e.name + " " + e.keywords + " " + e.material; }

  // Score each approved entry by token overlap; product names count double.
  function retrieve(kb, question, k) {
    var q = tokens(question), res = [];
    kb.forEach(function (e) {
      var t = tokens(entryText(e)), name = e.type === "product" ? tokens(e.name) : [], s = 0;
      q.forEach(function (w) { if (t.indexOf(w) >= 0) s += 1; if (name.indexOf(w) >= 0) s += 1.5; });
      if (s > 0) res.push({ entry: e, score: s });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, k || 3);
  }

  var MIN_SCORE = 1;
  function intent(q) {
    var t = tokens(q);
    if (t.indexOf("size") >= 0) return "size";
    if (t.indexOf("price") >= 0) return "price";
    if (t.indexOf("available") >= 0 || /\bin stock\b|\bking\b|\bqueen\b|\btwin\b/i.test(q)) return "available";
    if (t.indexOf("material") >= 0 || /made of|fabric/i.test(q)) return "material";
    return "general";
  }

  // Reply is composed ONLY from retrieved fields. No match = fallback + handover, never a guess.
  function answer(kb, question) {
    var pool = isPolicy(question) ? kb.filter(function (e) { return e.type === "faq"; }) : kb;
    var hits = retrieve(pool, question, 3), top = hits[0];
    if (!top || top.score < MIN_SCORE) {
      return { handover: true, sources: [], text: "Thanks for your message! I don't have that information yet, so I'm passing you to our support team. Someone will reply here shortly." };
    }
    var e = top.entry;
    if (e.type === "faq") return { handover: false, sources: [{ id: e.id, label: "FAQ: " + e.title }], text: e.answer };
    var it = intent(question), txt;
    if (it === "size") txt = e.name + " comes in: " + e.sizes.map(function (s) { return s.label + " (" + s.dims + ")"; }).join(", ") + ".";
    else if (it === "price") txt = e.name + ": " + e.sizes.map(function (s) { return s.label + " $" + s.price; }).join(", ") + ".";
    else if (it === "available") {
      var inS = e.sizes.filter(function (s) { return s.stock > 0; }), outS = e.sizes.filter(function (s) { return s.stock === 0; });
      txt = e.name + " is in stock in " + (inS.length ? inS.map(function (s) { return s.label; }).join(", ") : "no sizes right now") +
        (outS.length ? ". Out of stock: " + outS.map(function (s) { return s.label; }).join(", ") + "." : ".");
    } else if (it === "material") txt = e.name + " is made of " + e.material + ".";
    else txt = e.name + ": " + e.material + ". Sizes: " + e.sizes.map(function (s) { return s.label + " $" + s.price; }).join(", ") + ".";
    return { handover: false, sources: [{ id: e.id, label: "Catalog: " + e.id + " " + e.name + " (" + it + ")" }], text: txt };
  }

  var api = { isPolicy: isPolicy, tokens: tokens, retrieve: retrieve, answer: answer, intent: intent, MIN_SCORE: MIN_SCORE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KB = api;
})(this);
