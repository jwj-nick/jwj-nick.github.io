/* em-app.js — 스터디 앱 v2 라우터 · 테마 · 백지 답안
 * #u1~#u5 단원 | #quiz 목록 | #q/<id> 단일 문제 | #run/<u>/<k> 단원 퀴즈 연속 | #runend/<u> | #answer
 */
(function () {
  'use strict';
  var view = document.getElementById('view'), chips = document.getElementById('chips'), UN = window.EMU.UNITS, Q = window.EMQ, cleanup = null, CK = 'em-check-v1';

  /* 테마 */
  function theme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  var tb = document.getElementById('ttog');
  function paint() { tb.textContent = theme() === 'light' ? '🌙' : '☀️'; tb.setAttribute('aria-label', theme() === 'light' ? '어두운 화면으로' : '밝은 화면으로'); }
  tb.onclick = function () { var t = theme() === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('em-theme', t); } catch (e) {} paint(); };
  paint();

  /* 백지 답안 */
  var CHECK = [
    { t: '① 자전과 겉보기 운동', u: 'u1', items: ['자전 방향: 서 → 동', '하루에 한 바퀴 (1시간에 15°)', '천체는 동 → 서로 도는 것처럼 보임', '“겉보기 운동”이라는 말 + 원인은 자전', '예: 태양이 동쪽에서 떠서 남쪽을 지나 서쪽으로 짐'] },
    { t: '② 별의 일주운동', u: 'u2', items: ['북쪽: 북극성 중심, 시계 반대 방향 (그림)', '동쪽: 오른쪽 위로 비스듬히 (그림)', '남쪽: 지평선과 나란히 동→서 (그림)', '서쪽: 오른쪽 아래로 비스듬히 (그림)', '화살표 방향 + 방위 표시', '1시간에 15°, 원인은 지구 자전'] },
    { t: '③ 달의 위상 표현', u: 'u3', items: ['삭 – 1일경 – 안 보임', '초승달 – 2~3일경 – 오른쪽 가늘게', '상현달 – 7~8일경 – 오른쪽 반원', '보름달(망) – 15일경 – 둥근 원', '하현달 – 22~23일경 – 왼쪽 반원', '그믐달 – 27~28일경 – 왼쪽 가늘게'] },
    { t: '④ 위상변화 원리', u: 'u4', items: ['달은 스스로 빛을 못 내고 햇빛을 반사', '달은 지구 주위를 서 → 동으로 공전', '태양·지구·달의 상대적 위치가 변함', '→ 보이는 밝은 부분의 모양이 변함', '삭(태양-달-지구) / 망(태양-지구-달) / 반달은 직각', '주기 약 29.5일 + 변화 순서'] },
    { t: '⑤ 일식과 월식', u: 'u5', items: ['위치: 일식 태양-달-지구 / 월식 태양-지구-달', '위상: 일식 삭 / 월식 망', '가려지는 부분: 일식 태양의 오른쪽(서) / 월식 달의 왼쪽(동)', '일식 지역: 본그림자 → 개기, 반그림자 → 부분', '월식 지역: 밤인 모든 지역 / 전체 본그림자 → 개기, 일부 → 부분', '그림: 세 천체 일직선 + 본그림자·반그림자'] }
  ];
  function loadCk() { try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch (e) { return {}; } }
  function saveCk(s) { try { localStorage.setItem(CK, JSON.stringify(s)); } catch (e) {} }
  function renderAnswer() {
    var st = loadCk(), html = '<div class="sec ans"><div class="eyebrow"><span class="tag">FINAL</span>백지 답안 연습</div><h2 class="title">✍ 백지에 직접 써보기</h2>' +
      '<div class="card"><b>시험처럼 연습하기</b><ol style="margin:6px 0 0;padding-left:20px"><li>A4 백지 + 검정 볼펜만.</li><li>모범 답안을 가린 채 ①~⑤를 그림과 함께 써요.</li><li>다 쓰면 가리기를 풀고, 내 답안에 있는 것만 체크.</li><li>빠진 칸은 해당 단원 시뮬로 → 다음 날 또 한 번.</li></ol></div>' +
      '<div class="row noprint" style="margin:12px 0"><button class="btn on" data-hide>🙈 모범 답안 가리기</button><button class="btn" data-print>🖨 인쇄</button><button class="btn" data-reset>체크 초기화</button></div>';
    CHECK.forEach(function (sec, i) {
      var u = UN.filter(function (x) { return x.id === sec.u; })[0], done = sec.items.filter(function (_, k) { return st[i + '-' + k]; }).length;
      html += '<h3>' + sec.t + ' <span class="lede" style="font-size:13px">(' + done + '/' + sec.items.length + ')</span></h3>' +
        '<div class="model" data-model style="filter:blur(6px);user-select:none">' + u.answer + '</div>' +
        '<ul class="chk">' + sec.items.map(function (it, k) { return '<li><input type="checkbox" data-c="' + i + '-' + k + '"' + (st[i + '-' + k] ? ' checked' : '') + '>' + it + '</li>'; }).join('') + '</ul>' +
        '<a class="btn sm noprint" href="#' + sec.u + '">📺 ' + u.short + ' 시뮬 다시 보기</a>';
    });
    view.innerHTML = html + '</div>';
    var hidden = true, hb = view.querySelector('[data-hide]');
    hb.onclick = function () { hidden = !hidden; hb.classList.toggle('on', hidden); hb.textContent = hidden ? '🙈 모범 답안 가리기' : '👀 모범 답안 보이는 중'; view.querySelectorAll('[data-model]').forEach(function (m) { m.style.filter = hidden ? 'blur(6px)' : 'none'; m.style.userSelect = hidden ? 'none' : 'auto'; }); };
    view.querySelector('[data-print]').onclick = function () { if (hidden) hb.click(); setTimeout(function () { window.print(); }, 50); };
    view.querySelector('[data-reset]').onclick = function () { saveCk({}); renderAnswer(); };
    view.querySelectorAll('[data-c]').forEach(function (c) { c.onchange = function () { var s = loadCk(); s[c.getAttribute('data-c')] = c.checked; saveCk(s); }; });
    window.scrollTo(0, 0);
  }

  function renderChips(cur) {
    chips.innerHTML = UN.map(function (u) { return '<a class="chip' + (u.id === cur ? ' on' : '') + '" href="#' + u.id + '"><span class="n">' + u.n + '</span>' + u.short + '</a>'; }).join('') +
      '<a class="chip game' + (cur === 'quiz' ? ' on' : '') + '" href="#quiz">📝 퀴즈</a>' +
      '<a class="chip' + (cur === 'answer' ? ' on' : '') + '" href="#answer">✍ 백지 답안</a>';
    var on = chips.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    var h = location.hash.replace('#', '') || 'u1', m;
    if ((m = h.match(/^run\/(u\d)\/(\d+)$/))) { renderChips('quiz'); var qs = Q.byUnit(m[1]), k = +m[2]; if (qs[k]) cleanup = Q.renderQ(qs[k].id, view, { u: m[1], k: k }); else Q.renderRunEnd(m[1], view); return; }
    if ((m = h.match(/^runend\/(u\d)$/))) { renderChips('quiz'); Q.renderRunEnd(m[1], view); return; }
    if ((m = h.match(/^q\/(.+)$/))) { renderChips('quiz'); cleanup = Q.renderQ(m[1], view, null); return; }
    if (h === 'quiz') { renderChips('quiz'); Q.renderList(view); window.scrollTo(0, 0); return; }
    if (h === 'answer') { renderChips('answer'); renderAnswer(); return; }
    // 예전 링크 호환 (#ch1, #game)
    if ((m = h.match(/^ch(\d)$/))) h = 'u' + m[1];
    if (h === 'game') { location.hash = '#quiz'; return; }
    renderChips(h); cleanup = window.EMU.renderUnit(h, view); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
