// Opening a bundle: manifest, header facts and the pixel stage list; the stream picker.
import { BASE_STAGES, C, FILLS, hasArch, stageLabel, state } from './state.js?v=9ce97af84e';
import { $, esc, fmt, FRAME_COLORS, setEmpty, setStatus, typeName } from './util.js?v=9ce97af84e';
import { caps, getJSON, listStreams, streamTitle } from './data.js?v=9ce97af84e';
import { server } from './api.js?v=9ce97af84e';
import { renderBraid } from './braid.js?v=9ce97af84e';
import { renderDiffBar } from './diff.js?v=9ce97af84e';
import { selectFrame } from './frames.js?v=9ce97af84e';
import { renderTab, renderTabs } from './inspector.js?v=9ce97af84e';
import { requestRender } from './view.js?v=9ce97af84e';
import { parseHash } from './hash.js?v=9ce97af84e';
import { renderChips } from './controls.js?v=9ce97af84e';
import { renderJobs } from './jobs.js?v=9ce97af84e';
import { stage2 } from './split.js?v=9ce97af84e';
import { pixelsOpened } from './pixels.js?v=9ce97af84e';
import { loadRefgraph } from './refsview.js?v=9ce97af84e';

// ------------------------------------------------------------ picker
// The picker lists state.streams; an opened folder keeps its own extra option.
export function renderPicker() {
  const sel = $('#streamSelect');
  const opts = state.streams.map((s, i) => `<option value="${i}" ${i === state.streamIdx ? 'selected' : ''}>${esc(streamTitle(s))}</option>`);
  if (state.source && state.source.kind === 'files') opts.push(`<option value="-1" selected>${esc(state.folderLabel || 'Local folder')}</option>`);
  // nothing of the list on screen (the shown entry is gone): the picker does not pretend the first one is
  else if (state.streamIdx < 0 && opts.length) opts.unshift('<option value="" selected disabled>Choose an analysis</option>');
  sel.innerHTML = opts.length ? opts.join('') : '<option>No stream</option>';
  // the whole name of the entry shown: the closed picker is cut at 240 px on a desktop with jobs (app.css)
  const shown = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].textContent : '';
  sel.title = shown && sel.value !== '' ? shown : 'Choose a stream';
  renderJobs();
}
// Re-reads the server's library into the picker, keeping the open stream selected.
export async function refreshStreams() {
  const cur = state.streams[state.streamIdx];
  state.streams = await listStreams();
  state.streamIdx = cur ? state.streams.findIndex((s) => s.base === cur.base) : -1;
  renderPicker();
  return state.streams;
}
// Opens picker entry i (the picker, the Library, a job's Open, a finished job).
export async function openStreamAt(i) {
  const s = state.streams[i];
  if (!s) return;
  state.openSeq++;
  state.streamIdx = i;
  renderPicker();
  const url = new URL(location.href);
  url.searchParams.set('data', s.base); url.hash = '';
  history.replaceState(null, '', url);
  rememberUsed(s.id);
  await openSource({ kind: 'url', base: s.base }, streamTitle(s));
}

// The library entry used last, per workspace (local storage): a fresh load of the app opens it
// again instead of whatever the library lists first (a comparison, R48 QA D11).
const usedKey = () => `vca.lastUsed:${(server.session && server.session.workspace) || location.host}`;
export function rememberUsed(id) {
  if (!caps.server || !id) return;
  try { localStorage.setItem(usedKey(), id); } catch (e) { /* storage blocked */ }
}
// Picker index a load without ?data= opens: the entry used last when it is still listed, else the
// first analysis (command-line analyses first, then the newest of the workspace), never a comparison
// unless the library holds nothing else.
export function defaultStreamIdx() {
  let last = null;
  if (caps.server) { try { last = localStorage.getItem(usedKey()); } catch (e) { /* storage blocked */ } }
  const i = last ? state.streams.findIndex((s) => s.id === last) : -1;
  if (i >= 0) return i;
  const a = state.streams.findIndex((s) => !(s.entry && s.entry.kind === 'diff'));
  return a >= 0 ? a : 0;
}

