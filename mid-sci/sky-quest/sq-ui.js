/* sq-ui.js — 브리핑 카드 · 에피소드 지도 · 위상 사전 · 진행 체크리스트 · 미니맵 (DOM/Canvas 2D만)
 * 원칙(F8): 어느 장면이든 🎯 무엇을 · 🧭 어디로 · 💡 왜 가 한눈에.
 */
const D2R = Math.PI / 180;

/* ── 달 위상 그림 (지구에서 본 모양, 북반구) ── */
export function drawPhase(c, x, y, r, e) {
  e = ((e % 360) + 360) % 360;
  c.fillStyle = '#262b38'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  if (Math.min(e, 360 - e) < 6) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, r + 1, 0, 7); c.stroke(); c.setLineDash([]); return; }
  const ce = Math.cos(e * D2R), wax = e <= 180, N = 40; c.beginPath();
  for (let i = 0; i <= N; i++) { const yy = -r + 2 * r * i / N, s = Math.sqrt(Math.max(0, r * r - yy * yy)); c.lineTo(x + (wax ? s : -s), y + yy); }
  for (let i = N; i >= 0; i--) { const yy = -r + 2 * r * i / N, s = Math.sqrt(Math.max(0, r * r - yy * yy)); c.lineTo(x + (wax ? ce * s : -ce * s), y + yy); }
  c.closePath(); c.fillStyle = '#f3ead2'; c.fill();
}
/* ── 배치 그림 (위에서 본 모습, 태양 오른쪽) ── */
export function drawArrangement(c, w, h, e) {
  c.fillStyle = '#070b16'; c.fillRect(0, 0, w, h);
  const cx = w * 0.42, cy = h / 2, R = Math.min(w, h) * 0.34;
  c.strokeStyle = 'rgba(255,210,90,.55)'; c.lineWidth = 1.4;
  for (let k = -2; k <= 2; k++) { const y = cy + k * h * 0.16; c.beginPath(); c.moveTo(w - 4, y); c.lineTo(w - 22, y); c.stroke(); }
  c.fillStyle = '#ffd25a'; c.font = '800 10px sans-serif'; c.textAlign = 'right'; c.fillText('햇빛', w - 4, 10);
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.setLineDash([2, 3]); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#3d8fd8'; c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.fill(); c.fillStyle = '#13284a'; c.beginPath(); c.arc(cx, cy, 7, Math.PI / 2, Math.PI * 1.5); c.fill();
  const a = e * D2R, mx = cx + R * Math.cos(a), my = cy - R * Math.sin(a);
  c.strokeStyle = 'rgba(255,184,77,.6)'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#262b38'; c.beginPath(); c.arc(mx, my, 6, 0, 7); c.fill(); c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, 6, -Math.PI / 2, Math.PI / 2); c.fill();
  c.fillStyle = '#9fd0ff'; c.textAlign = 'center'; c.fillText('지구', cx, cy + 18);
}

