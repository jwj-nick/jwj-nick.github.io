// Export (SERVER_API.md §12): the picture as PNG (made here, every mode), tables as CSV
// (server routes with `vca serve`, written here from the manifest and the frame payload
// otherwise) and the stream report (server only).
import { C, FILLS, frameMeta, hasArch, LINES, stageLabel, state, usesQp } from './state.js?v=9ce97af84e';
import { $, dpr, esc, RAMP, rgb, typeName } from './util.js?v=9ce97af84e';
import { caps } from './data.js?v=9ce97af84e';
import { isChromaBlock } from './frames.js?v=9ce97af84e';
import { canvas, drawView } from './view.js?v=9ce97af84e';
import { pixelsCaption } from './pixels.js?v=9ce97af84e';
import { cmpMode, GAP, splitImageX } from './split.js?v=9ce97af84e';
import { ensureSymbols, symbolsReady } from './symbols.js?v=9ce97af84e';

// ------------------------------------------------------------ CSV (§12.1)
// Columns and cells as vca/tables.py writes them: frames = query.frames, blocks = query.BLOCK_SUMMARY_COLS.
export const FRAME_COLS = ['f', 'tu', 'kind', 'frame_type', 'order_hint', 'display_order_hint', 'show', 'out_n', 'width', 'height',
  'base_qindex', 'bytes', 'vcl_bytes', 'symbol_bits', 'blocks', 'symbols', 'recon_md5', 'intra_pct', 'inter_pct', 'skip_pct'];
export const BLOCK_COLS = ['id', 'f', 'x', 'y', 'w', 'h', 'tree', 'bsize', 'pred', 'mode', 'uv_mode', 'skip_txfm', 'qindex', 'tx_size',
  'tx_type', 'ref0', 'ref1', 'mv0_row', 'mv0_col', 'motion_mode', 'compound_type', 'bits', 'nsym'];
// REAL columns: Python prints them with a fraction ("12.0"), JSON.parse has lost it.
const FLOAT_COLS = new Set(['symbol_bits', 'intra_pct', 'inter_pct', 'skip_pct', 'bits']);

// A Python float as repr() / json.dumps writes it: shortest round trip, ".0" on whole numbers,
// exponent form below 1e-4 and from 1e16 with at least two exponent digits.
export function pyFloat(v) {
  if (!Number.isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-4 || a >= 1e16)) {
    const [m, e] = v.toExponential().split('e');
    const sign = e[0] === '-' ? '-' : '+', d = e.replace(/^[+-]/, '');
    return `${m}e${sign}${d.padStart(2, '0')}`;
  }
  const s = String(v);
  return Number.isInteger(v) ? s + '.0' : s;
}
function cell(v, col) {
  if (v === null || v === undefined) return '';
  let s;
  if (typeof v === 'number') s = FLOAT_COLS.has(col) ? pyFloat(v) : String(v);
  else if (typeof v === 'boolean') s = v ? 'true' : 'false';
  else if (typeof v === 'object') s = JSON.stringify(v);   // compact, like json.dumps(separators=(",", ":"))
  else s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(cols, rows) {
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c], c)).join(','))].join('\r\n') + '\r\n';
}
// round(q / 65536, 2) as Python does it (correctly rounded, ties to even), q an integer.
function roundQ16(q) {
  const num = q * 100, den = 65536;
  let k = Math.floor(num / den);
  const r = num - k * den;
  if (2 * r > den || (2 * r === den && k % 2 !== 0)) k += 1;
  return k / 100;
}
const round2 = (v) => +(Math.round(v * 100 + (v >= 0 ? 1e-9 : -1e-9)) / 100);

