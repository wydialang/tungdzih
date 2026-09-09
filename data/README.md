# Tungdzih translator — data & roadmap

## Dictionaries

The app lets the user choose between reading tables. Each is generated from a
vendored source by [`../utils/build_datasets.py`](../utils/build_datasets.py):

| dataset | vendored source | pinned to |
|---|---|---|
| `zime` | [`transcription.txt`](transcription.txt) <- `lotem/zime`: `zime-data/tungdzih/tungdzih-keywords.txt`  | commit `34dcd9f` |
| `baopaau-rime` | [`baopaau-rime.dict.yaml`](baopaau-rime.dict.yaml) <- `baopaau/rime-tungdzih`: `tungdzih.dict.yaml` | commit `345e0b9` |

`baopaau-rime` is much larger than `zime`; ~17k of its characters are auto-derived
from Middle Chinese and, per its own upstream README, largely unproofread.

Neither upstream repository carries an explicit licence; the files are vendored
here with attribution (see the site footer and `README.md`).

### Generated files

`dict/zime.json`, `dict/baopaau-rime.json` 
- have shape
  `{ "<traditional char>": { "r": ["reading", ...], "d": 1 } }`. 
- `r` is
  most-reliable / most-common first (index 0 is the app default).
- `d` is present
  only when the reading is *derived* (auto-generated, unverified — `baopaau-rime`
  only).

`datasets.json`
- the manifest the app reads (ids, labels, character counts,
  default).

Regenerate after editing a source:

```bash
python utils/build_datasets.py
```

Non-syllable readings with no vowel nucleus (`j` for 著, `zh` for 是, `z` for 子,
`r` for 兒 — upstream truncation artifacts) are dropped by the builder; `y` counts
as a vowel (it spells the apical vowel, e.g. 值 `dhyc`).

## Done

- [x] Users can't type in `*` (the `*` placeholder rows are dropped at build time).
- [x] Spacing is added around words/characters that don't get translated.
- [x] Japanese kanji (Shinjitai) input.
- [x] Multiple possible readings shown on hover (dotted underline + tooltip), with a
      toggle for inline `reading1/reading2` output.
- [x] One input box with script auto-detection
      (Traditional / Simplified / Japanese) plus manual override chips; Tungdzih
      output beside it.
- [x] Saved translations persist in `localStorage`.
- [x] Selectable dictionary (`zime` / `baopaau-rime`), with auto-derived readings
      in the fuller set marked in the output.

## Known limitations

- Script normalization is **per character**, not phrase-aware, so context-sensitive
  variants (e.g. 后 → 後 vs 后) are not disambiguated.
- A Shinjitai character that is identical to the Simplified form (学, 国, 会, …) is
  detected as Simplified. Both normalize to the same Traditional character, so the
  reading is still correct; only the "Detected:" label may read "Simplified".

## Future ideas

- [ ] Translating the website itself
- [ ] Estimate translations from Tungdzih back to characters (hard; likely needs a
      model, since one syllable maps to many characters)
- [ ] Add syllabary translation