/* ── 미니맵 (위에서 본 우주: x→오른쪽, -z→위) ── */
export function drawMiniMap(c, w, h, o = {}) {
  const x0 = -1.8, x1 = 7.8, z0 = -3.2, z1 = 4.0, s = Math.min(w / (x1 - x0), h / (z1 - z0));
  const X = x => (x - x0) * s + (w - (x1 - x0) * s) / 2, Y = z => (z - z0) * s + (h - (z1 - z0) * s) / 2;
  c.fillStyle = '#050914'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(220,230,255,.35)'; c.fillRect((i * 97) % w, (i * 53) % h, 1.2, 1.2); }
  // 햇빛
  c.strokeStyle = 'rgba(255,210,90,.6)'; c.fillStyle = 'rgba(255,210,90,.6)'; c.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) { const y = h * (0.15 + k * 0.17); c.beginPath(); c.moveTo(w - 4, y); c.lineTo(w - 24, y); c.stroke(); c.beginPath(); c.moveTo(w - 24, y); c.lineTo(w - 19, y - 3); c.lineTo(w - 19, y + 3); c.fill(); }
  c.fillStyle = '#ffd25a'; c.font = '800 11px -apple-system,"Apple SD Gothic Neo",sans-serif'; c.textAlign = 'right'; c.fillText('태양 쪽 →', w - 6, 12);
  // 그림자 원뿔
  const mz = o.moonZ || 0, mx = 6;
  c.fillStyle = 'rgba(120,80,200,.18)'; c.beginPath(); c.moveTo(X(mx), Y(mz - 0.27)); c.lineTo(X(0.8), Y(mz * 0.13 - 0.37)); c.lineTo(X(0.8), Y(mz * 0.13 + 0.37)); c.lineTo(X(mx), Y(mz + 0.27)); c.fill();
  c.fillStyle = 'rgba(0,0,0,.65)'; c.beginPath(); c.moveTo(X(mx), Y(mz - 0.27)); c.lineTo(X(0.8), Y(mz * 0.13 - 0.16)); c.lineTo(X(0.8), Y(mz * 0.13 + 0.16)); c.lineTo(X(mx), Y(mz + 0.27)); c.fill();
  // 지구 · 달
  const er = Math.max(9, s);
  c.fillStyle = '#3d8fd8'; c.beginPath(); c.arc(X(0), Y(0), er, 0, 7); c.fill(); c.fillStyle = '#13284a'; c.beginPath(); c.arc(X(0), Y(0), er, Math.PI / 2, Math.PI * 1.5); c.fill();
  c.fillStyle = '#9fd0ff'; c.textAlign = 'center'; c.fillText('지구', X(0), Y(0) + er + 12);
  const mr = Math.max(5, 0.27 * s); c.fillStyle = '#262b38'; c.beginPath(); c.arc(X(mx), Y(mz), mr, 0, 7); c.fill(); c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(X(mx), Y(mz), mr, -Math.PI / 2, Math.PI / 2); c.fill();
  c.fillStyle = '#ddd'; c.fillText('달', X(mx), Y(mz) - mr - 5);
  // 경로(에피소드 지도)
  if (o.route) {
    const pts = [[1.2, 3.4], [4.0, 1.2], [4.3, 0], [0.95, 0]];
    c.strokeStyle = 'rgba(255,184,77,.85)'; c.setLineDash([5, 4]); c.lineWidth = 2; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke(); c.setLineDash([]);
    const lab = [[1.2, 3.4], [4.0, 1.2], [2.6, 0], [0.4, 0.5]];
    lab.forEach((p, i) => { const on = o.cur === i; c.fillStyle = on ? '#ffb84d' : 'rgba(255,184,77,.35)'; c.beginPath(); c.arc(X(p[0]), Y(p[1]), on ? 11 : 9, 0, 7); c.fill(); c.fillStyle = '#1b1205'; c.font = '900 11px sans-serif'; c.fillText(String(i + 1), X(p[0]), Y(p[1]) + 4); });
  }
  // 링
  (o.rings || []).forEach((p, i) => { c.strokeStyle = i === o.ringIdx ? '#ffd27a' : '#6fd6ff'; c.lineWidth = 2; c.beginPath(); c.arc(X(p[0]), Y(p[2]), 5, 0, 7); c.stroke(); });
  // 목표 ★
  if (o.target) { const tx = X(o.target[0]), ty = Y(o.target[2]); c.fillStyle = '#ffb84d'; c.font = '900 16px sans-serif'; c.fillText('★', tx, ty + 5); }
  // 루미호
  if (o.ship) { const sx = X(o.ship[0]), sy = Y(o.ship[2]), a = o.heading || 0; c.save(); c.translate(sx, sy); c.rotate(a); c.fillStyle = '#ffb84d'; c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
    c.font = '800 10px sans-serif'; c.fillStyle = '#ffb84d'; c.fillText('루미호', sx, sy + 17); }
}

/* ── 공통 오버레이 ── */
function open(screen, html) { screen.className = 'on'; screen.innerHTML = html; }
function close(screen) { screen.className = ''; screen.innerHTML = ''; }

/* 에피소드 지도 (P6-g) */
export function showEpisodeMap(screen, ep, cur = 0) {
  return new Promise(res => {
    open(screen, `<div class="sc"><div class="eye">${ep.sub}</div><h1 style="font-size:30px;margin-top:2vh">${ep.title}</h1>
      <p>오늘의 여행 경로예요. 위에서 내려다본 우주 지도 — 태양은 오른쪽 멀리 있어요.</p>
      <canvas class="mm" width="560" height="360"></canvas>
      <div class="route">${ep.map.map((m, i) => `<div class="${i === cur ? 'on' : ''}"><i>${m[0]}</i><b>${m[1]}</b><span>${m[2]}</span></div>`).join('')}</div>
      <button class="btn pri" id="mm-go">▶ ${cur ? '계속' : '출발'}</button></div>`);
    const cv = screen.querySelector('.mm'); drawMiniMap(cv.getContext('2d'), cv.width, cv.height, { route: true, cur });
    screen.querySelector('#mm-go').onclick = () => { close(screen); res(); };
  });
}

