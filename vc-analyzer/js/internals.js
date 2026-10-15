// F-g G2 (T-0053, FEATURES F51, F52; SERVER_API.md section 21): the decoder internals of a frame, the transform
// blocks with their coefficients and residual (coef.json, resid.bin) and the deblocking kernel segments (dbk.json,
// dbk.samples.json), read on request from the bundle (manifest.internals names the frames that have them) or from
// `vca serve`, which answers 404 internals_missing with the job that makes them (job_hint).  This module reads
// them, draws the nonzero coefficient fill (Shift+N) and the Tx blocks (Shift+X) and Edges (Shift+L) lines, picks
// the edge nearest an Alt+click, and writes the Block tab's Transform blocks and Edges sections with "Compute".
// The dialogs are coefs.js and edges.js.  What a codec's dumper can give comes from the payload (stages, caps,
// names, thresholds): no table per codec here.
import { C, FILLS, LINES, frameMeta, state } from './state.js?v=25b3a2d3d6';
import { $, esc, fmt, ramp, rgb, setStatus } from './util.js?v=25b3a2d3d6';
import { caps, getBlob, getJSON, serverLost, shownEntry, withToken } from './data.js?v=25b3a2d3d6';
import { api } from './api.js?v=25b3a2d3d6';
import { requestRender, toImage } from './view.js?v=25b3a2d3d6';
import { renderLegend } from './legend.js?v=25b3a2d3d6';
import { renderTab } from './inspector.js?v=25b3a2d3d6';
import { renderChips } from './controls.js?v=25b3a2d3d6';
import { openCoefs, coefsChanged } from './coefs.js?v=25b3a2d3d6';
import { edgesChanged, openEdge } from './edges.js?v=25b3a2d3d6';
// F-g W7 (cands.js): the Candidates and Intra neighbours sections, the Cands arrows, their legend and chip
import { CANDS_TITLE, candsChipWhy, candsClick, candsLegendHtml, candsSectionsHtml, drawCands, syncCands } from './cands.js?v=25b3a2d3d6';

// ------------------------------------------------------------ chips (added to the shared lists in place, as
// blockdec.js and quality.js do; controls.js shows the internals ones only while the stream has internals)
const NZC = { id: 'nzc', label: 'Nonzero coefs', key: 'N', internals: true };
FILLS.splice(Math.max(0, FILLS.findIndex((f) => f.id === 'psnr')), 0, NZC);
LINES.splice(Math.max(0, LINES.findIndex((l) => l.id === 'mismatch')), 0,
  { id: 'txb', label: 'Tx blocks', key: 'X', internals: true }, { id: 'edges', label: 'Edges', key: 'L', internals: true });
const TITLES = {
  nzc: 'Fill blocks by their number of nonzero coefficients, from the decoder (all planes the block carries; Shift+N)',
  txb: 'The transform blocks the decoder read coefficients for, luma (Shift+X)',
  edges: 'The deblocking edges the decoder filtered, luma, coloured by filter length; Alt+click one to open it (Shift+L)',
};
// (cands.js's title is read when a chip is drawn, never while the modules evaluate)
export const internalsChipTitle = (id) => (id === 'cands' ? CANDS_TITLE : TITLES[id] || '');

// ------------------------------------------------------------ state
const TPL = { file: 'internals.json', coef: 'internals/<f>/coef.json', resid: 'internals/<f>/resid.bin', dbk: 'internals/<f>/dbk.json', dbk_samples: 'internals/<f>/dbk.samples.json' };
const CACHE_FRAMES = 6;
let man = null;                 // the manifest the state below belongs to
let listed = new Set();         // frames known to have internals (manifest.internals, then internals.json after a job)
let more = false;               // a job made internals (the chips show although the manifest had none)
const frames = new Map();       // f -> entry (load())
let drawn = { f: null, txb: 0, edges: 0, lengths: [] };
let lastPick = null;
let chipsKey = '';

const info = () => (state.manifest && state.manifest.internals) || null;
const served = () => !!(state.source && state.source.kind === 'url' && caps.server && /\/api\/a\/[^/]+\/$/.test(state.source.base));
const pathOf = (kind, f) => String((info() && info()[kind]) || TPL[kind]).replace('<f>', f);
// A bundle names the kinds it holds (manifest.internals.kinds): one with only entropy or candidate kinds has no
// coefficient or deblocking file to read (W7; vca serve answers 404 internals_missing with a Compute instead)
const KIND_WORDS = { ec: 'the entropy decoder state', cdf: 'the probability tables', cands: 'the motion vector candidates' };
const coefKinds = () => { const k = (info() && info().kinds) || null; return !k || k.includes('coef') || k.includes('dbk'); };
export const internalsShown = () => !!((info() && (served() || coefKinds())) || more);

