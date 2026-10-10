// F17 transform type fill and F15 inter mode fill and rows (R49, T-0049): each codec's names mapped to common
// categories, their colours, legends and the Block tab "Inter details" rows.  Amber stays for the selection.
import { C, codecOf, state } from './state.js?v=9ce97af84e';
import { esc, fmt, refColor } from './util.js?v=9ce97af84e';
import { refFrameOf } from './refsview.js?v=9ce97af84e';

// ------------------------------------------------------------ transform type (the block's first transform block)
export const TX_CATS = [
  { id: 'dct', label: 'DCT', color: '#4b8dff', title: 'DCT_DCT, DCT2_DCT2' },
  { id: 'adst', label: 'ADST, flipped ADST, DST-7, DCT-8', color: '#b07cf7', title: 'any 2D type with a sine-like kernel one or both ways: ADST_DCT, FLIPADST_ADST, DST7_DST7, DCT8_DST7, ...' },
  { id: '1d', label: '1D (identity the other way)', color: '#3fb8af', title: 'H_DCT, V_ADST, H_FLIPADST, ...: a 1D transform, the other direction identity' },
  { id: 'idtx', label: 'identity, transform skip', color: '#e76f6f', title: 'IDTX (AV1, AV2), TRANSFORM_SKIP (HEVC, VVC)' },
  { id: 'wht', label: 'Walsh-Hadamard', color: '#9be15d', title: 'WHT_WHT: lossless blocks (VP9, AV1)' },
  { id: 'bypass', label: 'bypass', color: '#ff66c4', title: 'TRANSQUANT_BYPASS: no transform and no quantization (HEVC, AVC lossless)' },
  { id: 'none', label: 'no residual', color: 'rgb(16,18,22)', title: 'skip_txfm: the block codes no residual' },
  { id: 'other', label: 'other', color: '#8a94a3', title: 'a type name this viewer does not group' },
];
const TX_BY_ID = Object.fromEntries(TX_CATS.map((c) => [c.id, c]));
export function txCategory(name, skip) {
  if (skip || !name) return 'none';
  if (name === 'TRANSQUANT_BYPASS') return 'bypass';
  if (name.includes('WHT')) return 'wht';
  if (name === 'IDTX' || name === 'TRANSFORM_SKIP') return 'idtx';
  if (/^[HV]_/.test(name)) return '1d';
  if (name === 'DCT_DCT' || name === 'DCT2_DCT2') return 'dct';
  if (/ADST|DST|DCT8/.test(name)) return 'adst';
  return 'other';
}
export const txFill = () => (b) => TX_BY_ID[txCategory(b[C.tx_type], b[C.skip_txfm])].color;

