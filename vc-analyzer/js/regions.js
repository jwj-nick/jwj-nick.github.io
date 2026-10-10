// F12 (R49, T-0049): slices (tile groups), tiles and segments of the frame on screen.  A block's slice is the coded
// unit its symbols were read from (frames/<f>.json pos: blk -> segs -> unit; HEVC and AVC also ext.slice), its tile
// comes from the frame's tile grid, its segment from segment_id.  The `bounds` line draws slice boundaries solid and
// segment boundaries dotted; tiles stay on `p`.
import { C, codecOf, state } from './state.js?v=9ce97af84e';
import { esc, fmt } from './util.js?v=9ce97af84e';

export const SLICE_COLOR = '#9be15d', SEG_LINE = '#c77dff';
export const SEG_COLORS = ['#8a94a3', '#4b8dff', '#3fb8af', '#b07cf7', '#e76f6f', '#9be15d', '#7fd3e8', '#ff66c4'];
export const hasSegments = () => ['av1', 'av2', 'vp9'].includes(codecOf());
// what a slice is called: AV1 and AV2 tile groups (one per OBU), VP9 has none
export const sliceNoun = () => (['av1', 'av2'].includes(codecOf()) ? 'tile group' : codecOf() === 'vp9' ? '' : 'slice');

let cache = { p: null, r: null };
export function regions() {
  const p = state.payload;
  if (!p) return null;
  if (cache.p === p) return cache.r;
  const fr = p.frame, n = p.blocks.length, segs = (p.pos && p.pos.segs) || [], blk = (p.pos && p.pos.blk) || [];
  const ext = p.ext || [];
  // slices: the units of pos.segs in decode order
  const unitOf = new Map(), units = [];
  for (const g of segs) if (!unitOf.has(g[0])) { unitOf.set(g[0], units.length); units.push(g[0]); }
  const slice = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const rs = blk[i];
    if (rs && rs.length && segs[rs[0][0]]) slice[i] = unitOf.get(segs[rs[0][0]][0]);
    else if (ext[i] && Number.isInteger(ext[i].slice)) slice[i] = ext[i].slice;
  }
  // tiles: the frame's grid in superblocks
  const t = fr.tiles || {}, sb = fr.sb_size || 64;
  const cols = t.cols || 1, rows = t.rows || 1;
  const cs = (t.col_start_sb || []).map((v) => Math.min(v * sb, fr.width)), rsb = (t.row_start_sb || []).map((v) => Math.min(v * sb, fr.height));
  const tileOf = (x, y) => {
    let c = 0, r = 0;
    while (c + 1 < cols && cs[c + 1] !== undefined && x >= cs[c + 1]) c++;
    while (r + 1 < rows && rsb[r + 1] !== undefined && y >= rsb[r + 1]) r++;
    return [c, r];
  };
  // per slice and per segment: blocks and luma area (luma and shared blocks)
  const ci = state.cellIndex, isChroma = ci ? ci.isChroma : new Uint8Array(n);
  const sliceInfo = units.map((u, k) => ({ k, unit: u, blocks: 0, area: 0, first: null }));
  const segInfo = new Map();
  for (let i = 0; i < n; i++) {
    if (isChroma[i]) continue;
    const b = p.blocks[i], a = b[C.w] * b[C.h], s = slice[i];
    if (s >= 0) {
      if (!sliceInfo[s]) sliceInfo[s] = { k: s, unit: null, blocks: 0, area: 0, first: null };
      const e = sliceInfo[s];
      e.blocks++; e.area += a;
      if (!e.first) e.first = [b[C.x], b[C.y]];
    }
    const sg = b[C.segment_id];
    if (sg !== null && sg !== undefined) { const e = segInfo.get(sg) || { id: sg, blocks: 0, area: 0 }; e.blocks++; e.area += a; segInfo.set(sg, e); }
  }
  const r = { slice, units,slices: sliceInfo.filter(Boolean), cols, rows, tileOf, segments: [...segInfo.values()].sort((a, b) => a.id - b.id), edges: null };
  cache = { p, r };
  return r;
}

