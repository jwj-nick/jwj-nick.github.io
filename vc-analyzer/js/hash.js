// URL hash: frame, fill, lines, stage, tab and selected block.
import { C, state } from './state.js?v=4a164c6c45';

// ------------------------------------------------------------ hash
export function parseHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const sel = h.get('sel') ? h.get('sel').split(',').map(Number) : null;
  return { f: h.has('f') ? +h.get('f') : null, fill: h.get('fill'), lines: h.get('lines'), stage: h.get('stage'), sel, tab: h.get('tab') };
}
export function writeHash() {
  const h = new URLSearchParams();
  h.set('f', state.f);
  h.set('fill', state.fill);
  h.set('lines', [...state.lines].join(','));
  h.set('stage', state.stage);
  h.set('tab', state.tab);
  if (state.sel >= 0 && state.payload) { const b = state.payload.blocks[state.sel]; h.set('sel', b[C.x] + ',' + b[C.y]); }
  history.replaceState(null, '', '#' + h.toString());
}
