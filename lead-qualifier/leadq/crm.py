"""CRM adapters. Each one upserts by email, so running twice updates instead of duplicating."""
import time

import httpx


class CRMError(Exception):
    def __init__(self, msg, retryable):
        super().__init__(msg)
        self.retryable = retryable


def with_retries(fn, attempts=4, base_delay=1.0, sleep=time.sleep):
    """Retry on 429, 5xx and network errors with exponential backoff. 4xx fails at once."""
    last = None
    for i in range(attempts):
        try:
            return fn(), i + 1
        except CRMError as e:
            last = e
            if not e.retryable or i == attempts - 1:
                break
            sleep(base_delay * 2 ** i)
    raise last


class HubSpotCRM:
    """Upsert a contact by email (HubSpot batch upsert with idProperty=email).
    lead_score, lead_tag, lead_summary and needs_review are custom contact properties
    created once in HubSpot settings."""

    URL = "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert"

    def __init__(self, token, client=None):
        self.token = token
        self.http = client or httpx.Client(timeout=15)

    def upsert(self, record: dict) -> str:
        props = {k: v for k, v in {
            "email": record["email"], "firstname": record.get("first_name"), "lastname": record.get("last_name"),
            "phone": record.get("phone"), "company": record.get("company"),
            "lead_score": record["score"], "lead_tag": record["tag"],
            "lead_summary": record["summary"], "needs_review": str(record["needs_review"]).lower(),
        }.items() if v not in (None, "")}
        try:
            r = self.http.post(self.URL, headers={"Authorization": f"Bearer {self.token}"},
                               json={"inputs": [{"idProperty": "email", "id": record["email"], "properties": props}]})
        except httpx.HTTPError as e:
            raise CRMError(f"network: {e}", retryable=True)
        if r.status_code == 429 or r.status_code >= 500:
            raise CRMError(f"HubSpot {r.status_code}", retryable=True)
        if r.status_code >= 400:
            raise CRMError(f"HubSpot {r.status_code}: {r.text[:200]}", retryable=False)
        return r.json()["results"][0]["id"]


class MemoryCRM:
    """Stand-in for tests and the offline run. fail_times makes the next N calls fail."""

    def __init__(self, fail_times=0, status=503):
        self.contacts, self.calls, self.fail_times, self.status = {}, 0, fail_times, status

    def upsert(self, record: dict) -> str:
        self.calls += 1
        if self.fail_times > 0:
            self.fail_times -= 1
            raise CRMError(f"CRM {self.status}", retryable=self.status == 429 or self.status >= 500)
        email = record["email"].lower()
        cid = self.contacts.get(email, {}).get("id") or f"c{len(self.contacts) + 1}"
        self.contacts[email] = {**record, "id": cid}
        return cid
