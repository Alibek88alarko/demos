from pathlib import Path

from receiving import Receiving, Store


def make(tmp_path: Path) -> Receiving:
    return Receiving(Store(tmp_path / "tags.json", tmp_path / "events.csv"))


def test_issue_then_receive_then_consume(tmp_path):
    app = make(tmp_path)
    app.command("issue MOZZ 10")
    assert "issued" in app.on_read("AA01", now=0)
    assert app.store.tags["AA01"].state == "issued"
    assert "in stock" not in app.status()          # issued is not stock
    assert "receipt confirmed" in app.on_read("AA01", now=10)
    assert "MOZZ: 10 in stock" in app.status()
    app.command("consume")
    assert "consumed" in app.on_read("AA01", now=20)
    assert "in stock" not in app.status()


def test_duplicate_reads_within_window_are_ignored(tmp_path):
    app = make(tmp_path)
    app.command("issue DOUGH 5")
    app.on_read("BB02", now=0)
    first = app.on_read("BB02", now=5)
    again = app.on_read("BB02", now=5.5)
    assert "receipt confirmed" in first
    assert "duplicate read ignored" in again
    assert app.store.tags["BB02"].state == "received"


def test_unknown_and_wrong_state_are_flagged_not_guessed(tmp_path):
    app = make(tmp_path)
    assert "FLAG unknown tag" in app.on_read("CC03", now=0)
    assert "CC03" not in app.store.tags
    app.command("issue SAUCE 2")
    app.on_read("DD04", now=10)
    app.command("consume")
    msg = app.on_read("DD04", now=20)              # issued, never received
    assert "FLAG" in msg and "needs 'received'" in msg
    assert app.store.tags["DD04"].state == "issued"


def test_label_cannot_be_issued_twice(tmp_path):
    app = make(tmp_path)
    app.command("issue MOZZ 10")
    app.on_read("EE05", now=0)
    app.command("issue CHEESE 3")
    assert "already bound" in app.on_read("EE05", now=10)
    assert app.store.tags["EE05"].sku == "MOZZ"


def test_count_reconciles_missing_and_unexpected(tmp_path):
    app = make(tmp_path)
    for i, sku in enumerate(["MOZZ", "DOUGH", "SAUCE"]):
        app.command(f"issue {sku} 1")
        app.on_read(f"F{i}", now=i * 10)
        app.on_read(f"F{i}", now=i * 10 + 5)       # receive
    app.command("count")
    app.on_read("F0", now=100)
    app.on_read("F1", now=101)
    app.on_read("ZZ99", now=102)                   # unknown tag on the shelf
    report = app.command("done")
    assert "3 expected" in report
    assert "FLAG missing: F2 SAUCE" in report
    assert "FLAG unexpected: ZZ99 unknown tag" in report
    assert app.mode == "receive"


def test_state_survives_restart(tmp_path):
    app = make(tmp_path)
    app.command("issue MOZZ 4")
    app.on_read("AB12", now=0)
    app.on_read("AB12", now=5)
    app2 = make(tmp_path)
    assert app2.store.tags["AB12"].state == "received"
    assert (tmp_path / "events.csv").read_text().count("\n") == 3   # header + 2 events
