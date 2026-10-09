// The Compare dialog (SERVER_API.md §13): pick the reference analysis A, give B
// (another analysis of the library, a C model / RTL dump through its mapping file,
// or one raw YUV file), and the viewer opens the A-vs-B entry on the first mismatch.
// Another analysis: POST api/compare, opened at once.  Dump and raw YUV: a convert
// job in the tray (jobs.js opens its compare entry when it ends).
import { state } from './state.js?v=d11a44027e';
import { $, esc, fmt } from './util.js?v=d11a44027e';
import { caps, TOKEN } from './data.js?v=d11a44027e';
import { api, ApiError, fmtBytes, fmtDate, problemHTML, server, toast } from './api.js?v=d11a44027e';
import { openStreamAt, refreshStreams } from './source.js?v=d11a44027e';
import { trackJob } from './jobs.js?v=d11a44027e';
import { cleanPath } from './open.js?v=d11a44027e';
import { entryName, pairName } from './library.js?v=d11a44027e';

// kind: analysis | dump | raw.  raw = {file_id | path, name} once uploaded or typed.
// check = the last answer of api/convert/check for raw (with the format it was asked for).
// seq numbers the raw source and format choices: an answer for an earlier choice is dropped.
const st = { kind: 'analysis', raw: null, xhr: null, upload: null, check: null, checking: false, error: null, msg: '', busy: false, seq: 0, sampleSet: false };
const dlg = () => $('#compareDialog');
const entries = () => state.streams.map((s) => s.entry).filter((e) => e && e.kind !== 'diff');
const entryById = (id) => entries().find((e) => e.id === id) || null;
const label = (e) => `${entryName(e)} (${(e.codec || '?').toUpperCase()})`;

// Read-only view for window.__vca.snap() (tests).
export function compareSnap() {
  return { open: dlg().open, kind: st.kind, a: $('#cmpA').value || null, b: $('#cmpB').value || null,
    raw: st.raw ? { name: st.raw.name, file_id: st.raw.file_id || null, path: st.raw.path || null } : null,
    upload: st.upload ? { ...st.upload } : null, checking: st.checking,
    check: st.check ? { ok: st.check.ok, text: $('#cmpCheckLine').innerText } : null,
    error: st.error ? st.error.code : null, compare: !$('#cmpGo').disabled };
}

// ------------------------------------------------------------- open/close
// a: the analysis id preset as A (the Library's "Compare with…"); default the stream on screen.
export async function openCompare(a = null) {
  if (!caps.jobs) return;
  const d = dlg();
  document.querySelectorAll('dialog[open]').forEach((x) => { if (x !== d) x.close(); });
  if (!d.open) { reset(); d.showModal(); }
  try { await refreshStreams(); } catch (e) { /* offline: the list stays */ }
  const cur = state.streams[state.streamIdx];
  const curEntry = cur && cur.entry;
  // a compare entry on screen: its A is the natural reference
  const def = a || (curEntry && (curEntry.kind === 'diff' ? curEntry.a : curEntry.id)) || null;
  fillA(def);
  renderAll();
  if (a) $('#cmpKindAnalysis').focus();
}
function reset() {
  abortUpload();
  Object.assign(st, { kind: 'analysis', raw: null, upload: null, check: null, checking: false, error: null, msg: '', busy: false, seq: st.seq + 1, sampleSet: false });
  for (const r of document.querySelectorAll('input[name="cmpKind"]')) r.checked = r.value === 'analysis';
  $('#cmpMapPath').value = '';
  $('#cmpRawPath').value = '';
  $('#cmpOrder').value = 'output';
  const win = server.session && server.session.platform === 'windows';
  $('#cmpMapPath').placeholder = win ? 'C:\\dumps\\clip\\mapping.yaml' : '/home/me/dumps/clip/mapping.yaml';
  $('#cmpRawPath').placeholder = win ? 'C:\\dumps\\clip_out.yuv' : '/home/me/dumps/clip_out.yuv';
}
function abortUpload() {
  if (st.xhr) { const x = st.xhr; st.xhr = null; x.abort(); }
}

