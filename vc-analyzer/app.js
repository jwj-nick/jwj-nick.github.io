/* VC Analyzer — web GUI.
 *
 * Reads one data contract (see vca/export.py): manifest.json, frames/<f>.json,
 * planes/<f>.<stage>.png, from a static bundle URL (?data=...), from
 * `vca serve` (/api/...), or from a local folder picked by the user.
 * No build step, no dependencies.
 */
(() => {
  'use strict';

  // ------------------------------------------------------------ utilities
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt = (v, d = 1) => (v === null || v === undefined || v === '') ? '–'
    : (typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(d)) : String(v));
  const dims = (name) => { const m = /(\d+)X(\d+)/.exec(name || ''); return m ? [+m[1], +m[2]] : [4, 4]; };
  const dpr = () => window.devicePixelRatio || 1;

  const FRAME_COLORS = { KEY_FRAME: '#e5484d', INTER_FRAME: '#4b8dff', INTRA_ONLY_FRAME: '#f0a33a', S_FRAME: '#b07cf7' };
  const REF_COLORS = ['#4b8dff', '#3fb8af', '#f2c14e', '#e76f6f', '#b07cf7', '#7fd3e8', '#ff9f5a', '#9be15d'];
  const RAMP = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];

  function ramp(t) {
    t = clamp(t, 0, 1) * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
    const a = RAMP[i], b = RAMP[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  function modeColor(mode, pred) {
    if (pred === 'intrabc') return '#48c774';
    const m = mode || '';
    if (pred === 'intra') {
      if (m === 'DC_PRED') return '#e8863a';
      if (m === 'V_PRED') return '#f2c14e';
      if (m === 'H_PRED') return '#d9a441';
      if (/^D\d+_PRED$/.test(m)) return '#e76f6f';
      if (m.startsWith('SMOOTH')) return '#e5989b';
      if (m === 'PAETH_PRED') return '#b5838d';
      return '#e8863a';
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
    const av1 = ['LAST', 'LAST2', 'LAST3', 'GOLDEN', 'BWDREF', 'ALTREF2', 'ALTREF'].indexOf(name);
    return av1;
  }
  function refColor(name) {
    if (name === 'TIP') return '#ff66c4';
    if (name === 'INTRA' || !name) return '#8a94a3';
    const i = refIndex(name);
    return i >= 0 ? REF_COLORS[i % REF_COLORS.length] : '#8a94a3';
  }

  // ---------------------------------------------------------------- state
  const state = {
    source: null, manifest: null, streams: [], streamIdx: -1,
    f: 0, payload: null, picture: null,
    frameCache: new Map(), planeCache: new Map(),
    stage: 'recon', fill: 'mode', lines: new Set(['grid']), opacity: 0.45, lumaOnly: true,
    sel: -1, hover: -1, tab: 'block', order: 'decode',
    view: { s: 1, ox: 0, oy: 0, fitted: false },
    cellIndex: null, symFilter: '', symLimit: 400,
  };
  let C = {};  // block column -> index

  const FILLS = [
    { id: 'mode', label: 'Mode', key: 'm' }, { id: 'ref', label: 'Reference', key: 'r' },
    { id: 'qindex', label: 'Qindex', key: 'q' }, { id: 'bits', label: 'Bits', key: 'b' },
    { id: 'skip', label: 'Skip', key: 's' }, { id: 'none', label: 'No fill', key: 'n' },
  ];
  const LINES = [
    { id: 'grid', label: 'Blocks', key: 'g' }, { id: 'tx', label: 'Transforms', key: 't' },
    { id: 'mv', label: 'Motion', key: 'v' }, { id: 'sb', label: 'Superblocks', key: 'p' },
    { id: 'chroma', label: 'Chroma tree', key: 'h' },
  ];
  const STAGES = {
    recon: 'Output (after loop filters)', prefilter: 'Before loop filters', pred: 'Prediction',
    lfdelta: 'Loop filter change', residual: 'Residual (prefilter − pred)',
  };

  // --------------------------------------------------------- data access
  async function getJSON(rel) {
    if (state.source.kind === 'files') {
      const file = state.source.map.get(rel);
      if (!file) throw new Error(`${rel} is missing from the opened folder`);
      return JSON.parse(await file.text());
    }
    const r = await fetch(state.source.base + rel);
    if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
    return r.json();
  }
  async function getBlob(rel) {
    if (state.source.kind === 'files') {
      const file = state.source.map.get(rel);
      if (!file) throw new Error(`${rel} is missing from the opened folder`);
      return file;
    }
    const r = await fetch(state.source.base + rel);
    if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
    return r.blob();
  }

  // Streams offered in the picker: `vca serve` (/api/list) or the static demo
  // index, plus an explicit ?data=<bundle url> when it is not one of them.
  async function discoverStreams() {
    const params = new URLSearchParams(location.search);
    const list = [];
    for (const url of ['api/list', 'demo/index.json']) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) continue;
        const items = await r.json();
        for (const it of items) {
          const base = new URL(it.path || it.url, new URL(url, location.href)).href.replace(/\/?$/, '/');
          if (!list.some((x) => x.base === base)) list.push({ id: it.id, title: it.title || it.id, base, note: it.note });
        }
        if (list.length) break;
      } catch (e) { /* not this mode */ }
    }
    if (params.get('data')) {
      const base = new URL(params.get('data').replace(/\/?$/, '/'), location.href).href;
      if (!list.some((x) => x.base === base)) list.unshift({ id: 'url', title: params.get('data'), base });
    }
    return list;
  }

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

  async function loadPlanes(f, stage) {
    const key = f + ':' + stage;
    if (state.planeCache.has(key)) return state.planeCache.get(key);
    const fr = frameMeta(f);
    const seq = state.manifest.stream.sequence || {};
    const ssx = seq.subsampling_x ?? 1, ssy = seq.subsampling_y ?? 1, mono = !!seq.monochrome;
    const img = await decodePng(await getBlob(`planes/${f}.${stage}.png`));
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

  async function buildPicture(f) {
    const fr = frameMeta(f);
    const stages = fr.stages || [];
    const stage = state.stage;
    try {
      if (stage === 'lfdelta' || stage === 'residual') {
        const [x, y] = stage === 'lfdelta' ? ['recon', 'prefilter'] : ['prefilter', 'pred'];
        if (!stages.includes(x) || !stages.includes(y)) throw new Error(`this frame has no ${x}/${y} pixels`);
        const [pa, pb] = await Promise.all([loadPlanes(f, x), loadPlanes(f, y)]);
        return { canvas: diffToCanvas(pa, pb, stage === 'lfdelta' ? 16 : 4), planes: pa, diff: true };
      }
      const use = stages.includes(stage) ? stage : (stages.includes('recon') ? 'recon' : null);
      if (!use) return null;
      const p = await loadPlanes(f, use);
      return { canvas: planesToCanvas(p, state.lumaOnly), planes: p, stage: use };
    } catch (e) {
      setStatus(`Pixels unavailable: ${e.message}`);
      return null;
    }
  }

  // ------------------------------------------------------------ manifest
  const frameMeta = (f) => state.manifest.frames.find((x) => x.f === f) || state.manifest.frames[0];

  async function openSource(source, title) {
    state.source = source;
    state.frameCache.clear(); state.planeCache.clear();
    state.sel = -1; state.payload = null; state.picture = null; state.view.fitted = false;
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
    C = {};
    state.manifest.block_cols.forEach((c, i) => { C[c] = i; });
    const hash = parseHash();
    const frames = state.manifest.frames;
    const f0 = frames.some((x) => x.f === hash.f) ? hash.f : (frames.find((x) => x.out_n === 0) || frames[0]).f;
    renderFacts();
    renderStageOptions();
    renderBraid();
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
    $('#typeLegend').innerHTML = types.map((t) => `<span><i style="background:${FRAME_COLORS[t] || '#888'}"></i>${esc(t.replace('_FRAME', '').replace('_', ' ').toLowerCase())}</span>`).join('');
  }

  function renderStageOptions() {
    const avail = new Set();
    state.manifest.frames.forEach((f) => (f.stages || []).forEach((s) => avail.add(s)));
    const opts = ['recon', 'prefilter', 'pred'].filter((s) => avail.has(s));
    if (avail.has('recon') && avail.has('prefilter')) opts.push('lfdelta');
    if (avail.has('prefilter') && avail.has('pred')) opts.push('residual');
    if (!opts.includes(state.stage)) state.stage = opts[0] || 'recon';
    $('#stageSelect').innerHTML = opts.map((s) => `<option value="${s}" ${s === state.stage ? 'selected' : ''}>${STAGES[s]}</option>`).join('');
    $('#grayBtn').setAttribute('aria-pressed', String(state.lumaOnly));
  }

  // --------------------------------------------------------------- braid
  function renderBraid() {
    const svg = $('#braid');
    const frames = state.manifest.frames;
    const outputs = state.manifest.outputs || [];
    const n = Math.max(frames.length, outputs.length, 1);
    const wrap = $('#braidWrap').clientWidth || 800;
    const step = Math.max(10, Math.min(46, (wrap - 8) / n));
    const W = Math.max(wrap, step * n + 8), H = 116, laneH = 38, top = 4, bot = H - 4;
    const maxBytes = Math.max(1, ...frames.map((f) => f.bytes || 0));
    const bh = (b) => 4 + (laneH - 4) * Math.sqrt((b || 0) / maxBytes);
    const byF = new Map(frames.map((f) => [f.f, f]));
    const xs = (i) => 4 + i * step + step / 2;
    const bw = Math.max(4, step * 0.66);
    let parts = [];
    // wires: decode slot i -> output slot n
    frames.forEach((fr, i) => {
      if (fr.out_n === null || fr.out_n === undefined) return;
      const x1 = xs(i), x2 = xs(fr.out_n);
      const y1 = top + laneH + 1, y2 = bot - laneH - 1, my = (y1 + y2) / 2;
      parts.push(`<path class="wire" data-f="${fr.f}" d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}"/>`);
    });
    // decode lane
    frames.forEach((fr, i) => {
      const h = bh(fr.bytes), x = xs(i) - bw / 2, y = top + laneH - h;
      const col = FRAME_COLORS[fr.frame_type] || '#888';
      const shown = fr.out_n !== null && fr.out_n !== undefined;
      parts.push(`<rect class="bar" data-f="${fr.f}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="1.5" fill="${shown ? col : 'transparent'}" stroke="${col}" stroke-width="${shown ? 0 : 1.5}"><title>decode ${fr.f}: ${fr.frame_type}, order hint ${fr.order_hint}, ${fr.bytes} bytes${shown ? ', output ' + fr.out_n : ', not output directly'}</title></rect>`);
    });
    // output lane
    outputs.forEach((o) => {
      const fr = byF.get(o.src_frame);
      const h = bh(fr ? fr.bytes : 0), x = xs(o.n) - bw / 2, y = bot - laneH;
      const col = fr ? (FRAME_COLORS[fr.frame_type] || '#888') : '#555';
      parts.push(`<rect class="bar" data-f="${fr ? fr.f : ''}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="1.5" fill="${col}" opacity="0.85"><title>output ${o.n}${fr ? ' = decode ' + fr.f : ''}</title></rect>`);
    });
    if (n <= 64) {
      frames.forEach((fr, i) => parts.push(`<text x="${xs(i)}" y="${top + laneH + 12}" text-anchor="middle">${fr.f}</text>`));
      outputs.forEach((o) => parts.push(`<text x="${xs(o.n)}" y="${bot - laneH - 4}" text-anchor="middle">${o.n}</text>`));
    }
    parts.push('<g id="braidSel"></g>');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.width = W + 'px';
    svg.innerHTML = parts.join('');
    svg._geom = { xs, bw, top, bot, laneH, bh };
    updateBraidSelection();
  }

  function updateBraidSelection() {
    const svg = $('#braid');
    if (!svg._geom || !state.manifest) return;
    const { xs, bw, top, bot, laneH } = svg._geom;
    const frames = state.manifest.frames;
    const i = frames.findIndex((x) => x.f === state.f);
    const fr = frames[i];
    svg.querySelectorAll('.wire').forEach((w) => w.classList.toggle('sel', +w.dataset.f === state.f));
    let s = '';
    if (fr) {
      s += `<rect class="selmark" x="${xs(i) - bw / 2 - 3}" y="${top - 2}" width="${bw + 6}" height="${laneH + 4}" rx="3"/>`;
      if (fr.out_n !== null && fr.out_n !== undefined)
        s += `<rect class="selmark" x="${xs(fr.out_n) - bw / 2 - 3}" y="${bot - laneH - 2}" width="${bw + 6}" height="${laneH + 4}" rx="3"/>`;
    }
    $('#braidSel').innerHTML = s;
  }

  // ------------------------------------------------------------- frames
  async function selectFrame(f) {
    if (!state.manifest) return;
    // Keep the selection on the same picture position across frames.
    let keepAt = null;
    if (state.sel >= 0 && state.payload) { const b = state.payload.blocks[state.sel]; keepAt = [b[C.x], b[C.y]]; }
    state.f = f;
    state.sel = -1; state.hover = -1;
    updateBraidSelection();
    updateFramePos();
    setStatus(`Loading frame ${f}…`);
    let payload = state.frameCache.get(f);
    if (!payload) {
      try {
        payload = await getJSON(`frames/${f}.json`);
      } catch (e) {
        setStatus(`Could not load frame ${f}: ${e.message}`);
        return;
      }
      state.frameCache.set(f, payload);
      if (state.frameCache.size > 64) state.frameCache.delete(state.frameCache.keys().next().value);
    }
    if (state.f !== f) return;
    state.payload = payload;
    buildCellIndex();
    state.picture = await buildPicture(f);
    if (state.f !== f) return;
    if (!state.view.fitted) fitView();
    const hash = parseHash();
    if (keepAt) state.sel = blockAt(keepAt[0], keepAt[1]);
    else if (hash.sel && hash.f === f) state.sel = blockAt(hash.sel[0], hash.sel[1]);
    else if (!state.autoSelected) {
      // First frame shown: select its most expensive block so the inspector has content.
      let best = -1, bits = -1;
      state.payload.blocks.forEach((b, i) => { if (!isChromaBlock(i) && (b[C.bits] || 0) > bits) { bits = b[C.bits] || 0; best = i; } });
      state.sel = best;
      state.autoPick = best >= 0;
    }
    state.autoSelected = true;
    renderLegend();
    requestRender();
    renderTab();
    writeHash();
    setStatus(frameSummary());
  }

  // Two 4x4-cell indexes: luma/shared blocks (what clicks select) and the
  // separate chroma-tree blocks of semi-decoupled partitioning (AV2 SDP).
  function buildCellIndex() {
    const fr = state.payload.frame;
    const cols = fr.mi_cols || Math.ceil(fr.width / 4), rows = fr.mi_rows || Math.ceil(fr.height / 4);
    const idx = new Int32Array(cols * rows).fill(-1);
    const cidx = new Int32Array(cols * rows).fill(-1);
    const blocks = state.payload.blocks;
    const isChroma = new Uint8Array(blocks.length);
    let nChroma = 0;
    blocks.forEach((b, i) => {
      const chroma = b[C.tree] === 'CHROMA';
      isChroma[i] = chroma ? 1 : 0;
      if (chroma) nChroma++;
      const target = chroma ? cidx : idx;
      const c0 = b[C.x] >> 2, r0 = b[C.y] >> 2;
      const c1 = Math.min(cols, (b[C.x] + b[C.w] + 3) >> 2), r1 = Math.min(rows, (b[C.y] + b[C.h] + 3) >> 2);
      for (let r = r0; r < r1; r++) target.fill(i, r * cols + c0, r * cols + c1);
    });
    state.cellIndex = { idx, cidx, cols, rows, isChroma, nChroma };
    state.lumaBlocks = blocks.filter((b, i) => !isChroma[i]);
    state.chromaBlocks = blocks.filter((b, i) => isChroma[i]);
  }

  function cellLookup(which, x, y) {
    const ci = state.cellIndex;
    if (!ci || x < 0 || y < 0) return -1;
    const c = x >> 2, r = y >> 2;
    if (c >= ci.cols || r >= ci.rows) return -1;
    return ci[which][r * ci.cols + c];
  }
  const blockAt = (x, y) => cellLookup('idx', x, y);
  const chromaAt = (x, y) => cellLookup('cidx', x, y);
  const isChromaBlock = (i) => !!(state.cellIndex && state.cellIndex.isChroma[i]);

  function orderedFrames() {
    const frames = state.manifest.frames;
    if (state.order === 'output') {
      return frames.filter((x) => x.out_n !== null && x.out_n !== undefined).sort((a, b) => a.out_n - b.out_n)
        .concat(frames.filter((x) => x.out_n === null || x.out_n === undefined));
    }
    return frames;
  }
  function stepFrame(d) {
    if (!state.manifest) return;
    const list = orderedFrames();
    const i = list.findIndex((x) => x.f === state.f);
    const j = clamp(i + d, 0, list.length - 1);
    if (j !== i) selectFrame(list[j].f);
  }

  function updateFramePos() {
    const fr = frameMeta(state.f);
    const n = state.manifest.frames.length;
    $('#framePos').innerHTML = `decode <b>${state.f}</b><span class="unit">/${n - 1}</span> &nbsp;out <b>${fr.out_n ?? '–'}</b>`;
  }

  function frameSummary() {
    const fr = frameMeta(state.f);
    return `Frame ${fr.f}: ${fr.frame_type.replace('_FRAME', '').toLowerCase()}, order hint ${fr.order_hint}, ${fmt(fr.bytes)} bytes, ${fmt(fr.symbol_bits, 0)} entropy bits, ${fmt(fr.blocks)} blocks, base qindex ${fr.base_qindex}`;
  }

  // ------------------------------------------------------------ viewport
  const canvas = $('#canvas');
  let renderPending = false;
  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => { renderPending = false; render(); });
  }

  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr())), h = Math.max(1, Math.round(r.height * dpr()));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return r;
  }

  function fitCanvasHeight() {
    // Narrow screens: size the picture area to the frame's aspect ratio.
    const wrap = $('#canvasWrap');
    if (!state.payload || window.innerWidth > 860) { wrap.style.height = ''; return; }
    const fr = state.payload.frame;
    const h = Math.round(clamp(wrap.clientWidth * fr.height / fr.width * 1.04, 220, window.innerHeight * 0.62));
    wrap.style.height = h + 'px';
  }

  function fitView() {
    if (!state.payload) return;
    fitCanvasHeight();
    const r = sizeCanvas();
    const fr = state.payload.frame;
    const s = Math.min(r.width / fr.width, r.height / fr.height) * 0.96;
    state.view = { s, ox: (r.width - fr.width * s) / 2, oy: (r.height - fr.height * s) / 2, fitted: true };
    requestRender();
  }
  function zoomAt(factor, px, py) {
    const v = state.view;
    const s2 = clamp(v.s * factor, 0.05, 64);
    v.ox = px - (px - v.ox) * (s2 / v.s);
    v.oy = py - (py - v.oy) * (s2 / v.s);
    v.s = s2;
    requestRender();
  }
  function setZoom(s2) {
    const r = canvas.getBoundingClientRect();
    zoomAt(s2 / state.view.s, r.width / 2, r.height / 2);
  }
  const toImage = (px, py) => [(px - state.view.ox) / state.view.s, (py - state.view.oy) / state.view.s];

  function render() {
    const r = sizeCanvas();
    const ctx = canvas.getContext('2d');
    const k = dpr();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg') || '#151a20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!state.payload) return;
    const { s, ox, oy } = state.view;
    ctx.setTransform(s * k, 0, 0, s * k, ox * k, oy * k);
    ctx.imageSmoothingEnabled = false;
    const fr = state.payload.frame;
    if (state.picture) ctx.drawImage(state.picture.canvas, 0, 0);
    else { ctx.fillStyle = '#2a313b'; ctx.fillRect(0, 0, fr.width, fr.height); }
    const vis = [(-ox) / s, (-oy) / s, (r.width - ox) / s, (r.height - oy) / s];
    const px = 1 / s;  // one CSS pixel in image units
    const blocks = state.lumaBlocks || state.payload.blocks;  // chroma-tree blocks: see drawChromaTree
    const visible = (b) => !(b[C.x] > vis[2] || b[C.y] > vis[3] || b[C.x] + b[C.w] < vis[0] || b[C.y] + b[C.h] < vis[1]);
    // fill
    if (state.fill !== 'none' && state.opacity > 0) {
      const fs = fillStyler();
      ctx.globalAlpha = state.opacity;
      for (const b of blocks) {
        if (!visible(b)) continue;
        const col = fs(b);
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(b[C.x], b[C.y], b[C.w], b[C.h]);
      }
      ctx.globalAlpha = 1;
      if (state.fill === 'skip') drawSkipHatch(ctx, blocks, visible, px);
    }
    // transform grid
    if (state.lines.has('tx')) {
      ctx.strokeStyle = 'rgba(120,205,255,0.55)';
      ctx.lineWidth = px;
      ctx.beginPath();
      for (const b of blocks) {
        if (!visible(b)) continue;
        const [tw, th] = dims(b[C.tx_size]);
        if (tw >= b[C.w] && th >= b[C.h]) continue;
        for (let x = b[C.x] + tw; x < b[C.x] + b[C.w]; x += tw) { ctx.moveTo(x, b[C.y]); ctx.lineTo(x, b[C.y] + b[C.h]); }
        for (let y = b[C.y] + th; y < b[C.y] + b[C.h]; y += th) { ctx.moveTo(b[C.x], y); ctx.lineTo(b[C.x] + b[C.w], y); }
      }
      ctx.stroke();
    }
    // block grid
    if (state.lines.has('grid')) {
      ctx.lineWidth = px;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      for (const b of blocks) if (visible(b)) ctx.rect(b[C.x] + px, b[C.y] + px, b[C.w], b[C.h]);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.62)';
      ctx.beginPath();
      for (const b of blocks) if (visible(b)) ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]);
      ctx.stroke();
    }
    if (state.lines.has('chroma')) drawChromaTree(ctx, px);
    if (state.lines.has('sb')) drawSuperblocks(ctx, fr, px);
    if (state.lines.has('mv')) drawMotion(ctx, blocks, visible, px);
    // selection with its partition ancestors
    if (state.sel >= 0) {
      const b = state.payload.blocks[state.sel];
      const chroma = isChromaBlock(state.sel);
      const path = partitionPath(b[C.x], b[C.y], chroma ? 'chroma' : 'luma');
      ctx.setLineDash([4 * px, 3 * px]);
      ctx.strokeStyle = 'rgba(255,179,71,0.75)';
      ctx.lineWidth = px;
      for (const n of path.slice(0, -1)) ctx.strokeRect(n.x, n.y, n.w, n.h);
      ctx.setLineDash([]);
      ctx.lineWidth = 3 * px;
      ctx.strokeStyle = chroma ? '#ff66c4' : '#ffb347';
      ctx.strokeRect(b[C.x], b[C.y], b[C.w], b[C.h]);
      ctx.lineWidth = px;
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(b[C.x] + 2 * px, b[C.y] + 2 * px, b[C.w] - 4 * px, b[C.h] - 4 * px);
    }
    if (state.hover >= 0 && state.hover !== state.sel) {
      const b = state.payload.blocks[state.hover];
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeRect(b[C.x], b[C.y], b[C.w], b[C.h]);
    }
  }

  function fillStyler() {
    const blocks = state.lumaBlocks || state.payload.blocks;
    switch (state.fill) {
      case 'mode': return (b) => modeColor(b[C.mode], b[C.pred]);
      case 'ref': return (b) => (b[C.pred] === 'inter' ? refColor(b[C.ref0]) : (b[C.pred] === 'intrabc' ? '#48c774' : null));
      case 'qindex': return (b) => rgb(ramp((b[C.qindex] ?? 0) / 255));
      case 'skip': return (b) => (b[C.skip_txfm] ? 'rgb(16,18,22)' : null);
      case 'bits': {
        const max = bitsMax(blocks);
        const lmax = Math.log1p(max * 256);
        return (b) => {
          const v = (b[C.bits] || 0) / (b[C.w] * b[C.h]);
          return v > 0 ? rgb(ramp(Math.log1p(v * 256) / (lmax || 1))) : 'rgb(20,24,30)';
        };
      }
      default: return () => null;
    }
  }

  function bitsMax(blocks) {
    let max = 0;
    for (const b of blocks) max = Math.max(max, (b[C.bits] || 0) / (b[C.w] * b[C.h]));
    return max;
  }

  function drawSkipHatch(ctx, blocks, visible, px) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,179,71,0.8)';
    ctx.lineWidth = px;
    for (const b of blocks) {
      if (!visible(b) || !b[C.skip_mode]) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]); ctx.clip();
      ctx.beginPath();
      for (let t = -b[C.h]; t < b[C.w]; t += 4) { ctx.moveTo(b[C.x] + t, b[C.y] + b[C.h]); ctx.lineTo(b[C.x] + t + b[C.h], b[C.y]); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSuperblocks(ctx, fr, px) {
    const sb = fr.sb_size || 64;
    ctx.strokeStyle = 'rgba(255,179,71,0.7)';
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    for (let x = 0; x <= fr.width; x += sb) { ctx.moveTo(x, 0); ctx.lineTo(x, fr.height); }
    for (let y = 0; y <= fr.height; y += sb) { ctx.moveTo(0, y); ctx.lineTo(fr.width, y); }
    ctx.stroke();
    const t = fr.tiles || {};
    if ((t.cols || 1) > 1 || (t.rows || 1) > 1) {
      ctx.setLineDash([6 * px, 4 * px]);
      ctx.strokeStyle = '#ff66c4';
      ctx.lineWidth = 2.5 * px;
      ctx.beginPath();
      (t.col_start_sb || []).forEach((c) => { ctx.moveTo(c * sb, 0); ctx.lineTo(c * sb, fr.height); });
      (t.row_start_sb || []).forEach((r) => { ctx.moveTo(0, r * sb); ctx.lineTo(fr.width, r * sb); });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Separate chroma-tree blocks (semi-decoupled partitioning) as dashed magenta.
  function drawChromaTree(ctx, px) {
    const cb = state.chromaBlocks || [];
    if (!cb.length) return;
    ctx.strokeStyle = 'rgba(255,102,196,0.9)';
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash([3 * px, 2 * px]);
    ctx.beginPath();
    for (const b of cb) ctx.rect(b[C.x], b[C.y], b[C.w], b[C.h]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawMotion(ctx, blocks, visible, px) {
    ctx.lineWidth = 1.5 * px;
    for (const b of blocks) {
      if (!visible(b) || b[C.pred] !== 'inter' || b[C.mv0_row] === null) continue;
      const cx = b[C.x] + b[C.w] / 2, cy = b[C.y] + b[C.h] / 2;
      const vecs = [[b[C.mv0_row], b[C.mv0_col], b[C.ref0], false]];
      if (b[C.ref1] && b[C.mv1_row] !== null) vecs.push([b[C.mv1_row], b[C.mv1_col], b[C.ref1], true]);
      for (const [r, c, ref, dashed] of vecs) {
        const dx = c / 8, dy = r / 8;
        ctx.strokeStyle = refColor(ref);
        ctx.fillStyle = refColor(ref);
        if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
          ctx.beginPath(); ctx.arc(cx, cy, 1.5 * px, 0, 7); ctx.fill();
          continue;
        }
        ctx.setLineDash(dashed ? [3 * px, 2 * px] : []);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
        ctx.setLineDash([]);
        const a = Math.atan2(dy, dx), L = Math.min(6 * px, Math.hypot(dx, dy) * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy + dy);
        ctx.lineTo(cx + dx - L * Math.cos(a - 0.45), cy + dy - L * Math.sin(a - 0.45));
        ctx.lineTo(cx + dx - L * Math.cos(a + 0.45), cy + dy - L * Math.sin(a + 0.45));
        ctx.closePath(); ctx.fill();
      }
    }
  }

  function renderLegend() {
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
      html = `qindex 0<span class="ramp" style="background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})"></span>255 <span class="note">this frame: ${Math.min(...q)}–${Math.max(...q)}</span>`;
    } else if (state.fill === 'bits') {
      html = `0<span class="ramp" style="background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})"></span>${fmt(bitsMax(blocks), 2)} bits per pixel <span class="note">log scale; symbols attributed by decoder context</span>`;
    } else if (state.fill === 'skip') {
      html = '<span><i style="background:rgb(16,18,22)"></i>skip_txfm (no residual)</span><span><i style="background:repeating-linear-gradient(45deg,#ffb347 0 2px,transparent 2px 4px)"></i>skip_mode</span>';
    }
    if (state.picture && state.picture.canvas.stats) {
      const st = state.picture.canvas.stats;
      html += ` <span class="note">${STAGES[state.stage]}: ${fmt(st.changed)} of ${fmt(st.total)} luma samples differ, max |Δ| ${st.maxAbs}. Amber = positive, cyan = negative.</span>`;
    }
    el.innerHTML = html;
  }

  // ------------------------------------------------------ partition path
  function partitionPath(x, y, tree = 'luma') {
    const trees = (state.payload.ptree || []).filter((t) => t.tree === tree);
    for (const t of trees) {
      const [w, h] = dims(t.root[1]);
      if (x < t.x || y < t.y || x >= t.x + w || y >= t.y + h) continue;
      const out = [];
      let n = t.root;
      while (n) {
        const [part, bs, r, c, ch] = n;
        const [bw, bh] = dims(bs);
        out.push({ partition: part, bsize: bs, x: c * 4, y: r * 4, w: bw, h: bh });
        n = (ch || []).find((k) => { const [kw, kh] = dims(k[1]); return x >= k[3] * 4 && x < k[3] * 4 + kw && y >= k[2] * 4 && y < k[2] * 4 + kh; });
      }
      return out;
    }
    return [];
  }

  // ------------------------------------------------------------ inspector
  function symtype(id) {
    const t = state.manifest.symtypes;
    const row = t[id] && t[id][0] === id ? t[id] : t.find((x) => x[0] === id);
    return row ? { name: row[1], file: row[2], line: row[3] } : { name: '#' + id };
  }
  const symbolsOfBlock = (bi) => (state.payload.symbols || []).filter((s) => s[5] === bi);

  function blockObject(bi) {
    const b = state.payload.blocks[bi];
    const o = {};
    state.manifest.block_cols.forEach((c, i) => { if (b[i] !== null && b[i] !== undefined) o[c] = b[i]; });
    const ext = (state.payload.ext || [])[bi] || {};
    return { o, ext };
  }

  const kvRow = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;

  function renderBlockTab() {
    if (state.sel < 0) {
      return `<h2>No block selected</h2><p class="sub">Click a block on the picture. Its modes, motion, partition path and entropy-decoded symbols appear here.</p>${frameMiniStats()}`;
    }
    const { o, ext } = blockObject(state.sel);
    const extra = ext._ || {};
    const refs = [o.ref0, o.ref1].filter(Boolean);
    const ohs = extra.ref_order_hint || [];
    let facts = kvRow('Prediction', esc(o.pred)) + kvRow('Mode', esc(o.mode));
    if (o.uv_mode) facts += kvRow('Chroma mode', esc(o.uv_mode));
    if (refs.length) facts += kvRow('Reference', refs.map((r, i) => `<span style="color:${refColor(r)}">${esc(r)}</span>${ohs[i] !== undefined && ohs[i] !== null ? `<span class="unit">order hint ${ohs[i]}</span>` : ''}`).join(', '));
    if (o.mv0_row !== undefined) facts += kvRow('Motion vector', `(${o.mv0_col}, ${o.mv0_row})${o.mv1_row !== undefined ? ` · (${o.mv1_col}, ${o.mv1_row})` : ''}`, 'x, y in 1/8 pel');
    if (o.motion_mode) facts += kvRow('Motion mode', esc(o.motion_mode));
    if (o.compound_type) facts += kvRow('Compound', esc(o.compound_type));
    if (o.interp_filter) facts += kvRow('Interpolation', esc(o.interp_filter));
    facts += kvRow('Skip residual', o.skip_txfm ? 'yes' : 'no') + (o.skip_mode ? kvRow('Skip mode', 'yes') : '');
    facts += kvRow('Transform', `${esc(o.tx_size)} ${esc(o.tx_type)}`) + kvRow('Qindex', fmt(o.qindex));
    if (o.segment_id) facts += kvRow('Segment', fmt(o.segment_id));
    facts += kvRow('CDEF index', fmt(o.cdef_idx));
    if (extra.angle_delta) facts += kvRow('Angle delta', `${extra.angle_delta[0]} / ${extra.angle_delta[1]}`, 'luma / chroma');
    if (extra.cfl) facts += kvRow('CfL', esc(JSON.stringify(extra.cfl)));
    if (extra.palette_size) facts += kvRow('Palette size', `${extra.palette_size[0]} / ${extra.palette_size[1]}`);
    facts += kvRow('Entropy bits', fmt(o.bits, 2), `${fmt(o.nsym)} symbols`);
    const codec = (state.manifest.stream.codec || '').toUpperCase();
    const extRows = Object.entries(ext).filter(([k]) => k !== '_').map(([k, v]) => kvRow(k, esc(Array.isArray(v) ? v.join(', ') : v))).join('');
    const chroma = isChromaBlock(state.sel);
    const path = partitionPath(o.x, o.y, chroma ? 'chroma' : 'luma');
    const syms = symbolsOfBlock(state.sel);
    let companion = '';
    if (chroma) {
      const li = blockAt(o.x, o.y);
      companion = `<h3>Luma tree</h3><p class="note">This block belongs to the separate chroma tree (semi-decoupled partitioning). Its luma counterpart is decoded in the luma tree.</p>${li >= 0 ? `<div class="actions"><button class="btn" data-act="goto" data-block="${li}">Inspect the luma block here</button></div>` : ''}`;
    } else {
      const ci = chromaAt(o.x, o.y);
      if (ci >= 0) {
        const c = blockObject(ci).o;
        companion = `<h3>Separate chroma tree here</h3><dl class="kv">${kvRow('Chroma block', `${esc(c.bsize)} at (${c.x}, ${c.y})`)}${kvRow('Chroma mode', esc(c.uv_mode || c.mode))}${kvRow('Entropy bits', fmt(c.bits, 2), `${fmt(c.nsym)} symbols`)}</dl><div class="actions"><button class="btn" data-act="goto" data-block="${ci}">Inspect the chroma block</button></div>`;
      }
    }
    const symRows = syms.slice(0, 300).map((s) => {
      const t = symtype(s[1]);
      return `<tr><td class="num">${s[0]}</td><td>${esc(t.name)}</td><td class="num">${s[2] === -1 ? '–' : s[2]}</td><td class="num">${fmt(s[4], 3)}</td></tr>`;
    }).join('');
    const auto = state.autoPick ? '<p class="note">The costliest block of this frame is selected. Click any block to inspect it.</p>' : '';
    return `<h2>${chroma ? 'Chroma ' : ''}${esc(o.bsize)} at (${o.x}, ${o.y})</h2>
      <p class="sub">${o.w}×${o.h} luma pixels, ${esc(o.tree || '').toLowerCase()} tree, ${esc(o.partition || '')}</p>${auto}
      <dl class="kv">${facts}</dl>
      <div class="actions"><button class="btn" data-act="copy-ai">Copy for AI</button><button class="btn" data-act="copy-json">Copy JSON</button><span class="toast" id="toast"></span></div>
      ${companion}
      ${path.length ? `<h3>Partition path${chroma ? ' (chroma tree)' : ''}</h3><ol class="path">${path.map((n, i) => `<li style="--d:${i}" class="${i === path.length - 1 ? 'leaf' : ''}">${esc(n.bsize)} at (${n.x}, ${n.y}): ${esc(n.partition)}</li>`).join('')}</ol>` : ''}
      ${extRows ? `<h3>${codec} decoder fields</h3><dl class="kv">${extRows}</dl>` : ''}
      <h3>Syntax elements read for this block</h3>
      ${syms.length ? `<table class="grid"><thead><tr><th class="num">n</th><th>Element (reader: tags)</th><th class="num">Value</th><th class="num">Bits</th></tr></thead><tbody>${symRows}</tbody></table>${syms.length > 300 ? `<p class="note">Showing 300 of ${syms.length}. The Syntax tab lists all.</p>` : ''}` : '<p class="note">No symbols were attributed to this block (symbol trace off, or superblock-level syntax was read with a neighbouring block as context).</p>'}
      <p class="note">Symbols are attributed by the decoder's accounting context: the block being decoded when the symbol was read.</p>`;
  }

  function frameMiniStats() {
    if (!state.payload) return '';
    return `<h3>This frame</h3><p class="sub">${esc(frameSummary())}</p>`;
  }

  function renderFrameTab() {
    const fr = state.payload.frame;
    const m = frameMeta(state.f);
    let facts = kvRow('Decode index', fr.f) + kvRow('Output index', fmt(m.out_n)) + kvRow('Temporal unit', fr.tu)
      + kvRow('Frame type', esc(fr.frame_type)) + kvRow('Order hint', fr.order_hint)
      + (fr.display_order_hint !== undefined ? kvRow('Display order hint', fr.display_order_hint) : '')
      + kvRow('Shown', fr.show ? 'immediately' : (fr.implicit_output ? 'later (implicit output)' : 'no'))
      + kvRow('Size', `${fr.width}×${fr.height}`) + kvRow('Superblock', `${fr.sb_size}×${fr.sb_size}`)
      + kvRow('Base qindex', fr.base_qindex)
      + kvRow('Tiles', `${fr.tiles ? fr.tiles.cols : 1}×${fr.tiles ? fr.tiles.rows : 1}`)
      + kvRow('Bytes', fmt((fr.units || {}).bytes), 'all OBUs of this frame') + kvRow('Entropy bits', fmt((fr.stats || {}).symbol_bits, 1))
      + kvRow('Recon MD5', `<span class="mono">${esc((fr.recon || {}).md5)}</span>`);
    const obj = (o) => Object.entries(o || {}).map(([k, v]) => kvRow(k, esc(typeof v === 'object' ? JSON.stringify(v) : v))).join('');
    const refs = (fr.refs || []).map((r, i) => `<tr><td>${esc(r.name || 'REF' + i)}</td><td class="num">${fmt(r.slot)}</td><td class="num">${fmt(r.order_hint)}</td></tr>`).join('');
    const units = (fr.units_list || []).map((u) => `<tr><td class="num">${u.i}</td><td>${esc(u.type_name)}</td><td class="num">${fmt(u.offset)}</td><td class="num">${fmt(u.size)}</td></tr>`).join('');
    return `<h2>Frame ${fr.f}</h2><p class="sub">${esc(frameSummary())}</p>
      <div class="actions"><button class="chip" data-act="order" aria-pressed="${state.order === 'output'}">Step through output order</button><button class="btn" data-act="copy-frame">Copy for AI</button><span class="toast" id="toast"></span></div>
      <dl class="kv">${facts}</dl>
      <h3>References</h3><table class="grid"><thead><tr><th>Reference</th><th class="num">Slot</th><th class="num">Order hint</th></tr></thead><tbody>${refs}</tbody></table>
      <h3>Coding decisions</h3><dl class="kv">${obj(fr.coding)}</dl>
      <h3>Filters</h3><dl class="kv">${obj(fr.filters)}</dl>
      <h3>OBUs of this frame</h3><table class="grid"><thead><tr><th class="num">#</th><th>Type</th><th class="num">Offset</th><th class="num">Size</th></tr></thead><tbody>${units}</tbody></table>`;
  }

  function renderSyntaxTab() {
    const syms = state.payload.symbols;
    if (!syms) return '<h2>Syntax</h2><p class="sub">This bundle has no symbol trace. Re-run the analysis with symbols (the default) and export again.</p>';
    const q = state.symFilter.toLowerCase();
    const rows = [];
    for (const s of syms) {
      const t = symtype(s[1]);
      if (q && !t.name.toLowerCase().includes(q)) continue;
      rows.push([s, t]);
      if (rows.length >= state.symLimit) break;
    }
    const total = q ? '' : ` of ${fmt(syms.length)}`;
    return `<h2>Symbol trace</h2><p class="sub">Every entropy-decoded symbol of frame ${state.f} in decode order. Click a row to select its block.</p>
      <input class="search" id="symSearch" placeholder="Filter by element name, e.g. partition or eob" value="${esc(state.symFilter)}">
      <table class="grid"><thead><tr><th class="num">n</th><th>Element</th><th class="num">Value</th><th class="num">Bits</th><th class="num">Block</th></tr></thead><tbody>
      ${rows.map(([s, t]) => `<tr class="clickable ${s[5] === state.sel && s[5] >= 0 ? 'cur' : ''}" data-block="${s[5]}"><td class="num">${s[0]}</td><td title="${esc((t.file || '') + ':' + (t.line || ''))}">${esc(t.name)}</td><td class="num">${s[2] === -1 ? '–' : s[2]}</td><td class="num">${fmt(s[4], 3)}</td><td class="num">${s[5] >= 0 ? s[5] : '–'}</td></tr>`).join('')}
      </tbody></table>
      <p class="note">Showing ${fmt(rows.length)}${total}.${rows.length >= state.symLimit ? ' <button class="btn small" data-act="more">Show more</button>' : ''}</p>`;
  }

  // Block area inside the picture (edge blocks may extend past it).
  function clippedArea(b) {
    const fr = state.payload.frame;
    return Math.max(0, Math.min(b[C.x] + b[C.w], fr.width) - b[C.x]) * Math.max(0, Math.min(b[C.y] + b[C.h], fr.height) - b[C.y]);
  }

  function histogram(key, list) {
    const m = new Map();
    let area = 0, bits = 0;
    for (const b of (list || state.lumaBlocks || state.payload.blocks)) {
      const k = b[C[key]] ?? '–', a = clippedArea(b), bt = b[C.bits] || 0;
      const e = m.get(k) || { area: 0, bits: 0, n: 0 };
      e.area += a; e.bits += bt; e.n++;
      m.set(k, e); area += a; bits += bt;
    }
    return [...m.entries()].map(([k, e]) => ({ k, ...e, ap: e.area / (area || 1), bp: e.bits / (bits || 1) }))
      .sort((a, b) => b.area - a.area);
  }

  function renderStatsTab() {
    const sections = [['pred', 'Prediction'], ['mode', 'Mode'], ['bsize', 'Block size'], ['tx_size', 'Transform size'], ['tx_type', 'Transform type'], ['ref0', 'Reference'], ['motion_mode', 'Motion mode'], ['interp_filter', 'Interpolation']];
    const html = sections.map(([key, label]) => {
      const h = histogram(key).filter((e) => e.k !== '–' || key === 'pred');
      if (!h.length || (h.length === 1 && h[0].k === '–')) return '';
      return `<h3>${label}</h3><div class="bars"><span class="h">Value</span><span class="h">Area (blue) and bits (amber)</span><span class="h">Area</span><span class="h">Bits</span>
        ${h.slice(0, 12).map((e) => `<span>${esc(e.k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(e.ap * 100).toFixed(1)}%"></span><span class="bar-fill bits" style="width:${(e.bp * 100).toFixed(1)}%"></span></span><span>${(e.ap * 100).toFixed(1)}%</span><span>${(e.bp * 100).toFixed(1)}%</span>`).join('')}</div>`;
    }).join('');
    let chromaHtml = '';
    if ((state.chromaBlocks || []).length) {
      const cb = state.chromaBlocks;
      const cbits = cb.reduce((t, b) => t + (b[C.bits] || 0), 0), all = state.payload.blocks.reduce((t, b) => t + (b[C.bits] || 0), 0);
      const h = histogram('uv_mode', cb);
      chromaHtml = `<h3>Separate chroma tree</h3><p class="note">${fmt(cb.length)} chroma blocks carry ${fmt(cbits, 0)} of ${fmt(all, 0)} entropy bits (${(100 * cbits / (all || 1)).toFixed(1)}%).</p><div class="bars"><span class="h">Chroma mode</span><span class="h">Area (blue) and bits (amber)</span><span class="h">Area</span><span class="h">Bits</span>
        ${h.slice(0, 12).map((e) => `<span>${esc(e.k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(e.ap * 100).toFixed(1)}%"></span><span class="bar-fill bits" style="width:${(e.bp * 100).toFixed(1)}%"></span></span><span>${(e.ap * 100).toFixed(1)}%</span><span>${(e.bp * 100).toFixed(1)}%</span>`).join('')}</div>`;
    }
    return `<h2>Frame ${state.f} statistics</h2><p class="sub">Share of picture area and of entropy-decoded bits per value (luma and shared blocks).</p>${html}${chromaHtml}`;
  }

  function renderStreamTab() {
    const s = state.manifest.stream, seq = s.sequence || {};
    const facts = kvRow('File', esc(s.name)) + kvRow('Container', esc(s.container)) + kvRow('Size', fmt(s.size), 'bytes')
      + kvRow('Decoder', esc(s.decoder)) + kvRow('Dumper', esc(s.tool)) + kvRow('Source kind', esc(s.source_kind))
      + kvRow('Profile', fmt(seq.profile)) + kvRow('Level', fmt(seq.level)) + kvRow('Bit depth', fmt(seq.bit_depth))
      + kvRow('Chroma', seq.monochrome ? 'monochrome' : `subsampling ${seq.subsampling_x}, ${seq.subsampling_y}`)
      + kvRow('Superblock', fmt(seq.sb_size)) + kvRow('Frame rate', s.fps ? fmt(s.fps, 2) : '–', 'fps')
      + kvRow('Output MD5', `<span class="mono">${esc(s.output_md5)}</span>`);
    const pill = (t, on) => `<span class="pill ${on ? 'on' : 'off'}">${esc(t.replace(/^enable_/, ''))}</span>`;
    const units = state.manifest.units || [];
    const types = new Map();
    units.forEach((u) => types.set(u.type_name, (types.get(u.type_name) || 0) + 1));
    const note = (state.streams[state.streamIdx] || {}).note;
    return `<h2>${esc(state.manifest.title || s.name)}</h2><p class="sub">${fmt(s.frames)} decoded frames, ${fmt(s.outputs)} output frames, ${fmt(units.length)} OBUs</p>
      ${note ? `<p class="note">${esc(note)}</p>` : ''}
      <dl class="kv">${facts}</dl>
      <h3>Sequence tools enabled</h3><div>${(s.tools_enabled || []).map((t) => pill(t, true)).join('') || '<span class="note">none reported</span>'}</div>
      <h3>Sequence tools disabled</h3><div>${(s.tools_disabled || []).map((t) => pill(t, false)).join('') || '<span class="note">none</span>'}</div>
      <h3>OBU types</h3><table class="grid"><tbody>${[...types.entries()].map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderTab() {
    const body = $('#tabBody');
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
    if (!state.manifest || !state.payload) { body.innerHTML = '<p class="sub">Load a stream to begin.</p>'; return; }
    const scroll = body.scrollTop;
    body.innerHTML = { block: renderBlockTab, frame: renderFrameTab, syntax: renderSyntaxTab, stats: renderStatsTab, stream: renderStreamTab }[state.tab]();
    if (state.tab === 'syntax') {
      body.scrollTop = scroll;
      const inp = $('#symSearch');
      if (inp) inp.addEventListener('input', () => { state.symFilter = inp.value; state.symLimit = 400; const pos = inp.selectionStart; renderTab(); const n = $('#symSearch'); n.focus(); n.setSelectionRange(pos, pos); });
    }
  }

  // --------------------------------------------------------- AI context
  function aiBlockContext() {
    const s = state.manifest.stream, fr = state.payload.frame, m = frameMeta(state.f);
    const { o, ext } = blockObject(state.sel);
    const path = partitionPath(o.x, o.y, isChromaBlock(state.sel) ? 'chroma' : 'luma');
    const syms = symbolsOfBlock(state.sel);
    const lines = [
      `## VC Analyzer block context`,
      `- Stream: ${s.name} (${(s.codec || '').toUpperCase()}, ${s.decoder || ''}, dumper ${s.tool || ''})`,
      `- Frame: decode index ${fr.f}, output index ${m.out_n ?? 'none'}, ${fr.frame_type}, order hint ${fr.order_hint}, base qindex ${fr.base_qindex}, ${fr.width}x${fr.height}`,
      `- Block: ${o.bsize} at (${o.x}, ${o.y}) size ${o.w}x${o.h}, ${o.tree} tree, partition ${o.partition}`,
      `- Prediction: ${o.pred}, mode ${o.mode}${o.uv_mode ? ', chroma ' + o.uv_mode : ''}${o.ref0 ? `, ref ${[o.ref0, o.ref1].filter(Boolean).join('+')}, mv (x,y 1/8 pel) (${o.mv0_col},${o.mv0_row})${o.mv1_row !== undefined ? ` (${o.mv1_col},${o.mv1_row})` : ''}` : ''}${o.motion_mode ? ', motion ' + o.motion_mode : ''}${o.interp_filter ? ', filter ' + o.interp_filter : ''}`,
      `- Transform: ${o.tx_size} ${o.tx_type}, skip_txfm ${o.skip_txfm}, qindex ${o.qindex}, cdef index ${o.cdef_idx}`,
      `- Entropy bits: ${fmt(o.bits, 3)} over ${o.nsym} symbols`,
      `- Decoder fields: ${JSON.stringify(ext)}`,
      path.length ? `- Partition path: ${path.map((n) => `${n.bsize}@(${n.x},${n.y}) ${n.partition}`).join(' > ')}` : '',
      '',
      '| n | element (reader:tags) | value | bits | source |',
      '|---|---|---|---|---|',
      ...syms.slice(0, 120).map((x) => { const t = symtype(x[1]); return `| ${x[0]} | ${t.name} | ${x[2] === -1 ? '' : x[2]} | ${fmt(x[4], 3)} | ${t.file ? t.file + ':' + t.line : ''} |`; }),
      syms.length > 120 ? `(${syms.length - 120} more symbols omitted)` : '',
      '',
      'Conventions: coordinates are luma pixels; mv in 1/8 pel; symbols are attributed by the decoder accounting context.',
    ];
    return lines.filter((l) => l !== '').join('\n');
  }

  function aiFrameContext() {
    const s = state.manifest.stream, fr = state.payload.frame;
    const hist = (k) => histogram(k).slice(0, 8).map((e) => `${e.k} ${(e.ap * 100).toFixed(1)}% area / ${(e.bp * 100).toFixed(1)}% bits`).join('; ');
    return [
      `## VC Analyzer frame context`,
      `- Stream: ${s.name} (${(s.codec || '').toUpperCase()}, ${s.decoder || ''})`,
      `- Frame: ${frameSummary()}`,
      `- Shown: ${fr.show ? 'immediately' : (fr.implicit_output ? 'later' : 'no')}, tiles ${fr.tiles ? fr.tiles.cols + 'x' + fr.tiles.rows : '1x1'}`,
      `- References: ${(fr.refs || []).map((r, i) => `${r.name || 'REF' + i}=slot ${r.slot}${r.order_hint !== undefined ? ' oh ' + r.order_hint : ''}`).join(', ')}`,
      `- Coding: ${JSON.stringify(fr.coding)}`,
      `- Filters: ${JSON.stringify(fr.filters)}`,
      `- Prediction share: ${hist('pred')}`,
      `- Modes: ${hist('mode')}`,
      `- Block sizes: ${hist('bsize')}`,
    ].join('\n');
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); flash('Copied'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); flash('Copied'); } catch (e2) { flash('Copy failed'); }
      ta.remove();
    }
  }
  function flash(msg) { const t = $('#toast'); if (t) { t.textContent = msg; setTimeout(() => { if (t) t.textContent = ''; }, 1600); } }

  // ------------------------------------------------------------ status
  function setStatus(msg) { $('#statusbar').textContent = msg; }
  function setEmpty(msg) { const e = $('#emptyState'); e.hidden = !msg; e.textContent = msg || ''; }

  function pixelAt(x, y) {
    const p = state.picture && state.picture.planes;
    if (!p || x < 0 || y < 0 || x >= p.w || y >= p.h) return '';
    const yv = p.Y[y * p.w + x];
    if (!p.U) return `Y ${yv}`;
    const ci = (y >> p.ssy) * p.cw + (x >> p.ssx);
    return `Y ${yv} U ${p.U[ci]} V ${p.V[ci]}`;
  }

  function hoverAt(px, py) {
    const [ix, iy] = toImage(px, py);
    const x = Math.floor(ix), y = Math.floor(iy);
    const bi = blockAt(x, y);
    const tip = $('#tooltip');
    if (bi !== state.hover) { state.hover = bi; requestRender(); }
    if (bi < 0) { tip.hidden = true; setStatus(state.payload ? frameSummary() : ''); return; }
    const b = state.payload.blocks[bi];
    const pix = pixelAt(x, y);
    tip.innerHTML = `<b>${esc(b[C.bsize])}</b> at (${b[C.x]}, ${b[C.y]})<br>${esc(b[C.pred])} ${esc(b[C.mode])}${b[C.ref0] ? ' ' + esc(b[C.ref0]) : ''}<br>${esc(b[C.tx_size])} q${b[C.qindex]} · ${fmt(b[C.bits] || 0, 1)} bits`;
    const wrap = $('#canvasWrap').getBoundingClientRect();
    tip.hidden = false;
    const tx = Math.min(px + 14, wrap.width - tip.offsetWidth - 6), ty = Math.min(py + 14, wrap.height - tip.offsetHeight - 6);
    tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
    setStatus(`x ${x}  y ${y}   ${pix}   block ${b[C.bsize]} at (${b[C.x]}, ${b[C.y]})   ${b[C.pred]} ${b[C.mode]}   ${fmt(b[C.bits] || 0, 2)} bits`);
  }

  // ------------------------------------------------------------ hash
  function parseHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    const sel = h.get('sel') ? h.get('sel').split(',').map(Number) : null;
    return { f: h.has('f') ? +h.get('f') : null, fill: h.get('fill'), lines: h.get('lines'), stage: h.get('stage'), sel, tab: h.get('tab') };
  }
  function writeHash() {
    const h = new URLSearchParams();
    h.set('f', state.f);
    h.set('fill', state.fill);
    h.set('lines', [...state.lines].join(','));
    h.set('stage', state.stage);
    h.set('tab', state.tab);
    if (state.sel >= 0 && state.payload) { const b = state.payload.blocks[state.sel]; h.set('sel', b[C.x] + ',' + b[C.y]); }
    history.replaceState(null, '', '#' + h.toString());
  }

  // ------------------------------------------------------------ controls
  function renderChips() {
    $('#fillGroup').innerHTML = FILLS.map((f) => `<button class="chip" data-fill="${f.id}" aria-pressed="${state.fill === f.id}" title="Fill blocks by ${f.label.toLowerCase()} (${f.key})">${f.label}<span class="hk">${f.key}</span></button>`).join('');
    $('#lineGroup').innerHTML = LINES.map((l) => `<button class="chip" data-line="${l.id}" aria-pressed="${state.lines.has(l.id)}" title="${l.label} (${l.key})">${l.label}<span class="hk">${l.key}</span></button>`).join('');
  }
  function setFill(id) { state.fill = id; renderChips(); renderLegend(); requestRender(); writeHash(); }
  function toggleLine(id) { state.lines.has(id) ? state.lines.delete(id) : state.lines.add(id); renderChips(); requestRender(); writeHash(); }
  function select(bi) {
    state.sel = bi;
    state.autoPick = false;
    if (state.tab !== 'syntax') state.tab = 'block';
    requestRender(); renderTab(); writeHash();
  }

  function wire() {
    renderChips();
    $('#fillGroup').addEventListener('click', (e) => { const b = e.target.closest('[data-fill]'); if (b) setFill(b.dataset.fill); });
    $('#lineGroup').addEventListener('click', (e) => { const b = e.target.closest('[data-line]'); if (b) toggleLine(b.dataset.line); });
    $('#opacity').addEventListener('input', (e) => { state.opacity = e.target.value / 100; requestRender(); });
    $('#stageSelect').addEventListener('change', async (e) => {
      state.stage = e.target.value;
      state.picture = await buildPicture(state.f);
      renderLegend(); requestRender(); writeHash();
    });
    $('#grayBtn').addEventListener('click', async () => {
      state.lumaOnly = !state.lumaOnly;
      $('#grayBtn').setAttribute('aria-pressed', String(state.lumaOnly));
      state.picture = await buildPicture(state.f);
      requestRender();
    });
    $('#prevFrame').addEventListener('click', () => stepFrame(-1));
    $('#nextFrame').addEventListener('click', () => stepFrame(1));
    $('#zoomFit').addEventListener('click', fitView);
    $('#zoom1').addEventListener('click', () => setZoom(1));
    $('#zoomIn').addEventListener('click', () => setZoom(state.view.s * 1.5));
    $('#zoomOut').addEventListener('click', () => setZoom(state.view.s / 1.5));
    $('#helpBtn').addEventListener('click', () => $('#helpDialog').showModal());
    $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { state.tab = b.dataset.tab; renderTab(); writeHash(); } });
    $('#tabBody').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'copy-ai') copyText(aiBlockContext());
        else if (a === 'copy-json') { const { o, ext } = blockObject(state.sel); copyText(JSON.stringify({ ...o, ext }, null, 1)); }
        else if (a === 'copy-frame') copyText(aiFrameContext());
        else if (a === 'more') { state.symLimit += 1000; renderTab(); }
        else if (a === 'order') { state.order = state.order === 'output' ? 'decode' : 'output'; renderTab(); }
        else if (a === 'goto') { state.sel = +act.dataset.block; state.autoPick = false; requestRender(); renderTab(); writeHash(); }
        return;
      }
      const row = e.target.closest('[data-block]');
      if (row && +row.dataset.block >= 0) { state.sel = +row.dataset.block; requestRender(); renderTab(); writeHash(); }
    });
    $('#braid').addEventListener('click', (e) => { const r = e.target.closest('[data-f]'); if (r && r.dataset.f !== '') selectFrame(+r.dataset.f); });
    $('#streamSelect').addEventListener('change', (e) => {
      const i = +e.target.value, s = state.streams[i];
      if (!s) return;
      state.streamIdx = i;
      const url = new URL(location.href);
      url.searchParams.set('data', s.base); url.hash = '';
      history.replaceState(null, '', url);
      openSource({ kind: 'url', base: s.base }, s.title);
    });
    $('#folderInput').addEventListener('change', (e) => {
      const files = [...e.target.files];
      const man = files.filter((f) => f.name === 'manifest.json').sort((a, b) => a.webkitRelativePath.split('/').length - b.webkitRelativePath.split('/').length)[0];
      if (!man) { setEmpty('The chosen folder has no manifest.json. Pick the folder written by "python -m vca export".'); return; }
      const root = man.webkitRelativePath.slice(0, -'manifest.json'.length);
      const map = new Map();
      files.forEach((f) => { if (f.webkitRelativePath.startsWith(root)) map.set(f.webkitRelativePath.slice(root.length), f); });
      const opt = document.createElement('option');
      opt.textContent = 'Local folder: ' + (root.replace(/\/$/, '') || man.webkitRelativePath);
      opt.value = '-1'; opt.selected = true;
      $('#streamSelect').appendChild(opt);
      openSource({ kind: 'files', map }, root);
    });

    // pointer: pan, click, hover, pinch
    const pointers = new Map();
    let drag = null, pinch = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: state.view.s };
        drag = null;
      } else drag = { x: e.offsetX, y: e.offsetY, ox: state.view.ox, oy: state.view.oy, moved: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((pinch.s * d / pinch.d) / state.view.s, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      if (drag) {
        const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; canvas.classList.add('panning'); $('#tooltip').hidden = true; }
        if (drag.moved) { state.view.ox = drag.ox + dx; state.view.oy = drag.oy + dy; requestRender(); }
        return;
      }
      hoverAt(e.offsetX, e.offsetY);
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && !drag.moved && e.type === 'pointerup') {
        const [ix, iy] = toImage(e.offsetX, e.offsetY);
        select(blockAt(Math.floor(ix), Math.floor(iy)));
      }
      drag = null;
      canvas.classList.remove('panning');
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => { $('#tooltip').hidden = true; if (state.hover >= 0) { state.hover = -1; requestRender(); } });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); }, { passive: false });
    window.addEventListener('resize', () => { renderBraidDebounced(); fitCanvasHeight(); requestRender(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      if ($('#helpDialog').open) return;
      const k = e.key;
      if (k === 'ArrowLeft') { stepFrame(-1); e.preventDefault(); }
      else if (k === 'ArrowRight') { stepFrame(1); e.preventDefault(); }
      else if (k === 'Home' && state.manifest) selectFrame(orderedFrames()[0].f);
      else if (k === 'End' && state.manifest) { const l = orderedFrames(); selectFrame(l[l.length - 1].f); }
      else if (k === '0') fitView();
      else if (k === '1') setZoom(1);
      else if (k === '+' || k === '=') setZoom(state.view.s * 1.5);
      else if (k === '-' || k === '_') setZoom(state.view.s / 1.5);
      else if (k === '?') $('#helpDialog').showModal();
      else if (k === 'c' && state.sel >= 0) copyText(aiBlockContext());
      else if (k === 'Escape') select(-1);
      else {
        const f = FILLS.find((x) => x.key === k); if (f) { setFill(f.id); return; }
        const l = LINES.find((x) => x.key === k); if (l) toggleLine(l.id);
      }
    });
  }
  let braidTimer = 0;
  function renderBraidDebounced() { clearTimeout(braidTimer); braidTimer = setTimeout(() => state.manifest && renderBraid(), 120); }

  // ---------------------------------------------------------------- boot
  async function boot() {
    const h = parseHash();
    if (h.fill && FILLS.some((f) => f.id === h.fill)) state.fill = h.fill;
    if (h.lines !== null && h.lines !== undefined) state.lines = new Set(h.lines.split(',').filter((x) => LINES.some((l) => l.id === x)));
    if (h.stage) state.stage = h.stage;
    if (h.tab) state.tab = h.tab;
    wire();
    renderTab();
    state.streams = await discoverStreams();
    const sel = $('#streamSelect');
    if (!state.streams.length) {
      sel.innerHTML = '<option>No stream</option>';
      setEmpty('No stream to show. Open a bundle folder, or start the local GUI with "python -m vca serve <analysis>".');
      return;
    }
    const want = new URLSearchParams(location.search).get('data');
    const wantBase = want ? new URL(want.replace(/\/?$/, '/'), location.href).href : null;
    let idx = state.streams.findIndex((s) => wantBase && s.base === wantBase);
    if (idx < 0) idx = 0;
    state.streamIdx = idx;
    sel.innerHTML = state.streams.map((s, i) => `<option value="${i}" ${i === idx ? 'selected' : ''}>${esc(s.title)}</option>`).join('');
    await openSource({ kind: 'url', base: state.streams[idx].base }, state.streams[idx].title);
  }

  boot();
})();
