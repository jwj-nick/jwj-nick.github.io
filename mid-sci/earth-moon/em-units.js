/* em-units.js — 스터디 앱 v2: 단원 5개 (시뮬 우선 · 자동 설명 투어 + 직접 조작 · 텍스트는 보조)
 * 단원 = 수행평가 평가요소. 시뮬은 상태(S) 기반 → 투어가 S를 트윈하며 자막을 보여주고, 손대면 즉시 직접 조작 모드.
 * 공개 API: window.EMU = { UNITS, renderUnit(id, mount) → cleanup, orbitPhases }
 */
(function () {
  'use strict';
  var E = window.EM, D2R = E.D2R;

  /* ── 공통 ── */
  function norm(a) { return ((a % 360) + 360) % 360; }
  function angOf(p, cx, cy) { return norm(Math.atan2(-(p.y - cy), p.x - cx) / D2R); }
  function pointer(cv, h) {
    cv.style.touchAction = 'none'; var down = false;
    function P(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.onpointerdown = function (e) { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (h.down) h.down(P(e)); };
    cv.onpointermove = function (e) { if (down && h.move) h.move(P(e)); };
    cv.onpointerup = cv.onpointercancel = function (e) { if (!down) return; down = false; if (h.up) h.up(P(e)); };
  }
  function onResize(fn) { var t; function r() { clearTimeout(t); t = setTimeout(fn, 80); } window.addEventListener('resize', r); return function () { window.removeEventListener('resize', r); }; }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  /* 투어: steps = [{set:{}, to:{}, cap:'', t:ms, hold:ms}] */
  function makeTour(capEl, steps, S, draw, onState) {
    var raf = 0, tm = 0, on = false;
    function cap(i) { capEl.innerHTML = steps[i].cap + '<div class="dots">' + steps.map(function (_, j) { return '<i class="' + (j === i ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }
    function go(i) {
      if (!on) return;
      if (i >= steps.length) { on = false; onState('end'); return; }
      var st = steps[i], to = st.to || {}, from = {}, k;
      if (st.set) for (k in st.set) S[k] = st.set[k];
      for (k in to) from[k] = S[k];
      cap(i); draw();
      var t0 = performance.now(), D = st.t || 1500;
      (function f(ts) {
        if (!on) return;
        var x = Math.min(1, (ts - t0) / D), e = ease(x);
        for (var kk in to) S[kk] = from[kk] + (to[kk] - from[kk]) * e;
        draw();
        if (x < 1) raf = requestAnimationFrame(f); else tm = setTimeout(function () { go(i + 1); }, st.hold || 2200);
      })(t0);
    }
    return {
      start: function () { this.stop(); on = true; onState('play'); go(0); },
      stop: function () { var was = on; on = false; cancelAnimationFrame(raf); clearTimeout(tm); if (was) onState('stop'); },
      isOn: function () { return on; }
    };
  }
  /* 시뮬 골격: 캔버스들 + 자막 + 투어 버튼 + 리드아웃 + 컨트롤 */
  function scaffold(el, canvases, controls) {
    el.innerHTML = '<div class="stage"><div class="simwrap">' + canvases + '</div><div class="cap" data-cap></div>' +
      '<div class="tourbar"><button class="btn pri" data-tour>⏸ 멈춤</button><span class="hint">✋ 그림을 끌거나 아래 버튼을 만지면 직접 조작 모드</span></div>' +
      '<div class="readout" data-r></div><div class="ctrl">' + controls + '</div></div>';
    return { cap: el.querySelector('[data-cap]'), rd: el.querySelector('[data-r]'), tb: el.querySelector('[data-tour]') };
  }
  function wireTour(el, sk, steps, S, draw) {
    var tour = makeTour(sk.cap, steps, S, draw, function (st) {
      sk.tb.textContent = st === 'play' ? '⏸ 멈춤' : (st === 'end' ? '↺ 자동 설명 다시 보기' : '▶ 자동 설명');
      if (st === 'stop') sk.cap.innerHTML = '✋ <b>직접 조작 중</b> — 마음껏 움직여 보고, 다시 보려면 ▶ 자동 설명';
    });
    sk.tb.onclick = function () { if (tour.isOn()) tour.stop(); else tour.start(); };
    var t0 = setTimeout(function () { tour.start(); }, 450);
    return { tour: tour, user: function () { tour.stop(); }, kill: function () { clearTimeout(t0); tour.stop(); } };
  }

  /* ═════════ 1. 자전과 겉보기 운동 ═════════ */
  function sim1(el) {
    var sk = scaffold(el, '<canvas data-a></canvas><canvas data-b></canvas>',
      '<div class="row"><label>시각</label><input type="range" min="0" max="24" step="0.1" data-t></div>');
    var ca = el.querySelector('[data-a]'), cb = el.querySelector('[data-b]'), sl = el.querySelector('[data-t]');
    var S = { T: 3 }, g = {}, last = null;
    var stars = (function () { var r = E.rng(5), o = []; for (var i = 0; i < 80; i++) o.push({ dec: -20 + r() * 60, H0: r() * 360 }); return o; })();
    function tt() { return ((S.T % 24) + 24) % 24; }
    function fmt(t) { var h = Math.floor(t), m = Math.round((t - h) * 60); if (m === 60) { h = (h + 1) % 24; m = 0; } return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
    function draw() {
      var t = tt(), A = E.fit(ca, 0.6, 330), c = A.ctx, w = A.w, h = A.h;
      E.spaceBg(c, w, h, 2);
      var R = Math.min(h * 0.28, w * 0.18); g = { cx: w * 0.4, cy: h * 0.55, R: R };
      E.earthTop(c, g.cx, g.cy, R, t, { obsLabel: '서울 ' + fmt(t) });
      E.label(c, '북극 위에서 본 지구', 10, 14, E.C.muted, 11, 'left');
      var B = E.fit(cb, 0.4, 220), d = B.ctx, W = B.w, H = B.h, base = H - 26;
      var sun = E.altAz(0, 15 * (t - 12)), day = Math.max(0, Math.min(1, (sun.alt + 8) / 20));
      var gr = d.createLinearGradient(0, 0, 0, base);
      gr.addColorStop(0, day > 0.55 ? '#3a86d6' : (day > 0.05 ? '#3b3a6e' : '#050914')); gr.addColorStop(1, day > 0.55 ? '#a8d4ff' : (day > 0.05 ? '#d08a5c' : '#17244e'));
      d.fillStyle = gr; d.fillRect(0, 0, W, base);
      function X(az) { return (az - 60) / 240 * W; } function Y(al) { return base - al / 70 * (base - 12); }
      if (sun.alt < -5) stars.forEach(function (s) { var aa = E.altAz(s.dec, s.H0 + 15 * (t - 12)); if (aa.alt > 0 && aa.az > 60 && aa.az < 300) { d.fillStyle = 'rgba(230,238,255,.85)'; d.fillRect(X(aa.az), Y(aa.alt), 1.8, 1.8); } });
      d.setLineDash([4, 5]); d.strokeStyle = 'rgba(255,210,90,.45)'; d.lineWidth = 1.5; d.beginPath();
      for (var q = 6; q <= 18; q += 0.25) { var pp = E.altAz(0, 15 * (q - 12)); if (q === 6) d.moveTo(X(pp.az), Y(pp.alt)); else d.lineTo(X(pp.az), Y(pp.alt)); }
      d.stroke(); d.setLineDash([]);
      if (sun.alt > -4 && sun.az > 60 && sun.az < 300) E.sun(d, X(sun.az), Y(sun.alt), 12);
      d.fillStyle = '#0a1410'; d.fillRect(0, base, W, H - base);
      [[90, '동'], [180, '남'], [270, '서']].forEach(function (k) { E.label(d, k[1], X(k[0]), base + 13, E.C.accent, 13); });
      E.pill(d, '서울에서 남쪽을 본 하늘', 82, 14, 'rgba(0,0,0,.35)', '#fff', 10);
      sk.rd.innerHTML = '<span class="big">' + fmt(t) + '</span> · 태양 고도 ' + Math.round(sun.alt) + '°<span class="sub">지구 1시간 = 15° 회전 · 자전 서→동 → 하늘은 동→서</span>';
      sl.value = t;
    }
    var T = wireTour(el, sk, [
      { set: { T: 3 }, to: { T: 6 }, cap: '서울(●)이 밤 → 낮 경계에 오면 <b>해가 동쪽 지평선</b>에서 떠요.' },
      { to: { T: 12 }, cap: '지구가 <b>시계 반대 방향(서→동)</b>으로 돌아 ●가 태양을 정면으로 → <b>정오</b>, 태양은 <b>남쪽 하늘</b> 가장 높이.' },
      { to: { T: 18 }, cap: '낮 → 밤 경계: 해가 <b>서쪽</b>으로 져요. 태양이 움직인 게 아니라 <b>지구가 돈 것</b>!' },
      { to: { T: 26 }, cap: '밤에는 별들도 똑같이 <b>동 → 서</b>로 흘러요.' },
      { to: { T: 30 }, cap: '정리: 지구가 서→동으로 <b>1시간에 15°</b> 자전 → 천체는 동→서로 도는 것처럼 보이는 <b>겉보기 운동</b>.' }
    ], S, draw);
    sl.oninput = function () { T.user(); S.T = +sl.value; draw(); };
    pointer(ca, {
      down: function (q) { T.user(); last = angOf(q, g.cx, g.cy); },
      move: function (q) { var a = angOf(q, g.cx, g.cy), dd = a - last; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; last = a; S.T += dd / 15; draw(); }
    });
    draw(); var off = onResize(draw);
    return function () { T.kill(); off(); };
  }

  /* ═════════ 2. 별의 일주운동 ═════════ */
  var DIRN = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };
  function sim2(el) {
    var sk = scaffold(el, '<canvas data-c></canvas>',
      '<div class="row"><label>방향</label>' + ['N', 'E', 'S', 'W'].map(function (d) { return '<button class="btn" data-d="' + d + '">' + DIRN[d] + '</button>'; }).join('') + '</div>' +
      '<div class="row"><label>노출</label><input type="range" min="0" max="12" step="0.1" data-h></div>');
    var cv = el.querySelector('[data-c]'), sl = el.querySelector('[data-h]'), S = { dir: 'N', hrs: 0 };
    function draw() {
      var F = E.fit(cv, 0.72, 430); E.skyTrails(F.ctx, F.w, F.h, S.dir, S.hrs, { angle: true });
      sk.rd.innerHTML = '<span class="big">' + DIRN[S.dir] + ' 하늘</span> · ' + S.hrs.toFixed(1) + '시간 → <span class="big">' + Math.round(15 * S.hrs) + '°</span><span class="sub">카메라 셔터를 오래 열면 별이 지나간 길이 선으로 남아요</span>';
      el.querySelectorAll('[data-d]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-d') === S.dir); });
      sl.value = S.hrs;
    }
    var T = wireTour(el, sk, [
      { set: { dir: 'N', hrs: 0 }, to: { hrs: 3 }, t: 2200, cap: '<b>북쪽</b>: 북극성을 중심으로 <b>시계 반대 방향</b> 동심원. 3시간 = 15° × 3 = <b>45°</b>' },
      { set: { dir: 'E', hrs: 0 }, to: { hrs: 3 }, t: 2000, cap: '<b>동쪽</b>: 지평선에서 <b>오른쪽 위로 비스듬히</b> 떠올라요.' },
      { set: { dir: 'S', hrs: 0 }, to: { hrs: 3 }, t: 2000, cap: '<b>남쪽</b>: 지평선과 나란히 <b>왼쪽(동) → 오른쪽(서)</b>으로 둥근 호.' },
      { set: { dir: 'W', hrs: 0 }, to: { hrs: 3 }, t: 2000, cap: '<b>서쪽</b>: <b>오른쪽 아래로 비스듬히</b> 져요.' },
      { set: { dir: 'N', hrs: 0 }, to: { hrs: 6 }, t: 2600, cap: '원인은 모두 <b>지구 자전</b> → 별은 동→서로 <b>1시간에 15°</b>. 6시간이면 90°!' }
    ], S, draw);
    el.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { T.user(); S.dir = b.getAttribute('data-d'); if (S.hrs < 0.5) S.hrs = 3; draw(); }; });
    sl.oninput = function () { T.user(); S.hrs = +sl.value; draw(); };
    pointer(cv, { down: function () { T.user(); } });
    draw(); var off = onResize(draw);
    return function () { T.kill(); off(); };
  }

  /* ── 궤도 장면 (위에서) ── */
  function orbitBase(c, w, h, opt) {
    opt = opt || {};
    E.spaceBg(c, w, h, 4);
    var g = { cx: w * 0.47, cy: h * 0.5, Ro: Math.min(w * 0.32, h * 0.33) };
    for (var k = -4; k <= 4; k++) { var y = g.cy + k * h * 0.1; E.arrow(c, w - 2, y, w - 26, y, 'rgba(255,210,90,.5)', 1.4, 5); }
    E.label(c, '햇빛', w - 16, 12, E.C.sun, 11);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(g.cx, g.cy, g.Ro, 0, 7); c.stroke(); c.setLineDash([]);
    E.arcArrow(c, g.cx, g.cy, g.Ro + 12, -0.3, -0.8, true, 'rgba(111,214,255,.7)', 2);
    E.label(c, '공전: 서→동', g.cx + g.Ro * 0.75, g.cy - g.Ro - 6, E.C.cyan, 10);
    E.earthTop(c, g.cx, g.cy, Math.max(12, g.Ro * 0.17), 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
    if (opt.labels) [[0, '삭'], [90, '상현'], [180, '보름'], [270, '하현']].forEach(function (p) { var a = p[0] * D2R, rr = g.Ro + 28; E.label(c, p[1], g.cx + rr * Math.cos(a), g.cy - rr * Math.sin(a), 'rgba(255,255,255,.55)', 11); });
    E.label(c, '위에서 본 모습 (북극 위)', 10, 12, E.C.muted, 10, 'left');
    return g;
  }
  function orbitMoon(c, x, y, r, ring) {
    c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2); c.fill();
    if (ring) { c.strokeStyle = ring; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r + 4, 0, 7); c.stroke(); }
  }

  /* ═════════ 3. 달의 위상 ═════════ */
  function sim3(el) {
    var sk = scaffold(el, '<div class="two"><div class="cv"><canvas data-o></canvas></div><div class="cv"><canvas data-s></canvas><canvas data-m></canvas></div></div>',
      '<div class="row"><label>음력 날짜</label><input type="range" min="1" max="29.5" step="0.25" data-d></div>' +
      '<div class="row">' + E.KEY_PHASES.map(function (k) { return '<button class="btn sm" data-k="' + k.d + '">' + k.name + '</button>'; }).join('') + '</div>');
    var co = el.querySelector('[data-o]'), cs = el.querySelector('[data-s]'), cm = el.querySelector('[data-m]'), sl = el.querySelector('[data-d]');
    var S = { day: 1 }, g = null, grab = false;
    function draw() {
      var day = Math.max(1, Math.min(29.5, S.day)), e = E.lunarDayToE(day), info = E.phaseInfo(day);
      var O = E.fit(co, 0.9, 400), c = O.ctx; g = orbitBase(c, O.w, O.h, { labels: true });
      var a = e * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a), mr = Math.max(9, g.Ro * 0.11);
      c.strokeStyle = 'rgba(255,184,77,.6)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(g.cx, g.cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
      orbitMoon(c, mx, my, mr, E.C.accent); g.mx = mx; g.my = my;
      // 하늘
      var Sk = E.fit(cs, 0.46, 210), d = Sk.ctx, w = Sk.w, hh = Sk.h, base = hh - 24, eve = e <= 180;
      var gr = d.createLinearGradient(0, 0, 0, base); gr.addColorStop(0, '#0a1230'); gr.addColorStop(1, eve ? '#3a2d5a' : '#2d3a66'); d.fillStyle = gr; d.fillRect(0, 0, w, base);
      E.starBg(d, w, base, 9, 40);
      var gx = eve ? w : 0, gg = d.createRadialGradient(gx, base, 4, gx, base, w * 0.45); gg.addColorStop(0, 'rgba(255,150,70,.6)'); gg.addColorStop(1, 'rgba(255,150,70,0)'); d.fillStyle = gg; d.fillRect(0, 0, w, base);
      var Rx = w * 0.42, Ry = base - 24, cx = w / 2, f = eve ? e : 360 - e;
      d.strokeStyle = 'rgba(255,255,255,.15)'; d.setLineDash([3, 5]); d.beginPath(); d.ellipse(cx, base, Rx, Ry, 0, Math.PI, 2 * Math.PI); d.stroke(); d.setLineDash([]);
      var x = eve ? cx + Rx * Math.cos(f * D2R) : cx - Rx * Math.cos(f * D2R), y = base - Ry * Math.sin(f * D2R);
      if (f > 8) E.moonPhase(d, x, y, 13, e, { plain: true }); else E.label(d, '태양 가까이 → 안 보여요', cx, base - 40, E.C.muted, 12);
      d.fillStyle = '#0a1410'; d.fillRect(0, base, w, hh - base);
      E.label(d, '동', 14, base + 12, E.C.accent, 13); E.label(d, '남', cx, base + 12, E.C.accent, 13); E.label(d, '서', w - 14, base + 12, E.C.accent, 13);
      E.pill(d, eve ? '해 진 직후 (저녁)' : '해 뜨기 직전 (새벽)', w / 2, 14, 'rgba(0,0,0,.4)', '#fff', 11);
      // 지구에서 본 모양
      var M = E.fit(cm, 0.34, 150), m = M.ctx; E.spaceBg(m, M.w, M.h, 3);
      if (info.key === 'new') { m.strokeStyle = 'rgba(255,255,255,.35)'; m.setLineDash([3, 3]); m.beginPath(); m.arc(M.h * 0.55, M.h / 2, M.h * 0.36, 0, 7); m.stroke(); m.setLineDash([]); }
      else E.moonPhase(m, M.h * 0.55, M.h / 2, M.h * 0.36, e);
      E.label(m, info.name, M.h * 1.05, M.h / 2 - 16, E.C.accent, 18, 'left', 900);
      E.label(m, info.day + ' · ' + info.sub, M.h * 1.05, M.h / 2 + 8, '#fff', 12, 'left');
      E.label(m, '🔭 ' + info.when, M.h * 1.05, M.h / 2 + 28, '#c8d3e6', 11, 'left');
      sk.rd.innerHTML = '음력 <span class="big">' + day.toFixed(1) + '일</span><span class="sub">궤도 위 달을 손가락으로 끌어 옮겨 보세요</span>';
      sl.value = day;
    }
    var T = wireTour(el, sk, [
      { set: { day: 1 }, to: { day: 3 }, cap: '<b>초승달</b> (음력 2~3일): <b>오른쪽</b>이 가늘게 밝아요. 해 진 직후 <b>서쪽</b> 하늘.' },
      { to: { day: 8 }, cap: '<b>상현달</b> (7~8일): <b>오른쪽 반원</b>. 저녁 <b>남쪽</b> 하늘. 같은 시각에 보면 달이 매일 동쪽으로 옮겨가요.' },
      { to: { day: 15 }, cap: '<b>보름달 · 망</b> (15일): 둥근 원. 해 질 때 <b>동쪽</b>에서 떠서 밤새 보여요.' },
      { to: { day: 23 }, cap: '<b>하현달</b> (22~23일): <b>왼쪽 반원</b>. 자정에 떠서 <b>새벽 남쪽</b> 하늘.' },
      { to: { day: 27.5 }, cap: '<b>그믐달</b> (27~28일): <b>왼쪽</b>이 가늘게. 해 뜨기 직전 <b>동쪽</b> 하늘.' },
      { to: { day: 29.5 }, cap: '다시 <b>삭</b> (1일, 안 보임). 한 바퀴 약 <b>29.5일</b> — 오른쪽부터 차고, 오른쪽부터 기울어요.' }
    ], S, draw);
    sl.oninput = function () { T.user(); S.day = +sl.value; draw(); };
    el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { T.user(); S.day = +b.getAttribute('data-k'); draw(); }; });
    function setFrom(q) { var e = angOf(q, g.cx, g.cy); S.day = Math.max(1, Math.min(29.5, e / 360 * E.SYNODIC + 1)); draw(); }
    pointer(co, {
      down: function (q) { T.user(); grab = Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 46; if (grab) setFrom(q); },
      move: function (q) { if (grab) setFrom(q); }, up: function () { grab = false; }
    });
    draw(); var off = onResize(draw);
    return function () { T.kill(); off(); };
  }

  /* ═════════ 4. 위상변화 원리 ═════════ */
  var POS8 = [
    { e: 0, n: '삭', why: '햇빛 받는 면이 지구 <b>반대쪽</b> → 지구에선 어두운 면만 보여요.' },
    { e: 45, n: '초승달', why: '지구 쪽 면의 <b>오른쪽 가장자리</b>만 햇빛을 받아요.' },
    { e: 90, n: '상현달', why: '태양-지구-달 <b>직각</b> → 지구 쪽 면의 <b>오른쪽 절반</b>만 밝아요.' },
    { e: 135, n: '상현→보름 사이', why: '밝은 부분이 절반보다 많아져요.' },
    { e: 180, n: '보름달 (망)', why: '태양-지구-달 일직선 → 지구 쪽 면 <b>전체</b>가 밝아요.' },
    { e: 225, n: '보름→하현 사이', why: '오른쪽부터 어두워져요.' },
    { e: 270, n: '하현달', why: '다시 <b>직각</b> → 지구 쪽 면의 <b>왼쪽 절반</b>만 밝아요.' },
    { e: 315, n: '그믐달', why: '<b>왼쪽 가장자리</b>만 가늘게 밝아요.' }
  ];
  function halfPlane(c, cx, cy, nx, ny, S) { var px = -ny, py = nx; c.beginPath(); c.moveTo(cx + px * S, cy + py * S); c.lineTo(cx + px * S + nx * S, cy + py * S + ny * S); c.lineTo(cx - px * S + nx * S, cy - py * S + ny * S); c.lineTo(cx - px * S, cy - py * S); c.closePath(); }
  function sim4(el) {
    var sk = scaffold(el, '<canvas data-o></canvas><canvas data-i></canvas>',
      '<div class="row"><button class="btn sm on" data-t="lit">☀ 햇빛 받는 반쪽</button><button class="btn sm on" data-t="vis">👁 지구 쪽 반쪽</button><button class="btn sm on" data-t="both">✨ 겹친 부분</button></div>');
    var co = el.querySelector('[data-o]'), ci = el.querySelector('[data-i]'), S = { e: 0 }, show = { lit: true, vis: true, both: true }, g = null, grab = false;
    function near() { var e = norm(S.e), b = POS8[0], bd = 999; POS8.forEach(function (p) { var d = Math.min(norm(e - p.e), norm(p.e - e)); if (d < bd) { bd = d; b = p; } }); return { p: b, d: bd }; }
    function draw() {
      var e = norm(S.e), F = E.fit(co, 1.0, 470), c = F.ctx, w = F.w, hh = F.h;
      E.spaceBg(c, w, hh, 6);
      var cx = w * 0.5, cy = hh * 0.47, Ro = Math.min(w, hh) * 0.23, mr = Math.max(8, Ro * 0.12), Rout = Ro + mr * 3.4 + 12; g = { cx: cx, cy: cy, Ro: Ro };
      for (var k = -4; k <= 4; k++) { var y = cy + k * hh * 0.1; E.arrow(c, w - 2, y, w - 26, y, 'rgba(255,210,90,.5)', 1.4, 5); }
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(cx, cy, Ro, 0, 7); c.stroke(); c.setLineDash([]);
      E.earthTop(c, cx, cy, Math.max(11, Ro * 0.2), 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
      var nb = near();
      POS8.forEach(function (p) {
        var a = p.e * D2R, mx = cx + Ro * Math.cos(a), my = cy - Ro * Math.sin(a), ox = cx + Rout * Math.cos(a), oy = cy - Rout * Math.sin(a), hl = nb.d < 12 && nb.p === p;
        c.globalAlpha = hl ? 1 : 0.45; orbitMoon(c, mx, my, mr * 0.8);
        if (p.e === 0) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([2, 3]); c.beginPath(); c.arc(ox, oy, mr * 1.1, 0, 7); c.stroke(); c.setLineDash([]); } else E.moonPhase(c, ox, oy, mr * 1.1, p.e, { plain: true });
        if (hl) { c.strokeStyle = E.C.accent; c.lineWidth = 2.5; c.beginPath(); c.arc(ox, oy, mr * 1.1 + 4, 0, 7); c.stroke(); }
        c.globalAlpha = 1;
      });
      var a = e * D2R, mx = cx + Ro * Math.cos(a), my = cy - Ro * Math.sin(a);
      c.strokeStyle = 'rgba(255,184,77,.6)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
      orbitMoon(c, mx, my, mr * 1.15, E.C.accent);
      E.label(c, '안쪽 = 우주에서 본 달 (항상 반쪽이 밝음)', 10, hh - 26, E.C.muted, 11, 'left');
      E.label(c, '바깥 = 지구에서 본 모양', 10, hh - 10, E.C.accent, 11, 'left');
      // 확대 해부
      var I = E.fit(ci, 0.46, 230), d = I.ctx, W = I.w, H = I.h; E.spaceBg(d, W, H, 8);
      var x0 = W * 0.3, y0 = H * 0.52, r = H * 0.32, SS = r * 3, ex = -Math.cos(a), ey = Math.sin(a);
      d.fillStyle = E.C.moonDark; d.beginPath(); d.arc(x0, y0, r, 0, 7); d.fill();
      function clip() { d.beginPath(); d.arc(x0, y0, r, 0, 7); d.clip(); }
      if (show.lit) { d.save(); clip(); halfPlane(d, x0, y0, 1, 0, SS); d.fillStyle = 'rgba(255,214,110,.45)'; d.fill(); d.restore(); }
      if (show.vis) { d.save(); clip(); halfPlane(d, x0, y0, ex, ey, SS); d.fillStyle = 'rgba(111,214,255,.25)'; d.fill(); d.restore();
        d.strokeStyle = E.C.cyan; d.setLineDash([4, 3]); d.lineWidth = 1.5; d.beginPath(); d.moveTo(x0 - ey * r * 1.2, y0 + ex * r * 1.2); d.lineTo(x0 + ey * r * 1.2, y0 - ex * r * 1.2); d.stroke(); d.setLineDash([]); }
      if (show.both) { d.save(); clip(); halfPlane(d, x0, y0, 1, 0, SS); d.clip(); halfPlane(d, x0, y0, ex, ey, SS); d.fillStyle = '#fff3c4'; d.fill(); d.restore(); }
      d.strokeStyle = 'rgba(255,255,255,.4)'; d.lineWidth = 1; d.beginPath(); d.arc(x0, y0, r, 0, 7); d.stroke();
      E.arrow(d, x0 + ex * (r + 6), y0 + ey * (r + 6), x0 + ex * (r + 32), y0 + ey * (r + 32), E.C.cyan, 2, 7);
      E.label(d, '지구 쪽', x0 + ex * (r + 46), y0 + ey * (r + 46), E.C.cyan, 11);
      E.arrow(d, W * 0.6, y0, W * 0.68, y0, '#fff', 2, 7);
      if (Math.min(e, 360 - e) < 10) { d.strokeStyle = 'rgba(255,255,255,.35)'; d.setLineDash([3, 3]); d.beginPath(); d.arc(W * 0.82, y0, r * 0.85, 0, 7); d.stroke(); d.setLineDash([]); }
      else E.moonPhase(d, W * 0.82, y0, r * 0.85, e);
      E.label(d, '지구에서 보면', W * 0.82, y0 - r - 8, E.C.accent, 11);
      E.label(d, '달 확대', 10, 12, E.C.muted, 11, 'left');
      sk.rd.innerHTML = (nb.d < 12 ? '<span class="big">' + nb.p.n + '</span> — ' + nb.p.why : '이동 중…') + '<span class="sub">✨ 보이는 모양 = 햇빛 받는 반쪽 ∩ 지구 쪽 반쪽 · 궤도 위 달을 끌어 보세요</span>';
    }
    var steps = [{ set: { e: 0 }, to: { e: 0 }, t: 300, hold: 2600, cap: '달은 스스로 빛나지 않고 <b>햇빛을 반사</b>해요. 그래서 언제나 <b>태양 쪽 반쪽만</b> 밝아요 (안쪽 달들).' }];
    [45, 90, 180, 270, 315, 360].forEach(function (v) { var p = POS8.filter(function (q) { return q.e === v % 360; })[0]; steps.push({ to: { e: v }, cap: '<b>' + p.n + '</b>: ' + p.why }); });
    steps.push({ to: { e: 360 }, t: 300, cap: '정리: 달이 <b>공전</b>하며 <b>태양·지구·달의 위치</b>가 바뀌니까 → 지구에서 보이는 밝은 부분이 바뀌어요 = <b>위상 변화</b>.' });
    var T = wireTour(el, sk, steps, S, draw);
    el.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-t'); show[k] = !show[k]; b.classList.toggle('on', show[k]); draw(); }; });
    pointer(co, {
      down: function (q) { T.user(); grab = Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 50; if (grab) { S.e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { S.e = angOf(q, g.cx, g.cy); draw(); } }, up: function () { grab = false; }
    });
    draw(); var off = onResize(draw);
    return function () { T.kill(); off(); };
  }

  /* ═════════ 5. 일식과 월식 ═════════ */
  var OBS = { A: '본그림자', B: '반그림자', C: '그림자 밖(낮)', D: '밤' };
  function sim5(el) {
    var sk = scaffold(el, '<div class="row" style="padding:10px 14px 0"><button class="btn" data-m="solar">☀️ 일식</button><button class="btn" data-m="lunar">🌕 월식</button></div><canvas data-a style="margin-top:8px"></canvas><canvas data-b></canvas>',
      '<div class="row"><label>진행</label><input type="range" min="0" max="1" step="0.005" data-p></div><div class="row" data-opts></div>');
    var ca = el.querySelector('[data-a]'), cb = el.querySelector('[data-b]'), sl = el.querySelector('[data-p]'), opts = el.querySelector('[data-opts]');
    var S = { mode: 'solar', p: 0.05, obs: 'A', path: 'center' }, T;
    function renderOpts() {
      opts.innerHTML = S.mode === 'solar'
        ? '<label>관측 위치</label>' + Object.keys(OBS).map(function (k) { return '<button class="btn sm' + (k === S.obs ? ' on' : '') + '" data-o="' + k + '">' + k + ' ' + OBS[k] + '</button>'; }).join('')
        : '<label>달의 경로</label><button class="btn sm' + (S.path === 'center' ? ' on' : '') + '" data-pa="center">그림자 중심</button><button class="btn sm' + (S.path === 'edge' ? ' on' : '') + '" data-pa="edge">그림자 가장자리</button>';
      opts.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { T.user(); S.obs = b.getAttribute('data-o'); draw(); }; });
      opts.querySelectorAll('[data-pa]').forEach(function (b) { b.onclick = function () { T.user(); S.path = b.getAttribute('data-pa'); draw(); }; });
    }
    function lunarState() { var x = (1 - 2 * S.p) * 6.2, y = S.path === 'center' ? 0 : 2.05; return { x: x, y: y, frac: E.overlap(1, 2.6, Math.hypot(x, y)) / Math.PI }; }
    function solar(c, w, h) {
      E.spaceBg(c, w, h, 12);
      var cy = h / 2, sx = -h * 0.1, sr = h * 0.42, mx = w * 0.5, mr = Math.max(6, h * 0.04), ex = w * 0.82, R = h * 0.24, my = cy + (S.p - 0.5) * h * 0.8;
      E.sun(c, sx, cy, sr);
      c.save(); c.beginPath(); c.arc(ex, cy, R, 0, 7); c.clip();
      c.fillStyle = E.C.earthDay; c.fillRect(ex - R, cy - R, 2 * R, 2 * R); c.fillStyle = E.C.earthNight; c.fillRect(ex, cy - R, R, 2 * R);
      var hitY = cy + (ex - R - sx) * (my - cy) / (mx - sx), penW = R * 0.75;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(ex - R, hitY, R * 0.5, penW, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,.9)'; c.beginPath(); c.ellipse(ex - R + 2, hitY, 5, 5, 0, 0, 7); c.fill(); c.restore();
      var tx = ex - R + 2;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(mx, my - mr); c.lineTo(tx, hitY - penW); c.lineTo(tx, hitY + penW); c.lineTo(mx, my + mr); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.moveTo(mx, my - mr); c.lineTo(tx, hitY); c.lineTo(mx, my + mr); c.closePath(); c.fill();
      c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, mr, Math.PI / 2, Math.PI * 1.5); c.fill();
      E.label(c, '달(삭)', mx, my - mr - 10, E.C.ink, 11); E.label(c, '태양', 30, 14, E.C.sun, 12); E.label(c, '지구', ex, cy + R + 12, E.C.ink, 11);
      var P = { A: [ex - R, cy], B: [ex - R * Math.cos(0.75), cy - R * Math.sin(0.75)], C: [ex - R * Math.cos(1.3), cy + R * Math.sin(1.3)], D: [ex + R, cy] };
      Object.keys(P).forEach(function (k) { c.fillStyle = k === S.obs ? E.C.accent : 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(P[k][0], P[k][1], k === S.obs ? 5 : 3.5, 0, 7); c.fill(); E.label(c, k, P[k][0] + (k === 'D' ? 12 : -12), P[k][1] + (k === 'B' ? -6 : 0), k === S.obs ? E.C.accent : '#fff', 12); });
      E.label(c, '태양 - 달 - 지구 일직선', w / 2, h - 10, E.C.accent, 11);
    }
    function lunar(c, w, h) {
      E.spaceBg(c, w, h, 13);
      var cy = h / 2, ex = w * 0.42, R = h * 0.2, mx = w * 0.82, mr = Math.max(7, h * 0.05), my = cy + (0.5 - S.p) * h * 0.8;
      E.sun(c, -h * 0.1, cy, h * 0.42);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(ex, cy - R); c.lineTo(w, cy - R * 1.9); c.lineTo(w, cy + R * 1.9); c.lineTo(ex, cy + R); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.72)'; c.beginPath(); c.moveTo(ex, cy - R); c.lineTo(w, cy - R * 0.45); c.lineTo(w, cy + R * 0.45); c.lineTo(ex, cy + R); c.closePath(); c.fill();
      c.save(); c.beginPath(); c.arc(ex, cy, R, 0, 7); c.clip(); c.fillStyle = E.C.earthDay; c.fillRect(ex - R, cy - R, 2 * R, 2 * R); c.fillStyle = E.C.earthNight; c.fillRect(ex, cy - R, R, 2 * R); c.restore();
      c.strokeStyle = E.C.accent; c.lineWidth = 2; c.beginPath(); c.arc(ex, cy, R + 3, -Math.PI / 2, Math.PI / 2); c.stroke();
      E.label(c, '밤인 지역 = 월식 관찰', ex, cy + R + 14, E.C.accent, 10);
      var st = lunarState(); c.fillStyle = st.frac > 0.995 ? '#b5452e' : (st.frac > 0 ? '#c9a46a' : '#f3ead2'); c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      E.label(c, '달(망)', mx, my - mr - 10, E.C.ink, 11); E.label(c, '태양', 30, 14, E.C.sun, 12); E.label(c, '지구', ex, cy - R - 10, E.C.ink, 11);
      E.label(c, '태양 - 지구 - 달 일직선', w / 2, h - 10, E.C.accent, 11);
    }
    function skySolar(c, w, h) {
      if (S.obs === 'D') { E.spaceBg(c, w, h, 21); E.label(c, '🌙 밤인 지역: 태양이 안 보여요 → 일식 관찰 불가', w / 2, h / 2, '#fff', 13); return { frac: 0, label: '관찰 불가 (밤)' }; }
      var cx = w / 2, cy = h / 2 - 6, r = h * 0.24, off = { A: 0, B: 1.05, C: 2.6 }[S.obs], x = cx + (1 - 2 * S.p) * 2.6 * r, y = cy + off * r;
      var frac = Math.min(1, E.overlap(r, r * 1.03, Math.hypot(x - cx, y - cy)) / (Math.PI * r * r)), b = 1 - 0.85 * Math.pow(frac, 3);
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(' + Math.round(40 * b) + ',' + Math.round(120 * b) + ',' + Math.round(210 * b + 20) + ')'); gr.addColorStop(1, 'rgb(' + Math.round(140 * b) + ',' + Math.round(200 * b) + ',' + Math.round(250 * b + 5) + ')');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      if (frac > 0.995) { var cg = c.createRadialGradient(cx, cy, r, cx, cy, r * 2.6); cg.addColorStop(0, 'rgba(255,255,255,.9)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, r * 2.6, 0, 7); c.fill(); }
      else E.sun(c, cx, cy, r);
      c.fillStyle = '#0d0f14'; c.beginPath(); c.arc(x, y, r * 1.03, 0, 7); c.fill();
      E.label(c, '← 동', 30, h - 12, '#fff', 11); E.label(c, '서 →', w - 30, h - 12, '#fff', 11);
      E.pill(c, S.obs + ' 지역에서 본 태양', w / 2, 14, 'rgba(0,0,0,.4)', '#fff', 11);
      return { frac: frac, label: frac > 0.995 ? '개기일식' : (frac > 0.001 ? '부분일식' : '일식 아님') };
    }
    function skyLunar(c, w, h) {
      E.spaceBg(c, w, h, 22);
      var st = lunarState(), m = h * 0.11, cx = w / 2, cy = h / 2 - 4, x = cx + st.x * m, y = cy + st.y * m;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(cx, cy, 4.4 * m, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(cx, cy, 2.6 * m, 0, 7); c.stroke(); c.setLineDash([]);
      var mg = c.createRadialGradient(x - m * 0.3, y - m * 0.3, m * 0.1, x, y, m); mg.addColorStop(0, '#fffaf0'); mg.addColorStop(1, '#e2d6b4'); c.fillStyle = mg; c.beginPath(); c.arc(x, y, m, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(x, y, m, 0, 7); c.clip(); c.fillStyle = st.frac > 0.995 ? 'rgba(150,45,25,.85)' : 'rgba(70,22,14,.9)'; c.beginPath(); c.arc(cx, cy, 2.6 * m, 0, 7); c.fill(); c.restore();
      E.label(c, '← 동', 30, h - 12, '#fff', 11); E.label(c, '서 →', w - 30, h - 12, '#fff', 11);
      E.pill(c, '밤하늘에서 본 달 (점선 = 지구의 본그림자)', w / 2, 14, 'rgba(255,255,255,.12)', '#fff', 11);
      return { frac: st.frac, label: st.frac > 0.995 ? '개기월식 (붉은 달)' : (st.frac > 0.001 ? '부분월식' : '월식 아님') };
    }
    var lastMode = null;
    function draw() {
      if (lastMode !== S.mode || true) { el.querySelectorAll('[data-m]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === S.mode); }); }
      if (lastMode !== S.mode) { lastMode = S.mode; renderOpts(); } else { opts.querySelectorAll('[data-o]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-o') === S.obs); }); opts.querySelectorAll('[data-pa]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pa') === S.path); }); }
      var A = E.fit(ca, 0.5, 270), B = E.fit(cb, 0.48, 240), res;
      if (S.mode === 'solar') { solar(A.ctx, A.w, A.h); res = skySolar(B.ctx, B.w, B.h); } else { lunar(A.ctx, A.w, A.h); res = skyLunar(B.ctx, B.w, B.h); }
      sk.rd.innerHTML = '<span class="big">' + res.label + '</span> · 가려진 비율 ' + Math.round(res.frac * 100) + '%<span class="sub">' + (S.mode === 'solar' ? '위: 위에서 본 배치 · 아래: 관측 위치에서 본 하늘' : '위: 위에서 본 배치 · 아래: 밤하늘의 달') + '</span>';
      sl.value = S.p;
    }
    T = wireTour(el, sk, [
      { set: { mode: 'solar', obs: 'A', p: 0.05 }, to: { p: 0.5 }, t: 3200, cap: '<b>일식</b>: 태양-<b>달</b>-지구 일직선 (달은 <b>삭</b>). 태양의 <b>오른쪽(서쪽)</b>부터 가려지고, 본그림자 지역 A는 <b>개기일식</b>.' },
      { set: { obs: 'B', p: 0.05 }, to: { p: 0.5 }, t: 2600, cap: '반그림자 지역 B에서는 <b>부분일식</b>만 보여요. 본그림자는 좁아서 개기일식은 <b>좁은 지역</b>에서만!' },
      { set: { obs: 'D', p: 0.5 }, to: { p: 0.5 }, t: 200, cap: '밤인 곳(D)은 태양이 안 보여서 일식을 <b>볼 수 없어요</b>.' },
      { set: { mode: 'lunar', path: 'center', p: 0.05 }, to: { p: 0.5 }, t: 3200, cap: '<b>월식</b>: 태양-<b>지구</b>-달 일직선 (달은 <b>망</b>). 달의 <b>왼쪽(동쪽)</b>부터 가려지고, 전체가 본그림자면 붉은 <b>개기월식</b>.' },
      { set: { path: 'edge', p: 0.05 }, to: { p: 0.5 }, t: 2600, cap: '일부만 본그림자에 걸치면 <b>부분월식</b>. 월식은 <b>밤인 모든 지역</b>에서 보여요.' }
    ], S, draw);
    el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { T.user(); S.mode = b.getAttribute('data-m'); S.p = 0.3; draw(); }; });
    sl.oninput = function () { T.user(); S.p = +sl.value; draw(); };
    pointer(ca, { down: function () { T.user(); } }); pointer(cb, { down: function () { T.user(); } });
    draw(); var off = onResize(draw);
    return function () { T.kill(); off(); };
  }

  /* ═════════ 단원 콘텐츠 (텍스트는 보조) ═════════ */
  var UNITS = [
    { id: 'u1', n: 1, short: '자전', title: '지구 자전과 겉보기 운동', sim: sim1,
      rubric: '지구의 자전과 지구 자전에 의해 나타나는 천체의 겉보기 운동을 정확하게 설명함.',
      core: ['지구는 <b>서 → 동</b>으로 하루 한 바퀴 자전 (북극 위에서 보면 <b>시계 반대</b>)', '24시간에 360° → <b>1시간에 15°</b>', '그래서 태양·달·별이 <b>동 → 서</b>로 도는 것처럼 보여요 = <b>겉보기 운동</b>', '태양: 동쪽에서 떠서 → 남쪽 하늘 → 서쪽으로'],
      answer: '<p>지구는 자전축을 중심으로 <b>서쪽에서 동쪽으로 하루에 한 바퀴</b>(1시간에 15°) 자전한다. 이 때문에 지구에서 보면 태양, 달, 별 같은 천체가 <b>동쪽에서 서쪽으로 하루에 한 바퀴씩 도는 것처럼 보이는데</b>, 이를 천체의 겉보기 운동(일주 운동)이라고 한다. 예) 태양은 동쪽에서 떠서 남쪽 하늘을 지나 서쪽으로 진다.</p>',
      trap: ['자전 <b>서→동</b> ↔ 천체 <b>동→서</b>. 반대로 쓰면 감점!', '원인은 <b>자전</b>(공전 ✕)'] },
    { id: 'u2', n: 2, short: '일주운동', title: '별의 일주 운동', sim: sim2,
      rubric: '별의 일주운동 모습을 정확하게 표현하고 설명함. → 4방향 그림!',
      core: ['<b>북쪽</b>: 북극성 중심 <b>시계 반대</b> 동심원', '<b>동쪽</b>: 오른쪽 위로 비스듬히 ↗', '<b>남쪽</b>: 지평선과 나란히 왼쪽(동)→오른쪽(서)', '<b>서쪽</b>: 오른쪽 아래로 비스듬히 ↘ · 모두 <b>1시간에 15°</b>, 원인은 자전'],
      answer: '<p>별의 일주 운동은 <b>지구가 자전</b>하기 때문에 별이 <b>동쪽에서 서쪽으로</b> 하루에 한 바퀴(<b>1시간에 15°</b>)씩 도는 것처럼 보이는 운동이다. 북쪽 하늘: 북극성을 중심으로 <b>시계 반대 방향</b>으로 원을 그린다. 동쪽: <b>오른쪽 위로 비스듬히</b> 떠오른다. 남쪽: 지평선과 나란하게 <b>동→서</b>로 이동한다. 서쪽: <b>오른쪽 아래로 비스듬히</b> 진다.</p>',
      trap: ['북쪽은 <b>시계 반대</b>!', '그림엔 화살표·중심(북극성)·각도(15°×시간)'] },
    { id: 'u3', n: 3, short: '달의 위상', title: '달의 위상 — 날짜·모양·이름', sim: sim3,
      rubric: '음력 날짜에 따른 달의 모양과 명칭을 모두 정확하게 설명함.',
      core: ['1일 <b>삭</b>(안 보임) → 2~3일 <b>초승달</b>(오른쪽 가늘게) → 7~8일 <b>상현달</b>(오른쪽 반원)', '15일 <b>보름달·망</b> → 22~23일 <b>하현달</b>(왼쪽 반원) → 27~28일 <b>그믐달</b>(왼쪽 가늘게)', '주기 약 <b>29.5일</b>'],
      answer: '<p>음력 <b>2~3일경</b> 오른쪽이 가늘게 밝은 <b>초승달</b>, <b>7~8일경</b> 오른쪽 반원이 밝은 <b>상현달</b>, <b>15일경</b> 둥근 <b>보름달(망)</b>, <b>22~23일경</b> 왼쪽 반원이 밝은 <b>하현달</b>, <b>27~28일경</b> 왼쪽이 가늘게 밝은 <b>그믐달</b>이 보인다. 음력 <b>1일경</b>은 달이 보이지 않는 <b>삭</b>이다.</p>',
      trap: ['상현 = <b>오른쪽</b>, 하현 = <b>왼쪽</b>', '차오르는 달은 D 모양, 줄어드는 달은 C 모양'] },
    { id: 'u4', n: 4, short: '위상 원리', title: '달의 운동과 위상변화 원리', sim: sim4,
      rubric: '달의 운동과 위상변화 원리를 정확하게 설명함.',
      core: ['달은 스스로 빛을 못 내고 <b>햇빛을 반사</b> → 늘 태양 쪽 반쪽만 밝음', '달이 지구 둘레를 <b>서→동 공전</b> → <b>태양·지구·달의 위치</b>가 바뀜', '보이는 모양 = 햇빛 받는 반쪽 ∩ 지구 쪽 반쪽', '삭: 태양-달-지구 / 망: 태양-지구-달 / 반달: 직각'],
      answer: '<p>달은 스스로 빛을 내지 못하고 <b>햇빛을 반사</b>하여 밝게 보인다. 달이 지구 주위를 <b>서쪽에서 동쪽으로 공전</b>하면서 <b>태양, 지구, 달의 상대적인 위치가 달라지므로</b> 지구에서 보이는 달의 밝은 부분의 모양이 달라진다(위상 변화). 태양-달-지구 일직선이면 <b>삭</b>, 태양-지구-달이면 <b>망</b>, 직각이면 <b>상현달·하현달</b>. 위상은 약 <b>29.5일</b> 주기로 변한다.</p>',
      trap: ['“지구 그림자가 가려서” ✕ → 그건 <b>월식</b>', '“달은 스스로 빛나지 않음” 꼭 쓰기'] },
    { id: 'u5', n: 5, short: '일식·월식', title: '일식과 월식', sim: sim5,
      rubric: '일식 또는 월식이 일어나는 원리를 천체의 상대적 위치, 달의 위상, 가려지는 부분, 개기식과 부분식이 관찰되는 지역을 모두 포함하여 정확하게 설명함.',
      core: ['<b>일식</b>: 태양-<b>달</b>-지구 · <b>삭</b> · 태양의 <b>오른쪽(서)</b>부터 · 본그림자→개기, 반그림자→부분', '<b>월식</b>: 태양-<b>지구</b>-달 · <b>망</b> · 달의 <b>왼쪽(동)</b>부터 · 전체 본그림자→개기(붉은 달), 일부→부분', '일식은 좁은 지역, 월식은 <b>밤인 모든 지역</b>'],
      answer: '<p><b>일식</b>은 <b>태양-달-지구</b> 순으로 일직선에 놓여 달이 태양을 가리는 현상으로, 달의 위상이 <b>삭</b>일 때 일어난다. 태양의 <b>오른쪽(서쪽)부터</b> 가려진다. 달의 <b>본그림자</b> 지역에서는 <b>개기일식</b>, <b>반그림자</b> 지역에서는 <b>부분일식</b>이 관찰된다.</p><p><b>월식</b>은 <b>태양-지구-달</b> 순으로 일직선에 놓여 달이 지구의 그림자 속으로 들어가는 현상으로, 위상이 <b>망</b>일 때 일어난다. 달의 <b>왼쪽(동쪽)부터</b> 가려진다. 달 전체가 본그림자에 들어가면 <b>개기월식</b>, 일부만 들어가면 <b>부분월식</b>이며, <b>밤이 되는 모든 지역</b>에서 관찰할 수 있다.</p>',
      trap: ['일식=<b>삭</b>, 월식=<b>망</b> (거꾸로 쓰기 1순위)', '4요소(위치·위상·가려지는 부분·관찰 지역) 하나도 빠짐없이'] }
  ];

  function renderUnit(id, mount) {
    var u = UNITS.filter(function (x) { return x.id === id; })[0] || UNITS[0], i = UNITS.indexOf(u);
    var nq = window.EMQ ? window.EMQ.byUnit(u.id).length : 0;
    mount.innerHTML =
      '<div class="sec"><div class="eyebrow"><span class="tag">' + u.n + ' / 5</span>평가요소 ' + '①②③④⑤'[i] + '</div><h2 class="title">' + u.title + '</h2></div>' +
      '<div class="sec" data-sim></div>' +
      '<div class="sec"><div class="card idea"><b>핵심만</b><ul>' + u.core.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul></div>' +
      '<details class="more"><summary>✍ 시험지에 이렇게 쓰기 (모범 답안)</summary>' + u.answer + '</details>' +
      '<details class="more"><summary>⚠ 자주 틀리는 것</summary><ul>' + u.trap.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></details>' +
      '<details class="more"><summary>📋 평가 기준</summary><p>' + u.rubric + '</p></details></div>' +
      '<div class="sec"><a class="btn pri" style="display:block;text-align:center;text-decoration:none;padding:14px" href="#run/' + u.id + '/0">📝 이 단원 퀴즈 ' + nq + '문제 한 번에 풀기 →</a></div>' +
      '<div class="next">' + (i > 0 ? '<a class="btn" href="#' + UNITS[i - 1].id + '">← ' + UNITS[i - 1].short + '</a>' : '<span></span>') +
      (i < UNITS.length - 1 ? '<a class="btn" href="#' + UNITS[i + 1].id + '">다음 단원: ' + UNITS[i + 1].short + ' →</a>' : '<a class="btn" href="#quiz">📝 전체 퀴즈 →</a>') + '</div>';
    return u.sim(mount.querySelector('[data-sim]'));
  }

  window.EMU = { UNITS: UNITS, renderUnit: renderUnit, POS8: POS8 };
})();
