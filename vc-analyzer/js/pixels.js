// F-b track Y (R49, D-115): the picture's component (colour, Y, U, V) with its colour matrix and range (F23),
// the exact sample grid (F24, grid.js) and the split and side-by-side views (F36, split.js): the toolbar's
// #pixelTools group, the keys y, i, j, the legend and caption words, and the probe's pixels part.
import { state } from './state.js?v=9ce97af84e';
import { $, esc } from './util.js?v=9ce97af84e';
import { buildPicture, MATRICES, pictureLook } from './planes.js?v=9ce97af84e';
import { fitView, requestRender } from './view.js?v=9ce97af84e';
import { renderLegend } from './legend.js?v=9ce97af84e';
import { gridLegend, gridSnap } from './grid.js?v=9ce97af84e';
import { cmpMode, MODES, paneLabels, resetPanes, splitSnap, stage2 } from './split.js?v=9ce97af84e';

const COMPS = [
  { id: 'colour', label: 'Colour' }, { id: 'y', label: 'Y plane' }, { id: 'u', label: 'U plane' }, { id: 'v', label: 'V plane' },
];
const RANGES = { limited: 'Limited range', full: 'Full range' };
const mono = () => !!(state.manifest && (state.manifest.stream.sequence || {}).monochrome);
const subWords = () => {
  const seq = (state.manifest && state.manifest.stream.sequence) || {};
  const sx = 1 << (seq.subsampling_x ?? 1), sy = 1 << (seq.subsampling_y ?? 1);
  return sx * sy > 1 ? `each sample over its ${sx}x${sy} luma pixels` : 'one sample per luma pixel';
};

// ------------------------------------------------------------ the look
async function redraw() {
  if (!state.manifest) { renderPixelTools(); return; }
  state.picture = await buildPicture(state.f);
  renderPixelTools(); renderLegend(); requestRender();
}
// The component: also what "Gray picture" (#grayBtn) toggles (Y or colour); state.lumaOnly follows it.
export function setComp(c) {
  state.comp = c;
  state.lumaOnly = c === 'y';
  return redraw();
}
export const toggleGray = () => setComp(state.comp === 'y' ? 'colour' : 'y');
// y: Y, U, V, colour in turn (luma and colour only for a monochrome stream)
export function cycleComp() {
  const ids = COMPS.map((c) => c.id).filter((id) => !mono() || id === 'y' || id === 'colour');
  const order = ['y', 'u', 'v', 'colour'].filter((id) => ids.includes(id));
  return setComp(order[(order.indexOf(state.comp) + 1) % order.length]);
}
export function toggleGrid() { state.grid = !state.grid; renderPixelTools(); renderLegend(); requestRender(); }
function toggleBase() { state.gridBase = state.gridBase === 16 ? 10 : 16; renderPixelTools(); renderLegend(); requestRender(); }

// ------------------------------------------------------------ view mode
export function setViewMode(m) {
  const was = state.cmp.mode;
  if (m === was) return;
  state.cmp.mode = m;
  renderPixelTools();
  // the panes change size (side by side): fit the frame into the first pane again
  if (state.payload && (m === 'side' || was === 'side')) fitView();
  renderLegend(); requestRender();
}
export const cycleViewMode = () => setViewMode(MODES[(MODES.findIndex((x) => x.id === state.cmp.mode) + 1) % MODES.length].id);
function setStage2(st) { state.cmp.stage2 = st; renderPixelTools(); renderLegend(); requestRender(); }

// ------------------------------------------------------------ toolbar
// A new stream: the colour choices go back to Auto (they belong to a stream), the second picture to its
// default; the component and the view mode stay.
export function pixelsOpened(keepView) {
  if (!keepView) { state.matrix = 'auto'; state.range = 'auto'; state.cmp.stage2 = null; }
  if (mono() && (state.comp === 'u' || state.comp === 'v')) { state.comp = 'y'; state.lumaOnly = true; }
  resetPanes();
  renderPixelTools();
}
function renderPixelTools() {
  const L = pictureLook();
  const opt = (v, label, cur, off = false) => `<option value="${v}"${v === cur ? ' selected' : ''}${off ? ' disabled' : ''}>${esc(label)}</option>`;
  $('#compSelect').innerHTML = COMPS.map((c) => opt(c.id, c.label, state.comp, mono() && (c.id === 'u' || c.id === 'v'))).join('');
  const sig = L.signalled ? `the stream signals ${L.signalled}` : 'not signalled';
  $('#matrixSelect').innerHTML = opt('auto', `Auto: ${MATRICES[L.autoMatrix].label}`, state.matrix)
    + Object.entries(MATRICES).map(([id, m]) => opt(id, m.label, state.matrix)).join('');
  $('#matrixSelect').title = `Colour matrix that turns Y, U, V into the colour picture. Auto = what the stream header signals (${sig}${L.nearest ? `, drawn as ${MATRICES[L.autoMatrix].label}` : ''}${L.unknown ? ', not supported here: drawn as BT.601' : ''}), else BT.601. Identity: the planes hold G, B, R (RGB streams). Choosing one shows the colour picture.`;
  $('#rangeSelect').innerHTML = opt('auto', `Auto: ${L.autoRange}`, state.range) + Object.entries(RANGES).map(([id, label]) => opt(id, label, state.range)).join('');
  $('#rangeSelect').title = `Sample range: limited (video levels, Y 16 to 235) or full (0 to 255). Auto = what the stream header signals (${L.signalledRange || 'not signalled'}), else limited. Applies to the colour picture and the gray planes.`;
  $('#matrixSelect').disabled = mono();
  $('#grayBtn').setAttribute('aria-pressed', String(state.comp === 'y'));
  $('#gridBtn').setAttribute('aria-pressed', String(!!state.grid));
  $('#gridBaseBtn').hidden = !state.grid;
  $('#gridBaseBtn').setAttribute('aria-pressed', String(state.gridBase === 16));
  $('#viewModeSelect').innerHTML = MODES.map((m) => opt(m.id, m.label, state.cmp.mode)).join('');
  $('#paneSelect').hidden = state.cmp.mode === 'single';
  syncPaneSelect();
}
// the second picture's select shows the stage drawn (its default follows the first picture's stage)
export function syncPaneSelect() {
  const sel = $('#paneSelect');
  if (!state.manifest || !sel.options.length) return;
  const want = stage2();
  if (sel.value !== want) sel.value = want;
}