// ------------------------------------------------------------ inter mode
export const INTER_CATS = [
  { id: 'skip', label: 'skip', color: '#6b7686', title: 'skip mode (AV1, AV2), skip merge (HEVC, VVC), P_Skip and B_Skip (AVC): no residual, motion from the candidates' },
  { id: 'merge', label: 'merge, direct', color: '#3fb8af', title: 'merge (HEVC, VVC, with MMVD and subblock TMVP), direct (AVC)' },
  { id: 'near', label: 'predicted vector', color: '#7fd3e8', title: 'NEARESTMV, NEARMV, GLOBALMV, ZEROMV (AV1, AV2, VP9): a candidate vector, no motion vector difference' },
  { id: 'explicit', label: 'explicit vector', color: '#4b8dff', title: 'NEWMV and compound modes with NEW (AV1, AV2, VP9), AMVP and SMVD (HEVC, VVC), AVC partitions with a motion vector difference' },
  { id: 'affine', label: 'affine', color: '#9be15d', title: 'VVC affine merge and affine AMVP' },
  { id: 'warp', label: 'warp', color: '#b07cf7', title: 'local warp (AV1 WARPED_CAUSAL, AV2 WARPMV, WARP_NEWMV and the WARP_ motion modes)' },
  { id: 'geo', label: 'GEO, wedge, masked compound', color: '#ff66c4', title: 'VVC GEO, AV1 and AV2 COMPOUND_WEDGE and COMPOUND_DIFFWTD' },
  { id: 'ciip', label: 'CIIP, inter-intra', color: '#e76f6f', title: 'VVC CIIP, AV1 and AV2 inter-intra' },
  { id: 'obmc', label: 'OBMC', color: '#cfd8dc', title: 'AV1 OBMC_CAUSAL' },
  { id: 'ibc', label: 'intra block copy', color: '#48c774', title: 'IBC (AV1, AV2, VVC): a vector into the decoded part of this frame' },
];
const INTER_BY_ID = Object.fromEntries(INTER_CATS.map((c) => [c.id, c]));
// Category of block b (a row of payload.blocks) with ext = its decoder fields; null = intra (no category).
export function interCategory(codec, b, ext) {
  const pred = b[C.pred], m = b[C.mode] || '', mm = b[C.motion_mode] || '', ct = b[C.compound_type] || '', e = ext || {};
  if (pred === 'intrabc') return 'ibc';
  if (pred !== 'inter') return null;
  if (codec === 'av1' || codec === 'av2') {
    if (mm.startsWith('WARP') || m.startsWith('WARP')) return 'warp';
    if (ct === 'COMPOUND_WEDGE' || ct === 'COMPOUND_DIFFWTD') return 'geo';
    if (mm === 'INTERINTRA' || e.interintra_mode !== undefined) return 'ciip';
    if (mm === 'OBMC_CAUSAL') return 'obmc';
    if (b[C.skip_mode]) return 'skip';
    return m.includes('NEW') ? 'explicit' : 'near';
  }
  if (codec === 'vp9') return m === 'NEWMV' ? 'explicit' : 'near';
  if (codec === 'vvc') {
    if (m.includes('AFFINE')) return 'affine';
    if (m.includes('GEO')) return 'geo';
    if (m === 'CIIP') return 'ciip';
    if (m.startsWith('SKIP_')) return 'skip';
    if (m === 'AMVP' || m === 'SMVD') return 'explicit';
    return 'merge';   // MERGE, MMVD, SBTMVP
  }
  if (codec === 'hevc') return m === 'SKIP_MERGE' ? 'skip' : (m === 'MERGE' ? 'merge' : 'explicit');
  if (codec === 'avc') {
    if (m.endsWith('_Skip')) return 'skip';
    if (m.startsWith('B_Direct')) return 'merge';
    return 'explicit';
  }
  return m.includes('NEW') ? 'explicit' : 'near';
}
export function interFill() {
  const codec = codecOf(), ext = state.payload.ext || [], ix = blockIndex();
  return (b) => { const k = interCategory(codec, b, ext[ix.get(b)]); return k ? INTER_BY_ID[k].color : null; };
}

// ------------------------------------------------------------ reference fill by decoded frame
// refsview.js (track C) gives the decode index of the frame a block's reference holds; the r fill colours by that
// frame when it is known (one colour per referenced frame of this picture, nearest decode index first), else by the
// reference name as before.
// (not cached: track C may load its reference data after the frame is drawn)
const FRAME_COLORS = ['#4b8dff', '#3fb8af', '#b07cf7', '#e76f6f', '#9be15d', '#7fd3e8', '#ff66c4', '#cfd8dc'];
export function refFrames() {
  const p = state.payload, ix = blockIndex(), set = new Set();
  for (const b of state.lumaBlocks || p.blocks) {
    if (b[C.pred] !== 'inter') continue;
    const f = refFrameOf(ix.get(b), 0);
    if (typeof f === 'number') set.add(f);
  }
  return [...set].sort((a, b) => Math.abs(a - p.f) - Math.abs(b - p.f) || a - b);
}
export const frameColor = (frames, f) => { const i = frames.indexOf(f); return i < 0 ? '#8a94a3' : FRAME_COLORS[i % FRAME_COLORS.length]; };
export function refFill() {
  const ix = blockIndex(), frames = refFrames();
  return (b) => { const f = refFrameOf(ix.get(b), 0); return typeof f === 'number' ? frameColor(frames, f) : refColor(b[C.ref0]); };
}

// payload.blocks row -> its index (fills draw state.lumaBlocks, rows of the same arrays), one map per payload
let ixCache = { p: null, map: null };
export function blockIndex() {
  const p = state.payload;
  if (ixCache.p !== p) ixCache = { p, map: new Map((p ? p.blocks : []).map((b, i) => [b, i])) };
  return ixCache.map;
}

