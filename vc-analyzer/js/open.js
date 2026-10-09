// "Open stream" (SERVER_API.md §4, §6): the dialog, choosing or dropping a file,
// the upload with its progress, a path on this computer, the probe card, the
// analysis options and recent sources.  Analyze starts a job (jobs.js).
import { state } from './state.js?v=d11a44027e';
import { $, esc, fmt } from './util.js?v=d11a44027e';
import { caps, TOKEN } from './data.js?v=d11a44027e';
import { api, ApiError, fmtBytes, fmtDate, healthNotes, loadHealth, problemHTML, server } from './api.js?v=d11a44027e';
import { openStreamAt, refreshStreams } from './source.js?v=d11a44027e';
import { lastOutcome, trackJob } from './jobs.js?v=d11a44027e';

const CODECS = ['av2', 'av1', 'vvc', 'hevc', 'vp9', 'avc'];
const CONTAINERS = { ivf: 'IVF', annexb: 'Annex B', obu: 'OBU', mp4: 'MP4', mkv: 'Matroska', webm: 'WebM', ts: 'MPEG-TS', unknown: 'not recognised' };

// stage: empty | uploading | probing | probed | starting | error
// autoProbe = the probe without a codec (what the file says); probe = the one shown (with the chosen codec when it differs).
// seq numbers the source and codec choices: an answer for an earlier choice is dropped.
const st = { stage: 'empty', name: '', file: null, xhr: null, upload: null, fileId: null, path: null, probe: null, autoProbe: null, error: null, msg: '', recent: [], seq: 0, codec: null };

// Read-only view for window.__vca.snap() (tests).
export function openSnap() {
  const p = st.probe;
  return {
    stage: st.stage, name: st.name, upload: st.upload ? { ...st.upload } : null, probeCodec: st.codec,
    probe: p ? { codec: p.codec, container: p.container, frames: p.frames, width: p.width, height: p.height, supported: p.supported,
      needs_extract: p.needs_extract, problems: (p.problems || []).map((x) => x.code), existing: (p.existing || []).length } : null,
    error: st.error ? st.error.code : null, analyze: !$('#analyzeBtn').disabled,
  };
}

const dlg = () => $('#openDialog');

// ------------------------------------------------------------- open/close
export function openStreamDialog(file, note = '') {
  if (!caps.jobs) return;
  const d = dlg();
  document.querySelectorAll('dialog[open]').forEach((x) => { if (x !== d) x.close(); });   // a drop over the Library or Help
  if (!d.open) { reset(); d.showModal(); }
  renderAll();
  loadHealth().then(renderHealth);
  loadRecent();
  if (file) chooseFile(file, note);
}
function reset() {
  abortUpload();
  Object.assign(st, { stage: 'empty', name: '', file: null, upload: null, fileId: null, path: null, probe: null, autoProbe: null, error: null, msg: '', seq: st.seq + 1 });
  $('#optCodec').value = 'auto';
  $('#pathInput').value = '';   // each opening starts empty; Recent brings earlier paths back
  // the example path follows the computer that runs vca serve (a Windows server refuses /home/... paths)
  const win = server.session && server.session.platform === 'windows';
  $('#pathInput').placeholder = win ? 'C:\\videos\\clip.mp4' : '/home/me/videos/clip.mp4';
}
function abortUpload() {
  if (st.xhr) { const x = st.xhr; st.xhr = null; x.abort(); }
}

// --------------------------------------------------------------- inputs
// A file from the picker or a drop: upload it, then probe it.
function chooseFile(f, note = '') {
  abortUpload();
  Object.assign(st, { stage: 'uploading', name: f.name, file: f, fileId: null, path: null, probe: null, autoProbe: null, error: null, msg: note, upload: { loaded: 0, total: f.size }, seq: st.seq + 1 });
  $('#optCodec').value = 'auto';
  renderAll();
  const x = new XMLHttpRequest();
  st.xhr = x;
  x.open('PUT', 'api/upload?name=' + encodeURIComponent(f.name));
  if (TOKEN) x.setRequestHeader('X-VCA-Token', TOKEN);
  x.upload.onprogress = (e) => {
    if (st.xhr !== x) return;
    st.upload = { loaded: e.loaded, total: e.lengthComputable ? e.total : f.size };
    renderUpload();
  };
  x.onload = () => {
    if (st.xhr !== x) return;
    st.xhr = null;
    let data = null;
    try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
    if (x.status === 201 || x.status === 200) {
      st.fileId = data.file_id;
      st.upload = { loaded: f.size, total: f.size };
      probe({ file_id: data.file_id });
      return;
    }
    const er = (data && data.error) || {};
    fail(new ApiError(x.status, er.code || `http_${x.status}`, er.message || `The upload failed (HTTP ${x.status}).`, er.hint || ''));
  };
  x.onerror = () => {
    if (st.xhr !== x) return;
    st.xhr = null;
    fail(new ApiError(0, 'upload_failed', `Could not send ${f.name} to the local server.`, 'Choose one stream file (not a folder) and check that "python -m vca serve" is still running.'));
  };
  x.onabort = () => { /* abortUpload or a new file: the caller sets the stage */ };
  x.send(f);
}

