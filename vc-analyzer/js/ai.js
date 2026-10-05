// "Copy for AI": block and frame context as Markdown, clipboard.
import { frameMeta, qName, state } from './state.js?v=e0ab48eb46';
import { $, fmt, ohPart } from './util.js?v=e0ab48eb46';
import { frameSummary, isChromaBlock, partitionPath } from './frames.js?v=e0ab48eb46';
import { archContext } from './arch.js?v=e0ab48eb46';
import { ensureSymbols, symbolsOfBlock, symtype } from './symbols.js?v=e0ab48eb46';
import { blockObject, histogram } from './inspector.js?v=e0ab48eb46';

// --------------------------------------------------------- AI context
function aiBlockContext() {
  const s = state.manifest.stream, fr = state.payload.frame, m = frameMeta(state.f);
  const { o, ext } = blockObject(state.sel);
  const path = partitionPath(o.x, o.y, isChromaBlock(state.sel) ? 'chroma' : 'luma');
  const syms = symbolsOfBlock(state.sel) || [];
  const S = state.syms;
  const lines = [
    `## VC Analyzer block context`,
    `- Stream: ${s.name} (${(s.codec || '').toUpperCase()}, ${s.decoder || ''}, dumper ${s.tool || ''})`,
    `- Frame: decode index ${fr.f}, output index ${m.out_n ?? 'none'}, ${fr.frame_type}${ohPart(fr)}, base ${qName()} ${fr.base_qindex}, ${fr.width}x${fr.height}`,
    `- Block: ${o.bsize} at (${o.x}, ${o.y}) size ${o.w}x${o.h}, ${o.tree} tree, partition ${o.partition}`,
    `- Prediction: ${o.pred}, mode ${o.mode}${o.uv_mode ? ', chroma ' + o.uv_mode : ''}${o.ref0 ? `, ref ${[o.ref0, o.ref1].filter(Boolean).join('+')}, mv (x,y 1/8 pel) (${o.mv0_col},${o.mv0_row})${o.mv1_row !== undefined ? ` (${o.mv1_col},${o.mv1_row})` : ''}` : ''}${o.motion_mode ? ', motion ' + o.motion_mode : ''}${o.interp_filter ? ', filter ' + o.interp_filter : ''}`,
    `- Transform: ${o.tx_size} ${o.tx_type}, skip_txfm ${o.skip_txfm}, ${qName()} ${o.qindex}${o.cdef_idx === null || o.cdef_idx === undefined ? '' : ', cdef index ' + o.cdef_idx}`,
    `- Entropy bits: ${fmt(o.bits, 3)} over ${o.nsym} symbols`,
    archContext(o),
    `- Decoder fields: ${JSON.stringify(ext)}`,
    path.length ? `- Partition path: ${path.map((n) => `${n.bsize}@(${n.x},${n.y}) ${n.partition}`).join(' > ')}` : '',
    '',
    '| n | element (reader:tags) | value | bits | source |',
    '|---|---|---|---|---|',
    ...syms.slice(0, 120).map((i) => { const t = symtype(S.type[i]); return `| ${i} | ${t.name} | ${S.value[i] === -1 ? '' : S.value[i]} | ${fmt(S.bits[i], 3)} | ${t.file ? t.file + ':' + t.line : ''} |`; }),
    syms.length > 120 ? `(${syms.length - 120} more symbols omitted)` : '',
    '',
    'Conventions: coordinates are luma pixels; mv in 1/8 pel; symbols are attributed by the decoder accounting context.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export function aiFrameContext() {
  const s = state.manifest.stream, fr = state.payload.frame;
  const hist = (k) => histogram(k).slice(0, 8).map((e) => `${e.k} ${(e.ap * 100).toFixed(1)}% area / ${(e.bp * 100).toFixed(1)}% bits`).join('; ');
  return [
    `## VC Analyzer frame context`,
    `- Stream: ${s.name} (${(s.codec || '').toUpperCase()}, ${s.decoder || ''})`,
    `- Frame: ${frameSummary()}`,
    `- Shown: ${fr.show ? 'immediately' : (fr.implicit_output ? 'later' : 'no')}, tiles ${fr.tiles ? fr.tiles.cols + 'x' + fr.tiles.rows : '1x1'}`,
    `- References: ${(fr.refs || []).map((r, i) => `${r.name || 'REF' + i}=slot ${r.slot}${r.order_hint !== undefined ? ' oh ' + r.order_hint : ''}`).join(', ')}`,
    `- Coding: ${JSON.stringify(fr.coding)}`,
    ...(fr.qm || fr.q_delta ? [`- Quantization: ${JSON.stringify({ q_delta: fr.q_delta, delta_q: fr.delta_q, qm: fr.qm })}`] : []),
    ...(fr.segmentation ? [`- Segmentation: ${JSON.stringify(fr.segmentation)}`] : []),
    `- Filters: ${JSON.stringify(fr.filters)}`,
    `- Prediction share: ${hist('pred')}`,
    `- Modes: ${hist('mode')}`,
    `- Block sizes: ${hist('bsize')}`,
  ].join('\n');
}

export async function copyBlockForAI() {
  await ensureSymbols();
  if (state.sel >= 0) copyText(aiBlockContext());
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); flash('Copied'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flash('Copied'); } catch (e2) { flash('Copy failed'); }
    ta.remove();
  }
}
function flash(msg) { const t = $('#toast'); if (t) { t.textContent = msg; setTimeout(() => { if (t) t.textContent = ''; }, 1600); } }
