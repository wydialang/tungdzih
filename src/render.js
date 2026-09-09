// Render a token list (from translate.js) into the output panel.
//
// Display modes:
//   inline = false -> polyphones show their selected reading with a dotted
//                     underline; hover/focus reveals a tooltip whose buttons
//                     switch that word's reading.
//   inline = true  -> polyphones render as "reading1/reading2", no interaction.
//
// A syllable whose reading is auto-derived / unverified (token.derived) gets a
// wavy underline and a short tooltip note, in either mode.
//
// `overrides` is a Map<tokenIndex, readingIndex>; `onOverrideChange(map)` is
// called after the user picks a reading so the caller can re-render.
//
// Returns { derived: <count of derived syllables rendered> }.

import { NO_SPACE_BEFORE, NO_SPACE_AFTER } from './translate.js';

const CJK = /\p{Script=Han}/u;
const DERIVED_NOTE = 'Auto-derived reading — not hand-verified.';

export function renderOutput(container, tokens, opts = {}) {
  const { inline = false, overrides = new Map(), onOverrideChange } = opts;
  container.textContent = '';

  if (!tokens.length) {
    container.classList.add('is-empty');
    container.textContent = 'Tungdzih output will appear here.';
    return { derived: 0 };
  }
  container.classList.remove('is-empty');

  let pendingSpace = false;
  let hasContent = false;
  let derivedCount = 0;

  const addText = (text) => container.appendChild(document.createTextNode(text));

  tokens.forEach((token, i) => {
    if (token.type === 'raw') {
      const chunk = token.text;
      if (hasContent && pendingSpace && !NO_SPACE_BEFORE.test(chunk)) addText(' ');
      addText(chunk);
      pendingSpace = !/\s$/.test(chunk) && !NO_SPACE_AFTER.test(chunk);
      if (chunk.trim()) hasContent = true;
      return;
    }

    // syllable
    const { readings, derived } = token;
    if (hasContent && pendingSpace) addText(' ');
    if (derived) derivedCount += 1;

    const multi = readings.length > 1;
    if (multi && !inline) {
      container.appendChild(buildPolyphone(token, i, overrides, onOverrideChange));
    } else if (multi) {
      container.appendChild(
        derived
          ? wrapDerived(readings.join('/'))
          : document.createTextNode(readings.join('/'))
      );
    } else {
      container.appendChild(
        derived ? wrapDerived(readings[0]) : document.createTextNode(readings[0])
      );
    }

    pendingSpace = true;
    hasContent = true;
  });

  return { derived: derivedCount };
}

function tooltip(lines) {
  const tip = document.createElement('span');
  tip.className = 'poly-tip';
  tip.setAttribute('aria-hidden', 'true');
  for (const text of lines) {
    const row = document.createElement('span');
    row.className = 'poly-tip-head';
    row.textContent = text;
    tip.appendChild(row);
  }
  return tip;
}

function wrapDerived(text) {
  const span = document.createElement('span');
  span.className = 'derived';
  span.tabIndex = 0;
  span.setAttribute('aria-label', `${text}. ${DERIVED_NOTE}`);
  span.append(document.createTextNode(text), tooltip([DERIVED_NOTE]));
  return span;
}

function buildPolyphone(token, tokenIndex, overrides, onOverrideChange) {
  const selected = overrides.get(tokenIndex) ?? 0;

  const wrap = document.createElement('span');
  wrap.className = token.derived ? 'poly derived' : 'poly';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('aria-haspopup', 'true');
  wrap.setAttribute(
    'aria-label',
    `${token.source}: ${token.readings[selected]}. ${token.readings.length} readings` +
      (token.derived ? `. ${DERIVED_NOTE}` : '')
  );

  const label = document.createElement('span');
  label.className = 'poly-label';
  label.textContent = token.readings[selected];
  wrap.appendChild(label);

  const tip = document.createElement('span');
  tip.className = 'poly-tip';
  tip.setAttribute('role', 'listbox');

  const head = document.createElement('span');
  head.className = 'poly-tip-head';
  head.textContent = CJK.test(token.normalized)
    ? `${token.normalized} · readings`
    : 'readings';
  tip.appendChild(head);

  token.readings.forEach((reading, idx) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'poly-opt';
    opt.textContent = reading;
    opt.setAttribute('role', 'option');
    if (idx === selected) {
      opt.classList.add('is-selected');
      opt.setAttribute('aria-selected', 'true');
    }
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      if (idx === 0) overrides.delete(tokenIndex);
      else overrides.set(tokenIndex, idx);
      onOverrideChange?.(overrides);
    });
    tip.appendChild(opt);
  });

  if (token.derived) {
    const note = document.createElement('span');
    note.className = 'poly-tip-note';
    note.textContent = DERIVED_NOTE;
    tip.appendChild(note);
  }

  wrap.appendChild(tip);

  // Keyboard: Enter/Space cycles to the next reading.
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const next = (selected + 1) % token.readings.length;
      if (next === 0) overrides.delete(tokenIndex);
      else overrides.set(tokenIndex, next);
      onOverrideChange?.(overrides);
    }
  });

  return wrap;
}
