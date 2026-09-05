/* drill.js — 단원 학습앱의 "⚡ 실전" 탭 엔진 (공용)
 *
 * v2 (2026-08-21, 학습 플로우 개정 — 00_META/FLOW_V2_INAPP_LOOP.md):
 *   결과를 아빠에게 보내는 흐름을 제거하고, 루프가 앱 안에서 완결된다.
 *   ① 문제마다: 채점 즉시 원인 진단 + "지금 바로 고치기" 이동 칩(앱이 window.DRILL_FIX 제공 시)
 *   ② 라운드 끝: 틀린·찍맞 문항을 그 자리에서 되풀이(맞을 때까지, 최대 3회전)
 *   ③ 세션 간: localStorage 복습함 — 틀린 문항을 사다리(1·3·7일)로 다시 묻는다.
 *      때가 된 문항이 있으면 탭을 열 때 복습부터 권한다. 3연속 정답 = 정복.
 *
 * 쓰는 법 (단원앱 안에서):
 *     <div class="page" data-p="drill"><div id="drill"></div></div>
 *     <script src="drill.js"></script>
 *     <script src="drill_kh2_02.js"></script>
 *     (선택) window.DRILL_FIX = { C3:['pair','🪞 혼동쌍으로 이 짝 가르기'], ... };
 *            원인 코드 → [탭id, 칩 라벨]. 앱에 전역 go(tab)이 있어야 칩이 생긴다.
 *
 * 스타일: 단원앱이 이미 가진 클래스(.quizhud .qq .qopts .qopt .qexp .qnext .qdone .btn .box)를
 *        그대로 쓴다. 과목마다 다른 --accent 색을 자동으로 물려받는다.
 *
 * 데이터 정본 = exam_track/problem_bank/data/<set>.js
 *   → 앱 폴더의 drill_<set>.js는 `tools/sync_drill.py`가 만든 복사본이다. 직접 고치지 말 것.
 *
 * localStorage:
 *   drill:<set>    이번 풀이 기록(문항별 정오·확신도·원인) — v1과 동일
 *   drillbox:<set> 복습함. {문항id:{w:틀린횟수, s:사다리칸(0~2), due:'YYYY-MM-DD',
 *                            st:'sch'|'mst', c:마지막 원인, k:연속정답, g:찍맞 여부}}
 */