function bind() {
  if (man === state.manifest) return;
  man = state.manifest;
  frames.clear(); more = false; drawn = { f: null, txb: 0, edges: 0, lengths: [] }; lastPick = null;
  listed = new Set(((info() && info().frames) || []).map(Number));
  // another stream without internals: the internals fill and lines go (their chips are not shown); nothing before
  // the first manifest (a fill or lines restored from the URL wait for it)
  if (state.manifest && !info()) {
    if (state.fill === 'nzc') state.fill = 'mode';
    state.lines.delete('txb'); state.lines.delete('edges');
  }
}

// ------------------------------------------------------------ reading
class Missing extends Error {
  constructor(message, info) { super(message); this.info = info || {}; }
}
// A path of the data contract: JSON (or bytes) from the bundle, the opened folder or the server.  The server's
// 404 internals_missing becomes Missing with its error object (message, hint, job_hint).
async function read(rel, bytes = false) {
  if (state.source.kind === 'files') return bytes ? (await getBlob(rel)).arrayBuffer() : getJSON(rel);
  // no ?r= revision (the server refuses parameters on these paths) and no cache: a job changes them
  const url = state.source.base + rel;
  let r;
  try { r = await fetch(url, withToken(url, { cache: 'no-cache' })); } catch (e) { serverLost(); throw new Error('the local server did not answer'); }
  if (!r.ok) {
    let er = null;
    try { er = (await r.json()).error; } catch (e) { er = null; }
    if (er && er.code === 'internals_missing') throw new Missing(er.message, er);
    throw new Error(er && er.message ? er.message : `HTTP ${r.status}`);
  }
  return bytes ? r.arrayBuffer() : r.json();
}

// The frame's entry: {f, status: loading | ready | none | missing | error | computing, coef, dbk, resid, miss, err,
// job, samples}.  none = the bundle has no internals for it (no request); missing = the server's 404.
export function entryOf(f) { bind(); return frames.get(f) || null; }
export function load(f) {
  bind();
  let e = frames.get(f);
  if (e && e.status !== 'error') return e.p || Promise.resolve(e);
  if (!served() && (!listed.has(f) || !coefKinds())) {
    e = { f, status: 'none', p: null, kindless: listed.has(f) };
    frames.set(f, e);
    return Promise.resolve(e);
  }
  // vca serve: its manifest lists the frames that have internals (and is read again after an internals job ends,
  // SERVER_API.md section 21 item 7), so a frame it does not list is missing without asking for coef.json and
  // dbk.json: no 404 for every frame stepped to before Compute (T-0069 D10).  The sentence and the job are the
  // server's 404 answer (vca serve: the message of internals.Missing, job_hint of the internals route).
  if (served() && (!listed.has(f) || !coefKinds())) {
    e = { f, status: 'missing', p: null, coef: null, dbk: null, resid: null, err: '', job: null, samples: null, segSamples: new Map(), miss: missingOf(f) };
    frames.set(f, e);
    trim(f);
    return Promise.resolve(e);
  }
  const m = man;
  e = { f, status: 'loading', coef: null, dbk: null, resid: null, miss: null, err: '', job: null, samples: null, segSamples: new Map() };
  frames.set(f, e);
  trim(f);
  e.p = (async () => {
    const part = async (kind, bytes) => {
      try { return await read(pathOf(kind, f), bytes); } catch (x) {
        if (x instanceof Missing) { e.miss = e.miss || { kind, ...x.info, message: x.message }; return null; }
        throw x;
      }
    };
    try {
      const [coef, dbk] = await Promise.all([part('coef'), part('dbk')]);
      let resid = null;
      if (coef && coef.resid && coef.resid.samples) {
        const buf = await part('resid', true);
        // int16 little endian (SERVER_API.md section 21); the typed array reads the platform order, little
        // endian on every machine a browser runs on here
        resid = buf ? new Int16Array(buf, 0, buf.byteLength >> 1) : null;
      }
      Object.assign(e, { coef, dbk, resid, nzc: coef ? countNzc(coef) : null });
      e.status = coef || dbk ? 'ready' : 'missing';
      if (coef || dbk) listed.add(f);
    } catch (x) {
      e.status = 'error';
      e.err = String((x && x.message) || x);
    }
    e.p = null;
    if (m === man) changed();
    return e;
  })();
  return e.p;
}
// What vca serve's 404 internals_missing says for coef.json of frame f: the sentence, and the job that makes the
// frame's internals (none on a comparison or a --diff server, as the server answers)
function missingOf(f) {
  const m = /\/api\/a\/([^/]+)\/$/.exec(state.source.base), ent = shownEntry();
  const job = caps.jobs && m && !state.diff && !(ent && ent.kind === 'diff')
    ? { kind: 'internals', analysis: decodeURIComponent(m[1]), frames: String(f), kinds: ['all'] } : null;
  return { kind: 'coef', f, code: 'internals_missing', message: `Frame ${f} has no coefficient internals.`, job_hint: job };
}
function trim(keep) {
  if (frames.size <= CACHE_FRAMES) return;
  for (const k of frames.keys()) { if (frames.size <= CACHE_FRAMES) break; if (k !== keep && k !== state.f && frames.get(k).status !== 'computing') frames.delete(k); }
}
// Something about the frame on screen changed: draw it again, its legend, chips, Block tab and open dialogs.
function changed() {
  requestRender(); renderLegend(); syncChips(true);
  if (state.tab === 'block') renderTab();
  coefsChanged(); edgesChanged();
}

