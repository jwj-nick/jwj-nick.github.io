// F-g W7 (T-0053, FEATURES F53; SERVER_API.md section 21 items 17-20): the motion vector candidate lists of the
// selected block (internals/<f>/cands.json: AV2 / AV1 the lists av2_find_mv_refs / av1_find_mv_refs built, from the
// dumper; VP9 derived from the IR by the libvpx rule) and the raw intra neighbour samples of an intra block
// (internals/<f>/neighbours.json, vca serve only: read from prefilter.yuv per block and plane).  The Block tab's
// Candidates and Intra neighbours sections, with Compute when the server lacks the AV2 / AV1 lists, and the Cands
// line chip (Shift+V) that draws the selected block's candidate MVs from its centre, the entry its mode copies
// thick.  vca serve answers one block a request (cands.json?block=); a bundle or an opened folder holds every
// block of a frame in one file (manifest.internals names cands, internals.json the frames).  internals.js calls the
// section, drawing, legend and chip functions here.
import { C, LINES, state } from './state.js?v=25b3a2d3d6';
import { esc, fmt, refColor, setStatus } from './util.js?v=25b3a2d3d6';
import { caps, getJSON, withToken } from './data.js?v=25b3a2d3d6';
import { api } from './api.js?v=25b3a2d3d6';
import { trackJob } from './jobs.js?v=25b3a2d3d6';
import { requestRender } from './view.js?v=25b3a2d3d6';
import { renderLegend } from './legend.js?v=25b3a2d3d6';
import { renderTab } from './inspector.js?v=25b3a2d3d6';
import { renderChips } from './controls.js?v=25b3a2d3d6';

// ------------------------------------------------------------ the chip (added to the shared list in place, as
// internals.js does; controls.js shows it while candsShown())
LINES.splice(Math.max(0, LINES.findIndex((l) => l.id === 'mismatch')), 0, { id: 'cands', label: 'Cands', key: 'V', cands: true });
export const CANDS_TITLE = 'Arrows from the selected block\'s centre for each motion vector candidate of its lists (AV2, AV1 from the decoder, VP9 derived from the IR); the entry its mode copies is the thick one (Shift+V)';

const CODECS = ['av2', 'av1', 'vp9'];
const codec = () => ((state.manifest && state.manifest.stream && state.manifest.stream.codec) || '').toLowerCase();
export const candsCodec = () => CODECS.includes(codec());
const derived = () => codec() === 'vp9';
const EXPORT_CMD = 'python -m vca export <analysis> -o <folder> --internals-frames A-B --internals-kinds cands';
const SERVE_CMD = 'python -m vca serve <analysis>';
const TPL = { cands: 'internals/<f>/cands.json', neighbours: 'internals/<f>/neighbours.json' };
const CACHE = 240;

