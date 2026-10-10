// F-b track X (R49, D-115; FEATURES F26, F27): the Quality dialog (PSNR / SSIM per frame), the per-block numbers of
// a mismatching frame (the Diff tab's table, the psnr fill and its hover), mismatch navigation ([ ] differing
// frames, , . mismatching blocks) and the 9x9 sample window of "Go to first mismatch".  Hand-written SVG, no library.
//
// Every number comes from the data contract (SERVER_API.md section 16): the frame values from `vca serve`'s
// quality.jsonl (= `vca quality --json`, streamed as the frames are computed) or a bundle's quality.json (PSNR only),
// the block values from frames/<f>.diff.json `cu` of the stage in focus.
import { C, FILLS, state, STAGES } from './state.js?v=9ce97af84e';
import { $, clamp, esc, fmt, ramp, rgb, setStatus } from './util.js?v=9ce97af84e';
import { aTitle, bTitle, caps, getJSON, withToken } from './data.js?v=9ce97af84e';
import { asProblem } from './api.js?v=9ce97af84e';
import { focusStage } from './diff.js?v=9ce97af84e';
import { orderedFrames, selectFrame, stepFrame } from './frames.js?v=9ce97af84e';
import { canvas, requestRender } from './view.js?v=9ce97af84e';
import { renderTab } from './inspector.js?v=9ce97af84e';
import { writeHash } from './hash.js?v=9ce97af84e';
import * as pixels from './pixels.js?v=9ce97af84e';
import { renderChips } from './controls.js?v=9ce97af84e';

const dlg = () => $('#qualityDialog');
const PSNR_KEYS = ['Y', 'U', 'V', 'yuv'], SSIM_KEYS = ['Y', 'U', 'V', 'all'];
const CHROMA_ONLY = 'rgb(150,160,176)';   // psnr fill: luma equal, only chroma samples differ
const PIPELINE = ['pred', 'prefilter', 'recon'];   // decode pipeline order (the pairs of vca quality --stage all)
const WINDOW = 9;                         // "Go to first mismatch": samples around the first differing one
const has = (v) => v !== null && v !== undefined;

// ------------------------------------------------------------ block numbers (Diff tab, psnr fill)
// Luma area of a block inside the picture (edge blocks may extend past it).
function areaOf(b, fr) {
  return Math.max(0, Math.min(b[C.x] + b[C.w], fr.width) - b[C.x]) * Math.max(0, Math.min(b[C.y] + b[C.h], fr.height) - b[C.y]);
}
let cuMemo = { fd: null, st: null, p: null, val: null };
// The frame's frames/<f>.diff.json `cu` rows of the stage in focus (the outlined one), worst first:
// {i, nY, maxY, sseY, nC, sseC, psnr, colour}.  psnr = the block's luma PSNR, 10 log10(peak² × area / SSE) over
// its samples inside the picture; null when only chroma differs.  null when the frame has no such numbers.
export function cuRows() {
  const fd = state.fdiff, p = state.payload;
  if (!state.diff || !fd || fd.equal || !p) return null;
  const st = focusStage(), r = st && fd.stages[st];
  if (!r || !Array.isArray(r.cu)) return null;
  if (cuMemo.fd === fd && cuMemo.st === st && cuMemo.p === p) return cuMemo.val;
  const peak = r.peak || 255;
  const rows = r.cu.map(([i, nY, maxY, sseY, nC, sseC]) => {
    const b = p.blocks[i], area = b ? areaOf(b, p.frame) : 0;
    return { i, nY, maxY, sseY, nC, sseC, psnr: sseY > 0 && area > 0 ? 10 * Math.log10(peak * peak * area / sseY) : null };
  });
  rows.sort((a, b) => (a.psnr === null) - (b.psnr === null) || (a.psnr ?? 0) - (b.psnr ?? 0) || b.nY - a.nY || b.sseC - a.sseC || a.i - b.i);
  const vals = rows.filter((x) => x.psnr !== null).map((x) => x.psnr);
  // scale: whole 5 dB steps around the frame's values, at least 10 dB wide; bright = worst
  let lo = vals.length ? Math.floor(Math.min(...vals) / 5) * 5 : 0, hi = vals.length ? Math.ceil(Math.max(...vals) / 5) * 5 : 10;
  if (hi - lo < 10) hi = lo + 10;
  for (const x of rows) x.colour = x.psnr === null ? CHROMA_ONLY : rgb(ramp((hi - x.psnr) / (hi - lo)));
  const byBlock = new Map(rows.map((x) => [x.i, x]));
  const byRow = new Map(rows.filter((x) => p.blocks[x.i]).map((x) => [p.blocks[x.i], x.colour]));
  const val = { stage: st, peak, rows, byBlock, byRow, lo, hi, uncovered: r.uncovered || null };
  cuMemo = { fd, st, p, val };
  return val;
}
export const psnrText = (row) => (row.psnr === null ? 'luma equal' : `${row.psnr.toFixed(2)} dB`);
export const samplesText = (row) => `${fmt(row.nY)}${row.nC ? ` + ${fmt(row.nC)} chroma` : ''}`;
// view.js fillStyler, fill 'psnr': the colour of each block that holds a differing sample, none elsewhere.
export function psnrFill() {
  const cu = cuRows();
  if (!cu) return () => null;
  return (b) => cu.byRow.get(b) || null;
}
export const psnrRampCss = () => `linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map((t) => rgb(ramp(t))).join(',')})`;
// The scale of the psnr fill as legend HTML (left = the higher PSNR, right = the worst).
export function psnrLegendHtml() {
  const cu = cuRows();
  if (!cu) return `<span class="note">${state.diff ? 'Block PSNR: this frame has no block that differs at this stage.' : 'Block PSNR needs a comparison (A vs B).'}</span>`;
  const chroma = cu.rows.some((x) => x.psnr === null);
  return `Block PSNR (luma, ${esc(STAGES[cu.stage].toLowerCase())}) ${cu.hi} dB<span class="ramp" style="background:${psnrRampCss()}"></span>${cu.lo} dB`
    + (chroma ? `<span><i style="background:${CHROMA_ONLY}"></i>only chroma differs</span>` : '')
    + ' <span class="note">blocks equal to B are unfilled</span>';
}

