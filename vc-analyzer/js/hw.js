// HW tab (A2, SERVER_API.md §11): the provisional Arch Model L0 result of this frame and stream,
// its config (read-only from the manifest; with `vca serve` an editor built from
// GET api/arch/schema), recalculation (slot a: the w / f fills), a comparison run
// (slot b), saved configs, YAML import and download.
// Edits live here (draft, one per analysis while the page lives) until Recalculate; values are
// checked by the server (POST api/arch/validate) field by field, so every message is the server's sentence.
import { hasArch, state } from './state.js?v=4a164c6c45';
import { $, esc, fmt, typeName } from './util.js?v=4a164c6c45';
import { bustCache, caps, streamTitle } from './data.js?v=4a164c6c45';
import { api, toast } from './api.js?v=4a164c6c45';
import { archOf } from './arch.js?v=4a164c6c45';
import { openSource } from './source.js?v=4a164c6c45';
import { renderTab } from './inspector.js?v=4a164c6c45';
import { selectFrame } from './frames.js?v=4a164c6c45';
import { trackJob } from './jobs.js?v=4a164c6c45';
import { writeHash } from './hash.js?v=4a164c6c45';

// What the model is, for someone who installed the app (R48 QA D10: no repository paths)
const DRAFT_NOTE = 'Provisional L0 HW model (draft): placeholder parameters unless you load your own. It counts cycles of five modules per superblock from the blocks, symbols and motion vectors of the analysis; caches and stalls are not modelled. ARCH_MODEL.md in the VC Analyzer folder describes every assumption.';
// headings of the schema's groups (by lower-case name; other groups show their own name)
const GROUP_TITLES = { general: 'General', ent: 'ENT: entropy decoder', iqt: 'IQT: inverse quantization and transform', prd: 'PRD: prediction',
  lpf: 'LPF: in-loop filters', mem: 'MEM: external memory', interp: 'Interpolation', interpolation: 'Interpolation' };
const NUM = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/;
const VALIDATE_MS = 300;
const MAX_IMPORT = 1024 * 1024;   // the server refuses bodies over 1 MB (413 too_large)
// saved-config names: the server's [\w.-]{1,64} (letters of any script), not starting with a dot
const NAME_RE = /^[\p{L}\p{M}\p{N}_.-]{1,64}$/u;
const NAME_RULE = 'A config name uses letters, digits, dot, dash and underscore (1 to 64 characters) and does not start with a dot.';
const TAPS_NOTE = 'used only with rules = fixed';

// schema: {fields, default} or null; noSchema: the server has no §11 routes
const hw = {
  schema: null, schemaReq: null, noSchema: false,
  saved: null, savedReq: null,
  sum: null, sumKey: '', sumReq: null,        // GET api/a/<aid>/arch for sumKey = aid + rev
  base: '', raw: {}, errors: {}, msg: null,   // draft of the stream at `base`: key -> typed text; key -> server message
  origin: null,                               // the config the draft started from (slot a's, or the example)
  loaded: null,                               // {name, config}: the saved config the draft came from
  drafts: new Map(),                          // base -> {raw, loaded, origin, dirty}: drafts of the other analyses
  checking: false, checkSeq: 0, checkTimer: 0,
  jobs: new Map(),                            // job id -> {aid, slot, active}, arch jobs this page started
  runs: new Map(),                            // aid|slot -> {label, config} of the last job this page started there
  saveOpen: false, saveName: '',
  confirm: null,                              // {kind: 'replace' | 'delete', name}: the inline question
  helpKey: '',                                // the field whose help line shows (the last one focused)
};

// ------------------------------------------------------------- helpers
const getKey = (obj, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
function setKey(obj, key, v) {
  const parts = key.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) { if (!o[p] || typeof o[p] !== 'object') o[p] = {}; o = o[p]; }
  o[parts[parts.length - 1]] = v;
}
// nested config -> [[dotted key, value]] (read-only view)
function flat(obj, pre = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flat(v, pre + k + '.'));
    else out.push([pre + k, v]);
  }
  return out;
}
const pct = (v, d = 2) => (v === null || v === undefined ? '–' : `${(100 * v).toFixed(d)}%`);
const mhz = (v) => (v === null || v === undefined ? '–' : `${fmt(v, 3)} MHz`);
const mbs = (v) => (v === null || v === undefined ? '–' : `${fmt(v, 2)} MB/s`);
const change = (a, b) => (a ? (b - a) / a * 100 : null);
const changeText = (c) => (c === null ? '–' : `${c > 0 ? '+' : ''}${c.toFixed(1)}%`);
const changeCls = (c) => (c === null || Math.abs(c) < 0.05 ? '' : c > 0 ? 'hw-up' : 'hw-down');
const fieldOf = (key) => (hw.schema ? hw.schema.fields.find((f) => f.key === key) : null);
// "MEM bytes per clock" for a module key, the label itself for the others
function fieldName(f) {
  const l = f.label || f.key;
  return f.key.startsWith('modules.') ? `${f.group} ${l[0].toLowerCase()}${l.slice(1)}` : l;
}
// The server's sentence about one key, with the field's name for the key ("Clock must be a number.").
function fieldMsg(f, m) {
  let t = String(m || '').replace(/^The HW config is not valid:\s*/, '').split(f.key).join(fieldName(f));
  t = t[0] ? t[0].toUpperCase() + t.slice(1) : t;
  return /[.!?]$/.test(t) ? t : t + '.';
}
// interp taps count only with rules = fixed (SERVER_API.md §11, arch.CONFIG_FIELDS help)
const tapsOff = (f) => /^interp\..*taps$/.test(f.key) && hw.raw['interp.rules'] === 'codec';

// The open stream's library entry when the server can run arch jobs on it.
function entry() {
  if (!caps.jobs || state.diff || !state.source || state.source.kind !== 'url') return null;
  const s = state.streams[state.streamIdx];
  return s && s.base === state.source.base ? s : null;
}
export const hwEditable = () => !!(entry() && hw.schema);
// The HW tab: with an HW result, or where the server can make one.
export const hwTabShown = () => hasArch() || !!entry();