// Shows nothing: the stream on screen was deleted and the library is empty.
export function closeStream() {
  Object.assign(state, { source: null, manifest: null, payload: null, picture: null, diff: null, fdiff: null, sel: -1, streamIdx: -1, syms: null, symsFrame: -1 });
  state.frameCache.clear(); state.planeCache.clear(); state.symCache.clear(); state.fdiffCache.clear();
  for (const id of ['#facts', '#typeLegend', '#braid', '#legend']) $(id).innerHTML = '';
  $('#diffBar').hidden = true;
  renderPicker(); renderTab(); requestRender();
  setStatus('Load a stream to begin.');
  const url = new URL(location.href);
  url.searchParams.delete('data'); url.hash = '';
  history.replaceState(null, '', url);
  document.title = 'VC Analyzer';
}

export const GONE_MSG = 'This analysis is no longer in the library.';

// ------------------------------------------------------------ manifest
// keepView: same picture position and zoom (the HW tab reloads the open analysis).
let openGen = 0;   // the latest openSource: an earlier one still loading (arrow keys in the picker) stops
export async function openSource(source, title, { keepView = false } = {}) {
  const gen = ++openGen;
  state.source = source;
  state.frameCache.clear(); state.planeCache.clear(); state.symCache.clear(); state.fdiffCache.clear();
  state.syms = null; state.symsFrame = -1; state.diff = null; state.fdiff = null;
  state.sel = -1; state.payload = null; state.picture = null;
  if (!keepView) state.view.fitted = false;
  state.autoSelected = false;  // the first frame of every stream opens on its costliest block
  setEmpty('Loading stream…');
  let man;
  try {
    man = await getJSON('manifest.json');
  } catch (e) {
    if (gen !== openGen) return;
    // an analysis of this server deleted since the list was read (another tab, the command line)
    const mine = caps.server && source.kind === 'url' && source.base.startsWith(new URL('api/a/', location.href).href);
    if (mine && /HTTP 404/.test(e.message)) setEmpty(`${GONE_MSG} It may have been deleted: choose another one in the picker or the Library.`);
    else setEmpty(`Could not open this stream: ${e.message}. A bundle needs manifest.json, frames/ and planes/ (write one with "python -m vca export").`);
    return;
  }
  if (gen !== openGen) return;   // another stream was asked for meanwhile: its manifest, not this one
  state.manifest = man;
  if (state.manifest.format !== 'vca-bundle') {
    setEmpty('This folder is not a VC Analyzer bundle (manifest.json has no "format": "vca-bundle").');
    return;
  }
  for (const k of Object.keys(C)) delete C[k];
  state.manifest.block_cols.forEach((c, i) => { C[c] = i; });
  state.diff = state.manifest.diff || null;
  loadRefgraph();   // F-c track C: refgraph.json in the background (a bundle without it keeps the old Frame tab table)
  const hash = parseHash();
  // Another stream starts at the output picture: a stage chosen for the last one (a loop filter
  // change, a residual, B or A − B) could open the new one dark (R48 QA).  A URL hash naming a stage
  // (a shared link, a reload) and the HW tab's reload of the same analysis (keepView) keep it.
  if (!keepView && !hash.stage) state.stage = 'recon';
  const frames = state.manifest.frames;
  let f0 = frames.some((x) => x.f === hash.f) ? hash.f : (frames.find((x) => x.out_n === 0) || frames[0]).f;
  // Diff mode opens on the first mismatch: its frame, the A − B picture of the
  // stage where A and B diverge first, and the block holding the first sample.
  const fm = state.diff && state.diff.first_mismatch;
  state.diffGoto = null;
  if (fm && hash.f === null) {
    f0 = fm.f;
    state.diffGoto = fm;
    if (fm.stage) state.stage = 'D:' + fm.stage;
    state.fill = 'none';
  }
  if (FILLS.some((x) => x.arch && x.id === state.fill) && !hasArch()) state.fill = 'mode';
  renderChips();
  if (state.diff && hash.lines === null) state.lines.add('mismatch');
  if (!state.diff) state.lines.delete('mismatch');
  renderChips();
  renderTabs();
  renderFacts();
  pixelsOpened(keepView);
  renderStageOptions();
  renderBraid();
  renderDiffBar();
  setEmpty(null);
  await selectFrame(f0);
  if (title && gen === openGen) document.title = `${title} — VC Analyzer`;
}

