// The Library dialog (SERVER_API.md §5): every analysis the server lists, a
// filter, Open, and Delete with an inline confirmation for workspace entries.
import { state } from './state.js?v=d11a44027e';
import { $, esc, fmt } from './util.js?v=d11a44027e';
import { caps } from './data.js?v=d11a44027e';
import { api, fmtBytes, fmtDate, problemHTML, server, toast } from './api.js?v=d11a44027e';
import { closeStream, openStreamAt, refreshStreams } from './source.js?v=d11a44027e';
import { openStreamDialog, showServerEmpty } from './open.js?v=d11a44027e';
import { openCompare } from './compare.js?v=d11a44027e';

let confirmId = null, loadErr = null;
const rowErr = new Map();
const dlg = () => $('#libraryDialog');

const isCompare = (e) => e.kind === 'diff' && caps.jobs;   // a comparison of this workspace (SERVER_API.md §13.1)

// Read-only view for window.__vca.snap() (tests).
export function librarySnap() {
  return { open: dlg().open, rows: [...document.querySelectorAll('#libTable tbody tr')].map((tr) => tr.dataset.id), confirm: confirmId };
}

export async function openLibrary() {
  if (!caps.server) return;
  confirmId = null; rowErr.clear();
  if (!dlg().open) { $('#libFilter').value = ''; dlg().showModal(); }   // each opening shows the whole library
  render();
  try { await refreshStreams(); loadErr = null; } catch (e) { loadErr = e; }
  render();
}

const VERIFY = {
  ok: ['match', 'good', 'The output MD5 equals the reference decoder'],
  fail: ['mismatch', 'bad', 'The output differs from the reference decoder'],
  skipped: ['not checked', '', 'Not checked against the reference decoder'],
  pending: ['waiting', '', 'The reference decoder check has not started yet'],
  running: ['checking', '', 'The reference decoder check is running'],
};
const KIND = { external: 'command line', diff: 'diff', workspace: '' };
// Where an entry came from, for telling entries of the same name apart: the full
// path, "uploaded file <name>", or the analysis folder of a command-line entry.
export function entrySource(e) {
  const src = e.source || {};
  if (src.path) return src.path;
  if (src.kind === 'upload') return `uploaded file ${src.name || e.name || ''}`.trim();
  return src.name || '';
}
// The title without its " (CODEC)" ending: the source name for workspace entries,
// the analysis folder for command-line ones (whose source is often just stream.ivf).
export const entryName = (e) => String(e.title || e.name || e.id).replace(/ \([A-Z0-9]+( diff)?\)$/, '');
// A comparison by the name the server gives it ("<A> vs <B>" with the Library names of its two analyses,
// SERVER_API.md section 13.1): the same in the picker, the Library, the job list and the toasts.
export const pairName = (e) => entryName(e);
// A comparison's source line: "A vs B" with the names its two analyses have in their own Library rows.
function pairSource(e) {
  const of = (id) => { const s = state.streams.find((x) => x.id === id); return s && s.entry ? entryName(s.entry) : null; };
  const a = e.a && of(e.a), b = e.b && of(e.b);
  return a && b ? `${a} vs ${b}` : entryName(e);
}

