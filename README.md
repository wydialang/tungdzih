# [Tungdzih Translator](tungdzih.wydialang.com)

A static web app that converts Chinese characters into **Tungdzih Lomaadzih** (通字羅馬字), Y. R. Chao's
*General Chinese* romanization-- a diaphonemic system that encodes pronunciations across
the major Sinitic varieties. You can read more about General Chinese here: 
* https://en.wikipedia.org/wiki/General_Chinese
* https://archive.org/details/a-project-for-general-chinese 


The data used for the translator can be found here: https://raw.githubusercontent.com/lotem/zime/master/zime-data/tungdzih/tungdzih-keywords.txt

Obligatory [xkcd comic](https://xkcd.com/927/)

<!-- Try the WIP build: https://ephemeral-sunburst-760198.netlify.app/ -->

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
| `src/opencc.js` | wraps the `opencc-js` UMD bundle |
| `src/storage.js` | `localStorage`-backed saved translations |
| `data/` | reading table + how to regenerate it |
