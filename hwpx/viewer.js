import { openHwpx } from './src/hwpx.js';
import { parseHeader } from './src/header.js';
import { renderSection, BASE_CSS } from './src/render.js';
import { rebuildHwpx } from './src/edit.js';
import { applyTextEdits, replaceTextAcrossRuns } from './src/edit-node.js';

const $ = (id) => document.getElementById(id);
const drop = $('drop');
const input = $('file-input');
const styled = $('styled-view');

// base renderer CSS (page box, table borders, pre-wrap)
const baseStyle = document.createElement('style');
baseStyle.textContent = BASE_CSS;
document.head.append(baseStyle);

// ---- state --------------------------------------------------------------

const state = {
  doc: null,          // HwpxDocument as loaded
  name: '',
  header: null,
  binUrls: new Map(),
  sectionXmls: [],    // working copies (edits land here)
  undo: [],           // snapshots of sectionXmls (arrays of strings)
  redo: [],
  dirty: false,
  mode: 'styled',
  fit: window.innerWidth < 720, // default ON when the screen is phone-sized
};

// ---- file loading -------------------------------------------------------

drop.addEventListener('click', () => input.click());
drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file) load(file);
});
input.addEventListener('change', () => {
  if (input.files[0]) load(input.files[0]);
});

async function load(file) {
  await openBytes(file.name, file.size, new Uint8Array(await file.arrayBuffer()));
}

async function openBytes(name, size, bytes) {
  hideError();
  try {
    const doc = await openHwpx(bytes);
    state.doc = doc;
    state.name = name;
    const headerXml = await doc.headerXml();
    state.header = headerXml ? parseHeader(headerXml) : null;
    state.sectionXmls = [];
    for (let i = 0; i < doc.sectionPaths.length; i++) {
      state.sectionXmls.push(await doc.sectionXml(i));
    }
    state.undo = [];
    state.redo = [];
    state.dirty = false;

    for (const url of state.binUrls.values()) URL.revokeObjectURL(url);
    state.binUrls = new Map();
    for (const item of doc.manifest) {
      if (!item.href?.startsWith('BinData/')) continue;
      const path = doc.resolveHref(item.href);
      if (!doc.zip.has(path)) continue;
      const bytes = await doc.readEntry(path);
      const url = URL.createObjectURL(new Blob([bytes], { type: item.mediaType || 'application/octet-stream' }));
      state.binUrls.set(item.id, url);
    }

    renderMeta(size);
    renderStyled();
    renderTextView();
    $('modebar').classList.remove('hidden');
    setStatus('');
    setMode('styled');
    document.title = `${doc.title || name} — hwpx-tool`;
  } catch (err) {
    showError(`"${name}" 열기 실패: ${err.message}`);
    for (const id of ['card-meta', 'card-text', 'card-edit', 'styled-view', 'modebar']) {
      $(id).classList.add('hidden');
    }
  }
}

// ---- startup: desktop file arg, PWA service worker, Android share target -

const isDesktop = () => typeof globalThis.NL_TOKEN === 'string' || Array.isArray(globalThis.NL_ARGS);

// Desktop (Neutralino): .hwpx passed as a process argument (file association).
async function tryOpenFromArgs() {
  const args = globalThis.NL_ARGS;
  if (!Array.isArray(args)) return false;
  const filePath = args.find((a) => /\.hwpx$/i.test(a));
  if (!filePath) return false;
  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/js/neutralino.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('클라이언트 라이브러리 로드 실패'));
      document.head.append(s);
    });
    globalThis.Neutralino.init();
    const buf = await globalThis.Neutralino.filesystem.readBinaryFile(filePath);
    const name = filePath.split(/[\\/]/).pop();
    await openBytes(name, buf.byteLength, new Uint8Array(buf));
  } catch (err) {
    showError(`파일 열기 실패 (${filePath}): ${err.message ?? err.code ?? err}`);
  }
  return true;
}

