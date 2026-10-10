// F24 (R49, F-b track Y): the exact sample grid.  With the grid on (i) and the picture zoomed in so far that
// a sample is wider than its number, each sample of the shown plane carries its value: the plane of the
// chosen component (luma for the colour picture), decimal or hex, at the stream's bit depth (exactOf in
// planes.js: above 8 bits the view PNG and its .lo.png, loaded when the grid needs them).  A − B and the
// change pictures (loop filter change, residual) show the signed difference.  The numbers are drawn on the
// canvas, so the screen and the PNG export carry them; gridSnap() lists the cells drawn on screen (tests).
import { state } from './state.js?v=9ce97af84e';
import { exactOf, frameBitDepth, whenExact } from './planes.js?v=9ce97af84e';
import { requestRender } from './view.js?v=9ce97af84e';
import { renderLegend } from './legend.js?v=9ce97af84e';

const FONT_PX = 11;          // CSS px
const CHAR_W = 6.6;          // width of one digit at FONT_PX in the mono font (CSS px), for the legend's zoom
const MAX_CELLS = 8000;
let snapPanes = [];
let waiting = null;          // the exact samples being loaded (one render when they arrive)

// The plane whose samples the grid shows.
export function gridPlane(pic = state.picture) {
  const p = pic && pic.planes;
  return (state.comp === 'u' || state.comp === 'v') && p && p.U ? state.comp.toUpperCase() : 'Y';
}
// Number of characters of the widest value: bit depth, base, sign.
function charsFor(bd, base, signed) {
  const max = (1 << bd) - 1;
  return max.toString(base).length + (signed ? 1 : 0);
}
const fmtValue = (v, base, signed) => {
  const t = Math.abs(v).toString(base).toUpperCase();
  return signed ? (v > 0 ? '+' + t : v < 0 ? '-' + t : '0') : t;
};
// The zoom (scale) from which the numbers show: a sample (luma pixels per sample: sub) at least this wide.
export function gridMinScale(bd, signed, sub = 1, base = state.gridBase) {
  return (charsFor(bd, base, signed) * CHAR_W + 4) / sub;
}

// The drawn picture's RGBA, read once per picture (the text colour of each number).
function pictureRgba(pic) {
  if (!pic.rgba) pic.rgba = pic.canvas.getContext('2d').getImageData(0, 0, pic.canvas.width, pic.canvas.height).data;
  return pic.rgba;
}

// Starts a screen render's record (the screen canvas only; the PNG export draws without recording).
export function gridRecordStart() { snapPanes = []; }

