// Reading the data contract from a URL or an opened folder, stream discovery and caps.
import { fetchOpts, perfMark, state } from './state.js?v=e0ab48eb46';

// --------------------------------------------------------- data access
export async function getJSON(rel) {
  if (state.source.kind === 'files') {
    const file = state.source.map.get(rel);
    if (!file) throw new Error(`${rel} is missing from the opened folder`);
    return JSON.parse(await file.text());
  }
  const r = await fetch(state.source.base + rel, fetchOpts);
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
  const r = await fetch(state.source.base + rel, fetchOpts);
  if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
  return r.blob();
}

// What this page can do, decided once by discoverStreams (the only writer):
//   server  `vca serve` answered api/list: features that need the server
//           (opening streams, jobs) may show
//   static  bundles found by URL: the demo index (GitHub Pages) or ?data=<bundle url>
//   folder  "Open bundle" reads a local folder in the browser (every mode)
// The true names also go to <html data-caps="...">: an element marked
// data-needs="server" is hidden unless caps.server (app.css).
export const caps = { server: false, static: false, folder: true };

// Streams offered in the picker: `vca serve` (/api/list) or the static demo
// index, plus an explicit ?data=<bundle url> when it is not one of them.
export async function discoverStreams() {
  const params = new URLSearchParams(location.search);
  const list = [];
  for (const url of ['api/list', 'demo/index.json']) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) continue;
      const items = await r.json();
      for (const it of items) {
        const base = new URL(it.path || it.url, new URL(url, location.href)).href.replace(/\/?$/, '/');
        if (!list.some((x) => x.base === base)) list.push({ id: it.id, title: it.title || it.id, base, note: it.note });
      }
      caps[url === 'api/list' ? 'server' : 'static'] = true;
      if (list.length) break;
    } catch (e) { /* not this mode */ }
  }
  if (params.get('data')) {
    const base = new URL(params.get('data').replace(/\/?$/, '/'), location.href).href;
    if (!list.some((x) => x.base === base)) list.unshift({ id: 'url', title: params.get('data'), base });
    caps.static = true;
  }
  document.documentElement.dataset.caps = Object.keys(caps).filter((k) => caps[k]).join(' ');
  return list;
}
