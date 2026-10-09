// Pixel planes: stacked Y/U/V PNG -> sample arrays -> pictures, and sample values under the pointer.
// F-b track Y (R49): the picture's component, colour matrix and range (F23), exact samples above 8 bits (F24).
import { frameMeta, perfMark, state } from './state.js?v=4a164c6c45';
import { clamp } from './util.js?v=4a164c6c45';
import { getBlob } from './data.js?v=4a164c6c45';

// ------------------------------------------------------------- planes
async function decodePng(blob) {
  let bmp;
  try {
    bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  } catch (e) {
    bmp = await createImageBitmap(blob);
  }
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const g = new Uint8Array(c.width * c.height);
  for (let i = 0; i < g.length; i++) g[i] = d[i * 4];
  return { w: c.width, h: c.height, g };
}

// The Y, U and V rows of a stacked PNG (Y rows, then U rows, then V rows, each padded to the widest plane).
function unstack(img, w, h, cw, ch, mono, T = Uint8Array) {
  const Y = new T(w * h);
  for (let y = 0; y < h; y++) Y.set(img.g.subarray(y * img.w, y * img.w + w), y * w);
  let U = null, V = null;
  if (!mono && img.h >= h + 2 * ch) {
    U = new T(cw * ch); V = new T(cw * ch);
    for (let y = 0; y < ch; y++) {
      U.set(img.g.subarray((h + y) * img.w, (h + y) * img.w + cw), y * cw);
      V.set(img.g.subarray((h + ch + y) * img.w, (h + ch + y) * img.w + cw), y * cw);
    }
  }
  return { Y, U, V };
}
const planePath = (f, stage, variant, lo = false) => `planes/${f}.${stage}${variant ? '.' + variant : ''}${lo ? '.lo' : ''}.png`;
function geometry(f) {
  const fr = frameMeta(f);
  const seq = state.manifest.stream.sequence || {};
  const ssx = seq.subsampling_x ?? 1, ssy = seq.subsampling_y ?? 1, mono = !!seq.monochrome;
  const w = fr.width, h = fr.height;
  return { w, h, cw: (w + ssx) >> ssx, ch: (h + ssy) >> ssy, ssx, ssy, mono };
}

// variant '' = A's samples, 'b' = B's samples, 'diff' = exact A − B (128 = equal)
export async function loadPlanes(f, stage, variant = '') {
  const key = f + ':' + stage + ':' + variant;
  if (state.planeCache.has(key)) return state.planeCache.get(key);
  const g = geometry(f);
  const img = await decodePng(await getBlob(planePath(f, stage, variant)));
  const planes = { w: g.w, h: g.h, cw: g.cw, ch: g.ch, ssx: g.ssx, ssy: g.ssy, ...unstack(img, g.w, g.h, g.cw, g.ch, g.mono) };
  state.planeCache.set(key, planes);
  if (state.planeCache.size > 48) state.planeCache.delete(state.planeCache.keys().next().value);
  return planes;
}