function render() {
  const all = state.streams.map((s) => s.entry).filter(Boolean);
  const q = $('#libFilter').value.trim().toLowerCase();
  const list = q ? all.filter((e) => `${e.name || ''} ${e.title || ''} ${e.codec || ''}`.toLowerCase().includes(q)) : all;
  const cur = state.streams[state.streamIdx] && state.streams[state.streamIdx].id;
  const table = $('#libTable');
  table.hidden = !list.length;
  table.innerHTML = `<thead><tr><th>Name</th><th class="c-codec">Codec</th><th class="c-size">Size</th><th class="num c-frames">Frames</th>
    <th class="num c-disk">On disk</th><th class="c-created">Created</th><th class="c-check" title="Result of the check against the reference decoder (output MD5)">Check</th>
    <th class="c-act"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>${list.map((e) => row(e, cur)).join('')}</tbody>`;
  const empty = $('#libEmpty');
  const msg = loadErr ? problemHTML(loadErr)
    : !all.length ? (caps.jobs ? 'No analyses yet. Open a stream and it is analyzed and kept here.' : 'This server lists no analyses.')
      : !list.length ? `No analysis matches "${esc(q)}".` : '';
  empty.innerHTML = msg;
  empty.hidden = !msg;
  $('#libFilter').hidden = !all.length;
  const count = $('#libCount');
  count.hidden = !q || !all.length;
  count.textContent = q ? `Showing ${list.length} of ${all.length}` : '';
  const ws = all.filter((e) => e.kind === 'workspace');
  const used = ws.reduce((a, e) => a + (e.disk_bytes || 0), 0);
  const where = server.session && server.session.workspace;
  const cmp = all.filter((e) => e.kind === 'diff').length;   // comparisons (or the --diff pair): no analysis of their own
  const ext = all.length - ws.length - cmp;
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  const others = [ext ? `${n(ext, 'analysis', 'analyses')} given on the command line` : '', cmp ? n(cmp, 'comparison', 'comparisons') : ''].filter(Boolean);
  const keep = [ext ? `the Library does not delete ${ext === 1 ? 'the command-line analysis' : 'command-line analyses'}` : '',
    cmp && caps.jobs ? `Remove takes a comparison away and keeps its analyses` : ''].filter(Boolean);
  $('#libFoot').innerHTML = (where ? `<span class="lf-line">Workspace folder: <span class="mono" title="Folder where uploads, analyses and job logs are kept">${esc(where)}</span></span>` : '')
    + (ws.length ? `<span class="lf-line">The workspace holds ${n(ws.length, 'analysis', 'analyses')} using ${fmtBytes(used)} on disk.</span>` : '')
    + (others.length ? `<span class="lf-line">${others.join(', ')}${keep.length ? `; ${keep.join('; ')}` : ''}.</span>` : '');
}

function row(e, cur) {
  // analyses given on the command line were not checked by this server: not "skipped" by choice
  const v = e.kind !== 'workspace' && e.verify && e.verify.status === 'skipped'
    ? ['not checked', '', 'Opened from the command line: this server did not run the reference decoder check (vca validate <dir> --refdec does)']
    : (e.verify && VERIFY[e.verify.status]) || ['–', '', 'Not checked'];
  const second = e.verify && e.verify.second && e.verify.second.status === 'fail' ? e.verify.second : null;
  const where = e.kind === 'diff' ? pairSource(e) : entrySource(e);
  let act;
  if (confirmId === e.id) {
    act = `<span class="confirm">Delete? <button class="btn small danger" type="button" data-act="yes" title="Delete this analysis and its files">Yes</button>
      <button class="btn small" type="button" data-act="no" title="Keep it">No</button></span>`;
  } else {
    const what = e.kind === 'diff' ? 'comparison' : 'analysis';
    act = `<button class="btn small" type="button" data-act="open" title="Show this ${what} in the viewer"${e.id === cur ? ' disabled' : ''}>${e.id === cur ? 'Shown' : 'Open'}</button>`
      + (caps.jobs && e.kind !== 'diff' ? ` <button class="btn small" type="button" data-act="compare" title="Compare this analysis (A) with another analysis, a C model or RTL dump, or a raw YUV file">Compare with…</button>` : '')
      + (isCompare(e) ? ` <button class="btn small" type="button" data-act="remove" title="Remove this comparison from the Library. Both analyses stay.">Remove</button>` : '')
      + (e.deletable && e.kind !== 'diff' ? ` <button class="btn small" type="button" data-act="delete" title="Delete this analysis and free its disk space">Delete</button>` : '');
  }
  const err = rowErr.get(e.id);
  return `<tr data-id="${esc(e.id)}"${e.id === cur ? ' class="cur"' : ''}>
    <td class="lib-name"><span class="ln">${esc(e.kind === 'diff' ? pairName(e) : entryName(e))}</span>${KIND[e.kind] ? `<span class="lk">${KIND[e.kind]}</span>` : ''}
      ${where ? `<span class="lsrc mono" title="${esc(`${where}\nAnalysis ${e.id}`)}">${esc(where)}</span>` : ''}
      <span class="lcreated">${esc(fmtDate(e.created))}</span>
      ${err ? `<span class="problem">${problemHTML(err)}</span>` : ''}</td>
    <td class="c-codec">${esc((e.codec || '').toUpperCase())}</td>
    <td class="c-size">${e.kind !== 'diff' && e.width && e.height ? `${fmt(e.width)}×${fmt(e.height)}` : '–'}</td>
    <td class="num c-frames">${fmt(e.frames)}</td>
    <td class="num c-disk">${fmtBytes(e.disk_bytes)}</td>
    <td class="c-created">${esc(fmtDate(e.created))}</td>
    <td class="c-check ${v[1]}" title="${esc(v[2] + (e.verify && e.verify.detail ? `: ${e.verify.detail}` : '') + (second ? ` ${second.detail}` : ''))}">${v[0]}${second ? '<span class="sub">2nd decoder differs</span>' : ''}</td>
    <td class="c-act">${act}</td></tr>`;
}

