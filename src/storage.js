// localStorage-backed list of saved translations.

const KEY = 'tungdzih.savedTranslations';
const CAP = 50;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore: storage unavailable or full */
  }
}

export function load() {
  return read();
}

export function save(entry) {
  const list = read();
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input: entry.input,
    output: entry.output,
    mode: entry.mode,
    dataset: entry.dataset,
    ts: Date.now(),
  };
  list.unshift(record);
  const trimmed = list.slice(0, CAP);
  write(trimmed);
  return trimmed;
}

export function remove(id) {
  const list = read().filter((item) => item.id !== id);
  write(list);
  return list;
}

export function clear() {
  write([]);
  return [];
}
