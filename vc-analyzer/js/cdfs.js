// The Probabilities dialog (F-g W56, FEATURES F50, SERVER_API.md section 21 items 12-16): the entropy context of the
// frame on screen (internals/<f>/cdf.json: AV2 / AV1 FRAME_CONTEXT CDF tables, VP9 8-bit probabilities and counts):
// where the frame's initial context comes from in words (the default tables, a reference frame's final context, a
// 7:1 blend, a VP9 context slot), the members as a tree by their names in the payload's layout, and for the chosen
// member every row as two small bars, the initial context and the final one (of the frame, or of one tile; VP9:
// also the loaded slot), the symbols' probabilities side by side with the changed rows marked; "Changed only" keeps
// the members (and rows) that differ.  Opened with "Probabilities…" on the Frame tab or Shift+P.  Reading and
// Compute are entropy.js's (readKind, computeKinds).
import { state } from './state.js?v=3e8d1a839f';
import { $, esc, fmt, setStatus } from './util.js?v=3e8d1a839f';
import { computeHtml, computeKinds, entryOfKind, hasCdf, onKindChange, proseHtml, readKind, whyNotKind } from './entropy.js?v=3e8d1a839f';

const dlg = () => $('#cdfDialog');
let cur = null;        // {f, member: name, against: context key, changedOnly, filter, all: rows shown in full}
let laid = null;
const ROWS_SHOWN = 64;
// symbol colours of the bars (no amber: it marks the selection)
const SYM = ['#4b8dff', '#3fb8af', '#9be15d', '#b07cf7', '#ff66c4', '#e76f6f', '#f2c14e', '#7fd1ff', '#c3a6ff', '#8bd3a0',
  '#ff9e80', '#9aa4b2', '#5c7cfa', '#20c997', '#e599f7', '#ffd43b'];

export async function openCdfs() {
  if (!state.payload) return;
  if (!hasCdf()) { setStatus(whyNotKind('cdf', state.f)); return; }
  const f = state.f;
  cur = { f, member: null, against: 'final', changedOnly: false, filter: '', all: false };
  if (!dlg().open) dlg().showModal();
  render();
  await readKind('cdf', f);
  if (cur && cur.f === f) render();
}

