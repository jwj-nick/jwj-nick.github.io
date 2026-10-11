// The Entropy dialog (F-g W56, FEATURES F49, SERVER_API.md section 21 items 12-16): the arithmetic decoder of the
// frame on screen operation by operation (internals/<f>/ec.json: AV1 / AV2 od_ec symbol decoder, the VP9 boolean
// decoder, H.264 CABAC), as a plot of the range and the value register over the operation index (a window of the
// frame's operations, or of the selected block's, with an overview strip of the whole frame), and the selected
// operation's state before and after it in decimal, hex and bits, with the CDF or probability it read and its
// symbol.  A Syntax tab row's "state" link opens it at that symbol's operations; Shift+O at the selected block's.
// The data comes from the bundle (manifest.internals names ec, internals.json the frames) or from `vca serve`,
// which pages the operations (ec.json?from=&count=) and answers 404 internals_missing with the job that makes them
// (job_hint, Compute); the Probabilities dialog (cdfs.js) reads cdf.json the same way (readKind, computeKinds).
import { state } from './state.js?v=3e8d1a839f';
import { $, esc, fmt, setStatus } from './util.js?v=3e8d1a839f';
import { caps, getJSON, withToken } from './data.js?v=3e8d1a839f';
import { api } from './api.js?v=3e8d1a839f';
import { trackJob } from './jobs.js?v=3e8d1a839f';
import { ensureSymbols, symbolsReady, symtype } from './symbols.js?v=3e8d1a839f';
import { selectBlockIndex } from './controls.js?v=3e8d1a839f';

const dlg = () => $('#ecDialog');
// which codecs' dumpers write the kind (vca/internals.py CODECS kinds): the links and buttons show only for them
export const EC_CODECS = ['av2', 'av1', 'vp9', 'avc'];
export const CDF_CODECS = ['av2', 'av1', 'vp9'];
const codec = () => ((state.manifest && state.manifest.stream && state.manifest.stream.codec) || '').toLowerCase();
export const hasEc = () => EC_CODECS.includes(codec());
export const hasCdf = () => CDF_CODECS.includes(codec());
const TPL = { ec: 'internals/<f>/ec.json', cdf: 'internals/<f>/cdf.json' };
const EXPORT_CMD = 'python -m vca export <analysis> -o <folder> --internals-frames A-B --internals-kinds ec,cdf';
const PAGE = 65536;   // operations per server request (internals_ec.EC_CAP)

// ------------------------------------------------------------ reading (shared with cdfs.js)
class Missing extends Error { constructor(message, info) { super(message); this.info = info || {}; } }
let man = null, index = null;   // the manifest the cache belongs to; internals.json of a bundle (or a promise)
const cache = new Map();        // `${kind}:${f}` -> entry {kind, f, status, data, miss, err, job, got, p}
const listeners = new Set();
const info = () => (state.manifest && state.manifest.internals) || null;
const served = () => !!(state.source && state.source.kind === 'url' && caps.server && /\/api\/a\/[^/]+\/$/.test(state.source.base));
const pathOf = (kind, f) => String((info() && info()[kind]) || TPL[kind]).replace('<f>', f);
function bind() {
  if (man === state.manifest) return;
  man = state.manifest; index = null; cache.clear();
}
async function fetchJSON(rel) {
  if (state.source.kind === 'files') return getJSON(rel);
  const url = state.source.base + rel;
  let r;
  try { r = await fetch(url, withToken(url, { cache: 'no-cache' })); } catch (e) { throw new Error('the local server did not answer'); }
  if (!r.ok) {
    let er = null;
    try { er = (await r.json()).error; } catch (e) { er = null; }
    if (er && er.code === 'internals_missing') throw new Missing(er.message, er);
    throw new Error(er && er.message ? er.message : `HTTP ${r.status}`);
  }
  return r.json();
}
// A bundle: does frame f have the kind?  (manifest.internals, then the frame's entry of internals.json)
async function bundleHas(kind, f) {
  const i = info();
  if (!i || !(i.kinds || []).includes(kind) || !(i.frames || []).includes(f)) return false;
  if (!index) index = fetchJSON(i.file || 'internals.json').catch(() => ({ frames: {} }));
  const ix = await index;
  const e = (ix.frames || {})[String(f)];
  return !!(e && e[kind]);
}
const KIND_WORDS = { ec: 'entropy decoder state', cdf: 'probability tables' };
// The frame's entry of a kind: {status: loading | ready | none | missing | error | computing, data, miss, err, job}.
export function entryOfKind(kind, f) { bind(); return cache.get(`${kind}:${f}`) || null; }
export function readKind(kind, f) {
  bind();
  const key = `${kind}:${f}`;
  let e = cache.get(key);
  if (e && e.status !== 'error') return e.p || Promise.resolve(e);
  const m = man;
  e = { kind, f, status: 'loading', data: null, miss: null, err: '', job: null, got: 0 };
  cache.set(key, e);
  e.p = (async () => {
    try {
      if (!served()) {
        if (!(await bundleHas(kind, f))) { e.status = 'none'; return e; }
        e.data = await fetchJSON(pathOf(kind, f));
      } else if (kind === 'ec') {
        // the server answers at most PAGE operations a request: read them in turn
        let from = 0, data = null;
        for (;;) {
          const p = await fetchJSON(`${pathOf(kind, f)}?from=${from}&count=${PAGE}`);
          if (!data) data = { ...p, rows: p.rows.slice() }; else data.rows.push(...p.rows);
          from += p.count;
          e.got = from; notify(e);
          if (!p.count || from >= p.total) break;
        }
        data.from = 0; data.count = data.rows.length;
        e.data = data;
      } else e.data = await fetchJSON(pathOf(kind, f));
      e.status = 'ready';
    } catch (x) {
      if (x instanceof Missing) { e.status = 'missing'; e.miss = { ...x.info, message: x.message }; } else { e.status = 'error'; e.err = String((x && x.message) || x); }
    }
    return e;
  })().then((r) => { e.p = null; if (m === man) notify(e); return r; });
  return e.p;
}
export function onKindChange(fn) { listeners.add(fn); }
function notify(e) { for (const fn of listeners) fn(e); }