// The config text the user typed, as values for the server: numbers when they parse,
// else the text itself (the server answers bad_config with its sentence).
function draftConfig(raw = hw.raw) {
  const cfg = JSON.parse(JSON.stringify(hw.schema.default));
  for (const f of hw.schema.fields) {
    const t = raw[f.key];
    if (t === undefined) continue;
    let v = t;
    if (f.type !== 'choice') v = NUM.test(t) ? Number(t) : t;
    setKey(cfg, f.key, v);
  }
  return cfg;
}
function rawOf(cfg) {
  const raw = {};
  for (const f of hw.schema.fields) { const v = getKey(cfg, f.key); raw[f.key] = v === undefined ? String(getKey(hw.schema.default, f.key)) : String(v); }
  return raw;
}
function setDraft(cfg) {
  hw.raw = rawOf(cfg);
  hw.errors = {};
}
const isChanged = (f) => {
  const d = getKey(hw.schema.default, f.key), t = hw.raw[f.key];
  return f.type === 'choice' ? t !== String(d) : !(NUM.test(t) && Number(t) === Number(d));
};
const sameConfig = (a, b) => JSON.stringify(flat(a).sort()) === JSON.stringify(flat(b).sort());
// The saved config the boxes hold exactly ('' = none): jobs then send config_name, so the result is named.
const savedName = () => (hw.loaded && hw.schema && sameConfig(draftConfig(), hw.loaded.config) ? hw.loaded.name : '');
// What the boxes are, in words: the saved name, "edited from <name>", the example, or unsaved.
function draftLabel() {
  const n = savedName();
  if (n) return n;
  if (hw.loaded) return `edited from ${hw.loaded.name}`;
  return sameConfig(draftConfig(), hw.schema.default) ? 'example config' : 'unsaved config';
}
const isDirty = () => !!(hw.schema && hw.origin && !sameConfig(draftConfig(), hw.origin));
// The boxes differ from the config of the result shown (slot a): Recalculate has not run them.
const pendingRun = () => !!(hw.schema && state.manifest && state.manifest.arch && state.manifest.arch.config
  && !sameConfig(draftConfig(), state.manifest.arch.config));

// ------------------------------------------------------------- loading
function loadSchema() {
  if (hw.schema || hw.noSchema || hw.schemaReq || !caps.jobs) return;
  hw.schemaReq = api('api/arch/schema').then((s) => { hw.schema = s; }).catch(() => { hw.noSchema = true; })
    .finally(() => { hw.schemaReq = null; rerender(); });
}
function loadSaved(force = false) {
  if ((hw.saved && !force) || hw.savedReq || !caps.jobs) return hw.savedReq;
  hw.savedReq = api('api/hw-configs').then((l) => { hw.saved = l || []; }).catch(() => { hw.saved = hw.saved || []; })
    .finally(() => { hw.savedReq = null; rerender(); });
  return hw.savedReq;
}
const sumKeyNow = () => { const e = entry(); return e ? `${e.id}@${state.source.rev || 0}` : ''; };
function loadSum(force = false) {
  const e = entry(), key = sumKeyNow();
  if (!e || !hw.schema || (hw.sumKey === key && hw.sum && !force) || hw.sumReq) return hw.sumReq;
  hw.sumReq = api(`api/a/${encodeURIComponent(e.id)}/arch`).then((s) => { hw.sum = s; hw.sumKey = key; })
    .catch(() => { hw.sum = null; hw.sumKey = key; })
    .finally(() => { hw.sumReq = null; rerender(); });
  return hw.sumReq;
}
// The draft follows the open stream: an unsaved draft of that analysis kept from earlier in
// this page, else its slot a config, else the example.  The draft being left is kept the same way.
function syncDraft() {
  if (!hw.schema || !state.source) return;
  if (hw.base === state.source.base) return;
  if (hw.base) hw.drafts.set(hw.base, { raw: hw.raw, loaded: hw.loaded, origin: hw.origin, dirty: isDirty() });
  hw.base = state.source.base;
  hw.msg = null; hw.confirm = null; hw.errors = {};
  const M = state.manifest.arch, now = (M && M.config) || hw.schema.default;
  const d = hw.drafts.get(hw.base);
  hw.drafts.delete(hw.base);
  hw.loaded = d ? d.loaded : null;
  hw.origin = now;
  if (d && d.dirty) {
    hw.raw = { ...d.raw };
    setTimeout(scheduleCheck, 0);   // its marks come back from the server's check
  } else setDraft(now);
}

// Re-renders the tab when it is shown, keeping the focus and caret of a config box.
function rerender() {
  if (state.tab !== 'hw' || !state.manifest || !state.payload) return;
  const a = document.activeElement;
  const key = a && a.dataset && a.closest && a.closest('#tabBody') ? (a.dataset.hwKey || a.id) : null;
  const pos = a && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  renderTab();
  if (!key) return;
  const n = document.querySelector(`#tabBody [data-hw-key="${CSS.escape(key)}"]`) || document.getElementById(key);
  if (n) { n.focus(); if (pos && typeof n.setSelectionRange === 'function') { try { n.setSelectionRange(pos[0], pos[1]); } catch (e) { /* select */ } } }
}

