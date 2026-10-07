// Viewport and canvas rendering: fills, grids, motion, superblocks, chroma tree, mismatch outlines.
import { C, PERF, perf, perfMark, qMax, state } from './state.js?v=84f66b0ecd';
import { $, clamp, dims, dpr, MISMATCH, modeColor, ramp, refColor, rgb } from './util.js?v=84f66b0ecd';
import { firstSample, focusStage } from './diff.js?v=84f66b0ecd';
import { isChromaBlock, partitionPath } from './frames.js?v=84f66b0ecd';
import { archOf, drawArchLabels } from './arch.js?v=84f66b0ecd';

// ------------------------------------------------------------ viewport
export const canvas = $('#canvas');
let renderPending = false;
export function requestRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; render(); });
}
// true from requestRender until that frame is drawn (the probe's snap().ready)
export const isRenderPending = () => renderPending;
// The picture area also changes size without a window resize (the diff bar, a legend that
// wraps once the web font has loaded): draw again so the bitmap matches the shown size, and
// fit again while the view is still the one the last fit made (not zoomed or panned since).
let lastFit = null;
// (the next animation frame: no layout change inside the observer's callback)
new ResizeObserver(() => requestAnimationFrame(() => {
  const v = state.view;
  if (lastFit && state.payload && v.s === lastFit.s && v.ox === lastFit.ox && v.oy === lastFit.oy) fitView();
  else requestRender();
})).observe(canvas);

function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr())), h = Math.max(1, Math.round(r.height * dpr()));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return r;
}

export function fitCanvasHeight() {
  // Narrow screens: size the picture area to the frame's aspect ratio.
  const wrap = $('#canvasWrap');
  if (!state.payload || window.innerWidth > 860) { wrap.style.height = ''; return; }
  const fr = state.payload.frame;
  const h = Math.round(clamp(wrap.clientWidth * fr.height / fr.width * 1.04, 220, window.innerHeight * 0.62));
  wrap.style.height = h + 'px';
}

export function fitView() {
  if (!state.payload) return;
  fitCanvasHeight();
  const r = sizeCanvas();
  const fr = state.payload.frame;
  const s = Math.min(r.width / fr.width, r.height / fr.height) * 0.96;
  state.view = { s, ox: (r.width - fr.width * s) / 2, oy: (r.height - fr.height * s) / 2, fitted: true };
  lastFit = { s: state.view.s, ox: state.view.ox, oy: state.view.oy };
  requestRender();
}
export function zoomAt(factor, px, py) {
  const v = state.view;
  const s2 = clamp(v.s * factor, 0.05, 64);
  v.ox = px - (px - v.ox) * (s2 / v.s);
  v.oy = py - (py - v.oy) * (s2 / v.s);
  v.s = s2;
  requestRender();
}
export function setZoom(s2) {
  const r = canvas.getBoundingClientRect();
  zoomAt(s2 / state.view.s, r.width / 2, r.height / 2);
}
export const toImage = (px, py) => [(px - state.view.ox) / state.view.s, (py - state.view.oy) / state.view.s];

function render() {
  const r = sizeCanvas();
  drawScene(canvas.getContext('2d'), r.width, r.height, state.view, dpr(), { hover: true });
  if (PERF && perf.cur && state.payload && state.payload.f === perf.cur.f) perfMark('render');
}

