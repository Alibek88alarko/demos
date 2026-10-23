"""SQLite store. The idempotency key is written before any CRM call, so a retry or a
double submit finds the existing row instead of creating a second lead."""
import hashlib
import json
import re
import sqlite3


def idempotency_key(enquiry: dict) -> str:
    if enquiry.get("message_id"):
        return "msg:" + enquiry["message_id"].strip().lower()
    body = re.sub(r"\s+", " ", enquiry.get("text", "")).strip().lower()
    email = (enquiry.get("from_email") or "").strip().lower()
    return "hash:" + hashlib.sha256(f"{email}\n{body}".encode()).hexdigest()


class Store:
    def __init__(self, path=":memory:"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("""CREATE TABLE IF NOT EXISTS enquiries (
            key TEXT PRIMARY KEY, received_at TEXT, text TEXT, status TEXT,
            result TEXT, crm_id TEXT, attempts INTEGER DEFAULT 0, last_error TEXT)""")

    def claim(self, key, received_at, text):
        """True if this enquiry is new. False if we have seen it before."""
        try:
            with self.db:
                self.db.execute("INSERT INTO enquiries (key, received_at, text, status) VALUES (?,?,?,'received')",
                                (key, received_at, text))
            return True
        except sqlite3.IntegrityError:
            return False

    def update(self, key, **cols):
        if "result" in cols and not isinstance(cols["result"], str):
            cols["result"] = json.dumps(cols["result"])
        sets = ", ".join(f"{k} = ?" for k in cols)
        with self.db:
            self.db.execute(f"UPDATE enquiries SET {sets} WHERE key = ?", (*cols.values(), key))

    def get(self, key):
        row = self.db.execute("SELECT key, status, result, crm_id, attempts, last_error, text, received_at "
                              "FROM enquiries WHERE key = ?", (key,)).fetchone()
        if not row:
            return None
        k, status, result, crm_id, attempts, err, text, received = row
        return {"key": k, "status": status, "result": json.loads(result) if result else None,
                "crm_id": crm_id, "attempts": attempts, "last_error": err, "text": text, "received_at": received}

    def by_status(self, status):
        rows = self.db.execute("SELECT key FROM enquiries WHERE status = ?", (status,)).fetchall()
        return [self.get(r[0]) for r in rows]
