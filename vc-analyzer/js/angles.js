// F14 (R49, T-0049): intra prediction direction per block, from the angle tables of each codec.  No imports and no
// DOM, so node can load it (tests/test_angles.py checks the tables and the vectors against the spec processes).
// A direction is the copy direction: the way the neighbouring reference samples are carried into the block, as a
// unit vector in picture coordinates (x right, y down).  V_PRED = [0, 1] (down), H_PRED = [1, 0] (right).

// AV1 spec Mode_To_Angle (7.11.2.4), AV2 spec Mode_To_Angle (7.13.2.7, AVM blockd.h mode_to_angle_map): degrees
// counter-clockwise from the x axis to where the reference samples lie.  pAngle = Mode_To_Angle + AngleDelta * ANGLE_STEP.
export const MODE_TO_ANGLE = { V_PRED: 90, H_PRED: 180, D45_PRED: 45, D135_PRED: 135, D113_PRED: 113, D157_PRED: 157, D203_PRED: 203, D67_PRED: 67 };
export const ANGLE_STEP = 3;
// AV2 spec 7.13.2.7: pAngle also adds Mrl_Index_To_Delta[ MrlIndex ], then wide_angle_mapping (5.20.7.29) with the
// transform block's size: [h / w or w / h, WAIP_WH_RATIO_<n>_THRES].
export const MRL_INDEX_TO_DELTA = [0, 1, -1, 0];
export const WAIP_THRES = [[2, 61], [4, 73], [8, 82], [16, 86]];
// Dr_Intra_Derivative[ angle ] (AV1 spec additional tables, AV2 spec additional tables = AVM av2_common_int.h
// dr_intra_derivative): the sample step along the reference edge per row or column, 1/64 sample.  The directional
// process (AV1 7.11.2.4, AV2 7.13.2.8) reads the row above at j + (i + 1) * Dr[ pAngle ] / 64 when pAngle < 90, at
// j - (i + 1) * Dr[ 180 - pAngle ] / 64 when 90 < pAngle < 180, the left column at i + (j + 1) * Dr[ 270 - pAngle ] / 64
// when pAngle > 180.  AV2's steps are snapped to simpler slopes: its 61 degrees reads like 63.4 (Dr 32).
export const AV1_DR = [
  0, 0, 0, 1023, 0, 0, 547, 0, 0, 372, 0, 0, 0, 0, 273,
  0, 0, 215, 0, 0, 178, 0, 0, 151, 0, 0, 132, 0, 0, 116,
  0, 0, 102, 0, 0, 0, 90, 0, 0, 80, 0, 0, 71, 0, 0,
  64, 0, 0, 57, 0, 0, 51, 0, 0, 45, 0, 0, 0, 40, 0,
  0, 35, 0, 0, 31, 0, 0, 27, 0, 0, 23, 0, 0, 19, 0,
  0, 15, 0, 0, 0, 0, 11, 0, 0, 7, 0, 0, 3, 0, 0,
];
export const AV2_DR = [
  0, 4096, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 409, 409, 372, 341,
  292, 273, 256, 227, 215, 204, 186, 178, 170, 157, 151, 146, 136, 132, 128,
  117, 110, 107, 99, 97, 97, 93, 87, 83, 81, 77, 74, 73, 69, 66,
  64, 62, 59, 56, 55, 53, 50, 49, 47, 44, 42, 42, 41, 38, 37,
  35, 32, 31, 30, 28, 27, 26, 24, 23, 22, 20, 19, 18, 16, 15,
  14, 12, 11, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];
