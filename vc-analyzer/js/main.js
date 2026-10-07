/* VC Analyzer — web GUI.
 *
 * Reads one data contract (see vca/export.py): manifest.json, frames/<f>.json,
 * planes/<f>.<stage>.png, from a static bundle URL (?data=...), from
 * `vca serve` (/api/...), or from a local folder picked by the user.
 * No build step, no dependencies.
 *
 * Native ES modules under js/, loaded from index.html as js/main.js.  The
 * base modules (state to hash) import only modules above them in this list.
 * The feature modules below import each other (selectFrame <-> renderTab, ...)
 * but call those imports only at run time, never while a module evaluates.
 *   state    viewer state, block column index C, overlay and stage tables, perf
 *   util     helpers, colours, status line
 *   data     getJSON / getBlob, stream discovery, caps
 *   planes   pixel planes and pictures, sample values
 *   arch     Arch Model L0 lookups, labels, legend and AI text
 *   hash     URL hash
 *   symbols  per-frame symbol columns
 *   source   opening a bundle (openSource), header facts, stage list
 *   braid    reorder timeline
 *   diff     diff mode (bar, first mismatch, A/B flip)
 *   frames   selectFrame, prefetch, cell index, stepping order, partition path
 *   view     viewport and canvas rendering
 *   legend   legend under the picture
 *   inspector  tabs
 *   ai       "Copy for AI"
 *   controls chips, selection, navigation, pointer and keys
 *   api      `vca serve` application API: requests with the token, session, health, toast
 *   open     "Open stream" dialog, upload, probe, drag and drop
 *   jobs     job tray: polling, progress, cancel, log, opening a ready analysis
 *   library  Library dialog: list, filter, open, delete
 *   hw       HW tab: Arch Model L0 result, config editor, recalculation, comparison
 *   export   Export dialog: picture PNG, tables CSV (server routes or written here), report link
 *   main     boot, ?perf=1 run, window.__vca probe
 * open, jobs, library and the HW editor need `vca serve` with jobs (caps.jobs; Library: caps.server)
 * and stay hidden and silent on the static site and in an opened folder.
 */
import { C, FILLS, LINES, PERF, perf, state } from './state.js?v=84f66b0ecd';
import { setEmpty, setStatus } from './util.js?v=84f66b0ecd';
import { caps, discoverStreams } from './data.js?v=84f66b0ecd';
import { openSource, renderPicker } from './source.js?v=84f66b0ecd';
import { isChromaBlock, orderedFrames, selectFrame } from './frames.js?v=84f66b0ecd';
import { canvas, isRenderPending } from './view.js?v=84f66b0ecd';
import { renderTab } from './inspector.js?v=84f66b0ecd';
import { parseHash } from './hash.js?v=84f66b0ecd';
import { wire } from './controls.js?v=84f66b0ecd';
import { loadHealth, loadSession } from './api.js?v=84f66b0ecd';
import { initOpen, openSnap, showServerEmpty } from './open.js?v=84f66b0ecd';
import { initJobs, jobsSnap } from './jobs.js?v=84f66b0ecd';
import { initLibrary, librarySnap } from './library.js?v=84f66b0ecd';
import { hwSnap, initHw } from './hw.js?v=84f66b0ecd';
import { exportSnap, initExport } from './export.js?v=84f66b0ecd';

