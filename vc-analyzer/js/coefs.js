// The Coefficients dialog (F-g G2, FEATURES F51, SERVER_API.md section 21 item 4): one transform block of the frame
// on screen as three grids, the levels at their positions (the scan index on hover), the dequantized coefficients
// and the residual (decoded samples after minus before the inverse transform), coloured as the sample grid colours
// a difference (amber positive, cyan negative: planes.js diffToCanvas), with the numbers where a cell is wide
// enough.  The stage strip follows the pointer: level x dqv -> dequantized -> inverse transform -> residual ->
// + prediction -> reconstruction, the last two from the analysis' pred and prefilter planes where it has them.
// What the dumper could give (exact, derived, absent) is said in words from the payload's stages, caps and flags.
// Opened from a row of the Block tab's Transform blocks section or with Shift+C (internals.js).
import { frameMeta, state } from './state.js?v=3e8d1a839f';
import { $, esc, fmt, rgb } from './util.js?v=3e8d1a839f';
import { loadExact } from './planes.js?v=3e8d1a839f';
import { blockTxbs, colsOf, entryOf, load, txName, whyNot } from './internals.js?v=3e8d1a839f';

const dlg = () => $('#coefDialog');
const PLANE = ['Y', 'U', 'V'];
let cur = null;                 // {f, ti}: the transform block shown (row of coef.json txb)
let hov = null;                 // [r, c] the strip shows
let pix = { key: '', pred: undefined, recon: undefined };   // exact planes of the frame (undefined: loading)
let laid = null;                // what render() drew (the grids' values, for the strip and the probe)

// ------------------------------------------------------------ words for the payload's capabilities
const FLAG_WORDS = {
  levels_absent: 'levels not available: TCQ block (the decoder keeps no levels for it)',
  levels_derived: 'levels derived from the dequantized values',
  derive_failed: 'some levels could not be derived from the dequantized values (shown as 0)',
  fsc: 'forward skip coding: the eob is the largest one, the coefficients are read from the end',
  cctx: 'cross-chroma transform: the dequantized values are before U and V are mixed',
  lossless: 'lossless block',
  ist: 'a secondary transform is signalled: the dequantized values are before it',
  dq_clamped: 'a dequantized value is at its clamp, so its level may not be the only one',
};
const STAGE_WORDS = { exact: 'exact, as the decoder holds them', derived: 'derived from the dequantized values' };
function flagNames(coef, flags) {
  const names = (coef.names || {}).flags || {}, out = [];
  for (let bit = 1; bit <= 128; bit <<= 1) if (flags & bit) out.push(names[String(bit)] || `flag ${bit}`);
  return out;
}
function capsText(coef, r, T) {
  const st = coef.stages || {}, fl = flagNames(coef, r[T.flags]);
  const parts = [];
  if (fl.includes('levels_absent')) parts.push(FLAG_WORDS.levels_absent);
  else if (st.levels) parts.push(`levels ${STAGE_WORDS[st.levels] || st.levels}`);
  if (st.dequant) parts.push(`dequantized values ${STAGE_WORDS[st.dequant] || st.dequant}`);
  const rn = ((coef.caps || {}).resid || {}).note;
  if (st.residual) parts.push(`residual ${STAGE_WORDS[st.residual] || st.residual}${rn ? ` (${rn})` : ''}`);
  const here = fl.filter((n) => n !== 'levels_absent' && !(n === 'levels_derived' && st.levels === 'derived')).map((n) => FLAG_WORDS[n] || n);
  return `${parts.join('; ')}.${here.length ? ` This block: ${here.join('; ')}.` : ''} No intermediate transform stage is available.`;
}

// ------------------------------------------------------------ open
export async function openCoefs(f, ti) {
  cur = { f, ti }; hov = null;
  if (!dlg().open) dlg().showModal();
  render();
  await load(f);
  if (cur && cur.f === f && cur.ti === ti) render();
}
// internals.js: the frame's data arrived or changed
export function coefsChanged() { if (dlg() && dlg().open) render(); }

// ------------------------------------------------------------ colours (planes.js diffToCanvas: base 30)
function signedRgb(v, max) {
  const t = max > 0 ? Math.sqrt(Math.min(1, Math.abs(v) / max)) : 0, b = 30;
  const c = v > 0 ? [b + 225 * t, b + 150 * t, b] : v < 0 ? [b, b + 190 * t, b + 225 * t] : [b, b, b];
  return c.map((x) => x | 0);
}
const css = (c) => rgb(c);
const light = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 140;
const signed = (v) => (v > 0 ? `+${v}` : `${v}`).replace('-', '−');

