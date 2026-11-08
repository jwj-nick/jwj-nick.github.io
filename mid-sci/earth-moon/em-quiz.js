/* em-quiz.js — 퀴즈 (조작형 문제 + 시뮬 연계 "정답 장면 보기")
 * 각 문제 = 직접 조작해서 장면을 만들기. 틀리면 이유를 장면 기준으로 알려주고,
 * "정답 장면 보기"를 누르면 시뮬이 정답 상태로 움직이며 설명한다.
 * 공개: window.EMQ = { QS, byUnit, renderList, renderQ, status }
 */
(function () {
  'use strict';
  var E = window.EM, D2R = E.D2R, KEY = 'em-quiz-v2';

  function norm(a) { return ((a % 360) + 360) % 360; }
  function adiff(a, b) { var d = norm(a - b); return d > 180 ? 360 - d : d; }
  function angOf(p, cx, cy) { return norm(Math.atan2(-(p.y - cy), p.x - cx) / D2R); }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function pointer(cv, h) {
    cv.style.touchAction = 'none'; var down = false;
    function P(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.onpointerdown = function (e) { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (h.down) h.down(P(e)); };
    cv.onpointermove = function (e) { if (down && h.move) h.move(P(e)); };
    cv.onpointerup = cv.onpointercancel = function (e) { if (!down) return; down = false; if (h.up) h.up(P(e)); };
  }
  // 값 트윈 (angle=true면 최단 회전)
  function tween(get, set, to, draw, ms, angle, done) {
    var from = get(), d = to - from;
    if (angle) { d = norm(d); if (d > 180) d -= 360; }
    var t0 = performance.now();
    (function f(ts) { var x = Math.min(1, (ts - t0) / (ms || 1200)); set(from + d * ease(x)); draw(); if (x < 1) requestAnimationFrame(f); else if (done) done(); })(t0);
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var ST = load();

  /* ── 공통 그림 ── */
  function geo(w, h, big) { var Ro = Math.min(w * 0.38, h * 0.4); return { cx: w * 0.5, cy: h * 0.5, Ro: Ro, Re: Ro * (big ? 0.3 : 0.22), mr: Ro * 0.08 }; }
  function scene(c, w, h, g, opt) {
    opt = opt || {};
    E.spaceBg(c, w, h, 4);
    for (var k = -4; k <= 4; k++) { var y = g.cy + k * h * 0.1; E.arrow(c, w - 2, y, w - 26, y, 'rgba(255,210,90,.5)', 1.4, 5); }
    E.label(c, '햇빛', w - 16, 12, E.C.sun, 11);
    if (!opt.noOrbit) {
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(g.cx, g.cy, g.Ro, 0, 7); c.stroke(); c.setLineDash([]);
      E.arcArrow(c, g.cx, g.cy, g.Ro + 12, -0.3, -0.8, true, 'rgba(111,214,255,.7)', 2);
      E.label(c, '공전 (시계 반대)', g.cx + g.Ro * 0.72, g.cy - g.Ro - 6, E.C.cyan, 10);
    }
    E.earthTop(c, g.cx, g.cy, g.Re, 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
    E.label(c, '위에서 본 모습 (북극 위)', 10, 12, E.C.muted, 10, 'left');
  }
  function moonO(c, x, y, r, ring) {
    c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2); c.fill();
    if (ring) { c.strokeStyle = ring; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r + 4, 0, 7); c.stroke(); }
  }
  function phaseView(c, x, y, r, e) {
    if (adiff(e, 0) < 12) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.setLineDash([]); E.label(c, '안 보임', x, y, E.C.muted, 11); }
    else E.moonPhase(c, x, y, r, e);
  }
  function info(e) { return E.phaseInfo(norm(e) / 360 * E.SYNODIC + 1); }
  var POS8 = [[0, '삭'], [45, '초승달'], [90, '상현달'], [135, '상현→보름 사이'], [180, '보름달(망)'], [225, '보름→하현 사이'], [270, '하현달'], [315, '그믐달']];
  function pname(e) { return POS8.filter(function (p) { return p[0] === e; })[0][1]; }

  /* ═════════ 조작 타입 (각각 draw + show) ═════════ */
  var T = {};
  T.earth = function (X) {
    var p = X.p, s = { t: p.start, net: 0 }, last = null, g = null;
    var sky = document.createElement('canvas'); X.extra.appendChild(sky);
    var stars = (function () { var r = E.rng(5), o = []; for (var i = 0; i < 70; i++) o.push({ dec: -20 + r() * 60, H0: r() * 360 }); return o; })();
    function tt() { return ((s.t % 24) + 24) % 24; }
    function draw() {
      var t = tt(), F = E.fit(X.cv, 0.6, 320), c = F.ctx, w = F.w, h = F.h;
      E.spaceBg(c, w, h, 2); var R = Math.min(h * 0.3, w * 0.2); g = { cx: w * 0.42, cy: h * 0.54 };
      E.earthTop(c, g.cx, g.cy, R, t, { obsLabel: '서울' });
      E.label(c, '👆 지구를 문질러 돌려요', 10, 14, E.C.muted, 11, 'left');
      if (p.rot) E.pill(c, '회전 ' + (s.net >= 0 ? '+' : '') + Math.round(s.net) + '°', w - 60, h - 18, 'rgba(255,184,77,.25)', E.C.accent, 12);
      var B = E.fit(sky, 0.36, 190), d = B.ctx, W = B.w, H = B.h, base = H - 24, sun = E.altAz(0, 15 * (t - 12)), day = Math.max(0, Math.min(1, (sun.alt + 8) / 20));
      var gr = d.createLinearGradient(0, 0, 0, base); gr.addColorStop(0, day > 0.55 ? '#3a86d6' : (day > 0.05 ? '#3b3a6e' : '#050914')); gr.addColorStop(1, day > 0.55 ? '#a8d4ff' : (day > 0.05 ? '#d08a5c' : '#17244e'));
      d.fillStyle = gr; d.fillRect(0, 0, W, base);
      function Xa(az) { return (az - 60) / 240 * W; } function Ya(al) { return base - al / 70 * (base - 12); }
      if (sun.alt < -6) stars.forEach(function (st) { var aa = E.altAz(st.dec, st.H0 + 15 * (t - 12)); if (aa.alt > 0 && aa.az > 60 && aa.az < 300) { d.fillStyle = 'rgba(230,238,255,.85)'; d.fillRect(Xa(aa.az), Ya(aa.alt), 1.8, 1.8); } });
      if (sun.alt > -4 && sun.az > 60 && sun.az < 300) E.sun(d, Xa(sun.az), Ya(sun.alt), 12);
      d.fillStyle = '#0a1410'; d.fillRect(0, base, W, H - base);
      [[90, '동'], [180, '남'], [270, '서']].forEach(function (k) { E.label(d, k[1], Xa(k[0]), base + 12, E.C.accent, 13); });
      E.pill(d, '서울에서 남쪽을 본 하늘', 82, 14, 'rgba(0,0,0,.35)', '#fff', 10);
    }
    pointer(X.cv, {
      down: function (q) { last = angOf(q, g.cx, g.cy); },
      move: function (q) { var a = angOf(q, g.cx, g.cy), dd = a - last; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; last = a; s.net += dd; s.t += dd / 15; draw(); },
      up: function () {
        X.move(); var t = tt();
        if (p.rot) {
          if (Math.abs(s.net - p.rot) <= 7) return X.ok();
          if (Math.abs(s.net + p.rot) <= 7) return X.say('반대로 돌렸어요! 지구는 북극 위에서 보면 <b>시계 반대 방향</b>으로 돌아요.', 'no');
          return X.say('지금 ' + Math.round(s.net) + '° 돌렸어요. 1시간에 몇 도인지 떠올려 봐요. (↺ 다시 하기로 처음부터)', 'info');
        }
        if (p.win.some(function (r) { return t >= r[0] && t <= r[1]; })) X.ok();
      }
    });
    function show(done) {
      var to = p.rot ? p.start + p.rot / 15 : (p.win[0][0] + p.win[0][1]) / 2;
      var from = s.t; s.t = p.start; s.net = 0;
      tween(function () { return s.t; }, function (v) { s.t = v; s.net = (v - p.start) * 15; }, to < p.start ? to + 24 : to, draw, 1800, false, done);
    }
    return { draw: draw, show: show };
  };

  var DIRN = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };
  var DIRT = { N: '북극성 중심으로 시계 반대 방향 원', E: '오른쪽 위로 비스듬히 떠오름', S: '지평선과 나란히 왼쪽→오른쪽 호', W: '오른쪽 아래로 비스듬히 짐' };
  T.photo = function (X) {
    var p = X.p, s = { dir: null, hrs: 2, shot: false }, tgt = null;
    if (p.target) { tgt = document.createElement('canvas'); X.extra.appendChild(tgt); }
    X.ctrl.innerHTML = '<div class="row"><label>방향</label>' + ['N', 'E', 'S', 'W'].map(function (d) { return '<button class="btn" data-d="' + d + '">' + DIRN[d] + '</button>'; }).join('') + '</div>' +
      '<div class="row"><label>노출</label><input type="range" min="0.5" max="12" step="0.5" value="2" data-h><b data-hv>2시간</b></div>' +
      '<div class="row"><button class="btn pri" data-shot>📸 촬영</button></div>';
    var hv = X.ctrl.querySelector('[data-hv]'), sl = X.ctrl.querySelector('[data-h]');
    function draw() {
      if (tgt) { var Tg = E.fit(tgt, 0.5, 230); E.skyTrails(Tg.ctx, Tg.w, Tg.h, p.dir, p.h, { noCompass: true, hideTitle: true }); E.pill(Tg.ctx, '선배의 사진 (' + p.h + '시간)', 72, 16, 'rgba(255,184,77,.25)', E.C.accent, 11); }
      var F = E.fit(X.cv, 0.62, 360);
      if (!s.dir) { E.spaceBg(F.ctx, F.w, F.h, 7); E.label(F.ctx, '📷 방향을 고르세요', F.w / 2, F.h / 2, '#fff', 16); }
      else E.skyTrails(F.ctx, F.w, F.h, s.dir, s.shot ? s.hrs : 0, { angle: s.shot });
      if (s.dir && !s.shot) E.label(F.ctx, '뷰파인더 — 노출을 정하고 📸', F.w / 2, F.h - 40, '#fff', 13);
      X.ctrl.querySelectorAll('[data-d]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-d') === s.dir); });
      hv.textContent = (+s.hrs).toFixed(1).replace('.0', '') + '시간'; sl.value = s.hrs;
      X.ro.innerHTML = s.shot ? '촬영 결과: ' + DIRN[s.dir] + ' 하늘 · ' + (+s.hrs).toFixed(1) + '시간 → ' + Math.round(15 * s.hrs) + '°' : '방향과 노출 시간을 정하고 촬영하세요';
    }
    X.ctrl.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { s.dir = b.getAttribute('data-d'); s.shot = false; draw(); }; });
    sl.oninput = function () { s.hrs = +this.value; s.shot = false; draw(); };
    X.ctrl.querySelector('[data-shot]').onclick = function () {
      if (!s.dir) return X.say('먼저 방향을 골라요!', 'info');
      X.move(); s.shot = true; draw();
      if (s.dir !== p.dir) return X.say('찍힌 사진은 <b>' + DIRN[s.dir] + ' 하늘</b> — ' + DIRT[s.dir] + '. 목표와 별의 움직임이 달라요!', 'no');
      if (p.minH && s.hrs < p.minH) return X.say('방향은 맞아요! 노출이 짧아 궤적이 잘 안 보여요. ' + p.minH + '시간 이상으로!', 'no');
      if (p.h && Math.abs(s.hrs - p.h) > p.tol) return X.say('방향은 맞아요! 각도 = 15° × ' + s.hrs + ' = <b>' + 15 * s.hrs + '°</b>. 목표 각도와 비교해 봐요.', 'no');
      setTimeout(X.ok, 600);
    };
    function show(done) { s.dir = p.dir; s.shot = true; s.hrs = 0; tween(function () { return s.hrs; }, function (v) { s.hrs = v; }, p.h || 3, draw, 2000, false, done); }
    return { draw: draw, show: show };
  };

  T.deliver = function (X) {
    var p = X.p, mid = (p.range[0] + p.range[1]) / 2, s = { e: norm(mid + 140 + Math.random() * 60) }, grab = false, g = null;
    var res = document.createElement('canvas'); X.extra.appendChild(res); res.style.display = 'none';
    X.ctrl.innerHTML = '<div class="row"><button class="btn pri" data-go>🚀 이 자리로 확정</button><span class="lede" style="font-size:12.5px">달(○)을 끌어 궤도 위 자리로 옮겨요</span></div>';
    function result() {
      res.style.display = 'block'; var R = E.fit(res, 0.34, 150), c = R.ctx, inf = info(s.e); E.spaceBg(c, R.w, R.h, 3);
      phaseView(c, R.h * 0.55, R.h / 2, R.h * 0.36, s.e);
      E.label(c, '지구에서 보면: ' + inf.name, R.h * 1.05, R.h / 2 - 12, E.C.accent, 14, 'left');
      E.label(c, inf.day + ' · ' + inf.sub, R.h * 1.05, R.h / 2 + 12, '#fff', 12, 'left');
      return inf;
    }
    function draw() {
      var F = E.fit(X.cv, 0.9, 380), c = F.ctx; g = geo(F.w, F.h); scene(c, F.w, F.h, g);
      var a = s.e * D2R; g.mx = g.cx + g.Ro * Math.cos(a); g.my = g.cy - g.Ro * Math.sin(a);
      moonO(c, g.mx, g.my, g.mr * 1.3, E.C.accent);
      X.ro.innerHTML = '궤도 위 달은 항상 <b>태양 쪽 반쪽</b>이 밝아요. 지구에서는 그중 어느 부분이 보일까?';
    }
    function setE(q) { s.e = angOf(q, g.cx, g.cy); draw(); }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.mx, q.y - g.my) < 50 || Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 40; if (grab) setE(q); },
      move: function (q) { if (grab) setE(q); }, up: function () { grab = false; }
    });
    X.ctrl.querySelector('[data-go]').onclick = function () {
      X.move(); var e = s.e, inR = (e >= p.range[0] && e <= p.range[1]) || (e + 360 >= p.range[0] && e + 360 <= p.range[1]), inf = result();
      if (inR) setTimeout(X.ok, 400); else X.say('이 자리의 달은 <b>' + inf.name + '</b> (' + inf.day + ', ' + inf.sub + '). 목표와 달라요!', 'no');
    };
    function show(done) { tween(function () { return s.e; }, function (v) { s.e = norm(v); }, norm(mid), draw, 1500, true, function () { result(); if (done) done(); }); }
    return { draw: draw, show: show };
  };

  T.slot = function (X) {
    var p = X.p, rounds = p.rounds.slice(), k = 0, done = [], g = null, lock = false, hl = null;
    var tc = document.createElement('canvas'); X.extra.appendChild(tc);
    function draw() {
      var Tc = E.fit(tc, 0.3, 130), t = Tc.ctx; E.spaceBg(t, Tc.w, Tc.h, 9);
      if (k < rounds.length) { phaseView(t, Tc.w / 2, Tc.h / 2, Tc.h * 0.36, rounds[k]); E.pill(t, '지구에서 본 모양 ' + (k + 1) + '/' + rounds.length, 74, 14, 'rgba(255,184,77,.25)', E.C.accent, 11); }
      else E.label(t, '✅ 모두 찾았어요', Tc.w / 2, Tc.h / 2, '#fff', 15);
      var F = E.fit(X.cv, 0.9, 380), c = F.ctx; g = geo(F.w, F.h); scene(c, F.w, F.h, g);
      g.pts = POS8.map(function (s) { var a = s[0] * D2R; return [g.cx + g.Ro * Math.cos(a), g.cy - g.Ro * Math.sin(a), s[0]]; });
      g.pts.forEach(function (q) {
        if (done.indexOf(q[2]) >= 0) moonO(c, q[0], q[1], g.mr * 1.2, E.C.ok);
        else if (hl === q[2]) moonO(c, q[0], q[1], g.mr * 1.2, E.C.accent);
        else { c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], g.mr * 1.3, 0, 7); c.stroke(); c.setLineDash([]); }
      });
      X.ro.innerHTML = '👆 이 모양이 보이는 궤도 자리를 눌러요';
    }
    pointer(X.cv, { up: function (q) {
      if (lock || k >= rounds.length) return;
      var best = null, bd = 1e9; g.pts.forEach(function (pt) { var d = Math.hypot(pt[0] - q.x, pt[1] - q.y); if (d < bd) { bd = d; best = pt; } });
      if (!best || bd > 46) return;
      X.move();
      if (best[2] === rounds[k]) { done.push(best[2]); k++; hl = null; lock = true; X.say('맞아요! 그 자리 = <b>' + pname(best[2]) + '</b>' + (k < rounds.length ? ' — 다음 모양!' : ''), 'okq'); draw(); setTimeout(function () { lock = false; if (k >= rounds.length) X.ok(); }, 600); }
      else X.say('그 자리의 달은 지구에서 <b>' + pname(best[2]) + '</b>(으)로 보여요. 다시!', 'no');
    } });
    function show(fin) { if (k >= rounds.length) return fin && fin(); hl = rounds[k]; draw(); setTimeout(function () { done.push(rounds[k]); k++; hl = null; draw(); if (k < rounds.length) show(fin); else if (fin) fin(); }, 1100); }
    return { draw: draw, show: show };
  };

  T.shape = function (X) {
    var p = X.p, rounds = p.rounds, k = 0, s = { g: norm(rounds[0] + 150) };
    var pv = document.createElement('canvas'); X.extra.appendChild(pv);
    X.ctrl.innerHTML = '<div class="row"><label>모양</label><input type="range" min="0" max="359" step="1" data-g></div><div class="row"><button class="btn pri" data-ok>✔ 이 모양!</button></div>';
    var sl = X.ctrl.querySelector('[data-g]');
    function draw() {
      var F = E.fit(X.cv, 0.8, 340), c = F.ctx, g = geo(F.w, F.h); scene(c, F.w, F.h, g);
      var tg = rounds[Math.min(k, rounds.length - 1)], a = tg * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a);
      moonO(c, mx, my, g.mr * 1.3, E.C.accent); E.label(c, '★', mx, my - g.mr * 1.3 - 14, E.C.accent, 16);
      c.strokeStyle = 'rgba(255,184,77,.5)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(g.cx, g.cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
      var P = E.fit(pv, 0.34, 150), d = P.ctx; E.spaceBg(d, P.w, P.h, 3); E.moonPhase(d, P.w / 2, P.h / 2, P.h * 0.38, s.g);
      E.pill(d, '내가 만든 모양 ' + (Math.min(k, rounds.length - 1) + 1) + '/' + rounds.length, 72, 14, 'rgba(255,184,77,.25)', E.C.accent, 11);
      sl.value = norm(s.g); X.ro.innerHTML = '★ 자리의 달이 지구에서 어떻게 보일지 슬라이더로 만들어요';
    }
    sl.oninput = function () { s.g = +sl.value; draw(); };
    X.ctrl.querySelector('[data-ok]').onclick = function () {
      if (k >= rounds.length) return; X.move(); var tg = rounds[k];
      if (adiff(s.g, tg) <= 24) { k++; if (k >= rounds.length) { X.say('정답!', 'okq'); return setTimeout(X.ok, 300); } X.say('정답! 다음 ★로!', 'okq'); s.g = norm(rounds[k] + 150); draw(); return; }
      var gw = norm(s.g) > 0 && norm(s.g) < 180, tw = tg > 0 && tg < 180;
      X.say(gw !== tw ? '밝은 쪽 <b>방향</b>을 다시! ★는 궤도 ' + (tw ? '위쪽(차오르는 중 → 오른쪽이 밝음)' : '아래쪽(줄어드는 중 → 왼쪽이 밝음)') + '이에요.' : '방향은 맞아요! 밝은 부분의 <b>두께</b>를 조절해요. 보름 자리(왼쪽)에 가까울수록 둥글어요.', 'no');
    };
    function show(fin) { if (k >= rounds.length) return fin && fin(); tween(function () { return s.g; }, function (v) { s.g = norm(v); }, rounds[k], draw, 1200, true, function () { setTimeout(function () { k++; if (k < rounds.length) { s.g = norm(rounds[k] + 150); draw(); show(fin); } else if (fin) fin(); }, 700); }); }
    return { draw: draw, show: show };
  };

  /* 그림자 장면 */
  function moonShadow(c, g, mx, my) {
    var dy = my - g.cy; if (mx <= g.cx || Math.abs(dy) > g.Re + g.mr * 3.5) return null;
    var xs = g.cx + Math.sqrt(Math.max(0, g.Re * g.Re - Math.min(g.Re * g.Re, dy * dy))), pw = g.mr * 3.5;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(mx, my - g.mr); c.lineTo(xs, my - pw); c.lineTo(xs, my + pw); c.lineTo(mx, my + g.mr); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.moveTo(mx, my - g.mr); c.lineTo(xs, my); c.lineTo(mx, my + g.mr); c.closePath(); c.fill();
    c.save(); c.beginPath(); c.arc(g.cx, g.cy, g.Re, 0, 7); c.clip();
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(xs, my, g.Re * 0.3, pw, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.95)'; c.beginPath(); c.ellipse(xs, my, 5, g.mr * 0.45, 0, 0, 7); c.fill(); c.restore();
    E.label(c, '반그림자', xs - g.Re * 0.55, my - pw - 6, 'rgba(255,255,255,.6)', 10);
    return { xs: xs, pw: pw, um: g.mr * 0.45 };
  }
  function earthShadow(c, g) {
    function uh(x) { return g.Re * (1 - 0.55 * (g.cx - x) / g.cx); } function ph(x) { return g.Re * (1 + 0.9 * (g.cx - x) / g.cx); }
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(g.cx, g.cy - g.Re); c.lineTo(0, g.cy - ph(0)); c.lineTo(0, g.cy + ph(0)); c.lineTo(g.cx, g.cy + g.Re); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.65)'; c.beginPath(); c.moveTo(g.cx, g.cy - g.Re); c.lineTo(0, g.cy - uh(0)); c.lineTo(0, g.cy + uh(0)); c.lineTo(g.cx, g.cy + g.Re); c.closePath(); c.fill();
    E.label(c, '지구의 본그림자', g.cx - g.Ro * 0.55, g.cy, 'rgba(255,255,255,.45)', 10);
    E.earthTop(c, g.cx, g.cy, g.Re, 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
    return { uh: uh };
  }
  function eclMoon(c, g, mx, my, sh) {
    var dy = Math.abs(my - g.cy), u = sh.uh(mx), st = mx < g.cx ? (dy + g.mr <= u ? 'total' : (dy - g.mr < u ? 'partial' : 'none')) : 'none';
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, g.mr, 0, 7); c.fill();
    if (st !== 'none') { c.save(); c.beginPath(); c.arc(mx, my, g.mr, 0, 7); c.clip(); c.fillStyle = st === 'total' ? '#b5452e' : 'rgba(120,35,20,.95)'; if (st === 'total') c.fillRect(mx - g.mr, my - g.mr, 2 * g.mr, 2 * g.mr); else c.fillRect(0, g.cy - u, g.cx, 2 * u); c.restore(); }
    c.strokeStyle = E.C.accent; c.lineWidth = 2.5; c.beginPath(); c.arc(mx, my, g.mr + 4, 0, 7); c.stroke();
    return st;
  }
  function grabRing(q, g) { return Math.hypot(q.x - g.mx, q.y - g.my) < 50 || Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 40; }

  T.eclipseDrop = function (X) {
    var s = { e: 55 }, grab = false, g = null, sy = 0, tgtE = null;
    var res = document.createElement('canvas'); X.extra.appendChild(res); res.style.display = 'none';
    function corona() {
      res.style.display = 'block'; var R = E.fit(res, 0.36, 160), c = R.ctx; E.spaceBg(c, R.w, R.h, 30);
      var cg = c.createRadialGradient(R.w / 2, R.h / 2, R.h * 0.22, R.w / 2, R.h / 2, R.h * 0.6); cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(R.w / 2, R.h / 2, R.h * 0.6, 0, 7); c.fill(); c.fillStyle = '#05070c'; c.beginPath(); c.arc(R.w / 2, R.h / 2, R.h * 0.23, 0, 7); c.fill();
      E.pill(c, '서울 하늘: 개기일식 (코로나)', R.w / 2, 14, 'rgba(0,0,0,.5)', '#fff', 11);
    }
    function draw() {
      var F = E.fit(X.cv, 0.9, 380), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g);
      var sx = g.cx + g.Re * Math.cos(28 * D2R); sy = g.cy - g.Re * Math.sin(28 * D2R); tgtE = Math.asin(g.Re * Math.sin(28 * D2R) / g.Ro) / D2R;
      var a = s.e * D2R; g.mx = g.cx + g.Ro * Math.cos(a); g.my = g.cy - g.Ro * Math.sin(a);
      g.sh = moonShadow(c, g, g.mx, g.my);
      E.label(c, '★', sx, sy, '#fff', 16); E.label(c, '서울', sx + 22, sy - 10, '#fff', 11);
      moonO(c, g.mx, g.my, g.mr, E.C.accent);
      X.ro.innerHTML = g.sh ? '그림자가 지구에 닿았어요! 진한 <b>본그림자</b> 점을 ★에 맞춰요' : '달의 그림자가 아직 지구에 안 닿아요';
    }
    pointer(X.cv, {
      down: function (q) { grab = grabRing(q, g); if (grab) { s.e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { s.e = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        if (g.sh && Math.abs(g.my - sy) < g.mr * 0.55) { corona(); return setTimeout(X.ok, 500); }
        if (g.sh) X.say('그림자는 닿았어요! 진한 본그림자 점을 ★에 정확히 맞춰요.', 'info');
        else if (Math.cos(s.e * D2R) < 0) X.say('달이 지구 <b>뒤쪽</b>(태양 반대편)에 있어요. 일식은 달이 태양과 지구 <b>사이</b>에 있어야 해요.', 'no');
      }
    });
    function show(done) { tween(function () { return s.e; }, function (v) { s.e = norm(v); }, tgtE, draw, 1500, true, function () { corona(); if (done) done(); }); }
    return { draw: draw, show: show };
  };

  T.observer = function (X) {
    var p = X.p, s = { phi: p.mode === 'partial' ? 160 : 20 }, grab = false, g = null;
    function draw() {
      var F = E.fit(X.cv, 0.9, 380), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g, { noOrbit: true });
      if (p.mode === 'partial') { var mx = g.cx + g.Ro; g.sh = moonShadow(c, g, mx, g.cy); moonO(c, mx, g.cy, g.mr); E.label(c, '달 (삭)', mx, g.cy - g.mr - 12, '#fff', 11); }
      else { var sh = earthShadow(c, g); eclMoon(c, g, g.cx - g.Ro, g.cy, sh); E.label(c, '달 (망) — 개기월식 중', g.cx - g.Ro + 10, g.cy - g.mr - 14, '#ff9a7a', 11); }
      var a = s.phi * D2R, ox = g.cx + g.Re * Math.cos(a), oy = g.cy - g.Re * Math.sin(a);
      c.fillStyle = E.C.accent; c.beginPath(); c.moveTo(ox, oy - 9); c.lineTo(ox + 8, oy); c.lineTo(ox, oy + 9); c.lineTo(ox - 8, oy); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
      E.label(c, '◆ 관측대', ox + (Math.cos(a) >= 0 ? 34 : -34), oy - 14, E.C.accent, 11);
      X.ro.innerHTML = '👆 ◆를 지구 둘레로 끌어요 · 오른쪽 = 낮(태양 쪽), 왼쪽 = 밤';
    }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.cx, q.y - g.cy) < g.Re * 2.2; if (grab) { s.phi = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { s.phi = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        var cs = Math.cos(s.phi * D2R), dy = Math.abs(g.Re * Math.sin(s.phi * D2R));
        if (p.mode === 'partial') {
          if (cs <= 0.1) return X.say('여긴 <b>밤</b>이라 태양 자체가 안 보여요 → 일식 관찰 불가!', 'no');
          if (dy < g.sh.um + 2) return X.say('여긴 <b>본그림자</b> → 개기일식이 보여요. 부분일식만 보이는 곳은?', 'no');
          if (dy > g.sh.pw) return X.say('여긴 그림자 <b>밖</b> → 일식이 안 보여요.', 'no');
          return X.ok();
        }
        if (cs < -0.1) return X.ok();
        X.say('여긴 <b>낮</b>이라 달이 지평선 아래 → 월식을 못 봐요. 달이 보이는 곳은?', 'no');
      }
    });
    function show(done) {
      var to = p.mode === 'partial' ? Math.asin(((g.mr * 0.45 + g.mr * 3.5) / 2) / g.Re) / D2R : 180;
      tween(function () { return s.phi; }, function (v) { s.phi = norm(v); }, to, draw, 1500, true, done);
    }
    return { draw: draw, show: show };
  };

  T.lunarPlace = function (X) {
    var p = X.p, s = { e: 120 }, grab = false, g = null;
    function draw() {
      var F = E.fit(X.cv, 0.9, 380), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g);
      var sh = earthShadow(c, g), a = s.e * D2R; g.mx = g.cx + g.Ro * Math.cos(a); g.my = g.cy - g.Ro * Math.sin(a);
      g.st = eclMoon(c, g, g.mx, g.my, sh);
      X.ro.innerHTML = { total: '🔴 달 전체가 본그림자 속! (개기월식)', partial: '🌗 달 일부만 본그림자에 (부분월식)', none: '달이 지구 그림자 밖에 있어요' }[g.st];
    }
    pointer(X.cv, {
      down: function (q) { grab = grabRing(q, g); if (grab) { s.e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { s.e = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        if (g.st === p.mode) return X.ok();
        if (g.st === 'total') return X.say('완전히 들어가서 <b>개기월식</b>이 됐어요. 이번엔 <b>일부만</b>!', 'no');
        if (g.st === 'partial') return X.say('일부만 들어간 <b>부분월식</b>이에요. 그림자 한가운데로 더!', 'info');
        if (Math.cos(s.e * D2R) > 0) X.say('달이 태양 쪽에 있어요. 지구 그림자는 태양 <b>반대편</b>으로 생겨요!', 'no');
      }
    });
    function show(done) { tween(function () { return s.e; }, function (v) { s.e = norm(v); }, p.mode === 'total' ? 180 : 170, draw, 1500, true, done); }
    return { draw: draw, show: show };
  };

  T.tapSide = function (X) {
    var p = X.p, s = { anim: 0 }, picked = null, raf = 0;
    function draw() {
      var F = E.fit(X.cv, 0.58, 300), c = F.ctx, w = F.w, h = F.h, cx = w / 2, cy = h / 2 - 6, r = h * 0.22;
      if (p.body === 'sun') {
        var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a6fb8'); gr.addColorStop(1, '#8fc4f0'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        E.sun(c, cx, cy, r); if (s.anim > 0) { c.fillStyle = '#0d0f14'; c.beginPath(); c.arc(cx + r * (2.1 - 1.5 * s.anim), cy - r * 0.1, r * 1.03, 0, 7); c.fill(); }
      } else {
        E.spaceBg(c, w, h, 22); c.fillStyle = '#f0e6c8'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
        if (s.anim > 0) { c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = 'rgba(120,35,20,.92)'; c.beginPath(); c.arc(cx - r * (3.7 - 1.5 * s.anim), cy, r * 2.6, 0, 7); c.fill(); c.restore(); }
      }
      E.label(c, '← 동 (왼쪽)', 48, h - 12, '#fff', 12); E.label(c, '서 (오른쪽) →', w - 52, h - 12, '#fff', 12);
      if (!picked) { c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(cx, cy - r - 14); c.lineTo(cx, cy + r + 14); c.stroke(); c.setLineDash([]); E.label(c, '왼쪽?', cx - r - 34, cy, '#fff', 14); E.label(c, '오른쪽?', cx + r + 40, cy, '#fff', 14); }
      E.pill(c, p.body === 'sun' ? '남쪽 하늘의 태양' : '밤하늘의 보름달', w / 2, 14, 'rgba(0,0,0,.35)', '#fff', 11);
      X.ro.innerHTML = picked ? (p.body === 'sun' ? '달이 오른쪽(서)에서 들어와 태양을 덮어요' : '달이 오른쪽→왼쪽으로 움직이며 지구 그림자 속으로') : '👆 먼저 가려질 쪽을 눌러요';
    }
    function play(cb) { var t0 = performance.now(); cancelAnimationFrame(raf); (function f(ts) { s.anim = Math.min(1, (ts - t0) / 1500); draw(); if (s.anim < 1) raf = requestAnimationFrame(f); else if (cb) cb(); })(t0); }
    pointer(X.cv, { up: function (q) {
      if (picked) return; var w = X.cv.getBoundingClientRect().width; picked = q.x < w / 2 ? 'L' : 'R'; X.move();
      var ok = (p.body === 'sun' && picked === 'R') || (p.body === 'moon' && picked === 'L');
      play(function () { if (ok) X.ok(); else { X.say('보세요 — 실제로는 <b>' + (p.body === 'sun' ? '오른쪽(서쪽)' : '왼쪽(동쪽)') + '</b>부터 가려져요! 다시 눌러봐요.', 'no'); setTimeout(function () { picked = null; s.anim = 0; draw(); }, 500); } });
    } });
    function show(done) { picked = p.body === 'sun' ? 'R' : 'L'; s.anim = 0; play(done); }
    return { draw: draw, show: show, destroy: function () { cancelAnimationFrame(raf); } };
  };

  /* ═════════ 문제 은행 (단원별 3~4문제) ═════════ */
  var QS = [
    { id: 'u1-1', u: 'u1', t: '해돋이 만들기', type: 'earth', p: { start: 1, win: [[5.4, 6.6]] }, goal: '지구를 돌려서 서울(●)에 <b>해가 뜨게</b> 하세요.',
      why: '●가 밤 → 낮 경계에 오면 해 뜰 무렵. 지구가 <b>서→동(시계 반대)</b>으로 돌기 때문에 태양이 <b>동쪽</b>에서 떠오르는 것처럼 보여요.' },
    { id: 'u1-2', u: 'u1', t: '정오의 태양', type: 'earth', p: { start: 7, win: [[11.4, 12.6]] }, goal: '태양을 <b>남쪽 하늘 가장 높은 곳</b>에 올려놓으세요.',
      why: '●가 태양을 정면으로 마주 보는 때 = 정오. 태양은 <b>동→남→서</b>로 움직여 보이고 정오에 남쪽에서 가장 높아요.' },
    { id: 'u1-3', u: 'u1', t: '3시간 뒤', type: 'earth', p: { start: 9, rot: 45 }, goal: '지금 <b>오전 9시</b>. 지구를 <b>3시간 뒤</b>만큼 돌려 보세요. 몇 도일까요?',
      why: '360° ÷ 24시간 = <b>1시간에 15°</b>. 3시간 = <b>45°</b>, 방향은 <b>시계 반대</b>. 그래서 천체도 1시간에 15°씩 동→서로 움직여 보여요.' },
    { id: 'u2-1', u: 'u2', t: '동그라미 궤적', type: 'photo', p: { dir: 'N', minH: 2 }, goal: '별들이 한 점을 중심으로 <b>동그랗게</b> 도는 사진을 찍어 오세요. (2시간 이상)',
      why: '<b>북쪽 하늘</b>: 별이 <b>북극성</b>을 중심으로 <b>시계 반대 방향</b>으로 원을 그려요.' },
    { id: 'u2-2', u: 'u2', t: '떠오르는 별', type: 'photo', p: { dir: 'E', minH: 2 }, goal: '별이 지평선에서 <b>오른쪽 위로 비스듬히 떠오르는</b> 사진을 찍어 오세요.',
      why: '<b>동쪽 하늘</b>: 해가 뜨는 쪽에서는 별도 <b>오른쪽 위로 비스듬히</b> 떠올라요.' },
    { id: 'u2-3', u: 'u2', t: '정확히 45°', type: 'photo', p: { dir: 'N', h: 3, tol: 0.25 }, goal: '북극성 둘레로 정확히 <b>45°</b> 호를 그린 사진을 찍으세요.',
      why: '별은 1시간에 15° → 45° ÷ 15° = <b>3시간</b>.' },
    { id: 'u2-4', u: 'u2', t: '사진 복원', type: 'photo', p: { dir: 'W', h: 4, tol: 0.5, target: true }, goal: '아래 선배 사진(4시간 노출)을 똑같이 다시 찍어 오세요. <b>어느 방향</b> 하늘일까요?',
      why: '<b>오른쪽 아래로 비스듬히</b> = <b>서쪽 하늘</b>. 남쪽은 왼→오 호, 동쪽은 오른쪽 위.' },
    { id: 'u3-1', u: 'u3', t: '보름달 자리', type: 'deliver', p: { range: [162, 198] }, goal: '<b>보름달</b>이 되도록 달을 궤도 위 자리로 옮기세요.',
      why: '태양-<b>지구</b>-달 일직선 → 지구 쪽 면 전체가 밝아요 = <b>보름달(망)</b>, 음력 15일경.' },
    { id: 'u3-2', u: 'u3', t: '음력 7~8일', type: 'deliver', p: { range: [72, 108] }, goal: '<b>음력 7~8일</b>의 달이 되도록 옮기세요.',
      why: '삭에서 1/4 공전 → 직각 → <b>오른쪽 반원 = 상현달</b>. 저녁 남쪽 하늘.' },
    { id: 'u3-3', u: 'u3', t: '저녁 서쪽 하늘', type: 'deliver', p: { range: [14, 58] }, goal: '<b>해 진 직후 서쪽 하늘</b>에 낮게 뜬 <b>가는 달</b>을 만드세요.',
      why: '삭에서 조금 공전 → 오른쪽이 가늘게 = <b>초승달</b> (음력 2~3일).' },
    { id: 'u3-4', u: 'u3', t: '왼쪽 실눈썹', type: 'deliver', p: { range: [302, 346] }, goal: '<b>왼쪽이 가늘게</b> 밝은 달을 만드세요. 이름과 날짜는?',
      why: '삭 직전 → 왼쪽만 가늘게 = <b>그믐달</b> (음력 27~28일, 새벽 동쪽 하늘).' },
    { id: 'u4-1', u: 'u4', t: '모양 → 자리', type: 'slot', p: { rounds: [90, 180, 0] }, goal: '지구에서 <b>이렇게 보이는 달</b>은 궤도 어디에 있을까요? (3문제)',
      why: '달은 스스로 빛을 못 내고 <b>햇빛을 반사</b> → 태양 쪽 반쪽만 밝아요. 그중 <b>지구를 향한 부분</b>이 우리가 보는 모양.' },
    { id: 'u4-2', u: 'u4', t: '가는 달 추적', type: 'slot', p: { rounds: [45, 270, 315] }, goal: '더 까다로운 모양! 궤도 위 자리를 찾아요. (3문제)',
      why: '오른쪽이 밝으면 차오르는 중(궤도 위쪽), 왼쪽이 밝으면 줄어드는 중(궤도 아래쪽). 달이 <b>공전</b>하며 위치가 바뀌니 모양이 바뀌어요.' },
    { id: 'u4-3', u: 'u4', t: '자리 → 모양', type: 'shape', p: { rounds: [90, 315, 135] }, goal: '★ 자리의 달은 지구에서 <b>어떻게 보일까요</b>? 슬라이더로 모양을 만들어요. (3문제)',
      why: '보이는 모양 = <b>햇빛 받는 반쪽 ∩ 지구 쪽 반쪽</b>. 직각이면 반달, 보름 자리에 가까울수록 둥글어요.' },
    { id: 'u5-1', u: 'u5', t: '서울에 일식을', type: 'eclipseDrop', p: {}, goal: '달을 끌어 <b>달의 본그림자</b>가 서울(★)에 떨어지게 하세요.',
      why: '태양-<b>달</b>-지구 일직선, 위상 <b>삭</b>. 본그림자가 닿은 곳에선 <b>개기일식</b>!' },
    { id: 'u5-2', u: 'u5', t: '부분일식 관측대', type: 'observer', p: { mode: 'partial' }, goal: '관측대(◆)를 <b>부분일식</b>만 보이는 곳으로 옮기세요.',
      why: '<b>반그림자</b> 지역 → 부분일식, <b>본그림자</b> 지역 → 개기일식. 밤인 곳은 일식을 못 봐요.' },
    { id: 'u5-3', u: 'u5', t: '태양의 어느 쪽?', type: 'tapSide', p: { body: 'sun' }, goal: '일식이 시작돼요! 태양의 <b>어느 쪽</b>이 먼저 가려질까요?',
      why: '달은 서→동으로 공전 → 하늘에서 오른쪽(서)에서 왼쪽(동)으로 움직이며 태양을 덮어요 → <b>태양의 오른쪽(서쪽)</b>부터.' },
    { id: 'u5-4', u: 'u5', t: '붉은 달', type: 'lunarPlace', p: { mode: 'total' }, goal: '달을 <b>지구의 본그림자 속에 완전히</b> 넣어 개기월식을 만드세요.',
      why: '태양-<b>지구</b>-달 일직선, 위상 <b>망</b>. 달 전체가 본그림자 → <b>개기월식</b> (붉게 보임).' },
    { id: 'u5-5', u: 'u5', t: '월식 관측대', type: 'observer', p: { mode: 'night' }, goal: '개기월식 중! 관측대(◆)를 <b>월식이 보이는 곳</b>으로 옮기세요.',
      why: '월식은 <b>밤이 되는 모든 지역</b>에서 보여요. (일식은 좁은 지역에서만)' },
    { id: 'u5-6', u: 'u5', t: '달의 어느 쪽?', type: 'tapSide', p: { body: 'moon' }, goal: '월식이 시작돼요! 달의 <b>어느 쪽</b>이 먼저 가려질까요?',
      why: '달이 서→동(오른쪽→왼쪽)으로 움직여 그림자에 들어가니 앞장선 <b>왼쪽(동쪽)</b>부터 가려져요.' }
  ];
  function byUnit(u) { return QS.filter(function (q) { return q.u === u; }); }
  function status(id) { return ST[id] || ''; }
  function stIcon(id) { return { ok: '✅', shown: '👀' }[status(id)] || '⬜'; }

  /* ═════════ 화면 ═════════ */
  function renderList(mount) {
    var UN = window.EMU.UNITS, done = QS.filter(function (q) { return status(q.id) === 'ok'; }).length;
    mount.innerHTML = '<div class="sec"><div class="eyebrow"><span class="tag">QUIZ</span>전체 ' + QS.length + '문제 · 맞힘 ' + done + '</div><h2 class="title">📝 퀴즈</h2>' +
      '<p class="lede">어떤 문제든 바로 눌러서 풀 수 있어요. 직접 조작해서 장면을 만들면 정답! 막히면 <b>정답 장면 보기</b>로 시뮬이 움직이며 설명해 줘요.</p>' +
      '<div class="runbar"><i style="width:' + (done / QS.length * 100) + '%"></i></div></div>' +
      UN.map(function (u) {
        return '<div class="card" style="margin:10px 0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>' + u.n + '. ' + u.title + '</b>' +
          '<a class="btn sm pri" href="#run/' + u.id + '/0">한 번에 풀기</a></div><div class="qlist">' +
          byUnit(u.id).map(function (q, i) { return '<a class="qi" href="#q/' + q.id + '"><span class="n">' + u.n + '-' + (i + 1) + '</span>' + q.t + '<span class="st">' + stIcon(q.id) + '</span></a>'; }).join('') +
          '</div><a class="btn sm" style="margin-top:8px" href="#' + u.id + '">📺 ' + u.short + ' 시뮬 다시 보기</a></div>';
      }).join('') +
      '<div class="row"><button class="btn sm" data-reset>기록 초기화</button></div>';
    mount.querySelector('[data-reset]').onclick = function () { ST = {}; save(ST); renderList(mount); };
  }

  // mode: {run:'u1', k} 또는 null(단일)
  function renderQ(id, mount, run) {
    var q = QS.filter(function (x) { return x.id === id; })[0]; if (!q) { location.hash = '#quiz'; return; }
    var U = window.EMU.UNITS.filter(function (u) { return u.id === q.u; })[0], list = run ? byUnit(run.u) : QS, idx = list.indexOf(q), inU = byUnit(q.u).indexOf(q) + 1;
    var moves = 0, solved = false, shown = false, impl = null, busy = false;
    var head = run
      ? '<div class="qhead"><span>📝 ' + U.n + '. ' + U.short + ' 단원 퀴즈</span><span>' + (idx + 1) + ' / ' + list.length + '</span></div><div class="runbar"><i style="width:' + (idx / list.length * 100) + '%"></i></div>'
      : '<div class="qhead"><a class="crumb" href="#quiz">← 퀴즈 목록</a><span>' + U.n + '-' + inU + ' · ' + U.short + '</span></div>';
    mount.innerHTML = head + '<div class="card qgoal">' + q.goal + '</div>' +
      '<div class="stage"><div class="cv"><canvas data-main></canvas></div><div data-extra></div><div class="readout" data-ro></div><div class="ctrl" data-ctrl></div></div>' +
      '<div class="g-fb" data-fb></div>' +
      '<div class="row noprint" style="margin-top:10px"><button class="btn" data-show>🎬 정답 장면 보기</button><button class="btn" data-reset>↺ 다시 하기</button></div>' +
      '<div class="qnav" data-nav></div>';
    var fb = mount.querySelector('[data-fb]'), nav = mount.querySelector('[data-nav]');
    function navHtml() {
      if (run) {
        var nx = idx + 1 < list.length ? '#run/' + run.u + '/' + (idx + 1) : '#runend/' + run.u;
        return '<a class="btn" href="#' + run.u + '">📺 시뮬로</a><a class="btn pri" href="' + nx + '">' + (idx + 1 < list.length ? '다음 문제 →' : '결과 보기 →') + '</a>';
      }
      var pv = QS[QS.indexOf(q) - 1], nx2 = QS[QS.indexOf(q) + 1];
      return (pv ? '<a class="btn" href="#q/' + pv.id + '">← 이전</a>' : '<span></span>') + '<a class="btn" href="#quiz">목록</a>' + (nx2 ? '<a class="btn pri" href="#q/' + nx2.id + '">다음 →</a>' : '<span></span>');
    }
    nav.innerHTML = navHtml();
    var X = {
      p: q.p, cv: mount.querySelector('[data-main]'), extra: mount.querySelector('[data-extra]'), ro: mount.querySelector('[data-ro]'), ctrl: mount.querySelector('[data-ctrl]'),
      move: function () { moves++; },
      say: function (html, kind) {
        if (solved || shown) return;
        fb.className = 'g-fb show ' + (kind === 'okq' ? 'ok' : kind === 'no' ? 'no' : 'info'); fb.innerHTML = html;
        if (kind === 'no') { var s = mount.querySelector('.stage'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
      },
      ok: function () {
        if (solved || shown) return; solved = true;
        if (status(q.id) !== 'ok') { ST[q.id] = 'ok'; save(ST); }
        fb.className = 'g-fb show ok pop';
        fb.innerHTML = '<div class="h">✅ 정답!' + (moves <= 1 ? ' 한 번에 성공 🎯' : '') + '</div>' + q.why;
        setTimeout(function () { fb.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
      }
    };
    mount.querySelector('[data-show]').onclick = function () {
      if (busy) return; busy = true;
      shown = true; if (status(q.id) !== 'ok') { ST[q.id] = 'shown'; save(ST); }
      fb.className = 'g-fb show sh'; fb.innerHTML = '<div class="h">🎬 정답 장면</div>시뮬이 정답 상태로 움직여요…';
      impl.show(function () { busy = false; fb.innerHTML = '<div class="h">🎬 정답 장면</div>' + q.why + '<div style="margin-top:8px"><button class="btn sm" data-retry>↺ 이제 직접 해보기</button></div>'; fb.querySelector('[data-retry]').onclick = function () { renderQ(id, mount, run); }; });
    };
    mount.querySelector('[data-reset]').onclick = function () { if (impl.destroy) impl.destroy(); renderQ(id, mount, run); };
    impl = T[q.type](X); impl.draw();
    var rt; function rs() { clearTimeout(rt); rt = setTimeout(impl.draw, 100); }
    window.addEventListener('resize', rs);
    window.scrollTo(0, 0);
    return function () { window.removeEventListener('resize', rs); if (impl.destroy) impl.destroy(); };
  }

  function renderRunEnd(u, mount) {
    var U = window.EMU.UNITS.filter(function (x) { return x.id === u; })[0], qs = byUnit(u), ok = qs.filter(function (q) { return status(q.id) === 'ok'; }).length;
    var nextU = window.EMU.UNITS[window.EMU.UNITS.indexOf(U) + 1];
    mount.innerHTML = '<div class="stage result pop"><div class="big">' + (ok === qs.length ? '🏆' : '📘') + '</div><h3>' + U.n + '. ' + U.short + ' 단원 퀴즈 끝!</h3>' +
      '<p class="lede">직접 맞힘 ' + ok + ' / ' + qs.length + '</p><ul class="sum" style="text-align:left;display:inline-block;margin:0">' +
      qs.map(function (q) { return '<li>' + stIcon(q.id) + ' <a href="#q/' + q.id + '">' + q.t + '</a></li>'; }).join('') + '</ul>' +
      '<div class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="#run/' + u + '/0">↺ 다시 풀기</a>' +
      (nextU ? '<a class="btn pri" href="#' + nextU.id + '">다음 단원: ' + nextU.short + ' →</a>' : '<a class="btn pri" href="#answer">📝 백지 답안 연습 →</a>') + '</div></div>';
    window.scrollTo(0, 0);
  }

  window.EMQ = { QS: QS, byUnit: byUnit, renderList: renderList, renderQ: renderQ, renderRunEnd: renderRunEnd, status: status, T: T };
})();