(function () {
  "use strict";

  var CONF = [["sure", "확신했어"], ["half", "반반이야"],
              ["guess", "찍었어"], ["timeout", "시간 부족"]];
  var NUM = "①②③④⑤";
  var LADDER = [1, 3, 7];   // 틀림→1일, 1연속→3일, 2연속→7일, 3연속=정복

  var CSS = ''
    + '#drill .dmat{background:#f8fafc;border-left:3px solid var(--accent);border-radius:0 10px 10px 0;'
    + 'padding:13px 15px;margin:0 0 14px;font-size:14px;line-height:1.8;text-align:left}'
    + '#drill .dmat .tr{display:block;margin-top:6px;font-size:12.5px;color:var(--sub)}'
    + '#drill .dtag{display:flex;gap:6px;justify-content:center;margin-bottom:10px;flex-wrap:wrap}'
    + '#drill .dtag span{font-size:11px;font-weight:800;letter-spacing:.03em;padding:3px 9px;border-radius:20px;'
    + 'background:var(--accent-bg,#f1f5f9);color:var(--accent);border:1px solid var(--line)}'
    + '#drill .dask{margin-top:14px;font-size:13.5px;color:var(--sub);text-align:center}'
    + '#drill .dconf{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:8px}'
    + '#drill .dconf button{min-height:46px;border:2px solid var(--line);background:#fff;color:var(--ink);'
    + 'font:inherit;font-size:12.5px;font-weight:700;border-radius:10px;cursor:pointer;padding:4px}'
    + '#drill .dconf button:hover{border-color:var(--accent)}'
    + '#drill .dcause{background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;'
    + 'margin:11px 0;font-size:13px;line-height:1.7;text-align:left}'
    + '#drill .dcause b{color:var(--accent-d,var(--accent))}'
    + '#drill .dtrap{margin-top:9px;font-size:13px;color:var(--sub);text-align:left}'
    + '#drill .dtrap b{color:var(--ink)}'
    + '#drill .dfix{display:block;width:100%;margin:9px 0 0;padding:11px 13px;border:2px dashed var(--accent);'
    + 'background:var(--accent-bg,#f1f5f9);color:var(--accent-d,var(--accent));border-radius:10px;'
    + 'font:inherit;font-size:13px;font-weight:800;cursor:pointer;text-align:left}'
    + '#drill .dfix small{display:block;font-weight:500;color:var(--sub);margin-top:2px}'
    + '#drill .dstat{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:10px 0 2px;font-size:12px}'
    + '#drill .dstat span{background:#f8fafc;border:1px solid var(--line);border-radius:20px;padding:4px 11px;'
    + 'color:var(--sub);font-weight:700}'
    + '#drill .dstat b{color:var(--ink)}'
    + '#drill .dround{background:var(--accent-bg,#f1f5f9);border:1px solid var(--line);border-radius:10px;'
    + 'padding:9px 13px;margin:0 0 12px;font-size:12.5px;font-weight:700;color:var(--accent-d,var(--accent));text-align:center}'
    + '#drill .dsum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}'
    + '#drill .dsum div{background:#f8fafc;border:1px solid var(--line);border-radius:9px;padding:10px}'
    + '#drill .dsum .k{font-size:11px;color:var(--sub);font-weight:700}'
    + '#drill .dsum .v{font-size:21px;font-weight:800}';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  // 데이터의 **강조** 마크다운을 <b>로. solve.key/trap은 HTML이 들어오므로 raw+fmt,
  // o[].why는 HTML이 없는 필드라 esc 후 fmt.
  function fmt(s) {
    return String(s == null ? "" : s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function plusDays(n) {
    var d = new Date(); d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function mount(root, S) {
    var KEY = "drill:" + S.id;
    var BKEY = "drillbox:" + S.id;
    var log = {}, box = {};
    try { log = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { log = {}; }
    try { box = JSON.parse(localStorage.getItem(BKEY)) || {}; } catch (e) { box = {}; }
    if (!log || typeof log !== "object" || Array.isArray(log)) log = {};
    if (!box || typeof box !== "object" || Array.isArray(box)) box = {};
    function save() { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {} }
    function saveBox() { try { localStorage.setItem(BKEY, JSON.stringify(box)); } catch (e) {} }

    function boxCounts() {
      var due = 0, sch = 0, mst = 0, t = today();
      S.items.forEach(function (it) {
        var b = box[it.id];
        if (!b) return;
        if (b.st === "mst") { mst++; return; }
        sch++;
        if (b.due <= t) due++;
      });
      return { due: due, sch: sch, mst: mst };
    }

    // ---- 복습함 갱신 규칙 (첫 제시 답만 사다리를 움직인다) ----
    function boxWrong(id, cause, guessed) {
      var b = box[id] || { w: 0, s: 0, k: 0 };
      b.w += guessed ? 0 : 1;
      b.s = 0; b.k = 0;
      b.due = plusDays(1);
      b.st = "sch";
      b.c = cause || b.c || null;
      b.g = guessed ? 1 : 0;
      box[id] = b; saveBox();
    }
    function boxRight(id) {
      var b = box[id];
      if (!b || b.st === "mst") return null;      // 약점이 아니었으면 기록하지 않는다
      if (b.due > today()) { return "early"; }    // 때가 되기 전의 정답은 사다리를 안 움직인다
      // (단, due 전이라도 '찍맞'은 boxWrong 경로로 사다리를 0으로 되돌린다 — 모름이 드러난 것이므로 의도된 비대칭)
      b.k = (b.k || 0) + 1;
      b.g = 0;
      if (b.k >= 3) { b.st = "mst"; saveBox(); return "mastered"; }   // 3연속 정답 = 정복
      b.s = Math.min(b.k, LADDER.length - 1);
      b.due = plusDays(LADDER[b.s]);
      saveBox(); return "up";
    }

    // ---- 실행 상태 ----
    var order = [], i = 0, picked = null, shown = false, conf = null;
    var phase = "fresh";           // fresh | requeue
    var roundNo = 0;               // 되풀이 회전 수
    var freshLog = {};             // 이번 실행의 첫 제시 결과 {id:{correct,conf,cause}}
    var missPool = [];             // 되풀이 대상 item
    var rescued = 0;               // 되풀이에서 바로잡은 수
    var runItems = [];             // 이번 실행의 문항 목록
    var mode = "full";             // full | review

    function prep(it) {
      var o = it.o.slice(), right = o[it.a];
      for (var k = o.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1)), t = o[k]; o[k] = o[j]; o[j] = t;
      }
      return { o: o, a: o.indexOf(right) };
    }

    function begin(items, m) {
      mode = m || "full";
      runItems = items;
      phase = "fresh"; roundNo = 0; freshLog = {}; missPool = []; rescued = 0;
      order = items.map(function (it) { return { it: it, v: prep(it) }; });
      i = 0; picked = null; shown = false; conf = null;
      render();
    }

    // ---- 시작 화면: 복습함이 부르면 먼저 권한다 ----
    function intro() {
      var c = boxCounts();
      if (!c.due && !c.sch && !c.mst) { begin(S.items, "full"); return; }
      var h = '<div class="card"><h2>⚡ ' + esc(S.title) + " — 실전</h2>"
        + '<div class="dstat"><span>약점 <b>' + c.sch + "</b></span><span>오늘 복습 <b>" + c.due
        + "</b></span><span>🏅 정복 <b>" + c.mst + "</b></span></div>";
      if (c.due) {
        h += '<div class="box a" style="margin-top:12px"><div class="t">📬 복습함이 기다려</div>'
          + "지난번에 틀렸던 <b>" + c.due + "문제</b>가 다시 물어볼 때가 됐어. "
          + "복습부터 끝내는 게 실력이 가장 빨리 는다.</div>"
          + '<button class="btn" data-review="1" style="width:100%;margin-top:10px">📬 복습 '
          + c.due + "문제만 풀기</button>"
          + '<button class="btn" data-full="1" style="width:100%;margin-top:8px;background:#94a3b8">전체 '
          + S.items.length + "문제 풀기</button>";
      } else {
        h += '<p class="lead" style="margin-top:10px">복습할 게 없어. 전체를 다시 풀거나, 다음에 때가 되면 복습함이 먼저 알려줄게.</p>'
          + '<button class="btn" data-full="1" style="width:100%;margin-top:8px">전체 '
          + S.items.length + "문제 풀기</button>";
      }
      h += "</div>";
      root.innerHTML = h;
    }

    function dueItems() {
      var t = today();
      return S.items.filter(function (it) {
        var b = box[it.id];
        return b && b.st === "sch" && b.due <= t;
      });
    }

    function render() {
      if (i >= order.length) return endOfRound();
      var cur = order[i], it = cur.it, v = cur.v;

      var h = '<div class="card">'
        + '<h2>⚡ ' + esc(S.title) + " — " + (mode === "review" ? "복습" : "실전") + "</h2>";
      if (phase === "requeue") {
        h += '<div class="dround">🔁 되풀이 ' + roundNo + "회전 — 방금 본 해설을 떠올려서, 이번엔 스스로.</div>";
      }
      h += '<div class="quizhud"><span class="qn">문제 ' + (i + 1) + " / " + order.length + "</span>"
        + '<span class="sc">' + esc(it.type) + " · <b>" + esc(it.level) + "</b></span>"
        + '<div class="qbar"><i style="width:' + (i / order.length * 100) + '%"></i></div></div>';

      h += '<div class="qq">' + it.stem + "</div>";
      if (it.material) h += '<div class="dmat">' + it.material + "</div>";

      h += '<div class="qopts">' + v.o.map(function (o, k) {
        var cls = "qopt";
        if (shown) cls += (k === v.a) ? " correct" : (k === picked ? " wrong" : " dim");
        else if (k === picked) cls += " sel";
        return '<button class="' + cls + '" data-i="' + k + '"' + (shown ? " disabled" : "")
          + ' style="text-align:left' + (!shown && k === picked ? ";border-color:var(--accent)" : "") + '">'
          + NUM.charAt(k) + "&nbsp; " + esc(o.t) + "</button>";
      }).join("") + "</div>";

      if (!shown) {
        if (picked !== null) {
          h += '<div class="dask">답할 때 어느 쪽이었어? <b>고르면 바로 채점돼</b></div>'
            + '<div class="dconf">' + CONF.map(function (c) {
              return '<button data-c="' + c[0] + '">' + c[1] + "</button>";
            }).join("") + "</div>";
        } else {
          h += '<div class="dask">답을 골라 봐.</div>';
        }
      } else {
        var right = picked === v.a, chosen = v.o[picked] || {};
        h += '<div class="qexp show"><div class="et">'
          + (right ? (conf === "guess" ? "⭕ 맞았어 — 근데 찍었지?" : "⭕ 정답!") : "❌ 오답")
          + "</div>" + fmt(it.solve.key);
        if (!right && chosen.why) {
          h += '<div class="dcause"><b>왜 ' + NUM.charAt(picked) + "를 골랐나 — "
            + esc(chosen.cause || "") + "</b><br>" + fmt(esc(chosen.why)) + "</div>";
        }
        if (right && conf === "guess") {
          h += '<div class="dcause"><b>찍어서 맞음</b><br>'
            + "아직 모르는 것으로 적어 둘게. 복습함이 내일 다시 물어봐.</div>";
        }
        if (it.solve.trap) h += '<div class="dtrap"><b>여기서 흔히 걸려</b> — ' + fmt(it.solve.trap) + "</div>";
        // 지금 바로 고치기 — 앱이 DRILL_FIX와 go()를 줄 때만
        var needFix = (!right || conf === "guess");
        var cz = right ? null : (chosen.cause || null);
        var FIX = window.DRILL_FIX;
        if (needFix && cz && FIX && FIX[cz] && typeof window.go === "function") {
          h += '<button class="dfix" data-fix="' + esc(FIX[cz][0]) + '">🩹 지금 바로 고치기 → '
            + esc(FIX[cz][1]) + "<small>보고 나서 ⚡실전 탭으로 돌아오면 여기서 이어져.</small></button>";
        }
        h += "</div>";
        h += '<button class="qnext show" data-next="1">'
          + (i + 1 < order.length ? "다음 문제 →"
             : phase === "fresh" ? (collectMiss().length ? "틀린 것 되풀이 →" : "결과 보기")
             : (missPool.length && roundNo < 3 ? "한 번 더 되풀이 →" : "결과 보기")) + "</button>";
      }

      h += "</div>";
      root.innerHTML = h;
    }

    function collectMiss() {
      if (phase === "fresh") {
        return runItems.filter(function (it) {
          var r = freshLog[it.id];
          return r && (!r.correct || r.conf === "guess");
        });
      }
      return missPool;
    }

    function grade() {
      var cur = order[i], it = cur.it, v = cur.v;
      var right = picked === v.a, chosen = v.o[picked] || {};
      var cz = right ? null : (chosen.cause || null);

      if (phase === "fresh") {
        freshLog[it.id] = { correct: right, conf: conf, cause: cz };
        log[it.id] = {
          correct: right, conf: conf, cause: cz,
          oi: it.o.indexOf(chosen),
          type: it.type, unit: S.unit,
          at: new Date().toISOString().slice(0, 10)
        };
        save();
        // 복습함 — 첫 제시 답만 사다리를 움직인다
        if (!right) boxWrong(it.id, cz, false);
        else if (conf === "guess") boxWrong(it.id, null, true);
        else boxRight(it.id);
      } else {
        // 되풀이: 맞으면 풀에서 빠지고, 틀리면 다음 회전으로. 사다리는 건드리지 않는다.
        if (right && conf !== "guess") {
          missPool = missPool.filter(function (x) { return x.id !== it.id; });
          rescued++;
        } else if (!right) {
          var b = box[it.id]; if (b) { b.w += 1; b.c = cz || b.c; saveBox(); }
        }
      }
      shown = true; render();
    }

    function endOfRound() {
      var miss = collectMiss();
      if (phase === "fresh" && miss.length) {
        phase = "requeue"; roundNo = 1; missPool = miss.slice();
        order = missPool.map(function (it) { return { it: it, v: prep(it) }; });
        i = 0; picked = null; shown = false; conf = null;
        render(); return;
      }
      if (phase === "requeue" && missPool.length && roundNo < 3) {
        roundNo++;
        order = missPool.map(function (it) { return { it: it, v: prep(it) }; });
        i = 0; picked = null; shown = false; conf = null;
        render(); return;
      }
      finish();
    }

    function finish() {
      var ids = runItems.map(function (x) { return x.id; });
      var done = ids.filter(function (x) { return freshLog[x]; });
      var ok = done.filter(function (x) { return freshLog[x].correct; });
      var luck = ok.filter(function (x) { return freshLog[x].conf === "guess"; });
      var bad = done.filter(function (x) { return !freshLog[x].correct; });

      var byCause = {};
      bad.forEach(function (x) { var c = freshLog[x].cause || "미분류"; byCause[c] = (byCause[c] || 0) + 1; });
      var causes = Object.keys(byCause).sort(function (a, b) { return byCause[b] - byCause[a]; });
      var causeLine = causes.map(function (c) { return c + " " + byCause[c] + "개"; }).join(" · ");

      var pct = done.length ? Math.round(ok.length / done.length * 100) : 0;
      var c = boxCounts();

      var h = '<div class="card"><div class="qdone">'
        + '<div class="big">' + ok.length + " / " + done.length + "</div>"
        + '<p style="margin:6px 0 2px;font-size:15px">정답률 ' + pct + "%</p></div>"
        + '<div class="dsum">'
        + '<div><div class="k">맞음</div><div class="v">' + (ok.length - luck.length) + "</div></div>"
        + '<div><div class="k">찍어서 맞음</div><div class="v">' + luck.length + "</div></div>"
        + '<div><div class="k">틀림</div><div class="v">' + bad.length + "</div></div></div>";

      if (rescued) {
        h += '<div class="box g"><div class="t">🔁 되풀이에서 바로잡음</div>'
          + "틀렸던 것 중 <b>" + rescued + "개</b>를 그 자리에서 다시 맞혔어. "
          + "그래도 복습함엔 남아 있어 — 내일 또 물어봐야 진짜 내 것이 되거든.</div>";
      }

      if (causes.length) {
        h += '<div class="box a"><div class="t">🔎 틀린 이유</div>' + esc(causeLine)
          + '<br><span style="font-size:12.5px">유형이 보이면 그게 다음에 공부할 지점이야.</span></div>';
        var FIX = window.DRILL_FIX;
        if (FIX && typeof window.go === "function") {
          causes.forEach(function (cz) {
            if (FIX[cz]) {
              h += '<button class="dfix" data-fix="' + esc(FIX[cz][0]) + '">🩹 ' + cz
                + " " + byCause[cz] + "개 고치러 가기 → " + esc(FIX[cz][1]) + "</button>";
            }
          });
        }
      } else if (!bad.length && !luck.length) {
        h += '<div class="box g"><div class="t">🎉 다 맞았어</div>이 단원은 실전 수준까지 잡혔어.</div>';
      }

      h += '<div class="box b"><div class="t">📬 복습함</div>'
        + "약점 <b>" + c.sch + "개</b>가 등록돼 있어"
        + (c.mst ? " · 🏅 정복 <b>" + c.mst + "개</b>" : "")
        + ". 다음에 이 탭을 열면 <b>때가 된 문제부터</b> 다시 물어봐 — "
        + "맞힐 때마다 간격이 1·3·7일로 늘고, 3연속 정답이면 🏅 정복이야.</div>";

      h += '<button class="btn" data-restart="1" style="width:100%;background:#94a3b8">↺ 처음 화면으로</button>'
        + "</div>";
      root.innerHTML = h;
    }

    root.addEventListener("click", function (ev) {
      var o = ev.target.closest(".qopt");
      if (o && !shown && !o.disabled) { picked = +o.getAttribute("data-i"); render(); return; }
      var c = ev.target.closest("button[data-c]");
      if (c && !shown && picked !== null) { conf = c.getAttribute("data-c"); grade(); return; }
      if (ev.target.closest("[data-next]")) { i++; picked = null; conf = null; shown = false; render(); return; }
      if (ev.target.closest("[data-restart]")) { intro(); return; }   // log는 지우지 않는다 — 전 단원 섞어 풀기 모드의 재료
      if (ev.target.closest("[data-full]")) { begin(S.items, "full"); return; }
      if (ev.target.closest("[data-review]")) { var d = dueItems(); if (d.length) begin(d, "review"); else begin(S.items, "full"); return; }
      var f = ev.target.closest("[data-fix]");
      if (f && typeof window.go === "function") { window.go(f.getAttribute("data-fix")); return; }
    });

    intro();
  }

  function boot() {
    var root = document.getElementById("drill");
    if (!root) return;
    var S = window.BANK_SET;
    if (!S || !S.items || !S.items.length) {
      root.innerHTML = '<div class="card"><h2>⚡ 실전</h2>'
        + '<p class="lead">이 단원의 심화 문항은 아직 준비 중이야. 퀴즈 탭부터 풀어 보자.</p></div>';
      return;
    }
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    mount(root, S);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