// Column index of a payload table ({cols, rows}).
export const colsOf = (t) => Object.fromEntries((t ? t.cols : []).map((c, i) => [c, i]));
// Nonzero coefficients per frames/<f>.json block: the sum of nnz over its transform blocks (every plane the block
// carries), and whether it read any transform block.
function countNzc(coef) {
  const T = colsOf(coef.txb), n = new Map();
  let max = 0;
  for (const r of coef.txb.rows) {
    const b = r[T.blk];
    if (b < 0) continue;
    const v = (n.get(b) || 0) + r[T.nnz];
    n.set(b, v);
    if (v > max) max = v;
  }
  return { n, max };
}

// Dequantized coefficient windows of segment si of frame f: {before, after, changed, lines, win, q0} or null
// (not captured, or no dbk.samples.json).  The server sends the windows around a luma region (the segment's);
// a bundle or a folder has one file of every segment, read once.
export async function samplesOf(f, si) {
  const e = await load(f);
  if (!e.dbk || !e.dbk.samples) return null;
  const pick = (o) => {
    const k = o.segs.indexOf(si);
    return k < 0 ? null : { before: o.before[k], after: o.after[k], changed: o.changed[k], lines: o.lines, win: o.win, q0: o.q0 };
  };
  if (e.segSamples.has(si)) return e.segSamples.get(si);
  let got = null;
  if (served()) {
    const G = colsOf(e.dbk.segs), r = e.dbk.segs.rows[si], ss = e.dbk.subsampling || [1, 1];
    const sx = r[G.plane] ? ss[0] : 0, sy = r[G.plane] ? ss[1] : 0;
    const win = e.dbk.samples.win || 16, lines = r[G.lines] || 4;
    const box = r[G.dir] === 0 ? [r[G.x] - win / 2, r[G.y], win, lines] : [r[G.x], r[G.y] - win / 2, lines, win];
    const q = `?x=${Math.max(0, box[0] << sx)}&y=${Math.max(0, box[1] << sy)}&w=${box[2] << sx}&h=${box[3] << sy}`;
    got = pick(await read(pathOf('dbk_samples', f) + q));
  } else {
    if (!e.samples) e.samples = read(pathOf('dbk_samples', f)).catch(() => null);
    const o = await e.samples;
    got = o ? pick(o) : null;
  }
  e.segSamples.set(si, got);
  return got;
}