// --------------------------------------------------------------- A and B
function fillA(id) {
  const sel = $('#cmpA');
  const list = entries();
  const keep = id && list.some((e) => e.id === id) ? id : (list[0] && list[0].id);
  sel.innerHTML = list.length ? list.map((e) => `<option value="${esc(e.id)}"${e.id === keep ? ' selected' : ''}>${esc(label(e))}</option>`).join('')
    : '<option value="">No analysis in the Library</option>';
  fillB();
  defaultSample();
}
// Same codec only; the others are listed disabled with the reason (a select cannot show a tooltip per option).
function fillB() {
  const a = entryById($('#cmpA').value);
  const sel = $('#cmpB');
  const prev = sel.value;
  const list = entries().filter((e) => !a || e.id !== a.id);
  const same = list.filter((e) => a && e.codec === a.codec), other = list.filter((e) => !a || e.codec !== a.codec);
  const opt = (e, ok) => `<option value="${esc(e.id)}"${ok ? '' : ' disabled'}>${esc(label(e))}${ok ? '' : `: another codec than A`}</option>`;
  sel.innerHTML = (same.length ? same.map((e) => opt(e, true)).join('') : `<option value="">No other ${a ? esc((a.codec || '').toUpperCase()) + ' ' : ''}analysis in the Library</option>`)
    + other.map((e) => opt(e, false)).join('');
  if (prev && same.some((e) => e.id === prev)) sel.value = prev;
}
// The sample format follows A's bit depth until the user picks one.
function defaultSample() {
  if (st.sampleSet) return;
  const a = entryById($('#cmpA').value);
  $('#cmpSample').value = a && a.bit_depth > 8 ? 'u16le' : 'u8';
}
const kind = () => (document.querySelector('input[name="cmpKind"]:checked') || {}).value || 'analysis';

// ------------------------------------------------------------ raw YUV
function chooseFile(f) {
  abortUpload();
  Object.assign(st, { raw: null, check: null, error: null, msg: '', upload: { loaded: 0, total: f.size, name: f.name }, seq: st.seq + 1 });
  renderAll();
  const x = new XMLHttpRequest();
  st.xhr = x;
  x.open('PUT', 'api/upload?name=' + encodeURIComponent(f.name));
  if (TOKEN) x.setRequestHeader('X-VCA-Token', TOKEN);
  x.upload.onprogress = (e) => {
    if (st.xhr !== x) return;
    st.upload = { loaded: e.loaded, total: e.lengthComputable ? e.total : f.size, name: f.name };
    renderUpload();
  };
  x.onload = () => {
    if (st.xhr !== x) return;
    st.xhr = null;
    let data = null;
    try { data = JSON.parse(x.responseText); } catch (e) { data = null; }
    st.upload = null;
    if (x.status === 201 || x.status === 200) {
      st.raw = { file_id: data.file_id, name: data.name || f.name, bytes: data.bytes };
      checkRaw();
      return;
    }
    const er = (data && data.error) || {};
    fail(new ApiError(x.status, er.code || `http_${x.status}`, er.message || `The upload failed (HTTP ${x.status}).`, er.hint || ''));
  };
  x.onerror = () => {
    if (st.xhr !== x) return;
    st.xhr = null; st.upload = null;
    fail(new ApiError(0, 'upload_failed', `Could not send ${f.name} to the local server.`, 'Choose one YUV file and check that "python -m vca serve" is still running.'));
  };
  x.send(f);
}
function cancelUpload() {
  const name = st.upload && st.upload.name;
  abortUpload();
  Object.assign(st, { upload: null, msg: name ? `Upload of ${name} cancelled. Nothing was kept.` : '' });
  renderAll();
}
function usePath() {
  const p = cleanPath($('#cmpRawPath').value);
  if (!p) {
    fail(new ApiError(0, 'no_path', 'Type or paste the full path of a YUV file first.', server.session && server.session.platform === 'windows'
      ? 'For example C:\\dumps\\clip_out.yuv. In Explorer, Shift+right-click a file and choose "Copy as path".' : 'For example /home/me/dumps/clip_out.yuv.'));
    return;
  }
  abortUpload();
  Object.assign(st, { raw: { path: p, name: p.split(/[\\/]/).pop() }, upload: null, msg: '' });
  checkRaw();
}
const rawBody = () => ({ ...(st.raw.file_id ? { file_id: st.raw.file_id } : { path: st.raw.path }), sample: $('#cmpSample').value, frame_index: $('#cmpOrder').value });

