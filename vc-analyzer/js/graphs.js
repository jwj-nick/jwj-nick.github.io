// The Graphs dialog (FEATURES F29, F30, F31, F34, F07, F33): frame size and bitrate per frame,
// the frame's base qindex or slice QP, mode and block size distributions, the motion vectors
// of the frame on screen, a block search, and the coded picture buffer of the HEVC / AVC
// hypothetical reference decoder.  Hand-written SVG, no library.
//
// Every plotted number comes from the data contract: frame values from manifest.frames
// (= `vca frames --json`), distributions of this frame from the Stats tab's histogram and of
// the whole stream from `vca serve`'s stats table (= `vca stats --json`) or, without the server,
// from every frames/<f>.json with the same rule (luma and shared blocks, area clipped to the
// picture), the buffer from hrd.json (vca/hrd.py, SERVER_API.md section 20; manifest.hrd names
// it).  A click on a frame's column goes to that frame; the frame on screen is marked.
import { C, qName, state, usesQp } from './state.js?v=25b3a2d3d6';
import { $, esc, fmt, FRAME_COLORS, typeName } from './util.js?v=25b3a2d3d6';
import { caps, getJSON, withToken } from './data.js?v=25b3a2d3d6';
import { selectFrame, stepFrame } from './frames.js?v=25b3a2d3d6';
import { histogram } from './inspector.js?v=25b3a2d3d6';
import { pickBlock } from './controls.js?v=25b3a2d3d6';

const dlg = () => $('#graphsDialog');
const VIEWS = ['frames', 'dist', 'mv', 'search', 'buffer'];
const MV_CAP = 20000, DIST_ROWS = 20, HITS_KEPT = 5000, HITS_SHOWN = 500;
const SERIES_COLORS = ['#4b8dff', '#e76f6f'];

let man = null;                 // the manifest the state below belongs to
let view = 'frames', order = 'decode', assumedFps = 30;
let distScope = 'frame', distWeight = 'area';
const distStream = new Map();   // block field -> {rows, source} of the whole stream
let distStatus = '', distSeq = 0;
let mv = null;                  // what the scatter shows (snap)
let search = null;              // last search: {scope, hits, total, frames, done, note}
let searchScope = 'frame', searchSeq = 0, searchProgress = '';
let shownF = -1;                // frame whose current-frame views are drawn
let buf = null;                 // the buffer view's data: {status: loading | ready | error, obj, error}
let bufSeq = 0;

const has = (v) => v !== null && v !== undefined && v !== '';
const knownFps = () => { const s = (state.manifest && state.manifest.stream) || {}; return s.fps > 0 ? s.fps : null; };
const fpsNow = () => knownFps() || assumedFps;
const frameBits = (fr) => (fr.bytes || 0) * 8;
// frame type for people: key, inter, I slice, B slice
const typeLabel = (t) => (/_SLICE$/.test(t || '') ? t.replace(/_SLICE$/, ' slice') : (typeName(t) || 'unknown'));
const fpsText = (v) => String(+(+v).toFixed(3));   // 30, 29.97, 23.976

// ------------------------------------------------------------ probe (tests)
export function graphsSnap() {
  const d = dlg();
  if (!d || !d.open || !state.manifest) return { open: false };
  const rates = order === 'decode' ? bitrates(fpsNow()) : null;
  const list = framesInOrder();
  const distRows = (key) => (distData(key) || { rows: null }).rows;
  return {
    open: true, view, order,
    fps: fpsNow(), fpsAssumed: !knownFps(), fpsField: !$('#grFpsWrap').hidden,
    bars: list.map((fr) => [fr.f, frameBits(fr)]),
    drawn: d.querySelectorAll('#grSize .gr-col').length, qDrawn: d.querySelectorAll('#grQ .gr-dot').length,
    marked: [...d.querySelectorAll('#grSize .gr-col.here')].map((g) => +g.dataset.f),
    line: rates ? list.map((fr) => [fr.f, +rates.get(fr.f).toFixed(3)]) : null,
    q: list.map((fr) => [fr.f, has(fr.base_qindex) ? fr.base_qindex : null]), qLabel: qAxisName(),
    avgKbps: avgKbps(),
    dist: { scope: distScope, weight: distWeight, status: distStatus, f: shownF,
      mode: distRows('mode'), bsize: distRows('bsize'),
      drawn: { mode: d.querySelectorAll('#grDistMode .gr-hrow').length, bsize: d.querySelectorAll('#grDistSize .gr-hrow').length },
      source: distScope === 'frame' ? 'frame' : ((distStream.get('mode') || {}).source || null) },
    mv: mv && { f: mv.f, total: mv.total, shown: mv.shown, capped: mv.shown < mv.total, series: mv.series.map((s) => [s.label, s.pts.length / 2]),
      drawn: [...d.querySelectorAll('#grMv path.gr-pts')].map((p) => (p.getAttribute('d').match(/M/g) || []).length) },
    search: search && { scope: search.scope, done: search.done, total: search.total, frames: search.frames, note: search.note,
      hits: search.hits.slice(0, HITS_SHOWN).map((h) => [h.f, h.x, h.y]), rows: d.querySelectorAll('#grsResults tr[data-hit]').length },
    searching: searchProgress,
    buffer: bufferSnap(d),
  };
}
function bufferSnap(d) {
  const o = buf && buf.obj;
  return {
    key: state.manifest.hrd === undefined ? undefined : state.manifest.hrd, state: buf ? buf.status : null,
    status: o ? o.status : null, reason: o ? o.reason : null, rows: o ? o.rows.length : 0,
    cpb: o && o.parameters ? o.parameters.cpb_size : null, bitRate: o && o.parameters ? o.parameters.bit_rate : null,
    drawn: d.querySelectorAll('#grBuf .gr-col').length, curve: d.querySelectorAll('#grBuf path.gr-buf').length,
    marked: [...d.querySelectorAll('#grBuf .gr-col.here')].map((g) => +g.dataset.f),
    violations: [...d.querySelectorAll('#grBuf .gr-viol')].map((g) => [g.dataset.kind, +g.dataset.f, +g.dataset.au]),
    guides: [...d.querySelectorAll('#grBuf .gr-vguide')].map((g) => +g.dataset.au),
    scrollHint: $('#grBufScroll') && !$('#grBufScroll').hidden ? $('#grBufScroll').textContent : '',
    message: $('#grBufInfo') ? $('#grBufInfo').textContent : '',
  };
}

// ------------------------------------------------------------ open
// v: view to show (default: the last one).
export function openGraphs(v) {
  if (!state.manifest) return;
  if (man !== state.manifest) {
    man = state.manifest; distStream.clear(); distStatus = ''; mv = null; search = null; searchProgress = ''; searchScope = 'frame';
    order = state.order === 'output' ? 'output' : 'decode';
    distSeq++; searchSeq++; buf = null; bufSeq++;
  }
  if (VIEWS.includes(v)) view = v;
  if (!dlg().open) dlg().showModal();
  shownF = -1;
  render();
}

