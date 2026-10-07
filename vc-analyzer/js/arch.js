// HW model view: lookups, superblock labels, legend and AI text for the HW cycles and Ref fetch fills.
import { C, state } from './state.js?v=dfa6aefcca';
import { esc, fmt, RAMP, rgb } from './util.js?v=dfa6aefcca';

// Arch Model L0 (vca arch): per-superblock rows (manifest arch.sb_cols) and per-block [ENT cycles, fetch bytes]
export function archOf(p) {
  if (!p || !p.arch) return null;
  if (p._arch) return p._arch;
  const fr = p.frame, sb = fr.sb_size || 64, cols = Math.max(1, Math.ceil(fr.width / sb));
  const bySb = new Map(p.arch.sb.map((r) => [r[0], r]));
  const byId = new Map(p.blocks.map((b, i) => [b[C.id], p.arch.blk[i]]));
  let fetchMax = 0;
  p.blocks.forEach((b, i) => { const v = p.arch.blk[i]; if (v && v[1] > 0) fetchMax = Math.max(fetchMax, v[1] / (b[C.w] * b[C.h])); });
  p._arch = {
    sb, cols, frame: p.arch.frame, rows: p.arch.sb, fetchMax,
    sbMax: Math.max(0, ...p.arch.sb.map((r) => r[3])),
    sbIndex: (x, y) => Math.floor(y / sb) * cols + Math.floor(x / sb),
    sbAt(x, y) { return bySb.get(this.sbIndex(x, y)); },
    blk: (b) => byId.get(b[C.id]),
  };
  return p._arch;
}
// Name of the config behind the HW fills: the saved config's name (vca serve, vca arch --config-name), else the
// file of an older arch.json, else "edited config" for an unsaved GUI edit (its file is a job's temporary copy).
export function archConfigName(M) {
  if (M.config_name) return 'config ' + M.config_name;
  if (M.config_name === undefined && M.config_file) return 'config ' + M.config_file;
  return M.config_file ? 'edited config' : 'placeholder config';
}
export const ARCH_MODULES = () => (state.manifest.arch && state.manifest.arch.modules) || ['ENT', 'IQT', 'PRD', 'LPF', 'MEM'];

// Superblock labels for the HW cycles fill: the slowest module and the cycles, when the superblock is big enough.
export function drawArchLabels(ctx, vis, px) {
  const A = archOf(state.payload);
  if (!A || A.sb / px < 44) return;
  const mods = ARCH_MODULES();
  ctx.save();
  ctx.font = `${11 * px}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  for (const r of A.rows) {
    const [, x, y, cyc, bi] = r;
    if (x > vis[2] || y > vis[3] || x + A.sb < vis[0] || y + A.sb < vis[1]) continue;
    const label = `${mods[bi]} ${cyc >= 1000 ? (cyc / 1000).toFixed(1) + 'k' : Math.round(cyc)}`;
    const w = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect(x + 3 * px, y + 3 * px, w + 6 * px, 15 * px);
    ctx.fillStyle = '#f4f6f8';
    ctx.fillText(label, x + 6 * px, y + 5 * px);
  }
  ctx.restore();
}

export function archLegend() {
  const A = archOf(state.payload), M = state.manifest.arch;
  if (!A || !A.frame || !A.frame.modeled) return '<span class="note">The HW model has no estimate for this frame.</span>';
  const fr = A.frame, cfg = M.config || {};
  const grad = `<span class="ramp" style="background:linear-gradient(90deg,${RAMP.map((c) => rgb(c)).join(',')})"></span>`;
  const src = `L0 estimate, ${esc(archConfigName(M))}`;
  if (state.fill === 'cycles') {
    const perSb = fr.budget / Math.max(1, fr.sbs);
    return `0${grad}${fmt(Math.round(A.sbMax))} cycles per superblock <span class="note">frame ${fmt(Math.round(fr.cycles))} cycles = ${(100 * fr.utilization).toFixed(2)}% of ${fmt(Math.round(fr.budget))} at ${cfg.clock_mhz} MHz, ${cfg.fps} fps (${fmt(Math.round(perSb))} per superblock on average); slowest module ${esc(fr.bottleneck)}. ${src}.</span>`;
  }
  const ap = Object.entries(fr.approx || {}).map(([k, v]) => `${esc(k)} ${v}`).join(', ');
  return `0${grad}${fmt(A.fetchMax, 1)} bytes per pixel <span class="note">log scale; frame fetch ${fmt(fr.fetch_bytes / 1024, 1)} KB (${fmt(fr.fetch_per_pixel, 2)} B/px) + write ${fmt(fr.write_bytes / 1024, 1)} KB, burst ${(cfg.modules || {}).MEM ? cfg.modules.MEM.burst_bytes : '?'} B${ap ? '; approximated: ' + ap : ''}. Intra blocks are unfilled. ${src}.</span>`;
}

export function archContext(o) {
  const A = archOf(state.payload);
  if (!A || !A.frame || !A.frame.modeled) return '';
  const v = A.blk(state.payload.blocks[state.sel]) || [null, 0], r = A.sbAt(o.x, o.y), mods = ARCH_MODULES();
  return `- HW model L0 (${archConfigName(state.manifest.arch)}): block ENT ${fmt(v[0], 1)} cycles, reference fetch ${v[1]} bytes; superblock ${r ? r[0] : '?'} ${r ? mods.map((m, i) => `${m} ${Math.round(r[5 + i])}`).join(' ') : ''} cycles (slowest ${r ? mods[r[4]] : '?'}); frame ${Math.round(A.frame.cycles)} cycles, ${(100 * A.frame.utilization).toFixed(2)}% of budget`;
}