// POST api/convert/check: the expected size for A's geometry and this format against the file.
async function checkRaw() {
  if (!st.raw || !$('#cmpA').value) { renderAll(); return; }
  const seq = ++st.seq;
  const body = { ref: $('#cmpA').value, raw: rawBody() };
  Object.assign(st, { checking: true, check: null, error: null });
  renderAll();
  try {
    const r = await api('api/convert/check', { method: 'POST', body });
    if (seq !== st.seq) return;
    st.check = readCheck(r);
  } catch (e) {
    if (seq !== st.seq) return;
    st.check = null;
    st.error = e;
  }
  st.checking = false;
  renderAll();
}
// The answer (dumpmap.raw_check) as {ok, html}: the server's problem sentence and hint when the
// file cannot stand for A's frames, else what it holds (SERVER_API.md §13.2).
function readCheck(r) {
  if (!r.ok) return { ok: false, html: problemHTML({ message: r.problem || 'The file does not fit A.', hint: r.hint || '' }) };
  const n = r.frames;
  const per = r.frame_bytes ? `${fmt(r.frame_bytes)} bytes each` : 'frames of varying size';
  const what = r.frame_index === 'decode' ? `${n === 1 ? 'frame' : 'frames'} A decodes` : `${n === 1 ? 'picture' : 'pictures'} A outputs`;
  return { ok: true, html: esc(`The size fits A: ${fmt(r.file_bytes)} bytes hold the ${fmt(n)} ${what} (${r.format || ''}, ${per}) in ${r.frame_index === 'decode' ? 'decode' : 'output'} order.`) };
}

function fail(e) {
  st.error = e instanceof ApiError ? e : new ApiError(0, 'internal', String(e.message || e), '');
  st.busy = false;
  st.msg = '';   // "Starting the conversion…" is over: the problem says what happened
  renderAll();
}

