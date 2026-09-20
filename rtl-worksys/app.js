/* RTL WorkSys — 렌더러. 콘텐츠는 전부 content.js. */
(function () {
  "use strict";
  var W = window.WS, app = document.getElementById("app");

  /* ── 저장소 (실패해도 앱은 동작) ── */
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ── 유틸 ── */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // 본문 안의 `code` 와 <이름> 을 안전하게 표시
  function tx(s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function h(tag, cls, inner) {
    return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">" + (inner || "") + "</" + tag + ">";
  }
  function stageById(id) {
    for (var i = 0; i < W.stages.length; i++) if (W.stages[i].id === id) return W.stages[i];
    return null;
  }
  function docById(id) {
    for (var i = 0; i < W.docs.length; i++) if (W.docs[i].id === id) return W.docs[i];
    return null;
  }

  /* ── 블록 렌더 (설계 절 본문) ── */
  function block(b) {
    if (b.h) return h("h3", "", esc(b.h));
    if (b.p) return h("p", "", tx(b.p));
    if (b.note) return h("div", "note", tx(b.note));
    if (b.code) return "<pre>" + esc(b.code) + "</pre>";
    if (b.ul) return '<ul class="li">' + b.ul.map(function (x) { return h("li", "", tx(x)); }).join("") + "</ul>";
    if (b.table) {
      var t = b.table;
      return '<div class="tblwrap"><table><thead><tr>' +
        t.head.map(function (x) { return h("th", "", esc(x)); }).join("") +
        "</tr></thead><tbody>" +
        t.rows.map(function (r) {
          return "<tr>" + r.map(function (c) { return h("td", "", tx(c)); }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }
    return "";
  }
  function blocks(arr) { return arr.map(block).join(""); }

  /* ── 탭: 개요 ── */
  function viewHome() {
    var m = W.home, o = "";
    o += '<div class="hero">' +
      h("div", "tl", esc(W.meta.tagline)) +
      h("p", "mut small", esc(W.meta.subtitle) + " · core(분류 → 자율 진행)만 다룬다.") +
      h("div", "up", "v" + W.meta.version + " · " + W.meta.updated + " 갱신") +
      "</div>";

    o += '<div class="card"><h2>30초 요약</h2><ol class="li steps5">' +
      m.summary.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ol></div>";

    o += '<div class="card"><h2>왜 만드는가</h2>' + h("p", "lead", tx(m.why)) +
      h("h3", "", "무엇이 아닌가") +
      '<ul class="li">' + m.notWhat.map(function (s) { return h("li", "mut", tx(s)); }).join("") + "</ul></div>";

    o += '<div class="card"><h2>당신이 등장하는 순간 <span class="tag g">반드시 둘</span></h2>';
    m.must.forEach(function (r) {
      o += '<div class="mustrow">' + h("div", "t", esc(r.when)) +
        '<div class="kv"><b>받는 것 —</b> ' + tx(r.get) + "</div>" +
        '<div class="kv"><b>하는 것 —</b> ' + tx(r.do) + "</div></div>";
    });
    o += "</div>";

    o += '<div class="card"><h2>시스템이 스스로 멈추고 부른다 <span class="tag y">조건부 여섯</span></h2>' +
      h("p", "mut small", "분류 직후, 일을 시작하기 전에 다섯 조건을 이 순서로 검사한다. 하나라도 걸리면 그 조건의 방식으로 멈춘다. 여섯 번째는 workflow 안에 미리 표시된 사람 결정 지점이다.");
    m.cond.forEach(function (c) {
      o += '<div class="condrow"><div class="t">' + h("span", "n", c.n) + esc(c.name) +
        h("span", "tag " + (c.hold === "stop" ? "r" : c.hold === "HD" ? "" : "y"), esc(c.hold)) + "</div>" +
        '<div class="kv mut">' + tx(c.what) + "</div>" +
        '<div class="kv"><b>시스템 —</b> ' + tx(c.leaves) + "</div>" +
        '<div class="kv"><b>당신 —</b> ' + tx(c.you) + "</div>" +
        '<div class="kv dim"><b>답하지 않으면 —</b> ' + tx(c.silent) + "</div></div>";
    });
    o += h("div", "note", tx(m.execHitl)) + "</div>";

    o += '<div class="card"><h2>당신이 등장하지 않는 순간</h2>' + h("p", "", tx(m.notYou)) + "</div>";
    return o;
  }

  /* ── 탭: 아홉 단계 ── */
  function viewCore(sel) {
    var cur = sel || get("ws_stage", W.stages[0].id);
    var o = '<div class="card"><h2>core — ticket 한 건이 지나가는 아홉 단계</h2>' +
      h("p", "mut small", "단계마다 work repo의 <code>tasks/&lt;TICKET-KEY&gt;/</code> 폴더에 파일 하나가 남는다. 어느 파일 하나만 열어도 지금 무슨 일이 어디까지 갔는지 알 수 있어야 한다.") +
      '<div class="legend"><span><i class="h-yes"></i>사람이 반드시</span><span><i class="h-cond"></i>조건부</span><span><i class="h-no"></i>사람 없이</span></div></div>';

    o += '<div class="rail" id="rail">' + W.stages.map(function (s) {
      return '<button data-stage="' + s.id + '"' + (s.id === cur ? ' class="on"' : "") + ">" +
        s.n + " " + esc(s.name) + '<i class="h h-' + s.human + '"></i></button>';
    }).join("") + "</div>";

    var s = stageById(cur);
    o += '<div class="stagecard">' +
      h("div", "num", "STAGE " + s.n + " / 9") +
      '<div class="nm">' + esc(s.name) + "<em>" + esc(s.ko) + "</em></div>" +
      h("p", "lead", tx(s.does)) +
      h("div", "filerow", "남는 것 · " + esc(s.file)) +
      '<ul class="li">' + s.detail.map(function (d) { return h("li", "", tx(d)); }).join("") + "</ul>";
    if (s.docs && s.docs.length) {
      o += h("h3", "", "관련 설계") +
        s.docs.map(function (id) {
          var d = docById(id);
          return d ? '<button class="deeplink" data-doc="' + id + '">✎ ' + esc(d.title) + "</button>" : "";
        }).join("");
    }
    o += "</div>";

    var idx = W.stages.indexOf(s);
    o += '<div class="pnav">' +
      '<button data-stage="' + (idx > 0 ? W.stages[idx - 1].id : "") + '"' + (idx === 0 ? " disabled" : "") + ">← 이전 단계</button>" +
      '<button class="pri" data-stage="' + (idx < 8 ? W.stages[idx + 1].id : "") + '"' + (idx === 8 ? " disabled" : "") + ">다음 단계 →</button></div>";
    return o;
  }

  /* ── 탭: 사례 ── */
  function viewCases() {
    var o = '<div class="card"><h2>가상 ticket walkthrough</h2>' +
      h("p", "mut small", "설계가 실제 ticket을 감당하는지 확인한 사례들이다. 모든 ticket·블록·stream 이름은 가상이다. 사례를 고르면 아홉 단계를 한 장씩 따라간다.") + "</div>";
    o += '<div class="caselist">' + W.cases.map(function (c) {
      return '<button class="caseitem" data-case="' + c.id + '">' +
        h("div", "id", c.id) + h("div", "ti", esc(c.title)) + h("div", "fr", esc(c.from)) +
        h("div", "on1", tx(c.one)) +
        '<div class="tags">' + c.tags.map(function (t) { return h("span", "tag n", esc(t)); }).join("") +
        '<span class="hcount">사람 등장 ' + c.humanCount + "회</span></div></button>";
    }).join("") + "</div>";
    return o;
  }

  function viewCase(id, step) {
    var c = null;
    for (var i = 0; i < W.cases.length; i++) if (W.cases[i].id === id) c = W.cases[i];
    if (!c) return viewCases();
    var n = Math.max(0, Math.min(step || 0, c.steps.length - 1));
    var st = c.steps[n], sd = stageById(st.stage);

    var o = '<button class="back" id="back">← 사례 목록</button>';
    o += '<div class="card"><h2>' + esc(c.title) + "</h2>" +
      h("div", "fr dim xs", esc(c.from)) + h("p", "mut small", tx(c.one)) + "</div>";

    o += '<div class="player"><div class="pbar">' + c.steps.map(function (s, i) {
      return "<i class=" + (i === n ? '"on"' : s.human ? '"hm"' : '""') + "></i>";
    }).join("") + "</div>";

    o += '<div class="pstep"><div class="sn">' +
      h("span", "tag", (sd ? sd.n + " " + sd.name : st.stage)) +
      (st.note ? h("span", "tag n", esc(st.note)) : "") +
      (st.hold ? h("span", "tag r", esc(st.hold)) : "") +
      (st.human ? h("span", "tag y", "사람 등장") : "") +
      '<span class="hcount">' + (n + 1) + " / " + c.steps.length + "</span></div>" +
      h("p", "", tx(st.text));
    if (sd) o += '<button class="deeplink" data-stage-go="' + sd.id + '">▤ 이 단계의 설계 보기</button>';
    o += "</div>";

    o += '<div class="pnav">' +
      '<button data-step="' + (n - 1) + '"' + (n === 0 ? " disabled" : "") + ">← 이전</button>" +
      '<button class="pri" data-step="' + (n + 1) + '"' + (n === c.steps.length - 1 ? " disabled" : "") + ">다음 →</button></div></div>";

    if (n === c.steps.length - 1) {
      o += '<div class="card" style="margin-top:12px"><h2>이 사례에서 볼 것</h2>' + h("p", "lead", tx(c.takeaway)) + "</div>";
    }
    return o;
  }

  /* ── 탭: 설계 ── */
  function viewDocs(openId) {
    var o = '<div class="card"><h2>설계</h2>' +
      h("p", "mut small", "core의 형식과 규칙이다. 숫자(임계값·횟수·기간)는 전부 공란이고 대신 목적·결정 주체를 적는다.") + "</div>";
    var group = null;
    W.docs.forEach(function (d) {
      if (d.group !== group) { group = d.group; o += h("div", "grouphd", esc(group)); }
      var open = d.id === openId ? " open" : "";
      o += '<details class="doc" id="doc-' + d.id + '"' + open + "><summary>" + esc(d.title) + "</summary>" +
        '<div class="docbody">' + blocks(d.body) + "</div></details>";
    });

    o += h("div", "grouphd", "원칙");
    o += '<details class="doc"><summary>왜 이 구조인가 — 원칙 열 개</summary><div class="docbody">' +
      W.principles.map(function (p) {
        return '<div class="condrow"><div class="t">' + h("span", "n", p.n) + esc(p.name) + "</div>" +
          h("div", "kv", tx(p.what)) + h("div", "kv dim", "<b>근거 —</b> " + tx(p.why)) + "</div>";
      }).join("") + "</div></details>";
    o += '<details class="doc"><summary>대안 — 무엇을 버렸나</summary><div class="docbody">' +
      block({ table: { head: ["안", "내용", "왜 아닌가 / 어디에 남았나"], rows: W.alternatives.map(function (a) { return [a.name, a.what, a.why]; }) } }) +
      "</div></details>";
    o += '<details class="doc"><summary>용어</summary><div class="docbody"><dl class="glo">' +
      W.glossary.map(function (g) { return "<dt>" + tx(g[0]) + "</dt><dd>" + tx(g[1]) + "</dd>"; }).join("") +
      "</dl></div></details>";
    return o;
  }

  /* ── 탭: 로드맵 ── */
  function viewRoad() {
    var o = '<div class="card"><h2>오늘의 방식에서 여기까지 — 네 단계</h2>' +
      h("p", "mut small", "도입 순서의 제안이다. 기간·건수·비율 같은 숫자는 전부 공란이고, 대신 그 판단의 목적과 결정 주체를 적는다. 단계를 넘어가는 결정은 언제나 사람이 한다.") + "</div>";

    W.migration.forEach(function (m) {
      o += '<div class="mstage"><div class="mh">' + h("div", "mn", m.n) + h("div", "mt", esc(m.name)) + "</div>" +
        '<div class="trow"><b>켜지는 것</b><span>' + tx(m.on) + "</span></div>" +
        '<div class="trow"><b>사람</b><span>' + tx(m.human) + "</span></div>" +
        '<div class="trow"><b>쌓이는 것</b><span>' + tx(m.stack) + "</span></div>" +
        '<div class="trow"><b>되돌리기</b><span>' + tx(m.undo) + "</span></div>" +
        '<div class="trow"><b>다음으로</b><span class="mut">' + tx(m.next) + "</span></div></div>";
    });

    o += '<div class="card"><h2>단계와 무관하게 항상 참인 것</h2><ul class="li">' +
      W.migrationAlways.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ul></div>";

    o += '<div class="card"><h2>숫자는 비워 둔다</h2>' +
      h("p", "mut small", "설계자가 초기값을 정해 버리면 받아들이는 사람이 생각하고 결정할 몫을 뺏는다. 스스로 정한 숫자는 지켜지고, 받은 숫자는 의심받는다.") +
      block({ table: { head: ["항목", "목적", "결정 주체", "결정 방법"], rows: W.blanks } }) + "</div>";

    o += '<div class="card"><h2>열린 긴장 — 숨기지 않는 것</h2>' +
      h("p", "mut small", "이 구조가 풀지 못했거나, 실제 ticket을 겪어야 답이 나오는 것들이다. 이 지점에서 의문을 가진다면 그것이 맞다.") +
      W.tensions.map(function (t) {
        return '<div class="tension">' + h("div", "tt", esc(t.t)) + h("div", "small mut", tx(t.p)) + "</div>";
      }).join("") + "</div>";
    return o;
  }

  /* ── 탭: 소개 ── */
  function viewAbout() {
    var a = W.about;
    var o = '<div class="card"><h2>이 노트에 대하여</h2>' +
      h("p", "lead", tx(a.who)) + h("p", "", tx(a.why)) + h("p", "", tx(a.how)) +
      h("div", "note", tx(a.scope)) + h("p", "dim small", tx(a.status)) + "</div>";
    o += '<div class="card"><h2>설계의 재료</h2>' +
      h("p", "mut small", "공개 자료와 공식 문서에서 확인한 것들이다. 조직 내부 자료는 쓰지 않았다.") +
      '<ul class="li">' + W.sources.map(function (s) {
        return h("li", "", "<b>" + tx(s.t) + "</b><br><span class='mut small'>" + tx(s.n) + "</span>");
      }).join("") + "</ul></div>";
    o += '<div class="card"><h2>규율</h2><ul class="li">' +
      ["특정 조직의 실명·수치·코드·ticket 원문은 쓰지 않는다. 모든 예시는 가상이다.",
        "숫자는 공란으로 두고 목적·결정 주체·결정 방법만 적는다.",
        "이 앱은 core만 다룬다. 갈래는 사례 안에서만 스친다.",
        "설계가 바뀌면 이 앱이 바뀐다. 이전 판과의 비교는 두지 않는다."
      ].map(function (s) { return h("li", "mut", tx(s)); }).join("") + "</ul></div>";
    return o;
  }

  /* ── 라우팅 ── */
  var TABS = ["home", "core", "cases", "docs", "road", "about"];
  var state = { tab: get("ws_tab", "home"), caseId: null, step: 0, docOpen: null, stage: null };

  // #core/gate · #cases/C1 · #docs/posture 같은 해시를 읽는다 (공유 가능한 링크)
  function readHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return false;
    var parts = raw.split("/");
    if (TABS.indexOf(parts[0]) < 0) return false;
    state.tab = parts[0]; state.caseId = null; state.step = 0;
    if (parts[1]) {
      if (state.tab === "core") state.stage = parts[1];
      else if (state.tab === "cases") state.caseId = parts[1].toUpperCase();
      else if (state.tab === "docs") state.docOpen = parts[1];
    }
    return true;
  }
  function writeHash() {
    var frag = state.tab;
    if (state.tab === "core" && state.stage) frag += "/" + state.stage;
    else if (state.tab === "cases" && state.caseId) frag += "/" + state.caseId;
    if (("#" + frag) !== location.hash) {
      try { history.replaceState(null, "", "#" + frag); } catch (e) { location.hash = frag; }
    }
  }

  function paint() {
    var t = state.tab, html;
    if (t === "home") html = viewHome();
    else if (t === "core") html = viewCore(state.stage);
    else if (t === "cases") html = state.caseId ? viewCase(state.caseId, state.step) : viewCases();
    else if (t === "docs") html = viewDocs(state.docOpen);
    else if (t === "road") html = viewRoad();
    else html = viewAbout();
    html += '<footer>RTL WorkSys · v' + W.meta.version + " · " + W.meta.updated +
      "<br>개인 프로젝트의 공개 설계 노트. 모든 사례는 가상이다.</footer>";
    app.innerHTML = html;
    writeHash();

    var btns = document.querySelectorAll("#nav button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = btns[i].dataset.tab === t ? "on" : "";
    }
    if (state.docOpen) {
      var el = document.getElementById("doc-" + state.docOpen);
      if (el) el.scrollIntoView({ block: "start" });
      state.docOpen = null;
    } else {
      window.scrollTo(0, 0);
    }
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.tab = b.dataset.tab; state.caseId = null; state.step = 0;
    set("ws_tab", state.tab); paint();
  });

  app.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.id === "back") { state.caseId = null; state.step = 0; return paint(); }
    if (b.dataset.case) { state.caseId = b.dataset.case; state.step = 0; return paint(); }
    if (b.dataset.step !== undefined && state.caseId) { state.step = +b.dataset.step; return paint(); }
    if (b.dataset.doc) { state.tab = "docs"; state.docOpen = b.dataset.doc; set("ws_tab", "docs"); return paint(); }
    if (b.dataset.stageGo) { state.tab = "core"; state.stage = b.dataset.stageGo; set("ws_stage", state.stage); set("ws_tab", "core"); state.caseId = null; return paint(); }
    if (b.dataset.stage) { state.stage = b.dataset.stage; set("ws_stage", state.stage); return paint(); }
  });

  /* ── 테마 ── */
  var saved = get("ws_theme", "");
  if (saved) document.documentElement.dataset.theme = saved;
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.dataset.theme = "light";
  }
  document.getElementById("theme").addEventListener("click", function () {
    var next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next; set("ws_theme", next);
    var mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.content = next === "light" ? "#f6f8fc" : "#0f1420";
  });

  window.addEventListener("hashchange", function () { if (readHash()) paint(); });

  document.getElementById("sub").textContent = W.meta.subtitle;
  readHash();
  paint();
})();
