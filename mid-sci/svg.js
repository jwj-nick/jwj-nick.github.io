/* svg.js — 네이티브 SVG 시뮬 렌더러 (PhET 약한 개념을 직접 만지게)
 * 공개 API: SciSVG.render(type, mountEl, params)
 *   type='freebody'  자유물체도 — 미는 힘 슬라이더로 알짜힘·운동 상태가 실시간 변화
 *   type='bohr'      보어 원자모형 — "이온 만들기" 토글로 전자 잃음/얻음
 * chem-card 스킬(70_HighSchool)의 파라미터 방식을 이식. 필요할 때 렌더러 추가.
 */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function cssVar(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  /* ─────────────── 자유물체도 (freebody) ─────────────── */
  function freebody(mount, p) {
    p = p || {};
    var weight = p.weight || 6, fric = p.friction || 4, push = (p.pushInit != null ? p.pushInit : fric);
    mount.innerHTML = '';

    var stage = el('svg', { viewBox: '0 0 360 220', width: '100%', role: 'img', 'aria-label': '자유물체도' });
    stage.style.maxWidth = '380px'; stage.style.display = 'block'; stage.style.margin = '4px auto';
    // 화살촉 마커
    var defs = el('defs');
    [['ah-push', '#e0973a'], ['ah-fric', '#c85e8f'], ['ah-grav', '#5b6b8c'], ['ah-norm', '#4fa892'], ['ah-net', '#7b6bd0']].forEach(function (m) {
      var mk = el('marker', { id: m[0], markerWidth: 9, markerHeight: 9, refX: 6, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' });
      mk.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: m[1] }));
      defs.appendChild(mk);
    });
    stage.appendChild(defs);

    var groundY = 158, cx = 180, cy = 120, half = 30;
    stage.appendChild(el('line', { x1: 20, y1: groundY, x2: 340, y2: groundY, stroke: cssVar('--border', '#ddd'), 'stroke-width': 3 }));
    // 바닥 빗금
    for (var gx = 30; gx < 340; gx += 22) stage.appendChild(el('line', { x1: gx, y1: groundY, x2: gx - 10, y2: groundY + 10, stroke: cssVar('--muted', '#aaa'), 'stroke-width': 1.5, opacity: .5 }));
    // 상자
    var box = el('rect', { x: cx - half, y: cy - half, width: half * 2, height: half * 2, rx: 8, fill: cssVar('--u-soft', 'rgba(63,124,192,.18)'), stroke: cssVar('--u', '#3f7cc0'), 'stroke-width': 2.5 });
    stage.appendChild(box);
    var boxlabel = el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 20 }); boxlabel.textContent = '📦'; stage.appendChild(boxlabel);

    function arrow(id, x1, y1, x2, y2, color, label) {
      var g = el('g');
      g.appendChild(el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round', 'marker-end': 'url(#' + id + ')' }));
      var t = el('text', { x: x2, y: y2, fill: color, 'font-size': 11, 'font-weight': 700 });
      // label 위치 보정
      if (label.dx) t.setAttribute('x', x2 + label.dx);
      if (label.dy) t.setAttribute('y', y2 + label.dy);
      t.setAttribute('text-anchor', label.anchor || 'middle');
      t.textContent = label.text;
      g.appendChild(t);
      return g;
    }

    var dyn = el('g'); stage.appendChild(dyn);
    var k = 11; // 힘 → 길이(px)

    function draw() {
      dyn.innerHTML = '';
      var moving, fricShown, net;
      if (push <= fric) { fricShown = push; net = 0; moving = false; }
      else { fricShown = fric; net = push - fric; moving = true; }

      // 중력 (아래)
      dyn.appendChild(arrow('ah-grav', cx, cy, cx, cy + weight * k, '#5b6b8c', { text: '중력 ' + weight, dy: 14, anchor: 'middle' }));
      // 수직항력 (위)
      dyn.appendChild(arrow('ah-norm', cx, cy, cx, cy - weight * k, '#4fa892', { text: '수직항력 ' + weight, dy: -6, anchor: 'middle' }));
      // 미는 힘 (오른쪽)
      if (push > 0) dyn.appendChild(arrow('ah-push', cx + half, cy, cx + half + push * k, cy, '#e0973a', { text: '미는 힘 ' + push, dy: -8, anchor: 'middle' }));
      // 마찰력 (왼쪽)
      if (fricShown > 0) dyn.appendChild(arrow('ah-fric', cx - half, cy, cx - half - fricShown * k, cy, '#c85e8f', { text: '마찰 ' + fricShown, dy: 18, anchor: 'middle' }));

      readNet.innerHTML = '수평 알짜힘 = ' + push + ' − ' + fricShown + ' = <b class="big">' + net + '</b>';
      var st, cls;
      if (push < fric) { st = '정지 — 정지 마찰이 미는 힘을 그대로 상쇄해요.'; cls = 'st-stop'; }
      else if (push === fric) { st = '막 움직이려는 순간 — 조금만 더 밀면 움직여요.'; cls = 'st-edge'; }
      else { st = '가속! 오른쪽으로 점점 빨라져요.'; cls = 'st-go'; }
      readState.textContent = st;
      readState.className = 'fb-state ' + cls;
      box.setAttribute('stroke', moving ? '#e0973a' : cssVar('--u', '#3f7cc0'));
    }

    // 컨트롤
    var wrap = document.createElement('div');
    var lab = document.createElement('label'); lab.className = 'fb-lab';
    lab.innerHTML = '<span>미는 힘</span><span class="fb-val">' + push + ' N</span>';
    var slider = document.createElement('input');
    slider.type = 'range'; slider.min = 0; slider.max = fric * 2; slider.step = 1; slider.value = push;
    slider.setAttribute('aria-label', '미는 힘');
    var readNet = document.createElement('div'); readNet.className = 'fb-read';
    var readState = document.createElement('div'); readState.className = 'fb-state';
    slider.addEventListener('input', function () {
      push = +slider.value; lab.querySelector('.fb-val').textContent = push + ' N'; draw();
    });

    mount.appendChild(stage);
    wrap.appendChild(lab); wrap.appendChild(slider); wrap.appendChild(readNet); wrap.appendChild(readState);
    mount.appendChild(wrap);
    draw();
  }

  /* ─────────────── 보어 원자모형 (bohr) ─────────────── */
  function bohr(mount, p) {
    p = p || {};
    var atomShells = p.shells || [2, 8, 1];
    var ionShells = p.ionShells || null;
    var isIon = false;
    mount.innerHTML = '';

    var stage = el('svg', { viewBox: '0 0 300 300', width: '100%', role: 'img', 'aria-label': p.name + ' 원자모형' });
    stage.style.maxWidth = '320px'; stage.style.display = 'block'; stage.style.margin = '4px auto';
    var cx = 150, cy = 150;

    function draw() {
      stage.innerHTML = '';
      var shells = isIon && ionShells ? ionShells : atomShells;
      var rBase = 40, rStep = 34;
      // 껍질 원
      for (var i = 0; i < shells.length; i++) {
        stage.appendChild(el('circle', { cx: cx, cy: cy, r: rBase + i * rStep, fill: 'none', stroke: cssVar('--border', '#e5d8e0'), 'stroke-width': 1.5 }));
      }
      // 핵
      stage.appendChild(el('circle', { cx: cx, cy: cy, r: 26, fill: cssVar('--u', '#2fa38f'), opacity: .9 }));
      var sym = el('text', { x: cx, y: cy - 1, 'text-anchor': 'middle', fill: '#fff', 'font-size': 17, 'font-weight': 800 });
      sym.textContent = isIon && p.ionSymbol ? p.ionSymbol : p.symbol; stage.appendChild(sym);
      var zt = el('text', { x: cx, y: cy + 13, 'text-anchor': 'middle', fill: '#fff', 'font-size': 9, opacity: .9 });
      zt.textContent = '+' + p.Z; stage.appendChild(zt);
      // 전자
      var last = shells.length - 1;
      for (var s = 0; s < shells.length; s++) {
        var count = shells[s], r = rBase + s * rStep, isOuter = (s === last);
        for (var e = 0; e < count; e++) {
          var ang = (Math.PI * 2 * e / count) - Math.PI / 2;
          var ex = cx + r * Math.cos(ang), ey = cy + r * Math.sin(ang);
          var col = (isOuter && !isIon) ? '#e0973a' : cssVar('--muted', '#8b8092');
          stage.appendChild(el('circle', { cx: ex, cy: ey, r: 6, fill: col, stroke: '#fff', 'stroke-width': 1.5 }));
        }
      }
      // 판독
      var totalE = shells.reduce(function (a, b) { return a + b; }, 0);
      var charge = p.Z - totalE;
      var chargeStr = charge > 0 ? '+' + charge : (charge < 0 ? '' + charge : '0 (중성)');
      readE.innerHTML = '양성자 <b>' + p.Z + '</b> · 전자 <b>' + totalE + '</b> · 전하 <b class="big">' + chargeStr + '</b>';
      if (isIon) readNote.textContent = p.ionProcess || (p.symbol + '이(가) 전자를 ' + Math.abs(p.ionCharge) + '개 ' + (p.ionCharge > 0 ? '잃어' : '얻어') + ' ' + (p.ionSymbol || '이온') + '이 됐어요.');
      else readNote.textContent = '노란 전자가 최외각(원자가) 전자예요. 이것을 잃거나 얻어 이온이 돼요.';
      btn.textContent = isIon ? '↩ 원자로 되돌리기' : '⚡ 이온 만들기';
    }

    var wrap = document.createElement('div');
    var readE = document.createElement('div'); readE.className = 'fb-read';
    var readNote = document.createElement('div'); readNote.className = 'fb-state';
    var btn = document.createElement('button'); btn.className = 'fb-btn';
    btn.addEventListener('click', function () { if (!ionShells) return; isIon = !isIon; draw(); });
    if (!ionShells) btn.style.display = 'none';

    mount.appendChild(stage);
    wrap.appendChild(readE); wrap.appendChild(readNote); wrap.appendChild(btn);
    mount.appendChild(wrap);
    draw();
  }

  window.SciSVG = {
    render: function (type, mount, params) {
      if (type === 'freebody') return freebody(mount, params);
      if (type === 'bohr') return bohr(mount, params);
      mount.innerHTML = '<p class="muted">알 수 없는 시뮬: ' + type + '</p>';
    }
  };
})();