// A grid of rows x cols values: spans with data-r, data-c, data-v; the number shown when the cell is wide enough.
function gridHtml(id, rows, cols, vals, cell, extra = () => '') {
  let max = 0, chars = 1;
  for (const v of vals) { const a = Math.abs(v); if (a > max) max = a; }
  chars = String(max).length + 1;
  const text = cell >= chars * 6.2 + 3;
  let h = `<div class="cf-grid${text ? '' : ' small'}" id="${id}" style="grid-template-columns:repeat(${cols},${cell}px);--cell:${cell}px" role="grid">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = vals[r * cols + c], col = signedRgb(v, max);
      h += `<span data-r="${r}" data-c="${c}" data-v="${v}" style="background:${css(col)};color:${light(col) ? '#111' : '#eef1f4'}"${extra(r, c)}>${text && v !== 0 ? signed(v) : ''}</span>`;
    }
  }
  return h + '</div>';
}

// ------------------------------------------------------------ render
function render() {
  const d = dlg();
  if (!d.open || !cur) return;
  const e = entryOf(cur.f), sub = $('#cfSub'), body = $('#cfBody');
  laid = null;
  if (!e || e.status === 'loading') { sub.textContent = `Frame ${cur.f}`; body.innerHTML = '<p class="note">Reading the coefficients…</p>'; return; }
  if (!e.coef || !e.coef.txb.rows[cur.ti]) { sub.textContent = `Frame ${cur.f}`; body.innerHTML = `<p class="note cf-why">${esc(whyNot(cur.f) || 'This frame has no coefficient internals.')}</p>`; return; }
  const coef = e.coef, T = colsOf(coef.txb), r = coef.txb.rows[cur.ti];
  const P = r[T.plane], x = r[T.x], y = r[T.y], w = r[T.w], h = r[T.h];
  const wc = Math.min(w, 32), hc = Math.min(h, 32);
  const n0 = r[T.n0], nn = r[T.nn];
  const lvl = new Array(wc * hc).fill(0), dq = new Array(wc * hc).fill(0), scan = new Array(wc * hc).fill(-1), dqv = new Array(wc * hc).fill(null);
  for (let k = n0; k < n0 + nn; k++) { const p = coef.pos[k]; lvl[p] = coef.lvl[k]; dq[p] = coef.dq[k]; scan[p] = coef.scan[k]; dqv[p] = coef.dqv[k]; }
  const fl = flagNames(coef, r[T.flags]);
  const absent = fl.includes('levels_absent'), derived = !absent && (fl.includes('levels_derived') || (coef.stages || {}).levels === 'derived');
  const r0 = r[T.r0];
  const resid = r0 >= 0 && e.resid ? Array.from(e.resid.subarray(r0, r0 + w * h)) : null;
  const sizeName = ((coef.names || {}).tx_size || [])[r[T.tx_size]] || `size ${r[T.tx_size]}`;
  const blk = r[T.blk];
  const list = blk >= 0 ? blockTxbs(coef, blk) : [cur.ti], at = list.indexOf(cur.ti);
  sub.textContent = `Frame ${cur.f}, ${PLANE[P] || P} transform block ${w}×${h} at (${x}, ${y}) in the plane's samples: ${sizeName}, ${txName(coef, r, T)}, eob ${r[T.eob]}, ${fmt(r[T.nnz])} nonzero.`;
  // cell size: three grids side by side, or one under the other on a narrow screen
  const W = Math.max(240, (body.clientWidth || d.clientWidth - 40));
  const stacked = window.innerWidth <= 860;
  const boxW = stacked ? W : Math.floor((W - 2 * 18) / 3);
  const cellC = Math.max(6, Math.min(36, Math.floor(boxW / wc))), cellR = Math.max(4, Math.min(36, Math.floor(boxW / w)));
  const scanTip = (rr, cc) => ` title="${scan[rr * wc + cc] >= 0 ? `scan index ${scan[rr * wc + cc]}` : 'zero (not read, or zero after its read)'}"`;
  const nav = list.length > 1
    ? `<div class="gr-tools cf-nav"><button class="btn small" type="button" data-act="cf-prev" ${at <= 0 ? 'disabled' : ''} title="Previous transform block of this block (←)">‹ Previous</button><span class="gr-fact">transform block ${at + 1} of ${list.length} of this block</span><button class="btn small" type="button" data-act="cf-next" ${at >= list.length - 1 ? 'disabled' : ''} title="Next transform block of this block (→)">Next ›</button></div>`
    : '';
  body.innerHTML = nav
    + `<p class="cf-caps" id="cfCaps">${esc(capsText(coef, r, T))}</p>`
    + '<div class="cf-strip" id="cfStrip" aria-live="polite"></div>'
    + '<div class="cf-grids">'
    + `<figure class="cf-fig"><figcaption>Levels${absent ? ' (not available)' : derived ? ' (derived)' : ''}, scan index on hover</figcaption>${gridHtml('cfLvl', hc, wc, lvl, cellC, scanTip)}</figure>`
    + `<figure class="cf-fig"><figcaption>Dequantized</figcaption>${gridHtml('cfDq', hc, wc, dq, cellC, scanTip)}</figure>`
    + `<figure class="cf-fig"><figcaption>Residual${resid ? '' : r[T.eob] === 0 ? ' (none: eob 0)' : ' (not captured)'}</figcaption>${resid ? gridHtml('cfRes', h, w, resid, cellR) : `<p class="note">${r[T.eob] === 0 ? 'No coefficient was coded, so the residual is 0.' : 'The dumper wrote no residual for this transform block (outside the region it was asked for).'}</p>`}</figure>`
    + '</div>'
    + (w > 32 || h > 32 ? '<p class="fine">Only the top-left 32×32 of a transform with a side of 64 holds coefficients; the residual covers the whole block.</p>' : '');
  laid = { e, coef, r, T, P, x, y, w, h, wc, hc, lvl, dq, scan, dqv, resid, absent, derived, list, at };
  if (!hov) {
    const p0 = nn ? coef.pos[n0] : 0;
    hov = [Math.floor(p0 / wc), p0 % wc];
  }
  loadPix(cur.f);
  strip();
}