// The entry on screen is gone (deleted, or a comparison of a deleted analysis, or removed): show its A
// when it was a comparison and A is still listed, else the first entry, else the empty state.
async function leave(cur) {
  const a = cur && cur.kind === 'diff' ? state.streams.findIndex((x) => x.id === cur.a) : -1;
  if (a >= 0) await openStreamAt(a);
  else if (state.streams.length) await openStreamAt(0);
  else { closeStream(); if (caps.jobs) showServerEmpty(); }
}
const shownEntry = () => { const s = state.streams[state.streamIdx]; return s && s.entry ? s.entry : null; };

async function remove(id) {
  const s = state.streams.find((x) => x.id === id);
  const name = (s && s.entry && entryName(s.entry)) || id;
  const cur = shownEntry();
  // the analysis itself, or a comparison it is A or B of (the server drops those with it)
  const wasCurrent = !!cur && (cur.id === id || (cur.kind === 'diff' && (cur.a === id || cur.b === id)));
  rowErr.delete(id);
  try {
    const r = await api(`api/a/${encodeURIComponent(id)}`, { method: 'DELETE' });
    confirmId = null;
    try { await refreshStreams(); } catch (e) { loadErr = e; }
    toast(`Deleted ${name}${r && r.freed_bytes ? `: ${fmtBytes(r.freed_bytes)} freed` : ''}.`);
    if (wasCurrent) await leave(cur);
  } catch (e) {
    confirmId = null;
    rowErr.set(id, e);
  }
  render();
}

// Removes a comparison entry (DELETE api/compare/<id>); its two analyses stay.
async function removeCompare(id) {
  const s = state.streams.find((x) => x.id === id);
  const name = (s && s.entry && pairName(s.entry)) || id;
  const cur = shownEntry();
  const wasCurrent = !!cur && cur.id === id;
  rowErr.delete(id);
  try {
    await api(`api/compare/${encodeURIComponent(id)}`, { method: 'DELETE' });
    try { await refreshStreams(); } catch (e) { loadErr = e; }
    toast(`Removed the comparison ${name}. Both analyses stay in the Library.`);
    if (wasCurrent) await leave(cur);
  } catch (e) { rowErr.set(id, e); }
  render();
}

export function initLibrary() {
  const d = dlg();
  $('#libraryBtn').addEventListener('click', openLibrary);
  $('#libFilter').addEventListener('input', render);
  d.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'close') { d.close(); return; }
    if (act === 'open-stream') { d.close(); openStreamDialog(); return; }
    const id = b.closest('tr') && b.closest('tr').dataset.id;
    if (!id) return;
    if (act === 'open') {
      const i = state.streams.findIndex((s) => s.id === id);
      if (i >= 0) { d.close(); await openStreamAt(i); }
    } else if (act === 'compare') { d.close(); openCompare(id); }
    else if (act === 'remove') { b.disabled = true; await removeCompare(id); }
    else if (act === 'delete') { confirmId = id; render(); focusRow(id, '[data-act="no"]'); }
    else if (act === 'no') { confirmId = null; render(); focusRow(id, '[data-act="delete"]'); }
    else if (act === 'yes') { b.disabled = true; await remove(id); }
  });
}
function focusRow(id, sel) {
  const tr = [...document.querySelectorAll('#libTable tbody tr')].find((x) => x.dataset.id === id);
  const b = tr && tr.querySelector(sel);
  if (b) b.focus();
}