// ------------------------------------------------------------- render
export function renderHwTab() {
  loadSchema();
  if (hw.schema) { syncDraft(); loadSum(); if (entry()) loadSaved(); }
  const M = state.manifest.arch;
  let html = `<h2>HW model</h2><p class="hw-draft">${esc(DRAFT_NOTE)}</p>${limitsHtml(M)}`;
  html += M ? resultHtml(M) : `<p class="sub">This analysis has no HW model yet.${entry() ? ' Calculate it with the example config below, or change the config first.' : ' Open the stream in the VC Analyzer app to calculate one (or run "python -m vca arch &lt;analysis&gt;" and open it again).'}</p>`;
  if (entry() && hw.noSchema) html += '<p class="note">This server does not offer HW config editing (it answers no api/arch/schema). Update vca serve to edit and recalculate here.</p>';
  if (hwEditable()) html += compareHtml();   // above the editor: it is what Compare as B produces
  html += hwEditable() ? editorHtml() : (M ? readonlyHtml(M) : '');
  return html;
}

// What the model leaves out (arch summary notes), under the draft line.
function limitsHtml(M) {
  const S = hw.sum && hw.sum.a;
  const notes = (M && M.summary && M.summary.notes) || (S && S.summary && S.summary.notes) || [];
  if (!notes.length) return '';
  return `<p class="note" id="hwLimits">Model limits: ${notes.map((n) => esc(n)).join('; ')}.</p>`;
}

function resultHtml(M) {
  const A = archOf(state.payload), fr = A && A.frame, s = M.summary || {}, cfg = M.config || {};
  const fps = Number(cfg.fps) || 0;
  const src = configLabel('a');
  let out = `<p class="sub" id="hwConfigLine">Config: ${esc(src)}. ${fmt(Number(cfg.clock_mhz))} MHz, ${fmt(fps)} fps, ${esc(cfg.pipeline || '?')} pipeline.</p>`;
  out += `<h3>Frame ${state.f}</h3>`;
  if (fr && fr.modeled) {
    out += `<dl class="kv" id="hwFrame">${kv('Budget', `${fmt(Math.round(fr.budget))} cycles per frame`)}${kv('Cycles', fmt(Math.round(fr.cycles)))}`
      + `${kv('Utilization', pct(fr.utilization, 3))}${kv('Bottleneck', esc(fr.bottleneck))}`
      + `${kv('Required clock', mhz(fr.cycles * fps / 1e6), 'for this frame at the target frame rate')}`
      + `${kv('Bandwidth', mbs((fr.fetch_bytes + fr.write_bytes) * fps / 1e6), `fetch ${fmt(fr.fetch_bytes / 1024, 1)} KB, write ${fmt(fr.write_bytes / 1024, 1)} KB`)}`
      + `${kv('Modules', Object.entries(fr.modules || {}).map(([k, v]) => `${esc(k)} ${fmt(Math.round(v))}`).join(', '), 'cycles')}</dl>`;
  } else {
    out += `<p class="note">${fr && fr.note ? esc(fr.note[0].toUpperCase() + fr.note.slice(1)) + '.' : 'The HW model has no estimate for this frame.'}</p>`;
  }
  out += '<h3>Stream</h3>';
  const bn = Object.entries(s.bottlenecks || {}).filter(([, n]) => n).map(([k, n]) => `${esc(k)} ${n}`).join(', ');
  out += `<dl class="kv" id="hwStream">${kv('Frames modeled', `${fmt(s.modeled)} of ${fmt(s.frames)}`)}`
    + `${kv('Worst frame', s.worst_frame === undefined ? '–' : `${s.worst_frame}: ${fmt(Math.round(s.worst_cycles))} cycles, ${pct(s.worst_utilization, 3)}`)}`
    + `${kv('Mean utilization', pct(s.mean_utilization, 3))}`
    + `${kv('Required clock', mhz(s.required_clock_mhz), `worst frame; mean ${mhz(s.mean_required_clock_mhz)}`)}`
    + `${kv('Peak bandwidth', mbs(s.peak_mb_per_s), `mean ${mbs(s.mean_mb_per_s)}`)}`
    + `${kv('Bottleneck', bn || '–', 'frames per module')}</dl>`;
  return out;
}
const kv = (k, v, unit) => `<dt>${esc(k)}</dt><dd>${v}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</dd>`;

// Which config a slot was made with: the saved name, the file of `vca arch --config`, what this
// page ran there ("edited from <name>"), or the example.
function configLabel(slot) {
  const S = hw.sum && hw.sum[slot], M = state.manifest.arch;
  if (S && S.config_name) return S.config_name;
  // without the server's summary (static site, folder) the manifest is all there is;
  // with it, config_name is the whole truth (a GUI edit runs from a temporary file)
  if (!S && slot === 'a' && M && M.config_name) return M.config_name;
  if (!S && slot === 'a' && M && M.config_file) return M.config_file;
  const cfg = slot === 'a' ? M && M.config : S && S.config;
  const e = entry(), run = e && hw.runs.get(`${e.id}|${slot}`);
  if (run && cfg && sameConfig(run.config, cfg)) return run.label;
  if (hw.schema && cfg && sameConfig(cfg, hw.schema.default)) return 'example config';
  return hw.schema ? 'unsaved config' : 'placeholder config';
}

function readonlyHtml(M) {
  const rows = flat(M.config).map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
  return `<h3>Config</h3><table class="grid hw-ro" id="hwConfigRO"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note">Editing the config and recalculating need the VC Analyzer app on your computer (or the local GUI, python -m vca serve &lt;analysis&gt;).</p>`;
}

