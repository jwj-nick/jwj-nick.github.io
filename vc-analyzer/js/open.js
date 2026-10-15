// "Open stream" (SERVER_API.md §4, §6): the dialog, choosing or dropping a file,
// the upload with its progress, a path on this computer, the probe card, the
// analysis options and recent sources.  Analyze starts a job (jobs.js).
import { state } from './state.js?v=25b3a2d3d6';
import { $, esc, fmt } from './util.js?v=25b3a2d3d6';
import { caps, folderOf, TOKEN } from './data.js?v=25b3a2d3d6';
import { api, ApiError, fmtBytes, fmtDate, healthNotes, loadHealth, problemHTML, server } from './api.js?v=25b3a2d3d6';
import { openStreamAt, refreshStreams } from './source.js?v=25b3a2d3d6';
import { lastOutcome, trackJob } from './jobs.js?v=25b3a2d3d6';

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
      needs_extract: p.needs_extract, problems: (p.problems || []).map((x) => x.code), existing: (p.existing || []).length,
      same: sameExisting() ? sameExisting().aid : null,
      index: p.index ? { tus: p.index.tus, raps: [...p.index.raps] } : null } : null,
    error: st.error ? st.error.code : null, analyze: !$('#analyzeBtn').disabled,
    // the range choice (F-e 2): offered = the probe has an index; a, b as typed; rap = where decoding starts
    range: (() => { const r = rangeState(); return { offered: !$('#optRangeOpt').disabled, on: r.on, a: r.a, b: r.b, rap: r.rap, problem: r.problem, note: r.on ? $('#framesNote').textContent : '' }; })(),
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
    // the same words however the analyzer was started (T-0069 D4, api.js OFFLINE_HINT)
    fail(new ApiError(0, 'upload_failed', `Could not send ${f.name} to the local server.`, 'Choose one stream file (not a folder) and check that the analyzer is still running (start VC Analyzer again if it stopped).'));
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
    if (!codec) {
      st.autoProbe = p;
      // a new file: the range starts as the whole stream
      if (p.index) { $('#optTuA').value = '0'; $('#optTuB').value = String(p.index.tus - 1); }
    }
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
  const r = rangeState();
  return {
    codec: $('#optCodec').value,
    frames: $('#optFramesMode').value === 'first' ? n : 0,
    pixels: $('#optPixels').value,
    verify: $('#optVerify').checked,
    crossdec: $('#optCrossdec').checked && !$('#optCrossdec').disabled,
    hw: $('#optHw').checked,
    ...(r.on && !r.problem ? { window: { tus: [r.a, r.b] } } : {}),
  };
}

// A range of temporal units (SERVER_API.md §6 index, §7 window): A and B as typed, the random
// access point decoding starts at, and the sentence when the range is not possible (Analyze is off then;
// the server refuses the same ranges with the same reasons).
const ANNEXB = ['hevc', 'vvc', 'avc'];
const whole = (v) => (/^\s*\d+\s*$/.test(String(v)) ? parseInt(v, 10) : null);
function rangeState() {
  const p = st.probe, idx = p && p.index;
  const on = $('#optFramesMode').value === 'range';
  const a = whole($('#optTuA').value), b = whole($('#optTuB').value);
  if (!on) return { on, a, b, rap: null, problem: null };
  const unit = idx ? idx.unit : 'temporal unit';
  let problem = null;
  if (!idx) problem = 'This file has no index of its temporal units, so a range cannot be analyzed. Choose All frames.';
  else if (a === null || b === null) problem = `Type two whole numbers: A, the first ${unit} of the range, and B, the last.`;
  else if (a > b) problem = `The range starts after it ends (A = ${a}, B = ${b}): A is the first ${unit} and B the last.`;
  else if (b >= idx.tus) problem = `The range ends at ${unit} ${b}, but the stream has ${fmt(idx.tus)} (0 to ${fmt(idx.tus - 1)}).`;
  const rap = idx && a !== null ? idx.raps.filter((r) => r <= a).reduce((m, r) => Math.max(m, r), 0) : null;
  return { on, a, b, rap, problem, idx };
}
// The note under the options for a range: what one unit is for this codec, where decoding starts, and the check.
function rangeNote(r, codec) {
  const idx = r.idx, n = idx.tus, annexb = ANNEXB.includes(codec);
  const what = annexb ? `An access unit is one coded picture; this stream has ${fmt(n)} (0 to ${fmt(n - 1)}).`
    : `A temporal unit is the frames up to and including one shown frame (one IVF frame record); this stream has ${fmt(n)} (0 to ${fmt(n - 1)}).`;
  const word = annexb ? 'access unit' : 'temporal unit', rapWord = annexb ? 'an IDR picture' : 'a key frame';
  const start = r.problem || r.rap === null ? ''
    : ` Decoding starts at the random access point at or before A (${rapWord}): ${word} ${fmt(r.rap)}${r.rap < r.a - 1 ? `, so ${word}s ${fmt(r.rap)} to ${fmt(r.a - 1)} are decoded too` : r.rap < r.a ? `, so ${word} ${fmt(r.rap)} is decoded too` : ''}.`;
  const check = $('#optVerify').checked ? ' The reference decoder check stays on: it decodes the same cut and compares the output.'
    : ' The reference decoder check is off; unlike the first frames, a range can be checked: turn on "Check against the reference decoder".';
  return what + start + check;
}
// Analyze is possible after a probe that found a supported stream, or when the
// only problem is an unknown codec of an elementary stream (IVF, Annex B, OBU:
// the server honours a chosen codec only for these) and the codec is chosen by hand.
const ELEMENTARY = ['ivf', 'annexb', 'obu'];
function canAnalyze() {
  const p = st.probe;
  if (st.stage !== 'probed' || !p) return false;
  if (rangeState().problem) return false;
  if (p.supported) return true;
  const probs = p.problems || [];
  return ELEMENTARY.includes(p.container) && probs.length > 0 && probs.every((x) => x.code === 'unknown_codec')
    && $('#optCodec').value !== 'auto';
}