// ------------------------------------------------------------ legends (categories present in this frame, by area)
function presentByArea(catOf) {
  const m = new Map();
  for (const b of state.lumaBlocks || state.payload.blocks) {
    const k = catOf(b);
    if (k) m.set(k, (m.get(k) || 0) + b[C.w] * b[C.h]);
  }
  return m;
}
const sw = (c) => `<span data-cat="${c.id}" title="${esc(c.title)}"><i style="background:${c.color}"></i>${esc(c.label)}</span>`;
export function txLegendHtml() {
  const m = presentByArea((b) => txCategory(b[C.tx_type], b[C.skip_txfm]));
  return TX_CATS.filter((c) => m.has(c.id)).map(sw).join('') + '<span class="note">the type of the block\'s first transform block</span>';
}
export function interLegendHtml() {
  const codec = codecOf(), ext = state.payload.ext || [], ix = blockIndex();
  const m = presentByArea((b) => interCategory(codec, b, ext[ix.get(b)]));
  return (INTER_CATS.filter((c) => m.has(c.id)).map(sw).join('') || '<span class="note">no inter block in this frame</span>') + '<span class="note">intra blocks are unfilled</span>';
}
// the categories the legend lists (tests: the set = the frame's mode values)
export function modesSnap() {
  if (!state.payload) return {};
  const codec = codecOf(), ext = state.payload.ext || [], ix = blockIndex();
  return {
    tx: [...presentByArea((b) => txCategory(b[C.tx_type], b[C.skip_txfm])).keys()].sort(),
    inter: [...presentByArea((b) => interCategory(codec, b, ext[ix.get(b)])).keys()].sort(),
  };
}

// ------------------------------------------------------------ Block tab rows
const kv = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
const has = (v) => v !== null && v !== undefined;
const vec = (v) => (Array.isArray(v) ? `(${v.map((x) => fmt(x)).join(', ')})` : esc(v));
const LISTS = { 1: 'L0', 2: 'L1', 3: 'L0 and L1' };

// Transform type row: the category of the block's first transform block.
export function txRowHtml(b) {
  const k = txCategory(b[C.tx_type], b[C.skip_txfm]), c = TX_BY_ID[k];
  return kv('Transform class', `<i class="bd-sw" style="background:${c.color}"></i>${esc(c.label)}`, k === 'none' ? '' : 'first transform block');
}

