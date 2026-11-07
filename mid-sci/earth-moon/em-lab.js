/* em-lab.js — 지구와 달 실험실: 5개 장(평가요소 1:1) 콘텐츠 + 시뮬
 * 각 장 = 후크 → 개념 → 시뮬 → 관찰 포인트 → 답안 이렇게 쓰기 → 함정 → 확인 질문
 * 콘텐츠 SSOT는 이 파일의 CH 배열. 시뮬은 mount(el) → cleanup() 반환.
 */
(function () {
  'use strict';
  var E = window.EM, D2R = E.D2R;

  /* ── 공통 유틸 ── */
  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function loop(step) { // play 토글용 rAF 루프
    var id = 0, last = 0, on = false;
    function f(t) { if (!on) return; var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; step(dt); id = requestAnimationFrame(f); }
    return {
      start: function () { if (on) return; on = true; last = 0; id = requestAnimationFrame(f); },
      stop: function () { on = false; cancelAnimationFrame(id); },
      get on() { return on; }
    };
  }
  function onResize(fn) { var t; function r() { clearTimeout(t); t = setTimeout(fn, 80); } window.addEventListener('resize', r); return function () { window.removeEventListener('resize', r); }; }
  function playBtn(btn, lp) { btn.onclick = function () { if (lp.on) { lp.stop(); btn.textContent = '▶ 재생'; } else { lp.start(); btn.textContent = '⏸ 멈춤'; } }; }
  function halfPlane(ctx, cx, cy, nx, ny, S) { // (nx,ny) 방향 반평면 경로
    var px = -ny, py = nx;
    ctx.beginPath();
    ctx.moveTo(cx + px * S, cy + py * S); ctx.lineTo(cx + px * S + nx * S, cy + py * S + ny * S);
    ctx.lineTo(cx - px * S + nx * S, cy - py * S + ny * S); ctx.lineTo(cx - px * S, cy - py * S); ctx.closePath();
  }

  /* ═════════ 시뮬 1: 자전과 겉보기 운동 ═════════ */
  function sim1(el) {
    el.innerHTML =
      '<div class="stage"><div class="cv"><canvas data-a></canvas></div><div class="cv"><canvas data-b></canvas></div>' +
      '<div class="readout" data-r></div>' +
      '<div class="ctrl"><div class="row"><label>시각</label><input type="range" min="0" max="24" step="0.1" value="6" data-t></div>' +
      '<div class="row"><button class="btn pri" data-play>▶ 재생</button>' +
      '<button class="btn sm" data-q="6">6시</button><button class="btn sm" data-q="12">12시</button><button class="btn sm" data-q="18">18시</button><button class="btn sm" data-q="0">24시</button></div></div></div>';
    var ca = el.querySelector('[data-a]'), cb = el.querySelector('[data-b]'), rd = el.querySelector('[data-r]'), sl = el.querySelector('[data-t]');
    var T = 6;
    var stars = (function () { var r = E.rng(5), o = []; for (var i = 0; i < 70; i++) o.push({ dec: -20 + r() * 60, H0: r() * 360 }); return o; })();
    function desc(t) {
      if (t < 5 || t > 19) return ['밤', '태양은 지평선 아래. 대신 별들이 동→서로 움직여요.'];
      if (t < 7) return ['해 뜰 무렵', '태양이 동쪽 지평선에서 떠올라요.'];
      if (t < 11) return ['오전', '태양이 남동쪽 하늘로 올라가요.'];
      if (t < 13) return ['정오(남중)', '태양이 남쪽 하늘에서 가장 높아요.'];
      if (t < 17) return ['오후', '태양이 남서쪽으로 내려가요.'];
      return ['해 질 무렵', '태양이 서쪽 지평선으로 져요.'];
    }
    function draw() {
      var A = E.fit(ca, 0.62, 340), c = A.ctx, w = A.w, hh = A.h;
      E.spaceBg(c, w, hh, 2);
      var R = Math.min(hh * 0.27, w * 0.17), cx = w * 0.4, cy = hh * 0.54;
      E.earthTop(c, cx, cy, R, T, { obsLabel: '나 ' + fmt(T) });
      E.label(c, '북극 위에서 내려다본 지구', 12, 16, E.C.muted, 11, 'left');
      // 밤/낮 표시
      E.label(c, '밤', cx - R * 0.55, cy + R * 0.5, 'rgba(255,255,255,.6)', 12);
      E.label(c, '낮', cx + R * 0.55, cy + R * 0.5, 'rgba(255,255,255,.9)', 12);

      var B = E.fit(cb, 0.42, 230), d = B.ctx, W = B.w, H = B.h, base = H - 30;
      var sunAA = E.altAz(0, 15 * (T - 12));
      var day = Math.max(0, Math.min(1, (sunAA.alt + 8) / 20));
      var g = d.createLinearGradient(0, 0, 0, base);
      g.addColorStop(0, mix('#050914', '#3a86d6', day)); g.addColorStop(1, mix('#17244e', '#a8d4ff', day));
      d.fillStyle = g; d.fillRect(0, 0, W, base);
      function X(az) { return (az - 60) / 240 * W; }
      function Y(alt) { return base - alt / 70 * (base - 16); }
      // 별 (밤에만)
      var dark = 1 - Math.max(0, Math.min(1, (sunAA.alt + 12) / 10));
      if (dark > 0.02) stars.forEach(function (s) {
        var aa = E.altAz(s.dec, s.H0 + 15 * (T - 12)); if (aa.alt <= 0 || aa.az < 60 || aa.az > 300) return;
        d.fillStyle = 'rgba(230,238,255,' + (0.85 * dark) + ')'; d.fillRect(X(aa.az), Y(aa.alt), 1.8, 1.8);
      });
      // 태양 경로
      d.setLineDash([4, 5]); d.strokeStyle = 'rgba(255,210,90,.45)'; d.lineWidth = 1.5; d.beginPath();
      for (var t = 6; t <= 18; t += 0.25) { var p = E.altAz(0, 15 * (t - 12)); if (t === 6) d.moveTo(X(p.az), Y(p.alt)); else d.lineTo(X(p.az), Y(p.alt)); }
      d.stroke(); d.setLineDash([]);
      if (sunAA.alt > -4 && sunAA.az >= 60 && sunAA.az <= 300) {
        E.sun(d, X(sunAA.az), Y(sunAA.alt), 13);
        var nx = E.altAz(0, 15 * (T + 0.6 - 12));
        if (sunAA.alt > 3) E.arrow(d, X(sunAA.az) + 18, Y(sunAA.alt), X(nx.az) + 30, Y(nx.alt), '#fff', 2, 7);
      }
      d.fillStyle = '#0a1410'; d.fillRect(0, base, W, H - base);
      d.strokeStyle = 'rgba(120,200,150,.4)'; d.beginPath(); d.moveTo(0, base); d.lineTo(W, base); d.stroke();
      [[90, '동'], [135, '남동'], [180, '남'], [225, '남서'], [270, '서']].forEach(function (k) {
        E.label(d, k[1], X(k[0]), base + 15, k[1].length === 1 ? E.C.accent : E.C.muted, k[1].length === 1 ? 14 : 11, 'center', 800);
      });
      E.pill(d, '남쪽을 보고 선 "나"의 하늘', 100, 18, 'rgba(0,0,0,.35)', '#fff', 11);
      var ds = desc(T);
      rd.innerHTML = '<span class="big">' + fmt(T) + '</span> · ' + ds[0] + '<span class="sub">' + ds[1] + ' — 지구가 1시간에 15°씩 서→동으로 돌기 때문이에요.</span>';
    }
    function fmt(t) { var hh = Math.floor(t) % 24, mm = Math.round((t - Math.floor(t)) * 60); if (mm === 60) { hh = (hh + 1) % 24; mm = 0; } return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
    function mix(a, b, f) { var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); var r = Math.round(((pa >> 16) & 255) * (1 - f) + ((pb >> 16) & 255) * f), g = Math.round(((pa >> 8) & 255) * (1 - f) + ((pb >> 8) & 255) * f), bl = Math.round((pa & 255) * (1 - f) + (pb & 255) * f); return 'rgb(' + r + ',' + g + ',' + bl + ')'; }
    var lp = loop(function (dt) { T = (T + dt * 2) % 24; sl.value = T; draw(); });
    playBtn(el.querySelector('[data-play]'), lp);
    sl.oninput = function () { T = +sl.value; draw(); };
    el.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { T = +b.getAttribute('data-q'); sl.value = T; draw(); }; });
    draw();
    var off = onResize(draw);
    return function () { lp.stop(); off(); };
  }

  /* ═════════ 시뮬 2: 별의 일주운동 ═════════ */
  function sim2(el) {
    el.innerHTML =
      '<div class="stage"><div class="cv"><canvas data-c></canvas></div><div class="readout" data-r></div>' +
      '<div class="ctrl"><div class="row"><label>방향</label>' +
      '<button class="btn" data-d="N">북쪽</button><button class="btn" data-d="E">동쪽</button><button class="btn" data-d="S">남쪽</button><button class="btn" data-d="W">서쪽</button></div>' +
      '<div class="row"><label>노출 시간</label><input type="range" min="0" max="12" step="0.1" value="3" data-h></div>' +
      '<div class="row"><button class="btn pri" data-play>▶ 재생</button><span class="lede" style="font-size:12.5px">사진기 셔터를 오래 열어두면 별이 지나간 길이 선으로 남아요.</span></div></div></div>';
    var cv = el.querySelector('[data-c]'), rd = el.querySelector('[data-r]'), sl = el.querySelector('[data-h]');
    var dir = 'N', hrs = 3;
    var TXT = {
      N: '북극성을 중심으로 <b>시계 반대 방향</b>으로 동심원을 그려요.',
      E: '지평선에서 <b>오른쪽 위로 비스듬히</b> 떠올라요.',
      S: '지평선과 나란하게 <b>왼쪽(동) → 오른쪽(서)</b>으로 둥근 호를 그려요.',
      W: '<b>오른쪽 아래로 비스듬히</b> 지평선으로 져요.'
    };
    function draw() {
      var F = E.fit(cv, 0.72, 430);
      E.skyTrails(F.ctx, F.w, F.h, dir, hrs, { angle: true });
      rd.innerHTML = '<span class="big">' + E.VIEWS[dir].name + ' 하늘</span> · ' + hrs.toFixed(1) + '시간 → 15° × ' + hrs.toFixed(1) + ' = <span class="big">' + (15 * hrs).toFixed(0) + '°</span>' +
        '<span class="sub">' + TXT[dir] + ' 원인은 지구 자전(서→동) → 별은 동→서로, 1시간에 15°씩.</span>';
      el.querySelectorAll('[data-d]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-d') === dir); });
    }
    var lp = loop(function (dt) { hrs += dt * 1.6; if (hrs > 12) hrs = 0; sl.value = hrs; draw(); });
    playBtn(el.querySelector('[data-play]'), lp);
    sl.oninput = function () { hrs = +sl.value; draw(); };
    el.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { dir = b.getAttribute('data-d'); draw(); }; });
    draw();
    var off = onResize(draw);
    return function () { lp.stop(); off(); };
  }

  /* ── 공전 궤도 그림 (위에서 본 모습) ── */
  function orbitScene(c, w, hh, e, opt) {
    opt = opt || {};
    E.spaceBg(c, w, hh, 4);
    var cx = w * 0.46, cy = hh * 0.52, Ro = Math.min(w * 0.32, hh * 0.32);
    for (var k = -3; k <= 3; k++) { var y = cy + k * hh * 0.12; E.arrow(c, w - 4, y, w - 34, y, 'rgba(255,210,90,.55)', 1.5, 6); }
    E.label(c, '햇빛', w - 22, 14, E.C.sun, 11);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(cx, cy, Ro, 0, 7); c.stroke(); c.setLineDash([]);
    E.arcArrow(c, cx, cy, Ro + 12, -0.25, -0.75, true, 'rgba(111,214,255,.8)', 2);
    E.label(c, '공전: 서→동', cx + Ro * 0.75, cy - Ro - 4, E.C.cyan, 11);
    E.earthTop(c, cx, cy, Math.max(12, Ro * 0.16), 12, { noRays: true, noSpin: true, noPole: true, showLabelTime: false, noObs: true });
    E.label(c, '지구', cx, cy + Ro * 0.16 + 12, E.C.ink, 11);
    // 주요 위치 라벨
    [[0, '삭'], [90, '상현'], [180, '보름(망)'], [270, '하현']].forEach(function (p) {
      var a = p[0] * D2R, rr = Ro + 30;
      E.label(c, p[1], cx + rr * Math.cos(a), cy - rr * Math.sin(a), 'rgba(255,255,255,.55)', 11);
    });
    var a = e * D2R, mx = cx + Ro * Math.cos(a), my = cy - Ro * Math.sin(a), mr = Math.max(9, Ro * 0.11);
    if (opt.sight) { c.strokeStyle = 'rgba(255,184,77,.6)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]); }
    // 달: 태양 쪽(오른쪽) 반이 항상 밝음
    c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2); c.fill();
    c.strokeStyle = E.C.accent; c.lineWidth = 2; c.beginPath(); c.arc(mx, my, mr + 3, 0, 7); c.stroke();
    return { cx: cx, cy: cy, Ro: Ro, mx: mx, my: my, mr: mr };
  }

  /* ═════════ 시뮬 3: 달의 위상 (음력 날짜·모양·이름) ═════════ */
  function sim3(el) {
    var keys = E.KEY_PHASES.map(function (k) { return '<button class="btn sm" data-k="' + k.d + '">' + k.name + '</button>'; }).join('');
    el.innerHTML =
      '<div class="stage"><div class="two"><div class="cv"><canvas data-o></canvas></div>' +
      '<div class="cv" style="display:flex;flex-direction:column"><canvas data-s></canvas><div class="readout" style="display:flex;gap:12px;align-items:center;flex:1">' +
      '<canvas data-m></canvas><div data-r></div></div></div></div>' +
      '<div class="ctrl"><div class="row"><label>음력 날짜</label><input type="range" min="1" max="29.5" step="0.25" value="3" data-d></div>' +
      '<div class="row"><button class="btn pri" data-play>▶ 재생</button>' + keys + '</div></div></div>';
    var co = el.querySelector('[data-o]'), cs = el.querySelector('[data-s]'), cm = el.querySelector('[data-m]'), rd = el.querySelector('[data-r]'), sl = el.querySelector('[data-d]');
    var day = 3;
    function draw() {
      var e = E.lunarDayToE(day), info = E.phaseInfo(day);
      var O = E.fit(co, 0.9, 420); orbitScene(O.ctx, O.w, O.h, e, { sight: true });
      E.label(O.ctx, '위에서 본 모습 (북극 위)', 10, 14, E.C.muted, 11, 'left');
      // 하늘 (저녁/새벽)
      var S = E.fit(cs, 0.48, 220), c = S.ctx, w = S.w, hh = S.h, base = hh - 26, evening = e <= 180;
      var g = c.createLinearGradient(0, 0, 0, base); g.addColorStop(0, '#0a1230'); g.addColorStop(1, evening ? '#3a2d5a' : '#2d3a66');
      c.fillStyle = g; c.fillRect(0, 0, w, base);
      E.starBg(c, w, base, 9, 40);
      var glowX = evening ? w : 0, gg = c.createRadialGradient(glowX, base, 4, glowX, base, w * 0.45);
      gg.addColorStop(0, 'rgba(255,150,70,.6)'); gg.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = gg; c.fillRect(0, 0, w, base);
      var Rx = w * 0.42, Ry = base - 26, cx = w / 2;
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.setLineDash([3, 5]); c.beginPath(); c.ellipse(cx, base, Rx, Ry, 0, Math.PI, 2 * Math.PI); c.stroke(); c.setLineDash([]);
      var f = evening ? e : 360 - e, x = evening ? cx + Rx * Math.cos(f * D2R) : cx - Rx * Math.cos(f * D2R), y = base - Ry * Math.sin(f * D2R);
      if (f > 8) E.moonPhase(c, x, y, 13, e, { plain: true });
      else E.label(c, '태양 가까이 → 안 보여요', cx, base - 40, E.C.muted, 12);
      c.fillStyle = '#0a1410'; c.fillRect(0, base, w, hh - base);
      E.label(c, '동', 14, base + 13, E.C.accent, 13); E.label(c, '남', cx, base + 13, E.C.accent, 13); E.label(c, '서', w - 14, base + 13, E.C.accent, 13);
      E.pill(c, evening ? '해 진 직후 (저녁 6시경)' : '해 뜨기 직전 (새벽 6시경)', w / 2, 14, 'rgba(0,0,0,.4)', '#fff', 11);
      // 지구에서 본 모양
      var M = E.setup(cm, 92, 92); M.fillStyle = '#070b16'; M.fillRect(0, 0, 92, 92);
      if (info.key === 'new') { M.strokeStyle = 'rgba(255,255,255,.3)'; M.setLineDash([3, 3]); M.beginPath(); M.arc(46, 46, 36, 0, 7); M.stroke(); M.setLineDash([]); }
      else E.moonPhase(M, 46, 46, 36, e);
      rd.innerHTML = '<div style="font-size:12px;color:var(--muted)">지구에서 본 모양</div><div class="big">' + info.name + '</div>' +
        '<div>' + info.day + ' · ' + info.sub + '</div><span class="sub">🔭 ' + info.when + '</span>';
    }
    var lp = loop(function (dt) { day += dt * 3; if (day > 29.5) day = 1; sl.value = day; draw(); });
    playBtn(el.querySelector('[data-play]'), lp);
    sl.oninput = function () { day = +sl.value; draw(); };
    el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { day = +b.getAttribute('data-k'); sl.value = day; draw(); }; });
    draw();
    var off = onResize(draw);
    return function () { lp.stop(); off(); };
  }

  /* ═════════ 시뮬 4: 위상변화 원리 (8위치 + 겹침 해부) ═════════ */
  var POS8 = [
    { e: 0, n: '삭', why: '태양-달-지구가 일직선. 햇빛 받는 면이 지구 반대쪽을 향해, 지구에선 <b>어두운 면만</b> 보여요 → 안 보임.' },
    { e: 45, n: '초승달', why: '지구 쪽 면의 <b>오른쪽 가장자리</b>만 햇빛을 받아요 → 오른쪽이 가는 초승달.' },
    { e: 90, n: '상현달', why: '태양-지구-달이 <b>직각</b>. 지구 쪽 면의 <b>오른쪽 절반</b>만 밝아요 → 상현달.' },
    { e: 135, n: '상현→보름 사이', why: '밝은 부분이 절반보다 많아져요 (오른쪽이 볼록).' },
    { e: 180, n: '보름달 (망)', why: '태양-지구-달이 일직선. 지구 쪽 면 <b>전체</b>가 햇빛을 받아요 → 보름달.' },
    { e: 225, n: '보름→하현 사이', why: '오른쪽부터 어두워지기 시작해요 (왼쪽이 볼록).' },
    { e: 270, n: '하현달', why: '다시 <b>직각</b>. 지구 쪽 면의 <b>왼쪽 절반</b>만 밝아요 → 하현달.' },
    { e: 315, n: '그믐달', why: '<b>왼쪽 가장자리</b>만 가늘게 밝아요 → 그믐달. 다음은 다시 삭.' }
  ];
  function sim4(el) {
    el.innerHTML =
      '<div class="stage"><div class="cv"><canvas data-o style="cursor:pointer"></canvas></div><div class="cv"><canvas data-i></canvas></div>' +
      '<div class="readout" data-r></div>' +
      '<div class="ctrl"><div class="row"><button class="btn sm" data-prev>◀</button><button class="btn pri" data-play>▶ 재생</button><button class="btn sm" data-next>▶</button>' +
      '<span class="lede" style="font-size:12.5px">궤도 위 달을 눌러도 돼요</span></div>' +
      '<div class="row"><button class="btn sm on" data-t="lit">☀ 햇빛 받는 반쪽</button><button class="btn sm on" data-t="vis">👁 지구 쪽 반쪽</button><button class="btn sm on" data-t="both">✨ 겹친 부분</button></div></div></div>';
    var co = el.querySelector('[data-o]'), ci = el.querySelector('[data-i]'), rd = el.querySelector('[data-r]');
    var idx = 1, show = { lit: true, vis: true, both: true }, geo = null, eAnim = 45;
    function drawOrbit() {
      var F = E.fit(co, 1.08, 500), c = F.ctx, w = F.w, hh = F.h;
      E.spaceBg(c, w, hh, 6);
      var cx = w * 0.5, cy = hh * 0.46, Ro = Math.min(w, hh) * 0.23, mr = Math.max(8, Ro * 0.12), Rout = Ro + mr * 3.4 + 12;
      for (var k = -4; k <= 4; k++) { var y = cy + k * hh * 0.1; E.arrow(c, w - 2, y, w - 26, y, 'rgba(255,210,90,.5)', 1.4, 5); }
      E.label(c, '햇빛', w - 16, 12, E.C.sun, 11);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(cx, cy, Ro, 0, 7); c.stroke(); c.setLineDash([]);
      E.earthTop(c, cx, cy, Math.max(11, Ro * 0.2), 12, { noRays: true, noSpin: true, noPole: true, showLabelTime: false, noObs: true });
      geo = { cx: cx, cy: cy, Ro: Ro, pts: [] };
      POS8.forEach(function (p, i) {
        var a = p.e * D2R, mx = cx + Ro * Math.cos(a), my = cy - Ro * Math.sin(a);
        geo.pts.push([mx, my]);
        c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
        c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2); c.fill();
        var ox = cx + Rout * Math.cos(a), oy = cy - Rout * Math.sin(a);
        if (p.e === 0) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([2, 3]); c.beginPath(); c.arc(ox, oy, mr * 1.15, 0, 7); c.stroke(); c.setLineDash([]); }
        else E.moonPhase(c, ox, oy, mr * 1.15, p.e, { plain: true });
        if (i === idx) {
          c.strokeStyle = E.C.accent; c.lineWidth = 2.5; c.beginPath(); c.arc(mx, my, mr + 4, 0, 7); c.stroke();
          c.beginPath(); c.arc(ox, oy, mr * 1.15 + 4, 0, 7); c.stroke();
          c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,184,77,.55)'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
        }
      });
      E.label(c, '안쪽 = 우주에서 본 달 (항상 반쪽이 밝음)', 10, hh - 26, E.C.muted, 11, 'left');
      E.label(c, '바깥 = 지구에서 본 달의 모양', 10, hh - 10, E.C.accent, 11, 'left');
    }
    function drawInset() {
      var F = E.fit(ci, 0.46, 230), c = F.ctx, w = F.w, hh = F.h, e = POS8[idx].e;
      E.spaceBg(c, w, hh, 8);
      var cx = w * 0.3, cy = hh * 0.52, r = hh * 0.32, S = r * 3;
      var ex = -Math.cos(e * D2R), ey = Math.sin(e * D2R); // 달→지구 방향(화면)
      c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      function clipDisk() { c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); }
      if (show.lit) { c.save(); clipDisk(); halfPlane(c, cx, cy, 1, 0, S); c.fillStyle = 'rgba(255,214,110,.45)'; c.fill(); c.restore(); }
      if (show.vis) {
        c.save(); clipDisk(); halfPlane(c, cx, cy, ex, ey, S); c.fillStyle = 'rgba(111,214,255,.25)'; c.fill(); c.restore();
        c.strokeStyle = E.C.cyan; c.setLineDash([4, 3]); c.lineWidth = 1.5; c.beginPath();
        c.moveTo(cx - ey * r * 1.2, cy + ex * r * 1.2); c.lineTo(cx + ey * r * 1.2, cy - ex * r * 1.2); c.stroke(); c.setLineDash([]);
      }
      if (show.both) { c.save(); clipDisk(); halfPlane(c, cx, cy, 1, 0, S); c.clip(); halfPlane(c, cx, cy, ex, ey, S); c.fillStyle = '#fff3c4'; c.fill(); c.restore(); }
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
      E.arrow(c, cx + ex * (r + 6), cy + ey * (r + 6), cx + ex * (r + 34), cy + ey * (r + 34), E.C.cyan, 2, 7);
      E.label(c, '지구 쪽', cx + ex * (r + 48), cy + ey * (r + 48), E.C.cyan, 11);
      for (var k = -1; k <= 1; k++) E.arrow(c, cx + r + 46, cy + k * r * 0.6, cx + r + 16, cy + k * r * 0.6, 'rgba(255,210,90,.7)', 1.5, 5);
      E.label(c, '햇빛', cx + r + 40, cy - r - 6, E.C.sun, 10);
      E.arrow(c, w * 0.6, cy, w * 0.68, cy, '#fff', 2, 7);
      if (e === 0) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(w * 0.82, cy, r * 0.85, 0, 7); c.stroke(); c.setLineDash([]); }
      else E.moonPhase(c, w * 0.82, cy, r * 0.85, e);
      E.label(c, '지구에서 보면', w * 0.82, cy - r - 8, E.C.accent, 11);
      E.label(c, '달 확대 (위에서 본 모습)', 10, 12, E.C.muted, 11, 'left');
      rd.innerHTML = '<span class="big">' + POS8[idx].n + '</span><span class="sub" style="color:var(--ink);font-weight:600">' + POS8[idx].why +
        '<br>✨ 우리가 보는 모양 = <b>햇빛 받는 반쪽</b> ∩ <b>지구 쪽 반쪽</b></span>';
    }
    function draw() { drawOrbit(); drawInset(); }
    var acc = 0, lp = loop(function (dt) { acc += dt; if (acc > 1.4) { acc = 0; idx = (idx + 1) % 8; draw(); } });
    playBtn(el.querySelector('[data-play]'), lp);
    el.querySelector('[data-prev]').onclick = function () { idx = (idx + 7) % 8; draw(); };
    el.querySelector('[data-next]').onclick = function () { idx = (idx + 1) % 8; draw(); };
    el.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-t'); show[k] = !show[k]; b.classList.toggle('on', show[k]); drawInset(); }; });
    co.addEventListener('click', function (ev) {
      if (!geo) return; var rc = co.getBoundingClientRect(), x = ev.clientX - rc.left, y = ev.clientY - rc.top, best = -1, bd = 1e9;
      geo.pts.forEach(function (p, i) { var d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
      if (bd < 50) { idx = best; draw(); }
    });
    draw();
    var off = onResize(draw);
    return function () { lp.stop(); off(); };
  }

  /* ═════════ 시뮬 5: 일식과 월식 ═════════ */
  function sim5(el) {
    el.innerHTML =
      '<div class="stage"><div class="row" style="padding:12px 14px 0"><button class="btn on" data-m="solar">☀️ 일식</button><button class="btn" data-m="lunar">🌕 월식</button></div>' +
      '<div class="cv" style="margin-top:10px"><canvas data-a></canvas></div><div class="cv"><canvas data-b></canvas></div>' +
      '<div class="readout" data-r></div>' +
      '<div class="ctrl"><div class="row"><label>진행</label><input type="range" min="0" max="1" step="0.005" value="0.3" data-p></div>' +
      '<div class="row"><button class="btn pri" data-play>▶ 재생</button></div>' +
      '<div class="row" data-opts></div></div></div>';
    var ca = el.querySelector('[data-a]'), cb = el.querySelector('[data-b]'), rd = el.querySelector('[data-r]'), sl = el.querySelector('[data-p]'), opts = el.querySelector('[data-opts]');
    var mode = 'solar', p = 0.3, obs = 'A', path = 'center';
    var OBS = { A: '본그림자 지역', B: '반그림자 지역', C: '그림자 밖 (낮)', D: '밤인 지역' };
    function renderOpts() {
      if (mode === 'solar') opts.innerHTML = '<label>관측 위치</label>' + Object.keys(OBS).map(function (k) { return '<button class="btn sm' + (k === obs ? ' on' : '') + '" data-o="' + k + '">' + k + ' ' + OBS[k] + '</button>'; }).join('');
      else opts.innerHTML = '<label>달의 경로</label><button class="btn sm' + (path === 'center' ? ' on' : '') + '" data-pa="center">그림자 한가운데 통과</button><button class="btn sm' + (path === 'edge' ? ' on' : '') + '" data-pa="edge">그림자 가장자리 통과</button>';
      opts.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { obs = b.getAttribute('data-o'); renderOpts(); draw(); }; });
      opts.querySelectorAll('[data-pa]').forEach(function (b) { b.onclick = function () { path = b.getAttribute('data-pa'); renderOpts(); draw(); }; });
    }
    function schematicSolar(c, w, hh) {
      E.spaceBg(c, w, hh, 12);
      var cy = hh / 2, sx = -hh * 0.1, sr = hh * 0.42, mx = w * 0.5, mr = Math.max(6, hh * 0.04), ex = w * 0.82, R = hh * 0.24;
      var my = cy + (p - 0.5) * hh * 0.8;
      E.sun(c, sx, cy, sr);
      // 지구 (왼쪽=낮)
      c.save(); c.beginPath(); c.arc(ex, cy, R, 0, 7); c.clip();
      c.fillStyle = E.C.earthDay; c.fillRect(ex - R, cy - R, 2 * R, 2 * R); c.fillStyle = E.C.earthNight; c.fillRect(ex, cy - R, R, 2 * R);
      // 그림자: 반그림자/본그림자 (지구 표면에 떨어진 부분)
      var kSlope = (my - cy) / (mx - sx), hitY = cy + (ex - R - sx) * kSlope;
      var penW = R * 0.75, umW = R * 0.06;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(ex - R, hitY, R * 0.5, penW, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.9)'; c.beginPath(); c.ellipse(ex - R + 2, hitY, 5, Math.max(4, umW), 0, 0, 7); c.fill();
      c.restore();
      // 그림자 원뿔
      var tx = ex - R + 2;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(mx, my - mr); c.lineTo(tx, hitY - penW); c.lineTo(tx, hitY + penW); c.lineTo(mx, my + mr); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.moveTo(mx, my - mr); c.lineTo(tx, hitY); c.lineTo(mx, my + mr); c.closePath(); c.fill();
      // 달
      c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, mr, Math.PI / 2, Math.PI * 1.5); c.fill();
      E.label(c, '달', mx, my - mr - 10, E.C.ink, 11); E.label(c, '태양', 30, 14, E.C.sun, 12); E.label(c, '지구', ex, cy + R + 12, E.C.ink, 11);
      E.arrow(c, mx + 14, cy - hh * 0.36, mx + 14, cy - hh * 0.22, E.C.cyan, 1.6, 6);
      E.label(c, '달 공전 방향', mx + 50, cy - hh * 0.36, E.C.cyan, 10);
      // 관측자 표시
      var P = { A: [ex - R, cy], B: [ex - R * Math.cos(0.75), cy - R * Math.sin(0.75)], C: [ex - R * Math.cos(1.3), cy + R * Math.sin(1.3)], D: [ex + R, cy] };
      Object.keys(P).forEach(function (k) {
        c.fillStyle = k === obs ? E.C.accent : 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(P[k][0], P[k][1], k === obs ? 5 : 3.5, 0, 7); c.fill();
        E.label(c, k, P[k][0] + (k === 'D' ? 12 : -12), P[k][1] + (k === 'B' ? -6 : 0), k === obs ? E.C.accent : '#fff', 12);
      });
      E.label(c, '태양 - 달 - 지구 일직선 · 달은 삭', w / 2, hh - 10, E.C.accent, 11);
    }
    function schematicLunar(c, w, hh) {
      E.spaceBg(c, w, hh, 13);
      var cy = hh / 2, sx = -hh * 0.1, sr = hh * 0.42, ex = w * 0.42, R = hh * 0.2, mx = w * 0.84, mr = Math.max(7, hh * 0.05);
      var my = cy + (0.5 - p) * hh * 0.8;
      E.sun(c, sx, cy, sr);
      // 지구 그림자 원뿔
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(ex, cy - R); c.lineTo(w, cy - R * 1.9); c.lineTo(w, cy + R * 1.9); c.lineTo(ex, cy + R); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.72)'; c.beginPath(); c.moveTo(ex, cy - R); c.lineTo(w, cy - R * 0.45); c.lineTo(w, cy + R * 0.45); c.lineTo(ex, cy + R); c.closePath(); c.fill();
      E.label(c, '본그림자', w * 0.7, cy, 'rgba(255,255,255,.55)', 10);
      E.label(c, '반그림자', w * 0.66, cy - R * 1.35, 'rgba(255,255,255,.45)', 10);
      // 지구
      c.save(); c.beginPath(); c.arc(ex, cy, R, 0, 7); c.clip();
      c.fillStyle = E.C.earthDay; c.fillRect(ex - R, cy - R, 2 * R, 2 * R); c.fillStyle = E.C.earthNight; c.fillRect(ex, cy - R, R, 2 * R); c.restore();
      c.strokeStyle = E.C.accent; c.lineWidth = 2; c.beginPath(); c.arc(ex, cy, R + 3, -Math.PI / 2, Math.PI / 2); c.stroke();
      E.label(c, '밤인 지역 = 월식 관찰 가능', ex, cy + R + 14, E.C.accent, 10, 'center');
      // 달
      var st = lunarState();
      c.fillStyle = st.frac > 0.995 ? '#b5452e' : (st.frac > 0 ? '#c9a46a' : '#f3ead2'); c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      E.label(c, '달', mx + mr + 10, my, E.C.ink, 11, 'left'); E.label(c, '태양', 30, 14, E.C.sun, 12); E.label(c, '지구', ex, cy - R - 10, E.C.ink, 11);
      E.arrow(c, w - 24, cy + hh * 0.3, w - 24, cy + hh * 0.12, E.C.cyan, 1.6, 6);
      E.label(c, '달 공전', w - 4, cy + hh * 0.37, E.C.cyan, 10, 'right');
      E.label(c, '태양 - 지구 - 달 일직선 · 달은 망(보름)', w / 2, hh - 10, E.C.accent, 11);
    }
    function lunarState() {
      var m = 1, Ru = 2.6, x = (1 - 2 * p) * 6.2, y = path === 'center' ? 0 : 2.05, d = Math.hypot(x, y);
      return { x: x, y: y, frac: E.overlap(m, Ru, d) / Math.PI, d: d };
    }
    function skySolar(c, w, hh) {
      if (obs === 'D') {
        E.spaceBg(c, w, hh, 21);
        E.label(c, '🌙 밤인 지역', w / 2, hh / 2 - 12, '#fff', 16);
        E.label(c, '태양이 지평선 아래 → 일식을 볼 수 없어요', w / 2, hh / 2 + 14, E.C.muted, 13);
        return { frac: 0, label: '관찰 불가 (밤)' };
      }
      var cx = w / 2, cy = hh / 2 - 6, r = hh * 0.24;
      var off = { A: 0, B: 1.05, C: 2.6 }[obs];
      var x = cx + (1 - 2 * p) * 2.6 * r, y = cy + off * r;
      var frac = E.overlap(r, r * 1.03, Math.hypot(x - cx, y - cy)) / (Math.PI * r * r);
      frac = Math.min(1, frac);
      var b = 1 - 0.85 * Math.pow(frac, 3);
      var g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgb(' + Math.round(40 * b) + ',' + Math.round(120 * b) + ',' + Math.round(210 * b + 20) + ')');
      g.addColorStop(1, 'rgb(' + Math.round(140 * b) + ',' + Math.round(200 * b) + ',' + Math.round(250 * b + 5) + ')');
      c.fillStyle = g; c.fillRect(0, 0, w, hh);
      if (frac > 0.995) { // 코로나
        var cg = c.createRadialGradient(cx, cy, r, cx, cy, r * 2.6); cg.addColorStop(0, 'rgba(255,255,255,.9)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, r * 2.6, 0, 7); c.fill(); E.starBg(c, w, hh, 30, 25);
      } else E.sun(c, cx, cy, r);
      c.fillStyle = '#0d0f14'; c.beginPath(); c.arc(x, y, r * 1.03, 0, 7); c.fill();
      E.label(c, '← 동 (왼쪽)', 50, hh - 12, '#fff', 11); E.label(c, '서 (오른쪽) →', w - 54, hh - 12, '#fff', 11);
      E.pill(c, '관측 위치 ' + obs + ' 에서 본 태양', w / 2, 14, 'rgba(0,0,0,.4)', '#fff', 11);
      if (frac > 0.001 && frac < 0.35 && x > cx) E.label(c, '태양의 오른쪽(서쪽)부터 가려져요!', w / 2, hh - 30, E.C.accent, 13);
      return { frac: frac, label: frac > 0.995 ? '개기일식' : (frac > 0.001 ? '부분일식' : '일식 아님') };
    }
    function skyLunar(c, w, hh) {
      E.spaceBg(c, w, hh, 22);
      var st = lunarState(), m = hh * 0.11, cx = w / 2, cy = hh / 2 - 4;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(cx, cy, 4.4 * m, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(cx, cy, 2.6 * m, 0, 7); c.stroke(); c.setLineDash([]);
      E.label(c, '지구의 본그림자', cx + 2.6 * m * 0.75, cy + 2.6 * m * 0.75 + 8, 'rgba(255,255,255,.4)', 10);
      var x = cx + st.x * m, y = cy + st.y * m;
      var mg = c.createRadialGradient(x - m * 0.3, y - m * 0.3, m * 0.1, x, y, m); mg.addColorStop(0, '#fffaf0'); mg.addColorStop(1, '#e2d6b4');
      c.fillStyle = mg; c.beginPath(); c.arc(x, y, m, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(x, y, m, 0, 7); c.clip();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(cx, cy, 4.4 * m, 0, 7); c.fill();
      c.fillStyle = st.frac > 0.995 ? 'rgba(150,45,25,.85)' : 'rgba(70,22,14,.9)'; c.beginPath(); c.arc(cx, cy, 2.6 * m, 0, 7); c.fill();
      c.restore();
      E.label(c, '← 동 (왼쪽)', 50, hh - 12, '#fff', 11); E.label(c, '서 (오른쪽) →', w - 54, hh - 12, '#fff', 11);
      E.pill(c, '밤하늘에서 본 달', w / 2, 14, 'rgba(255,255,255,.12)', '#fff', 11);
      if (st.frac > 0.001 && st.frac < 0.35 && st.x > 0) E.label(c, '달의 왼쪽(동쪽)부터 가려져요!', w / 2, hh - 30, E.C.accent, 13);
      if (st.frac > 0.995) E.label(c, '붉게 보여요 (지구 대기를 지난 붉은빛)', w / 2, hh - 30, '#ff9a7a', 12);
      return { frac: st.frac, label: st.frac > 0.995 ? '개기월식' : (st.frac > 0.001 ? '부분월식' : '월식 아님 (그림자 밖)') };
    }
    function draw() {
      var A = E.fit(ca, 0.5, 280), B = E.fit(cb, 0.5, 260), res;
      if (mode === 'solar') { schematicSolar(A.ctx, A.w, A.h); res = skySolar(B.ctx, B.w, B.h); }
      else { schematicLunar(A.ctx, A.w, A.h); res = skyLunar(B.ctx, B.w, B.h); }
      var info = mode === 'solar'
        ? '위치: 태양-달-지구 · 위상: 삭(음력 1일경) · 달이 태양을 가림<br>본그림자 지역 → 개기일식, 반그림자 지역 → 부분일식 (좁은 지역에서만)'
        : '위치: 태양-지구-달 · 위상: 망(보름, 음력 15일경) · 달이 지구 그림자 속으로<br>달 전체가 본그림자 → 개기월식, 일부만 → 부분월식 · 밤인 지역이면 어디서나 관찰';
      rd.innerHTML = '<span class="big">' + res.label + '</span> · 가려진 비율 ' + Math.round(res.frac * 100) + '%<span class="sub">' + info + '</span>';
    }
    var lp = loop(function (dt) { p += dt * 0.12; if (p > 1) p = 0; sl.value = p; draw(); });
    playBtn(el.querySelector('[data-play]'), lp);
    sl.oninput = function () { p = +sl.value; draw(); };
    el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = b.getAttribute('data-m'); el.querySelectorAll('[data-m]').forEach(function (x) { x.classList.toggle('on', x === b); }); renderOpts(); draw(); }; });
    renderOpts(); draw();
    var off = onResize(draw);
    return function () { lp.stop(); off(); };
  }

  /* ═════════ 콘텐츠 (평가기준 1:1) ═════════ */
  var CH = [
    {
      id: 'ch1', n: 1, short: '자전', title: '지구 자전과 천체의 겉보기 운동',
      rubric: '<b>평가요소 ①</b> 지구의 자전과 지구 자전에 의해 나타나는 천체의 겉보기 운동을 정확하게 설명함.',
      hook: '해는 아침에 동쪽에서 떠서 저녁에 서쪽으로 져요. 그런데 정말 <b>해가 움직이는</b> 걸까요? 달리는 기차 안에서 창밖 나무가 뒤로 “달려가는” 것처럼 보이는 것과 같은 일이 하늘에서도 벌어져요.',
      idea: '<ul><li><span class="key">자전</span>: 지구가 자전축을 중심으로 <b>서 → 동</b> 방향으로 <b>하루에 한 바퀴</b> 도는 것. (북극 위에서 보면 <b>시계 반대 방향</b>)</li>' +
        '<li>하루 24시간에 360° → <b>1시간에 15°</b></li>' +
        '<li><span class="key">겉보기 운동</span>: 지구가 서→동으로 도니까, 지구 위의 우리에게는 태양·달·별이 <b>동 → 서</b>로 하루에 한 바퀴 도는 것처럼 <b>보여요</b>. (실제로 움직이는 게 아니라 “보이는” 운동)</li>' +
        '<li>그래서 태양은 <b>동쪽에서 떠서 → 남쪽 하늘을 지나 → 서쪽으로</b> 져요.</li></ul>',
      sim: sim1,
      observe: ['재생을 누르고 위 그림의 “나”가 지구와 함께 <b>시계 반대 방향</b>으로 도는 걸 보세요.', '“나”가 낮 쪽으로 들어서는 순간(6시) → 아래 하늘에서 태양이 동쪽에서 떠요.', '“나”가 태양을 정면으로 볼 때(12시) → 태양이 남쪽 하늘 가장 높은 곳.', '밤에는 별들도 똑같이 동→서로 움직여요. 별도 “겉보기 운동”이에요.'],
      answer: '<p>지구는 자전축을 중심으로 <b>서쪽에서 동쪽으로 하루에 한 바퀴</b>(1시간에 15°) 자전한다.</p><p>이 때문에 지구에서 보면 태양, 달, 별 같은 천체가 <b>동쪽에서 서쪽으로 하루에 한 바퀴씩 도는 것처럼 보이는데</b>, 이를 천체의 겉보기 운동(일주 운동)이라고 한다.</p><p>예) 태양은 동쪽 하늘에서 떠서 남쪽 하늘을 지나 서쪽 하늘로 진다.</p>',
      trap: ['자전 방향은 <b>서→동</b>, 천체가 움직여 보이는 방향은 <b>동→서</b> — 반대예요! 섞어 쓰면 감점.', '겉보기 운동(일주 운동)의 원인은 <b>자전</b>. 공전이 아니에요.', '“태양이 지구 주위를 돈다” ✕ → “지구가 자전하기 때문에 도는 것처럼 보인다” ○'],
      check: [{ q: '지구의 자전 방향은?', a: '서 → 동 (북극 위에서 보면 시계 반대 방향)' }, { q: '천체는 1시간에 몇 도씩 움직여 보이나요? 왜?', a: '15°. 지구가 24시간에 360° 자전하니까 360 ÷ 24 = 15°' }, { q: '태양이 동쪽에서 떠서 서쪽으로 지는 까닭을 한 문장으로.', a: '지구가 서쪽에서 동쪽으로 자전하기 때문에 태양이 동쪽에서 서쪽으로 움직이는 것처럼 보인다.' }]
    },
    {
      id: 'ch2', n: 2, short: '일주운동', title: '별의 일주 운동',
      rubric: '<b>평가요소 ②</b> 별의 일주운동 모습을 정확하게 표현하고 설명함. → <b>4방향 그림</b>을 그릴 줄 알아야 해요!',
      hook: '밤하늘을 향해 카메라 셔터를 몇 시간 열어두면 별들이 <b>선</b>을 그려요. 북쪽은 동그랗게, 남쪽은 둥근 무지개처럼… 왜 방향마다 모양이 다를까요?',
      idea: '<ul><li><span class="key">일주 운동</span>: 지구 자전 때문에 별이 <b>동 → 서</b>로 하루에 한 바퀴 도는 것처럼 보이는 운동. <b>1시간에 15°</b>.</li>' +
        '<li>회전 중심 = 하늘의 북극 근처에 있는 <b>북극성</b> (지구 자전축을 연장한 곳). 그래서 북극성은 거의 안 움직여요.</li>' +
        '<li>보는 방향에 따라 모양이 달라요 — 아래 시뮬에서 4방향을 꼭 다 눌러보세요.</li></ul>' +
        '<table class="t" style="margin-top:8px"><tr><th>방향</th><th>별이 움직이는 모습</th></tr>' +
        '<tr><td><b>북쪽</b></td><td>북극성 중심, <b>시계 반대 방향</b> 동심원</td></tr><tr><td><b>동쪽</b></td><td>지평선에서 <b>오른쪽 위로 비스듬히</b> 떠오름</td></tr>' +
        '<tr><td><b>남쪽</b></td><td>지평선과 나란히 <b>동(왼쪽) → 서(오른쪽)</b> 둥근 호</td></tr><tr><td><b>서쪽</b></td><td><b>오른쪽 아래로 비스듬히</b> 짐</td></tr></table>',
      sim: sim2,
      observe: ['북쪽: 노출 시간을 2시간 → 4시간으로 늘려보세요. 호의 각도가 30° → 60°로 커져요 (15°×시간).', '북쪽 하늘 화살표 방향이 <b>시계 반대</b>인지 확인!', '동쪽과 서쪽은 둘 다 “오른쪽”으로 비스듬해요 — 동쪽은 위로, 서쪽은 아래로.', '남쪽은 왼쪽(동)에서 오른쪽(서)으로. 남쪽을 보면 왼쪽이 동쪽이라는 걸 기억!'],
      answer: '<p>별의 일주 운동은 <b>지구가 자전</b>하기 때문에 별이 <b>동쪽에서 서쪽으로</b> 하루에 한 바퀴(<b>1시간에 15°</b>)씩 도는 것처럼 보이는 운동이다.</p>' +
        '<p>북쪽 하늘: 북극성을 중심으로 <b>시계 반대 방향</b>으로 원을 그린다. 동쪽 하늘: <b>오른쪽 위로 비스듬히</b> 떠오른다. 남쪽 하늘: 지평선과 나란하게 <b>동쪽에서 서쪽으로</b>(왼쪽→오른쪽) 이동한다. 서쪽 하늘: <b>오른쪽 아래로 비스듬히</b> 진다.</p>',
      trap: ['북쪽 하늘은 <b>시계 반대</b> 방향. 시계 방향으로 그리면 오답!', '그림엔 <b>화살표</b>로 방향 표시 + <b>중심(북극성)</b> + <b>각도(15°×시간)</b>를 꼭 함께.', '남쪽 하늘: 관측자가 남쪽을 보면 <b>왼쪽 = 동</b>, <b>오른쪽 = 서</b>.'],
      check: [{ q: '북쪽 하늘 별이 3시간 동안 회전한 각도는?', a: '15° × 3 = 45°' }, { q: '동쪽 하늘 별의 움직임을 그림으로 그리면?', a: '지평선에서 오른쪽 위로 비스듬한 평행선들 (화살표는 위쪽)' }, { q: '북극성이 거의 움직이지 않는 이유는?', a: '지구 자전축을 북쪽으로 연장한 곳(천구의 북극) 가까이에 있어서 회전 중심이 되기 때문' }]
    },
    {
      id: 'ch3', n: 3, short: '달의 위상', title: '달의 위상 — 날짜·모양·이름',
      rubric: '<b>평가요소 ③</b> 음력 날짜에 따른 달의 모양과 명칭을 <b>모두</b> 정확하게 설명함.',
      hook: '달은 매일 모양이 바뀌어요. 그런데 <b>음력 날짜</b>만 알면 오늘 밤 달 모양을 맞힐 수 있어요. 음력 15일이면? 그렇죠, 추석 보름달!',
      idea: '<table class="t"><tr><th>음력</th><th>이름</th><th>모양</th><th>언제·어디서</th></tr>' +
        '<tr><td>1일경</td><td><b>삭</b></td><td>안 보임</td><td>태양과 같은 방향</td></tr>' +
        '<tr><td>2~3일경</td><td><b>초승달</b></td><td>오른쪽 가늘게</td><td>초저녁 서쪽 하늘</td></tr>' +
        '<tr><td>7~8일경</td><td><b>상현달</b></td><td>오른쪽 반원</td><td>초저녁 남쪽 하늘</td></tr>' +
        '<tr><td>15일경</td><td><b>보름달(망)</b></td><td>둥근 원</td><td>초저녁 동쪽에서 떠서 밤새</td></tr>' +
        '<tr><td>22~23일경</td><td><b>하현달</b></td><td>왼쪽 반원</td><td>새벽 남쪽 하늘</td></tr>' +
        '<tr><td>27~28일경</td><td><b>그믐달</b></td><td>왼쪽 가늘게</td><td>새벽 동쪽 하늘</td></tr></table>' +
        '<p style="margin:10px 0 0">순서: 삭 → 초승달 → 상현달 → 보름달 → 하현달 → 그믐달 → 삭 (약 <b>29.5일</b> = 한 달). 오른쪽부터 차오르고, 오른쪽부터 줄어들어요.</p>',
      sim: sim3,
      observe: ['재생을 누르면 한 달이 지나가요. 같은 시각(저녁)에 본 달이 <b>서쪽 → 남쪽 → 동쪽</b>으로 하루에 약 13°씩 옮겨가요.', '음력 2~3일: 초승달은 해 진 직후 <b>서쪽</b> 하늘에 낮게.', '음력 7~8일: 상현달은 저녁 <b>남쪽</b> 하늘.', '음력 15일: 보름달은 해가 질 때 <b>동쪽</b>에서 떠올라요.', '하현·그믐은 저녁엔 안 보이고 <b>새벽</b>에 보여요.'],
      answer: '<p>음력 <b>2~3일경</b> 오른쪽이 가늘게 밝은 <b>초승달</b>, <b>7~8일경</b> 오른쪽 반원이 밝은 <b>상현달</b>, <b>15일경</b> 둥근 <b>보름달(망)</b>, <b>22~23일경</b> 왼쪽 반원이 밝은 <b>하현달</b>, <b>27~28일경</b> 왼쪽이 가늘게 밝은 <b>그믐달</b>이 보인다. 음력 <b>1일경</b>은 달이 보이지 않는 <b>삭</b>이다.</p>',
      trap: ['<b>상현 = 오른쪽</b>, <b>하현 = 왼쪽</b> 반원. (기억법: 초승→상현→보름은 <b>차오르는</b> 달 = 오른쪽부터 밝아짐)', '초승달 <b>오른쪽</b>, 그믐달 <b>왼쪽</b>. 알파벳으로: 차오르는 달은 <b>D</b> 모양, 줄어드는 달은 <b>C</b> 모양.', '“모양과 명칭을 <b>모두</b>” — 이름·날짜·모양 세 가지를 짝지어 써야 만점.'],
      check: [{ q: '음력 7~8일경 달의 이름과 모양은?', a: '상현달, 오른쪽 반원이 밝음' }, { q: '왼쪽이 가늘게 밝은 달의 이름과 음력 날짜는?', a: '그믐달, 음력 27~28일경' }, { q: '음력 15일경의 달 이름 두 가지는?', a: '보름달, 망' }]
    },
    {
      id: 'ch4', n: 4, short: '위상 원리', title: '달의 운동과 위상변화의 원리',
      rubric: '<b>평가요소 ④</b> 달의 운동과 위상변화 원리를 정확하게 설명함.',
      hook: '어두운 방에서 스탠드를 켜고, 귤을 손에 들고 내 주위를 한 바퀴 돌려보세요. 귤은 언제나 <b>반쪽만</b> 불빛을 받는데, 내 눈에는 귤의 밝은 부분이 가늘었다가 반쪽이었다가 동그래져요. 그게 바로 달의 위상 변화예요!',
      idea: '<ul><li>달은 스스로 빛을 내지 못하고 <b>햇빛을 반사</b>해서 밝게 보여요. 그래서 달은 언제나 <b>태양 쪽 반쪽만</b> 밝아요.</li>' +
        '<li>달은 지구 주위를 <b>서 → 동</b>으로 약 한 달에 한 바퀴 <b>공전</b>해요 (공전 주기 약 27.3일).</li>' +
        '<li>공전하면서 <b>태양–지구–달의 상대적 위치</b>가 바뀌면, 지구에서 보이는 <b>밝은 부분의 모양</b>이 달라져요 → <span class="key">위상 변화</span> (주기 약 29.5일).</li>' +
        '<li>✨ 우리가 보는 모양 = <b>햇빛 받는 반쪽</b>과 <b>지구를 향한 반쪽</b>이 겹친 부분.</li></ul>',
      sim: sim4,
      observe: ['안쪽 달 8개는 모두 <b>오른쪽(태양 쪽) 반쪽</b>이 밝아요. 우주에서 보면 달은 항상 반달!', '그런데 바깥 링(지구에서 본 모양)은 위치마다 달라요.', '아래 확대 그림에서 노란 반쪽(햇빛)과 파란 반쪽(지구 쪽)이 <b>겹치는</b> 흰 부분 = 우리가 보는 모양.', '삭: 겹치는 부분 0 → 안 보임 / 보름: 완전히 겹침 → 다 보임.'],
      answer: '<p>달은 스스로 빛을 내지 못하고 <b>햇빛을 반사</b>하여 밝게 보인다. 달은 지구 주위를 <b>서쪽에서 동쪽으로 공전</b>하는데, 이에 따라 <b>태양, 지구, 달의 상대적인 위치가 달라지므로</b> 지구에서 보이는 달의 밝은 부분의 모양이 달라진다. 이를 달의 위상 변화라고 한다.</p>' +
        '<p>달이 태양과 같은 방향(태양-달-지구)에 있으면 <b>삭</b>, 반대 방향(태양-지구-달)에 있으면 <b>망(보름달)</b>, 태양-지구-달이 직각을 이루면 <b>상현달·하현달</b>이 된다. 위상은 약 <b>29.5일</b> 주기로 삭→초승달→상현달→망→하현달→그믐달 순서로 변한다.</p>',
      trap: ['위상 변화 원인은 “지구 그림자가 달을 가려서” <b>✕</b> ← 이건 월식! 위상 변화는 <b>위치 관계</b> 때문.', '달은 <b>스스로 빛나지 않음</b> — 이 한 줄 빠뜨리면 원리 설명이 불완전.', '공전 방향 <b>서→동</b> (북극 위에서 보면 시계 반대) — 자전 방향과 같아요.'],
      check: [{ q: '보름달일 때 태양·지구·달의 배열은?', a: '태양 - 지구 - 달 (일직선, 지구가 가운데)' }, { q: '달의 위상이 변하는 까닭을 한 문장으로.', a: '달이 지구 주위를 공전하면서 태양·지구·달의 상대적 위치가 달라져, 지구에서 보이는 햇빛 받는 부분의 모양이 달라지기 때문이다.' }, { q: '우주에서 보면 달의 밝은 부분은 항상 몇 분의 몇?', a: '항상 절반(반쪽) — 태양 쪽' }]
    },
    {
      id: 'ch5', n: 5, short: '일식·월식', title: '일식과 월식',
      rubric: '<b>평가요소 ⑤</b> 일식 또는 월식이 일어나는 원리를 <b>① 천체의 상대적 위치 ② 달의 위상 ③ 가려지는 부분 ④ 개기식과 부분식이 관찰되는 지역</b>을 모두 포함하여 정확하게 설명함.',
      hook: '2026년 3월 3일 밤, 우리나라에서 보름달이 붉게 물드는 <b>개기월식</b>이 있었어요. 해가 사라지는 일식, 달이 붉어지는 월식 — 둘 다 <b>세 천체가 일직선</b>에 놓일 때 일어나요. 누가 가운데에 서느냐가 핵심!',
      idea: '<table class="t"><tr><th></th><th>☀️ 일식</th><th>🌕 월식</th></tr>' +
        '<tr><td><b>① 위치</b></td><td>태양 - <b>달</b> - 지구</td><td>태양 - <b>지구</b> - 달</td></tr>' +
        '<tr><td><b>② 위상</b></td><td><b>삭</b> (음력 1일경)</td><td><b>망</b> (보름, 음력 15일경)</td></tr>' +
        '<tr><td><b>무엇이 무엇을</b></td><td>달이 태양을 가림</td><td>달이 지구 그림자에 들어감</td></tr>' +
        '<tr><td><b>③ 가려지는 부분</b></td><td>태양의 <b>오른쪽(서쪽)</b>부터</td><td>달의 <b>왼쪽(동쪽)</b>부터</td></tr>' +
        '<tr><td><b>④ 관찰 지역</b></td><td>달의 <b>본그림자</b> 지역 → 개기일식<br>달의 <b>반그림자</b> 지역 → 부분일식<br>(낮인 좁은 지역)</td><td>달 전체가 본그림자 → 개기월식<br>일부만 → 부분월식<br>(<b>밤인 모든 지역</b>에서 관찰)</td></tr></table>' +
        '<p style="margin:10px 0 0">왜 가려지는 쪽이 정해져 있을까? 달은 <b>서→동</b>으로 공전하니까, 하늘에서 달은 오른쪽(서)에서 왼쪽(동)으로 움직여요. 그래서 일식은 달이 태양의 <b>오른쪽</b>부터 덮고, 월식은 달의 <b>왼쪽</b>이 먼저 그림자에 들어가요.</p>',
      sim: sim5,
      observe: ['일식: 관측 위치 A(본그림자)로 놓고 재생 → 개기일식 + 코로나!', 'B(반그림자)로 바꾸면 끝까지 <b>부분일식</b>만.', 'D(밤)는 태양이 안 보이니 일식도 못 봐요 → 일식은 좁은 지역에서만.', '월식: “그림자 한가운데 통과” → 개기월식(붉은 달), “가장자리” → 부분월식.', '시작할 때 가려지는 쪽을 꼭 보세요 — 일식은 태양 <b>오른쪽</b>, 월식은 달 <b>왼쪽</b>.'],
      answer: '<p><b>일식</b>은 <b>태양-달-지구</b> 순서로 일직선에 놓여 <b>달이 태양을 가리는</b> 현상으로, 달의 위상이 <b>삭</b>일 때 일어난다. 달이 서쪽에서 동쪽으로 공전하므로 태양의 <b>오른쪽(서쪽)부터</b> 가려진다. 달의 <b>본그림자</b>가 생기는 지역에서는 <b>개기일식</b>, <b>반그림자</b>가 생기는 지역에서는 <b>부분일식</b>이 관찰된다.</p>' +
        '<p><b>월식</b>은 <b>태양-지구-달</b> 순서로 일직선에 놓여 <b>달이 지구의 그림자 속으로 들어가는</b> 현상으로, 달의 위상이 <b>망(보름달)</b>일 때 일어난다. 달의 <b>왼쪽(동쪽)부터</b> 가려진다. 달 전체가 지구의 <b>본그림자</b>에 들어가면 <b>개기월식</b>, 일부만 들어가면 <b>부분월식</b>이 일어나며, 월식은 <b>밤이 되는 모든 지역</b>에서 관찰할 수 있다.</p>',
      trap: ['일식 = <b>삭</b>, 월식 = <b>망</b>. 거꾸로 쓰는 실수 1순위!', '가려지는 쪽: 일식은 <b>태양의 오른쪽</b>, 월식은 <b>달의 왼쪽</b> — 주어(누구의 어느 쪽)까지 정확히.', '평가기준 4요소(위치·위상·가려지는 부분·관찰 지역)를 <b>하나도 빠짐없이</b>. 하나 빠지면 감점.', '(심화) 삭·망마다 일식·월식이 안 일어나는 이유: 달의 공전 궤도면이 지구 공전 궤도면과 약 5° 기울어져 있어서.'],
      check: [{ q: '일식이 일어날 때 달의 위상과 세 천체 배열은?', a: '삭 / 태양 - 달 - 지구' }, { q: '월식 때 달은 어느 쪽부터 가려지나요? 이유는?', a: '왼쪽(동쪽)부터. 달이 서→동으로 공전하며 지구 그림자 속으로 들어가기 때문' }, { q: '개기일식은 어디서 볼 수 있나요?', a: '달의 본그림자가 생기는 (좁은) 지역. 반그림자 지역에선 부분일식' }]
    }
  ];

  function renderChapter(id, mount) {
    var ch = CH.filter(function (c) { return c.id === id; })[0] || CH[0], i = CH.indexOf(ch);
    var qa = ch.check.map(function (q, k) { return '<div class="qa"><div class="qa-q">' + (k + 1) + '. ' + q.q + '</div><button class="btn sm" data-rv>답 확인</button><div class="qa-a">' + q.a + '</div></div>'; }).join('');
    mount.innerHTML =
      '<div class="sec"><div class="eyebrow"><span class="tag">' + ch.n + ' / 5</span>평가요소 ' + '①②③④⑤'[i] + '</div><h2 class="title">' + ch.title + '</h2><div class="rubric">' + ch.rubric + '</div></div>' +
      '<div class="sec"><div class="eyebrow">? 이런 적 있죠</div><div class="card hook">' + ch.hook + '</div></div>' +
      '<div class="sec"><div class="eyebrow">1 · 개념 한 입</div><div class="card idea">' + ch.idea + '</div></div>' +
      '<div class="sec"><div class="eyebrow">2 · 직접 만져보기</div><div data-sim></div></div>' +
      '<div class="sec"><div class="eyebrow">3 · 관찰 포인트</div><div class="card"><ul class="observe">' + ch.observe.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="sec"><div class="eyebrow">4 · 시험지에 이렇게 쓰기</div><div class="card answer"><div class="lbl">✍ 모범 답안</div>' + ch.answer + '</div></div>' +
      '<div class="sec"><div class="card trap"><div class="lbl">⚠ 자주 틀리는 것</div><ul>' + ch.trap.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="sec"><div class="eyebrow">5 · 확인 질문 (말로 먼저 답해보기)</div>' + qa + '</div>' +
      '<div class="next">' + (i > 0 ? '<a class="btn" href="#' + CH[i - 1].id + '">← ' + CH[i - 1].short + '</a>' : '<span></span>') +
      (i < CH.length - 1 ? '<a class="btn pri" href="#' + CH[i + 1].id + '">다음: ' + CH[i + 1].short + ' →</a>' : '<a class="btn pri" href="#game">🎮 게임으로 굳히기 →</a>') + '</div>';
    mount.querySelectorAll('[data-rv]').forEach(function (b) { b.onclick = function () { var a = b.nextElementSibling; a.classList.toggle('show'); b.textContent = a.classList.contains('show') ? '접기' : '답 확인'; }; });
    return ch.sim(mount.querySelector('[data-sim]'));
  }

  window.EMLab = { CH: CH, renderChapter: renderChapter, POS8: POS8, orbitScene: orbitScene };
})();