function editorHtml() {
  const S = hw.schema, busy = activeJobs();
  const groups = [...new Set(S.fields.map((f) => f.group))];   // the schema's order (DEFAULT_CONFIG)
  let rows = '';
  for (const g of groups) {
    const fs = S.fields.filter((f) => f.group === g);
    if (!fs.length) continue;
    rows += `<h4 class="hw-group">${esc(GROUP_TITLES[String(g).toLowerCase()] || g)}</h4>`;
    for (const f of fs) rows += fieldHtml(f);
  }
  const saved = hw.saved || [];
  const from = hw.loaded ? hw.loaded.name : '';
  const opts = saved.length
    ? `<option value="">Load a saved config…</option>${saved.map((c) => `<option value="${esc(c.name)}" ${c.name === from ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`
    : '<option value="">No saved configs yet</option>';
  const noA = !state.manifest.arch;
  const block = blockReason();
  const dl = download();
  const del = from && saved.some((c) => c.name === from)
    ? `<button class="btn small" type="button" id="hwDelete" data-hw="delete" title="Delete the saved config ${esc(from)} from the workspace (asks first); the boxes keep their values">Delete ${esc(from)}</button>` : '';
  return `<h3>Config</h3>
    <p class="note">Values differing from the example config are marked "changed". A tap or click in a box shows what it means; Enter in a box recalculates.</p>
    <div class="actions hw-actions">
      <button class="btn primary" type="button" id="hwRecalc" data-hw="recalc" ${block ? 'disabled' : ''} title="${esc(block || recalcTitle(noA))}">${noA ? 'Calculate' : 'Recalculate'}</button>
      <button class="btn" type="button" id="hwCompare" data-hw="compare" ${block || noA ? 'disabled' : ''} title="${esc(noA ? 'Calculate the HW model first; B is compared with it' : block || 'Run this config as B and compare it frame by frame with the current result (A); the fills keep showing A')}">Compare as B</button>
      <button class="btn" type="button" id="hwReset" data-hw="reset" title="Put every value back to the example config (placeholder parameters)">Reset to example</button>
    </div>
    <p class="status-line" id="hwStatus" ${busy.length || hw.checking ? '' : 'hidden'}>${esc(statusText(busy))}</p>
    <p class="note hw-pending" id="hwPending" ${pendingRun() && !busy.length ? '' : 'hidden'}>Not calculated yet: Recalculate to apply.</p>
    <p class="sub" id="hwDraftWho">Boxes: ${esc(draftLabel())}.</p>
    ${msgHtml('run')}
    <div class="hw-cfg" id="hwConfig">${rows}</div>
    <h3>Saved configs</h3>
    <div class="actions hw-saved">
      <select id="hwLoad" class="hw-select" aria-label="Load a saved config" title="Load a config saved in the workspace (hw_configs) into the editor; Recalculate runs it" ${saved.length ? '' : 'disabled'}>${opts}</select>
      <a class="btn small" id="hwDownload" href="${esc(dl.href)}" download="${esc(dl.file)}" title="Download the values in the boxes as a YAML file for python -m vca arch --config (made in the browser, key order of --print-config)">Download YAML</a>
      ${del}
      <button class="btn small" type="button" id="hwSaveAs" data-hw="save-open" aria-expanded="${hw.saveOpen}" title="Save the values above under a name in the workspace">Save as…</button>
      <label class="btn small file-btn" title="Import a YAML config file (the format of python -m vca arch --config, at most 1 MB); it is checked and saved under its file name">
        <input type="file" id="hwImport" accept=".yaml,.yml,.json,text/yaml" aria-label="Import a YAML config">Import YAML</label>
    </div>
    ${hw.saveOpen ? `<form class="hw-save" id="hwSaveForm"><input type="text" id="hwSaveName" class="hw-in mono" value="${esc(hw.saveName)}" placeholder="name, e.g. my-asic-v1" spellcheck="false" autocomplete="off" aria-label="Name of the saved config" title="${esc(NAME_RULE)}">
      <button class="btn small" type="submit" id="hwSaveBtn" title="Save the config under this name (Enter); a config of the same name is replaced after you confirm">Save</button>
      <button class="btn small" type="button" data-hw="save-cancel" title="Close without saving (Esc)">Cancel</button></form>` : ''}
    ${confirmHtml()}
    ${msgHtml('saved')}`;
}
const recalcTitle = (noA) => (noA ? 'Run the HW model with this config; the w and f fills appear when it is done' : 'Run the HW model again with this config; the w and f fills and this tab update when it is done');

function confirmHtml() {
  const c = hw.confirm;
  if (!c) return '';
  const q = c.kind === 'replace' ? `Replace ${c.name}?` : `Delete ${c.name}?`;
  const yes = c.kind === 'replace' ? `Replace the saved config ${c.name} with the values above` : `Delete the saved config ${c.name} from the workspace`;
  return `<p class="hw-confirm" id="hwConfirm" role="alert"><span>${esc(q)}</span>
    <button class="btn small" type="button" id="hwConfirmYes" data-hw="confirm-yes" title="${esc(yes)}">Yes</button>
    <button class="btn small" type="button" id="hwConfirmNo" data-hw="confirm-no" title="Keep ${esc(c.name)} as it is">No</button></p>`;
}

// A server or input message: next to the run buttons, or under the saved configs (load, save, import).
const msgHtml = (at) => (hw.msg && (hw.msg.at || 'run') === at
  ? `<p class="problem" id="hwMsg"><b>${esc(hw.msg.message)}</b>${hw.msg.hint ? ` <span class="hint">${esc(hw.msg.hint)}</span>` : ''}</p>` : '');

function fieldHtml(f) {
  const t = hw.raw[f.key] ?? '', err = hw.errors[f.key], ch = isChanged(f), off = tapsOff(f);
  const d = getKey(hw.schema.default, f.key);
  const id = 'hw-' + f.key.replace(/[^\w-]/g, '-');
  const tip = `${f.help || ''} Key ${f.key}; example ${d}${f.unit ? ' ' + f.unit : ''}.`.trim();
  const bad = err ? ' bad' : '';
  const input = f.type === 'choice'
    ? `<select class="hw-in${bad}" id="${id}" data-hw-key="${esc(f.key)}" title="${esc(tip)}" aria-invalid="${!!err}" aria-describedby="${id}-help">${(f.choices || []).map((c) => `<option value="${esc(c)}" ${String(c) === t ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`
    : `<input class="hw-in mono${bad}" id="${id}" data-hw-key="${esc(f.key)}" type="text" inputmode="decimal" value="${esc(t)}" spellcheck="false" autocomplete="off" title="${esc(off ? `${tip} Not used now: ${TAPS_NOTE}.` : tip)}" aria-invalid="${!!err}" aria-describedby="${id}-help" ${off ? 'disabled' : ''}>`;
  return `<div class="hw-row${err ? ' bad' : ch ? ' changed' : ''}${off ? ' off' : ''}${f.key === hw.helpKey ? ' help' : ''}" data-row="${esc(f.key)}">
    <label for="${id}" title="${esc(tip)}">${esc(f.label || f.key)}</label>${input}<span class="unit">${esc(f.unit || '')}</span>
    <span class="hw-help" id="${id}-help">${esc(f.help || '')} <span class="mono">${esc(f.key)}</span>, example ${esc(d)}${f.unit ? ' ' + esc(f.unit) : ''}.</span>
    <span class="hw-off" ${off ? '' : 'hidden'}>Not used now: ${esc(TAPS_NOTE)}.</span>
    <span class="hw-ch" ${ch && !err ? '' : 'hidden'}>changed, example ${esc(d)}</span>
    <span class="hw-err" ${err ? '' : 'hidden'} title="${esc(err ? `${err} (key ${f.key})` : '')}">${esc(err ? fieldMsg(f, err) : '')}</span></div>`;
}

// Why Recalculate / Compare cannot run now, or '' when they can.
function blockReason() {
  const n = Object.keys(hw.errors).length;
  if (n) return n > 1 ? `Fix the ${n} marked values first` : 'Fix the marked value first';
  if (hw.checking) return 'Checking the values…';
  if (activeJobs().length) return 'The HW model is running for this analysis; wait until it ends';
  return '';
}
function statusText(busy) {
  if (busy.length) return busy.some((s) => s === 'b') ? 'Calculating comparison B… (job list, bottom right)' : 'Calculating the HW model… (job list, bottom right)';
  return hw.checking ? 'Checking the values…' : '';
}
function activeJobs() {
  const e = entry();
  if (!e) return [];
  return [...hw.jobs.values()].filter((j) => j.aid === e.id && j.active).map((j) => j.slot);
}

function compareHtml() {
  const S = hw.sum;
  if (!S || !S.b) return '';
  const A = S.a, B = S.b;
  if (!A) return '<h3>Comparison</h3><p class="note">B exists but A has no result.</p>';
  const meta = new Map((state.manifest.frames || []).map((m) => [m.f, m]));
  const bf = new Map(B.frames.map((r) => [r.f, r]));
  const rows = A.frames.map((ra) => {
    const rb = bf.get(ra.f) || {};
    const m = meta.get(ra.f), type = m && m.frame_type ? typeName(m.frame_type) : ra.kind;
    if (!ra.modeled) return `<tr class="clickable${ra.f === state.f ? ' cur' : ''}" data-hw-frame="${ra.f}"><td class="num">${ra.f}</td><td>${esc(type)}</td><td colspan="5" class="note">not modeled</td></tr>`;
    const c = change(ra.cycles, rb.cycles);
    const bn = !rb.bottleneck || rb.bottleneck === ra.bottleneck ? esc(ra.bottleneck) : `${esc(ra.bottleneck)} → ${esc(rb.bottleneck)}`;
    return `<tr class="clickable${ra.f === state.f ? ' cur' : ''}" data-hw-frame="${ra.f}"><td class="num">${ra.f}</td><td>${esc(type)}</td><td class="num">${fmt(Math.round(ra.cycles))}</td><td class="num">${fmt(Math.round(rb.cycles))}</td>`
      + `<td class="num ${changeCls(c)}">${changeText(c)}</td><td>${bn}</td><td class="num">${pct(ra.utilization, 2)} → ${pct(rb.utilization, 2)}</td></tr>`;
  }).join('');
  const sa = A.summary || {}, sb = B.summary || {};
  const ck = change(sa.required_clock_mhz, sb.required_clock_mhz), cb = change(sa.peak_mb_per_s, sb.peak_mb_per_s);
  return `<h3 id="hwCmpHead">Comparison: A vs B</h3>
    <p class="sub" id="hwCmpWho">A = ${esc(configLabel('a'))} (the fills); B = ${esc(configLabel('b'))}.</p>
    <p class="sub" id="hwCmpKeys">${esc(diffKeys(A.config, B.config))}</p>
    <dl class="kv" id="hwCmpSum">${kv('Worst frame', `A ${fmt(sa.worst_frame)} (${fmt(Math.round(sa.worst_cycles))} cycles), B ${fmt(sb.worst_frame)} (${fmt(Math.round(sb.worst_cycles))} cycles)`)}
      ${kv('Required clock', `A ${mhz(sa.required_clock_mhz)}, B ${mhz(sb.required_clock_mhz)} <span class="${changeCls(ck)}">(${changeText(ck)})</span>`)}
      ${kv('Peak bandwidth', `A ${mbs(sa.peak_mb_per_s)}, B ${mbs(sb.peak_mb_per_s)} <span class="${changeCls(cb)}">(${changeText(cb)})</span>`)}</dl>
    <div class="hw-cmp"><table class="grid" id="hwCmpTable"><thead><tr><th class="num">Frame</th><th>Type</th><th class="num">Cycles A</th><th class="num">Cycles B</th><th class="num">Change</th><th title="The module that sets the frame's cycles, A → B when it differs">Bottleneck</th><th class="num" title="Cycles over the frame budget, A → B">Utilization</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">Change = (B − A) / A of the frame's cycles. Click a row to show that frame.</p>
    <div class="actions"><button class="btn" type="button" id="hwCmpRemove" data-hw="remove-b" title="Delete comparison B (arch_b.json); A and the fills stay">Remove comparison</button></div>`;
}
// "B differs in: MEM bytes per clock 32 → 8, Clock 400 → 300." in the schema's order
function diffKeys(a, b) {
  if (!a || !b || !hw.schema) return '';
  const d = hw.schema.fields.filter((f) => String(getKey(a, f.key)) !== String(getKey(b, f.key)))
    .map((f) => `${fieldName(f)} ${getKey(a, f.key)} → ${getKey(b, f.key)}`);
  return d.length ? `B differs in: ${d.join(', ')}.` : 'B has the same config as A.';
}

// ------------------------------------------------------------- YAML download (made here)
// The boxes as YAML in the key order of `python -m vca arch --print-config` (the schema's default
// config is DEFAULT_CONFIG in that order), the help texts as comments like arch.config_yaml.
function yamlScalar(v) {
  if (typeof v === 'number') return String(v);
  const s = String(v);
  const plain = /^\p{L}[\p{L}\p{N}_.-]*$/u.test(s) && !['true', 'false', 'null', 'yes', 'no', 'on', 'off'].includes(s.toLowerCase());
  return plain ? s : JSON.stringify(s);
}
function draftYaml() {
  const cfg = draftConfig();
  const lines = ['# vca arch: HW config for the Arch Model L0 (draft), downloaded from the VC Analyzer HW tab.',
    '# Placeholder numbers unless you put your own.  Use: python -m vca arch <analysis> --config <this file>.', ''];
  const walk = (def, where, indent) => {
    for (const k of Object.keys(def)) {
      const key = where + k, pad = '  '.repeat(indent);
      if (def[k] && typeof def[k] === 'object') {
        if (!indent) lines.push('');
        lines.push(`${pad}${k}:`);
        walk(def[k], key + '.', indent + 1);
        continue;
      }
      const f = fieldOf(key);
      let line = `${pad}${k}: ${yamlScalar(getKey(cfg, key))}`;
      if (f && f.help) line = `${line.padEnd(36)} # ${f.help}${f.unit ? ` [${f.unit}]` : ''}`;
      lines.push(line);
    }
  };
  walk(hw.schema.default, '', 0);
  return lines.join('\n') + '\n';
}
function download() {
  const name = savedName() || (hw.loaded ? `${hw.loaded.name}-edited` : 'hw-config');
  return { href: 'data:text/yaml;charset=utf-8,' + encodeURIComponent(draftYaml()), file: `${name}.yaml` };
}

// ------------------------------------------------------------- actions
export function initHw() {
  const body = $('#tabBody');
  body.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.hwKey;
    if (k && e.target.tagName === 'INPUT') { hw.raw[k] = e.target.value; markRow(k); scheduleCheck(); }
    if (e.target.id === 'hwSaveName') hw.saveName = e.target.value;
  });
  body.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.hwKey;
    if (k && e.target.tagName === 'SELECT') {
      hw.raw[k] = e.target.value;
      if (k === 'interp.rules') rerender(); else markRow(k);   // the tap boxes follow the rule
      scheduleCheck();
    }
    if (e.target.id === 'hwLoad' && e.target.value) loadConfig(e.target.value);
    if (e.target.id === 'hwImport' && e.target.files && e.target.files[0]) importFile(e.target.files[0], e.target);
  });
  // the help line of the field focused last stays until another field takes the focus (a phone has
  // no hover; hiding it on blur would move the buttons below between press and release)
  body.addEventListener('focusin', (e) => {
    const k = e.target.dataset && e.target.dataset.hwKey;
    if (!k || k === hw.helpKey) return;
    hw.helpKey = k;
    for (const r of body.querySelectorAll('.hw-row')) r.classList.toggle('help', r.dataset.row === k);
  });
  body.addEventListener('submit', (e) => { if (e.target.id === 'hwSaveForm') { e.preventDefault(); saveAs(); } });
  body.addEventListener('keydown', (e) => {
    if (e.target.id === 'hwSaveName' && e.key === 'Escape') { e.preventDefault(); hw.saveOpen = false; hw.confirm = null; rerender(); }
    // Enter in a config box: Recalculate once the server has checked the value
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.hwKey && e.target.tagName === 'INPUT') { e.preventDefault(); recalcWhenChecked(); }
  });
  body.addEventListener('click', (e) => {
    const row = e.target.closest('[data-hw-frame]');
    if (row) { selectFrame(+row.dataset.hwFrame); return; }
    if (e.target.closest('#hwDownload') && Object.keys(hw.errors).length) {
      e.preventDefault();
      hw.msg = { message: `Cannot download: ${errorList()} not valid.`, hint: 'Fix the marked values first.', at: 'saved', invalid: true };
      rerender();
      return;
    }
    const b = e.target.closest('[data-hw]');
    if (!b || b.disabled) return;
    const act = b.dataset.hw;
    if (act === 'recalc') startJob('a');
    else if (act === 'compare') startJob('b');
    else if (act === 'reset') { setDraft(hw.schema.default); hw.loaded = null; hw.msg = null; rerender(); scheduleCheck(); }
    else if (act === 'remove-b') removeB();
    else if (act === 'save-open') { hw.saveOpen = !hw.saveOpen; hw.confirm = null; rerender(); if (hw.saveOpen) { const n = $('#hwSaveName'); if (n) n.focus(); } }
    else if (act === 'save-cancel') { hw.saveOpen = false; hw.confirm = null; rerender(); }
    else if (act === 'delete') { hw.confirm = { kind: 'delete', name: hw.loaded.name }; hw.msg = null; rerender(); focusConfirm(); }
    else if (act === 'confirm-no') { hw.confirm = null; rerender(); }
    else if (act === 'confirm-yes') {
      const c = hw.confirm;
      hw.confirm = null;
      if (c && c.kind === 'replace') save(c.name); else if (c && c.kind === 'delete') deleteSaved(c.name);
    }
  });
}
function focusConfirm() { const n = $('#hwConfirmNo'); if (n) n.focus(); }
// "Clock and MEM bytes per clock are" for the messages about invalid values
function errorList() {
  const names = Object.keys(hw.errors).map((k) => { const f = fieldOf(k); return f ? fieldName(f) : k; });
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are` : `${names[0]} is`;
}

// Marks one row (changed, message) without rebuilding the tab under the caret.
function markRow(k) {
  const row = document.querySelector(`#tabBody [data-row="${CSS.escape(k)}"]`);
  const f = fieldOf(k);
  if (!row || !f) return;
  const ch = isChanged(f), err = !!hw.errors[k];
  row.classList.toggle('changed', ch && !err);
  row.classList.toggle('bad', err);
  row.querySelector('.hw-ch').hidden = !ch || err;
}
function syncControls() {
  if (state.tab !== 'hw') return;
  for (const f of (hw.schema ? hw.schema.fields : [])) {
    const row = document.querySelector(`#tabBody [data-row="${CSS.escape(f.key)}"]`);
    if (!row) continue;
    const err = hw.errors[f.key], el = row.querySelector('.hw-err'), inp = row.querySelector('[data-hw-key]');
    el.textContent = err ? fieldMsg(f, err) : ''; el.hidden = !err; el.title = err ? `${err} (key ${f.key})` : '';
    if (inp) { inp.classList.toggle('bad', !!err); inp.setAttribute('aria-invalid', String(!!err)); }
    markRow(f.key);
  }
  const block = blockReason(), noA = !state.manifest.arch, busy = activeJobs();
  const rc = $('#hwRecalc'), cp = $('#hwCompare'), st = $('#hwStatus'), pend = $('#hwPending'), who = $('#hwDraftWho'), dl = $('#hwDownload');
  if (rc) { rc.disabled = !!block; rc.title = block || recalcTitle(noA); }
  if (cp) { cp.disabled = !!block || noA; }
  if (st) { const t = statusText(busy); st.textContent = t; st.hidden = !t; }
  if (pend) pend.hidden = !pendingRun() || busy.length > 0;
  if (who) who.textContent = `Boxes: ${draftLabel()}.`;
  if (dl) { const d = download(); dl.href = d.href; dl.setAttribute('download', d.file); }
  const m = $('#hwMsg');
  if (hw.msg && !m) { rerender(); return; }
  if (!hw.msg && m) m.remove();
}

