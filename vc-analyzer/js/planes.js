// Pixel planes: stacked Y/U/V PNG -> sample arrays -> pictures, and sample values under the pointer.
import { frameMeta, perfMark, state } from './state.js?v=f86793b620';
import { clamp } from './util.js?v=f86793b620';
import { getBlob } from './data.js?v=f86793b620';

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

// variant '' = A's samples, 'b' = B's samples, 'diff' = exact A − B (128 = equal)
export async function loadPlanes(f, stage, variant = '') {
  const key = f + ':' + stage + ':' + variant;
  if (state.planeCache.has(key)) return state.planeCache.get(key);
  const fr = frameMeta(f);
  const seq = state.manifest.stream.sequence || {};
  const ssx = seq.subsampling_x ?? 1, ssy = seq.subsampling_y ?? 1, mono = !!seq.monochrome;
  const img = await decodePng(await getBlob(`planes/${f}.${stage}${variant ? '.' + variant : ''}.png`));
  const w = fr.width, h = fr.height, cw = (w + ssx) >> ssx, ch = (h + ssy) >> ssy;
  const Y = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) Y.set(img.g.subarray(y * img.w, y * img.w + w), y * w);
  let U = null, V = null;
  if (!mono && img.h >= h + 2 * ch) {
    U = new Uint8Array(cw * ch); V = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) {
      U.set(img.g.subarray((h + y) * img.w, (h + y) * img.w + cw), y * cw);
      V.set(img.g.subarray((h + ch + y) * img.w, (h + ch + y) * img.w + cw), y * cw);
    }
  }
  const planes = { w, h, cw, ch, ssx, ssy, Y, U, V };
  state.planeCache.set(key, planes);
  if (state.planeCache.size > 48) state.planeCache.delete(state.planeCache.keys().next().value);
  return planes;
}

