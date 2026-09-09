// Dictionary manifest + lazy table loading.
//
// data/datasets.json lists the available reading tables (id, label, file,
// character count, …). Each table is data/dict/<id>.json with the shape
//   { "<char>": { "r": ["reading", ...], "d"?: 1 } }
// where "d" marks a reading that is auto-derived / unverified.
//
// Tables are fetched on demand and memoized, so switching back to a dictionary
// that was already loaded is instant.

let manifest = null;
const cache = new Map(); // id -> table object

export async function loadManifest() {
  const res = await fetch('data/datasets.json');
  if (!res.ok) throw new Error(`datasets.json: HTTP ${res.status}`);
  manifest = await res.json();
  return manifest;
}

export function getManifest() {
  return manifest;
}

export function entry(id) {
  return manifest?.datasets.find((d) => d.id === id) || null;
}

export function isValidId(id) {
  return !!entry(id);
}

export async function loadTable(id) {
  if (cache.has(id)) return cache.get(id);
  const meta = entry(id);
  if (!meta) throw new Error(`unknown dataset: ${id}`);
  const url = `data/${meta.file}`;

  // `no-cache` = always revalidate with the server. Guards against a stale or
  // half-written response getting stuck in the HTTP cache from an earlier load.
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const table = await res.json();
      cache.set(id, table);
      return table;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export function isLoaded(id) {
  return cache.has(id);
}
