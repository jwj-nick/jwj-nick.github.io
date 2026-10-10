// The Bitstream dialog (SERVER_API.md section 15, FEATURES F01-F04): every coded unit of
// the stream, the selected unit's header elements as FFmpeg's trace_headers reads them
// (position in the unit, absolute bit in the file) and its bytes in hex.  Clicking an
// element shades its bytes and shows its exact bits; clicking a byte selects the first
// element covering it.  The data comes from the bundle (units/<i>.hdr.json, units/<i>.bin,
// headers.json) the same way frames do, so the static site, `vca serve` and an opened
// folder behave alike.  Long lists and long units render only the rows near the view.
// IR 0.3 (F-a part 3): for the frame on screen the hex dump marks where each tile's data starts
// and shades the selected block's runs of symbols (frames/<f>.json `pos`); a click on a byte
// of tile data selects the block whose symbols cover it.
import { state } from './state.js?v=9ce97af84e';
import { $, esc, fmt } from './util.js?v=9ce97af84e';
import { getBlob, getJSON } from './data.js?v=9ce97af84e';
import { selectBlockIndex } from './controls.js?v=9ce97af84e';

const dlg = () => $('#bitstreamDialog');
const UNIT_H = 24, HEX_H = 20, OVERSCAN = 12, ALL_ROWS = 300, STRIP_BYTES = 32;

let man = null;              // the manifest the caches below belong to
let cur = -1, ftype = '';    // selected unit (manifest index), type filter ('' = all)
let elSel = -1, byteSel = -1;
let seq = 0, loading = false;
const hdrCache = new Map(), binCache = new Map();
let summary;                 // headers.json: undefined = not asked, null = failed
let hdr = null, bin = null, hdrErr = '', binErr = '';

const units = () => (state.manifest && state.manifest.units) || [];
const bs = () => (state.manifest && state.manifest.bitstream) || null;
const listed = () => units().filter((u) => !ftype || u.type_name === ftype);
const hex = (v, n) => v.toString(16).padStart(n, '0');

// Read-only view for window.__vca.snap() (tests).
export function bitstreamSnap() {
  const d = dlg();
  if (!d || !d.open) return { open: false };
  const u = units()[cur];
  const range = shadeRange();
  return {
    open: true, unit: cur, type: ftype, list: listed().map((x) => x.i), loading,
    marked: [...d.querySelectorAll('#bsUnits .bs-row.here')].map((r) => +r.dataset.unit),
    rows: d.querySelectorAll('#bsUnits .bs-row').length,
    el: elSel, byte: byteSel, shade: range,
    shaded: [...d.querySelectorAll('#bsHex .hx-b.on')].map((s) => +s.dataset.b),
    strip: stripBits(),
    els: d.querySelectorAll('#bsEls tr[data-el]').length, sections: d.querySelectorAll('#bsEls tr.bs-sec').length,
    hexRows: d.querySelectorAll('#bsHex .hx-row').length, hexTotal: bin ? Math.ceil(bin.length / 16) : 0,
    epb: [...d.querySelectorAll('#bsHex .hx-b.epb')].map((s) => +s.dataset.b),
    elNote: ($('#bsElNote') || {}).textContent || '', hexNote: ($('#bsHexNote') || {}).textContent || '',
    offset: u ? u.offset : null,
    block: blockRuns() ? state.sel : -1,
    blockShaded: [...d.querySelectorAll('#bsHex .hx-hex .hx-b.blk')].map((s) => +s.dataset.b),
    segStarts: [...d.querySelectorAll('#bsHex .hx-hex .hx-b.seg')].map((s) => +s.dataset.b),
    blockNote: ($('#bsBlock') || {}).textContent || '',
  };
}

