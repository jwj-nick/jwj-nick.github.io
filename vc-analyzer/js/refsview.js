// F-c track C (R49, T-0049): references and decoder state from refgraph.json (SERVER_API.md section 18):
// the Frame tab reference table with the decoded frame each reference holds (F18), the Block tab reference links,
// the frame a block's reference points at (for the r fill).
// refgraph.json is read once per opened stream (source.js openSource -> loadRefgraph); bundles exported before it
// existed keep the Frame tab's own table with one line that says why the extras are missing.
import { C, codecOf, state } from './state.js?v=9ce97af84e';
import { esc, fmt, refColor } from './util.js?v=9ce97af84e';
import { getJSON } from './data.js?v=9ce97af84e';
import { renderTab } from './inspector.js?v=9ce97af84e';

// ------------------------------------------------------------ the reference graph of the open stream
// status: none (no stream), loading, ok, missing (no reference graph; why = absent: the bundle has no file,
// unreadable: the file is there but could not be read, codec: the analysis has none for its codec; error = detail)
let rg = { man: null, status: 'none', data: null, error: '', why: '', byF: new Map(), refd: null };
const listeners = [];
// fn() runs once the reference graph of the open stream arrived or turned out missing
export const onRefgraph = (fn) => { listeners.push(fn); };
class NoGraph extends Error { constructor(why, detail) { super(detail); this.why = why; } }
export function loadRefgraph() {
  const mine = { man: state.manifest, status: 'loading', data: null, error: '', why: '', byF: new Map(), refd: null };
  rg = mine;
  // manifest.refgraph: the file's path, or null for a codec it does not cover; older bundles lack the key (ask anyway)
  const man = state.manifest || {};
  const got = 'refgraph' in man && !man.refgraph ? Promise.reject(new NoGraph('codec', ''))
    : getJSON(man.refgraph || 'refgraph.json');
  got.then((j) => {
    if (rg !== mine) return;   // another stream opened meanwhile
    if (!j || !Array.isArray(j.frames)) throw new NoGraph('unreadable', 'it holds no frames list');
    mine.data = j; mine.status = 'ok';
    for (const fr of j.frames) mine.byF.set(fr.f, fr);
  }).catch((e) => {
    if (rg !== mine) return;
    // data.js getJSON: "<file> is missing from the opened folder", "<file>: HTTP <n>", or JSON.parse's SyntaxError
    const msg = String((e && e.message) || e), http = /HTTP (\d+)/.exec(msg);
    mine.status = 'missing';
    if (e instanceof NoGraph) { mine.why = e.why; mine.error = e.message; }
    else if (/is missing from the opened folder/.test(msg) || (http && http[1] === '404')) { mine.why = 'absent'; mine.error = ''; }
    else { mine.why = 'unreadable'; mine.error = e instanceof SyntaxError ? 'it is not valid JSON' : http ? `the server answered HTTP ${http[1]}` : msg; }
  }).finally(() => {
    if (rg !== mine) return;
    if (state.payload && (state.tab === 'frame' || state.tab === 'block')) renderTab();
    listeners.forEach((fn) => fn());
  });
}
// the graph when it is the open stream's and loaded, else null
export const refgraph = () => (rg.status === 'ok' && rg.man === state.manifest ? rg.data : null);
export const refgraphStatus = () => (rg.man === state.manifest ? rg.status : 'none');
export const refgraphError = () => rg.error;
// Why the open stream has no reference graph, as a sentence for the Frame tab, the Decoder state dialog and the
// timeline's References chip ('' while it is there or loading).  need = what needs it, with its verb
// ("The reference arcs need").
export function refgraphWhy(need) {
  if (refgraphStatus() !== 'missing') return '';
  if (rg.why === 'codec') return `${need} a reference graph, which this analysis does not have for its codec.`;
  if (rg.why === 'unreadable') return `${need} refgraph.json, which is in this bundle but could not be read: ${rg.error}. Export the bundle again with python -m vca export.`;
  return `${need} refgraph.json, which this bundle does not have (it was exported before it existed). Export it again with python -m vca export.`;
}
export const refgraphMissingWhy = () => (refgraphStatus() === 'missing' ? rg.why : '');
// the refgraph entry of decode frame f (null without a graph)
export const rgFrame = (f) => (refgraph() ? rg.byF.get(f) || null : null);
// slot codecs keep an exact slot table; POC codecs (HEVC, VVC, AVC) the decoder's reference marking from the dumper
// (T-0062, dpb_summary.kind "marking"), or for analyses made before it only the required set (report finding 3)
export const slotMode = () => { const g = refgraph(); return g ? g.mode === 'slots' : ['av1', 'av2', 'vp9'].includes(codecOf()); };
const has = (v) => v !== null && v !== undefined;
// Map f -> number of frames whose references hold f (refgraph.json referenced_by; the timeline's shading)
export function referencedCounts() {
  const g = refgraph();
  if (!g) return null;
  if (!rg.refd) {
    rg.refd = new Map();
    for (const fr of g.frames) if ((fr.referenced_by || []).length) rg.refd.set(fr.f, fr.referenced_by.length);
  }
  return rg.refd;
}
// distinct decoded frames frame f references, each with the reference names that hold it: [{f, keys[]}]
export function refTargets(f) {
  const fr = rgFrame(f), m = new Map();
  for (const r of (fr && fr.refs) || []) if (has(r.f)) { if (!m.has(r.f)) m.set(r.f, []); m.get(r.f).push(r.key); }
  return [...m.entries()].map(([t, keys]) => ({ f: t, keys }));
}