// "Inter details": the category, then what the codec's decoder fields say about how the vector was formed.
export function interRowsHtml(bi) {
  const codec = codecOf(), b = state.payload.blocks[bi], e = (state.payload.ext || [])[bi] || {};
  const k = interCategory(codec, b, e);
  if (!k) return '';
  const c = INTER_BY_ID[k];
  let h = kv('Inter category', `<i class="bd-sw" style="background:${c.color}"></i>${esc(c.label)}`, b[C.mode]);
  const row = (name, v, unit) => { if (has(v) && v !== '') h += kv(name, v, unit); };
  if (codec === 'av1' || codec === 'av2') {
    if (has(e.ref_mv_idx)) row('Candidate index', esc(Array.isArray(e.ref_mv_idx) ? e.ref_mv_idx.join(', ') : e.ref_mv_idx), 'ref_mv_idx (DRL)');
    if (has(e.num_proj_ref)) row('Warp samples', fmt(e.num_proj_ref), 'neighbour vectors fitted');
    if (has(e.warp_ref_idx)) row('Warp model', `from candidate ${fmt(e.warp_ref_idx)}${e.six_param_warp_model_flag ? ', 6 parameters' : ''}${e.warpmv_with_mvd_flag ? ', with a vector difference' : ''}`, 'warp_ref_idx');
    if (has(e.interintra_mode)) row('Inter-intra', `${esc(e.interintra_mode)}${e.use_wedge_interintra ? ', wedge' : ''}`);
    if (has(e.comp_group_idx)) row('Compound', e.comp_group_idx ? 'masked (wedge or difference weighted)' : (e.compound_idx === 0 ? 'distance weighted' : 'average'), `comp_group_idx ${e.comp_group_idx}${has(e.compound_idx) ? `, compound_idx ${e.compound_idx}` : ''}`);
    if (b[C.mode] && b[C.mode].endsWith('_OPTFLOW')) row('Refinement', 'optical flow');
    if (e.refinemv_flag) row('Refinement', 'decoder-side vector refinement', 'refinemv_flag');
    if (e.use_amvd) row('Adaptive MVD', 'yes', 'use_amvd');
    if (e.ref_is_tip) row('TIP reference', 'yes', 'ref_is_tip');
    if (Array.isArray(e.bawp_flag) && e.bawp_flag.some(Boolean)) row('Block adaptive weighting', esc(e.bawp_flag.join(', ')), 'bawp_flag');
    if (has(e.intrabc_drl_idx) && b[C.pred] === 'intrabc') row('Candidate index', fmt(e.intrabc_drl_idx), 'intrabc_drl_idx');
  } else if (codec === 'hevc') {
    (e.pus || []).forEach((u, i) => {
      const v = u.merge ? `merge candidate ${fmt(u.merge_idx)}`
        : `${LISTS[u.inter_dir] || '?'}: ${[0, 1].filter((l) => u.inter_dir & (1 << l)).map((l) => `ref ${u.ref_idx[l]}, predictor ${u.mvp_idx[l]}, MVD ${vec(u.mvd_qpel[l])}`).join('; ')}`;
      row(`PU ${i + 1} (${u.w}×${u.h})`, v, u.merge ? '' : 'MVD x, y in 1/4 pel');
    });
  } else if (codec === 'vvc') {
    if (has(e.MMVDMergeIdx)) row('MMVD index', fmt(e.MMVDMergeIdx), 'base candidate, step and direction in one index');
    else if (has(e.MergeIdx) && k !== 'explicit') row('Merge candidate', fmt(e.MergeIdx), e.subblock_merge ? 'subblock merge list' : 'merge list');
    if (has(e.AffineType) && k === 'affine') row('Affine model', e.AffineType ? '6 parameters' : '4 parameters', 'AffineType');
    if (has(e.geo_split_dir)) row('GEO split', fmt(e.geo_split_dir), 'merge_gpm_partition_idx');
    if (k === 'explicit' || (k === 'affine' && !e.MergeFlag && !e.skip)) {
      for (const l of [0, 1]) { const p = e[`MVPIdxL${l}`]; if (has(p) && p !== 255) row(`L${l} predictor`, fmt(p), `mvp_l${l}_flag`); }
      if (has(e.IMVMode)) row('Vector resolution', ['quarter sample', 'full sample', 'four samples', 'half sample'][e.IMVMode] || fmt(e.IMVMode), 'amvr (IMVMode)');
    }
    if (e.smvd) row('SMVD', 'symmetric vector difference');
    if (has(e.bcw) && e.bcw !== 2) row('BCW weight index', fmt(e.bcw), 'bcw_idx');
    if (e.sbt) row('Subblock transform', fmt(e.sbt), 'sbt mode');
  } else if (codec === 'avc') {
    (e.parts || []).forEach((u, i) => {
      const l = [0, 1].filter((j) => u.ref_idx && u.ref_idx[j] >= 0);
      row(`Partition ${i + 1} (${u.w}×${u.h})`, l.map((j) => `L${j} ref ${u.ref_idx[j]}${u.mvd_qpel && u.mvd_qpel[j] ? `, MVD ${vec(u.mvd_qpel[j])}` : ''}`).join('; ') || 'direct', 'MVD x, y in 1/4 pel');
    });
    if (Array.isArray(e.sub_types)) row('Sub-macroblocks', esc(e.sub_types.join(', ')));
  } else if (codec === 'vp9') {
    if (Array.isArray(e.ref_f)) row('Reference frames', esc(e.ref_f.map((f) => (f === null ? '–' : `frame ${f}`)).join(', ')), 'decode index');
    if (Array.isArray(e.sub)) row('Sub-block vectors', esc(e.sub.map((s) => (s.mv || []).map((m) => `(${m[1]}, ${m[0]})`).join(' ')).join(', ')), 'x, y in 1/8 pel, raster order');
  }
  return h;
}