// frames.csv from the manifest (the frames this bundle holds)
function framesCsv() {
  return toCsv(FRAME_COLS, state.manifest.frames);
}
// blocks.csv of the current frame from its payload.  The store's block bits are the sum of
// the block's symbol bits (1/65536 bits each), so with the symbols loaded they are exact;
// without them (older bundles) the payload's 3-decimal value is rounded again.
async function blocksCsv() {
  if (!frameReady()) throw new Error(waitWords());
  const p = state.payload, f = p.f;
  await ensureSymbols();
  let q16 = null;
  if (symbolsReady() && state.syms && state.payload === p) {
    const s = state.syms;
    q16 = new Float64Array(p.blocks.length);
    for (let i = 0; i < s.count; i++) if (s.block[i] >= 0) q16[s.block[i]] += Math.round(s.bits[i] * 65536);
  }
  const rows = p.blocks.map((b, i) => {
    const o = { f };
    for (const c of BLOCK_COLS) if (c !== 'f') o[c] = b[C[c]];
    if (typeof o.bits === 'number') o.bits = q16 ? roundQ16(q16[i]) : round2(o.bits);
    return o;
  });
  return toCsv(BLOCK_COLS, rows);
}

// The payload is the frame shown in the toolbar: while the next frame loads, the old payload
// stays on screen, so the picture and the browser's blocks.csv wait (name, caption and rows
// then describe the pixels' frame).
const frameReady = () => !!(state.payload && state.loading < 0 && state.payload.f === state.f);
const waitWords = () => `Wait until frame ${state.f} has loaded.`;

