// Inspector tabs: Block, Diff, Frame, Syntax, Stats, Stream.
import { BASE_STAGES, C, frameMeta, hasCdef, kindLabel, STAGES, state, usesQp } from './state.js?v=bd3828335b';
import { $, esc, extText, fmt, refColor } from './util.js?v=bd3828335b';
import { stageDiffers } from './planes.js?v=bd3828335b';
import { focusStage } from './diff.js?v=bd3828335b';
import { blockAt, chromaAt, frameSummary, isChromaBlock, partitionPath } from './frames.js?v=bd3828335b';
import { ARCH_MODULES, archOf } from './arch.js?v=bd3828335b';
import { hasSymbols, symbolsOfBlock, symbolsReady, symtype } from './symbols.js?v=bd3828335b';

// ------------------------------------------------------------ inspector
export function blockObject(bi) {
  const b = state.payload.blocks[bi];
  const o = {};
  state.manifest.block_cols.forEach((c, i) => { if (b[i] !== null && b[i] !== undefined) o[c] = b[i]; });
  const ext = (state.payload.ext || [])[bi] || {};
  return { o, ext };
}

const kvRow = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
// A raw value as HTML: '–' when the analysis has none (null, missing or empty).
const val = (v) => (v === null || v === undefined || v === '' ? '–' : esc(v));

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
  facts += kvRow('Transform', `${esc(o.tx_size)} ${esc(o.tx_type)}`) + kvRow(usesQp() ? 'QP' : 'Qindex', fmt(o.qindex));
  if (o.segment_id) facts += kvRow('Segment', fmt(o.segment_id));
  if (hasCdef()) facts += kvRow('CDEF index', fmt(o.cdef_idx));
  if (extra.angle_delta) facts += kvRow('Angle delta', `${extra.angle_delta[0]} / ${extra.angle_delta[1]}`, 'luma / chroma');
  if (extra.cfl) facts += kvRow('CfL', esc(JSON.stringify(extra.cfl)));
  if (extra.palette_size) facts += kvRow('Palette size', `${extra.palette_size[0]} / ${extra.palette_size[1]}`);
  facts += kvRow('Entropy bits', fmt(o.bits, 2), `${fmt(o.nsym)} symbols`);
  const A = archOf(state.payload);
  if (A) {
    const v = A.blk(state.payload.blocks[state.sel]) || [null, 0], r = A.sbAt(o.x, o.y);
    facts += kvRow('HW model (L0 draft)', `ENT ${fmt(v[0], 1)} cycles, fetch ${fmt(v[1])} bytes`,
      r ? `superblock ${r[0]}: ${fmt(r[3], 0)} cycles, ${ARCH_MODULES()[r[4]]} slowest` : '');
  }
  const codec = (state.manifest.stream.codec || '').toUpperCase();
  const extRows = Object.entries(ext).filter(([k]) => k !== '_').map(([k, v]) => kvRow(k, esc(extText(v)))).join('');
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
  const S = state.syms;
  const symRows = (syms || []).slice(0, 300).map((i) => {
    const t = symtype(S.type[i]);
    return `<tr><td class="num">${i}</td><td>${esc(t.name)}</td><td class="num">${S.value[i] === -1 ? '–' : S.value[i]}</td><td class="num">${fmt(S.bits[i], 3)}</td></tr>`;
  }).join('');
  const auto = state.autoPick ? '<p class="note">The costliest block of this frame is selected. Click any block to inspect it.</p>' : '';
  return `<h2>${chroma ? 'Chroma ' : ''}${esc(o.bsize)} at (${o.x}, ${o.y})</h2>
    <p class="sub">${o.w}×${o.h} luma pixels, ${esc(o.tree || '').toLowerCase()} tree, ${esc(o.partition || '')}</p>${auto}
    ${blockDiffHtml()}
    <dl class="kv">${facts}</dl>
    <div class="actions"><button class="btn" data-act="copy-ai">Copy for AI</button><button class="btn" data-act="copy-json">Copy JSON</button><span class="toast" id="toast"></span></div>
    ${companion}
    ${path.length ? `<h3>Partition path${chroma ? ' (chroma tree)' : ''}</h3><ol class="path">${path.map((n, i) => `<li style="--d:${i}" class="${i === path.length - 1 ? 'leaf' : ''}">${esc(n.bsize)} at (${n.x}, ${n.y}): ${esc(n.partition)}</li>`).join('')}</ol>` : ''}
    ${extRows ? `<h3>${codec} decoder fields</h3><dl class="kv">${extRows}</dl>` : ''}
    <h3>Syntax elements read for this block</h3>
    ${syms === null ? `<p class="note">Loading the ${fmt(o.nsym)} symbols of this block…</p>`
      : !hasSymbols(state.payload) ? '<p class="note">This analysis has no symbol trace (it was made without symbols).</p>'
      : syms.length ? `<table class="grid"><thead><tr><th class="num">n</th><th>Element (reader: tags)</th><th class="num">Value</th><th class="num">Bits</th></tr></thead><tbody>${symRows}</tbody></table>${syms.length > 300 ? `<p class="note">Showing 300 of ${syms.length}. The Syntax tab lists all.</p>` : ''}`
      : '<p class="note">No symbols were attributed to this block (superblock-level syntax may have been read with a neighbouring block as context).</p>'}
    <p class="note">Symbols are attributed by the decoder's accounting context: the block being decoded when the symbol was read.</p>`;
}

