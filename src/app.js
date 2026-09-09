import { whenReady } from './opencc.js';
import { MODE_LABELS } from './detect.js';
import { translate, tokensToText } from './translate.js';
import { renderOutput } from './render.js';
import * as datasets from './datasets.js';
import * as store from './storage.js';

const PREF_KEY = 'tungdzih.prefs';
const THEME_KEY = 'tungdzih.theme';
const MODES = ['auto', 't', 'cn', 'jp'];

const els = {
  themeToggle: document.getElementById('theme-toggle'),
  status: document.getElementById('status'),
  translator: document.getElementById('translator'),
  chips: document.getElementById('chips'),
  detected: document.getElementById('detected'),
  dataset: document.getElementById('dataset'),
  input: document.getElementById('input'),
  count: document.getElementById('count'),
  clearInput: document.getElementById('clear-input'),
  inlineToggle: document.getElementById('inline-toggle'),
  copy: document.getElementById('copy'),
  save: document.getElementById('save'),
  output: document.getElementById('output'),
  hintNote: document.getElementById('hint-note'),
  polyLegend: document.getElementById('poly-legend'),
  derivedLegend: document.getElementById('derived-legend'),
  savedList: document.getElementById('saved-list'),
  savedEmpty: document.getElementById('saved-empty'),
  clearAll: document.getElementById('clear-all'),
};

const state = {
  table: null,
  datasetId: null,
  requestedMode: 'auto',
  inline: false,
  overrides: new Map(),
  input: '',
  last: null, // { tokens, resolvedMode, detection }
};

/* ---------- preferences ---------- */

// The dictionary choice and the inline-readings toggle are remembered. The
// script mode always starts on "Auto" so stale detection overrides never
// silently follow you around.
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    if (typeof p.inline === 'boolean') state.inline = p.inline;
    if (typeof p.datasetId === 'string') state.datasetId = p.datasetId;
  } catch {
    /* ignore */
  }
}

function savePrefs() {
  try {
    localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ inline: state.inline, datasetId: state.datasetId })
    );
  } catch {
    /* ignore */
  }
}

/* ---------- theme ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  els.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  );
}

function initTheme() {
  let theme = 'light';
  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') theme = 'dark';
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  els.themeToggle.addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light'
        : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  });
}

/* ---------- dataset picker ---------- */

function buildDatasetSelect() {
  const manifest = datasets.getManifest();
  els.dataset.textContent = '';
  for (const d of manifest.datasets) {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.label} · ${d.characters.toLocaleString('en-US')}`;
    opt.title = `${d.description} (${d.characters.toLocaleString('en-US')} characters)`;
    els.dataset.appendChild(opt);
  }
  if (!datasets.isValidId(state.datasetId)) state.datasetId = manifest.default;
  els.dataset.value = state.datasetId;

  els.dataset.addEventListener('change', () => selectDataset(els.dataset.value));
}

// Switch the active dictionary. On failure, roll the picker back to whatever was
// working rather than leaving the app wedged.
async function selectDataset(id) {
  const previous = state.datasetId;
  if (id === previous && state.table) return;

  els.dataset.value = id;
  els.dataset.disabled = true;
  if (!datasets.isLoaded(id)) {
    els.output.classList.add('is-empty');
    els.output.textContent = 'Loading dictionary…';
  }

  try {
    state.table = await datasets.loadTable(id);
    state.datasetId = id;
    savePrefs();
    run();
  } catch (err) {
    console.error(err);
    els.dataset.value = previous;
    els.output.classList.add('is-empty');
    els.output.textContent =
      `Couldn't load dictionary. `;
    setTimeout(() => {
      if (state.last && state.datasetId === previous) run();
    }, 3000);
  } finally {
    els.dataset.disabled = false;
  }
}

/* ---------- chips ---------- */

function buildChips() {
  els.chips.textContent = '';
  MODES.forEach((mode) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.mode = mode;
    btn.textContent = MODE_LABELS[mode];
    btn.addEventListener('click', () => {
      state.requestedMode = mode;
      run();
    });
    els.chips.appendChild(btn);
  });
}

function syncChips() {
  const detected = state.last?.detection;
  const auto = state.requestedMode === 'auto';
  els.chips.querySelectorAll('.chip').forEach((btn) => {
    const m = btn.dataset.mode;
    btn.classList.toggle('is-active', m === state.requestedMode);
    btn.classList.toggle(
      'is-detected',
      auto && m !== 'auto' && detected?.mode === m && detected?.confident
    );
  });

  const d = state.last?.detection;
  const c = d?.counts;
  const hanCount = c ? c.simp + c.trad + c.jp + c.neutral : 0;
  if (!state.last || hanCount === 0) {
    // Nothing Chinese/Japanese typed yet — a script label would be noise.
    els.detected.textContent = '';
    return;
  }
  const resolved = state.last.resolvedMode;
  if (auto) {
    els.detected.textContent = d.confident
      ? `Detected: ${MODE_LABELS[resolved]}`
      : `Assuming: ${MODE_LABELS[resolved]}`;
  } else {
    els.detected.textContent =
      d.confident && d.mode !== resolved
        ? `Forced ${MODE_LABELS[resolved]} · looks like ${MODE_LABELS[d.mode]}`
        : `Forced: ${MODE_LABELS[resolved]}`;
  }
}

