// F-c track C (R49, T-0049): the Decoder state dialog (Shift+D) from refgraph.json (SERVER_API.md section 18):
//   DPB        the frames the decoder holds while decoding the frame on screen (F19) and a frame x slot grid.
//              AV1, AV2, VP9: the slot table (exact).  HEVC, VVC, AVC: the decoder's reference marking from the
//              dumper (dpb_summary.kind "marking", T-0062: short / long-term, plus the frames waiting for output);
//              analyses made before it ("required_set"): the required lower bound (what this frame or a later one
//              references, and what waits for output), not the decoder's real marking.
//   Structure  the reference structure (F06): frames by output position and hierarchy level, arrows to references.
//   State      what a frame takes over from earlier ones (F22, AV1 / AV2 / VP9): CDFs, loop filter deltas,
//              segmentation.
// ← → step frames while the dialog is open, Escape closes it.  Also wires the timeline arcs (braid.js) and the
// filmstrip (filmstrip.js), which main.js does not know.
import { codecOf, frameMeta, state } from './state.js?v=9ce97af84e';
import { $, esc, fmt, FRAME_COLORS, typeName } from './util.js?v=9ce97af84e';
import { selectFrame, stepFrame } from './frames.js?v=9ce97af84e';
import { arcsGraphSettled, arcsSnap, toggleArcs } from './braid.js?v=9ce97af84e';
import { filmstripSnap, initFilmstrip } from './filmstrip.js?v=9ce97af84e';
import { frameLink, onRefgraph, refgraph, refgraphError, refgraphMissingWhy, refgraphStatus, rgFrame, slotMode } from './refsview.js?v=9ce97af84e';

const dlg = () => $('#decoderDialog');
const TABS = ['dpb', 'structure', 'state'];
let tab = 'dpb';
const has = (v) => v !== null && v !== undefined;
const stateCodec = () => ['av1', 'av2', 'vp9'].includes(codecOf());
const typeOf = (f) => { const m = state.manifest.frames.find((x) => x.f === f); return m ? m.frame_type : null; };
const typeSw = (f) => `<i class="dc-sw" style="background:${FRAME_COLORS[typeOf(f)] || '#888'}"></i>`;
const yes = (v, tip) => (v ? `<span class="dc-yes" title="${esc(tip)}">yes</span>` : '–');

export function openDecoder(t) {
  if (!state.manifest) return;
  if (t && TABS.includes(t)) tab = t;
  if (tab === 'state' && !stateCodec()) tab = 'dpb';
  if (!dlg().open) dlg().showModal();
  render();
}

function render() {
  if (!dlg().open || !state.manifest) return;
  const st = refgraphStatus(), g = refgraph();
  const m = frameMeta(state.f);
  $('#dcSub').textContent = `Frame ${state.f} (${typeName(m.frame_type) || 'type not decoded'}, ${has(m.out_n) ? 'output ' + m.out_n : 'not output directly'}). ←  → step frames, click a frame to go there.`;
  $('#dcViews').innerHTML = TABS.filter((v) => v !== 'state' || stateCodec()).map((v) => `<button role="tab" type="button" data-view="${v}" aria-selected="${v === tab}" title="${esc(VIEW_TIPS[v])}">${VIEW_NAMES[v]}</button>`).join('');
  const body = $('#dcBody');
  if (!g) {
    // why: absent (an older bundle), unreadable (the file is there but broken), codec (refsview.js loadRefgraph)
    const why = refgraphMissingWhy();
    body.innerHTML = st === 'loading' ? '<p class="note">Reading refgraph.json…</p>'
      : why === 'codec' ? '<p class="dc-missing">This analysis has no reference graph for its codec, so the decoder state cannot be shown.</p>'
      : why === 'unreadable' ? `<p class="dc-missing">The reference graph of this bundle could not be read: refgraph.json is there, but ${esc(refgraphError())}. Export the bundle again with <code>python -m vca export</code>, or open the analysis with the local app (<code>vca serve</code>).</p>`
      : '<p class="dc-missing">This bundle has no reference graph (refgraph.json is not in it): it was exported before the decoder state view existed. Export it again with <code>python -m vca export</code>, or open the analysis with the local app (<code>vca serve</code>).</p>';
    return;
  }
  body.innerHTML = tab === 'structure' ? structureHtml(g) : tab === 'state' ? stateHtml(g) : dpbHtml(g);
  const cur = body.querySelector('.dc-row.cur');
  if (cur) { const box = cur.closest('.dc-scroll'); if (box) box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight / 2); }
  const node = body.querySelector('.dc-node.cur');
  if (node) { const box = node.closest('.dc-scroll'); if (box) { const x = +node.getAttribute('cx'); box.scrollLeft = Math.max(0, x - box.clientWidth / 2); } }
}
const VIEW_NAMES = { dpb: 'DPB', structure: 'Structure', state: 'State' };
const VIEW_TIPS = {
  dpb: 'The decoded frames the decoder holds while decoding this frame, and the same for every frame as a grid',
  structure: 'Which frames reference which: every frame by output position and hierarchy level',
  state: 'What each frame takes over from an earlier one: entropy coding probabilities (CDFs), loop filter deltas and segmentation',
};