// ------------------------------------------------------------ blocks of the frame on screen per reference
// Luma and shared blocks (a separate chroma tree reads no reference) whose ref0 or ref1 is the reference name.
const shareCache = new WeakMap();
function refUse(p) {
  let u = shareCache.get(p);
  if (!u) {
    u = { n: 0, by: new Map() };
    for (const b of p.blocks) {
      if (b[C.tree] === 'CHROMA') continue;
      u.n++;
      const k0 = b[C.ref0], k1 = b[C.ref1];
      if (k0) u.by.set(k0, (u.by.get(k0) || 0) + 1);
      if (k1 && k1 !== k0) u.by.set(k1, (u.by.get(k1) || 0) + 1);
    }
    shareCache.set(p, u);
  }
  return u;
}

// ------------------------------------------------------------ Frame tab (F18)
const kvRow = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
// a decode index as a link to that frame
export const frameLink = (f, extra = '') => `<button type="button" class="rf-link" data-act="ref-frame" data-f="${f}" title="Go to frame ${f} (decode index)${extra}">${f}</button>`;
const sizeText = (s) => (Array.isArray(s) && s.length >= 2 ? `${s[0]}×${s[1]}` : '–');
// weighted prediction values as "name value" pairs (lists joined with /)
export function wpText(wp) {
  if (!has(wp)) return '–';
  if (typeof wp !== 'object') return String(wp);
  return Object.entries(wp).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('/') : (v && typeof v === 'object' ? JSON.stringify(v) : v)}`).join(', ');
}
// why refgraph.json left a reference without a frame (refs[].problem)
const PROBLEMS = {
  slot_empty: 'the slot holds no decoded frame', oh_mismatch: 'the frame in the slot has another order hint',
  f_mismatch: 'the frame in the slot is not the one the dumper names', poc_missing: 'no decoded frame has this POC',
  fn_mismatch: 'no decoded frame has this POC and frame_num',
};
const decoderBtn = () => '<div class="actions rf-acts"><button class="btn small" type="button" data-act="decoder" title="The decoded picture buffer, the reference structure and the state carried between frames (Shift+D)">Decoder state…</button></div>';

// The Frame tab's own table (inspector.js) with a line saying why the extras are missing.
function oldTable(fr, why) {
  const rows = (fr.refs || []).map((r, i) => `<tr><td>${esc(r.name || 'REF' + i)}</td><td class="num">${fmt(r.slot)}</td><td class="num">${fmt(r.order_hint)}</td><td class="num">${has(r.f) ? fmt(r.f) : '–'}</td></tr>`).join('');
  return `<h3>References</h3>${rows ? `<table class="grid"><thead><tr><th>Reference</th><th class="num">Slot</th><th class="num">Order hint</th><th class="num" title="Decode index of the frame this reference holds">Frame</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="note">None: this frame reads no reference list.</p>'}
    <p class="note rf-why">${esc(why)}</p>${decoderBtn()}`;
}