function cancelUpload() {
  abortUpload();
  Object.assign(st, { stage: 'empty', upload: null, file: null, msg: `Upload of ${st.name} cancelled. Nothing was kept.` });
  renderAll();
}

// Path typed or pasted: quotes around it are fine (Explorer "Copy as path").
export const cleanPath = (v) => {
  let p = String(v || '').trim();
  if (p.length > 1 && ((p[0] === '"' && p.endsWith('"')) || (p[0] === "'" && p.endsWith("'")))) p = p.slice(1, -1).trim();
  return p;
};
function checkPath() {
  const p = cleanPath($('#pathInput').value);
  if (!p) {
    fail(new ApiError(0, 'no_path', 'Type or paste the full path of a stream file first.', server.session && server.session.platform === 'windows'
      ? 'For example C:\\videos\\clip.mp4. In Explorer, Shift+right-click a file and choose "Copy as path".' : 'For example /home/me/clip.ivf.'));
    return;
  }
  abortUpload();
  Object.assign(st, { name: p.split(/[\\/]/).pop(), file: null, fileId: null, path: p, upload: null, msg: '', autoProbe: null });
  $('#optCodec').value = 'auto';
  probe({ path: p });
}

// Probes the chosen source; with body.codec the server checks that codec against
// the file (SERVER_API.md §10.1: a codec other than the detected one is the
// blocking problem codec_mismatch).
async function probe(body) {
  const seq = ++st.seq;
  const codec = body.codec || null;
  Object.assign(st, { stage: 'probing', probe: null, error: null, codec });
  if (!codec) st.autoProbe = null;
  renderAll();
  // another file, path or codec chosen meanwhile
  const stale = () => seq !== st.seq || (body.file_id && body.file_id !== st.fileId) || (body.path && body.path !== st.path);
  try {
    const p = await api('api/probe', { method: 'POST', body });
    if (stale()) return;
    st.probe = p;
    if (!codec) st.autoProbe = p;
    st.stage = 'probed';
    if (p.source && p.source.name) st.name = p.source.name;
  } catch (e) {
    if (stale()) return;
    fail(e);
    return;
  }
  renderAll();
  loadHealth().then(renderHealth);
}
const sourceBody = () => (st.fileId ? { file_id: st.fileId } : { path: st.path });

// The Codec select changed: a codec other than the detected one goes to the
// server (which refuses it); Auto or the detected codec shows the file's own probe.
function codecChanged() {
  const a = st.autoProbe;
  const c = $('#optCodec').value;
  if (!a || !['probed', 'probing', 'error'].includes(st.stage) || (!st.fileId && !st.path)) { renderButtons(); renderHealth(); return; }
  if (!a.codec || c === 'auto' || c === a.codec) {
    if (st.probe !== a) { st.seq++; Object.assign(st, { probe: a, stage: 'probed', error: null, codec: null }); renderAll(); }
    else { renderButtons(); renderHealth(); }
    return;
  }
  probe({ ...sourceBody(), codec: c });
}

function fail(e) {
  st.stage = 'error';
  st.error = e instanceof ApiError ? e : new ApiError(0, 'internal', String(e.message || e), '');
  renderAll();
}

// ------------------------------------------------------------- options
function options() {
  const n = Math.max(1, Math.floor(+$('#optFrames').value || 1));
  return {
    codec: $('#optCodec').value,
    frames: $('#optFramesMode').value === 'first' ? n : 0,
    pixels: $('#optPixels').value,
    verify: $('#optVerify').checked,
    crossdec: $('#optCrossdec').checked,
    hw: $('#optHw').checked,
  };
}
// Analyze is possible after a probe that found a supported stream, or when the
// only problem is an unknown codec of an elementary stream (IVF, Annex B, OBU:
// the server honours a chosen codec only for these) and the codec is chosen by hand.
const ELEMENTARY = ['ivf', 'annexb', 'obu'];
function canAnalyze() {
  const p = st.probe;
  if (st.stage !== 'probed' || !p) return false;
  if (p.supported) return true;
  const probs = p.problems || [];
  return ELEMENTARY.includes(p.container) && probs.length > 0 && probs.every((x) => x.code === 'unknown_codec')
    && $('#optCodec').value !== 'auto';
}