// replace = the id of the earlier analysis of this file with the same options ("Analyze again"): the server
// removes it when the new one is ready, so no copy stays (SERVER_API.md section 22).
async function analyze(replace = null) {
  if (!canAnalyze()) return;
  const body = { kind: 'analyze', options: options() };
  if (st.fileId) body.file_id = st.fileId; else body.path = st.path;
  if (replace) body.replace = replace;
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

// The probe's earlier analyses of this file (newest first) against the options chosen now (T-0069 D9): the same
// options (codec, frames or range, pixel stages, the checks, HW model) make the same analysis, so Open is the
// default then and "Analyze again" replaces it; other options make another analysis and keep the earlier one.
const codecOf = (c) => (c && c !== 'auto' ? c : (st.autoProbe && st.autoProbe.codec) || (st.probe && st.probe.codec) || null);
const tusOf = (o) => (o && o.window && o.window.tus ? o.window.tus.join('-') : '');
function sameOptions(a, b) {
  if (!a || !b) return false;
  return codecOf(a.codec) === codecOf(b.codec) && (a.frames || 0) === (b.frames || 0) && (a.pixels || 'all') === (b.pixels || 'all')
    && tusOf(a) === tusOf(b) && !!a.verify === !!b.verify && !!a.crossdec === !!b.crossdec && !!a.hw === !!b.hw;
}
function sameExisting() {
  const p = st.probe;
  if (!p || st.stage !== 'probed') return null;
  const now = options();
  return (p.existing || []).find((x) => sameOptions(x.options, now)) || null;
}
// "first 10 frames, output only, no reference decoder check" for an earlier analysis made with other options
function optsSummary(o) {
  if (!o) return '';
  const unit = st.probe && st.probe.index ? st.probe.index.unit : 'temporal unit';
  const parts = [o.window && o.window.tus ? `${unit}s ${o.window.tus[0]}–${o.window.tus[1]}` : o.frames ? `first ${o.frames} ${o.frames === 1 ? 'frame' : 'frames'}` : 'all frames'];
  if (o.pixels === 'recon') parts.push('output only');
  if (!o.verify) parts.push('no reference decoder check');
  if (o.crossdec) parts.push('second decoder check');
  if (!o.hw) parts.push('no HW model');
  return parts.join(', ');
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
    // the file's header does not say it for AV2 (and for AV1, VP9 without FFmpeg): the sequence header tells the analysis (T-0069 D3)
    ['Bit depth', p.bit_depth ? `${p.bit_depth}-bit` : p.codec ? 'after analysis' : '–',
      p.bit_depth ? '' : p.codec ? 'Read from the sequence header when the stream is analyzed; the probe does not decode it.' : ''],
    ['File size', fmtBytes(src.bytes)],
  ];
  // the index of temporal units (access units for Annex B), counted without decoding: what a range is chosen from
  const ix = p.index;
  if (ix) {
    const raps = ix.raps.length > 12 ? `${ix.raps.slice(0, 12).join(', ')} and ${fmt(ix.raps.length - 12)} more` : ix.raps.join(', ');
    facts.push([ix.unit === 'access unit' ? 'Access units' : 'Temporal units', fmt(ix.tus),
      `${fmt(ix.tus)} ${ix.unit}s, counted without decoding. Random access points (where decoding of a range can start): ${ix.unit} ${raps}.`]);
  }
  const notes = [];
  if (p.needs_extract) notes.push(`The video track will be extracted with FFmpeg first. Bit positions then refer to the extracted ${p.codec === 'av1' || p.codec === 'vp9' ? 'IVF' : 'Annex B'} stream.`);
  const e = p.estimate;
  if (e && e.disk_bytes && p.supported) {
    notes.push(`The analysis needs about ${fmtBytes(e.disk_bytes)} on disk and takes about ${e.seconds ? fmtSecondsShort(e.seconds) : 'a short while'}${e.approximate === false ? '' : ' (approximate)'}.`);
  }
  const probs = (p.problems || []).map((x) => `<li class="problem">${problemHTML(x)}</li>`).join('');
  card.innerHTML = `
    <div class="pc-head"><span class="pc-name" title="${esc(src.path || src.name || st.name)}">${esc(src.name || st.name)}</span>
      ${src.path ? `<span class="pc-path mono" title="${esc(src.path)}">${esc(src.path)}</span>` : ''}</div>
    <dl class="pc-facts">${facts.map(([k, v, tip]) => `<div${tip ? ` title="${esc(tip)}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${notes.map((n) => `<p class="pc-note">${esc(n)}</p>`).join('')}
    ${probs ? `<ul class="problems">${probs}</ul>` : ''}
    <p class="pc-existing" id="pcExisting" hidden></p>`;
}
// The line about an earlier analysis of this file; it follows the options (renderButtons), since the same
// options decide whether Analyze opens that analysis (T-0069 D9).
function renderExisting() {
  const box = $('#pcExisting');
  if (!box) return;
  const p = st.probe, same = sameExisting();
  const ex = same || (p && st.stage === 'probed' ? (p.existing || [])[0] : null);
  box.hidden = !ex;
  if (!ex) { box.innerHTML = ''; box.dataset.key = ''; return; }
  const html = same
    ? `Already analyzed with these options on ${esc(fmtDate(ex.created))}. Open shows it. <button class="btn small" type="button" data-act="analyze-again" data-aid="${esc(ex.aid)}" title="Analyze the file again with these options; the new analysis replaces the earlier one (no copy is kept)">Analyze again</button>`
    : `Analyzed before with other options (${esc(optsSummary(ex.options))}) on ${esc(fmtDate(ex.created))}; Analyze makes another analysis and keeps that one. <button class="btn small" type="button" data-act="open-existing" data-aid="${esc(ex.aid)}" title="Show that analysis instead of analyzing the file again">Open</button>`;
  const key = `${same ? 'same' : 'other'}:${ex.aid}:${html.length}`;
  if (box.dataset.key !== key) { box.innerHTML = html; box.dataset.key = key; }   // keep the focus on its button
}
const fmtSecondsShort = (s) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`);

function renderHealth() {
  const box = $('#openHealth');
  const p = st.probe;
  renderCrossdec();         // the health says which second decoders are built (options() reads the result)
  const notes = healthNotes(server.health, { codec: p && p.codec, skip: p ? (p.problems || []).map((x) => x.code) : [], opts: options() });
  box.hidden = !notes.length;
  box.innerHTML = notes.map((n) => `<li${n.level === 'note' ? ' class="note"' : ''}>${problemHTML(n)}</li>`).join('');
}

function renderButtons() {
  // a range needs the probe's index of temporal units (an elementary stream): otherwise the choice is off
  const p = st.probe, rOpt = $('#optRangeOpt');
  const idx = p && p.index;
  rOpt.disabled = !idx;
  rOpt.title = idx ? `Analyze ${idx.unit}s A to B, decoded from the random access point at or before A; the reference decoder check stays on`
    : (p && p.index_reason) || 'Choose a stream file first: the range needs its temporal units';
  if (!idx && $('#optFramesMode').value === 'range' && p) $('#optFramesMode').value = 'all';
  const ok = canAnalyze();
  const same = ok ? sameExisting() : null;
  const b = $('#analyzeBtn');
  b.disabled = !ok;
  // the same file with the same options: the default is to open that analysis; "Analyze again" is in its line
  b.textContent = same ? 'Open' : 'Analyze';
  b.dataset.aid = same ? same.aid : '';
  b.title = same ? `Open the analysis of this file made with these options on ${fmtDate(same.created)}; to make it again, use Analyze again`
    : ok ? 'Analyze this stream with the options above; the job list shows its progress'
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
  const range = $('#optFramesMode').value === 'range';
  $('#optFrames').hidden = !first;
  $('#optRange').hidden = !range;
  if (idx) { $('#optTuA').max = String(idx.tus - 1); $('#optTuB').max = String(idx.tus - 1); }
  const unit = idx ? idx.unit : 'temporal unit';
  $('#optTuA').title = `A: the first ${unit} of the range, counted from 0`;
  $('#optTuB').title = `B: the last ${unit} of the range (included)`;
  const fn = $('#framesNote');
  fn.hidden = !first && !(range && idx);
  const n = Math.max(1, Math.floor(+$('#optFrames').value || 1));
  // what the dumper's --limit counts (SERVER_API.md §7)
  const c = $('#optCodec').value !== 'auto' ? $('#optCodec').value : (a && a.codec);
  const tu = !c || ['av2', 'av1', 'vp9'].includes(c);
  const r = rangeState();
  fn.textContent = range ? (idx ? rangeNote(r, (p && p.codec) || c) : '') : !first ? '' : `Only the first ${n} decoded ${n === 1 ? 'frame' : 'frames'} in decode order (hidden frames count) ${n === 1 ? 'is' : 'are'} analyzed.`
    + (!tu ? '' : ` ${c ? `The ${c.toUpperCase()} analysis ends` : 'AV2, AV1 and VP9 analyses end'} with the temporal unit holding frame ${n}, so a few more frames can appear.`)
    + ' The reference decoder check needs the whole stream, so it is skipped.';
  const rp = $('#rangeProblem');
  rp.hidden = !(range && r.problem);
  rp.textContent = range && r.problem ? r.problem : '';
  if (range && r.problem && st.stage === 'probed') b.title = r.problem;
  renderExisting();
  renderCrossdec();
}

// "Also check with a second decoder": off, with the reason beside it, for a codec that has none (AV2: AVM is its
// only decoder) or none built here (/api/health codecs[c].crossdec, SERVER_API.md section 10.4; B2 QA item 7).
// The tick itself is kept, so it comes back with a codec that has one.
const CROSSDEC_TITLE = 'Also compare with a second, independent decoder (AV1 dav1d, VVC VVdeC, FFmpeg for HEVC, VP9 and AVC)';
function crossdecWhy(codec) {
  if (!codec) return '';
  if (codec === 'av2') return 'AV2 has no second decoder: AVM is the only one.';
  const h = server.health, c = h && h.codecs && h.codecs[codec];
  return c && c.dumper && c.crossdec === false ? `No second ${codec.toUpperCase()} decoder is built on this computer.` : '';
}
// the codec the job would decode: the one chosen, else the probe's
const codecNow = () => ($('#optCodec').value !== 'auto' ? $('#optCodec').value : (st.probe && st.probe.codec) || null);
function renderCrossdec() {
  const codec = codecNow();
  const box = $('#optCrossdec'), why = crossdecWhy(codec), note = $('#optCrossdecWhy');
  box.disabled = !!why;
  box.title = why ? `${why} ${CROSSDEC_TITLE}.` : CROSSDEC_TITLE;
  box.parentElement.title = box.title;
  box.parentElement.classList.toggle('off', !!why);
  note.hidden = !why;
  note.textContent = why ? `(${codec === 'av2' ? 'none for AV2' : 'not built'})` : '';
  note.title = why;
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
  // the same file name twice (two folders, or a path and an upload): the folder or "uploaded" tells them apart,
  // as the Library does (data.js streamLabel)
  const n = new Map();
  list.forEach(({ r }) => { const k = String(r.name || '').toLowerCase(); n.set(k, (n.get(k) || 0) + 1); });
  const nameOf = (r) => {
    if (!r.name || n.get(String(r.name).toLowerCase()) < 2) return r.name;
    const dir = r.path ? folderOf(r.path) : '';
    return r.path ? (dir ? `${r.name} in ${dir}` : r.name) : `${r.name} (uploaded)`;
  };
  $('#recentList').innerHTML = list.map(({ r, i }) => {
    const where = r.path || (r.file_id ? 'uploaded file' : '');
    const what = r.aid ? 'open the analysis' : (r.path ? 'check this path again' : 'check this upload again');
    return `<li><button type="button" class="recent-item" data-recent="${i}" title="${esc(where)}: ${what}">
      <span class="ri-name">${esc(nameOf(r) || where)}</span>
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
  // Analyze, or Open when this file has an analysis with the same options (renderButtons sets data-aid)
  $('#analyzeBtn').addEventListener('click', (e) => { const aid = e.currentTarget.dataset.aid; if (aid) openAnalysis(aid); else analyze(); });
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'close') d.close();
    else if (a && a.dataset.act === 'open-existing') openAnalysis(a.dataset.aid);
    else if (a && a.dataset.act === 'analyze-again') analyze(a.dataset.aid);
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
