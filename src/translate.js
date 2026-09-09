// Character -> Tungdzih translation.
//
// The reading table (data/dict/<id>.json) is keyed purely by single
// OpenCC-standard Traditional characters, so non-Traditional input is first
// normalized one character at a time. Per-character (rather than phrase-level)
// conversion keeps the output aligned 1:1 with the input; the trade-off is that
// context-sensitive variant choices (e.g. 后 vs 後) are not made. See
// data/README.md.
//
// Table entries have the shape { r: ["reading", ...], d?: 1 } — `d` marks a
// reading that is auto-derived / unverified (baopaau-rime only).

import { getConverters } from './opencc.js';
import { detectScript } from './detect.js';

const CJK = /\p{Script=Han}/u;

function normalizeChar(ch, mode, conv) {
  if (!CJK.test(ch)) return ch;
  if (mode === 'cn') return conv.s2t(ch);
  if (mode === 'jp') return conv.s2t(conv.jp2t(ch));
  return ch;
}

/**
 * @param {string} text          raw user input
 * @param {object} table         { char: { r: [reading, ...], d?: 1 } }
 * @param {string} requestedMode 'auto' | 't' | 'cn' | 'jp'
 * @returns {{ tokens: Array, resolvedMode: string, detection: object }}
 */
export function translate(text, table, requestedMode = 'auto') {
  const detection = detectScript(text);
  const resolvedMode = requestedMode === 'auto' ? detection.mode : requestedMode;
  const conv = getConverters();

  const tokens = [];
  let rawBuffer = '';

  const flushRaw = () => {
    if (rawBuffer) {
      tokens.push({ type: 'raw', text: rawBuffer });
      rawBuffer = '';
    }
  };

  for (const ch of text) {
    const normalized = normalizeChar(ch, resolvedMode, conv);
    const hit = CJK.test(normalized) ? table[normalized] : undefined;
    if (hit && hit.r && hit.r.length) {
      flushRaw();
      tokens.push({
        type: 'syllable',
        source: ch,
        normalized,
        readings: hit.r,
        derived: !!hit.d,
      });
    } else {
      rawBuffer += ch;
    }
  }
  flushRaw();

  return { tokens, resolvedMode, detection };
}

// Punctuation that should hug the preceding / following word rather than get a
// space inserted next to it.
export const NO_SPACE_BEFORE =
  /^[\s，。！？；：、）】」』｝〉》〕”’…·—,.!?;:)\]}]/u;
export const NO_SPACE_AFTER = /[（【「『｛〈《〔“‘·—([{]$/u;

/** Plain-text rendering of a token list, honoring any per-syllable overrides. */
export function tokensToText(tokens, { inline = false, overrides = new Map() } = {}) {
  let out = '';
  let pendingSpace = false;

  tokens.forEach((token, i) => {
    if (token.type === 'syllable') {
      const word = inline
        ? token.readings.join('/')
        : token.readings[overrides.get(i) ?? 0];
      if (out && pendingSpace) out += ' ';
      out += word;
      pendingSpace = true;
    } else {
      // Preserve untranslated text verbatim, but guarantee whitespace between
      // it and any neighbouring syllable (unless punctuation says otherwise).
      const chunk = token.text;
      if (out && pendingSpace && !NO_SPACE_BEFORE.test(chunk)) out += ' ';
      out += chunk;
      pendingSpace = !/\s$/.test(chunk) && !NO_SPACE_AFTER.test(chunk);
    }
  });

  return out.trim();
}