// ------------------------------------------------------- earlier result
// The same mapping file or YUV file converted against the same A before: offered instead of converting again
// (as Open stream's "Already analyzed").  Paths compare as Windows does (case, slashes) on a Windows server.
const samePath = (a, b) => {
  if (!a || !b) return false;
  const win = server.session && server.session.platform === 'windows';
  const n = (p) => (win ? p.replace(/\//g, '\\').toLowerCase() : p);
  return n(a) === n(b);
};
function earlier() {
  const a = $('#cmpA').value;
  if (!a || st.kind === 'analysis') return null;
  const hit = entries().filter((e) => {
    const s = e.source || {};
    if (s.kind !== 'convert' || s.ref !== a) return false;
    if (st.kind === 'dump') return s.input === 'mapping' && samePath(s.path, cleanPath($('#cmpMapPath').value));
    if (s.input !== 'raw' || !st.raw || !st.check || !st.check.ok) return false;
    const same = st.raw.file_id ? s.file_id === st.raw.file_id : samePath(s.path, st.raw.path);
    return same && (!s.sample || s.sample === $('#cmpSample').value) && (!s.frame_index || s.frame_index === $('#cmpOrder').value);
  });
  hit.sort((x, y) => String(y.created || '').localeCompare(String(x.created || '')));
  return hit[0] || null;
}

// POST api/compare (a pair that exists comes back as it is) and open it on the first mismatch.
async function openPair(aId, bId) {
  const r = await api('api/compare', { method: 'POST', body: { a: aId, b: bId } });
  const id = (r && (r.id || (r.entry && r.entry.id))) || null;
  await refreshStreams();
  const i = state.streams.findIndex((s) => s.id === id);
  if (i < 0) throw new ApiError(0, 'not_listed', 'The comparison was made but the Library does not list it.', 'Open the Library and look for it there.');
  dlg().close();
  await openStreamAt(i);
  toast(`Opened ${state.streams[i].entry ? pairName(state.streams[i].entry) : id}.`);
}
async function reuse(bId) {
  const a = $('#cmpA').value;
  if (!a || st.busy) return;
  Object.assign(st, { busy: true, error: null, msg: 'Comparing…' });
  renderAll();
  try { await openPair(a, bId); st.busy = false; st.msg = ''; } catch (e) { fail(e); }
}

// ------------------------------------------------------------- compare
function canCompare() {
  if (st.busy || st.kind !== kind()) return false;
  const a = entryById($('#cmpA').value);
  if (!a) return false;
  if (st.kind === 'analysis') { const b = entryById($('#cmpB').value); return !!b && b.id !== a.id && b.codec === a.codec; }
  if (st.kind === 'dump') return !!cleanPath($('#cmpMapPath').value);
  return !!(st.raw && st.check && st.check.ok && !st.checking && !st.upload);
}

async function compare() {
  if (!canCompare()) return;
  const a = entryById($('#cmpA').value);
  st.busy = true; st.error = null;
  st.msg = st.kind === 'analysis' ? 'Comparing…' : 'Starting the conversion…';
  renderAll();
  try {
    if (st.kind === 'analysis') {
      await openPair(a.id, $('#cmpB').value);
      st.busy = false; st.msg = '';
      return;
    }
    const body = { kind: 'convert', ref: a.id, compare: true };
    if (st.kind === 'dump') body.mapping = { path: cleanPath($('#cmpMapPath').value) };
    else body.raw = rawBody();
    const job = await api('api/jobs', { method: 'POST', body });
    st.busy = false; st.msg = '';
    dlg().close();
    trackJob(job, { fromPage: true, codec: a.codec });
  } catch (e) {
    fail(e);
  }
}

// --------------------------------------------------------------- render
function renderAll() {
  st.kind = kind();
  for (const [k, id] of [['analysis', '#cmpPaneAnalysis'], ['dump', '#cmpPaneDump'], ['raw', '#cmpPaneRaw']]) $(id).hidden = st.kind !== k;
  document.querySelectorAll('.cmp-kind').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
  renderUpload();
  renderCheck();
  const msg = $('#cmpMsg');
  const text = st.busy ? st.msg : (st.upload ? '' : st.msg);
  msg.textContent = text; msg.hidden = !text;
  const err = $('#cmpError');
  err.hidden = !st.error;
  err.innerHTML = st.error ? problemHTML(st.error) : '';
  const a = entryById($('#cmpA').value);
  const bNote = $('#cmpBNote');
  const b = entryById($('#cmpB').value);
  bNote.textContent = !a ? '' : b && b.codec === a.codec ? `B = ${label(b)}, compared frame by frame, block by block and symbol by symbol with A.`
    : `Only analyses of the same codec (${(a.codec || '').toUpperCase()}) can be compared. Open a stream to add one, or give a dump or a YUV file.`;
  const ok = canCompare();
  const ex = earlier();
  const re = $('#cmpReuse');
  re.hidden = !ex || st.busy;
  re.innerHTML = ex ? `${esc(entryName(ex))} was converted from this ${st.kind === 'dump' ? 'mapping' : 'file'} and compared with A on ${esc(fmtDate(ex.created))}.
    <button class="btn small" type="button" data-act="reuse" data-b="${esc(ex.id)}" title="Open that comparison instead of converting again">Open that comparison</button>` : '';
  const go = $('#cmpGo');
  go.disabled = !ok;
  go.textContent = st.kind === 'analysis' ? 'Compare' : ex ? 'Convert again and compare' : 'Convert and compare';
  go.title = ok ? (st.kind === 'analysis' ? 'Compare A and B and open the first mismatch' : 'Convert B into an analysis (a job in the job list), compare it with A and open the first mismatch')
    : !a ? 'There is no analysis to use as A: open a stream first'
      : st.kind === 'analysis' ? 'Choose an analysis B of the same codec'
        : st.kind === 'dump' ? 'Type the path of the mapping file first'
          : st.upload ? 'Wait until the upload has finished'
            : !st.raw ? 'Choose a YUV file or check a path first'
              : st.checking ? 'Wait for the size check'
                : 'The size check must pass first: see the sentence above';
}
function renderUpload() {
  const row = $('#cmpUploadRow');
  row.hidden = !st.upload;
  if (!st.upload) return;
  const { loaded, total, name } = st.upload;
  const pct = total ? Math.min(100, Math.floor(loaded * 100 / total)) : 0;
  $('#cmpUploadBar').style.width = pct + '%';
  $('#cmpUploadText').textContent = pct >= 100 && total ? `Uploading ${name}: all ${fmtBytes(total)} sent, waiting for the server to store it`
    : `Uploading ${name}: ${fmtBytes(loaded)} of ${fmtBytes(total)} (${pct} %)`;
}
function renderCheck() {
  const line = $('#cmpCheckLine');
  const src = $('#cmpRawSrc');
  src.hidden = !st.raw;
  src.innerHTML = st.raw ? `B = <b>${esc(st.raw.name)}</b>${st.raw.path ? ` <span class="mono">${esc(st.raw.path)}</span>` : ', uploaded'}` : '';
  if (st.checking) { line.className = 'status-line'; line.textContent = `Checking the size of ${st.raw ? st.raw.name : 'the file'}…`; line.hidden = false; return; }
  if (!st.check) { line.hidden = true; line.innerHTML = ''; return; }
  line.className = st.check.ok ? 'status-line cmp-ok' : 'problem';
  line.innerHTML = st.check.html;
  line.hidden = false;
}

// ---------------------------------------------------------------- wiring
const hasFiles = (e) => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'));

export function initCompare() {
  const d = dlg();
  $('#compareBtn').addEventListener('click', () => openCompare());
  $('#cmpA').addEventListener('change', () => { fillB(); defaultSample(); if (st.raw) checkRaw(); else renderAll(); });
  $('#cmpB').addEventListener('change', renderAll);
  $('#cmpKinds').addEventListener('change', () => { st.error = null; renderAll(); });
  $('#cmpMapPath').addEventListener('input', renderAll);
  $('#cmpMapPath').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); compare(); } });
  $('#cmpDrop').addEventListener('click', () => $('#cmpRawFile').click());
  $('#cmpRawFile').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) chooseFile(f); e.target.value = ''; });
  $('#cmpRawForm').addEventListener('submit', (e) => { e.preventDefault(); usePath(); });
  $('#cmpUploadCancel').addEventListener('click', cancelUpload);
  $('#cmpSample').addEventListener('change', () => { st.sampleSet = true; if (st.raw) checkRaw(); });
  $('#cmpOrder').addEventListener('change', () => { if (st.raw) checkRaw(); });
  $('#cmpGo').addEventListener('click', compare);
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'close') d.close();
    else if (a && a.dataset.act === 'reuse' && !a.disabled) reuse(a.dataset.b);
  });
  d.addEventListener('close', () => { if (st.upload) cancelUpload(); });
  // A file dropped while the dialog is open is B's YUV file (open.js leaves drops alone then);
  // on the window, so a drop beside the dialog does not make the browser open the file.
  const zone = $('#cmpDrop');
  window.addEventListener('dragover', (e) => {
    if (!d.open || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = kind() === 'raw' ? 'copy' : 'none';
    zone.classList.toggle('over', kind() === 'raw');
  });
  window.addEventListener('dragleave', (e) => { if (d.open && !d.contains(e.relatedTarget)) zone.classList.remove('over'); });
  window.addEventListener('drop', (e) => {
    if (!d.open || !hasFiles(e)) return;
    e.preventDefault();
    zone.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f && kind() === 'raw') chooseFile(f);
  });
}
