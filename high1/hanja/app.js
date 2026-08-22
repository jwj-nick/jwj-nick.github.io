// 한자 앱 엔진 — 규칙의 정본은 00_META/design_hanja_v1.md
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;
  var DATA = window.HANJA_DATA;
  var KEY = CFG.ns + ".v1";
  var TOTAL = DATA.chars.length;
  var DAILY_MAX = 10;
  var NEW_MAX = 5;

  var byCh = {};
  DATA.chars.forEach(function (c) { byCh[c.ch] = c; });
  var wordByW = {};
  DATA.words.forEach(function (w) { wordByW[w.w] = w; });

  // ---------- 상태 ----------
  function freshState() {
    return { v: 1, p: {}, newIdx: 0, days: {}, lastDone: null, streakDays: 0 };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return s;
    } catch (e) {}
    return freshState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  var S = load();

  // ---------- 날짜 ----------
  function fmt(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function todayStr() { return fmt(new Date()); }
  function addDays(dateStr, n) {
    var p = dateStr.split("-");
    return fmt(new Date(+p[0], +p[1] - 1, +p[2] + n));
  }

  // ---------- 유틸 ----------
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function $(id) { return document.getElementById(id); }
  function show(viewId) {
    ["view-home", "view-intro", "view-quiz", "view-result", "view-table"].forEach(function (v) {
      $(v).classList.toggle("hidden", v !== viewId);
    });
    window.scrollTo(0, 0);
  }
  function huneumOf(c) { return c.hun + " " + c.eum; }

  // ---------- 통계 ----------
  function counts() {
    var grad = 0, learn = 0;
    Object.keys(S.p).forEach(function (ch) {
      if (S.p[ch].g) grad++; else learn++;
    });
    return { grad: grad, learn: learn };
  }
  function dueList(t) {
    return Object.keys(S.p).filter(function (ch) {
      return !S.p[ch].g && S.p[ch].due <= t;
    }).sort(function (a, b) { return S.p[a].due < S.p[b].due ? -1 : 1; });
  }

  // ---------- 문제 생성 ----------
  function optsType1(c) {
    var answer = huneumOf(c);
    var others = DATA.chars.filter(function (x) {
      return x.ch !== c.ch && huneumOf(x) !== answer;
    });
    var sameEum = shuffle(others.filter(function (x) { return x.eum === c.eum; }));
    var rest = shuffle(others);
    var picked = [];
    if (sameEum.length > 0) picked.push(huneumOf(sameEum[0]));
    for (var i = 0; i < rest.length && picked.length < 3; i++) {
      var h = huneumOf(rest[i]);
      if (h !== answer && picked.indexOf(h) < 0) picked.push(h);
    }
    return shuffle(picked.concat([answer]));
  }
  function optsType2(w) {
    var answer = w.r;
    var picked = [];
    (w.d || []).forEach(function (d) {
      if (d !== answer && picked.indexOf(d) < 0 && picked.length < 3) picked.push(d);
    });
    var sameLen = [], diffLen = [];
    DATA.words.forEach(function (x) {
      if (x.w === w.w || x.r === answer) return;
      (x.r.length === answer.length ? sameLen : diffLen).push(x.r);
    });
    shuffle(sameLen).concat(shuffle(diffLen)).forEach(function (r) {
      if (picked.length < 3 && r !== answer && picked.indexOf(r) < 0) picked.push(r);
    });
    return shuffle(picked.concat([answer]));
  }
  function eligibleWords(c, knownSet) {
    return (c.words || []).filter(function (wStr) {
      if (!wordByW[wStr]) return false;
      return wStr.split("").every(function (ch) { return knownSet[ch]; });
    });
  }
  function buildQuestion(ch, isNew, knownSet) {
    var c = byCh[ch];
    if (!isNew && Math.random() < 0.5) {
      var elig = eligibleWords(c, knownSet);
      if (elig.length > 0) {
        var w = wordByW[elig[Math.floor(Math.random() * elig.length)]];
        return { ch: ch, type: 2, prompt: w.w, answer: w.r, opts: optsType2(w) };
      }
    }
    return { ch: ch, type: 1, prompt: c.ch, answer: huneumOf(c), opts: optsType1(c) };
  }

  // ---------- 세션 ----------
  var sess = null; // { mode, introQueue, introIdx, queue, idx, ok, wrongList, gradList }

  function startDaily() {
    var t = todayStr();
    var due = dueList(t).slice(0, DAILY_MAX);
    var room = DAILY_MAX - due.length;
    var newChars = [];
    var n = Math.min(NEW_MAX, room, TOTAL - S.newIdx);
    for (var i = 0; i < n; i++) newChars.push(DATA.chars[S.newIdx + i].ch);

    if (due.length === 0 && newChars.length === 0) {
      finishDay(t, 0, 0); // 출제할 것이 없으면 오늘 완료 처리
      renderHome();
      return;
    }
    sess = {
      mode: "daily", t: t,
      introQueue: newChars, introIdx: 0,
      pending: { due: due, newChars: newChars },
      queue: null, idx: 0, ok: 0, wrongList: [], gradList: []
    };
    if (newChars.length > 0) renderIntro();
    else { buildQueue(); renderQuestion(); }
  }

  function startBonus() {
    var t = todayStr();
    var introduced = Object.keys(S.p);
    if (introduced.length === 0) { startDaily(); return; }
    sess = {
      mode: "bonus", t: t,
      introQueue: [], introIdx: 0,
      pending: { due: shuffle(introduced).slice(0, DAILY_MAX), newChars: [] },
      queue: null, idx: 0, ok: 0, wrongList: [], gradList: []
    };
    buildQueue();
    renderQuestion();
  }

  function buildQueue() {
    var knownSet = {};
    Object.keys(S.p).forEach(function (ch) { knownSet[ch] = true; });
    var items = sess.pending.due.map(function (ch) { return { ch: ch, isNew: false }; })
      .concat(sess.pending.newChars.map(function (ch) { return { ch: ch, isNew: true }; }));
    sess.queue = shuffle(items).map(function (it) {
      return buildQuestion(it.ch, it.isNew, knownSet);
    });
  }

  // ---------- 채점 ----------
  function grade(ch, correct) {
    var t = sess.t;
    var rec = S.p[ch] || (S.p[ch] = { s: 0, due: t, g: false });
    var fb;
    if (sess.mode === "bonus" && correct) {
      return "정답!"; // 보너스 정답은 상태 무변화
    }
    if (correct) {
      rec.s = (rec.s || 0) + 1;
      if (rec.s >= 2) { rec.g = true; sess.gradList.push(ch); fb = "🎓 졸업!"; }
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

  function finishDay(t, q, ok) {
    if (S.days[t] && S.days[t].done) return;
    S.days[t] = { q: q, ok: ok, done: true };
    if (S.lastDone === addDays(t, -1)) S.streakDays++;
    else if (S.lastDone !== t) S.streakDays = 1;
    S.lastDone = t;
    save();
  }

  // ---------- 렌더 ----------
  function renderHome() {
    var t = todayStr();
    var c = counts();
    $("st-grad").textContent = c.grad + "/" + TOTAL;
    $("st-learn").textContent = c.learn;
    $("st-streak").textContent = S.streakDays;

    var done = S.days[t] && S.days[t].done;
    var due = dueList(t).length;
    var newAvail = Math.min(NEW_MAX, Math.max(0, DAILY_MAX - due), TOTAL - S.newIdx);
    var line;
    if (c.grad === TOTAL) line = "8급 전체 졸업! 🎉 다음 급수 준비 중";
    else if (done) line = "오늘 학습 완료 ✅ 내일 또 만나요";
    else line = "오늘: 복습 " + Math.min(due, DAILY_MAX) + " + 새 한자 " + newAvail;
    $("today-line").textContent = line;
    $("btn-start").textContent = done ? "보너스 연습" : "오늘 학습 시작";
    show("view-home");
  }

  function renderIntro() {
    var i = sess.introIdx;
    var ch = sess.introQueue[i];
    var c = byCh[ch];
    // 카드를 본 순간 introduced로 커밋
    if (!S.p[ch]) { S.p[ch] = { s: 0, due: sess.t, g: false }; }
    if (S.newIdx < TOTAL && DATA.chars[S.newIdx].ch === ch) S.newIdx++;
    save();

    $("intro-label").textContent = "오늘의 새 한자 " + (i + 1) + "/" + sess.introQueue.length;
    $("intro-glyph").textContent = c.ch;
    $("intro-huneum").textContent = huneumOf(c);
    $("intro-words").innerHTML = (c.words || []).map(function (wStr) {
      var w = wordByW[wStr];
      return w ? w.w + " (" + w.r + ")" : wStr;
    }).join("<br>");
    $("btn-intro-next").textContent =
      (i === sess.introQueue.length - 1) ? "퀴즈 시작" : "다음";
    show("view-intro");
  }

  function renderQuestion() {
    var q = sess.queue[sess.idx];
    $("quiz-label").textContent = (sess.idx + 1) + "/" + sess.queue.length +
      (sess.mode === "bonus" ? " · 보너스" : "");
    $("prog-fill").style.width = Math.round(sess.idx / sess.queue.length * 100) + "%";
    $("q-type").textContent = q.type === 1 ? "훈(뜻)과 음(소리)을 고르세요" : "읽는 소리를 고르세요";
    var g = $("q-glyph");
    g.textContent = q.prompt;
    g.classList.toggle("word", q.type === 2);
    $("feedback").textContent = "";
    $("btn-next").classList.add("hidden");
    var box = $("opts");
    box.innerHTML = "";
    q.opts.forEach(function (opt) {
      var b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", function () { answer(q, opt, b); });
      box.appendChild(b);
    });
    show("view-quiz");
  }

  function answer(q, opt, btn) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("#opts .opt"));
    if (buttons.some(function (b) { return b.disabled; })) return;
    buttons.forEach(function (b) {
      b.disabled = true;
      if (b.textContent === q.answer) b.classList.add("correct");
    });
    var correct = (opt === q.answer);
    if (!correct) btn.classList.add("wrong");
    if (correct) sess.ok++;
    $("feedback").textContent = grade(q.ch, correct);
    $("prog-fill").style.width = Math.round((sess.idx + 1) / sess.queue.length * 100) + "%";
    if (correct) {
      setTimeout(next, 800);
    } else {
      $("btn-next").classList.remove("hidden"); // 오답은 정답 확인 후 직접 넘김
    }
  }

  function next() {
    if (!sess) return;
    sess.idx++;
    if (sess.idx < sess.queue.length) renderQuestion();
    else renderResult();
  }

  function renderResult() {
    if (sess.mode === "daily") finishDay(sess.t, sess.queue.length, sess.ok);
    $("result-title").textContent = sess.mode === "bonus" ? "보너스 결과" : "오늘 결과";
    $("score").textContent = sess.ok + "/" + sess.queue.length;
    var gb = $("result-grad"), wb = $("result-wrong");
    gb.classList.toggle("hidden", sess.gradList.length === 0);
    wb.classList.toggle("hidden", sess.wrongList.length === 0);
    $("grad-chips").innerHTML = sess.gradList.map(chipHtml).join("");
    $("wrong-chips").innerHTML = sess.wrongList.map(chipHtml).join("");
    sess = null;
    show("view-result");
  }
  function chipHtml(ch) {
    var c = byCh[ch];
    return '<span class="chip"><span class="g">' + c.ch + "</span>" + huneumOf(c) + "</span>";
  }

  function renderTable() {
    $("table-grid").innerHTML = DATA.chars.map(function (c) {
      var rec = S.p[c.ch];
      var s = !rec ? "⬜" : (rec.g ? "🎓" : "🔁");
      return '<div class="tcell"><div class="g">' + c.ch + '</div>' +
        '<div class="h">' + huneumOf(c) + '</div><div class="s">' + s + "</div></div>";
    }).join("");
    show("view-table");
  }

  // ---------- 초기화 ----------
  function init() {
    document.title = CFG.title;
    $("app-title").textContent = CFG.title;
    $("app-subtitle").textContent = CFG.subtitle;
    var back = $("back-link");
    back.href = CFG.back;
    back.textContent = CFG.backLabel;

    $("btn-start").addEventListener("click", function () {
      var t = todayStr();
      if (S.days[t] && S.days[t].done) startBonus(); else startDaily();
    });
    $("btn-table").addEventListener("click", renderTable);
    $("btn-table-back").addEventListener("click", function (e) { e.preventDefault(); renderHome(); });
    $("btn-intro-next").addEventListener("click", function () {
      sess.introIdx++;
      if (sess.introIdx < sess.introQueue.length) renderIntro();
      else { buildQueue(); renderQuestion(); }
    });
    $("btn-next").addEventListener("click", next);
    $("btn-home").addEventListener("click", renderHome);
    renderHome();
  }
  init();
})();
