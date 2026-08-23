// 한자 앱 엔진 v3 — 단어 중심 플랫폼(결정 #20). 규칙의 정본은 00_META/design_hanja_v3.md (v2/v1 규칙 계승)
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;
  var KEY = CFG.ns + ".v3";
  var V2_KEY = CFG.ns + ".v2";
  var V1_KEY = (CFG.v1ns || CFG.ns) + ".v1";
  var DAILY_MAX = 10;
  var NEW_MAX = 5;

  var LEVELS = [];        // ready 급수만, order순
  var MANIFEST_ALL = [];  // 전체 급수(표시용)
  var WORDS = [];         // 단어 정본 (data/words.json) — 급수 파일과 분리된 단일 원천
  var IDIOMS = [];        // 성어 정본 (data/idioms.json)
  var byW = {};           // w → 단어 객체
  var wordsByChar = {};   // ch → 그 글자가 든 단어 객체 배열 (런타임 계산 — 글자별 예시어의 원천)
  var lvOrder = {};       // 급수 이름 → order

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
      manifest.levels.forEach(function (l) { lvOrder[l.name] = l.order; });
      var ready = manifest.levels.filter(function (l) { return l.status !== "planned"; });
      return Promise.all(ready.map(function (l) {
        return loadJSON("data/levels/" + l.slug + ".json").then(function (d) {
          var byCh = {};
          d.chars.forEach(function (c) { byCh[c.ch] = c; });
          return Object.assign({}, l, { chars: d.chars, byCh: byCh });
        });
      }).concat([loadJSON("data/words.json"), loadJSON("data/idioms.json")]));
    }).then(function (loaded) {
      IDIOMS = loaded.pop().idioms;
      WORDS = loaded.pop().words;
      LEVELS = loaded;
      WORDS.forEach(function (w) {
        byW[w.w] = w;
        for (var i = 0; i < w.w.length; i++) {
          var ch = w.w[i];
          (wordsByChar[ch] = wordsByChar[ch] || []).push(w);
        }
      });
      CHARS = []; byChGlobal = {};
      LEVELS.forEach(function (lvl) {
        lvl.chars.forEach(function (c) {
          var info = { c: c, lvl: lvl };
          CHARS.push(info); byChGlobal[c.ch] = info;
        });
      });
    });
  }
  var CHARS = [];       // 전 급수 글자 (검색용)
  var byChGlobal = {};  // ch → {c, lvl}

  // ---------- 상태 ----------
  function freshState() {
    return { v: 3, levels: {}, words: { p: {} }, idioms: { p: {} }, saved: [], days: {}, lastDone: null, streakDays: 0 };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 3) {
        s.words = s.words || { p: {} }; s.idioms = s.idioms || { p: {} }; s.saved = s.saved || [];
        return s;
      }
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
  // v2 → v3: 급수 진도(levels)·연속일을 통째로 복사. v2 키는 보존(롤백 대비 — v1 때와 동일 패턴).
  // v2 키가 없으면 v1 → 8급 폴백(기존 마이그레이션 사슬 유지).
  function migrate() {
    if (Object.keys(S.levels).length > 0) return; // 이미 v3 데이터 있음 — 스킵
    try {
      var v2 = JSON.parse(localStorage.getItem(V2_KEY));
      if (v2 && v2.levels && Object.keys(v2.levels).length > 0) {
        S.levels = v2.levels;
        S.days = v2.days || {}; S.lastDone = v2.lastDone || null; S.streakDays = v2.streakDays || 0;
        save();
        return;
      }
    } catch (e) {}
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
  var VIEWS = ["view-home", "view-intro", "view-quiz", "view-result", "view-table", "view-search", "view-detail"];
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
  function wordPool(maxOrder) { // 해당 급수 이하 글자로만 이루어진 단어들 (v3: words.json 단일 원천)
    return WORDS.filter(function (x) { return lvOrder[x.lv] <= maxOrder; });
  }
  function optsType2(lvl, w) {
    var answer = w.r, picked = [];
    (w.d || []).forEach(function (d) { if (d !== answer && picked.indexOf(d) < 0 && picked.length < 3) picked.push(d); });
    var sameLen = [], diffLen = [];
    wordPool(lvl.order).forEach(function (x) {
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
    // v3: 글자별 예시어는 계산형 — words.json에서 이 글자가 든 단어 중, 급수 이하 + 구성 글자 전부 학습된 것
    return (wordsByChar[c.ch] || []).filter(function (w) {
      if (lvOrder[w.lv] > lvl.order) return false;
      return w.w.split("").every(function (ch) { return knownSet[ch]; });
    });
  }
  function buildQuestion(lvl, ch, isNew, knownSet) {
    var c = lvl.byCh[ch];
    if (isNew) return { ch: ch, type: 1, prompt: c.ch, answer: huneumOf(c), opts: optsType1(lvl, c) };
    var roll = Math.random();
    if (roll < 0.45) {
      var elig = eligibleWords(lvl, c, knownSet);
      if (elig.length > 0) {
        var w = elig[Math.floor(Math.random() * elig.length)];
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
  // v3: 채점은 문항(q) 단위 — 급수 세션은 q.ch(글자), 보관함 세션은 q.sk(저장 키)로 SR 레코드를 찾는다.
  // SR 규칙 자체(다른 날 연속 2회 정답 졸업, 오답 시 리셋+내일)는 v1부터 불변.
  function grade(q, correct) {
    if (sess.mode === "exam") return correct ? "정답!" : "오답";
    var t = sess.t, rec, chipRef;
    if (sess.mode === "saved" || sess.mode === "ctx") {
      rec = savedRec(q.sk); chipRef = savedChip(q.sk);
    } else {
      var ls = levelState(sess.lvl.name);
      rec = ls.p[q.ch] || (ls.p[q.ch] = { s: 0, due: t, g: false });
      chipRef = q.ch;
    }
    var fb;
    if (sess.mode === "bonus" && correct) return "정답!";
    if (correct) {
      rec.s = (rec.s || 0) + 1;
      if (rec.s >= 2) {
        rec.g = true;
        if (sess.mode === "saved" || sess.mode === "ctx") removeSaved(q.sk);
        sess.gradList.push(chipRef); fb = '<span class="stamp">🎓 졸업</span>';
      } else { rec.due = addDays(t, 3); fb = "정답! 3일 뒤 한 번 더 맞히면 졸업"; }
    } else {
      var wasGrad = rec.g;
      rec.s = 0; rec.g = false; rec.due = addDays(t, 1);
      var key = chipRef.k || chipRef;
      if (!sess.wrongList.some(function (x) { return (x.k || x) === key; })) sess.wrongList.push(chipRef);
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
    updateSavedButton(t);
    renderLadderRows($("mini-ladder"));
    show("view-home");
  }

  function updateSavedButton(t) {
    var n = savedDueKeys(t).length, b = $("btn-saved-review");
    b.classList.toggle("hidden", n === 0);
    b.textContent = "📦 보관함 복습 (" + n + ")";
    updateCtxButton(t);
  }
  function updateCtxButton(t) {
    var b = $("btn-ctx");
    if (ctxCorpus().length === 0) { b.classList.add("hidden"); return; }
    b.classList.remove("hidden");
    var cc = ctxCounts(t);
    var newTake = Math.min(NEW_MAX, Math.max(0, DAILY_MAX - cc.due), cc.news);
    if (cc.due + newTake > 0) {
      b.disabled = false;
      b.textContent = "📖 문맥 한자 — 복습 " + cc.due + " · 새 단어 " + newTake;
    } else {
      b.disabled = true;
      b.textContent = "📖 문맥 한자 — 오늘 완료 ✅";
    }
  }

  function renderAllDone() {
    $("level-badge").innerHTML = "🎉 로드된 급수 전부 완료!";
    $("st-grad").textContent = "-"; $("st-learn").textContent = "-"; $("st-streak").textContent = S.streakDays;
    $("today-line").textContent = "다음 급수 데이터 준비 중이에요. 완료된 급수를 자유롭게 복습해보세요.";
    $("btn-start").textContent = "복습하기";
    $("btn-start").disabled = false;
    curIdx = LEVELS.length - 1; // 마지막 급수로 보너스 복습
    updateSavedButton(todayStr());
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
    $("intro-words").innerHTML = (wordsByChar[ch] || []).filter(function (w) {
      return lvOrder[w.lv] <= lvl.order;
    }).slice(0, 3).map(function (w) { return w.w + " (" + w.r + ")"; }).join("<br>");
    $("btn-intro-next").textContent = (i === sess.introQueue.length - 1) ? "퀴즈 시작" : "다음";
    show("view-intro");
  }

  function renderQuestion() {
    var q = sess.queue[sess.idx];
    var suffix = sess.mode === "bonus" ? " · 보너스" : sess.mode === "exam" ? " · 모의시험" : sess.mode === "ctx" ? " · 문맥" : sess.mode === "saved" ? " · 보관함" : "";
    $("quiz-label").textContent = (sess.idx + 1) + "/" + sess.queue.length + suffix;
    $("prog-fill").style.width = Math.round(sess.idx / sess.queue.length * 100) + "%";
    $("q-type").textContent = q.qlabel ? q.qlabel :
      q.type === 1 ? "훈(뜻)과 음(소리)을 고르세요" : q.type === 2 ? "읽는 소리를 고르세요" : "이 훈음에 맞는 한자를 고르세요";
    var g = $("q-glyph");
    g.classList.remove("word"); g.classList.remove("sent");
    if (q.type === 6 || q.type === 7) { g.textContent = q.prompt; g.style.fontSize = ""; g.classList.add("sent"); }
    else if (q.type === 3) { g.textContent = q.prompt; g.style.fontSize = "34px"; }
    else { g.textContent = q.prompt; g.style.fontSize = ""; g.classList.toggle("word", q.type === 2); }
    $("feedback").textContent = "";
    $("btn-next").classList.add("hidden");
    var box = $("opts"); box.innerHTML = "";
    q.opts.forEach(function (opt) {
      var b = document.createElement("button");
      b.className = "opt" + ((q.type === 3 || q.type === 6) ? " glyph" : "");
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
    var fb = grade(q, correct);
    // 문맥 문제(6·7)는 정오답 모두 해설(글자 분해+뜻)을 붙이고, 읽을 시간을 주기 위해 자동 진행하지 않는다.
    if (q.type === 6 || q.type === 7) {
      var target = q.sk.slice(2);
      fb += '<div class="exp">' + wordExp(target);
      if (!correct && q.type === 6 && byW[opt]) fb += "<br>고른 답: " + wordExp(opt);
      fb += "</div>";
    }
    $("feedback").innerHTML = fb;
    $("prog-fill").style.width = Math.round((sess.idx + 1) / sess.queue.length * 100) + "%";
    if (correct && q.type !== 6 && q.type !== 7) setTimeout(next, 800);
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
    $("result-title").textContent = m === "exam" ? sess.lvl.name + " 승급 모의시험 결과" : m === "bonus" ? "보너스 결과" : m === "saved" ? "보관함 복습 결과" : m === "ctx" ? "문맥 한자 결과" : "오늘 결과";
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
    if (m === "saved" || m === "ctx") {
      $("grad-chips").innerHTML = sess.gradList.map(chipObjHtml).join("");
      $("wrong-chips").innerHTML = sess.wrongList.map(chipObjHtml).join("");
    } else if (m !== "exam") {
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
  function chipObjHtml(o) {
    return '<span class="chip"><span class="g">' + o.g + "</span>" + o.h + "</span>";
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

  // ---------- 보관함(수집) — 검색에서 저장한 항목의 SR 루프 (결정 #20: 검색 = 수집 입구) ----------
  // 저장 키(sk) = "c:歌" | "w:延期" | "i:溫故知新". 글자는 소속 급수의 p에, 단어/성어는 S.words/S.idioms.p에
  // 레코드를 만든다 — 급수 학습과 같은 SR 규칙을 타므로, 글자는 급수 진도에도 그대로 반영된다.
  function savedRec(sk) {
    var k = sk.slice(2), t = todayStr();
    if (sk[0] === "c") {
      var info = byChGlobal[k]; if (!info) return null;
      var ls = levelState(info.lvl.name);
      return ls.p[k] || (ls.p[k] = { s: 0, due: t, g: false });
    }
    if (sk[0] === "w") return S.words.p[k] || (S.words.p[k] = { s: 0, due: t, g: false });
    return S.idioms.p[k] || (S.idioms.p[k] = { s: 0, due: t, g: false });
  }
  function savedRecPeek(sk) {
    var k = sk.slice(2);
    if (sk[0] === "c") { var info = byChGlobal[k]; if (!info) return null; return levelState(info.lvl.name).p[k] || null; }
    if (sk[0] === "w") return S.words.p[k] || null;
    return S.idioms.p[k] || null;
  }
  function removeSaved(sk) { var i = S.saved.indexOf(sk); if (i >= 0) S.saved.splice(i, 1); }
  function savedChip(sk) {
    var k = sk.slice(2);
    if (sk[0] === "c") { var info = byChGlobal[k]; return { k: sk, g: k, h: info ? huneumOf(info.c) : "" }; }
    if (sk[0] === "w") { var w = byW[k]; return { k: sk, g: k, h: w ? w.r : "" }; }
    return { k: sk, g: k, h: "" };
  }
  function savedDueKeys(t) {
    return S.saved.filter(function (sk) {
      if (sk[0] === "i") return false; // 성어 문제 유형은 M4에서 — 그 전까지 복습 큐에서 제외
      if (sk[0] === "c" && !byChGlobal[sk.slice(2)]) return false;
      if (sk[0] === "w" && !byW[sk.slice(2)]) return false;
      var rec = savedRecPeek(sk);
      return !!rec && !rec.g && rec.due <= t;
    });
  }
  function savedQuestion(sk) {
    if (sk[0] === "c") {
      var ch = sk.slice(2), lvl = byChGlobal[ch].lvl;
      var knownSet = {};
      lvl.chars.forEach(function (c) { knownSet[c.ch] = true; });
      var q = buildQuestion(lvl, ch, false, knownSet);
      q.sk = sk;
      return q;
    }
    var w = byW[sk.slice(2)];
    return { sk: sk, type: 2, prompt: w.w, answer: w.r, opts: optsType2({ order: lvOrder[w.lv] }, w) };
  }
  function startSavedReview() {
    var t = todayStr();
    var keys = shuffle(savedDueKeys(t)).slice(0, DAILY_MAX);
    if (keys.length === 0) { renderHome(); return; }
    sess = {
      mode: "saved", t: t, lvl: null,
      introQueue: [], introIdx: 0,
      queue: keys.map(savedQuestion), idx: 0, ok: 0, wrongList: [], gradList: []
    };
    pushView("session");
    renderQuestion();
  }

  // ---------- 문맥 트랙 (트랙 A) — 유형 6(동음이의 한자 고르기)·7(빈칸 한자어 고르기) ----------
  // 코퍼스 = sent(자작 예문)가 있는 단어. 진도는 보관함과 같은 S.words.p — 단어 SR은 하나의 저장소로 수렴.
  function ctxCorpus() { return WORDS.filter(function (w) { return w.sent; }); }
  function homophonesOf(w) { return WORDS.filter(function (x) { return x.r === w.r && x.w !== w.w; }); }
  function wordExp(wStr) { // 해설: 글자 분해 + 뜻
    var w = byW[wStr];
    var parts = wStr.split("").map(function (ch) {
      var info = byChGlobal[ch];
      return info ? ch + " " + huneumOf(info.c) : ch;
    }).join(" · ");
    return wStr + " = " + parts + (w && w.gloss ? "<br>" + w.gloss : "");
  }
  function ctxQuestion(w) {
    if (!w.sent) { // 예문 없는 단어(검색 저장분 등) → 독음 문제로 폴백
      return { sk: "w:" + w.w, type: 2, prompt: w.w, answer: w.r, opts: optsType2({ order: lvOrder[w.lv] }, w) };
    }
    var homos = homophonesOf(w);
    if (homos.length >= 1) {
      // 유형 6: 문장 속 단어의 "올바른 한자 표기" 고르기 — 오답 보기는 같은 독음의 실존 단어
      var opts = [w.w].concat(shuffle(homos).slice(0, 3).map(function (x) { return x.w; }));
      if (opts.length < 4) {
        shuffle(WORDS).forEach(function (x) {
          if (opts.length >= 4) return;
          if (opts.indexOf(x.w) >= 0 || x.r === w.r) return;
          if (x.r.length === w.r.length && x.r[0] === w.r[0]) opts.push(x.w);
        });
      }
      if (opts.length < 4) {
        shuffle(WORDS).forEach(function (x) {
          if (opts.length >= 4) return;
          if (opts.indexOf(x.w) < 0 && x.r.length === w.r.length) opts.push(x.w);
        });
      }
      return {
        sk: "w:" + w.w, type: 6, answer: w.w, opts: shuffle(opts),
        prompt: w.sent.split(w.r).join("『" + w.r + "』"),
        qlabel: "문장 속 『" + w.r + "』의 한자는?",
      };
    }
    // 유형 7: 빈칸에 알맞은 한자어 — 오답 보기는 같은 카테고리 우선
    var others = WORDS.filter(function (x) { return x.sent && x.w !== w.w && x.r !== w.r; });
    var sameCat = shuffle(others.filter(function (x) { return x.cat && x.cat === w.cat; }));
    var picked = [];
    sameCat.concat(shuffle(others)).forEach(function (x) {
      var o = x.r + " (" + x.w + ")";
      if (picked.length < 3 && picked.indexOf(o) < 0) picked.push(o);
    });
    var ansOpt = w.r + " (" + w.w + ")";
    return {
      sk: "w:" + w.w, type: 7, answer: ansOpt, opts: shuffle(picked.concat([ansOpt])),
      prompt: w.sent.split(w.r).join("(____)"),
      qlabel: "빈칸에 알맞은 한자어는?",
    };
  }
  function ctxCounts(t) {
    var due = 0, news = 0;
    Object.keys(S.words.p).forEach(function (k) {
      var r = S.words.p[k];
      if (byW[k] && !r.g && r.due <= t) due++;
    });
    ctxCorpus().forEach(function (w) { if (!S.words.p[w.w]) news++; });
    return { due: Math.min(due, DAILY_MAX), news: news };
  }
  function startCtx() {
    var t = todayStr();
    var dueKeys = shuffle(Object.keys(S.words.p).filter(function (k) {
      var r = S.words.p[k];
      return byW[k] && !r.g && r.due <= t;
    })).slice(0, DAILY_MAX);
    var room = Math.max(0, DAILY_MAX - dueKeys.length);
    var newWords = ctxCorpus().filter(function (w) { return !S.words.p[w.w]; }).slice(0, Math.min(NEW_MAX, room));
    if (dueKeys.length === 0 && newWords.length === 0) { renderHome(); return; }
    newWords.forEach(function (w) { S.words.p[w.w] = { s: 0, due: t, g: false }; });
    save();
    var qs = dueKeys.map(function (k) { return ctxQuestion(byW[k]); })
      .concat(newWords.map(function (w) { return ctxQuestion(w); }));
    sess = {
      mode: "ctx", t: t, lvl: null,
      introQueue: [], introIdx: 0,
      queue: shuffle(qs), idx: 0, ok: 0, wrongList: [], gradList: []
    };
    pushView("session");
    renderQuestion();
  }

  // ---------- 검색 — 사전이 아니라 수집 입구 ----------
  var lastQuery = "";
  function parseEumsJs(eumStr) { return eumStr.split(/[^가-힣]+/).filter(Boolean); }
  var CJK_TEST = /[㐀-鿿豈-﫿]/;
  function searchAll(q) {
    var res = { chars: [], words: [], idioms: [] };
    q = (q || "").trim();
    if (!q) return res;
    if (CJK_TEST.test(q)) {
      for (var i = 0; i < q.length && res.chars.length < 20; i++) {
        var info = byChGlobal[q[i]];
        if (info && res.chars.indexOf(info) < 0) res.chars.push(info);
      }
      WORDS.forEach(function (w) { if (res.words.length < 20 && w.w.indexOf(q) >= 0) res.words.push(w); });
      IDIOMS.forEach(function (it) { if (res.idioms.length < 20 && it.expr.indexOf(q) >= 0) res.idioms.push(it); });
    } else {
      var exact = [], partial = [];
      CHARS.forEach(function (info) {
        if (parseEumsJs(info.c.eum).indexOf(q) >= 0) exact.push(info);
        else if (info.c.hun.indexOf(q) >= 0) partial.push(info);
      });
      res.chars = exact.concat(partial).slice(0, 20);
      var wpre = [], wsub = [];
      WORDS.forEach(function (w) {
        if (w.r === q || w.r.indexOf(q) === 0) wpre.push(w);
        else if (w.r.indexOf(q) > 0 || (w.gloss || "").indexOf(q) >= 0) wsub.push(w);
      });
      res.words = wpre.concat(wsub).slice(0, 20);
      IDIOMS.forEach(function (it) {
        if (res.idioms.length < 20 && (it.r.indexOf(q) >= 0 || (it.meaning || "").indexOf(q) >= 0)) res.idioms.push(it);
      });
    }
    return res;
  }
  function listRow(glyph, name, sub, onClick) {
    var row = document.createElement("div");
    row.className = "lrow";
    row.innerHTML = '<div class="lglyph">' + glyph + '</div><div><div class="lname">' + name +
      '</div><div class="lsub">' + sub + "</div></div>";
    row.addEventListener("click", onClick);
    return row;
  }
  var catFilter = null; // 카테고리 브라우즈 (Nick 지시 2026-08-23 — 검색 초기 화면에서 카테고리로 둘러보기)
  function renderSearch() {
    $("search-input").value = lastQuery;
    renderSearchResults();
    show("view-search");
  }
  function wordRowFor(w) {
    return listRow(w.w, w.r, (w.cat ? "[" + w.cat + "] " : "") + (w.gloss ? w.gloss + " · " : "") + w.lv + statusSuffix(trackedRec("w", w.w)), function () {
      pushView("detail", { dt: "w", k: w.w }); renderDetailWord(w);
    });
  }
  function renderSearchResults() {
    var box = $("search-results");
    box.innerHTML = "";
    function head(txt) { var h = document.createElement("div"); h.className = "group-head"; h.textContent = txt; box.appendChild(h); }
    if (!lastQuery.trim()) {
      // 검색어가 없을 때 = 카테고리 브라우즈
      var cats = {};
      WORDS.forEach(function (w) { if (w.cat) cats[w.cat] = (cats[w.cat] || 0) + 1; });
      if (catFilter && cats[catFilter]) {
        head("카테고리: " + catFilter);
        box.appendChild(listRow("↩", "모든 카테고리", "카테고리 목록으로 돌아가기", function () { catFilter = null; renderSearchResults(); }));
        WORDS.forEach(function (w) { if (w.cat === catFilter) box.appendChild(wordRowFor(w)); });
      } else {
        var names = Object.keys(cats);
        if (names.length) {
          head("카테고리로 둘러보기");
          names.forEach(function (name) {
            box.appendChild(listRow("📂", name, "단어 " + cats[name] + "개", function () { catFilter = name; renderSearchResults(); }));
          });
        }
      }
      return;
    }
    var r = searchAll(lastQuery);
    if (!r.chars.length && !r.words.length && !r.idioms.length) { head("결과 없음 — 아직 수록되지 않은 항목이에요"); return; }
    if (r.chars.length) {
      head("글자");
      r.chars.forEach(function (info) {
        box.appendChild(listRow(info.c.ch, huneumOf(info.c), info.lvl.name + statusSuffix(trackedRec("c", info.c.ch)), function () {
          pushView("detail", { dt: "c", k: info.c.ch }); renderDetailChar(info);
        }));
      });
    }
    if (r.words.length) {
      head("단어");
      r.words.forEach(function (w) { box.appendChild(wordRowFor(w)); });
    }
    if (r.idioms.length) {
      head("성어");
      r.idioms.forEach(function (it) {
        box.appendChild(listRow(it.expr, it.r, (it.meaning || "") + " · " + it.lv, function () {
          pushView("detail", { dt: "i", k: it.expr }); renderDetailIdiom(it);
        }));
      });
    }
  }

  // ---------- 상세뷰 (글자/단어/성어 공용 — 상호 링크로 미니 옥편) ----------
  var detailTarget = null; // { dt: "c"|"w"|"i", k }
  function trackedRec(dt, k) {
    if (dt === "c") { var info = byChGlobal[k]; if (!info) return null; return levelState(info.lvl.name).p[k] || null; }
    if (dt === "w") return S.words.p[k] || null;
    return S.idioms.p[k] || null;
  }
  function statusSuffix(rec) { return !rec ? "" : rec.g ? " · 🎓 졸업" : " · 🔁 학습 중"; }
  function updateSaveBtn(dt, k) {
    var b = $("btn-detail-save"), rec = trackedRec(dt, k);
    if (rec && rec.g) { b.textContent = "🎓 이미 졸업한 항목이에요"; b.disabled = true; }
    else if (rec) { b.textContent = "🔁 보관함에 있어요 — 복습에 나와요"; b.disabled = true; }
    else { b.textContent = "📦 보관함에 저장 (복습에 나와요)"; b.disabled = false; }
  }
  function renderDetailByKey(dt, k) {
    if (dt === "c" && byChGlobal[k]) { renderDetailChar(byChGlobal[k]); return true; }
    if (dt === "w" && byW[k]) { renderDetailWord(byW[k]); return true; }
    if (dt === "i") {
      var it = IDIOMS.filter(function (x) { return x.expr === k; })[0];
      if (it) { renderDetailIdiom(it); return true; }
    }
    return false;
  }
  function renderDetailChar(info) {
    var c = info.c, ch = c.ch;
    detailTarget = { dt: "c", k: ch };
    $("detail-title").textContent = "글자";
    $("detail-sub").textContent = info.lvl.name + " 배정한자";
    $("detail-glyph").classList.remove("word");
    $("detail-glyph").textContent = ch;
    $("detail-huneum").textContent = huneumOf(c);
    var rec = trackedRec("c", ch);
    $("detail-info").innerHTML = rec ? (rec.g ? "🎓 졸업" : "🔁 학습 중") : "아직 학습 전";
    updateSaveBtn("c", ch);
    var rel = wordsByChar[ch] || [];
    $("detail-rel-head").textContent = rel.length ? "이 글자가 든 단어 (" + rel.length + ")" : "이 글자가 든 단어가 아직 없어요";
    var box = $("detail-rel");
    box.innerHTML = "";
    rel.slice(0, 20).forEach(function (w) {
      box.appendChild(listRow(w.w, w.r, (w.gloss ? w.gloss + " · " : "") + w.lv, function () {
        pushView("detail", { dt: "w", k: w.w }); renderDetailWord(w);
      }));
    });
    show("view-detail");
  }
  function renderDetailWord(w) {
    detailTarget = { dt: "w", k: w.w };
    $("detail-title").textContent = "단어";
    $("detail-sub").textContent = w.lv + " 수준 한자어" + (w.cat ? " · " + w.cat : "");
    $("detail-glyph").classList.add("word");
    $("detail-glyph").textContent = w.w;
    $("detail-huneum").textContent = w.r;
    var parts = [];
    if (w.gloss) parts.push(w.gloss);
    if (w.sent) parts.push("“" + w.sent + "”");
    var rec = trackedRec("w", w.w);
    if (rec) parts.push(rec.g ? "🎓 졸업" : "🔁 학습 중");
    $("detail-info").innerHTML = parts.join("<br>");
    updateSaveBtn("w", w.w);
    $("detail-rel-head").textContent = "글자 분해";
    var box = $("detail-rel");
    box.innerHTML = "";
    w.w.split("").forEach(function (ch) {
      var info = byChGlobal[ch];
      if (!info) return;
      box.appendChild(listRow(ch, huneumOf(info.c), info.lvl.name, function () {
        pushView("detail", { dt: "c", k: ch }); renderDetailChar(info);
      }));
    });
    show("view-detail");
  }
  function renderDetailIdiom(it) {
    detailTarget = { dt: "i", k: it.expr };
    $("detail-title").textContent = "성어";
    $("detail-sub").textContent = it.lv + " 수준";
    $("detail-glyph").classList.add("word");
    $("detail-glyph").textContent = it.expr;
    $("detail-huneum").textContent = it.r;
    var parts = [];
    if (it.literal) parts.push("직역: " + it.literal);
    if (it.meaning) parts.push(it.meaning);
    if (it.origin) parts.push("출전: " + it.origin);
    if (it.sent) parts.push("“" + it.sent + "”");
    $("detail-info").innerHTML = parts.join("<br>");
    updateSaveBtn("i", it.expr);
    $("detail-rel-head").textContent = "글자 분해";
    var box = $("detail-rel");
    box.innerHTML = "";
    it.expr.split("").forEach(function (ch) {
      var info = byChGlobal[ch];
      if (!info) return;
      box.appendChild(listRow(ch, huneumOf(info.c), info.lvl.name, function () {
        pushView("detail", { dt: "c", k: ch }); renderDetailChar(info);
      }));
    });
    show("view-detail");
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
    $("btn-search").addEventListener("click", function () { lastQuery = ""; catFilter = null; pushView("search"); renderSearch(); });
    $("btn-ctx").addEventListener("click", startCtx);
    $("btn-search-back").addEventListener("click", function (e) { e.preventDefault(); pushView("home"); renderHome(); });
    $("btn-detail-back").addEventListener("click", function (e) { e.preventDefault(); pushView("search"); renderSearch(); });
    $("search-input").addEventListener("input", function () { lastQuery = $("search-input").value || ""; renderSearchResults(); });
    $("btn-saved-review").addEventListener("click", startSavedReview);
    $("btn-detail-save").addEventListener("click", function () {
      if (!detailTarget) return;
      var dt = detailTarget.dt, k = detailTarget.k;
      if (trackedRec(dt, k)) return;
      savedRec(dt + ":" + k); // 레코드 생성 (due=오늘 → 다음 복습부터 등장)
      var sk = dt + ":" + k;
      if (S.saved.indexOf(sk) < 0) S.saved.push(sk);
      save();
      updateSaveBtn(dt, k);
      $("detail-info").innerHTML = "🔁 보관함에 담았어요 — 복습에 나와요";
    });

    // 뒤로가기(popstate)로 도착한 지점을 재구성. 표/검색/상세 화면이면 그 지점을, 그 외(홈·세션 도중)는
    // 전부 홈으로 — 세션 중이었다면 중단(sess=null)하고 홈에서 다시 시작하면 된다.
    window.addEventListener("popstate", function (e) {
      sess = null;
      var st = e.state;
      if (st && st.kind === "table" && st.slug) {
        var lvl = LEVELS.filter(function (l) { return l.slug === st.slug; })[0];
        if (lvl) { renderTable(lvl); return; }
      }
      if (st && st.kind === "search") { renderSearch(); return; }
      if (st && st.kind === "detail" && st.dt && st.k && renderDetailByKey(st.dt, st.k)) return;
      renderHome();
    });

    migrate();
    history.replaceState({ kind: "home" }, "", location.href);
    loadAllData().then(renderHome).catch(function (e) {
      $("today-line").textContent = "데이터 로드 실패: " + e.message;
    });
  }
  init();
})();