function planesToCanvas(p, lumaOnly) {
  const c = document.createElement('canvas');
  c.width = p.w; c.height = p.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(p.w, p.h);
  const d = im.data;
  for (let y = 0; y < p.h; y++) {
    const cy = (y >> p.ssy) * p.cw;
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, o = i * 4;
      const Yv = 1.164 * (p.Y[i] - 16);
      if (!p.U || lumaOnly) {
        const v = clamp(Yv, 0, 255); d[o] = d[o + 1] = d[o + 2] = v;
      } else {
        const ci = cy + (x >> p.ssx), u = p.U[ci] - 128, v = p.V[ci] - 128;
        d[o] = clamp(Yv + 1.596 * v, 0, 255);
        d[o + 1] = clamp(Yv - 0.392 * u - 0.813 * v, 0, 255);
        d[o + 2] = clamp(Yv + 2.017 * u, 0, 255);
      }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  return c;
}

// Diverging view of a luma difference: amber = positive, cyan = negative.
function diffToCanvas(a, b, gain) {
  const c = document.createElement('canvas');
  c.width = a.w; c.height = a.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(a.w, a.h);
  const d = im.data;
  let nz = 0, maxAbs = 0;
  for (let i = 0; i < a.Y.length; i++) {
    const diff = a.Y[i] - b.Y[i], o = i * 4;
    if (diff) { nz++; maxAbs = Math.max(maxAbs, Math.abs(diff)); }
    const t = clamp(Math.abs(diff) * gain / 255, 0, 1);
    const base = 30;
    if (diff > 0) { d[o] = base + 225 * t; d[o + 1] = base + 150 * t; d[o + 2] = base; }
    else if (diff < 0) { d[o] = base; d[o + 1] = base + 190 * t; d[o + 2] = base + 225 * t; }
    else { d[o] = d[o + 1] = d[o + 2] = base; }
    d[o + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  c.stats = { changed: nz, total: a.Y.length, maxAbs };
  return c;
}

// Exact A − B image from the server (128 = equal).  Luma differences drive
// the colour; where luma is equal but chroma differs, the chroma difference
// is shown the same way.  Any nonzero difference is clearly visible.
function signedDiffToCanvas(p) {
  const c = document.createElement('canvas');
  c.width = p.w; c.height = p.h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(p.w, p.h);
  const d = im.data;
  let ny = 0, nc = 0, maxAbs = 0;
  const cdiff = (x, y) => {
    if (!p.U) return 0;
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return (p.U[ci] - 128) || (p.V[ci] - 128);
  };
  if (p.U) for (let i = 0; i < p.U.length; i++) if (p.U[i] !== 128 || p.V[i] !== 128) nc++;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, o = i * 4;
      let v = p.Y[i] - 128;
      if (v) ny++;
      else v = cdiff(x, y);
      maxAbs = Math.max(maxAbs, Math.abs(v));
      const t = v ? 0.35 + 0.65 * Math.min(1, Math.abs(v) / 16) : 0, base = 30;
      if (v > 0) { d[o] = base + 225 * t; d[o + 1] = base + 150 * t; d[o + 2] = base; }
      else if (v < 0) { d[o] = base; d[o + 1] = base + 190 * t; d[o + 2] = base + 225 * t; }
      else { d[o] = d[o + 1] = d[o + 2] = base; }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  c.stats = { changed: ny, total: p.Y.length, maxAbs, chroma: nc, exact: true };
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

export async function buildPicture(f) {
  const fr = frameMeta(f);
  const stages = fr.stages || [];
  const stage = state.stage;
  try {
    if (stage.startsWith('B:') || stage.startsWith('D:')) {
      const base = stage.slice(2);
      if (!stages.includes(base)) throw new Error(`this frame has no ${base} pixels`);
      const differs = stageDiffers(base);
      if (stage.startsWith('D:')) {
        if (!differs) return { canvas: neutralCanvas(fr), planes: null, stage, kind: 'diff' };
        const p = await loadPlanes(f, base, 'diff');
        perfMark('planes');
        return { canvas: signedDiffToCanvas(p), planes: p, stage, kind: 'diff' };
      }
      const p = await loadPlanes(f, base, differs ? 'b' : '');
      perfMark('planes');
      return { canvas: planesToCanvas(p, state.lumaOnly), planes: p, stage, kind: 'b', same: !differs };
    }
    if (stage === 'lfdelta' || stage === 'residual') {
      const [x, y] = stage === 'lfdelta' ? ['recon', 'prefilter'] : ['prefilter', 'pred'];
      if (!stages.includes(x) || !stages.includes(y)) throw new Error(`this frame has no ${x}/${y} pixels`);
      const [pa, pb] = await Promise.all([loadPlanes(f, x), loadPlanes(f, y)]);
      return { canvas: diffToCanvas(pa, pb, stage === 'lfdelta' ? 16 : 4), planes: pa, diff: true,
               delta: { a: pa, b: pb, label: stage === 'lfdelta' ? 'recon − prefilter' : 'prefilter − pred' } };
    }
    const use = stages.includes(stage) ? stage : (stages.includes('recon') ? 'recon' : null);
    if (!use) return noPicture(fr, stage);
    const p = await loadPlanes(f, use);
    perfMark('planes');
    return { canvas: planesToCanvas(p, state.lumaOnly), planes: p, stage: use };
  } catch (e) {
    return noPicture(fr, stage);
  }
}
// A frame without pixels (a cut or damaged stream: the decoder wrote no output
// for it) still draws: a neutral picture under the blocks; frameSummary says why.
function noPicture(fr, stage) {
  const canvas = neutralCanvas(fr);
  delete canvas.stats;   // not a difference picture
  return { canvas, planes: null, stage, kind: 'none' };
}

export function pixelAt(x, y) {
  const pic = state.picture, p = pic && pic.planes;
  if (pic && pic.kind === 'diff') {
    if (!p || x < 0 || y < 0 || x >= p.w || y >= p.h) return pic && !p ? 'A − B: 0' : '';
    const sgn = (v) => (v > 0 ? '+' + v : String(v));
    const dy = p.Y[y * p.w + x] - 128;
    if (!p.U) return `A − B: Y ${sgn(dy)}`;
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return `A − B: Y ${sgn(dy)} U ${sgn(p.U[ci] - 128)} V ${sgn(p.V[ci] - 128)}`;
  }
  // change pictures (loop filter change, residual): the hover shows the change, not the output value (R46 G4);
  // the planes are the 8-bit view, so above 8 bits the change is in view units
  if (pic && pic.delta && p && x >= 0 && y >= 0 && x < p.w && y < p.h) {
    const { a, b, label } = pic.delta, sgn = (v) => (v > 0 ? '+' + v : String(v));
    const i = y * p.w + x, unit = state.payload && (state.payload.frame.bit_depth || 8) > 8 ? ' (8-bit view)' : '';
    if (!a.U) return `${label}: Y ${sgn(a.Y[i] - b.Y[i])}${unit}`;
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return `${label}: Y ${sgn(a.Y[i] - b.Y[i])} U ${sgn(a.U[ci] - b.U[ci])} V ${sgn(a.V[ci] - b.V[ci])}${unit}`;
  }
  if (pic && pic.kind === 'b' && p && x >= 0 && y >= 0 && x < p.w && y < p.h) {
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return p.U ? `B: Y ${p.Y[y * p.w + x]} U ${p.U[ci]} V ${p.V[ci]}` : `B: Y ${p.Y[y * p.w + x]}`;
  }
  if (!p || x < 0 || y < 0 || x >= p.w || y >= p.h) return '';
  const yv = p.Y[y * p.w + x];
  if (!p.U) return `Y ${yv}`;
  const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
  return `Y ${yv} U ${p.U[ci]} V ${p.V[ci]}`;
}