// Draws the picture with the current fill, lines and selection into ctx: a
// cw x ch CSS px area at device scale k, viewed through `view` {s, ox, oy}.
// The screen canvas and the PNG export (export.js) both draw through here.
// selection: false leaves out the selected block's outline (the PNG export's option).
export function drawScene(ctx, cw, ch, view, k, { hover = false, selection = true } = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg') || '#151a20';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!state.payload) return;
  const { s, ox, oy } = view;
  ctx.setTransform(s * k, 0, 0, s * k, ox * k, oy * k);
  ctx.imageSmoothingEnabled = false;
  const fr = state.payload.frame;
  if (state.picture) ctx.drawImage(state.picture.canvas, 0, 0);
  else { ctx.fillStyle = '#2a313b'; ctx.fillRect(0, 0, fr.width, fr.height); }
  const vis = [(-ox) / s, (-oy) / s, (cw - ox) / s, (ch - oy) / s];
  const px = 1 / s;  // one CSS pixel in image units
  const blocks = state.lumaBlocks || state.payload.blocks;  // chroma-tree blocks: see drawChromaTree
  const visible = (b) => !(b[C.x] > vis[2] || b[C.y] > vis[3] || b[C.x] + b[C.w] < vis[0] || b[C.y] + b[C.h] < vis[1]);
  // fill
  if (state.fill !== 'none' && state.opacity > 0) {
    const fs = fillStyler();
    ctx.globalAlpha = state.opacity;
    for (const b of blocks) {
      if (!visible(b)) continue;
      const col = fs(b);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(b[C.x], b[C.y], b[C.w], b[C.h]);
    }
    ctx.globalAlpha = 1;
    if (state.fill === 'skip') drawSkipHatch(ctx, blocks, visible, px);
  }
  if (state.fill === 'cycles') drawArchLabels(ctx, vis, px);
  // transform grid
  if (state.lines.has('tx')) {
    ctx.strokeStyle = 'rgba(120,205,255,0.55)';
    ctx.lineWidth = px;
    ctx.beginPath();
    for (const b of blocks) {
      if (!visible(b)) continue;
      const [tw, th] = dims(b[C.tx_size]);
      if (tw >= b[C.w] && th >= b[C.h]) continue;
      for (let x = b[C.x] + tw; x < b[C.x] + b[C.w]; x += tw) { ctx.moveTo(x, b[C.y]); ctx.lineTo(x, b[C.y] + b[C.h]); }
      for (let y = b[C.y] + th; y < b[C.y] + b[C.h]; y += th) { ctx.moveTo(b[C.x], y); ctx.lineTo(b[C.x] + b[C.w], y); }
    }
    ctx.stroke();
  }
  // block grid
  if (state.lines.has('grid')) {
    ctx.lineWidth = px;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    for (const b of blocks) if (visible(b)) ctx.rect(b[C.x] + px, b[C.y] + px, b[C.w], b[C.h]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.62)';
    ctx.beginPath();
    for (const b of blocks) if (visible(b)) ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]);
    ctx.stroke();
  }
  if (state.lines.has('chroma')) drawChromaTree(ctx, px);
  if (state.lines.has('sb')) drawSuperblocks(ctx, fr, px);
  if (state.lines.has('mv')) drawMotion(ctx, blocks, visible, px);
  if (state.lines.has('mismatch')) drawMismatch(ctx, px);
  // selection with its partition ancestors
  if (selection && state.sel >= 0) {
    const b = state.payload.blocks[state.sel];
    const chroma = isChromaBlock(state.sel);
    const path = partitionPath(b[C.x], b[C.y], chroma ? 'chroma' : 'luma');
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.strokeStyle = 'rgba(255,179,71,0.75)';
    ctx.lineWidth = px;
    for (const n of path.slice(0, -1)) ctx.strokeRect(n.x, n.y, n.w, n.h);
    ctx.setLineDash([]);
    ctx.lineWidth = 3 * px;
    ctx.strokeStyle = chroma ? '#ff66c4' : '#ffb347';
    ctx.strokeRect(b[C.x], b[C.y], b[C.w], b[C.h]);
    ctx.lineWidth = px;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(b[C.x] + 2 * px, b[C.y] + 2 * px, b[C.w] - 4 * px, b[C.h] - 4 * px);
  }
  if (hover && state.hover >= 0 && state.hover !== state.sel) {
    const b = state.payload.blocks[state.hover];
    ctx.lineWidth = 2 * px;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeRect(b[C.x], b[C.y], b[C.w], b[C.h]);
  }
}

