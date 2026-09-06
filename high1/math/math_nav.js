/* math_nav.js — 고등 수학 앱 공용 왼쪽 사이드바 (고1 공통수학1·2 + 고2 대수·미적분Ⅰ·확률과 통계)
 *
 * 왜 있는가: 단원 앱 안의 탭은 "단원 안"에서만 움직인다. 다른 단원으로 가려면 허브를 거쳐야 했다.
 *   중등 앱(mid1/math1/app1)의 사이드바를 고등 규약(단일 HTML·바닐라·빌드 없음)으로 옮긴 것.
 *
 * 쓰는 법: 앱 맨 아래에 <script src="math_nav.js"></script> 한 줄. 그 외에 앱을 고칠 것은 없다.
 *   파일명(mat1_·mat2_·alg_·cal1_·prob_)으로 과목과 현재 위치를 스스로 판별한다.
 *
 * 규율: 진도 체크·점수·정답률을 표시하지 않는다(흥미 갈래 성공 지표는 "안 시켜도 다시 여는가"이고,
 *   진도율을 눈에 띄게 두는 순간 그 갈래가 죽는다 — subject_hub/CLAUDE.md §2·§6).
 *
 * 폭 1000px 이상: 항상 보이고 본문이 오른쪽으로 비켜난다. 그 미만: 왼쪽 아래 ☰ 버튼으로 열고 닫는다.
 */
