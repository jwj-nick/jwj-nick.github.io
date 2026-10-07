// The Library dialog (SERVER_API.md §5): every analysis the server lists, a
// filter, Open, and Delete with an inline confirmation for workspace entries.
import { state } from './state.js?v=84f66b0ecd';
import { $, esc, fmt } from './util.js?v=84f66b0ecd';
import { caps } from './data.js?v=84f66b0ecd';
import { api, fmtBytes, fmtDate, problemHTML, server, toast } from './api.js?v=84f66b0ecd';
import { closeStream, openStreamAt, refreshStreams } from './source.js?v=84f66b0ecd';
import { openStreamDialog, showServerEmpty } from './open.js?v=84f66b0ecd';

let confirmId = null, loadErr = null;
const rowErr = new Map();
const dlg = () => $('#libraryDialog');

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
  const ext = all.length - ws.length;
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  $('#libFoot').innerHTML = (where ? `<span class="lf-line">Workspace folder: <span class="mono" title="Folder where uploads, analyses and job logs are kept">${esc(where)}</span></span>` : '')
    + (ws.length ? `<span class="lf-line">The workspace holds ${n(ws.length, 'analysis', 'analyses')} using ${fmtBytes(used)} on disk.</span>` : '')
    + (ext ? `<span class="lf-line">${n(ext, 'analysis was', 'analyses were')} given on the command line; the Library does not delete ${ext === 1 ? 'it' : 'them'}.</span>` : '');
}

function row(e, cur) {
  // analyses given on the command line were not checked by this server: not "skipped" by choice
  const v = e.kind !== 'workspace' && e.verify && e.verify.status === 'skipped'
    ? ['not checked', '', 'Opened from the command line: this server did not run the reference decoder check (vca validate <dir> --refdec does)']
    : (e.verify && VERIFY[e.verify.status]) || ['–', '', 'Not checked'];
  const second = e.verify && e.verify.second && e.verify.second.status === 'fail' ? e.verify.second : null;
  const where = entrySource(e);
  let act;
  if (confirmId === e.id) {
    act = `<span class="confirm">Delete? <button class="btn small danger" type="button" data-act="yes" title="Delete this analysis and its files">Yes</button>
      <button class="btn small" type="button" data-act="no" title="Keep it">No</button></span>`;
  } else {
    act = `<button class="btn small" type="button" data-act="open" title="Show this analysis in the viewer"${e.id === cur ? ' disabled' : ''}>${e.id === cur ? 'Shown' : 'Open'}</button>`
      + (e.deletable ? ` <button class="btn small" type="button" data-act="delete" title="Delete this analysis and free its disk space">Delete</button>` : '');
  }
  const err = rowErr.get(e.id);
  return `<tr data-id="${esc(e.id)}"${e.id === cur ? ' class="cur"' : ''}>
    <td class="lib-name"><span class="ln">${esc(entryName(e))}</span>${KIND[e.kind] ? `<span class="lk">${KIND[e.kind]}</span>` : ''}
      ${where ? `<span class="lsrc mono" title="${esc(`${where}\nAnalysis ${e.id}`)}">${esc(where)}</span>` : ''}
      <span class="lcreated">${esc(fmtDate(e.created))}</span>
      ${err ? `<span class="problem">${problemHTML(err)}</span>` : ''}</td>
    <td class="c-codec">${esc((e.codec || '').toUpperCase())}</td>
    <td class="c-size">${e.width && e.height ? `${fmt(e.width)}×${fmt(e.height)}` : '–'}</td>
    <td class="num c-frames">${fmt(e.frames)}</td>
    <td class="num c-disk">${fmtBytes(e.disk_bytes)}</td>
    <td class="c-created">${esc(fmtDate(e.created))}</td>
    <td class="c-check ${v[1]}" title="${esc(v[2] + (e.verify && e.verify.detail ? `: ${e.verify.detail}` : '') + (second ? ` ${second.detail}` : ''))}">${v[0]}${second ? '<span class="sub">2nd decoder differs</span>' : ''}</td>
    <td class="c-act">${act}</td></tr>`;
}

async function remove(id) {
  const s = state.streams.find((x) => x.id === id);
  const name = (s && s.entry && entryName(s.entry)) || id;
  const wasCurrent = state.streams[state.streamIdx] && state.streams[state.streamIdx].id === id;
  rowErr.delete(id);
  try {
    const r = await api(`api/a/${encodeURIComponent(id)}`, { method: 'DELETE' });
    confirmId = null;
    try { await refreshStreams(); } catch (e) { loadErr = e; }
    toast(`Deleted ${name}${r && r.freed_bytes ? `: ${fmtBytes(r.freed_bytes)} freed` : ''}.`);
    if (wasCurrent) {
      if (state.streams.length) await openStreamAt(0);
      else { closeStream(); if (caps.jobs) showServerEmpty(); }
    }
  } catch (e) {
    confirmId = null;
    rowErr.set(id, e);
  }
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
    } else if (act === 'delete') { confirmId = id; render(); focusRow(id, '[data-act="no"]'); }
    else if (act === 'no') { confirmId = null; render(); focusRow(id, '[data-act="delete"]'); }
    else if (act === 'yes') { b.disabled = true; await remove(id); }
  });
}
function focusRow(id, sel) {
  const tr = [...document.querySelectorAll('#libTable tbody tr')].find((x) => x.dataset.id === id);
  const b = tr && tr.querySelector(sel);
  if (b) b.focus();
}