// ------------------------------------------------------------ reading
class Missing extends Error { constructor(message, info) { super(message); this.info = info || {}; } }
let man = null, index = null;   // the manifest the cache belongs to; internals.json of a bundle (or a promise)
const cache = new Map();        // `c:${f}:${bi}`, `n:${f}:${bi}:${plane}` -> entry; `F:${f}` -> a bundle's frame file
let more = false;               // a job made candidates (the chip shows although the manifest had none)
let drawn = { f: null, blk: -1, arrows: [], entries: 0 };
let chipKey = '';
const planeOf = new Map();      // `${f}:${bi}` -> the plane the Intra neighbours section shows
const info = () => (state.manifest && state.manifest.internals) || null;
const served = () => !!(state.source && state.source.kind === 'url' && caps.server && /\/api\/a\/[^/]+\/$/.test(state.source.base));
const pathOf = (kind, f) => String((info() && info()[kind]) || TPL[kind]).replace('<f>', f);
function bind() {
  if (man === state.manifest) return;
  man = state.manifest; index = null; cache.clear(); planeOf.clear(); more = false;
  drawn = { f: null, blk: -1, arrows: [], entries: 0 };
  if (state.manifest && !candsShown()) state.lines.delete('cands');
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
// The chip and the sections: the codecs that have candidates, on vca serve or a bundle that holds some.
export function candsShown() {
  if (!candsCodec()) return false;
  const i = info();
  return served() || more || !!(i && (i.kinds || []).includes('cands'));
}
// A bundle: does frame f have them?  (manifest.internals, then the frame's entry of internals.json)
async function bundleHas(f) {
  const i = info();
  if (!i || !(i.kinds || []).includes('cands') || !(i.frames || []).includes(f)) return false;
  if (!index) index = fetchJSON(i.file || 'internals.json').catch(() => ({ frames: {} }));
  const e = ((await index).frames || {})[String(f)];
  return !!(e && e.cands);
}
function trim() {
  if (cache.size <= CACHE) return;
  for (const k of cache.keys()) { if (cache.size <= CACHE) break; const e = cache.get(k); if (e.status !== 'computing' && e.status !== 'loading') cache.delete(k); }
}
// Entry of block bi of frame f: {status: loading | ready | nolist | none | missing | error | computing, data, miss,
// err, job}.  nolist = the bundle's frame has no list for the block; none = the bundle has none for the frame.
export function candsEntry(f, bi) { bind(); return cache.get(`c:${f}:${bi}`) || null; }
export function loadCands(f, bi) {
  bind();
  const key = `c:${f}:${bi}`;
  let e = cache.get(key);
  if (e && e.status !== 'error') return e.p || Promise.resolve(e);
  const m = man;
  e = { f, bi, status: 'loading', data: null, miss: null, err: '', job: e ? e.job : null };
  cache.set(key, e);
  trim();
  e.p = (async () => {
    try {
      if (served()) e.data = await fetchJSON(`${pathOf('cands', f)}?block=${bi}`);
      else {
        if (!(await bundleHas(f))) { e.status = 'none'; return e; }
        const fk = `F:${f}`;
        if (!cache.has(fk)) cache.set(fk, { status: 'file', p: fetchJSON(pathOf('cands', f)) });
        const doc = await cache.get(fk).p;
        e.data = (doc.blocks || {})[String(bi)] || null;
        if (!e.data) { e.status = 'nolist'; return e; }
      }
      e.status = 'ready';
    } catch (x) {
      if (x instanceof Missing) { e.status = 'missing'; e.miss = { ...x.info, message: x.message }; } else { e.status = 'error'; e.err = String((x && x.message) || x); }
    }
    return e;
  })().then((r) => { e.p = null; if (m === man) changed(); return r; });
  return e.p;
}
export function neighboursEntry(f, bi, plane) { bind(); return cache.get(`n:${f}:${bi}:${plane}`) || null; }
function loadNeighbours(f, bi, plane) {
  bind();
  const key = `n:${f}:${bi}:${plane}`;
  let e = cache.get(key);
  if (e && e.status !== 'error') return e.p || Promise.resolve(e);
  const m = man;
  e = { f, bi, plane, status: 'loading', data: null, err: '' };
  cache.set(key, e);
  trim();
  e.p = (async () => {
    try { e.data = await fetchJSON(`${pathOf('neighbours', f)}?block=${bi}&plane=${plane}`); e.status = 'ready'; } catch (x) { e.status = 'error'; e.err = String((x && x.message) || x); }
    return e;
  })().then((r) => { e.p = null; if (m === man && state.tab === 'block') renderTab(); return r; });
  return e.p;
}
// The data of the frame on screen changed: the picture, legend, chips and Block tab.
function changed() {
  requestRender(); renderLegend(); syncCandsChip(true);
  if (state.tab === 'block') renderTab();
}

// ------------------------------------------------------------ words
const isInter = (b) => b && (b[C.pred] === 'inter' || b[C.pred] === 'intrabc');
const xy = (mv) => (mv ? `(${mv[1]}, ${mv[0]})` : '–');      // payload [row, col] as (x, y), as the Block tab shows MVs
function whyNot(e) {
  if (!e || e.status === 'loading' || e.status === 'ready') return '';
  if (e.status === 'computing') return `The motion vector candidates of frame ${e.f} are being computed.`;
  if (e.status === 'error') return `The candidates could not be read (${e.err}).`;
  if (e.status === 'nolist') return 'The decoder built no candidate list for this block (a segment with the skip or global motion feature skips the search).';
  if (e.status === 'none') {
    const i = info();
    return i && (i.kinds || []).includes('cands')
      ? `This bundle has motion vector candidates for some frames only, not for frame ${e.f}. Export it again with ${EXPORT_CMD} for the frames you need.`
      : `This bundle has no motion vector candidates. Bundles get them with ${EXPORT_CMD}${derived() ? ' (VP9: derived from the analysis, no decoder run)' : ''}.`;
  }
  return (e.miss && e.miss.message) || `Frame ${e.f} has no motion vector candidates.`;
}
const prose = (s) => String(s).split(EXPORT_CMD).map((t) => esc(t).split(SERVE_CMD).join(`<code>${esc(SERVE_CMD)}</code>`)).join(`<code>${esc(EXPORT_CMD)}</code>`);
const canCompute = (e) => !!(e && e.status === 'missing' && e.miss && e.miss.job_hint && caps.jobs);

// Compute (vca serve with jobs): the 404's job_hint (kinds cands), shown in the job tray; the frame's entries are
// read again when it ends.
async function compute(f, bi) {
  const e = candsEntry(f, bi);
  if (!canCompute(e)) return;
  const hint = e.miss.job_hint, m = man;
  e.status = 'computing'; e.job = { state: 'queued', fraction: null };
  changed();
  let job;
  try { job = await api('api/jobs', { method: 'POST', body: hint }); } catch (x) {
    e.status = 'missing'; e.job = { state: 'failed', error: { message: x.message, hint: x.hint } };
    changed();
    return;
  }
  trackJob(job, { fromPage: true, codec: codec() });
  for (;;) {
    e.job = job; changed();
    await new Promise((r) => setTimeout(r, 400));
    if (m !== man) return;
    try { job = await api(`api/jobs/${encodeURIComponent(job.id)}`); } catch (x) { continue; }
    if (job.state !== 'queued' && job.state !== 'running') break;
  }
  if (job.state !== 'succeeded') { e.status = 'missing'; e.job = job; changed(); return; }
  more = true;
  for (const k of [...cache.keys()]) if (k.startsWith(`c:${f}:`) || k === `F:${f}`) cache.delete(k);
  await loadCands(f, bi);
  const x = candsEntry(f, bi);
  if (x) { x.job = job; changed(); }
}
function computeHtml(e) {
  const j = e && e.job;
  if (e && e.status === 'computing') {
    const pct = j && j.fraction !== null && j.fraction !== undefined ? Math.round(j.fraction * 100) : null;
    return `<p class="ix-msg" role="status">Computing the motion vector candidates of frame ${e.f}${j && j.state === 'queued' ? ' (waiting for the decoder)' : ''}${pct !== null ? `: ${pct} %` : '…'}</p>`
      + `<div class="meter ix-meter${pct === null ? ' indeterminate' : ''}" role="progressbar" aria-label="Computing the motion vector candidates"${pct !== null ? ` aria-valuenow="${pct}"` : ''}><i style="width:${pct === null ? '' : Math.max(2, pct) + '%'}"></i></div>`;
  }
  const failed = j && j.state && !['succeeded', 'queued', 'running'].includes(j.state)
    ? `<p class="problem ix-fail">${esc((j.error && j.error.message) || `The job ${j.state === 'cancelled' ? 'was cancelled' : 'failed'}.`)}${j.error && j.error.hint ? ` <span class="hint">${esc(j.error.hint)}</span>` : ''}</p>` : '';
  return failed + (canCompute(e) ? `<div class="actions"><button class="btn small" type="button" data-act="mc-compute" title="Run the dumper again on frame ${e.f} of this analysis to record the motion vector candidate lists the decoder built (a job in the job list; the analysis itself is not changed)">Compute</button></div>` : '');
}

// ------------------------------------------------------------ Block tab sections
const kvSec = (title, body, id) => `<dt class="kv-sec">${esc(title)}</dt><dd class="kv-sec" id="${id}">${body}</dd>`;
const KIND_WORDS = { block: 'the block\'s list', skip_mode: 'the skip mode list', second_drl: 'the second list (second reference)' };
function listsHtml(d) {
  if (!d.lists.length) return '<p class="note">No candidate list for this block.</p>';
  return d.lists.map((l, li) => {
    const refs = l.ref.length ? l.ref.map((r) => `<span style="color:${refColor(r)}">${esc(r)}</span>`).join(' + ') : '–';
    const comp = l.cand.some((c) => c.comp_mv !== null && c.comp_mv !== undefined);
    const weight = l.cand.some((c) => c.weight !== null && c.weight !== undefined);
    const gm = l.gm && l.gm.length ? `; global MV ${l.gm.map(xy).join(' + ')}` : '';
    const head = `<p class="note mc-list" data-list="${li}">List ${li + 1}: ${refs}, ${esc(KIND_WORDS[l.kind] || l.kind)}, ${fmt(l.count)} candidate${l.count === 1 ? '' : 's'} found${gm}.</p>`;
    if (!l.cand.length) return head;
    return head + `<div class="ix-scroll mc-scroll"><table class="grid ix-table mc-table"><thead><tr><th class="num" title="Position in the list (the index the mode's ref_mv_idx selects)">#</th><th class="num" title="Candidate motion vector, x, y in 1/8 pel">MV</th>${comp ? '<th class="num" title="The second reference\'s motion vector of the pair">Second MV</th>' : ''}${weight ? '<th class="num" title="The decoder\'s weight: higher sorts first">Weight</th>' : ''}<th>Source</th><th title="The entry the block\'s mode copies">Copied</th></tr></thead><tbody>`
      + l.cand.map((c, k) => `<tr data-cand="${li}:${k}" class="${k === l.chosen ? 'chosen' : ''}"><td class="num">${k}</td><td class="num mc-mv">${xy(c.mv)}</td>${comp ? `<td class="num mc-comp">${xy(c.comp_mv)}</td>` : ''}${weight ? `<td class="num">${fmt(c.weight)}</td>` : ''}<td class="mc-src">${esc(c.src || '–')}</td><td class="mc-copied">${k === l.chosen ? 'yes' : ''}</td></tr>`).join('')
      + '</tbody></table></div>';
  }).join('');
}
const CHECK_WORDS = { match: 'equals the block\'s motion vector', mismatch: 'does not equal the block\'s motion vector' };
function checkHtml(d) {
  const mode = esc((d.block && d.block.mode) || '');
  const mv = (d.mv || []).filter(Boolean);
  if (d.check === 'match' || d.check === 'mismatch') {
    return `<p class="note mc-check ${d.check === 'match' ? 'ok' : 'bad'}" data-check="${d.check}">${mode} copies ${mv.map(xy).join(' + ') || 'zero'}, which ${CHECK_WORDS[d.check]}.</p>`;
  }
  return `<p class="note mc-check" data-check="other">${mode}: not a copy of a list entry to check (${esc(d.check)}).</p>`;
}
function candsHtml(f, bi) {
  let e = candsEntry(f, bi);
  if (!e) { loadCands(f, bi); e = candsEntry(f, bi); }
  if (e.status === 'loading') return `<p class="note">Reading the motion vector candidates of this block…</p>`;
  if (e.status !== 'ready') return `<p class="note mc-why">${prose(whyNot(e))}</p>${computeHtml(e)}`;
  const d = e.data;
  const done = e.job && e.job.state === 'succeeded' ? `<p class="note ix-done" role="status">Computed for frame ${f}.</p>` : '';
  const src = /^derived/.test(d.source) ? `Lists ${d.source}` : `From the ${d.source}`;
  return done + `<p class="note">${esc(src)}. MVs as x, y in 1/8 pel. Cands (Shift+V) draws them on the picture.</p>` + listsHtml(d) + checkHtml(d);
}
const PLANE = ['Y', 'U', 'V'];
function neighboursHtml(f, bi, block) {
  if (!served()) {
    return `<p class="note nb-why">The intra neighbours are read from the analysis' samples before the loop filters, block by block, so a bundle does not hold them. Open the analysis with <code>${esc(SERVE_CMD)}</code> to see them here, or run <code>python -m vca neighbours &lt;analysis&gt; -f F --block ID</code>.</p>`;
  }
  const chroma = block[C.tree] === 'CHROMA';
  const key = `${f}:${bi}`;
  const plane = planeOf.has(key) ? planeOf.get(key) : (chroma ? 1 : 0);
  let e = neighboursEntry(f, bi, plane);
  if (!e) { loadNeighbours(f, bi, plane); e = neighboursEntry(f, bi, plane); }
  const tabs = `<div class="nb-planes" role="group" aria-label="Plane">${PLANE.map((p, i) => `<button class="chip small" type="button" data-act="nb-plane" data-plane="${i}" aria-pressed="${i === plane}" title="The ${p} plane's neighbours of this block">${p}</button>`).join('')}</div>`;
  if (e.status === 'loading') return tabs + '<p class="note">Reading the neighbour samples…</p>';
  if (e.status !== 'ready') return tabs + `<p class="note nb-why">${esc(`The neighbour samples could not be read (${e.err}).`)}</p>`;
  const d = e.data;
  const cell = (v, a, i, near, part) => `<td class="nb-cell ${a === true ? 'nb-yes' : a === false ? 'nb-no' : 'nb-unk'}${i === near ? ' nb-far' : ''}" data-nb="${part}:${i}" title="${part === 'above' ? `x ${d.above.x0 + i}, y ${d.above.y}` : part === 'left' ? `x ${d.left.x}, y ${d.left.y0 + i}` : 'top-left'}: ${a === true ? 'available' : a === false ? 'not available' : 'not known'}">${v === null || v === undefined ? '–' : v}</td>`;
  const strip = (name, part, o, near) => `<tr><th scope="row">${name}</th>${o.v.map((v, i) => cell(v, o.avail[i], i, near, part)).join('')}</tr>`;
  return tabs
    + `<p class="note">${esc(PLANE[d.plane] || d.plane)} plane, ${d.w}×${d.h} at (${d.x}, ${d.y}); ${esc(d.label)}. From ${esc(d.source || 'no samples')}${d.note ? `: ${esc(d.note)}` : ''}. The first ${d.w} above and ${d.h} left are next to the block, then the above-right and below-left parts (after the bar). Dim = not available (outside the frame or the tile, or decoded later), hatched = not known.</p>`
    // a narrow screen shows part of a long row: say so (the hint is CSS-shown below 860 px)
    + (Math.max(d.above.v.length, d.left.v.length) > 12 ? `<p class="fine nb-hint">Scroll the rows sideways for the rest of the ${Math.max(d.above.v.length, d.left.v.length)} samples (the row names stay).</p>` : '')
    + `<div class="ix-scroll nb-scroll"><table class="nb-grid"><tbody>${strip('Top-left', 'top_left', { v: [d.top_left.v], avail: [d.top_left.avail] }, -1)}${strip('Above', 'above', d.above, d.w)}${strip('Left', 'left', d.left, d.h)}</tbody></table></div>`;
}
// The sections of block bi (internals.js appends them to the Block tab's internals sections).
export function candsSectionsHtml(bi) {
  bind();
  if (!candsCodec() || !state.payload || bi < 0) { queueSync(); return ''; }
  const block = state.payload.blocks[bi];
  if (!block) return '';
  const f = state.f;
  let h = '';
  if (isInter(block)) { if (candsShown()) h = kvSec('Candidates', candsHtml(f, bi), 'mcSec'); else h = kvSec('Candidates', `<p class="note mc-why">${prose(whyNot({ f, status: 'none' }))}</p>`, 'mcSec'); }
  else if (block[C.pred] === 'intra') h = kvSec('Intra neighbours', neighboursHtml(f, bi, block), 'nbSec');
  queueSync();
  return h;
}
let syncQueued = false;
function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(() => { syncQueued = false; syncCandsChip(false); if (state.lines.has('cands')) renderLegend(); });
}
export function candsClick(t) {
  if (t.closest('[data-act="mc-compute"]')) { compute(state.f, state.sel); return true; }
  const p = t.closest('[data-act="nb-plane"]');
  if (p) { planeOf.set(`${state.f}:${state.sel}`, +p.dataset.plane); renderTab(); return true; }
  return false;
}

