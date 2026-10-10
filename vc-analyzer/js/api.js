// Talking to `vca serve` (20_analyzer/SERVER_API.md): JSON requests with the
// page's token, server errors as {code, message, hint}, the session and the
// tool health, sizes and dates for the dialogs, and the toast.
import { caps, withToken, writeCaps } from './data.js?v=9ce97af84e';
import { $, esc } from './util.js?v=9ce97af84e';

export class ApiError extends Error {
  constructor(status, code, message, hint, field) { super(message); this.status = status; this.code = code; this.hint = hint || ''; this.field = field || null; }
}
const OFFLINE_HINT = 'Check that the VC Analyzer app (or "python -m vca serve") is still running, then reload this page.';
// Any failure of a request as a problem sentence ({message, hint}): a fetch that could not reach the server
// says what api() says (not the browser's "Failed to fetch"), an HTTP status says which.
export function asProblem(e) {
  if (e instanceof ApiError) return e;
  if (e instanceof TypeError) return new ApiError(0, 'offline', 'The local server did not answer.', OFFLINE_HINT);
  const m = /HTTP (\d+)/.exec(String(e && e.message));
  return m ? new ApiError(+m[1], `http_${m[1]}`, `The server answered HTTP ${m[1]}.`, OFFLINE_HINT)
    : new ApiError(0, 'internal', String((e && e.message) || e), '');
}

// JSON request to the page's server; throws ApiError with the server's message and hint.
export async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, cache: 'no-store' };
  if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers = { 'Content-Type': 'application/json' }; }
  let r;
  try { r = await fetch(path, withToken(path, opts)); } catch (e) {
    throw new ApiError(0, 'offline', 'The local server did not answer.', OFFLINE_HINT);
  }
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!r.ok) {
    const er = (data && data.error) || {};
    throw new ApiError(r.status, er.code || `http_${r.status}`, er.message || `The server answered HTTP ${r.status}.`, er.hint || '', er.field);
  }
  return data;
}

// Plain-text GET (job logs) with one response header.
export async function apiText(path, header) {
  let r;
  try { r = await fetch(path, withToken(path, { cache: 'no-store' })); } catch (e) {
    throw new ApiError(0, 'offline', 'The local server did not answer.', OFFLINE_HINT);
  }
  if (!r.ok) throw new ApiError(r.status, `http_${r.status}`, `The server answered HTTP ${r.status}.`, '');
  return { text: await r.text(), header: header ? r.headers.get(header) : null };
}

// ------------------------------------------------------ session, health
export const server = { session: null, health: null, healthAt: 0 };

// /api/session decides caps.jobs (false in --diff mode and in a server without jobs).
export async function loadSession() {
  if (!caps.server) return null;
  try { server.session = await api('api/session'); } catch (e) { server.session = null; }
  caps.jobs = !!(server.session && server.session.jobs);
  writeCaps();
  return server.session;
}

// /api/health, cached here for 60 s like on the server (the first call also warms WSL).
let healthReq = null;
export function loadHealth(force = false) {
  if (!caps.jobs) return Promise.resolve(null);
  if (!force && server.health && Date.now() - server.healthAt < 60000) return Promise.resolve(server.health);
  if (!healthReq) {
    healthReq = api('api/health').then((h) => { server.health = h; server.healthAt = Date.now(); return h; })
      .catch(() => null).finally(() => { healthReq = null; });
  }
  return healthReq;
}

