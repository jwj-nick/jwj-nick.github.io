// Reading the data contract from a URL or an opened folder, stream discovery and caps.
import { bLabel, fetchOpts, kindLabel, perfMark, state } from './state.js?v=9ce97af84e';

// The per-run token `vca serve` writes into <meta name="vca-token"> (SERVER_API.md §3).
// Empty on the static site and in an opened folder: then no header is sent.
export const TOKEN = (document.querySelector('meta[name="vca-token"]') || {}).content || '';
// fetch options plus X-VCA-Token for requests to this page's own server
export function withToken(url, opts) {
  if (!TOKEN) return opts;
  try { if (new URL(url, location.href).origin !== location.origin) return opts; } catch (e) { return opts; }
  return { ...(opts || {}), headers: { ...((opts && opts.headers) || {}), 'X-VCA-Token': TOKEN } };
}

// --------------------------------------------------------- data access
// `vca serve` lets the browser cache analysis data (max-age): after an HW model job
// rewrote an analysis, its JSON is fetched with ?r=<revision> (the server ignores it).
const revs = new Map();   // bundle base -> revision
export function bustCache(base) { const r = Date.now(); revs.set(base, r); return r; }
const revOf = (rel) => { const r = revs.get(state.source.base); return r && rel.endsWith('.json') ? `?r=${r}` : ''; };
export async function getJSON(rel) {
  if (state.source.kind === 'files') {
    const file = state.source.map.get(rel);
    if (!file) throw new Error(`${rel} is missing from the opened folder`);
    return JSON.parse(await file.text());
  }
  const url = state.source.base + rel + revOf(rel);
  const r = await fetch(url, withToken(url, fetchOpts));
  if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
  const text = await r.text();
  perfMark('fetch');
  return JSON.parse(text);
}
export async function getBlob(rel) {
  if (state.source.kind === 'files') {
    const file = state.source.map.get(rel);
    if (!file) throw new Error(`${rel} is missing from the opened folder`);
    return file;
  }
  const r = await fetch(state.source.base + rel, withToken(state.source.base + rel, fetchOpts));
  if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
  return r.blob();
}

// What this page can do, decided once by discoverStreams and loadSession (api.js):
//   server  `vca serve` answered api/list: features that need the server may show
//   jobs    the server also opens streams and runs analysis jobs (api/session
//           says jobs: true; false in `vca serve --diff` and in older servers)
//   static  bundles found by URL: the demo index (GitHub Pages) or ?data=<bundle url>
//   folder  "Open bundle" reads a local folder in the browser (every mode)
// The true names also go to <html data-caps="...">: an element marked
// data-needs="server" is hidden unless caps.server, data-needs="jobs" unless
// caps.jobs (app.css).
export const caps = { server: false, jobs: false, static: false, folder: true };
export function writeCaps() {
  document.documentElement.dataset.caps = Object.keys(caps).filter((k) => caps[k]).join(' ');
}

// One picker entry; `entry` keeps the library fields of /api/list (SERVER_API.md §5).
const toStream = (it, listUrl) => ({ id: it.id, title: it.title || it.id, note: it.note, entry: it,
  base: new URL(it.path || it.url, new URL(listUrl, location.href)).href.replace(/\/?$/, '/') });

// Streams offered in the picker: `vca serve` (/api/list) or the static demo
// index, plus an explicit ?data=<bundle url> when it is not one of them.
// A ?data= analysis of this server (api/a/<id>/) that the library no longer lists is not
// offered: goneData() is its URL, and the page says it was deleted (main.js).
let gone = null;
export const goneData = () => gone;
export async function discoverStreams() {
  const params = new URLSearchParams(location.search);
  const list = [];
  for (const url of ['api/list', 'demo/index.json']) {
    try {
      const r = await fetch(url, withToken(url, { cache: 'no-cache' }));
      if (!r.ok) continue;
      const items = await r.json();
      for (const it of items) {
        const s = toStream(it, url);
        if (!list.some((x) => x.base === s.base)) list.push(s);
      }
      caps[url === 'api/list' ? 'server' : 'static'] = true;
      if (list.length || caps.server) break;   // an empty library is still the server's list
    } catch (e) { /* not this mode */ }
  }
  if (params.get('data')) {
    const base = new URL(params.get('data').replace(/\/?$/, '/'), location.href).href;
    const mine = caps.server && base.startsWith(new URL('api/a/', location.href).href);
    if (mine && !list.some((x) => x.base === base)) gone = base;
    else {
      if (!list.some((x) => x.base === base)) list.unshift({ id: 'url', title: params.get('data'), base });
      caps.static = true;
    }
  }
  writeCaps();
  return list;
}

// The server's library again (after a job became ready or an entry was deleted).
export async function listStreams() {
  const r = await fetch('api/list', withToken('api/list', { cache: 'no-store' }));
  if (!r.ok) throw new Error(`api/list: HTTP ${r.status}`);
  return (await r.json()).map((it) => toStream(it, 'api/list'));
}