// Boundaries on the 4x4 cell grid of the luma blocks: runs [x0, y0, x1, y1] where the slice (kind 'slice') or the
// segment (kind 'seg') changes between neighbouring cells; and the pairs of slices that touch.
export function boundaryRuns() {
  const r = regions(), p = state.payload, ci = state.cellIndex;
  if (!r || !ci) return { slice: [], seg: [], pairs: [] };
  if (r.edges && r.edges.ci === ci) return r.edges;
  const { idx, cols, rows } = ci;
  const sl = (k) => (k < 0 ? -1 : r.slice[k]);
  const sg = (k) => (k < 0 ? null : p.blocks[k][C.segment_id]);
  const out = { ci, slice: [], seg: [], pairs: [] }, pairs = new Set();
  const run = (list, x0, y0, x1, y1) => {
    const last = list[list.length - 1];
    if (last && last[0] === x0 && x0 === x1 && last[2] === x1 && last[3] === y0) last[3] = y1;   // vertical run goes on
    else if (last && last[1] === y0 && y0 === y1 && last[3] === y1 && last[2] === x0) last[2] = x1;   // horizontal run goes on
    else list.push([x0, y0, x1, y1]);
  };
  const W = state.payload.frame.width, H = state.payload.frame.height;
  // vertical edges, column by column, top to bottom (so runs join)
  for (let c = 1; c < cols; c++) {
    for (let y = 0; y < rows; y++) {
      const a = idx[y * cols + c - 1], b = idx[y * cols + c];
      if (a < 0 || b < 0 || a === b) continue;
      const y0 = y * 4, y1 = Math.min(H, y0 + 4);
      if (sl(a) >= 0 && sl(b) >= 0 && sl(a) !== sl(b)) { run(out.slice, c * 4, y0, c * 4, y1); pairs.add(Math.min(sl(a), sl(b)) + ',' + Math.max(sl(a), sl(b))); }
      if (sg(a) !== null && sg(b) !== null && sg(a) !== sg(b)) run(out.seg, c * 4, y0, c * 4, y1);
    }
  }
  for (let y = 1; y < rows; y++) {
    for (let c = 0; c < cols; c++) {
      const a = idx[(y - 1) * cols + c], b = idx[y * cols + c];
      if (a < 0 || b < 0 || a === b) continue;
      const x0 = c * 4, x1 = Math.min(W, x0 + 4);
      if (sl(a) >= 0 && sl(b) >= 0 && sl(a) !== sl(b)) { run(out.slice, x0, y * 4, x1, y * 4); pairs.add(Math.min(sl(a), sl(b)) + ',' + Math.max(sl(a), sl(b))); }
      if (sg(a) !== null && sg(b) !== null && sg(a) !== sg(b)) run(out.seg, x0, y * 4, x1, y * 4);
    }
  }
  out.pairs = [...pairs].sort();
  r.edges = out;
  return out;
}

// The bounds line: slice boundaries solid, segment boundaries dotted, each on a dark underlay.
export function drawBounds(ctx, px) {
  const e = boundaryRuns();
  const stroke = (list, color, w, dash) => {
    if (!list.length) return;
    const path = () => { ctx.beginPath(); for (const [x0, y0, x1, y1] of list) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } };
    ctx.setLineDash(dash);
    ctx.lineWidth = w + 2 * px; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; path(); ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = color; path(); ctx.stroke();
  };
  ctx.save();
  stroke(e.seg, SEG_LINE, 1.5 * px, [2 * px, 3 * px]);
  stroke(e.slice, SLICE_COLOR, 2.5 * px, []);
  ctx.restore();
}

export const segmentFill = () => (b) => { const s = b[C.segment_id]; return s === null || s === undefined ? null : SEG_COLORS[s % SEG_COLORS.length]; };
export function segmentLegendHtml() {
  const r = regions(), tot = r.segments.reduce((t, s) => t + s.area, 0) || 1;
  const on = state.payload.frame.segmentation && state.payload.frame.segmentation.segmentation_enabled;
  return r.segments.map((s) => `<span data-seg="${s.id}"><i style="background:${SEG_COLORS[s.id % SEG_COLORS.length]}"></i>segment ${s.id} <span class="note">${(100 * s.area / tot).toFixed(1)}%</span></span>`).join('')
    + (on ? '' : '<span class="note">segmentation is off in this frame</span>');
}
export function boundsLegendHtml() {
  const r = regions(), e = boundaryRuns(), noun = sliceNoun();
  const parts = [];
  if (noun) parts.push(`<span><i class="bd-line" style="border-top-color:${SLICE_COLOR}"></i>${esc(noun)} boundary <span class="note">${fmt(r.slices.length)} ${esc(noun)}${r.slices.length === 1 ? '' : 's'} in this frame</span></span>`);
  if (hasSegments()) parts.push(`<span><i class="bd-line dotted" style="border-top-color:${SEG_LINE}"></i>segment boundary${e.seg.length ? '' : ' <span class="note">none in this frame</span>'}</span>`);
  return parts.join('') + '<span class="note">tiles: Superblocks (p)</span>';
}

