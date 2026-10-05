// Opening a bundle: manifest, header facts and the pixel stage list.
import { BASE_STAGES, C, FILLS, hasArch, stageLabel, state } from './state.js?v=e0ab48eb46';
import { $, esc, fmt, FRAME_COLORS, setEmpty, typeName } from './util.js?v=e0ab48eb46';
import { getJSON } from './data.js?v=e0ab48eb46';
import { renderBraid } from './braid.js?v=e0ab48eb46';
import { renderDiffBar } from './diff.js?v=e0ab48eb46';
import { selectFrame } from './frames.js?v=e0ab48eb46';
import { renderTabs } from './inspector.js?v=e0ab48eb46';
import { parseHash } from './hash.js?v=e0ab48eb46';
import { renderChips } from './controls.js?v=e0ab48eb46';

// ------------------------------------------------------------ manifest
export async function openSource(source, title) {
  state.source = source;
  state.frameCache.clear(); state.planeCache.clear(); state.symCache.clear(); state.fdiffCache.clear();
  state.syms = null; state.symsFrame = -1; state.diff = null; state.fdiff = null;
  state.sel = -1; state.payload = null; state.picture = null; state.view.fitted = false;
  state.autoSelected = false;  // the first frame of every stream opens on its costliest block
  setEmpty('Loading stream…');
  try {
    state.manifest = await getJSON('manifest.json');
  } catch (e) {
    setEmpty(`Could not open this stream: ${e.message}. A bundle needs manifest.json, frames/ and planes/ (write one with "python -m vca export").`);
    return;
  }
  if (state.manifest.format !== 'vca-bundle') {
    setEmpty('This folder is not a VC Analyzer bundle (manifest.json has no "format": "vca-bundle").');
    return;
  }
  for (const k of Object.keys(C)) delete C[k];
  state.manifest.block_cols.forEach((c, i) => { C[c] = i; });
  state.diff = state.manifest.diff || null;
  const hash = parseHash();
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
  renderStageOptions();
  renderBraid();
  renderDiffBar();
  setEmpty(null);
  await selectFrame(f0);
  if (title) document.title = `${title} — VC Analyzer`;
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
  $('#typeLegend').innerHTML = types.map((t) => `<span><i style="background:${FRAME_COLORS[t] || '#888'}"></i>${esc(typeName(t))}</span>`).join('');
}

export function renderStageOptions() {
  const avail = new Set();
  state.manifest.frames.forEach((f) => (f.stages || []).forEach((s) => avail.add(s)));
  const opts = ['recon', 'prefilter', 'pred'].filter((s) => avail.has(s));
  if (avail.has('recon') && avail.has('prefilter')) opts.push('lfdelta');
  if (avail.has('prefilter') && avail.has('pred')) opts.push('residual');
  const cmp = state.diff ? BASE_STAGES.filter((s) => avail.has(s)) : [];
  const all = opts.concat(cmp.map((s) => 'B:' + s), cmp.map((s) => 'D:' + s));
  if (!all.includes(state.stage)) state.stage = opts[0] || 'recon';
  const opt = (s) => `<option value="${s}" ${s === state.stage ? 'selected' : ''}>${stageLabel(s)}</option>`;
  $('#stageSelect').innerHTML = (cmp.length ? `<optgroup label="A">${opts.map(opt).join('')}</optgroup>` : opts.map(opt).join(''))
    + (cmp.length ? `<optgroup label="Compare with B">${cmp.map((s) => opt('B:' + s)).join('')}${cmp.map((s) => opt('D:' + s)).join('')}</optgroup>` : '');
  $('#grayBtn').setAttribute('aria-pressed', String(state.lumaOnly));
}
