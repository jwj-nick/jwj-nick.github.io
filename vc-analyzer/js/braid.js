// Decode-to-output reorder timeline.
// F-c track C (R49, F06): Shift+R (or the References chip) adds a band above the decode lane with arcs from the
// frame on screen to the frames it references and shades each decode slot by how many frames reference it.
import { state } from './state.js?v=9ce97af84e';
import { $, esc, FRAME_COLORS, ohPart, setStatus } from './util.js?v=9ce97af84e';
import { referencedCounts, refgraph, refgraphMissingWhy, refgraphStatus, refgraphWhy, refTargets } from './refsview.js?v=9ce97af84e';
import { toast } from './api.js?v=9ce97af84e';

const ARC_H = 34;   // height of the arc band (only while the arcs are on)
let arcsOn = false;
export const arcsShown = () => arcsOn;

// --------------------------------------------------------------- braid
export function renderBraid() {
  const svg = $('#braid');
  const frames = state.manifest.frames;
  const outputs = state.manifest.outputs || [];
  const n = Math.max(frames.length, outputs.length, 1);
  const wrap = $('#braidWrap').clientWidth || 800;
  const step = Math.max(10, Math.min(46, (wrap - 8) / n));
  const band = arcsOn ? ARC_H : 0;
  const W = Math.max(wrap, step * n + 8), H = 116 + band, laneH = 38, top = 4 + band, bot = H - 4;
  const maxBytes = Math.max(1, ...frames.map((f) => f.bytes || 0));
  const bh = (b) => 4 + (laneH - 4) * Math.sqrt((b || 0) / maxBytes);
  const byF = new Map(frames.map((f) => [f.f, f]));
  const xs = (i) => 4 + i * step + step / 2;
  const bw = Math.max(4, step * 0.66);
  let parts = [];
  // referenced-count shading behind the decode lane (arcs on): darker = referenced by more frames
  const counts = arcsOn ? referencedCounts() : null;
  if (counts) {
    const most = Math.max(1, ...counts.values());
    frames.forEach((fr, i) => {
      const c = counts.get(fr.f) || 0;
      parts.push(`<rect class="refcount" data-f="${fr.f}" data-n="${c}" x="${xs(i) - step / 2 + 0.5}" y="${top - 2}" width="${Math.max(1, step - 1)}" height="${laneH + 4}" fill-opacity="${c ? (0.1 + 0.4 * c / most).toFixed(3) : 0}"><title>decode ${fr.f}: referenced by ${c} frame${c === 1 ? '' : 's'}</title></rect>`);
    });
  }
  // wires: decode slot i -> output slot n
  frames.forEach((fr, i) => {
    if (fr.out_n === null || fr.out_n === undefined) return;
    const x1 = xs(i), x2 = xs(fr.out_n);
    const y1 = top + laneH + 1, y2 = bot - laneH - 1, my = (y1 + y2) / 2;
    parts.push(`<path class="wire" data-f="${fr.f}" d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}"/>`);
  });
  // decode lane
  frames.forEach((fr, i) => {
    const h = bh(fr.bytes), x = xs(i) - bw / 2, y = top + laneH - h;
    const col = FRAME_COLORS[fr.frame_type] || '#888';
    const shown = fr.out_n !== null && fr.out_n !== undefined;
    parts.push(`<rect class="bar" data-f="${fr.f}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="1.5" fill="${shown ? col : 'transparent'}" stroke="${col}" stroke-width="${shown ? 0 : 1.5}"><title>decode ${fr.f}: ${fr.frame_type}${ohPart(fr)}, ${fr.bytes} bytes${shown ? ', output ' + fr.out_n : ', not output directly'}</title></rect>`);
  });
  // output lane
  outputs.forEach((o) => {
    const fr = byF.get(o.src_frame);
    const h = bh(fr ? fr.bytes : 0), x = xs(o.n) - bw / 2, y = bot - laneH;
    const col = fr ? (FRAME_COLORS[fr.frame_type] || '#888') : '#555';
    parts.push(`<rect class="bar" data-f="${fr ? fr.f : ''}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="1.5" fill="${col}" opacity="0.85"><title>output ${o.n}${fr ? ' = decode ' + fr.f : ''}</title></rect>`);
  });
  if (n <= 64) {
    frames.forEach((fr, i) => parts.push(`<text x="${xs(i)}" y="${top + laneH + 12}" text-anchor="middle">${fr.f}</text>`));
    outputs.forEach((o) => parts.push(`<text x="${xs(o.n)}" y="${bot - laneH - 4}" text-anchor="middle">${o.n}</text>`));
  }
  if (state.diff) {
    const differing = new Set(state.diff.detail_frames || state.diff.differing_frames || []);
    const firstF = state.diff.first_mismatch ? state.diff.first_mismatch.f : null;
    frames.forEach((fr, i) => {
      if (!differing.has(fr.f)) return;
      const r = fr.f === firstF ? 4.5 : 3.5, cx = xs(i), cy = Math.max(top + r, top + laneH - bh(fr.bytes) - r - 2);
      parts.push(`<path class="diffmark${fr.f === firstF ? ' first' : ''}" data-f="${fr.f}" d="M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z"><title>frame ${fr.f} differs from B${fr.f === firstF ? ' (first mismatch)' : ''}</title></path>`);
    });
  }
  if (arcsOn) parts.push('<defs><marker id="arcHead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" class="archead"/></marker></defs><g id="braidArcs"></g>');
  parts.push('<g id="braidSel"></g>');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width = W + 'px';
  svg.style.height = band ? H + 'px' : '';
  svg.innerHTML = parts.join('');
  svg._geom = { xs, bw, top, bot, laneH, bh, band };
  updateBraidSelection();
}

