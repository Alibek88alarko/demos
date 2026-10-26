# RFID goods receiving: de-duplicated reads, explicit stock states

A small end-to-end demo of the logic behind RFID goods receipt and inventory counts:
an RC522 reader on an Arduino reports tag UIDs, a Python host turns those reads into
stock movements that follow fixed state transitions and flags everything that does
not fit instead of guessing.

```
label issued  ->  received (stock +qty)  ->  consumed (stock -qty)
```

What it demonstrates

- Printing or encoding a label never confirms receipt: `issued` is not stock.
- Every read is de-duplicated inside a 2 s window; a reader repeats the same tag.
- Unknown tags, wrong-state tags and re-issued labels are flagged and logged, not guessed.
- Inventory count: scan the shelf, then `done` reconciles actual vs expected and lists
  missing and unexpected tags.
- State lives in `data/tags.json`, every event in `data/events.csv`, so a restart or a
  connection drop loses nothing.

Hardware: RC522 (13.56 MHz, MIFARE) on an Arduino Uno over SPI. A warehouse would use
a UHF reader with multi-tag reads from metres away; the host logic (de-duplication,
state machine, reconciliation, logging) is the same, only the reader driver changes.

## Run

Arduino: open `arduino/rc522_reader/rc522_reader.ino`, install the `MFRC522` library,
upload. Wiring is in the sketch header. Serial prints `UID:xxxxxxxx` once per
presentation.

Host:

```
pip install pyserial
python receiving.py --port COM3        # your Arduino port
python receiving.py --sim              # no hardware: type UID:AA01 lines yourself
```

Console commands: `issue SKU QTY`, `receive`, `consume`, `count`, `done`, `status`, `quit`.

Tests: `pip install pytest` then `pytest -q` (6 tests, no hardware needed).

## Sample session

```
> issue MOZZ 10
present the new label for MOZZ x10
UID:04A1B2C3: label issued for MOZZ x10 (not stock until received)
UID:04A1B2C3: MOZZ x10 receipt confirmed
UID:04A1B2C3: duplicate read ignored (0.4s)
UID:7F00E1D2: FLAG unknown tag, no label issued for it
> count
mode: count. Scan everything, then type 'done'
UID:04A1B2C3: counted (1 tags so far)
> done
count: 1 read, 1 expected in stock
  stock matches, no discrepancies
```
