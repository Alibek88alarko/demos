"""FastAPI wiring. In the client's app this becomes a router plus a background task."""
import os

from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

from leadq.crm import HubSpotCRM, MemoryCRM
from leadq.extract import ClaudeExtractor
from leadq.pipeline import Pipeline
from leadq.scoring import load_rules
from leadq.store import Store, idempotency_key

app = FastAPI(title="AI lead qualification")
crm = HubSpotCRM(os.environ["HUBSPOT_TOKEN"]) if os.environ.get("HUBSPOT_TOKEN") else MemoryCRM()
pipeline = Pipeline(Store(os.environ.get("LEADQ_DB", "leads.db")), ClaudeExtractor(), crm, load_rules())


class Enquiry(BaseModel):
    text: str
    from_email: str | None = None
    message_id: str | None = None   # email Message-ID, best idempotency key for the inbox


@app.post("/enquiries", status_code=202)
def receive(enquiry: Enquiry, tasks: BackgroundTasks):
    data = enquiry.model_dump()
    tasks.add_task(pipeline.process, data)        # the form returns at once, AI runs after
    return {"key": idempotency_key(data)}


@app.get("/enquiries/{key}")
def status(key: str):
    return pipeline.store.get(key)


@app.get("/review")
def review_queue():
    return pipeline.store.by_status("needs_review") + [
        r for r in pipeline.store.by_status("in_crm") if r["result"] and r["result"]["needs_review"]]


@app.post("/retry-failed")
def retry_failed():
    return pipeline.retry_failed()
