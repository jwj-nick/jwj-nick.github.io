// Viewer state, block column index, overlay and stage tables, codec facts and perf marks.

// ---------------------------------------------------------------- caches
// F-e (R49): the frame payloads, symbols and planes are kept within byte budgets, least recently used out first
// (they were counted in entries: 64 payloads, 24 symbol sets, 48 planes, several GB for a long 4K stream).
// keep(key) names the entries of the frame on screen, which stay whatever the budget.  The Map methods the
// modules use (get, has, set, delete, clear, keys, size) keep their meaning; set takes the entry's bytes.
export class ByteCache {
  constructor(budget, keep = () => false) {
    this.budget = budget; this.keep = keep; this.map = new Map(); this.bytes = 0; this.evicted = 0;
  }
  get size() { return this.map.size; }
  has(k) { return this.map.has(k); }
  get(k) {
    const e = this.map.get(k);
    if (!e) return undefined;
    this.map.delete(k); this.map.set(k, e);   // most recently used last
    return e.v;
  }
  set(k, v, bytes = 0) {
    this.delete(k);
    this.map.set(k, { v, n: bytes });
    this.bytes += bytes;
    this.trim();
    return this;
  }
  // the entry's bytes once known (an entry stored before its data arrived); only while that entry is still here
  resize(k, v, bytes) {
    const e = this.map.get(k);
    if (!e || e.v !== v) return;
    this.bytes += bytes - e.n; e.n = bytes;
    this.trim();
  }
  delete(k) {
    const e = this.map.get(k);
    if (!e) return false;
    this.bytes -= e.n; this.map.delete(k);
    return true;
  }
  clear() { this.map.clear(); this.bytes = 0; }
  keys() { return this.map.keys(); }
  trim() {
    if (this.bytes <= this.budget) return;
    for (const [k, e] of this.map) {
      if (this.bytes <= this.budget) break;
      if (this.keep(k)) continue;
      this.map.delete(k); this.bytes -= e.n; this.evicted++;
    }
  }
  // kept = bytes of the entries keep() holds (over the budget only by them)
  snap() {
    let kept = 0;
    for (const [k, e] of this.map) if (this.keep(k)) kept += e.n;
    return { bytes: this.bytes, budget: this.budget, entries: this.map.size, evicted: this.evicted, kept };
  }
}
// budgets in bytes; ?cachemb=N sets all three to N MB (the GUI scenario that checks eviction)
const MB = 1 << 20, CACHE_MB = +new URLSearchParams(location.search).get('cachemb') || 0;
export const CACHE_BUDGET = { planes: (CACHE_MB || 400) * MB, frames: (CACHE_MB || 200) * MB, syms: (CACHE_MB || 200) * MB };
// plane keys: "<f>:<stage>:<variant>", exact samples "x:<f>:<stage>:<variant>" (planes.js)
const planeFrame = (k) => +String(k).split(':')[String(k).startsWith('x:') ? 1 : 0];

// ---------------------------------------------------------------- state
export const state = {
  source: null, manifest: null, streams: [], streamIdx: -1,
  f: 0, payload: null, picture: null,
  frameCache: new ByteCache(CACHE_BUDGET.frames, (f) => f === state.f),
  planeCache: new ByteCache(CACHE_BUDGET.planes, (k) => planeFrame(k) === state.f),
  symCache: new ByteCache(CACHE_BUDGET.syms, (f) => f === state.f),
  syms: null, symsFrame: -1, symsPromise: null, noPrefetch: false,
  diff: null, fdiff: null, fdiffCache: new Map(), diffGoto: null,
  stage: 'recon', fill: 'mode', lines: new Set(['grid']), opacity: 0.45, lumaOnly: true,
  sel: -1, hover: -1, tab: 'block', order: 'decode',
  view: { s: 1, ox: 0, oy: 0, fitted: false },
  cellIndex: null, symFilter: '', symLimit: 400,
  loading: -1, pickGen: 0, pickAt: null,  // frame being loaded; last user pick (selectFrame keeps it)
  folderLabel: '',   // picker text of a folder opened with "Open bundle"
  openSeq: 0,   // streams the user opened (picker, Library, Open); a job opens its analysis only if this did not change
  // F-b pixel layer (R49, D-115). Track Y (pixels.js): picture component, colour matrix/range, sample grid,
  // split / side-by-side.  Track X (quality.js): the Quality dialog and the psnr fill.
  comp: 'y', matrix: 'auto', range: 'auto', grid: false, gridBase: 10,
  cmp: { mode: 'single', stage2: null, pos: 0.5 },
};
// block column -> index.  One object, refilled in place by openSource: modules import
// the binding, so it is never reassigned.
export const C = {};

