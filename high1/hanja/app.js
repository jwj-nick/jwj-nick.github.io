// 한자 앱 엔진 v2 — 급수 사다리. 규칙의 정본은 00_META/design_hanja_v2.md (v1 규칙 계승: design_hanja_v1.md)
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;
  var KEY = CFG.ns + ".v2";
  var V1_KEY = (CFG.v1ns || CFG.ns) + ".v1";
  var DAILY_MAX = 10;
  var NEW_MAX = 5;

  var LEVELS = [];        // ready 급수만, order순
  var MANIFEST_ALL = [];  // 전체 15급수(표시용, planned 포함)

  // ---------- 데이터 로드 ----------
  function loadJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("fetch fail: " + url);
      return r.json();
    });
  }
  function loadAllData() {
    return loadJSON("data/manifest.json").then(function (manifest) {
      MANIFEST_ALL = manifest.levels;
      var ready = manifest.levels.filter(function (l) { return l.status === "ready"; });
      return Promise.all(ready.map(function (l) {
        return loadJSON("data/levels/" + l.slug + ".json").then(function (d) {
          var byCh = {}, wordByW = {};
          d.chars.forEach(function (c) { byCh[c.ch] = c; });
          d.words.forEach(function (w) { wordByW[w.w] = w; });
          return Object.assign({}, l, { chars: d.chars, words: d.words, byCh: byCh, wordByW: wordByW });
        });
      }));
    }).then(function (levels) {
      LEVELS = levels;
    });
  }

  // ---------- 상태 ----------
  function freshState() {
    return { v: 2, levels: {}, days: {}, lastDone: null, streakDays: 0 };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) return s;
    } catch (e) {}
    return freshState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function levelState(name) {
    if (!S.levels[name]) S.levels[name] = { p: {}, newIdx: 0, examPassed: false, lastExamAttempt: null };
    return S.levels[name];
  }
  function migrateV1() {
    if (Object.keys(S.levels).length > 0) return; // 이미 v2 데이터 있음 — 마이그레이션 스킵
    try {
      var v1 = JSON.parse(localStorage.getItem(V1_KEY));
      if (!v1 || !v1.p) return;
      var ls = levelState("8급");
      ls.p = v1.p; ls.newIdx = v1.newIdx || 0;
      S.days = v1.days || {}; S.lastDone = v1.lastDone || null; S.streakDays = v1.streakDays || 0;
      save();
    } catch (e) {}
  }

  var S = load();

  // ---------- 날짜 ----------
  function fmt(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function todayStr() { return fmt(new Date()); }
  function addDays(dateStr, n) {
    var p = dateStr.split("-");
    return fmt(new Date(+p[0], +p[1] - 1, +p[2] + n));
  }

  // ---------- 유틸 ----------
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function $(id) { return document.getElementById(id); }
  var VIEWS = ["view-home", "view-intro", "view-quiz", "view-result", "view-table"];
  function show(viewId) {
    VIEWS.forEach(function (v) { $(v).classList.toggle("hidden", v !== viewId); });
    window.scrollTo(0, 0);
  }
  // 브라우저 뒤로가기 대응 — SPA인데 history API가 없어서 앱 안에서 화면을 아무리 옮겨도
  // 히스토리엔 최초 진입 1건만 쌓여, 뒤로가기를 누르면 앱을 벗어나 버렸다(2026-08-23 Nick 신고).
  // 고침: "화면 이동"으로 볼 만한 지점(홈↔표, 학습/시험 시작)마다 히스토리를 쌓고, popstate에서
  // 그 지점을 재구성해서 보여준다. 표 안의 문제 하나하나·소개 카드 한 장 한 장까지는 안 쌓는다
  // (그렇게 하면 뒤로가기를 문제 수만큼 눌러야 앱을 벗어나게 되어 오히려 불편해진다) — 세션(학습/시험)
  // 도중 뒤로가기는 "세션 중단하고 홈으로"로 처리한다.
  function pushView(kind, extra) {
    history.pushState(Object.assign({ kind: kind }, extra || {}), "", location.href);
  }
  function huneumOf(c) { return c.hun + " " + c.eum; }

  // ---------- 급수 진행 판정 ----------
  function levelComplete(lvl) {
    var ls = levelState(lvl.name);
    if (ls.newIdx < lvl.chars.length) return false;
    for (var i = 0; i < lvl.chars.length; i++) {
      var rec = ls.p[lvl.chars[i].ch];
      if (!rec || !rec.g) return false;
    }
    return !!ls.examPassed;
  }
  function levelFullyGraduated(lvl) { // 전원 졸업했지만 시험 전일 수 있음
    var ls = levelState(lvl.name);
    if (ls.newIdx < lvl.chars.length) return false;
    for (var i = 0; i < lvl.chars.length; i++) {
      var rec = ls.p[lvl.chars[i].ch];
      if (!rec || !rec.g) return false;
    }
    return true;
  }
  function currentLevelIdx() {
    for (var i = 0; i < LEVELS.length; i++) if (!levelComplete(LEVELS[i])) return i;
    return -1; // 로드된 급수 전부 완료
  }

  // ---------- 통계 ----------
  function counts(lvl) {
    var ls = levelState(lvl.name), grad = 0, learn = 0;
    Object.keys(ls.p).forEach(function (ch) { if (ls.p[ch].g) grad++; else learn++; });
    return { grad: grad, learn: learn };
  }
  function dueList(lvl, t) {
    var ls = levelState(lvl.name);
    return Object.keys(ls.p).filter(function (ch) { return !ls.p[ch].g && ls.p[ch].due <= t; })
      .sort(function (a, b) { return ls.p[a].due < ls.p[b].due ? -1 : 1; });
  }

  // ---------- 문제 생성 ----------
  function optsType1(lvl, c) {
    var answer = huneumOf(c);
    var others = lvl.chars.filter(function (x) { return x.ch !== c.ch && huneumOf(x) !== answer; });
    var sameEum = shuffle(others.filter(function (x) { return x.eum === c.eum; }));
    var rest = shuffle(others), picked = [];
    if (sameEum.length > 0) picked.push(huneumOf(sameEum[0]));
    for (var i = 0; i < rest.length && picked.length < 3; i++) {
      var h = huneumOf(rest[i]);
      if (h !== answer && picked.indexOf(h) < 0) picked.push(h);
    }
    return shuffle(picked.concat([answer]));
  }
  function optsType2(lvl, w) {
    var answer = w.r, picked = [];
    (w.d || []).forEach(function (d) { if (d !== answer && picked.indexOf(d) < 0 && picked.length < 3) picked.push(d); });
    var sameLen = [], diffLen = [];
    lvl.words.forEach(function (x) {
      if (x.w === w.w || x.r === answer) return;
      (x.r.length === answer.length ? sameLen : diffLen).push(x.r);
    });
    shuffle(sameLen).concat(shuffle(diffLen)).forEach(function (r) {
      if (picked.length < 3 && r !== answer && picked.indexOf(r) < 0) picked.push(r);
    });
    return shuffle(picked.concat([answer]));
  }
  function optsType3(lvl, c) {
    var answer = c.ch;
    var others = lvl.chars.filter(function (x) { return x.ch !== c.ch; });
    var sameEum = shuffle(others.filter(function (x) { return x.eum === c.eum; }));
    var rest = shuffle(others), picked = [];
    if (sameEum.length > 0) picked.push(sameEum[0].ch);
    for (var i = 0; i < rest.length && picked.length < 3; i++) {
      if (picked.indexOf(rest[i].ch) < 0) picked.push(rest[i].ch);
    }
    return shuffle(picked.concat([answer]));
  }
  function eligibleWords(lvl, c, knownSet) {
    return (c.words || []).filter(function (wStr) {
      if (!lvl.wordByW[wStr]) return false;
      return wStr.split("").every(function (ch) { return knownSet[ch]; });
    });
  }
  function buildQuestion(lvl, ch, isNew, knownSet) {
    var c = lvl.byCh[ch];
    if (isNew) return { ch: ch, type: 1, prompt: c.ch, answer: huneumOf(c), opts: optsType1(lvl, c) };
    var roll = Math.random();
    if (roll < 0.45) {
      var elig = eligibleWords(lvl, c, knownSet);
      if (elig.length > 0) {
        var w = lvl.wordByW[elig[Math.floor(Math.random() * elig.length)]];
        return { ch: ch, type: 2, prompt: w.w, answer: w.r, opts: optsType2(lvl, w) };
      }
    } else if (roll < 0.60) {
      return { ch: ch, type: 3, prompt: huneumOf(c), answer: c.ch, opts: optsType3(lvl, c) };
    }
    return { ch: ch, type: 1, prompt: c.ch, answer: huneumOf(c), opts: optsType1(lvl, c) };
  }

  // ---------- 세션 ----------
  var sess = null;

  function startDaily() {
    var lvl = LEVELS[curIdx], t = todayStr();
    var due = dueList(lvl, t).slice(0, DAILY_MAX);
    var room = DAILY_MAX - due.length;
    var newChars = [];
    var ls = levelState(lvl.name);
    var n = Math.min(NEW_MAX, room, lvl.chars.length - ls.newIdx);
    for (var i = 0; i < n; i++) newChars.push(lvl.chars[ls.newIdx + i].ch);

    if (due.length === 0 && newChars.length === 0) { finishDay(t); renderHome(); return; }
    sess = {
      mode: "daily", t: t, lvl: lvl,
      introQueue: newChars, introIdx: 0,
      pending: { due: due, newChars: newChars },
      queue: null, idx: 0, ok: 0, wrongList: [], gradList: []
    };
    pushView("session");
    if (newChars.length > 0) renderIntro(); else { buildQueue(); renderQuestion(); }
  }

  function startBonus() {
    var lvl = LEVELS[curIdx], t = todayStr();
    var ls = levelState(lvl.name), introduced = Object.keys(ls.p);
    if (introduced.length === 0) { startDaily(); return; }
    sess = {
      mode: "bonus", t: t, lvl: lvl,
      introQueue: [], introIdx: 0,
      pending: { due: shuffle(introduced).slice(0, DAILY_MAX), newChars: [] },
      queue: null, idx: 0, ok: 0, wrongList: [], gradList: []
    };
    pushView("session");
    buildQueue(); renderQuestion();
  }

  function examSessionSize(lvl) {
    if (lvl.slug === "8gup") return Math.min(lvl.examQuestions, lvl.chars.length);
    return Math.max(20, Math.round(lvl.examQuestions / 3));
  }
  function startExam() {
    var lvl = LEVELS[curIdx], t = todayStr();
    var ls = levelState(lvl.name);
    if (ls.lastExamAttempt === t && !ls.examPassed) { renderHome(); return; }
    var n = Math.min(examSessionSize(lvl), lvl.chars.length);
    var pickChars = shuffle(lvl.chars.map(function (c) { return c.ch; })).slice(0, n);
    var knownSet = {}; lvl.chars.forEach(function (c) { knownSet[c.ch] = true; });
    sess = {
      mode: "exam", t: t, lvl: lvl,
      introQueue: [], introIdx: 0,
      queue: pickChars.map(function (ch) { return buildQuestion(lvl, ch, false, knownSet); }),
      idx: 0, ok: 0, wrongList: [], gradList: [],
      passNeed: Math.ceil(n * lvl.passRate)
    };
    pushView("session");
    renderQuestion();
  }

  function buildQueue() {
    var lvl = sess.lvl, ls = levelState(lvl.name), knownSet = {};
    Object.keys(ls.p).forEach(function (ch) { knownSet[ch] = true; });
    var items = sess.pending.due.map(function (ch) { return { ch: ch, isNew: false }; })
      .concat(sess.pending.newChars.map(function (ch) { return { ch: ch, isNew: true }; }));
    sess.queue = shuffle(items).map(function (it) { return buildQuestion(lvl, it.ch, it.isNew, knownSet); });
  }

  // ---------- 채점 ----------
  function grade(ch, correct) {
    if (sess.mode === "exam") return correct ? "정답!" : "오답";
    var lvl = sess.lvl, ls = levelState(lvl.name), t = sess.t;
    var rec = ls.p[ch] || (ls.p[ch] = { s: 0, due: t, g: false });
    var fb;
    if (sess.mode === "bonus" && correct) return "정답!";
    if (correct) {
      rec.s = (rec.s || 0) + 1;
      if (rec.s >= 2) { rec.g = true; sess.gradList.push(ch); fb = '<span class="stamp">🎓 졸업</span>'; }
      else { rec.due = addDays(t, 3); fb = "정답! 3일 뒤 한 번 더 맞히면 졸업"; }
    } else {
      var wasGrad = rec.g;
      rec.s = 0; rec.g = false; rec.due = addDays(t, 1);
      if (sess.wrongList.indexOf(ch) < 0) sess.wrongList.push(ch);
      fb = wasGrad ? "졸업 취소 — 보관함으로" : "보관함으로 — 내일 다시";
    }
    save();
    return fb;
  }
  function finishDay(t) {
    if (S.days[t] && S.days[t].done) return;
    S.days[t] = { done: true };
    if (S.lastDone === addDays(t, -1)) S.streakDays++; else if (S.lastDone !== t) S.streakDays = 1;
    S.lastDone = t; save();
  }

  // ---------- 렌더 ----------
  var curIdx = -1;
  var tablePrevTarget = null, tableNextTarget = null;

  function renderHome() {
    curIdx = currentLevelIdx();
    if (curIdx < 0) { renderAllDone(); return; }
    var lvl = LEVELS[curIdx], t = todayStr(), c = counts(lvl), ls = levelState(lvl.name);
    $("level-badge").innerHTML = lvl.name + " 도전 중" + '<div class="sub">' + (curIdx + 1) + " / " + LEVELS.length + " (로드된 급수)</div>";
    $("st-grad").textContent = c.grad + "/" + lvl.chars.length;
    $("st-learn").textContent = c.learn;
    $("st-streak").textContent = S.streakDays;

    var fullyGrad = levelFullyGraduated(lvl);
    var examBlockedToday = ls.lastExamAttempt === t && !ls.examPassed;
    var line, btnLabel = "오늘 학습 시작";
    if (fullyGrad && !examBlockedToday) {
      line = lvl.name + " 전원 졸업! 승급 모의시험(" + examSessionSize(lvl) + "문제, " + Math.round(lvl.passRate * 100) + "% 합격)에 도전하세요.";
      btnLabel = "🈹 승급 모의시험";
    } else if (fullyGrad && examBlockedToday) {
      line = "오늘 시험에 도전했어요. 내일 다시 도전할 수 있어요.";
      btnLabel = "오늘 완료 ✅";
    } else {
      var done = S.days[t] && S.days[t].done;
      var due = dueList(lvl, t).length;
      var newAvail = Math.min(NEW_MAX, Math.max(0, DAILY_MAX - due), lvl.chars.length - ls.newIdx);
      line = done ? "오늘 학습 완료 ✅ 내일 또 만나요" : "오늘: 복습 " + Math.min(due, DAILY_MAX) + " + 새 한자 " + newAvail;
      btnLabel = done ? "보너스 연습" : "오늘 학습 시작";
    }
    $("today-line").textContent = line;
    $("btn-start").textContent = btnLabel;
    $("btn-start").disabled = fullyGrad && examBlockedToday;
    renderLadderRows($("mini-ladder"));
    show("view-home");
  }

  function renderAllDone() {
    $("level-badge").innerHTML = "🎉 로드된 급수 전부 완료!";
    $("st-grad").textContent = "-"; $("st-learn").textContent = "-"; $("st-streak").textContent = S.streakDays;
    $("today-line").textContent = "다음 급수 데이터 준비 중이에요. 완료된 급수를 자유롭게 복습해보세요.";
    $("btn-start").textContent = "복습하기";
    $("btn-start").disabled = false;
    curIdx = LEVELS.length - 1; // 마지막 급수로 보너스 복습
    renderLadderRows($("mini-ladder"));
    show("view-home");
  }

  function renderIntro() {
    var lvl = sess.lvl, i = sess.introIdx, ch = sess.introQueue[i], c = lvl.byCh[ch];
    var ls = levelState(lvl.name);
    if (!ls.p[ch]) ls.p[ch] = { s: 0, due: sess.t, g: false };
    if (ls.newIdx < lvl.chars.length && lvl.chars[ls.newIdx].ch === ch) ls.newIdx++;
    save();
    $("intro-label").textContent = "오늘의 새 한자 " + (i + 1) + "/" + sess.introQueue.length;
    $("intro-glyph").textContent = c.ch;
    $("intro-huneum").textContent = huneumOf(c);
    $("intro-words").innerHTML = (c.words || []).map(function (wStr) {
      var w = lvl.wordByW[wStr]; return w ? w.w + " (" + w.r + ")" : wStr;
    }).join("<br>");
    $("btn-intro-next").textContent = (i === sess.introQueue.length - 1) ? "퀴즈 시작" : "다음";
    show("view-intro");
  }

  function renderQuestion() {
    var q = sess.queue[sess.idx];
    var suffix = sess.mode === "bonus" ? " · 보너스" : sess.mode === "exam" ? " · 모의시험" : "";
    $("quiz-label").textContent = (sess.idx + 1) + "/" + sess.queue.length + suffix;
    $("prog-fill").style.width = Math.round(sess.idx / sess.queue.length * 100) + "%";
    $("q-type").textContent = q.type === 1 ? "훈(뜻)과 음(소리)을 고르세요" : q.type === 2 ? "읽는 소리를 고르세요" : "이 훈음에 맞는 한자를 고르세요";
    var g = $("q-glyph");
    g.classList.remove("word");
    if (q.type === 3) { g.textContent = q.prompt; g.style.fontSize = "34px"; }
    else { g.textContent = q.prompt; g.style.fontSize = ""; g.classList.toggle("word", q.type === 2); }
    $("feedback").textContent = "";
    $("btn-next").classList.add("hidden");
    var box = $("opts"); box.innerHTML = "";
    q.opts.forEach(function (opt) {
      var b = document.createElement("button");
      b.className = "opt" + (q.type === 3 ? " glyph opt" : "");
      b.textContent = opt;
      b.addEventListener("click", function () { answer(q, opt, b); });
      box.appendChild(b);
    });
    show("view-quiz");
  }

  function answer(q, opt, btn) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("#opts .opt"));
    if (buttons.some(function (b) { return b.disabled; })) return;
    buttons.forEach(function (b) { b.disabled = true; if (b.textContent === q.answer) b.classList.add("correct"); });
    var correct = (opt === q.answer);
    if (!correct) btn.classList.add("wrong");
    if (correct) sess.ok++;
    $("feedback").innerHTML = grade(q.ch, correct);
    $("prog-fill").style.width = Math.round((sess.idx + 1) / sess.queue.length * 100) + "%";
    if (correct) setTimeout(next, 800);
    else $("btn-next").classList.remove("hidden");
  }

  function next() {
    if (!sess) return;
    sess.idx++;
    if (sess.idx < sess.queue.length) renderQuestion(); else renderResult();
  }

  function renderResult() {
    var m = sess.mode;
    if (m === "daily") finishDay(sess.t);
    $("result-title").textContent = m === "exam" ? sess.lvl.name + " 승급 모의시험 결과" : m === "bonus" ? "보너스 결과" : "오늘 결과";
    $("score").textContent = sess.ok + "/" + sess.queue.length;
    var pb = $("result-pass");
    if (m === "exam") {
      var ls = levelState(sess.lvl.name), pass = sess.ok >= sess.passNeed;
      pb.classList.remove("hidden");
      if (pass) {
        ls.examPassed = true;
        pb.className = "result-block pass-yes";
        pb.innerHTML = '<span class="stamp">🎓 ' + sess.lvl.name + ' 합격</span><div style="margin-top:10px;">다음 급수가 열렸어요.</div>';
      } else {
        ls.lastExamAttempt = sess.t;
        pb.className = "result-block pass-no";
        pb.textContent = "아쉬워요 — 합격선 " + sess.passNeed + "문제. 내일 다시 도전할 수 있어요.";
      }
      save();
    } else {
      pb.classList.add("hidden");
    }
    var gb = $("result-grad"), wb = $("result-wrong");
    gb.classList.toggle("hidden", sess.gradList.length === 0 || m === "exam");
    wb.classList.toggle("hidden", sess.wrongList.length === 0 || m === "exam");
    if (m !== "exam") {
      $("grad-chips").innerHTML = sess.gradList.map(function (ch) { return chipHtml(sess.lvl, ch); }).join("");
      $("wrong-chips").innerHTML = sess.wrongList.map(function (ch) { return chipHtml(sess.lvl, ch); }).join("");
    }
    sess = null;
    show("view-result");
  }
  function chipHtml(lvl, ch) {
    var c = lvl.byCh[ch];
    return '<span class="chip"><span class="g">' + c.ch + "</span>" + huneumOf(c) + "</span>";
  }

  // 급수 목록(사다리) 렌더 — 홈 화면에 항상 인라인으로 보여준다("전체 앱 내용이 내려다 보이도록").
  // 미도달·완료 급수 모두 표는 항상 볼 수 있다(전부 ⬜로 표시될 뿐) — 잠기는 건 "그 급수의 학습·시험 진행"뿐,
  // 한자 목록 구경(미리보기)까지 막지 않는다.
  function renderLadderRows(box) {
    box.innerHTML = "";
    MANIFEST_ALL.forEach(function (m) {
      var lvlObj = LEVELS.filter(function (l) { return l.slug === m.slug; })[0];
      var icon, sub, clickable = false;
      if (m.status !== "ready") { icon = "🚧"; sub = "데이터 준비 중"; }
      else if (levelComplete(lvlObj)) { icon = "🎓"; sub = lvlObj.chars.length + "자 · 통과 · 눌러서 표 보기"; clickable = true; }
      else {
        var readyIdx = LEVELS.indexOf(lvlObj);
        icon = readyIdx === curIdx ? "🔄" : "🔒";
        sub = lvlObj.chars.length + "자" + (readyIdx === curIdx ? " · 진행 중 · 눌러서 표 보기" : " · 아직 학습 전 · 눌러서 미리보기");
        clickable = true; // 잠긴 급수도 표(미리보기)는 항상 열람 가능
      }
      var row = document.createElement("div");
      row.className = "lrow" + (icon === "🔄" ? " current" : "");
      row.innerHTML = '<div class="licon">' + icon + '</div><div><div class="lname">' + m.name +
        '</div><div class="lsub">' + sub + "</div></div>";
      if (clickable) row.addEventListener("click", function () { pushView("table", { slug: lvlObj.slug }); renderTable(lvlObj); });
      box.appendChild(row);
    });
  }

  // lvl을 안 주면 현재 진행 중인 급수. 표 화면 안에서 이전/다음 급수로 바로 넘나들 수 있다(급수 사다리로
  // 매번 돌아가지 않아도 되도록) — MANIFEST_ALL 순서를 따라가되 데이터 없는(🚧) 급수는 건너뛴다.
  function renderTable(lvl) {
    lvl = lvl || LEVELS[curIdx] || LEVELS[LEVELS.length - 1];
    var ls = levelState(lvl.name);
    var isFuture = LEVELS.indexOf(lvl) > curIdx && curIdx >= 0;
    $("table-title").textContent = lvl.name + " 한자표" + (isFuture ? " (미리보기)" : "");
    $("table-grid").innerHTML = lvl.chars.map(function (c) {
      var rec = ls.p[c.ch], s = !rec ? "⬜" : (rec.g ? "🎓" : "🔁");
      return '<div class="tcell"><div class="g">' + c.ch + '</div><div class="h">' + huneumOf(c) + '</div><div class="s">' + s + "</div></div>";
    }).join("");

    var mi = MANIFEST_ALL.findIndex(function (m) { return m.slug === lvl.slug; });
    tablePrevTarget = null; tableNextTarget = null;
    for (var i = mi - 1; i >= 0; i--) { var pl = LEVELS.filter(function (l) { return l.slug === MANIFEST_ALL[i].slug; })[0]; if (pl) { tablePrevTarget = pl; break; } }
    for (var j = mi + 1; j < MANIFEST_ALL.length; j++) { var nl = LEVELS.filter(function (l) { return l.slug === MANIFEST_ALL[j].slug; })[0]; if (nl) { tableNextTarget = nl; break; } }
    var pb = $("btn-table-prev"), nb = $("btn-table-next");
    pb.disabled = !tablePrevTarget; pb.textContent = tablePrevTarget ? "◀ " + tablePrevTarget.name : "◀ 이전 급수";
    nb.disabled = !tableNextTarget; nb.textContent = tableNextTarget ? tableNextTarget.name + " ▶" : "다음 급수 ▶";

    show("view-table");
  }

  // ---------- 초기화 ----------
  function init() {
    document.title = CFG.title;
    $("app-title").textContent = CFG.title;
    $("app-subtitle").textContent = CFG.subtitle;
    var back = $("back-link"); back.href = CFG.back; back.textContent = CFG.backLabel;

    $("btn-start").addEventListener("click", function () {
      var lvl = LEVELS[curIdx]; if (!lvl) { startBonus(); return; }
      var t = todayStr(), ls = levelState(lvl.name);
      if (levelFullyGraduated(lvl)) { startExam(); return; }
      if (S.days[t] && S.days[t].done) startBonus(); else startDaily();
    });
    $("btn-table-back").addEventListener("click", function (e) { e.preventDefault(); pushView("home"); renderHome(); });
    $("btn-table-prev").addEventListener("click", function () { if (tablePrevTarget) { pushView("table", { slug: tablePrevTarget.slug }); renderTable(tablePrevTarget); } });
    $("btn-table-next").addEventListener("click", function () { if (tableNextTarget) { pushView("table", { slug: tableNextTarget.slug }); renderTable(tableNextTarget); } });
    $("btn-intro-next").addEventListener("click", function () {
      sess.introIdx++;
      if (sess.introIdx < sess.introQueue.length) renderIntro(); else { buildQueue(); renderQuestion(); }
    });
    $("btn-next").addEventListener("click", next);
    $("btn-home").addEventListener("click", function () { pushView("home"); renderHome(); });

    // 뒤로가기(popstate)로 도착한 지점을 재구성. 표 화면이면 그 급수 표를, 그 외(홈·세션 도중)는
    // 전부 홈으로 — 세션 중이었다면 중단(sess=null)하고 홈에서 다시 시작하면 된다.
    window.addEventListener("popstate", function (e) {
      sess = null;
      var st = e.state;
      if (st && st.kind === "table" && st.slug) {
        var lvl = LEVELS.filter(function (l) { return l.slug === st.slug; })[0];
        if (lvl) { renderTable(lvl); return; }
      }
      renderHome();
    });

    migrateV1();
    history.replaceState({ kind: "home" }, "", location.href);
    loadAllData().then(renderHome).catch(function (e) {
      $("today-line").textContent = "데이터 로드 실패: " + e.message;
    });
  }
  init();
})();