// The psnr fill is offered only while comparing: FILLS (state.js) holds its entry in diff mode only, so the chip
// row, the key z and a URL hash know it exactly then (controls.js draws the chips and reads the keys from FILLS).
const PSNR_FILL = FILLS.find((f) => f.id === 'psnr'), PSNR_AT = FILLS.indexOf(PSNR_FILL);
export function syncDiffFills() {
  if (!PSNR_FILL) return;
  const i = FILLS.indexOf(PSNR_FILL);
  if (state.diff && i < 0) FILLS.splice(PSNR_AT, 0, PSNR_FILL);
  else if (!state.diff && i >= 0) FILLS.splice(i, 1);
  if (!state.diff && state.fill === 'psnr') state.fill = 'none';
  renderChips();
}

// ------------------------------------------------------------ navigation
// [ ]: the previous / next frame of manifest.diff.differing_frames, in the stepping order of the Frame tab.
function stepDiffFrame(d) {
  if (!state.diff || !state.manifest) return;
  const set = new Set(state.diff.differing_frames || []);
  if (!set.size) { setStatus('B matches A in every frame: no differing frame.'); return; }
  const list = orderedFrames().map((x) => x.f), i = list.indexOf(state.f);
  for (let k = i + d; k >= 0 && k < list.length; k += d) {
    if (set.has(list[k])) { selectFrame(list[k]); return; }
  }
  setStatus(`No differing frame ${d > 0 ? 'after' : 'before'} frame ${state.f} (${fmt(set.size)} differing in all).`);
}
// Keeps block bi on screen (as a keyboard pick does).
function reveal(bi) {
  const b = state.payload.blocks[bi], { s, ox, oy } = state.view, r = canvas.getBoundingClientRect();
  const x0 = b[C.x] * s + ox, y0 = b[C.y] * s + oy, x1 = x0 + b[C.w] * s, y1 = y0 + b[C.h] * s;
  if (x0 < 0 || y0 < 0 || x1 > r.width || y1 > r.height) {
    state.view.ox = r.width / 2 - (b[C.x] + b[C.w] / 2) * s; state.view.oy = r.height / 2 - (b[C.y] + b[C.h] / 2) * s;
  }
}
// , .: the previous / next row of the Diff tab's table (worst first); from no row, the first or the last.
function stepCu(d) {
  if (!state.diff || !state.payload) return;
  const cu = cuRows();
  if (!cu || !cu.rows.length) { setStatus(`No block of frame ${state.f} holds a differing sample${state.fdiff && state.fdiff.equal ? ': B matches A here' : ''}.`); return; }
  const k = cu.rows.findIndex((x) => x.i === state.sel);
  const n = k < 0 ? (d > 0 ? 0 : cu.rows.length - 1) : k + d;
  if (n < 0 || n >= cu.rows.length) { setStatus(`That was the ${d > 0 ? 'last' : 'first'} of ${fmt(cu.rows.length)} mismatching blocks of frame ${state.f}.`); return; }
  const row = cu.rows[n], b = state.payload.blocks[row.i];
  state.sel = row.i; state.autoPick = false;
  state.pickGen++; state.pickAt = [b[C.x], b[C.y]];
  reveal(row.i);
  requestRender(); renderTab(); writeHash();
  setStatus(`Mismatching block ${n + 1} of ${fmt(cu.rows.length)} (worst first): ${b[C.bsize]} at (${b[C.x]}, ${b[C.y]}), ${samplesText(row)} samples differ, max |Δ| ${row.nY ? row.maxY : '–'}, PSNR ${psnrText(row)}.`);
}

