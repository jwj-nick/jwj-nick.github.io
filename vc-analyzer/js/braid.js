// Decode-to-output reorder timeline.
import { state } from './state.js?v=e0ab48eb46';
import { $, FRAME_COLORS, ohPart } from './util.js?v=e0ab48eb46';

// --------------------------------------------------------------- braid
export function renderBraid() {
  const svg = $('#braid');
  const frames = state.manifest.frames;
  const outputs = state.manifest.outputs || [];
  const n = Math.max(frames.length, outputs.length, 1);
  const wrap = $('#braidWrap').clientWidth || 800;
  const step = Math.max(10, Math.min(46, (wrap - 8) / n));
  const W = Math.max(wrap, step * n + 8), H = 116, laneH = 38, top = 4, bot = H - 4;
  const maxBytes = Math.max(1, ...frames.map((f) => f.bytes || 0));
  const bh = (b) => 4 + (laneH - 4) * Math.sqrt((b || 0) / maxBytes);
  const byF = new Map(frames.map((f) => [f.f, f]));
  const xs = (i) => 4 + i * step + step / 2;
  const bw = Math.max(4, step * 0.66);
  let parts = [];
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
  parts.push('<g id="braidSel"></g>');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width = W + 'px';
  svg.innerHTML = parts.join('');
  svg._geom = { xs, bw, top, bot, laneH, bh };
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
}

// window resize: redraw once the size settles
let braidTimer = 0;
export function renderBraidDebounced() { clearTimeout(braidTimer); braidTimer = setTimeout(() => state.manifest && renderBraid(), 120); }
