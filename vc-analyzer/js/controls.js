// Toolbar chips, block selection and navigation, pointer and keyboard wiring.
import { C, FILLS, hasArch, hasChromaTree, LINES, state, usesQp } from './state.js?v=dfa6aefcca';
import { $, esc, fmt, setEmpty, setStatus } from './util.js?v=dfa6aefcca';
import { caps } from './data.js?v=dfa6aefcca';
import { buildPicture, pixelAt } from './planes.js?v=dfa6aefcca';
import { openSource, openStreamAt, renderPicker } from './source.js?v=dfa6aefcca';
import { renderBraidDebounced } from './braid.js?v=dfa6aefcca';
import { flipAB, gotoFirstMismatch, showStage } from './diff.js?v=dfa6aefcca';
import { blockAt, frameSummary, isChromaBlock, orderedFrames, selectFrame, stepFrame } from './frames.js?v=dfa6aefcca';
import { canvas, fitCanvasHeight, fitView, requestRender, setZoom, toImage, zoomAt } from './view.js?v=dfa6aefcca';
import { renderLegend } from './legend.js?v=dfa6aefcca';
import { blockObject, renderTab } from './inspector.js?v=dfa6aefcca';
import { aiFrameContext, copyBlockForAI, copyText } from './ai.js?v=dfa6aefcca';
import { writeHash } from './hash.js?v=dfa6aefcca';
import { openStreamDialog } from './open.js?v=dfa6aefcca';
import { openLibrary } from './library.js?v=dfa6aefcca';

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
  requestRender(); renderTab(); writeHash();
}
// Keep the selected block on screen after keyboard or coordinate navigation.
function revealSel() {
  if (state.sel < 0 || !state.payload) return;
  const b = state.payload.blocks[state.sel], { s, ox, oy } = state.view, r = canvas.getBoundingClientRect();
  const x0 = b[C.x] * s + ox, y0 = b[C.y] * s + oy, x1 = x0 + b[C.w] * s, y1 = y0 + b[C.h] * s;
  if (x0 < 0 || y0 < 0 || x1 > r.width || y1 > r.height) {
    state.view.ox = r.width / 2 - (b[C.x] + b[C.w] / 2) * s; state.view.oy = r.height / 2 - (b[C.y] + b[C.h] / 2) * s; requestRender();
  }
}
function selectAt(x, y) { const bi = blockAt(x, y); if (bi >= 0) { select(bi, [x, y]); revealSel(); } return bi; }
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

function hoverAt(px, py) {
  const [ix, iy] = toImage(px, py);
  const x = Math.floor(ix), y = Math.floor(iy);
  const bi = blockAt(x, y);
  const tip = $('#tooltip');
  if (bi !== state.hover) { state.hover = bi; requestRender(); }
  if (bi < 0) { tip.hidden = true; setStatus(state.payload ? frameSummary() : ''); return; }
  const b = state.payload.blocks[bi];
  const pix = pixelAt(x, y);
  tip.innerHTML = `<b>${esc(b[C.bsize])}</b> at (${b[C.x]}, ${b[C.y]})<br>${esc(b[C.pred])} ${esc(b[C.mode])}${b[C.ref0] ? ' ' + esc(b[C.ref0]) : ''}<br>${esc(b[C.tx_size])} q${b[C.qindex]} · ${fmt(b[C.bits] || 0, 1)} bits`;
  const wrap = $('#canvasWrap').getBoundingClientRect();
  tip.hidden = false;
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
    renderLegend(); requestRender(); writeHash();
  });
  $('#grayBtn').addEventListener('click', async () => {
    state.lumaOnly = !state.lumaOnly;
    $('#grayBtn').setAttribute('aria-pressed', String(state.lumaOnly));
    state.picture = await buildPicture(state.f);
    requestRender();
  });
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
  $('#folderInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    const man = files.filter((f) => f.name === 'manifest.json').sort((a, b) => a.webkitRelativePath.split('/').length - b.webkitRelativePath.split('/').length)[0];
    if (!man) { setEmpty('The chosen folder has no manifest.json. Pick the folder written by "python -m vca export".'); return; }
    const root = man.webkitRelativePath.slice(0, -'manifest.json'.length);
    const map = new Map();
    files.forEach((f) => { if (f.webkitRelativePath.startsWith(root)) map.set(f.webkitRelativePath.slice(root.length), f); });
    state.folderLabel = 'Local folder: ' + (root.replace(/\/$/, '') || man.webkitRelativePath);
    state.streamIdx = -1; state.openSeq++;
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
    } else drag = { x: e.offsetX, y: e.offsetY, ox: state.view.ox, oy: state.view.oy, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.s * d / pinch.d) / state.view.s, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
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
    }
    drag = null;
    canvas.classList.remove('panning');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { $('#tooltip').hidden = true; if (state.hover >= 0) { state.hover = -1; requestRender(); } });
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
    else if (k === 'c' && state.sel >= 0) copyBlockForAI();
    else if (k === 'Escape') select(-1);
    else if (k === 'x' && state.diff) flipAB();
    else {
      const f = FILLS.find((x) => x.key === k && (!x.arch || hasArch())); if (f) { setFill(f.id); return; }
      const l = LINES.find((x) => x.key === k); if (l && lineShown(l)) toggleLine(l.id);
    }
  });
}
