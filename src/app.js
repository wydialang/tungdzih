import { whenReady } from './opencc.js';
import { MODE_LABELS } from './detect.js';
import { translate, tokensToText } from './translate.js';
import { renderOutput } from './render.js';
import * as store from './storage.js';

const PREF_KEY = 'tungdzih.prefs';
const MODES = ['auto', 't', 'cn', 'jp'];

const els = {
  status: document.getElementById('status'),
  translator: document.getElementById('translator'),
  chips: document.getElementById('chips'),
  detected: document.getElementById('detected'),
  input: document.getElementById('input'),
  count: document.getElementById('count'),
  clearInput: document.getElementById('clear-input'),
  inlineToggle: document.getElementById('inline-toggle'),
  copy: document.getElementById('copy'),
  save: document.getElementById('save'),
  output: document.getElementById('output'),
  savedList: document.getElementById('saved-list'),
  savedEmpty: document.getElementById('saved-empty'),
  clearAll: document.getElementById('clear-all'),
};

const state = {
  table: null,
  requestedMode: 'auto',
  inline: false,
  overrides: new Map(),
  last: null, // { tokens, resolvedMode, detection }
};

/* ---------- preferences ---------- */

// Only the inline-readings toggle is remembered. The script mode always starts
// on "Auto" so stale detection overrides never silently follow you around.
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    if (typeof p.inline === 'boolean') state.inline = p.inline;
  } catch {
    /* ignore */
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ inline: state.inline }));
  } catch {
    /* ignore */
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
      savePrefs();
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

  if (!state.last || !state.input?.length) {
    els.detected.textContent = '';
    return;
  }
  const resolved = state.last.resolvedMode;
  if (auto) {
    els.detected.textContent = state.last.detection.confident
      ? `Detected: ${MODE_LABELS[resolved]}`
      : `Assuming: ${MODE_LABELS[resolved]}`;
  } else {
    const d = state.last.detection;
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

  renderOutput(els.output, state.last.tokens, {
    inline: state.inline,
    overrides: state.overrides,
    onOverrideChange: rerender,
  });
  syncChips();
}

function rerender() {
  renderOutput(els.output, state.last.tokens, {
    inline: state.inline,
    overrides: state.overrides,
    onOverrideChange: rerender,
  });
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
    meta.textContent = MODE_LABELS[item.mode] || item.mode;
    main.append(src, out, meta);
    main.addEventListener('click', () => {
      els.input.value = item.input;
      if (MODES.includes(item.mode)) {
        state.requestedMode = item.mode;
        savePrefs();
      }
      run();
      els.input.focus();
    });

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
    renderSaved(store.save({ input, output, mode: state.last.resolvedMode }));
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
  loadPrefs();
  buildChips();
  els.inlineToggle.checked = state.inline;

  try {
    const [tableRes] = await Promise.all([
      fetch('data/transcription.json').then((r) => {
        if (!r.ok) throw new Error(`transcription.json: HTTP ${r.status}`);
        return r.json();
      }),
      whenReady(),
    ]);
    state.table = tableRes;
  } catch (err) {
    console.error(err);
    els.status.textContent =
      'Could not load translation data. Check your connection and refresh.';
    els.status.classList.add('is-error');
    return;
  }

  els.status.hidden = true;
  els.translator.hidden = false;
  bind();
  renderSaved(store.load());
  run();
  els.input.focus();
}

boot();