function scheduleCheck() {
  hw.checking = true;
  syncControls();
  clearTimeout(hw.checkTimer);
  hw.checkTimer = setTimeout(check, VALIDATE_MS);
}
// POST api/arch/validate with the draft; the server names the first bad field (error.field), so
// that field goes back to the example value and the rest is checked again, until none is left:
// every invalid box is marked at once.
async function check() {
  const seq = ++hw.checkSeq;
  const errors = {};
  let msg = null;
  const cfg = draftConfig();
  for (let i = 0; i <= hw.schema.fields.length; i++) {
    try {
      await api('api/arch/validate', { method: 'POST', body: { config: cfg } });
      break;
    } catch (e) {
      const f = e.code === 'bad_config' && e.field ? fieldOf(e.field) : null;
      if (!f || errors[f.key]) { if (!f) msg = { message: e.message, hint: e.hint }; break; }
      errors[f.key] = e.message;
      setKey(cfg, f.key, getKey(hw.schema.default, f.key));
    }
    if (seq !== hw.checkSeq) return;
  }
  if (seq !== hw.checkSeq) return;
  hw.checking = false;
  hw.errors = errors;
  // a message about saving or loading stays; a check message replaces the run message
  if (!hw.msg || (hw.msg.at || 'run') === 'run' || msg || (hw.msg.invalid && !Object.keys(errors).length)) hw.msg = msg;
  syncControls();
}