// ------------------------------------------------------- exact samples (F24)
// At 8 bits the view PNG holds the samples.  Above 8 bits the view PNG holds v >> (bd − 8) and
// planes/<f>.<stage>.lo.png the bits it loses (SERVER_API.md §16): v = (view << (bd − 8)) | lo, kept as
// Uint16Array.  A frame without a .lo.png (a sample >= 2^bd) keeps the 8-bit view values, marked exact: false.
// Loaded only on request (the sample grid, a hover above 8 bits, A − B values).  One cache per opened manifest.
const exactStore = new WeakMap();
function exactMap() {
  let m = exactStore.get(state.manifest);
  if (!m) { m = new Map(); exactStore.set(state.manifest, m); }
  return m;
}
// bit depth of frame f: its payload when loaded, else the sequence's
export function frameBitDepth(f) {
  const p = state.frameCache.get(f);
  return (p && p.frame && p.frame.bit_depth) || ((state.manifest.stream.sequence || {}).bit_depth) || 8;
}
export function loadExact(f, stage, variant = '') {
  const m = exactMap(), key = f + ':' + stage + ':' + variant;
  if (m.has(key)) return m.get(key).promise;
  const e = { planes: undefined, promise: null };
  e.promise = (async () => {
    const bd = frameBitDepth(f);
    const view = await loadPlanes(f, stage, variant);
    if (bd <= 8) return { ...view, bd, exact: true };
    let img;
    try { img = await decodePng(await getBlob(planePath(f, stage, variant, true))); } catch (err) { return { ...view, bd, exact: false }; }
    const g = geometry(f), shift = bd - 8;
    const lo = unstack(img, g.w, g.h, g.cw, g.ch, g.mono);
    const join = (v, l) => { if (!v || !l) return null; const o = new Uint16Array(v.length); for (let i = 0; i < v.length; i++) o[i] = (v[i] << shift) | l[i]; return o; };
    return { ...view, Y: join(view.Y, lo.Y), U: join(view.U, lo.U), V: join(view.V, lo.V), bd, exact: true };
  })().then((v) => { e.planes = v; return v; }, () => { e.planes = null; return null; });
  m.set(key, e);
  if (m.size > 12) m.delete(m.keys().next().value);   // a 1080p 4:2:0 frame above 8 bits holds 6 MB here
  return e.promise;
}
// the exact planes when loaded, undefined while not asked for or loading, null when they could not be read
function exactNow(f, stage, variant, start) {
  const e = exactMap().get(f + ':' + stage + ':' + variant);
  if (e) return e.planes;
  if (start) loadExact(f, stage, variant);
  return undefined;
}
// Exact values of a picture (its src, buildPicture): {bd, exact, signed, value(plane, x, y)} in plane
// coordinates, undefined while loading (start = ask for them), null when they cannot be read.
export function exactOf(pic, start = true) {
  const src = pic && pic.src;
  if (!src) return null;
  const A = exactNow(src.f, src.a[0], src.a[1], start);
  const B = src.b ? exactNow(src.f, src.b[0], src.b[1], start) : null;
  if (A === undefined || B === undefined) return undefined;
  if (!A || (src.b && !B)) return null;
  const at = (P, x, y) => (P === 'Y' ? y * A.w + x : y * A.cw + x);
  return {
    bd: A.bd, exact: A.exact && (!B || B.exact), signed: !!src.b, planes: A,
    has: (P) => !!A[P],
    value: B ? (P, x, y) => A[P][at(P, x, y)] - B[P][at(P, x, y)] : (P, x, y) => A[P][at(P, x, y)],
  };
}
// promise for the exact values of a picture (resolves when exactOf gives them or gives up)
export function whenExact(pic) {
  const src = pic && pic.src;
  if (!src) return Promise.resolve(null);
  return Promise.all([loadExact(src.f, src.a[0], src.a[1]), src.b ? loadExact(src.f, src.b[0], src.b[1]) : null]);
}

// --------------------------------------------------------------- look (F23)
// How samples become a picture: the component (colour, Y, U or V), the YUV -> RGB matrix and the sample
// range.  Auto = manifest.stream.color (SERVER_API.md §16), else BT.601 limited range, the drawing before R49.
export const MATRICES = {
  bt601: { label: 'BT.601', kr: 0.299, kb: 0.114 },
  bt709: { label: 'BT.709', kr: 0.2126, kb: 0.0722 },
  bt2020: { label: 'BT.2020', kr: 0.2627, kb: 0.0593 },
  identity: { label: 'Identity (GBR)' },
};
// a signalled matrix -> the one drawn (constant luminance BT.2020, SMPTE 240M and FCC by their nearest);
// matrices not listed (YCgCo, ICtCp, chromaticity derived) are drawn as BT.601
const NEAREST = { bt601: 'bt601', bt709: 'bt709', bt2020: 'bt2020', bt2020cl: 'bt2020', smpte240: 'bt709', fcc: 'bt601', identity: 'identity' };
export function pictureLook() {
  const c = (state.manifest && state.manifest.stream && state.manifest.stream.color) || null;
  const sig = c && c.matrix ? c.matrix : null;
  const autoMatrix = sig ? NEAREST[sig] || 'bt601' : 'bt601';
  const autoRange = c && (c.range === 'full' || c.range === 'limited') ? c.range : 'limited';
  return {
    comp: state.comp, matrix: state.matrix === 'auto' ? autoMatrix : state.matrix, range: state.range === 'auto' ? autoRange : state.range,
    autoMatrix, autoRange, signalled: sig, signalledRange: c ? c.range || null : null,
    nearest: !!(sig && NEAREST[sig] && NEAREST[sig] !== sig), unknown: !!(sig && !NEAREST[sig]),
  };
}
const lookKey = (L) => `${L.comp}|${L.matrix}|${L.range}`;
export const currentLookKey = () => lookKey(pictureLook());