function frameMiniStats() {
  if (!state.payload) return '';
  return `<h3>This frame</h3><p class="sub">${esc(frameSummary())}</p>`;
}

function renderFrameTab() {
  const fr = state.payload.frame;
  const m = frameMeta(state.f);
  // values a cut or damaged stream lacks show as '–' (val), never as null or an empty field
  let facts = kvRow('Decode index', fr.f) + kvRow('Output index', fmt(m.out_n)) + kvRow('Temporal unit', val(fr.tu))
    + kvRow('Frame type', val(fr.frame_type)) + (fr.order_hint === null || fr.order_hint === undefined ? '' : kvRow('Order hint', fr.order_hint))
    + (fr.display_order_hint !== undefined && fr.display_order_hint !== null ? kvRow('Display order hint', fr.display_order_hint) : '')
    + kvRow('Shown', fr.show ? 'immediately' : (fr.implicit_output ? 'later (implicit output)' : 'no'))
    + kvRow('Size', `${fmt(fr.width)}×${fmt(fr.height)}`) + kvRow('Superblock', fr.sb_size ? `${fr.sb_size}×${fr.sb_size}` : '–')
    + kvRow(usesQp() ? 'Slice QP' : 'Base qindex', val(fr.base_qindex))
    + kvRow('Tiles', `${fr.tiles ? fr.tiles.cols : 1}×${fr.tiles ? fr.tiles.rows : 1}`)
    + kvRow('Bytes', fmt((fr.units || {}).bytes), 'all OBUs of this frame') + kvRow('Entropy bits', fmt((fr.stats || {}).symbol_bits, 1))
    + kvRow('Recon MD5', (fr.recon || {}).md5 ? `<span class="mono">${esc(fr.recon.md5)}</span>` : '–');
  const A = archOf(state.payload);
  if (A && A.frame && A.frame.modeled) {
    const af = A.frame;
    facts += kvRow('HW model (L0 draft)', `${fmt(af.cycles, 0)} cycles, ${(100 * af.utilization).toFixed(2)}% of budget, ${esc(af.bottleneck)} slowest`,
      ARCH_MODULES().map((m) => `${m} ${fmt(af.modules[m], 0)}`).join(' · '))
      + kvRow('Reference fetch', `${fmt(af.fetch_bytes / 1024, 1)} KB`, `${fmt(af.fetch_per_pixel, 2)} bytes per pixel; write ${fmt(af.write_bytes / 1024, 1)} KB`)
      + kvRow('Loop filter stages', esc((af.filters || ['?']).join(', ') || 'none'));
  }
  const obj = (o) => Object.entries(o || {}).map(([k, v]) => kvRow(k, v !== null && typeof v === 'object' ? esc(JSON.stringify(v)) : val(v))).join('');
  const refs = (fr.refs || []).map((r, i) => `<tr><td>${esc(r.name || 'REF' + i)}</td><td class="num">${fmt(r.slot)}</td><td class="num">${fmt(r.order_hint)}</td></tr>`).join('');
  const units = (fr.units_list || []).map((u) => `<tr><td class="num">${u.i}</td><td>${esc(u.type_name)}</td><td class="num">${fmt(u.offset)}</td><td class="num">${fmt(u.size)}</td></tr>`).join('');
  // IR 0.2 header values: quantizer deltas and matrices, segmentation, the picture's PPS (VVC, HEVC)
  const quant = {};
  for (const k of ['q_delta', 'delta_q', 'qm']) if (fr[k]) quant[k] = fr[k];
  const seg = fr.segmentation;
  let segHtml = '';
  if (seg && seg.segmentation_enabled) {
    const head = {};
    for (const [k, v] of Object.entries(seg)) if (!['features', 'qindex', 'lossless'].includes(k)) head[k] = v;
    const rows = [];
    for (let i = 0; i <= (seg.last_active_segid || 0); i++) {
      const ft = Object.entries((seg.features || {})[String(i)] || {}).map(([k, v]) => `${k} ${v}`).join(', ');
      rows.push(`<tr><td class="num">${i}</td><td class="num">${fmt((seg.qindex || [])[i])}</td><td>${(seg.lossless || [])[i] ? 'yes' : 'no'}</td><td>${esc(ft || 'none')}</td></tr>`);
    }
    segHtml = `<h3>Segmentation</h3><dl class="kv">${obj(head)}</dl>
      <table class="grid"><thead><tr><th class="num">Seg</th><th class="num">qindex</th><th>Lossless</th><th>Features</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  } else if (seg) {
    segHtml = '<h3>Segmentation</h3><p class="note">Off in this frame.</p>';
  }
  const ex = fr.ext || {};
  const pps = (ex.vvc || ex.hevc || {}).pps;
  const ppsHtml = pps ? `<details class="ps"><summary>Picture parameter set (${Object.keys(pps).length} fields)</summary><dl class="kv">${obj(pps)}</dl></details>` : '';
  return `<h2>Frame ${fr.f}</h2><p class="sub">${esc(frameSummary())}</p>
    <div class="actions"><button class="chip" data-act="order" aria-pressed="${state.order === 'output'}">Step through output order</button><button class="btn" data-act="copy-frame">Copy for AI</button><span class="toast" id="toast"></span></div>
    <dl class="kv">${facts}</dl>
    <h3>References</h3>${refs ? `<table class="grid"><thead><tr><th>Reference</th><th class="num">Slot</th><th class="num">Order hint</th></tr></thead><tbody>${refs}</tbody></table>` : '<p class="note">None: this frame reads no reference list.</p>'}
    <h3>Coding decisions</h3><dl class="kv">${obj(fr.coding)}</dl>
    ${Object.keys(quant).length ? `<h3>Quantization</h3><dl class="kv">${obj(quant)}</dl>` : ''}
    ${segHtml}
    <h3>Filters</h3><dl class="kv">${obj(fr.filters)}</dl>
    ${ppsHtml}
    <h3>OBUs of this frame</h3><table class="grid"><thead><tr><th class="num">#</th><th>Type</th><th class="num">Offset</th><th class="num">Size</th></tr></thead><tbody>${units}</tbody></table>`;
}

function renderSyntaxTab() {
  if (!hasSymbols(state.payload)) return '<h2>Syntax</h2><p class="sub">This analysis has no symbol trace. Re-run the analysis with symbols (the default) and export again.</p>';
  if (!symbolsReady()) return `<h2>Symbol trace</h2><p class="sub">Loading the ${fmt((state.payload.sym || {}).count)} symbols of frame ${state.f}…</p>`;
  const S = state.syms;
  const q = state.symFilter.toLowerCase();
  const rows = [];
  for (let i = 0; i < S.count; i++) {
    const t = symtype(S.type[i]);
    if (q && !t.name.toLowerCase().includes(q)) continue;
    rows.push([i, t]);
    if (rows.length >= state.symLimit) break;
  }
  const total = q ? '' : ` of ${fmt(S.count)}`;
  return `<h2>Symbol trace</h2><p class="sub">Every entropy-decoded symbol of frame ${state.f} in decode order. Click a row to select its block.</p>
    <input class="search" id="symSearch" placeholder="Filter by element name, e.g. partition or eob" value="${esc(state.symFilter)}">
    <table class="grid"><thead><tr><th class="num">n</th><th>Element</th><th class="num">Value</th><th class="num">Bits</th><th class="num">Block</th></tr></thead><tbody>
    ${rows.map(([i, t]) => { const bi = S.block[i]; return `<tr class="clickable ${bi === state.sel && bi >= 0 ? 'cur' : ''}" data-block="${bi}"><td class="num">${i}</td><td title="${esc((t.file || '') + ':' + (t.line || ''))}">${esc(t.name)}</td><td class="num">${S.value[i] === -1 ? '–' : S.value[i]}</td><td class="num">${fmt(S.bits[i], 3)}</td><td class="num">${bi >= 0 ? bi : '–'}</td></tr>`; }).join('')}
    </tbody></table>
    <p class="note">Showing ${fmt(rows.length)}${total}.${rows.length >= state.symLimit ? ' <button class="btn small" data-act="more">Show more</button>' : ''}</p>`;
}

// Block area inside the picture (edge blocks may extend past it).
function clippedArea(b) {
  const fr = state.payload.frame;
  return Math.max(0, Math.min(b[C.x] + b[C.w], fr.width) - b[C.x]) * Math.max(0, Math.min(b[C.y] + b[C.h], fr.height) - b[C.y]);
}

export function histogram(key, list) {
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
  const facts = kvRow('File', val(s.name)) + kvRow('Container', val(s.container)) + kvRow('Size', fmt(s.size), 'bytes')
    + kvRow('Decoder', val(s.decoder)) + kvRow('Dumper', val(s.tool)) + kvRow('Source kind', val(s.source_kind))
    + kvRow('Profile', fmt(seq.profile)) + kvRow('Level', fmt(seq.level)) + kvRow('Bit depth', fmt(seq.bit_depth))
    + kvRow('Chroma', seq.monochrome ? 'monochrome' : `subsampling ${seq.subsampling_x}, ${seq.subsampling_y}`)
    + kvRow('Superblock', fmt(seq.sb_size)) + kvRow('Frame rate', s.fps ? fmt(s.fps, 2) : '–', 'fps')
    + kvRow('Output MD5', s.output_md5 ? `<span class="mono">${esc(s.output_md5)}</span>` : '–');
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

export function renderTabs() {
  const tabs = [['block', 'Block'], ['frame', 'Frame'], ['syntax', 'Syntax'], ['stats', 'Stats'], ['stream', 'Stream']];
  if (state.diff) tabs.splice(1, 0, ['diff', 'Diff']);
  else if (state.tab === 'diff') state.tab = 'block';
  $('#tabs').innerHTML = tabs.map(([id, label]) => `<button role="tab" data-tab="${id}" aria-selected="${state.tab === id}">${label}</button>`).join('');
}

function stageSummary(r) {
  if (!r || r.status !== 'differs') return '';
  return ['Y', 'U', 'V'].filter((k) => r.planes[k]).map((k) => {
    const d = r.planes[k];
    return `${fmt(d.differing_samples)} ${k} samples; first (${d.first[0]}, ${d.first[1]}): ${d.a} → <span class="mis">${d.b}</span>`;
  }).join('<br>');
}

function blockLabel(i) {
  const b = state.payload.blocks[i];
  return b ? `${esc(b[C.bsize])} at (${b[C.x]}, ${b[C.y]}) ${esc(b[C.pred] || '')} ${esc(b[C.mode] || '')}` : `block ${i}`;
}

function renderDiffTab() {
  const d = state.diff, fd = state.fdiff;
  if (!d) return '<h2>Diff</h2><p class="sub">Open two analyses in diff mode to compare them.</p>';
  const b = d.b || {};
  const head = `<h2>Frame ${state.f}: A vs B</h2><p class="sub">B = ${esc(b.title || '')}${b.kind ? ` (${esc(kindLabel(b.kind))})` : ''}${b.decoder ? `, ${esc(b.decoder)}` : ''}. Pixels are compared as exact samples.</p>`;
  if (!fd) return head + '<p class="note">Loading…</p>';
  if (fd.equal) return head + '<p>This frame of B matches A: every pixel stage, block field and symbol is equal.</p>'
    + (d.first_mismatch ? '<div class="actions"><button class="btn" data-act="goto-mismatch">Go to first mismatch</button></div>' : '');
  const rows = ['pred', 'prefilter', 'recon'].filter((st) => fd.stages[st]).map((st) => {
    const r = fd.stages[st];
    const res = r.status === 'differs' ? `<span class="mis">differs</span>${st === fd.first_stage ? ' <span class="note">first</span>' : ''}` : esc(r.status);
    return `<tr><td>${esc(STAGES[st])}</td><td>${res}</td><td>${stageSummary(r) || '–'}</td><td class="num">${r.status === 'differs' ? fmt((r.blocks || []).length) : ''}</td></tr>`;
  }).join('');
  const fst = focusStage();
  const sb = fst ? (fd.stages[fst].blocks || []) : [];
  const list = (idx) => idx.slice(0, 60).map((i) => `<tr class="clickable ${i === state.sel ? 'cur' : ''}" data-block="${i}"><td>${blockLabel(i)}</td></tr>`).join('');
  const fields = (fd.field_blocks || []).slice(0, 60).map(([i, fl]) => `<tr class="clickable ${i === state.sel ? 'cur' : ''}" data-block="${i}"><td>${blockLabel(i)}</td><td>${Object.entries(fl).map(([k, v]) => `${esc(k)} ${esc(JSON.stringify(v[0]))} → <span class="mis">${esc(JSON.stringify(v[1]))}</span>`).join('<br>')}</td></tr>`).join('');
  const sym = fd.symbol;
  const symHtml = sym ? `<h3>First differing symbol</h3><dl class="kv">${kvRow('Index', fmt(sym.index))}${kvRow('A', sym.a ? `${esc(sym.a.name)} = ${esc(sym.a.value)}` : 'none (B read more symbols)')}${kvRow('B', sym.b ? `<span class="mis">${esc(sym.b.name)} = ${esc(sym.b.value)}</span>${sym.b.block_at ? `<span class="unit">in ${esc(sym.b.block_at.bsize)} at (${sym.b.block_at.x}, ${sym.b.block_at.y})</span>` : ''}` : 'none (A read more symbols)')}</dl>${sym.a && sym.a.block >= 0 ? `<div class="actions"><button class="btn" data-act="goto" data-block="${sym.a.block}">Select the block of A's symbol</button></div>` : ''}` : '';
  const acts = [fd.first_stage ? `<button class="btn" data-act="show-stage" data-stage="D:${fd.first_stage}">Show A − B at ${esc(STAGES[fd.first_stage].toLowerCase())}</button>` : '',
    '<button class="btn" data-act="flip">Flip A / B (x)</button>'].join('');
  return head
    + (fd.stage_meaning ? `<p>First stage that differs: <b>${esc(STAGES[fd.first_stage])}</b>. Look at the ${esc(fd.stage_meaning)}.</p>` : '<p>Pixels are equal; the syntax differs (see below).</p>')
    + `<div class="actions">${acts}</div>`
    + `<h3>Pixel stages (decode pipeline order)</h3><table class="grid"><thead><tr><th>Stage</th><th>Result</th><th>First sample, A → B</th><th class="num">Blocks</th></tr></thead><tbody>${rows}</tbody></table>`
    + (sb.length ? `<h3>Blocks holding differing samples at ${esc(STAGES[fst].toLowerCase())} (${fmt(sb.length)})</h3><table class="grid"><tbody>${list(sb)}</tbody></table>${sb.length > 60 ? `<p class="note">Showing 60 of ${fmt(sb.length)}.</p>` : ''}` : '')
    + (fields ? `<h3>Blocks whose fields differ (${fmt(fd.field_blocks.length)})</h3><table class="grid"><thead><tr><th>Block (A)</th><th>Field A → B</th></tr></thead><tbody>${fields}</tbody></table>` : '')
    + ((fd.only_a || []).length ? `<h3>Blocks only in A (${fmt(fd.only_a.length)})</h3><p class="note">B has no block with this position and tree: the partition differs.</p><table class="grid"><tbody>${list(fd.only_a)}</tbody></table>` : '')
    + ((fd.only_b || []).length ? `<h3>Blocks only in B (${fmt(fd.only_b.length)})</h3><p class="note">${esc(fd.only_b.slice(0, 20).map((k) => `(${k[0]}, ${k[1]}) ${k[2]}`).join(', '))}</p>` : '')
    + symHtml;
}

// Block tab, diff mode: how the selected block of A compares with B.
function blockDiffHtml() {
  const fd = state.fdiff;
  if (!fd || fd.equal || state.sel < 0) return '';
  const i = state.sel;
  const fl = (fd.field_blocks || []).find((x) => x[0] === i);
  const here = BASE_STAGES.filter((st) => stageDiffers(st) && (fd.stages[st].blocks || []).includes(i)).reverse();
  const onlyA = (fd.only_a || []).includes(i);
  if (!fl && !here.length && !onlyA) return '<p class="note">This block matches B (pixels at every stage and all fields).</p>';
  let html = '<h3 class="mis">Differs from B</h3>';
  if (here.length) html += `<p>Samples differ at: ${here.map((st) => esc(STAGES[st].toLowerCase())).join(', ')}.</p>`;
  if (onlyA) html += '<p>B has no block with this position and tree: the partition differs here.</p>';
  if (fl) html += `<table class="grid"><thead><tr><th>Field</th><th>A</th><th>B</th></tr></thead><tbody>${Object.entries(fl[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="ab-a">${esc(JSON.stringify(v[0]))}</td><td class="ab-b">${esc(JSON.stringify(v[1]))}</td></tr>`).join('')}</tbody></table>`;
  return html;
}

export function renderTab() {
  const body = $('#tabBody');
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  if (!state.manifest || !state.payload) { body.innerHTML = '<p class="sub">Load a stream to begin.</p>'; return; }
  const scroll = body.scrollTop;
  body.innerHTML = { block: renderBlockTab, diff: renderDiffTab, frame: renderFrameTab, syntax: renderSyntaxTab, stats: renderStatsTab, stream: renderStreamTab }[state.tab]();
  if (state.tab === 'syntax') {
    body.scrollTop = scroll;
    const inp = $('#symSearch');
    if (inp) inp.addEventListener('input', () => { state.symFilter = inp.value; state.symLimit = 400; const pos = inp.selectionStart; renderTab(); const n = $('#symSearch'); n.focus(); n.setSelectionRange(pos, pos); });
  }
}
