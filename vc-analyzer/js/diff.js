// Diff mode: per-frame A vs B detail, the diff bar, first mismatch and A/B flip.
import { BASE_STAGES, bLabel, kindLabel, STAGES, state } from './state.js?v=d11a44027e';
import { $, esc, fmt, setStatus } from './util.js?v=d11a44027e';
import { getJSON } from './data.js?v=d11a44027e';
import { buildPicture, stageDiffers } from './planes.js?v=d11a44027e';
import { renderStageOptions } from './source.js?v=d11a44027e';
import { selectFrame } from './frames.js?v=d11a44027e';
import { requestRender } from './view.js?v=d11a44027e';
import { renderLegend } from './legend.js?v=d11a44027e';
import { writeHash } from './hash.js?v=d11a44027e';

// ------------------------------------------------------------- diff
// manifest.diff lists the frames that have frames/<f>.diff.json; any other
// frame of B equals A.
export async function loadFrameDiff(f) {
  if (!state.diff) return null;
  if (!(state.diff.detail_frames || []).includes(f)) return { f, equal: true, stages: {} };
  if (state.fdiffCache.has(f)) return state.fdiffCache.get(f);
  const d = await getJSON(`frames/${f}.diff.json`);
  state.fdiffCache.set(f, d);
  return d;
}

// The stage whose mismatches are outlined: the one on screen when it differs,
// otherwise the first stage where A and B diverge.
export function focusStage() {
  const fd = state.fdiff;
  if (!fd || fd.equal) return null;
  const st = state.stage.includes(':') ? state.stage.slice(2) : state.stage;
  return stageDiffers(st) ? st : fd.first_stage;
}

export function firstSample(stg) {
  const pl = stg && stg.planes;
  if (!pl) return null;
  const seq = state.manifest.stream.sequence || {};
  const ssx = seq.subsampling_x ?? 1, ssy = seq.subsampling_y ?? 1;
  for (const k of ['Y', 'U', 'V']) {
    if (pl[k]) { const [x, y] = pl[k].first; return k === 'Y' ? [x, y] : [x << ssx, y << ssy]; }
  }
  return null;
}

export function renderDiffBar() {
  const bar = $('#diffBar');
  const d = state.diff;
  if (!d) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  const b = d.b || {};
  const sa = state.manifest.stream;
  const who = `<span class="who">A = ${esc(sa.source_kind ? kindLabel(sa.source_kind) : 'this analysis')}${sa.decoder ? ` (${esc(sa.decoder.replace('AOMedia Project ', ''))})` : ''}, B = ${esc(bLabel(b))}</span>`;
  const notes = (d.notes || []).length ? `<span class="who">${esc(d.notes.join('; '))}</span>` : '';
  if (d.equal) {
    bar.classList.add('equal');
    bar.innerHTML = `<span><b>B matches A</b> in all ${fmt(d.frames_compared)} frames${d.output_md5_equal ? ', output MD5 equal' : ''}.</span>${who}${notes}`;
    return;
  }
  bar.classList.remove('equal');
  const fm = d.first_mismatch;
  let first = '';
  if (fm) {
    const pt = fm.first_sample && fm.first_sample.luma_xy;
    first = ` First mismatch: <b>frame ${fm.f}</b>${fm.stage ? `, ${esc(STAGES[fm.stage].toLowerCase())}` : ''}${pt ? ` at (${pt[0]}, ${pt[1]})` : ''}${fm.block ? ` in ${esc(fm.block.bsize)} at (${fm.block.x}, ${fm.block.y})` : ''}.`
      + (fm.cycle !== null && fm.cycle !== undefined ? ` Simulation time there (from the dump): <b>${esc(String(fm.cycle))}</b>.` : '');
  }
  const n = (d.differing_frames || []).length;
  bar.innerHTML = `<span title="${esc(fm && fm.stage_meaning || '')}"><b>B departs from A</b> in ${fmt(n)} of ${fmt(d.frames_compared)} frames${d.output_md5_equal === false ? ' (output MD5 differs)' : ''}.${first}</span>${fm ? '<button class="btn" data-act="goto-mismatch">Go to first mismatch</button>' : ''}${who}${notes}`;
}

export function gotoFirstMismatch() {
  const fm = state.diff && state.diff.first_mismatch;
  if (!fm) return;
  state.diffGoto = fm;
  if (fm.stage) state.stage = 'D:' + fm.stage;
  renderStageOptions();
  selectFrame(fm.f);
}

// x: flip the picture between A and B at the same stage (A − B goes back to A).
export async function flipAB() {
  if (!state.diff) return;
  const st = state.stage;
  const base = st.includes(':') ? st.slice(2) : st;
  if (!BASE_STAGES.includes(base)) return;
  state.stage = st.startsWith('B:') || st.startsWith('D:') ? base : 'B:' + base;
  renderStageOptions();
  state.picture = await buildPicture(state.f);
  renderLegend(); requestRender(); writeHash();
  setStatus(state.stage.startsWith('B:') ? `Showing B at ${STAGES[base].toLowerCase()}. Press x for A.` : `Showing A at ${STAGES[base].toLowerCase()}. Press x for B.`);
}

export async function showStage(st) {
  state.stage = st;
  renderStageOptions();
  state.picture = await buildPicture(state.f);
  renderLegend(); requestRender(); writeHash();
}
