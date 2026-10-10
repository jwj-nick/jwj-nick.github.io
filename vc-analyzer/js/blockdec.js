// F-c track B (R49, T-0049): decoder decisions drawn on the picture and listed in the Block / Frame tabs:
// intra direction arrows (F14, angles.js), transform type fill (F17) and inter mode fill and rows (F15, modes.js),
// slice / tile / segment boundaries (F12, regions.js).
import { C, codecOf, FILLS, LINES, state } from './state.js?v=9ce97af84e';
import { esc } from './util.js?v=9ce97af84e';
import { intraMarks, vecDegrees } from './angles.js?v=9ce97af84e';
import { blockIndex, interRowsHtml, modesSnap, txRowHtml } from './modes.js?v=9ce97af84e';
import { hasSegments, regionRowHtml, regionsSectionHtml, regionsSnap } from './regions.js?v=9ce97af84e';
import { isChromaBlock } from './frames.js?v=9ce97af84e';
import { renderChips } from './controls.js?v=9ce97af84e';

// ------------------------------------------------------------ intra marks (cached per frame payload)
let marksCache = { p: null, m: null };
function marksOf(bi) {
  const p = state.payload;
  if (marksCache.p !== p) marksCache = { p, m: new Map() };
  let m = marksCache.m.get(bi);
  if (!m) {
    const b = p.blocks[bi];
    m = isChromaBlock(bi) ? [] : intraMarks(codecOf(), { x: b[C.x], y: b[C.y], w: b[C.w], h: b[C.h], bsize: b[C.bsize], pred: b[C.pred], mode: b[C.mode], tx_size: b[C.tx_size] }, (p.ext || [])[bi]);
    marksCache.m.set(bi, m);
  }
  return m;
}

// The angle line: an arrow along the copy direction per directional prediction block, 0.4 of its shorter side long,
// a dot for a non-directional mode; left out where that length is under 12 px on screen.
const MIN_PX = 12;
let drawn = { arrows: [], dots: 0, small: 0, at: null };
export function drawAngles(ctx, blocks, visible, px, record) {
  const ix = blockIndex(), arrows = [], dots = [];
  let small = 0;
  for (const b of blocks) {
    if (b[C.pred] !== 'intra' || !visible(b)) continue;
    for (const mk of marksOf(ix.get(b))) {
      const L = 0.4 * Math.min(mk.w, mk.h);
      if (L < MIN_PX * px) { small++; continue; }
      const cx = mk.x + mk.w / 2, cy = mk.y + mk.h / 2;
      if (mk.v) arrows.push([cx, cy, L, mk.v[0], mk.v[1]]);
      else dots.push([cx, cy]);
    }
  }
  const head = (cx, cy, L, dx, dy) => {
    const tx = cx + dx * L / 2, ty = cy + dy * L / 2, hl = Math.min(L * 0.4, 9 * px), hw = hl * 0.6;
    ctx.moveTo(tx, ty); ctx.lineTo(tx - dx * hl - dy * hw, ty - dy * hl + dx * hw); ctx.lineTo(tx - dx * hl + dy * hw, ty - dy * hl - dx * hw); ctx.closePath();
  };
  const shaft = (cx, cy, L, dx, dy) => { ctx.moveTo(cx - dx * L / 2, cy - dy * L / 2); ctx.lineTo(cx + dx * L / 2 - dx * Math.min(L * 0.3, 5 * px), cy + dy * L / 2 - dy * Math.min(L * 0.3, 5 * px)); };
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  // dark underlay, then white
  for (const [w, col] of [[3.5 * px, 'rgba(0,0,0,0.7)'], [1.6 * px, '#ffffff']]) {
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath(); for (const a of arrows) shaft(...a); ctx.stroke();
    ctx.beginPath(); for (const a of arrows) head(...a); ctx.fill(); if (w > 2 * px) ctx.stroke();
    ctx.beginPath(); for (const [cx, cy] of dots) { ctx.moveTo(cx + w, cy); ctx.arc(cx, cy, w, 0, 7); } ctx.fill();
  }
  ctx.restore();
  if (record) drawn = { arrows: arrows.map((a) => a.map((v) => +v.toFixed(4))), dots: dots.length, small, at: state.payload.f };
}

// ------------------------------------------------------------ chips per codec
// The segment fill exists for AV1, AV2 and VP9 only; the bounds chip is named for what it draws.  The lists are
// changed in place as quality.js does for the psnr fill (controls.js filters nothing by codec).
const SEGMENT = FILLS.find((f) => f.id === 'segment'), TXTYPE = FILLS.find((f) => f.id === 'txtype');
const BOUNDS = LINES.find((l) => l.id === 'bounds');
let chipsCodec = null;
export function syncDecisionChips() {
  const codec = codecOf();
  if (!codec || codec === chipsCodec || !SEGMENT || !BOUNDS) return;
  chipsCodec = codec;
  const i = FILLS.indexOf(SEGMENT);
  if (hasSegments() && i < 0) FILLS.splice(FILLS.indexOf(TXTYPE) + 1, 0, SEGMENT);
  else if (!hasSegments() && i >= 0) FILLS.splice(i, 1);
  if (!hasSegments() && state.fill === 'segment') state.fill = 'mode';
  BOUNDS.label = hasSegments() ? 'Segments' : 'Slices';   // AV1, AV2: tile group boundaries are drawn too (legend)
  renderChips();
}

// ------------------------------------------------------------ Block and Frame tab
const kv = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
// Rows (kv dt/dd HTML) appended to the Block tab facts of block bi.
export function blockDecisionHtml(bi) {
  if (!state.payload || bi < 0 || !state.payload.blocks[bi]) return '';
  const b = state.payload.blocks[bi];
  let h = '';
  const mk = marksOf(bi);
  if (mk.length === 1) {
    const m = mk[0];
    h += kv('Intra direction', esc(m.text), m.v ? `samples come from ${vecDegrees(m.v)}° (90 above, 180 left)` : 'non-directional: a dot on the Intra direction line (A)');
  } else if (mk.length > 1) {
    h += kv('Intra direction', esc(mk.map((m) => m.text).join(', ')), `${mk.length} prediction blocks, raster order`);
  }
  h += txRowHtml(b) + interRowsHtml(bi) + regionRowHtml(bi);
  return h;
}
// A section for the Frame tab (slices, tiles, segments of the frame).
export function frameRegionsHtml() { return state.payload ? regionsSectionHtml() : ''; }
export function initDecisions() {}
// Read-only view for window.__vca.snap() (tests).
export function decisionsSnap() {
  if (!state.payload) return {};
  const fills = FILLS.map((f) => f.id), lines = LINES.map((l) => l.id);
  return { fills, lines, boundsLabel: BOUNDS ? BOUNDS.label : null, angle: drawn, regions: regionsSnap(), modes: modesSnap() };
}