// ------------------------------------------------------------ canvas: Cands arrows of the selected block
export function drawCands(ctx, vis, px, record) {
  bind();
  const out = { f: state.f, blk: state.sel, arrows: [], entries: 0 };
  const done = () => { if (record) drawn = out; };
  if (!state.lines.has('cands') || !state.payload || state.sel < 0) return done();
  const b = state.payload.blocks[state.sel];
  if (!isInter(b)) return done();
  const e = candsEntry(state.f, state.sel);
  if (!e) { loadCands(state.f, state.sel); return done(); }
  if (e.status !== 'ready') return done();
  const cx = b[C.x] + b[C.w] / 2, cy = b[C.y] + b[C.h] / 2;
  const list = [];
  e.data.lists.forEach((l, li) => l.cand.forEach((c, k) => {
    out.entries++;
    const chosen = k === l.chosen;
    list.push({ li, k, second: false, mv: c.mv, ref: l.ref[0], chosen });
    if (c.comp_mv !== null && c.comp_mv !== undefined) list.push({ li, k, second: true, mv: c.comp_mv, ref: l.ref[1] || l.ref[0], chosen });
  }));
  // the chosen ones last, on top
  list.sort((a, c) => a.chosen - c.chosen);
  ctx.save();
  ctx.lineCap = 'round';
  for (const a of list) {
    const dx = a.mv[1] / 8, dy = a.mv[0] / 8, x1 = cx + dx, y1 = cy + dy, col = refColor(a.ref);
    const w = (a.chosen ? 3 : 1.5) * px;
    out.arrows.push({ list: a.li, k: a.k, second: a.second, mv: a.mv, chosen: a.chosen, to: [+x1.toFixed(3), +y1.toFixed(3)] });
    if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {      // a zero MV: a ring at the centre
      ctx.lineWidth = w; ctx.strokeStyle = a.chosen ? '#ffffff' : col; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx, cy, (a.chosen ? 5 : 3.5) * px, 0, 7); ctx.stroke();
      continue;
    }
    const L = Math.min(8 * px, Math.hypot(dx, dy) * 0.5), ang = Math.atan2(dy, dx);
    for (const [lw, c] of [[w + 2.5 * px, 'rgba(0,0,0,0.7)'], [w, a.chosen ? '#ffffff' : col]]) {
      ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.fillStyle = c;
      ctx.setLineDash(a.second && lw === w ? [4 * px, 3 * px] : []);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - L * Math.cos(ang - 0.45), y1 - L * Math.sin(ang - 0.45));
      ctx.lineTo(x1 - L * Math.cos(ang + 0.45), y1 - L * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
    }
    if (a.chosen) { ctx.lineWidth = 1.5 * px; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x1, y1, 5 * px, 0, 7); ctx.stroke(); }
  }
  ctx.restore();
  return done();
}

