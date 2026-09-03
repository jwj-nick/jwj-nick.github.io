/* alg_app.js — 대수 단원 앱 공용 엔진 (탭 · 공식 카드 · 단계 공개 · 퀴즈 + 🩹 고치는 곳)
 * 쓰는 법: <script src="lecture.js"></script>(LEC.plane 등) → 본문 → <script src="alg_app.js"></script>
 *   APP.onTab({graph:setupG, ...})   탭이 열릴 때 호출(Canvas lazy init)
 *   APP.current()                   현재 탭 id
 *   cards('id', [[lhs, rhs], ...])   눌러서 펼치는 공식 카드
 *   <button class="stepbtn" data-w="w1"> + <div class="stepwrap" id="w1">  단계 공개
 *   APP.quiz(QUIZ, TABNAME, {perfect:'…'})  QUIZ=[{q,o[4],a,t,e}], t=틀렸을 때 이동할 탭
 */
(function () {
  'use strict';
  var APP = window.APP = {};
  var hooks = {};
  window.go = function (t) { var tab = document.querySelector('.tab[data-t="' + t + '"]'); if (tab) tab.click(); };
  APP.onTab = function (map) { for (var k in map) hooks[k] = map[k]; };
  APP.current = function () { var a = document.querySelector('.tab.active'); return a ? a.dataset.t : null; };
  var tabs = document.getElementById('tabs');
  if (tabs) tabs.addEventListener('click', function (e) {
    var b = e.target.closest('.tab'); if (!b) return;
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    b.classList.add('active'); var pg = document.querySelector('.page[data-p="' + b.dataset.t + '"]'); if (pg) pg.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (hooks[b.dataset.t]) setTimeout(hooks[b.dataset.t], 30);
  });
  window.cards = function (id, list) {
    var el = document.getElementById(id); if (!el) return;
    el.innerHTML = list.map(function (f) { return '<div class="fcell"><span class="ftap">눌러서 보기 ▾</span><div class="flhs">' + f[0] + '</div><div class="frhs">' + f[1] + '</div></div>'; }).join('');
    el.addEventListener('click', function (e) { var c = e.target.closest('.fcell'); if (c) c.classList.toggle('show'); });
    if (window.LEC) LEC.tex(el);
  };
  // #탭id 해시로 열면 그 탭부터 (허브·특강에서 딥링크, 렌더 확인용)
  var h0 = (location.hash || '').slice(1);
  if (h0 && document.querySelector('.tab[data-t="' + h0 + '"]')) setTimeout(function () { window.go(h0); }, 0);
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.stepbtn'); if (!b || !b.dataset.w) return;
    var w = document.getElementById(b.dataset.w); if (!w) return; w.classList.toggle('open');
    b.textContent = w.classList.contains('open') ? '▲ 풀이 접기' : '▶ 풀이 단계별로 보기';
  });

  APP.quiz = function (QUIZ, TABNAME, o) {
    o = o || {}; var qi = 0, qscore = 0, qans = false;
    QUIZ.forEach(function (q) { var correct = q.o[q.a]; for (var i = q.o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = q.o[i]; q.o[i] = q.o[j]; q.o[j] = t; } q.a = q.o.indexOf(correct); });
    function $(id) { return document.getElementById(id); }
    function renderQ() {
      qans = false; var q = QUIZ[qi];
      $('qNum').textContent = '문제 ' + (qi + 1) + ' / ' + QUIZ.length; $('qScore').textContent = qscore; $('qBar').style.width = (qi / QUIZ.length * 100) + '%';
      $('qQ').innerHTML = q.q; var opts = $('qOpts'); opts.innerHTML = '';
      q.o.forEach(function (txt, idx) { var b = document.createElement('button'); b.className = 'qopt'; b.innerHTML = txt; b.addEventListener('click', function () { pick(idx, b); }); opts.appendChild(b); });
      $('qExp').className = 'qexp'; $('qExp').innerHTML = ''; $('qNext').className = 'qnext';
      if (window.LEC) LEC.tex($('qArea'));
    }
    function pick(idx, btn) {
      if (qans) return; qans = true; var q = QUIZ[qi];
      document.querySelectorAll('#qOpts .qopt').forEach(function (b, i) { if (i === q.a) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); else b.classList.add('dim'); });
      var ok = (idx === q.a); if (ok) qscore++; $('qScore').textContent = qscore;
      var ex = $('qExp'); ex.innerHTML = '<div class="et">' + (ok ? '⭕ 정답!' : '❌ 오답') + '</div>' + q.e + ((!ok && q.t && TABNAME && TABNAME[q.t]) ? '<br><button class="fix" onclick="go(\'' + q.t + '\')">🩹 지금 바로 고치기 → ' + TABNAME[q.t] + '</button>' : '');
      ex.className = 'qexp show'; $('qNext').className = 'qnext show'; if (window.LEC) LEC.tex(ex);
    }
    function finish() {
      $('qBar').style.width = '100%'; $('qNum').textContent = '완료 ✓'; var pct = Math.round(qscore / QUIZ.length * 100);
      var msg = pct >= 90 ? (o.perfect || '완벽해요!') : pct >= 70 ? '잘했어요! 틀린 것만 다시 보면 완성.' : '개념 탭을 한 번 더 보고 재도전해요.';
      $('qArea').innerHTML = '<div class="qdone"><div class="big">' + qscore + ' / ' + QUIZ.length + '</div><p style="margin:8px 0 4px;font-size:15px">정답률 ' + pct + '%</p><p style="color:#64748b;font-size:13px;margin-bottom:16px">' + msg + '</p><button class="btn" id="qRestart">↺ 다시 풀기</button></div>';
      $('qRestart').addEventListener('click', restart);
    }
    function restart() {
      qi = 0; qscore = 0;
      $('qArea').innerHTML = '<div class="qq" id="qQ"></div><div class="qopts" id="qOpts"></div><div class="qexp" id="qExp"></div><button class="qnext" id="qNext">다음 문제 →</button>';
      $('qNext').addEventListener('click', next); renderQ();
    }
    function next() { qi++; if (qi >= QUIZ.length) { finish(); return; } renderQ(); }
    $('qNext').addEventListener('click', next); renderQ();
  };
})();