async function analyze() {
  if (!canAnalyze()) return;
  const body = { kind: 'analyze', options: options() };
  if (st.fileId) body.file_id = st.fileId; else body.path = st.path;
  const probed = st.probe;
  st.stage = 'starting';
  renderAll();
  try {
    const job = await api('api/jobs', { method: 'POST', body });
    dlg().close();
    trackJob(job, { fromPage: true, codec: body.options.codec !== 'auto' ? body.options.codec : probed.codec, frames: probed.frames });
  } catch (e) {
    st.stage = 'probed';
    st.error = e;
    renderAll();
  }
}

// Opens an analysis that is already in the library (existing or recent).
async function openAnalysis(aid) {
  let i = state.streams.findIndex((s) => s.id === aid);
  if (i < 0) { try { await refreshStreams(); } catch (e) { /* offline: the list stays */ } i = state.streams.findIndex((s) => s.id === aid); }
  if (i < 0) return false;
  dlg().close();
  await openStreamAt(i);
  return true;
}

// ---------------------------------------------------------------- recent
async function loadRecent() {
  try { st.recent = (await api('api/recent')) || []; } catch (e) { st.recent = []; }
  renderRecent();
}
async function openRecent(i) {
  const r = st.recent[i];
  if (!r) return;
  if (r.aid && await openAnalysis(r.aid)) return;
  if (r.path) { $('#pathInput').value = r.path; checkPath(); return; }
  if (r.file_id) {
    abortUpload();
    Object.assign(st, { name: r.name, file: null, fileId: r.file_id, path: null, upload: null, msg: '', autoProbe: null });
    $('#optCodec').value = 'auto';
    probe({ file_id: r.file_id });
  }
}

// --------------------------------------------------------------- render
function renderAll() {
  renderUpload();
  renderStatus();
  renderProbe();
  renderHealth();
  renderButtons();
}

function renderUpload() {
  const row = $('#uploadRow');
  const on = st.stage === 'uploading' && st.upload;
  row.hidden = !on;
  if (!on) return;
  const { loaded, total } = st.upload;
  const pct = total ? Math.min(100, Math.floor(loaded * 100 / total)) : 0;
  $('#uploadBar').style.width = pct + '%';
  $('#uploadText').textContent = pct >= 100 && total ? `Uploading ${st.name}: all ${fmtBytes(total)} sent, waiting for the server to store it`
    : `Uploading ${st.name}: ${fmtBytes(loaded)} of ${fmtBytes(total)} (${pct} %)`;
}

function renderStatus() {
  const msg = $('#openMsg');
  const text = st.stage === 'probing' ? (st.codec ? `Checking ${st.name} as ${st.codec.toUpperCase()}…` : `Reading ${st.name}…`)
    : st.stage === 'starting' ? 'Starting the analysis…' : st.msg;
  msg.textContent = text;
  msg.hidden = !text;
  const err = $('#openError');
  err.hidden = !st.error;
  err.innerHTML = st.error ? problemHTML(st.error) : '';
}

