// Frame selection, prefetch, block cell index, stepping order and partition path.
import { C, frameMeta, PERF, perf, perfMark, qName, state } from './state.js?v=dfa6aefcca';
import { $, clamp, dims, fmt, ohPart, setStatus, typeName } from './util.js?v=dfa6aefcca';
import { getJSON } from './data.js?v=dfa6aefcca';
import { buildPicture, loadPlanes } from './planes.js?v=dfa6aefcca';
import { updateBraidSelection } from './braid.js?v=dfa6aefcca';
import { loadFrameDiff } from './diff.js?v=dfa6aefcca';
import { fitView, requestRender } from './view.js?v=dfa6aefcca';
import { renderLegend } from './legend.js?v=dfa6aefcca';
import { ensureSymbols } from './symbols.js?v=dfa6aefcca';
import { renderTab } from './inspector.js?v=dfa6aefcca';
import { parseHash, writeHash } from './hash.js?v=dfa6aefcca';

// ------------------------------------------------------------- frames
export async function selectFrame(f) {
  if (!state.manifest) return;
  // Keep the selection on the same picture position across frames.
  let keepAt = null;
  if (state.sel >= 0 && state.payload) { const b = state.payload.blocks[state.sel]; keepAt = [b[C.x], b[C.y]]; }
  const pickGen = state.pickGen;
  state.f = f;
  state.loading = f;
  state.sel = -1; state.hover = -1;
  if (PERF) { perf.cur = { f }; perf.t0 = performance.now(); }
  if (state.symsFrame !== f) { state.syms = null; state.symsFrame = -1; }
  updateBraidSelection();
  updateFramePos();
  setStatus(`Loading frame ${f}…`);
  let payload = state.frameCache.get(f);
  if (!payload) {
    try {
      payload = await getJSON(`frames/${f}.json`);
    } catch (e) {
      setStatus(`Could not load frame ${f}: ${e.message}`);
      if (state.f === f) state.loading = -1;
      return;
    }
    state.frameCache.set(f, payload);
    if (state.frameCache.size > 64) state.frameCache.delete(state.frameCache.keys().next().value);
  }
  perfMark('payload');
  if (state.f !== f) return;
  state.payload = payload;
  buildCellIndex();
  perfMark('cells');
  state.fdiff = null;
  if (state.diff) {
    try { state.fdiff = await loadFrameDiff(f); } catch (e) { setStatus(`Could not load the diff of frame ${f}: ${e.message}`); }
    if (state.f !== f) return;
  }
  state.picture = await buildPicture(f);
  perfMark('picture');
  if (state.f !== f) return;
  if (!state.view.fitted) fitView();
  const hash = parseHash();
  const go = state.diffGoto && state.diffGoto.f === f ? state.diffGoto : null;
  if (go) {
    // First mismatch: the block holding the first differing sample, Diff tab.
    state.diffGoto = null;
    const pt = go.first_sample && go.first_sample.luma_xy;
    state.sel = pt ? blockAt(pt[0], pt[1]) : -1;
    if (state.sel < 0 && go.block) state.sel = blockAt(go.block.x, go.block.y);
    state.tab = 'diff';
    state.autoPick = false;
  } else if (state.pickGen !== pickGen) {
    // The user picked a block (or cleared the pick) while this frame loaded.
    state.sel = state.pickAt ? blockAt(state.pickAt[0], state.pickAt[1]) : -1;
  } else if (keepAt) state.sel = blockAt(keepAt[0], keepAt[1]);
  else if (hash.sel && hash.f === f) state.sel = blockAt(hash.sel[0], hash.sel[1]);
  else if (!state.autoSelected) {
    // First frame shown: select its most expensive block so the inspector has content.
    let best = -1, bits = -1;
    state.payload.blocks.forEach((b, i) => { if (!isChromaBlock(i) && (b[C.bits] || 0) > bits) { bits = b[C.bits] || 0; best = i; } });
    state.sel = best;
    state.autoPick = best >= 0;
  }
  state.autoSelected = true;
  state.loading = -1;
  renderLegend();
  requestRender();
  renderTab();
  perfMark('tab');
  writeHash();
  setStatus(frameSummary());
  state.symsPromise = ensureSymbols();
  schedulePrefetch();
}

// Loads the next frame (in the current stepping order) while the user looks
// at this one, so arrow-key stepping finds it cached.
let prefetchTimer = 0;
function schedulePrefetch() {
  clearTimeout(prefetchTimer);
  if (state.noPrefetch || state.source.kind !== 'url') return;
  prefetchTimer = setTimeout(async () => {
    if (!state.manifest) return;   // the stream was closed (Library delete)
    const list = orderedFrames();
    const i = list.findIndex((x) => x.f === state.f);
    const next = list[i + 1];
    if (!next || state.frameCache.has(next.f)) return;
    try {
      const payload = await getJSON(`frames/${next.f}.json`);
      state.frameCache.set(next.f, payload);
      const stages = next.stages || [];
      const need = { lfdelta: ['recon', 'prefilter'], residual: ['prefilter', 'pred'] }[state.stage] || [stages.includes(state.stage) ? state.stage : 'recon'];
      for (const st of need) if (stages.includes(st)) await loadPlanes(next.f, st);
    } catch (e) { /* prefetch is best effort */ }
  }, 120);
}

