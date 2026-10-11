// The Edge dialog (F-g G2, FEATURES F52, SERVER_API.md section 21 items 5 and 6): one deblocking kernel segment of
// the frame on screen (4 lines across an edge): its parameters as the decoder passed them to the kernel (filter
// length and the most samples it may change on each side, the thresholds the payload names, the kernel kind and
// call), what the kernel did (the samples it changed, derived from the windows: the payload's caps say so), and the
// sample windows before and after the kernel as two small grids laid out as on the picture (a vertical edge: the
// lines are rows; a horizontal edge: columns), with the changed samples marked and their difference.  Opened from
// a row of the Block tab's Edges section or by Alt+click near an edge on the picture (internals.js).
import { C, state } from './state.js?v=3e8d1a839f';
import { $, esc, fmt, rgb } from './util.js?v=3e8d1a839f';
import { selectBlockIndex } from './controls.js?v=3e8d1a839f';
import { colsOf, entryOf, lenColour, load, samplesOf, thresholdsText, whyNot } from './internals.js?v=3e8d1a839f';

const dlg = () => $('#edgeDialog');
const PLANE = ['Y', 'U', 'V'];
let cur = null;        // {f, si}: row of dbk.json segs
let win;               // its windows (samplesOf): undefined while loading, null when there are none
let winErr = '';

export async function openEdge(f, si) {
  cur = { f, si }; win = undefined; winErr = '';
  if (!dlg().open) dlg().showModal();
  render();
  await load(f);
  if (!cur || cur.f !== f || cur.si !== si) return;
  render();
  try { win = await samplesOf(f, si); } catch (e) { win = null; winErr = String((e && e.message) || e); }
  if (cur && cur.f === f && cur.si === si) render();
}
export function edgesChanged() { if (dlg() && dlg().open) render(); }

// ------------------------------------------------------------ colours
const gray = (v, bd) => { const g = Math.round(255 * Math.min(1, v / ((1 << bd) - 1))); return [g, g, g]; };
function signedRgb(v, max) {   // planes.js diffToCanvas: amber positive, cyan negative, base 30
  const t = max > 0 ? Math.sqrt(Math.min(1, Math.abs(v) / max)) : 0, b = 30;
  return (v > 0 ? [b + 225 * t, b + 150 * t, b] : v < 0 ? [b, b + 190 * t, b + 225 * t] : [b, b, b]).map((x) => x | 0);
}
const css = (c) => rgb(c);
const light = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 140;