// VP9 (libvpx vpx_dsp/intrapred.c d45 ... d207_predictor): the mode names are the angles in the same convention; the
// predictors step by whole and half samples (D63 = atan 2 = 63.4 degrees).  Copy direction as a sample step.
export const VP9_COPY = {
  V_PRED: [0, 1], H_PRED: [1, 0], D45_PRED: [-1, 1], D135_PRED: [1, 1],
  D117_PRED: [0.5, 1], D153_PRED: [1, 0.5], D207_PRED: [1, -0.5], D63_PRED: [-0.5, 1],
};
// HEVC (HM TComPrediction.cpp angTable): |intraPredAngle| for |mode - 26| (modes 18..34) or |mode - 10| (2..17),
// in 1/32 sample per row (column).
export const HEVC_ANG_TABLE = [0, 2, 5, 9, 13, 17, 21, 26, 32];
// VVC (VTM IntraPrediction.cpp angTable): |intraPredAngle| for |mode - 50| (vertical) or |mode - 18| (horizontal)
// after the wide-angle mapping, 1/32 sample units.
export const VVC_ANG_TABLE = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 23, 26, 29, 32, 35, 39, 45, 51, 57, 64, 73, 86, 102, 128, 171, 256, 341, 512, 1024];
// VVC wide-angle mapping (VTM getModifiedWideAngle, spec 8.4.5.2.7): modes shifted for |log2(W) - log2(H)|.
export const VVC_MODE_SHIFT = [0, 6, 10, 12, 14, 15];
// AVC Intra_4x4 / Intra_8x8 modes (H.264 8.3.1.2, JM intra4x4_pred_normal.c): copy direction as a sample step.
export const AVC_COPY = {
  VERT: [0, 1], HOR: [1, 0], DIAG_DOWN_LEFT: [-1, 1], DIAG_DOWN_RIGHT: [1, 1],
  VERT_RIGHT: [0.5, 1], HOR_DOWN: [1, 0.5], VERT_LEFT: [-0.5, 1], HOR_UP: [1, -0.5],
};

const unit = (v) => { const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; };
// AV1 / AV2 copy direction of pAngle (degrees, 0 < p < 270) through the codec's Dr_Intra_Derivative table
export function drVec(p, dr) {
  if (p === 90) return [0, 1];
  if (p === 180) return [1, 0];
  if (p < 90) return unit([-dr[p] / 64, 1]);
  if (p < 180) return unit([dr[180 - p] / 64, 1]);
  return unit([1, -dr[270 - p] / 64]);
}
// the angle in degrees a copy direction is drawn at (the convention of Mode_To_Angle), for labels
export const vecDegrees = (v) => Math.round(((Math.atan2(v[1], -v[0]) * 180 / Math.PI) + 360) % 360 * 10) / 10;

// AV2 pAngle with the MRL offset and the wide-angle mapping for a tw x th transform block.
export function av2Angle(mode, delta, mrl, tw, th) {
  const p0 = MODE_TO_ANGLE[mode] + (delta || 0) * ANGLE_STEP + (MRL_INDEX_TO_DELTA[mrl || 0] || 0);
  for (const [r, t] of WAIP_THRES) {
    if (th === r * tw && p0 < t) return { p: 180 + p0, p0, wide: true };
    if (tw === r * th && p0 > 270 - t) return { p: p0 - 180, p0, wide: true };
  }
  return { p: p0, p0, wide: false };
}
// HEVC angular mode 2..34: copy direction.  Vertical class (>= 18) reads the row above at x + (y + 1) * angle / 32,
// horizontal class the left column at y + (x + 1) * angle / 32.
export function hevcVec(mode) {
  const ver = mode >= 18, a = ver ? mode - 26 : -(mode - 10);
  const ang = Math.sign(a) * HEVC_ANG_TABLE[Math.abs(a)];
  return unit(ver ? [-ang / 32, 1] : [1, -ang / 32]);
}
// VVC: the mode after the wide-angle mapping for an nW x nH block, in the spec's numbering (-14..80).
export function vvcWideMode(mode, nW, nH) {
  if (mode < 2 || mode > 66) return mode;
  const d = Math.abs(Math.log2(nW) - Math.log2(nH)), sh = VVC_MODE_SHIFT[Math.min(d, 5)];
  if (nW > nH && mode < 2 + sh) return mode + 65;
  if (nH > nW && mode > 66 - sh) return mode - 67;
  return mode;
}
export function vvcVec(mode, nW, nH) {
  const m = vvcWideMode(mode, nW, nH);
  const mm = m < 0 ? m + 2 : m;   // VTM's index (modes 0 and 1 are not angular: -1 sits next to 2)
  const ver = mm >= 34, a = ver ? mm - 50 : -(mm - 18);
  const ang = Math.sign(a) * VVC_ANG_TABLE[Math.abs(a)];
  return unit(ver ? [-ang / 32, 1] : [1, -ang / 32]);
}

const dims = (name) => { const m = /(\d+)X(\d+)/.exec(name || ''); return m ? [+m[1], +m[2]] : null; };
const angNum = (mode) => { const m = /^ANG_(\d+)$/.exec(mode || ''); return m ? +m[1] : -1; };