/* ---------- translation ---------- */

let debounce;
function scheduleRun() {
  clearTimeout(debounce);
  debounce = setTimeout(run, 150);
}

function run() {
  const text = els.input.value;
  state.input = text;
  els.count.textContent = `${[...text].length} chars`;

  state.overrides = new Map();
  state.last = translate(text, state.table, state.requestedMode);
  rerender();
  syncChips();
}

function rerender() {
  const { derived, poly } = renderOutput(els.output, state.last.tokens, {
    inline: state.inline,
    overrides: state.overrides,
    onOverrideChange: rerender,
  });
  // Each legend line shows only when the thing it explains is on screen.
  const showPoly = poly > 0;
  const showDerived =
    derived > 0 && !!datasets.entry(state.datasetId)?.hasDerived;
  els.polyLegend.hidden = !showPoly;
  els.derivedLegend.hidden = !showDerived;
  els.hintNote.hidden = !(showPoly || showDerived);
}

function currentOutputText() {
  if (!state.last) return '';
  return tokensToText(state.last.tokens, {
    inline: state.inline,
    overrides: state.overrides,
  });
}

/* ---------- saved translations ---------- */

function renderSaved(list) {
  els.savedList.textContent = '';
  els.savedEmpty.hidden = list.length > 0;
  els.clearAll.hidden = list.length === 0;

  list.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'saved-item';

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'saved-load';
    const src = document.createElement('span');
    src.className = 'saved-src';
    src.textContent = item.input;
    const out = document.createElement('span');
    out.className = 'saved-out';
    out.textContent = item.output;
    const meta = document.createElement('span');
    meta.className = 'saved-meta';
    const dsLabel = datasets.entry(item.dataset)?.label;
    meta.textContent = [MODE_LABELS[item.mode] || item.mode, dsLabel]
      .filter(Boolean)
      .join(' · ');
    main.append(src, out, meta);
    main.addEventListener('click', () => loadSaved(item));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'saved-del';
    del.setAttribute('aria-label', 'Delete this saved translation');
    del.textContent = '×';
    del.addEventListener('click', () => renderSaved(store.remove(item.id)));

    li.append(main, del);
    els.savedList.appendChild(li);
  });
}

async function loadSaved(item) {
  els.input.value = item.input;
  if (MODES.includes(item.mode)) state.requestedMode = item.mode;
  if (datasets.isValidId(item.dataset) && item.dataset !== state.datasetId) {
    await selectDataset(item.dataset); // runs the translation itself
  } else {
    run();
  }
  els.input.focus();
}

/* ---------- wiring ---------- */

function bind() {
  els.input.addEventListener('input', scheduleRun);
  els.clearInput.addEventListener('click', () => {
    els.input.value = '';
    run();
    els.input.focus();
  });

  els.inlineToggle.addEventListener('change', () => {
    state.inline = els.inlineToggle.checked;
    savePrefs();
    rerender();
  });

  els.copy.addEventListener('click', async () => {
    const text = currentOutputText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flash(els.copy, 'Copied');
    } catch {
      flash(els.copy, 'Copy failed');
    }
  });

  els.save.addEventListener('click', () => {
    const input = els.input.value.trim();
    const output = currentOutputText();
    if (!input || !output) return;
    renderSaved(
      store.save({
        input,
        output,
        mode: state.last.resolvedMode,
        dataset: state.datasetId,
      })
    );
    flash(els.save, 'Saved');
  });

  els.clearAll.addEventListener('click', () => {
    if (confirm('Delete all saved translations?')) renderSaved(store.clear());
  });
}

function flash(btn, msg) {
  const original = btn.dataset.label || btn.textContent;
  btn.dataset.label = original;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

/* ---------- boot ---------- */

async function boot() {
  initTheme();
  loadPrefs();
  els.inlineToggle.checked = state.inline;

  try {
    await Promise.all([whenReady(), datasets.loadManifest()]);
    buildDatasetSelect();
    state.table = await datasets.loadTable(state.datasetId);
  } catch (err) {
    console.error(err);
    els.status.textContent =
      'Could not load translation data. Check your connection and refresh.';
    els.status.classList.add('is-error');
    return;
  }

  els.status.hidden = true;
  els.translator.hidden = false;
  buildChips();
  bind();
  renderSaved(store.load());
  run();
  els.input.focus();
}

boot();
