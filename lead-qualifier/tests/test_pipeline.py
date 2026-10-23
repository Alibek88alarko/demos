import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest

from leadq.crm import CRMError, MemoryCRM, with_retries
from leadq.extract import verify
from leadq.pipeline import Pipeline
from leadq.scoring import load_rules, score
from leadq.store import Store
from run_samples import LabeledExtractor, run

SAMPLES = json.load(open(ROOT / "samples/enquiries.json"))
RULES = load_rules(ROOT / "scoring.yaml")
TODAY = date(2026, 10, 23)


def pipe(crm=None):
    return Pipeline(Store(), LabeledExtractor(SAMPLES), crm or MemoryCRM(), RULES, today=TODAY, sleep=lambda s: None)


def test_guessed_phone_is_removed_and_flagged():
    s = SAMPLES[6]                       # label invents a phone number
    fields, problems = verify(s["label"], s["text"])
    assert fields["phone"] is None
    assert any("phone" in p for p in problems)


def test_guessed_budget_is_removed():
    s = SAMPLES[11]                      # "Budget not decided" but label says 3000
    fields, problems = verify(s["label"], s["text"])
    assert fields["budget_usd"] is None and any("budget_usd" in p for p in problems)


def test_true_fields_survive():
    fields, problems = verify(SAMPLES[0]["label"], SAMPLES[0]["text"])
    assert problems == []
    assert fields["budget_usd"] == 6500 and fields["email"] == "laura.bennett@northwind.example"


def test_rules_decide_the_tag():
    hot = {"budget_usd": 6500, "event_date": "2026-11-12", "service_type": "corporate_catering",
           "company": "X", "phone": "1", "urgency": "normal"}
    assert score(hot, RULES, TODAY)[1] == "Hot"
    assert score({}, RULES, TODAY)[1] == "Cold"


def test_double_submit_creates_one_lead():
    crm = MemoryCRM()
    p = pipe(crm)
    first = p.process({"text": SAMPLES[0]["text"]})
    second = p.process({"text": SAMPLES[0]["text"]})
    assert second["duplicate"] is True and second["crm_id"] == first["crm_id"]
    assert crm.calls == 1 and len(crm.contacts) == 1


def test_same_email_message_id_twice_skips_model():
    p = pipe()
    e = {k: SAMPLES[18].get(k) for k in ("text", "from_email", "message_id")}
    p.process(e); p.process(e)
    assert p.extractor.calls == 1


def test_crm_retries_then_succeeds():
    crm = MemoryCRM(fail_times=2, status=503)
    r = pipe(crm).process({"text": SAMPLES[0]["text"]})
    assert r["status"] == "in_crm" and r["attempts"] == 3


def test_crm_down_is_not_lost_and_can_be_retried():
    crm = MemoryCRM(fail_times=10, status=503)
    p = pipe(crm)
    r = p.process({"text": SAMPLES[0]["text"]})
    assert r["status"] == "crm_failed"
    crm.fail_times = 0
    again = p.retry_failed()
    assert again[0]["status"] == "in_crm" and len(crm.contacts) == 1


def test_bad_request_is_not_retried():
    calls = []
    def boom():
        calls.append(1); raise CRMError("400", retryable=False)
    with pytest.raises(CRMError):
        with_retries(boom, sleep=lambda s: None)
    assert len(calls) == 1


def test_low_confidence_goes_to_review():
    r = pipe().process({"text": SAMPLES[8]["text"]})
    assert r["status"] == "needs_review"


def test_all_twenty_samples():
    out, ext, crm = run(SAMPLES)
    assert len(out) == 20
    assert ext.calls == 18                       # two duplicates never reach the model
    dupes = [r for _, r in out if r.get("duplicate")]
    assert len(dupes) == 2
    assert all(r["status"] in ("in_crm", "needs_review") for _, r in out)
    assert len(crm.contacts) == 15