// The intra marks of one block: [{x, y, w, h, v, text}] where v is the copy direction or null (a non-directional
// mode: a dot), text names the mode and the angle.  b = {x, y, w, h, bsize, pred, mode, tx_size}; ext = the
// block's decoder fields (bundle frames/<f>.json ext[i], `_` holds angle_delta).  [] = nothing to draw (inter,
// PCM, a chroma-tree block).
export function intraMarks(codec, b, ext) {
  if (b.pred !== 'intra') return [];
  const e = ext || {}, x = (e._ || {}), mode = b.mode || '';
  const one = (v, text) => [{ x: b.x, y: b.y, w: b.w, h: b.h, v, text }];
  if (codec === 'av1' || codec === 'av2') {
    if ((x.palette_size || [])[0] > 0) return one(null, 'palette');
    if (codec === 'av1' && e.use_filter_intra) return one(null, `filter intra ${e.filter_intra_mode || ''}`.trim());
    if (codec === 'av2' && e.use_intra_dip) return one(null, 'data-driven intra prediction (DIP)');
    if (!(mode in MODE_TO_ANGLE)) return one(null, mode);
    const delta = (x.angle_delta || [0])[0] || 0;
    if (codec === 'av1') { const p = MODE_TO_ANGLE[mode] + delta * ANGLE_STEP; return one(drVec(p, AV1_DR), `${mode}, pAngle ${p}°`); }
    const t = dims(b.tx_size) || [Math.min(b.w, 64), Math.min(b.h, 64)];
    const a = av2Angle(mode, delta, e.mrl_index, t[0], t[1]);
    return one(drVec(a.p, AV2_DR), `${mode}, pAngle ${a.p}°${a.wide ? ` (wide angle from ${a.p0}° for the ${t[0]}×${t[1]} transform)` : ''}`);
  }
  if (codec === 'vp9') {
    const sub = e.sub;
    if (Array.isArray(sub) && sub.length) {
      // BLOCK_4X4: four 4x4 in raster order; 4X8: left, right; 8X4: top, bottom (vca_vpx_dump.c)
      const n = sub.length, tall = n === 2 && /4X8/.test(b.bsize || ''), sw = n === 4 || tall ? b.w / 2 : b.w, sh = n === 4 || !tall ? b.h / 2 : b.h;
      return sub.map((s, i) => {
        const sx = n === 4 ? i & 1 : (tall ? i : 0), sy = n === 4 ? i >> 1 : (tall ? 0 : i), m = s.mode || '';
        return { x: b.x + sx * sw, y: b.y + sy * sh, w: sw, h: sh, v: VP9_COPY[m] ? unit(VP9_COPY[m]) : null, text: m };
      });
    }
    return one(VP9_COPY[mode] ? unit(VP9_COPY[mode]) : null, mode);
  }
  if (codec === 'hevc') {
    if (mode === 'PCM') return [];
    const list = Array.isArray(e.intra_modes) && e.intra_modes.length === 4 ? e.intra_modes : null;
    if (list) {   // NxN: four PUs in z order
      return list.map((m, i) => { const a = angNum(m); return { x: b.x + (i & 1) * b.w / 2, y: b.y + (i >> 1) * b.h / 2, w: b.w / 2, h: b.h / 2, v: a >= 2 ? hevcVec(a) : null, text: m }; });
    }
    const a = angNum(mode);
    return one(a >= 2 ? hevcVec(a) : null, mode);
  }
  if (codec === 'vvc') {
    const a = angNum(mode);
    if (a < 2) return one(null, mode);
    // the wide-angle mapping uses the transform block (ISP: the coding block), VTM initPredIntraParams
    const isp = e.isp === 0 || e.isp === 1, t = isp ? [b.w, b.h] : (dims(b.tx_size) || [Math.min(b.w, 64), Math.min(b.h, 64)]);
    const m = vvcWideMode(a, t[0], t[1]);
    return one(vvcVec(a, t[0], t[1]), m !== a ? `${mode}, wide angle mode ${m} (${t[0]}×${t[1]})` : mode);
  }
  if (codec === 'avc') {
    if (mode === 'I_PCM') return [];
    const grid = (list, n) => list.map((m, i) => ({ x: b.x + (i % n) * b.w / n, y: b.y + Math.floor(i / n) * b.h / n, w: b.w / n, h: b.h / n, v: AVC_COPY[m] ? unit(AVC_COPY[m]) : null, text: m }));
    if (Array.isArray(e.i4x4) && e.i4x4.length === 16) return grid(e.i4x4, 4);   // raster order (vca_jm_dump.c)
    if (Array.isArray(e.i8x8) && e.i8x8.length === 4) return grid(e.i8x8, 2);
    const m = e.i16_mode;
    return one(m === 'VERT' || m === 'HOR' ? unit(AVC_COPY[m]) : null, m ? `Intra_16x16 ${m}` : mode);
  }
  return [];
}
