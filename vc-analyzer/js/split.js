// F36 (R49, F-b track Y): split and side-by-side views.
// Split: one picture area; right of a draggable divider the second picture replaces the first, the
// overlays run across both.  Side by side: two panes that share one scale and pan (state.view) with an
// origin each; on a narrow screen they are stacked.  The second picture (state.cmp.stage2: any entry of the
// pixel stage list, B: and A − B in diff mode too) is built here when the frame, its stage or the look
// changes.  Single mode draws and maps exactly as before (one pane = the whole canvas).
import { stageLabel, state } from './state.js?v=9ce97af84e';
import { buildPicture, currentLookKey } from './planes.js?v=9ce97af84e';
import { canvas, requestRender } from './view.js?v=9ce97af84e';
import { stageOptions } from './source.js?v=9ce97af84e';

export const GAP = 6;   // CSS px between side-by-side panes
export const MODES = [
  { id: 'single', label: 'Single view' }, { id: 'split', label: 'Split view' }, { id: 'side', label: 'Side by side' },
];
export const cmpMode = () => (state.payload ? state.cmp.mode : 'single');
export const stacked = () => window.innerWidth <= 860;

// Pane rectangles (CSS px) of a cw x ch area: one pane = the whole area in single and split mode.
export function paneRects(cw, ch, { mode = cmpMode(), vertical = stacked() } = {}) {
  if (mode !== 'side') return [{ x: 0, y: 0, w: cw, h: ch }];
  if (vertical) { const h = (ch - GAP) / 2; return [{ x: 0, y: 0, w: cw, h }, { x: 0, y: h + GAP, w: cw, h }]; }
  const w = (cw - GAP) / 2;
  return [{ x: 0, y: 0, w, h: ch }, { x: w + GAP, y: 0, w, h: ch }];
}
// The pane under a canvas point (in the gap between panes: the nearer one), with its index.
export function paneAt(px, py, cw, ch) {
  const ps = paneRects(cw, ch);
  let best = 0, bd = Infinity;
  ps.forEach((p, i) => {
    const dx = Math.max(p.x - px, 0, px - (p.x + p.w)), dy = Math.max(p.y - py, 0, py - (p.y + p.h));
    if (dx + dy < bd) { bd = dx + dy; best = i; }
  });
  return { ...ps[best], i: best };
}

// ------------------------------------------------------------ sources
// The second picture's stage: the one chosen, else a useful default (B in diff mode, else the stage
// before the loop filters or the output).
export function stage2() {
  const opts = state.manifest ? stageOptions() : [];
  if (state.cmp.stage2 && opts.includes(state.cmp.stage2)) return state.cmp.stage2;
  const base = state.stage.includes(':') ? state.stage.slice(2) : state.stage;
  const pick = state.diff ? ['B:' + base, 'B:recon', 'D:' + base] : (state.stage === 'recon' ? ['prefilter', 'pred'] : ['recon']);
  return pick.find((s) => opts.includes(s) && s !== state.stage) || opts.find((s) => s !== state.stage) || state.stage;
}
let pic2 = null, building = null;
// The second picture when it matches the frame, stage and look on screen; null while it is built
// (start = build it then).
export function picture2(start = true) {
  if (cmpMode() === 'single' || !state.payload) return null;
  const f = state.payload.f, st = stage2(), key = `${f}|${st}|${currentLookKey()}|${state.fdiff ? 'd' : ''}`;
  if (pic2 && pic2.key === key) return pic2;
  if (start && (!building || building.key !== key)) {
    const job = { key };
    building = job;
    buildPicture(f, st).then((p) => {
      if (building !== job) return;
      building = null;
      pic2 = Object.assign(p, { key, stage2: st });
      requestRender();
    });
  }
  return null;
}
// A new stream: forget the second picture (its frame numbers belong to the old one).
export function resetPanes() { pic2 = null; building = null; }

// ------------------------------------------------------------ split divider
const cssWidth = () => canvas.getBoundingClientRect().width;
export const splitX = (cw = cssWidth()) => state.cmp.pos * cw;
// image x of the divider on screen (the whole-frame PNG puts it at the same place in the picture)
export const splitImageX = () => (splitX() - state.view.ox) / state.view.s;
export const nearDivider = (px) => cmpMode() === 'split' && Math.abs(px - splitX()) <= 8;
export function setSplitPos(px) {
  const w = cssWidth();
  state.cmp.pos = Math.max(0.02, Math.min(0.98, px / (w || 1)));
  requestRender();
}

// ------------------------------------------------------------ chrome
// Labels for the panes (which picture is where) and the split divider, in CSS px at device scale k.
export function paneLabels() {
  const a = stageLabel(state.stage) || state.stage, b = stageLabel(stage2()) || stage2();
  return [a, b];
}
function label(ctx, k, text, x, y, right = false) {
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif').trim();
  ctx.font = `600 ${12 * k}px ${font}`;
  const w = ctx.measureText(text).width + 12 * k, h = 20 * k;
  const x0 = right ? x * k - w : x * k;
  ctx.fillStyle = 'rgba(16,19,24,0.82)';
  ctx.fillRect(x0, y * k, w, h);
  ctx.fillStyle = '#e6e9ee';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + 6 * k, y * k + h / 2);
}
export function drawSplitChrome(ctx, cw, ch, k, x) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x * k - 2 * k, 0, 4 * k, ch * k);
  ctx.fillStyle = '#e6e9ee'; ctx.fillRect(x * k - 1 * k, 0, 2 * k, ch * k);
  // the grip in the middle of the divider
  ctx.fillStyle = '#e6e9ee'; ctx.fillRect(x * k - 5 * k, ch * k / 2 - 14 * k, 10 * k, 28 * k);
  ctx.fillStyle = 'rgba(16,19,24,0.9)';
  for (const dy of [-7, 0, 7]) ctx.fillRect(x * k - 3 * k, ch * k / 2 + (dy - 1) * k, 6 * k, 2 * k);
  const [a, b] = paneLabels();
  label(ctx, k, a, 6, 6);
  label(ctx, k, b, cw - 6, 6, true);
  ctx.restore();
}
export function drawPaneLabel(ctx, k, P, i) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  label(ctx, k, paneLabels()[i], P.x + 6, P.y + 6);
  ctx.restore();
}

// read-only state for window.__vca.snap().pixels.cmp
export function splitSnap() {
  const r = canvas.getBoundingClientRect(), mode = cmpMode();
  const p2 = mode === 'single' ? null : picture2(false);
  return {
    mode: state.cmp.mode, stage2: mode === 'single' ? state.cmp.stage2 : stage2(), pos: state.cmp.pos,
    divider: mode === 'split' ? splitX(r.width) : null, stacked: mode === 'side' && stacked(),
    panes: paneRects(r.width, r.height).map((p, i) => ({ ...p, stage: i ? stage2() : state.stage })),
    labels: mode === 'single' ? [] : paneLabels(), ready2: mode === 'single' || !!p2,
  };
}