// The n x n window around the first differing sample, as `vca diff --context --window n` takes it (in the plane of
// that sample, clamped inside the plane), in luma pixels.
export function firstWindow(n = WINDOW) {
  const fm = state.diff && state.diff.first_mismatch, fs = fm && fm.first_sample;
  if (!fs || !fs.luma_xy || !state.payload || state.payload.frame.f !== fm.f) return null;
  const seq = state.manifest.stream.sequence || {}, plane = fs.plane || 'Y';
  const ssx = plane === 'Y' ? 0 : (seq.subsampling_x ?? 1), ssy = plane === 'Y' ? 0 : (seq.subsampling_y ?? 1);
  const fr = state.payload.frame, pw = (fr.width + ssx) >> ssx, ph = (fr.height + ssy) >> ssy;
  const fx = fs.luma_xy[0] >> ssx, fy = fs.luma_xy[1] >> ssy;
  const x0 = Math.max(0, Math.min(fx - (n >> 1), pw - n)), y0 = Math.max(0, Math.min(fy - (n >> 1), ph - n));
  const w = Math.min(n, pw), h = Math.min(n, ph);
  return { plane, planeXY: [x0, y0], x: x0 << ssx, y: y0 << ssy, w: w << ssx, h: h << ssy, first: fs.luma_xy.slice() };
}
let lastWindow = null, gridNote = null;
// After "Go to first mismatch" has shown the frame: zoom so the window fills the picture area, and turn the sample
// grid on when the viewer has one (track Y, pixels.js setGrid).
export function zoomToFirstSample() {
  const win = firstWindow();
  if (!win) return;
  // the grid and the status line first: the legend line the grid adds changes the picture area's height
  // the sample grid of track Y (pixels.js), when this viewer has it: on, never toggled off
  if (typeof pixels.setGrid === 'function') { pixels.setGrid(true); gridNote = 'on'; }
  else if (typeof pixels.toggleGrid === 'function') { if (!state.grid) pixels.toggleGrid(); gridNote = state.grid ? 'on' : 'unavailable'; }
  else gridNote = 'unavailable';
  setStatus(`First differing sample (${win.first[0]}, ${win.first[1]})${win.plane !== 'Y' ? ` in ${win.plane}` : ''}: the ${WINDOW}×${WINDOW} sample window at (${win.planeXY[0]}, ${win.planeXY[1]}) of plane ${win.plane}. Press 0 to fit the frame.`);
  const r = canvas.getBoundingClientRect();
  const s = clamp(Math.min(r.width / win.w, r.height / win.h) * 0.92, 0.05, 64);
  state.view = { s, ox: r.width / 2 - (win.x + win.w / 2) * s, oy: r.height / 2 - (win.y + win.h / 2) * s, fitted: true };
  lastWindow = { ...win, s, canvas: [r.width, r.height] };
  requestRender();
}

// ------------------------------------------------------------ Quality dialog: data
let man = null;                 // the manifest the results below belong to
const results = new Map();      // key -> {source, head, pairs, done, error, ssim}
let stageSel = 'recon', pairSel = null, showSsim = false;
let reqSeq = 0, ctrl = null;
let rendered = { res: null, done: false };   // what the dialog shows (the probe's done: drawn, not only received)

// base URL of this analysis on `vca serve` (…/api/a/<aid>/), or null (static site, opened folder)
function serverBase() {
  if (!caps.server || !state.source || state.source.kind !== 'url') return null;
  try {
    const u = new URL(state.source.base, location.href);
    return u.origin === location.origin && /^\/api\/a\/[^/]+\/$/.test(u.pathname) ? u.pathname : null;
  } catch (e) { return null; }
}
// stages both sides can have (the manifest's stages of A); B may still lack one: then the server lists no pair
const stagesOfA = () => { const s = new Set(); state.manifest.frames.forEach((fr) => (fr.stages || []).forEach((x) => s.add(x))); return PIPELINE.filter((x) => s.has(x)); };
// Quality has numbers to show: a comparison, or an analysis with two pixel stages (the Stream tab's button)
export const qualityOffered = () => !!state.manifest && (!!state.diff || stagesOfA().length >= 2);
// One analysis with the output pictures only, in the GUI's words (R49 QA D7: not the CLI's --pixels all)
export function oneStageText() {
  const how = caps.jobs ? 'Open the stream again (Open stream) with Pixel stages "All stages"'
    : 'Analyze the stream in the VC Analyzer app with Pixel stages "All stages" (Open stream)';
  return `This analysis keeps the output pictures only, so it has no two pixel stages to compare. ${how} to keep the prediction and the picture before the loop filters too${caps.jobs ? ', or compare it with another analysis (Compare)' : ''}.`;
}
// results on the server: one per stage asked for (A vs B) or 'stages' (one analysis), with or without SSIM
const pairKey = () => (state.diff ? stageSel : 'stages');
const keyOf = (ssim) => (serverBase() ? `${pairKey()}|${ssim ? 1 : 0}` : 'bundle');
const ok = (r) => (r && !r.error ? r : null);
// The result on screen: SSIM asked for and present, else any result of the pair choice (an SSIM run has PSNR too).
function current() {
  if (!serverBase()) return ok(results.get('bundle'));
  const k = pairKey();
  return (showSsim && ok(results.get(`${k}|1`))) || ok(results.get(`${k}|0`)) || ok(results.get(`${k}|1`)) || null;
}
// The failure of what is asked for now, as {message, hint}, or null.
function errorOf() {
  const r = serverBase() ? ((showSsim && results.get(keyOf(true))) || results.get(keyOf(false))) : results.get('bundle');
  return r && r.error ? r.error : null;
}
function pairOf(res) {
  if (!res || !res.pairs.length) return null;
  return res.pairs.find((p) => p.id === pairSel) || res.pairs.find((p) => p.id === 'recon') || res.pairs[0];
}

