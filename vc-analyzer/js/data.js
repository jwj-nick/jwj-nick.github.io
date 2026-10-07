// Reading the data contract from a URL or an opened folder, stream discovery and caps.
import { fetchOpts, perfMark, state } from './state.js?v=dfa6aefcca';

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
    if (!list.some((x) => x.base === base)) list.unshift({ id: 'url', title: params.get('data'), base });
    caps.static = true;
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