// PWA: register the service worker (offline + Android share target).
function registerServiceWorker() {
  if (isDesktop() || !('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!secure) return;
  navigator.serviceWorker.register('./sw.js').catch(() => { /* PWA is a bonus; ignore */ });
}

// Android share target: a .hwpx shared from another app was stashed by the SW.
async function tryOpenFromShare() {
  if (!new URLSearchParams(location.search).has('shared')) return false;
  try {
    const res = await caches.match('shared-file', { cacheName: 'hwpx-share' });
    if (res) {
      const name = decodeURIComponent(res.headers.get('x-filename') || 'shared.hwpx');
      const buf = await res.arrayBuffer();
      await openBytes(name, buf.byteLength, new Uint8Array(buf));
      const cache = await caches.open('hwpx-share');
      await cache.delete('shared-file');
    }
  } catch (err) {
    showError(`공유된 파일 열기 실패: ${err.message ?? err}`);
  }
  history.replaceState(null, '', location.pathname); // drop ?shared=1
  return true;
}

(async function startup() {
  registerServiceWorker();
  if (await tryOpenFromArgs()) return;
  await tryOpenFromShare();
})();

// ---- rendering ----------------------------------------------------------

function renderMeta(size) {
  const doc = state.doc;
  $('doc-title').textContent = doc.title || state.name;
  const meta = $('meta');
  meta.replaceChildren();
  const rows = {
    '파일': `${state.name} (${(size / 1024).toFixed(1)} KB)`,
    '작성자': doc.metadata.creator,
    '만든 날짜': doc.metadata.CreatedDate,
    '수정 날짜': doc.metadata.ModifiedDate,
    '경고': doc.warnings.join(' | ') || null,
  };
  for (const [k, v] of Object.entries(rows)) {
    if (!v) continue;
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    meta.append(dt, dd);
  }
  $('card-meta').classList.remove('hidden');
}

function renderStyled() {
  const editable = state.mode === 'edit';
  let html = '';
  for (let i = 0; i < state.sectionXmls.length; i++) {
    html += `<div data-sec="${i}">` + renderSection(state.sectionXmls[i], {
      header: state.header,
      resolveBinData: (id) => state.binUrls.get(id) ?? null,
      editable,
    }) + '</div>';
  }
  styled.innerHTML = html;
  styled.classList.toggle('editing', editable);
  if (editable) {
    for (const p of styled.querySelectorAll('p[data-hxp]')) {
      try {
        p.contentEditable = 'plaintext-only';
      } catch {
        p.contentEditable = 'true';
      }
    }
  }
  applyFit();
}

// ---- fit to width (scale each page box down to the viewport) -------------

function applyFit() {
  const pages = styled.querySelectorAll('.hwpx-page');
  styled.classList.toggle('fit', state.fit);
  const avail = styled.clientWidth;
  for (const page of pages) {
    page.style.zoom = '1';
    if (!state.fit) continue;
    const natural = page.offsetWidth; // measured at zoom:1
    if (natural > avail) page.style.zoom = String(Math.max(0.2, avail / natural));
  }
  const btn = $('fit-btn');
  if (btn) {
    btn.classList.toggle('active', state.fit);
    btn.setAttribute('aria-pressed', String(state.fit));
  }
}

let fitResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(fitResizeTimer);
  fitResizeTimer = setTimeout(applyFit, 150);
});

async function renderTextView() {
  const paragraphs = await state.doc.paragraphs();
  const box = $('paragraphs');
  box.replaceChildren();
  for (const text of paragraphs) {
    const p = document.createElement('p');
    p.textContent = text;
    box.append(p);
  }
}

// ---- modes --------------------------------------------------------------

$('mode-styled').addEventListener('click', () => setMode('styled'));
$('mode-text').addEventListener('click', () => setMode('text'));
$('mode-edit').addEventListener('click', () => setMode('edit'));
$('fit-btn').addEventListener('click', () => {
  state.fit = !state.fit;
  applyFit();
});
$('print-btn').addEventListener('click', () => {
  setMode('styled');
  window.print();
});

function setMode(mode) {
  const prev = state.mode;
  state.mode = mode;
  $('styled-view').classList.toggle('hidden', mode === 'text');
  $('card-text').classList.toggle('hidden', mode !== 'text');
  $('card-edit').classList.toggle('hidden', mode !== 'edit');
  $('mode-styled').classList.toggle('active', mode === 'styled');
  $('mode-text').classList.toggle('active', mode === 'text');
  $('mode-edit').classList.toggle('active', mode === 'edit');
  if ((prev === 'edit') !== (mode === 'edit')) renderStyled();
}

// ---- in-place editing ---------------------------------------------------

styled.addEventListener('focusin', (e) => {
  const p = e.target.closest?.('p[data-hxp]');
  if (p) p.dataset.orig = p.innerText;
});

styled.addEventListener('focusout', (e) => {
  const p = e.target.closest?.('p[data-hxp]');
  if (!p || state.mode !== 'edit') return;
  if (p.dataset.orig === p.innerText) return; // unchanged
  commitParagraph(p);
});