// Why a frame shows no data of the kind (empty while it loads or is there).
export function whyNotKind(kind, f) {
  const e = entryOfKind(kind, f);
  const what = KIND_WORDS[kind];
  if (kind === 'ec' && !hasEc()) return `The ${codec().toUpperCase()} dumper does not write the entropy decoder state yet (AV2, AV1, VP9 and AVC do).`;
  if (kind === 'cdf' && !hasCdf()) return codec() === 'avc' ? 'H.264 CABAC has no CDF tables: its context states are in the entropy decoder state (Entropy dialog, Shift+O).' : `The ${codec().toUpperCase()} dumper writes no probability tables (AV2, AV1 and VP9 do).`;
  if (!e || e.status === 'loading' || e.status === 'ready') return '';
  if (e.status === 'computing') return `The ${what} of frame ${f} is being computed.`;
  if (e.status === 'error') return `The ${what} of frame ${f} could not be read (${e.err}).`;
  if (e.status === 'none') {
    const i = info();
    return i && (i.kinds || []).includes(kind)
      ? `This bundle has the ${what} for some frames only, not for frame ${f}. Export it again with ${EXPORT_CMD} for the frames you need.`
      : `This bundle has no ${what}. Bundles get it with ${EXPORT_CMD} (the dumper runs again; large: about 40 bytes per decode operation).`;
  }
  return (e.miss && e.miss.message) || `Frame ${f} has no ${what}.`;
}
export const canComputeKind = (kind, f) => { const e = entryOfKind(kind, f); return !!(e && e.status === 'missing' && e.miss && e.miss.job_hint && caps.jobs); };
// HTML of a sentence: the export command and --options in the mono font
export const proseHtml = (s) => String(s).split(EXPORT_CMD).map((t) => esc(t).replace(/(^|[\s(])(--[A-Za-z][\w-]*)/g, '$1<code>$2</code>')).join(`<code>${esc(EXPORT_CMD)}</code>`);

// Compute (vca serve with jobs): the 404's job_hint (ec and cdf as the codec has them), shown in the job tray;
// the frame's entries of both kinds are read again when it ends.
export async function computeKinds(kind, f) {
  const e = entryOfKind(kind, f);
  if (!canComputeKind(kind, f)) return;
  const hint = e.miss.job_hint, kinds = hint.kinds || [kind], m = man;
  const mark = (st, job) => { for (const k of kinds) { const x = entryOfKind(k, f) || { kind: k, f }; cache.set(`${k}:${f}`, Object.assign(x, { status: st, job })); notify(x); } };
  mark('computing', { state: 'queued', fraction: null });
  let job;
  try { job = await api('api/jobs', { method: 'POST', body: hint }); } catch (x) {
    mark('missing', { state: 'failed', error: { message: x.message, hint: x.hint } });
    for (const k of kinds) Object.assign(entryOfKind(k, f), { miss: e.miss });
    return;
  }
  trackJob(job, { fromPage: true, codec: codec() });
  for (;;) {
    mark('computing', job);
    await new Promise((r) => setTimeout(r, 400));
    if (m !== man) return;
    try { job = await api(`api/jobs/${encodeURIComponent(job.id)}`); } catch (x) { continue; }
    if (job.state !== 'queued' && job.state !== 'running') break;
  }
  if (job.state !== 'succeeded') {
    mark('missing', job);
    for (const k of kinds) Object.assign(entryOfKind(k, f), { miss: e.miss });
    return;
  }
  for (const k of kinds) cache.delete(`${k}:${f}`);
  await Promise.all(kinds.map((k) => readKind(k, f)));
  for (const k of kinds) { const x = entryOfKind(k, f); if (x) { x.job = job; notify(x); } }
}
// The Compute button or the job's progress and failure, for a dialog body.
export function computeHtml(kind, f) {
  const e = entryOfKind(kind, f), j = e && e.job;
  if (e && e.status === 'computing') {
    const pct = j && j.fraction !== null && j.fraction !== undefined ? Math.round(j.fraction * 100) : null;
    return `<p class="ix-msg" role="status">Computing the entropy internals of frame ${f}${j && j.state === 'queued' ? ' (waiting for the decoder)' : ''}${pct !== null ? `: ${pct} %` : '…'}</p>`
      + `<div class="meter ix-meter${pct === null ? ' indeterminate' : ''}" role="progressbar" aria-label="Computing the entropy internals"${pct !== null ? ` aria-valuenow="${pct}"` : ''}><i style="width:${pct === null ? '' : Math.max(2, pct) + '%'}"></i></div>`;
  }
  const failed = j && j.state && !['succeeded', 'queued', 'running'].includes(j.state)
    ? `<p class="problem ix-fail">${esc((j.error && j.error.message) || `The job ${j.state === 'cancelled' ? 'was cancelled' : 'failed'}.`)}${j.error && j.error.hint ? ` <span class="hint">${esc(j.error.hint)}</span>` : ''}</p>` : '';
  const kinds = e && e.miss && e.miss.job_hint ? (e.miss.job_hint.kinds || []) : [];
  return failed + (canComputeKind(kind, f) ? `<div class="actions"><button class="btn small" type="button" data-act="ent-compute" data-kind="${kind}" title="Run the dumper again on frame ${f} of this analysis to record ${kinds.includes('cdf') ? 'the entropy decoder state and the probability tables' : 'the entropy decoder state'} (a job in the job list; the analysis itself is not changed)">Compute</button></div>` : '');
}

// ------------------------------------------------------------ the engines' words
const ENGINE = {
  od_ec: { name: 'symbol decoder (od_ec)', rng: 'SymbolRange', value: 'SymbolValue', bits: 16, top: 65536, start: 32768 },
  vp9_bool: { name: 'boolean decoder', rng: 'BoolRange', value: 'BoolValue', bits: 8, top: 256, start: 255 },
  cabac: { name: 'CABAC engine', rng: 'codIRange', value: 'codIOffset', bits: 9, top: 512, start: 510 },
};
const engOf = (d) => ENGINE[d.engine] || { name: d.engine, rng: 'range', value: 'value', bits: 16, top: 65536, start: null };
const KIND_TEXT = { symbol: 'symbol read with a CDF', bool: 'bool read with a probability', bypass: 'bypass bits', unary: 'unary bypass bits', terminate: 'terminate bin' };
const kindText = (d, k) => (k === 'bool' && d.engine === 'cabac' ? 'decision bin (context coded)' : k === 'bool' && d.engine === 'vp9_bool' ? 'bin read with a probability' : k === 'bypass' && d.engine !== 'od_ec' ? 'bypass bin' : KIND_TEXT[k] || k);

// ------------------------------------------------------------ the dialog's state
let cur = null;   // {f, scope: frame | block, sel: op index, sym: symbol n or null, block: frames/<f>.json index or -1, from}
let laid = null;  // what render() drew (the probe reads it)
const colsOf = (d) => Object.fromEntries(d.cols.map((c, i) => [c, i]));

// Opens the dialog at symbol n of the frame on screen (Syntax tab), else at the selected block's operations.
export async function openEntropy({ sym = null, scope = null } = {}) {
  if (!state.payload) return;
  const f = state.f;
  cur = { f, sym, block: state.sel, scope: scope || (sym === null && state.sel >= 0 ? 'block' : 'frame'), sel: null, from: null };
  if (!dlg().open) dlg().showModal();
  ensureSymbols();
  render();
  await readKind('ec', f);
  if (cur && cur.f === f) render();
}
export function openEntropyKey() {
  if (!hasEc()) { setStatus(whyNotKind('ec', state.f)); return; }
  openEntropy({});
}

// The operations in scope: every one of the frame, or those of the selected block's symbols (symbols.tsv rows whose
// block is the selection: the frame's symbol columns).
function scopeOps(d, C) {
  if (cur.scope !== 'block' || cur.block < 0) return null;
  if (!(symbolsReady() && state.symsFrame === cur.f && state.syms)) return undefined;
  const S = state.syms, out = [];
  d.rows.forEach((r, k) => { const n = r[C.symrow]; if (n !== null && n < S.count && S.block[n] === cur.block) out.push(k); });
  return out;
}
const symName = (n) => (symbolsReady() && state.symsFrame === cur.f && state.syms && n !== null && n < state.syms.count ? symtype(state.syms.type[n]).name : null);

// ------------------------------------------------------------ number forms
const hex = (v, bits) => `0x${v.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), '0')}`;
const binary = (v, bits) => { const s = v.toString(2).padStart(bits, '0'); return s.replace(/(\d{4})(?=\d)/g, '$1 '); };
// bits 0: a counter (decimal and hex, no bit pattern); a negative value has decimal only
function forms(v, bits, what) {
  if (v === null || v === undefined) return `<td class="num ec-unk" data-k="${what}" data-v="" colspan="3">not known</td>`;
  const neg = v < 0;
  return `<td class="num" data-k="${what}" data-v="${v}">${String(v).replace('-', '−')}</td><td class="mono">${neg ? '' : hex(v, bits || 16)}</td><td class="mono ec-bits">${neg || !bits ? '' : binary(v, bits)}</td>`;
}

// ------------------------------------------------------------ render
function render() {
  const d0 = dlg();
  if (!d0.open || !cur) return;
  const sub = $('#ecSub'), body = $('#ecBody');
  laid = null;
  const e = entryOfKind('ec', cur.f);
  if (!hasEc()) { sub.textContent = `Frame ${cur.f}`; body.innerHTML = `<p class="note ec-why">${esc(whyNotKind('ec', cur.f))}</p>`; return; }
  if (!e || e.status === 'loading') {
    sub.textContent = `Frame ${cur.f}`;
    body.innerHTML = `<p class="note" role="status">Reading the entropy decoder state of frame ${cur.f}${e && e.got ? ` (${fmt(e.got)} operations so far)` : ''}…</p>`;
    return;
  }
  if (e.status !== 'ready') {
    sub.textContent = `Frame ${cur.f}`;
    body.innerHTML = `<p class="note ec-why">${proseHtml(whyNotKind('ec', cur.f))}</p>${computeHtml('ec', cur.f)}`;
    return;
  }
  const d = e.data, C = colsOf(d), E = engOf(d), rows = d.rows;
  if (!rows.length) {
    sub.textContent = `Frame ${cur.f}, ${(d.codec || '').toUpperCase()} ${E.name}`;
    body.innerHTML = `<p class="note ec-why">${d.engine === 'cabac' && d.engine_params && d.engine_params.cabac === 0 ? 'This frame is CAVLC coded: no arithmetic decoding, so no operations.' : 'The arithmetic decoder ran no operation in this frame.'}</p>`;
    return;
  }
  // the operations of the symbol, the scope, the selected operation
  const symOps = cur.sym === null ? [] : rows.map((r, k) => (r[C.symrow] === cur.sym ? k : -1)).filter((k) => k >= 0);
  let list = scopeOps(d, C);
  const waiting = list === undefined;
  if (!list) list = null;
  if (cur.sel === null) cur.sel = symOps.length ? symOps[0] : list && list.length ? list[0] : 0;
  const seq = list || null;       // null: every operation of the frame
  const N = seq ? seq.length : rows.length;
  if (seq && seq.length && !seq.includes(cur.sel)) cur.sel = seq[0];
  const pos = seq ? Math.max(0, seq.indexOf(cur.sel)) : cur.sel;
  const W = Math.max(280, (body.clientWidth || d0.clientWidth - 48));
  const span = Math.max(16, Math.min(N, Math.floor(W / 3)));
  let from = cur.from;
  if (from === null || pos < from || pos >= from + span) from = Math.max(0, Math.min(N - span, pos - (span >> 1)));
  cur.from = from;
  const opAt = (k) => (seq ? seq[k] : k);
  const segs = d.segs || [];
  sub.textContent = `Frame ${cur.f}, ${(d.codec || '').toUpperCase()} ${E.name}: ${fmt(d.total)} operations in ${segs.length} decoder${segs.length === 1 ? '' : 's'}. Each row is the state after the operation.`;
  const scopeBtn = (id, label, tip, dis) => `<button class="chip" type="button" data-act="ec-scope" data-scope="${id}" aria-pressed="${cur.scope === id}" title="${esc(tip)}"${dis ? ' disabled' : ''}>${label}</button>`;
  const blockLabel = cur.block >= 0 && state.payload && state.payload.blocks[cur.block] ? 'Selected block' : 'Selected block (none)';
  const tools = `<div class="gr-tools ec-tools"><span class="gr-seg">${scopeBtn('frame', 'Frame', 'Plot every operation of the frame')}${scopeBtn('block', blockLabel, cur.block >= 0 ? 'Plot only the operations of the selected block\'s symbols' : 'Select a block on the picture first', cur.block < 0)}</span>`
    + `<span class="gr-fact" id="ecWin">operations ${fmt(opAt(from))} to ${fmt(opAt(Math.min(N, from + span) - 1))}${seq ? ` (${fmt(N)} of this block)` : ` of ${fmt(N)}`}</span>`
    + `<span class="gr-seg"><button class="btn small" type="button" data-act="ec-page" data-d="-1" title="The previous window of operations (Page Up)"${from <= 0 ? ' disabled' : ''}>‹ Earlier</button><button class="btn small" type="button" data-act="ec-page" data-d="1" title="The next window of operations (Page Down)"${from + span >= N ? ' disabled' : ''}>Later ›</button></span></div>`;
  const note = waiting ? '<p class="note">Reading the symbols of this frame for the selected block…</p>'
    : seq && !seq.length ? '<p class="note">The selected block\'s symbols took no arithmetic decoder operation (none of them is entropy coded with this engine).</p>' : '';
  body.innerHTML = tools + note + (N ? plotHtml(d, C, E, seq, from, span, symOps, W) + overviewHtml(d, C, E, seq, from, span, N) + detailHtml(d, C, E, cur.sel, symOps) : '');
  laid = { d, C, E, seq, from, span, symOps, N };
}

// The plot: the window [from, from + span) of the operations in scope; x = position, y = the register's value on
// the engine's scale (od_ec 0 to 65536, VP9 0 to 256, CABAC 0 to 512); range as a line, value register as dots,
// the symbol's operations shaded, decoder starts dashed, the selected operation outlined.
function plotHtml(d, C, E, seq, from, span, symOps, W) {
  const H = window.innerWidth <= 860 ? 180 : 220, L = 54, R = 8, T = 10, B = 26, pw = W - L - R, ph = H - T - B;
  const x = (k) => L + (k - from + 0.5) * pw / span, y = (v) => T + ph - (v / E.top) * ph;
  const opAt = (k) => (seq ? seq[k] : k), end = Math.min(from + span, seq ? seq.length : d.rows.length);
  let rng = '', dots = '', marks = '', hits = '';
  const symSet = new Set(symOps);
  const segStart = new Set((d.segs || []).map((s) => s.op0));
  const bw = pw / span;
  for (let k = from; k < end; k++) {
    const i = opAt(k), r = d.rows[i];
    if (symSet.has(i)) marks += `<rect class="ec-symband" x="${(x(k) - bw / 2).toFixed(1)}" y="${T}" width="${bw.toFixed(2)}" height="${ph}"/>`;
    if (segStart.has(i)) marks += `<line class="ec-seg" x1="${(x(k) - bw / 2).toFixed(1)}" x2="${(x(k) - bw / 2).toFixed(1)}" y1="${T}" y2="${T + ph}"/>`;
    rng += `${k === from ? 'M' : 'L'}${x(k).toFixed(1)},${y(r[C.rng]).toFixed(1)}`;
    if (r[C.value] !== null) dots += `<circle class="ec-val" cx="${x(k).toFixed(1)}" cy="${y(r[C.value]).toFixed(1)}" r="${Math.max(1.2, Math.min(3, bw / 3)).toFixed(1)}"/>`;
    hits += `<rect class="ec-hit" data-op="${i}" x="${(x(k) - bw / 2).toFixed(1)}" y="${T}" width="${bw.toFixed(2)}" height="${ph}"><title>operation ${i}: ${r[C.kind]}, decoded ${r[C.sym]}; ${E.rng} ${r[C.rng]}, ${E.value} ${r[C.value] === null ? 'not known' : r[C.value]}</title></rect>`;
  }
  const sk = seq ? seq.indexOf(cur.sel) : cur.sel;
  const sel = sk >= from && sk < end ? `<rect class="ec-sel" x="${(x(sk) - bw / 2 - 1).toFixed(1)}" y="${T - 2}" width="${(bw + 2).toFixed(2)}" height="${ph + 4}"/>` : '';
  const yt = [0, 0.25, 0.5, 0.75, 1].map((t) => `<line class="gr-grid" x1="${L}" x2="${W - R}" y1="${y(t * E.top)}" y2="${y(t * E.top)}"/><text class="gr-yt" x="${L - 6}" y="${y(t * E.top) + 4}" text-anchor="end">${fmt(Math.round(t * E.top))}</text>`).join('');
  const ticks = [];
  const step = Math.max(1, Math.ceil(span / 8));
  for (let k = from; k < end; k += step) ticks.push(`<text class="gr-xt" x="${x(k)}" y="${H - 8}" text-anchor="middle">${opAt(k)}</text>`);
  return `<div class="ec-plotbox"><svg id="ecPlot" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${E.rng} and ${E.value} after each operation">${yt}${marks}<path class="ec-rng" d="${rng}"/>${dots}${sel}${ticks.join('')}${hits}</svg></div>`
    + `<div class="gr-legend"><span><i class="line ec-lrng"></i>${E.rng} (range) after the operation</span><span><i class="ec-lval"></i>${E.value} (value register)</span>${symOps.length ? `<span><i class="ec-lsym"></i>operations of symbol ${cur.sym}</span>` : ''}<span><i class="line ec-lseg"></i>a decoder starts (tile, header or slice)</span><span>Click an operation to see it below; <kbd>←</kbd> <kbd>→</kbd> step one</span></div>`;
}
// The whole frame (or block) as a strip: one column per group of operations by its kind mix, the window outlined.
function overviewHtml(d, C, E, seq, from, span, N) {
  const W = 1000, H = 18, cols = Math.min(N, 500), per = N / cols;
  let bars = '';
  for (let c = 0; c < cols; c++) {
    const k = Math.floor(c * per), i = seq ? seq[k] : k, r = d.rows[i];
    bars += `<rect class="ec-ov ec-k-${r[C.kind]}" x="${(c * W / cols).toFixed(1)}" y="0" width="${(W / cols + 0.3).toFixed(2)}" height="${H}"/>`;
  }
  const wx = from / N * W, ww = Math.max(3, span / N * W);
  return `<svg class="ec-overview" id="ecOverview" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Where the window is among all operations"><title>All ${fmt(N)} operations in scope; click to move the window there</title>${bars}<rect class="ec-ovwin" x="${wx.toFixed(1)}" y="0.5" width="${ww.toFixed(1)}" height="${H - 1}"/></svg>`;
}
// The selected operation: what it was, its symbol, the CDF or probability, the state before and after.
function detailHtml(d, C, E, i, symOps) {
  const r = d.rows[i];
  if (!r) return '';
  const seg = (d.segs || [])[r[C.seg]] || {};
  // before = the state after the previous operation of the same decoder (the first one: the decoder's start)
  let p = null;
  for (let k = i - 1; k >= 0; k--) if (d.rows[k][C.seg] === r[C.seg]) { p = d.rows[k]; break; }
  const n = r[C.symrow], nm = symName(n);
  const S = state.syms, bi = n !== null && symbolsReady() && state.symsFrame === cur.f && S && n < S.count ? S.block[n] : -1;
  let prob = '';
  if (r[C.cdf]) {
    const vals = r[C.cdf], k = r[C.n], cdf = vals.slice(0, k - 1).map((v) => 32768 - v);
    const ps = [];
    let prev = 0;
    for (const c of cdf) { ps.push(c - prev); prev = c; }
    ps.push(32768 - prev);
    prob = `<dt>CDF read</dt><dd><span class="mono" data-k="cdf" data-v="${vals.join(' ')}">${vals.join(' ')}</span><span class="unit">${k} values of 32768 − cdf, then the counter${vals[k] === 65535 ? ' (outside the tile context: no counter)' : ''}</span></dd>`
      + `<dt>Probabilities</dt><dd>${ps.map((q, s) => `<span class="ec-p${s === r[C.sym] ? ' got' : ''}" title="symbol ${s}${s === r[C.sym] ? ': the one decoded' : ''}">${s}: ${(100 * q / 32768).toFixed(1)} %</span>`).join(' ')}</dd>`;
  } else if (r[C.prob] !== null && r[C.prob] !== undefined) {
    if (d.engine === 'cabac') {
      const v = r[C.prob];
      prob = `<dt>Context state</dt><dd><span data-k="prob" data-v="${v}">pStateIdx ${v & 63}, valMPS ${(v >> 6) & 1}</span><span class="unit">after: pStateIdx ${(v >> 8) & 63}, valMPS ${(v >> 14) & 1}${r[C.ctx] !== null ? `; context ${hex(r[C.ctx], 32)}` : ''}</span></dd>`;
    } else if (d.engine === 'vp9_bool') {
      prob = `<dt>Probability</dt><dd><span data-k="prob" data-v="${r[C.prob]}">${r[C.prob]}</span><span class="unit">of a 0 bin, in 1/256 (${(100 * r[C.prob] / 256).toFixed(1)} %)</span></dd>`;
    } else {
      prob = `<dt>Probability</dt><dd><span data-k="prob" data-v="${r[C.prob]}">${r[C.prob]}</span><span class="unit">q15 (${(100 * r[C.prob] / 32768).toFixed(1)} %)</span></dd>`;
    }
  }
  const before = p
    ? { rng: p[C.rng], value: p[C.value], cnt: p[C.cnt], tell: p[C.tell] }
    : { rng: E.start, value: null, cnt: null, tell: null };
  const after = { rng: r[C.rng], value: r[C.value], cnt: r[C.cnt], tell: r[C.tell] };
  // side by side on a wide screen; on a phone each register gets a row before and a row after
  const narrow = window.innerWidth <= 860;
  const row = (k, label, bits, tip) => (narrow
    ? `<tr data-row="${k}"><th scope="row" rowspan="2" title="${esc(tip)}">${label}</th><td class="ec-when">before</td>${forms(before[k], bits, `before.${k}`)}</tr><tr><td class="ec-when">after</td>${forms(after[k], bits, `after.${k}`)}</tr>`
    : `<tr data-row="${k}"><th scope="row" title="${esc(tip)}">${label}</th>${forms(before[k], bits, `before.${k}`)}${forms(after[k], bits, `after.${k}`)}</tr>`);
  const head = narrow ? '<tr><th></th><th></th><th class="num">decimal</th><th>hex</th><th>bits</th></tr>'
    : '<tr><th></th><th colspan="3">Before</th><th colspan="3">After</th></tr><tr><th></th><th class="num">decimal</th><th>hex</th><th>bits</th><th class="num">decimal</th><th>hex</th><th>bits</th></tr>';
  const startNote = p ? '' : `<p class="note">This is the first operation of decoder ${r[C.seg]}: the state before it is the decoder's start (the dumper records the state after each operation; the start's ${E.value} comes from the first bytes and is not recorded).</p>`;
  const where = `${seg.kind || 'decoder'} ${seg.tile !== undefined ? seg.tile : ''}`.trim();
  const at = symOps.indexOf(i);
  return `<div class="ec-detail" id="ecDetail" data-op="${i}">`
    + `<h3 class="gr-h">Operation ${fmt(i)} <span class="gr-fact">${esc(kindText(d, r[C.kind]))}, decoder ${r[C.seg]} (${esc(where)}, ${fmt(seg.bytes)} bytes)${at >= 0 ? (symOps.length === 1 ? `; the only operation of symbol ${cur.sym}` : `; ${at + 1} of the ${symOps.length} operations of symbol ${cur.sym}`) : ''}</span></h3>`
    + `<dl class="kv ec-kv"><dt>Decoded</dt><dd><span data-k="sym" data-v="${r[C.sym]}">${r[C.sym]}</span><span class="unit">${r[C.kind] === 'symbol' ? `of ${r[C.n]} symbols` : r[C.kind] === 'bypass' ? `${r[C.n]} bits` : r[C.kind] === 'unary' ? `at most ${r[C.n]}` : 'bin'}</span></dd>`
    + `<dt>Symbol</dt><dd>${n === null ? '<span class="note">none (after the frame\'s last symbol record)</span>' : `<span data-k="symrow" data-v="${n}">n ${n}</span>${nm ? ` <span class="mono">${esc(nm)}</span>` : ''}${bi >= 0 ? ` <button class="btn small" type="button" data-act="ec-block" data-block="${bi}" title="Select the block this symbol was read for (the dialog stays open)">Block ${bi}</button>` : ''}`}</dd>`
    + prob + '</dl>'
    + startNote
    + `<div class="ec-scroll"><table class="grid ec-state"><thead>${head}</thead><tbody>`
    + row('rng', esc(E.rng), E.bits, 'The range of the arithmetic decoder')
    + row('value', esc(E.value), E.bits, 'The value register: where the code value sits inside the range')
    + row('cnt', 'cnt', 0, d.engine === 'cabac' ? 'DbitsLeft: bits left in the JM window' : d.engine === 'vp9_bool' ? 'count: bits loaded beyond the 8 the value holds (negative: fewer)' : 'cnt: the decoder\'s bit counter of its window')
    + row('tell', 'tell', 0, d.engine === 'od_ec' ? 'Bits the decoder has used (od_ec_dec_tell, 1 at the start)' : 'Bits read from the decoder\'s first byte')
    + '</tbody></table></div>'
    + `<p class="fine">${esc(d.meaning || '')}</p></div>`;
}

// ------------------------------------------------------------ wiring, probe
function select(i) {
  if (!laid) return;
  cur.sel = i;
  render();
}
function step(dir) {
  if (!laid) return;
  const L = laid, k = L.seq ? L.seq.indexOf(cur.sel) : cur.sel, nk = Math.max(0, Math.min(L.N - 1, k + dir));
  select(L.seq ? L.seq[nk] : nk);
}
function page(dir) {
  if (!laid) return;
  const L = laid, nf = Math.max(0, Math.min(L.N - L.span, L.from + dir * L.span));
  cur.from = nf;
  const k = Math.max(nf, Math.min(nf + L.span - 1, L.seq ? L.seq.indexOf(cur.sel) : cur.sel));
  cur.sel = L.seq ? L.seq[k] : k;
  render();
}
export function initEntropy() {
  const d = dlg();
  onKindChange((e) => { if (e.kind === 'ec' && cur && e.f === cur.f) render(); });
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    const sc = t.closest('[data-act="ec-scope"]');
    if (sc && !sc.disabled) { cur.scope = sc.dataset.scope; cur.from = null; render(); return; }
    const pg = t.closest('[data-act="ec-page"]');
    if (pg && !pg.disabled) { page(+pg.dataset.d); return; }
    if (t.closest('[data-act="ent-compute"]')) { computeKinds('ec', cur.f); return; }
    const bk = t.closest('[data-act="ec-block"]');
    if (bk) { selectBlockIndex(+bk.dataset.block); cur.block = +bk.dataset.block; render(); return; }
    const hit = t.closest('[data-op]');
    if (hit && hit.closest('#ecPlot')) { select(+hit.dataset.op); return; }
    const ov = t.closest('#ecOverview');
    if (ov && laid) {
      const box = ov.getBoundingClientRect(), k = Math.floor((ev.clientX - box.left) / box.width * laid.N);
      const kk = Math.max(0, Math.min(laid.N - 1, k));
      cur.from = null; select(laid.seq ? laid.seq[kk] : kk);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); page(e.key === 'PageUp' ? -1 : 1); }
  });
  // a Syntax tab row's "state" link (inspector.js): the dialog at that symbol's operations
  $('#tabBody').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act="ec-sym"]');
    if (b) { ev.stopPropagation(); openEntropy({ sym: +b.dataset.sym, scope: 'frame' }); return; }
    // the Frame tab's "Entropy…" (a phone has no Shift+O): the whole frame
    if (ev.target.closest('[data-act="entropy"]')) openEntropy({ scope: 'frame' });
  });
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (d.open) { cur.from = null; render(); } }, 150); });
}