// ------------------------------------------------------------ words
// Notes for the legend under the picture (and so for the PNG strip).
export function pixelsLegend() {
  const out = [];
  if (!state.picture || !state.picture.src) return out;
  const L = pictureLook();
  const from = state.matrix === 'auto' && state.range === 'auto' ? (L.signalled || L.signalledRange ? ' (from the stream header)' : '') : '';
  // what a plane holds: Cb / Cr, or G, B, R with the identity matrix (RGB streams)
  const holds = (c) => (L.matrix === 'identity' ? { y: 'G', u: 'B', v: 'R' }[c] : { y: 'luma', u: 'Cb', v: 'Cr' }[c]);
  if (!mono() && (L.comp === 'u' || L.comp === 'v')) out.push(`${L.comp.toUpperCase()} plane (${holds(L.comp)}) as gray, ${subWords()}, ${L.range} range.`);
  else if (L.comp === 'y' && (L.range === 'full' || L.matrix === 'identity')) out.push(`Y plane (${holds('y')}) as gray, ${L.range} range.`);
  else if (L.comp === 'colour' && !mono() && (L.matrix !== 'bt601' || L.range !== 'limited' || state.matrix !== 'auto' || state.range !== 'auto')) {
    const m = L.matrix === 'identity' ? 'identity matrix (the planes hold G, B, R)' : MATRICES[L.matrix].label;
    out.push(`Colour: ${m}, ${L.range} range${from}.`);
  }
  const g = gridLegend();
  if (g) out.push(g);
  if (cmpMode() !== 'single') {
    const [a, b] = paneLabels();
    out.push(cmpMode() === 'split' ? `Split view: ${a} left of the divider, ${b} right of it (drag the divider).` : `Side by side: ${a} and ${b}, same zoom and position.`);
  }
  return out;
}
// Words for the PNG caption after the stage.
export function pixelsCaption() {
  const L = pictureLook();
  const parts = [];
  if (L.comp === 'y') parts.push('gray');
  else if (L.comp === 'u' || L.comp === 'v') parts.push(`${L.comp.toUpperCase()} plane`);
  else if (!mono() && (L.matrix !== 'bt601' || L.range !== 'limited')) parts.push(`${L.matrix === 'identity' ? 'identity (GBR)' : MATRICES[L.matrix].label} ${L.range} range`);
  if (state.grid) parts.push(`sample values ${state.gridBase === 16 ? 'in hex' : 'in decimal'}`);
  if (cmpMode() !== 'single') parts.push(`${cmpMode() === 'split' ? 'split with' : 'side by side with'} ${paneLabels()[1]}`);
  return parts.length ? ', ' + parts.join(', ') : '';
}

// ------------------------------------------------------------ wiring
export function initPixels() {
  // the state's default component follows "Gray picture" (on at start: the Y plane)
  state.comp = state.lumaOnly ? 'y' : 'colour';
  renderPixelTools();
  $('#compSelect').addEventListener('change', (e) => setComp(e.target.value));
  // a matrix chosen while a plane is shown: show the colour picture with it
  $('#matrixSelect').addEventListener('change', (e) => { state.matrix = e.target.value; if (state.comp !== 'colour' && !mono()) setComp('colour'); else redraw(); });
  $('#rangeSelect').addEventListener('change', (e) => { state.range = e.target.value; redraw(); });
  $('#gridBtn').addEventListener('click', toggleGrid);
  $('#gridBaseBtn').addEventListener('click', toggleBase);
  $('#viewModeSelect').addEventListener('change', (e) => setViewMode(e.target.value));
  $('#paneSelect').addEventListener('change', (e) => setStage2(e.target.value));
}
// Read-only view for window.__vca.snap() (tests).
export function pixelsSnap() {
  const L = pictureLook();
  return {
    comp: state.comp, matrix: state.matrix, range: state.range,
    look: { matrix: L.matrix, range: L.range, autoMatrix: L.autoMatrix, autoRange: L.autoRange },
    picture: state.picture ? { f: state.picture.f, stage: state.picture.stage, look: state.picture.look } : null,
    grid: gridSnap(), cmp: splitSnap(),
  };
}