// ------------------------------------------------------------ what the frame lacks, in words
const exportCmd = 'python -m vca export <analysis> -o <folder> --internals-frames A-B';
function rangeText(list) {
  const a = [...list].sort((x, y) => x - y);
  if (!a.length) return '';
  const runs = [];
  for (const v of a) { const l = runs[runs.length - 1]; if (l && v === l[1] + 1) l[1] = v; else runs.push([v, v]); }
  return runs.map(([x, y]) => (x === y ? `${x}` : `${x}–${y}`)).join(', ');
}
// Why frame f shows no internals (empty while they load or are there).
export function whyNot(f = state.f) {
  bind();
  const e = frames.get(f);
  if (!e || e.status === 'loading' || e.status === 'ready') return '';
  if (e.status === 'computing') return `The internals of frame ${f} are being computed.`;
  if (e.status === 'error') return `The internals of frame ${f} could not be read (${e.err}).`;
  if (e.status === 'none') {
    if (e.kindless) {
      const ks = ((info() && info().kinds) || []).map((k) => KIND_WORDS[k] || k);
      return `This bundle has no transform coefficients or deblocking edges${ks.length ? ` (it holds ${ks.join(' and ')})` : ''}. Bundles get them with ${exportCmd}, for codecs whose dumper writes them.`;
    }
    return listed.size
      ? `This bundle has decoder internals for frames ${rangeText(listed)} only, not for frame ${f}. Export it again with ${exportCmd} for the frames you need.`
      : `This bundle has no decoder internals (transform coefficients, deblocking edges). Bundles get them with ${exportCmd}, for codecs whose dumper writes them.`;
  }
  return (e.miss && e.miss.message) || `Frame ${f} has no decoder internals.`;
}
const canCompute = (e) => !!(e && e.status === 'missing' && e.miss && e.miss.job_hint && caps.jobs);
// A sentence as HTML: the export command and command options (--internals) in the mono font, where the text font
// draws "--" as one long dash (issues.js does the same).
const prose = (s) => String(s).split(exportCmd).map((t) => esc(t).replace(/(^|[\s(])(--[A-Za-z][\w-]*)/g, '$1<code>$2</code>'))
  .join(`<code>${esc(exportCmd)}</code>`);

// ------------------------------------------------------------ Compute (vca serve with jobs)
async function compute(f) {
  const e = frames.get(f);
  if (!canCompute(e)) return;
  e.status = 'computing';
  e.job = { state: 'queued', fraction: null };
  changed();
  let job;
  try {
    job = await api('api/jobs', { method: 'POST', body: e.miss.job_hint });
  } catch (x) {
    e.status = 'missing'; e.job = { state: 'failed', error: { message: x.message, hint: x.hint } };
    changed();
    return;
  }
  e.job = job;
  const m = man;
  for (;;) {
    await new Promise((r) => setTimeout(r, 400));
    if (m !== man) return;
    try { job = await api(`api/jobs/${encodeURIComponent(job.id)}`); } catch (x) { continue; }
    e.job = job;
    if (job.state === 'queued' || job.state === 'running') { changed(); continue; }
    break;
  }
  if (job.state !== 'succeeded') { e.status = 'missing'; changed(); return; }
  // the server's index now lists the frame: read it, then the frame's files
  try {
    const ix = await read(TPL.file);
    for (const k of Object.keys(ix.frames || {})) listed.add(+k);
  } catch (x) { listed.add(f); }
  more = true;
  frames.delete(f);
  if (m !== man) return;
  await load(f);
  frames.get(f).job = job;    // the section says it was computed
  changed();
}

// ------------------------------------------------------------ canvas: fill and lines
// The nonzero coefficient fill: log ramp up to the frame's largest count, dark for blocks whose transform blocks
// hold none, unfilled for blocks that read no transform block (skip).
export const NZC_ZERO = 'rgb(20,24,30)';
export const nzcColour = (n, max) => (n > 0 ? rgb(ramp(Math.log1p(n) / Math.log1p(max || 1))) : NZC_ZERO);
export function nzcFill() {
  const e = entryOf(state.f);
  if (!e || !e.nzc) return () => null;
  const ix = blockIndex(), { n, max } = e.nzc;
  return (b) => { const i = ix.get(b); return n.has(i) ? nzcColour(n.get(i), max) : null; };
}
let ixCache = { p: null, map: null };
function blockIndex() {
  const p = state.payload;
  if (ixCache.p !== p) ixCache = { p, map: new Map((p ? p.blocks : []).map((b, i) => [b, i])) };
  return ixCache.map;
}

const LEN_COLOURS = { 4: '#4b8dff', 6: '#3fb8af', 8: '#9be15d', 10: '#b07cf7', 14: '#ff66c4', 18: '#e76f6f' };
export const edgeLen = (r, G) => Math.max(r[G.len_neg], r[G.len_pos]);
export const lenColour = (len) => LEN_COLOURS[len] || '#cfd8dc';
// vis = [x0, y0, x1, y1] (image units), px = one CSS pixel in image units
export function drawInternals(ctx, vis, px, record) {
  if (!state.lines.has('txb') && !state.lines.has('edges')) {
    if (record) drawn = { f: state.f, txb: 0, edges: 0, lengths: [] };
    drawCands(ctx, vis, px, record);     // F-g W7: the selected block's candidate MVs on top (cands.js)
    return;
  }
  const e = entryOf(state.f), out = { f: state.f, txb: 0, edges: 0, lengths: [] };
  const inside = (x0, y0, x1, y1) => !(x0 > vis[2] || y0 > vis[3] || x1 < vis[0] || y1 < vis[1]);
  ctx.save();
  ctx.setLineDash([]);
  if (state.lines.has('txb') && e && e.coef) {
    const T = colsOf(e.coef.txb);
    // dashed light lines: apart from the block grid (solid white) and the Edges colours
    ctx.lineWidth = px; ctx.strokeStyle = 'rgba(232,237,243,0.9)'; ctx.setLineDash([2 * px, 2 * px]);
    ctx.beginPath();
    for (const r of e.coef.txb.rows) {
      if (r[T.plane] !== 0 || !inside(r[T.x], r[T.y], r[T.x] + r[T.w], r[T.y] + r[T.h])) continue;
      ctx.rect(r[T.x] + px / 2, r[T.y] + px / 2, r[T.w] - px, r[T.h] - px);
      out.txb++;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state.lines.has('edges') && e && e.dbk) {
    const G = colsOf(e.dbk.segs), by = new Map();
    for (const r of e.dbk.segs.rows) {
      if (r[G.plane] !== 0) continue;
      const v = r[G.dir] === 0, x1 = v ? r[G.x] : r[G.x] + r[G.lines], y1 = v ? r[G.y] + r[G.lines] : r[G.y];
      if (!inside(r[G.x], r[G.y], x1, y1)) continue;
      const len = edgeLen(r, G);
      if (!by.has(len)) by.set(len, []);
      by.get(len).push([r[G.x], r[G.y], x1, y1]);
      out.edges++;
    }
    for (const [w, col] of [[4 * px, 'rgba(0,0,0,0.6)'], [2 * px, null]]) {
      ctx.lineWidth = w; ctx.lineCap = 'butt';
      for (const [len, list] of by) {
        ctx.strokeStyle = col || lenColour(len);
        ctx.beginPath();
        for (const [a, b, c, d] of list) { ctx.moveTo(a, b); ctx.lineTo(c, d); }
        ctx.stroke();
      }
    }
    out.lengths = [...by.keys()].sort((a, b) => a - b);
  }
  ctx.restore();
  if (record) drawn = out;
  drawCands(ctx, vis, px, record);
}

// ------------------------------------------------------------ Alt+click: the nearest luma edge within 4 px
const PICK_PX = 4;
export function pickEdgeAt(cx, cy) {
  const e = entryOf(state.f);
  if (!e || !e.dbk) {
    const why = whyNot() || 'The deblocking edges of this frame are still being read.';
    setStatus(why);
    lastPick = { at: null, seg: -1, why };
    if (!e) load(state.f);
    return -1;
  }
  const [ix, iy] = toImage(cx, cy), s = state.view.s, G = colsOf(e.dbk.segs);
  let best = -1, bd = Infinity;
  e.dbk.segs.rows.forEach((r, i) => {
    if (r[G.plane] !== 0) return;
    const v = r[G.dir] === 0;
    const d = v ? Math.hypot(ix - r[G.x], Math.max(0, r[G.y] - iy, iy - (r[G.y] + r[G.lines])))
      : Math.hypot(iy - r[G.y], Math.max(0, r[G.x] - ix, ix - (r[G.x] + r[G.lines])));
    if (d < bd) { bd = d; best = i; }
  });
  const dpx = bd * s;
  lastPick = { at: [+ix.toFixed(2), +iy.toFixed(2)], seg: dpx <= PICK_PX ? best : -1, dist: +dpx.toFixed(2) };
  if (dpx > PICK_PX || best < 0) { setStatus(`No deblocking edge within ${PICK_PX} pixels of the pointer (the nearest is ${fmt(dpx, 1)} pixels away). Zoom in, or turn on the Edges lines (Shift+L).`); return -1; }
  openEdge(state.f, best);
  return best;
}

// ------------------------------------------------------------ Block tab sections
const PLANE = ['Y', 'U', 'V'];
const kvSec = (title, body, id) => `<dt class="kv-sec">${esc(title)}</dt><dd class="kv-sec" id="${id}">${body}</dd>`;
export const txName = (coef, r, T) => ((coef.names || {}).tx_type || [])[r[T.tx_type]] || `type ${r[T.tx_type]}`;
// The block's transform blocks: frames/<f>.json block bi = their blk.
export function blockTxbs(coef, bi) {
  const T = colsOf(coef.txb), out = [];
  coef.txb.rows.forEach((r, i) => { if (r[T.blk] === bi) out.push(i); });
  return out;
}
// The block's edges as runs: segments of one plane, direction and edge line, one after the other along it, with the
// same lengths, thresholds and flags.  where: left / top (the block's own edge: the decoder files an edge with the
// block on its q side) or inner (a transform edge inside it).
export function blockEdgeRuns(dbk, bi, block) {
  const G = colsOf(dbk.segs), ss = dbk.subsampling || [1, 1], runs = [];
  const key = (r) => [r[G.plane], r[G.dir], r[G.dir] === 0 ? r[G.x] : r[G.y], r[G.len_neg], r[G.len_pos], r[G.t0], r[G.t1], r[G.t2], r[G.flags]].join(',');
  const segs = [];
  dbk.segs.rows.forEach((r, i) => { if (r[G.blk] === bi) segs.push(i); });
  segs.sort((a, b) => {
    const A = dbk.segs.rows[a], B = dbk.segs.rows[b];
    return A[G.plane] - B[G.plane] || A[G.dir] - B[G.dir] || (A[G.dir] === 0 ? A[G.x] - B[G.x] || A[G.y] - B[G.y] : A[G.y] - B[G.y] || A[G.x] - B[G.x]);
  });
  for (const i of segs) {
    const r = dbk.segs.rows[i], k = key(r), last = runs[runs.length - 1];
    const along = r[G.dir] === 0 ? r[G.y] : r[G.x];
    if (last && last.key === k && last.end === along) { last.segs.push(i); last.end = along + r[G.lines]; continue; }
    const sx = r[G.plane] ? ss[0] : 0, sy = r[G.plane] ? ss[1] : 0;
    const bx = block ? block.x >> sx : -1, by = block ? block.y >> sy : -1;
    const where = r[G.dir] === 0 ? (r[G.x] === bx ? 'left' : 'inner') : (r[G.y] === by ? 'top' : 'inner');
    runs.push({ key: k, segs: [i], start: along, end: along + r[G.lines], where, plane: r[G.plane], dir: r[G.dir] });
  }
  const order = { left: 0, top: 1, inner: 2 };
  return runs.sort((a, b) => a.plane - b.plane || order[a.where] - order[b.where] || a.dir - b.dir || a.start - b.start);
}
// "q 1 / side 1": the thresholds the payload names (a name null: not used by this codec)
export function thresholdsText(dbk, r, G) {
  return (dbk.thresholds || []).map((n, k) => (n ? `${n} ${fmt(r[G['t' + k]])}` : '')).filter(Boolean).join(', ');
}
export const runEdgeText = (run, r, G) => {
  const at = run.dir === 0 ? `x ${fmt(r[G.x])}` : `y ${fmt(r[G.y])}`;
  return `${run.where === 'inner' ? `inner ${run.dir === 0 ? 'vertical' : 'horizontal'}` : run.where} at ${at}`;
};

function computeHtml(e) {
  const j = e && e.job;
  if (e && e.status === 'computing') {
    const pct = j && j.fraction !== null && j.fraction !== undefined ? Math.round(j.fraction * 100) : null;
    return `<p class="ix-msg" role="status">Computing the internals of frame ${e.f}${j && j.state === 'queued' ? ' (waiting for the decoder)' : ''}${pct !== null ? `: ${pct} %` : '…'}</p>`
      + `<div class="meter ix-meter${pct === null ? ' indeterminate' : ''}" role="progressbar" aria-label="Computing the internals"${pct !== null ? ` aria-valuenow="${pct}"` : ''}><i style="width:${pct === null ? '' : Math.max(2, pct) + '%'}"></i></div>`;
  }
  const failed = j && j.state && j.state !== 'succeeded' && j.state !== 'queued' && j.state !== 'running'
    ? `<p class="problem ix-fail">${esc((j.error && j.error.message) || `The job ${j.state === 'cancelled' ? 'was cancelled' : 'failed'}.`)}${j.error && j.error.hint ? ` <span class="hint">${esc(j.error.hint)}</span>` : ''}</p>` : '';
  return failed + (canCompute(e) ? `<div class="actions"><button class="btn small" type="button" data-act="ix-compute" title="Run the dumper again on frame ${e.f} of this analysis to get its transform coefficients, residual and deblocking edges (a job; the analysis itself is not changed)">Compute</button></div>` : '');
}

export function internalsSectionsHtml(bi) {
  bind();
  if (!state.payload || bi < 0) return '';
  const f = state.f;
  let e = entryOf(f);
  if (!e) { load(f); e = entryOf(f); }
  const block = state.payload.blocks[bi];
  const b = block ? { x: block[C.x], y: block[C.y] } : null;
  const cands = candsSectionsHtml(bi);     // F-g W7: Candidates (inter blocks) or Intra neighbours (intra blocks)
  if (!e || e.status === 'loading') return kvSec('Transform blocks and edges', `<p class="note">Reading the decoder internals of frame ${f}…</p>`, 'ixState') + cands;
  if (e.status !== 'ready') {
    return kvSec('Transform blocks and edges', `<p class="note ix-why">${prose(whyNot(f))}</p>${computeHtml(e)}`, 'ixState') + cands;
  }
  let tx = '', ed = '';
  if (e.coef) {
    const T = colsOf(e.coef.txb), list = blockTxbs(e.coef, bi);
    const nz = list.reduce((s, i) => s + e.coef.txb.rows[i][T.nnz], 0);
    tx = list.length
      ? `<p class="note">${fmt(list.length)} transform block${list.length === 1 ? '' : 's'}, ${fmt(nz)} nonzero coefficient${nz === 1 ? '' : 's'}. Position and size in the plane's samples. Click a row for its coefficients (Shift+C: the first).</p>`
        + `<div class="ix-scroll"><table class="grid ix-table"><thead><tr><th>Plane</th><th class="num">Position</th><th class="num">Size</th><th>Type</th><th class="num" title="End of block: one past the last coded scan position">eob</th><th class="num" title="Nonzero coefficients">nnz</th></tr></thead><tbody>`
        + list.map((i) => { const r = e.coef.txb.rows[i]; return `<tr class="clickable" data-txb="${i}" title="Open the Coefficients dialog at this transform block"><td>${PLANE[r[T.plane]] || r[T.plane]}</td><td class="num">${r[T.x]}, ${r[T.y]}</td><td class="num">${r[T.w]}×${r[T.h]}</td><td class="ix-type">${esc(txName(e.coef, r, T))}</td><td class="num">${fmt(r[T.eob])}</td><td class="num">${fmt(r[T.nnz])}</td></tr>`; }).join('')
        + '</tbody></table></div>'
      : '<p class="note">This block read no coefficients (it skips the residual, or it is carried by a neighbour: a small chroma pair codes its chroma with its last block).</p>';
  } else tx = `<p class="note">${esc((e.miss && e.miss.message) || 'This frame has no coefficient internals.')}</p>`;
  if (e.dbk) {
    const G = colsOf(e.dbk.segs), runs = blockEdgeRuns(e.dbk, bi, b);
    const th = (e.dbk.thresholds || []).filter(Boolean).join(', ');
    ed = runs.length
      ? `<p class="note">The edges filed with this block on their right or lower side: its left and top edges and the transform edges inside it, as runs of 4-line kernel segments. Length = the filter length on the p side (left or above) / on the q side (this block)${th ? `; thresholds ${esc(th)}` : ''}. Click a row for the samples.</p>`
        + `<div class="ix-scroll"><table class="grid ix-table"><thead><tr><th>Plane</th><th>Edge</th><th class="num" title="Positions along the edge: rows for a vertical edge, columns for a horizontal one">Along</th><th class="num" title="Filter length on the p side (left or above) / on the q side (this block)">Length</th><th>Thresholds</th></tr></thead><tbody>`
        + runs.map((run) => { const r = e.dbk.segs.rows[run.segs[0]]; return `<tr class="clickable" data-seg="${run.segs[0]}" title="Open the Edge dialog at this edge (${run.segs.length} segment${run.segs.length === 1 ? '' : 's'})"><td>${PLANE[run.plane] || run.plane}</td><td>${esc(runEdgeText(run, r, G))}</td><td class="num">${run.start}–${run.end - 1}</td><td class="num"><i class="ix-len" style="background:${lenColour(edgeLen(r, G))}"></i>${r[G.len_neg]} / ${r[G.len_pos]}</td><td>${esc(thresholdsText(e.dbk, r, G))}</td></tr>`; }).join('')
        + '</tbody></table></div>'
      : '<p class="note">The decoder filtered no edge of this block in this frame (no kernel ran on its left, top or inner edges).</p>';
  } else ed = `<p class="note">${esc((e.miss && e.miss.message) || 'This frame has no deblocking internals.')}</p>`;
  const done = e.job && e.job.state === 'succeeded' ? `<p class="note ix-done" role="status">Computed for frame ${f}.</p>` : '';
  return kvSec('Transform blocks', done + tx, 'ixTx') + kvSec('Edges', ed, 'ixEdges') + cands;
}

// ------------------------------------------------------------ legend, chips
export function internalsLegendHtml() {
  let h = '';
  const e = entryOf(state.f), why = whyNot();
  if (state.fill === 'nzc') {
    if (e && e.nzc) h += `0<span class="ramp" style="background:linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map((t) => rgb(ramp(t))).join(',')})"></span>${fmt(e.nzc.max)} nonzero coefficients per block <span class="note">log scale, all planes the block carries; dark = coefficients read but all zero, unfilled = none read</span>`;
    else h += `<span class="note">Nonzero coefficients: ${prose(why || 'reading the decoder internals…')}</span>`;
  }
  if (state.lines.has('txb')) h += ` <span class="ix-key"><i class="ix-tx" aria-hidden="true"></i>${e && e.coef ? 'transform blocks the decoder read (luma)' : `Tx blocks: ${prose(why || 'reading…')}`}</span>`;
  if (state.lines.has('edges')) {
    let lens = [];
    if (e && e.dbk) {
      const G = colsOf(e.dbk.segs);
      lens = [...new Set(e.dbk.segs.rows.filter((r) => r[G.plane] === 0).map((r) => edgeLen(r, G)))].sort((a, b) => a - b);
    }
    h += e && e.dbk
      ? ` ${lens.length ? lens.map((l) => `<span data-len="${l}"><i style="background:${lenColour(l)}"></i>length ${l}</span>`).join('') : '<span class="note">no luma edge filtered in this frame</span>'}<span class="note">deblocking edges (luma) by the longer filter length; Alt+click an edge for its samples</span>`
      : ` <span class="note">Edges: ${prose(why || 'reading…')}</span>`;
  }
  return h + candsLegendHtml();
}
// Why an internals chip is off for this frame ('' when it draws); the Cands chip: for the selected block.
export function chipWhy(id) {
  if (id === 'cands') return candsChipWhy();
  const e = entryOf(state.f);
  if (e && e.status === 'ready') return (id === 'edges' ? e.dbk : e.coef) ? '' : 'This frame has none of these internals.';
  return whyNot();
}
// Called with every legend (frame change, fill, lines): bind, read what the fill or the lines need, and draw the
// chips again when the stream gains internals or a chip's reason changes.
export function syncInternals() {
  bind();
  // (a bundle's frame that is not listed costs no request: its entry says so at once, for the chips)
  const need = state.fill === 'nzc' || state.lines.has('txb') || state.lines.has('edges') || (!served() && !listed.has(state.f));
  if (need && state.payload && internalsShown() && !frames.has(state.f)) load(state.f);
  syncChips(false);
  syncCands();
}
function syncChips(force) {
  const k = [internalsShown(), state.f, chipWhy('nzc'), chipWhy('edges')].join('|');
  if (!force && k === chipsKey) return;
  chipsKey = k;
  renderChips();
}

// ------------------------------------------------------------ wiring, probe
export function initInternals() {
  $('#tabBody').addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="ix-compute"]')) { compute(state.f); return; }
    if (candsClick(t)) return;            // F-g W7: Compute of the candidates, the neighbours' plane
    const tx = t.closest('[data-txb]');
    if (tx) { openCoefs(state.f, +tx.dataset.txb); return; }
    const sg = t.closest('[data-seg]');
    if (sg) openEdge(state.f, +sg.dataset.seg);
  });
}
// Shift+C: the Coefficients dialog at the selected block's first transform block, else the frame's first.
export async function openCoefsKey() {
  const e = await load(state.f);
  if (!e.coef) { setStatus(whyNot() || 'This frame has no coefficient internals.'); return; }
  if (!e.coef.txb.rows.length) { setStatus(`Frame ${state.f} read no coefficients (every block skips the residual).`); return; }
  const list = state.sel >= 0 ? blockTxbs(e.coef, state.sel) : [];
  openCoefs(state.f, list.length ? list[0] : 0);
}

export function internalsSnap() {
  bind();
  const e = frames.get(state.f);
  const q = (sel) => [...document.querySelectorAll(sel)];
  return {
    shown: internalsShown(), listed: [...listed].sort((a, b) => a - b), served: served(),
    status: e ? e.status : null, why: whyNot(), canCompute: canCompute(e),
    job: e && e.job ? { id: e.job.id || null, state: e.job.state, fraction: e.job.fraction ?? null } : null,
    txRows: q('#tabBody [data-txb]').map((r) => +r.dataset.txb), edgeRows: q('#tabBody [data-seg]').map((r) => +r.dataset.seg),
    drawn: { ...drawn }, nzcMax: e && e.nzc ? e.nzc.max : null, pick: lastPick,
    chips: q('#fillGroup [data-fill="nzc"], #lineGroup [data-line="txb"], #lineGroup [data-line="edges"]').map((c) => ({ id: c.dataset.fill || c.dataset.line, off: c.classList.contains('off'), title: c.title })),
    stages: state.manifest ? frameMeta(state.f).stages || [] : [],
  };
}