// Build scripts named when a dumper is missing (GUIDE.md, environment).
const BUILD = {
  av2: 'adapters/build_refs.sh, then adapters/build_dumpers.sh',
  av1: 'adapters/build_refs.sh, then adapters/build_dumpers.sh',
  vvc: 'adapters/vvc_vtm/build_vtm.sh',
  hevc: 'adapters/hevc_hm/build_hm.sh',
  vp9: 'adapters/vp9_vpx/build_libvpx.sh, then CODECS=vp9 adapters/build_dumpers.sh',
  avc: 'adapters/avc_jm/build_jm.sh, then CODECS=avc adapters/build_dumpers.sh',
};
// Health problems as {message, hint, level?} sentences (level 'note': not blocking).  codec: the probed codec (or null);
// skip: problem codes the probe already reported; opts: the chosen checks.
export function healthNotes(h, { codec = null, skip = [], opts = {} } = {}) {
  if (!h) return [];
  const out = [];
  const win = server.session && server.session.platform === 'windows';
  if (win && h.wsl && !h.wsl.ok && !skip.includes('no_wsl')) {
    out.push({ message: `WSL is not available${h.wsl.detail ? ` (${h.wsl.detail})` : ''}: the decoders run inside WSL.`,
      hint: 'Install WSL 2 with Ubuntu ("wsl --install" in a Windows terminal), restart, then build the decoders.' });
  }
  if (h.ffmpeg && !h.ffmpeg.ok && !skip.includes('no_ffmpeg')) {
    out.push({ message: 'FFmpeg was not found: MP4, MKV, WebM and TS files cannot be opened. IVF, OBU and Annex B files still work.',
      hint: win ? 'Install it in WSL: sudo apt install ffmpeg.' : 'Install it: sudo apt install ffmpeg.' });
  }
  const c = codec && h.codecs && h.codecs[codec];
  const C = (codec || '').toUpperCase();
  if (c && !c.dumper && !skip.includes('dumper_missing')) {
    out.push({ message: `The ${C} dumper is not built, so ${C} streams cannot be analyzed yet.`, hint: `Build it with 20_analyzer/${BUILD[codec] || 'adapters/build_dumpers.sh'}.` });
  }
  if (c && c.dumper && !c.refdec && opts.verify) {
    out.push({ message: `The ${C} reference decoder is not built: the check against it will be skipped.`, hint: `Build it with 20_analyzer/${BUILD[codec] || 'adapters/build_refs.sh'}.`, level: 'note' });
  }
  if (c && c.dumper && !c.crossdec && opts.crossdec) {
    out.push({ message: `No second ${C} decoder is built: that check will be skipped.`, hint: 'The build commands are in GUIDE.md in the VC Analyzer folder, section 1 (environment).', level: 'note' });
  }
  return out;
}

// --------------------------------------------------------- formatting
export function fmtBytes(n) {
  if (n === null || n === undefined || !isFinite(n)) return '–';
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}
// Server times are local ISO strings ("2026-10-06T10:20:30") or epoch seconds.
export function parseTime(t) {
  if (t === null || t === undefined || t === '') return null;
  if (typeof t === 'number') return new Date(t < 1e12 ? t * 1000 : t);
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(t) {
  const d = parseTime(t);
  if (!d) return '–';
  const two = (x) => String(x).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}
export function fmtSeconds(s) {
  if (s === null || s === undefined || !isFinite(s)) return '';
  s = Math.max(0, Math.round(s));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
// problem/error {message, hint} as HTML
export const problemHTML = (p) => `<b>${esc(p.message)}</b>${p.hint ? ` <span class="hint">${esc(p.hint)}</span>` : ''}`;

// ----------------------------------------------------------- toast
let toastTimer = null;
// #appToast: one line at the bottom for 4.5 s, above the job tray when they would
// overlap (phone width); it lets clicks through (CSS).  (#toast is the inspector's copy flash.)
export function toast(msg, kind = '') {
  const t = $('#appToast');
  t.textContent = msg;
  t.className = `toast-pop${kind ? ' ' + kind : ''}`;
  t.style.bottom = '';
  t.hidden = false;
  // above the status line, the legend and the job tray when it would cover them (bottom up: a move can
  // bring the toast onto the next one); only those in the lower half of the window
  for (const id of ['#statusbar', '#legend', '#jobTray']) {
    const el = $(id);
    if (!el || el.hidden || !el.getClientRects().length) continue;
    const a = t.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!b.height || b.top < innerHeight / 2) continue;
    if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) t.style.bottom = `${Math.round(innerHeight - b.top + 8)}px`;
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}
