"""JSON schema the model must follow. Every field carries the exact text it came from,
so the pipeline can check that nothing was guessed."""

FIELDS = ["name", "email", "phone", "company", "service_type", "guests",
          "budget_usd", "event_date", "urgency"]

SERVICE_TYPES = ["corporate_catering", "private_event", "wedding", "wholesale", "other"]


def _field(value_type):
    return {
        "type": "object",
        "properties": {
            "value": {"type": [value_type, "null"]},
            "evidence": {"type": "string"},
        },
        "required": ["value", "evidence"],
        "additionalProperties": False,
    }


EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "name": _field("string"),
        "email": _field("string"),
        "phone": _field("string"),
        "company": _field("string"),
        "service_type": _field("string"),
        "guests": _field("integer"),
        "budget_usd": _field("number"),
        "event_date": _field("string"),
        "urgency": _field("string"),
        "summary": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": FIELDS + ["summary", "confidence"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = f"""You read one customer enquiry for a catering and events company and extract fields.
Rules:
- Only use information written in the enquiry. If a field is not stated, set value to null and evidence to "".
- evidence must be the exact words from the enquiry that the value comes from, copied character for character.
- service_type is one of: {", ".join(SERVICE_TYPES)}.
- urgency is "high" only if the customer says it is urgent or needs an answer within days, else "normal".
- event_date as YYYY-MM-DD only if a full date is written; a month alone stays null.
- budget_usd only if a number is written; "flexible" or "not sure" stays null.
- summary: one plain sentence for a sales rep.
- confidence: 0 to 1, how sure you are that the fields are right."""