// The Frame tab References section (h3 + table); '' = the Frame tab keeps its own table (still loading).
export function frameRefsHtml() {
  const p = state.payload;
  if (!p) return '';
  const st = refgraphStatus();
  if (st === 'loading' || st === 'none') return '';
  if (st !== 'ok') return oldTable(p.frame, refgraphWhy('The decoded frame of every reference, the blocks that use it and the decoder state need'));
  const fr = rgFrame(p.frame.f);
  if (!fr) return oldTable(p.frame, `refgraph.json has no entry for frame ${p.frame.f}.`);
  const refs = fr.refs || [], slots = slotMode();
  const u = refUse(p);
  // slot codecs keep the old table's first columns (name, slot, order hint, frame; VP9: order hint –)
  const anyList = refs.some((r) => has(r.list)), anySlot = slots || refs.some((r) => has(r.slot)), anyOh = slots || refs.some((r) => has(r.order_hint));
  const anyWp = refs.some((r) => has(r.wp)), lt = refs.some((r) => has(r.lt));
  const ohName = slots ? 'Order hint' : 'POC';
  const cols = [['Name', '', 'The reference as blocks name it (the r fill colour)']]
    .concat(anyList ? [['List', 'num rf-s', 'Reference picture list'], ['Idx', 'num rf-s', 'Index in the list']] : [])
    .concat(anySlot ? [['Slot', 'num rf-s', 'Reference slot the frame header points at']] : [])
    .concat(anyOh ? [[ohName, 'num', slots ? 'Order hint of the frame in that slot' : 'Picture order count of the reference']] : [])
    .concat([['Frame', 'num', 'Decode index of the frame this reference holds (click to go there)']])
    .concat(lt ? [['LT', 'num rf-s', 'Long-term reference']] : [])
    .concat([['Size', 'num rf-w', 'Size of the reference picture'], ['Blocks', 'num rf-w', 'Luma and shared blocks of this frame that predict from this reference (ref0 or ref1), and their share of all of them']])
    .concat(anyWp ? [['WP', 'rf-wp', 'Weighted prediction values for this reference']] : []);
  const rows = refs.map((r) => {
    const n = u.by.get(r.key) || 0, pct = u.n ? (100 * n / u.n) : 0;
    const fcell = has(r.f) ? frameLink(r.f, r.ambiguous ? ': more than one decoded frame has this POC, the nearest earlier one is shown' : '') + (r.ambiguous ? '<span class="unit" title="More than one decoded frame has this POC: the nearest earlier one is shown">?</span>' : '')
      : `<span title="Not resolved to a decoded frame${r.problem ? ` (${esc(PROBLEMS[r.problem] || r.problem)})` : ''}">–</span>`;
    return `<tr data-key="${esc(r.key)}" data-f="${has(r.f) ? r.f : ''}" data-n="${n}">`
      + `<td><span style="color:${refColor(r.key)}">${esc(r.key)}</span></td>`
      + (anyList ? `<td class="num">${fmt(r.list)}</td><td class="num">${fmt(r.idx)}</td>` : '')
      + (anySlot ? `<td class="num">${fmt(r.slot)}</td>` : '')
      + (anyOh ? `<td class="num">${fmt(r.order_hint)}</td>` : '')
      + `<td class="num">${fcell}</td>`
      + (lt ? `<td class="num">${r.lt ? 'yes' : (has(r.lt) ? 'no' : '–')}</td>` : '')
      + `<td class="num">${esc(sizeText(r.size))}</td>`
      + `<td class="num" title="${fmt(n)} of ${fmt(u.n)} luma and shared blocks">${fmt(n)}<span class="unit">${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%</span></td>`
      + (anyWp ? `<td class="rf-wp">${esc(wpText(r.wp))}</td>` : '') + '</tr>';
  }).join('');
  const notes = [];
  if (slots && has(fr.refresh)) {
    const sl = []; for (let s = 0; s < 16; s++) if ((fr.refresh >> s) & 1) sl.push(s);
    notes.push(sl.length ? `After decoding, this frame is kept in slot${sl.length > 1 ? 's' : ''} ${sl.join(', ')} (refresh_frame_flags ${fr.refresh}).` : 'This frame is not kept for later frames (refresh_frame_flags 0).');
  }
  const unres = refs.filter((r) => !has(r.f)).length;
  if (unres) notes.push(`${unres} of ${refs.length} references could not be resolved to a decoded frame.`);
  if (!slots) notes.push('The reference lists of the frame\'s first slice.');
  if (['hevc', 'vvc'].includes(codecOf())) notes.push(`Long-term marking and weighted prediction values are not in this analysis: the ${codecOf().toUpperCase()} dumper does not write them yet.`);
  return '<h3>References</h3>' + (rows
    ? `<table class="grid rf-table"><thead><tr>${cols.map(([t, c, tip]) => `<th class="${c}" title="${esc(tip)}">${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="note">None: this frame reads no reference list.</p>')
    + notes.map((t) => `<p class="note">${esc(t)}</p>`).join('') + decoderBtn();
}

// ------------------------------------------------------------ Block tab (F18)
// Rows appended after the Block tab Reference row of block bi: the decoded frame each reference of the block holds.
export function blockRefHtml(bi) {
  const p = state.payload;
  if (!p || bi < 0 || !p.blocks[bi] || !refgraph()) return '';
  const b = p.blocks[bi], keys = [b[C.ref0], b[C.ref1]];
  if (!keys.some((k) => k && k !== 'INTRA')) return '';   // AV2 intra block copy: INTRA, no other picture
  const fr = rgFrame(p.frame.f);
  const parts = keys.map((k, i) => {
    if (!k) return '';
    const t = refFrameOf(bi, i);
    const r = fr && (fr.refs || []).find((x) => x.key === k);
    const what = has(t) ? `frame ${frameLink(t)}` : (r ? 'not resolved' : 'not a decoded frame');
    return `<span class="rf-blk" data-key="${esc(k)}" data-f="${has(t) ? t : ''}"><span style="color:${refColor(k)}">${esc(k)}</span> ${what}</span>`;
  }).filter(Boolean);
  return kvRow(parts.length > 1 ? 'Reference frames' : 'Reference frame', parts.join(', '), 'decode index');
}

// Decode index of the frame that reference i of block bi points at, or null (the r fill falls back to names).
export function refFrameOf(bi, i) {
  const p = state.payload;
  if (!p || !refgraph()) return null;
  const b = p.blocks[bi];
  if (!b) return null;
  const key = b[i === 1 ? C.ref1 : C.ref0];
  if (!key) return null;
  const fr = rgFrame(p.frame.f);
  const r = fr && (fr.refs || []).find((x) => x.key === key);
  return r && has(r.f) ? r.f : null;
}