// ---------------------------------------------------------------- boot
async function boot() {
  const h = parseHash();
  if (h.fill && FILLS.some((f) => f.id === h.fill)) state.fill = h.fill;
  if (h.lines !== null && h.lines !== undefined) state.lines = new Set(h.lines.split(',').filter((x) => LINES.some((l) => l.id === x)));
  if (h.stage) state.stage = h.stage;
  if (h.tab) state.tab = h.tab;
  wire();
  initOpen(); initLibrary(); initHw(); initExport();
  renderTab();
  state.streams = await discoverStreams();
  if (caps.server) await loadSession();   // caps.jobs: Open stream, jobs, drop target
  initJobs();
  if (caps.jobs) loadHealth();            // the first call also warms WSL on the server
  if (!state.streams.length) {
    renderPicker();
    if (caps.jobs) showServerEmpty();
    else setEmpty('No stream to show. Open a bundle folder, or start the local GUI with "python -m vca serve <analysis>".');
    return;
  }
  const want = new URLSearchParams(location.search).get('data');
  const wantBase = want ? new URL(want.replace(/\/?$/, '/'), location.href).href : null;
  let idx = state.streams.findIndex((s) => wantBase && s.base === wantBase);
  if (idx < 0) idx = 0;
  state.streamIdx = idx;
  renderPicker();
  await openSource({ kind: 'url', base: state.streams[idx].base }, state.streams[idx].title);
  if (PERF) await perfRun();
}

// Passes: cold = nothing cached and no prefetch; warm = viewer caches full;
// step = caches cleared, prefetch on, 400 ms dwell per frame (arrow-key use).
// total = frame switch until the picture, overlays and tab are painted;
// syms = until the frame's symbols are loaded (shown in the Block tab).
async function perfRun() {
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = orderedFrames().map((x) => x.f);
  const out = { frames: frames.length, width: state.payload.frame.width, height: state.payload.frame.height, cold: [], warm: [], step: [] };
  const clear = () => { state.frameCache.clear(); state.planeCache.clear(); state.symCache.clear(); };
  for (const pass of ['cold', 'warm', 'step']) {
    if (pass !== 'warm') clear();
    state.noPrefetch = pass !== 'step';
    for (const f of frames) {
      await selectFrame(f);
      await nextPaint();
      const total = +(performance.now() - perf.t0).toFixed(1);
      await state.symsPromise;
      out[pass].push({ ...perf.cur, total, syms: perf.cur.syms ?? 0,
        blocks: state.payload.blocks.length, symbols: state.syms ? state.syms.count : 0 });
      if (pass === 'step') await sleep(400);
    }
  }
  state.noPrefetch = false;
  const worst = (list) => Math.max(...list.map((x) => x.total));
  setStatus(`perf: ${frames.length} frames, worst frame switch ${worst(out.cold).toFixed(0)} ms cold, ${worst(out.step).toFixed(0)} ms stepping, ${worst(out.warm).toFixed(0)} ms cached`);
  window.__vcaPerf = { done: true, ...out };
}

// Read-only probe for tests/gui: scenario assertions read the state here and
// drive the page with real mouse and keyboard input only.
window.__vca = {
  snap() {
    const p = state.payload, b = p && state.sel >= 0 ? p.blocks[state.sel] : null;
    return {
      ready: !!(p && state.picture && !isRenderPending() && state.loading < 0), loading: state.loading, f: state.f, frames: state.manifest ? state.manifest.frames.length : 0,
      sel: state.sel, block: b ? { x: b[C.x], y: b[C.y], w: b[C.w], h: b[C.h], bits: b[C.bits] || 0, chroma: isChromaBlock(state.sel) } : null,
      fill: state.fill, lines: [...state.lines].sort(), stage: state.stage, tab: state.tab, order: state.order,
      view: { ...state.view }, diff: !!state.diff, codec: state.manifest ? state.manifest.stream.codec : null,
      streams: state.streams.length, streamIdx: state.streamIdx, source: state.source ? state.source.kind : null,
      caps: { ...caps },
      // A1 (read-only): open dialog, job tray, library dialog
      dialog: (document.querySelector('dialog[open]') || {}).id || null,
      open: openSnap(), jobs: jobsSnap(), library: librarySnap(),
      hw: hwSnap(),   // A2 (read-only): HW tab
      export: exportSnap(),   // A3 (read-only): Export dialog
    };
  },
  // Client (CSS px) coordinates of the centre of luma pixel (x, y), for clicks.
  clientXY(x, y) {
    const r = canvas.getBoundingClientRect();
    return [r.left + state.view.ox + (x + 0.5) * state.view.s, r.top + state.view.oy + (y + 0.5) * state.view.s];
  },
};
boot();
