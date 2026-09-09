# [Tungdzih Translator](https://tungdzih.wydialang.com)

A static web app that converts Chinese characters into **Tungdzih Lomaadzih** (通字羅馬字), Y. R. Chao's
*General Chinese* romanization-- a diaphonemic system that encodes pronunciations across
the major Sinitic varieties. You can read more about General Chinese here: 
* https://en.wikipedia.org/wiki/General_Chinese
* https://archive.org/details/a-project-for-general-chinese 


Reading data comes from two vendored sources, selectable in the app:
[`lotem/zime`](https://github.com/lotem/zime) and
[`baopaau/rime-tungdzih`](https://github.com/baopaau/rime-tungdzih). See
[data/README.md](data/README.md).

Obligatory [xkcd comic](https://xkcd.com/927/)

<!-- Try the WIP build: https://ephemeral-sunburst-760198.netlify.app/ -->

## Features

- Input **Traditional**, **Simplified**, or **Japanese kanji (Shinjitai)**
- **Auto-detects** the script as you type and switches conversion accordingly; override
  with the Auto / Traditional / Simplified / Japanese chips.
- **Polyphonic characters** are underlined; hover, tap, or focus to see every reading
  and pick one. Readings can also be shown inline.
- **Selectable dictionary** (`zime` / `baopaau-rime`); auto-derived, unverified
  readings in the fuller set are marked with a wavy underline.
- Untranslatable text (punctuation, Latin, digits) is passed through
- **Save translations** — kept in `localStorage`

- Translation is currently one-directional (characters → Tungdzih).

## TODOs
Check [data/README.md](data/README.md) for a list of features that need to be added.

## Develop

Open the folder:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

### Layout

| path | purpose |
|---|---|
| `index.html` / `styles.css` | markup and styling |
| `src/app.js` | entry point — DOM wiring, live translation, history |
| `src/detect.js` | script detection (Traditional / Simplified / Japanese) |
| `src/translate.js` | normalize → per-character lookup → token list |
| `src/render.js` | token list → output DOM (underline / tooltip / inline) |
| `src/datasets.js` | dictionary manifest + lazy table loading |
| `src/opencc.js` | wraps the `opencc-js` UMD bundle |
| `src/storage.js` | `localStorage`-backed saved translations |
| `utils/build_datasets.py` | regenerates `data/dict/*.json` + `data/datasets.json` |
| `data/` | vendored sources, generated tables, how to regenerate |