// ------------------------------------------------------------ block positions (IR 0.3)
// The frame on screen's `pos` when the selected unit belongs to it.
function posHere() {
  const u = units()[cur], p = state.payload;
  return u && p && p.pos && u.frame === state.f && p.f === state.f ? p.pos : null;
}
// The selected block's runs inside this unit: [[a0, a1, segment], ...] (file bits), or null.
function blockRuns() {
  const pos = posHere(), u = units()[cur];
  if (!pos || state.sel < 0) return null;
  const rs = (pos.blk[state.sel] || []).filter((r) => pos.segs[r[0]] && pos.segs[r[0]][0] === u.i);
  return rs.length ? rs.map((r) => [r[1], r[2], r[0]]) : null;
}
// Unit byte ranges [b0, b1) of the selected block's runs.
function blockBytes() {
  const u = units()[cur], rs = blockRuns();
  return rs ? rs.map(([a0, a1]) => [Math.floor(a0 / 8) - u.offset, Math.max(Math.floor(a0 / 8) + 1, Math.ceil(a1 / 8)) - u.offset]) : [];
}
// Byte (in the unit) where each segment of this unit starts: Map byte -> segment.
function segStarts() {
  const pos = posHere(), u = units()[cur], out = new Map();
  if (pos) pos.segs.forEach((g, k) => { if (g[0] === u.i && g[3] !== null) out.set(Math.floor(g[3] / 8) - u.offset, k); });
  return out;
}
const segLabel = (g) => (g[1] === 'tile' && g[2] !== null && g[2] !== undefined ? `tile ${g[2]}` : (g[1] || 'segment'));
function renderBlockLine() {
  const el = $('#bsBlock'), u = units()[cur], pos = posHere();
  if (!el) return;
  let msg = '';
  if (u && u.frame !== null && u.frame !== undefined && state.payload && state.payload.pos && u.frame !== state.f) {
    msg = `Block positions are shown for the frame on screen (frame ${state.f}); this unit belongs to frame ${u.frame}.`;
  } else if (pos) {
    const rs = blockRuns();
    if (rs) {
      const b = state.payload.blocks[state.sel], cols = state.manifest.block_cols;
      const o = {}; cols.forEach((c, i) => { o[c] = b[i]; });
      const bits = rs.reduce((t, r) => t + r[1] - r[0], 0);
      msg = `Selected block ${o.bsize || ''} at (${o.x}, ${o.y}): ${fmt(bits, 2)} bits of ${segLabel(pos.segs[rs[0][2]])} data, `
        + rs.map(([a0, a1]) => `bytes ${fmt(Math.floor(a0 / 8) - u.offset)}–${fmt(Math.max(Math.floor(a0 / 8) + 1, Math.ceil(a1 / 8)) - 1 - u.offset)}`).join(' and ')
        + ` (shaded)${rs.length > 1 ? `: its symbols come in ${rs.length} runs` : ''}. Arithmetic-coded symbols have no bit boundary, so neighbouring blocks share bytes.`;
    } else if (segStarts().size) {
      msg = 'Tile data starts at the marked bytes. Click a byte of tile data to select the block whose symbols are there, or select a block on the picture.';
    }
  }
  el.textContent = msg; el.hidden = !msg;
}
// The block (index in the frame payload) whose symbols cover unit byte k, or -1.
function blockAtByte(k) {
  const pos = posHere(), u = units()[cur];
  if (!pos) return -1;
  const b0 = (u.offset + k) * 8, b1 = b0 + 8;
  let best = -1, most = 0;
  pos.blk.forEach((rs, bi) => {
    if (!rs) return;
    for (const r of rs) {
      if (!pos.segs[r[0]] || pos.segs[r[0]][0] !== u.i) continue;
      const ov = Math.min(r[2], b1) - Math.max(r[1], b0);
      if (ov > most) { most = ov; best = bi; }
    }
  });
  return best;
}

