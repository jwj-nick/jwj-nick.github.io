/* drill.js — 단원 학습앱의 "⚡ 실전" 탭 엔진 (공용)
 *
 * 하는 일: window.BANK_SET(심화 문항)을 읽어 #drill에 심화 드릴을 그린다.
 *          풀이 → 확신도 수집 → 자동 채점 → **고른 오답의 원인 진단** → 결과 복사.
 *
 * 쓰는 법 (단원앱 안에서):
 *     <div class="page" data-p="drill"><div id="drill"></div></div>
 *     <script src="drill.js"></script>
 *     <script src="drill_kh2_02.js"></script>
 *
 * 스타일: 단원앱이 이미 가진 클래스(.quizhud .qq .qopts .qopt .qexp .qnext .qdone .btn .box)를
 *        그대로 쓴다. 그래서 과목마다 다른 --accent 색을 자동으로 물려받는다.
 *        여기서 주입하는 CSS는 기존 앱에 없는 네 가지(자료·확신도·원인·결과)뿐이다.
 *
 * 데이터 정본 = exam_track/problem_bank/data/<set>.js
 *   → 앱 폴더의 drill_<set>.js는 `tools/sync_drill.py`가 만든 복사본이다. 직접 고치지 말 것.
 */
(function () {
  "use strict";

  var CONF = [["sure", "확신했어"], ["half", "반반이야"],
              ["guess", "찍었어"], ["timeout", "시간 부족"]];
  var NUM = "①②③④⑤";

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
    + '#drill textarea{width:100%;min-height:104px;border:1px solid var(--line);border-radius:9px;'
    + 'background:#f8fafc;color:var(--ink);font-family:ui-monospace,Consolas,monospace;font-size:12px;'
    + 'padding:10px;resize:vertical;margin-top:10px}'
    + '#drill .dsum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}'
    + '#drill .dsum div{background:#f8fafc;border:1px solid var(--line);border-radius:9px;padding:10px}'
    + '#drill .dsum .k{font-size:11px;color:var(--sub);font-weight:700}'
    + '#drill .dsum .v{font-size:21px;font-weight:800}';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }

  function mount(root, S) {
    var KEY = "drill:" + S.id;
    var log = {};
    try { log = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { log = {}; }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {} }

    var order = [], i = 0, picked = null, shown = false, conf = null;

    // 보기 셔플 — 정답 위치는 indexOf로 되찾는다
    function prep(it) {
      var o = it.o.slice(), right = o[it.a];
      for (var k = o.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1)), t = o[k]; o[k] = o[j]; o[j] = t;
      }
      return { o: o, a: o.indexOf(right) };
    }

    function start() {
      order = S.items.map(function (it) { return { it: it, v: prep(it) }; });
      i = 0; picked = null; shown = false; conf = null;
      render();
    }

    function render() {
      if (i >= order.length) return finish();
      var cur = order[i], it = cur.it, v = cur.v;

      var h = '<div class="card">'
        + '<h2>⚡ ' + esc(S.title) + ' — 실전</h2>'
        + '<div class="quizhud"><span class="qn">문제 ' + (i + 1) + ' / ' + order.length + '</span>'
        + '<span class="sc">' + esc(it.type) + ' · <b>' + esc(it.level) + '</b></span>'
        + '<div class="qbar"><i style="width:' + (i / order.length * 100) + '%"></i></div></div>';

      h += '<div class="qq">' + it.stem + '</div>';
      if (it.material) h += '<div class="dmat">' + it.material + '</div>';

      h += '<div class="qopts">' + v.o.map(function (o, k) {
        var cls = "qopt";
        if (shown) cls += (k === v.a) ? " correct" : (k === picked ? " wrong" : " dim");
        else if (k === picked) cls += " sel";
        return '<button class="' + cls + '" data-i="' + k + '"' + (shown ? " disabled" : "")
          + ' style="text-align:left' + (!shown && k === picked ? ';border-color:var(--accent)' : '') + '">'
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
          + "</div>" + esc(it.solve.key);
        if (!right && chosen.why) {
          h += '<div class="dcause"><b>왜 ' + NUM.charAt(picked) + "를 골랐나 — "
            + esc(chosen.cause || "") + "</b><br>" + esc(chosen.why) + "</div>";
        }
        if (right && conf === "guess") {
          h += '<div class="dcause"><b>찍어서 맞음</b><br>'
            + "모르는 것으로 적어 둘게. 다음에 다시 물어볼 거야.</div>";
        }
        if (it.solve.trap) h += '<div class="dtrap"><b>여기서 흔히 걸려</b> — ' + esc(it.solve.trap) + "</div>";
        h += "</div>";
        h += '<button class="qnext show" data-next="1">'
          + (i + 1 < order.length ? "다음 문제 →" : "결과 보기") + "</button>";
      }

      h += "</div>";
      root.innerHTML = h;
    }

    function grade() {
      var cur = order[i], it = cur.it, v = cur.v;
      var right = picked === v.a, chosen = v.o[picked] || {};
      log[it.id] = {
        correct: right, conf: conf,
        cause: right ? null : (chosen.cause || null),
        oi: it.o.indexOf(chosen),
        type: it.type, unit: S.unit,
        at: new Date().toISOString().slice(0, 10)
      };
      save(); shown = true; render();
    }

    function finish() {
      var ids = S.items.map(function (x) { return x.id; });
      var done = ids.filter(function (x) { return log[x]; });
      var ok = done.filter(function (x) { return log[x].correct; });
      var luck = ok.filter(function (x) { return log[x].conf === "guess"; });
      var bad = done.filter(function (x) { return !log[x].correct; });

      var byCause = {};
      bad.forEach(function (x) { var c = log[x].cause || "미분류"; byCause[c] = (byCause[c] || 0) + 1; });
      var causeLine = Object.keys(byCause).sort(function (a, b) { return byCause[b] - byCause[a]; })
        .map(function (c) { return c + " " + byCause[c] + "개"; }).join(" · ");

      var lines = ["문제은행 결과 " + S.id + " / " + S.subject + " " + S.title];
      lines.push("맞음 " + ok.length + " / " + done.length + (luck.length ? " (찍맞 " + luck.length + ")" : ""));
      if (bad.length) {
        lines.push("틀림:");
        bad.forEach(function (x) {
          var oi = log[x].oi, mk = (oi >= 0 && oi < 5) ? " 보기" + NUM.charAt(oi) : "";
          lines.push("- " + x + mk + " 원인 " + (log[x].cause || "?") + " 확신도 " + (log[x].conf || "?"));
        });
      }
      if (luck.length) { lines.push("찍어서 맞음:"); luck.forEach(function (x) { lines.push("- " + x); }); }
      var sure = ok.filter(function (x) { return log[x].conf !== "guess"; });
      if (sure.length) {
        lines.push("맞음:");
        sure.forEach(function (x) { lines.push("- " + x + " 확신도 " + (log[x].conf || "?")); });
      }

      var pct = done.length ? Math.round(ok.length / done.length * 100) : 0;
      root.innerHTML = '<div class="card"><div class="qdone">'
        + '<div class="big">' + ok.length + " / " + done.length + "</div>"
        + '<p style="margin:6px 0 2px;font-size:15px">정답률 ' + pct + "%</p></div>"
        + '<div class="dsum">'
        + '<div><div class="k">맞음</div><div class="v">' + (ok.length - luck.length) + "</div></div>"
        + '<div><div class="k">찍어서 맞음</div><div class="v">' + luck.length + "</div></div>"
        + '<div><div class="k">틀림</div><div class="v">' + bad.length + "</div></div></div>"
        + (causeLine
            ? '<div class="box a"><div class="t">🔎 틀린 이유</div>' + esc(causeLine)
              + "<br><span style=\"font-size:12.5px\">유형이 보이면 그게 다음에 공부할 지점이야.</span></div>"
            : '<div class="box g"><div class="t">🎉 다 맞았어</div>이 단원은 실전 수준까지 잡혔어.</div>')
        + '<div class="box b"><div class="t">📮 아빠에게 보내기</div>'
        + "아래를 복사해서 보내면 <b>틀린 것만 골라 다시 물어보는 일정</b>을 잡아줄게."
        + '<textarea id="drillOut" readonly>' + esc(lines.join("\n")) + "</textarea>"
        + '<button class="btn" data-copy="1" style="width:100%;margin-top:8px">결과 복사</button></div>'
        + '<button class="btn" data-restart="1" style="width:100%;background:#94a3b8">↺ 처음부터 다시</button>'
        + "</div>";
    }

    root.addEventListener("click", function (ev) {
      var o = ev.target.closest(".qopt");
      if (o && !shown && !o.disabled) { picked = +o.getAttribute("data-i"); render(); return; }
      var c = ev.target.closest("button[data-c]");
      if (c && !shown && picked !== null) { conf = c.getAttribute("data-c"); grade(); return; }
      if (ev.target.closest("[data-next]")) { i++; picked = null; conf = null; shown = false; render(); return; }
      if (ev.target.closest("[data-restart]")) { try { localStorage.removeItem(KEY); } catch (e) {} log = {}; start(); return; }
      if (ev.target.closest("[data-copy]")) {
        var t = document.getElementById("drillOut"), b = ev.target;
        t.select(); t.setSelectionRange(0, 99999);
        var ok2 = function () { var old = b.textContent; b.textContent = "복사했어 ✓"; setTimeout(function () { b.textContent = old; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(ok2, function () { try { document.execCommand("copy"); ok2(); } catch (e) {} });
        else { try { document.execCommand("copy"); ok2(); } catch (e) {} }
      }
    });

    start();
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
