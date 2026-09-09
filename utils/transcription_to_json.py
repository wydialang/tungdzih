"""Build data/transcription.json from data/transcription.txt.

Input format: one entry per line, ``<tungdzih><TAB><traditional char>``.
Several traditional characters are genuine polyphones and appear on more than
one line (e.g. 阿 -> "ah" and "o"); those readings are collected into a list,
first-seen order preserved (index 0 is treated as the primary reading by the
app).

Rows whose "character" is the ``*`` placeholder are dropped.

Output: ``{ "<traditional char>": ["reading", ...] }`` sorted by key.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "transcription.txt"
DST = ROOT / "data" / "transcription.json"

PLACEHOLDER = "*"


def build() -> dict[str, list[str]]:
    table: dict[str, list[str]] = {}
    with SRC.open(encoding="utf-8") as handle:
        for lineno, raw in enumerate(handle, 1):
            line = raw.strip()
            if not line:
                continue
            try:
                tung, char = (part.strip() for part in line.split("\t"))
            except ValueError as exc:
                raise ValueError(f"{SRC}:{lineno}: expected 'tung<TAB>char'") from exc
            if char == PLACEHOLDER:
                continue
            readings = table.setdefault(char, [])
            if tung not in readings:
                readings.append(tung)
    return table


def main() -> None:
    table = build()
    ordered = {key: table[key] for key in sorted(table)}
    with DST.open("w", encoding="utf-8") as handle:
        json.dump(ordered, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    polyphones = sum(1 for v in ordered.values() if len(v) > 1)
    print(f"wrote {len(ordered)} characters ({polyphones} polyphones) to {DST}")


if __name__ == "__main__":
    main()
