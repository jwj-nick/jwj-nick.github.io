// Analysis jobs on the server (SERVER_API.md §7, §8): the job tray, polling,
// cancel, the log, and opening a job's analysis when it becomes ready.
// Jobs live on the server, so the tray comes back after a reload: it shows
// the jobs that are queued or running, the ones this page saw running, and
// the ones that ended in the minute before the page loaded.
import { state } from './state.js?v=bd3828335b';
import { $, esc } from './util.js?v=bd3828335b';
import { caps } from './data.js?v=bd3828335b';
import { api, apiText, fmtSeconds, parseTime, problemHTML, server, toast } from './api.js?v=bd3828335b';
import { openStreamAt, refreshStreams } from './source.js?v=bd3828335b';

const rows = new Map();   // job id -> row record (see record())
const LOADED = Date.now();
const RECENT_MS = 60000;
const LOG_TAIL = 16384;   // bytes of log shown when it is opened
const ACTIVE = new Set(['queued', 'running']);
const isActive = (j) => ACTIVE.has(j.state);
const COLLAPSE_MS = 6000;   // the tray folds to its header this long after the last active job ends
const LONG_LINE = 140;      // outcome lines longer than this are clamped, the full text in the tooltip
let timer = 0, busy = false, again = false, offline = null, expanded = true, firstList = true;
let collapseTimer = 0, collapseWaiting = false, wasActive = false;
let dismissed = new Set();
try { dismissed = new Set(JSON.parse(sessionStorage.getItem('vca.dismissed') || '[]')); } catch (e) { /* storage blocked */ }

const record = (job) => ({ job, at: performance.now(), seen: isActive(job), fromPage: false, startSeq: 0, codec: null,
  el: null, log: '', logNext: 0, logOpen: false, logBusy: false, actErr: null, opened: false });

// Read-only view for window.__vca.snap() (tests).
export function jobsSnap() {
  return {
    tray: { shown: !$('#jobTray').hidden, expanded },
    list: [...rows.values()].map((r) => ({ id: r.job.id, state: r.job.state, phase: r.job.phase, fraction: r.job.fraction,
      ready: !!r.job.ready, analysis: r.job.analysis || null, shown: shown(r), fromPage: r.fromPage,
      error: r.job.error ? r.job.error.code : null })),
  };
}

// How the newest job known for a source (a path or an uploaded file) ended,
// when it ended without an analysis: 'failed' or 'cancelled', else null.
export function lastOutcome({ path = null, file_id = null } = {}) {
  let best = null;
  for (const r of rows.values()) {
    const s = r.job.source || {};
    if (!((path && s.path === path) || (file_id && s.file_id === file_id))) continue;
    if (!best || String(r.job.created) > String(best.created)) best = r.job;
  }
  if (!best || best.ready) return null;
  return best.state === 'failed' || best.state === 'cancelled' ? best.state : null;
}

// A job this page just started (open.js): shown at once, opened when ready.
export function trackJob(job, { fromPage = true, codec = null } = {}) {
  const r = rows.get(job.id) || record(job);
  r.job = job; r.at = performance.now(); r.seen = true; r.fromPage = fromPage; r.startSeq = state.openSeq; r.codec = codec;
  rows.set(job.id, r);
  firstList = false;
  setExpanded(true);
  render();
  pollJobs(300);
}

export function initJobs() {
  $('#trayToggle').addEventListener('click', () => { cancelCollapse(); setExpanded(!expanded); });
  $('#trayClear').addEventListener('click', clearFinished);
  // a collapse that came due while the pointer or the focus was in the tray waits until they leave
  const tray = $('#jobTray');
  const resume = () => { if (collapseWaiting) scheduleCollapse(1500); };
  tray.addEventListener('mouseleave', resume);
  tray.addEventListener('focusout', (e) => { if (!tray.contains(e.relatedTarget)) resume(); });
  $('#trayList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const li = e.target.closest('[data-job]');
    if (!b || !li || b.disabled) return;
    const r = rows.get(li.dataset.job);
    if (!r) return;
    const act = b.dataset.act;
    if (act === 'cancel') cancel(r, b);
    else if (act === 'open') openJob(r);
    else if (act === 'log') toggleLog(r);
    else if (act === 'dismiss') dismiss(r);
  });
  if (caps.jobs) pollJobs(0);
}