// The exact prediction and reconstruction planes of frame f (the pixel stages the analysis has).
function loadPix(f) {
  const key = `${f}|${state.manifest && state.manifest.stream ? state.manifest.stream.name : ''}`;
  if (pix.key === key) return;
  pix = { key, pred: undefined, recon: undefined };
  const st = (frameMeta(f) || {}).stages || [];
  const one = (stage, slot) => {
    if (!st.includes(stage)) { pix[slot] = null; return; }
    loadExact(f, stage).then((p) => { if (pix.key === key) { pix[slot] = p || null; strip(); } }, () => { if (pix.key === key) { pix[slot] = null; strip(); } });
  };
  one('pred', 'pred'); one('prefilter', 'recon');
}
function sampleOf(p, P, sx, sy) {
  if (!p) return null;
  const pl = PLANE[P], arr = p[pl];
  if (!arr) return null;
  const pw = P ? p.cw : p.w, ph = P ? p.ch : p.h;
  if (sx < 0 || sy < 0 || sx >= pw || sy >= ph) return undefined;
  return arr[sy * pw + sx];
}

// The stage strip for position hov = [row, column] of the transform block.
function strip() {
  const el = $('#cfStrip');
  if (!el || !laid || !hov) return;
  const L = laid, [rr, cc] = hov;
  const inC = rr < L.hc && cc < L.wc, k = rr * L.wc + cc;
  const part = (key, html, tip = '') => `<span class="cf-st" data-k="${key}"${tip ? ` title="${esc(tip)}"` : ''}>${html}</span>`;
  const arrow = '<span class="cf-arrow" aria-hidden="true">→</span>';
  let h = part('pos', `row ${rr}, column ${cc}`, 'Position in the transform block: the coefficient there, and the sample there for the residual and after');
  if (inC) {
    const lv = L.absent ? 'not kept' : signed(L.lvl[k]);
    h += part('level', `level <b>${lv}</b>${L.derived && !L.absent ? ' (derived)' : ''}`, L.scan[k] >= 0 ? `scan index ${L.scan[k]}` : 'zero (not read, or read as zero)');
    // the payload's dequant rule (AV2, AV1, VP9): |dq| = (|level| x dqv) >> (fraction bits + the size's shift)
    const D = L.coef.dequant, sh = D ? (D.frac_bits || 0) + (D.area_over || []).filter((t) => L.w * L.h > t).length : 0;
    h += '<span class="cf-arrow" aria-hidden="true">×</span>' + part('dqv', `dqv <b>${L.dqv[k] === null ? '–' : fmt(L.dqv[k])}</b>${sh && L.dqv[k] !== null ? ` &gt;&gt; ${sh}` : ''}`,
      `The dequantization factor at this position (qmatrix included), in the decoder's units${D && D.note ? `: ${D.note}` : ''}${sh ? `; level × dqv is shifted right by ${sh}: ${D.frac_bits || 0} for the units, ${sh - (D.frac_bits || 0)} for a ${L.w}×${L.h} transform` : ''}`);
    h += arrow + part('dq', `dequantized <b>${signed(L.dq[k])}</b>`);
  } else h += part('level', 'not coded here: only the top-left 32×32 holds coefficients');
  h += arrow + part('tx', `inverse transform (${esc(txName(L.coef, L.r, L.T))})`);
  const rv = L.resid ? L.resid[rr * L.w + cc] : (L.r[L.T.eob] === 0 ? 0 : null);
  h += arrow + part('resid', `residual <b>${rv === null ? 'not captured' : signed(rv)}</b>`);
  const sx = L.x + cc, sy = L.y + rr;
  const pv = pix.pred === undefined ? '…' : pix.pred === null ? 'not in this analysis' : sampleOf(pix.pred, L.P, sx, sy);
  const qv = pix.recon === undefined ? '…' : pix.recon === null ? 'not in this analysis' : sampleOf(pix.recon, L.P, sx, sy);
  const word = (v) => (v === undefined ? 'outside the picture' : typeof v === 'number' ? `<b>${v}</b>` : esc(v));
  h += arrow + part('pred', `+ prediction ${word(pv)}`, `Prediction sample (${sx}, ${sy}) of the ${PLANE[L.P]} plane`);
  h += arrow + part('recon', `reconstruction ${word(qv)}`, `Sample (${sx}, ${sy}) before the loop filters`);
  el.innerHTML = h;
  // the cell under the pointer marked in every grid
  for (const g of document.querySelectorAll('#cfBody .cf-grid')) {
    g.querySelectorAll('.hov').forEach((s) => s.classList.remove('hov'));
    const s = g.querySelector(`[data-r="${rr}"][data-c="${cc}"]`);
    if (s) s.classList.add('hov');
  }
}