// ---------------------------------------------------------- names, routes
// <stream> part of file names: the analysis or demo id, the opened folder's name, else the
// stream's file name without extension
function stem() {
  const st = state.source && state.source.kind === 'url' ? state.streams[state.streamIdx] : null;
  const folder = state.source && state.source.kind === 'files' ? state.folderLabel.replace(/^Local folder: /, '').split('/').pop() : '';
  const raw = (st && st.id && st.id !== 'url' ? st.id : '') || folder || String((state.manifest.stream || {}).name || state.manifest.title || 'stream').replace(/\.[^.]*$/, '');
  // a trailing .vca is dropped, as the server's file names do (tables.file_stem)
  return raw.replace(/\.vca$/i, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'stream';
}
// base URL of this analysis on `vca serve` (…/api/a/<aid>/), or null (static site, opened folder)
function serverBase() {
  if (!caps.server || !state.source || state.source.kind !== 'url') return null;
  try {
    const u = new URL(state.source.base, location.href);
    return u.origin === location.origin && /^\/api\/a\/[^/]+\/$/.test(u.pathname) ? u.pathname : null;
  } catch (e) { return null; }
}
// the block field behind the current fill (stats.csv ?by=); fills without one use mode
const STAT_BY = { mode: 'mode', ref: 'ref0', qindex: 'qindex', skip: 'skip_txfm' };
const statBy = () => STAT_BY[state.fill] || 'mode';
const fillLabel = () => {
  const f = FILLS.find((x) => x.id === state.fill);
  return f ? (f.id === 'qindex' && usesQp() ? 'QP' : f.label) : state.fill;
};

// ------------------------------------------------------------ download
function saveAs(href, name) {
  const a = document.createElement('a');
  a.href = href; a.download = name; a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  saveAs(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
// Where a saved file goes (R48 QA D9).  The page cannot choose or read the folder: every mode (static
// site, the app window, an opened folder) hands the file to the browser, which saves it in its download
// folder, or asks where when it is set to ask.
const WHERE = "Your browser saves it in its download folder (usually Downloads), or asks where when it is set to ask.";
// The dialog's message line, scrolled into the dialog's view (on a phone the list is taller than the screen).
function say(msg) {
  const e = $('#exportMsg');
  e.textContent = msg; e.hidden = !msg;
  if (msg) e.scrollIntoView({ block: 'nearest' });
}

// The server's sentence of a failed answer ({error: {message, hint}}, SERVER_API.md §2).
async function serverSentence(r) {
  let e = null;
  try { e = (await r.json()).error; } catch (x) { /* not JSON */ }
  return e && e.message ? `${e.message}${e.hint ? ` ${e.hint}` : ''}` : `The local server answered HTTP ${r.status}.`;
}
const unreachable = (err) => `The local server did not answer (${err.message}). Is python -m vca serve still running?`;
// filename="..." of a Content-Disposition header (the server's file names)
function dispositionName(h) {
  const m = /filename="([^"]*)"/.exec(h || '');
  return m ? m[1] : '';
}
// A table link of the server: GET it first and wait only for the status and headers, so an
// error (deleted analysis, stopped server) shows its sentence here; on 200 that request is
// dropped and the browser downloads the link itself, streamed to disk (a large blocks table
// never sits in memory).  The server has no HEAD.
async function serverTable(a, label) {
  const href = a.getAttribute('href');
  const ac = new AbortController();
  say(`Asking the local server for ${label}…`);
  let r;
  try { r = await fetch(href, { signal: ac.signal, cache: 'no-store' }); } catch (err) { say(`Could not download ${label}. ${unreachable(err)}`); return; }
  if (!r.ok) { say(`Could not download ${label}. ${await serverSentence(r)}`); return; }
  const name = dispositionName(r.headers.get('Content-Disposition'));
  ac.abort();
  saveAs(href, name);
  say(`Downloading ${name || label} from the local server. ${WHERE}`);
}
// The report is one small page: fetched whole and saved under the server's file name.
async function serverReport(a) {
  const href = a.getAttribute('href');
  say('Asking the local server for the stream report…');
  let r;
  try { r = await fetch(href, { cache: 'no-store' }); } catch (err) { say(`Could not download the report. ${unreachable(err)}`); return; }
  if (!r.ok) { say(`Could not download the report. ${await serverSentence(r)}`); return; }
  const name = dispositionName(r.headers.get('Content-Disposition')) || a.getAttribute('download');
  download(await r.blob(), name);
  say(`Saved ${name}. ${WHERE}`);
}
// Open: the tab is opened at the click (a popup blocker allows it then), the report loads in
// it only when the server answers; on an error the tab closes and the sentence shows here.
async function openReport(a) {
  const href = a.getAttribute('href');
  const w = window.open('', '_blank');
  if (w) w.opener = null;
  say('Asking the local server for the stream report…');
  const fail = (msg) => { if (w) w.close(); say(`Could not open the report. ${msg}`); };
  const ac = new AbortController();
  let r;
  try { r = await fetch(href, { signal: ac.signal, cache: 'no-store' }); } catch (err) { fail(unreachable(err)); return; }
  if (!r.ok) { fail(await serverSentence(r)); return; }
  ac.abort();
  if (w) { w.location.href = new URL(href, location.href).href; say('Opened the report in a new tab.'); } else say('The browser blocked the new tab; use Download.');
}

// ---------------------------------------------------------- picture (§12.3)
const STRIP_MIN_W = 480;   // CSS px: a 176-pixel frame still gets a readable caption and legend
const PAD = 10;
const MAX_W = 4096;        // the whole frame's default scale keeps the PNG at most this wide
const SCALES = [1, 2, 4];
const defaultScale = (w) => [...SCALES].reverse().find((s) => w * s <= MAX_W) || 1;
// The dialog's picture choices (kept between openings): view or whole frame, its scale
// (null = the default for the frame's width), the selection outline.
const pick = { kind: 'view', scale: null, outline: true };
const frameScale = () => pick.scale || defaultScale(state.payload.frame.width);

// The legend's DOM (legend.js) as drawable pieces: text runs, swatches, the ramp.
function legendPieces() {
  const out = [];
  const walk = (node, dim) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim()) out.push({ kind: 'text', text: t.trim(), dim }); continue; }
      if (n.nodeType !== 1) continue;
      if (n.classList.contains('ramp')) { out.push({ kind: 'ramp' }); continue; }
      if (n.classList.contains('note')) { walk(n, true); continue; }
      const i = n.querySelector(':scope > i');
      if (i) {
        const cs = getComputedStyle(i);
        out.push({ kind: 'swatch', bg: cs.backgroundColor, hatch: /repeating/.test(cs.backgroundImage), border: cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : null, text: n.textContent.trim(), dim });
        continue;
      }
      walk(n, dim);
    }
  };
  walk($('#legend'), false);
  return out;
}
// "key frame", "inter frame", "I frame" (one-letter slice types in capitals)
function typeWords(t) {
  const s = typeName(t);
  return s ? `${/^[a-z]$/.test(s) ? s.toUpperCase() : s} frame` : 'frame type not decoded';
}
function captionLines() {
  const m = state.manifest, f = state.payload.f, fr = frameMeta(f);
  const lines = [...state.lines].map((id) => (LINES.find((l) => l.id === id) || { label: id }).label.toLowerCase());
  const out = fr.out_n === null || fr.out_n === undefined ? 'not output' : `output ${fr.out_n}`;
  return [
    `${m.title}${m.stream && m.stream.codec ? ` (${m.stream.codec.toUpperCase()})` : ''}`,
    `Frame ${f} in decode order (${out}), ${typeWords(fr.frame_type)}. Pixels: ${stageLabel(state.stage)}${pixelsCaption()}. Fill: ${fillLabel()}. Lines: ${lines.length ? lines.join(', ') : 'none'}.`,
  ];
}
// Words and pieces laid out in rows of width w (device px, k device px per CSS px);
// returns {height, draw(ctx, y0)}.
function layoutStrip(ctx, w, k) {
  const css = getComputedStyle(document.documentElement);
  const col = (n, d) => (css.getPropertyValue(n) || d).trim();
  const font = col('--font', 'sans-serif');
  const px = (v) => `${v * k}px`;
  const items = [];
  const [title, sub] = captionLines();
  items.push({ font: `600 ${px(14)} ${font}`, color: col('--text', '#e6e9ee'), words: [title], br: true });
  items.push({ font: `${px(13)} ${font}`, color: col('--text', '#e6e9ee'), words: sub.split(' '), br: true });
  for (const p of legendPieces()) {
    const color = p.dim ? col('--faint', '#6f7a89') : col('--dim', '#9aa4b2');
    if (p.kind === 'ramp') items.push({ ramp: true, width: 120 * k });
    else if (p.kind === 'swatch') items.push({ font: `${px(12.5)} ${font}`, color, swatch: p, words: [p.text], gap: true });
    else items.push({ font: `${px(12.5)} ${font}`, color, words: p.text.split(' ') });
  }
  // place
  const LH = 18 * k, pad = PAD * k, sw = 11 * k, gap = 12 * k, placed = [];
  let x = pad, row = 0;
  const space = (f) => { ctx.font = f; return ctx.measureText(' ').width; };
  for (const it of items) {
    if (it.ramp) {
      if (x + it.width > w - pad && x > pad) { x = pad; row++; }
      placed.push({ ramp: true, x: x + 4 * k, row, w: it.width }); x += it.width + gap; continue;
    }
    ctx.font = it.font;
    if (it.swatch) {
      const tw = sw + 4 * k + ctx.measureText(it.words[0]).width;
      if (x + tw > w - pad && x > pad) { x = pad; row++; }
      placed.push({ swatch: it.swatch, x, row, font: it.font, color: it.color, text: it.words[0] });
      x += tw + gap; continue;
    }
    for (const word of it.words) {
      const ww = ctx.measureText(word).width;
      if (x + ww > w - pad && x > pad) { x = pad; row++; }
      placed.push({ x, row, font: it.font, color: it.color, text: word });
      x += ww + space(it.font);
    }
    if (it.br) { x = pad; row++; }
  }
  const rows = (x > pad ? row + 1 : row);
  const height = Math.ceil(pad * 2 + rows * LH);
  return {
    height,
    draw(c, y0) {
      c.fillStyle = col('--panel', '#242b35'); c.fillRect(0, y0, c.canvas.width, height);
      c.fillStyle = col('--line', '#3a4452'); c.fillRect(0, y0, c.canvas.width, Math.max(1, Math.round(k)));
      c.textBaseline = 'middle';
      for (const p of placed) {
        const cy = y0 + pad + p.row * LH + LH / 2;
        if (p.ramp) {
          const g = c.createLinearGradient(p.x, 0, p.x + p.w, 0);
          RAMP.forEach((rc, i) => g.addColorStop(i / (RAMP.length - 1), rgb(rc)));
          c.fillStyle = g; c.fillRect(p.x, cy - 5 * k, p.w, 10 * k);
          continue;
        }
        if (p.swatch) {
          const s = p.swatch, sx = p.x, sy = cy - sw / 2;
          if (s.hatch) {
            c.save(); c.beginPath(); c.rect(sx, sy, sw, sw); c.clip();
            c.strokeStyle = col('--amber', '#ffb347'); c.lineWidth = 1.5 * k;
            for (let t = -sw; t < sw; t += 4 * k) { c.beginPath(); c.moveTo(sx + t, sy + sw); c.lineTo(sx + t + sw, sy); c.stroke(); }
            c.restore();
          } else if (s.border) { c.strokeStyle = s.border; c.lineWidth = 2 * k; c.strokeRect(sx + k, sy + k, sw - 2 * k, sw - 2 * k); }
          else { c.fillStyle = s.bg; c.fillRect(sx, sy, sw, sw); }
          c.font = p.font; c.fillStyle = p.color; c.fillText(p.text, sx + sw + 4 * k, cy);
          continue;
        }
        c.font = p.font; c.fillStyle = p.color; c.fillText(p.text, p.x, cy);
      }
    },
  };
}
// The picture as a PNG canvas: kind 'view' = the screen canvas as drawn (device pixels),
// 'frame' = the whole frame, each sample as scale x scale pixels (nearest neighbour).
// The strip is drawn at the screen's device scale, like the page's own legend.  Draws off
// screen; the page's view does not change.
// Split and side-by-side views (split.js): the current view is drawn as on screen; the whole frame puts the
// split's divider at the same picture column, and side by side draws the two frames next to each other.
export function pictureCanvas(kind, { scale = 1, outline = true } = {}) {
  const fr = state.payload.frame, k = dpr();
  let pw, ph, view, dk, cw, ch, opts = {};
  if (kind === 'frame') {
    const two = cmpMode() === 'side';
    pw = fr.width * scale * (two ? 2 : 1) + (two ? GAP : 0); ph = fr.height * scale; view = { s: scale, ox: 0, oy: 0 }; dk = 1; cw = pw; ch = ph;
    opts = { vertical: false, splitX: cmpMode() === 'split' ? Math.max(0, Math.min(fr.width, splitImageX())) * scale : undefined };
  } else {
    const r = canvas.getBoundingClientRect();
    pw = canvas.width; ph = canvas.height; view = state.view; dk = k; cw = r.width; ch = r.height;
  }
  const W = Math.max(pw, Math.round(STRIP_MIN_W * k));
  const out = document.createElement('canvas');
  const probe = out.getContext('2d');
  const strip = layoutStrip(probe, W, k);
  out.width = W; out.height = ph + strip.height;
  const c = out.getContext('2d');
  c.fillStyle = (getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg') || '#151a20').trim();
  c.fillRect(0, 0, W, ph);
  const pic = document.createElement('canvas');
  pic.width = pw; pic.height = ph;
  drawView(pic.getContext('2d'), cw, ch, view, dk, { selection: outline, ...opts });
  c.drawImage(pic, 0, 0);
  strip.draw(c, ph);
  return out;
}
const pngName = () => `${stem()}_f${state.payload ? state.payload.f : state.f}_${state.fill}.png`;
async function exportPicture() {
  if (!frameReady()) { say(waitWords()); return; }
  const out = pictureCanvas(pick.kind, { scale: pick.kind === 'frame' ? frameScale() : 1, outline: pick.outline });
  const name = pngName();
  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  if (!blob) { say('The browser could not make the PNG.'); return; }
  download(blob, name);
  say(`Saved ${name} (${out.width} x ${out.height} px). ${WHERE}`);
}

// ------------------------------------------------------------ the dialog
function tableItems() {
  const base = serverBase(), f = state.f, sel = state.sel >= 0 && state.payload ? state.payload.blocks[state.sel] : null;
  const fname = (name, frame) => `${stem()}_${name}${frame !== undefined ? `_f${frame}` : ''}.csv`;
  const items = [
    { id: 'frames', label: 'Frames', what: 'One row per decoded frame: type, order hint, size, base QP or qindex, bytes, entropy bits, intra, inter and skip area.',
      href: base && `${base}table/frames.csv`, make: framesCsv, file: fname('frames') },
    { id: 'blocks', label: `Blocks of frame ${f}`, what: 'One row per block of this frame: position, size, tree, prediction, mode, transform, references, motion vector, bits, symbols.',
      href: base && `${base}table/blocks.csv?f=${f}`, make: blocksCsv, file: fname('blocks', f), needsFrame: true },
  ];
  if (base) {
    items.push(
      { id: 'blocks-all', label: 'Blocks of all frames', what: 'The block table of every frame in one file (large for long streams).', href: `${base}table/blocks.csv?all=1` },
      { id: 'symbols', label: `Symbols of frame ${f}`, what: 'Every entropy-decoded symbol of this frame: element, value, bits and the block it belongs to.', href: `${base}table/symbols.csv?f=${f}` },
      sel && !isChromaBlock(state.sel)
        ? { id: 'symbols-block', label: 'Symbols of the selected block', what: `The symbols of the ${sel[C.w]}x${sel[C.h]} block at (${sel[C.x]}, ${sel[C.y]}) only.`, href: `${base}table/symbols.csv?f=${f}&at=${sel[C.x]},${sel[C.y]}` }
        : { id: 'symbols-block', label: 'Symbols of the selected block', what: sel ? 'Select a luma block: a chroma-tree block is not addressed by a pixel.' : 'Click a block in the picture first.', href: null },
      { id: 'stats', label: `Stats of frame ${f} by ${statBy()}`, what: `Blocks, area and bits per value of ${statBy()} (the field of the current fill${STAT_BY[state.fill] ? '' : '; this fill has none, so mode'}).`, href: `${base}table/stats.csv?f=${f}&by=${statBy()}` },
      { id: 'units', label: 'Units', what: 'Every coded unit of the stream (OBU or NAL unit): offset, size, type, layer, frame.', href: `${base}table/units.csv` },
    );
  }
  return items;
}
const PNG_TITLE = 'Download the picture as a PNG file; the view on screen does not change';
function renderExport() {
  const box = $('#exportBody');
  if (!state.payload) { box.innerHTML = '<p class="sub">Open a stream first.</p>'; return; }
  const fr = state.payload.frame, base = serverBase(), ready = frameReady(), wait = waitWords();
  const scale = frameScale();
  const radio = (name, v, label, what, on) => `<label class="check" title="${esc(what)}"><input type="radio" name="${name}" value="${v}"${on ? ' checked' : ''}> ${label}${name === 'pictureKind' ? ` <span class="dim">${esc(what)}</span>` : ''}</label>`;
  const scales = SCALES.map((s) => radio('pictureScale', s, `${s}:1`, `Whole frame with each sample as ${s} x ${s} pixels: ${fr.width * s} x ${fr.height * s} px${s === defaultScale(fr.width) ? ' (the default for this frame size)' : ''}`, s === scale)).join('');
  let html = `<h3>Picture (PNG)</h3>
    <p class="fine">Frame ${state.f} ${state.fill === 'none' ? 'without a fill' : `with the ${esc(fillLabel().replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()))} fill`}, the lines and pixel stage shown now, and a strip with the legend and a caption. File <code>${esc(pngName())}</code>.</p>
    <div class="export-pick">${radio('pictureKind', 'view', 'Current view', `the picture area as drawn now, ${canvas.width} x ${canvas.height} px`, pick.kind === 'view')}
    ${radio('pictureKind', 'frame', 'Whole frame', `every sample of the ${fr.width} x ${fr.height} frame, enlarged without smoothing`, pick.kind === 'frame')}
    <div class="export-row export-scale" role="radiogroup" aria-label="Whole frame scale" title="Scale of the whole frame: each sample as 1, 2 or 4 pixels on a side"><span class="dim">Whole frame scale</span>${scales}</div>
    <label class="check" title="Leave out the amber outline of the selected block and its partition ancestors"><input type="checkbox" id="exportNoOutline"${pick.outline ? '' : ' checked'}> Without the selection outline</label></div>
    <div class="export-row"><button class="btn" type="button" id="exportPng"${ready ? '' : ' disabled'} title="${esc(ready ? PNG_TITLE : wait)}">Download PNG</button></div>
    <p class="fine" id="exportWait"${ready ? ' hidden' : ''}>${esc(wait)}</p>
    <h3>Tables (CSV)</h3>
    <p class="fine">${base ? 'Written by the local server: the same bytes as' : 'Written in this browser with the same columns and numbers as'} <code>vca frames --csv</code> and <code>vca blocks --csv</code>.</p>
    <ul class="export-list">`;
  for (const it of tableItems()) {
    const title = `Download ${it.label.toLowerCase()} as CSV${it.file ? ` (${it.file})` : ''}`;
    const ctl = it.href
      ? `<a class="btn small" href="${esc(it.href)}" download data-export="${it.id}" title="Download ${esc(it.label.toLowerCase())} as CSV">CSV</a>`
      : it.make ? `<button class="btn small" type="button" data-export="${it.id}"${it.needsFrame ? ` data-title="${esc(title)}"` : ''}${it.needsFrame && !ready ? ` disabled title="${esc(wait)}"` : ` title="${esc(title)}"`}>CSV</button>`
        : `<button class="btn small" type="button" data-export="${it.id}" disabled title="${esc(it.what)}">CSV</button>`;
    html += `<li><div><b>${esc(it.label)}</b><span class="dim">${esc(it.what)}</span></div>${ctl}</li>`;
  }
  html += '</ul>';
  if (base) {
    html += `<h3>Report (HTML)</h3>
      <ul class="export-list"><li><div><b>Stream report</b><span class="dim">One page for reviews and print: stream facts, frame structure, tools, syntax coverage, validation and the HW model summary.</span></div>
      <span class="export-pair"><a class="btn small" id="exportReportOpen" href="${base}report.html" target="_blank" rel="noopener" title="Open the report in a new tab">Open</a>
      <a class="btn small" id="exportReportSave" href="${base}report.html" download="${esc(stem())}_report.html" title="Download the report as one HTML file">Download</a></span></li></ul>`;
  } else {
    html += '<p class="fine" id="exportLocalNote">The stream report and the symbols, stats, units and all-frames tables are in the VC Analyzer app on your computer (or the local GUI, <code>python -m vca serve</code>).</p>';
  }
  html += `<p class="fine" id="exportWhere">Files go to your browser's download folder (usually Downloads), or to the folder it asks for.</p>`;
  box.innerHTML = html;
}
// While the dialog is open and the frame still loads, look again until it has loaded,
// then draw the dialog again (sizes, file name and the waiting items).
let watch = 0;
function watchFrame() {
  clearTimeout(watch);
  if (!$('#exportDialog').open || frameReady()) return;
  watch = setTimeout(() => { if (frameReady()) { if ($('#exportDialog').open) renderExport(); } else watchFrame(); }, 120);
}
export function openExport() {
  say('');
  renderExport();
  $('#exportDialog').showModal();
  watchFrame();
}
export function initExport() {
  $('#exportBtn').addEventListener('click', openExport);
  const dlg = $('#exportDialog');
  dlg.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pictureKind') pick.kind = t.value;
    else if (t.name === 'pictureScale') { pick.scale = +t.value; pick.kind = 'frame'; renderExport(); }
    else if (t.id === 'exportNoOutline') pick.outline = !t.checked;
  });
  dlg.addEventListener('click', async (e) => {
    if (e.target.closest('[data-act="close"]')) { dlg.close(); return; }
    if (e.target.closest('#exportPng')) { exportPicture(); return; }
    const link = e.target.closest('a[data-export], #exportReportSave, #exportReportOpen');
    if (link) {
      e.preventDefault();
      if (link.id === 'exportReportOpen') openReport(link);
      else if (link.id === 'exportReportSave') serverReport(link);
      else { const it = tableItems().find((x) => x.id === link.dataset.export); serverTable(link, it ? it.label.toLowerCase() : 'the table'); }
      return;
    }
    const b = e.target.closest('button[data-export]');
    if (!b || b.disabled) return;
    const it = tableItems().find((x) => x.id === b.dataset.export);
    if (!it || !it.make) return;
    try {
      const text = await it.make();
      download(new Blob([text], { type: 'text/csv;charset=utf-8' }), it.file);
      say(`Saved ${it.file}. ${WHERE}`);
    } catch (err) { say(`Could not write ${it.file}: ${err.message}`); }
  });
}
// read-only probe for tests/gui: what the dialog offers
export function exportSnap() {
  const dlg = document.getElementById('exportDialog');
  return { open: !!(dlg && dlg.open), items: dlg ? [...dlg.querySelectorAll('[data-export]')].map((e) => e.dataset.export) : [], server: !!serverBase() };
}
