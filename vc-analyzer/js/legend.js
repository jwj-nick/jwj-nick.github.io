// Legend under the picture for the current fill and picture.
import { C, qMax, qName, stageLabel, STAGES, state } from './state.js?v=bd3828335b';
import { $, esc, fmt, MISMATCH, modeColor, RAMP, refColor, rgb } from './util.js?v=bd3828335b';
import { focusStage } from './diff.js?v=bd3828335b';
import { bitsMax } from './view.js?v=bd3828335b';

// Below 1 bit per pixel two decimals would round small maxima to 0.00.
const bitsMaxText = (m) => (m >= 1 ? fmt(m, 2) : m > 0 ? m.toPrecision(2) : '0');
import { archLegend } from './arch.js?v=bd3828335b';

export function renderLegend() {
  const el = $('#legend');
  if (!state.payload) { el.innerHTML = ''; return; }
  const blocks = state.lumaBlocks || state.payload.blocks;
  const count = (key) => { const m = new Map(); blocks.forEach((b) => m.set(b[C[key]], (m.get(b[C[key]]) || 0) + b[C.w] * b[C.h])); return m; };
  let html = '';
  if (state.fill === 'mode') {
    const m = new Map();
    blocks.forEach((b) => { const k = b[C.mode] + '|' + b[C.pred]; m.set(k, (m.get(k) || 0) + b[C.w] * b[C.h]); });
    html = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => {
      const [mode, pred] = k.split('|');
      return `<span><i style="background:${modeColor(mode, pred)}"></i>${esc(mode)}</span>`;
    }).join('');
  } else if (state.fill === 'ref') {
    html = [...count('ref0').keys()].filter(Boolean).map((r) => `<span><i style="background:${refColor(r)}"></i>${esc(r)}</span>`).join('')
      + '<span><i style="background:#48c774"></i>intra block copy</span><span class="note">intra blocks are unfilled</span>';
  } else if (state.fill === 'qindex') {
    const q = blocks.map((b) => b[C.qindex]).filter((v) => v !== null);
    html = `${qName()} 0<span class="ramp" style="background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})"></span>${qMax()} <span class="note">this frame: ${Math.min(...q)}–${Math.max(...q)}</span>`;
  } else if (state.fill === 'bits') {
    html = `0<span class="ramp" style="background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})"></span>${bitsMaxText(bitsMax(blocks))} bits per pixel <span class="note">log scale; symbols attributed by decoder context</span>`;
  } else if (state.fill === 'cycles' || state.fill === 'fetch') {
    html = archLegend();
  } else if (state.fill === 'skip') {
    html = '<span><i style="background:rgb(16,18,22)"></i>skip_txfm (no residual)</span><span><i style="background:repeating-linear-gradient(45deg,#ffb347 0 2px,transparent 2px 4px)"></i>skip_mode</span>';
  }
  if (state.picture && state.picture.canvas.stats) {
    const st = state.picture.canvas.stats;
    const what = st.exact
      ? (st.changed || st.chroma ? `${fmt(st.changed)} luma${st.chroma ? ` and ${fmt(st.chroma)} chroma` : ''} samples differ, max |Δ| ${st.maxAbs} (exact samples)` : 'no sample differs')
      : `${fmt(st.changed)} of ${fmt(st.total)} luma samples differ, max |Δ| ${st.maxAbs}`;
    const where = state.stage.startsWith('D:') ? `A − B ${STAGES[state.stage.slice(2)].toLowerCase()}` : stageLabel(state.stage);
    html += ` <span class="note">${esc(where)}: ${what}. Amber = positive, cyan = negative.</span>`;
  }
  if (state.picture && state.picture.kind === 'none') html += ' <span class="note">No picture for this frame: the decoder produced no output.</span>';
  if (state.picture && state.picture.kind === 'b') html += ` <span class="note">${state.picture.same ? 'B equals A at this stage in this frame.' : "B's samples. Press x to flip to A."}</span>`;
  if (state.lines.has('mismatch') && state.fdiff && !state.fdiff.equal) {
    const st = focusStage();
    html += ` <span><i style="background:transparent;border:2px solid ${MISMATCH}"></i>mismatch${st ? `: samples differ at ${esc(STAGES[st].toLowerCase())}` : ''}; dashed = block fields differ</span>`;
  }
  el.innerHTML = html;
}