// ------------------------------------------------------------ DPB (F19)
// rows of the grid: every frame, or a window around the frame on screen for long streams
function gridRows(g) {
  const all = g.frames, i = all.findIndex((x) => x.f === state.f);
  if (all.length <= 64) return { rows: all, from: 0 };
  const from = Math.max(0, Math.min(all.length - 64, i - 32));
  return { rows: all.slice(from, from + 64), from };
}
// What the DPB rows of a POC codec are (SERVER_API.md section 18 item 4): "marking" = the decoder's own reference
// marking from the dumper (T-0062), "required_set" = analyses made before it (a lower bound); slot codecs: "slots".
export const dpbKind = (g) => (slotMode() ? 'slots' : ((g.dpb_summary || {}).kind === 'marking' ? 'marking' : 'required_set'));
const MARK_TIP = 'How the decoder marks the frame: short-term or long-term reference; – = held only for output';
function dpbHtml(g) {
  const fr = rgFrame(state.f), slots = slotMode(), kind = dpbKind(g), marking = kind === 'marking';
  if (!fr) return `<p class="note">refgraph.json has no entry for frame ${state.f}.</p>`;
  const head = slots
    ? '<p class="gr-fact">The reference slots of the decoder before this frame is decoded: the frames they hold, which of them this frame reads, and which a later frame still reads.</p>'
    : marking ? '<p class="gr-fact dc-marking">The decoder\'s DPB while this frame is decoded: the frames it marks as reference (RPS, reference picture lists, or sliding window and memory management), and the ones waiting for output.</p>'
    : '<p class="dc-bound"><b>Required lower bound, not the real marking.</b> The frames that must still be held while this frame is decoded: the ones it or a later frame references, and the ones waiting for output. The decoder\'s own marking (sliding window, memory management, RPS) can keep more; it needs the dumper\'s DPB state.</p>';
  const dpb = fr.dpb || [];
  const rows = dpb.map((d) => `<tr class="dc-dpbrow" data-f="${d.f}"><td>${typeSw(d.f)}${frameLink(d.f)}</td>`
    + (slots ? `<td class="num">${esc(Array.isArray(d.slot) ? d.slot.join(', ') : fmt(d.slot))}</td>` : '')
    + `<td>${esc(typeName(typeOf(d.f)) || '–')}</td><td class="num">${fmt((frameMeta(d.f) || {}).out_n)}</td>`
    + (marking ? `<td class="dc-mark" title="${esc(MARK_TIP)}">${d.ref === 'long' ? 'long' : d.ref === 'short' ? 'short' : '–'}</td>` : '')
    + `<td>${yes(d.used, 'This frame predicts from it')}</td><td>${yes(d.later, 'A later frame in decode order references it')}</td><td>${yes(d.waiting, 'Decoded, not yet output')}</td></tr>`).join('');
  const table = dpb.length
    ? `<table class="grid dc-dpb"><thead><tr><th title="Decode index">Frame</th>${slots ? '<th class="num" title="Slots that hold the frame">Slots</th>' : ''}<th>Type</th><th class="num" title="Output index">Out</th>${marking ? `<th title="${esc(MARK_TIP)}">Marking</th>` : ''}<th title="This frame predicts from it">Used here</th><th title="A later frame in decode order references it">Later</th><th title="Decoded, not yet output">Waiting</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="note">Empty: the decoder holds no earlier frame here.</p>';
  return head + table + mostHtml(g, kind) + `<h3 class="gr-h">Every frame</h3>` + (slots ? slotGrid(g) : heldGrid(g, marking));
}
// The most frames held over the stream against the declared size (dpb_summary)
function mostHtml(g, kind) {
  const sm = g.dpb_summary, lim = sm && sm.limit;
  if (!sm || !has(sm.max)) return '';
  const n = `${fmt(sm.max)} frame${sm.max === 1 ? '' : 's'}`;
  if (kind !== 'marking') return `<p class="gr-fact">${kind === 'slots' ? 'At most' : 'The required set holds at most'} ${n} over the stream${lim ? `; the sequence header allows ${fmt(lim.value)} (${esc(lim.name)})` : ''}.</p>`;
  // marking: limit.others = the most frames held besides the one being decoded; AVC also max_num_ref_frames
  const rl = sm.ref_limit;
  const refs = rl && has(sm.ref_max) ? ` At most ${fmt(sm.ref_max)} of them are marked as reference; the limit is ${fmt(rl.value)} (${esc(rl.name)}).` : '';
  return `<p class="gr-fact dc-most">The DPB holds at most ${n} besides the one being decoded${lim ? `; the limit is ${fmt(has(lim.others) ? lim.others : lim.value)} (${esc(lim.name)} ${fmt(lim.value)})` : ''}.${refs}</p>`;
}
// slot codecs: one row per frame, one column per slot, the frame each slot holds after that frame is decoded
// (refgraph.json frames[].slots); the slots the frame refreshed with itself are bold
function slotGrid(g) {
  const n = g.slots || Math.max(0, ...g.frames.map((x) => (x.slots || []).length));
  const { rows, from } = gridRows(g);
  const head = `<tr><th class="num" title="Decode index">Frame</th>${Array.from({ length: n }, (_, s) => `<th class="num" title="Slot ${s}">${s}</th>`).join('')}</tr>`;
  const body = rows.map((fr) => {
    const cells = Array.from({ length: n }, (_, s) => {
      const v = (fr.slots || [])[s], mine = v === fr.f;
      return `<td class="num dc-cell${mine ? ' rd' : ''}" data-s="${s}" data-v="${has(v) ? v : ''}"${has(v) ? ` style="--dc-c:${FRAME_COLORS[typeOf(v)] || '#888'}" title="Slot ${s} holds frame ${v}${mine ? ' (stored by this frame)' : ''}"` : ' title="Empty slot"'}>${has(v) ? v : ''}</td>`;
    }).join('');
    return `<tr class="dc-row clickable${fr.f === state.f ? ' cur' : ''}" data-f="${fr.f}"><td class="num">${typeSw(fr.f)}${fr.f}</td>${cells}</tr>`;
  }).join('');
  return `<div class="dc-scroll dc-gridbox"><table class="grid dc-grid">${head}${body}</table></div>`
    + `<p class="fine gr-note">Each row is the slot table after that frame is decoded; bold cells are the slots it refreshed with itself (refresh_frame_flags).${rows.length < g.frames.length ? ` Showing frames ${g.frames[from].f} to ${rows[rows.length - 1].f} of ${g.frames.length}.` : ''} Click a row to go to that frame.</p>`;
}
// POC codecs: one row per frame, one column per held frame (the decoder's marking, or the required set)
function heldGrid(g, marking) {
  const { rows, from } = gridRows(g);
  const cols = [...new Set(rows.flatMap((fr) => (fr.dpb || []).map((d) => d.f)))].sort((a, b) => a - b);
  const head = `<tr><th class="num" title="Decode index">Frame</th>${cols.map((c) => `<th class="num" title="Held frame ${c}">${c}</th>`).join('')}</tr>`;
  const body = rows.map((fr) => {
    const by = new Map((fr.dpb || []).map((d) => [d.f, d]));
    const cells = cols.map((c) => {
      const d = by.get(c);
      if (!d) return `<td class="dc-cell" data-v=""></td>`;
      // marking: a frame the decoder still marks as reference that no frame reads again is "marked only"
      const k = d.used ? 'rd' : d.later ? 'kp' : d.waiting || !marking ? 'wt' : 'mk';
      const why = { rd: 'referenced by this frame', kp: 'kept for a later frame', wt: 'waiting for output', mk: 'marked as reference, not referenced again' }[k];
      const mark = marking && d.ref ? `, ${d.ref}-term reference` : '';
      return `<td class="dc-cell ${k}${d.ref === 'long' ? ' lt' : ''}" data-v="${c}" style="--dc-c:${FRAME_COLORS[typeOf(c)] || '#888'}" title="Frame ${c}: ${why}${mark}"><i></i></td>`;
    }).join('');
    return `<tr class="dc-row clickable${fr.f === state.f ? ' cur' : ''}" data-f="${fr.f}"><td class="num">${typeSw(fr.f)}${fr.f}</td>${cells}</tr>`;
  }).join('');
  return (cols.length ? `<div class="dc-scroll dc-gridbox"><table class="grid dc-grid dc-held">${head}${body}</table></div>` : '<p class="note">No frame is ever held: every frame is intra.</p>')
    + `<p class="gr-legend"><span><i class="dc-lg rd"></i>referenced by this frame</span><span><i class="dc-lg kp"></i>kept for a later frame</span><span><i class="dc-lg wt"></i>waiting for output</span>${marking ? '<span><i class="dc-lg mk"></i>marked as reference, not referenced again</span><span><i class="dc-lg lt"></i>long-term reference</span>' : ''}</p>`
    + `<p class="fine gr-note">Columns are the held frames (decode index).${rows.length < g.frames.length ? ` Showing frames ${g.frames[from].f} to ${rows[rows.length - 1].f} of ${g.frames.length}.` : ''} Click a row to go to that frame.</p>`;
}

// ------------------------------------------------------------ Structure (F06)
// Display position of every frame: its output index; a frame not output directly takes the output index of the
// first later frame with the same order hint or POC (the frame that shows it), else sits after the frame before it.
function positions(g) {
  const pos = new Map(), list = g.frames;
  list.forEach((fr, i) => {
    let p = has(fr.out_n) ? fr.out_n : null;
    if (p === null && has(fr.poc)) { const s = list.slice(i + 1).find((x) => x.poc === fr.poc && has(x.out_n)); if (s) p = s.out_n - 0.25; }
    if (p === null) p = (i ? pos.get(list[i - 1].f) : 0) + 0.5;
    pos.set(fr.f, p);
  });
  return pos;
}
// The row of every frame: refgraph.json frames[].layer (temporal_id, AV2 tlayer, else the level derived from the
// reference distances) when the stream has more than one layer, else frames[].level; frames with no value sit on
// row 0 (counted in the note).
const LAYER_NAMES = { temporal_id: 'Rows: temporal layer (temporal_id)', tlayer: 'Rows: temporal layer (tlayer)', derived: 'Rows: hierarchy level, derived from the distance to the nearest reference in output order, 0 = no reference' };
export function rowKey(g) {
  const ls = new Set(g.frames.map((x) => x.layer).filter(has));
  return ls.size > 1 ? 'layer' : 'level';
}
function layers(g) {
  const k = rowKey(g), lv = new Map();
  let none = 0;
  for (const fr of g.frames) {
    const v = fr[k];
    if (!has(v)) none++;
    lv.set(fr.f, has(v) ? v : 0);
  }
  return { lv, none, src: k === 'layer' ? g.layer_src : 'derived' };
}
function structureHtml(g) {
  const pos = positions(g), { lv, none, src } = layers(g);
  const order = [...g.frames].sort((a, b) => pos.get(a.f) - pos.get(b.f));
  const rank = new Map(order.map((fr, i) => [fr.f, i]));
  const maxL = Math.max(0, ...lv.values());
  const L = 54, R = 16, T = 18, B = 34, step = Math.max(22, Math.min(54, 1100 / Math.max(1, order.length))), rowH = 46;
  const W = L + step * order.length + R, H = T + rowH * maxL + 24 + B;
  const xy = (f) => [L + rank.get(f) * step + step / 2, T + 12 + rowH * lv.get(f)];
  const word = src === 'derived' || !src ? 'level' : 'layer';
  let s = '<defs><marker id="dcHead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" class="dc-head"/></marker></defs>';
  for (let l = 0; l <= maxL; l++) s += `<line class="gr-grid" x1="${L}" x2="${W - R}" y1="${T + 12 + rowH * l}" y2="${T + 12 + rowH * l}"/><text class="gr-yt" x="${L - 8}" y="${T + 16 + rowH * l}" text-anchor="end">${word} ${l}</text>`;
  // references: faint for every frame (up to 150 frames), the frame on screen in full
  const edges = [];
  for (const fr of g.frames) {
    if (fr.f !== state.f && g.frames.length > 150) continue;
    for (const t of new Set((fr.refs || []).map((r) => r.f).filter((x) => has(x) && rank.has(x)))) edges.push([fr.f, t]);
  }
  const R0 = 8;
  s += edges.map(([a, b]) => {
    const [x1, y1] = xy(a), [x2, y2] = xy(b), d = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / d, uy = (y2 - y1) / d, bend = y1 === y2 ? -Math.min(40, 10 + Math.abs(x2 - x1) * 0.25) : 0;
    const sx = x1 + ux * R0, sy = y1 + uy * R0, ex = x2 - ux * (R0 + 1), ey = y2 - uy * (R0 + 1);
    return `<path class="dc-edge${a === state.f ? ' cur' : ''}" data-from="${a}" data-to="${b}" d="M${sx.toFixed(1)},${sy.toFixed(1)} Q${((sx + ex) / 2).toFixed(1)},${((sy + ey) / 2 + bend).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#dcHead)"/>`;
  }).join('');
  s += order.map((fr) => {
    const [x, y] = xy(fr.f), m = frameMeta(fr.f);
    return `<g class="dc-nodeg" data-f="${fr.f}"><title>Frame ${fr.f}: ${esc(typeName(m.frame_type) || 'type not decoded')}, ${has(m.out_n) ? 'output ' + m.out_n : 'not output directly'}, ${word} ${lv.get(fr.f)}</title>`
      + `<circle class="dc-node${fr.f === state.f ? ' cur' : ''}${has(m.out_n) ? '' : ' hidden-frame'}" data-f="${fr.f}" data-level="${lv.get(fr.f)}" cx="${x}" cy="${y}" r="${R0}" style="--dc-c:${FRAME_COLORS[m.frame_type] || '#888'}"/>`
      + `<text class="dc-nl" x="${x}" y="${y + 4}" text-anchor="middle">${fr.f}</text></g>`;
  }).join('');
  const every = Math.max(1, Math.ceil(28 / step));
  s += order.map((fr, i) => (i % every ? '' : `<text class="gr-xt" x="${L + i * step + step / 2}" y="${H - B + 14}" text-anchor="middle">${has(fr.out_n) ? fr.out_n : '–'}</text>`)).join('')
    + `<text class="gr-axis" x="${L + (W - L - R) / 2}" y="${H - 4}" text-anchor="middle">Output order (numbers in the circles: decode index)</text>`;
  return `<div class="dc-scroll dc-structbox"><svg id="dcStruct" class="dc-struct" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Reference structure">${s}</svg></div>`
    + `<p class="gr-legend"><span><i class="hollow"></i>not output directly</span><span><i class="line"></i>references of frame ${state.f}</span>${g.frames.length > 150 ? '' : '<span><i class="line dc-faint"></i>references of the other frames</span>'}</p>`
    + `<p class="fine gr-note">${esc(LAYER_NAMES[src] || LAYER_NAMES.derived)}${src !== g.layer_src ? `; every frame has the same ${esc(g.layer_src || 'layer')}` : ''}${none ? `; ${none} frame${none === 1 ? ' has' : 's have'} none and sit${none === 1 ? 's' : ''} on row 0` : ''}. Columns: output order; a frame not output directly sits where the frame that shows it is output. Click a frame to go there.</p>`;
}