/* 미션 브리핑 (P6-a·d·e) */
export function showBrief(screen, m, i, n, map) {
  return new Promise(res => {
    open(screen, `<div class="sc brief"><div class="eye">MISSION ${i + 1} / ${n}</div><h1 style="font-size:28px;margin-top:2vh">${m.name}</h1>
      <canvas class="mm" width="560" height="300"></canvas>
      <div class="www"><div><span>🎯 무엇을</span><p>${m.brief.what}</p></div><div><span>🧭 어디로</span><p>${m.brief.where}</p></div><div><span>💡 왜</span><p>${m.brief.why}</p></div></div>
      <div class="steps">${m.steps.map((s, k) => `<div><i>${k + 1}</i>${s}</div>`).join('')}</div>
      <div class="learn">📝 알게 될 것: ${m.learn}</div>
      <button class="btn pri" id="br-go">▶ 시작</button></div>`);
    const cv = screen.querySelector('.mm'); drawMiniMap(cv.getContext('2d'), cv.width, cv.height, map || {});
    screen.querySelector('#br-go').onclick = () => { close(screen); res(); };
  });
}

/* 📖 위상 사전 (P7) */
export function showDict(screen, phases, onClose) {
  open(screen, `<div class="sc"><div class="eye">MOON PHASE DICTIONARY</div><h1 style="font-size:30px;margin-top:2vh">📖 달 위상 사전</h1>
    <p>왼쪽 = 위에서 본 배치(태양은 오른쪽), 오른쪽 = 지구에서 본 모양. 이름에는 뜻이 숨어 있어요!</p>` +
    phases.map((p, i) => `<div class="dict"><div class="pics"><canvas data-a="${i}" width="120" height="96"></canvas><canvas data-p="${i}" width="96" height="96"></canvas></div>
      <div class="dt"><h3>${p.k} <small>${p.hanja !== '—' ? p.hanja + ' · ' : ''}${p.mean}</small></h3>
      <div class="row"><span>📅</span>${p.day}</div><div class="row"><span>🛰</span>${p.pos}</div><div class="row"><span>👀</span>${p.look}</div><p>💬 ${p.story}</p></div></div>`).join('') +
    `<div class="learn">순서: 삭 → 초승달 → <b>상현</b> → <b>망(보름)</b> → <b>하현</b> → 그믐달 → 삭 (약 29.5일). 일식 = 삭일 때, 월식 = 망일 때!</div>
    <button class="btn pri" id="dc-x">닫기</button></div>`);
  phases.forEach((p, i) => { const a = screen.querySelector(`[data-a="${i}"]`), q = screen.querySelector(`[data-p="${i}"]`);
    drawArrangement(a.getContext('2d'), a.width, a.height, p.e); const c = q.getContext('2d'); c.fillStyle = '#070b16'; c.fillRect(0, 0, 96, 96); drawPhase(c, 48, 48, 32, p.e); });
  screen.querySelector('#dc-x').onclick = () => { close(screen); onClose && onClose(); };
}

/* 진행 체크리스트 HUD (P6-b) */
let lastChk = '';
export function renderChk(el, m, done, extra = '') {
  if (!m) { el.innerHTML = ''; lastChk = ''; return; }
  const cur = done.indexOf(false);
  const html = `<div class="t">🎯 ${m.name}</div><ol>${m.steps.map((s, k) => `<li class="${done[k] ? 'ok' : k === cur ? 'cur' : ''}">${done[k] ? '✅' : k === cur ? '▶' : '☐'} ${s}${k === cur && extra ? ` <em>${extra}</em>` : ''}</li>`).join('')}</ol>
    <div class="w">🧭 ${m.brief.where}</div><div class="y">💡 ${m.brief.why}</div>`;
  if (html !== lastChk) { el.innerHTML = html; lastChk = html; }
}