// Block tab row: slice k of n, tile, segment.
export function regionRowHtml(bi) {
  const r = regions();
  if (!r || bi < 0) return '';
  const b = state.payload.blocks[bi], parts = [], noun = sliceNoun();
  // a slice always (HEVC, VVC, AVC), a tile group when the frame has more than one; tile and segment when they exist
  const showSlice = noun && r.slice[bi] >= 0 && (noun === 'slice' || r.slices.length > 1);
  if (showSlice) parts.push(`${noun} ${r.slice[bi] + 1} of ${r.slices.length}`);
  if (r.cols * r.rows > 1) { const [c, rr] = r.tileOf(b[C.x], b[C.y]); parts.push(`tile ${rr * r.cols + c + 1} of ${r.cols * r.rows} (column ${c + 1}, row ${rr + 1})`); }
  const seg = state.payload.frame.segmentation;
  if (hasSegments() && seg && seg.segmentation_enabled && b[C.segment_id] !== null && b[C.segment_id] !== undefined) parts.push(`segment ${b[C.segment_id]}`);
  if (!parts.length) return '';
  const unit = showSlice && r.units[r.slice[bi]] !== undefined ? `${unitNoun()} ${r.units[r.slice[bi]]}` : '';
  return `<dt>Region</dt><dd>${esc(parts.join(', '))}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
}
const unitNoun = () => (['av1', 'av2'].includes(codecOf()) ? 'OBU' : codecOf() === 'vp9' ? 'unit' : 'NAL unit');

// Frame tab section: the slices with their unit, size and blocks; the tile grid; the segments by area.
export function regionsSectionHtml() {
  const r = regions();
  if (!r) return '';
  const p = state.payload, fr = p.frame, noun = sliceNoun(), codec = codecOf();
  const sizes = new Map((fr.units_list || []).map((u) => [u.i, u.size]));
  const hdr = ((fr.ext || {})[codec] || {}).slices || [];
  const HEVC_TYPES = ['B', 'P', 'I'];
  let html = '';
  if (noun && r.slices.length && (noun === 'slice' || r.slices.length > 1)) {
    const tot = r.slices.reduce((t, s) => t + s.area, 0) || 1;
    const rows = r.slices.map((s) => {
      const h = hdr[s.k] || {}, type = typeof h.type === 'number' ? (HEVC_TYPES[h.type] || h.type) : (h.type ? String(h.type).replace('_SLICE', '') : '');
      return `<tr><td class="num">${s.k + 1}</td><td class="num">${s.unit === null ? '–' : fmt(s.unit)}</td><td class="num">${fmt(sizes.get(s.unit))}</td><td>${esc(type || '–')}${h.qp !== undefined ? ` <span class="unit">QP ${esc(h.qp)}</span>` : ''}</td><td class="num">${fmt(s.blocks)}</td><td class="num">${(100 * s.area / tot).toFixed(1)}%</td><td>${s.first ? `(${s.first[0]}, ${s.first[1]})` : '–'}</td></tr>`;
    }).join('');
    const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
    html += `<h3>${esc(cap)}s</h3><table class="grid bd-regions"><thead><tr><th class="num">${esc(cap)}</th><th class="num" title="The coded unit the ${esc(noun)}'s symbols were read from">${esc(unitNoun())}</th><th class="num">Bytes</th><th>Type</th><th class="num">Blocks</th><th class="num" title="Share of the luma area">Area</th><th>First block</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  if (r.cols * r.rows > 1) {
    const t = fr.tiles, sb = fr.sb_size || 64;
    const w = (t.col_start_sb || []).slice(1).map((v, i) => Math.min(v * sb, fr.width) - Math.min(t.col_start_sb[i] * sb, fr.width));
    const h = (t.row_start_sb || []).slice(1).map((v, i) => Math.min(v * sb, fr.height) - Math.min(t.row_start_sb[i] * sb, fr.height));
    html += `<h3>Tiles</h3><p class="note">${r.cols}×${r.rows} tiles${w.length ? `, columns ${w.join(', ')} pixels wide, rows ${h.join(', ')} pixels high` : ''}. The Superblocks line (p) draws them.</p>`;
  }
  if (hasSegments() && r.segments.length && (r.segments.length > 1 || r.segments[0].id !== 0)) {
    const tot = r.segments.reduce((t, s) => t + s.area, 0) || 1;
    html += `<h3>Segments by area</h3><table class="grid bd-regions"><thead><tr><th class="num">Segment</th><th class="num">Blocks</th><th class="num">Area</th></tr></thead><tbody>${r.segments.map((s) => `<tr><td class="num"><i class="bd-sw" style="background:${SEG_COLORS[s.id % SEG_COLORS.length]}"></i>${s.id}</td><td class="num">${fmt(s.blocks)}</td><td class="num">${(100 * s.area / tot).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`;
  }
  return html;
}

// Read-only facts for the probe.
export function regionsSnap() {
  const r = regions();
  if (!r) return null;
  const e = boundaryRuns();
  return { noun: sliceNoun(), slices: r.slices.map((s) => ({ k: s.k, unit: s.unit, blocks: s.blocks })), pairs: e.pairs, sliceRuns: e.slice.length, segRuns: e.seg.length,
    tiles: [r.cols, r.rows], segments: r.segments.map((s) => ({ id: s.id, blocks: s.blocks, area: s.area })) };
}