// u: unit to show (default: the last one shown, else the first unit of the frame on screen);
// type: preset the type filter (Stream tab rows).
export function openBitstream(u, type) {
  if (!state.manifest) return;
  if (man !== state.manifest) { man = state.manifest; hdrCache.clear(); binCache.clear(); summary = undefined; cur = -1; ftype = ''; }
  const all = units();
  if (type !== undefined) ftype = all.some((x) => x.type_name === type) ? type : '';
  let i = u !== undefined && u !== null && all[u] ? +u : cur;
  if (type !== undefined) { const first = listed()[0]; i = first ? first.i : -1; }
  if (!all[i]) { const here = all.find((x) => x.frame === state.f); i = here ? here.i : (all.length ? 0 : -1); }
  if (i >= 0 && ftype && all[i].type_name !== ftype) ftype = '';
  if (!dlg().open) dlg().showModal();
  renderTypes();
  loadSummary();
  select(i, true);
}

function loadSummary() {
  const b = bs();
  if (summary !== undefined || !b || !b.headers) return;
  summary = null;
  const m = man;
  getJSON(b.summary || 'headers.json').then((s) => { if (m === man) { summary = s; renderHead(); } }).catch(() => {});
}

function renderTypes() {
  const all = units(), n = new Map();
  all.forEach((u) => n.set(u.type_name, (n.get(u.type_name) || 0) + 1));
  $('#bsType').innerHTML = `<option value="">All types (${fmt(all.length)})</option>`
    + [...n.entries()].map(([k, v]) => `<option value="${esc(k)}"${k === ftype ? ' selected' : ''}>${esc(k)} (${fmt(v)})</option>`).join('');
  $('#bsType').value = ftype;
}

function renderHead() {
  const s = state.manifest.stream || {}, all = units(), here = all.filter((u) => u.frame === state.f).length;
  const h = summary && summary.head;
  const trace = h ? ` Header trace: ${fmt(h.units_matched)} of ${fmt(all.length)} units, ${fmt(h.elements)} elements, ${fmt(h.bit_mismatches)} bit mismatches against the file${summary.checks ? `; ${fmt(summary.checks.n - (summary.checks.failed || []).length)} of ${fmt(summary.checks.n)} values equal the analysis` : ''}.` : '';
  $('#bsSub').textContent = `${fmt(all.length)} units in ${s.name || 'the stream'}; ${fmt(here)} belong to frame ${state.f} (marked).${trace}`;
}

// ------------------------------------------------------------ windowed rows
// Fills a scroll box with rows [a, b) near its view and spacers for the rest; a list of
// ALL_ROWS or fewer is drawn whole.
function fillBox(box, n, h, rowHtml) {
  let a = 0, b = n;
  if (n > ALL_ROWS) {
    const top = box.scrollTop, vh = box.clientHeight || 400;
    a = Math.max(0, Math.floor(top / h) - OVERSCAN);
    b = Math.min(n, Math.ceil((top + vh) / h) + OVERSCAN);
  }
  let html = `<div class="vpad" style="height:${a * h}px"></div>`;
  for (let i = a; i < b; i++) html += rowHtml(i);
  box.innerHTML = html + `<div class="vpad" style="height:${(n - b) * h}px"></div>`;
  box._win = [a, b, n];
}
// Scroll handler: draws again when the view nears the edge of the rows drawn.
function onScroll(box, h, redraw) {
  let queued = false;
  box.addEventListener('scroll', () => {
    const w = box._win;
    if (!w || w[2] <= ALL_ROWS || queued) return;
    const a = Math.floor(box.scrollTop / h), b = Math.ceil((box.scrollTop + box.clientHeight) / h);
    if ((w[0] === 0 || a - w[0] >= 3) && (w[1] === w[2] || w[1] - b >= 3)) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; redraw(); });
  });
}
// Scrolls box so that the band [top, top + h) of its content is inside the view.
function reveal(box, top, h) {
  if (top < box.scrollTop) box.scrollTop = Math.max(0, top - h);
  else if (top + h > box.scrollTop + box.clientHeight) box.scrollTop = top + 2 * h - box.clientHeight;
}