// One line of quality.jsonl into the result (quality.assemble_lines).
function take(res, ln) {
  if (ln.head) { res.head = ln.head; res.ssim = !!ln.head.ssim; res.pairs = (ln.head.pairs || []).map((p) => ({ ...p, frames: [], missing: [], summary: null })); }
  else if (ln.frame) res.pairs[ln.pair].frames.push(ln.frame);
  else if (has(ln.missing)) res.pairs[ln.pair].missing.push({ f: ln.missing, reason: ln.reason });
  else if (ln.summary) { ln.summary.forEach((s, i) => { if (res.pairs[i]) res.pairs[i].summary = s; }); res.seconds = ln.seconds; res.done = true; }
}
let drawPending = false;
function drawSoon() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => { drawPending = false; if (dlg().open) render(); });
}

async function loadServer(ssim) {
  const key = keyOf(ssim);
  if (results.has(key) && !results.get(key).error) return;
  const my = ++reqSeq;
  if (ctrl) ctrl.abort();
  ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const res = { source: 'server', head: null, pairs: [], done: false, error: null, ssim };
  results.set(key, res);
  const q = new URLSearchParams({ ssim: ssim ? '1' : '0' });
  if (state.diff) q.set('stage', stageSel);
  const url = `${serverBase()}quality.jsonl?${q}`;
  render();
  try {
    const r = await fetch(url, withToken(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined }));
    if (!r.ok) {
      let er = {};
      try { er = (await r.json()).error || {}; } catch (e) { /* not JSON */ }
      res.error = { message: er.message || `The server answered HTTP ${r.status}.`, hint: er.hint || '' };
    } else {
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.trim()) take(res, JSON.parse(line));
        }
        if (my === reqSeq) drawSoon();
      }
      if (buf.trim()) take(res, JSON.parse(buf));
      if (!res.done) res.error = { message: 'The server stopped before the last frame.', hint: 'Open the dialog again to compute the rest.' };
    }
  } catch (e) {
    if (e && e.name === 'AbortError') { if (results.get(key) === res) results.delete(key); return; }
    res.error = asProblem(e);
  }
  if (my === reqSeq && dlg().open) render();
}
async function loadBundle() {
  if (results.has('bundle')) return;
  const res = { source: 'bundle', head: null, pairs: [], done: false, error: null, ssim: false };
  results.set('bundle', res);
  try {
    const q = await getJSON('quality.json');
    Object.assign(res, { head: q, ssim: !!q.ssim, pairs: q.pairs || [], done: true });
  } catch (e) {
    // vca export writes no quality.json for one analysis with one pixel stage: say that, not that the bundle is old
    res.error = !state.diff && stagesOfA().length < 2 ? { message: oneStageText(), hint: '' }
      : { message: 'This bundle has no quality.json: it was exported before the Quality view existed, or the analysis has no pixel stages.',
        hint: 'Export it again (python -m vca export), or compute the numbers with python -m vca quality <analysis> [<B>].' };
  }
  if (dlg().open) render();
}

// ------------------------------------------------------------ Quality dialog: open and draw
export function openQuality() {
  if (!state.manifest) return;
  if (man !== state.manifest) {
    man = state.manifest; results.clear(); if (ctrl) ctrl.abort();
    stageSel = 'recon'; pairSel = null; showSsim = false; reqSeq++;
  }
  if (!dlg().open) dlg().showModal();
  if (serverBase()) loadServer(false); else loadBundle();
  render();
}