// Draws the values of `pic` in the clip rectangle (CSS px of the drawn area), view {s, ox, oy}, device scale k.
// pane: index for gridSnap (0 = the first picture, 1 = the second of a split or side-by-side view).
export function drawGrid(ctx, view, k, pic, clip, pane, record) {
  const out = { pane, shown: false, reason: '', plane: gridPlane(pic), cells: [] };
  if (record) snapPanes[pane] = out;
  if (!pic || !pic.src || pic.kind === 'none') { out.reason = 'no samples'; return; }
  const ex = exactOf(pic, true);
  if (ex === undefined) {
    out.reason = 'loading';
    if (!waiting) { waiting = whenExact(pic).then(() => { waiting = null; requestRender(); renderLegend(); }); }
    return;
  }
  if (!ex) { out.reason = 'no samples'; return; }
  const P = out.plane, pl = ex.planes, { s, ox, oy } = view;
  if (!ex.has(P)) { out.reason = 'no samples'; return; }
  const sx = P === 'Y' ? 1 : 1 << pl.ssx, sy = P === 'Y' ? 1 : 1 << pl.ssy;
  const pw = P === 'Y' ? pl.w : pl.cw, ph = P === 'Y' ? pl.h : pl.ch;
  const cellW = s * sx, cellH = s * sy, base = state.gridBase;
  const bd = ex.exact ? ex.bd : 8;
  const mono = (getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'monospace').trim();
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.font = `500 ${FONT_PX}px ${mono}`;
  const need = charsFor(bd, base, ex.signed) * ctx.measureText('0').width + 4;
  Object.assign(out, { bd, exact: ex.exact, signed: ex.signed, cellPx: cellW, need });
  if (cellW < need || cellH < FONT_PX + 3) { out.reason = 'zoom'; ctx.restore(); return; }
  const c0 = Math.max(0, Math.floor((clip.x - ox) / cellW)), c1 = Math.min(pw, Math.ceil((clip.x + clip.w - ox) / cellW));
  const r0 = Math.max(0, Math.floor((clip.y - oy) / cellH)), r1 = Math.min(ph, Math.ceil((clip.y + clip.h - oy) / cellH));
  if (c1 <= c0 || r1 <= r0 || (c1 - c0) * (r1 - r0) > MAX_CELLS) { out.reason = c1 <= c0 || r1 <= r0 ? 'outside' : 'zoom'; ctx.restore(); return; }
  ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip();
  // sample borders, then the numbers with a dark edge (readable on any picture)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1 / k;
  ctx.beginPath();
  for (let c = c0; c <= c1; c++) { const x = ox + c * cellW; ctx.moveTo(x, oy + r0 * cellH); ctx.lineTo(x, oy + r1 * cellH); }
  for (let r = r0; r <= r1; r++) { const y = oy + r * cellH; ctx.moveTo(ox + c0 * cellW, y); ctx.lineTo(ox + c1 * cellW, y); }
  ctx.stroke();
  // dark numbers on a light sample, light ones on a dark sample (the drawn picture's colour there)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.5;
  const rgba = pictureRgba(pic), W = pic.canvas.width;
  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      const t = fmtValue(ex.value(P, c, r), base, ex.signed);
      const x = ox + (c + 0.5) * cellW, y = oy + (r + 0.5) * cellH;
      const o = (Math.min(pic.canvas.height - 1, r * sy) * W + Math.min(W - 1, c * sx)) * 4;
      const light = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2] > 140;
      ctx.strokeStyle = light ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)';
      ctx.fillStyle = light ? '#111' : '#fff';
      ctx.strokeText(t, x, y); ctx.fillText(t, x, y);
      if (record) out.cells.push([c, r, t]);
    }
  }
  out.shown = true;
  ctx.restore();
}

// Words for the legend: what the grid shows and from which zoom.
export function gridLegend() {
  if (!state.grid || !state.picture || !state.picture.src) return '';
  const pic = state.picture, P = gridPlane(pic), bd = frameBitDepth(pic.src.f);
  const signed = !!pic.src.b, p = pic.planes;
  const sub = P === 'Y' || !p ? 1 : 1 << p.ssx;
  const need = gridMinScale(bd, signed, sub), z = Math.ceil(need);
  const what = signed ? `${P} differences` : `${P} samples`;
  const ex = exactOf(pic, false);
  const vals = ex && !ex.exact ? '8-bit view values (this frame has no exact samples above 8 bits)' : `exact ${bd}-bit values`;
  return `Sample grid: ${what} in ${state.gridBase === 16 ? 'hex' : 'decimal'}, ${vals}; the numbers show from zoom ${z}:1 (now ${zoomText()}${state.view.s >= need ? '' : ', press + to zoom in'}).`;
}
// The current zoom as the legend writes it, rounded down: "12:1", "2.5:1", "1:4" (CSS px per luma pixel,
// state.view.s), so a zoom just short of the one the numbers need never reads as that one
export function zoomText(s = state.view.s) {
  if (!(s > 0)) return '–';
  if (s >= 1) return `${s >= 10 ? Math.floor(s) : Math.floor(s * 10) / 10}:1`;
  const r = 1 / s;
  return `1:${r >= 10 ? Math.ceil(r) : Math.ceil(r * 10) / 10}`;
}

// read-only state for window.__vca.snap().pixels.grid
export function gridSnap() {
  return { on: state.grid, base: state.gridBase, plane: gridPlane(), panes: state.grid ? snapPanes.filter(Boolean).map((p) => ({ ...p, cells: p.cells.slice(0, MAX_CELLS) })) : [] };
}