// ------------------------------------------------------------ legend, chip
// Why the Cands chip draws nothing now ('' when it draws).
export function candsChipWhy() {
  bind();
  if (!state.payload || state.sel < 0) return 'Select an inter block to draw its motion vector candidates.';
  const b = state.payload.blocks[state.sel];
  if (!isInter(b)) return 'The selected block is not an inter block (no candidate list).';
  const e = candsEntry(state.f, state.sel);
  if (!e || e.status === 'loading') return '';
  return whyNot(e);
}
// Shift+V (controls.js): the status line says why the Cands line draws nothing, as Shift+C, O and P do: another
// codec, a bundle without candidates, no inter block selected, or a frame or block without a list (read first).
export async function candsKeySay() {
  bind();
  let why = '';
  if (!candsCodec()) why = `Motion vector candidates are for AV2, AV1 and VP9, not ${codec().toUpperCase() || 'this codec'}.`;
  else if (!candsShown()) why = whyNot({ f: state.f, status: 'none' });
  else if (!state.lines.has('cands')) return;
  else {
    why = candsChipWhy();
    if (!why && state.payload && state.sel >= 0) why = whyNot(await loadCands(state.f, state.sel));
  }
  if (why) setStatus(`Cands: ${why}`);
}
function syncCandsChip(force) {
  const k = [candsShown(), state.f, state.sel, candsChipWhy()].join('|');
  if (!force && k === chipKey) return;
  chipKey = k;
  renderChips();
}
export function candsLegendHtml() {
  if (!state.lines.has('cands')) return '';
  const e = state.sel >= 0 ? candsEntry(state.f, state.sel) : null;
  if (!e || e.status !== 'ready') return ` <span class="note">Cands: ${prose(candsChipWhy() || 'reading the candidates…')}</span>`;
  const refs = [...new Set(e.data.lists.flatMap((l) => l.ref))];
  return ` ${refs.map((r) => `<span class="mc-key"><i style="background:${refColor(r)}"></i>${esc(r)}</span>`).join('')}<span class="note">motion vector candidates of the selected block from its centre (dashed: the second MV of a pair); thick white = the entry its mode copies</span>`;
}
// Called with every legend: read what the Cands line needs, keep the chip's state.
export function syncCands() {
  bind();
  if (state.lines.has('cands') && state.payload && state.sel >= 0 && isInter(state.payload.blocks[state.sel]) && !candsEntry(state.f, state.sel)) loadCands(state.f, state.sel);
  syncCandsChip(false);
}

