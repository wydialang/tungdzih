// Guess whether a chunk of text is Traditional Chinese, Simplified Chinese, or
// Japanese (Shinjitai), by asking OpenCC to round-trip each character.
//
// For a CJK character `c`:
//   * if converting Simplified->Traditional changes it (and Traditional->
//     Simplified does not) then `c` only exists on the Simplified side  -> simp
//   * if converting Traditional->Simplified changes it (and the reverse does
//     not) then `c` has a distinct Simplified form -> it's a Traditional char
//   * if Shinjitai->Traditional changes it but it is not a Simplified char,
//     `c` is a Japanese-only shinjitai (売, 円, 図, 対, 独, ...) -> jp
//   * otherwise the character is shared across scripts -> neutral
//
// Shinjitai that happen to be identical to the Simplified form (学, 国, 会, ...)
// are counted as Simplified; see data/README.md.

import { getConverters } from './opencc.js';

const CJK = /\p{Script=Han}/u;

export const MODE_LABELS = {
  auto: 'Auto',
  t: 'Traditional',
  cn: 'Simplified',
  jp: 'Japanese',
};

export function detectScript(text) {
  const counts = { simp: 0, trad: 0, jp: 0, neutral: 0 };
  if (!text) return { mode: 't', counts, confident: false };

  const { s2t, t2s, jp2t } = getConverters();
  const seen = new Set();

  for (const ch of text) {
    if (!CJK.test(ch) || seen.has(ch)) continue;
    seen.add(ch);

    const hasTradForm = s2t(ch) !== ch; // ch looks like a simplified char
    const hasSimpForm = t2s(ch) !== ch; // ch has a simplified counterpart
    const hasJpShift = jp2t(ch) !== ch;

    if (hasTradForm && !hasSimpForm) counts.simp += 1;
    else if (hasSimpForm && !hasTradForm) counts.trad += 1;
    else if (hasJpShift && !hasTradForm) counts.jp += 1;
    else counts.neutral += 1;
  }

  let mode = 't';
  if (counts.jp > 0 && counts.jp >= counts.simp) mode = 'jp';
  else if (counts.simp > counts.trad) mode = 'cn';
  else if (counts.trad > 0) mode = 't';

  const confident = counts.simp + counts.trad + counts.jp > 0;
  return { mode, counts, confident };
}
