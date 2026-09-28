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
      h("p", "mut small", esc(W.meta.subtitle) + " · core와 설계 작업 현황을 본다.") +
      h("div", "up", "v" + W.meta.version + " · " + W.meta.updated + " 갱신") +
      '<button class="deeplink" data-map-go="core">▶ 한 장 · 15초 (core · intake · workflow)</button> ' +
      '<button class="deeplink" data-tab-go="talk">? 더 깊게 논의할 것</button> ' +
      '<button class="deeplink" data-tab-go="status">◎ 설계 작업 현황 (' + esc(W.status.asOf) + " 기준)</button>" +
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

  /* ── core 한 장 (그림 · 15초 애니메이션) ── */
  var ZTAG = ["", "m", "y", "g"];
  function goBtn(g) {
    // g = [라벨, 종류(stage|deep|tab|bun|map), 대상]
    var at = { stage: "data-stage-go", deep: "data-deep-go", tab: "data-tab-go", bun: "data-bun-go", map: "data-map-go" }[g[1]] || "data-tab-go";
    return '<button class="deeplink" ' + at + '="' + esc(g[2]) + '">▸ ' + esc(g[0]) + "</button>";
  }
  function viewMap() {
    var id = W.maps[state.map] ? state.map : "core", M = W.maps[id], o = "";
    var th = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    o += '<div class="rail">' + W.mapOrder.map(function (k) {
      return '<button data-map-go="' + k + '"' + (k === id ? ' class="on"' : "") + ">" + esc(W.maps[k].tab) + "</button>";
    }).join("") + "</div>";
    o += '<div class="card"><h2>' + esc(M.title) + ' <span class="tag g">그림 · 15초 애니메이션</span></h2>' +
      h("p", "lead", tx(M.lead)) + (M.go ? M.go.map(goBtn).join(" ") : "") + "</div>";
    o += '<div class="mapmedia"><img src="' + M.media.gif + '" alt="' + esc(M.title) + ' 15초 애니메이션" loading="lazy"></div>';
    o += '<div class="maplinks">' +
      [["mp4 (1920×1080)", M.media.mp4], ["그림 · 라이트", M.media.png.light], ["그림 · 다크", M.media.png.dark],
        ["움직이는 HTML", M.media.html + "?theme=" + th]].map(function (l) {
        return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + " ↗</a>";
      }).join("") + "</div>";

    o += '<div class="card"><h2>15초의 흐름</h2><div class="story">' + M.story.map(function (s) {
      return '<div class="srow">' + h("span", "st", esc(s[0])) + "<div>" + h("div", "b", tx(s[1])) +
        h("div", "mut small", tx(s[2])) + "</div></div>";
    }).join("") + "</div></div>";

    o += '<a class="mapimg" href="' + M.media.png[th] + '" target="_blank" rel="noopener"><img src="' + M.media.png[th] +
      '" alt="' + esc(M.title) + ' 그림" loading="lazy"></a>' + h("p", "dim xs center", "그림을 누르면 원본 크기(1920×1080)로 열린다.");

    o += '<div class="card"><h2>' + esc(M.whyTitle || "왜 중요한가") + '</h2><ol class="why4">' + M.why.map(function (w) {
      return "<li>" + h("b", "", esc(w[0])) + h("span", "", tx(w[1])) + "</li>";
    }).join("") + "</ol></div>";

    M.zones.forEach(function (z) {
      o += '<div class="card zone z' + z.z + '"><h2>' + esc(z.name) + ' <span class="tag ' + ZTAG[z.z] + '">' + esc(z.stages) + "</span></h2>" +
        h("p", "", tx(z.what)) + '<ul class="li">' + z.ul.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ul>" +
        (z.go || []).map(goBtn).join(" ") + "</div>";
    });

    if (M.topics) {
      o += '<div class="card"><h2>' + esc(M.topicsTitle || "core 위에 얹힐 주제") + ' <span class="tag n">주제마다 한 장</span></h2>' +
        '<div class="tblwrap"><table><thead><tr><th>주제</th><th>자리</th><th>지금</th><th>한 장</th></tr></thead><tbody>' +
        M.topics.map(function (r) {
          return "<tr><td><strong>" + esc(r[0]) + "</strong></td><td>" + esc(r[1]) + '</td><td><span class="tag ' + r[3] + '">' +
            esc(r[2]) + "</span></td><td>" + tx(r[4]) + "</td></tr>";
        }).join("") + "</tbody></table></div>" + h("div", "note", tx(M.topicsNote)) + "</div>";
    }
    if (M.docs) {
      o += '<div class="card"><h2>그림 문서 <span class="tag m">정적 · 자세히</span></h2>' + h("p", "mut small", tx(M.docsNote)) +
        '<div class="igdocs">' + M.docs.map(function (d) {
          return '<a class="igdoc" href="' + d[0] + '" target="_blank" rel="noopener"><b>' + esc(d[1]) + " ↗</b><span>" + tx(d[2]) + "</span></a>";
        }).join("") + "</div></div>";
    }
    o += '<div class="card"><button class="deeplink" data-tab-go="talk">? 더 깊게 논의할 것</button></div>';
    return o;
  }

  /* ── 더 깊게 논의할 것 ── */
  function viewTalk() {
    var T = W.talk, o = "";
    o += '<div class="hero">' + h("div", "tl", esc(T.title)) + h("p", "", tx(T.lead)) +
      h("div", "up", T.asOf + " 기준 · 봤음 표시는 이 기기에만 남는다") + "</div>";
    o += '<div class="rail">' + T.groups.map(function (g) {
      return '<button data-scroll="tg-' + g.id + '">' + esc(g.short) + " " + g.items.length + "</button>";
    }).join("") + "</div>";
    T.groups.forEach(function (g) {
      var seen = g.items.filter(function (it) { return get("ws_seen_" + it.id, ""); }).length;
      o += '<div class="card" id="tg-' + g.id + '"><h2>' + esc(g.title) + ' <span class="tag ' + (g.cls || "y") + '">' +
        seen + " / " + g.items.length + " 봤음</span></h2>" + h("p", "mut small", tx(g.note));
      g.items.forEach(function (it) {
        var s = get("ws_seen_" + it.id, "");
        o += '<div class="talk' + (s ? " seen" : "") + '"><div class="t">' + esc(it.t) +
          (it.tag ? h("span", "tag " + it.tag[1], esc(it.tag[0])) : "") + "</div>" +
          h("div", "kv", tx(it.what)) +
          (it.now ? '<div class="kv mut"><b>지금 가정 —</b> ' + tx(it.now) + "</div>" : "") +
          (it.ask ? '<div class="kv ask"><b>판단할 것 —</b> ' + tx(it.ask) + "</div>" : "") +
          '<div class="tgo">' + (it.go || []).map(goBtn).join(" ") +
          ' <button class="seenb" data-talk-seen="' + it.id + '">' + (s ? "✓ 봤음" : "○ 봤음 표시") + "</button></div></div>";
      });
      o += "</div>";
    });
    return o;
  }

  /* ── 탭: 아홉 단계 ── */
  function viewCore(sel) {
    var cur = sel || get("ws_stage", W.stages[0].id);
    var o = '<div class="card"><h2>core — ticket 한 건이 지나가는 아홉 단계</h2>' +
      h("p", "mut small", "단계마다 work repo의 <code>tasks/&lt;TICKET-KEY&gt;/</code> 폴더에 파일 하나가 남는다. 어느 파일 하나만 열어도 지금 무슨 일이 어디까지 갔는지 알 수 있어야 한다.") +
      '<div class="legend"><span><i class="h-yes"></i>사람이 반드시</span><span><i class="h-cond"></i>조건부</span><span><i class="h-no"></i>사람 없이</span></div>' +
      '<button class="deeplink" data-map-go="core">▶ core 한 장 (그림 · 15초 애니메이션)</button></div>';

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
      h("p", "mut small", "설계가 실제 ticket을 감당하는지 확인한 사례들이다. 모든 ticket·블록·신호 이름은 가상이다. 사례를 고르면 아홉 단계를 한 장씩 따라간다.") + "</div>";
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


  /* ── 탭: 현황 ── */
  var ST_TAG = { done: "g", wip: "y", seed: "m", plan: "" };
  function stTag(st, label) { return h("span", "tag " + (ST_TAG[st] || ""), esc(label)); }
  function hasDeep(id) {
    for (var i = 0; i < W.deep.length; i++) if (W.deep[i].id === id) return true;
    return false;
  }
  function viewStatus() {
    var s = W.status, o = "";
    o += '<div class="hero">' + h("div", "tl", "설계 작업 현황") +
      '<ol class="li steps5">' + s.headline.map(function (x) { return h("li", "", tx(x)); }).join("") + "</ol>" +
      h("div", "up", s.asOf + " 기준") +
      '<button class="deeplink" data-tab-go="talk">? 더 깊게 논의할 것</button> <button class="deeplink" data-map-go="core">▶ 한 장 · 15초</button></div>';

    o += '<div class="card"><h2>작업 줄기</h2>';
    s.tracks.forEach(function (t) {
      o += '<div class="condrow"><div class="t">' + esc(t.name) + stTag(t.st, t.label) + "</div>" +
        h("div", "kv mut", tx(t.what)) + '<div class="kv"><b>다음 —</b> ' + tx(t.next) + "</div></div>";
    });
    o += "</div>";

    o += '<div class="card"><h2>주제 여덟</h2>' +
      h("p", "mut small", "core 둘과 갈래, 그리고 마지막 빈칸 찾기다. 심화 페이지가 있는 주제는 눌러서 연다.");
    s.topics.forEach(function (r) {
      var name = hasDeep(r[0]) ? '<button class="deeplink inl" data-deep-go="' + r[0] + '">⇥ ' + esc(r[0]) + "</button>" : "<b>" + esc(r[0]) + "</b>";
      o += '<div class="condrow"><div class="t">' + name + h("span", "tag m", esc(r[1])) + stTag(r[2], r[3]) + "</div>" +
        h("div", "kv mut", tx(r[4])) + "</div>";
    });
    o += "</div>";

    o += '<div class="card"><h2>아이디어 메모</h2>' +
      h("p", "mut small", "설계 본선과 별도로 쌓는 단편 아이디어다. 충분히 자라면 설계 문서로 올라간다.");
    s.ideas.forEach(function (r) {
      o += '<div class="condrow"><div class="t">' + esc(r.name) + stTag(r.st, r.label) + "</div>" +
        h("div", "kv mut", tx(r.what)) + "</div>";
    });
    o += "</div>";

    o += '<div class="card"><h2>다음 할 일</h2>' +
      h("h3", "", "직접") + '<ul class="li">' + s.todo.me.map(function (x) { return h("li", "", tx(x)); }).join("") + "</ul>" +
      h("h3", "", "Claude 세션") + '<ul class="li">' + s.todo.ai.map(function (x) { return h("li", "", tx(x)); }).join("") + "</ul></div>";

    o += '<div class="card"><h2>지나온 길</h2>' +
      block({ table: { head: ["날짜", "무엇", "내용"], rows: s.timeline } }) + "</div>";
    o += '<div class="card"><h2>최근 결정</h2>' +
      block({ table: { head: ["날짜", "결정", "내용"], rows: s.decisions } }) + "</div>";
    return o;
  }

  /* ── 탭: 심화 ── */
  function deepById(id) {
    for (var i = 0; i < W.deep.length; i++) if (W.deep[i].id === id) return W.deep[i];
    return W.deep[0];
  }
  function viewDeep(id) {
    var k = deepById(id);
    var o = '<div class="rail" id="rail">' + W.deep.map(function (d) {
      return '<button data-deep="' + d.id + '"' + (d.id === k.id ? ' class="on"' : "") + ">" + esc(d.tab) + "</button>";
    }).join("") + '<button data-bun-go="ia">intake agent ▸</button><button data-bun-go="wa">workflow agent ▸</button></div>';
    o += '<div class="card"><h2>' + esc(k.title) + (k.badge ? h("span", "tag " + (k.badge === "확정" ? "g" : "y"), esc(k.badge)) : "") + "</h2>" + h("p", "lead", tx(k.lead)) + "</div>";
    if (k.ext) o += '<div class="card extcard">' + h("p", "", tx(k.ext.text)) + '<button class="deeplink" data-bun-go="' + k.ext.go + '">' + esc(k.ext.label) + "</button>" +
      (k.ext.map ? ' <button class="deeplink" data-map-go="' + k.ext.map + '">▶ 한 장 (15초)</button>' : "") +
      ' <button class="deeplink" data-tab-go="talk">? 더 깊게 논의할 것</button></div>';
    o += '<div class="card"><h2>한 장 요약</h2><ol class="li steps5">' +
      k.summary.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ol>" +
      h("div", "note", tx(k.excluded)) + "</div>";
    o += '<div class="card"><div class="docbody" style="padding:0">' + blocks(k.body) + "</div></div>";
    o += '<div class="card"><h2>관련 설계</h2>' +
      (k.related || []).map(function (rid) {
        var d = docById(rid);
        return d ? '<button class="deeplink" data-doc="' + rid + '">✎ ' + esc(d.title) + "</button>" : "";
      }).join("") +
      (k.stages || []).map(function (sid) {
        var st = stageById(sid);
        return st ? '<button class="deeplink" data-stage-go="' + sid + '">▤ 단계 ' + st.n + " " + esc(st.name) + "</button>" : "";
      }).join("") + "</div>";
    return o;
  }

  /* ── agent 명세 탐색기: intake(#ia) · workflow(#wa). 데이터는 처음 열 때 불러온다 ── */
  var BUN = {
    ia: { g: "IA", src: "intake_agent.js", deep: "intake", name: "intake agent system", tag: "심화 결과 · 교정 대기",
      secs: [["overview", "개요"], ["design", "설계"], ["arch", "구조"], ["agents", "부품 10"], ["contracts", "계약 3"],
        ["rules", "규칙 8"], ["golden", "시험 91"], ["eval", "평가"], ["session", "세션 기록"]],
      facets: [["group", "입구"], ["mode", "mode"], ["gate", "gate"]],
      lead: function (I) {
        return "intake 심화 세션(09-27~28)이 intake를 설명 문서에서 세울 수 있는 agent 시스템의 명세로 옮긴 결과 전체다. 부품 " + I.stats.agents +
          " · 데이터 계약 " + I.stats.schemas + " · 규칙 설정 " + I.stats.rules + " · 시험 사례 " + I.stats.cases + "건. 세세한 가정과 결정은 위임으로 정해졌고 교정을 기다린다.";
      },
      read: "읽는 순서: 개요(전체 설명) → 구조 §2~§4 → 시험 사례 몇 건. 가정을 가장 많이 넣은 줄은 세션 기록 › 읽기 안내에 모여 있다.",
      rulesNote: "규칙 설정(YAML)이다. 숫자는 공란이고 결정 주체가 적혀 있다. # 줄은 설명, 굵은 이름은 key다.",
      golden: "가상 발생마다 무엇이 나와야 하는지(기대 결과)와 그 이유를 적은 시험 세트다. 회사에서 agent를 세운 뒤에는 회귀 시험이 된다. hard-zero 셋: 위험 놓침 0 · 잘못 붙이기 0 · 밖으로 새기 0." },
    wa: { g: "WA", src: "workflow_agent.js", deep: "workflow", name: "workflow agent system", tag: "심화 결과 · 교정 대기",
      secs: [["overview", "개요"], ["design", "설계 85"], ["arch", "구조"], ["agents", "부품 11"], ["library", "workflow 라이브러리"],
        ["contracts", "계약 11"], ["rules", "설정 3"], ["golden", "시험 68"], ["eval", "평가 · 세우기"], ["session", "세션 기록"]],
      facets: [["group", "종류"], ["wf", "workflow"], ["posture", "posture"]],
      lead: function (I) {
        return "workflow 자율 세션(09-28)이 workflow를 세울 수 있는 agent 시스템의 명세로 옮긴 결과 전체다. 중심은 표준화된 workflow 라이브러리(공통 골격 → 작업 모양 일곱 → 업무별 특화 열여섯, 조립 둘)이고, 부품 " +
          I.stats.agents + " · 데이터 계약 " + I.stats.schemas + " · 시험 사례 " + I.stats.cases + "건(해석 " + I.stats.byGroup["해석"] + " · 한 바퀴 " + I.stats.byGroup["한 바퀴"] +
          " · replay " + I.stats.byGroup["replay"] + ")이 함께 있다. 결정 75항은 위임으로 정해졌고 교정을 기다린다.";
      },
      read: "읽는 순서: 개요(전체 설명) → workflow 라이브러리 › 라이브러리 설명 → 공통 골격 → 관심 있는 특화 하나. 교정 후보 11은 세션 기록 › 인계 문서 §7.",
      rulesNote: "회사가 값을 채우는 설정(YAML)과 시험 사례가 공통으로 가정하는 설정이다. 숫자는 공란이고 결정 주체가 적혀 있다.",
      golden: "해석(상속·조립을 풀어 checkpoint 목록이 맞는가, 결정론) · 한 바퀴(가상 task가 plan부터 학습까지 어떤 모양으로 지나가는가) · replay(workflow를 고칠 때 과거 기록으로 판정이 어떻게 바뀌는가). hard-zero 셋: 경계 넘기 0 · 근거 없는 판정 0 · 사람 기록 훼손 0." }
  };
  function bk() { return state.tab === "wa" ? "wa" : "ia"; }
  function BD() { return window[BUN[bk()].g]; }
  function loadBun(k, cb) {
    if (window[BUN[k].g]) return cb();
    var s = document.createElement("script");
    s.src = BUN[k].src;
    s.onload = cb;
    s.onerror = function () { app.innerHTML = '<div class="card">' + BUN[k].name + " 데이터를 불러오지 못했다.</div>"; };
    document.body.appendChild(s);
  }

  // 작은 markdown 렌더러: 제목·문단·목록(중첩)·표·code block·인용·구분선·강조·code·link
  function mdInline(s) {
    var codes = [];
    var t = String(s).replace(/`([^`]*)`/g, function (m, c) { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    var e = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    e = e.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, tt, u) {
      var d = iaDocByPath(u);
      return d ? '<button class="mdlink" data-ia-doc="' + d.sec + "/" + d.id + '">' + tt + "</button>" : "<u>" + tt + "</u>";
    });
    return e.replace(/\u0000(\d+)\u0000/g, function (m, i) { return "<code>" + esc(codes[+i]) + "</code>"; });
  }
  function mdCode(s) {
    // `경로.md` 처럼 code로 적힌 문서 경로도 누르면 열리게
    return s.replace(/<code>([^<]+\.(?:md|yaml|json))<\/code>/g, function (m, p) {
      var d = iaDocByPath(p);
      return d ? '<button class="mdlink code" data-ia-doc="' + d.sec + "/" + d.id + '">' + p + "</button>" : m;
    });
  }
  function md(src, toc) {
    var L = src.split("\n"), o = [], i = 0, hn = 0;
    var isList = function (l) { return /^(\s*)([-*]|\d+\.)\s+/.test(l); };
    var isBlockStart = function (l) { return /^(#{1,6}\s|```|>|\||---\s*$)/.test(l) || isList(l); };
    while (i < L.length) {
      var l = L[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      if (/^```/.test(l)) {
        var buf = []; i++;
        while (i < L.length && !/^```/.test(L[i])) buf.push(L[i++]);
        i++; o.push("<pre>" + esc(buf.join("\n")) + "</pre>"); continue;
      }
      var hm = /^(#{1,6})\s+(.*)$/.exec(l);
      if (hm) {
        var lv = hm[1].length, id = "h" + (++hn), tag = lv <= 1 ? "h2" : lv === 2 ? "h3" : "h4";
        if (toc && lv === 2) toc.push([id, hm[2]]);
        o.push("<" + tag + ' id="' + id + '">' + mdInline(hm[2]) + "</" + tag + ">"); i++; continue;
      }
      if (/^---\s*$/.test(l)) { o.push("<hr>"); i++; continue; }
      if (/^>/.test(l)) {
        var q = [];
        while (i < L.length && /^>/.test(L[i])) q.push(L[i++].replace(/^>\s?/, ""));
        o.push('<div class="note">' + md(q.join("\n")) + "</div>"); continue;
      }
      if (/^\|/.test(l) && i + 1 < L.length && /^\|?\s*:?-{2,}/.test(L[i + 1])) {
        var cells = function (r) { return r.replace(/^\||\|\s*$/g, "").split(/(?<!\\)\|/).map(function (c) { return c.trim().replace(/\\\|/g, "|"); }); };
        var head = cells(l); i += 2; var rows = [];
        while (i < L.length && /^\|/.test(L[i])) rows.push(cells(L[i++]));
        o.push('<div class="tblwrap"><table><thead><tr>' + head.map(function (c) { return "<th>" + mdInline(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + mdInline(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>");
        continue;
      }
      if (isList(l)) {
        var items = [];
        while (i < L.length && (isList(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
          var m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(L[i]);
          if (m) items.push({ ind: m[1].length, ol: /\d/.test(m[2]), t: m[3] });
          else items[items.length - 1].t += " " + L[i].trim();
          i++;
        }
        o.push(mdList(items, 0, 0).html); continue;
      }
      var p = [];
      while (i < L.length && !/^\s*$/.test(L[i]) && !(p.length && isBlockStart(L[i]))) p.push(L[i++]);
      o.push("<p>" + mdInline(p.join(" ")) + "</p>");
    }
    return mdCode(o.join(""));
  }
  function mdList(items, k, ind) {
    var ol = items[k].ol, html = ol ? '<ol class="li">' : '<ul class="li">';
    while (k < items.length && items[k].ind >= ind) {
      if (items[k].ind > ind) { var sub = mdList(items, k, items[k].ind); html = html.replace(/<\/li>$/, "") + sub.html + "</li>"; k = sub.k; continue; }
      html += "<li>" + mdInline(items[k].t) + "</li>"; k++;
    }
    return { html: html + (ol ? "</ol>" : "</ul>"), k: k };
  }

  function iaDocs(sec) { return BD().docs.filter(function (d) { return d.sec === sec; }); }
  function iaDocByPath(p) {
    var D = BD();
    if (!D) return null;
    p = String(p).replace(/^\.\.?\//, "").replace(/^\.\.\//, "");
    var all = D.docs.concat(D.rules.map(function (r) { return { sec: "rules", id: r.id, path: r.path }; }))
      .concat(D.schemas.map(function (s) { return { sec: "contracts", id: s.id, path: s.path }; }));
    for (var i = 0; i < all.length; i++) {
      var a = all[i].path;
      if (a && (a === p || a.slice(-p.length - 1) === "/" + p || p.slice(-a.length) === a)) return all[i];
    }
    return null;
  }
  function yamlHl(t) {
    return t.split("\n").map(function (ln) {
      var e = esc(ln);
      if (/^\s*#/.test(ln)) return '<span class="yc">' + e + "</span>";
      e = e.replace(/^(\s*-?\s*)([A-Za-z_][\w.\-]*)(:)/, '$1<span class="yk">$2</span>$3');
      return e.replace(/(\s#\s.*)$/, '<span class="yc">$1</span>');
    }).join("\n");
  }
  function kv(v, depth) {
    if (v === null || v === undefined) return '<span class="dim">null</span>';
    if (typeof v !== "object") return tx(String(v));
    if (Array.isArray(v)) {
      if (!v.length) return '<span class="dim">[ ]</span>';
      if (v.every(function (x) { return x === null || typeof x !== "object"; })) return v.map(function (x) { return h("span", "chip", esc(String(x))); }).join(" ");
      return '<ol class="kvl">' + v.map(function (x) { return "<li>" + kv(x, depth + 1) + "</li>"; }).join("") + "</ol>";
    }
    return '<dl class="kvt">' + Object.keys(v).map(function (k) { return "<dt>" + esc(k) + "</dt><dd>" + kv(v[k], depth + 1) + "</dd>"; }).join("") + "</dl>";
  }
  function viewIA() {
    var K = BUN[bk()], I = BD(), sec = state.ia.sec || "overview", o = "";
    o += '<div class="card"><h2>' + esc(K.name) + h("span", "tag y", K.tag) + "</h2>" +
      h("p", "lead", tx(K.lead(I))) +
      h("p", "dim small", esc(K.read) + " " + I.asOf + " 기준.") +
      '<button class="deeplink" data-deep-go="' + K.deep + '">⇥ ' + K.deep + " 요약 페이지</button> " +
      '<button class="deeplink" data-map-go="' + K.deep + '">▶ ' + K.deep + " 한 장 (15초)</button> " +
      '<button class="deeplink" data-tab-go="talk">? 더 깊게 논의할 것</button></div>';
    o += '<div class="rail">' + K.secs.map(function (s) {
      return '<button data-ia-sec="' + s[0] + '"' + (s[0] === sec ? ' class="on"' : "") + ">" + esc(s[1]) + "</button>";
    }).join("") + "</div>";

    if (sec === "rules") return o + iaRules();
    if (sec === "contracts") return o + iaContracts();
    if (sec === "golden") return o + iaGolden();

    var ds = iaDocs(sec), cur = ds.filter(function (d) { return d.id === state.ia.id; })[0] || ds[0];
    if (ds.length > 1) {
      o += '<div class="rail sub">' + ds.map(function (d) {
        return '<button data-ia-doc="' + sec + "/" + d.id + '"' + (d === cur ? ' class="on"' : "") + ">" + esc(d.short) + "</button>";
      }).join("") + "</div>";
    }
    var toc = [], body = md(cur.md, toc);
    o += '<div class="card mdb">' + (cur.path ? h("div", "dim small path", esc(cur.path)) : "") +
      (toc.length > 2 ? '<details class="toc"><summary>목차 ' + toc.length + "</summary>" + toc.map(function (t) {
        return '<button class="tocb" data-scroll="' + t[0] + '">' + mdInline(t[1]) + "</button>";
      }).join("") + "</details>" : "") + body + "</div>";
    return o;
  }
  function iaRules() {
    var I = BD(), cur = I.rules.filter(function (r) { return r.id === state.ia.id; })[0] || I.rules[0];
    var o = '<div class="rail sub">' + I.rules.map(function (r) {
      return '<button data-ia-doc="rules/' + r.id + '"' + (r === cur ? ' class="on"' : "") + ">" + esc(r.id) + "</button>";
    }).join("") + "</div>";
    o += '<div class="card mdb">' + h("div", "dim small path", esc(cur.path)) + h("h2", "", esc(cur.title)) +
      h("p", "mut small", esc(BUN[bk()].rulesNote)) +
      (cur.ids.length ? '<div class="chips">' + cur.ids.map(function (x) { return h("span", "chip", esc(x)); }).join("") + "</div>" : "") +
      '<pre class="yaml">' + yamlHl(cur.text) + "</pre></div>";
    return o;
  }
  function iaContracts() {
    var I = BD(), cur = I.schemas.filter(function (r) { return r.id === state.ia.id; })[0] || I.schemas[0];
    var o = '<div class="rail sub">' + I.schemas.map(function (r) {
      return '<button data-ia-doc="contracts/' + r.id + '"' + (r === cur ? ' class="on"' : "") + ">" + esc(r.short) + "</button>";
    }).join("") + "</div>";
    o += '<div class="card mdb">' + h("div", "dim small path", esc(cur.path)) + h("h2", "", esc(cur.title)) + h("p", "", tx(cur.desc)) +
      h("h3", "", "필드 " + cur.fields.length) +
      '<div class="flds">' + cur.fields.map(function (f) {
        var dep = (f[0].match(/\./g) || []).length;
        return '<div class="fld" style="margin-left:' + Math.min(dep, 4) * 12 + 'px"><div class="fh"><code>' + esc(f[0]) + "</code>" +
          (f[2] ? h("span", "tag y", "필수") : "") + h("span", "ft", esc(f[1])) + "</div>" + (f[3] ? h("div", "fd", tx(f[3])) : "") + "</div>";
      }).join("") + "</div>" +
      '<details class="doc"><summary>JSON Schema 원문</summary><pre>' + esc(cur.text) + "</pre></details></div>";
    return o;
  }
  function iaCaseMatch(c) {
    var f = state.iaf, fs = BUN[bk()].facets;
    for (var i = 0; i < fs.length; i++) {
      if (f[fs[i][0]] && c.facets[fs[i][0]] !== f[fs[i][0]]) return false;
    }
    if (f.q) { var q = f.q.toLowerCase(); if ((c.id + " " + c.title + " " + c.why + " " + c.checks.join(" ")).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }
  function iaCaseList() {
    var cs = BD().cases.filter(iaCaseMatch);
    return h("div", "dim small", cs.length + "건") + cs.map(function (c) {
      return '<button class="caseitem ia" data-ia-case="' + c.id + '"><div class="ct"><b>' + esc(c.id) + "</b> " + esc(c.title) + "</div>" +
        '<div class="tags">' + caseTags(c) + "</div></button>";
    }).join("");
  }
  function caseTags(c) { return c.tags.map(function (t) { return h("span", "tag " + t[1], esc(t[0])); }).join(""); }
  function iaGolden() {
    var I = BD(), K = BUN[bk()], f = state.iaf, o = "";
    if (state.ia.id && state.ia.id !== "golden_readme") {
      var c = I.cases.filter(function (x) { return x.id === state.ia.id; })[0];
      if (c) {
        var idx = I.cases.indexOf(c);
        o += '<div class="card mdb"><button class="deeplink" data-ia-doc="golden/">◂ 사례 목록</button>' +
          h("h2", "", esc(c.id) + " · " + esc(c.title)) +
          '<div class="tags">' + caseTags(c) + "</div>" +
          h("div", "note", "<b>왜 —</b> " + tx(c.why)) +
          (c.checks.length ? h("h3", "", "확인하는 규칙") + '<div class="chips">' + c.checks.map(function (x) { return h("span", "chip", esc(x)); }).join("") + "</div>" : "") +
          (c.given ? h("h3", "", "주어진 것 (given)") + kv(c.given, 0) : "") +
          (c.event ? h("h3", "", "사건 (event)") + kv(c.event, 0) : "") +
          h("h3", "", "기대 결과 (expect)") + kv(c.expect, 0) +
          '<details class="doc"><summary>YAML 원문</summary><pre class="yaml">' + yamlHl(c.raw) + "</pre></details>" +
          '<div class="pnav"><button data-ia-case="' + (I.cases[idx - 1] || c).id + '"' + (idx ? "" : " disabled") + ">◂ 이전</button>" +
          '<button class="pri" data-ia-case="' + (I.cases[idx + 1] || c).id + '"' + (idx < I.cases.length - 1 ? "" : " disabled") + ">다음 ▸</button></div></div>";
        return o;
      }
    }
    if (state.ia.id === "golden_readme") {
      var d = iaDocs("golden")[0], toc = [];
      return '<div class="card mdb"><button class="deeplink" data-ia-doc="golden/">◂ 사례 목록</button>' + md(d.md, toc) + "</div>";
    }
    var uniq = function (k) { var s = {}; I.cases.forEach(function (c) { var v = c.facets[k]; if (v) s[v] = (s[v] || 0) + 1; }); return Object.keys(s).map(function (x) { return [x, s[x]]; }); };
    var chipRow = function (key, label, vals) {
      return '<div class="frow"><span class="fl">' + label + "</span>" + ['<button class="fchip' + (!f[key] ? " on" : "") + '" data-iaf="' + key + '=">전체</button>'].concat(vals.map(function (v) {
        return '<button class="fchip' + (f[key] === v[0] ? " on" : "") + '" data-iaf="' + key + "=" + esc(v[0]) + '">' + esc(v[0]) + " " + v[1] + "</button>";
      })).join("") + "</div>";
    };
    o += '<div class="card"><h2>시험 사례 ' + I.stats.cases + "건</h2>" +
      h("p", "mut small", esc(K.golden)) +
      '<button class="deeplink" data-ia-doc="golden/golden_readme">✎ 시험 세트 설명 · 채점법</button>' +
      K.facets.map(function (fc) { return chipRow(fc[0], fc[1], uniq(fc[0])); }).join("") +
      '<input id="iaq" class="iaq" placeholder="검색: id · 제목 · 이유 · 규칙 id" value="' + esc(f.q || "") + '">' +
      '<div id="ialist">' + iaCaseList() + "</div></div>";
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
    var o = '<div class="card"><h2>이 앱에 대하여</h2>' +
      h("p", "lead", tx(a.purpose)) + h("p", "", tx(a.how)) +
      h("div", "note", tx(a.scope)) + h("p", "dim small", tx(a.status)) + "</div>";
    o += '<div class="card"><h2>설계의 재료</h2>' +
      h("p", "mut small", "공개 자료와 공식 문서에서 확인한 것들이다. 조직 내부 자료는 쓰지 않았다.") +
      '<ul class="li">' + W.sources.map(function (s) {
        return h("li", "", "<b>" + tx(s.t) + "</b><br><span class='mut small'>" + tx(s.n) + "</span>");
      }).join("") + "</ul></div>";
    o += '<div class="card"><h2>규율</h2><ul class="li">' +
      ["특정 조직의 실명·수치·코드·ticket 원문은 쓰지 않는다. 모든 예시는 가상이다.",
        "숫자는 공란으로 두고 목적·결정 주체·결정 방법만 적는다.",
        "core와 주제별 심화, 설계 작업 전체의 현황을 다룬다. 현황 화면은 설계 쪽이 바뀔 때마다 동기화한다.",
        "설계가 바뀌면 이 앱이 바뀐다. 이전 판과의 비교는 두지 않는다."
      ].map(function (s) { return h("li", "mut", tx(s)); }).join("") + "</ul></div>";
    return o;
  }

  /* ── 라우팅 ── */
  var TABS = ["home", "status", "core", "deep", "cases", "docs", "road", "about", "ia", "wa", "map", "talk"];
  var state = { map: "core", tab: get("ws_tab", "home"), caseId: null, step: 0, docOpen: null, stage: null, deep: get("ws_deep", "intake"), ia: { sec: "overview", id: null }, iaf: {} };

  // #core/gate · #cases/C1 · #docs/posture 같은 해시를 읽는다 (공유 가능한 링크)
  function readHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return false;
    var parts = raw.split("/");
    if (parts[0] === "intake" || parts[0] === "workflow" || parts[0] === "chain") parts = ["deep", parts[0]];
    if (TABS.indexOf(parts[0]) < 0) return false;
    state.tab = parts[0]; state.caseId = null; state.step = 0;
    if (parts[1]) {
      if (state.tab === "core") state.stage = parts[1];
      else if (state.tab === "cases") state.caseId = parts[1].toUpperCase();
      else if (state.tab === "docs") state.docOpen = parts[1];
      else if (state.tab === "deep") state.deep = parts[1];
      else if (state.tab === "ia" || state.tab === "wa") state.ia = { sec: parts[1], id: parts[2] ? decodeURIComponent(parts[2]) : null };
      else if (state.tab === "map") state.map = parts[1];
    }
    return true;
  }
  function writeHash() {
    var frag = state.tab;
    if (state.tab === "core" && state.stage) frag += "/" + state.stage;
    else if (state.tab === "cases" && state.caseId) frag += "/" + state.caseId;
    else if (state.tab === "deep" && state.deep) frag += "/" + state.deep;
    else if (state.tab === "ia" || state.tab === "wa") frag += "/" + (state.ia.sec || "overview") + (state.ia.id ? "/" + encodeURIComponent(state.ia.id) : "");
    else if (state.tab === "map" && state.map && state.map !== "core") frag += "/" + state.map;
    if (("#" + frag) !== location.hash) {
      try { history.replaceState(null, "", "#" + frag); } catch (e) { location.hash = frag; }
    }
  }

  function paint() {
    var t = state.tab, html;
    if (t === "home") html = viewHome();
    else if (t === "status") html = viewStatus();
    else if (t === "map") html = viewMap();
    else if (t === "ia" || t === "wa") {
      if (state.iaBun !== t) { if (state.iaBun) { state.ia = { sec: "overview", id: null }; state.iaf = {}; } state.iaBun = t; }
      if (!BD()) { app.innerHTML = '<div class="card">' + BUN[t].name + " 데이터를 불러오는 중…</div>"; return loadBun(t, paint); }
      html = viewIA();
    }
    else if (t === "talk") html = viewTalk();
    else if (t === "core") html = viewCore(state.stage);
    else if (t === "deep") html = viewDeep(state.deep);
    else if (t === "cases") html = state.caseId ? viewCase(state.caseId, state.step) : viewCases();
    else if (t === "docs") html = viewDocs(state.docOpen);
    else if (t === "road") html = viewRoad();
    else html = viewAbout();
    html += '<footer>RTL WorkSys · v' + W.meta.version + " · " + W.meta.updated +
      "<br>설계 중간 결과 뷰어. 모든 사례는 가상이다.</footer>";
    app.innerHTML = html;
    writeHash();

    var btns = document.querySelectorAll("#nav button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = btns[i].dataset.tab === (t === "ia" || t === "wa" ? "deep" : t === "map" || t === "talk" ? "home" : t) ? "on" : "";
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
    if (b.dataset.iaSec) { state.tab = bk(); state.ia = { sec: b.dataset.iaSec, id: null }; return paint(); }
    if (b.dataset.iaDoc !== undefined) { var pp = b.dataset.iaDoc.split("/"); state.tab = bk(); state.ia = { sec: pp[0], id: pp[1] || null }; return paint(); }
    if (b.dataset.iaCase) { state.tab = bk(); state.ia = { sec: "golden", id: b.dataset.iaCase }; return paint(); }
    if (b.dataset.bunGo) { var bp = b.dataset.bunGo.split("/"); state.tab = bp[0]; if (state.iaBun && state.iaBun !== bp[0]) state.iaf = {}; state.iaBun = bp[0]; state.ia = { sec: bp[1] || "overview", id: bp[2] || null }; return paint(); }
    if (b.dataset.mapGo) { state.tab = "map"; state.map = b.dataset.mapGo; return paint(); }
    if (b.dataset.talkSeen) { var ks = "ws_seen_" + b.dataset.talkSeen; set(ks, get(ks, "") ? "" : "1"); var y = window.scrollY; paint(); window.scrollTo(0, y); return; }
    if (b.dataset.iaf !== undefined) { var kv2 = b.dataset.iaf.split("="); state.iaf[kv2[0]] = kv2.slice(1).join("="); state.ia.id = null; return paint(); }
    if (b.dataset.scroll) { var se = document.getElementById(b.dataset.scroll); if (se) se.scrollIntoView({ block: "start" }); return; }
    if (b.dataset.tabGo) { state.tab = b.dataset.tabGo; set("ws_tab", state.tab); state.caseId = null; return paint(); }
    if (b.dataset.deepGo) { state.tab = "deep"; state.deep = b.dataset.deepGo; set("ws_deep", state.deep); set("ws_tab", "deep"); state.caseId = null; return paint(); }
    if (b.dataset.deep) { state.deep = b.dataset.deep; set("ws_deep", state.deep); return paint(); }
    if (b.dataset.stage) { state.stage = b.dataset.stage; set("ws_stage", state.stage); return paint(); }
  });

  app.addEventListener("input", function (e) {
    if (e.target.id !== "iaq") return;
    state.iaf.q = e.target.value;
    var el = document.getElementById("ialist"); if (el) el.innerHTML = iaCaseList();
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
    if (state.tab === "map") paint();
  });

  window.addEventListener("hashchange", function () { if (readHash()) paint(); });

  document.getElementById("sub").textContent = W.meta.subtitle;
  readHash();
  paint();
})();
