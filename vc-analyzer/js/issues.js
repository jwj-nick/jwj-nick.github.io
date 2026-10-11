// The Issues dialog (F-f S2, FEATURES F39, SERVER_API.md section 19): what is wrong with the analysis on
// screen, each finding located (frame, temporal unit, unit; later also the bit range, the syntax element and
// the block) and graded, as `vca check --json` lists it.  The list is the bundle's issues.json (the server
// computes it on request), read when the dialog first opens, or at once when the manifest counts errors (for
// the red ticks on the timeline, braid.js).  A row goes to its place: the block (its frame, then the block),
// the bit range (the Bitstream dialog at the unit, the element or byte covering the first bit), the frame,
// else the unit.  manifest.issues decides whether the toolbar button shows: a bundle exported before the
// issue list has none, and Shift+E then only says so in the status line.
import { state } from './state.js?v=3e8d1a839f';
import { $, esc, fmt, setStatus } from './util.js?v=3e8d1a839f';
import { caps, getJSON } from './data.js?v=3e8d1a839f';
import { selectFrame } from './frames.js?v=3e8d1a839f';
import { pickBlock } from './controls.js?v=3e8d1a839f';
import { openBitstream } from './bitstream.js?v=3e8d1a839f';
import { renderBraid } from './braid.js?v=3e8d1a839f';

const dlg = () => $('#issuesDialog');
const SEVERITIES = ['error', 'warning', 'info'];
const SEV_WORD = { error: 'Error', warning: 'Warning', info: 'Info' };
const SEV_PLURAL = { error: 'errors', warning: 'warnings', info: 'info' };
const ROWS_MAX = 2000;
// The checks vca check runs (SERVER_API.md section 19 item 3, section 20 item 4); index.html has the same text.
const BUTTON_TITLE = 'What is wrong with this analysis, each finding at its frame and unit (Shift+E): decoder errors, references and the decoded picture buffer, picture hashes (HEVC, VVC, AV2), level limits (AV1, AV2, HEVC, VVC, AVC; rate limits are advisory), the HRD coded picture buffer (HEVC, AVC) and failing analyzer checks.';
// what checked / of count, per check (SERVER_API.md section 19 item 2 `checks[]`)
const OF_WHAT = { decode_error: 'temporal units', refs: 'frames', sei_hash: 'picture hashes', level: 'frames', hrd: 'access units' };

let man = null;                   // the manifest the state below belongs to
let list;                         // issues.json once read (undefined = not read)
let loadErr = '', loading = null; // the read in flight (a promise) and why the last one failed
const sevOff = new Set(), checkOff = new Set();
let frameOnly = false, selId = null;
let hintId = null;                // the row clicked that names no place: it says so (rowHtml)