// ------------------------------------------------------------ State (F22)
// refgraph.json primary_ref / cdf / lf / seg (SERVER_API.md section 18) as words, with links to the frames named
const fromLink = (f, what) => (has(f) ? `${what} ${frameLink(f)}` : `${what} an unresolved frame`);
const differs = (v) => (v && v.checked === false ? ' <span class="mis" title="The values in this frame differ from the ones it should have taken over">differs</span>' : '');
function primaryHtml(p) {
  if (!has(p)) return '–';
  if (p.none) return `none<span class="unit">${fmt(p.idx)}</span>`;
  return `${esc(p.key || '?')}<span class="unit">slot ${fmt(p.slot)}</span> ${has(p.f) ? frameLink(p.f) : '–'}`;
}
function cdfHtml(c) {
  if (!has(c)) return '–';
  const vp9 = has(c.used_idx);
  let t = c.src === 'default' ? 'defaults' : c.src === 'context' ? fromLink(c.from, `context ${c.used_idx}, saved by`) : fromLink(c.from, 'from');
  if (vp9 && c.src === 'default') t += ` (context ${c.used_idx})`;
  if (c.disable_cdf_update) t += ', not adapted in this frame';
  if (vp9 && c.refresh_frame_context) t += `; saved to context ${c.used_idx}`;
  return t;
}
function lfHtml(l) {
  if (!has(l)) return '–';
  if (!l.enabled) return 'deltas off';
  const vals = `ref deltas ${(l.ref_deltas || []).join(' ')}${l.mode_deltas ? `, mode deltas ${l.mode_deltas.join(' ')}` : ''}`;
  const t = l.src === 'updated' ? 'updated' : l.src === 'inherited' ? fromLink(l.from, 'inherited from') : 'defaults';
  return `<span title="${esc(vals)}">${t}</span>${differs(l)}`;
}
function segHtml(s) {
  if (!has(s)) return '–';
  if (!s.enabled) return 'off';
  const data = s.data_src === 'updated' ? 'data updated' : s.data_src === 'inherited' ? fromLink(s.from, 'data from') : 'data defaults';
  const map = s.update_map ? (s.temporal_update ? (has(s.map_from) ? fromLink(s.map_from, 'map predicted from') : 'map predicted') : 'map coded')
    : (has(s.map_from) ? fromLink(s.map_from, 'map from') : 'map kept');
  return `${data}, ${map}${differs(s)}`;
}
function stateHtml(g) {
  const { rows, from: first } = gridRows(g), av = codecOf() !== 'vp9';
  const body = rows.map((fr) => `<tr class="dc-row clickable${fr.f === state.f ? ' cur' : ''}" data-f="${fr.f}"><td class="num">${typeSw(fr.f)}${fr.f}</td>`
    + (av ? `<td>${primaryHtml(fr.primary_ref)}</td>` : '') + `<td>${cdfHtml(fr.cdf)}</td><td>${lfHtml(fr.lf)}</td><td>${segHtml(fr.seg)}</td></tr>`).join('');
  const ck = g.checks || {}, bad = (ck.lf_inherit_mismatch || 0) + (ck.seg_inherit_mismatch || 0);
  return (av ? '<p class="gr-fact">What each frame takes over instead of coding it again: the CDFs, loop filter deltas and segmentation of the reference named by primary_ref_frame, or the defaults when it is none.</p>'
    : '<p class="gr-fact">What each frame takes over: VP9 starts from one of four saved probability contexts (frame_context_idx) and keeps loop filter deltas and segmentation from the frame decoded before it unless it resets or updates them.</p>')
    + `<div class="dc-scroll dc-statebox"><table class="grid dc-state"><thead><tr><th class="num" title="Decode index">Frame</th>${av ? '<th title="primary_ref_frame: the reference whose state this frame loads, its slot and the frame in it">Primary reference</th>' : ''}<th title="Where the entropy coding probabilities (CDFs) of this frame start">CDFs</th><th title="Loop filter ref and mode deltas: updated in this frame, taken over, or the defaults (the values in the tooltip)">Loop filter deltas</th><th title="Segmentation feature data and map: updated in this frame or taken over">Segmentation</th></tr></thead><tbody>${body}</tbody></table></div>`
    + `<p class="fine gr-note">${bad ? `<span class="mis">${bad} taken-over value${bad === 1 ? '' : 's'} differ from the frame they come from.</span> ` : ''}${rows.length < g.frames.length ? `Showing frames ${g.frames[first].f} to ${rows[rows.length - 1].f} of ${g.frames.length}. ` : ''}Click a row to go to that frame.</p>`;
}