function render() {
  if (!state.manifest) return;
  dlg().querySelectorAll('#grViews [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  for (const v of VIEWS) $(`#grPane-${v}`).hidden = v !== view;
  const s = state.manifest.stream || {};
  const clicks = view === 'frames' || (view === 'buffer' && buf && buf.obj && buf.obj.status === 'ran');
  $('#grSub').textContent = `${s.name || 'Stream'}: ${fmt(state.manifest.frames.length)} decoded frames, ${fmt(s.outputs)} output frames. Frame ${state.f} is on screen${clicks ? ` (marked); click ${view === 'buffer' ? 'an access unit\'s column' : 'a column'} to go to its frame, or use the left and right arrow keys` : ''}.`;
  if (view === 'frames') renderFrames();
  else if (view === 'dist') renderDist();
  else if (view === 'mv') renderMv();
  else if (view === 'buffer') renderBuffer();
  else renderSearch();
  shownF = state.f;
}

// Goes to frame f and redraws what depends on the frame on screen.
async function goFrame(f) {
  const p = selectFrame(f);
  markFrame();
  await p;
  if (dlg().open) render();
}

// ------------------------------------------------------------ axes
// About n round ticks from 0 (or lo) to at least hi: [values, step].
function ticks(lo, hi, n) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) || 10 * p;
  const out = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step * 0.999; v += step) out.push(+v.toFixed(10));
  return out;
}
const tickText = (v) => (Math.abs(v) >= 1000 || Number.isInteger(v) ? fmt(Math.round(v * 100) / 100) : String(+v.toFixed(2)));

// ------------------------------------------------------------ frames view (F29, F30)
function framesInOrder() {
  const fr = state.manifest.frames;
  if (order !== 'output') return fr.slice();
  return fr.filter((x) => has(x.out_n)).sort((a, b) => a.out_n - b.out_n).concat(fr.filter((x) => !has(x.out_n)));
}

// Bitrate at each frame (decode order), kbps: the bits of the frames in the last round(fps)
// temporal units (one second) over that time; near the start, over the time so far.
function bitrates(rate) {
  const fr = state.manifest.frames, N = Math.max(1, Math.round(rate)), out = new Map();
  const t = [];
  fr.forEach((x, i) => t.push(Math.max(has(x.tu) ? x.tu : i, i ? t[i - 1] : -Infinity)));
  let a = 0, sum = 0;
  for (let i = 0; i < fr.length; i++) {
    sum += frameBits(fr[i]);
    while (t[a] <= t[i] - N) { sum -= frameBits(fr[a]); a++; }
    const span = Math.min(N, t[i] - t[0] + 1);
    out.set(fr[i].f, sum / (span / rate) / 1000);
  }
  return out;
}
// Whole stream: file size over the duration of the output frames, as `vca info` (bitrate_kbps).
function avgKbps() {
  const s = state.manifest.stream || {};
  if (knownFps() && has(s.bitrate_kbps)) return s.bitrate_kbps;
  const n = s.outputs || (state.manifest.outputs || []).length;
  return s.size && n ? Math.round(s.size * 8 / (n / fpsNow()) / 1000 * 100) / 100 : null;
}
const qAxisName = () => (usesQp() ? 'Slice QP' : 'Base qindex');

function renderFrames() {
  const known = knownFps();
  $('#grOrder').setAttribute('aria-pressed', String(order === 'output'));
  $('#grFpsWrap').hidden = !!known;
  $('#grFpsKnown').hidden = !known;
  if (known) $('#grFpsKnown').textContent = `Frame rate ${fpsText(known)} fps (from the ${((state.manifest.stream || {}).container || 'container').toUpperCase()} header)`;
  else if (document.activeElement !== $('#grFps')) $('#grFps').value = String(assumedFps);
  const avg = avgKbps();
  $('#grAvg').textContent = avg === null ? '' : `Average ${fmt(avg, 2)} kbps${known ? '' : ' at the assumed rate'} (file size over ${fmt((state.manifest.stream || {}).outputs)} output frames)`;
  drawFrameCharts();
  const types = [...new Set(state.manifest.frames.map((x) => x.frame_type))];
  const hidden = state.manifest.frames.some((x) => !has(x.out_n));
  $('#grLegend').innerHTML = types.map((t) => `<span><i style="background:${FRAME_COLORS[t] || '#888'}"></i>${esc(typeLabel(t))}</span>`).join('')
    + (hidden ? '<span><i class="hollow"></i>not output directly</span>' : '')
    + (order === 'decode' ? '<span><i class="line"></i>bitrate over the last second</span>' : '');
  const N = Math.max(1, Math.round(fpsNow()));
  $('#grNote').textContent = (order === 'decode'
    ? `Bars: the bytes of all units of each frame times 8 (vca frames). Line: the bits of the frames in the last ${fmt(N)} temporal units (1 s at ${fpsText(fpsNow())} fps) over that time; for the first second, over the time so far.`
    : 'Display order: frames by output index, then the frames that are not output directly. The bitrate line follows decode order: switch back to see it.')
    + ` The lower graph is the frame's ${usesQp() ? 'slice QP' : 'base qindex'}.`;
}