export function updateBraidSelection() {
  const svg = $('#braid');
  if (!svg._geom || !state.manifest) return;
  const { xs, bw, top, bot, laneH } = svg._geom;
  const frames = state.manifest.frames;
  const i = frames.findIndex((x) => x.f === state.f);
  const fr = frames[i];
  svg.querySelectorAll('.wire').forEach((w) => w.classList.toggle('sel', +w.dataset.f === state.f));
  let s = '';
  if (fr) {
    s += `<rect class="selmark" x="${xs(i) - bw / 2 - 3}" y="${top - 2}" width="${bw + 6}" height="${laneH + 4}" rx="3"/>`;
    if (fr.out_n !== null && fr.out_n !== undefined)
      s += `<rect class="selmark" x="${xs(fr.out_n) - bw / 2 - 3}" y="${bot - laneH - 2}" width="${bw + 6}" height="${laneH + 4}" rx="3"/>`;
  }
  $('#braidSel').innerHTML = s;
  drawArcs();
}

// Arcs from the frame on screen (decode lane) up into the band and down to every frame it references.
function drawArcs() {
  const g = $('#braidArcs'), svg = $('#braid');
  if (!g || !svg._geom) return;
  const { xs, top, band } = svg._geom;
  const frames = state.manifest.frames, idx = new Map(frames.map((x, k) => [x.f, k]));
  const i = idx.get(state.f);
  if (i === undefined || !refgraph()) { g.innerHTML = ''; return; }
  const y0 = top - 3, x0 = xs(i);
  g.innerHTML = refTargets(state.f).filter((t) => idx.has(t.f)).map((t) => {
    const x1 = xs(idx.get(t.f)), lift = Math.min(band - 6, 8 + Math.abs(x1 - x0) * 0.35);
    return `<path class="arc" data-f="${state.f}" data-to="${t.f}" d="M${x0},${y0} C${x0},${y0 - lift} ${x1},${y0 - lift} ${x1},${y0}" marker-end="url(#arcHead)"><title>frame ${state.f} references frame ${t.f} (${esc(t.keys.join(', '))})</title></path>`;
  }).join('');
}

// Shift+R and the References chip of the timeline.  Without a reference graph the chip stays off and a toast and
// the status line say why (R49 QA D4: it used to stay pressed with nothing drawn).
export function toggleArcs() {
  if (!arcsOn && state.manifest && refgraphStatus() === 'missing') { refuseArcs(); return; }
  setArcs(!arcsOn);
}
function setArcs(on) {
  arcsOn = on;
  const b = $('#arcsBtn');
  if (b) b.setAttribute('aria-pressed', String(arcsOn));
  if (state.manifest) renderBraid();
}
function refuseArcs() {
  const why = refgraphWhy('The reference arcs need');
  setStatus(`No reference arcs. ${why}`);
  toast(`No reference arcs: ${refgraphMissingWhy() === 'unreadable' ? 'refgraph.json could not be read' : refgraphMissingWhy() === 'codec' ? 'no reference graph for this codec' : 'this bundle has no refgraph.json'}.`);
}
// The reference graph arrived or turned out missing (decoder.js onRefgraph): arcs asked for while it loaded are
// drawn now, or turned off with the reason.
export function arcsGraphSettled() {
  if (!arcsOn || !state.manifest) return;
  if (refgraphStatus() === 'missing') { setArcs(false); refuseArcs(); } else renderBraid();
}
// probe (tests): the arcs drawn and the shading
export function arcsSnap() {
  const svg = $('#braid');
  return {
    on: arcsOn,
    arcs: [...svg.querySelectorAll('#braidArcs .arc')].map((a) => [+a.dataset.f, +a.dataset.to]),
    // client x of each arc's two ends (the path's first and last point)
    ends: [...svg.querySelectorAll('#braidArcs .arc')].map((a) => {
      const n = a.getTotalLength(), m = svg.getScreenCTM(), p0 = a.getPointAtLength(0), p1 = a.getPointAtLength(n);
      return [+a.dataset.to, p0.x * m.a + m.e, p1.x * m.a + m.e];
    }),
    shade: [...svg.querySelectorAll('.refcount')].map((r) => [+r.dataset.f, +r.dataset.n]),
    height: svg.getBoundingClientRect().height,
  };
}

// window resize: redraw once the size settles
let braidTimer = 0;
export function renderBraidDebounced() { clearTimeout(braidTimer); braidTimer = setTimeout(() => state.manifest && renderBraid(), 120); }
