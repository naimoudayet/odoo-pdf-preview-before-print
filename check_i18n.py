#!/usr/bin/env python3
"""Sanity-check the i18n/ folder of an Odoo addon.

Usage:  python check_i18n.py no_pdf_preview_print/i18n

Verifies:
  - every .po file is valid UTF-8
  - every PO has the same msgid set as the POT (no missing, no orphan)
  - every msgstr is non-empty (no skipped translations)
  - no `fuzzy` markers left over from msgmerge
  - PO header has Language and Plural-Forms set

Pure stdlib so it runs on Windows host without installing anything.
"""
import os
import re
import sys

MSG_RE = re.compile(r'^(msgid|msgstr)\s+"(.*)"\s*$')
CONT_RE = re.compile(r'^"(.*)"\s*$')


def parse_po(path):
    entries = []
    headers = {}
    current_key = None
    current_val = []
    last_kind = None

    def flush():
        nonlocal current_key, current_val, last_kind
        if last_kind is None:
            return
        entries.append((last_kind, "".join(current_val)))
        current_val = []

    with open(path, "rb") as f:
        raw = f.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        return None, None, f"not valid UTF-8: {e}"

    fuzzy_count = 0
    for line in text.splitlines():
        if line.startswith("#, ") and "fuzzy" in line:
            fuzzy_count += 1
            continue
        if not line or line.startswith("#"):
            continue
        m = MSG_RE.match(line)
        if m:
            flush()
            last_kind = m.group(1)
            current_val = [m.group(2)]
            continue
        c = CONT_RE.match(line)
        if c and last_kind:
            current_val.append(c.group(1))
    flush()

    # Pair msgid/msgstr
    pairs = []
    for i in range(0, len(entries) - 1, 2):
        if entries[i][0] == "msgid" and entries[i + 1][0] == "msgstr":
            pairs.append((entries[i][1], entries[i + 1][1]))

    # First pair is the header (empty msgid)
    if pairs and pairs[0][0] == "":
        for hline in pairs[0][1].split("\\n"):
            if ":" in hline:
                k, _, v = hline.partition(":")
                headers[k.strip()] = v.strip()
        pairs = pairs[1:]

    return pairs, headers, None, fuzzy_count


def check(po_dir):
    files = sorted(os.listdir(po_dir))
    pot = [f for f in files if f.endswith(".pot")]
    pos = [f for f in files if f.endswith(".po")]
    if not pot:
        print("FAIL: no .pot file in", po_dir)
        return 1
    if len(pot) > 1:
        print("FAIL: multiple .pot files:", pot)
        return 1

    pot_path = os.path.join(po_dir, pot[0])
    result = parse_po(pot_path)
    if result[2]:
        print(f"FAIL {pot[0]}: {result[2]}")
        return 1
    pot_pairs, _, _, _ = result
    pot_ids = {msgid for msgid, _ in pot_pairs}
    print(f"POT: {pot[0]} — {len(pot_ids)} strings")

    failed = 0
    for po in pos:
        path = os.path.join(po_dir, po)
        result = parse_po(path)
        if result[2]:
            print(f"  FAIL {po}: {result[2]}")
            failed += 1
            continue
        pairs, headers, _, fuzzy = result
        ids = {msgid for msgid, _ in pairs}
        missing = pot_ids - ids
        orphan = ids - pot_ids
        empty = [msgid for msgid, msgstr in pairs if msgid and not msgstr]

        problems = []
        if missing:
            problems.append(f"{len(missing)} missing msgids")
        if orphan:
            problems.append(f"{len(orphan)} orphan msgids (not in POT)")
        if empty:
            problems.append(f"{len(empty)} empty translations")
        if fuzzy:
            problems.append(f"{fuzzy} fuzzy markers")
        if "Language" not in headers or not headers["Language"]:
            problems.append("missing Language header")
        if "Plural-Forms" not in headers or not headers["Plural-Forms"]:
            problems.append("missing Plural-Forms header")

        if problems:
            print(f"  FAIL {po}: {', '.join(problems)}")
            for m in list(missing)[:3]:
                print(f"        missing: {m!r}")
            for m in list(orphan)[:3]:
                print(f"        orphan : {m!r}")
            for m in empty[:3]:
                print(f"        empty  : {m!r}")
            failed += 1
        else:
            print(f"  OK   {po} ({headers.get('Language', '?')})")

    if failed:
        print(f"\n{failed} file(s) failed.")
        return 1
    print(f"\nAll {len(pos)} PO files OK.")
    return 0


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "no_pdf_preview_print/i18n"
    sys.exit(check(target))