const has = (v) => v !== null && v !== undefined;
const info = () => (state.manifest && state.manifest.issues) || null;
const LATER_MS = 1500;     // counts null: the list is read this long after the stream opens (see initIssues)
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
// A sentence of issues.json as HTML: command options (--refdec) in the mono font, where the text font draws "--"
// as one long dash.
const prose = (s) => esc(s).replace(/(^|[\s(])(--[A-Za-z][\w-]*)/g, '$1<span class="mono">$2</span>');

// A new manifest (another stream, a reload): the list, the filters and the selected row start again.
function bind() {
  if (man === state.manifest) return;
  man = state.manifest; list = undefined; loadErr = ''; loading = null;
  sevOff.clear(); checkOff.clear(); frameOnly = false; selId = null; hintId = null;
}

// ------------------------------------------------------------ the list
function reason(e) {
  const m = String((e && e.message) || e);
  if (/HTTP 404/.test(m) || /missing from the opened folder/.test(m)) return 'The issue list could not be read: this bundle has no issues.json. Export the analysis again to get it.';
  return `The issue list could not be read (${m}).`;
}
function load() {
  bind();
  const inf = info();
  if (!inf || list) return Promise.resolve();
  if (loading) return loading;
  const m = man;
  loadErr = '';
  loading = getJSON(inf.file || 'issues.json')
    .then((o) => {
      if (m !== man) return;
      if (!o || o.format !== 'vca-issues' || !Array.isArray(o.issues)) throw new Error('the file is not an issue list');
      list = o;
    })
    .catch((e) => { if (m === man) loadErr = reason(e); })
    .then(() => {
      if (m !== man) return;
      loading = null;
      syncIssuesButton();
      if (errorFrames().size) renderBraid();
      if (dlg().open) { render(); focusList(); }
    });
  return loading;
}
const countsNow = () => (list ? list.counts : (info() || {}).counts) || null;
const ranList = () => (list ? list.checks.filter((c) => c.status === 'ran') : []);
const ranChecks = () => ranList().length;
// checks that ran but not on everything (SERVER_API.md section 19 item 2: a reason with status ran)
const partList = () => ranList().filter((c) => c.reason);
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const byId = (id) => (list ? list.issues.find((x) => x.id === id) : null) || null;

// Frame -> number of error issues there (the timeline's red ticks); empty until the list is read.
function errorFrames() {
  const out = new Map();
  if (list && man === state.manifest) for (const x of list.issues) if (x.severity === 'error' && has(x.frame)) out.set(x.frame, (out.get(x.frame) || 0) + 1);
  return out;
}
export const issueTicks = () => errorFrames();

// ------------------------------------------------------------ toolbar button
// "Issues (n)", n = errors + warnings; "Issues" while the server has not counted them yet (counts null: the
// count comes with the list); hidden for a bundle without manifest.issues.
export function syncIssuesButton() {
  bind();
  const b = $('#issuesBtn'), inf = info();
  if (!b) return;
  b.hidden = !inf;
  if (!inf) return;
  const c = countsNow();
  const n = c ? (c.error || 0) + (c.warning || 0) : null;
  b.innerHTML = `Issues${n === null ? '' : ` <span class="is-n${c.error ? ' err' : ''}">(${fmt(n)})</span>`}`;
  b.title = `${BUTTON_TITLE} `
    + (c ? `${plural(c.error || 0, 'error', 'errors')}, ${plural(c.warning || 0, 'warning', 'warnings')}, ${fmt(c.info || 0)} info.` : 'Not counted yet: the list is being made.');
}

// ------------------------------------------------------------ open
export function openIssues() {
  if (!state.manifest) return;
  bind();
  if (!info()) { setStatus('This bundle has no issue list: it was exported before the Issues view. Export the analysis again to get it.'); return; }
  if (!dlg().open) dlg().showModal();
  render();
  load();
  focusList();
}
function focusList() {
  const l = $('#isList');
  if (dlg().open && !l.hidden && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#isFilters'))) l.focus({ preventScroll: true });
}

// ------------------------------------------------------------ rows
function shown() {
  if (!list) return [];
  return list.issues.filter((x) => !sevOff.has(x.severity) && !checkOff.has(x.check) && (!frameOnly || x.frame === state.f));
}
const blockXY = (x) => {
  const b = x.block;
  if (Array.isArray(b) && b.length >= 2 && isFinite(b[0]) && isFinite(b[1])) return [+b[0], +b[1]];
  if (b && typeof b === 'object' && isFinite(b.x) && isFinite(b.y)) return [+b.x, +b.y];
  return null;
};
const frameHeld = (f) => state.manifest.frames.some((fr) => fr.f === f);
const unitHeld = (u) => !!(state.manifest.units || [])[u];
const bitOf = (x) => (Array.isArray(x.bit) && x.bit.length === 2 && isFinite(x.bit[0]) ? x.bit : null);
// Where a click on the row goes: 'block', 'bit', 'frame', 'unit' or null (the issue names no place shown here).
function target(x) {
  if (has(x.frame) && frameHeld(x.frame) && blockXY(x)) return 'block';
  if (has(x.unit) && unitHeld(x.unit) && bitOf(x)) return 'bit';
  if (has(x.frame) && frameHeld(x.frame)) return 'frame';
  if (has(x.unit) && unitHeld(x.unit)) return 'unit';
  return null;
}
function goTitle(x) {
  const t = target(x), bit = bitOf(x), b = blockXY(x);
  if (t === 'block') return `Go to frame ${x.frame} and select the block at (${b[0]}, ${b[1]}) (click, or Enter)`;
  if (t === 'bit') return `${has(x.frame) && frameHeld(x.frame) ? `Go to frame ${x.frame} and open` : 'Open'} the Bitstream dialog at unit ${x.unit}, ${x.element ? `element ${x.element}` : `bit ${bit[0]}`} (click, or Enter)`;
  if (t === 'frame') return `Go to frame ${x.frame} (click, or Enter)`;
  if (t === 'unit') return `Open the Bitstream dialog at unit ${x.unit} (click, or Enter)`;
  return 'This issue names no frame or unit of this bundle';
}
const checkLabel = (x) => (x.kind && x.kind !== x.check && !String(x.check).endsWith('.' + x.kind) ? `${x.check} / ${x.kind}` : x.check);
function locHtml(x) {
  const out = [];
  if (has(x.tu)) out.push(`TU ${fmt(x.tu)}`);
  if (has(x.unit)) {
    out.push(unitHeld(x.unit)
      ? `<button class="rf-link" type="button" data-act="unit" data-unit="${x.unit}" title="Open the Bitstream dialog at unit ${x.unit}${bitOf(x) ? `, bit ${bitOf(x)[0]}` : ''} (u)">unit ${fmt(x.unit)}</button>`
      : `unit ${fmt(x.unit)}`);
  }
  const bit = bitOf(x);
  if (bit) out.push(`bits ${fmt(bit[0])}–${fmt(bit[1])}`);
  if (x.element) out.push(`<span class="mono">${esc(x.element)}</span>`);
  const b = blockXY(x);
  if (b) out.push(`block (${b[0]}, ${b[1]})`);
  return out.join(', ');
}
// The rule the issue is judged by, as the spec names it (doc and clause), under the check name; none without a clause.
function specHtml(x) {
  const sp = x.spec;
  if (!sp || !sp.doc || !sp.clause) return '';
  return `<span class="is-spec" title="${esc(`Spec basis: ${sp.doc} ${sp.clause}${sp.basis ? `. ${sp.basis}` : ''}`)}">${esc(`${sp.doc} ${sp.clause}`)}</span>`;
}
// What a click on a row without a place says (in the row, under its sentence).
const nowhere = (x) => (has(x.frame) || has(x.unit)
  ? `This issue is at ${has(x.frame) ? `frame ${x.frame}` : `unit ${x.unit}`}, which this bundle does not hold (it was exported with fewer frames).`
  : 'This issue names no frame or unit: it is about the whole analysis.');
function rowHtml(x) {
  const loc = locHtml(x);
  return `<div class="is-row${x.id === selId ? ' cur' : ''}" role="option" aria-selected="${x.id === selId}" data-id="${esc(x.id)}" title="${esc(goTitle(x))}">`
    + `<span class="is-sev is-${esc(x.severity)}"><i aria-hidden="true"></i>${esc(SEV_WORD[x.severity] || x.severity)}</span>`
    + `<span class="is-check">${esc(checkLabel(x))}${specHtml(x)}</span>`
    + `<span class="is-frame num">${has(x.frame) ? `<span class="is-fw">frame </span>${fmt(x.frame)}` : '–'}</span>`
    // no place: a dash in the Where column (hidden on a phone, where the frame cell already shows one)
    + `<span class="is-loc${loc ? '' : ' none'}">${loc || '–'}</span>`
    + `<span class="is-text">${prose(x.sentence)}</span>`
    + (x.id === hintId ? `<span class="is-hint" role="status">${esc(nowhere(x))}</span>` : '') + '</div>';
}

// ------------------------------------------------------------ render
function render() {
  if (!state.manifest) return;
  const s = state.manifest.stream || {};
  const st = $('#isState'), filt = $('#isFilters'), box = $('#isList'), more = $('#isMore'), nr = $('#isNotRun');
  const say = (msg) => { st.textContent = msg; st.hidden = !msg; };
  const pt = $('#isPart'), sub = $('#isSub');
  if (!list) {
    sub.textContent = `Issues of ${s.name || 'this stream'}.`; sub.hidden = false;
    say(loadErr || (caps.server ? 'Reading the issue list. The first time, the local app checks the whole analysis, which takes a few seconds on a long stream.' : 'Reading the issue list.'));
    st.classList.toggle('problem', !!loadErr);
    filt.hidden = true; box.hidden = true; more.hidden = true; nr.hidden = true; pt.hidden = true;
    return;
  }
  st.classList.remove('problem');
  const c = list.counts || {}, total = list.issues.length, rows = shown(), part = partList();
  // the empty state's sentence names the stream itself: no line under the heading that repeats it
  sub.textContent = total
    ? `${plural(total, 'issue', 'issues')} in ${s.name || 'this stream'}: ${plural(c.error || 0, 'error', 'errors')}, ${plural(c.warning || 0, 'warning', 'warnings')}, ${fmt(c.info || 0)} info, from ${plural(ranChecks(), 'check', 'checks')} that ran${part.length ? ` (${fmt(part.length)} in part, listed below)` : ''}.${rows.length < total ? ` Showing ${fmt(rows.length)}.` : ''}`
    : '';
  sub.hidden = !total;
  // filters
  filt.hidden = !total;
  if (total) {
    const nSev = (k) => list.issues.filter((x) => x.severity === k).length;
    const checks = [];
    for (const x of list.issues) if (!checks.includes(x.check)) checks.push(x.check);
    const nCheck = (k) => list.issues.filter((x) => x.check === k).length;
    filt.innerHTML = `<div class="gr-seg" role="group" aria-label="Severity">${SEVERITIES.map((k) => `<button class="chip" type="button" data-sev="${k}" aria-pressed="${!sevOff.has(k)}" title="${sevOff.has(k) ? 'Show' : 'Hide'} the ${SEV_PLURAL[k]} (${fmt(nSev(k))})"><i class="is-dot is-${k}" aria-hidden="true"></i>${SEV_WORD[k]} ${fmt(nSev(k))}</button>`).join('')}</div>`
      + `<div class="gr-seg is-checks" role="group" aria-label="Check">${checks.map((k) => `<button class="chip" type="button" data-check="${esc(k)}" aria-pressed="${!checkOff.has(k)}" title="${checkOff.has(k) ? 'Show' : 'Hide'} the issues of the check ${esc(k)} (${fmt(nCheck(k))})">${esc(k)} ${fmt(nCheck(k))}</button>`).join('')}</div>`
      + `<button class="chip" type="button" data-act="frame-only" aria-pressed="${frameOnly}" title="Show only the issues of the frame on screen (frame ${state.f})">Frame ${state.f} only</button>`;
  }
  // rows, or why there are none
  if (!total) say(emptyText(s.name, part));
  else if (!rows.length) say('No issue matches these filters.');
  else say('');
  box.hidden = !rows.length;
  if (rows.length) {
    box.innerHTML = '<div class="is-row is-head" aria-hidden="true"><span>Severity</span><span>Check</span><span class="num">Frame</span><span>Where</span><span>What</span></div>'
      + rows.slice(0, ROWS_MAX).map(rowHtml).join('');
    revealSel();
  } else box.innerHTML = '';
  more.hidden = rows.length <= ROWS_MAX;
  more.textContent = rows.length > ROWS_MAX ? `Showing the first ${fmt(ROWS_MAX)} of ${fmt(rows.length)}; narrow the list with the filters above (vca check prints them all).` : '';
  // checks that ran in part (what they did not evaluate), then the checks that did not run
  pt.hidden = !part.length;
  pt.innerHTML = part.length ? `<h3>Checks that ran in part</h3><ul class="is-notrun is-part">${part.map((k) => `<li data-check-id="${esc(k.id)}"><span class="is-cid">${esc(k.id)}</span>${ofText(k)}: <span class="is-why">${prose(k.reason)}</span></li>`).join('')}</ul>` : '';
  const skipped = list.checks.filter((k) => k.status !== 'ran');
  nr.hidden = !skipped.length;
  nr.innerHTML = skipped.length ? `<h3>Checks that did not run</h3><ul class="is-notrun">${skipped.map((k) => `<li data-check-id="${esc(k.id)}"><span class="is-cid">${esc(k.id)}</span>${k.status === 'not_applicable' ? ' (not applicable)' : ''}: <span class="is-why">${prose(k.reason || 'no reason given.')}</span></li>`).join('')}</ul>` : '';
}
// " (31 of 31 frames)" after a check id, when the check counts what it checked
function ofText(k) {
  if (!has(k.checked) || !has(k.of)) return '';
  return ` (${fmt(k.checked)} of ${fmt(k.of)}${OF_WHAT[k.id] ? ` ${OF_WHAT[k.id]}` : ''})`;
}
// The empty state: the stream, the checks that ran by id, and which of them ran only in part.
function emptyText(name, part) {
  const ids = ranList().map((k) => k.id);
  return `No issues found in ${name || 'this stream'} by ${plural(ids.length, 'check', 'checks')}${ids.length ? `: ${ids.join(', ')}` : ''}.`
    + (part.length ? ` Of these, ${andList(part.map((k) => k.id))} ran in part: see below for what ${part.length === 1 ? 'it leaves' : 'they leave'} out.` : '');
}
function markSel() {
  $('#isList').querySelectorAll('.is-row[data-id]').forEach((r) => { const on = r.dataset.id === selId; r.classList.toggle('cur', on); r.setAttribute('aria-selected', String(on)); });
  revealSel();
}
function revealSel() {
  const box = $('#isList'), r = selId ? box.querySelector(`.is-row[data-id="${CSS.escape(selId)}"]`) : null;
  if (!r) return;
  const head = box.querySelector('.is-head'), hh = head && head.offsetParent ? head.offsetHeight : 0;
  const top = r.offsetTop, bottom = top + r.offsetHeight;   // the list is the rows' offset parent (app.css)
  if (top - hh < box.scrollTop) box.scrollTop = Math.max(0, top - hh);
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

// ------------------------------------------------------------ go
// Closes the dialog and goes to the issue's place (target()); the row stays selected for the next opening.
function go(x) {
  if (!x) return;
  selId = x.id;
  const t = target(x);
  // no place to go: the row says why, under its sentence, and the dialog stays
  if (!t) { hintId = x.id; render(); return; }
  hintId = null;
  dlg().close();
  if (t === 'block') { const [bx, by] = blockXY(x); pickBlock(x.frame, bx, by); }
  else if (t === 'bit') {
    // a bit range of a frame (a picture hash): that frame on screen, its bits in the Bitstream dialog
    if (has(x.frame) && frameHeld(x.frame) && x.frame !== state.f) selectFrame(x.frame);
    openBitstream(x.unit, undefined, bitOf(x)[0]);
  }
  else if (t === 'frame') selectFrame(x.frame);
  else openBitstream(x.unit);
}
function step(d) {
  const rows = shown().slice(0, ROWS_MAX);
  if (!rows.length) return;
  let k = rows.findIndex((x) => x.id === selId);
  k = k < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, k + d));
  selId = rows[k].id;
  if (hintId) { hintId = null; render(); } else markSel();
  $('#isList').focus({ preventScroll: true });
}

// ------------------------------------------------------------ probe (tests)
// Read-only view for window.__vca.snap() (tests).
export function issuesSnap() {
  const d = dlg(), b = $('#issuesBtn');
  const out = {
    button: b && !b.hidden ? b.textContent.replace(/\s+/g, ' ').trim() : null, loaded: !!(list && man === state.manifest),
    ticks: [...document.querySelectorAll('#braid .istick')].map((t) => +t.dataset.f),
  };
  if (!d || !d.open) return { open: false, ...out };
  const st = $('#isState');
  return {
    open: true, ...out, loading: !!loading, error: loadErr || null,
    message: st.hidden ? '' : st.textContent, sub: $('#isSub').hidden ? '' : $('#isSub').textContent,
    hint: [...d.querySelectorAll('#isList .is-hint')].map((h) => [h.closest('[data-id]').dataset.id, h.textContent]),
    part: [...d.querySelectorAll('#isPart li[data-check-id]')].map((li) => [li.dataset.checkId, li.querySelector('.is-why').textContent]),
    rows: [...d.querySelectorAll('#isList .is-row[data-id]')].map((r) => r.dataset.id), sel: selId,
    sevOff: [...sevOff], checkOff: [...checkOff], frameOnly,
    notRun: [...d.querySelectorAll('#isNotRun li[data-check-id]')].map((li) => [li.dataset.checkId, li.querySelector('.is-why').textContent]),
  };
}

// ------------------------------------------------------------ wiring
export function initIssues() {
  const d = dlg();
  d.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-act="close"]')) { d.close(); return; }
    // a chip: the filter changes, the chips are drawn again, the focus stays on the same chip (Tab and Enter)
    const again = (sel) => { render(); const c = $(sel); if (c) c.focus({ preventScroll: true }); };
    const sv = t.closest('#isFilters [data-sev]');
    if (sv) { const k = sv.dataset.sev; sevOff.has(k) ? sevOff.delete(k) : sevOff.add(k); again(`#isFilters [data-sev="${k}"]`); return; }
    const ck = t.closest('#isFilters [data-check]');
    if (ck) { const k = ck.dataset.check; checkOff.has(k) ? checkOff.delete(k) : checkOff.add(k); again(`#isFilters [data-check="${CSS.escape(k)}"]`); return; }
    if (t.closest('#isFilters [data-act="frame-only"]')) { frameOnly = !frameOnly; again('#isFilters [data-act="frame-only"]'); return; }
    const un = t.closest('#isList [data-act="unit"]');
    if (un) {
      const x = byId(un.closest('[data-id]').dataset.id);
      if (x) selId = x.id;
      d.close();
      const bit = x && bitOf(x);
      openBitstream(+un.dataset.unit, undefined, bit ? bit[0] : undefined);
      return;
    }
    const row = t.closest('#isList .is-row[data-id]');
    if (row) go(byId(row.dataset.id));
  });
  // Up / Down move the selected row, Enter on the list goes there (a chip or a unit link keeps its own Enter)
  document.addEventListener('keydown', (e) => {
    if (!d.open || e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' && e.target.closest && e.target.closest('#isList') && !e.target.closest('button')) { e.preventDefault(); go(byId(selId)); }
  });
  $('#issuesBtn').addEventListener('click', openIssues);
  // another stream (or none): the button follows manifest.issues; with errors counted, the list is read at once
  // so the timeline can mark their frames (source.js writes the facts once per manifest, closeStream clears them)
  // Counts null (vca serve has not computed the list yet; its manifest is cached for the server's life): read the
  // list a little later, after the first frame, so the button gets its count and the timeline its ticks without
  // the server's computation (about 2 s on a 4K analysis) waiting in front of the first picture.
  let later = null;
  new MutationObserver(() => {
    syncIssuesButton();
    clearTimeout(later);
    const inf = info(), c = inf && inf.counts;
    if (c && c.error) load();
    else if (inf && !c) { const m = state.manifest; later = setTimeout(() => { if (m === state.manifest) load(); }, LATER_MS); }
  }).observe($('#facts'), { childList: true });
}
