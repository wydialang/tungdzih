# Tungdzih translator — data & roadmap

`transcription.txt` is the source of truth: one entry per line, in the format `tungdzih<TAB>traditional`.

`transcription.json` is generated from it by [`../utils/transcription_to_json.py`](../utils/transcription_to_json.py)
as `{ "<traditional char>": ["reading", ...] }` (first reading = primary).

Regenerate after editing the `.txt`:

```bash
python utils/transcription_to_json.py
```

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

## Known limitations

- Script normalization is **per character**, not phrase-aware, so context-sensitive
  variants (e.g. 后 → 後 vs 后) are not disambiguated.
- A Shinjitai character that is identical to the Simplified form (学, 国, 会, …) is
  detected as Simplified. Both normalize to the same Traditional character, so the
  reading is still correct; only the "Detected:" label may read "Simplified".

## Future ideas

- [ ] Translating the whole website.
- [ ] Estimate translations from Tungdzih back to characters (hard; likely needs a
      model, since one syllable maps to many characters).
