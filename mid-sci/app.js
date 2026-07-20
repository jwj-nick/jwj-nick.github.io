/* app.js — 중학 과학 실험실 렌더 엔진 (무빌드 바닐라)
 * 데이터=window.SCI (content.js) · 네이티브 시뮬=window.SciSVG (svg.js)
 * 해시 라우팅: #/g/<gradeId> 랜딩 · #/c/<conceptId> 개념 상세
 */
(function () {
  'use strict';
  var SCI = window.SCI, app = document.getElementById('app');

  /* ── 테마 ── */
  function initTheme() {
    var t; try { t = localStorage.getItem('scitheme'); } catch (e) {}
    if (t !== 'dark' && t !== 'light') t = (matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  }
  function bindToggle() {
    var btn = document.getElementById('ttoggle'); if (!btn) return;
    function paint() { btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '🌙'; }
    paint();
    btn.onclick = function () {
      var c = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', c);
      try { localStorage.setItem('scitheme', c); } catch (e) {}
      paint();
    };
  }

  /* ── 인덱스 ── */
  var byId = {}, gradeOf = {};
  SCI.grades.forEach(function (g) {
    g.areas.forEach(function (a) {
      a.concepts.forEach(function (c) { c._area = a.area; byId[c.id] = c; gradeOf[c.id] = g; });
    });
  });
  function setGradeColor(g) {
    var r = document.documentElement.style;
    r.setProperty('--u', g.color); r.setProperty('--u-2', g.color2);
  }
  function badgeFor(c) {
    if (c.native && c.sim.type === 'phet') return '<span class="sb-mode ours">🧪+🔬 하이브리드</span>';
    if (c.sim.type === 'phet') return '<span class="sb-mode phet">🧪 PhET</span>';
    if (c.sim.type === 'native') return '<span class="sb-mode ours">🔬 직접</span>';
    return '<span class="sb-mode none">🎬 영상</span>';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── 랜딩 ── */
  function renderLanding(gid) {
    var g = SCI.grades.filter(function (x) { return x.id === gid; })[0] || SCI.grades[0];
    setGradeColor(g);
    var tabs = SCI.grades.map(function (x) {
      return '<a class="gtab' + (x.id === g.id ? ' active' : '') + '" href="#/g/' + x.id + '" style="--gc:' + x.color + '">' + x.label + '</a>';
    }).join('');
    var areas = g.areas.map(function (a) {
      var cards = a.concepts.map(function (c) {
        return '<a class="scard" href="#/c/' + c.id + '">' +
          '<div class="sc-top"><span class="sc-t">' + esc(c.title) + '</span>' + badgeFor(c) + '</div>' +
          '<div class="sc-hook">' + c.hook + '</div>' +
          '<span class="sc-go">만져보러 가기 →</span></a>';
      }).join('');
      return '<section class="area"><h2 class="area-h">' + esc(a.area) + '</h2><div class="scards">' + cards + '</div></section>';
    }).join('');
    app.innerHTML =
      '<div class="hub-hero"><h1>' + esc(SCI.meta.title) + '</h1><p class="lede">' + SCI.meta.lede + '</p></div>' +
      '<div class="gtabs">' + tabs + '</div>' +
      areas +
      '<p class="lede tip-line">💡 각 카드는 <b>실생활 질문 → 만져보기 → 예측·확인 → 문제 착지</b> 순서예요. 채점 없어요. 마지막에 “왜 그럴까” 한 문장만!</p>' +
      '<div class="foot">중학 과학 1·2·3 · 흥미는 여기서, 점수는 문제로 → 시뮬은 직관을 잡아줄 뿐이에요</div>';
    document.title = SCI.meta.title + ' · ' + g.label;
    window.scrollTo(0, 0);
  }

  /* ── 시뮬 카드 ── */
  function phetCard(sim) {
    var run = 'https://phet.colorado.edu/sims/html/' + sim.slug + '/latest/' + sim.slug + '_all.html?locale=ko';
    var info = 'https://phet.colorado.edu/ko/simulations/' + sim.slug;
    var disc = (sim.disc || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('');
    return '<div class="phet"><div class="ph-top"><h3>🧪 만져보기</h3><span class="fit">' + esc(sim.fit || 'PhET') + '</span></div>' +
      '<p class="aim">' + esc(sim.aim || '') + '</p>' +
      (disc ? '<ul class="disc">' + disc + '</ul>' : '') +
      '<div class="btns"><button class="ph-btn primary" data-phet-toggle>여기서 열기</button>' +
      '<a class="ph-btn" href="' + run + '" target="_blank" rel="noopener">새 창에서 열기 ↗</a></div>' +
      '<div class="ph-frame" data-phet-frame data-src="' + run + '"></div>' +
      '<p class="src">시뮬 출처: PhET Interactive Simulations, Univ. of Colorado Boulder · <a href="' + info + '" target="_blank" rel="noopener">교사 자료·활동지</a></p></div>';
  }
  function nativeCard(sim) {
    return '<div class="phet ours"><div class="ph-top"><h3>🔬 직접 만들어 보기</h3><span class="fit">우리 실험실</span></div>' +
      '<p class="aim">슬라이더·버튼을 움직이면 그림이 바로 반응해요.</p>' +
      '<div class="ours-stage" data-sim-native></div></div>';
  }
  function noneCard(sim) {
    var links = (sim.links || []).map(function (l) {
      return '<a class="ph-btn" href="' + l.url + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>';
    }).join('');
    return '<div class="phet none"><div class="ph-top"><h3>🎬 이건 영상·그림으로</h3><span class="fit">시뮬 없음</span></div>' +
      '<p class="aim">' + sim.why + '</p>' +
      (links ? '<div class="btns">' + links + '</div>' : '') + '</div>';
  }
  function simCard(sim) {
    if (sim.type === 'phet') return phetCard(sim);
    if (sim.type === 'none') return noneCard(sim);
    return '';
  }

  /* ── 예측/확인 블록 ── */
  function qaBlock(list, kind) {
    return list.map(function (qa, i) {
      return '<div class="qa"><div class="qa-q"><span class="qa-n">' + (i + 1) + '</span>' + esc(qa.q) + '</div>' +
        '<button class="reveal-btn" data-reveal>' + (kind === 'predict' ? '내 예측과 비교' : '정답 확인') + '</button>' +
        '<div class="qa-a">' + esc(qa.a) + '</div></div>';
    }).join('');
  }

  /* ── 개념 상세 ── */
  function renderConcept(id) {
    var c = byId[id]; if (!c) return renderLanding('m1');
    var g = gradeOf[id]; setGradeColor(g);
    var draw = (c.draw || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('');
    app.innerHTML =
      '<a class="back" href="#/g/' + g.id + '">← ' + g.label + ' 과학 목록</a>' +
      '<div class="hero"><div class="h-no">' + g.label + ' · ' + esc(c._area) + '</div><h1>' + esc(c.title) + '</h1></div>' +
      '<section><div class="eyebrow"><span class="n">?</span>이런 적 있죠</div><div class="hook-card">' + c.hook + '</div></section>' +
      '<section><div class="eyebrow"><span class="n">1</span>개념 한 입</div><div class="card idea">' + c.idea + '</div></section>' +
      '<section><div class="eyebrow"><span class="n">2</span>직접 만져보기</div>' + simCard(c.sim) + (c.native ? nativeCard() : '') + '</section>' +
      '<section><div class="eyebrow"><span class="n">3</span>예측 → 확인 게임</div>' +
      '<p class="muted small">만지기 <b>전에</b> 답을 먼저 말해보고, 버튼으로 맞혀봐요. 틀려도 좋아요 — “왜지?”가 시작이에요.</p>' + qaBlock(c.predict, 'predict') + '</section>' +
      '<section><div class="eyebrow"><span class="n">4</span>확인 질문 <span class="land">문제 착지</span></div>' +
      '<p class="muted small">시뮬은 직관, 점수는 문제로. 아래를 스스로 답해보면 개념이 “내 것”이 돼요.</p>' + qaBlock(c.confirm, 'confirm') + '</section>' +
      (draw ? '<section><div class="eyebrow"><span class="n">✎</span>시험에서 그림 그릴 때</div><div class="card draw"><ul>' + draw + '</ul></div></section>' : '') +
      '<div class="examhook"><span class="eh-t">한 줄 암기</span>' + esc(c.examHook) + '</div>' +
      '<div class="foot"><a class="back" href="#/g/' + g.id + '">← 다른 개념도 만져보기</a></div>';
    document.title = c.title + ' · ' + SCI.meta.title;
    window.scrollTo(0, 0);

    // 네이티브 시뮬 마운트 (하이브리드: PhET 카드와 함께)
    if (c.native) {
      var mnt = app.querySelector('[data-sim-native]');
      if (mnt && window.SciSVG) window.SciSVG.render(c.native.type, mnt, c.native.params || {});
    }
    // PhET iframe 토글
    var tog = app.querySelector('[data-phet-toggle]');
    if (tog) tog.addEventListener('click', function () {
      var fr = app.querySelector('[data-phet-frame]');
      if (!fr) return;
      if (fr.classList.contains('on')) { fr.classList.remove('on'); fr.innerHTML = ''; tog.textContent = '여기서 열기'; }
      else { fr.innerHTML = '<iframe src="' + fr.getAttribute('data-src') + '" allowfullscreen loading="lazy" title="PhET 시뮬"></iframe>'; fr.classList.add('on'); tog.textContent = '접기'; }
    });
    // 리빌 (원래 라벨 복원)
    app.querySelectorAll('[data-reveal]').forEach(function (b) {
      var orig = b.textContent;
      b.addEventListener('click', function () {
        var a = b.parentNode.querySelector('.qa-a');
        if (!a) return;
        a.classList.toggle('show');
        b.textContent = a.classList.contains('show') ? '접기' : orig;
      });
    });
  }

  /* ── 라우터 ── */
  function route() {
    var h = location.hash.replace(/^#/, '');
    var m;
    if (m = h.match(/^\/c\/(.+)$/)) return renderConcept(m[1]);
    if (m = h.match(/^\/g\/(\w+)$/)) return renderLanding(m[1]);
    return renderLanding('m1');
  }

  initTheme();
  window.addEventListener('DOMContentLoaded', function () { bindToggle(); route(); });
  window.addEventListener('hashchange', route);
  // DOMContentLoaded 이미 지났으면 즉시
  if (document.readyState !== 'loading') { bindToggle(); route(); }
})();