function step(d) {
  if (!laid || laid.list.length < 2) return;
  const k = laid.at + d;
  if (k < 0 || k >= laid.list.length) return;
  cur = { f: cur.f, ti: laid.list[k] }; hov = null;
  render();
}

// ------------------------------------------------------------ wiring, probe
export function initCoefs() {
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    if (t.closest('[data-act="cf-prev"]')) step(-1);
    else if (t.closest('[data-act="cf-next"]')) step(1);
  });
  // the strip follows the pointer over any of the three grids (a tap on a phone)
  const over = (ev) => {
    const s = ev.target.closest && ev.target.closest('.cf-grid [data-r]');
    if (!s) return;
    const at = [+s.dataset.r, +s.dataset.c];
    if (!hov || hov[0] !== at[0] || hov[1] !== at[1]) { hov = at; strip(); }
  };
  d.addEventListener('pointerover', over);
  d.addEventListener('pointerdown', over);
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    step(e.key === 'ArrowLeft' ? -1 : 1);
  });
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (d.open) render(); }, 150); });
}

const vals = (id) => [...document.querySelectorAll(`#${id} [data-v]`)].map((s) => +s.dataset.v);
export function coefsSnap() {
  const d = dlg(), open = !!(d && d.open);
  if (!open) return { open };
  const L = laid;
  return {
    open, f: cur ? cur.f : null, ti: cur ? cur.ti : null, hov,
    txb: L ? { plane: L.P, x: L.x, y: L.y, w: L.w, h: L.h, wc: L.wc, hc: L.hc, eob: L.r[L.T.eob], nnz: L.r[L.T.nnz], flags: L.r[L.T.flags], blk: L.r[L.T.blk], n: L.list.length, at: L.at } : null,
    lvl: vals('cfLvl'), dq: vals('cfDq'), resid: document.getElementById('cfRes') ? vals('cfRes') : null,
    texts: [...document.querySelectorAll('#cfLvl [data-v]')].slice(0, 64).map((s) => s.textContent),
    strip: Object.fromEntries([...document.querySelectorAll('#cfStrip [data-k]')].map((s) => [s.dataset.k, s.textContent])),
    caps: ($('#cfCaps') || {}).textContent || '', sub: $('#cfSub').textContent,
    message: ($('#cfBody .note') || {}).textContent || '',
  };
}
