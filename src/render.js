// Render a token list (from translate.js) into the output panel.
//
// Two display modes:
//   inline  = false  -> polyphones show their selected reading with a dotted
//                       underline; hover/focus reveals a tooltip whose buttons
//                       switch that word's reading.
//   inline  = true   -> polyphones render as "reading1/reading2", no interaction.
//
// `overrides` is a Map<tokenIndex, readingIndex>; `onOverrideChange(map)` is
// called after the user picks a reading so the caller can re-render / re-sync.

import { NO_SPACE_BEFORE, NO_SPACE_AFTER } from './translate.js';

const CJK = /\p{Script=Han}/u;

export function renderOutput(container, tokens, opts = {}) {
  const { inline = false, overrides = new Map(), onOverrideChange } = opts;
  container.textContent = '';

  if (!tokens.length) {
    container.classList.add('is-empty');
    container.textContent = 'Tungdzih output will appear here.';
    return;
  }
  container.classList.remove('is-empty');

  let pendingSpace = false;
  let hasContent = false;

  const addText = (text) => {
    container.appendChild(document.createTextNode(text));
  };
  const spaceBefore = () => {
    if (hasContent && pendingSpace) addText(' ');
  };

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
    const readings = token.readings;
    spaceBefore();

    if (readings.length === 1) {
      addText(readings[0]);
    } else if (inline) {
      addText(readings.join('/'));
    } else {
      container.appendChild(
        buildPolyphone(token, i, overrides, onOverrideChange)
      );
    }
    pendingSpace = true;
    hasContent = true;
  });
}

function buildPolyphone(token, tokenIndex, overrides, onOverrideChange) {
  const selected = overrides.get(tokenIndex) ?? 0;

  const wrap = document.createElement('span');
  wrap.className = 'poly';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('aria-haspopup', 'true');
  wrap.setAttribute(
    'aria-label',
    `${token.source}: ${token.readings[selected]}. ${token.readings.length} readings available`
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
