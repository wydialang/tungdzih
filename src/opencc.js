// Thin wrapper around the global `OpenCC` UMD bundle (loaded in index.html).
//
// Three directions are needed:
//   s2t  — Simplified  -> OpenCC-standard Traditional
//   t2s  — Traditional -> Simplified            (used only for script detection)
//   jp2t — Japanese Shinjitai -> Traditional    (experimental in opencc-js)
//
// Converters are built lazily and memoized: constructing them touches large
// dictionaries, and `whenReady()` gives the app a single promise to await.

let converters = null;
let readyPromise = null;

function build() {
  if (typeof OpenCC === 'undefined') {
    throw new Error('OpenCC bundle is not loaded');
  }
  const make = (from, to) => {
    try {
      return OpenCC.Converter({ from, to });
    } catch (err) {
      console.warn(`OpenCC.Converter({from:'${from}',to:'${to}'}) failed`, err);
      return (input) => input; // identity fallback
    }
  };
  return {
    s2t: make('cn', 't'),
    t2s: make('t', 'cn'),
    jp2t: make('jp', 't'),
  };
}

/**
 * Resolve once the OpenCC global is present, then build the converters.
 * Polls briefly because the CDN <script> may still be in flight at module load.
 */
export function whenReady({ timeoutMs = 15000, intervalMs = 50 } = {}) {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (typeof OpenCC !== 'undefined') {
        converters = build();
        resolve(converters);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Timed out waiting for the OpenCC bundle to load'));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
  return readyPromise;
}

export function getConverters() {
  if (!converters) converters = build();
  return converters;
}