// Two 4x4-cell indexes: luma/shared blocks (what clicks select) and the
// separate chroma-tree blocks of semi-decoupled partitioning (AV2 SDP).
function buildCellIndex() {
  const fr = state.payload.frame;
  const cols = fr.mi_cols || Math.ceil(fr.width / 4), rows = fr.mi_rows || Math.ceil(fr.height / 4);
  const idx = new Int32Array(cols * rows).fill(-1);
  const cidx = new Int32Array(cols * rows).fill(-1);
  const blocks = state.payload.blocks;
  const isChroma = new Uint8Array(blocks.length);
  let nChroma = 0;
  blocks.forEach((b, i) => {
    const chroma = b[C.tree] === 'CHROMA';
    isChroma[i] = chroma ? 1 : 0;
    if (chroma) nChroma++;
    const target = chroma ? cidx : idx;
    const c0 = b[C.x] >> 2, r0 = b[C.y] >> 2;
    const c1 = Math.min(cols, (b[C.x] + b[C.w] + 3) >> 2), r1 = Math.min(rows, (b[C.y] + b[C.h] + 3) >> 2);
    for (let r = r0; r < r1; r++) target.fill(i, r * cols + c0, r * cols + c1);
  });
  state.cellIndex = { idx, cidx, cols, rows, isChroma, nChroma };
  state.lumaBlocks = blocks.filter((b, i) => !isChroma[i]);
  state.chromaBlocks = blocks.filter((b, i) => isChroma[i]);
}

function cellLookup(which, x, y) {
  const ci = state.cellIndex;
  if (!ci || x < 0 || y < 0) return -1;
  const c = x >> 2, r = y >> 2;
  if (c >= ci.cols || r >= ci.rows) return -1;
  return ci[which][r * ci.cols + c];
}
export const blockAt = (x, y) => cellLookup('idx', x, y);
export const chromaAt = (x, y) => cellLookup('cidx', x, y);
export const isChromaBlock = (i) => !!(state.cellIndex && state.cellIndex.isChroma[i]);

export function orderedFrames() {
  const frames = state.manifest.frames;
  if (state.order === 'output') {
    return frames.filter((x) => x.out_n !== null && x.out_n !== undefined).sort((a, b) => a.out_n - b.out_n)
      .concat(frames.filter((x) => x.out_n === null || x.out_n === undefined));
  }
  return frames;
}
export function stepFrame(d) {
  if (!state.manifest) return;
  const list = orderedFrames();
  const i = list.findIndex((x) => x.f === state.f);
  const j = clamp(i + d, 0, list.length - 1);
  if (j !== i) selectFrame(list[j].f);
}

function updateFramePos() {
  const fr = frameMeta(state.f);
  const n = state.manifest.frames.length;
  $('#framePos').innerHTML = `decode <b>${state.f}</b><span class="unit">/${n - 1}</span> &nbsp;out <b>${fr.out_n ?? '–'}</b>`;
}

// One sentence for the status bar and the Frame tab; values the frame does not
// have (a cut or damaged stream) are left out, never printed as null.
export function frameSummary() {
  const fr = frameMeta(state.f);
  const has = (v) => v !== null && v !== undefined && v !== '';
  const parts = [typeName(fr.frame_type), ohPart(fr).replace(/^, /, '')];   // "key", "order hint 0"
  if (has(fr.bytes)) parts.push(`${fmt(fr.bytes)} bytes`);
  if (has(fr.symbol_bits)) parts.push(`${fmt(fr.symbol_bits, 0)} entropy bits`);
  if (has(fr.blocks)) parts.push(`${fmt(fr.blocks)} blocks`);
  if (has(fr.base_qindex)) parts.push(`base ${qName()} ${fr.base_qindex}`);
  const none = state.picture && state.picture.kind === 'none' && state.payload && state.payload.frame.f === fr.f;
  return `Frame ${fr.f}: ${parts.filter(Boolean).join(', ')}${none ? '. No picture for this frame (the decoder produced no output).' : ''}`;
}

// ------------------------------------------------------ partition path
export function partitionPath(x, y, tree = 'luma') {
  const trees = (state.payload.ptree || []).filter((t) => t.tree === tree);
  for (const t of trees) {
    const [w, h] = dims(t.root[1]);
    if (x < t.x || y < t.y || x >= t.x + w || y >= t.y + h) continue;
    const out = [];
    let n = t.root;
    while (n) {
      const [part, bs, r, c, ch] = n;
      const [bw, bh] = dims(bs);
      out.push({ partition: part, bsize: bs, x: c * 4, y: r * 4, w: bw, h: bh });
      n = (ch || []).find((k) => { const [kw, kh] = dims(k[1]); return x >= k[3] * 4 && x < k[3] * 4 + kw && y >= k[2] * 4 && y < k[2] * 4 + kh; });
    }
    return out;
  }
  return [];
}