const cells = (sel) => Object.fromEntries([...document.querySelectorAll(`#ecDetail ${sel} [data-k]`)].map((c) => [c.dataset.k, c.dataset.v === '' ? null : c.dataset.v]));
export function entropySnap() {
  const d = dlg(), open = !!(d && d.open);
  const e = cur ? entryOfKind('ec', cur.f) : null;
  if (!open) return { open, status: e ? e.status : null };
  const num = (v) => (v === null || v === undefined || v === '' ? null : +v);
  const st = cells('.ec-state'), kv = cells('.ec-kv');
  return {
    open, f: cur ? cur.f : null, status: e ? e.status : null, scope: cur ? cur.scope : null, sym: cur ? cur.sym : null,
    sel: laid ? cur.sel : null, total: e && e.data ? e.data.total : null, rows: e && e.data ? e.data.rows.length : null,
    symOps: laid ? laid.symOps : [], inScope: laid ? (laid.seq ? laid.seq.length : laid.N) : null,
    window: laid ? [laid.from, Math.min(laid.N, laid.from + laid.span)] : null,
    plotted: [...document.querySelectorAll('#ecPlot [data-op]')].map((r) => +r.dataset.op),
    detail: laid ? { op: num(($('#ecDetail') || { dataset: {} }).dataset.op), sym: num(kv.sym), symrow: num(kv.symrow), cdf: kv.cdf ? kv.cdf.split(' ').map(Number) : null, prob: num(kv.prob),
      before: { rng: num(st['before.rng']), value: num(st['before.value']), cnt: num(st['before.cnt']), tell: num(st['before.tell']) },
      after: { rng: num(st['after.rng']), value: num(st['after.value']), cnt: num(st['after.cnt']), tell: num(st['after.tell']) } } : null,
    canCompute: cur ? canComputeKind('ec', cur.f) : false,
    message: ($('#ecBody .ec-why') || {}).textContent || '', sub: ($('#ecSub') || {}).textContent || '',
    winText: ($('#ecWin') || {}).textContent || '',
  };
}
