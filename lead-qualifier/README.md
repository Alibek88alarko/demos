# AI lead qualification for an existing Python backend (demo, sample data)

Each new enquiry from the web form or the inbox is read by the model, checked, scored by your own rules and upserted into the CRM once. Unclear cases go to a review queue instead of the CRM guessing for you.

## What happens to one enquiry

1. **Idempotency key first.** The email `Message-ID`, or a hash of sender and body for form posts, is stored before anything else. A double submit or a webhook retry finds the existing row and stops there (`leadq/store.py`).
2. **Extraction with a strict JSON schema.** Claude returns name, email, phone, company, service type, guests, budget, date and urgency. Every field comes with the exact words it was taken from (`leadq/schema.py`, `leadq/extract.py`).
3. **No guessing check.** A field survives only if its evidence is really in the enquiry and the value matches it: the email must appear in the text, phone digits must appear, a budget number must be in the quoted words. Anything else is removed and listed as a reason for review.
4. **Your rules decide the tag.** `scoring.yaml` holds the points for budget, timeline, service type, urgency and contact details, and the thresholds for Hot, Warm, Medium and Cold. The model never picks the tag.
5. **Needs review** when model confidence is low, when a field was removed by the check, or when no email or phone is left.
6. **CRM upsert by email** with retries and backoff on 429, 5xx and network errors (`leadq/crm.py`). A 400 fails at once. If the CRM stays down, the lead is kept as `crm_failed` and `POST /retry-failed` pushes it later, still without duplicates.
7. **Acknowledgement draft** is stored with the lead for a person to review. Nothing is emailed automatically.

## Results on 20 sample enquiries

`python run_samples.py` runs 20 made-up enquiries (catering and events) through the real pipeline. Hand-labeled extractions stand in for the model, so it runs without an API key, and two of them contain a deliberate guess to test the check. The CRM stand-in fails the first two calls to exercise retries. Full table: [samples/results.md](samples/results.md).

- 7 Hot, 4 Warm, 2 Medium, 5 Cold, plus 2 duplicates that never reached the model (18 model calls for 20 submissions).
- The invented phone number (#7) and the invented budget (#12) were removed and flagged.
- The one-line "hi can u cater" (#9) went to review: confidence 0.30 and no contact details.
- Two phone-only enquiries went to review because the CRM upsert needs an email.
- 15 contacts in the CRM, 0 created twice.

`pytest -q` runs 11 tests: guessed fields removed, rules decide the tag, double submit creates one lead, same email twice skips the model, CRM retries then succeeds, CRM down is not lost and can be retried, 400 is not retried, low confidence goes to review, all 20 samples.

## Run it

```bash
pip install -r requirements.txt
pytest -q
python run_samples.py
ANTHROPIC_API_KEY=... HUBSPOT_TOKEN=... uvicorn app:app   # without HUBSPOT_TOKEN an in-memory CRM is used
```

`POST /enquiries` returns at once and processing runs in a background task, so the contact form stays fast. `GET /review` lists the review queue.

## Fitting it into an existing app

`leadq/` is plain Python with no framework code, so it drops into FastAPI or Django as a module. The extractor, CRM adapter and store are small classes, so OpenAI instead of Claude, Salesforce or GoHighLevel instead of HubSpot, or Postgres instead of SQLite are swaps of one class. In HubSpot, `lead_score`, `lead_tag`, `lead_summary` and `needs_review` are custom contact properties created once.

Built by Alibek Kozhatayev. Sample data only.
