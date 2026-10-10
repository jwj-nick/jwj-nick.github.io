// Toolbar chips, block selection and navigation, pointer and keyboard wiring.
import { C, FILLS, hasArch, hasChromaTree, LINES, state, usesQp } from './state.js?v=9ce97af84e';
import { $, esc, fmt, setEmpty, setStatus } from './util.js?v=9ce97af84e';
import { caps } from './data.js?v=9ce97af84e';
import { buildPicture, pixelAt, pixelPending } from './planes.js?v=9ce97af84e';
import { cycleComp, cycleViewMode, syncPaneSelect, toggleGray, toggleGrid } from './pixels.js?v=9ce97af84e';
import { cmpMode, nearDivider, paneLabels, paneRects, setSplitPos } from './split.js?v=9ce97af84e';
import { openSource, openStreamAt, renderPicker } from './source.js?v=9ce97af84e';
import { renderBraidDebounced, toggleArcs } from './braid.js?v=9ce97af84e';
import { openDecoder } from './decoder.js?v=9ce97af84e';
import { toggleFilmstrip } from './filmstrip.js?v=9ce97af84e';
import { flipAB, gotoFirstMismatch, showStage } from './diff.js?v=9ce97af84e';
import { blockAt, frameSummary, isChromaBlock, orderedFrames, selectFrame, stepFrame } from './frames.js?v=9ce97af84e';
import { canvas, fitCanvasHeight, fitView, pictureAt, requestRender, setZoom, toImage, zoomAt } from './view.js?v=9ce97af84e';
import { renderLegend } from './legend.js?v=9ce97af84e';
import { blockObject, renderTab } from './inspector.js?v=9ce97af84e';
import { aiFrameContext, copyBlockForAI, copyText } from './ai.js?v=9ce97af84e';
import { writeHash } from './hash.js?v=9ce97af84e';
import { openStreamDialog } from './open.js?v=9ce97af84e';
import { openLibrary } from './library.js?v=9ce97af84e';
import { openExport } from './export.js?v=9ce97af84e';
import { openCompare } from './compare.js?v=9ce97af84e';
import { bitstreamSelChanged, openBitstream } from './bitstream.js?v=9ce97af84e';
import { openGraphs } from './graphs.js?v=9ce97af84e';

// ------------------------------------------------------------ controls
export function renderChips() {
  $('#fillGroup').innerHTML = FILLS.filter((f) => !f.arch || hasArch()).map((f) => (f.id === 'qindex' && usesQp() ? { ...f, label: 'QP' } : f)).map((f) => `<button class="chip" data-fill="${f.id}" aria-pressed="${state.fill === f.id}" title="${f.arch ? 'Provisional L0 HW estimate from placeholder parameters, not a validated model. ' : ''}Fill blocks by ${f.label.toLowerCase()} (${f.key})">${f.label}<span class="hk">${f.key}</span></button>`).join('');
  $('#lineGroup').innerHTML = LINES.filter(lineShown).map((l) => `<button class="chip" data-line="${l.id}" aria-pressed="${state.lines.has(l.id)}" title="${l.label} (${l.key})">${l.label}<span class="hk">${l.key}</span></button>`).join('');
}
function setFill(id) { state.fill = id; renderChips(); renderLegend(); requestRender(); writeHash(); }
function lineShown(l) { return (!l.diffOnly || state.diff) && (!l.chromaTree || hasChromaTree()); }
function toggleLine(id) { state.lines.has(id) ? state.lines.delete(id) : state.lines.add(id); renderChips(); requestRender(); writeHash(); }
// `at` = the picked luma pixel (default: the block's origin).
function select(bi, at) {
  state.sel = bi;
  // A pick made while a frame loads must survive that load (selectFrame reads it).
  const pb = bi >= 0 && state.payload ? state.payload.blocks[bi] : null;
  state.pickGen++; state.pickAt = at || (pb ? [pb[C.x], pb[C.y]] : null);
  state.autoPick = false;
  if (state.tab !== 'syntax') state.tab = 'block';
  requestRender(); renderTab(); writeHash(); bitstreamSelChanged();
}
// Keep the selected block on screen after keyboard or coordinate navigation.
function revealSel() {
  if (state.sel < 0 || !state.payload) return;
  const b = state.payload.blocks[state.sel], { s, ox, oy } = state.view, c = canvas.getBoundingClientRect();
  const r = paneRects(c.width, c.height)[0];   // the first pane (side by side: half the canvas)
  const x0 = b[C.x] * s + ox, y0 = b[C.y] * s + oy, x1 = x0 + b[C.w] * s, y1 = y0 + b[C.h] * s;
  if (x0 < 0 || y0 < 0 || x1 > r.w || y1 > r.h) {
    state.view.ox = r.w / 2 - (b[C.x] + b[C.w] / 2) * s; state.view.oy = r.h / 2 - (b[C.y] + b[C.h] / 2) * s; requestRender();
  }
}
function selectAt(x, y) { const bi = blockAt(x, y); if (bi >= 0) { select(bi, [x, y]); revealSel(); } return bi; }
// Goes to frame f and selects the luma block at (x, y) there, as a click on it does (Graphs block search).
// Selects block bi of the frame on screen as a click on it does (the Bitstream dialog's byte click).
export function selectBlockIndex(bi) { if (state.payload && state.payload.blocks[bi]) select(bi); }
export async function pickBlock(f, x, y) {
  if (state.f !== f || !state.payload || state.payload.frame.f !== f) await selectFrame(f);
  if (state.f === f && state.payload && state.payload.frame.f === f) selectAt(x, y);
}
// Neighbour of the selected block: the block covering the first pixel just past its edge.
function stepBlock(dx, dy) {
  if (!state.payload) return;
  if (state.sel < 0) { selectAt(0, 0); return; }
  const b = state.payload.blocks[state.sel];
  const x = dx < 0 ? b[C.x] - 1 : dx > 0 ? b[C.x] + b[C.w] : b[C.x];
  const y = dy < 0 ? b[C.y] - 1 : dy > 0 ? b[C.y] + b[C.h] : b[C.y];
  selectAt(x, y);
}
function selectCostliest() {
  if (!state.payload) return;
  let best = -1, bits = -1;
  state.payload.blocks.forEach((b, i) => { if (!isChromaBlock(i) && (b[C.bits] || 0) > bits) { bits = b[C.bits] || 0; best = i; } });
  if (best >= 0) { select(best); revealSel(); }
}
function gotoTyped() {
  const m = $('#gotoXY').value.match(/(-?\d+)\D+(-?\d+)/);
  const ok = m && selectAt(+m[1], +m[2]) >= 0;
  $('#gotoXY').classList.toggle('bad', !ok);
}