function drawFrameCharts() {
  const list = framesInOrder(), n = list.length || 1;
  const rates = order === 'decode' ? bitrates(fpsNow()) : null;
  const box = $('#grSizeBox'), wrap = Math.max(300, (box.clientWidth || 900) - 2);
  const L = 58, R = rates ? 58 : 14, T = 14, B = 34;
  const slot = Math.max(5, (wrap - L - R) / n), plotW = slot * n, W = L + plotW + R;
  const bw = Math.max(2, Math.min(slot * 0.72, 40));
  const xs = (i) => L + i * slot + slot / 2;
  const every = ticks(0, Math.max(1, Math.ceil(36 / slot)), 1)[1] || 1;   // a label every `every` slots
  const xLabels = (H) => list.map((fr, i) => (i % every ? '' : `<text class="gr-xt" x="${xs(i)}" y="${H - B + 15}" text-anchor="middle">${order === 'output' ? (has(fr.out_n) ? fr.out_n : '–') : fr.f}</text>`)).join('')
    + `<text class="gr-axis" x="${L + plotW / 2}" y="${H - 3}" text-anchor="middle">${order === 'output' ? 'Output index' : 'Decode index'}</text>`;
  const title = (fr) => {
    const q = has(fr.base_qindex) ? `, ${qName()} ${fr.base_qindex}` : '';
    return `Frame ${fr.f}${has(fr.out_n) ? `, output ${fr.out_n}` : ', not output directly'}: ${typeLabel(fr.frame_type)}, ${fmt(frameBits(fr))} bits (${fmt(fr.bytes)} bytes)`
      + (rates ? `, bitrate ${fmt(rates.get(fr.f), 1)} kbps over the last second` : '') + q;
  };

  // frame size and bitrate
  {
    const H = 250, plotH = H - T - B;
    const yt = ticks(0, Math.max(...list.map((fr) => frameBits(fr) / 1000), 0.001), 5), top = yt[yt.length - 1];
    const y = (kbit) => T + plotH - (kbit / top) * plotH;
    let s = yt.map((v) => `<line class="gr-grid" x1="${L}" x2="${L + plotW}" y1="${y(v)}" y2="${y(v)}"/><text class="gr-yt" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${tickText(v)}</text>`).join('');
    s += `<text class="gr-axis" transform="translate(13 ${T + plotH / 2}) rotate(-90)" text-anchor="middle">Frame size (kbit)</text>`;
    list.forEach((fr, i) => {
      const kb = frameBits(fr) / 1000, h = kb > 0 ? Math.max(1, (kb / top) * plotH) : 0;
      const col = FRAME_COLORS[fr.frame_type] || '#888', shown = has(fr.out_n);
      s += `<g class="gr-col" data-f="${fr.f}"><title>${esc(title(fr))}</title><rect class="gr-hit" x="${L + i * slot}" y="${T}" width="${slot}" height="${plotH}"/>`
        + `<rect class="gr-bar" data-bits="${frameBits(fr)}" x="${xs(i) - bw / 2}" y="${T + plotH - h}" width="${bw}" height="${h}" fill="${shown ? col : 'transparent'}" stroke="${col}" stroke-width="${shown ? 0 : 1.5}"/></g>`;
    });
    if (rates) {
      const rt = ticks(0, Math.max(...list.map((fr) => rates.get(fr.f)), 0.001), 5), rtop = rt[rt.length - 1];
      const ry = (k) => T + plotH - (k / rtop) * plotH;
      s += rt.map((v) => `<text class="gr-yt" x="${L + plotW + 6}" y="${ry(v) + 4}">${tickText(v)}</text>`).join('');
      s += `<text class="gr-axis" transform="translate(${W - 8} ${T + plotH / 2}) rotate(90)" text-anchor="middle">Bitrate (kbps)</text>`;
      s += `<path class="gr-rate" d="${list.map((fr, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ry(rates.get(fr.f)).toFixed(1)}`).join('')}"/>`;
      s += list.map((fr, i) => `<circle class="gr-ratept" cx="${xs(i).toFixed(1)}" cy="${ry(rates.get(fr.f)).toFixed(1)}" r="2.2"/>`).join('');
    }
    s += `<line class="gr-base" x1="${L}" x2="${L + plotW}" y1="${T + plotH}" y2="${T + plotH}"/>` + xLabels(H) + '<g class="gr-marks"></g>';
    const svg = $('#grSize');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = s;
    svg._geom = { slot, bw, L, T, plotH, list };
  }
  // base qindex or slice QP
  {
    const H = 190, plotH = H - T - B;
    const qs = list.map((fr) => (has(fr.base_qindex) ? +fr.base_qindex : null)), got = qs.filter((v) => v !== null);
    const lo = got.length ? Math.min(...got) : 0, hi = got.length ? Math.max(...got) : 1;
    const yt = ticks(Math.max(0, lo - 1), hi + 1, 4).filter((v, i, a) => Number.isInteger(v) || a.length < 3);
    const y0 = yt[0], y1 = yt[yt.length - 1];
    const y = (v) => T + plotH - ((v - y0) / ((y1 - y0) || 1)) * plotH;
    let s = yt.map((v) => `<line class="gr-grid" x1="${L}" x2="${L + plotW}" y1="${y(v)}" y2="${y(v)}"/><text class="gr-yt" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${tickText(v)}</text>`).join('');
    s += `<text class="gr-axis" transform="translate(13 ${T + plotH / 2}) rotate(-90)" text-anchor="middle">${qAxisName()}</text>`;
    let d = '', pen = false;
    list.forEach((fr, i) => {
      if (qs[i] === null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${y(qs[i]).toFixed(1)}`; pen = true;
    });
    s += `<path class="gr-qline" d="${d}"/>`;
    list.forEach((fr, i) => {
      s += `<g class="gr-col" data-f="${fr.f}"><title>${esc(title(fr))}</title><rect class="gr-hit" x="${L + i * slot}" y="${T}" width="${slot}" height="${plotH}"/>`
        + (qs[i] === null ? '' : `<circle class="gr-dot" data-q="${qs[i]}" cx="${xs(i).toFixed(1)}" cy="${y(qs[i]).toFixed(1)}" r="3.2" fill="${FRAME_COLORS[fr.frame_type] || '#888'}"/>`) + '</g>';
    });
    s += `<line class="gr-base" x1="${L}" x2="${L + plotW}" y1="${T + plotH}" y2="${T + plotH}"/>` + xLabels(H) + '<g class="gr-marks"></g>';
    const svg = $('#grQ');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = s;
    svg._geom = { slot, bw, L, T, plotH, list };
    $('#grQTitle').textContent = `${qAxisName()} per frame`;
  }
  markFrame();
  // keep the frame on screen in view when the columns scroll sideways
  const g = $('#grSize')._geom, i = g.list.findIndex((x) => x.f === state.f), bx = $('#grSizeBox');
  if (i >= 0) {
    const cx = g.L + i * g.slot;
    if (cx < bx.scrollLeft + g.L || cx > bx.scrollLeft + bx.clientWidth - 40) bx.scrollLeft = Math.max(0, cx - bx.clientWidth / 2);
  }
  $('#grQBox').scrollLeft = bx.scrollLeft;
}

// Marks the column of the frame on screen in both frame graphs.
function markFrame() {
  for (const id of ['#grSize', '#grQ']) {
    const svg = $(id), g = svg._geom;
    if (!g) continue;
    svg.querySelectorAll('.gr-col.here').forEach((e) => e.classList.remove('here'));
    const i = g.list.findIndex((x) => x.f === state.f);
    const col = svg.querySelector(`.gr-col[data-f="${state.f}"]`);
    if (col) col.classList.add('here');
    const w = Math.max(3, Math.min(g.slot - 2, g.bw + 10));
    svg.querySelector('.gr-marks').innerHTML = i < 0 ? '' : `<rect class="gr-mark" x="${(g.L + i * g.slot + g.slot / 2 - w / 2).toFixed(1)}" y="${g.T - 4}" width="${w.toFixed(1)}" height="${g.plotH + 8}" rx="3"/>`;
  }
  markBuffer();
}

// ------------------------------------------------------------ distributions (F31)
// Whole-stream rows of a block field: `vca serve`'s stats table, else every frame's blocks.
function distData(key) {
  if (distScope === 'frame') {
    if (!state.payload) return null;
    return { rows: histogram(key).map((e) => ({ k: e.k, n: e.n, area: e.area, bits: e.bits })) };
  }
  return distStream.get(key) || null;
}

// base URL of this analysis on `vca serve` (…/api/a/<aid>/), or null (static site, opened folder)
function serverBase() {
  if (!caps.server || !state.source || state.source.kind !== 'url') return null;
  try {
    const u = new URL(state.source.base, location.href);
    return u.origin === location.origin && /^\/api\/a\/[^/]+\/$/.test(u.pathname) ? u.pathname : null;
  } catch (e) { return null; }
}
// RFC 4180 rows of a CSV text (tables.py writes it: quoted cells, CRLF line ends).
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
async function serverStats(base, key) {
  const url = `${base}table/stats.csv?by=${encodeURIComponent(key)}&tree=luma`;
  const r = await fetch(url, withToken(url, { cache: 'no-store' }));
  if (!r.ok) throw new Error(`stats table: HTTP ${r.status}`);
  const [head, ...body] = parseCsv(await r.text());
  const ix = (n) => head.indexOf(n);
  return body.filter((x) => x.length === head.length).map((x) => ({ k: x[ix('value')] === '' ? '–' : x[ix('value')], n: +x[ix('blocks')], area: +x[ix('area')], bits: +x[ix('bits')] }));
}
// Luma and shared blocks of one frame payload into the tallies, as histogram() and `vca stats` count
// them: area clipped to that frame's picture.
function tallyFrame(p, keys, acc) {
  const fr = p.frame, cx = C.x, cy = C.y, cw = C.w, ch = C.h, cb = C.bits, ct = C.tree;
  for (const b of p.blocks) {
    if (b[ct] === 'CHROMA') continue;
    const a = Math.max(0, Math.min(b[cx] + b[cw], fr.width) - b[cx]) * Math.max(0, Math.min(b[cy] + b[ch], fr.height) - b[cy]);
    for (const key of keys) {
      const k = b[C[key]] ?? '–', m = acc[key], e = m.get(k) || { k, n: 0, area: 0, bits: 0 };
      e.n++; e.area += a; e.bits += b[cb] || 0;
      m.set(k, e);
    }
  }
}
const payloadOf = (f) => (state.frameCache.has(f) ? Promise.resolve(state.frameCache.get(f)) : getJSON(`frames/${f}.json`));

async function loadStreamDist() {
  if (distStream.has('mode') && distStream.has('bsize')) return;
  const my = ++distSeq, keys = ['mode', 'bsize'];
  const base = serverBase();
  if (base) {
    distStatus = 'Reading the stream statistics from the server…'; drawDist();
    try {
      const [a, b] = await Promise.all(keys.map((k) => serverStats(base, k)));
      if (my !== distSeq) return;
      distStream.set('mode', { rows: a, source: 'server' }); distStream.set('bsize', { rows: b, source: 'server' });
      distStatus = ''; drawDist(); return;
    } catch (e) { if (my !== distSeq) return; }   // an older server: read the frames instead
  }
  const acc = { mode: new Map(), bsize: new Map() }, frames = state.manifest.frames;
  for (let k = 0; k < frames.length; k++) {
    if (my !== distSeq || !dlg().open) { if (my === distSeq) distStatus = ''; return; }
    distStatus = `Reading frame ${fmt(k + 1)} of ${fmt(frames.length)}…`;
    $('#grDistStatus').textContent = distStatus;
    try { tallyFrame(await payloadOf(frames[k].f), keys, acc); } catch (e) {
      if (my === distSeq) { distStatus = `Frame ${frames[k].f} could not be read (${e.message}).`; drawDist(); }
      return;
    }
  }
  if (my !== distSeq) return;
  for (const key of keys) distStream.set(key, { rows: [...acc[key].values()].sort((p, q) => q.area - p.area), source: 'frames' });
  distStatus = ''; drawDist();
}

function renderDist() {
  dlg().querySelectorAll('#grDistScope [data-scope]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === distScope)));
  dlg().querySelectorAll('#grDistWeight [data-weight]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.weight === distWeight)));
  $('#grDistScope [data-scope="frame"]').textContent = `Frame ${state.f}`;
  if (distScope === 'stream') loadStreamDist();
  drawDist();
}
const WEIGHT_WORD = { n: 'blocks', area: 'luma pixels', bits: 'bits' };
function drawDist() {
  $('#grDistStatus').textContent = distStatus;
  for (const [key, id] of [['mode', '#grDistMode'], ['bsize', '#grDistSize']]) {
    const d = distData(key), svg = $(id), more = $(`${id}More`);
    if (!d) { svg.innerHTML = ''; svg.setAttribute('height', 0); more.textContent = distScope === 'stream' ? '' : 'No frame loaded.'; continue; }
    const rows = d.rows.slice().sort((p, q) => q[distWeight] - p[distWeight] || String(p.k).localeCompare(String(q.k)));
    const total = rows.reduce((t, r) => t + r[distWeight], 0) || 1, shown = rows.slice(0, DIST_ROWS);
    const max = Math.max(...shown.map((r) => r[distWeight]), 1e-9);
    const W = Math.max(280, (svg.parentElement.clientWidth || 600) - 4), labelW = Math.min(150, Math.round(W * 0.32)), valW = 130;
    const barW = Math.max(40, W - labelW - valW - 14), rowH = 21, H = shown.length * rowH + 4;
    const s = shown.map((r, i) => {
      const v = r[distWeight], y = 2 + i * rowH, w = Math.max(v > 0 ? 1 : 0, (v / max) * barW), pct = 100 * v / total;
      const vt = distWeight === 'bits' ? fmt(Math.round(v * 10) / 10, 1) : fmt(v);
      const k = r.k === '–' ? 'none' : String(r.k);
      return `<g class="gr-hrow" data-k="${esc(r.k)}"><title>${esc(`${k}: ${fmt(r.n)} blocks, ${fmt(r.area)} luma pixels, ${fmt(Math.round(r.bits * 10) / 10, 1)} bits`)}</title>`
        + `<text class="gr-hl" x="${labelW - 6}" y="${y + 14}" text-anchor="end">${esc(k.length > 22 ? k.slice(0, 21) + '…' : k)}</text>`
        + `<rect class="gr-hbar" x="${labelW}" y="${y + 3}" width="${w.toFixed(1)}" height="${rowH - 7}" rx="2"/>`
        + `<text class="gr-hv" x="${labelW + barW + 8}" y="${y + 14}">${vt} <tspan class="gr-pct">${pct.toFixed(1)}%</tspan></text></g>`;
    }).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = s;
    more.textContent = rows.length > DIST_ROWS ? `and ${fmt(rows.length - DIST_ROWS)} more values with smaller shares` : (rows.length ? '' : 'No blocks.');
  }
  const src = distScope === 'frame' ? `the blocks of frame ${state.f}, as the Stats tab counts them`
    : ((distStream.get('mode') || {}).source === 'server' ? 'every frame, from the server\'s stats table (vca stats)' : 'every frame of the bundle, counted here as vca stats does');
  $('#grDistNote').textContent = `Luma and shared blocks (a separate chroma tree is not counted), weighted by ${WEIGHT_WORD[distWeight]}; area is clipped to the picture. Source: ${src}.`;
}

// ------------------------------------------------------------ motion vectors (F34)
// Series: reference list 0 and 1 where the codec names its references by list (VVC, HEVC, AVC:
// L0_<i>, L1_<i>), else the first and the second motion vector of a block (compound).
function mvSeries() {
  const p = state.payload, byList = usesQp();
  const ser = byList ? [{ label: 'List 0', pts: [] }, { label: 'List 1', pts: [] }] : [{ label: 'First reference (mv0)', pts: [] }, { label: 'Second reference (mv1, compound)', pts: [] }];
  if (!p || C.mv0_row === undefined) return ser;
  const pairs = [[C.mv0_col, C.mv0_row, C.ref0, 0], [C.mv1_col, C.mv1_row, C.ref1, 1]];
  for (const b of p.blocks) {
    if (b[C.pred] !== 'inter') continue;
    for (const [cc, cr, rf, k] of pairs) {
      if (cc === undefined || !has(b[cr]) || !has(b[cc])) continue;
      let s = k;
      if (byList) { const m = /^L([01])_/.exec(b[rf] || ''); if (m) s = +m[1]; }
      ser[s].pts.push(b[cc] / 8, b[cr] / 8);
    }
  }
  return ser;
}

function renderMv() {
  const all = mvSeries(), total = all.reduce((t, s) => t + s.pts.length / 2, 0);
  const stride = total > MV_CAP ? Math.ceil(total / MV_CAP) : 1;
  const series = all.map((s) => {
    if (stride === 1) return s;
    const pts = [];
    for (let i = 0; i < s.pts.length / 2; i += stride) pts.push(s.pts[2 * i], s.pts[2 * i + 1]);
    return { label: s.label, pts };
  });
  const shown = series.reduce((t, s) => t + s.pts.length / 2, 0);
  mv = { f: state.f, total, shown, series };
  let R = 0;
  for (const s of series) for (const v of s.pts) R = Math.max(R, Math.abs(v));
  const rt = ticks(0, Math.max(1, R), 3), top = rt[rt.length - 1];
  const box = $('#grMvBox'), S = Math.max(260, Math.min(560, (box.clientWidth || 560) - 4)), M = 46, half = (S - 2 * M) / 2, c = S / 2;
  const X = (v) => (c + (v / top) * half).toFixed(1), Y = (v) => (c + (v / top) * half).toFixed(1);
  const tv = [...rt.slice(1).reverse().map((v) => -v), ...rt];
  let s = `<rect class="gr-frame" x="${M}" y="${M}" width="${2 * half}" height="${2 * half}"/>`;
  s += tv.map((v) => `<line class="gr-grid${v === 0 ? ' zero' : ''}" x1="${X(v)}" x2="${X(v)}" y1="${M}" y2="${S - M}"/><line class="gr-grid${v === 0 ? ' zero' : ''}" x1="${M}" x2="${S - M}" y1="${Y(v)}" y2="${Y(v)}"/>`
    + `<text class="gr-xt" x="${X(v)}" y="${S - M + 15}" text-anchor="middle">${tickText(v)}</text><text class="gr-yt" x="${M - 6}" y="${+Y(v) + 4}" text-anchor="end">${tickText(v)}</text>`).join('');
  s += `<text class="gr-axis" x="${c}" y="${S - 6}" text-anchor="middle">x (pel)</text><text class="gr-axis" transform="translate(13 ${c}) rotate(-90)" text-anchor="middle">y (pel, positive = down)</text>`;
  series.forEach((ser, k) => {
    let d = '';
    for (let i = 0; i < ser.pts.length; i += 2) d += `M${X(ser.pts[i])} ${Y(ser.pts[i + 1])}h0`;
    s += `<path class="gr-pts" d="${d}" stroke="${SERIES_COLORS[k]}"/>`;
  });
  const svg = $('#grMv');
  svg.setAttribute('viewBox', `0 0 ${S} ${S}`); svg.setAttribute('width', S); svg.setAttribute('height', S);
  svg.innerHTML = s;
  $('#grMvLegend').innerHTML = all.map((ser, k) => `<span><i style="background:${SERIES_COLORS[k]}"></i>${esc(ser.label)}: ${fmt(ser.pts.length / 2)}</span>`).join('');
  const inter = state.payload ? state.payload.blocks.filter((b) => b[C.pred] === 'inter').length : 0;
  $('#grMvSub').textContent = !state.payload ? 'No frame loaded.'
    : total ? `${fmt(total)} motion vectors of the ${fmt(inter)} inter blocks of frame ${state.f}${stride > 1 ? `. Showing ${fmt(shown)} of ${fmt(total)} (every ${fmt(stride)}th vector) to keep the graph fast.` : '.'}`
      : `Frame ${state.f} has no motion vectors (no inter blocks).`;
  $('#grMvNote').textContent = `Each point is one motion vector, x and y in pel (the analysis stores 1/8 pel). ${usesQp() ? 'Colours: the reference list of the vector (L0 or L1 reference names).' : 'Colours: the first and the second vector of a block; a second one exists only for compound prediction.'} Many blocks share a vector, so one point can stand for many. The left and right arrow keys step frames.`;
}

// ------------------------------------------------------------ block search (F07)
function readForm() {
  const num = (id) => { const v = $(id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  return {
    scope: searchScope,
    pred: $('#grsPred').value, mode: $('#grsMode').value.trim().toLowerCase(),
    size: $('#grsSize').value.trim().toUpperCase().replace(/\s+/g, ''),
    qmin: num('#grsQmin'), qmax: num('#grsQmax'), bmin: num('#grsBmin'), bmax: num('#grsBmax'),
    skip: $('#grsSkip').value, sort: $('#grsSort').value,
  };
}
// A test for one block row of a frame payload (luma and shared blocks only).
function matcher(q) {
  return (b) => {
    if (b[C.tree] === 'CHROMA') return false;
    if (q.pred && b[C.pred] !== q.pred) return false;
    if (q.mode && !String(b[C.mode] || '').toLowerCase().includes(q.mode)) return false;
    if (q.size && String(b[C.bsize] || '').toUpperCase() !== q.size) return false;
    const qi = b[C.qindex];
    if (q.qmin !== null && !(has(qi) && qi >= q.qmin)) return false;
    if (q.qmax !== null && !(has(qi) && qi <= q.qmax)) return false;
    const bits = b[C.bits] || 0;
    if (q.bmin !== null && !(bits >= q.bmin)) return false;
    if (q.bmax !== null && !(bits <= q.bmax)) return false;
    if (q.skip === 'yes' && !b[C.skip_txfm]) return false;
    if (q.skip === 'no' && b[C.skip_txfm]) return false;
    return true;
  };
}
const hitOf = (b, f) => ({ f, x: b[C.x], y: b[C.y], w: b[C.w], h: b[C.h], bsize: b[C.bsize], pred: b[C.pred], mode: b[C.mode], q: b[C.qindex], bits: b[C.bits] || 0 });

async function runSearch() {
  const q = readForm(), test = matcher(q), my = ++searchSeq;
  const res = { scope: q.scope, sort: q.sort, hits: [], total: 0, frames: 0, done: false, note: '' };
  search = res;
  const take = (p, f) => {
    res.frames++;
    for (const b of p.blocks) if (test(b)) { res.total++; if (res.hits.length < HITS_KEPT) res.hits.push(hitOf(b, f)); }
  };
  if (q.scope === 'frame') {
    if (state.payload) take(state.payload, state.payload.frame.f);
  } else {
    const frames = state.manifest.frames;
    for (let k = 0; k < frames.length; k++) {
      if (my !== searchSeq || !dlg().open) { if (my === searchSeq) searchProgress = ''; return; }
      searchProgress = `Searching frame ${fmt(k + 1)} of ${fmt(frames.length)}…`;
      $('#grsStatus').textContent = searchProgress;
      try { take(await payloadOf(frames[k].f), frames[k].f); } catch (e) { res.note = `Frame ${frames[k].f} could not be read (${e.message}); the search stopped there.`; break; }
    }
    if (my !== searchSeq) return;
  }
  if (q.sort === 'bits') res.hits.sort((a, b) => b.bits - a.bits || a.f - b.f);
  res.done = true; searchProgress = '';
  drawResults();
}

function renderSearch() {
  dlg().querySelectorAll('#grsScope [data-scope]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === searchScope)));
  $('#grsScope [data-scope="frame"]').textContent = `Frame ${state.f}`;
  $('#grsQLabel').textContent = usesQp() ? 'QP' : 'Qindex';
  // suggestions: the modes and sizes of the frame on screen
  if (state.payload) {
    const vals = (key) => [...new Set(state.payload.blocks.map((b) => b[C[key]]).filter(has))].sort();
    $('#grsModes').innerHTML = vals('mode').map((v) => `<option value="${esc(v)}">`).join('');
    $('#grsSizes').innerHTML = vals('bsize').map((v) => `<option value="${esc(v)}">`).join('');
  }
  drawResults();
}

function drawResults() {
  $('#grsStatus').textContent = searchProgress;
  const tb = $('#grsResults'), sum = $('#grsSummary');
  if (!search) { tb.innerHTML = ''; sum.textContent = 'Set conditions and press Search (or Enter in a box). Empty boxes are not used.'; return; }
  const r = search, shown = r.hits.slice(0, HITS_SHOWN);
  const where = r.scope === 'frame' ? `frame ${r.hits.length ? r.hits[0].f : state.f}` : `${fmt(r.frames)} frames`;
  sum.textContent = (r.done ? `${fmt(r.total)} ${r.total === 1 ? 'block matches' : 'blocks match'} in ${where}.` : 'Searching…')
    + (r.total > shown.length ? ` Showing the first ${fmt(shown.length)}${r.sort === 'bits' ? ' by bits' : ''}.` : '')
    + (r.done && r.total ? ' Click a row to select the block on the picture.' : '') + (r.note ? ` ${r.note}` : '');
  tb.innerHTML = shown.map((h, k) => `<tr class="clickable${h.f === state.f && state.sel >= 0 && state.payload && state.payload.blocks[state.sel][C.x] === h.x && state.payload.blocks[state.sel][C.y] === h.y ? ' cur' : ''}" data-hit="${k}" title="Go to frame ${h.f} and select this block">`
    + `<td class="num">${h.f}</td><td>${esc(h.bsize)} at (${h.x}, ${h.y})</td><td>${esc(h.pred || '')} ${esc(h.mode || '')}</td><td class="num">${fmt(h.q)}</td><td class="num">${fmt(Math.round(h.bits * 100) / 100, 2)}</td></tr>`).join('');
}

// ------------------------------------------------------------ coded picture buffer (F33)
// hrd.json (vca/hrd.py): rows [f, au, arrival_first, arrival_last, removal, bits, fullness_before,
// fullness_after] per access unit in decoding order, times in seconds from the first bit of access
// unit 0, fullness in bits; violations [{kind, f, au, sentence, ...}].
const NO_HRD = {
  av1: 'The AV1 decoder model (Annex E) is not drawn yet.',
  av2: 'The AV2 decoder model (Annex E) is not drawn yet.',
  vvc: 'The VVC HRD is not modelled yet.',
  vp9: 'VP9 bitstreams carry no buffer model.',
};
const VIOL_WORD = { hrd_overflow: 'overflow', hrd_underflow: 'underflow', hrd_initial_delay: 'initial delay' };
function noHrdText() {
  const m = state.manifest, codec = (m.stream || {}).codec;
  if (m.hrd === undefined) return 'This bundle was made before the buffer model existed (its manifest has no hrd key): export it again with vca export to see the buffer.';
  if (NO_HRD[codec]) return `${NO_HRD[codec]} This view draws the coded picture buffer of the HEVC and AVC hypothetical reference decoder.`;
  return 'This stream has no buffer model to draw: its SPS has no hrd_parameters, or it carries no buffering period SEI (or no SEI at all), so the hypothetical reference decoder cannot start (Issues, Shift+E, gives the reason under the checks that did not run). A stream with VUI hrd_parameters, a buffering period SEI and picture timing SEI shows its coded picture buffer here.';
}
async function loadBuffer() {
  const my = ++bufSeq;
  buf = { status: 'loading', obj: null, error: null };
  drawBuffer();
  try {
    const o = await getJSON(state.manifest.hrd);
    if (my !== bufSeq) return;
    buf = { status: 'ready', obj: o, error: null };
  } catch (e) {
    if (my !== bufSeq) return;
    buf = { status: 'error', obj: null, error: e.message };
  }
  if (dlg().open && view === 'buffer') render();
}
function renderBuffer() {
  if (state.manifest.hrd && !buf) { loadBuffer(); return; }
  drawBuffer();
}
const secText = (t) => String(+(+t).toFixed(6));
// What the CPB holds at a moment, for a tooltip: a negative fullness is bits missing (an underflow), not a count.
const holds = (bits) => { const v = Math.round(bits); return v < 0 ? `is ${fmt(-v)} bits short (underflow)` : `holds ${fmt(v)} bits`; };
// The fullness curve: at every arrival start or end and every removal, the bits in the CPB just before
// (and, at a removal, just after) that time, from the rows alone (arrivals are back to back in decoding
// order at BitRate; a removal takes the access unit's bits out at its removal time).
function bufferCurve(rows, R) {
  const n = rows.length, cum = [0];
  rows.forEach((r) => cum.push(cum[cum.length - 1] + r[5]));
  const tafs = rows.map((r) => r[3]);
  const byRm = rows.map((r) => [r[4], r[5]]).sort((a, b) => a[0] - b[0]), rmT = byRm.map((x) => x[0]), rmCum = [0];
  byRm.forEach((x) => rmCum.push(rmCum[rmCum.length - 1] + x[1]));
  const upper = (arr, t, strict) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (strict ? arr[m] < t : arr[m] <= t) lo = m + 1; else hi = m; } return lo; };
  const arrived = (t) => { const j = upper(tafs, t, false); return cum[j] + (j < n && rows[j][2] < t ? Math.min(rows[j][5], (t - rows[j][2]) * R) : 0); };
  const ts = [...new Set([0, ...rows.flatMap((r) => [r[2], r[3], r[4]])])].sort((a, b) => a - b);
  const pts = [];
  for (const t of ts) {
    const a = arrived(t), before = a - rmCum[upper(rmT, t, true)], after = a - rmCum[upper(rmT, t, false)];
    pts.push([t, before]);
    if (after !== before) pts.push([t, after]);
  }
  return pts;
}
function drawBuffer() {
  const svg = $('#grBuf'), info = $('#grBufInfo'), note = $('#grBufNote'), legend = $('#grBufLegend');
  const clear = (msg) => {
    svg.innerHTML = ''; svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg._geom = null;
    legend.innerHTML = ''; note.textContent = ''; info.textContent = msg; scrollHint();
  };
  if (!state.manifest.hrd) { clear(noHrdText()); return; }
  if (!buf || buf.status === 'loading') { clear('Reading the buffer model (hrd.json)…'); return; }
  if (buf.status === 'error') { clear(`The buffer model could not be read: ${buf.error}.`); return; }
  const o = buf.obj;
  if (o.status !== 'ran' || !o.rows.length) { clear(`No buffer to draw: ${o.reason || 'the model did not run'}`); return; }
  const p = o.parameters, rows = o.rows, R = p.bit_rate, S = p.cpb_size;
  const pts = bufferCurve(rows, R);
  const rm = rows.map((r) => r[4]).sort((a, b) => a - b);
  const gaps = rm.slice(1).map((t, i) => t - rm[i]).filter((d) => d > 0).sort((a, b) => a - b);
  const gap = gaps.length ? gaps[gaps.length >> 1] : (rm[0] || 1);
  const tEnd = Math.max(rm[rm.length - 1], ...rows.map((r) => r[3])) + gap / 2;
  const box = $('#grBufBox'), avail = Math.max(300, (box.clientWidth || 900) - 2);
  const L = 66, Rm = 18, T = 18, B = 36, H = 290, plotH = H - T - B;
  const pxs = Math.max((avail - L - Rm) / tEnd, 9 / gap), plotW = tEnd * pxs, W = L + plotW + Rm;
  const X = (t) => L + t * pxs;
  const vals = pts.map((q) => q[1]);
  const ymin = Math.min(0, ...vals), ymax = Math.max(S, ...vals) * 1.08;
  const yt = ticks(ymin / 1000, ymax / 1000, 5), y0 = Math.min(yt[0], ymin / 1000), y1 = yt[yt.length - 1];
  const Y = (bits) => T + plotH - ((bits / 1000 - y0) / ((y1 - y0) || 1)) * plotH;
  let s = yt.map((v) => `<line class="gr-grid${v === 0 ? ' zero' : ''}" x1="${L}" x2="${L + plotW}" y1="${Y(v * 1000).toFixed(1)}" y2="${Y(v * 1000).toFixed(1)}"/><text class="gr-yt" x="${L - 6}" y="${(Y(v * 1000) + 4).toFixed(1)}" text-anchor="end">${tickText(v)}</text>`).join('');
  s += `<text class="gr-axis" transform="translate(13 ${T + plotH / 2}) rotate(-90)" text-anchor="middle">CPB fullness (kbit)</text>`;
  const xt = ticks(0, tEnd, Math.max(2, Math.round(plotW / 90)));
  s += xt.filter((v) => v <= tEnd).map((v) => `<text class="gr-xt" x="${X(v).toFixed(1)}" y="${H - B + 15}" text-anchor="middle">${tickText(v)}</text>`).join('');
  s += `<text class="gr-axis" x="${L + plotW / 2}" y="${H - 3}" text-anchor="middle">Time (s) from the first bit of access unit ${fmt(p.first_au)}</text>`;
  // columns: one per access unit, around its removal time; a click goes to its frame
  const order = rows.map((r, k) => k).sort((a, b) => rows[a][4] - rows[b][4]);
  const viol = new Map();
  for (const v of o.violations || []) { const l = viol.get(v.au) || []; l.push(v); viol.set(v.au, l); }
  const cols = new Map();
  order.forEach((k, i) => {
    const r = rows[k], x = X(r[4]);
    const xl = i ? (X(rows[order[i - 1]][4]) + x) / 2 : x - (gap * pxs) / 2;
    const xr = i + 1 < order.length ? (X(rows[order[i + 1]][4]) + x) / 2 : x + (gap * pxs) / 2;
    const x0 = Math.min(xl, x - 2), w = Math.max(4, Math.max(xr, x + 2) - x0);
    const vs = viol.get(r[1]) || [];
    const tip = `Access unit ${r[1]}${has(r[0]) ? `, frame ${r[0]}` : ''}: ${fmt(r[5])} bits arrive from ${secText(r[2])} to ${secText(r[3])} s and are removed at ${secText(r[4])} s; the CPB ${holds(r[6])} just before and ${holds(r[7])} just after.`
      + vs.map((v) => ` ${v.sentence}`).join('');
    if (has(r[0])) cols.set(r[0], [x0, w]);
    s += `<g class="gr-col"${has(r[0]) ? ` data-f="${r[0]}"` : ''} data-au="${r[1]}"><title>${esc(tip)}</title><rect class="gr-hit" x="${x0.toFixed(1)}" y="${T}" width="${w.toFixed(1)}" height="${plotH}"/></g>`;
  });
  s += `<line class="gr-base" x1="${L}" x2="${L + plotW}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`;
  s += `<line class="gr-cpb" x1="${L}" x2="${L + plotW}" y1="${Y(S).toFixed(1)}" y2="${Y(S).toFixed(1)}"/><text class="gr-cpbt" x="${L + 6}" y="${(Y(S) - 5).toFixed(1)}">CpbSize ${fmt(S)} bits</text>`;
  s += `<path class="gr-buf" d="${pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join('')}"/>`;
  // violations: a red triangle at the removal (overflow above the curve, underflow and initial delay on the zero
  // line, larger, with a dashed vertical guide through the plot at that access unit: one such mark is easy to miss
  // in a long sawtooth; an overflow run marks every access unit, so it gets no guide)
  for (const v of o.violations || []) {
    const r = rows.find((q) => q[1] === v.au);
    if (!r) continue;
    const over = v.kind === 'hrd_overflow', x = X(r[4]), y = over ? Y(r[6]) - 4 : Y(0) + 4, k = over ? 1 : 1.5;
    const d = over ? `M${(x - 5).toFixed(1)},${(y - 8).toFixed(1)}h10l-5,8z` : `M${(x - 5 * k).toFixed(1)},${(y + 8 * k).toFixed(1)}h${10 * k}l${-5 * k},${-8 * k}z`;
    if (!over) s += `<line class="gr-vguide" data-au="${v.au}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T}" y2="${T + plotH}"/>`;
    s += `<g class="gr-viol" data-kind="${v.kind}" data-f="${has(v.f) ? v.f : ''}" data-au="${v.au}"><path d="${d}"/></g>`;
  }
  s += '<g class="gr-marks"></g>';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.innerHTML = s;
  svg._geom = { cols, T, plotH };
  const nv = (o.violations || []).length, byKind = {};
  for (const v of o.violations || []) byKind[v.kind] = (byKind[v.kind] || 0) + 1;
  info.textContent = `${o.model}: BitRate ${fmt(R)} bit/s, CpbSize ${fmt(S)} bits (${fmt(S / R, 3)} s at the bit rate), ${p.cbr_flag ? 'CBR' : 'VBR'}${p.low_delay_hrd_flag ? ', low delay' : ''}, ${fmt(rows.length)} of ${fmt(o.of)} access units. `
    + (nv ? `Violations: ${Object.entries(byKind).map(([k, n]) => `${fmt(n)} ${VIOL_WORD[k] || k}`).join(', ')} (Issues, Shift+E, lists them).` : 'No overflow, underflow or initial delay violation.');
  const under = Object.keys(byKind).filter((k) => k !== 'hrd_overflow');
  legend.innerHTML = '<span><i class="line gr-lbuf"></i>CPB fullness</span><span><i class="line gr-lcpb"></i>CpbSize</span>'
    + (byKind.hrd_overflow ? '<span><i class="gr-lviol"></i>overflow (above the curve at that removal)</span>' : '')
    + (under.length ? `<span><i class="gr-lviol up"></i>${esc(under.map((k) => VIOL_WORD[k] || k).join(', '))} (on the zero line at that removal, with a dashed line through the graph)</span>` : '');
  note.textContent = `The line rises while access units arrive at BitRate and drops by an access unit's bits at its removal time (${o.spec ? `${o.spec.doc} ${o.spec.clause}` : 'Annex C'}; ${p.conformance_point}; clock tick ${fmt(p.num_units_in_tick)} / ${fmt(p.time_scale)} s). ${o.reason || ''}`;
  markBuffer();
  const g = cols.get(state.f);
  if (g && (g[0] < box.scrollLeft + L || g[0] > box.scrollLeft + box.clientWidth - 40)) box.scrollLeft = Math.max(0, g[0] - box.clientWidth / 2);
  scrollHint();
}
// "Scroll sideways" under a graph wider than its box (a phone), naming the end that is hidden.
function scrollHint() {
  const box = $('#grBufBox'), h = $('#grBufScroll'), svg = $('#grBuf');
  const W = +(svg.getAttribute('width') || 0), over = W > box.clientWidth + 1;
  h.hidden = !over;
  if (!over) { h.textContent = ''; return; }
  const left = box.scrollLeft > 1, right = box.scrollLeft + box.clientWidth < W - 1;
  h.textContent = `The graph is wider than this box: scroll it sideways for ${left && right ? 'the earlier and later' : left ? 'the earlier' : 'the later'} access units.`;
}
// Marks the column of the frame on screen in the buffer graph.
function markBuffer() {
  const svg = $('#grBuf'), g = svg && svg._geom;
  if (!g) return;
  svg.querySelectorAll('.gr-col.here').forEach((e) => e.classList.remove('here'));
  const c = g.cols.get(state.f), col = svg.querySelector(`.gr-col[data-f="${state.f}"]`);
  if (col) col.classList.add('here');
  svg.querySelector('.gr-marks').innerHTML = c ? `<rect class="gr-mark" x="${c[0].toFixed(1)}" y="${g.T - 4}" width="${c[1].toFixed(1)}" height="${g.plotH + 8}" rx="3"/>` : '';
}

// ------------------------------------------------------------ wiring
export function initGraphs() {
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    const vb = t.closest('#grViews [data-view]');
    if (vb) { view = vb.dataset.view; render(); return; }
    const col = t.closest('.gr-col[data-f]');
    if (col) { goFrame(+col.dataset.f); return; }
    if (t.closest('#grOrder')) { order = order === 'output' ? 'decode' : 'output'; renderFrames(); return; }
    const sc = t.closest('#grDistScope [data-scope]');
    if (sc) { distScope = sc.dataset.scope; distStatus = ''; renderDist(); return; }
    const w = t.closest('#grDistWeight [data-weight]');
    if (w) { distWeight = w.dataset.weight; renderDist(); return; }
    const ss = t.closest('#grsScope [data-scope]');
    if (ss) { searchScope = ss.dataset.scope; d.querySelectorAll('#grsScope [data-scope]').forEach((b) => b.setAttribute('aria-pressed', String(b === ss))); return; }
    const row = t.closest('#grsResults tr[data-hit]');
    if (row && search) {
      const h = search.hits[+row.dataset.hit];
      if (!h) return;
      d.close();
      pickBlock(h.f, h.x, h.y);
    }
  });
  $('#grsForm').addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });
  $('#grFps').addEventListener('input', (e) => {
    const v = +e.target.value;
    const ok = e.target.value.trim() !== '' && isFinite(v) && v >= 1 && v <= 1000;
    e.target.classList.toggle('bad', !ok);
    if (!ok) return;
    assumedFps = v;
    renderFrames();
  });
  // the frame graphs scroll sideways together
  const a = $('#grSizeBox'), b = $('#grQBox');
  a.addEventListener('scroll', () => { if (b.scrollLeft !== a.scrollLeft) b.scrollLeft = a.scrollLeft; });
  b.addEventListener('scroll', () => { if (a.scrollLeft !== b.scrollLeft) a.scrollLeft = b.scrollLeft; });
  $('#grBufBox').addEventListener('scroll', scrollHint, { passive: true });
  // left and right arrow keys step frames while the dialog is open (not inside a box or a list)
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const before = state.f;
    stepFrame(e.key === 'ArrowLeft' ? -1 : 1);
    if (state.f !== before) goFrameShown();
  });
  // the frame changed elsewhere (a job opened an analysis): mark it, redraw when it is loaded
  new MutationObserver(() => { if (d.open && state.manifest === man) markFrame(); }).observe($('#framePos'), { childList: true, subtree: true, characterData: true });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (d.open) render(); }, 150); });
  // Graphs… on the Stream tab
  $('#tabBody').addEventListener('click', (e) => { if (e.target.closest('[data-act="graphs"]')) openGraphs(); });
}
// stepFrame started loading state.f: mark it now, redraw the frame views when it is there.
async function goFrameShown() {
  markFrame();
  const f = state.f;
  for (let i = 0; i < 200 && (state.loading >= 0 || !state.payload || state.payload.frame.f !== f); i++) {
    await new Promise((r) => setTimeout(r, 25));
    if (state.f !== f) return;
  }
  if (dlg().open && state.f === f) render();
}