function render() {
  if (!state.manifest) return;
  const srv = !!serverBase(), res = current(), pair = pairOf(res), err = errorOf();
  const kind = state.diff ? 'a_vs_b' : 'stages';
  // A and B named as the picker, the diff bar and the Stream tab name them (data.js aTitle, bTitle)
  $('#quSub').textContent = (kind === 'a_vs_b'
    ? `A = ${aTitle()}, B = ${bTitle(state.diff.b || {})}: PSNR of each frame of B against A`
    : `${aTitle()}: PSNR between its pixel stages (how much each decoder stage changes the picture)`)
    + `. Frame ${state.f} is on screen (marked); click a frame to go there.`;
  // pair choice: A vs B on the server = the stage asked for; otherwise the pairs of the result
  let chips;
  if (srv && state.diff) chips = stagesOfA().map((st) => ({ id: st, label: STAGES[st], on: st === stageSel }));
  else chips = (res ? res.pairs : []).map((p) => ({ id: p.id, label: pairLabel(p), on: pair && p.id === pair.id }));
  $('#quPairs').innerHTML = chips.length > 1 || (srv && state.diff) ? chips.map((c) => `<button class="chip" type="button" data-pair="${esc(c.id)}" aria-pressed="${c.on}" title="${esc(pairTitle(c))}">${esc(c.label)}</button>`).join('') : '';
  const ssimBtn = $('#quSsim');
  ssimBtn.hidden = !srv || !!(res && res.done && !res.pairs.length);   // nothing to compare: no SSIM either
  ssimBtn.setAttribute('aria-pressed', String(showSsim));
  const busy = res && !res.done && !res.error;
  const got = res && pair ? pair.frames.length + pair.missing.length : 0, total = state.manifest.frames.length;
  $('#quStatus').innerHTML = err ? `<span class="mis">${esc(err.message)}</span>${err.hint ? ` <span class="hint">${esc(err.hint)}</span>` : ''}`
    : busy ? `Computing${res.ssim ? ' PSNR and SSIM' : ' PSNR'}: ${fmt(got)} of ${fmt(total)} frames…`
      : res && res.done && !res.pairs.length ? (state.diff ? `B has no ${STAGES[stageSel].toLowerCase()} samples to compare.` : esc(oneStageText()))
        : res && res.done ? `${fmt(got)} frames${res.source === 'server' && res.head && res.head.cached ? ' (from the cache next to A)' : ''}.` : '';
  drawPsnr(pair);
  const ss = showSsim && res && res.ssim;
  $('#quSsimTitle').hidden = !ss; $('#quSsimBox').hidden = !ss;
  if (ss) drawSsim(pair); else { $('#quSsimSvg').innerHTML = ''; $('#quSsimSvg')._geom = null; }
  const planeEq = pair ? PSNR_KEYS.filter((k) => pair.frames.some((fr) => planeEqual(fr, k))) : [];
  $('#quLegend').innerHTML = PSNR_KEYS.map((k) => `<span><i class="qu-sw qu-l-${k}"></i>${k === 'yuv' ? 'YUV (all samples)' : k}</span>`).join('')
    + '<span><i class="qu-sw qu-ident-sw"></i>identical frame</span>'
    + (planeEq.length ? `<span class="qu-pident-key" title="A frame whose other planes differ, but whose ${planeEq.join(', ')} samples are all equal: that plane has no PSNR and is a ring in its colour on the identical line">${planeEq.map((k) => `<i class="qu-sw qu-pident-sw qu-l-${k}"></i>`).join('')}${planeEq.join(', ')} identical in a differing frame</span>` : '')
    + '<span><i class="qu-sw qu-miss-sw"></i>not compared</span>';
  const sm = pair && pair.summary;
  $('#quFacts').textContent = sm ? `${fmt(sm.frames)} frames compared, ${fmt(sm.identical)} identical${pair.missing.length ? `, ${fmt(pair.missing.length)} not compared` : ''}. Average = from the mean MSE over the frames (an identical frame counts as MSE 0); lowest = the worst frame.` : '';
  $('#quSummary').innerHTML = summaryHtml(pair, ss);
  $('#quNote').innerHTML = 'PSNR per plane = 10 log10(peak² / MSE), peak = 2^bit depth − 1; YUV from the plane-size weighted MSE (FFmpeg\'s psnr filter). '
    + 'A frame whose samples are all equal has no PSNR (it would be infinite): it sits on the identical line; a plane whose samples are all equal in a frame that differs elsewhere is a ring in that plane\'s colour on the same line. '
    + (srv ? 'SSIM (FFmpeg\'s ssim filter) is computed on request and kept in a cache next to A. '
      : 'This page reads the bundle\'s quality.json, which holds PSNR only: SSIM needs the local app (<code>vca serve</code>) or <code>python -m vca quality --ssim</code>. ')
    + `The same numbers: <code>python -m vca quality &lt;A&gt;${state.diff ? ' &lt;B&gt;' : ''} --json</code>.`;
  markFrame();
  rendered = { res, done: !!(res && res.done) };
}
const STAGE_SHORT = { pred: 'prediction', prefilter: 'before loop filters', recon: 'output' };
function pairLabel(p) {
  if (p.a && p.b && p.a.stage !== p.b.stage) return `${STAGES[p.a.stage]} vs ${STAGE_SHORT[p.b.stage] || p.b.stage}`;
  return STAGES[p.id] || p.id;
}
function pairTitle(c) {
  if (state.diff) return `PSNR of B against A at the ${(STAGES[c.id] || c.id).toLowerCase()} stage`;
  return `PSNR between two stages of this analysis: ${c.label.toLowerCase()} (how much that decoder stage changes the samples)`;
}

// About n round ticks from lo to at least hi.
function ticks(lo, hi, n) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) || 10 * p;
  const out = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step * 0.999; v += step) out.push(+v.toFixed(10));
  return out;
}
// as many decimals as the tick step needs (SSIM ticks near 1 differ in the fourth or fifth)
function tickText(v, step) {
  let d = 0;
  while (d < 8 && Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) > 1e-6) d++;
  return v.toFixed(d);
}