// ------------------------------------------------------------ wiring
const typing = (e) => e.target.closest && e.target.closest('input, select, textarea');
export function initDecoder() {
  initFilmstrip();
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    const v = t.closest('#dcViews [data-view]');
    if (v) { tab = v.dataset.view; render(); return; }
    const link = t.closest('[data-act="ref-frame"]');
    if (link) { selectFrame(+link.dataset.f); return; }
    const row = t.closest('.dc-row[data-f], .dc-nodeg[data-f]');
    if (row) selectFrame(+row.dataset.f);
  });
  // ← → step frames while the dialog is open (as in Graphs and Quality)
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(e)) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stepFrame(e.key === 'ArrowLeft' ? -1 : 1);
  });
  // Frame and Block tabs: frame links and the Decoder state button (controls.js leaves these data-act values alone)
  $('#tabBody').addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'ref-frame') selectFrame(+a.dataset.f);
    else if (a.dataset.act === 'decoder') openDecoder();
  });
  $('#arcsBtn').addEventListener('click', toggleArcs);
  // the frame changed (arrow keys, the timeline, a link): draw the dialog for it
  new MutationObserver(() => { if (d.open) render(); }).observe($('#framePos'), { childList: true, subtree: true, characterData: true });
  onRefgraph(() => { arcsGraphSettled(); render(); });
}

