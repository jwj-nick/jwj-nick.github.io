// Voca Vault 엔진 v1 — 한자 나라(hanja-v2) 포크: SR 코어·보관함·백업·이펙트·테마 계승, 영어 데이터 모델·데일리 알고리즘은 신규.
// 규칙의 정본: 20_design/daily-algorithm.md · 포크 범위: 20_design/engine-fork-plan.md. 빌드 없음, 전역은 window.APP_CONFIG 하나.
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;
  var A = CFG.algo;
  var KEY = CFG.ns + ".v1";
  var MODULES = ["word", "idiom", "expr"];
  var FILES = { word: "words.json", idiom: "idioms.json", expr: "expressions.json" };
  var TYPE_LABEL = { meaning: "뜻 고르기", reverse: "단어 고르기", blank: "빈칸 채우기", dictation: "듣고 쓰기" };

  var ITEMS = [];        // 전 항목 (band, rank 순)
  var byId = {};
  var byModule = { word: [], idiom: [], expr: [] };
  var MANIFEST = { items: {} };
  var S = null;
  var sess = null;

  // ---------- 데이터 로드 ----------
  function loadJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("fetch fail: " + url); return r.json(); });
  }
  function loadAllData() {
    var base = "content/" + CFG.track + "/";
    return Promise.all(MODULES.map(function (m) {
      return loadJSON(base + FILES[m]).catch(function () { return { items: [] }; });
    }).concat([loadJSON(base + "audio-manifest.json").catch(function () { return { items: {} }; })])).then(function (loaded) {
      MANIFEST = loaded.pop() || { items: {} };
      ITEMS = [];
      loaded.forEach(function (doc) { (doc.items || []).forEach(function (it) { ITEMS.push(it); }); });
      ITEMS.sort(function (a, b) { return a.band - b.band || a.rank - b.rank || (a.id < b.id ? -1 : 1); });
      ITEMS.forEach(function (it) { byId[it.id] = it; byModule[it.module].push(it); });
    });
  }

  // ---------- 상태 ----------
  function freshState() {
    return {
      v: 1, track: CFG.track, startBand: CFG.defaultBand || 1, placed: false,
      items: {}, known: {}, seen: {}, saved: [], days: {}, lastDone: null, streakDays: 0,
      settings: { accent: CFG.defaultAccent || "us", dailyNew: A.dailyNew, auto: true }
    };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) {
        var f = freshState();
        Object.keys(f).forEach(function (k) { if (s[k] === undefined) s[k] = f[k]; });
        s.settings = Object.assign(f.settings, s.settings || {});
        migrateGrad(s);
        return s;
      }
    } catch (e) {}
    return freshState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ---------- 날짜 ----------
  function fmt(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function todayStr() { return fmt(new Date()); }
  function addDays(dateStr, n) {
    var p = dateStr.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return fmt(d);
  }
  function dayRec(t) {
    var d = S.days[t] = S.days[t] || {};
    if (!d.newStats) d.newStats = { shown: 0, unknown: 0 };
    return d;
  }

  // ---------- DOM 유틸 ----------
  function $(id) { return document.getElementById(id); }
  function shuffle(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
    return arr;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var VIEWS = ["view-home", "view-place", "view-card", "view-quiz", "view-result", "view-list", "view-search", "view-detail", "view-settings"];
  function show(id) {
    VIEWS.forEach(function (v) { var el = $(v); if (el) el.classList.toggle("hidden", v !== id); });
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function pushView(kind, extra) {
    try { history.pushState(Object.assign({ kind: kind }, extra || {}), "", location.href); } catch (e) {}
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---------- 동적 레이어 (한자 나라 v3.2 계승) — 모션·사운드·햅틱·파티클, 전부 환경 가드 ----------
  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  var canFx = !!(window.requestAnimationFrame && document.body);
  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
  function themeColor(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; }
  }
  var SOUND_KEY = "voca.sound";
  var soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) {}
  var audioCtx = null;
  function ac() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) { try { audioCtx = new AC(); } catch (e) { return null; } }
    if (audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
    return audioCtx;
  }
  function tone(freq, dur, type, gain, delay) {
    if (!soundOn) return;
    var ctx = ac(); if (!ctx) return;
    try {
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  function sfxCorrect(combo) { var m = 1 + Math.min(combo || 0, 8) * 0.06; tone(660 * m, 0.09, "triangle", 0.10); tone(880 * m, 0.12, "triangle", 0.10, 0.07); }
  function sfxWrong() { tone(170, 0.18, "square", 0.05); }
  function sfxStamp() { tone(90, 0.25, "sine", 0.22); tone(55, 0.3, "sine", 0.18, 0.02); }
  function sfxFanfare() { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, "triangle", 0.1, i * 0.09); }); }
  function syncSoundIcon() { $("snd-on").style.display = soundOn ? "" : "none"; $("snd-off").style.display = soundOn ? "none" : ""; }
  var fxCanvas = null, fxCtx2d = null, fxParts = [], fxRunning = false;
  function fxEnsure() {
    if (fxCanvas) return true;
    if (!canFx || reducedMotion()) return false;
    fxCanvas = document.createElement("canvas");
    fxCanvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;";
    document.body.appendChild(fxCanvas);
    fxCtx2d = fxCanvas.getContext("2d");
    return !!fxCtx2d;
  }
  function fxTick() {
    fxCtx2d.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    fxParts = fxParts.filter(function (p) { return p.life > 0; });
    if (fxParts.length === 0) { fxRunning = false; return; }
    fxParts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.life -= 0.022;
      fxCtx2d.globalAlpha = Math.max(p.life, 0); fxCtx2d.fillStyle = p.c;
      fxCtx2d.beginPath(); fxCtx2d.arc(p.x, p.y, Math.max(p.r * p.life, 0.1), 0, Math.PI * 2); fxCtx2d.fill();
    });
    fxCtx2d.globalAlpha = 1;
    window.requestAnimationFrame(fxTick);
  }
  function fxAt(target, colors, n, power) {
    if (!target || !target.getBoundingClientRect || !fxEnsure()) return;
    fxCanvas.width = window.innerWidth; fxCanvas.height = window.innerHeight;
    var r = target.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (power || 5);
      fxParts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.2, r: 2 + Math.random() * 3.5, c: colors[i % colors.length], life: 1 });
    }
    if (!fxRunning) { fxRunning = true; window.requestAnimationFrame(fxTick); }
  }
  function fxColors() { return [themeColor("--red", "#D64545"), themeColor("--ok", "#2E9E6B"), themeColor("--gold", "#D9A62E"), themeColor("--sky", "#3B6FE0")]; }
  function updateCombo() {
    var b = $("combo-badge"), c = (sess && sess.combo) || 0;
    if (c >= 2) { b.textContent = "콤보 ×" + c; b.classList.remove("hidden"); b.classList.remove("pop"); void (b.offsetWidth); b.classList.add("pop"); }
    else b.classList.add("hidden");
    $("prog-fill").classList.toggle("fire", c >= 5);
  }
  function bindTilt(id) {
    var t = $(id);
    function move(x, y) {
      if (!t.getBoundingClientRect) return;
      var r = t.getBoundingClientRect();
      var dx = (x - r.left) / r.width - 0.5, dy = (y - r.top) / r.height - 0.5;
      t.style.transform = "perspective(700px) rotateX(" + (-dy * 6).toFixed(2) + "deg) rotateY(" + (dx * 6).toFixed(2) + "deg)";
    }
    function reset() { t.style.transform = ""; }
    t.addEventListener("touchmove", function (e) { if (!canFx || reducedMotion()) return; var p = e.touches && e.touches[0]; if (p) move(p.clientX, p.clientY); }, { passive: true });
    t.addEventListener("touchend", reset);
    t.addEventListener("mousemove", function (e) { if (!canFx || reducedMotion()) return; move(e.clientX, e.clientY); });
    t.addEventListener("mouseleave", reset);
  }
  function animateScore(target, ok, total) {
    if (!window.requestAnimationFrame || reducedMotion()) { target.textContent = ok + "/" + total; return; }
    var t0 = null;
    function step(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 600, 1); target.textContent = Math.round(ok * (p * (2 - p))) + "/" + total; if (p < 1) window.requestAnimationFrame(step); }
    window.requestAnimationFrame(step);
  }
  function playGradSequence(word) {
    sfxFanfare(); buzz([30, 50, 120]);
    if (!canFx || reducedMotion()) return;
    var ov = $("grad-overlay");
    $("go-word").textContent = word;
    ov.classList.remove("hidden"); ov.classList.remove("play"); void (ov.offsetWidth); ov.classList.add("play");
    setTimeout(function () { fxAt($("go-word"), fxColors().concat(["#FFFFFF"]), 34, 8); sfxStamp(); buzz(80); }, 450);
    setTimeout(function () { ov.classList.add("hidden"); }, 1800);
  }
  // 테마 — 라이트/다크 2종 (해금 없음). 초기 적용은 index.html 헤드.
  var THEME_META = { light: "#F4F1EA", dark: "#0F1729" };
  var rootEl = document.documentElement || null;
  function currentTheme() { return rootEl ? (rootEl.getAttribute("data-theme") || "light") : "light"; }
  function applyTheme(mode, persist) {
    if (!rootEl) return;
    rootEl.setAttribute("data-theme", mode);
    var meta = $("meta-theme-color"); if (meta) meta.setAttribute("content", THEME_META[mode] || THEME_META.light);
    $("tt-sun").style.display = mode === "light" ? "none" : "";
    $("tt-moon").style.display = mode === "light" ? "" : "none";
    if (persist) { try { localStorage.setItem("voca.theme", mode); } catch (e) {} }
  }

  // ---------- 오디오 층 (신규) — 사전 생성 mp3 우선, 없으면 기기 TTS(Web Speech) ----------
  var player = null, playingBtn = null, unlocked = false;
  function audioFile(id, key) {
    var m = MANIFEST.items && MANIFEST.items[id];
    var f = m && m.files && m.files[key];
    return f ? "content/" + CFG.track + "/" + f.file : null;
  }
  function unlockAudio() { // iOS: 첫 사용자 제스처에서 재생을 한 번 열어 두면 이후 자동 재생이 허용된다
    if (unlocked) return;
    unlocked = true;
    try {
      player = player || new Audio();
      player.src = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";
      var p = player.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  var voicesCache = null;
  function pickVoice(lang) {
    if (!window.speechSynthesis) return null;
    if (!voicesCache || !voicesCache.length) voicesCache = speechSynthesis.getVoices();
    var want = lang.toLowerCase();
    var vs = voicesCache.filter(function (v) { return (v.lang || "").replace("_", "-").toLowerCase() === want; });
    if (!vs.length) vs = voicesCache.filter(function (v) { return (v.lang || "").toLowerCase().indexOf(want.split("-")[0]) === 0; });
    var pref = vs.filter(function (v) { return /Google|Samantha|Daniel|Karen|Moira|Serena|Natural|Premium|Enhanced/i.test(v.name); });
    return (pref[0] || vs[0] || null);
  }
  function speak(text, accent) {
    if (!window.speechSynthesis) return false;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = accent === "uk" ? "en-GB" : "en-US";
      u.rate = 0.9;
      var v = pickVoice(u.lang); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function setPlaying(btn, on) {
    if (playingBtn && playingBtn !== btn) playingBtn.classList.remove("playing");
    playingBtn = on ? btn : null;
    if (btn) btn.classList.toggle("playing", !!on);
  }
  function play(id, key, text, accent, btn) {
    var src = audioFile(id, key);
    if (src) {
      try {
        player = player || new Audio();
        player.onended = function () { setPlaying(btn, false); };
        player.onerror = function () { setPlaying(btn, false); speak(text, accent); };
        player.src = src;
        setPlaying(btn, true);
        var p = player.play(); if (p && p.catch) p.catch(function () { setPlaying(btn, false); speak(text, accent); });
      } catch (e) { speak(text, accent); }
    } else {
      setPlaying(btn, true);
      speak(text, accent);
      setTimeout(function () { setPlaying(btn, false); }, 900);
    }
  }
  function audioButtons(container, id, keyBase, text, compact) {
    container.innerHTML = "";
    ["us", "uk"].forEach(function (acc) {
      var key = keyBase + "." + acc;
      var has = !!audioFile(id, key);
      var b = el("button", "abtn " + acc + (has ? "" : " fallback"));
      b.type = "button";
      b.innerHTML = (acc === "us" ? "🇺🇸" : "🇬🇧") + (compact ? "" : " " + acc.toUpperCase()) + (has ? "" : " ·");
      b.title = has ? (acc === "us" ? "미국식 발음" : "영국식 발음") : "기기 음성으로 읽어요";
      b.addEventListener("click", function (e) { e.stopPropagation(); unlockAudio(); play(id, key, text, acc, b); });
      container.appendChild(b);
    });
  }
  function preload(ids) { // 오늘 세트의 파일을 미리 캐시 (SW가 mp3는 캐시 우선)
    try {
      ids.slice(0, 20).forEach(function (id) {
        ["word.us", "word.uk", "ex0.us", "ex0.uk"].forEach(function (k) { var f = audioFile(id, k); if (f) fetch(f, { mode: "no-cors" }).catch(function () {}); });
      });
    } catch (e) {}
  }

  // ---------- 항목 상태 ----------
  function rec(id) { return S.items[id] || null; }
  function isVault(id) { var r = rec(id); return !!r && !r.g; }
  function isGrad(id) { var r = rec(id); return !!r && !!r.g; }
  function isSeen(id) { return !!(S.seen[id] || S.items[id] || S.known[id]); }
  function vaultIds() { return Object.keys(S.items).filter(function (id) { return byId[id] && !S.items[id].g; }); }
  function gradIds() { return Object.keys(S.items).filter(function (id) { return byId[id] && S.items[id].g; }); }
  function toVault(id, t, dueIn) { S.items[id] = { s: 0, due: addDays(t, dueIn === undefined ? 1 : dueIn), g: false }; delete S.known[id]; S.seen[id] = S.seen[id] || t; }
  // ---- 졸업 후 장기 점검 (결정 #28) ----
  // 졸업은 끝이 아니라 "간격이 크게 벌어진 상태"다. gs = 통과한 장기 점검 횟수,
  // due = 다음 점검일. 마지막 단계를 통과하면 due=null이 되어 진짜로 끝난다.
  function gradIntervals() { var g = A.gradDays; return (g && g.length) ? g : [30, 90]; }
  function gradDue(t, stage) { var g = gradIntervals(); return stage < g.length ? addDays(t, g[stage]) : null; }
  function recallDue(set, t) {
    return (set.G || []).filter(function (id) { return isGrad(id) && S.items[id].due && S.items[id].due <= t; });
  }
  // 장기 점검 도입 이전에 졸업한 항목은 due가 비어 있어 영영 안 나온다. 되살리되
  // 같은 날 한꺼번에 몰리지 않도록 1일차부터 1단계 간격까지 고르게 펼친다.
  // gs가 있으면 손대지 않는다 — 마지막 단계를 통과해 due=null이 된 항목과 구분하는 표식이다.
  function migrateGrad(st) {
    var items = st && st.items; if (!items) return 0;
    var ids = Object.keys(items).filter(function (id) {
      return items[id] && items[id].g && !items[id].due && items[id].gs === undefined;
    }).sort();
    if (!ids.length) return 0;
    var iv = gradIntervals()[0] || 30, t0 = todayStr();
    ids.forEach(function (id, i) { items[id].gs = 0; items[id].due = addDays(t0, 1 + (i % iv)); });
    return ids.length;
  }
  function stateLabel(id, t) {
    var r = rec(id);
    if (r && r.g) return { cls: "grad", text: !r.due ? "졸업 ✓ 완료"
      : r.due <= t ? "졸업 · 오늘 복습" : "졸업 · " + r.due.slice(5).replace("-", "/") + " 복습" };
    if (r) return r.due <= t ? { cls: "due", text: "오늘 재시험" } : { cls: "soon", text: r.due.slice(5).replace("-", "/") + " 재시험" };
    if (S.known[id]) return { cls: "", text: "안다 (점검 " + S.known[id].slice(5).replace("-", "/") + ")" };
    return { cls: "", text: "" };
  }

  // ---------- 오늘 세트 — buildToday (daily-algorithm.md §3) ----------
  function newCount(t) {
    var base = S.settings.dailyNew || A.dailyNew;
    if (vaultIds().length > A.vaultCap) return 0;
    var shown = 0, unk = 0;
    for (var i = 1; i <= 3; i++) { var d = S.days[addDays(t, -i)]; if (d && d.newStats) { shown += d.newStats.shown; unk += d.newStats.unknown; } }
    if (shown >= 6) {
      var p = unk / shown;
      if (p > 0.5) base = Math.max(A.newMin, base - 2);
      else if (p < 0.2) base = Math.min(A.newMax, base + 2);
    }
    return base;
  }
  function exprUnlocked() {
    var rule = CFG.mixUnlock && CFG.mixUnlock.expr;
    if (!rule) return true;
    var nextWord = byModule.word.filter(function (it) { return it.band >= Math.max(S.startBand || 1, CFG.dailyMinBand || 1) && !isSeen(it.id); })[0];
    var band = nextWord ? nextWord.band : 9;
    return Math.max(band, S.startBand) >= rule.fromBand;
  }
  // blendBands에 든 구간은 한 묶음으로 섞어 내보낸다 (결정 #23).
  // 그렇지 않으면 band 3을 400개 다 끝낸 뒤에야 band 4가 나와서 두 달 넘게 한 구간만 돈다.
  // band 라벨 자체는 남겨야 quizUnlock(받아쓰기 fromBand 4)이 동작한다.
  function orderedPool(list) {
    var blend = CFG.blendBands || [];
    if (!blend.length) return list;
    var byBand = {};
    list.forEach(function (it) { (byBand[it.band] = byBand[it.band] || []).push(it); });
    var bands = Object.keys(byBand).map(Number).sort(function (a, b) { return a - b; });
    var out = [], groups = [], at = -1;
    bands.forEach(function (b) {
      if (blend.indexOf(b) >= 0) { if (at < 0) at = out.length; groups.push(byBand[b]); }
      else out = out.concat(byBand[b]);
    });
    if (!groups.length) return out;
    var rr = [];
    for (var i = 0; ; i++) {
      var any = false;
      for (var j = 0; j < groups.length; j++) if (i < groups[j].length) { rr.push(groups[j][i]); any = true; }
      if (!any) break;
    }
    return out.slice(0, at < 0 ? out.length : at).concat(rr, out.slice(at < 0 ? out.length : at));
  }
  function pickNew(n) {
    if (n <= 0) return [];
    // dailyMinBand 아래(초등·문법어)는 어떤 상태에서도 데일리 신규로 나오지 않는다 —
    // 예전 저장 상태의 startBand가 낮아도 마찬가지. 검색으로는 여전히 담을 수 있다.
    var floor = Math.max(S.startBand || 1, CFG.dailyMinBand || 1);
    var queues = {};
    MODULES.forEach(function (m) {
      queues[m] = orderedPool(byModule[m].filter(function (it) { return it.band >= floor && !isSeen(it.id); }));
    });
    if (!exprUnlocked()) queues.expr = [];
    var mix = CFG.mix || { word: 1, idiom: 0, expr: 0 };
    var order = [];
    var cycle = MODULES.reduce(function (acc, m) { return acc + (mix[m] || 0); }, 0) || 1;
    while (order.length < n && (queues.word.length || queues.idiom.length || queues.expr.length)) {
      var before = order.length;
      MODULES.forEach(function (m) {
        for (var k = 0; k < (mix[m] || 0) && order.length < n; k++) { if (queues[m].length) order.push(queues[m].shift().id); }
      });
      if (order.length === before) { // mix가 전부 0인 모듈만 남음 → 단어 우선으로 채움
        MODULES.forEach(function (m) { while (queues[m].length && order.length < n) order.push(queues[m].shift().id); });
      }
      if (cycle === 0) break;
    }
    return order;
  }
  function buildToday(t) {
    var d = dayRec(t);
    if (d.set) return d.set;
    var R = vaultIds().filter(function (id) { return S.items[id].due <= t; })
      .sort(function (a, b) {
        var sa = S.saved.indexOf(a) >= 0 ? 0 : 1, sb = S.saved.indexOf(b) >= 0 ? 0 : 1;
        return sa - sb || (S.items[a].due < S.items[b].due ? -1 : S.items[a].due > S.items[b].due ? 1 : 0);
      }).slice(0, A.rMax);
    var Sp = Object.keys(S.known).filter(function (id) { return byId[id] && S.known[id] <= t; }).sort().slice(0, A.sMax);
    // 졸업 후 장기 점검 — 오래 밀린 것부터, gMax개까지. 상한이 있어서 밀린 걸 하루에 몰아 주지 않는다.
    var G = gradIds().filter(function (id) { var g = S.items[id]; return g.due && g.due <= t; })
      .sort(function (a, b) { return S.items[a].due < S.items[b].due ? -1 : S.items[a].due > S.items[b].due ? 1 : 0; })
      .slice(0, A.gMax || 0);
    var N = pickNew(newCount(t));
    var over = R.length + Sp.length + G.length + N.length - A.totalMax;
    if (over > 0) N = N.slice(0, Math.max(0, N.length - over));
    d.set = { R: R, S: Sp, G: G, N: N };
    d.done = false;
    save();
    return d.set;
  }
  function dueVaultCount(t) { return vaultIds().filter(function (id) { return S.items[id].due <= t; }).length; }

  // ---------- 문제 생성 ----------
  // reject = 오답 후보에서 빼야 할 항목 판정. 보기가 영어 단어인 형식(reverse·blank)에서
  // 뜻이 같은 단어가 오답으로 섞이면 정답이 둘이 된다 — mid 16쌍·high 30쌍이 실제로 있다.
  function distractors(it, n, field, reject) {
    var same = ITEMS.filter(function (x) { return x.id !== it.id && x.module === it.module && x.band === it.band && x.pos === it.pos; });
    var mod = ITEMS.filter(function (x) { return x.id !== it.id && x.module === it.module; });
    var pool = shuffle(same).concat(shuffle(mod)).concat(shuffle(ITEMS));
    var out = [], seen = {};
    var ansVal = field(it);
    seen[ansVal] = true;
    for (var i = 0; i < pool.length && out.length < n; i++) {
      var v = field(pool[i]);
      if (!v || seen[v] || pool[i].id === it.id) continue;
      if (reject && reject(pool[i])) continue;
      seen[v] = true; out.push(v);
    }
    return out;
  }
  function koOf(it) { return it.ko[0]; }
  function koFull(it) { return it.ko.join(" · "); }
  function headOf(x) { return x.head; }
  function meaningClash(it) {
    var set = {};
    (it.ko || []).forEach(function (k) { set[k] = 1; });
    return function (x) { return (x.ko || []).some(function (k) { return set[k]; }); };
  }
  function maskExample(it) {
    var ex = it.examples && it.examples[0]; if (!ex) return null;
    var cands = [it.head].concat(it.forms || []).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i].replace(/[.!?]+$/, "");
      var re = new RegExp("(^|[^A-Za-z'])(" + c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z'])", "i");
      var m = re.exec(ex.en);
      if (m) return { before: ex.en.slice(0, m.index + m[1].length), hit: m[2], after: ex.en.slice(m.index + m[1].length + m[2].length), ko: ex.ko };
    }
    return null;
  }
  function dictationAvailable(it) {
    if (it.module === "expr") return false;
    var rule = CFG.quizUnlock && CFG.quizUnlock.dictation;
    if (rule && it.band < rule.fromBand) return false;
    return !!(audioFile(it.id, "word.us") || audioFile(it.id, "word.uk") || window.speechSynthesis);
  }
  // 산출형 = 우리말·문맥·소리에서 영어를 스스로 떠올리는 형식. meaning(뜻 고르기)만 인식형이다.
  var PRODUCTIVE = { reverse: 1, blank: 1, dictation: 1 };
  function pickType(it, r, purpose) {
    if (purpose === "check" || purpose === "place") return "meaning";
    var types = (CFG.quizTypes || ["meaning"]).slice();
    if (dictationAvailable(it)) types.push("dictation");
    if (it.module === "expr") types = types.filter(function (x) { return x === "meaning" || x === "reverse"; });
    if (types.indexOf("blank") >= 0 && !maskExample(it)) types = types.filter(function (x) { return x !== "blank"; });
    // 졸업이 걸린 문항(s=1 → 맞히면 졸업)과 졸업 후 장기 점검은 산출형으로 낸다.
    // 뜻 고르기만으로 졸업하면 "보면 아는" 단계에서 학습이 끝난다.
    if (r && (r.s === 1 || purpose === "recall")) {
      var prod = types.filter(function (x) { return PRODUCTIVE[x]; });
      if (prod.length) types = prod;
    }
    // 형식 다양성 — 같은 형식으로 두 번 맞혀 졸업하지 않게
    if (r && r.lt && types.length > 1) {
      var diff = types.filter(function (x) { return x !== r.lt; });
      if (diff.length) types = diff;
    }
    return types[Math.floor(Math.random() * types.length)];
  }
  function buildQuestion(id, purpose) {
    var it = byId[id], r = rec(id);
    var type = pickType(it, r, purpose);
    var q = { id: id, type: type, purpose: purpose, band: it.band };
    if (type === "meaning") {
      q.prompt = it.head; q.promptCls = it.module === "expr" ? "sentence" : ""; q.answer = koOf(it);
      q.opts = shuffle(distractors(it, 3, koOf).concat([q.answer])); q.optCls = "";
      q.audio = true;
    } else if (type === "reverse") {
      // 뜻을 전부 보여준다 — ko[0]만 쓰면 "포함하다"처럼 여러 단어가 공유하는 뜻에서 문제가 모호해진다.
      q.prompt = koFull(it); q.promptCls = "ko"; q.sub = posLabel(it); q.answer = it.head;
      q.opts = shuffle(distractors(it, 3, headOf, meaningClash(it)).concat([q.answer])); q.optCls = "en";
    } else if (type === "blank") {
      var m = maskExample(it);
      q.masked = m; q.prompt = ""; q.promptCls = "sentence"; q.sub = m.ko; q.answer = it.head;
      q.opts = shuffle(distractors(it, 3, headOf, meaningClash(it)).concat([q.answer])); q.optCls = "en";
    } else { // dictation
      q.prompt = "🔊"; q.promptCls = ""; q.sub = "들리는 단어를 입력하세요"; q.answer = it.head; q.input = true; q.audio = true; q.autoplay = true;
    }
    return q;
  }
  function normAns(s) { return String(s || "").toLowerCase().replace(/[^a-z' ]/g, "").replace(/\s+/g, " ").trim(); }

  // ---------- 세션 ----------
  function newSession(mode, t) {
    return { mode: mode, t: t, cards: [], cardIdx: 0, cardResults: [], queue: [], idx: 0, ok: 0, combo: 0, wrongList: [], gradList: [], placeStats: {} };
  }
  function startDaily() {
    var t = todayStr(), set = buildToday(t);
    var d = dayRec(t);
    if (d.done && !set.N.length && !set.R.length && !set.S.length) { renderHome(); return; }
    sess = newSession("daily", t);
    if (!d.done) {
      sess.cards = set.N.filter(function (id) { return !isSeen(id); }); // 이어하기: 이미 판정한 카드는 건너뜀
    }
    sess.pendingIds = set.R.filter(function (id) { return isVault(id) && S.items[id].due <= t; })
      .map(function (id) { return { id: id, purpose: "retest" }; })
      .concat(set.S.filter(function (id) { return S.known[id] && S.known[id] <= t; }).map(function (id) { return { id: id, purpose: "spot" }; }))
      .concat(recallDue(set, t).map(function (id) { return { id: id, purpose: "recall" }; }));
    if (!sess.cards.length && !sess.pendingIds.length) { finishDay(t); renderHome(); return; }
    preload(set.N.concat(set.R));
    pushView("session");
    if (sess.cards.length) renderCard(); else { buildQuizQueue(); renderQuestion(); }
  }
  function buildQuizQueue() {
    var qs = [];
    sess.cardResults.forEach(function (cr) { qs.push(buildQuestion(cr.id, "check")); });
    sess.pendingIds.forEach(function (p) { qs.push(buildQuestion(p.id, p.purpose)); });
    sess.queue = shuffle(qs); sess.idx = 0;
  }
  function startVaultReview() {
    var t = todayStr();
    var due = vaultIds().filter(function (id) { return S.items[id].due <= t; });
    var ids = due.length ? due : vaultIds();
    ids = shuffle(ids).slice(0, 10);
    if (!ids.length) { renderList("vault"); return; }
    sess = newSession("vault", t);
    sess.pendingIds = ids.map(function (id) { return { id: id, purpose: due.length ? "retest" : "practice" }; });
    buildQuizQueue();
    pushView("session");
    renderQuestion();
  }

  // ---------- 새 단어 카드 ----------
  var POS_KO = { n: "명사", v: "동사", adj: "형용사", adv: "부사", prep: "전치사", conj: "접속사",
                 pron: "대명사", det: "관사·한정사", interj: "감탄사", num: "수사", phr: "" };
  function posLabel(it) {
    if (it.module === "idiom") return "숙어";
    if (it.module === "expr") return "표현";
    return POS_KO[it.pos] || it.pos;
  }
  function fillWordCard(prefix, it) {
    $(prefix + "-pos").textContent = posLabel(it);
    $(prefix + "-band").textContent = (CFG.bands && CFG.bands[String(it.band)]) || ("band " + it.band);
    var h = $(prefix + "-head"); h.textContent = it.head; h.classList.toggle("long", it.head.length > 14);
    var ipa = $(prefix + "-ipa");
    if (it.ipa && it.ipa.us && it.ipa.us !== "-") {
      ipa.innerHTML = '<span class="us"><b>US</b>/' + esc(it.ipa.us) + '/</span>' + (it.ipa.uk && it.ipa.uk !== it.ipa.us ? '<span class="uk"><b>UK</b>/' + esc(it.ipa.uk) + '/</span>' : "");
      ipa.classList.remove("hidden");
    } else { ipa.innerHTML = ""; ipa.classList.add("hidden"); }
    audioButtons($(prefix + "-audio"), it.id, "word", it.head);
    $(prefix + "-ko").textContent = it.ko.join(" · ");
    // note = 동음이의·강세·영국 철자·구문 틀 사용법 (결정 #18에서 넣어 두고 렌더가 빠져 있던 필드)
    var noteBox = $(prefix + "-note");
    if (noteBox) {
      noteBox.textContent = it.note || "";
      noteBox.classList.toggle("hidden", !it.note);
    }
    var exBox = $(prefix + "-ex"); exBox.innerHTML = "";
    (it.examples || []).slice(0, 1).forEach(function (ex, n) {
      var m = maskExample(it);
      var en = el("div", "en");
      if (m) en.innerHTML = esc(m.before) + "<mark>" + esc(m.hit) + "</mark>" + esc(m.after); else en.textContent = ex.en;
      var ko = el("div", "ko", ex.ko);
      var ab = el("div", "wc-audio");
      audioButtons(ab, it.id, "ex" + n, ex.en, true);
      exBox.appendChild(en); exBox.appendChild(ko); exBox.appendChild(ab);
    });
  }
  function renderCard() {
    var id = sess.cards[sess.cardIdx], it = byId[id];
    $("card-fill").style.width = Math.round((sess.cardIdx / sess.cards.length) * 100) + "%";
    $("card-label").textContent = "오늘의 새 단어 " + (sess.cardIdx + 1) + "/" + sess.cards.length;
    fillWordCard("wc", it);
    show("view-card");
    if (S.settings.auto && unlocked) setTimeout(function () { var b = $("wc-audio").querySelector(".abtn." + S.settings.accent); if (b) b.click(); }, 250);
  }
  function judgeCard(known) {
    unlockAudio();
    var id = sess.cards[sess.cardIdx], t = sess.t, d = dayRec(t);
    d.newStats.shown++;
    if (known) { S.known[id] = addDays(t, A.knownDays); S.seen[id] = t; sfxCorrect(0); }
    else { toVault(id, t, 1); d.newStats.unknown++; tone(330, 0.1, "sine", 0.06); }
    sess.cardResults.push({ id: id, known: known });
    save();
    sess.cardIdx++;
    if (sess.cardIdx < sess.cards.length) renderCard();
    else { buildQuizQueue(); if (sess.queue.length) renderQuestion(); else finishSession(); }
  }

  // ---------- 퀴즈 렌더 ----------
  function renderQuestion() {
    var q = sess.queue[sess.idx], it = byId[q.id];
    var total = sess.queue.length;
    $("prog-fill").style.width = Math.round((sess.idx / total) * 100) + "%";
    var label = sess.mode === "place" ? "실력 체크" : sess.mode === "vault" ? "보관함 재시험" : "오늘의 퀴즈";
    $("quiz-label").textContent = label + " " + (sess.idx + 1) + "/" + total + (q.purpose === "check" ? " · 오늘 배운 단어" : q.purpose === "spot" ? " · 점검"
       : q.purpose === "recall" ? " · 졸업 단어 복습" : "");
    $("q-type").textContent = TYPE_LABEL[q.type] || "";
    var p = $("q-prompt"); p.className = "q-prompt " + (q.promptCls || "");
    if (q.type === "blank") {
      p.innerHTML = esc(q.masked.before) + '<span class="blank"></span>' + esc(q.masked.after);
    } else p.textContent = q.prompt;
    $("q-sub").textContent = q.sub || "";
    var qa = $("q-audio"); qa.innerHTML = "";
    if (q.audio && q.type !== "blank") audioButtons(qa, it.id, "word", it.head, true);
    if (q.autoplay) setTimeout(function () { var b = qa.querySelector(".abtn." + S.settings.accent); if (b) b.click(); }, 200);
    var opts = $("opts"); opts.innerHTML = "";
    var ab = $("answer-box");
    if (q.input) {
      ab.classList.remove("hidden"); opts.classList.add("hidden");
      $("answer-input").value = ""; $("answer-input").disabled = false; $("btn-check").disabled = false;
      setTimeout(function () { try { $("answer-input").focus(); } catch (e) {} }, 100);
    } else {
      ab.classList.add("hidden"); opts.classList.remove("hidden");
      q.opts.forEach(function (o) {
        var b = el("button", "opt " + (q.optCls || ""), o); b.type = "button";
        b.addEventListener("click", function () { answer(q, o, b); });
        opts.appendChild(b);
      });
    }
    $("feedback").innerHTML = "";
    $("btn-next").classList.add("hidden");
    updateCombo();
    show("view-quiz");
  }
  function answer(q, chosen, btn) {
    unlockAudio();
    var correct = q.input ? normAns(chosen) === normAns(q.answer) : chosen === q.answer;
    var fb = grade(q, correct);
    if (correct) { sess.ok++; sess.combo++; sfxCorrect(sess.combo); buzz(18); if (btn) fxAt(btn, fxColors(), 14 + Math.min(sess.combo, 8) * 2, 5); }
    else { sess.combo = 0; sfxWrong(); buzz([40, 30, 40]); }
    updateCombo(); bumpHeat(q.t);
    var it = byId[q.id];
    if (q.input) {
      $("answer-input").disabled = true; $("btn-check").disabled = true;
    } else {
      Array.prototype.forEach.call($("opts").children, function (b) {
        b.disabled = true;
        if (b.textContent === q.answer) b.classList.add("ok");
        else if (b === btn) b.classList.add("bad");
      });
    }
    var ansLine = (!correct || q.input) ? ' <span class="ans">' + esc(it.head) + '</span> — ' + esc(it.ko[0]) : "";
    $("feedback").innerHTML = (correct ? fb : "오답 · " + fb) + (correct && !q.input ? "" : ansLine);
    if (!correct && q.type !== "meaning") { var qa = $("q-audio"); if (!qa.children.length) audioButtons(qa, it.id, "word", it.head, true); }
    $("btn-next").classList.remove("hidden");
    if (correct && sess.combo >= 2 && !q.input && sess.mode !== "place") setTimeout(next, 650); // 콤보 중엔 자동 진행
  }
  function next() {
    if (!sess || $("btn-next").classList.contains("hidden")) return;
    sess.idx++;
    if (sess.idx < sess.queue.length) renderQuestion(); else finishSession();
  }

  // ---------- 채점 (SR 규칙: 한자 나라 v1부터 불변 — 다른 날 2회 정답 졸업, 오답 리셋+내일) ----------
  function grade(q, correct) {
    var t = sess.t, id = q.id, it = byId[id];
    if (q.purpose === "place") {
      var ps = sess.placeStats[q.band] = sess.placeStats[q.band] || { ok: 0, n: 0 };
      ps.n++; if (correct) ps.ok++;
      return correct ? "정답!" : "괜찮아요";
    }
    if (q.purpose === "practice") return correct ? "정답!" : "다시 볼게요";
    if (q.purpose === "check") {
      if (correct) return "정답!";
      if (S.known[id]) { toVault(id, t, 1); pushWrong(it); return "보관함으로 — 내일 다시"; }
      pushWrong(it); return "보관함에 있어요 — 내일 다시";
    }
    if (q.purpose === "spot") {
      if (correct) { delete S.known[id]; save(); return "점검 통과 ✓ 진짜 아는 단어"; }
      toVault(id, t, 1); pushWrong(it); save(); return "보관함으로 — 내일 다시";
    }
    if (q.purpose === "recall") { // 졸업 후 장기 점검 — 통과하면 다음 단계로, 틀리면 보관함으로 되돌린다
      var gr = S.items[id] || (S.items[id] = { s: 2, due: null, g: true, gs: 0 });
      if (correct) {
        gr.gs = (gr.gs || 0) + 1; gr.lt = q.type; gr.due = gradDue(t, gr.gs); save();
        return gr.due ? "아직 기억하고 있어요 ✓ 졸업 유지" : "완전히 내 단어예요 ✓ 이제 안 물어봐요";
      }
      gr.g = false; gr.s = 0; gr.gs = 0; gr.due = addDays(t, 1);
      var gi = S.saved.indexOf(id); if (gi >= 0) S.saved.splice(gi, 1);
      pushWrong(it); save();
      return "잊었네요 — 보관함으로, 내일 다시";
    }
    var r = S.items[id] || (S.items[id] = { s: 0, due: t, g: false });
    var fb;
    if (correct) {
      r.s = (r.s || 0) + 1; r.lt = q.type;
      if (r.s >= 2) {
        // 졸업 = 끝이 아니라 장기 점검 예약. due를 비우면 그 단어는 두 번 다시 안 나온다.
        r.g = true; r.gs = 0; r.due = gradDue(t, 0);
        var si = S.saved.indexOf(id); if (si >= 0) S.saved.splice(si, 1);
        sess.gradList.push(it); fb = '<span class="stamp">졸업 🎓</span>';
        playGradSequence(it.head);
      } else { r.due = addDays(t, A.retestDays); fb = "정답! " + A.retestDays + "일 뒤 다른 형식으로 한 번 더 맞히면 졸업"; }
    } else {
      var wasGrad = r.g;
      r.s = 0; r.g = false; r.due = addDays(t, 1);
      pushWrong(it);
      fb = wasGrad ? "졸업 취소 — 보관함으로" : "보관함 — 내일 다시";
    }
    save();
    return fb;
  }
  function pushWrong(it) { if (!sess.wrongList.some(function (x) { return x.id === it.id; })) sess.wrongList.push(it); }
  function finishDay(t) {
    var d = dayRec(t);
    if (d.done) return;
    d.done = true;
    if (S.lastDone === addDays(t, -1)) S.streakDays++; else if (S.lastDone !== t) S.streakDays = 1;
    S.lastDone = t; save();
  }
  function bumpHeat() { var d = dayRec(todayStr()); d.q = (d.q || 0) + 1; save(); }
  function finishSession() {
    var t = sess.t;
    if (sess.mode === "daily") finishDay(t);
    if (sess.mode === "place") { finishPlacement(); return; }
    renderResult();
  }
  function renderResult() {
    var total = sess.queue.length + sess.cards.length;
    var okTotal = sess.ok + sess.cardResults.filter(function (c) { return c.known; }).length;
    $("result-title").textContent = sess.mode === "vault" ? "보관함 재시험 결과" : "오늘 결과";
    animateScore($("score"), okTotal, total);
    $("result-place").classList.add("hidden");
    var g = $("result-grad"), gc = $("grad-chips"); gc.innerHTML = "";
    if (sess.gradList.length) { g.classList.remove("hidden"); sess.gradList.forEach(function (it) { gc.appendChild(el("span", "chip grad", it.head)); }); } else g.classList.add("hidden");
    var v = $("result-vault"), vc = $("vault-chips"); vc.innerHTML = "";
    var vaultNew = sess.cardResults.filter(function (c) { return !c.known; }).map(function (c) { return byId[c.id]; });
    var all = vaultNew.concat(sess.wrongList.filter(function (w) { return !vaultNew.some(function (x) { return x.id === w.id; }); }));
    if (all.length) { v.classList.remove("hidden"); $("vault-head").textContent = "보관함 — 내일 다시 나와요 (" + all.length + ")"; all.forEach(function (it) { vc.appendChild(el("span", "chip vault", it.head)); }); } else v.classList.add("hidden");
    if (sess.mode === "daily" && total > 0 && okTotal === total) setTimeout(function () { fxAt($("score"), fxColors(), 40, 7); sfxFanfare(); }, 300);
    show("view-result");
  }

  // ---------- 배치 테스트 (첫 실행, daily-algorithm.md §4) ----------
  function startPlacement() {
    var minB = CFG.dailyMinBand || 1;
    var bands = Object.keys(CFG.bands || { "1": 1 }).map(Number).filter(function (b) { return b >= minB; }).sort();
    var ids = [];
    bands.forEach(function (b) {
      var pool = byModule.word.filter(function (it) { return it.band === b; });
      if (!pool.length) return;
      var n = Math.min(5, pool.length);
      for (var i = 0; i < n; i++) ids.push(pool[Math.floor((i + 0.5) * pool.length / n)].id);
    });
    if (!ids.length) { S.placed = true; S.startBand = CFG.defaultBand || minB; save(); renderHome(); return; }
    sess = newSession("place", todayStr());
    sess.queue = ids.map(function (id) { return buildQuestion(id, "place"); });
    pushView("session");
    renderQuestion();
  }
  function finishPlacement() {
    var minB = CFG.dailyMinBand || 1;
    var bands = Object.keys(sess.placeStats).map(Number).sort(function (a, b) { return a - b; });
    var start = bands.length ? bands[0] : (CFG.defaultBand || minB);
    for (var i = 0; i < bands.length; i++) {
      var ps = sess.placeStats[bands[i]];
      if (ps.ok / ps.n >= 0.8) start = bands[i] + 1; else break;
    }
    var maxBand = Math.max.apply(null, Object.keys(CFG.bands || { "1": 1 }).map(Number));
    S.startBand = Math.min(Math.max(start, minB), maxBand); S.placed = true; save();
    $("result-title").textContent = "실력 체크 결과";
    animateScore($("score"), sess.ok, sess.queue.length);
    var rp = $("result-place"); rp.classList.remove("hidden");
    var lines = bands.map(function (b) { var ps = sess.placeStats[b]; return (CFG.bands[String(b)] || ("band " + b)) + ": " + ps.ok + "/" + ps.n; });
    rp.innerHTML = "<h3>구간별</h3><p class=\"tip\">" + lines.join(" · ") + "</p><p class=\"tip\"><b>" + esc(CFG.bands[String(S.startBand)] || ("band " + S.startBand)) + "</b> 구간부터 시작해요. 앞 구간 단어도 검색하면 언제든 담을 수 있어요.</p>";
    $("result-grad").classList.add("hidden"); $("result-vault").classList.add("hidden");
    show("view-result");
  }

  // ---------- 목록·검색·상세 ----------
  function rowFor(it, t, onClick) {
    var r = el("button", "row"); r.type = "button";
    var st = stateLabel(it.id, t);
    r.appendChild(el("span", "rh", it.head));
    r.appendChild(el("span", "rk", it.ko.join(", ")));
    if (st.text) r.appendChild(el("span", "rs " + st.cls, st.text));
    r.addEventListener("click", function () { onClick(it); });
    return r;
  }
  var listFrom = "home";
  function renderList(kind) {
    var t = todayStr(), rows = $("list-rows"); rows.innerHTML = "";
    var act = $("btn-list-action"); act.classList.add("hidden"); act.onclick = null;
    var ids, title, sub;
    if (kind === "vault") {
      ids = vaultIds().sort(function (a, b) { return S.items[a].due < S.items[b].due ? -1 : 1; });
      title = "보관함"; var due = dueVaultCount(t);
      sub = ids.length ? ids.length + "개 학습 중 · 오늘 재시험 " + due + "개 — 다른 날 2번 맞히면 졸업" : "비어 있어요 — 카드에서 '모른다'를 누르거나 검색해서 담아 보세요";
      if (ids.length) { act.textContent = due ? "지금 재시험 (" + Math.min(due, 10) + "개)" : "연습 퀴즈 (진도 무관)"; act.classList.remove("hidden"); act.onclick = startVaultReview; }
    } else if (kind === "grad") {
      ids = gradIds().sort(); title = "졸업한 단어";
      var gd = gradIntervals().join("일 · ") + "일";
      sub = ids.length + "개 — 졸업해도 " + gd + " 뒤에 한 번씩 다시 확인해요. 바로 복습하려면 검색해서 담으면 돼요";
    } else { renderBands(); return; }
    $("list-title").textContent = title; $("list-sub").textContent = sub;
    if (!ids.length) rows.appendChild(el("div", "row empty", "아직 없어요"));
    ids.forEach(function (id) { rows.appendChild(rowFor(byId[id], t, function (it) { renderDetail(it, "list"); })); });
    show("view-list");
  }
  function renderBands() {
    var rows = $("list-rows"); rows.innerHTML = "";
    $("list-title").textContent = "진도"; $("list-sub").textContent = "구간별 본 단어 · 졸업 — 시작 구간은 설정에서 실력 체크로 바꿔요";
    var bar = el("div", "bandbar");
    Object.keys(CFG.bands || {}).sort().forEach(function (b) {
      var all = ITEMS.filter(function (it) { return String(it.band) === b; });
      var seen = all.filter(function (it) { return isSeen(it.id); }).length;
      var grad = all.filter(function (it) { return isGrad(it.id); }).length;
      var row = el("div", "bandrow");
      var bn = el("div", "bn"); bn.innerHTML = "<span>" + esc(CFG.bands[b]) + (Number(b) === S.startBand ? " · 시작" : "") + "</span><span>" + seen + "/" + all.length + " · 졸업 " + grad + "</span>";
      var bp = el("div", "bp"); var i1 = el("i"); i1.style.width = (all.length ? (seen / all.length) * 100 : 0) + "%"; var i2 = el("i", "g"); i2.style.width = (all.length ? (grad / all.length) * 100 : 0) + "%"; i2.style.marginTop = "-6px";
      bp.appendChild(i1); bp.appendChild(i2);
      row.appendChild(bn); row.appendChild(bp); bar.appendChild(row);
    });
    rows.appendChild(bar);
    show("view-list");
  }
  function renderSearch() {
    $("search-input").value = ""; $("search-results").innerHTML = "";
    $("search-tip").textContent = "수록: 단어 " + byModule.word.length + " · 숙어 " + byModule.idiom.length + " · 표현 " + byModule.expr.length + " — 모르는 단어를 찾아 담으면 복습에 나와요.";
    show("view-search");
    setTimeout(function () { try { $("search-input").focus(); } catch (e) {} }, 60);
  }
  function doSearch(qs) {
    var box = $("search-results"); box.innerHTML = "";
    var q = qs.trim().toLowerCase(); if (q.length < 1) return;
    var t = todayStr();
    var hits = ITEMS.filter(function (it) {
      return it.head.toLowerCase().indexOf(q) >= 0 || (it.forms || []).some(function (f) { return f.toLowerCase() === q; }) || it.ko.some(function (k) { return k.indexOf(q) >= 0; });
    }).sort(function (a, b) {
      var ea = a.head.toLowerCase() === q ? 0 : a.head.toLowerCase().indexOf(q) === 0 ? 1 : 2;
      var eb = b.head.toLowerCase() === q ? 0 : b.head.toLowerCase().indexOf(q) === 0 ? 1 : 2;
      return ea - eb || a.band - b.band || a.rank - b.rank;
    }).slice(0, 30);
    if (!hits.length) { box.appendChild(el("div", "row empty", "검색 결과가 없어요")); return; }
    hits.forEach(function (it) { box.appendChild(rowFor(it, t, function (x) { renderDetail(x, "search"); })); });
  }
  var detailItem = null;
  function renderDetail(it, from) {
    detailItem = it; listFrom = from;
    $("btn-detail-back").textContent = from === "search" ? "← 검색으로" : "← 목록으로";
    $("detail-title").textContent = it.head; $("detail-sub").textContent = it.ko.join(", ");
    fillWordCard("d", it);
    syncDetailState();
    pushView("detail");
    show("view-detail");
  }
  function syncDetailState() {
    var it = detailItem, t = todayStr(), b = $("btn-detail-save");
    var st = stateLabel(it.id, t);
    if (isVault(it.id)) { b.textContent = "보관함에 있어요 ✓"; b.disabled = true; }
    else { b.textContent = isGrad(it.id) ? "다시 보관함에 담기 (졸업 취소)" : "보관함에 담기"; b.disabled = false; }
    $("detail-state").textContent = st.text ? "상태: " + st.text : "아직 안 배운 단어예요 — 담으면 오늘 세트에 바로 들어와요";
  }
  function saveToVault() {
    var it = detailItem, t = todayStr();
    if (isVault(it.id)) return;
    toVault(it.id, t, 0);
    if (S.saved.indexOf(it.id) < 0) S.saved.push(it.id);
    var d = dayRec(t); if (d.set && !d.done && d.set.R.indexOf(it.id) < 0 && d.set.R.length < A.rMax + 3) d.set.R.push(it.id); // 오늘 세트에 즉시 편입
    save(); sfxCorrect(0); fxAt($("btn-detail-save"), fxColors(), 16, 5);
    syncDetailState();
  }

  // ---------- 설정 · 백업 ----------
  function renderSettings() {
    $("settings-sub").textContent = (CFG.bands[String(S.startBand)] || "band " + S.startBand) + " 구간부터 · 콘텐츠 " + (CFG.contentVersion || "");
    syncSeg("seg-accent", S.settings.accent); syncSeg("seg-daily", String(S.settings.dailyNew)); syncSeg("seg-auto", S.settings.auto ? "on" : "off");
    $("backup-msg").textContent = "아이폰 사파리는 오래 안 쓰면 기록이 지워질 수 있어요 — 가끔 백업해 두면 안전해요.";
    $("btn-reset").textContent = "진도 전체 리셋"; resetArmed = false;
    $("about-line").textContent = "Voca Vault · 단어 출처: 교육부 2022 개정 영어과 기본 어휘 · 뜻·예문 자작 · 발음: 미리 만든 음성 또는 기기 음성";
    show("view-settings");
  }
  function syncSeg(id, val) {
    Array.prototype.forEach.call($(id).children, function (b) { b.classList.toggle("on", b.getAttribute("data-v") === val); });
  }
  function bindSeg(id, fn) {
    $(id).addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      fn(b.getAttribute("data-v")); save(); syncSeg(id, b.getAttribute("data-v"));
    });
  }
  function doExportFile() {
    try {
      var name = "voca-" + CFG.track + "-" + todayStr().replace(/-/g, "") + ".json";
      var blob = new Blob([JSON.stringify(S)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a"); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      $("backup-msg").textContent = "저장했어요 — 다운로드 폴더에서 " + name + " 파일을 찾을 수 있어요.";
    } catch (e) { $("backup-msg").textContent = "이 브라우저는 파일 저장이 안 돼요."; }
  }
  function importText(text) {
    try {
      var parsed = JSON.parse(text);
      if (!parsed || parsed.v !== 1 || !parsed.items) throw new Error("bad");
      var f = freshState();
      Object.keys(f).forEach(function (k) { if (parsed[k] === undefined) parsed[k] = f[k]; });
      migrateGrad(parsed);
      S = parsed; save();
      $("backup-msg").textContent = "복원 완료! 홈으로 돌아가면 가져온 기록이 보여요.";
    } catch (e) { $("backup-msg").textContent = "파일이 올바르지 않아요 — 이 앱에서 저장한 백업 파일을 골라 주세요."; }
  }
  var resetArmed = false;
  function resetAll() {
    if (!resetArmed) { resetArmed = true; $("btn-reset").textContent = "정말 리셋할까요? 한 번 더 누르면 지워져요"; return; }
    S = freshState(); save(); resetArmed = false;
    $("btn-reset").textContent = "진도 전체 리셋"; $("backup-msg").textContent = "리셋했어요. 홈으로 가면 실력 체크부터 다시 시작해요.";
  }

  // ---------- 홈 ----------
  function renderHome() {
    var t = todayStr();
    $("streak-num").textContent = S.streakDays || 0;
    var d = dayRec(t);
    var set = d.set || buildToday(t);
    var remainN = set.N.filter(function (id) { return !isSeen(id); }).length;
    var remainR = set.R.filter(function (id) { return isVault(id) && S.items[id].due <= t; }).length;
    var remainS = set.S.filter(function (id) { return S.known[id] && S.known[id] <= t; }).length;
    var remainG = recallDue(set, t).length;
    var btn = $("btn-start-all"), line = $("today-line"), meta = $("hero-meta");
    if (d.done || (!remainN && !remainR && !remainS && !remainG)) {
      if (!d.done && !set.N.length && !set.R.length && !set.S.length && !(set.G || []).length) finishDay(t);
      $("hero-kicker").textContent = "DONE";
      line.textContent = "오늘 학습 끝! 내일 또 만나요.";
      btn.textContent = "보관함 연습 퀴즈"; btn.onclick = function () { pushView("list"); startVaultReview(); };
      meta.textContent = "새 단어는 하루 한 세트 — 더 하고 싶으면 검색해서 담아 보세요.";
    } else {
      $("hero-kicker").textContent = "TODAY";
      var parts = [];
      if (remainN) parts.push("새 단어 " + remainN);
      if (remainR) parts.push("재시험 " + remainR);
      if (remainS) parts.push("점검 " + remainS);
      if (remainG) parts.push("복습 " + remainG);
      line.textContent = parts.join(" · ") + " — 약 " + Math.max(1, Math.round((remainN * 12 + (remainR + remainS + remainG) * 8) / 60)) + "분";
      btn.textContent = (d.set && (d.newStats.shown > 0)) ? "이어서 하기" : "오늘의 학습 시작";
      btn.onclick = function () { unlockAudio(); startDaily(); };
      var vc = vaultIds().length;
      meta.textContent = vc > A.vaultCap ? "보관함이 " + vc + "개 — 새 단어는 잠시 쉬고 보관함부터 비워요" : "다른 날 2번 맞히면 졸업 · 모르면 보관함으로";
    }
    $("mcard-vault-sub").textContent = vaultIds().length + "개 · 오늘 " + dueVaultCount(t) + "개";
    $("mcard-grad-sub").textContent = gradIds().length + "개";
    // 분자·분모를 같은 모수로 — 검색으로 담은 band 1 항목이 분자만 키우면 안 된다
    var minB = CFG.dailyMinBand || 1;
    var seenN = Object.keys(S.seen).filter(function (id) { return byId[id] && byId[id].band >= minB; }).length;
    var poolN = ITEMS.filter(function (x) { return x.band >= minB; }).length;
    $("mcard-bands-sub").textContent = (CFG.bands[String(S.startBand)] || "") + " · " + seenN + "/" + poolN;
    $("mcard-set-sub").textContent = (S.settings.accent === "uk" ? "🇬🇧 UK" : "🇺🇸 US") + " · 하루 " + S.settings.dailyNew;
    renderHeat(t);
    show("view-home");
  }
  function renderHeat(t) {
    var row = $("heat-row"); row.innerHTML = "";
    var total = 0;
    for (var i = 27; i >= 0; i--) {
      var day = addDays(t, -i), d = S.days[day], q = d ? (d.q || 0) : 0; total += q;
      var s = el("span", q >= 15 ? "h3" : q >= 8 ? "h2" : q >= 1 ? "h1" : ""); s.title = day + " · " + q + "문제";
      row.appendChild(s);
    }
    $("heat-sub").textContent = "최근 4주 " + total + "문제";
  }

  // ---------- 초기화 ----------
  function abortToHome() { sess = null; $("combo-badge").classList.add("hidden"); renderHome(); }
  function init() {
    S = load();
    document.title = CFG.title;
    $("app-title").textContent = CFG.title; $("app-subtitle").textContent = CFG.subtitle;
    // APK(자산 내장)에는 돌아갈 상위 허브가 없다. back이 비면 링크를 감춘다 —
    // 기본값 "../index.html"을 그대로 두면 갈 곳 없는 링크가 남는다.
    var back = $("back-link");
    if (CFG.back) {
      back.href = CFG.back; back.textContent = CFG.backLabel || "← 학습 앱";
      back.hidden = false;
    } else {
      back.hidden = true;
    }
    applyTheme(currentTheme(), false);
    syncSoundIcon();
    $("theme-toggle").addEventListener("click", function () { applyTheme(currentTheme() === "light" ? "dark" : "light", true); });
    $("sound-toggle").addEventListener("click", function () { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch (e) {} syncSoundIcon(); if (soundOn) sfxCorrect(0); });
    $("home-search").addEventListener("click", function () { pushView("search"); renderSearch(); });
    $("search-input").addEventListener("input", function (e) { doSearch(e.target.value); });
    $("btn-search-back").addEventListener("click", function (e) { e.preventDefault(); renderHome(); });
    $("card-vault").addEventListener("click", function () { pushView("list"); renderList("vault"); });
    $("card-grad").addEventListener("click", function () { pushView("list"); renderList("grad"); });
    $("card-bands").addEventListener("click", function () { pushView("list"); renderList("bands"); });
    $("card-settings").addEventListener("click", function () { pushView("settings"); renderSettings(); });
    $("btn-list-back").addEventListener("click", function (e) { e.preventDefault(); renderHome(); });
    $("btn-detail-back").addEventListener("click", function (e) { e.preventDefault(); if (listFrom === "search") show("view-search"); else renderList("vault"); });
    $("btn-detail-save").addEventListener("click", saveToVault);
    $("btn-settings-back").addEventListener("click", function (e) { e.preventDefault(); renderHome(); });
    bindSeg("seg-accent", function (v) { S.settings.accent = v; });
    bindSeg("seg-daily", function (v) { S.settings.dailyNew = Number(v); var d = dayRec(todayStr()); if (d.set && d.newStats.shown === 0) { delete d.set; } });
    bindSeg("seg-auto", function (v) { S.settings.auto = v === "on"; });
    $("btn-place-again").addEventListener("click", function () { pushView("session"); startPlacement(); });
    $("btn-export-file").addEventListener("click", doExportFile);
    $("btn-import-file").addEventListener("click", function () { $("backup-file").click(); });
    $("backup-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { importText(String(rd.result)); }; rd.readAsText(f); e.target.value = "";
    });
    $("btn-reset").addEventListener("click", resetAll);
    $("btn-place-start").addEventListener("click", function () { unlockAudio(); startPlacement(); });
    $("btn-place-skip").addEventListener("click", function () { S.placed = true; S.startBand = CFG.defaultBand || 1; save(); renderHome(); });
    $("btn-known").addEventListener("click", function () { judgeCard(true); });
    $("btn-unknown").addEventListener("click", function () { judgeCard(false); });
    $("btn-next").addEventListener("click", next);
    $("btn-check").addEventListener("click", function () { var q = sess && sess.queue[sess.idx]; if (q && q.input) answer(q, $("answer-input").value, null); });
    $("answer-input").addEventListener("keydown", function (e) { if (e.key === "Enter") $("btn-check").click(); });
    $("btn-home").addEventListener("click", function () { abortToHome(); });
    bindTilt("word-card");
    window.addEventListener("popstate", function () {
      if (sess) { abortToHome(); return; }
      renderHome();
    });
    if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = function () { voicesCache = speechSynthesis.getVoices(); }; speechSynthesis.getVoices(); } catch (e) {} }
    document.addEventListener("click", unlockAudio, { once: true, capture: true });
    loadAllData().then(function () {
      if (!S.placed && Object.keys(S.items).length === 0) show("view-place"); else renderHome();
    }).catch(function (e) {
      $("today-line").textContent = "콘텐츠를 불러오지 못했어요 — 새로고침해 주세요. (" + e.message + ")";
      show("view-home");
    });
  }
  init();
})();