// A frame graph: one column per decoded frame (decode order), a line per key, identical frames and frames without
// numbers on the strip above the plot.  get(fr, k) = the value or null.
function drawGraph(svg, box, pair, keys, get, opt) {
  const frames = state.manifest.frames.map((x) => x.f).sort((a, b) => a - b), n = frames.length || 1;
  const byF = new Map(pair ? pair.frames.map((x) => [x.f, x]) : []), miss = new Map(pair ? pair.missing.map((x) => [x.f, x.reason]) : []);
  const wrap = Math.max(300, (box.clientWidth || 900) - 2);
  const L = 54, R = 14, T = 26, B = 34, H = opt.height, plotH = H - T - B;
  const slot = Math.max(6, (wrap - L - R) / n), plotW = slot * n, W = L + plotW + R;
  const xs = (i) => L + i * slot + slot / 2;
  const vals = [];
  for (const fr of byF.values()) if (!fr.identical) for (const k of keys) { const v = get(fr, k); if (has(v)) vals.push(v); }
  let lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
  [lo, hi] = opt.range(lo, hi);
  const yt = ticks(lo, hi, 4), y0 = yt[0], y1 = yt[yt.length - 1], step = yt.length > 1 ? yt[1] - yt[0] : 1;
  const y = (v) => T + plotH - ((v - y0) / ((y1 - y0) || 1)) * plotH;
  const strip = T - 13;
  let s = vals.length ? yt.map((v) => `<line class="gr-grid" x1="${L}" x2="${L + plotW}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="gr-yt" x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${tickText(v, step)}</text>`).join('') : '';
  s += `<text class="gr-axis" transform="translate(13 ${T + plotH / 2}) rotate(-90)" text-anchor="middle">${esc(opt.axis)}</text>`;
  s += `<text class="gr-yt" x="${L - 6}" y="${strip + 4}" text-anchor="end">identical</text>`;
  if (!vals.length) s += `<text class="gr-axis" x="${L + plotW / 2}" y="${T + plotH / 2}" text-anchor="middle">${esc(opt.empty)}</text>`;
  // columns (hit areas with the frame's numbers as tooltip), strip marks
  frames.forEach((f, i) => {
    const fr = byF.get(f);
    s += `<g class="gr-col" data-f="${f}"><title>${esc(opt.title(f, fr, miss.get(f)))}</title><rect class="gr-hit" x="${(L + i * slot).toFixed(1)}" y="${strip - 7}" width="${slot.toFixed(1)}" height="${(plotH + T - strip + 7).toFixed(1)}"/>`;
    if (fr && fr.identical) s += `<circle class="qu-ident" data-f="${f}" cx="${xs(i).toFixed(1)}" cy="${strip}" r="3.4"/>`;
    else if (miss.has(f)) s += `<path class="qu-miss" data-f="${f}" d="M${(xs(i) - 3).toFixed(1)},${strip - 3}l6,6m0,-6l-6,6"/>`;
    else if (fr && opt.equal) {
      // planes with all samples equal in a frame that differs elsewhere: rings in the plane's colour, side by side
      const eqk = keys.filter((k) => opt.equal(fr, k)), d = Math.min(5, slot / Math.max(1, eqk.length + 1));
      eqk.forEach((k, j) => { s += `<circle class="qu-pident qu-l-${k}" data-f="${f}" data-k="${k}" cx="${(xs(i) + (j - (eqk.length - 1) / 2) * d).toFixed(1)}" cy="${strip}" r="3"/>`; });
    }
    s += '</g>';
  });
  // lines (pen up across frames without a value) and points
  for (const k of keys) {
    let d = '', pen = false, pts = '';
    frames.forEach((f, i) => {
      const fr = byF.get(f), v = fr && !fr.identical ? get(fr, k) : null;
      if (!has(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true;
      pts += `<circle class="qu-pt qu-l-${k}" data-f="${f}" data-k="${k}" data-v="${v}" cx="${xs(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${k === keys[0] ? 3.2 : 2.6}"/>`;
    });
    s += `<path class="qu-line qu-l-${k}" d="${d}"/>` + pts;
  }
  const every = Math.max(1, Math.ceil(30 / slot));
  s += `<line class="gr-base" x1="${L}" x2="${L + plotW}" y1="${T + plotH}" y2="${T + plotH}"/>`
    + frames.map((f, i) => (i % every ? '' : `<text class="gr-xt" x="${xs(i).toFixed(1)}" y="${H - B + 15}" text-anchor="middle">${f}</text>`)).join('')
    + `<text class="gr-axis" x="${L + plotW / 2}" y="${H - 3}" text-anchor="middle">Decode index</text><g class="gr-marks"></g>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.innerHTML = s;
  svg._geom = { slot, L, T: strip - 7, plotH: plotH + T - strip + 7, frames };
}
const dB = (v) => (has(v) ? `${v.toFixed(2)} dB` : 'equal');
function psnrTitle(f, fr, reason) {
  if (!fr) return `Frame ${f}: ${reason ? `not compared (${reason})` : 'no numbers yet'}`;
  if (fr.identical) return `Frame ${f}: identical (every sample equal, no PSNR)`;
  const p = fr.psnr || {};
  return `Frame ${f}: ${PSNR_KEYS.filter((k) => k in p).map((k) => `${k} ${dB(p[k])}`).join(', ')}; ${fmt((fr.differing || {}).Y || 0)} luma samples differ, max |Δ| ${(fr.max_abs || {}).Y ?? 0}`;
}
// A plane of a differing frame whose samples are all equal: quality.json gives it PSNR null (R49 QA D6: the line
// left it out without a word).
export const planeEqual = (fr, k) => !!(fr && !fr.identical && fr.psnr && k in fr.psnr && fr.psnr[k] === null);
function drawPsnr(pair) {
  drawGraph($('#quPsnr'), $('#quPsnrBox'), pair, PSNR_KEYS, (fr, k) => (fr.psnr ? fr.psnr[k] : null), {
    height: 250, axis: 'PSNR (dB)', title: psnrTitle, equal: planeEqual,
    empty: pair && pair.frames.length ? 'Every compared frame is identical: no PSNR' : !pair && !qualityOffered() ? 'Nothing to compare' : 'No numbers yet',
    range: (lo, hi) => [Math.floor(lo - 0.5), Math.ceil(hi + 0.5)],
  });
}
function drawSsim(pair) {
  drawGraph($('#quSsimSvg'), $('#quSsimBox'), pair, SSIM_KEYS, (fr, k) => (fr.ssim ? fr.ssim[k] : null), {
    height: 190, axis: 'SSIM', empty: 'Every compared frame is identical: SSIM 1',
    title: (f, fr, reason) => (!fr ? `Frame ${f}: ${reason ? `not compared (${reason})` : 'no numbers yet'}` : fr.identical ? `Frame ${f}: identical (SSIM 1)`
      : `Frame ${f}: SSIM ${SSIM_KEYS.filter((k) => fr.ssim && k in fr.ssim).map((k) => `${k} ${has(fr.ssim[k]) ? fr.ssim[k].toFixed(5) : '–'}`).join(', ')}`),
    range: (lo, hi) => [Math.max(0, lo - (hi - lo || 0.001) * 0.1), Math.min(1, Math.max(hi, lo + 0.0005))],
  });
}
function summaryHtml(pair, ss) {
  const sm = pair && pair.summary;
  if (!sm) return '';
  const ps = sm.psnr || {}, pm = sm.psnr_min || {}, si = ss ? (sm.ssim || {}) : null;
  const head = `<thead><tr><th>Plane</th><th class="num">Average PSNR</th><th class="num">Lowest PSNR</th>${si ? '<th class="num">Mean SSIM</th>' : ''}</tr></thead>`;
  const rows = PSNR_KEYS.map((k) => `<tr><td>${k === 'yuv' ? 'YUV' : k}</td><td class="num">${has(ps[k]) ? ps[k].toFixed(3) : '–'}</td><td class="num">${has(pm[k]) ? pm[k].toFixed(3) : '–'}</td>${si ? `<td class="num">${has(si[k === 'yuv' ? 'all' : k]) ? si[k === 'yuv' ? 'all' : k].toFixed(6) : '–'}</td>` : ''}</tr>`).join('');
  return `${head}<tbody>${rows}</tbody>`;
}
// Marks the frame on screen in both graphs.
function markFrame() {
  for (const id of ['#quPsnr', '#quSsimSvg']) {
    const svg = $(id), g = svg._geom;
    if (!g) continue;
    const i = g.frames.indexOf(state.f);
    const w = Math.max(4, Math.min(g.slot - 1, 14));
    svg.querySelector('.gr-marks').innerHTML = i < 0 ? '' : `<rect class="gr-mark" data-f="${state.f}" x="${(g.L + i * g.slot + g.slot / 2 - w / 2).toFixed(1)}" y="${g.T}" width="${w.toFixed(1)}" height="${g.plotH}" rx="3"/>`;
  }
}

// ------------------------------------------------------------ probe (tests)
// Read-only view for window.__vca.snap() (tests).
export function qualitySnap() {
  const d = dlg(), cu = state.diff && state.payload ? cuRows() : null;
  const out = {
    cu: cu ? { stage: cu.stage, lo: cu.lo, hi: cu.hi, rows: cu.rows.map((x) => [x.i, x.nY, x.maxY, x.nC, x.psnr === null ? null : +x.psnr.toFixed(6), x.colour]) } : null,
    window: lastWindow, grid: gridNote,
  };
  if (!d || !d.open || !state.manifest) return { open: false, ...out };
  const res = current(), pair = pairOf(res);
  const pts = (keys, get) => Object.fromEntries(keys.map((k) => [k, pair ? pair.frames.filter((fr) => !fr.identical && has(get(fr, k))).map((fr) => [fr.f, get(fr, k)]) : []]));
  const drawn = (id) => [...d.querySelectorAll(`${id} circle.qu-pt`)].map((c) => [+c.dataset.f, c.dataset.k, +c.dataset.v]);
  return {
    open: true, ...out, source: serverBase() ? 'server' : 'bundle', kind: state.diff ? 'a_vs_b' : 'stages',
    pair: pair ? pair.id : null, pairs: [...d.querySelectorAll('#quPairs [data-pair]')].map((b) => b.dataset.pair),
    done: rendered.res === res && rendered.done, error: (errorOf() || {}).message || null, ssim: !!(showSsim && res && res.ssim),
    psnr: pts(PSNR_KEYS, (fr, k) => (fr.psnr ? fr.psnr[k] : null)),
    ssimPts: res && res.ssim ? pts(SSIM_KEYS, (fr, k) => (fr.ssim ? fr.ssim[k] : null)) : null,
    identical: pair ? pair.frames.filter((fr) => fr.identical).map((fr) => fr.f) : [],
    planeIdentical: pair ? pair.frames.flatMap((fr) => PSNR_KEYS.filter((k) => planeEqual(fr, k)).map((k) => [fr.f, k])) : [],
    missing: pair ? pair.missing.map((m) => m.f) : [],
    drawn: { psnr: drawn('#quPsnr'), ssim: drawn('#quSsimSvg'), identical: d.querySelectorAll('#quPsnr .qu-ident').length,
      planeIdentical: [...d.querySelectorAll('#quPsnr circle.qu-pident')].map((c) => [+c.dataset.f, c.dataset.k]) },
    marked: [...d.querySelectorAll('.gr-mark')].map((m) => +m.dataset.f),
    status: $('#quStatus').textContent,
  };
}

// ------------------------------------------------------------ wiring
// The psnr fill's words for the block under the pointer: {tip, status}, or null (another fill, no comparison).
function hoverLine() {
  if (state.fill !== 'psnr' || !state.diff || state.hover < 0) return null;
  const cu = cuRows(), row = cu && cu.byBlock.get(state.hover);
  if (!cu) return null;
  if (!row) return { tip: `matches B at ${STAGES[cu.stage].toLowerCase()}`, status: '   PSNR equal' };
  return { tip: `PSNR ${psnrText(row)}, ${samplesText(row)} samples differ, max |Δ| ${row.nY ? row.maxY : '–'}`, status: `   PSNR ${psnrText(row)}` };
}
const typing = (e) => e.target.closest && e.target.closest('input, select, textarea');
export function initQuality() {
  syncDiffFills();   // no comparison yet: no psnr chip
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    const pb = t.closest('#quPairs [data-pair]');
    if (pb) {
      if (serverBase() && state.diff) { stageSel = pb.dataset.pair; loadServer(showSsim); } else pairSel = pb.dataset.pair;
      render(); return;
    }
    if (t.closest('#quSsim')) { showSsim = !showSsim; if (showSsim) loadServer(true); render(); return; }
    const col = t.closest('.gr-col[data-f]');
    if (col) { selectFrame(+col.dataset.f); markFrame(); }
  });
  // ← → step frames while the dialog is open (as in Graphs)
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(e)) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stepFrame(e.key === 'ArrowLeft' ? -1 : 1);
    markFrame();
  });
  // Q, [ ], , . on the page (controls.js leaves these keys alone); no key while a dialog is open
  document.addEventListener('keydown', (e) => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
    const k = e.key;
    if (k === 'Q' && state.manifest) { e.preventDefault(); openQuality(); }
    else if (k === '[' || k === ']') { e.preventDefault(); stepDiffFrame(k === ']' ? 1 : -1); }
    else if (k === ',' || k === '.') { e.preventDefault(); stepCu(k === '.' ? 1 : -1); }
  });
  // the psnr fill's hover: the block's numbers as the Diff tab's row shows them, added each time controls.js writes
  // the tooltip and the status line of a block (also when it writes them again once the sample values are there)
  new MutationObserver(() => {
    const h = hoverLine(), tip = $('#tooltip');
    if (!h || tip.hidden || tip.querySelector('.qu-tip')) return;
    tip.insertAdjacentHTML('beforeend', `<span class="qu-tip"><br>${esc(h.tip)}</span>`);
    const wrap = $('#canvasWrap').getBoundingClientRect(), top = parseFloat(tip.style.top) || 0;
    if (top + tip.offsetHeight > wrap.height - 6) tip.style.top = Math.max(0, wrap.height - tip.offsetHeight - 6) + 'px';
  }).observe($('#tooltip'), { childList: true });
  new MutationObserver(() => {
    const h = hoverLine(), sb = $('#statusbar');
    if (h && /^x \d/.test(sb.textContent) && !sb.textContent.endsWith(h.status)) sb.textContent += h.status;
  }).observe($('#statusbar'), { childList: true, characterData: true, subtree: true });
  // Quality buttons: the diff bar and the Diff tab
  const open = (e) => { if (e.target.closest('[data-act="quality"]')) openQuality(); };
  $('#diffBar').addEventListener('click', open);
  $('#tabBody').addEventListener('click', open);
  // the frame changed elsewhere (arrow keys, the timeline): move the mark
  new MutationObserver(() => { if (d.open && state.manifest === man) markFrame(); }).observe($('#framePos'), { childList: true, subtree: true, characterData: true });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (d.open) render(); }, 150); });
}