async function recalcWhenChecked() {
  clearTimeout(hw.checkTimer);
  if (hw.checking) await check();
  if (!blockReason()) startJob('a');
}

async function startJob(slot) {
  const e = entry();
  if (!e || blockReason()) return;
  hw.msg = null;
  // the boxes equal a saved config: send its name, so the result records it (config_name)
  const name = savedName();
  const cfg = draftConfig(), label = draftLabel();
  try {
    const job = await api('api/jobs', { method: 'POST', body: name ? { kind: 'arch', aid: e.id, slot, config_name: name } : { kind: 'arch', aid: e.id, slot, config: cfg } });
    hw.jobs.set(job.id, { aid: e.id, slot, active: true });
    hw.runs.set(`${e.id}|${slot}`, { label, config: cfg });
    rerender();
    trackJob(job, { fromPage: true });
  } catch (er) {
    if (er.code === 'bad_config' && er.field) hw.errors[er.field] = er.message;
    else hw.msg = { message: er.message, hint: er.hint };
    rerender();
  }
}

// jobs.js: an arch job ended (any page's), once, by its final state.  Slot a: reload the stream
// keeping frame, selection, fill and view; slot b: read the comparison again.
export async function archJobEnded(job) {
  const mine = hw.jobs.get(job.id);
  if (mine) mine.active = false;
  const slot = (mine && mine.slot) || (job.options && job.options.slot) || 'a';
  const e = entry();
  if (!e || job.analysis !== e.id) { syncControls(); return; }
  if (job.state !== 'succeeded') {
    if (mine && job.state === 'failed') hw.msg = job.error || { message: 'The HW model job failed.', hint: 'Show its log in the job list.' };
    rerender();
    syncControls();
    return;
  }
  if (slot === 'b') {
    await loadSum(true);
    rerender();
    if (mine) {
      toast('Comparison B is ready.');
      const h = $('#hwCmpHead');
      if (h) h.scrollIntoView({ block: 'start' });
    }
    return;
  }
  await reloadStream();
  if (mine) toast('HW model recalculated.');
}