(function () {
  'use strict';
  if (window.MATHNAV) return; window.MATHNAV = true;

  var SUBJ = [
    { id: 'mat1', name: '공통수학1', grade: '고1', hub: 'mat1_hub.html', color: '#2563eb',
      units: [
        ['mat1_polynomial', '다항식의 연산과 인수분해'],
        ['mat1_complex', '복소수와 이차방정식'],
        ['mat1_quadratic', '이차함수와 이차방정식·부등식'],
        ['mat1_equation', '여러 가지 방정식과 부등식'],
        ['mat1_counting', '순열과 조합'],
        ['mat1_matrix', '행렬의 뜻과 연산'],
      ],
      sp: [['mat1_sp_quad', '이차함수 완전정복'], ['mat1_sp_abs', '절댓값과 그래프 개형'], ['mat1_sp_matrix', '행렬 첫만남']] },
    { id: 'mat2', name: '공통수학2', grade: '고1', hub: 'mat2_hub.html', color: '#4f46e5',
      units: [
        ['mat2_coordline', '평면좌표와 직선의 방정식'],
        ['mat2_circle', '원의 방정식'],
        ['mat2_move', '도형의 이동'],
        ['mat2_set', '집합'],
        ['mat2_logic', '명제'],
        ['mat2_function', '함수 (합성·역함수)'],
        ['mat2_ratirr', '유리함수와 무리함수'],
      ],
      sp: [['mat2_sp_coord', '좌표로 도형 읽기'], ['mat2_sp_logic', '집합·명제 = 수학의 문법']] },
    { id: 'alg', name: '대수', grade: '고2', hub: 'alg_hub.html', color: '#7c3aed',
      units: [
        ['alg_explog', '지수와 로그'],
        ['alg_expfn', '지수함수'],
        ['alg_logfn', '로그함수'],
        ['alg_trig_def', '일반각·호도법·삼각함수의 정의'],
        ['alg_trig_graph', '삼각함수의 그래프'],
        ['alg_trig_law', '사인법칙·코사인법칙'],
        ['alg_seq', '등차수열과 등비수열'],
        ['alg_sigma', '수열의 합 Σ'],
        ['alg_induction', '귀납적 정의와 수학적 귀납법'],
      ],
      sp: [['alg_sp_log', '지수→로그 완전정복'], ['alg_sp_circle', '삼각함수는 원이다'], ['alg_sp_sigma', '수열과 Σ 리터러시']] },
    { id: 'cal1', name: '미적분Ⅰ', grade: '고2', hub: 'cal1_hub.html', color: '#be185d',
      units: [
        ['cal1_limit', '함수의 극한'],
        ['cal1_continuity', '함수의 연속'],
        ['cal1_derivative', '미분계수와 도함수'],
        ['cal1_tangent', '접선의 방정식과 평균값 정리'],
        ['cal1_graph', '증가·감소와 극대·극소'],
        ['cal1_apply', '도함수의 활용'],
        ['cal1_integral', '부정적분과 정적분'],
        ['cal1_area', '정적분의 활용'],
      ],
      sp: [['cal1_sp_limit', '극한 — 다가감의 언어'], ['cal1_sp_slope', '미분 = 기울기의 완성'], ['cal1_sp_area', '적분 = 넓이 쌓기']] },
    { id: 'prob', name: '확률과 통계', grade: '고2', hub: 'prob_hub.html', color: '#0f766e',
      units: [
        ['prob_permutation', '여러 가지 순열'],
        ['prob_combination', '중복조합과 이항정리'],
        ['prob_probability', '확률의 뜻과 덧셈정리'],
        ['prob_conditional', '조건부확률과 독립'],
        ['prob_distribution', '확률변수와 이산확률분포'],
        ['prob_normal', '연속확률변수와 정규분포'],
        ['prob_estimation', '통계적 추정'],
      ],
      sp: [['prob_sp_choose', '순열·조합 구분'], ['prob_sp_bayes', '조건부확률 직관'], ['prob_sp_normal', '정규분포·표준화 감각']] },
  ];

  var here = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  var cur = null;
  for (var i = 0; i < SUBJ.length; i++) {
    var s = SUBJ[i];
    if (here === s.id + '_hub' || here.indexOf(s.id + '_') === 0) { cur = s; break; }
  }
  // 전체 허브(index.html)처럼 과목이 정해지지 않는 자리에서는 과목 목록만 보여 준다.

  var CSS = ''
    + '.mnav{position:fixed;top:0;left:0;bottom:0;width:252px;z-index:60;background:var(--panel,#fff);'
    + 'border-right:1px solid var(--line,#e2e8f0);overflow-y:auto;padding:18px 12px 48px;'
    + 'transform:translateX(-100%);transition:transform .24s ease;box-shadow:2px 0 14px rgba(0,0,0,.06)}'
    + '.mnav.open{transform:none}'
    + '.mnav-brand{font-weight:800;font-size:15px;padding:2px 10px 4px;color:var(--ink,#1e293b)}'
    + '.mnav-brand small{display:block;font-weight:700;font-size:10.5px;letter-spacing:.09em;color:var(--sub,#64748b);margin-top:2px}'
    + '.mnav a{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:10px;text-decoration:none;'
    + 'color:var(--ink,#1e293b);font-size:13.5px;line-height:1.4;margin-bottom:2px}'
    + '.mnav a:hover{background:var(--accent-bg,#f1f5f9)}'
    + '.mnav a.on{background:var(--accent-bg,#eef2ff);font-weight:800}'
    + '.mnav .n{flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;'
    + 'font-size:11.5px;font-weight:800;background:var(--accent-bg,#eef2ff);color:var(--accent,#4f46e5)}'
    + '.mnav a.on .n{background:var(--accent,#4f46e5);color:#fff}'
    + '.mnav .sep{height:1px;background:var(--line,#e2e8f0);margin:12px 6px}'
    + '.mnav .grp{padding:2px 10px 6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:var(--sub,#64748b)}'
    + '.mnav .sub-a{font-size:13px;padding:8px 10px}'
    + '.mnav em{font-style:normal;font-size:11px;color:var(--sub,#64748b);margin-left:4px}'
    + '.mnav-scrim{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:59;opacity:0;pointer-events:none;transition:opacity .24s}'
    + '.mnav-scrim.open{opacity:1;pointer-events:auto}'
    + '.mnav-btn{position:fixed;left:14px;bottom:14px;z-index:58;min-width:44px;height:44px;padding:0 14px;border-radius:22px;'
    + 'background:var(--accent,#4f46e5);color:#fff;border:0;font-size:14px;font-weight:800;cursor:pointer;'
    + 'box-shadow:0 4px 14px rgba(15,23,42,.28);display:flex;align-items:center;gap:7px}'
    + '@media (min-width:1000px){body{padding-left:252px}.mnav{transform:none}.mnav-scrim{display:none}.mnav-btn{display:none}}';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function link(href, badge, text, on, extra) {
    return '<a class="' + (on ? 'on ' : '') + (extra || '') + '" href="' + href + '">'
      + '<span class="n">' + badge + '</span><span>' + text + '</span></a>';
  }

  function build() {
    var h = '<div class="mnav-brand">고등 수학<small>' + (cur ? cur.grade + ' · ' + cur.name : '전체') + '</small></div>';
    h += link('index.html', '🏠', '수학 허브', here === 'index');
    if (!cur) {
      h += '<div class="sep"></div><div class="grp">교육과정</div>';
      SUBJ.forEach(function (s) { h += link(s.hub, '📗', s.name + ' <em>' + s.grade + '</em>', false); });
      return h;
    }
    h += '<div class="sep"></div><div class="grp">' + cur.name + '</div>';
    h += link(cur.hub, '📚', cur.name + ' 허브', here === cur.id + '_hub');
    cur.units.forEach(function (u, k) { h += link(u[0] + '.html', k + 1, u[1], here === u[0]); });
    if (cur.sp && cur.sp.length) {
      h += '<div class="grp" style="margin-top:8px">관문 특강</div>';
      cur.sp.forEach(function (u) { h += link(u[0] + '.html', '⚡', u[1], here === u[0], 'sub-a'); });
    }
    h += '<div class="sep"></div><div class="grp">다른 과목</div>';
    SUBJ.forEach(function (s) {
      if (s.id === cur.id) return;
      h += link(s.hub, '📗', s.name + ' <em>' + s.grade + '</em>', false, 'sub-a');
    });
    return h;
  }

  function init() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var nav = el('nav', 'mnav', build()); nav.setAttribute('aria-label', '고등 수학 단원 이동');
    var scrim = el('div', 'mnav-scrim');
    var btn = el('button', 'mnav-btn', '<span>☰</span><span>단원</span>');
    btn.setAttribute('aria-label', '단원 목록 열기');
    document.body.appendChild(nav); document.body.appendChild(scrim); document.body.appendChild(btn);
    function close() { nav.classList.remove('open'); scrim.classList.remove('open'); }
    btn.onclick = function () { nav.classList.toggle('open'); scrim.classList.toggle('open'); };
    scrim.onclick = close;
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