function fillStyler() {
  const blocks = state.lumaBlocks || state.payload.blocks;
  switch (state.fill) {
    case 'mode': return (b) => modeColor(b[C.mode], b[C.pred]);
    case 'ref': return (b) => (b[C.pred] === 'inter' ? refColor(b[C.ref0]) : (b[C.pred] === 'intrabc' ? '#48c774' : null));
    case 'qindex': { const qm = qMax(); return (b) => rgb(ramp((b[C.qindex] ?? 0) / qm)); }
    case 'skip': return (b) => (b[C.skip_txfm] ? 'rgb(16,18,22)' : null);
    case 'cycles': {
      const A = archOf(state.payload);
      if (!A) return () => null;
      return (b) => { const r = A.sbAt(b[C.x], b[C.y]); return r ? rgb(ramp(r[3] / (A.sbMax || 1))) : null; };
    }
    case 'fetch': {
      const A = archOf(state.payload);
      if (!A) return () => null;
      const lmax = Math.log1p(A.fetchMax);
      return (b) => {
        const v = A.blk(b);
        return v && v[1] > 0 ? rgb(ramp(Math.log1p(v[1] / (b[C.w] * b[C.h])) / (lmax || 1))) : null;
      };
    }
    case 'bits': {
      const max = bitsMax(blocks);
      const lmax = Math.log1p(max * 256);
      return (b) => {
        const v = (b[C.bits] || 0) / (b[C.w] * b[C.h]);
        return v > 0 ? rgb(ramp(Math.log1p(v * 256) / (lmax || 1))) : 'rgb(20,24,30)';
      };
    }
    default: return () => null;
  }
}

export function bitsMax(blocks) {
  let max = 0;
  for (const b of blocks) max = Math.max(max, (b[C.bits] || 0) / (b[C.w] * b[C.h]));
  return max;
}

