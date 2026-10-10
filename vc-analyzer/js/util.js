// Utilities, colours and the status line.  No viewer state except the codec of the open stream.
import { codecOf } from './state.js?v=9ce97af84e';

// ------------------------------------------------------------ utilities
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const fmt = (v, d = 1) => (v === null || v === undefined || v === '') ? '–'
  : (typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(d)) : String(v));
export const dims = (name) => { const m = /(\d+)X(\d+)/.exec(name || ''); return m ? [+m[1], +m[2]] : [4, 4]; };
export const dpr = () => window.devicePixelRatio || 1;

export const MISMATCH = (getComputedStyle(document.documentElement).getPropertyValue('--mismatch') || '').trim() || '#ff5c47';
export const FRAME_COLORS = {
  KEY_FRAME: '#e5484d', INTER_FRAME: '#4b8dff', INTRA_ONLY_FRAME: '#f0a33a', S_FRAME: '#b07cf7',
  I_SLICE: '#e5484d', P_SLICE: '#3fb8af', B_SLICE: '#4b8dff',
};
// VVC block modes (vca_vtm_dump): intra PLANAR / DC / ANG_n / MIP, chroma LM family, inter merge family and AMVP
const VVC_MODE_COLORS = {
  PLANAR: '#e5989b', DC: '#e8863a', MIP: '#c77dff', LM: '#ff9f5a', MDLM_L: '#ff9f5a', MDLM_T: '#ff9f5a',
  MERGE: '#52c7b8', SKIP_MERGE: '#3fb8af', MMVD: '#7fd3e8', SKIP_MMVD: '#6cc3d8',
  AFFINE_MERGE: '#2ec4a0', SKIP_AFFINE_MERGE: '#25a888', SBTMVP: '#9fb4ff', SKIP_SBTMVP: '#8aa2f0',
  CIIP: '#b39dff', GEO: '#8e7dff', SKIP_GEO: '#7d6cf0', AMVP: '#4b8dff', AFFINE_AMVP: '#2ec4a0', SMVD: '#6a5cff',
  PALETTE: '#cfd8dc',   // IBC modes take the intrabc colour (modeColor)
  PCM: '#cfd8dc',       // HEVC pcm_flag CU
};
const REF_COLORS = ['#4b8dff', '#3fb8af', '#f2c14e', '#e76f6f', '#b07cf7', '#7fd3e8', '#ff9f5a', '#9be15d'];
export const RAMP = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];

export function ramp(t) {
  t = clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
  const a = RAMP[i], b = RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
export const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function modeColor(mode, pred) {
  if (pred === 'intrabc') return '#48c774';
  const m = mode || '';
  if (VVC_MODE_COLORS[m]) return VVC_MODE_COLORS[m];
  const ang = /^ANG_(\d+)$/.exec(m);
  if (ang) {  // VVC angular 2..66: 18 = horizontal, 50 = vertical; HEVC 2..34: 10 and 26
    const a = +ang[1];
    const [hor, ver, near] = codecOf() === 'hevc' ? [10, 26, 1] : [18, 50, 2];
    return Math.abs(a - ver) <= near ? '#f2c14e' : (Math.abs(a - hor) <= near ? '#d9a441' : '#e76f6f');
  }
  if (pred === 'intra') {
    if (m.startsWith('I_16x16')) return '#f2c14e';   // AVC
    if (m === 'I_NxN') return '#e76f6f';
    if (m === 'I_PCM') return '#cfd8dc';
    if (m === 'DC_PRED') return '#e8863a';
    if (m === 'V_PRED') return '#f2c14e';
    if (m === 'H_PRED') return '#d9a441';
    if (/^D\d+_PRED$/.test(m)) return '#e76f6f';
    if (m.startsWith('SMOOTH')) return '#e5989b';
    if (m === 'PAETH_PRED') return '#b5838d';
    return '#e8863a';
  }
  if (/^[PB]_/.test(m)) {                 // AVC: skip, direct, 8x8 sub-partitions, bi-prediction, 16x8 / 8x16
    if (m.endsWith('_Skip')) return '#3fb8af';
    if (m.startsWith('B_Direct')) return '#52c7b8';
    if (m.endsWith('8x8')) return '#8e7dff';
    if (m.includes('Bi')) return '#6a5cff';
    if (/16x8|8x16/.test(m)) return '#7b8cff';
    return '#4b8dff';
  }
  if (m.includes('OPTFLOW')) return '#b39dff';
  if (m.startsWith('WARP')) return '#2ec4a0';
  if (m === 'JOINT_NEWMV') return '#8e7dff';
  if (m === 'GLOBAL_GLOBALMV') return '#9fb4ff';
  if (/_/.test(m.replace(/MV$/, '')) && /(NEAR|NEW|NEAREST|GLOBAL).*_(NEAR|NEW|NEAREST|GLOBAL)/.test(m))
    return m.includes('NEW') ? '#6a5cff' : '#7b8cff';
  if (m === 'NEWMV') return '#4b8dff';
  if (m === 'GLOBALMV') return '#7fd3e8';
  if (m === 'NEARESTMV') return '#3fb8af';
  if (m === 'NEARMV') return '#52c7b8';
  return '#4b8dff';
}

function refIndex(name) {
  if (!name) return -1;
  const m = /^REF(\d)$/.exec(name);
  if (m) return +m[1];
  const v = /^L([01])_(\d+)$/.exec(name);  // VVC: reference list and index
  if (v) return (+v[1]) * 4 + (+v[2] % 4);
  const av1 = ['LAST', 'LAST2', 'LAST3', 'GOLDEN', 'BWDREF', 'ALTREF2', 'ALTREF'].indexOf(name);
  return av1;
}
export const ohPart = (fr) => (fr.order_hint === null || fr.order_hint === undefined ? '' : `, order hint ${fr.order_hint}`);   // VP9 has none
// decoder field values: lists of numbers joined, objects (e.g. AVC partitions) as compact JSON
export const extText = (v) => {
  const s = Array.isArray(v) && !v.some((x) => x && typeof x === 'object') ? v.join(', ')
    : (v && typeof v === 'object' ? JSON.stringify(v) : String(v));
  return s.length > 240 ? s.slice(0, 240) + ' …' : s;
};
export const typeName = (t) => String(t || '').replace('_FRAME', '').replace('_SLICE', '').replace('_', ' ').toLowerCase();

export function refColor(name) {
  if (name === 'TIP') return '#ff66c4';
  if (name === 'INTRA' || !name) return '#8a94a3';
  const i = refIndex(name);
  return i >= 0 ? REF_COLORS[i % REF_COLORS.length] : '#8a94a3';
}

// ------------------------------------------------------------ status
export function setStatus(msg) { $('#statusbar').textContent = msg; }
export function setEmpty(msg) { const e = $('#emptyState'); e.hidden = !msg; e.textContent = msg || ''; }