// Reopens the open analysis with fresh data (its JSON is cached by the browser),
// on the same frame, block, fill, tab and view.  An edited draft stays; an untouched one
// follows the new slot a config.
async function reloadStream() {
  const s = entry();
  if (!s) return;
  const keepSel = state.sel >= 0 && state.payload;
  writeHash();
  const rev = bustCache(s.base);
  if (hw.schema && hw.base === s.base) {
    hw.drafts.set(s.base, { raw: hw.raw, loaded: hw.loaded, origin: hw.origin, dirty: isDirty() });
    hw.base = '';
  }
  await openSource({ kind: 'url', base: s.base, rev }, streamTitle(s), { keepView: true });
  if (!keepSel && state.sel >= 0) { state.sel = -1; state.autoPick = false; renderTab(); }
  await loadSum(true);
}

async function removeB() {
  const e = entry();
  if (!e) return;
  try { await api(`api/a/${encodeURIComponent(e.id)}/arch/b`, { method: 'DELETE' }); hw.msg = null; } catch (er) { hw.msg = { message: er.message, hint: er.hint }; }
  await loadSum(true);
  rerender();
}

async function loadConfig(name) {
  hw.confirm = null;
  try {
    const r = await api(`api/hw-configs/${encodeURIComponent(name)}`);
    setDraft(r.config);
    hw.loaded = { name, config: r.config };
    hw.msg = null;
  } catch (er) { hw.msg = { message: er.message, hint: er.hint, at: 'saved' }; }
  rerender();
  scheduleCheck();
}

