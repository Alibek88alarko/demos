"""Rule-based scoring from scoring.yaml. No AI here."""
from datetime import date

import yaml


def load_rules(path="scoring.yaml"):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def score(fields: dict, rules: dict, today: date):
    points, reasons = 0, []
    budget = fields.get("budget_usd")
    if budget:
        for band in rules["budget_usd"]:
            if budget >= band["min"]:
                points += band["points"]; reasons.append(f"budget ${budget:,.0f}: +{band['points']}"); break
    if fields.get("event_date"):
        try:
            days = (date.fromisoformat(fields["event_date"]) - today).days
            for band in rules["timeline_days"]:
                if days <= band["max"]:
                    pts = band["points"] if days >= 0 else 0
                    points += pts; reasons.append(f"event in {days} days: +{pts}"); break
        except ValueError:
            reasons.append("event_date not a valid date: +0")
    st = fields.get("service_type")
    if st:
        pts = rules["service_type"].get(st, 0); points += pts; reasons.append(f"{st}: +{pts}")
    urg = fields.get("urgency")
    if urg:
        pts = rules["urgency"].get(urg, 0); points += pts
        if pts: reasons.append(f"urgency {urg}: +{pts}")
    if fields.get("company"):
        points += rules["has_company"]; reasons.append(f"company given: +{rules['has_company']}")
    if fields.get("phone"):
        points += rules["has_phone"]; reasons.append(f"phone given: +{rules['has_phone']}")
    tag = next(t["name"] for t in rules["tags"] if points >= t["min"])
    return points, tag, reasons


def review_reasons(fields: dict, confidence: float, problems: list, rules: dict):
    cfg = rules["needs_review"]
    out = list(problems)
    if confidence < cfg["min_confidence"]:
        out.append(f"model confidence {confidence:.2f} below {cfg['min_confidence']}")
    if cfg["require_contact"] and not (fields.get("email") or fields.get("phone")):
        out.append("no email or phone survived the checks")
    return out