let lastHover = null;   // the pointer position of the last hover (a late exact-value load writes the line only for it)
// tap: a touch or pen tap (no hover outline, no tooltip; the status line only)
function hoverAt(px, py, tap = false) {
  const at = [px, py];
  lastHover = at;
  const [ix, iy] = toImage(px, py);
  const x = Math.floor(ix), y = Math.floor(iy);
  const bi = blockAt(x, y);
  const tip = $('#tooltip');
  if (!tap && bi !== state.hover) { state.hover = bi; requestRender(); }
  if (bi < 0) { tip.hidden = true; setStatus(state.payload ? frameSummary() : ''); return; }
  const b = state.payload.blocks[bi];
  // the values of the picture under the pointer (split / side by side: the second one there), exact at any
  // bit depth; when they are still loading, the line is written again once they are there
  const pic = pictureAt(px, py), mode = cmpMode();
  let pix = pic ? pixelAt(x, y, pic) : '';
  const wait = pixelPending();
  if (wait) wait.then(() => { if (lastHover === at) hoverAt(px, py, tap); });
  if (mode !== 'single' && pic) pix = `${paneLabels()[pic === state.picture ? 0 : 1]}: ${pix}`;
  tip.innerHTML = `<b>${esc(b[C.bsize])}</b> at (${b[C.x]}, ${b[C.y]})<br>${esc(b[C.pred])} ${esc(b[C.mode])}${b[C.ref0] ? ' ' + esc(b[C.ref0]) : ''}<br>${esc(b[C.tx_size])} q${b[C.qindex]} · ${fmt(b[C.bits] || 0, 1)} bits`;
  const wrap = $('#canvasWrap').getBoundingClientRect();
  tip.hidden = tap;
  const tx = Math.min(px + 14, wrap.width - tip.offsetWidth - 6), ty = Math.min(py + 14, wrap.height - tip.offsetHeight - 6);
  tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
  setStatus(`x ${x}  y ${y}   ${pix}   block ${b[C.bsize]} at (${b[C.x]}, ${b[C.y]})   ${b[C.pred]} ${b[C.mode]}   ${fmt(b[C.bits] || 0, 2)} bits`);
}