function renderProbe() {
  const card = $('#probeCard');
  const p = st.probe;
  card.hidden = !p || st.stage === 'probing';
  if (!p) { card.innerHTML = ''; return; }
  const src = p.source || {};
  const size = p.width && p.height ? `${fmt(p.width)}×${fmt(p.height)}` : '–';
  const facts = [
    ['Codec', p.codec ? `<span class="codec-tag">${esc(p.codec.toUpperCase())}</span>` : '<span class="bad">unknown</span>'],
    ['Container', esc(CONTAINERS[p.container] || p.container || '–')],
    ['Picture size', size],
    ['Output frames', p.frames === null || p.frames === undefined ? '–' : fmt(p.frames),
      'Frames the container declares as shown (IVF header, MP4 sample count). The analysis counts decoded frames, which can be more (hidden frames). Annex B and OBU files declare none.'],
    ['Bit depth', p.bit_depth ? `${p.bit_depth}-bit` : '–'],
    ['File size', fmtBytes(src.bytes)],
  ];
  const notes = [];
  if (p.needs_extract) notes.push(`The video track will be extracted with FFmpeg first. Bit positions then refer to the extracted ${p.codec === 'av1' || p.codec === 'vp9' ? 'IVF' : 'Annex B'} stream.`);
  const e = p.estimate;
  if (e && e.disk_bytes && p.supported) {
    notes.push(`The analysis needs about ${fmtBytes(e.disk_bytes)} on disk and takes about ${e.seconds ? fmtSecondsShort(e.seconds) : 'a short while'}${e.approximate === false ? '' : ' (approximate)'}.`);
  }
  const probs = (p.problems || []).map((x) => `<li class="problem">${problemHTML(x)}</li>`).join('');
  const ex = (p.existing || [])[0];
  card.innerHTML = `
    <div class="pc-head"><span class="pc-name" title="${esc(src.path || src.name || st.name)}">${esc(src.name || st.name)}</span>
      ${src.path ? `<span class="pc-path mono" title="${esc(src.path)}">${esc(src.path)}</span>` : ''}</div>
    <dl class="pc-facts">${facts.map(([k, v, tip]) => `<div${tip ? ` title="${esc(tip)}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${notes.map((n) => `<p class="pc-note">${esc(n)}</p>`).join('')}
    ${probs ? `<ul class="problems">${probs}</ul>` : ''}
    ${ex ? `<p class="pc-existing">Already analyzed on ${esc(fmtDate(ex.created))}. <button class="btn small" type="button" data-act="open-existing" data-aid="${esc(ex.aid)}" title="Show that analysis instead of analyzing the file again">Open</button></p>` : ''}`;
}
const fmtSecondsShort = (s) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`);

function renderHealth() {
  const box = $('#openHealth');
  const p = st.probe;
  const notes = healthNotes(server.health, { codec: p && p.codec, skip: p ? (p.problems || []).map((x) => x.code) : [], opts: options() });
  box.hidden = !notes.length;
  box.innerHTML = notes.map((n) => `<li${n.level === 'note' ? ' class="note"' : ''}>${problemHTML(n)}</li>`).join('');
}

function renderButtons() {
  const ok = canAnalyze();
  const b = $('#analyzeBtn');
  b.disabled = !ok;
  b.textContent = st.probe && (st.probe.existing || []).length ? 'Analyze again' : 'Analyze';
  b.title = ok ? 'Analyze this stream with the options above; the job list shows its progress'
    : st.stage === 'uploading' ? 'Wait until the upload has finished'
      : st.stage === 'probed' ? 'This file cannot be analyzed: see the problems above'
        : 'Choose a file or check a path first';
  // the note only when the file did not say its codec and one was chosen by hand
  const a = st.autoProbe;
  const forced = ok && !!a && !a.codec && $('#optCodec').value !== 'auto';
  const note = $('#forcedNote');
  note.hidden = !forced;
  note.textContent = forced ? `The codec could not be read from the file: it will be decoded as ${$('#optCodec').value.toUpperCase()}.` : '';
  const auto = $('#optCodec').options[0];
  const autoText = a && a.codec ? `Auto (detected ${a.codec.toUpperCase()})` : 'Auto';
  if (auto.textContent !== autoText) auto.textContent = autoText;
  const first = $('#optFramesMode').value === 'first';
  $('#optFrames').hidden = !first;
  const fn = $('#framesNote');
  fn.hidden = !first;
  const n = Math.max(1, Math.floor(+$('#optFrames').value || 1));
  // what the dumper's --limit counts (SERVER_API.md §7)
  const c = $('#optCodec').value !== 'auto' ? $('#optCodec').value : (a && a.codec);
  const tu = !c || ['av2', 'av1', 'vp9'].includes(c);
  fn.textContent = !first ? '' : `Only the first ${n} decoded ${n === 1 ? 'frame' : 'frames'} in decode order (hidden frames count) ${n === 1 ? 'is' : 'are'} analyzed.`
    + (!tu ? '' : ` ${c ? `The ${c.toUpperCase()} analysis ends` : 'AV2, AV1 and VP9 analyses end'} with the temporal unit holding frame ${n}, so a few more frames can appear.`)
    + ' The reference decoder check needs the whole stream, so it is skipped.';
}

// ", analyzed" when the source has an analysis, else how its last job ended (", failed", ", cancelled").
function recentEnd(r) {
  if (r.aid && state.streams.some((s) => s.id === r.aid)) return ', analyzed';
  const end = lastOutcome({ path: r.path, file_id: r.file_id });
  return end ? `, <span class="${end === 'failed' ? 'bad' : ''}">${end}</span>` : (r.aid ? ', analyzed' : '');
}

function renderRecent() {
  const box = $('#recentBox');
  // newest first; one line per path (or per name for uploads)
  const seen = new Set();
  const list = st.recent.map((r, i) => ({ r, i })).filter(({ r }) => { const k = r.path || `upload:${r.name}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
  box.hidden = !list.length;
  $('#recentList').innerHTML = list.map(({ r, i }) => {
    const where = r.path || (r.file_id ? 'uploaded file' : '');
    const what = r.aid ? 'open the analysis' : (r.path ? 'check this path again' : 'check this upload again');
    return `<li><button type="button" class="recent-item" data-recent="${i}" title="${esc(where)}: ${what}">
      <span class="ri-name">${esc(r.name || where)}</span>
      <span class="ri-meta">${r.codec ? esc(String(r.codec).toUpperCase()) + ', ' : ''}${esc(fmtDate(r.at))}${recentEnd(r)}</span></button></li>`;
  }).join('');
}

