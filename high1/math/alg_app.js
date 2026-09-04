/* alg_app.js — 고2 수학 단원 앱 공용 엔진 (대수·미적분Ⅰ·확률과 통계 공유)
 * 탭 · 공식 카드 · 단계 공개 · 퀴즈(🩹 고치는 곳 + 🔁 되풀이 + 📬 복습함)
 * 쓰는 법: <script src="lecture.js"></script>(LEC.plane 등) → 본문 → <script src="alg_app.js"></script>
 *   APP.onTab({graph:setupG, ...})   탭이 열릴 때 호출(Canvas lazy init)
 *   APP.current()                   현재 탭 id
 *   cards('id', [[lhs, rhs], ...])   눌러서 펼치는 공식 카드
 *   <button class="stepbtn" data-w="w1"> + <div class="stepwrap" id="w1">  단계 공개
 *   APP.quiz(QUIZ, TABNAME, {perfect:'…', key:'앱id'})  QUIZ=[{q,o[4],a,t,e}], t=틀렸을 때 이동할 탭
 *                                   key 생략 시 파일명(alg_expfn 등)이 복습함 키가 된다.
 *
 * 퀴즈 루프 v2 (00_META/FLOW_V2_INAPP_LOOP.md 이식, 2026-09-05) — 앱 안에서 완결, 결과 전송 UI 없음:
 *   [즉시]   채점 → 해설 + 🩹 지금 바로 고치기(탭 이동). 맞혔어도 "🎲 사실 찍었어"를 누르면 모름으로 처리.
 *   [라운드] 한 바퀴 끝 → 틀린·찍은 문항만 🔁 되풀이 (맞힐 때까지, 최대 3회전). 되풀이는 복습함 사다리를 움직이지 않는다.
 *   [세션]   틀린·찍은 문항 → 📬 복습함(localStorage quizbox:<key>), due=내일.
 *            퀴즈를 열 때 때가 된 문항이 있으면 복습부터 권한다. due 도달 후 정답 → 1·3·7일 사다리 전진, 3연속 정답 → 🏅 정복.
 *            due 전 정답은 사다리를 움직이지 않는다(몰아서 풀어도 거짓 정복이 생기지 않음). 틀리면 사다리 처음으로.
 *   저장 형식 quizbox:<key> = { 문항번호: {w:틀린 횟수, k:연속 정답, due:'YYYY-MM-DD', st:'sch'|'mst', g:찍맞 여부} }
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

  /* ---------- 퀴즈: 즉시 교정 → 되풀이 → 복습함 ---------- */
  var LADDER = [1, 3, 7];   // 틀림→1일 뒤, 1연속→3일, 2연속→7일, 3연속=정복
  function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function fmtDate(s) { if (!s) return ''; if (s <= ymd()) return '오늘'; if (s === plusDays(1)) return '내일'; var p = s.split('-'); return parseInt(p[1], 10) + '/' + parseInt(p[2], 10); }
  function loadBox(key) { try { return JSON.parse(localStorage.getItem('quizbox:' + key) || '{}') || {}; } catch (e) { return {}; } }
  function saveBox(key, box) { try { localStorage.setItem('quizbox:' + key, JSON.stringify(box)); } catch (e) { } }
  function dedupe(a) { var s = [], seen = {}; a.forEach(function (x) { if (!seen[x]) { seen[x] = 1; s.push(x); } }); return s; }
  var CSS = '.qbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:13.5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;line-height:1.5}'
    + '.qbox .sp{flex:1;min-width:150px}.qbox b{font-weight:800}'
    + '.qbox .qbtn{background:var(--accent,#7c3aed);color:#fff;border:none;border-radius:999px;padding:9px 15px;font:inherit;font-weight:800;font-size:13px;cursor:pointer;min-height:44px}'
    + '.fix.guess{background:#f1f5f9;border-color:#cbd5e1;color:#475569}.fix.guess[disabled]{opacity:.75;cursor:default}'
    + '.qnote{margin-top:8px;font-size:12.5px;font-weight:700;color:#0f766e}'
    + '.qdone .qsub{font-size:13px;color:#64748b;margin:4px 0}.qdone .acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}'
    + '.qdone .btn.sub{background:#fff;color:var(--accent,#7c3aed);border:1.5px solid var(--accent,#7c3aed)}';
  (function () { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); })();

  APP.quiz = function (QUIZ, TABNAME, o) {
    o = o || {};
    var KEY = o.key || (location.pathname.split('/').pop() || 'quiz').replace(/\.html?$/, '');
    var N = QUIZ.length, box = loadBox(KEY);
    var mode = 'main', list = [], pos = 0, qscore = 0, qans = false, wrongSet = [], round = 0;
    function $(id) { return document.getElementById(id); }
    function all() { var a = []; for (var i = 0; i < N; i++) a.push(i); return a; }
    function isDue(i) { var b = box[i]; return !!b && b.st === 'sch' && b.due <= ymd(); }
    function dueList() { return all().filter(isDue); }
    function count(st) { var n = 0; for (var k in box) if (box[k].st === st) n++; return n; }
    function nextDue() { var m = null; for (var k in box) if (box[k].st === 'sch' && (!m || box[k].due < m)) m = box[k].due; return m; }
    // 틀림·찍맞 → 사다리 처음(내일)
    function fail(i, guess) { var b = box[i] || { w: 0 }; b.w = (b.w || 0) + (guess ? 0 : 1); b.k = 0; b.due = plusDays(LADDER[0]); b.st = 'sch'; b.g = !!guess; box[i] = b; saveBox(KEY, box); }
    // 때가 된 문항 정답 → 사다리 전진. 때가 안 됐거나 복습함에 없으면 아무것도 안 함
    function pass(i) {
      var b = box[i]; if (!b || b.st !== 'sch' || b.due > ymd()) return '';
      b.k = (b.k || 0) + 1;
      if (b.k >= 3) { b.st = 'mst'; saveBox(KEY, box); return '🏅 3연속 정답 — 이 문항은 정복했어요'; }
      b.due = plusDays(LADDER[b.k]); saveBox(KEY, box); return '📬 복습함 사다리 전진 — ' + LADDER[b.k] + '일 뒤에 다시 물어요';
    }
    function status() { var sch = count('sch'), mst = count('mst'); if (!sch && !mst) return ''; return '📬 복습함 ' + sch + (mst ? ' · 🏅 정복 ' + mst : '') + (sch && nextDue() ? ' · 다음 복습 ' + fmtDate(nextDue()) : ''); }
    function banner() {
      var area = $('qArea'); if (!area) return;
      var el = $('qBox'); if (!el) { el = document.createElement('div'); el.id = 'qBox'; el.className = 'qbox'; area.parentNode.insertBefore(el, area); }
      var d = dueList(), st = status();
      if (!st) { el.style.display = 'none'; el.innerHTML = ''; return; }
      el.style.display = '';
      if (d.length && mode !== 'review') {
        el.innerHTML = '<span class="sp">📬 <b>때가 된 복습 ' + d.length + '문항</b>이 있어요' + (count('mst') ? ' · 🏅 정복 ' + count('mst') : '') + '</span><button class="qbtn" id="qReview">복습부터 풀기 →</button>';
        $('qReview').addEventListener('click', function () { start('review', d); });
      } else el.innerHTML = '<span class="sp">' + st + '</span>';
    }
    function resetArea() {
      $('qArea').innerHTML = '<div class="qq" id="qQ"></div><div class="qopts" id="qOpts"></div><div class="qexp" id="qExp"></div><button class="qnext" id="qNext">다음 문제 →</button>';
      $('qNext').addEventListener('click', next);
    }
    function start(m, items) {
      mode = m; list = items.slice(); pos = 0; qscore = 0; round = (m === 'retry') ? round + 1 : 0; wrongSet = [];
      resetArea(); banner(); renderQ();
    }
    function renderQ() {
      qans = false; var i = list[pos], q = QUIZ[i];
      $('qNum').textContent = mode === 'main' ? '문제 ' + (pos + 1) + ' / ' + list.length : mode === 'retry' ? '🔁 되풀이 ' + round + '회전 · ' + (pos + 1) + ' / ' + list.length : '📬 복습 ' + (pos + 1) + ' / ' + list.length;
      $('qScore').textContent = qscore; $('qBar').style.width = (pos / list.length * 100) + '%';
      $('qQ').innerHTML = q.q; var opts = $('qOpts'); opts.innerHTML = '';
      var order = q.o.map(function (_, k) { return k; });   // 보기는 낼 때마다 섞는다(자리 기억 방지)
      for (var a = order.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)); var t = order[a]; order[a] = order[b]; order[b] = t; }
      order.forEach(function (k) { var btn = document.createElement('button'); btn.className = 'qopt'; btn.innerHTML = q.o[k]; btn.dataset.k = k; btn.addEventListener('click', function () { pick(k, btn); }); opts.appendChild(btn); });
      $('qExp').className = 'qexp'; $('qExp').innerHTML = ''; $('qNext').className = 'qnext';
      if (window.LEC) LEC.tex($('qArea'));
    }
    function pick(k, btn) {
      if (qans) return; qans = true; var i = list[pos], q = QUIZ[i], ok = (k === q.a);
      document.querySelectorAll('#qOpts .qopt').forEach(function (b) { if (+b.dataset.k === q.a) b.classList.add('correct'); else if (b === btn) b.classList.add('wrong'); else b.classList.add('dim'); });
      if (ok) qscore++; $('qScore').textContent = qscore;
      var note = '';
      if (!ok) { wrongSet.push(i); if (mode !== 'retry') { fail(i, false); note = '📬 복습함에 넣었어요 — 내일 다시 물어요'; } }
      else if (mode !== 'retry') note = pass(i);
      var ex = $('qExp');
      ex.innerHTML = '<div class="et">' + (ok ? '⭕ 정답!' : '❌ 오답') + '</div>' + q.e
        + ((!ok && q.t && TABNAME && TABNAME[q.t]) ? '<br><button class="fix" onclick="go(\'' + q.t + '\')">🩹 지금 바로 고치기 → ' + TABNAME[q.t] + '</button>' : '')
        + ((ok && mode !== 'retry') ? '<br><button class="fix guess" id="qGuess">🎲 사실 찍었어 → 복습함에 넣기</button>' : '')
        + (note ? '<div class="qnote">' + note + '</div>' : '');
      ex.className = 'qexp show'; $('qNext').className = 'qnext show'; if (window.LEC) LEC.tex(ex);
      var g = $('qGuess');
      if (g) g.addEventListener('click', function () {
        wrongSet.push(i); fail(i, true);
        var stale = ex.querySelector('.qnote'); if (stale) stale.parentNode.removeChild(stale);   // 직전 "사다리 전진/정복" 안내는 무효
        g.textContent = '📬 복습함에 넣었어요 — 내일 다시 물어요'; g.disabled = true; banner();
      });
      if (!ok || note) banner();
    }
    function next() { pos++; if (pos >= list.length) { finish(); return; } renderQ(); }
    function finish() {
      $('qBar').style.width = '100%'; $('qNum').textContent = '완료 ✓';
      var n = list.length, pct = Math.round(qscore / n * 100), uniq = dedupe(wrongSet), st = status();
      var html = '<div class="qdone"><div class="big">' + qscore + ' / ' + n + '</div>';
      if (mode === 'main') {
        var msg = pct >= 90 ? (o.perfect || '완벽해요!') : pct >= 70 ? '잘했어요! 틀린 것만 다시 보면 완성.' : '개념 탭을 한 번 더 보고 재도전해요.';
        html += '<p style="margin:8px 0 4px;font-size:15px">정답률 ' + pct + '%</p><p style="color:#64748b;font-size:13px;margin-bottom:4px">' + msg + '</p>';
      } else if (mode === 'retry') html += '<p class="qsub">🔁 되풀이 ' + round + '회전 끝' + (uniq.length ? ' — 아직 ' + uniq.length + '문항이 남았어요' : ' — 남은 문항 전부 맞혔어요!') + '</p>';
      else html += '<p class="qsub">📬 복습 ' + n + '문항 끝' + (uniq.length ? ' — ' + uniq.length + '문항은 사다리 처음부터 다시' : ' — 전부 사다리 전진!') + '</p>';
      if (st) html += '<p class="qsub">' + st + '</p>';
      html += '<div class="acts">';
      if (uniq.length && round < 3) html += '<button class="btn" id="qRetry">🔁 틀린 ' + uniq.length + '문항 되풀이</button>';
      else if (uniq.length) html += '<p class="qsub" style="flex-basis:100%">되풀이 3회전을 다 썼어요. 🩹 개념 탭을 보고 와서 내일 복습함에서 다시 만나요.</p>';
      html += '<button class="btn' + (uniq.length && round < 3 ? ' sub' : '') + '" id="qRestart">' + (mode === 'main' ? '↺ 다시 풀기' : '전체 퀴즈 풀기 →') + '</button></div></div>';
      $('qArea').innerHTML = html;
      var r = $('qRetry'); if (r) r.addEventListener('click', function () { start('retry', uniq); });
      $('qRestart').addEventListener('click', function () { start('main', all()); });
      banner();
    }
    start('main', all());
  };
})();