// One window (lines x win samples, line by line) as a grid laid out as on the picture.  kind: before, after, delta.
function winHtml(id, vals, w, dir, bd, kind, base) {
  const lines = w.lines, n = w.win, rows = dir === 0 ? lines : n, cols = dir === 0 ? n : lines;
  let max = 0;
  if (kind === 'delta') for (const v of vals) max = Math.max(max, Math.abs(v));
  let h = `<div class="eg-grid eg-${dir === 0 ? 'v' : 'h'}" id="${id}" style="grid-template-columns:repeat(${cols},var(--eg-cell))" role="grid">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const line = dir === 0 ? r : c, off = dir === 0 ? c : r, i = line * n + off, v = vals[i];
      const col = kind === 'delta' ? signedRgb(v, max) : gray(v, bd);
      const changed = base && base[i] !== v;
      const edge = off === w.q0 ? ' q0' : '';
      const t = kind === 'delta' ? (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '') : String(v);
      h += `<span data-line="${line}" data-off="${off - w.q0}" data-v="${v}" class="${changed || (kind === 'delta' && v) ? 'chg' : ''}${edge}" style="background:${css(col)};color:${light(col) ? '#111' : '#eef1f4'}" title="line ${line}, offset ${off - w.q0} from the edge (${off < w.q0 ? 'p' : 'q'} side)">${t}</span>`;
    }
  }
  return h + '</div>';
}

// ------------------------------------------------------------ words for the payload's names (dbk.json names: kind
// and the flag bits by name; INTERNALS_SPEC.md section 6).  Keyed by the flag's name, never by codec.
const FLAG_WORDS = {
  bs: (v) => `bS ${v}`,
  p_unfiltered: () => 'P side not filtered', q_unfiltered: () => 'Q side not filtered',
  p_lossless: () => 'P side lossless', q_lossless: () => 'Q side lossless',
  dE: (v, n) => `dE ${n}`, filter: (v, n) => (n === 'none' ? 'no filter' : `${n} filter`),
  dEp: () => 'dEp', dEq: () => 'dEq',
};
const FLAG_TIPS = {
  bs: 'boundary strength', dE: 'the luma filter decision: none, normal or strong', filter: 'the filter decision',
  dEp: 'the normal filter also changes the second sample on the P side', dEq: 'the normal filter also changes the second sample on the Q side',
};
// The flags value in words: every named field (one-bit fields only when set); null when the payload names none.
export function flagWords(dbk, flags) {
  const list = (dbk.names || {}).flags;
  if (!list || !list.length) return null;
  const out = [];
  for (const d of list) {
    const v = (flags & d.mask) >> (d.shift || 0), one = !(d.mask & (d.mask - 1)) && !d.values;
    if (one && !v) continue;
    const n = d.values ? d.values[String(v)] || String(v) : String(v), say = FLAG_WORDS[d.name];
    out.push({ text: say ? say(v, n) : `${d.name} ${n}`, tip: FLAG_TIPS[d.name] || '' });
  }
  return out;
}
export const kindWord = (dbk, k) => ((dbk.names || {}).kind || {})[String(k)] || `kind ${k}`;

// The prediction block (dbk.json parts: HEVC PUs, AVC partitions of blocks with more than one) over luma (lx, ly).
function partAt(dbk, bi, lx, ly) {
  if (!dbk.parts || bi < 0) return null;
  const P = colsOf(dbk.parts);
  for (const r of dbk.parts.rows) if (r[P.blk] === bi && lx >= r[P.x] && ly >= r[P.y] && lx < r[P.x] + r[P.w] && ly < r[P.y] + r[P.h]) return { r, P };
  return null;
}
const mvXY = (mv) => `(${mv[1]}, ${mv[0]})`.replace(/-/g, '−');
function partText(pt) {
  if (!pt) return '';
  const { r, P } = pt, refs = r[P.ref] || [], mvs = (r[P.mv] || []).map((m, k) => (m ? `L${k} ${mvXY(m)} ref ${refs[k]}` : '')).filter(Boolean);
  return `; prediction block ${r[P.w]}×${r[P.h]} at (${r[P.x]}, ${r[P.y]})${mvs.length ? `, MV ${mvs.join(', ')}` : ', intra'}`;
}

// ------------------------------------------------------------ render
const kv = (k, v, unit, tip) => `<dt${tip ? ` title="${esc(tip)}"` : ''}>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;
function blockText(bi) {
  const p = state.payload, b = bi >= 0 && p && p.f === cur.f ? p.blocks[bi] : null;
  return b ? `${esc(b[C.bsize] || '')} at (${b[C.x]}, ${b[C.y]})` : '–';
}
function render() {
  const d = dlg();
  if (!d.open || !cur) return;
  const e = entryOf(cur.f), sub = $('#egSub'), body = $('#egBody');
  if (!e || e.status === 'loading') { sub.textContent = `Frame ${cur.f}`; body.innerHTML = '<p class="note">Reading the deblocking edges…</p>'; return; }
  if (!e.dbk || !e.dbk.segs.rows[cur.si]) { sub.textContent = `Frame ${cur.f}`; body.innerHTML = `<p class="note eg-why">${esc(whyNot(cur.f) || 'This frame has no deblocking internals.')}</p>`; return; }
  const dbk = e.dbk, G = colsOf(dbk.segs), r = dbk.segs.rows[cur.si], dir = r[G.dir], bd = dbk.bit_depth || 8;
  const n = dbk.segs.rows.length, lines = r[G.lines];
  sub.textContent = `Frame ${cur.f}, ${PLANE[r[G.plane]] || r[G.plane]} ${dir === 0 ? 'vertical' : 'horizontal'} edge at (${r[G.x]}, ${r[G.y]}) in the plane's samples, ${dir === 0 ? `rows ${r[G.y]}–${r[G.y] + lines - 1}` : `columns ${r[G.x]}–${r[G.x] + lines - 1}`}: segment ${cur.si + 1} of ${n} in kernel call order.`;
  const th = thresholdsText(dbk, r, G);
  const side = dir === 0 ? ['left', 'right'] : ['above', 'below'];
  let params = kv('Filter length', `<i class="ix-len" style="background:${lenColour(Math.max(r[G.len_neg], r[G.len_pos]))}"></i>${r[G.len_neg]} / ${r[G.len_pos]}`, `p side (${side[0]}) / q side (${side[1]})`, 'The filter length the decoder passed to the kernel on each side of the edge')
    + kv('Can change', `${r[G.cap_neg]} / ${r[G.cap_pos]} samples`, 'at most, p side / q side', 'The most samples the kernel can change on each side with these lengths');
  if (th) params += kv('Thresholds', esc(th), '', 'The thresholds the decoder passed to the kernel, by the names the dumper gives them');
  params += kv('Kernel', `${esc(kindWord(dbk, r[G.kind]))}, call ${fmt(r[G.call])}`, 'call number in this frame', 'The kernel the decoder called and its call number in this frame, in call order');
  const fw = flagWords(dbk, r[G.flags]);
  if (fw) params += kv('Flags', fw.length ? fw.map((w) => (w.tip ? `<span title="${esc(w.tip)}">${esc(w.text)}</span>` : esc(w.text))).join(', ') : 'none set', `flags value ${r[G.flags]}`, 'The decoder\'s decision and side values of this segment, by the names the dumper gives the bits');
  else if (r[G.flags]) params += kv('Flags', fmt(r[G.flags]), 'as the dumper writes them', 'A value the dumper writes beside the kernel parameters');
  // the two sides: the blocks, and the prediction blocks where the payload lists them (one block, two PUs)
  const ss = dbk.subsampling || [1, 1], sx = r[G.plane] ? ss[0] : 0, sy = r[G.plane] ? ss[1] : 0;
  const qx = r[G.x] << sx, qy = r[G.y] << sy, px = dir === 0 ? (r[G.x] - 1) << sx : qx, py = dir === 0 ? qy : (r[G.y] - 1) << sy;
  const pp = partAt(dbk, r[G.blk_p], px, py), pq = partAt(dbk, r[G.blk], qx, qy);
  const sel = (bi, s) => (bi >= 0 ? ` <button class="btn small" type="button" data-act="eg-block" data-block="${bi}" title="Close this dialog and select the block on the ${s} side">Select</button>` : '');
  params += kv(`p side (${side[0]})`, `${blockText(r[G.blk_p])}${esc(partText(pp))}${sel(r[G.blk_p], 'p')}`)
    + kv(`q side (${side[1]})`, `${blockText(r[G.blk])}${esc(partText(pq))}${sel(r[G.blk], 'q')}`);
  if (r[G.blk] >= 0 && r[G.blk] === r[G.blk_p]) {
    const two = pp && pq && pp.r !== pq.r;
    params += kv('Edge', two ? 'inner prediction block edge: one block, two prediction blocks' : 'inner edge of one block: a transform or sub-block edge inside it', '',
      two ? 'The edge between two prediction blocks (PUs, partitions) of one block' : 'Both sides belong to the same block');
  }
  const caps = dbk.caps || {};
  let decide = '', grids = '';
  if (win === undefined) decide = '<p class="note">Reading the sample windows…</p>';
  else if (!win) decide = `<p class="note eg-nowin">${esc(winErr ? `The sample windows could not be read (${winErr}).` : dbk.samples_note || 'The dumper wrote no sample window for this segment (outside the region it was asked for, or no dbk_samples), so what the kernel changed is not known.')}</p>`;
  else {
    const [cn, cq] = win.changed;
    const per = [];
    for (let l = 0; l < win.lines; l++) {
      let p = 0, q = 0;
      for (let o = 0; o < win.win; o++) { const i = l * win.win + o; if (win.before[i] !== win.after[i]) { if (o < win.q0) p = Math.max(p, win.q0 - o); else q = Math.max(q, o - win.q0 + 1); } }
      per.push(`line ${l}: ${p} / ${q}`);
    }
    decide = `<p class="eg-decision" id="egDecision">${cn || cq
      ? `The kernel changed up to <b>${cn}</b> sample${cn === 1 ? '' : 's'} on the p side and <b>${cq}</b> on the q side (its lengths allow ${r[G.cap_neg]} and ${r[G.cap_pos]}).`
      : 'The kernel ran but changed no sample: its sample tests left this edge as it was.'} Per line, p / q: ${per.join(', ')}.</p>`
      + `<p class="fine">${esc(caps.decisions ? `Decisions ${caps.decisions}` : 'Decisions derived from the samples')}: the dumper records the kernel's inputs, and what it changed comes from comparing the windows.</p>`;
    const delta = win.after.map((v, i) => v - win.before[i]);
    grids = '<div class="eg-wins">'
      + `<figure class="eg-fig"><figcaption>Before the kernel</figcaption>${winHtml('egBefore', win.before, win, dir, bd, 'before', null)}</figure>`
      + `<figure class="eg-fig"><figcaption>After, changed samples outlined</figcaption>${winHtml('egAfter', win.after, win, dir, bd, 'after', win.before)}</figure>`
      + `<figure class="eg-fig"><figcaption>Change (after − before)</figcaption>${winHtml('egDelta', delta, win, dir, bd, 'delta', null)}</figure>`
      + '</div>'
      + `<p class="fine">Each window has ${win.win} samples across the edge (${win.q0} on the p side, the line marks the edge) on each of its ${win.lines} lines. The vertical edges of a frame are filtered first, so the window of a horizontal edge already holds their result.</p>`;
  }
  body.innerHTML = `<div class="gr-tools eg-nav"><button class="btn small" type="button" data-act="eg-prev" ${cur.si <= 0 ? 'disabled' : ''} title="The kernel segment before this one (←)">‹ Previous</button><button class="btn small" type="button" data-act="eg-next" ${cur.si >= n - 1 ? 'disabled' : ''} title="The kernel segment after this one (→)">Next ›</button></div>`
    + `<dl class="kv eg-params" id="egParams">${params}</dl><h3>What the decoder did</h3>${decide}${grids}`;
}

function step(d) {
  if (!cur) return;
  const e = entryOf(cur.f), n = e && e.dbk ? e.dbk.segs.rows.length : 0, k = cur.si + d;
  if (k < 0 || k >= n) return;
  openEdge(cur.f, k);
}

// ------------------------------------------------------------ wiring, probe
export function initEdges() {
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    if (t.closest('[data-act="eg-prev"]')) step(-1);
    else if (t.closest('[data-act="eg-next"]')) step(1);
    const b = t.closest('[data-act="eg-block"]');
    if (b) { d.close(); selectBlockIndex(+b.dataset.block); }
  });
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    step(e.key === 'ArrowLeft' ? -1 : 1);
  });
}

const grid2 = (id) => { const g = document.getElementById(id); return g ? [...g.querySelectorAll('[data-v]')].map((s) => [+s.dataset.line, +s.dataset.off, +s.dataset.v, s.classList.contains('chg')]) : null; };
export function edgesSnap() {
  const d = dlg(), open = !!(d && d.open);
  if (!open) return { open };
  return {
    open, f: cur ? cur.f : null, si: cur ? cur.si : null, loading: win === undefined,
    params: [...document.querySelectorAll('#egParams dt')].map((dt) => [dt.textContent, dt.nextElementSibling ? dt.nextElementSibling.textContent : '']),
    before: grid2('egBefore'), after: grid2('egAfter'), delta: grid2('egDelta'),
    changed: win ? win.changed : null, decision: ($('#egDecision') || {}).textContent || '', sub: $('#egSub').textContent,
    message: ($('#egBody .note') || {}).textContent || '',
  };
}