// ---------------------------------------------------------------- polling
// Every 0.5 s while a job is queued or running, otherwise every 5 s (SERVER_API.md §8).
export function pollJobs(delay = 0) {
  if (!caps.jobs) return;
  clearTimeout(timer);
  timer = setTimeout(poll, delay);
}
async function poll() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    let list = null;
    try { list = await api('api/jobs'); offline = null; } catch (e) { offline = e; }
    if (list) await merge(list);
    render();
    for (const r of rows.values()) if (r.logOpen && (isActive(r.job) || r.logNext < (r.job.log_bytes || 0))) loadLog(r);
  } finally {
    busy = false;
  }
  const active = [...rows.values()].some((r) => isActive(r.job));
  pollJobs(again ? 0 : (active ? 500 : 5000));
  again = false;
}

async function merge(list) {
  const ready = [], ended = [];
  for (const j of list) {
    let r = rows.get(j.id);
    const prev = r ? r.job : null;
    if (!r) { r = record(j); rows.set(j.id, r); }
    r.job = j; r.at = performance.now();
    if (isActive(j)) r.seen = true;
    if (j.ready && j.analysis && !(prev && prev.ready) && r.seen) ready.push(r);
    if (!isActive(j) && prev && isActive(prev)) ended.push(r);
  }
  if (ready.length || ended.length) { try { await refreshStreams(); } catch (e) { /* the list comes back next time */ } }
  for (const r of ready) await whenReady(r);
  // a job of this page that failed: its row says why (no toast on top of it)
  const failed = ended.filter((r) => r.job.state === 'failed' && r.fromPage);
  if (failed.length) {
    setExpanded(true);
    render();
    const el = failed[0].el;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
}

// Opens the analysis of a job started here, unless another stream was opened
// since; a page with nothing open takes the first analysis that becomes ready.
async function whenReady(r) {
  const i = state.streams.findIndex((s) => s.id === r.job.analysis);
  if (i < 0 || r.opened) return;
  const mine = r.fromPage && state.openSeq === r.startSeq;
  const idle = !state.manifest;
  if (!mine && !idle) return;
  r.opened = true;
  await openStreamAt(i);
  const checking = isActive(r.job) && phaseOf(r.job, 'verify') !== 'skipped';
  toast(`Opened ${r.job.source.name}.${checking ? ' The reference decoder check runs in the background.' : ''}`);
}

// ----------------------------------------------------------------- actions
async function cancel(r, b) {
  b.disabled = true;
  r.actErr = null;
  try {
    const j = await api(`api/jobs/${encodeURIComponent(r.job.id)}/cancel`, { method: 'POST' });
    if (j && j.id) { r.job = j; r.at = performance.now(); }
  } catch (e) { r.actErr = e; }
  b.disabled = false;
  render();
  pollJobs(0);
}
async function openJob(r) {
  let i = state.streams.findIndex((s) => s.id === r.job.analysis);
  if (i < 0) { try { await refreshStreams(); } catch (e) { /* offline */ } i = state.streams.findIndex((s) => s.id === r.job.analysis); }
  if (i < 0) { r.actErr = { message: 'This analysis is no longer in the library.', hint: 'It may have been deleted.' }; render(); return; }
  r.opened = true;
  await openStreamAt(i);
}
function dismiss(r) {
  dismissed.add(r.job.id);
  saveDismissed();
  render();
}
function saveDismissed() {
  try { sessionStorage.setItem('vca.dismissed', JSON.stringify([...dismissed].slice(-200))); } catch (e) { /* storage blocked */ }
}
// "Clear finished": every shown job that has ended leaves the list (its analysis stays in the Library).
function clearFinished() {
  for (const r of rows.values()) if (shown(r) && !isActive(r.job)) dismissed.add(r.job.id);
  saveDismissed();
  render();
}
function toggleLog(r) {
  r.logOpen = !r.logOpen;
  if (r.logOpen) loadLog(r);
  render();
}
async function loadLog(r) {
  if (r.logBusy) return;
  r.logBusy = true;
  const from = r.logNext || Math.max(0, (r.job.log_bytes || 0) - LOG_TAIL);
  try {
    const { text, header } = await apiText(`api/jobs/${encodeURIComponent(r.job.id)}/log?from=${from}`, 'X-VCA-Log-Next');
    if (!r.logNext && from > 0) r.log = '… (earlier lines left out)\n';
    r.log += text;
    r.logNext = header !== null && header !== '' ? +header : from + new TextEncoder().encode(text).length;
    if (r.log.length > 65536) r.log = '… (earlier lines left out)\n' + r.log.slice(-60000);
  } catch (e) {
    r.log += `\n(could not read the log: ${e.message})\n`;
  }
  r.logBusy = false;
  renderLog(r);
}

function setExpanded(v) {
  expanded = v;
  const t = $('#trayToggle');
  t.setAttribute('aria-expanded', String(v));
  $('#trayList').hidden = !v;
  $('#jobTray').classList.toggle('collapsed', !v);
}

// Folding by itself: a few seconds after the last active job ends, so the tray
// does not keep covering the inspector; never under the pointer or the focus.
function scheduleCollapse(ms) {
  clearTimeout(collapseTimer);
  collapseWaiting = false;
  collapseTimer = setTimeout(() => {
    collapseTimer = 0;
    if ([...rows.values()].some((r) => isActive(r.job)) || !expanded) return;
    const tray = $('#jobTray');
    if (tray.matches(':hover') || tray.contains(document.activeElement)) { collapseWaiting = true; return; }
    setExpanded(false);
  }, ms);
}
function cancelCollapse() {
  clearTimeout(collapseTimer);
  collapseTimer = 0;
  collapseWaiting = false;
}

// "(42%) <title>" while a job runs (no middle dots: design rule).
const TITLE_PREFIX = /^\((\d+%|running|queued)\) /;
function renderTitle(list) {
  const base = document.title.replace(TITLE_PREFIX, '');
  const run = list.find((r) => r.job.state === 'running');
  let p = '';
  if (run) p = run.job.fraction === null || run.job.fraction === undefined ? '(running) ' : `(${Math.round(run.job.fraction * 100)}%) `;
  else if (list.some((r) => r.job.state === 'queued')) p = '(queued) ';
  if (document.title !== p + base) document.title = p + base;
}

// ------------------------------------------------------------------ render
function shown(r) {
  const j = r.job;
  if (isActive(j) || r.seen) return !dismissed.has(j.id) || isActive(j);
  const end = parseTime(j.finished);
  return !!end && LOADED - end.getTime() < RECENT_MS && !dismissed.has(j.id);
}
const phaseOf = (j, name) => ((j.phases || []).find((p) => p.name === name) || {}).state;

const PHASE_WORDS = { probe: 'reading the file', extract: 'extracting the video track', decode: 'decoding', ingest: 'building the store', hw: 'running the HW model', verify: 'checking against the reference decoder' };
function phaseText(j) {
  const pct = j.fraction === null || j.fraction === undefined ? '' : ` ${Math.round(j.fraction * 100)} %`;
  if (j.state === 'queued') { const n = aheadOf(j); return n ? `Queued, ${n} ahead` : 'Starting…'; }
  if (j.state === 'failed') {
    const p = (j.phases || []).find((x) => x.state === 'failed');
    return `Failed${p && PHASE_WORDS[p.name] ? ' while ' + PHASE_WORDS[p.name] : ''}`;
  }
  if (j.state === 'cancelled') return 'Cancelled';
  if (j.state === 'succeeded') return 'Done';
  switch (j.phase) {
    case 'probe': return 'Reading the file';
    case 'extract': return 'Extracting the video track with FFmpeg';
    case 'decode': return 'Decoding' + pct;
    case 'ingest': return 'Building the store' + pct;
    case 'hw': return 'HW model';
    case 'verify': return j.options && j.options.crossdec ? 'Checking against the reference and second decoders' : 'Checking against the reference decoder';
    default: return 'Starting…';
  }
}
// Jobs that start before this queued one: the earlier queued ones, and the running
// ones when they hold every slot (session.max_jobs, default 1).
function aheadOf(j) {
  const all = [...rows.values()].map((r) => r.job).filter((x) => x.id !== j.id);
  const running = all.filter((x) => x.state === 'running').length;
  const earlier = all.filter((x) => x.state === 'queued' && String(x.created) < String(j.created)).length;
  const slots = (server.session && server.session.max_jobs) || 1;
  return earlier + (running >= slots ? running : 0);
}

function entryOf(j) { const s = state.streams.find((x) => x.id === j.analysis); return s ? s.entry : null; }

// A line of plain text: wraps inside the tray; a long one is clamped to a few lines with the whole text as its tooltip.
const textLine = (t, cls = '') => {
  const s = String(t);
  const long = s.length > LONG_LINE;
  return `<span class="line${cls ? ' ' + cls : ''}${long ? ' long' : ''}"${long ? ` title="${esc(s)}"` : ''}>${esc(s)}</span>`;
};

// The outcome lines under a finished (or verifying) job.  Server sentences
// (error.message, warnings[], verify.detail: SERVER_API.md §10) are shown as given.
function outcomeHTML(r) {
  const j = r.job;
  const out = [];
  if (r.actErr) out.push(`<span class="line problem">${problemHTML(r.actErr)}</span>`);
  if (j.state === 'failed' && j.error) out.push(`<span class="line problem">${problemHTML(j.error)}</span>`);
  for (const w of j.warnings || []) out.push(textLine(w, 'warn'));
  if (j.state === 'cancelled') out.push(textLine(j.ready ? 'Cancelled during the check. The analysis is kept.' : 'Cancelled. Nothing was kept.'));
  if (j.ready && j.analysis && !entryOf(j) && !isActive(j)) {   // state.streams is the server's list (read before initJobs)
    out.push(textLine('The analysis was deleted from the Library.'));
  } else if (j.ready && !isActive(j)) {
    // the result appears when the job has ended (a line saying "match" under "Checking…" contradicts itself)
    const e = entryOf(j);
    const v = (e && e.verify) || {};
    const vs = phaseOf(j, 'verify');
    const detail = v.detail ? textLine(v.detail, 'hint') : '';
    if (v.status === 'ok') out.push('<span class="line good">Reference decoder: match</span>');
    else if (v.status === 'fail') out.push('<span class="line bad">Reference decoder: mismatch</span>' + detail);
    else if (v.status === 'skipped' || (vs === 'skipped' && !v.status)) out.push('<span class="line">Reference decoder: not checked</span>' + detail);
    else if (j.state === 'succeeded' && vs === 'done') out.push('<span class="line">Reference decoder: checked</span>');
    // the second decoder is reported on its own (SERVER_API.md section 10.4): its known defects, such as
    // FFmpeg 6.1.1 on lossless CUs with SAO, must not read as a wrong analysis
    const s2 = v.second;
    if (s2 && s2.status === 'ok') out.push('<span class="line good">Second decoder: match</span>');
    else if (s2 && s2.status === 'fail') out.push('<span class="line warn">Second decoder: differs</span>' + textLine(s2.detail, 'hint'));
    else if (s2) out.push('<span class="line">Second decoder: not checked</span>' + (s2.detail ? textLine(s2.detail, 'hint') : ''));
  }
  return out.join('');
}

const ROW_HTML = `
  <div class="job-top"><span class="job-name"></span><span class="job-codec"></span>
    <button class="icon-btn job-x" type="button" data-act="dismiss" title="Remove this finished job from the list" aria-label="Remove from the list"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="job-line"><span class="job-phase"></span><span class="job-time"></span></div>
  <div class="meter job-meter"><i></i></div>
  <p class="job-msg"></p>
  <div class="job-actions">
    <button class="btn small" type="button" data-act="cancel" title="Stop this job. Before the analysis opens, everything it wrote is removed.">Cancel</button>
    <button class="btn small" type="button" data-act="open" title="Show this analysis in the viewer">Open</button>
    <button class="btn small" type="button" data-act="log" aria-expanded="false" title="Show the last lines the job wrote">Show log</button>
  </div>
  <pre class="job-log mono" hidden></pre>`;

// Also called when the picker changes (source.js): the Open / Shown buttons follow the stream on screen.
export function renderJobs() { render(); }
// Running jobs first, then the queue in its order, then the finished ones, newest first.
const RANK = { running: 0, queued: 1 };
function byOrder(a, b) {
  const ra = a.job.state in RANK ? RANK[a.job.state] : 2, rb = b.job.state in RANK ? RANK[b.job.state] : 2;
  if (ra !== rb) return ra - rb;
  if (ra < 2) return String(a.job.created).localeCompare(String(b.job.created));
  return String(b.job.finished || b.job.created).localeCompare(String(a.job.finished || a.job.created));
}

function render() {
  if (!caps.jobs) return;
  const list = [...rows.values()].filter(shown).sort(byOrder);
  const tray = $('#jobTray');
  tray.hidden = !list.length;
  document.documentElement.classList.toggle('tray-on', !tray.hidden);
  const anyActive = list.some((r) => isActive(r.job));
  if (anyActive) cancelCollapse();
  else if (wasActive && expanded) scheduleCollapse(COLLAPSE_MS);
  wasActive = anyActive;
  renderTitle(list);
  // after a reload with nothing running, the finished jobs wait in a collapsed tray
  if (firstList && list.length) { firstList = false; if (!list.some((r) => isActive(r.job))) setExpanded(false); }
  const ul = $('#trayList');
  // keyed update: a row element lives as long as its job is shown (no re-creation under the mouse)
  const keep = new Set(list.map((r) => r.job.id));
  [...ul.children].forEach((li) => { if (!keep.has(li.dataset.job)) li.remove(); });
  list.forEach((r, i) => {
    if (!r.el) { r.el = document.createElement('li'); r.el.className = 'job'; r.el.dataset.job = r.job.id; r.el.innerHTML = ROW_HTML; }
    if (ul.children[i] !== r.el) ul.insertBefore(r.el, ul.children[i] || null);
    updateRow(r);
  });
  const n = (s) => list.filter((r) => r.job.state === s).length;
  const parts = [];
  if (n('running')) parts.push(`${n('running')} running`);
  if (n('queued')) parts.push(`${n('queued')} waiting`);
  if (n('failed')) parts.push(`<span class="bad">${n('failed')} failed</span>`);
  const done = list.length - n('running') - n('queued') - n('failed');
  if (done) parts.push(`${done} done`);
  const sum = $('#traySum');
  sum.innerHTML = parts.join(', ') + (offline ? '. The server does not answer.' : '');
  sum.title = sum.textContent;   // the whole line when it is cut short
  $('#trayClear').hidden = !list.some((r) => !isActive(r.job));
}

function updateRow(r) {
  const j = r.job, el = r.el;
  el.dataset.state = j.state;
  const name = el.querySelector('.job-name');
  name.textContent = (j.source && j.source.name) || j.id;
  name.title = (j.source && (j.source.path || j.source.name)) || '';
  const e = entryOf(j);
  const codec = (e && e.codec) || r.codec;
  el.querySelector('.job-codec').textContent = codec && codec !== 'auto' ? codec.toUpperCase() : '';
  el.querySelector('.job-phase').textContent = phaseText(j);
  const secs = (j.elapsed || 0) + (isActive(j) ? (performance.now() - r.at) / 1000 : 0);
  el.querySelector('.job-time').textContent = fmtSeconds(secs);
  const meter = el.querySelector('.job-meter');
  meter.hidden = !isActive(j);
  const known = j.state === 'running' && j.fraction !== null && j.fraction !== undefined;
  meter.classList.toggle('indeterminate', !known);
  meter.querySelector('i').style.width = known ? `${Math.max(2, Math.round(j.fraction * 100))}%` : '';
  meter.setAttribute('role', 'progressbar');
  meter.setAttribute('aria-label', phaseText(j));
  if (known) meter.setAttribute('aria-valuenow', String(Math.round(j.fraction * 100))); else meter.removeAttribute('aria-valuenow');
  const msg = el.querySelector('.job-msg');
  const html = outcomeHTML(r);
  if (msg.innerHTML !== html) msg.innerHTML = html;
  msg.hidden = !html;
  const canOpen = !!(j.ready && j.analysis && state.streams.some((s) => s.id === j.analysis));
  const isOpen = canOpen && state.streams[state.streamIdx] && state.streams[state.streamIdx].id === j.analysis;
  el.querySelector('[data-act="cancel"]').hidden = !isActive(j);
  const open = el.querySelector('[data-act="open"]');
  open.hidden = !canOpen;
  open.textContent = isOpen ? 'Shown' : 'Open';
  open.disabled = !!isOpen;
  open.title = isOpen ? 'This analysis is the one in the viewer' : 'Show this analysis in the viewer';
  el.querySelector('[data-act="dismiss"]').hidden = isActive(j);
  const lb = el.querySelector('[data-act="log"]');
  lb.textContent = r.logOpen ? 'Hide log' : 'Show log';
  lb.setAttribute('aria-expanded', String(r.logOpen));
  el.querySelector('.job-log').hidden = !r.logOpen;
}

function renderLog(r) {
  if (!r.el) return;
  const pre = r.el.querySelector('.job-log');
  const atEnd = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 4;
  pre.textContent = r.log || 'The job has not written anything yet.';
  if (atEnd) pre.scrollTop = pre.scrollHeight;
}