// ------------------------------------------------------------ probe (tests/gui)
export function candsSnap() {
  bind();
  const q = (sel) => [...document.querySelectorAll(sel)];
  const e = state.sel >= 0 ? candsEntry(state.f, state.sel) : null;
  const sec = document.getElementById('nbSec');
  const nbPlane = sec ? q('#nbSec [data-act="nb-plane"][aria-pressed="true"]').map((b) => +b.dataset.plane)[0] ?? null : null;
  const ne = sec && nbPlane !== null ? neighboursEntry(state.f, state.sel, nbPlane) : null;
  return {
    shown: candsShown(), served: served(), codec: candsCodec(), status: e ? e.status : null, why: e ? whyNot(e) : '',
    canCompute: canCompute(e), job: e && e.job ? { id: e.job.id || null, state: e.job.state } : null,
    rows: q('#tabBody tr[data-cand]').map((r) => { const [li, k] = r.dataset.cand.split(':').map(Number); return { list: li, k, mv: (r.querySelector('.mc-mv') || {}).textContent || null, comp: (r.querySelector('.mc-comp') || {}).textContent || null, chosen: r.classList.contains('chosen'), copied: ((r.querySelector('.mc-copied') || {}).textContent || '') === 'yes' }; }),
    check: (q('#tabBody .mc-check')[0] || {}).textContent || null,
    section: document.getElementById('mcSec') ? 'candidates' : sec ? 'neighbours' : null,
    sectionText: ((document.getElementById('mcSec') || sec || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    drawn: { ...drawn, arrows: drawn.arrows.map((a) => ({ ...a })) },
    nb: sec ? {
      plane: nbPlane, status: ne ? ne.status : null,
      cells: Object.fromEntries(['top_left', 'above', 'left'].map((p) => [p, q(`#nbSec td[data-nb^="${p}:"]`).map((c) => ({ text: c.textContent, avail: c.classList.contains('nb-yes') ? true : c.classList.contains('nb-no') ? false : null }))])),
    } : null,
    chip: q('#lineGroup [data-line="cands"]').map((c) => ({ off: c.classList.contains('off'), title: c.title }))[0] || null,
  };
}