// Read-only view for window.__vca.snap() (tests).
export function decoderSnap() {
  const d = dlg(), open = !!(d && d.open);
  const out = { refgraph: refgraphStatus(), refgraphWhy: refgraphMissingWhy(), arcs: arcsSnap(), filmstrip: filmstripSnap(), open, tab: open ? tab : null };
  if (!open) return out;
  const q = (sel) => [...d.querySelectorAll(sel)];
  return {
    ...out,
    tabs: q('#dcViews [data-view]').map((b) => b.dataset.view),
    bound: !!d.querySelector('.dc-bound'), missing: !!d.querySelector('.dc-missing'),
    dpb: q('.dc-dpbrow').map((r) => +r.dataset.f),
    dpbKind: refgraph() ? dpbKind(refgraph()) : null,
    marks: q('.dc-dpbrow .dc-mark').map((c) => c.textContent.trim()),
    grid: q('.dc-grid .dc-row').map((r) => [+r.dataset.f, [...r.querySelectorAll('.dc-cell')].map((c) => (c.dataset.v === '' ? null : +c.dataset.v))]),
    gridCur: q('.dc-grid .dc-row.cur').map((r) => +r.dataset.f),
    nodes: q('.dc-node').map((c) => [+c.dataset.f, +c.dataset.level]),
    nodeXY: q('.dc-node').map((c) => [+c.dataset.f, +c.getAttribute('cx'), +c.getAttribute('cy')]),
    edges: q('.dc-edge.cur').map((p) => [+p.dataset.from, +p.dataset.to]),
    stateRows: q('.dc-state .dc-row').map((r) => [+r.dataset.f, [...r.querySelectorAll('td')].slice(1).map((c) => c.textContent.trim())]),
  };
}
