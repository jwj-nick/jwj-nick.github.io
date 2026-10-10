// F-c track C (R49, F05): the filmstrip, a horizontal strip of frame thumbnails under the timeline (Shift+F or the
// Filmstrip chip).  Thumbnails are the luma rows of planes/<f>.recon.png, scaled down in the browser, loaded only
// when they scroll into the strip and two at a time; the border is the frame type's colour, the frame on screen is
// marked, a click goes to the frame, and the strip follows the decode / output order of the Frame tab.
import { state } from './state.js?v=9ce97af84e';
import { $, esc, FRAME_COLORS, typeName } from './util.js?v=9ce97af84e';
import { getBlob } from './data.js?v=9ce97af84e';
import { orderedFrames, selectFrame } from './frames.js?v=9ce97af84e';

const TH = 54;          // thumbnail height in CSS px (the width follows the picture's aspect ratio, at most 2:1)
const PARALLEL = 2;     // thumbnails decoded at the same time
let on = false;
let man = null, order = '';    // what the strip was built for
let thumbs = new Map();        // f -> ImageBitmap | 'none' (no recon picture) | 'error'
let queue = [], busy = 0, gen = 0;
let observer = null;
const strip = () => $('#filmstrip');
const has = (v) => v !== null && v !== undefined;

export const filmstripShown = () => on;
export function toggleFilmstrip() {
  on = !on;
  const b = $('#filmBtn');
  if (b) b.setAttribute('aria-pressed', String(on));
  strip().hidden = !on;
  if (on) renderFilmstrip(); else { queue = []; gen++; }
}

// Builds the strip for the open stream (again when the stream or the stepping order changed), else moves the mark.
export function renderFilmstrip() {
  if (!on) return;
  const box = $('#fsList');
  if (!state.manifest) { box.innerHTML = ''; man = null; return; }
  if (man !== state.manifest) { man = state.manifest; thumbs = new Map(); order = ''; }
  if (order !== state.order || !box.children.length) {
    order = state.order; gen++; queue = [];
    const list = orderedFrames();
    box.innerHTML = list.map((fr) => {
      const col = FRAME_COLORS[fr.frame_type] || '#888';
      const out = has(fr.out_n) ? `out ${fr.out_n}` : 'not output';
      const w = Math.round(TH * Math.min(2, (fr.width || 16) / (fr.height || 9)));
      return `<button type="button" class="fs-item" data-f="${fr.f}" style="--fs-c:${col}" title="Frame ${fr.f}: ${esc(typeName(fr.frame_type) || 'type not decoded')}, ${has(fr.out_n) ? 'output ' + fr.out_n : 'not output directly'} (click to go there)">`
        + `<canvas class="fs-pic" width="${w}" height="${TH}" style="width:${w}px;height:${TH}px" aria-hidden="true"></canvas>`
        + `<span class="fs-n"><b>${fr.f}</b><span class="fs-o">${out}</span></span></button>`;
    }).join('');
    $('#fsOrder').textContent = state.order === 'output' ? 'Output order' : 'Decode order';
    observe();
  }
  markCurrent(true);
}

// marks the frame on screen and scrolls it into the strip (scroll: only when it is outside)
function markCurrent(scroll) {
  const box = $('#fsList');
  let cur = null;
  for (const el of box.children) { const me = +el.dataset.f === state.f; el.classList.toggle('cur', me); el.setAttribute('aria-current', me ? 'true' : 'false'); if (me) cur = el; }
  if (scroll && cur) {
    const b = box.getBoundingClientRect(), r = cur.getBoundingClientRect();
    if (r.left < b.left || r.right > b.right) box.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
  }
}

// thumbnails load when their item is in (or near) the strip's view
function observe() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) want(+e.target.dataset.f);
  }, { root: $('#fsList'), rootMargin: '0px 200px' });
  for (const el of $('#fsList').children) observer.observe(el);
}
function want(f) {
  if (thumbs.has(f)) { paint(f); return; }
  if (!queue.includes(f)) queue.push(f);
  pump();
}
function pump() {
  while (busy < PARALLEL && queue.length) {
    const f = queue.shift(), g = gen, m = man;
    if (thumbs.has(f)) { paint(f); continue; }
    busy++;
    load(f).then((t) => { if (m === man) thumbs.set(f, t); }).catch(() => { if (m === man) thumbs.set(f, 'error'); })
      .finally(() => { busy--; if (g === gen && m === man) paint(f); pump(); });
  }
}
async function load(f) {
  const fr = state.manifest.frames.find((x) => x.f === f);
  if (!fr || !(fr.stages || []).includes('recon')) return 'none';
  const blob = await getBlob(`planes/${f}.recon.png`);
  const w = Math.round(TH * Math.min(2, fr.width / fr.height));
  // the stacked PNG holds Y rows, then U and V: the first `height` rows are the luma picture
  return createImageBitmap(blob, 0, 0, fr.width, fr.height, { resizeWidth: w * 2, resizeHeight: TH * 2, resizeQuality: 'medium' });
}
function paint(f) {
  const el = $(`#fsList .fs-item[data-f="${f}"]`), t = thumbs.get(f);
  if (!el || !t) return;
  const c = el.querySelector('canvas'), x = c.getContext('2d');
  el.classList.toggle('none', typeof t === 'string');
  el.dataset.loaded = typeof t === 'string' ? t : 'yes';
  if (typeof t === 'string') return;
  c.width = t.width; c.height = t.height;
  x.drawImage(t, 0, 0);
}

export function initFilmstrip() {
  $('#fsList').addEventListener('click', (e) => { const it = e.target.closest('.fs-item'); if (it) selectFrame(+it.dataset.f); });
  $('#filmBtn').addEventListener('click', toggleFilmstrip);
  // the Frame tab's "Step through output order" (controls.js changed state.order before this listener runs)
  $('#tabBody').addEventListener('click', (e) => { if (e.target.closest('[data-act="order"]')) renderFilmstrip(); });
  // every frame change rewrites #framePos (frames.js): move the mark; a new stream builds the strip again
  new MutationObserver(() => { if (on) { if (man !== state.manifest) renderFilmstrip(); else markCurrent(true); } })
    .observe($('#framePos'), { childList: true, subtree: true, characterData: true });
}
// probe (tests)
export function filmstripSnap() {
  const items = [...document.querySelectorAll('#fsList .fs-item')];
  return {
    on, order: on ? order : null,
    items: items.map((el) => +el.dataset.f),
    cur: items.filter((el) => el.classList.contains('cur')).map((el) => +el.dataset.f),
    loaded: items.filter((el) => el.dataset.loaded).map((el) => [+el.dataset.f, el.dataset.loaded]),
    queued: queue.length, busy,
  };
}