// ------------------------------------------------------- stream names
// Workspace analyses are named after their source file, so different streams can all be
// "stream.ivf" (R48 QA D2).  One rule names a library entry everywhere (picker, Library,
// Compare, job list, Diff bar and tab, Stream tab, toasts): its name alone while no other
// analysis of the library has that name; else the folder its file sits in ("stream.ivf in
// av1-LLS-smoke-001"); when that folder is missing (an upload), generic or shared too, the end
// of the analysis id as well ("stream.ivf #2fba").  A comparison is "<A> vs <B>" with the two
// names.  Entries of the static demo index (no `kind`) keep their titles.
const GENERIC_DIR = /^(streams?|bitstreams?|videos?|clips?|files?|data|inputs?|outputs?|out|tmp|temp|downloads?|desktop|documents|uploads?|analyses|work|[a-z]:)$/i;
const baseName = (e) => String(e.title || e.name || e.id).replace(/ \([A-Z0-9]+( diff)?\)$/, '');
// the folder that holds a file, unless its name says nothing ("streams", "tmp", a drive)
export function folderOf(path) {
  const parts = String(path || '').split(/[\\/]+/).filter(Boolean);
  const dir = parts.length > 1 ? parts[parts.length - 2] : '';
  return dir && !GENERIC_DIR.test(dir) ? dir : '';
}
// the stream file's own folder (opened by path, or a converted dump file), never the analysis folder
const entryFolder = (e) => { const s = e.source || {}; return (s.kind === 'path' || s.kind === 'convert') && s.path ? folderOf(s.path) : ''; };
// "stream-2fba" -> "2fba"; other ids stay whole
export const shortId = (id) => { const m = /-([0-9a-f]{4,8})$/i.exec(String(id || '')); return m ? m[1] : String(id || ''); };
const isLib = (e) => !!(e && e.kind);
const libEntries = () => state.streams.map((s) => s.entry).filter((e) => isLib(e) && e.kind !== 'diff');
export function streamLabel(e, list = libEntries()) {
  if (!e) return '';
  if (e.kind === 'diff') {
    const a = list.find((x) => x.id === e.a), b = list.find((x) => x.id === e.b);
    return a && b ? `${streamLabel(a, list)} vs ${streamLabel(b, list)}` : baseName(e);
  }
  const name = baseName(e), key = name.toLowerCase();
  const same = list.filter((x) => x.id !== e.id && baseName(x).toLowerCase() === key);
  if (!same.length) return name;
  const dir = entryFolder(e);
  const label = dir ? `${name} in ${dir}` : name;
  return dir && !same.some((x) => entryFolder(x) === dir) ? label : `${label} #${shortId(e.id)}`;
}
// "<label> (<CODEC>)" of a picker entry, as the server's title is built; the demo index's own titles
export const streamTitle = (s) => {
  if (!s) return '';
  const e = s.entry;
  return isLib(e) ? `${streamLabel(e)} (${String(e.codec || '?').toUpperCase()}${e.kind === 'diff' ? ' diff' : ''})` : s.title;
};
// the library entry of an id, and the one on screen (null on the static site and in an opened folder)
export const entryById = (id) => { const s = state.streams.find((x) => x.id === id); return s && isLib(s.entry) ? s.entry : null; };
export const shownEntry = () => { const s = state.streams[state.streamIdx]; return state.source && state.source.kind === 'url' && s && isLib(s.entry) ? s.entry : null; };
// A of the comparison on screen, or the analysis on screen, by the same rule (R49 QA D5): its Library name
// ("stream.ivf in av1-LLS-smoke-001"); `vca serve A B --diff` names the pair "<A> vs <B>" and the manifest's title
// is A's analysis name; a bundle: its title, or for a comparison bundle A's file and kind ("stream.ivf (reference decoder)").
export function aTitle() {
  const e = shownEntry(), man = state.manifest || {}, s = man.stream || {};
  if (e && e.kind !== 'diff') return streamLabel(e);
  if (e && e.a && entryById(e.a)) return streamLabel(entryById(e.a));
  if (e) return man.title || s.name || 'A';
  if (!man.diff) return man.title || s.name || 'this analysis';
  return s.source_kind ? `${s.name || 'A'} (${kindLabel(s.source_kind)})` : (s.name || 'A');
}
// B of the comparison on screen as "<name> (<kind>)": a Library comparison names B by its Library entry,
// and a raw YUV file is "raw YUV" (the converted analysis records it as a C model); else manifest.diff.b.
export function bTitle(b) {
  const e = shownEntry(), be = e && e.kind === 'diff' && e.b ? entryById(e.b) : null;
  if (!be) return bLabel(b);
  const src = be.source || {};
  const k = src.input === 'raw' ? 'raw YUV' : src.dump_kind ? kindLabel(src.dump_kind) : (b && b.kind ? kindLabel(b.kind) : '');
  const t = streamLabel(be).replace(/ \((C model|RTL dump)\)/i, '');
  return k ? `${t} (${k})` : t;
}