// ------------------------------------------------------------ unit list
// The type column drops the OBU_ prefix every AV1 / AV2 unit has, so names such as REGULAR_TILE_GROUP fit;
// the full name is in the cell's and the row's tooltip, the unit heading and the type filter (R48 QA D12).
const shortType = (t) => String(t || '').replace(/^OBU_/, '');
function renderUnits() {
  const list = listed(), box = $('#bsUnits');
  fillBox(box, list.length, UNIT_H, (k) => {
    const u = list[k];
    const cls = (u.i === cur ? ' cur' : '') + (u.frame === state.f ? ' here' : '');
    return `<div class="bs-row${cls}" data-unit="${u.i}" title="${esc(`Unit ${u.i}: ${u.type_name}, ${fmt(u.size)} bytes at file offset ${fmt(u.offset)}${u.frame === state.f ? '; part of the frame on screen' : ''}`)}">`
      + `<span class="num">${u.i}</span><span class="num">${fmt(u.tu)}</span><span class="num">${fmt(u.offset)}</span><span class="num">${fmt(u.size)}</span>`
      + `<span class="bs-ty" title="${esc(u.type_name)}">${esc(shortType(u.type_name))}</span><span class="num">${u.frame === null || u.frame === undefined ? '–' : fmt(u.frame)}</span></div>`;
  });
  $('#bsCount').textContent = ftype ? `Showing ${fmt(list.length)} of ${fmt(units().length)}` : '';
}
function revealUnit() {
  const k = listed().findIndex((u) => u.i === cur);
  if (k < 0) return;
  const box = $('#bsUnits');
  const before = box.scrollTop;
  reveal(box, k * UNIT_H, UNIT_H);
  if (box.scrollTop !== before || !box.querySelector(`.bs-row[data-unit="${cur}"]`)) renderUnits();
}

// ------------------------------------------------------------ one unit
async function select(i, fresh) {
  cur = i; elSel = -1; byteSel = -1;
  hdr = null; bin = null; hdrErr = ''; binErr = '';
  renderHead(); renderUnits(); revealUnit();
  const u = units()[i];
  if (!u) { renderEls(); renderHex(true); renderStrip(); return; }
  const my = ++seq, b = bs();
  loading = true;
  renderEls(); renderHex(true); renderStrip();
  const jobs = [];
  if (b && b.headers) {
    jobs.push((hdrCache.has(i) ? Promise.resolve(hdrCache.get(i)) : getJSON((b.unit || 'units/<i>.hdr.json').replace('<i>', i)))
      .then((h) => { hdrCache.set(i, h); if (my === seq) hdr = h; })
      .catch((e) => { if (my === seq) hdrErr = `The header file of this unit could not be read (${e.message}).`; }));
  }
  if (b && b.unit_bytes) {
    jobs.push((binCache.has(i) ? Promise.resolve(binCache.get(i)) : getBlob((b.bytes || 'units/<i>.bin').replace('<i>', i)).then((x) => x.arrayBuffer()).then((x) => new Uint8Array(x)))
      .then((x) => { binCache.set(i, x); if (my === seq) bin = x; })
      .catch((e) => { if (my === seq) binErr = `The bytes of this unit could not be read (${e.message}).`; }));
  }
  await Promise.all(jobs);
  if (my !== seq) return;
  loading = false;
  renderEls(); renderHex(fresh !== false); renderStrip(); renderBlockLine();
  if (fresh !== false && blockRuns()) revealBlock();
}

function step(d) {
  const list = listed();
  if (!list.length) return;
  let k = list.findIndex((u) => u.i === cur);
  k = k < 0 ? 0 : Math.max(0, Math.min(list.length - 1, k + d));
  if (list[k].i !== cur) select(list[k].i);
}