export const FILLS = [
  { id: 'mode', label: 'Mode', key: 'm' }, { id: 'intermode', label: 'Inter mode', key: 'M' }, { id: 'ref', label: 'Reference', key: 'r' },
  { id: 'qindex', label: 'Qindex', key: 'q' }, { id: 'bits', label: 'Bits', key: 'b' },
  { id: 'skip', label: 'Skip', key: 's' },
  // F-c track B (modes.js, regions.js): transform type of the first transform block; segment (AV1, AV2, VP9 only:
  // blockdec.js syncDecisionChips takes it out for the other codecs)
  { id: 'txtype', label: 'Transform type', key: 'T' }, { id: 'segment', label: 'Segment', key: 'S' },
  { id: 'psnr', label: 'PSNR', key: 'z', diffOnly: true },   // diff mode only: block PSNR (quality.js syncDiffFills keeps it out otherwise)
  { id: 'cycles', label: 'HW cycles (draft)', key: 'w', arch: true }, { id: 'fetch', label: 'Ref fetch (draft)', key: 'f', arch: true },
  { id: 'none', label: 'No fill', key: 'n' },
];
export const hasArch = () => !!(state.manifest && state.manifest.arch);
export const LINES = [
  { id: 'grid', label: 'Blocks', key: 'g' }, { id: 'tx', label: 'Transforms', key: 't' },
  { id: 'mv', label: 'Motion', key: 'v' }, { id: 'sb', label: 'Superblocks', key: 'p' },
  { id: 'chroma', label: 'Chroma tree', key: 'h', chromaTree: true },
  // F-c track B: intra prediction direction (angles.js); slice and segment boundaries (regions.js, label per codec)
  { id: 'angle', label: 'Intra direction', key: 'A' }, { id: 'bounds', label: 'Slices', key: 'B' },
  { id: 'mismatch', label: 'Mismatch', key: 'd', diffOnly: true },
];
export const STAGES = {
  recon: 'Output (after loop filters)', prefilter: 'Before loop filters', pred: 'Prediction',
  lfdelta: 'Loop filter change', residual: 'Residual (prefilter − pred)',
};
export const BASE_STAGES = ['recon', 'prefilter', 'pred'];
const KIND_LABELS = { ref_decoder: 'reference decoder', c_model: 'C model', rtl_dump: 'RTL dump' };
export const kindLabel = (k) => KIND_LABELS[k] || String(k || '').replace(/_/g, ' ');
// B of a comparison as "<name> (<kind>)", once: a converted dump's Library name already ends in its kind ("mapping.yaml (C model)").
export const bLabel = (b) => {
  const t = b.title || 'B', k = b.kind ? kindLabel(b.kind) : '';
  return k && !t.toLowerCase().endsWith(`(${k.toLowerCase()})`) ? `${t} (${k})` : t;
};
// Diff mode adds "B:<stage>" (B's samples) and "D:<stage>" (exact A − B).
export const stageLabel = (st) => (st.startsWith('B:') ? `B: ${STAGES[st.slice(2)]}` : st.startsWith('D:') ? `A − B: ${STAGES[st.slice(2)]}` : STAGES[st]);

// quantizer scale of the stream's codec: AV1/AV2 qindex 0..255, VVC / HEVC QP 0..63
export const codecOf = () => ((state.manifest && state.manifest.stream && state.manifest.stream.codec) || '');
const isVvc = () => ['vvc', 'hevc'].includes(codecOf());
export const usesQp = () => ['vvc', 'hevc', 'avc'].includes(codecOf());   // QP codecs (AVC 0..51, VVC / HEVC 0..63)
// codec tools the inspector and the line chips show only where they exist
export const hasCdef = () => ['av1', 'av2'].includes(codecOf());
// A block's cdef_idx in words: -1 = its 64x64 unit read no CDEF index (every block there skips the residual),
// so CDEF does not filter it (T-0064, D-116); other values as they are.
export const CDEF_OFF = 'off (no CDEF index read: all blocks skip)';
export const cdefText = (v) => (v === -1 ? CDEF_OFF : v);
export const hasChromaTree = () => ['av2', 'vvc'].includes(codecOf());   // AV2 SDP, VVC dual tree
export const qMax = () => (codecOf() === 'avc' ? 51 : (isVvc() ? 63 : 255));
export const qName = () => (usesQp() ? 'QP' : 'qindex');
// manifest entry of decode frame f
export const frameMeta = (f) => state.manifest.frames.find((x) => x.f === f) || state.manifest.frames[0];

// ---------------------------------------------------------------- perf
// ?perf=1 times every frame load (fetch, parse, cell index, planes, picture,
// tab, first render), steps through all frames twice (cold: nothing cached,
// warm: viewer caches) and leaves the result in window.__vcaPerf for
// tools/gui_perf.mjs.  Off by default; no cost when off.
export const PERF = new URLSearchParams(location.search).has('perf');
export const perf = { cur: null, t0: 0 };
export function perfMark(name) { if (PERF && perf.cur && !(name in perf.cur)) perf.cur[name] = +(performance.now() - perf.t0).toFixed(1); }
export const fetchOpts = PERF ? { cache: 'no-store' } : undefined;

// Read-only probe of the caches (tests/gui snap().cache, tools/gui_perf.mjs): bytes, budget, entries and evictions
// of each, and what of the frame on screen is cached (its payload, plane keys, symbols).
export function cacheSnap() {
  const f = state.f;
  return {
    f, frames: state.frameCache.snap(), planes: state.planeCache.snap(), syms: state.symCache.snap(),
    onScreen: { payload: state.frameCache.has(f), planes: [...state.planeCache.keys()].filter((k) => planeFrame(k) === f), syms: state.symCache.has(f) },
  };
}
