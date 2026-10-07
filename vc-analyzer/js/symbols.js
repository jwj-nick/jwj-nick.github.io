// Entropy-decoded symbols of a frame: loading, typed columns, per-block lookup.
import { perfMark, state } from './state.js?v=84f66b0ecd';
import { setStatus } from './util.js?v=84f66b0ecd';
import { getJSON } from './data.js?v=84f66b0ecd';
import { renderTab } from './inspector.js?v=84f66b0ecd';

// --------------------------------------------------------------- symbols
// element name and reader source of symbol type id
export function symtype(id) {
  const t = state.manifest.symtypes;
  const row = t[id] && t[id][0] === id ? t[id] : t.find((x) => x[0] === id);
  return row ? { name: row[1], file: row[2], line: row[3] } : { name: '#' + id };
}

// One frame's symbols as typed columns {count, type, value, mode, bits, block};
// symbol n = index.  Bundle v2 keeps them in frames/<f>.sym.json (loaded after
// the picture is on screen); v1 inlined rows [n, type, value, mode, bits, block].
function symbolsFromRows(rows) {
  const n = rows.length;
  const s = { count: n, type: new Int32Array(n), value: new Int32Array(n), mode: new Int32Array(n), bits: new Float64Array(n), block: new Int32Array(n) };
  rows.forEach((r, i) => { s.type[i] = r[1]; s.value[i] = r[2]; s.mode[i] = r[3]; s.bits[i] = r[4]; s.block[i] = r[5]; });
  return s;
}
function symbolsFromColumns(d) {
  const bits = new Float64Array(d.count);
  for (let i = 0; i < d.count; i++) bits[i] = d.bits_q16[i] / 65536;
  return { count: d.count, type: Int32Array.from(d.type), value: Int32Array.from(d.value), mode: Int32Array.from(d.mode), bits, block: Int32Array.from(d.block) };
}
export const hasSymbols = (p) => !!(p && (p.symbols || p.sym));
export const symbolsReady = () => state.symsFrame === state.f;
async function loadSymbols(f, payload) {
  if (state.symCache.has(f)) return state.symCache.get(f);
  let s = null;
  if (payload.symbols) s = symbolsFromRows(payload.symbols);
  else if (payload.sym) s = symbolsFromColumns(await getJSON(payload.sym.file));
  state.symCache.set(f, s);
  if (state.symCache.size > 24) state.symCache.delete(state.symCache.keys().next().value);
  return s;
}
// Makes state.syms the current frame's symbols; re-renders the tab when they arrive.
export async function ensureSymbols() {
  const f = state.f, payload = state.payload;
  if (!payload || symbolsReady()) return;
  if (!hasSymbols(payload)) { state.syms = null; state.symsFrame = f; return; }
  try {
    const s = await loadSymbols(f, payload);
    if (state.f !== f) return;
    state.syms = s; state.symsFrame = f;
    perfMark('syms');
    if (state.tab === 'block' || state.tab === 'syntax') renderTab();
  } catch (e) {
    if (state.f === f) setStatus(`Could not load the symbols of frame ${f}: ${e.message}`);
  }
}
// Indices of the symbols attributed to block bi; null while they are loading.
export function symbolsOfBlock(bi) {
  if (!symbolsReady()) return null;
  const s = state.syms, out = [];
  if (!s) return out;
  for (let i = 0; i < s.count; i++) if (s.block[i] === bi) out.push(i);
  return out;
}
