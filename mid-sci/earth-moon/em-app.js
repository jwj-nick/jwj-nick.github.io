/* em-app.js — 라우터 + 칩 내비 + 백지 답안 연습 페이지 */
(function () {
  'use strict';
  var view = document.getElementById('view'), chips = document.getElementById('chips'), CH = window.EMLab.CH, cleanup = null;
  var CK = 'em-check-v1';

  // 백지 답안 체크리스트 (평가기준 문구 → 반드시 들어갈 키워드)
  var CHECK = [
    { t: '① 자전과 겉보기 운동', ch: 'ch1', items: ['자전 방향: 서 → 동', '하루에 한 바퀴 (1시간에 15°)', '천체는 동 → 서로 도는 것처럼 보임', '“겉보기 운동”이라는 말 + 원인은 자전', '예시: 태양이 동쪽에서 떠서 남쪽을 지나 서쪽으로 짐'] },
    { t: '② 별의 일주운동', ch: 'ch2', items: ['북쪽: 북극성 중심, 시계 반대 방향 동심원 (그림)', '동쪽: 오른쪽 위로 비스듬히 (그림)', '남쪽: 지평선과 나란히 동→서 호 (그림)', '서쪽: 오른쪽 아래로 비스듬히 (그림)', '그림마다 화살표 방향 + 방위 표시', '1시간에 15°, 원인은 지구 자전'] },
    { t: '③ 달의 위상 표현', ch: 'ch3', items: ['삭 – 음력 1일경 – 안 보임', '초승달 – 2~3일경 – 오른쪽 가늘게', '상현달 – 7~8일경 – 오른쪽 반원', '보름달(망) – 15일경 – 둥근 원', '하현달 – 22~23일경 – 왼쪽 반원', '그믐달 – 27~28일경 – 왼쪽 가늘게'] },
    { t: '④ 위상변화 원리', ch: 'ch4', items: ['달은 스스로 빛을 못 내고 햇빛을 반사', '달은 지구 주위를 서 → 동으로 공전', '태양·지구·달의 상대적 위치가 변함', '→ 지구에서 보이는 밝은 부분의 모양이 변함', '삭(태양-달-지구) / 망(태양-지구-달) / 반달은 직각', '주기 약 29.5일 + 변화 순서'] },
    { t: '⑤ 일식과 월식', ch: 'ch5', items: ['위치: 일식 태양-달-지구 / 월식 태양-지구-달', '위상: 일식 삭 / 월식 망', '가려지는 부분: 일식 태양의 오른쪽(서) / 월식 달의 왼쪽(동)', '일식 지역: 본그림자 → 개기, 반그림자 → 부분', '월식 지역: 밤인 모든 지역 / 전체 본그림자 → 개기, 일부 → 부분', '그림: 세 천체 일직선 + 본그림자·반그림자 표시'] }
  ];

  function loadCk() { try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch (e) { return {}; } }
  function saveCk(s) { try { localStorage.setItem(CK, JSON.stringify(s)); } catch (e) {} }

  function renderAnswer() {
    var st = loadCk(), html =
      '<div class="sec ans"><div class="eyebrow"><span class="tag">FINAL</span>백지 답안 연습</div><h2 class="title">📝 백지에 직접 써보기</h2>' +
      '<div class="card"><b>연습 방법 (시험과 똑같이)</b><ol style="margin:6px 0 0;padding-left:20px"><li>A4 백지 + 검정 볼펜만 준비.</li><li>아래 <b>“모범 답안 가리기”</b>를 켠 상태에서 ①~⑤를 그림과 함께 직접 써요.</li>' +
      '<li>다 쓰면 가리기를 끄고, 체크리스트에 내 답안에 있는 것만 체크.</li><li>빠진 칸만 해당 장으로 돌아가 다시 보기 → 다음 날 또 한 번.</li></ol></div>' +
      '<div class="row noprint" style="margin:12px 0"><button class="btn on" data-hide>🙈 모범 답안 가리기</button><button class="btn" data-print>🖨 인쇄</button><button class="btn" data-reset>체크 초기화</button></div>';
    CHECK.forEach(function (sec, i) {
      var ch = CH.filter(function (c) { return c.id === sec.ch; })[0], done = sec.items.filter(function (_, k) { return st[i + '-' + k]; }).length;
      html += '<h3>' + sec.t + ' <span class="lede" style="font-size:13px">(' + done + '/' + sec.items.length + ')</span></h3>' +
        '<div class="model" data-model style="filter:blur(6px);user-select:none">' + ch.answer + '</div>' +
        '<ul class="chk">' + sec.items.map(function (it, k) { return '<li><input type="checkbox" data-c="' + i + '-' + k + '"' + (st[i + '-' + k] ? ' checked' : '') + '>' + it + '</li>'; }).join('') + '</ul>' +
        '<a class="btn sm noprint" href="#' + sec.ch + '">' + (i + 1) + '장 다시 보기 →</a>';
    });
    html += '</div>';
    view.innerHTML = html;
    var hidden = true, hb = view.querySelector('[data-hide]');
    hb.onclick = function () { hidden = !hidden; hb.classList.toggle('on', hidden); hb.textContent = hidden ? '🙈 모범 답안 가리기' : '👀 모범 답안 보이는 중'; view.querySelectorAll('[data-model]').forEach(function (m) { m.style.filter = hidden ? 'blur(6px)' : 'none'; m.style.userSelect = hidden ? 'none' : 'auto'; }); };
    view.querySelector('[data-print]').onclick = function () { if (hidden) hb.click(); setTimeout(function () { window.print(); }, 50); };
    view.querySelector('[data-reset]').onclick = function () { saveCk({}); renderAnswer(); };
    view.querySelectorAll('[data-c]').forEach(function (c) { c.onchange = function () { var s = loadCk(); s[c.getAttribute('data-c')] = c.checked; saveCk(s); }; });
  }

  function renderChips(cur) {
    chips.innerHTML = CH.map(function (c) { return '<a class="chip' + (c.id === cur ? ' on' : '') + '" href="#' + c.id + '"><span class="n">' + c.n + '</span>' + c.short + '</a>'; }).join('') +
      '<a class="chip game' + (cur === 'game' ? ' on' : '') + '" href="#game">🎮 게임</a>' +
      '<a class="chip' + (cur === 'answer' ? ' on' : '') + '" href="#answer">📝 백지 답안</a>';
    var on = chips.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    var h = location.hash.replace('#', '') || 'ch1';
    renderChips(h);
    if (h === 'game') cleanup = window.EMGame.render(view);
    else if (h === 'answer') renderAnswer();
    else cleanup = window.EMLab.renderChapter(h, view);
    if (h !== 'game') window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