function drawSkipHatch(ctx, blocks, visible, px) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,179,71,0.8)';
  ctx.lineWidth = px;
  for (const b of blocks) {
    if (!visible(b) || !b[C.skip_mode]) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]); ctx.clip();
    ctx.beginPath();
    for (let t = -b[C.h]; t < b[C.w]; t += 4) { ctx.moveTo(b[C.x] + t, b[C.y] + b[C.h]); ctx.lineTo(b[C.x] + t + b[C.h], b[C.y]); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawSuperblocks(ctx, fr, px) {
  const sb = fr.sb_size || 64;
  ctx.strokeStyle = 'rgba(255,179,71,0.7)';
  ctx.lineWidth = 1.5 * px;
  ctx.beginPath();
  for (let x = 0; x <= fr.width; x += sb) { ctx.moveTo(x, 0); ctx.lineTo(x, fr.height); }
  for (let y = 0; y <= fr.height; y += sb) { ctx.moveTo(0, y); ctx.lineTo(fr.width, y); }
  ctx.stroke();
  const t = fr.tiles || {};
  if ((t.cols || 1) > 1 || (t.rows || 1) > 1) {
    ctx.setLineDash([6 * px, 4 * px]);
    ctx.strokeStyle = '#ff66c4';
    ctx.lineWidth = 2.5 * px;
    ctx.beginPath();
    // the last start is the end in superblocks: clamp it to the picture (partial last superblock)
    (t.col_start_sb || []).forEach((c) => { const x = Math.min(c * sb, fr.width); ctx.moveTo(x, 0); ctx.lineTo(x, fr.height); });
    (t.row_start_sb || []).forEach((r) => { const y = Math.min(r * sb, fr.height); ctx.moveTo(0, y); ctx.lineTo(fr.width, y); });
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Separate chroma-tree blocks (semi-decoupled partitioning) as dashed magenta.
function drawChromaTree(ctx, px) {
  const cb = state.chromaBlocks || [];
  if (!cb.length) return;
  ctx.strokeStyle = 'rgba(255,102,196,0.9)';
  ctx.lineWidth = 1.5 * px;
  ctx.setLineDash([3 * px, 2 * px]);
  ctx.beginPath();
  for (const b of cb) ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Diff mode: solid = samples differ at the focus stage, dashed = block fields
// differ, dotted = A has a block B does not (partition differs).  A dark
// underlay keeps the outline visible on any picture; the ring marks the
// first differing sample at a constant screen size.
function drawMismatch(ctx, px) {
  const fd = state.fdiff;
  if (!fd || fd.equal) return;
  const blocks = state.payload.blocks;
  const st = focusStage();
  const sets = [[st ? (fd.stages[st].blocks || []) : [], []],
    [(fd.field_blocks || []).map((x) => x[0]), [4 * px, 3 * px]],
    [fd.only_a || [], [1.5 * px, 2.5 * px]]];
  ctx.save();
  for (const [list, dash] of sets) {
    if (!list.length) continue;
    ctx.setLineDash(dash);
    const o = 2.5 * px;  // outset: stays visible around the selection outline
    const path = () => { ctx.beginPath(); for (const i of list) { const b = blocks[i]; if (b) ctx.rect(b[C.x] - o, b[C.y] - o, b[C.w] + 2 * o, b[C.h] + 2 * o); } };
    ctx.lineWidth = 4 * px; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; path(); ctx.stroke();
    ctx.lineWidth = 2 * px; ctx.strokeStyle = MISMATCH; path(); ctx.stroke();
  }
  ctx.setLineDash([]);
  const pt = st ? firstSample(fd.stages[st]) : null;
  if (pt) {
    const cx = pt[0] + 0.5, cy = pt[1] + 0.5, r = 12 * px, t = 6 * px;
    const ring = () => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.moveTo(cx - r - t, cy); ctx.lineTo(cx - r + t / 2, cy); ctx.moveTo(cx + r - t / 2, cy); ctx.lineTo(cx + r + t, cy);
      ctx.moveTo(cx, cy - r - t); ctx.lineTo(cx, cy - r + t / 2); ctx.moveTo(cx, cy + r - t / 2); ctx.lineTo(cx, cy + r + t);
    };
    ctx.lineWidth = 3.5 * px; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ring(); ctx.stroke();
    ctx.lineWidth = 1.6 * px; ctx.strokeStyle = MISMATCH; ring(); ctx.stroke();
  }
  ctx.restore();
}

function drawMotion(ctx, blocks, visible, px) {
  ctx.lineWidth = 1.5 * px;
  for (const b of blocks) {
    if (!visible(b) || b[C.pred] !== 'inter' || b[C.mv0_row] === null) continue;
    const cx = b[C.x] + b[C.w] / 2, cy = b[C.y] + b[C.h] / 2;
    const vecs = [[b[C.mv0_row], b[C.mv0_col], b[C.ref0], false]];
    if (b[C.ref1] && b[C.mv1_row] !== null) vecs.push([b[C.mv1_row], b[C.mv1_col], b[C.ref1], true]);
    for (const [r, c, ref, dashed] of vecs) {
      const dx = c / 8, dy = r / 8;
      ctx.strokeStyle = refColor(ref);
      ctx.fillStyle = refColor(ref);
      if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
        ctx.beginPath(); ctx.arc(cx, cy, 1.5 * px, 0, 7); ctx.fill();
        continue;
      }
      ctx.setLineDash(dashed ? [3 * px, 2 * px] : []);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
      ctx.setLineDash([]);
      const a = Math.atan2(dy, dx), L = Math.min(6 * px, Math.hypot(dx, dy) * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + dy);
      ctx.lineTo(cx + dx - L * Math.cos(a - 0.45), cy + dy - L * Math.sin(a - 0.45));
      ctx.lineTo(cx + dx - L * Math.cos(a + 0.45), cy + dy - L * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fill();
    }
  }
}
