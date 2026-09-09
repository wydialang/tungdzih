# Tungdzih Translator

A static web app that converts Chinese characters into **Tungdzih** (通字), Y. R. Chao's
*General Chinese* romanization — a diaphonemic system that encodes pronunciations across
the major Chinese varieties.

Try the WIP build: https://ephemeral-sunburst-760198.netlify.app/

## Features

- Input **Traditional**, **Simplified**, or **Japanese kanji (Shinjitai)**
- **Auto-detects** the script as you type and switches conversion accordingly; override
  with the Auto / Traditional / Simplified / Japanese chips.
- **Polyphonic characters** are underlined; hover, tap, or focus to see every reading
  and pick one. Readings can also be shown inline.
- Untranslatable text (punctuation, Latin, digits) is passed through
- **Save translations** — kept in `localStorage`

- Translation is currently one-directional (characters → Tungdzih).

## Develop

No build step. Serve the folder and open it:

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
| `src/opencc.js` | wraps the `opencc-js` UMD bundle |
| `src/storage.js` | `localStorage`-backed saved translations |
| `data/` | reading table + how to regenerate it |
