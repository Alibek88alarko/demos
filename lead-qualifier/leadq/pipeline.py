"""One enquiry in, one CRM lead out, at most once."""
from datetime import date, datetime, timezone

from .crm import CRMError, with_retries
from .extract import ExtractionError, verify
from .scoring import review_reasons, score
from .store import idempotency_key


def draft_ack(fields: dict) -> str:
    """Acknowledgement draft, saved for a person to review. Never sent automatically."""
    name = (fields.get("name") or "").split(" ")[0] or "there"
    what = (fields.get("service_type") or "your event").replace("_", " ")
    when = f" on {fields['event_date']}" if fields.get("event_date") else ""
    return (f"Hi {name},\n\nThanks for your enquiry about {what}{when}. "
            "A member of our team will reply within one business day.\n\nBest regards")


class Pipeline:
    def __init__(self, store, extractor, crm, rules, today=None, sleep=None):
        self.store, self.extractor, self.crm, self.rules = store, extractor, crm, rules
        self.today = today or date.today()
        self.sleep = sleep

    def process(self, enquiry: dict) -> dict:
        key = idempotency_key(enquiry)
        received = enquiry.get("received_at") or datetime.now(timezone.utc).isoformat()
        if not self.store.claim(key, received, enquiry["text"]):
            existing = self.store.get(key)
            if existing["status"] == "crm_failed":
                return self.push(key)          # safe to resume: CRM upsert is by email
            return {**existing, "duplicate": True}
        try:
            raw = self.extractor.extract(enquiry["text"])
        except ExtractionError as e:
            self.store.update(key, status="needs_review", last_error=f"extraction: {e}")
            return {**self.store.get(key), "duplicate": False}
        fields, problems = verify(raw, enquiry["text"])
        if not fields.get("email") and enquiry.get("from_email"):
            fields["email"] = enquiry["from_email"]          # sender address of the email itself
        points, tag, reasons = score(fields, self.rules, self.today)
        review = review_reasons(fields, float(raw.get("confidence", 0)), problems, self.rules)
        result = {"fields": fields, "score": points, "tag": tag, "score_reasons": reasons,
                  "needs_review": bool(review), "review_reasons": review,
                  "summary": raw.get("summary", ""), "ack_draft": draft_ack(fields)}
        self.store.update(key, status="scored", result=result)
        return self.push(key)

    def push(self, key):
        row = self.store.get(key)
        res = row["result"]
        f = res["fields"]
        if not f.get("email"):
            self.store.update(key, status="needs_review", last_error="no email for CRM upsert")
            return {**self.store.get(key), "duplicate": False}
        name = (f.get("name") or "").split(" ", 1)
        record = {"email": f["email"], "first_name": name[0] or None, "last_name": name[1] if len(name) > 1 else None,
                  "phone": f.get("phone"), "company": f.get("company"), "score": res["score"], "tag": res["tag"],
                  "summary": res["summary"], "needs_review": res["needs_review"]}
        kwargs = {"sleep": self.sleep} if self.sleep else {}
        try:
            crm_id, attempts = with_retries(lambda: self.crm.upsert(record), **kwargs)
            self.store.update(key, status="in_crm", crm_id=crm_id, attempts=row["attempts"] + attempts, last_error=None)
        except CRMError as e:
            self.store.update(key, status="crm_failed", attempts=row["attempts"] + 1, last_error=str(e))
        return {**self.store.get(key), "duplicate": False}

    def retry_failed(self):
        return [self.push(r["key"]) for r in self.store.by_status("crm_failed")]
