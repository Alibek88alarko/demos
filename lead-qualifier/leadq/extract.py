"""Model call plus the "no guessing" check."""
import json
import re

from .schema import EXTRACTION_SCHEMA, FIELDS, SERVICE_TYPES, SYSTEM_PROMPT

MODEL = "claude-opus-5-5"


class ClaudeExtractor:
    """Real extractor. Needs ANTHROPIC_API_KEY. Opus 5.5 with the server-side refusal fallback."""

    def __init__(self, client=None, model=MODEL):
        import anthropic
        self.client = client or anthropic.Anthropic()
        self.model = model

    def extract(self, text: str) -> dict:
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        if response.stop_reason == "refusal":
            raise ExtractionError("model declined the request")
        raw = next((b.text for b in response.content if b.type == "text"), "")
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise ExtractionError(f"not valid JSON: {e}") from e


class ExtractionError(Exception):
    pass


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip().lower()


def _digits(s: str) -> str:
    return re.sub(r"\D", "", str(s or ""))


def verify(extraction: dict, text: str):
    """Keep a field only if its evidence is really in the enquiry and the value matches it.
    Returns (fields, problems). Removed fields become None and are listed in problems."""
    body = _norm(text)
    fields, problems = {}, []
    for name in FIELDS:
        item = extraction.get(name) or {}
        value, evidence = item.get("value"), _norm(item.get("evidence", ""))
        if value is None or value == "":
            fields[name] = None
            continue
        if name == "urgency" and value == "normal":
            fields[name] = "normal"            # the default needs no evidence
            continue
        ok = bool(evidence) and evidence in body
        if ok and name == "email":
            ok = _norm(value) in body
        if ok and name == "phone":
            ok = len(_digits(value)) >= 7 and _digits(value) in _digits(text)
        if ok and name in ("budget_usd", "guests"):
            ok = any(d and d in _digits(evidence) for d in [_digits(str(int(float(value))))])
        if ok and name == "service_type" and value not in SERVICE_TYPES:
            ok = False
        if ok:
            fields[name] = value
        else:
            fields[name] = None
            problems.append(f"{name}: value not found in the enquiry, removed")
    return fields, problems