function commitParagraph(pEl) {
  const secEl = pEl.closest('[data-sec]');
  const sec = Number(secEl?.dataset.sec ?? 0);
  const clean = (s) => s.replace(/ /g, ' ').replace(/\n$/, '');
  const full = clean(pEl.innerText);
  const spans = [...pEl.querySelectorAll('span[data-hxt]')];
  const edits = [];

  if (spans.length === 0) {
    // paragraph had no text run at all — create one
    if (full === '') return;
    edits.push({ path: parsePath(pEl.dataset.hxp), text: full });
  } else {
    const joined = clean(spans.map((s) => s.innerText).join(''));
    if (joined === full) {
      for (const s of spans) edits.push({ path: parsePath(s.dataset.hxt), text: clean(s.innerText) });
    } else {
      // text was typed outside the mapped spans (e.g. everything deleted then
      // retyped) — assign the whole paragraph text to the first run
      edits.push({ path: parsePath(spans[0].dataset.hxt), text: full });
      for (const s of spans.slice(1)) edits.push({ path: parsePath(s.dataset.hxt), text: '' });
    }
  }

  try {
    const nextXml = applyTextEdits(state.sectionXmls[sec], edits);
    pushUndo();
    state.sectionXmls[sec] = nextXml;
    state.dirty = true;
    renderStyled();
    setStatus('수정됨 — [수정본 저장]을 눌러 .hwpx로 저장하세요.', true);
  } catch (err) {
    renderStyled(); // revert the DOM to the last good state
    setStatus(`수정 반영 실패: ${err.message}`);
  }
}

function parsePath(s) {
  return s.split('.').map(Number);
}

// ---- undo / redo --------------------------------------------------------

function pushUndo() {
  state.undo.push([...state.sectionXmls]);
  if (state.undo.length > 100) state.undo.shift();
  state.redo = [];
}

function undo() {
  if (!state.undo.length) return;
  state.redo.push([...state.sectionXmls]);
  state.sectionXmls = state.undo.pop();
  state.dirty = true;
  renderStyled();
  setStatus('실행 취소됨.', state.undo.length > 0 || state.dirty);
}

function redoEdit() {
  if (!state.redo.length) return;
  state.undo.push([...state.sectionXmls]);
  state.sectionXmls = state.redo.pop();
  state.dirty = true;
  renderStyled();
  setStatus('다시 실행됨.', true);
}

$('undo-btn').addEventListener('click', undo);
$('redo-btn').addEventListener('click', redoEdit);
document.addEventListener('keydown', (e) => {
  if (state.mode !== 'edit' || !(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
    e.preventDefault();
    redoEdit();
  } else if (k === 's') {
    e.preventDefault();
    saveEdited();
  }
});

// ---- find & replace -----------------------------------------------------

$('edit-apply').addEventListener('click', () => {
  const search = $('edit-search').value;
  const replace = $('edit-replace').value;
  if (!search) {
    setStatus('찾을 텍스트를 입력하세요.');
    return;
  }
  let count = 0;
  let skipped = 0;
  const next = state.sectionXmls.map((xml) => {
    const res = replaceTextAcrossRuns(xml, search, replace);
    count += res.count;
    skipped += res.skipped;
    return res.xml;
  });
  if (count === 0) {
    setStatus(`"${search}" — 찾지 못했습니다.${skipped ? ` (형광펜·필드 구간에 걸린 ${skipped}곳은 건너뜀 — 직접 클릭해 수정하세요)` : ''}`);
    return;
  }
  pushUndo();
  state.sectionXmls = next;
  state.dirty = true;
  renderStyled();
  setStatus(`${count}곳 치환됨${skipped ? ` (형광펜·필드 구간 ${skipped}곳은 건너뜀)` : ''} — [수정본 저장]으로 .hwpx 저장.`, true);
});

// ---- save ---------------------------------------------------------------

$('save-btn').addEventListener('click', saveEdited);

async function saveEdited() {
  if (!state.doc || !state.dirty) {
    setStatus('저장할 변경 사항이 없습니다.');
    return;
  }
  try {
    const replacements = new Map();
    for (let i = 0; i < state.sectionXmls.length; i++) {
      replacements.set(state.doc.sectionPaths[i], state.sectionXmls[i]);
    }
    const bytes = await rebuildHwpx(state.doc, replacements);

    // self-check: reopen with our own reader before handing it out
    const check = await openHwpx(bytes);
    if (check.warnings.length) throw new Error(`재검증 경고: ${check.warnings.join(', ')}`);

    const outName = state.name.replace(/\.hwpx$/i, '').replace(/\.edited$/i, '') + '.edited.hwpx';
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/hwp+zip' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setStatus(`저장됨: ${outName} (${(bytes.length / 1024).toFixed(1)} KB) — 원본은 그대로입니다.`);
  } catch (err) {
    setStatus(`저장 실패: ${err.message}`);
  }
}

// ---- status / error -----------------------------------------------------

function setStatus(msg, unsaved = false) {
  const el = $('edit-status');
  el.textContent = msg;
  $('save-btn').classList.toggle('attention', unsaved);
}

function showError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  $('error').style.display = 'none';
}
