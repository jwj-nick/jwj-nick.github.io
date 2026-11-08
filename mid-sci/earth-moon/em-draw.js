/* em-draw.js — 지구와 달 공통 렌더러 (Canvas 2D · 무빌드)
 * 스터디 앱(em-units/em-quiz)과 달 조종사(moon-pilot)가 같이 쓴다.
 * 좌표 규약: 위에서 내려다본 그림은 "북극 위에서 본 모습", 태양은 오른쪽(+x).
 *            하늘 그림은 "남쪽을 보고 선 관측자" 기준 → 왼쪽=동, 오른쪽=서.
 * v2(시네마틱)에서 이 파일만 WebGL/three.js 렌더러로 갈아끼우는 것을 전제로 API를 좁게 유지.
 */
(function () {
  'use strict';
  var D2R = Math.PI / 180, LAT = 37.5; // 서울 위도
  var C = {
    space: '#070b16', space2: '#0e1630', sun: '#ffd25a', sunGlow: 'rgba(255,190,70,', moonLit: '#f3ead2',
    moonDark: '#262b38', earthDay: '#3d8fd8', earthNight: '#13284a', land: '#4caf7a', landN: '#1d4a39',
    ink: '#eaf0f7', muted: '#93a3bb', accent: '#ffb84d', cyan: '#6fd6ff', red: '#ff6f6f', ground: '#0b1a12'
  };

  /* ── 캔버스 (고해상도) ── */
  function setup(canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function fit(canvas, ratio, maxH) {
    var w = Math.max(260, Math.floor(canvas.parentNode.clientWidth));
    var h = Math.round(Math.min(maxH || 9999, w * ratio));
    return { ctx: setup(canvas, w, h), w: w, h: h };
  }

  /* ── 결정적 난수 ── */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  function starBg(ctx, w, h, seed, n) {
    var r = rng(seed || 3); n = n || Math.round(w * h / 1800);
    for (var i = 0; i < n; i++) {
      var a = 0.25 + r() * 0.6;
      ctx.fillStyle = 'rgba(220,230,255,' + a + ')';
      ctx.fillRect(r() * w, r() * h, r() < 0.1 ? 1.6 : 1, r() < 0.1 ? 1.6 : 1);
    }
  }
  function spaceBg(ctx, w, h, seed) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.space); g.addColorStop(1, C.space2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    starBg(ctx, w, h, seed);
  }

  function arrow(ctx, x1, y1, x2, y2, color, width, head) {
    head = head || 8;
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
    ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  }
  // 원호 화살표: 화면 기준 각도(라디안, 시계방향 +). ccw=true면 반시계로 그린다.
  function arcArrow(ctx, cx, cy, r, a0, a1, ccw, color, width) {
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, ccw); ctx.stroke();
    var ex = cx + r * Math.cos(a1), ey = cy + r * Math.sin(a1);
    var t = a1 + (ccw ? -Math.PI / 2 : Math.PI / 2); // 진행 방향 접선
    var hx = Math.cos(t), hy = Math.sin(t), s = 7 + (width || 2);
    ctx.beginPath(); ctx.moveTo(ex + hx * s * 0.6, ey + hy * s * 0.6);
    ctx.lineTo(ex - hx * s * 0.5 + hy * s * 0.55, ey - hy * s * 0.5 - hx * s * 0.55);
    ctx.lineTo(ex - hx * s * 0.5 - hy * s * 0.55, ey - hy * s * 0.5 + hx * s * 0.55);
    ctx.closePath(); ctx.fill();
  }
  function label(ctx, txt, x, y, color, size, align, weight) {
    ctx.font = (weight || 700) + ' ' + (size || 12) + 'px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    ctx.fillStyle = color || C.ink; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }
  function pill(ctx, txt, x, y, bg, fg, size) {
    size = size || 12;
    ctx.font = '800 ' + size + 'px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    var w = ctx.measureText(txt).width + 14, h = size + 10;
    ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    label(ctx, txt, x, y + 0.5, fg, size, 'center', 800);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function sun(ctx, x, y, r) {
    var g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
    g.addColorStop(0, C.sunGlow + '0.55)'); g.addColorStop(1, C.sunGlow + '0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
    var g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g2.addColorStop(0, '#fff6c8'); g2.addColorStop(1, C.sun);
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  /* ── 달의 위상: e = 이각(0=삭, 90=상현, 180=망, 270=하현). 북반구 관측 기준 ── */
  function moonPhase(ctx, x, y, r, e, opt) {
    opt = opt || {};
    e = ((e % 360) + 360) % 360;
    ctx.save();
    // 어두운 면 (지구조 — 희미하게)
    ctx.fillStyle = opt.dark || C.moonDark;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    // 밝은 면 다각형
    var ce = Math.cos(e * D2R), waxing = e <= 180, N = 48, i, yy, s;
    ctx.beginPath();
    for (i = 0; i <= N; i++) {           // 가장자리(림)
      yy = -r + 2 * r * i / N; s = Math.sqrt(Math.max(0, r * r - yy * yy));
      ctx.lineTo(x + (waxing ? s : -s), y + yy);
    }
    for (i = N; i >= 0; i--) {           // 명암 경계(터미네이터)
      yy = -r + 2 * r * i / N; s = Math.sqrt(Math.max(0, r * r - yy * yy));
      ctx.lineTo(x + (waxing ? ce * s : -ce * s), y + yy);
    }
    ctx.closePath();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(1, opt.lit || '#e2d6b4');
    ctx.fillStyle = g; ctx.fill();
    // 크레이터 약간
    if (r > 14 && !opt.plain) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(120,110,90,.18)';
      [[-.3, -.2, .18], [.25, .3, .14], [.1, -.45, .1], [-.15, .4, .1], [.4, -.1, .09]].forEach(function (c) {
        ctx.beginPath(); ctx.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, 7); ctx.fill();
      });
    }
    ctx.restore();
    if (opt.ring) { ctx.strokeStyle = opt.ring; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke(); }
  }

  /* ── 위상 이름: 음력 날짜(1~30) ── */
  var SYNODIC = 29.53;
  function lunarDayToE(d) { return ((d - 1) / SYNODIC) * 360; }
  function phaseInfo(d) {
    // 교과서 기준 명칭·관측
    if (d < 1.75 || d >= 29.25) return { key: 'new', name: '삭', sub: '보이지 않아요', day: '음력 1일경', when: '태양과 같은 방향 → 낮에 떠 있어 안 보임' };
    if (d < 5) return { key: 'cres', name: '초승달', sub: '오른쪽이 가늘게 밝음', day: '음력 2~3일경', when: '해 진 직후 서쪽 하늘' };
    if (d < 6.5) return { key: 'cres2', name: '초승달 → 상현달', sub: '점점 커지는 중', day: '음력 4~6일', when: '저녁 남서쪽 하늘' };
    if (d < 9.5) return { key: 'first', name: '상현달', sub: '오른쪽 반원이 밝음', day: '음력 7~8일경', when: '해 진 직후 남쪽 하늘 (자정에 서쪽으로 짐)' };
    if (d < 13.5) return { key: 'wax', name: '상현달 → 보름달', sub: '점점 둥글어지는 중', day: '음력 10~13일', when: '저녁 남동쪽 하늘' };
    if (d < 16.5) return { key: 'full', name: '보름달 (망)', sub: '둥근 원 전체가 밝음', day: '음력 15일경', when: '해 질 때 동쪽에서 떠서 밤새 보임' };
    if (d < 20.5) return { key: 'wan', name: '보름달 → 하현달', sub: '왼쪽부터 줄어드는 중', day: '음력 17~20일', when: '밤늦게 떠서 새벽 남서쪽' };
    if (d < 24.5) return { key: 'last', name: '하현달', sub: '왼쪽 반원이 밝음', day: '음력 22~23일경', when: '자정에 떠서 새벽 남쪽 하늘' };
    if (d < 26) return { key: 'wan2', name: '하현달 → 그믐달', sub: '점점 가늘어지는 중', day: '음력 24~26일', when: '새벽 남동쪽 하늘' };
    return { key: 'old', name: '그믐달', sub: '왼쪽이 가늘게 밝음', day: '음력 27~28일경', when: '해 뜨기 직전 동쪽 하늘' };
  }
  var KEY_PHASES = [
    { key: 'new', name: '삭', d: 1, e: 0 }, { key: 'cres', name: '초승달', d: 3, e: 30 },
    { key: 'first', name: '상현달', d: 8, e: 90 }, { key: 'full', name: '보름달', d: 15, e: 180 },
    { key: 'last', name: '하현달', d: 23, e: 270 }, { key: 'old', name: '그믐달', d: 27.5, e: 325 }
  ];

  /* ── 지구(북극 위에서 본 모습) — T = 관측자 지방시(시) ── */
  function earthTop(ctx, cx, cy, R, T, opt) {
    opt = opt || {};
    var th = (T - 12) * 15 * D2R; // 관측자 위치각(정오=태양 방향=+x), 반시계
    // 햇빛
    if (!opt.noRays) {
      ctx.strokeStyle = 'rgba(255,210,90,.35)'; ctx.lineWidth = 1.5;
      for (var k = -3; k <= 3; k++) { var yy = cy + k * R * 0.32; arrow(ctx, cx + R * 2.6, yy, cx + R * 1.25, yy, 'rgba(255,210,90,.45)', 1.5, 6); }
      label(ctx, '← 햇빛 (태양 쪽)', cx + R * 1.95, cy - R * 1.25, C.sun, 11, 'center');
    }
    // 지구 본체: 낮(오른쪽)/밤(왼쪽)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    ctx.fillStyle = C.earthNight; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.fillStyle = C.earthDay; ctx.fillRect(cx, cy - R, R, 2 * R);
    // 대륙(자전과 함께 회전)
    ctx.translate(cx, cy); ctx.rotate(-th);
    [[0.55, 0.0, 0.32, 0.2], [-0.2, 0.55, 0.28, 0.18], [-0.5, -0.35, 0.22, 0.3], [0.1, -0.6, 0.2, 0.14]].forEach(function (b) {
      ctx.fillStyle = 'rgba(76,175,122,.75)';
      ctx.beginPath(); ctx.ellipse(b[0] * R, b[1] * R, b[2] * R, b[3] * R, b[0] * 3, 0, 7); ctx.fill();
    });
    ctx.restore();
    // 밤쪽 음영 다시(대륙 위)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(5,10,25,.55)'; ctx.fillRect(cx - R, cy - R, R, 2 * R); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    // 북극
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    if (!opt.noPole) label(ctx, '북극', cx, cy + 12, 'rgba(255,255,255,.8)', 10);
    // 자전 방향 화살표 (반시계)
    if (!opt.noSpin) {
      arcArrow(ctx, cx, cy, R + 14, -Math.PI * 0.85, -Math.PI * 0.35, false, C.cyan, 2.5);
      label(ctx, '자전: 서→동 (시계 반대)', cx, cy - R - 30, C.cyan, 11);
    }
    if (opt.noObs) return {};
    // 관측자
    var ox = cx + R * Math.cos(th), oy = cy - R * Math.sin(th);
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(ox, oy, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    if (opt.showLabelTime !== false) {
      var lx = cx + (R + 26) * Math.cos(th), ly = cy - (R + 26) * Math.sin(th);
      pill(ctx, opt.obsLabel || '나', lx, ly, C.accent, '#1b1205', 11);
    }
    return { ox: ox, oy: oy };
  }

  /* ── 하늘 좌표 변환 (적도좌표 → 지평좌표) ── */
  function altAz(dec, H, lat) {
    lat = (lat == null ? LAT : lat) * D2R; dec *= D2R; H *= D2R;
    var sa = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    var alt = Math.asin(Math.max(-1, Math.min(1, sa)));
    var az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat));
    return { alt: alt / D2R, az: (az / D2R + 360) % 360 };
  }

  /* ── 별의 일주운동 (방향별 하늘) ── */
  var VIEWS = {
    N: { A0: 0, a0: 30, name: '북쪽', L: '서', R: '동' },
    E: { A0: 90, a0: 24, name: '동쪽', L: '북', R: '남' },
    S: { A0: 180, a0: 30, name: '남쪽', L: '동', R: '서' },
    W: { A0: 270, a0: 24, name: '서쪽', L: '남', R: '북' }
  };
  var CARD = { 0: '북', 45: '북동', 90: '동', 135: '남동', 180: '남', 225: '남서', 270: '서', 315: '북서' };
  var STARS = (function () {
    var r = rng(11), out = [];
    for (var i = 0; i < 300; i++) out.push({ dec: Math.asin(-0.55 + r() * 1.55) / D2R, H0: r() * 360, m: r() });
    out.push({ dec: 89.2, H0: 30, m: 1.2, polaris: true });
    return out;
  })();
  function projector(view, w, h) {
    var A0 = view.A0 * D2R, a0 = view.a0 * D2R;
    var d = [Math.cos(a0) * Math.cos(A0), Math.cos(a0) * Math.sin(A0), Math.sin(a0)];
    var rr = [Math.cos(A0 + Math.PI / 2), Math.sin(A0 + Math.PI / 2), 0];
    var u = [-Math.sin(a0) * Math.cos(A0), -Math.sin(a0) * Math.sin(A0), Math.cos(a0)];
    var s = (w / 2) / (2 * Math.tan(55 * D2R / 2)), cx = w / 2, cy = h * 0.46;
    return function (alt, az) {
      var a = alt * D2R, z = az * D2R;
      var p = [Math.cos(a) * Math.cos(z), Math.cos(a) * Math.sin(z), Math.sin(a)];
      var c = p[0] * d[0] + p[1] * d[1] + p[2] * d[2];
      var k = 2 / (1 + c);
      return { x: cx + k * (p[0] * rr[0] + p[1] * rr[1]) * s, y: cy - k * (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) * s, c: c };
    };
  }
  function skyTrails(ctx, w, h, dirKey, hours, opt) {
    opt = opt || {};
    var view = VIEWS[dirKey], P = projector(view, w, h);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050914'); g.addColorStop(0.8, '#14224a'); g.addColorStop(1, '#1d2c58');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var polaris = null;
    STARS.forEach(function (st) {
      var bright = st.m > 0.82 || st.polaris;
      if (!bright && opt.sparse) return;
      var prev = null, step = 0.08, n = Math.max(1, Math.ceil(hours / step)), last = null, lastPrev = null;
      ctx.lineWidth = bright ? 1.8 : 1; ctx.lineCap = 'round';
      for (var i = 0; i <= n; i++) {
        var t = hours * i / n, aa = altAz(st.dec, st.H0 + 15 * t), p = P(aa.alt, aa.az);
        var ok = aa.alt > 0 && p.c > 0.05 && p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 20;
        if (ok && prev && hours > 0) {
          var f = i / n;
          ctx.strokeStyle = 'rgba(' + (bright ? '170,215,255,' : '140,170,230,') + (0.15 + 0.75 * f) * (bright ? 1 : 0.7) + ')';
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        if (ok) { lastPrev = prev; last = p; }
        prev = ok ? p : null;
      }
      if (last) {
        ctx.fillStyle = st.polaris ? '#fff7c2' : (bright ? '#ffffff' : 'rgba(210,225,255,.8)');
        ctx.beginPath(); ctx.arc(last.x, last.y, st.polaris ? 3.6 : (bright ? 2 : 1.1), 0, 7); ctx.fill();
        if (bright && !st.polaris && lastPrev && hours > 0.6 && opt.arrows !== false) {
          var dx = last.x - lastPrev.x, dy = last.y - lastPrev.y, L = Math.hypot(dx, dy) || 1;
          arrow(ctx, last.x - dx / L * 10, last.y - dy / L * 10, last.x + dx / L * 4, last.y + dy / L * 4, 'rgba(255,200,90,.9)', 1.6, 6);
        }
        if (st.polaris) polaris = last;
      }
    });
    // 지면
    ctx.beginPath();
    for (var az = view.A0 - 100; az <= view.A0 + 100; az += 2) {
      var p = P(0, (az + 360) % 360); if (az === view.A0 - 100) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(w + 50, h + 50); ctx.lineTo(-50, h + 50); ctx.closePath();
    ctx.fillStyle = '#0a1410'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,150,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 방위 라벨
    if (!opt.noCompass) [-90, -45, 0, 45, 90].forEach(function (dA) {
      var az = (view.A0 + dA + 360) % 360, p = P(0, az);
      if (p.x < 10 || p.x > w - 10) return;
      label(ctx, CARD[az] || '', p.x, Math.min(h - 10, p.y + 14), dA === 0 ? C.accent : C.muted, dA === 0 ? 14 : 11, 'center', 800);
    });
    if (!opt.hideTitle) pill(ctx, view.name + ' 하늘', 56, 20, 'rgba(255,255,255,.12)', C.ink, 12);
    // 북극성 각도 표시
    if (dirKey === 'N' && polaris && opt.angle && hours > 0) {
      label(ctx, '★ 북극성', polaris.x + 34, polaris.y - 12, '#fff7c2', 11);
      var ang = 15 * hours * D2R;
      arcArrow(ctx, polaris.x, polaris.y, 34, -Math.PI / 2, -Math.PI / 2 - Math.min(ang, Math.PI * 1.9), true, C.accent, 2.5);
      label(ctx, (15 * hours).toFixed(0) + '°', polaris.x - 48, polaris.y - 40, C.accent, 13);
    } else if (dirKey === 'N' && polaris) {
      label(ctx, '★ 북극성', polaris.x + 34, polaris.y - 12, '#fff7c2', 11);
    }
    return { polaris: polaris };
  }

  /* ── 원 겹침 넓이 ── */
  function overlap(r1, r2, d) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);
    var a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
    var b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    var c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
    return a + b - c;
  }

  window.EM = {
    C: C, D2R: D2R, setup: setup, fit: fit, rng: rng, starBg: starBg, spaceBg: spaceBg, arrow: arrow, arcArrow: arcArrow,
    label: label, pill: pill, roundRect: roundRect, sun: sun, moonPhase: moonPhase, phaseInfo: phaseInfo,
    lunarDayToE: lunarDayToE, SYNODIC: SYNODIC, KEY_PHASES: KEY_PHASES, earthTop: earthTop, altAz: altAz,
    VIEWS: VIEWS, skyTrails: skyTrails, overlap: overlap
  };
})();