async function saveAs() {
  const name = ($('#hwSaveName') || {}).value || '';
  hw.saveName = name;
  hw.confirm = null;
  if (!NAME_RE.test(name) || name.startsWith('.')) {
    hw.msg = { message: NAME_RULE, hint: '', at: 'saved' };
    rerender();
    return;
  }
  clearTimeout(hw.checkTimer);
  if (hw.checking) await check();
  if (Object.keys(hw.errors).length) {
    hw.msg = { message: `Cannot save: ${errorList()} not valid.`, hint: 'Fix the marked values first; a saved config must load in python -m vca arch.', at: 'saved', invalid: true };
    rerender();
    return;
  }
  if ((hw.saved || []).some((c) => c.name === name)) {
    hw.confirm = { kind: 'replace', name };
    hw.msg = null;
    rerender();
    focusConfirm();
    return;
  }
  await save(name);
}
async function save(name) {
  try {
    const r = await api(`api/hw-configs/${encodeURIComponent(name)}`, { method: 'PUT', body: { config: draftConfig() } });
    hw.loaded = { name: r.name || name, config: r.config || draftConfig() };
    hw.saveOpen = false; hw.saveName = ''; hw.msg = null;
    await loadSaved(true);
    toast(`Saved the config as ${hw.loaded.name}.`);
  } catch (er) {
    if (er.code === 'bad_config' && er.field) hw.errors[er.field] = er.message;
    hw.msg = { message: er.message, hint: er.hint, at: 'saved' };
  }
  rerender();
}
async function deleteSaved(name) {
  try {
    await api(`api/hw-configs/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (hw.loaded && hw.loaded.name === name) hw.loaded = null;
    hw.msg = null;
    await loadSaved(true);
    toast(`Deleted the saved config ${name}. The boxes keep its values.`);
  } catch (er) { hw.msg = { message: er.message, hint: er.hint, at: 'saved' }; }
  rerender();
}

// Import YAML: the file's text goes to PUT api/hw-configs/<file stem> {yaml}; the server checks it.
async function importFile(file, input) {
  input.value = '';
  const fail = (message, hint = '') => { hw.msg = { message, hint, at: 'saved' }; rerender(); };
  // the stem as a config name: letters of any script, digits, dot, dash, underscore; no leading dot
  const stem = file.name.replace(/\.(ya?ml|json)$/i, '').replace(/[^\p{L}\p{M}\p{N}_.-]+/gu, '_').replace(/^\.+/, '').slice(0, 64) || 'imported';
  if (!file.size) return fail(`${file.name} is empty.`, 'Choose a YAML config file, for example one written by python -m vca arch --print-config.');
  if (file.size > MAX_IMPORT) return fail(`${file.name} is ${fmt(file.size / 1048576, 1)} MB; a HW config file can be at most 1 MB.`, 'A config is a few hundred bytes: check that this is the right file.');
  let text = '';
  try { text = await file.text(); } catch (er) { return fail(`${file.name} could not be read.`); }
  if (!text.trim()) return fail(`${file.name} is empty.`, 'Choose a YAML config file, for example one written by python -m vca arch --print-config.');
  try {
    const r = await api(`api/hw-configs/${encodeURIComponent(stem)}`, { method: 'PUT', body: { yaml: text } });
    setDraft(r.config);
    hw.loaded = { name: r.name || stem, config: r.config };
    hw.msg = null; hw.confirm = null;
    await loadSaved(true);
    toast(`Imported ${file.name} as ${hw.loaded.name}.`);
    scheduleCheck();
  } catch (er) {
    hw.msg = { message: `${file.name}: ${er.message}`, hint: er.hint, at: 'saved' };
  }
  rerender();
}

// Read-only view for window.__vca.snap() (tests).
export function hwSnap() {
  return {
    shown: hwTabShown(), editable: hwEditable(), schema: !!hw.schema, checking: hw.checking,
    errors: { ...hw.errors }, msg: hw.msg ? hw.msg.message : null, current: hw.schema ? savedName() : '',
    from: hw.loaded ? hw.loaded.name : '', label: hw.schema ? draftLabel() : '', pending: pendingRun(),
    dirty: isDirty(), drafts: [...hw.drafts.entries()].filter(([, d]) => d.dirty).map(([b]) => b),
    confirm: hw.confirm ? `${hw.confirm.kind} ${hw.confirm.name}` : null,
    saved: (hw.saved || []).map((c) => c.name), compare: !!(hw.sum && hw.sum.b),
    jobs: [...hw.jobs.entries()].map(([id, j]) => ({ id, slot: j.slot, active: j.active })),
    sumLoaded: !!hw.sum && hw.sumKey === sumKeyNow(),
  };
}