export function wire() {
  renderChips();
  $('#fillGroup').addEventListener('click', (e) => { const b = e.target.closest('[data-fill]'); if (b) setFill(b.dataset.fill); });
  $('#lineGroup').addEventListener('click', (e) => { const b = e.target.closest('[data-line]'); if (b) toggleLine(b.dataset.line); });
  $('#gotoBtn').addEventListener('click', gotoTyped);
  $('#gotoXY').addEventListener('keydown', (e) => { if (e.key === 'Enter') gotoTyped(); });
  $('#costBtn').addEventListener('click', selectCostliest);
  $('#opacity').addEventListener('input', (e) => { state.opacity = e.target.value / 100; requestRender(); });
  $('#stageSelect').addEventListener('change', async (e) => {
    state.stage = e.target.value;
    state.picture = await buildPicture(state.f);
    syncPaneSelect();
    renderLegend(); requestRender(); writeHash();
  });
  // Gray picture = the Y plane, else colour (the component select and key y in pixels.js)
  $('#grayBtn').addEventListener('click', toggleGray);
  $('#prevFrame').addEventListener('click', () => stepFrame(-1));
  $('#nextFrame').addEventListener('click', () => stepFrame(1));
  $('#zoomFit').addEventListener('click', fitView);
  $('#zoom1').addEventListener('click', () => setZoom(1));
  $('#zoomIn').addEventListener('click', () => setZoom(state.view.s * 1.5));
  $('#zoomOut').addEventListener('click', () => setZoom(state.view.s / 1.5));
  $('#helpBtn').addEventListener('click', () => $('#helpDialog').showModal());
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { state.tab = b.dataset.tab; renderTab(); writeHash(); } });
  $('#tabBody').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'copy-ai') copyBlockForAI();
      else if (a === 'copy-json') { const { o, ext } = blockObject(state.sel); copyText(JSON.stringify({ ...o, ext }, null, 1)); }
      else if (a === 'copy-frame') copyText(aiFrameContext());
      else if (a === 'more') { state.symLimit += 1000; renderTab(); }
      else if (a === 'order') { state.order = state.order === 'output' ? 'decode' : 'output'; renderTab(); }
      else if (a === 'goto') { state.sel = +act.dataset.block; state.autoPick = false; requestRender(); renderTab(); writeHash(); }
      else if (a === 'goto-mismatch') gotoFirstMismatch();
      else if (a === 'show-stage') showStage(act.dataset.stage);
      else if (a === 'flip') flipAB();
      return;
    }
    const row = e.target.closest('[data-block]');
    if (row && +row.dataset.block >= 0) { state.sel = +row.dataset.block; requestRender(); renderTab(); writeHash(); }
  });
  $('#diffBar').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && b.dataset.act === 'goto-mismatch') gotoFirstMismatch(); });
  $('#braid').addEventListener('click', (e) => { const r = e.target.closest('[data-f]'); if (r && r.dataset.f !== '') selectFrame(+r.dataset.f); });
  $('#streamSelect').addEventListener('change', (e) => { const i = +e.target.value; if (state.streams[i]) openStreamAt(i); });
  // The stream picker and the toolbar's lists (pixel stage, second picture, component, matrix, range, view mode)
  // keep the keys while they have the focus, so the shortcuts stopped after one was used (R49 QA).  A choice made
  // with the mouse gives the focus to the picture at once; one made with the keyboard keeps it on the list (its
  // arrow keys keep stepping the options), and Escape there gives the keys back to the picture.
  const LISTS = '#streamSelect, .toolbar select';
  let pointerList = null;
  const toPicture = () => canvas.focus({ preventScroll: true });
  document.addEventListener('pointerdown', (e) => { pointerList = e.target.closest ? e.target.closest(LISTS) : null; }, true);
  document.addEventListener('keydown', (e) => {
    const s = e.target.closest && e.target.closest(LISTS);
    if (!s) return;
    pointerList = null;
    if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      toPicture();
      setStatus('The keys go to the picture again: arrow keys step frames, letters switch fills and lines.');
    }
  }, true);
  document.addEventListener('change', (e) => {
    const s = e.target.closest && e.target.closest(LISTS);
    if (s && s === pointerList) { pointerList = null; toPicture(); }
  });
  $('#folderInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    const man = files.filter((f) => f.name === 'manifest.json').sort((a, b) => a.webkitRelativePath.split('/').length - b.webkitRelativePath.split('/').length)[0];
    if (!man) { setEmpty('The chosen folder has no manifest.json. Pick the folder written by "python -m vca export".'); return; }
    const root = man.webkitRelativePath.slice(0, -'manifest.json'.length);
    const map = new Map();
    files.forEach((f) => { if (f.webkitRelativePath.startsWith(root)) map.set(f.webkitRelativePath.slice(root.length), f); });
    state.folderLabel = 'Local folder: ' + (root.replace(/\/$/, '') || man.webkitRelativePath);
    state.streamIdx = -1; state.openSeq++;
    // another stream: the hash (frame, stage, block) belonged to the one shown before, as in openStreamAt
    if (state.manifest) history.replaceState(null, '', location.pathname + location.search);
    const opened = openSource({ kind: 'files', map }, root);   // sets state.source before its first await
    renderPicker();
    return opened;
  });

  // pointer: pan, click, hover, pinch
  const pointers = new Map();
  let drag = null, pinch = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: state.view.s };
      drag = null;
    } else if (nearDivider(e.offsetX)) drag = { divider: true, moved: true };   // split view: move the divider
    else drag = { x: e.offsetX, y: e.offsetY, ox: state.view.ox, oy: state.view.oy, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.s * d / pinch.d) / state.view.s, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (drag && drag.divider) { setSplitPos(e.offsetX); renderLegend(); return; }
    canvas.classList.toggle('on-divider', !drag && nearDivider(e.offsetX));
    if (drag) {
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; canvas.classList.add('panning'); $('#tooltip').hidden = true; }
      if (drag.moved) { state.view.ox = drag.ox + dx; state.view.oy = drag.oy + dy; requestRender(); }
      return;
    }
    hoverAt(e.offsetX, e.offsetY);
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && !drag.moved && e.type === 'pointerup') {
      const [ix, iy] = toImage(e.offsetX, e.offsetY);
      const at = [Math.floor(ix), Math.floor(iy)];
      select(blockAt(at[0], at[1]), at);
      // a tap (touch, pen) has no hover: the status line gets the sample values of the tapped pixel
      if (e.pointerType && e.pointerType !== 'mouse') hoverAt(e.offsetX, e.offsetY, true);
    }
    drag = null;
    canvas.classList.remove('panning');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') lastHover = null; $('#tooltip').hidden = true; if (state.hover >= 0) { state.hover = -1; requestRender(); } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); }, { passive: false });
  window.addEventListener('resize', () => { renderBraidDebounced(); fitCanvasHeight(); requestRender(); });

  document.addEventListener('keydown', (e) => {
    if ((e.target.closest && e.target.closest('input, select, textarea')) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;   // Help, Open stream, Library: their own keys
    const k = e.key;
    if (e.shiftKey && k.startsWith('Arrow')) {
      stepBlock(k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0); e.preventDefault();
    }
    else if (k === 'e') selectCostliest();
    else if (k === 'ArrowLeft') { stepFrame(-1); e.preventDefault(); }
    else if (k === 'ArrowRight') { stepFrame(1); e.preventDefault(); }
    else if (k === 'Home' && state.manifest) selectFrame(orderedFrames()[0].f);
    else if (k === 'End' && state.manifest) { const l = orderedFrames(); selectFrame(l[l.length - 1].f); }
    else if (k === '0') fitView();
    else if (k === '1') setZoom(1);
    else if (k === '+' || k === '=') setZoom(state.view.s * 1.5);
    else if (k === '-' || k === '_') setZoom(state.view.s / 1.5);
    else if (k === '?') $('#helpDialog').showModal();
    // o, l: server only (the modules check caps); no default, so the key does not type into the dialog's text box
    else if (k === 'o' && caps.jobs) { e.preventDefault(); openStreamDialog(); }
    else if (k === 'l' && caps.server) { e.preventDefault(); openLibrary(); }
    else if (k === 'a' && caps.jobs) { e.preventDefault(); openCompare(); }
    else if (k === 'c' && state.sel >= 0) copyBlockForAI();
    else if (k === 'k' && state.payload) { e.preventDefault(); openExport(); }
    else if (k === 'u' && state.manifest) { e.preventDefault(); openBitstream(); }
    else if (k === 'G' && state.manifest) { e.preventDefault(); openGraphs(); }   // g is the block grid
    else if (k === 'Escape') select(-1);
    else if (k === 'x' && state.diff) flipAB();
    // F-b track Y (pixels.js): component, sample grid, single / split / side-by-side view
    else if (k === 'y' && state.manifest) cycleComp();
    else if (k === 'i' && state.manifest) toggleGrid();
    else if (k === 'j' && state.manifest) cycleViewMode();
    // F-c track C: Decoder state dialog, timeline reference arcs, filmstrip (r and f stay the fills)
    else if (k === 'D' && state.manifest) { e.preventDefault(); openDecoder(); }
    else if (k === 'R' && state.manifest) toggleArcs();
    else if (k === 'F' && state.manifest) toggleFilmstrip();
    else {
      const f = FILLS.find((x) => x.key === k && (!x.arch || hasArch())); if (f) { setFill(f.id); return; }
      const l = LINES.find((x) => x.key === k); if (l && lineShown(l)) toggleLine(l.id);
    }
  });
}
