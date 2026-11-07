/* mp.js — 달 조종사 엔진 (무빌드 · Canvas 2D · 터치 우선)
 * 의존: ../earth-moon/em-draw.js (window.EM), em-lab.js (POS8), mp-levels.js (MP_WORLDS/MP_LEVELS)
 * 원칙: 정답을 "고르는" 게 아니라 하늘을 "움직여서" 목표 장면을 만든다. 실패 시 왜 틀렸는지 장면+문장으로.
 */
(function () {
  'use strict';
  var E = window.EM, D2R = E.D2R, W = window.MP_WORLDS, L = window.MP_LEVELS, POS8 = window.EMLab.POS8;
  var app = document.getElementById('mp'), KEY = 'moon-pilot-v1', cleanup = null;

  /* ── 저장 ── */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { stars: {} }; } catch (e) { return { stars: {} }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var S = load();
  function stars(id) { return S.stars[id] || 0; }
  function cleared(id) { return stars(id) > 0; }
  function unlocked(lv) {
    if (lv.w === 'w6') return L.filter(function (x) { return x.w !== 'w6'; }).every(function (x) { return cleared(x.id); });
    var inW = L.filter(function (x) { return x.w === lv.w; }), i = inW.indexOf(lv);
    return i === 0 || cleared(inW[i - 1].id);
  }

  /* ── 유틸 ── */
  function norm(a) { return ((a % 360) + 360) % 360; }
  function adiff(a, b) { var d = norm(a - b); return d > 180 ? 360 - d : d; }
  function angOf(p, cx, cy) { return norm(Math.atan2(-(p.y - cy), p.x - cx) / D2R); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pointer(cv, h) {
    cv.style.touchAction = 'none'; var down = false;
    function P(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.onpointerdown = function (e) { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (h.down) h.down(P(e)); };
    cv.onpointermove = function (e) { if (down && h.move) h.move(P(e)); };
    cv.onpointerup = cv.onpointercancel = function (e) { if (!down) return; down = false; if (h.up) h.up(P(e)); };
  }
  function dayOf(e) { return norm(e) / 360 * E.SYNODIC + 1; }
  function phaseName(e) { var i = E.phaseInfo(dayOf(e)); return i; }
  function moonInOrbit(c, x, y, r, ring) {
    c.fillStyle = E.C.moonDark; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2); c.fill();
    if (ring) { c.strokeStyle = ring; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r + 4, 0, 7); c.stroke(); }
  }
  function smallMoon(c, x, y, r, e) {
    if (adiff(e, 0) < 12) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.setLineDash([]); E.label(c, '안 보임', x, y, E.C.muted, 11); }
    else E.moonPhase(c, x, y, r, e);
  }
  // 위에서 본 우주 장면 공통
  function geo(w, h, big) { var Ro = Math.min(w * 0.38, h * 0.4); return { cx: w * 0.5, cy: h * 0.5, Ro: Ro, Re: Ro * (big ? 0.3 : 0.22), mr: Ro * 0.08 }; }
  function scene(c, w, h, g, opt) {
    opt = opt || {};
    E.spaceBg(c, w, h, 4);
    for (var k = -4; k <= 4; k++) { var y = g.cy + k * h * 0.1; E.arrow(c, w - 2, y, w - 26, y, 'rgba(255,210,90,.5)', 1.4, 5); }
    E.label(c, '햇빛', w - 16, 12, E.C.sun, 11, 'center');
    if (!opt.noOrbit) {
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(g.cx, g.cy, g.Ro, 0, 7); c.stroke(); c.setLineDash([]);
      E.arcArrow(c, g.cx, g.cy, g.Ro + 12, -0.3, -0.8, true, 'rgba(111,214,255,.7)', 2);
      E.label(c, '공전 (시계 반대)', g.cx + g.Ro * 0.72, g.cy - g.Ro - 6, E.C.cyan, 10);
    }
    E.earthTop(c, g.cx, g.cy, g.Re, 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
    E.label(c, '위에서 본 모습 (북극 위)', 10, 12, E.C.muted, 10, 'left');
  }

  /* ═════════ 조작 타입 ═════════ */
  var T = {};

  /* 지구 돌리기 */
  T.earth = function (X) {
    var p = X.p, t = p.start, net = 0, last = null, g = null;
    var sky = document.createElement('canvas'); X.extra.appendChild(sky);
    var stars = (function () { var r = E.rng(5), o = []; for (var i = 0; i < 70; i++) o.push({ dec: -20 + r() * 60, H0: r() * 360 }); return o; })();
    function desc() {
      var a = E.altAz(0, 15 * (t - 12)).alt;
      if (a < -8) return '🌙 밤 — 별들이 동→서로 흘러요';
      if (a < 4) return (t < 12 ? '🌅 해가 동쪽 지평선에' : '🌇 해가 서쪽 지평선에');
      if (a > 48) return '☀️ 태양이 남쪽 하늘 높이';
      return t < 12 ? '🌤 태양이 남동쪽으로 올라가는 중' : '🌤 태양이 남서쪽으로 내려가는 중';
    }
    function draw() {
      var F = E.fit(X.cv, 0.62, 330), c = F.ctx, w = F.w, h = F.h;
      E.spaceBg(c, w, h, 2);
      var R = Math.min(h * 0.3, w * 0.2); g = { cx: w * 0.42, cy: h * 0.54, R: R };
      E.earthTop(c, g.cx, g.cy, R, t, { obsLabel: '서울' });
      E.label(c, '👆 지구를 문질러 돌려요', 10, 14, E.C.muted, 11, 'left');
      if (p.showRot) E.pill(c, '회전 ' + (net >= 0 ? '+' : '') + Math.round(net) + '° ' + (net >= 0 ? '(시계 반대)' : '(시계 방향)'), w - 86, h - 18, 'rgba(255,184,77,.2)', E.C.accent, 12);
      // 하늘
      var B = E.fit(sky, 0.36, 200), d = B.ctx, Wd = B.w, Hd = B.h, base = Hd - 26;
      var sun = E.altAz(0, 15 * (t - 12)), day = Math.max(0, Math.min(1, (sun.alt + 8) / 20));
      var gr = d.createLinearGradient(0, 0, 0, base);
      gr.addColorStop(0, day > 0.5 ? '#3a86d6' : (day > 0 ? '#3b3a6e' : '#050914')); gr.addColorStop(1, day > 0.5 ? '#a8d4ff' : (day > 0 ? '#c27a5a' : '#17244e'));
      d.fillStyle = gr; d.fillRect(0, 0, Wd, base);
      function Xa(az) { return (az - 60) / 240 * Wd; } function Ya(al) { return base - al / 70 * (base - 12); }
      if (sun.alt < -6) stars.forEach(function (s) { var aa = E.altAz(s.dec, s.H0 + 15 * (t - 12)); if (aa.alt > 0 && aa.az > 60 && aa.az < 300) { d.fillStyle = 'rgba(230,238,255,.85)'; d.fillRect(Xa(aa.az), Ya(aa.alt), 1.8, 1.8); } });
      if (sun.alt > -4 && sun.az > 60 && sun.az < 300) E.sun(d, Xa(sun.az), Ya(sun.alt), 12);
      d.fillStyle = '#0a1410'; d.fillRect(0, base, Wd, Hd - base);
      [[90, '동'], [180, '남'], [270, '서']].forEach(function (k) { E.label(d, k[1], Xa(k[0]), base + 13, E.C.accent, 13); });
      E.pill(d, '서울에서 남쪽을 본 하늘', 82, 14, 'rgba(0,0,0,.35)', '#fff', 10);
      X.ro.innerHTML = desc();
    }
    pointer(X.cv, {
      down: function (q) { last = angOf(q, g.cx, g.cy); },
      move: function (q) { var a = angOf(q, g.cx, g.cy), dd = a - last; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; last = a; net += dd; t = ((t + dd / 15) % 24 + 24) % 24; draw(); },
      up: function () {
        X.move();
        if (p.rot) {
          if (Math.abs(net - p.rot) <= 7) return X.win();
          if (Math.abs(net + p.rot) <= 7) return X.say('반대로 돌렸어요! 지구는 북극 위에서 보면 <b>시계 반대 방향</b>으로 돌아요.', 'no');
          return X.say('지금 ' + Math.round(net) + '° 돌렸어요. 3시간이면 몇 도일까요? (다시 하기로 처음부터)', 'info');
        }
        var ok = p.win.some(function (r) { return t >= r[0] && t <= r[1]; });
        if (ok) X.win();
      }
    });
    return { draw: draw };
  };

  /* 별빛 사진가 */
  var DIRN = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };
  var DIRT = { N: '북극성 중심으로 시계 반대 방향 원', E: '오른쪽 위로 비스듬히 떠오름', S: '지평선과 나란히 왼쪽→오른쪽 호', W: '오른쪽 아래로 비스듬히 짐' };
  T.photo = function (X) {
    var p = X.p, dir = null, hrs = 2, shot = false, tgt = null;
    if (p.target) { tgt = document.createElement('canvas'); X.extra.appendChild(tgt); }
    X.ctrl.innerHTML = '<div class="row"><label>방향</label>' + ['N', 'E', 'S', 'W'].map(function (d) { return '<button class="btn" data-d="' + d + '">' + DIRN[d] + '</button>'; }).join('') + '</div>' +
      '<div class="row"><label>노출</label><input type="range" min="0.5" max="12" step="0.5" value="2" data-h><b data-hv>2시간</b></div>' +
      '<div class="row"><button class="btn pri" data-shot>📸 촬영</button></div>';
    var hv = X.ctrl.querySelector('[data-hv]');
    function draw() {
      if (tgt) { var Tg = E.fit(tgt, 0.5, 240); E.skyTrails(Tg.ctx, Tg.w, Tg.h, p.dir, p.h, { noCompass: true, hideTitle: true }); E.pill(Tg.ctx, '선배의 사진 (4시간)', 72, 16, 'rgba(255,184,77,.25)', E.C.accent, 11); }
      var F = E.fit(X.cv, 0.62, 360);
      if (!dir) { E.spaceBg(F.ctx, F.w, F.h, 7); E.label(F.ctx, '📷 방향을 고르세요', F.w / 2, F.h / 2, '#fff', 16); }
      else E.skyTrails(F.ctx, F.w, F.h, dir, shot ? hrs : 0, { angle: shot });
      if (dir && !shot) E.label(F.ctx, '뷰파인더 — 노출을 정하고 📸', F.w / 2, F.h - 40, '#fff', 13);
      X.ctrl.querySelectorAll('[data-d]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-d') === dir); });
      X.ro.innerHTML = shot ? '촬영 결과: ' + DIRN[dir] + ' 하늘 · ' + hrs + '시간 → ' + 15 * hrs + '°' : '방향과 노출 시간을 정하고 촬영하세요';
    }
    X.ctrl.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { dir = b.getAttribute('data-d'); shot = false; draw(); }; });
    X.ctrl.querySelector('[data-h]').oninput = function () { hrs = +this.value; hv.textContent = hrs + '시간'; shot = false; draw(); };
    X.ctrl.querySelector('[data-shot]').onclick = function () {
      if (!dir) return X.say('먼저 방향을 골라요!', 'info');
      X.move(); shot = true; draw();
      if (dir !== p.dir) return X.say('찍힌 사진은 <b>' + DIRN[dir] + ' 하늘</b> — ' + DIRT[dir] + '. 목표 사진과 별의 움직임이 달라요!', 'no');
      if (p.minH && hrs < p.minH) return X.say('방향은 맞아요! 그런데 노출이 짧아 궤적이 잘 안 보여요. ' + p.minH + '시간 이상으로!', 'no');
      if (p.h && Math.abs(hrs - p.h) > p.tol) return X.say('방향은 맞아요! 각도 = 15° × ' + hrs + ' = <b>' + 15 * hrs + '°</b>. 목표 각도와 비교해 봐요.', 'no');
      setTimeout(X.win, 700);
    };
    return { draw: draw };
  };

  /* 달 배달부 */
  T.deliver = function (X) {
    var p = X.p, mid = (p.range[0] + p.range[1]) / 2, e = norm(mid + 140 + Math.random() * 60), grab = false, g = null;
    var res = document.createElement('canvas'); X.extra.appendChild(res); res.style.display = 'none';
    X.ctrl.innerHTML = '<div class="row"><button class="btn pri" data-go>🚀 배달</button><span class="lede" style="font-size:12.5px">달(○)을 끌어 궤도 위 자리로 옮겨요</span></div>';
    function draw() {
      var F = E.fit(X.cv, 0.9, 400), c = F.ctx; g = geo(F.w, F.h); scene(c, F.w, F.h, g);
      var a = e * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a);
      moonInOrbit(c, mx, my, g.mr * 1.3, E.C.accent);
      g.mx = mx; g.my = my;
      X.ro.innerHTML = '어느 자리일까? 🤔 (궤도 위 달은 항상 태양 쪽 반쪽이 밝아요)';
    }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.mx, q.y - g.my) < 50 || Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 40; if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      up: function () { grab = false; }
    });
    X.ctrl.querySelector('[data-go]').onclick = function () {
      X.move();
      var inR = (e >= p.range[0] && e <= p.range[1]) || (e + 360 >= p.range[0] && e + 360 <= p.range[1]);
      var info = phaseName(e);
      res.style.display = 'block'; var R = E.fit(res, 0.34, 150), c = R.ctx; E.spaceBg(c, R.w, R.h, 3);
      smallMoon(c, R.h * 0.5 + 10, R.h / 2, R.h * 0.36, e);
      E.label(c, '지구에서 보면: ' + info.name, R.h + 20, R.h / 2 - 12, E.C.accent, 14, 'left');
      E.label(c, info.day + ' · ' + info.sub, R.h + 20, R.h / 2 + 12, '#fff', 12, 'left');
      if (inR) setTimeout(X.win, 500);
      else X.say('배달된 달은 <b>' + info.name + '</b> (' + info.day + ', ' + info.sub + '). 주문과 달라요!', 'no');
    };
    return { draw: draw };
  };

  /* 위상 퍼즐 — 자리 찾기 */
  T.slot = function (X) {
    var p = X.p, rounds = p.rounds ? p.rounds.slice() : shuffle([0, 45, 90, 135, 180, 225, 270, 315]).slice(0, p.random), k = 0, done = [], g = null, lock = false;
    var tc = document.createElement('canvas'); X.extra.appendChild(tc);
    function draw() {
      var Tc = E.fit(tc, 0.3, 130), t = Tc.ctx; E.spaceBg(t, Tc.w, Tc.h, 9);
      if (k < rounds.length) { smallMoon(t, Tc.w / 2, Tc.h / 2, Tc.h * 0.36, rounds[k]); E.pill(t, '지구에서 본 모양 ' + (k + 1) + '/' + rounds.length, 74, 14, 'rgba(255,184,77,.2)', E.C.accent, 11); }
      var F = E.fit(X.cv, 0.9, 400), c = F.ctx; g = geo(F.w, F.h); scene(c, F.w, F.h, g, { noOrbit: false });
      g.pts = POS8.map(function (s) { var a = s.e * D2R; return [g.cx + g.Ro * Math.cos(a), g.cy - g.Ro * Math.sin(a), s.e]; });
      g.pts.forEach(function (q) {
        if (done.indexOf(q[2]) >= 0) moonInOrbit(c, q[0], q[1], g.mr * 1.2, E.C.ok);
        else { c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], g.mr * 1.3, 0, 7); c.stroke(); c.setLineDash([]); }
      });
      X.ro.innerHTML = '👆 이 모양이 보이는 자리를 눌러요';
    }
    pointer(X.cv, { up: function (q) {
      if (lock || k >= rounds.length) return;
      var best = null, bd = 1e9; g.pts.forEach(function (pt) { var d = Math.hypot(pt[0] - q.x, pt[1] - q.y); if (d < bd) { bd = d; best = pt; } });
      if (!best || bd > 46) return;
      X.move();
      if (best[2] === rounds[k]) {
        done.push(best[2]); k++; lock = true; X.say('정답! 그 자리에선 <b>' + POS8.filter(function (s) { return s.e === best[2]; })[0].n + '</b>' + (k < rounds.length ? ' — 다음 모양!' : ''), 'ok');
        draw(); setTimeout(function () { lock = false; if (k >= rounds.length) X.win(); }, 650);
      } else X.say('그 자리의 달은 지구에서 <b>' + POS8.filter(function (s) { return s.e === best[2]; })[0].n + '</b>(으)로 보여요. 다시!', 'no');
    } });
    return { draw: draw };
  };

  /* 위상 퍼즐 — 모양 만들기 */
  T.shape = function (X) {
    var p = X.p, rounds = p.rounds, k = 0, guess = norm(rounds[0] + 150);
    var pv = document.createElement('canvas'); X.extra.appendChild(pv);
    X.ctrl.innerHTML = '<div class="row"><label>모양</label><input type="range" min="0" max="359" step="1" data-g></div><div class="row"><button class="btn pri" data-ok>✔ 이 모양!</button></div>';
    var sl = X.ctrl.querySelector('[data-g]'); sl.value = guess;
    function draw() {
      var F = E.fit(X.cv, 0.8, 360), c = F.ctx, g = geo(F.w, F.h); scene(c, F.w, F.h, g);
      var a = rounds[k] * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a);
      moonInOrbit(c, mx, my, g.mr * 1.3, E.C.accent); E.label(c, '★', mx, my - g.mr * 1.3 - 14, E.C.accent, 16);
      c.strokeStyle = 'rgba(255,184,77,.5)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(g.cx, g.cy); c.lineTo(mx, my); c.stroke(); c.setLineDash([]);
      var P = E.fit(pv, 0.34, 150), d = P.ctx; E.spaceBg(d, P.w, P.h, 3);
      E.moonPhase(d, P.w / 2, P.h / 2, P.h * 0.38, guess); E.pill(d, '내가 만든 모양 ' + (k + 1) + '/' + rounds.length, 72, 14, 'rgba(255,184,77,.2)', E.C.accent, 11);
      X.ro.innerHTML = '슬라이더로 밝은 부분을 조절해요';
    }
    sl.oninput = function () { guess = +sl.value; draw(); };
    X.ctrl.querySelector('[data-ok]').onclick = function () {
      if (k >= rounds.length) return; X.move(); var tg = rounds[k];
      if (adiff(guess, tg) <= 24) { k++; X.say('정답! ' + (k < rounds.length ? '다음 ★로!' : ''), 'ok'); if (k >= rounds.length) return setTimeout(X.win, 400); guess = norm(rounds[k] + 150); sl.value = guess; draw(); return; }
      var gWax = guess > 0 && guess < 180, tWax = tg > 0 && tg < 180;
      X.say(gWax !== tWax ? '밝은 쪽 <b>방향</b>(왼쪽/오른쪽)을 다시 생각해요. ★는 궤도 ' + (tWax ? '위쪽(차오르는 중)' : '아래쪽(줄어드는 중)') + '이에요.' : '방향은 맞아요! 밝은 부분의 <b>두께</b>를 조절해요. 보름 자리(왼쪽)에 가까울수록 둥글어요.', 'no');
    };
    return { draw: draw };
  };

  /* 그림자 공통 */
  function moonShadow(c, g, mx, my) { // 달 그림자 (태양 오른쪽 → 왼쪽으로)
    var dy = my - g.cy; if (mx <= g.cx || Math.abs(dy) > g.Re + g.mr * 3.5) return null;
    var xs = g.cx + Math.sqrt(Math.max(0, g.Re * g.Re - Math.min(g.Re * g.Re, dy * dy))), pw = g.mr * 3.5;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(mx, my - g.mr); c.lineTo(xs, my - pw); c.lineTo(xs, my + pw); c.lineTo(mx, my + g.mr); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.75)'; c.beginPath(); c.moveTo(mx, my - g.mr); c.lineTo(xs, my); c.lineTo(mx, my + g.mr); c.closePath(); c.fill();
    c.save(); c.beginPath(); c.arc(g.cx, g.cy, g.Re, 0, 7); c.clip();
    c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(xs, my, g.Re * 0.3, pw, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.95)'; c.beginPath(); c.ellipse(xs, my, 5, g.mr * 0.45, 0, 0, 7); c.fill(); c.restore();
    return { xs: xs, pw: pw, um: g.mr * 0.45 };
  }
  function earthShadow(c, g, w) { // 지구 그림자 (왼쪽으로)
    var x0 = 0;
    function uh(x) { return g.Re * (1 - 0.55 * (g.cx - x) / g.cx); } function ph(x) { return g.Re * (1 + 0.9 * (g.cx - x) / g.cx); }
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(g.cx, g.cy - g.Re); c.lineTo(x0, g.cy - ph(x0)); c.lineTo(x0, g.cy + ph(x0)); c.lineTo(g.cx, g.cy + g.Re); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.65)'; c.beginPath(); c.moveTo(g.cx, g.cy - g.Re); c.lineTo(x0, g.cy - uh(x0)); c.lineTo(x0, g.cy + uh(x0)); c.lineTo(g.cx, g.cy + g.Re); c.closePath(); c.fill();
    E.label(c, '지구의 본그림자', g.cx - g.Ro * 0.55, g.cy, 'rgba(255,255,255,.45)', 10);
    return { uh: uh, ph: ph };
  }
  function eclipseMoon(c, g, mx, my, sh) {
    var dy = Math.abs(my - g.cy), u = sh.uh(mx), st = mx < g.cx ? (dy + g.mr <= u ? 'total' : (dy - g.mr < u ? 'partial' : 'none')) : 'none';
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(mx, my, g.mr, 0, 7); c.fill();
    if (st !== 'none') {
      c.save(); c.beginPath(); c.arc(mx, my, g.mr, 0, 7); c.clip();
      c.fillStyle = st === 'total' ? '#b5452e' : 'rgba(120,35,20,.95)';
      if (st === 'total') c.fillRect(mx - g.mr, my - g.mr, 2 * g.mr, 2 * g.mr);
      else c.fillRect(0, g.cy - u, g.cx, 2 * u);
      c.restore();
    }
    c.strokeStyle = E.C.accent; c.lineWidth = 2.5; c.beginPath(); c.arc(mx, my, g.mr + 4, 0, 7); c.stroke();
    return st;
  }

  /* 서울에 일식 */
  T.eclipseDrop = function (X) {
    var e = 55, grab = false, g = null, sx, sy;
    var res = document.createElement('canvas'); X.extra.appendChild(res); res.style.display = 'none';
    function draw() {
      var F = E.fit(X.cv, 0.9, 400), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g);
      sx = g.cx + g.Re * Math.cos(28 * D2R); sy = g.cy - g.Re * Math.sin(28 * D2R);
      var a = e * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a); g.mx = mx; g.my = my;
      var sh = moonShadow(c, g, mx, my);
      E.label(c, '★', sx, sy, '#fff', 16); E.label(c, '서울', sx + 22, sy - 10, '#fff', 11);
      moonInOrbit(c, mx, my, g.mr, E.C.accent);
      X.ro.innerHTML = sh ? '그림자가 지구에 닿았어요! 진한 <b>본그림자</b>를 ★에 맞춰요' : '달의 그림자가 아직 지구에 안 닿아요';
      g.sh = sh;
    }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.mx, q.y - g.my) < 50 || Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 40; if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        if (g.sh && Math.abs(g.my - sy) < g.mr * 0.55) {
          res.style.display = 'block'; var R = E.fit(res, 0.38, 170), c = R.ctx; E.spaceBg(c, R.w, R.h, 30);
          var cg = c.createRadialGradient(R.w / 2, R.h / 2, R.h * 0.22, R.w / 2, R.h / 2, R.h * 0.6); cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = cg; c.beginPath(); c.arc(R.w / 2, R.h / 2, R.h * 0.6, 0, 7); c.fill(); c.fillStyle = '#05070c'; c.beginPath(); c.arc(R.w / 2, R.h / 2, R.h * 0.23, 0, 7); c.fill();
          E.pill(c, '서울 하늘: 개기일식! (코로나)', R.w / 2, 14, 'rgba(0,0,0,.5)', '#fff', 11);
          setTimeout(X.win, 600);
        } else if (g.sh) X.say('그림자는 닿았어요! 진한 본그림자 점을 ★에 정확히 맞춰요.', 'info');
        else if (Math.cos(e * D2R) < 0) X.say('달이 지구 <b>뒤쪽</b>(태양 반대편)에 있어요. 일식은 달이 태양과 지구 <b>사이</b>에 있어야 해요.', 'no');
      }
    });
    return { draw: draw };
  };

  /* 관측대 옮기기 */
  T.observer = function (X) {
    var p = X.p, phi = p.mode === 'partial' ? 160 : 20, grab = false, g = null;
    function draw() {
      var F = E.fit(X.cv, 0.9, 400), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g, { noOrbit: true });
      if (p.mode === 'partial') { var mx = g.cx + g.Ro, my = g.cy; g.sh = moonShadow(c, g, mx, my); moonInOrbit(c, mx, my, g.mr); E.label(c, '달 (삭)', mx, my - g.mr - 12, '#fff', 11); }
      else { var sh = earthShadow(c, g, F.w); eclipseMoon(c, g, g.cx - g.Ro, g.cy, sh); E.label(c, '달 (망) — 개기월식 중', g.cx - g.Ro, g.cy - g.mr - 14, '#ff9a7a', 11); E.earthTop(c, g.cx, g.cy, g.Re, 12, { noRays: true, noSpin: true, noPole: true, noObs: true }); }
      var a = phi * D2R, ox = g.cx + g.Re * Math.cos(a), oy = g.cy - g.Re * Math.sin(a); g.ox = ox; g.oy = oy;
      c.fillStyle = E.C.accent; c.beginPath(); c.moveTo(ox, oy - 9); c.lineTo(ox + 8, oy); c.lineTo(ox, oy + 9); c.lineTo(ox - 8, oy); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
      E.label(c, '◆ 관측대', ox + (Math.cos(a) >= 0 ? 34 : -34), oy - 14, E.C.accent, 11);
      X.ro.innerHTML = '👆 ◆를 지구 둘레로 끌어요 · 오른쪽 = 낮(태양 쪽), 왼쪽 = 밤';
    }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.cx, q.y - g.cy) < g.Re * 2.2; if (grab) { phi = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { phi = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        var cs = Math.cos(phi * D2R), dy = Math.abs(g.Re * Math.sin(phi * D2R));
        if (p.mode === 'partial') {
          if (cs <= 0.1) return X.say('여긴 <b>밤</b>이라 태양 자체가 안 보여요 → 일식 관찰 불가!', 'no');
          if (dy < g.sh.um + 2) return X.say('여긴 <b>본그림자</b> → 개기일식이 보여요. 부분일식만 보이는 곳은?', 'no');
          if (dy > g.sh.pw) return X.say('여긴 그림자 <b>밖</b> → 일식이 안 보여요.', 'no');
          return X.win();
        }
        if (cs < -0.1) return X.win();
        X.say('여긴 <b>낮</b>이라 달이 지평선 아래 → 월식을 못 봐요. 달이 보이는 곳은?', 'no');
      }
    });
    return { draw: draw };
  };

  /* 월식 만들기 */
  T.lunarPlace = function (X) {
    var p = X.p, e = 120, grab = false, g = null;
    function draw() {
      var F = E.fit(X.cv, 0.9, 400), c = F.ctx; g = geo(F.w, F.h, true); scene(c, F.w, F.h, g);
      var sh = earthShadow(c, g, F.w); E.earthTop(c, g.cx, g.cy, g.Re, 12, { noRays: true, noSpin: true, noPole: true, noObs: true });
      var a = e * D2R, mx = g.cx + g.Ro * Math.cos(a), my = g.cy - g.Ro * Math.sin(a); g.mx = mx; g.my = my;
      g.st = eclipseMoon(c, g, mx, my, sh);
      X.ro.innerHTML = { total: '🌕→🔴 달 전체가 본그림자 속! (개기월식)', partial: '🌗 달 일부만 본그림자에 (부분월식)', none: '달이 지구 그림자 밖에 있어요' }[g.st];
    }
    pointer(X.cv, {
      down: function (q) { grab = Math.hypot(q.x - g.mx, q.y - g.my) < 50 || Math.abs(Math.hypot(q.x - g.cx, q.y - g.cy) - g.Ro) < 40; if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      move: function (q) { if (grab) { e = angOf(q, g.cx, g.cy); draw(); } },
      up: function () {
        if (!grab) return; grab = false; X.move();
        if (g.st === p.mode) return X.win();
        if (g.st === 'total') return X.say('완전히 들어가서 <b>개기월식</b>이 됐어요. 이번엔 <b>일부만</b> 걸쳐요!', 'no');
        if (g.st === 'partial') return X.say('일부만 들어간 <b>부분월식</b>이에요. 그림자 한가운데로 더!', 'info');
        if (Math.cos(e * D2R) > 0) X.say('달이 태양 쪽에 있어요. 지구 그림자는 태양 <b>반대편</b>으로 생겨요!', 'no');
      }
    });
    return { draw: draw };
  };

  /* 먼저 가려지는 쪽 */
  T.tapSide = function (X) {
    var p = X.p, anim = 0, raf = 0, picked = null;
    function draw() {
      var F = E.fit(X.cv, 0.6, 320), c = F.ctx, w = F.w, h = F.h, cx = w / 2, cy = h / 2 - 6, r = h * 0.22;
      if (p.body === 'sun') {
        var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a6fb8'); gr.addColorStop(1, '#8fc4f0'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        E.sun(c, cx, cy, r);
        if (anim > 0) { c.fillStyle = '#0d0f14'; c.beginPath(); c.arc(cx + r * (2.1 - 1.5 * anim), cy - r * 0.1, r * 1.03, 0, 7); c.fill(); }
      } else {
        E.spaceBg(c, w, h, 22);
        c.fillStyle = '#f0e6c8'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
        if (anim > 0) { c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = 'rgba(120,35,20,.92)'; c.beginPath(); c.arc(cx - r * (3.7 - 1.5 * anim), cy, r * 2.6, 0, 7); c.fill(); c.restore(); }
      }
      E.label(c, '← 동 (왼쪽)', 48, h - 12, '#fff', 12); E.label(c, '서 (오른쪽) →', w - 52, h - 12, '#fff', 12);
      if (!picked) { c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(cx, cy - r - 14); c.lineTo(cx, cy + r + 14); c.stroke(); c.setLineDash([]);
        E.label(c, '왼쪽?', cx - r - 34, cy, '#fff', 14); E.label(c, '오른쪽?', cx + r + 40, cy, '#fff', 14); }
      E.pill(c, p.body === 'sun' ? '남쪽 하늘의 태양' : '밤하늘의 보름달', w / 2, 14, 'rgba(0,0,0,.35)', '#fff', 11);
      X.ro.innerHTML = picked ? (p.body === 'sun' ? '달이 오른쪽(서)에서 들어와요' : '달이 오른쪽→왼쪽으로 움직이며 그림자 속으로') : '👆 먼저 가려질 쪽을 눌러요';
    }
    pointer(X.cv, { up: function (q) {
      if (picked) return; var w = X.cv.getBoundingClientRect().width; picked = q.x < w / 2 ? 'L' : 'R'; X.move();
      var ok = (p.body === 'sun' && picked === 'R') || (p.body === 'moon' && picked === 'L');
      var t0 = 0; cancelAnimationFrame(raf);
      (function f(ts) { if (!t0) t0 = ts; anim = Math.min(1, (ts - t0) / 1400); draw(); if (anim < 1) raf = requestAnimationFrame(f); else if (ok) X.win(); else { X.say('보세요 — 실제로는 <b>' + (p.body === 'sun' ? '오른쪽(서쪽)' : '왼쪽(동쪽)') + '</b>부터 가려져요! ' + (p.body === 'sun' ? '달이 서→동(오른쪽→왼쪽)으로 움직이며 태양을 덮으니까요.' : '달이 서→동으로 움직여 앞장선 왼쪽이 먼저 그림자에 들어가요.') + ' 다시 눌러봐요.', 'no'); setTimeout(function () { picked = null; anim = 0; draw(); }, 400); } })(performance.now());
    } });
    return { draw: draw, destroy: function () { cancelAnimationFrame(raf); } };
  };

  /* 최종 미션 */
  T.boss = function (X) {
    var steps = X.p.steps, k = 0, cur = null, left = X.L.time, timer;
    function startStep() {
      X.extra.innerHTML = ''; X.ctrl.innerHTML = ''; X.say('', 'clear');
      X.goal.innerHTML = '<b>단계 ' + (k + 1) + '/3</b> · ' + steps[k].goal;
      var sub = Object.assign({}, X, { p: steps[k].p, win: function () { if (cur && cur.destroy) cur.destroy(); k++; if (k >= steps.length) { clearInterval(timer); X.win(); } else { X.say('✅ 단계 ' + k + ' 완료!', 'ok'); setTimeout(startStep, 700); } } });
      cur = T[steps[k].type](sub); cur.draw();
    }
    timer = setInterval(function () { left--; X.timer.textContent = '⏱ ' + left + '초'; if (left <= 0) { clearInterval(timer); X.lose('시간 초과! 다시 도전해요. 힌트: ' + X.L.hint); } }, 1000);
    X.timer.textContent = '⏱ ' + left + '초';
    startStep();
    return { draw: function () { if (cur) cur.draw(); }, destroy: function () { clearInterval(timer); if (cur && cur.destroy) cur.destroy(); } };
  };

  /* ═════════ 화면 ═════════ */
  function worldOf(id) { return W.filter(function (w) { return w.id === id; })[0]; }
  function starStr(n) { return '★★★'.slice(0, n) + '<span style="opacity:.22">' + '★★★'.slice(0, 3 - n) + '</span>'; }

  function home() {
    var total = L.reduce(function (a, l) { return a + stars(l.id); }, 0), cards = L.filter(function (l) { return cleared(l.id); }).length;
    var html = '<div class="mp-hero"><canvas data-hero></canvas><div class="mp-hero-t"><div class="h-eye">MOON PILOT</div><h1>달 조종사</h1>' +
      '<p class="lede">정답을 고르는 게 아니라, <b>하늘을 직접 움직여서</b> 장면을 만들어요.</p></div></div>' +
      '<div class="mp-stat"><span>⭐ ' + total + ' / ' + L.length * 3 + '</span><a class="btn sm" href="#note">📜 시험지 노트 ' + cards + '/' + L.length + '</a></div>';
    W.forEach(function (w) {
      var lv = L.filter(function (l) { return l.w === w.id; });
      html += '<div class="mp-world" style="--wc:' + w.color + '"><div class="mw-h"><span class="mw-ic">' + w.ic + '</span><div><div class="mw-t">' + w.t + '</div><div class="mw-r">' + w.rub + '</div></div></div><div class="mw-lv">' +
        lv.map(function (l) { var u = unlocked(l); return '<a class="lvb' + (u ? '' : ' lock') + (cleared(l.id) ? ' clr' : '') + '" ' + (u ? 'href="#lv/' + l.id + '"' : '') + '><b>' + (u ? l.id : '🔒') + '</b><span>' + l.t + '</span><i>' + starStr(stars(l.id)) + '</i></a>'; }).join('') +
        '</div></div>';
    });
    html += '<p class="lede" style="font-size:13px;margin-top:14px">💡 월드마다 첫 레벨은 열려 있어요. 최종 미션은 월드 1~5를 모두 깨면 열려요. 막히면 <a href="../earth-moon/">지구와 달 실험실</a>에서 만져보고 오세요.</p>';
    app.innerHTML = html;
    // 히어로 애니메이션
    var cv = app.querySelector('[data-hero]'), raf = 0, t0 = performance.now();
    function f(ts) {
      var F = E.fit(cv, 0.5, 260), c = F.ctx, w = F.w, h = F.h, t = (ts - t0) / 1000;
      E.spaceBg(c, w, h, 41); var cx = w * 0.72, cy = h * 0.55, Ro = h * 0.36;
      E.sun(c, w + 30, cy, 60);
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.setLineDash([3, 5]); c.beginPath(); c.arc(cx, cy, Ro, 0, 7); c.stroke(); c.setLineDash([]);
      E.earthTop(c, cx, cy, Ro * 0.3, (t * 3) % 24, { noRays: true, noSpin: true, noPole: true, noObs: true });
      var a = t * 0.6; moonInOrbit(c, cx + Ro * Math.cos(a), cy - Ro * Math.sin(a), Ro * 0.11);
      raf = requestAnimationFrame(f);
    }
    raf = requestAnimationFrame(f);
    return function () { cancelAnimationFrame(raf); };
  }

  function note() {
    var html = '<a class="crumb" href="#home">← 지도</a><div class="sec"><div class="eyebrow"><span class="tag">NOTE</span>시험지 노트</div><h2 class="title">📜 내가 모은 시험지 한 줄</h2>' +
      '<p class="lede">레벨을 깰 때마다 한 줄씩 모여요. 다 모으면 그대로 <b>수행평가 모범 답안</b>이 돼요. 마지막엔 <a href="../earth-moon/#answer">백지 답안 연습</a>으로!</p></div>';
    W.forEach(function (w) {
      html += '<div class="card" style="margin:10px 0;border-left:4px solid ' + w.color + '"><b>' + w.ic + ' ' + w.rub + '</b><ul style="margin:8px 0 0;padding-left:18px">' +
        L.filter(function (l) { return l.w === w.id; }).map(function (l) { return '<li style="margin:6px 0">' + (cleared(l.id) ? l.card : '<span style="color:var(--muted)">🔒 레벨 ' + l.id + ' 「' + l.t + '」을 깨면 열려요</span>') + '</li>'; }).join('') + '</ul></div>';
    });
    html += '<div class="row noprint"><button class="btn" onclick="window.print()">🖨 인쇄</button><a class="btn pri" href="#home">지도로</a></div>';
    app.innerHTML = html; window.scrollTo(0, 0);
  }

  function level(id) {
    var lv = L.filter(function (l) { return l.id === id; })[0];
    if (!lv || !unlocked(lv)) { location.hash = '#home'; return; }
    var w = worldOf(lv.w), moves = 0, hint = false, done = false, impl = null;
    app.innerHTML = '<div class="mp-top"><a class="crumb" href="#home">← 지도</a><span class="mp-lt" style="color:' + w.color + '">' + w.ic + ' ' + lv.id + ' ' + lv.t + '</span><span class="mp-mv"><span data-timer></span> <span data-mv>조작 0</span></span></div>' +
      '<div class="card goal" data-goal>' + lv.goal + '</div>' +
      '<div class="stage"><div class="cv"><canvas data-main></canvas></div><div data-extra></div><div class="readout" data-ro></div><div class="ctrl" data-ctrl></div></div>' +
      '<div class="g-fb" data-fb></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn" data-hint>💡 힌트</button><button class="btn" data-reset>↺ 다시 하기</button><span class="lede" style="font-size:12px">목표: 조작 ' + lv.par + '번 이내면 ★3</span></div>';
    var fb = app.querySelector('[data-fb]'), mv = app.querySelector('[data-mv]');
    var X = {
      L: lv, p: lv.p, cv: app.querySelector('[data-main]'), extra: app.querySelector('[data-extra]'), ro: app.querySelector('[data-ro]'), ctrl: app.querySelector('[data-ctrl]'),
      goal: app.querySelector('[data-goal]'), timer: app.querySelector('[data-timer]'),
      move: function () { moves++; mv.textContent = '조작 ' + moves; },
      say: function (html, kind) { if (done) return; if (kind === 'clear') { fb.className = 'g-fb'; return; } fb.className = 'g-fb show ' + (kind === 'ok' ? 'ok' : kind === 'no' ? 'no' : ''); fb.innerHTML = html; if (kind === 'no') { var s = app.querySelector('.stage'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } },
      win: function () {
        if (done) return; done = true; if (impl && impl.destroy) impl.destroy();
        var st = moves <= lv.par ? 3 : moves <= lv.par + 2 ? 2 : 1; if (hint) st = Math.min(st, 2);
        var first = !cleared(lv.id); if (st > stars(lv.id)) { S.stars[lv.id] = st; save(S); }
        var nx = L[L.indexOf(lv) + 1];
        fb.className = 'g-fb show ok pop';
        fb.innerHTML = '<div class="mp-win"><div class="mp-st">' + starStr(st) + '</div><div class="h">🎉 미션 성공!' + (hint ? ' (힌트 사용 → 최대 ★2)' : '') + '</div><p>' + lv.why + '</p>' +
          '<div class="mp-card"><div class="lbl">📜 시험지 한 줄 ' + (first ? '획득!' : '') + '</div>' + lv.card + '</div>' +
          '<div class="row" style="margin-top:10px">' + (nx && unlocked(nx) ? '<a class="btn pri" href="#lv/' + nx.id + '">다음: ' + nx.id + ' ' + nx.t + ' →</a>' : '<a class="btn pri" href="#home">지도로 →</a>') +
          '<button class="btn" data-again>다시 (★ 올리기)</button><a class="btn" href="#note">📜 노트</a></div></div>';
        fb.querySelector('[data-again]').onclick = function () { route(true); };
        setTimeout(function () { fb.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
      },
      lose: function (msg) { done = true; if (impl && impl.destroy) impl.destroy(); fb.className = 'g-fb show no'; fb.innerHTML = msg + '<div style="margin-top:8px"><button class="btn pri" data-again>다시 도전</button></div>'; fb.querySelector('[data-again]').onclick = function () { route(true); }; }
    };
    app.querySelector('[data-hint]').onclick = function () { hint = true; X.say('💡 ' + lv.hint, 'info'); };
    app.querySelector('[data-reset]').onclick = function () { route(true); };
    impl = T[lv.type](X); impl.draw();
    var rt; function rs() { clearTimeout(rt); rt = setTimeout(function () { if (!done || lv.type !== 'boss') impl.draw(); }, 100); }
    window.addEventListener('resize', rs);
    window.scrollTo(0, 0);
    return function () { window.removeEventListener('resize', rs); if (impl && impl.destroy) impl.destroy(); };
  }

  function route(force) {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    var h = location.hash.replace('#', '') || 'home', m;
    if ((m = h.match(/^lv\/(.+)$/))) cleanup = level(m[1]);
    else if (h === 'note') note();
    else cleanup = home();
  }
  window.addEventListener('hashchange', function () { route(); });
  window.MP = { T: T, route: route, _S: function () { return S; } };
  route();
})();
