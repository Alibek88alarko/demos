"""Goods receiving with RFID tags: de-duplicated reads and explicit stock states.

Tags move through fixed states only:
    issued  -> label printed and bound to a product; NOT stock yet
    received -> confirmed scan at goods receipt; stock +qty
    consumed -> used in preparation; stock -qty

Every read is de-duplicated inside a time window (a reader reports the same tag
many times), every state change is logged, and anything that does not fit the
current mode is flagged instead of guessed.

Run with hardware:   python receiving.py --port COM3
Run without:         python receiving.py --sim      (type UID:xxxx lines yourself)

Console commands while running:
    issue SKU QTY     next tag read is bound to SKU/QTY as "issued"
    receive           mode: tag reads confirm goods receipt
    consume           mode: tag reads consume stock
    count             mode: collect reads for an inventory, then "done"
    done              finish the count and show the reconciliation
    status            stock per SKU and tag states
    quit
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

DEDUPE_SECONDS = 2.0
STATES = ("issued", "received", "consumed")


@dataclass
class Tag:
    uid: str
    sku: str
    qty: int
    state: str
    history: list[str] = field(default_factory=list)


class Store:
    """Tag registry on disk plus an append-only event log."""

    def __init__(self, path: Path, log_path: Path):
        self.path = path
        self.log_path = log_path
        self.tags: dict[str, Tag] = {}
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            self.tags = {u: Tag(**t) for u, t in raw.items()}

    def save(self) -> None:
        self.path.write_text(
            json.dumps({u: t.__dict__ for u, t in self.tags.items()}, indent=2),
            encoding="utf-8",
        )

    def log(self, uid: str, event: str, result: str) -> None:
        new = not self.log_path.exists()
        with self.log_path.open("a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["ts", "uid", "event", "result"])
            w.writerow([time.strftime("%Y-%m-%d %H:%M:%S"), uid, event, result])


class Receiving:
    def __init__(self, store: Store):
        self.store = store
        self.mode = "receive"
        self.pending_issue: tuple[str, int] | None = None
        self.last_seen: dict[str, float] = {}
        self.count_reads: set[str] = set()

    # ----- reads ---------------------------------------------------------
    def on_read(self, uid: str, now: float | None = None) -> str:
        now = time.monotonic() if now is None else now
        last = self.last_seen.get(uid)
        self.last_seen[uid] = now
        if last is not None and now - last < DEDUPE_SECONDS:
            return f"{uid}: duplicate read ignored ({now - last:.1f}s)"

        if self.pending_issue:
            return self._issue(uid)
        if self.mode == "receive":
            return self._transition(uid, "issued", "received", "receipt confirmed")
        if self.mode == "consume":
            return self._transition(uid, "received", "consumed", "consumed")
        if self.mode == "count":
            self.count_reads.add(uid)
            return f"{uid}: counted ({len(self.count_reads)} tags so far)"
        return f"{uid}: no mode"

    def _issue(self, uid: str) -> str:
        sku, qty = self.pending_issue
        self.pending_issue = None
        if uid in self.store.tags:
            self.store.log(uid, "issue", "FLAG already bound")
            return f"{uid}: FLAG label already bound to {self.store.tags[uid].sku}, not re-issued"
        self.store.tags[uid] = Tag(uid, sku, qty, "issued", [f"issued {sku} x{qty}"])
        self.store.save()
        self.store.log(uid, "issue", f"issued {sku} x{qty}")
        return f"{uid}: label issued for {sku} x{qty} (not stock until received)"

    def _transition(self, uid: str, want: str, to: str, verb: str) -> str:
        tag = self.store.tags.get(uid)
        if tag is None:
            self.store.log(uid, to, "FLAG unknown tag")
            return f"{uid}: FLAG unknown tag, no label issued for it"
        if tag.state != want:
            self.store.log(uid, to, f"FLAG state {tag.state}")
            return f"{uid}: FLAG {tag.sku} is '{tag.state}', cannot be {verb} (needs '{want}')"
        tag.state = to
        tag.history.append(verb)
        self.store.save()
        self.store.log(uid, to, f"{tag.sku} x{tag.qty} {verb}")
        return f"{uid}: {tag.sku} x{tag.qty} {verb}"

    # ----- commands ------------------------------------------------------
    def command(self, line: str) -> str:
        parts = line.strip().split()
        if not parts:
            return ""
        cmd, args = parts[0].lower(), parts[1:]
        if cmd == "issue" and len(args) == 2 and args[1].isdigit():
            self.pending_issue = (args[0].upper(), int(args[1]))
            return f"present the new label for {args[0].upper()} x{args[1]}"
        if cmd in ("receive", "consume"):
            self.mode = cmd
            self.pending_issue = None
            return f"mode: {cmd}"
        if cmd == "count":
            self.mode = "count"
            self.count_reads = set()
            return "mode: count. Scan everything, then type 'done'"
        if cmd == "done":
            return self.reconcile()
        if cmd == "status":
            return self.status()
        return f"unknown command: {line.strip()}"

    def reconcile(self) -> str:
        expected = {u for u, t in self.store.tags.items() if t.state == "received"}
        missing = sorted(expected - self.count_reads)
        unexpected = sorted(self.count_reads - expected)
        self.mode = "receive"
        lines = [f"count: {len(self.count_reads)} read, {len(expected)} expected in stock"]
        for u in missing:
            t = self.store.tags[u]
            lines.append(f"  FLAG missing: {u} {t.sku} x{t.qty}")
        for u in unexpected:
            t = self.store.tags.get(u)
            what = f"{t.sku} state '{t.state}'" if t else "unknown tag"
            lines.append(f"  FLAG unexpected: {u} {what}")
        if not missing and not unexpected:
            lines.append("  stock matches, no discrepancies")
        self.store.log("-", "count", f"{len(missing)} missing, {len(unexpected)} unexpected")
        return "\n".join(lines)

    def status(self) -> str:
        stock: dict[str, int] = {}
        for t in self.store.tags.values():
            if t.state == "received":
                stock[t.sku] = stock.get(t.sku, 0) + t.qty
        lines = [f"mode: {self.mode}; tags: {len(self.store.tags)}"]
        for sku, qty in sorted(stock.items()):
            lines.append(f"  {sku}: {qty} in stock")
        for t in self.store.tags.values():
            lines.append(f"  {t.uid} {t.sku} x{t.qty} [{t.state}]")
        return "\n".join(lines)


# ----- I/O -------------------------------------------------------------------
def reader_lines(port: str | None):
    """Yield raw lines from the serial port, or from stdin in --sim mode."""
    if port is None:
        for line in sys.stdin:
            yield line.strip()
        return
    import serial  # pyserial

    with serial.Serial(port, 115200, timeout=1) as ser:
        while True:
            raw = ser.readline().decode(errors="ignore").strip()
            if raw:
                yield raw


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", help="serial port, e.g. COM3 or /dev/ttyUSB0")
    ap.add_argument("--sim", action="store_true", help="no hardware: read UID:... lines from stdin")
    ap.add_argument("--data", default="data", help="folder for tags.json and events.csv")
    args = ap.parse_args()
    if not args.port and not args.sim:
        ap.error("give --port COMx or --sim")

    data = Path(args.data)
    data.mkdir(exist_ok=True)
    app = Receiving(Store(data / "tags.json", data / "events.csv"))
    print("commands: issue SKU QTY | receive | consume | count | done | status | quit")
    print(app.command("status"))

    def handle(line: str) -> bool:
        if line.upper().startswith("UID:"):
            print(app.on_read(line[4:].upper()))
        elif line.upper() == "READY":
            print("reader ready")
        elif line.lower() == "quit":
            return False
        elif line:
            print(app.command(line))
        return True

    if args.sim:
        for line in reader_lines(None):
            if not handle(line):
                break
        return

    # Hardware mode: serial reads in a thread, commands from the keyboard.
    def pump():
        for line in reader_lines(args.port):
            handle(line)

    threading.Thread(target=pump, daemon=True).start()
    for line in sys.stdin:
        if not handle(line.strip()):
            break


if __name__ == "__main__":
    main()