function renderFacts() {
  const s = state.manifest.stream, seq = s.sequence || {};
  const fr = state.manifest.frames;
  const w = fr.length ? fr[0].width : seq.max_frame_width, h = fr.length ? fr[0].height : seq.max_frame_height;
  const items = [
    ['Codec', `<span class="codec-badge">${esc((s.codec || '?').toUpperCase())}</span>`],
    ['Size', `${fmt(w)}×${fmt(h)}`],
    ['Bit depth', seq.bit_depth ? `${seq.bit_depth}-bit` : '–'],
    ['Decoded', fmt(s.frames)], ['Output', fmt(s.outputs)],
    ['Bitrate', s.bitrate_kbps ? `${fmt(s.bitrate_kbps, 0)} kbps` : '–'],
    ['Decoder', esc((s.decoder || '').replace('AOMedia Project ', ''))],
  ];
  $('#facts').innerHTML = items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const types = [...new Set(fr.map((x) => x.frame_type))];
  $('#typeLegend').innerHTML = types.map((t) => `<span><i style="background:${FRAME_COLORS[t] || '#888'}"></i>${esc(typeName(t) || 'type not decoded')}</span>`).join('');
}

// The pixel stages this stream offers: A's (opts), and in diff mode the base stages B also has (cmp).
function stageLists() {
  const avail = new Set();
  state.manifest.frames.forEach((f) => (f.stages || []).forEach((s) => avail.add(s)));
  const opts = ['recon', 'prefilter', 'pred'].filter((s) => avail.has(s));
  if (avail.has('recon') && avail.has('prefilter')) opts.push('lfdelta');
  if (avail.has('prefilter') && avail.has('pred')) opts.push('residual');
  const cmp = state.diff ? BASE_STAGES.filter((s) => avail.has(s)) : [];
  return { opts, cmp, all: opts.concat(cmp.map((s) => 'B:' + s), cmp.map((s) => 'D:' + s)) };
}
// every entry of the pixel stage list (the second picture of a split or side-by-side view picks from it)
export const stageOptions = () => stageLists().all;
// short stage names for the second picture's select (the toolbar row keeps its width; the full name is its title)
const SHORT = { recon: 'Output', prefilter: 'Before loop filters', pred: 'Prediction', lfdelta: 'Loop filter change', residual: 'Residual' };
const shortStage = (s) => (s.startsWith('B:') ? `B: ${SHORT[s.slice(2)]}` : s.startsWith('D:') ? `A − B: ${SHORT[s.slice(2)]}` : SHORT[s] || s);
export function renderStageOptions() {
  const { opts, cmp, all } = stageLists();
  if (!all.includes(state.stage)) state.stage = opts[0] || 'recon';
  const list = (cur, short = false) => {
    const opt = (s) => `<option value="${s}" ${s === cur ? 'selected' : ''}${short ? ` title="${stageLabel(s)}"` : ''}>${short ? shortStage(s) : stageLabel(s)}</option>`;
    return (cmp.length ? `<optgroup label="A">${opts.map(opt).join('')}</optgroup>` : opts.map(opt).join(''))
      + (cmp.length ? `<optgroup label="Compare with B">${cmp.map((s) => opt('B:' + s)).join('')}${cmp.map((s) => opt('D:' + s)).join('')}</optgroup>` : '');
  };
  $('#stageSelect').innerHTML = list(state.stage);
  $('#paneSelect').innerHTML = list(stage2(), true);   // F36: the second picture of split and side-by-side views
  $('#grayBtn').setAttribute('aria-pressed', String(state.lumaOnly));
}
