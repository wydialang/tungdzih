"""Build the reading tables served by the translator.

Reads the vendored source files in ``data/`` and writes:

  * ``data/dict/zime.json``          from ``data/transcription.txt``
  * ``data/dict/baopaau-rime.json``  from ``data/baopaau-rime.dict.yaml``
  * ``data/datasets.json``           the manifest (with character counts)

Every generated table has the same shape::

    { "<traditional char>": { "r": ["reading", ...], "d": 1 } }

``r`` is the reading list, most-reliable / most-common first (index 0 is the
default shown by the app). ``d`` is present only when the reading is *derived* —
auto-generated from Middle Chinese and not hand-verified (baopaau only).

Run: ``python utils/build_datasets.py``
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DICT_DIR = DATA / "dict"

READING_RE = re.compile(r"[a-z]+")
# A Tungdzih syllable always has a vowel nucleus; `y` counts (it spells the
# apical vowel in e.g. 值 "dhyc", 沉 "dhym"). Readings with no vowel at all
# (`j` for 著, `zh` for 是, `z` for 子, `r` for 兒) are dropped.
VOWEL_RE = re.compile(r"[aeiouy]")

# Manifest metadata. `characters` is filled in from the generated tables.
DATASETS = [
    {
        "id": "zime",
        "label": "zime",
        "file": "dict/zime.json",
        "source": "https://github.com/lotem/zime",
        "description": (
            "RIME/zime input-method keyword list — roughly one representative "
            "character per syllable."
        ),
    },
    {
        "id": "baopaau-rime",
        "label": "baopaau-rime",
        "file": "dict/baopaau-rime.json",
        "source": "https://github.com/baopaau/rime-tungdzih",
        "description": (
            "Fuller General Chinese dictionary. ~17k of its characters are "
            "auto-derived from Middle Chinese and unverified (shown marked)."
        ),
        "hasDerived": True,
    },
]
DEFAULT_DATASET = "baopaau-rime"


def valid_reading(reading: str) -> bool:
    """A plausible Tungdzih syllable: all lowercase latin, with a vowel."""
    return bool(READING_RE.fullmatch(reading)) and bool(VOWEL_RE.search(reading))


# --------------------------------------------------------------------------- zime


def build_zime() -> dict:
    src = DATA / "transcription.txt"
    table: dict[str, list[str]] = {}
    with src.open(encoding="utf-8") as handle:
        for lineno, raw in enumerate(handle, 1):
            line = raw.strip()
            if not line:
                continue
            try:
                tung, char = (part.strip() for part in line.split("\t"))
            except ValueError as exc:
                raise ValueError(f"{src}:{lineno}: expected 'tung<TAB>char'") from exc
            if char == "*" or not valid_reading(tung):
                continue
            readings = table.setdefault(char, [])
            if tung not in readings:
                readings.append(tung)
    return {char: {"r": readings} for char, readings in table.items() if readings}


# ------------------------------------------------------------------------ baopaau

# Section header (a "# <name>" comment) -> rank. Lower rank = more trustworthy.
# Anything from the Middle-Chinese auto-conversion section is rank 3 = "derived".
SECTION_RANK = {
    "補充碼表": 0,
    "無字音數據": 0,
    "與推導結果不同": 1,
    "所有小韻": 2,
    "自動轉換biopolyhedron/rime-middle-chinese": 3,
}
DERIVED_RANK = 3


def _weight(parts: list[str]):
    """Parse the optional trailing ``NN%`` column. Returns None when absent —
    which the ordering treats as a neutral/default reading, distinct from an
    explicit low weight like ``5%`` that marks a *minor* reading."""
    if len(parts) >= 3 and parts[2].strip().endswith("%"):
        try:
            return int(parts[2].strip().rstrip("%"))
        except ValueError:
            return None
    return None


def build_baopaau() -> dict:
    src = DATA / "baopaau-rime.dict.yaml"
    lines = src.read_text(encoding="utf-8-sig").splitlines()

    # Skip the YAML front matter (everything through the '...' terminator).
    start = 0
    for i, line in enumerate(lines):
        if line.strip() == "...":
            start = i + 1
            break

    # char -> reading -> {"occ": [(rank, weight|None), ...], "seq": first_seen}
    entries: dict[str, dict[str, dict]] = {}
    rank = SECTION_RANK["補充碼表"]
    seq = 0
    for line in lines[start:]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            name = stripped.lstrip("# ").strip()
            if name in SECTION_RANK:
                rank = SECTION_RANK[name]
            continue

        parts = line.split("\t")
        if len(parts) < 2:
            continue
        word = parts[0].strip()
        reading = parts[1].strip()
        if len(word) != 1 or not valid_reading(reading):
            continue

        slot = entries.setdefault(word, {})
        rec = slot.get(reading)
        if rec is None:
            rec = slot[reading] = {"occ": [], "seq": seq}
            seq += 1
        rec["occ"].append((rank, _weight(parts)))

    def sort_key(item):
        _reading, rec = item
        best_rank = min(r for r, _ in rec["occ"])
        weights = [w for r, w in rec["occ"] if r == best_rank and w is not None]
        # No explicit weight at the best rank -> neutral (sorts above minor
        # readings, below an explicit "this is the main one" weight).
        eff = max(weights) if weights else 50
        return (best_rank, -eff, rec["seq"])

    table = {}
    for char, slot in entries.items():
        readings = [reading for reading, _ in sorted(slot.items(), key=sort_key)]
        derived = all(
            min(r for r, _ in rec["occ"]) >= DERIVED_RANK for rec in slot.values()
        )
        entry = {"r": readings}
        if derived:
            entry["d"] = 1
        table[char] = entry
    return table


# ----------------------------------------------------------------------- writing


def write_table(dataset_id: str, table: dict) -> int:
    ordered = {char: table[char] for char in sorted(table)}
    path = DICT_DIR / f"{dataset_id}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(ordered, handle, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        handle.write("\n")
    return len(ordered)


def main() -> None:
    builders = {"zime": build_zime, "baopaau-rime": build_baopaau}
    counts = {}
    for dataset in DATASETS:
        table = builders[dataset["id"]]()
        counts[dataset["id"]] = write_table(dataset["id"], table)

    manifest = {
        "default": DEFAULT_DATASET,
        "datasets": [
            {**dataset, "characters": counts[dataset["id"]]} for dataset in DATASETS
        ],
    }
    with (DATA / "datasets.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    for dataset in manifest["datasets"]:
        derived_note = " (with derived markers)" if dataset.get("hasDerived") else ""
        print(f"  {dataset['id']:<14} {dataset['characters']:>6} characters{derived_note}")
    print(f"wrote {DICT_DIR}/*.json and {DATA / 'datasets.json'}")


if __name__ == "__main__":
    main()