// ------------------------------------------------------------ empty state
// Server with jobs and nothing to show: say what to do, with the button.
export function showServerEmpty() {
  const e = $('#emptyState');
  e.hidden = false;
  e.innerHTML = `<div class="empty-card"><p><b>No analyses yet.</b></p>
    <p>Open a stream file (AV2, AV1, VVC, HEVC, VP9 or AVC) or drop one on this window. It is analyzed here and kept in the Library.</p>
    <button class="btn primary" type="button" data-act="open-stream" title="Open a stream file and analyze it (o)">Open stream</button></div>`;
}

// ---------------------------------------------------------------- wiring
const hasFiles = (e) => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'));
// The Compare dialog takes a dropped file as B's YUV file (compare.js): no overlay, no Open stream then.
const comparing = () => { const c = $('#compareDialog'); return !!(c && c.open); };

export function initOpen() {
  const d = dlg();
  $('#openStreamBtn').addEventListener('click', () => openStreamDialog());
  $('#emptyState').addEventListener('click', (e) => { if (e.target.closest('[data-act="open-stream"]')) openStreamDialog(); });
  $('#dropZone').addEventListener('click', () => $('#streamFile').click());
  $('#streamFile').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) chooseFile(f); e.target.value = ''; });
  $('#uploadCancel').addEventListener('click', cancelUpload);
  $('#pathForm').addEventListener('submit', (e) => { e.preventDefault(); checkPath(); });
  $('#analyzeBtn').addEventListener('click', analyze);
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'close') d.close();
    else if (a && a.dataset.act === 'open-existing') openAnalysis(a.dataset.aid);
    const r = e.target.closest('[data-recent]');
    if (r) openRecent(+r.dataset.recent);
  });
  d.addEventListener('close', () => { if (st.stage === 'uploading') cancelUpload(); });
  $('#openOptions').addEventListener('change', (e) => { if (e.target.id === 'optCodec') codecChanged(); else { renderButtons(); renderHealth(); } });
  $('#openOptions').addEventListener('input', () => renderButtons());

  // Drag a file anywhere over the window: an overlay, then the dialog with that file.
  const overlay = $('#dropOverlay');
  let depth = 0;
  const zone = $('#dropZone');
  window.addEventListener('dragenter', (e) => {
    if (!caps.jobs || !hasFiles(e) || comparing()) return;
    e.preventDefault();
    depth++;
    if (d.open) zone.classList.add('over'); else overlay.hidden = false;
  });
  window.addEventListener('dragover', (e) => {
    if (!caps.jobs || !hasFiles(e) || comparing()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', () => {
    if (!caps.jobs) return;
    depth = Math.max(0, depth - 1);
    if (!depth) { overlay.hidden = true; zone.classList.remove('over'); }
  });
  window.addEventListener('drop', (e) => {
    if (!caps.jobs || !hasFiles(e) || comparing()) return;
    e.preventDefault();
    depth = 0; overlay.hidden = true; zone.classList.remove('over');
    const files = [...e.dataTransfer.files];
    if (files.length) openStreamDialog(files[0], files.length > 1 ? `Only the first file is opened: ${files[0].name}.` : '');
  });
  // A drag that ends outside the window (or is cancelled) may send no dragleave:
  // the overlay also goes on dragend, Escape, leaving the window, and the first
  // mouse move without a button (no drag is going on then).
  const endDrag = () => {
    if (overlay.hidden && !zone.classList.contains('over') && !depth) return;
    depth = 0; overlay.hidden = true; zone.classList.remove('over');
  };
  window.addEventListener('dragend', endDrag);
  window.addEventListener('blur', endDrag);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') endDrag(); }, true);
  window.addEventListener('mousemove', (e) => { if (!e.buttons) endDrag(); });
}