// YUV -> RGB factors: R = ys (Y − yo) + rv v, G = ys (Y − yo) − gu u − gv v, B = ys (Y − yo) + bu u,
// u, v = chroma − 128.  BT.601 limited keeps the rounded factors of the drawing before R49 (same pixels).
function factors(matrix, range) {
  if (matrix === 'bt601' && range === 'limited') return { ys: 1.164, yo: 16, rv: 1.596, gu: 0.392, gv: 0.813, bu: 2.017 };
  const lim = range === 'limited', cs = lim ? 255 / 224 : 1;
  const { kr, kb } = MATRICES[matrix] || MATRICES.bt601, kg = 1 - kr - kb;
  return { ys: lim ? 255 / 219 : 1, yo: lim ? 16 : 0, rv: cs * 2 * (1 - kr), gu: cs * 2 * (1 - kb) * kb / kg, gv: cs * 2 * (1 - kr) * kr / kg, bu: cs * 2 * (1 - kb) };
}

function planesToCanvas(p, look) {
  const c = document.createElement('canvas');
  c.width = p.w; c.height = p.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(p.w, p.h);
  const d = im.data;
  const comp = p.U ? look.comp : 'y';   // monochrome: luma only
  const lim = look.range === 'limited';
  for (let y = 0; y < p.h; y++) {
    const cy = (y >> p.ssy) * p.cw;
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, o = i * 4;
      if (comp === 'y') {
        const v = lim ? clamp(1.164 * (p.Y[i] - 16), 0, 255) : p.Y[i]; d[o] = d[o + 1] = d[o + 2] = v;
      } else if (comp === 'u' || comp === 'v') {
        // a chroma plane as gray, each sample over the luma pixels it covers (overlays stay aligned)
        const s = (comp === 'u' ? p.U : p.V)[cy + (x >> p.ssx)];
        const v = lim ? clamp((s - 16) * 255 / 224, 0, 255) : s; d[o] = d[o + 1] = d[o + 2] = v;
      } else if (look.matrix === 'identity') {
        // GBR: the planes hold G, B and R
        const ci = cy + (x >> p.ssx), k = lim ? 255 / 219 : 1, o16 = lim ? 16 : 0;
        d[o] = clamp(k * (p.V[ci] - o16), 0, 255); d[o + 1] = clamp(k * (p.Y[i] - o16), 0, 255); d[o + 2] = clamp(k * (p.U[ci] - o16), 0, 255);
      } else {
        const F = look.F, Yv = F.ys * (p.Y[i] - F.yo);
        const ci = cy + (x >> p.ssx), u = p.U[ci] - 128, v = p.V[ci] - 128;
        d[o] = clamp(Yv + F.rv * v, 0, 255);
        d[o + 1] = clamp(Yv - F.gu * u - F.gv * v, 0, 255);
        d[o + 2] = clamp(Yv + F.bu * u, 0, 255);
      }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

// The plane a difference picture follows: U or V when that component is chosen, else luma.
const diffPlane = (p, comp) => (p.U && (comp === 'u' || comp === 'v') ? comp.toUpperCase() : 'Y');
// Diverging view of a difference (luma, or the chosen chroma plane): amber = positive, cyan = negative.
function diffToCanvas(a, b, gain, comp) {
  const c = document.createElement('canvas');
  c.width = a.w; c.height = a.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(a.w, a.h);
  const d = im.data;
  const P = diffPlane(a, comp);
  let nz = 0, maxAbs = 0;
  if (P !== 'Y') for (let i = 0; i < a[P].length; i++) { const v = a[P][i] - b[P][i]; if (v) { nz++; maxAbs = Math.max(maxAbs, Math.abs(v)); } }
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x, o = i * 4;
      let diff;
      if (P === 'Y') { diff = a.Y[i] - b.Y[i]; if (diff) { nz++; maxAbs = Math.max(maxAbs, Math.abs(diff)); } }
      else { const ci = (y >> a.ssy) * a.cw + (x >> a.ssx); diff = a[P][ci] - b[P][ci]; }
      const t = clamp(Math.abs(diff) * gain / 255, 0, 1);
      const base = 30;
      if (diff > 0) { d[o] = base + 225 * t; d[o + 1] = base + 150 * t; d[o + 2] = base; }
      else if (diff < 0) { d[o] = base; d[o + 1] = base + 190 * t; d[o + 2] = base + 225 * t; }
      else { d[o] = d[o + 1] = d[o + 2] = base; }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  c.stats = P === 'Y' ? { changed: nz, total: a.Y.length, maxAbs } : { changed: nz, total: a[P].length, maxAbs, plane: P };
  return c;
}

// Exact A − B image from the server (128 = equal).  Luma differences drive
// the colour; where luma is equal but chroma differs, the chroma difference
// is shown the same way.  Any nonzero difference is clearly visible.  With the
// U or V component chosen, only that plane's difference is drawn.
function signedDiffToCanvas(p, comp) {
  const c = document.createElement('canvas');
  c.width = p.w; c.height = p.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(p.w, p.h);
  const d = im.data;
  const P = diffPlane(p, comp);
  let ny = 0, nc = 0, maxAbs = 0;
  const cdiff = (x, y) => {
    if (!p.U) return 0;
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return (p.U[ci] - 128) || (p.V[ci] - 128);
  };
  if (P !== 'Y') for (let i = 0; i < p[P].length; i++) { if (p[P][i] !== 128) nc++; }
  else if (p.U) for (let i = 0; i < p.U.length; i++) if (p.U[i] !== 128 || p.V[i] !== 128) nc++;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, o = i * 4;
      let v;
      if (P === 'Y') {
        v = p.Y[i] - 128;
        if (v) ny++;
        else v = cdiff(x, y);
      } else v = p[P][(y >> p.ssy) * p.cw + (x >> p.ssx)] - 128;
      maxAbs = Math.max(maxAbs, Math.abs(v));
      const t = v ? 0.35 + 0.65 * Math.min(1, Math.abs(v) / 16) : 0, base = 30;
      if (v > 0) { d[o] = base + 225 * t; d[o + 1] = base + 150 * t; d[o + 2] = base; }
      else if (v < 0) { d[o] = base; d[o + 1] = base + 190 * t; d[o + 2] = base + 225 * t; }
      else { d[o] = d[o + 1] = d[o + 2] = base; }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  c.stats = P === 'Y' ? { changed: ny, total: p.Y.length, maxAbs, chroma: nc, exact: true }
    : { changed: 0, total: p[P].length, maxAbs, chroma: nc, exact: true, plane: P };
  return c;
}

function neutralCanvas(fr) {
  const c = document.createElement('canvas');
  c.width = fr.width; c.height = fr.height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(30,30,30)'; ctx.fillRect(0, 0, c.width, c.height);
  c.stats = { changed: 0, total: fr.width * fr.height, maxAbs: 0, chroma: 0, exact: true };
  return c;
}

export const stageDiffers = (st) => !!(state.fdiff && state.fdiff.stages && state.fdiff.stages[st] && state.fdiff.stages[st].status === 'differs');

// The picture of frame f at a pixel stage (default: the stage chosen in the toolbar; split and side by
// side views build their second picture with their own stage).  src names the exact samples behind it
// (exactOf): a = [stage, variant] and, for differences, b (value = a − b).
export async function buildPicture(f, stage = state.stage) {
  const fr = frameMeta(f);
  const stages = fr.stages || [];
  const look = pictureLook();
  look.F = factors(look.matrix, look.range);
  const tag = (pic) => Object.assign(pic, { f, look: lookKey(look) });
  try {
    if (stage.startsWith('B:') || stage.startsWith('D:')) {
      const base = stage.slice(2);
      if (!stages.includes(base)) throw new Error(`this frame has no ${base} pixels`);
      const differs = stageDiffers(base);
      if (stage.startsWith('D:')) {
        const src = { f, a: [base, ''], b: [base, differs ? 'b' : ''] };
        if (!differs) return tag({ canvas: neutralCanvas(fr), planes: null, stage, kind: 'diff', src });
        const p = await loadPlanes(f, base, 'diff');
        perfMark('planes');
        return tag({ canvas: signedDiffToCanvas(p, look.comp), planes: p, stage, kind: 'diff', src });
      }
      const p = await loadPlanes(f, base, differs ? 'b' : '');
      perfMark('planes');
      return tag({ canvas: planesToCanvas(p, look), planes: p, stage, kind: 'b', same: !differs, src: { f, a: [base, differs ? 'b' : ''] } });
    }
    if (stage === 'lfdelta' || stage === 'residual') {
      const [x, y] = stage === 'lfdelta' ? ['recon', 'prefilter'] : ['prefilter', 'pred'];
      if (!stages.includes(x) || !stages.includes(y)) throw new Error(`this frame has no ${x}/${y} pixels`);
      const [pa, pb] = await Promise.all([loadPlanes(f, x), loadPlanes(f, y)]);
      return tag({ canvas: diffToCanvas(pa, pb, stage === 'lfdelta' ? 16 : 4, look.comp), planes: pa, diff: true, stage,
               delta: { a: pa, b: pb, label: stage === 'lfdelta' ? 'recon − prefilter' : 'prefilter − pred' }, src: { f, a: [x, ''], b: [y, ''] } });
    }
    const use = stages.includes(stage) ? stage : (stages.includes('recon') ? 'recon' : null);
    if (!use) return tag(noPicture(fr, stage));
    const p = await loadPlanes(f, use);
    perfMark('planes');
    return tag({ canvas: planesToCanvas(p, look), planes: p, stage: use, src: { f, a: [use, ''] } });
  } catch (e) {
    return tag(noPicture(fr, stage));
  }
}
// A frame without pixels (a cut or damaged stream: the decoder wrote no output
// for it) still draws: a neutral picture under the blocks; frameSummary says why.
function noPicture(fr, stage) {
  const canvas = neutralCanvas(fr);
  delete canvas.stats;   // not a difference picture
  return { canvas, planes: null, stage, kind: 'none' };
}

// Sample values under the pointer for the status line: exact at any bit depth (F24).  Above 8 bits, and
// for A − B, the exact samples load on the first hover of a frame; until then (or when a frame has none)
// the 8-bit view values are shown and marked.  pixelPending() is the load to wait for, or null.
let pending = null;
export const pixelPending = () => pending;
export function pixelAt(x, y, pic = state.picture) {
  pending = null;
  const p = pic && pic.planes;
  const sgn = (v) => (v > 0 ? '+' + v : String(v));
  const bd = pic && pic.src ? frameBitDepth(pic.src.f) : 8;
  const wantExact = !!(pic && pic.src && (bd > 8 || pic.kind === 'diff'));
  const ex = wantExact ? exactOf(pic) : null;
  if (wantExact && ex === undefined) pending = whenExact(pic);
  const exact = ex && ex.exact ? ex : null;
  // (the A − B PNG holds exact differences, clamped to ±127: no mark)
  const view = wantExact && !exact && bd > 8 && pic.kind !== 'diff' ? ' (8-bit view)' : '';
  // Y, U and V of (x, y): from the exact samples when loaded, else from get(plane, index)
  const yuv = (get, chroma) => {
    const ci = chroma && p.U ? [(x >> p.ssx), (y >> p.ssy)] : null;
    const val = (P) => (exact ? exact.value(P, P === 'Y' ? x : ci[0], P === 'Y' ? y : ci[1]) : get(P, P === 'Y' ? y * p.w + x : ci[1] * p.cw + ci[0]));
    return { Y: val('Y'), U: ci ? val('U') : null, V: ci ? val('V') : null };
  };
  if (pic && pic.kind === 'diff') {
    if (!p || x < 0 || y < 0 || x >= p.w || y >= p.h) return pic && !p ? 'A − B: 0' : '';
    const v = yuv((P, i) => p[P][i] - 128, true);
    if (!p.U) return `A − B: Y ${sgn(v.Y)}${view}`;
    return `A − B: Y ${sgn(v.Y)} U ${sgn(v.U)} V ${sgn(v.V)}${view}`;
  }
  // change pictures (loop filter change, residual): the hover shows the change, not the output value (R46 G4)
  if (pic && pic.delta && p && x >= 0 && y >= 0 && x < p.w && y < p.h) {
    const { a, b, label } = pic.delta;
    const v = yuv((P, i) => a[P][i] - b[P][i], !!a.U);
    if (!a.U) return `${label}: Y ${sgn(v.Y)}${view}`;
    return `${label}: Y ${sgn(v.Y)} U ${sgn(v.U)} V ${sgn(v.V)}${view}`;
  }
  if (pic && pic.kind === 'b' && p && x >= 0 && y >= 0 && x < p.w && y < p.h) {
    const v = yuv((P, i) => p[P][i], !!p.U);
    return p.U ? `B: Y ${v.Y} U ${v.U} V ${v.V}${view}` : `B: Y ${v.Y}${view}`;
  }
  if (!p || x < 0 || y < 0 || x >= p.w || y >= p.h) return '';
  const v = yuv((P, i) => p[P][i], !!p.U);
  if (!p.U) return `Y ${v.Y}${view}`;
  return `Y ${v.Y} U ${v.U} V ${v.V}${view}`;
}