// ------------------------------------------------------------ elements
function renderEls() {
  const box = $('#bsEls'), note = $('#bsElNote'), u = units()[cur], b = bs();
  let msg = '';
  if (!u) msg = 'This stream lists no units.';
  else if (!b) msg = 'This bundle was exported before the bitstream view. Export it again to see header elements and bytes.';
  else if (!b.headers) msg = b.headers_reason || 'This analysis has no header trace.';
  else if (hdrErr) msg = hdrErr;
  else if (!hdr) msg = loading ? 'Loading…' : '';
  else if (!hdr.traced) msg = hdr.reason || 'FFmpeg prints no header for this unit.';
  $('#bsUnitTitle').textContent = u ? `Unit ${u.i}: ${u.type_name}` : 'No unit';
  $('#bsUnitFacts').textContent = u ? `${fmt(u.size)} bytes at file offset ${fmt(u.offset)}, temporal unit ${fmt(u.tu)}, frame ${u.frame === null || u.frame === undefined ? '–' : fmt(u.frame)}` : '';
  note.textContent = msg; note.hidden = !msg;
  const tool = $('#bsTool');
  tool.hidden = !(hdr && hdr.traced);
  if (!(hdr && hdr.traced)) { box.innerHTML = ''; return; }
  tool.textContent = `Read by ${hdr.tool || 'FFmpeg trace_headers'}. Pos counts bits from the unit's first byte after any start code${hdr.epb && hdr.epb.length ? ', emulation prevention bytes removed' : ''}; Bit is the absolute bit in the file.${hdr.bad ? ` ${hdr.bad} elements differ from the file's bits.` : ''}`;
  const secAt = new Map();
  (hdr.sections || []).forEach(([name, k]) => { if (!secAt.has(k)) secAt.set(k, []); secAt.get(k).push(name); });
  let rows = '';
  hdr.els.forEach((e, k) => {
    for (const s of secAt.get(k) || []) rows += `<tr class="bs-sec"><td colspan="5">${esc(s)}</td></tr>`;
    rows += `<tr class="clickable${k === elSel ? ' cur' : ''}" data-el="${k}"><td class="num">${e[0]}</td><td class="num">${e[1]}</td><td class="bs-name">${esc(e[3])}</td>`
      + `<td class="mono bs-bits" title="${esc(e[4])}">${esc(e[4])}</td><td class="num mono">${esc(e[5])}</td></tr>`;
  });
  for (const [k, names] of secAt) if (k >= hdr.els.length) for (const s of names) rows += `<tr class="bs-sec"><td colspan="5">${esc(s)}</td></tr>`;
  box.innerHTML = `<table class="grid bs-els"><thead><tr><th class="num" title="Bit position in the unit (after any start code)">Pos</th><th class="num" title="Absolute bit in the stream file">Bit</th><th>Element</th><th>Bits</th><th class="num">Value</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function markEls() {
  const box = $('#bsEls');
  box.querySelectorAll('tr.cur').forEach((r) => r.classList.remove('cur'));
  const r = box.querySelector(`tr[data-el="${elSel}"]`);
  if (!r) return;
  r.classList.add('cur');
  const head = box.querySelector('thead');
  const top = r.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - (head ? head.offsetHeight : 0);
  reveal(box, top, r.offsetHeight);
}

// ------------------------------------------------------------ hex dump
// Byte range [b0, b1) of the unit's bytes the selection covers, or null.
function shadeRange() {
  const u = units()[cur];
  if (!u || !bin) return null;
  if (elSel >= 0 && hdr && hdr.els[elSel]) {
    const e = hdr.els[elSel];
    return [Math.floor(e[1] / 8) - u.offset, Math.ceil(e[2] / 8) - u.offset];
  }
  return byteSel >= 0 ? [byteSel, byteSel + 1] : null;
}
function renderHex(top) {
  const box = $('#bsHex'), note = $('#bsHexNote'), u = units()[cur], b = bs();
  let msg = '';
  if (!u) msg = '';
  else if (!b) msg = 'This bundle was exported before the bitstream view: it has no unit bytes.';
  else if (!b.unit_bytes) msg = 'The bytes of the units are not available: the stream file is missing, or the bundle was exported without units.';
  else if (binErr) msg = binErr;
  else if (!bin) msg = loading ? 'Loading…' : '';
  note.textContent = msg; note.hidden = !msg;
  if (!bin) { box.innerHTML = ''; box._win = null; return; }
  if (top) box.scrollTop = 0;
  drawHex();
}
function drawHex() {
  const box = $('#bsHex'), u = units()[cur];
  if (!bin || !u) return;
  const r = shadeRange() || [-1, -1];
  const epb = new Set(((hdr && hdr.epb) || []).map((f) => f - u.offset));
  const blk = blockBytes(), segs = segStarts(), pos = posHere();
  const inBlk = (k) => blk.some((x) => k >= x[0] && k < x[1]);
  fillBox(box, Math.ceil(bin.length / 16), HEX_H, (row) => {
    let hx = '', asc = '';
    for (let k = row * 16; k < row * 16 + 16; k++) {
      if (k >= bin.length) { hx += '<span class="hx-b pad">  </span>'; continue; }
      const v = bin[k], cls = (k >= r[0] && k < r[1] ? ' on' : '') + (epb.has(k) ? ' epb' : '') + (inBlk(k) ? ' blk' : '') + (segs.has(k) ? ' seg' : '');
      const t = epb.has(k) ? ' title="Emulation prevention byte: not part of the header bits (RBSP)"'
        : segs.has(k) ? ` title="${esc(segLabel(pos.segs[segs.get(k)]))} data starts here"` : '';
      hx += `<span class="hx-b${cls}" data-b="${k}"${t}>${hex(v, 2)}</span>`;
      asc += `<span class="hx-b hx-c${cls}" data-b="${k}">${v >= 0x20 && v < 0x7f ? esc(String.fromCharCode(v)) : '.'}</span>`;
    }
    return `<div class="hx-row"><span class="hx-off">${hex(u.offset + row * 16, 8)}</span><span class="hx-hex">${hx}</span><span class="hx-asc">${asc}</span></div>`;
  });
}
function revealBlock() {
  const x = blockBytes()[0];
  if (!x) return;
  const box = $('#bsHex'), before = box.scrollTop;
  reveal(box, Math.floor(x[0] / 16) * HEX_H, HEX_H);
  if (box.scrollTop !== before) drawHex();
}
function revealShade() {
  const r = shadeRange();
  if (!r) return;
  const box = $('#bsHex'), before = box.scrollTop;
  reveal(box, Math.floor(r[0] / 16) * HEX_H, HEX_H);
  if (box.scrollTop !== before) drawHex();
}

// ------------------------------------------------------------ bit strip
function stripBits() {
  return [...document.querySelectorAll('#bsStrip .bit.on:not(.epb)')].map((s) => s.textContent).join('');
}
function renderStrip() {
  const el = $('#bsStrip'), u = units()[cur];
  const e = elSel >= 0 && hdr ? hdr.els[elSel] : null;
  if (!u || !bin || (!e && byteSel < 0)) {
    el.innerHTML = bin ? '<span class="note">Click an element or a byte to see its bits.</span>' : '';
    return;
  }
  const a0 = e ? e[1] : (u.offset + byteSel) * 8, a1 = e ? e[2] : a0 + 8;
  const f0 = Math.floor(a0 / 8), f1 = Math.ceil(a1 / 8);
  const epb = new Set((hdr && hdr.epb) || []);
  let bits = '', shown = 0;
  for (let f = f0; f < f1 && shown < STRIP_BYTES; f++, shown++) {
    const v = bin[f - u.offset];
    bits += `<span class="sb${epb.has(f) ? ' epb' : ''}" title="${epb.has(f) ? 'Emulation prevention byte at' : 'Byte at'} file offset ${fmt(f)} (0x${hex(v, 2)})">`;
    for (let k = 0; k < 8; k++) {
      const a = f * 8 + k, on = a >= a0 && a < a1;
      bits += `<span class="bit${on ? ' on' : ''}${epb.has(f) ? ' epb' : ''}">${(v >> (7 - k)) & 1}</span>`;
    }
    bits += '</span>';
  }
  const more = f1 - f0 - shown;
  const bi = !e ? blockAtByte(byteSel) : -1;
  const what = e ? `<b>${esc(e[3])}</b> = <span class="mono">${esc(e[5])}</span>, ${fmt(a1 - a0)} ${a1 - a0 === 1 ? 'bit' : 'bits'} from bit ${fmt(a0)} (pos ${fmt(e[0])} in the unit)`
    : `Byte ${fmt(byteSel)} of the unit (file offset ${fmt(u.offset + byteSel)}): no header element covers it${bi >= 0 ? '; it carries symbols of the selected block' : ''}`;
  const epbIn = [...epb].some((f) => f >= f0 && f < f1);
  el.innerHTML = `<div class="sb-what">${what}</div><div class="sb-bits mono">${bits}${more > 0 ? `<span class="note"> and ${fmt(more)} more bytes</span>` : ''}</div>`
    + (epbIn && e ? '<div class="note">The struck-through byte is an emulation prevention byte: its bits are not part of the element.</div>' : '');
}

function pickEl(k) {
  elSel = k; byteSel = -1;
  markEls(); drawHex(); revealShade(); renderStrip();
}
function pickByte(k) {
  const u = units()[cur];
  const f = u.offset + k;
  const hit = hdr && hdr.traced ? hdr.els.findIndex((e) => e[1] < (f + 1) * 8 && e[2] > f * 8) : -1;
  if (hit >= 0) { elSel = hit; byteSel = -1; markEls(); }
  else {
    elSel = -1; byteSel = k; markEls();
    const bi = blockAtByte(k);
    if (bi >= 0 && bi !== state.sel) selectBlockIndex(bi);   // as a click on the picture; the dialog stays open
  }
  drawHex(); renderStrip(); renderBlockLine();
}
// The canvas selection changed while the dialog is open (block search, picture click behind it).
export function bitstreamSelChanged() {
  if (!dlg() || !dlg().open || !bin) return;
  drawHex(); renderBlockLine();
}

export function initBitstream() {
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    const row = t.closest('#bsUnits .bs-row');
    if (row) { select(+row.dataset.unit); return; }
    const el = t.closest('#bsEls tr[data-el]');
    if (el) { pickEl(+el.dataset.el); return; }
    const b = t.closest('#bsHex .hx-b[data-b]');
    if (b) pickByte(+b.dataset.b);
  });
  // on the document: a click on a byte or a row may leave the focus outside the dialog's controls
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); }
  });
  $('#bsType').addEventListener('change', (e) => {
    ftype = e.target.value;
    $('#bsUnits').scrollTop = 0;
    const list = listed();
    if (list.length && !list.some((u) => u.i === cur)) select(list[0].i);
    else { renderUnits(); revealUnit(); }
  });
  onScroll($('#bsUnits'), UNIT_H, renderUnits);
  onScroll($('#bsHex'), HEX_H, drawHex);
  // Units… buttons of the Frame and Stream tabs, unit rows of the Frame tab, type rows of the Stream tab
  $('#tabBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="units"]');
    if (b) { openBitstream(); return; }
    const bb = e.target.closest('[data-act="block-bytes"]');
    if (bb) { openBitstream(+bb.dataset.unit); return; }
    const r = e.target.closest('[data-unit]');
    if (r) { openBitstream(+r.dataset.unit); return; }
    const t = e.target.closest('[data-unit-type]');
    if (t) openBitstream(null, t.dataset.unitType);
  });
}