// ------------------------------------------------------------ data helpers
const keyLabel = (k) => (k === 'final' ? 'final of the frame' : k === 'initial' ? 'initial' : k === 'loaded' ? 'loaded slot (before the header\'s updates)' : k.startsWith('tile_final:') ? `final of tile ${k.slice(11)}` : k);
const baseKey = (m) => ('initial' in m.values ? 'initial' : 'loaded');
function rowsOf(m) {
  const D = m.dims.length ? m.dims[m.dims.length - 1] : 1;
  const n = m.dims.slice(0, -1).reduce((a, b) => a * b, 1);
  return { D, n: m.dims.length ? n : 1 };
}
function rowIndex(m, r) {
  const dims = m.dims.slice(0, -1), idx = [];
  for (let k = dims.length - 1; k >= 0; k--) { idx.unshift(r % dims[k]); r = Math.floor(r / dims[k]); }
  return idx.map((v) => `[${v}]`).join('') || '[0]';
}
const differs = (a, b) => { if (!a || !b) return 0; let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
// a member's group in the tree: its struct (nmvc.comps[0].sign_cdf: nmvc), else the first word of its name
// (coeff_base_cdf: coeff); a group of one member is a row of its own
const groupOf = (name) => (/[.[]/.test(name) ? name.split(/[.[]/)[0] : name.split('_')[0]);

// The probabilities of one stored row: icdf (AV1 / AV2: values 32768 - cdf, the last 0, then the counter and rates);
// prob8 (VP9: each element the probability of a 0 bin in 1/256).  [{p, label}] per symbol, or per element.
function probsOf(row, vals, nsym) {
  if (!row || row.form === 'prob8') return null;
  const out = [];
  let prev = 0;
  for (let s = 0; s < nsym - 1; s++) { const c = 32768 - vals[s]; out.push(c - prev); prev = c; }
  out.push(32768 - prev);
  return out.map((q) => q / 32768);
}
// symbols of a CDF row: the first 0 of its icdf values in the base context (every earlier value is above 0)
function symbolsOf(row, base, D) {
  const lim = D - (row ? row.extra : 0);
  for (let i = 0; i < lim; i++) if (base[i] === 0) return i + 1;
  return lim;
}

function barHtml(probs, cls, title) {
  return `<span class="cd-bar ${cls}" title="${esc(title)}">${probs.map((p, s) => `<i style="width:${(100 * p).toFixed(3)}%;background:${SYM[s % SYM.length]}" title="symbol ${s}: ${(100 * p).toFixed(2)} %"></i>`).join('')}</span>`;
}
function prob8Html(vals, cls, title) {
  return `<span class="cd-p8 ${cls}" title="${esc(title)}">${vals.map((v, k) => `<i title="element ${k}: ${v} / 256 = ${(100 * v / 256).toFixed(1)} % for a 0 bin"><b style="height:${(100 * v / 256).toFixed(1)}%"></b></i>`).join('')}</span>`;
}

// ------------------------------------------------------------ render
function render() {
  const d = dlg();
  if (!d.open || !cur) return;
  laid = null;
  const sub = $('#cdSub'), body = $('#cdBody');
  const e = entryOfKind('cdf', cur.f);
  if (!e || e.status === 'loading') { sub.textContent = `Frame ${cur.f}`; body.innerHTML = `<p class="note" role="status">Reading the probability tables of frame ${cur.f}…</p>`; return; }
  if (e.status !== 'ready') { sub.textContent = `Frame ${cur.f}`; body.innerHTML = `<p class="note cd-why">${proseHtml(whyNotKind('cdf', cur.f))}</p>${computeHtml('cdf', cur.f)}`; return; }
  const p = e.data, row = p.row || null;
  const keys = [...new Set(p.members.flatMap((m) => Object.keys(m.values)))];
  const against = keys.filter((k) => k !== 'initial' && k !== 'counts' && k !== 'loaded').concat(keys.includes('loaded') && keys.includes('initial') ? ['loaded'] : []);
  if (!against.includes(cur.against)) cur.against = against.includes('final') ? 'final' : against[0] || 'final';
  sub.textContent = `Frame ${cur.f}, ${(p.codec || '').toUpperCase()} entropy context: ${fmt(p.members.length)} members (layout ${p.layout}${row ? `: a row holds ${row.note}` : ''}).`;
  // members: changed (against the chosen context), filter
  const q = cur.filter.trim().toLowerCase();
  const list = p.members.map((m) => {
    const b = m.values[baseKey(m)], o = m.values[cur.against];
    return { m, n: m.counts ? null : differs(b, o) };
  }).filter((x) => (!cur.changedOnly || x.n) && (!q || x.m.name.toLowerCase().includes(q)));
  if (!cur.member || !list.some((x) => x.m.name === cur.member)) {
    const pick = list.find((x) => x.n) || list[0];      // the first member that changed
    cur.member = pick ? pick.m.name : null;
  }
  const groups = new Map();
  for (const x of list) { const g = groupOf(x.m.name); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
  const button = (x, label, top) => `<button type="button" class="cd-member${top ? ' top' : ''}${x.m.name === cur.member ? ' cur' : ''}" data-member="${esc(x.m.name)}" title="${esc(`${x.m.name}: ${x.m.dims.join(' × ') || '1'}, ${x.m.elem} byte${x.m.elem === 1 ? '' : 's'} per element${x.n === null ? ' (counts)' : x.n ? `; ${x.n} values differ` : '; the same in both'}`)}"><span class="cd-mname">${esc(label)}</span><span class="cd-mch">${x.n === null ? 'counts' : x.n ? `${fmt(x.n)} changed` : 'same'}</span></button>`;
  const tree = [...groups.entries()].map(([g, xs]) => {
    if (xs.length === 1) return button(xs[0], xs[0].m.name, true);
    const ch = xs.reduce((s, x) => s + (x.n ? 1 : 0), 0);
    const open = xs.some((x) => x.m.name === cur.member) || groups.size <= 6;
    return `<details class="cd-group"${open ? ' open' : ''}><summary title="${esc(g)}: ${xs.length} members${ch ? `, ${ch} of them changed` : ''}">${esc(g)} <span class="gr-fact">${xs.length}${ch ? `, ${ch} changed` : ''}</span></summary>`
      + xs.map((x) => button(x, x.m.name.slice(g.length).replace(/^[._]/, '') || x.m.name, false)).join('') + '</details>';
  }).join('');
  const tipA = 'The context each row is compared with: the frame\'s final context (what later frames take over), the final context of one tile, or (VP9) the loaded context slot';
  const sel = `<label class="cd-against" title="${esc(tipA)}">Against <select id="cdAgainst" title="${esc(tipA)}">${against.map((k) => `<option value="${esc(k)}"${k === cur.against ? ' selected' : ''}>${esc(keyLabel(k))}</option>`).join('')}</select></label>`;
  const tipC = 'Only the members whose values differ between the initial context and the one compared with (and only their changed rows)';
  const tools = `<div class="gr-tools cd-tools">${sel}<label title="${esc(tipC)}"><input type="checkbox" id="cdChanged" title="${esc(tipC)}"${cur.changedOnly ? ' checked' : ''}> Changed only</label>`
    + `<input type="search" class="search cd-filter" id="cdFilter" placeholder="Filter members, e.g. mv or coeff" value="${esc(cur.filter)}" aria-label="Filter the members by name" title="Show only the members whose name contains this text"><span class="gr-fact" id="cdCount">${fmt(list.length)} of ${fmt(p.members.length)} members</span></div>`;
  const src = `<p class="cd-source" id="cdSource"><b>Where the initial context comes from:</b> ${esc((p.source || {}).text || 'not known')}</p>`;
  const x = list.find((y) => y.m.name === cur.member);
  body.innerHTML = src + tools + `<div class="cd-panes"><nav class="cd-tree" id="cdTree" aria-label="Members">${tree || '<p class="note">No member matches.</p>'}</nav><section class="cd-member-view" id="cdMember">${x ? memberHtml(p, x.m, row) : ''}</section></div>`;
  laid = { p, list, against: cur.against };
}

function memberHtml(p, m, row) {
  const bk = baseKey(m), base = m.values[bk], other = m.values[cur.against];
  const { D, n } = rowsOf(m);
  if (m.counts || !base) {
    const vals = m.values.counts || base || [];
    return `<h3 class="gr-h">${esc(m.name)} <span class="gr-fact">${m.dims.join(' × ')}, counts</span></h3><p class="note">The symbol counts the frame's adaptation used (VP9 FRAME_COUNTS).</p><p class="mono cd-counts" data-ctx="counts" data-vals="${vals.join(' ')}">${esc(vals.slice(0, 512).join(' '))}${vals.length > 512 ? ' …' : ''}</p>`;
  }
  const prob8 = !row || row.form === 'prob8' || m.elem === 1;
  const cdfLike = !prob8 && m.elem === 2 && row && D > row.extra;
  const rows = [];
  for (let r = 0; r < n; r++) {
    const b = base.slice(r * D, (r + 1) * D), o = other ? other.slice(r * D, (r + 1) * D) : null;
    const ch = differs(b, o);
    if (cur.changedOnly && !ch) continue;
    rows.push({ r, b, o, ch });
  }
  const shown = cur.all ? rows : rows.slice(0, ROWS_SHOWN);
  const label = keyLabel(cur.against);
  const lines = shown.map(({ r, b, o, ch }) => {
    let bars;
    if (cdfLike) {
      const ns = symbolsOf(row, b, D);
      bars = barHtml(probsOf(row, b, ns), 'cd-base', `initial: ${ns} symbols`) + (o ? barHtml(probsOf(row, o, ns), 'cd-other', `${label}: ${ns} symbols`) : '');
    } else if (m.elem === 1) {
      bars = prob8Html(b, 'cd-base', 'initial') + (o ? prob8Html(o, 'cd-other', label) : '');
    } else bars = '';
    return `<div class="cd-row${ch ? ' changed' : ''}" data-row="${r}"><span class="cd-idx" title="${ch ? `${ch} of the ${D} values differ` : 'the same in both contexts'}">${rowIndex(m, r)}</span>`
      + `<span class="cd-bars">${bars}</span>`
      + `<span class="cd-vals"><span class="mono" data-ctx="${bk}" data-vals="${b.join(' ')}">${esc(b.join(' '))}</span>${o ? `<span class="mono${ch ? ' cd-diff' : ''}" data-ctx="${esc(cur.against)}" data-vals="${o.join(' ')}">${esc(o.join(' '))}</span>` : ''}</span></div>`;
  }).join('');
  const more = rows.length > shown.length ? `<div class="actions"><button class="btn small" type="button" data-act="cd-all" title="Draw every row of this member">Show all ${fmt(rows.length)} rows</button></div>` : '';
  const what = cdfLike ? `Each row: the initial context (upper bar) and the ${esc(label)} (lower bar), the symbols' probabilities side by side; the numbers are the stored values (${esc(row.note)}).`
    : m.elem === 1 ? `Each element is a column as high as the probability of a 0 bin: the initial context in the upper row, the ${esc(label)} in the lower one; the numbers are the stored values (in 1/256).` : 'The stored values, initial and compared.';
  return `<h3 class="gr-h">${esc(m.name)} <span class="gr-fact">${m.dims.join(' × ') || '1'}, ${m.elem} byte${m.elem === 1 ? '' : 's'} per element; ${m.changed === null ? '' : `${fmt(differs(base, other))} of ${fmt(base.length)} values differ from the ${esc(label)}`}</span></h3>`
    + `<p class="note">${what}${cur.changedOnly ? ' Only the rows that differ.' : ''}</p>`
    + `<div class="cd-rows" id="cdRows">${lines || '<p class="note">No row differs.</p>'}</div>` + more;
}

// ------------------------------------------------------------ wiring, probe
export function initCdfs() {
  const d = dlg();
  onKindChange((e) => { if (e.kind === 'cdf' && cur && e.f === cur.f) render(); });
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    if (t.closest('[data-act="ent-compute"]')) { computeKinds('cdf', cur.f); return; }
    if (t.closest('[data-act="cd-all"]')) { cur.all = true; render(); return; }
    const mb = t.closest('[data-member]');
    if (mb) { cur.member = mb.dataset.member; cur.all = false; render(); }
  });
  d.addEventListener('change', (ev) => {
    if (ev.target.id === 'cdAgainst') { cur.against = ev.target.value; render(); }
    else if (ev.target.id === 'cdChanged') { cur.changedOnly = ev.target.checked; cur.all = false; render(); }
  });
  d.addEventListener('input', (ev) => {
    if (ev.target.id !== 'cdFilter') return;
    cur.filter = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const n = $('#cdFilter');
    if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  });
  // the Frame tab's "Probabilities…" button (inspector.js)
  $('#tabBody').addEventListener('click', (ev) => { if (ev.target.closest('[data-act="cdfs"]')) openCdfs(); });
}

export function cdfsSnap() {
  const d = dlg(), open = !!(d && d.open);
  const e = cur ? entryOfKind('cdf', cur.f) : null;
  if (!open) return { open, status: e ? e.status : null };
  const vals = (s) => s.split(' ').filter((x) => x !== '').map(Number);
  return {
    open, f: cur ? cur.f : null, status: e ? e.status : null, against: cur ? cur.against : null,
    changedOnly: cur ? cur.changedOnly : null, filter: cur ? cur.filter : null,
    members: [...document.querySelectorAll('#cdTree [data-member]')].map((b) => b.dataset.member),
    member: cur ? cur.member : null,
    rows: [...document.querySelectorAll('#cdRows .cd-row')].map((r) => {
      const o = { r: +r.dataset.row, changed: r.classList.contains('changed') };
      for (const s of r.querySelectorAll('[data-ctx]')) o[s.dataset.ctx] = vals(s.dataset.vals);
      return o;
    }),
    bars: document.querySelectorAll('#cdRows .cd-bar, #cdRows .cd-p8').length,
    source: ($('#cdSource') || {}).textContent || '', sub: ($('#cdSub') || {}).textContent || '',
    canCompute: !!document.querySelector('#cdBody [data-act="ent-compute"]'),
    message: ($('#cdBody .cd-why') || {}).textContent || '',
  };
}
