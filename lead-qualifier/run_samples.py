"""Offline run of the 20 sample enquiries through the real pipeline (checks, scoring,
idempotency, CRM with retries). The hand-labeled extractions stand in for the model,
so this runs without an API key. Writes samples/results.md."""
import json
from datetime import date

from leadq.crm import MemoryCRM
from leadq.pipeline import Pipeline
from leadq.scoring import load_rules
from leadq.store import Store


class LabeledExtractor:
    """Returns the hand label for a known text. Counts calls to prove duplicates skip the AI."""

    def __init__(self, samples):
        self.by_text, self.calls = {}, 0
        for s in samples:
            if s.get("label"):
                self.by_text.setdefault(s["text"], s["label"])

    def extract(self, text):
        self.calls += 1
        return self.by_text[text]


def run(samples, crm=None, today=date(2026, 10, 23)):
    crm = crm or MemoryCRM(fail_times=2)           # the first two CRM calls fail with 503
    ext = LabeledExtractor(samples)
    pipe = Pipeline(Store(), ext, crm, load_rules(), today=today, sleep=lambda s: None)
    out = []
    for s in samples:
        r = pipe.process({k: s.get(k) for k in ("text", "from_email", "message_id")})
        out.append((s, r))
    return out, ext, crm


if __name__ == "__main__":
    samples = json.load(open("samples/enquiries.json"))
    out, ext, crm = run(samples)
    lines = ["# Offline run: 20 sample enquiries (sample data)", "",
             "Hand-labeled extractions stand in for the model. Everything after the model call is the real code.",
             "The CRM stand-in fails the first two calls with 503 to exercise retries.", "",
             "| # | Source | Tag | Score | Needs review | Why flagged | CRM | Duplicate |", "|---|---|---|---|---|---|---|---|"]
    for s, r in out:
        res = r.get("result") or {}
        why = "; ".join(res.get("review_reasons", [])) or (r.get("last_error") or "")
        lines.append(f"| {s['id']} | {s['source']} | {res.get('tag', '-')} | {res.get('score', '-')} | "
                     f"{'yes' if res.get('needs_review') or r['status'] == 'needs_review' else 'no'} | {why} | "
                     f"{r.get('crm_id') or r['status']} | {'yes' if r.get('duplicate') else 'no'} |")
    tags = {}
    for s, r in out:
        if not r.get("duplicate") and r.get("result"):
            tags[r["result"]["tag"]] = tags.get(r["result"]["tag"], 0) + 1
    lines += ["", f"Model calls: {ext.calls} for {len(samples)} submissions (duplicates skip the model).",
              f"CRM calls: {crm.calls}, contacts in CRM: {len(crm.contacts)}.",
              "Tags: " + ", ".join(f"{k} {v}" for k, v in sorted(tags.items()))]
    open("samples/results.md", "w").write("\n".join(lines) + "\n")
    print("\n".join(lines))
