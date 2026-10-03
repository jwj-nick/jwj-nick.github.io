/* RTL WorkSys — 렌더러(v0.9). 화면: ① 한눈에 ② 시스템 ③ 사례 ④ 결정 + 자료실 · 명세 탐색기. 콘텐츠는 전부 content.js. */
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

  /* ── agent 명세 탐색기: intake(#ia) · workflow(#wa). 데이터는 처음 열 때 불러온다 ── */
  var BUN = {
    ia: { g: "IA", src: "intake_agent.js", deep: "intake", name: "intake agent system", tag: "심화 결과 · 교정 대기",
      secs: [["overview", "개요"], ["design", "설계"], ["arch", "구조"], ["agents", "부품 10"], ["contracts", "계약 3"],
        ["rules", "규칙 9"], ["golden", "시험 114"], ["eval", "평가"], ["session", "세션 기록"]],
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
        ["contracts", "계약 11"], ["rules", "설정 4"], ["golden", "시험 84"], ["eval", "평가 · 세우기"], ["session", "세션 기록"]],
      facets: [["group", "종류"], ["wf", "workflow"], ["posture", "posture"]],
      lead: function (I) {
        return "workflow 심화 세션(09-28 ~ 10-02)이 workflow를 세울 수 있는 agent 시스템의 명세로 옮긴 결과 전체다. 중심은 표준화된 workflow 라이브러리(공통 골격 → 작업 모양 일곱 → 업무별 특화 열일곱, 트랙 덧붙임 하나, 조립 둘)이고, 부품 " +
          I.stats.agents + " · 데이터 계약 " + I.stats.schemas + " · 시험 사례 " + I.stats.cases + "건(해석 " + I.stats.byGroup["해석"] + " · 한 바퀴 " + I.stats.byGroup["한 바퀴"] +
          " · replay " + I.stats.byGroup["replay"] + ")이 함께 있다. 결정(첫 판 75항과 이후 79항)은 위임으로 정해졌고 교정을 기다린다.";
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
      '<button class="deeplink" data-sys-go="' + K.deep + '">▦ 시스템 › ' + K.deep + "</button> " +
      '<button class="deeplink" data-tab-go="decide">? 지금 판단할 것</button> ' +
      '<button class="deeplink" data-tab-go="lib">▤ 자료실</button></div>';
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

  /* ── 공통 조각 ── */
  var ZTAG = ["", "m", "y", "g"];
  var GO_ATTR = { sys: "data-sys-go", walk: "data-walk-go", bun: "data-bun-go", tab: "data-tab-go", atlas: "data-atlas-go" };
  function goBtn(g) {
    // g = [라벨, 종류(sys|walk|bun|tab|atlas|url), 대상]
    if (g[1] === "url") return '<a class="deeplink" href="' + esc(g[2]) + '" target="_blank" rel="noopener">↗ ' + esc(g[0]) + "</a>";
    return '<button class="deeplink" ' + (GO_ATTR[g[1]] || "data-tab-go") + '="' + esc(g[2]) + '">▸ ' + esc(g[0]) + "</button>";
  }
  function theme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
  function ul(arr, cls) { return '<ul class="li' + (cls ? " " + cls : "") + '">' + arr.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ul>"; }
  function deepById(id) {
    for (var i = 0; i < W.deep.length; i++) if (W.deep[i].id === id) return W.deep[i];
    return null;
  }

  // 한 장: 해설판(음성 · 자막) → 그림 → 15초 요약 링크 → 왜 중요한가 → 부분별로(접힘)
  function mapMedia(id, opt) {
    var M = W.maps[id], th = theme(), o = "";
    opt = opt || {};
    if (!M) return "";
    if (M.narr) {
      var NB = { intro: "개요", tour: "자세히", close: "맺음" }, ti = 0;
      o += '<div class="card narrcard"><h2>' + esc(opt.title || M.title) + ' <span class="tag g">해설 · 음성 · 자막</span> <span class="tag n" id="narrDur"></span></h2>' +
        '<video class="player" controls preload="none" playsinline poster="' + M.media.png.dark + '" src="media/' + id + '_narrated.mp4"></video>' +
        h("p", "dim xs", "소리는 처음에 꺼져 있다. 앞부분은 전체 개관, 뒷부분은 그림의 각 부분을 확대해 설명한다.") +
        '<details class="doc"><summary>대본 (' + M.narr.length + "문단)</summary><div class=\"docbody narrtext\">" +
        M.narr.map(function (b, i) {
          var lab = b.k === "tour" ? NB.tour + " " + (++ti) : NB[b.k];
          return '<div class="nb"><div class="nbh"><b>' + esc(lab) + '</b> <button class="seekb" data-seek="' + i + '" hidden></button></div>' + h("p", "", tx(b.text)) + "</div>";
        }).join("") + "</div></details></div>";
    }
    if (!M.narr) o += '<a class="mapimg" href="' + M.media.png[th] + '" target="_blank" rel="noopener"><img src="' + M.media.png[th] +
      '" alt="' + esc(M.title) + ' 그림" loading="lazy"></a>';
    o += '<div class="maplinks">' +
      [["15초 요약 (GIF)", M.media.gif], ["15초 요약 (mp4)", M.media.mp4], ["그림 원본", M.media.png[th]], ["움직이는 HTML", M.media.html + "?theme=" + th]].map(function (l) {
        return '<a href="' + l[1] + '" target="_blank" rel="noopener">' + esc(l[0]) + " ↗</a>";
      }).join("") + "</div>";
    if (opt.why !== false && M.why) {
      o += '<details class="doc why"><summary><span class="osum"><b>' + esc(M.whyTitle || "왜 중요한가") + "</b>" +
        h("span", "og mut small", M.why.map(function (w) { return esc(w[0]); }).join(" · ")) + '</span></summary><div class="docbody"><ol class="why4">' + M.why.map(function (w) {
        return "<li>" + h("b", "", esc(w[0])) + h("span", "", tx(w[1])) + "</li>";
      }).join("") + "</ol></div></details>";
    }
    if (opt.zones !== false && M.zones) {
      o += '<details class="doc zones"><summary>그림의 부분별로 (' + M.zones.length + ")</summary><div class=\"docbody\">" +
        M.zones.map(function (z) {
          return '<div class="zone z' + z.z + '"><div class="b">' + esc(z.name) + ' <span class="tag ' + ZTAG[z.z] + '">' + esc(z.stages) + "</span></div>" +
            h("p", "", tx(z.what)) + ul(z.ul) + (z.go && z.go.length ? '<div class="tgo">' + z.go.map(goBtn).join(" ") + "</div>" : "") + "</div>";
        }).join("") + "</div></details>";
    }
    return o;
  }

  var narrInfo = {};
  function hookNarr(id) {
    if (!id || !W.maps[id] || !W.maps[id].narr) return;
    var fill = function (j) {
      var d = document.getElementById("narrDur");
      if (d) d.textContent = Math.floor(j.total / 60) + "분 " + Math.round(j.total % 60) + "초";
      var bs = document.querySelectorAll(".seekb");
      for (var i = 0; i < bs.length; i++) {
        var b = j.beats[+bs[i].dataset.seek];
        if (!b) continue;
        bs[i].dataset.t = b.t;
        bs[i].textContent = "▸ " + Math.floor(b.t / 60) + ":" + ("0" + Math.floor(b.t % 60)).slice(-2) + "부터 듣기";
        bs[i].hidden = false;
      }
    };
    if (narrInfo[id]) return fill(narrInfo[id]);
    try {
      fetch("media/" + id + "_narrated.json").then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) { narrInfo[id] = j; if (curMapId() === id) fill(j); } }).catch(function () {});
    } catch (e) {}
  }
  function curMapId() {
    if (state.tab === "home") return "core";
    if (state.tab === "atlas") return W.maps.atlas ? "atlas" : null;
    if (state.tab === "sys" && state.sys && W.sys.topics[state.sys]) return W.sys.topics[state.sys].map;
    return null;
  }

  /* ── ① 한눈에 ── */
  function viewHome() {
    var m = W.home, o = "";
    o += '<div class="hero">' + h("div", "tl", esc(m.title)) +
      '<ol class="li steps5">' + m.summary.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ol>" +
      '<div class="herobtns"><button class="deeplink" data-tab-go="atlas">⌗ 전체 지도</button> <button class="deeplink" data-tab-go="sys">▦ 시스템</button> <button class="deeplink" data-tab-go="walk">▷ 사례 다섯</button> <button class="deeplink" data-tab-go="decide">? 지금 판단할 것</button></div></div>';
    o += mapMedia("core", { title: "core 한 장", zones: false });
    o += coreStrip();

    o += '<div class="card"><h2>사람이 서는 자리 <span class="tag g">반드시 둘</span></h2>' +
      m.must.map(function (r) { return '<div class="seat"><b>' + esc(r[0]) + "</b>" + h("div", "kv", tx(r[1])) + "</div>"; }).join("") +
      h("h3", "", "조건부: 시스템이 스스로 멈춰 부를 때") +
      m.cond.map(function (r) { return '<div class="seat c"><b>' + esc(r[0]) + "</b>" + h("div", "kv mut", tx(r[1])) + "</div>"; }).join("") + "</div>";

    o += '<div class="card"><h2>시스템의 부분 <button class="deeplink inl" data-tab-go="atlas">⌗ 서로 어떻게 겹치나: 전체 지도</button></h2>' + h("p", "mut small", tx(W.sys.lead)) + '<div class="topiclist">' +
      W.sys.order.map(function (k) {
        var t = W.sys.topics[k];
        return '<button class="topicbtn" data-sys-go="' + k + '"><div class="tt"><b>' + esc(t.name) + "</b> " + h("span", "tag m", esc(t.role)) +
          h("span", "tag " + t.badge[1], esc(t.badge[0])) + "</div>" + h("div", "mut small", tx(t.one)) + "</button>";
      }).join("") + "</div></div>";

    o += '<div class="card"><h2>무엇이 아닌가</h2>' + ul(m.notWhat, "mutli") + h("div", "note", tx(m.blank)) + "</div>";
    return o;
  }

  /* ── ② 시스템 ── */
  /* ── 주제 그림: 데이터(자세히의 표)에서 바로 그린다. 누르면 그 항목의 설명 ── */
  var figSel = {};
  function deepTable(id, test) {
    var d = deepById(id); if (!d) return null;
    for (var i = 0; i < d.body.length; i++) if (d.body[i].table && test(d.body[i].table.head)) return d.body[i].table;
    return null;
  }
  // core: 아홉 단계와 남는 파일. 앞 셋 = intake, 뒤 여섯 = workflow, 검수 · 반영 = 사람
  var STAGES = [
    ["intake", "00_intake", "i", "intake"], ["triage", "10_triage", "i", "intake"], ["gate", "20_gate", "i", "core/rules"],
    ["plan", "30_plan", "w", "workflow"], ["execute", "STATE", "w", "workflow"], ["result", "40_result", "w", "workflow"],
    ["review", "50_review", "h", "core/human"], ["apply", "MR · 회신", "h", "core/human"], ["learn", "60_learn", "k", "workmap"]
  ];
  function coreStrip() {
    return '<div class="card" id="s-fig"><h2>아홉 단계와 남는 파일</h2>' +
      h("p", "dim small", "단계마다 task 폴더에 파일 하나가 번호 순으로 쌓인다. 파란 셋은 intake, 보라 셋은 workflow, 노랑 둘은 사람이 반드시 서는 자리, 초록은 learn(Track B). 누르면 그 주제로 간다.") +
      '<div class="cstrip">' + STAGES.map(function (s, i) {
        return '<button class="cst ' + s[2] + '" data-sys-go="' + s[3] + '"><span class="n">' + (i + 1) + "</span><b>" + esc(s[0]) + '</b><span class="f">' + esc(s[1]) + "</span></button>";
      }).join('<span class="car">›</span>') + "</div>" +
      '<div class="cleg"><span class="i">intake</span><span class="w">workflow</span><span class="h">사람</span><span class="k">learn · Track B</span></div></div>';
  }
  // chain: link 표 → L1 → L2 → (L3 ∥ L3m) → (L4 ∥ L5) → L6 → L7
  var CHAIN_COLS = [["L1"], ["L2"], ["L3", "L3m"], ["L4", "L5"], ["L6"], ["L7"]];
  function chainFig() {
    var T = deepTable("chain", function (hd) { return hd[0] === "link" && hd.indexOf("사람이 결정하는 것") >= 0; });
    if (!T) return "";
    var row = function (code) { for (var i = 0; i < T.rows.length; i++) if (T.rows[i][0].split(" ")[0] === code) return T.rows[i]; return null; };
    var sel = figSel.chain || "L3m";
    var human = function (r) { var v = (r[3] || "").trim(); return v && v !== "—" && v !== "-" && !/^없/.test(v); };
    var o = '<div class="card" id="s-fig"><h2>link 사슬 <span class="tag m">link 표에서</span></h2>' +
      h("p", "dim small", "link 하나 = task 하나 = 결과 패키지 하나. 위아래로 놓인 둘은 나란히 진행한다. ◆ = 사람의 결정. 누르면 그 link의 일이 나온다.") +
      '<div class="tblwrap"><div class="chfig">' + CHAIN_COLS.map(function (col, ci) {
        return (ci ? '<span class="car">→</span>' : "") + '<div class="chcol">' + col.map(function (c) {
          var r = row(c); if (!r) return "";
          return '<button class="chl' + (c === sel ? " on" : "") + (c === "L3m" ? " cm" : "") + '" data-fig="chain:' + c + '"><b>' + esc(c) + "</b>" +
            h("span", "", esc(r[0].replace(/^\S+\s*/, ""))) + (human(r) ? '<i class="hd">◆ ' + esc(r[3]) + "</i>" : "") + "</button>";
        }).join("") + "</div>";
      }).join("") + "</div></div>";
    var r = row(sel);
    if (r) o += '<div class="adet">' + '<div class="adh"><b>' + esc(r[0]) + "</b> " + h("span", "tag m", esc(r[1])) + "</div>" +
      '<div class="strow"><b>AI가 하는 일</b><span>' + tx(r[2]) + "</span></div>" +
      '<div class="strow"><b>사람이 결정</b><span>' + tx(r[3]) + "</span></div>" +
      '<div class="strow"><b>다음으로 넘기는 것</b><span>' + tx(r[4]) + "</span></div></div>";
    return o + h("p", "dim xs", "freeze 뒤 spec이 바뀌면 L3 · L3m을 다시 freeze하고, 영향받는 L4 · L5만 다시 연다.") + "</div>";
  }
  // diagnose: 층 열 → 사다리. 층을 누르면 재현 수단 · oracle · 좁히는 도구 · 끝
  function layerFig() {
    var T = deepTable("diagnose", function (hd) { return hd[0] === "층" && hd.length === 5; });
    if (!T) return "";
    var sel = figSel.diagnose || T.rows[0][0], r = null;
    var o = '<div class="card" id="s-fig"><h2>층 사다리 <span class="tag y">가정 · 교정 대기</span></h2>' +
      h("p", "dim small", "원인을 찾기 전에 층부터 가른다. 위쪽(문서 · 이해 · 환경)일수록 RTL 밖이다. 불안정은 층이 아니라 상태다. 층을 누르면 그 층의 재현 수단 · oracle · 좁히는 도구 · 끝이 나온다.") +
      '<div class="lfig"><div class="lad">' + T.rows.map(function (x, i) {
        if (x[0] === sel) r = x;
        return '<button class="lrung' + (x[0] === sel ? " on" : "") + '" data-fig="diagnose:' + esc(x[0]) + '"><span class="n">' + (i + 1) + "</span>" + esc(x[0]) + "</button>";
      }).join("") + "</div>";
    if (r) o += '<div class="adet ldet"><div class="adh"><b>' + esc(r[0]) + "</b></div>" +
      [1, 2, 3, 4].map(function (k) { return '<div class="strow"><b>' + esc(T.head[k]) + "</b><span>" + tx(r[k]) + "</span></div>"; }).join("") + "</div>";
    return o + "</div></div>";
  }
  // intake: 고객 트랙 한 줄 + 출처 넷(같은 내용, 다른 출처 = 다른 끝)
  function intakeFig() {
    var F = W.sys.topics.intake.fig; if (!F) return "";
    return '<div class="card" id="s-fig"><h2>고객 트랙 한 줄</h2>' +
      '<div class="ctrack">' + F.track.map(function (t, i) {
        return '<div class="ctk' + (i === 3 ? " hum" : "") + '"><b>' + esc(t[0]) + "</b>" + h("span", "", tx(t[1])) + "</div>";
      }).join('<span class="car">→</span>') + "</div>" +
      '<div class="cbug"><b>↳</b> ' + tx(F.bug) + "</div>" +
      h("h3", "", "출처 넷: 같은 내용, 다른 출처 = 다른 끝") +
      '<div class="srcs">' + F.sources.map(function (r, i) {
        return '<div class="src s' + i + '"><b>' + esc(r[0]) + '</b><span class="ex">' + tx(r[1]) + '</span><span class="end">→ ' + tx(r[2]) + "</span></div>";
      }).join("") + "</div>" + h("p", "dim small", tx(F.same)) +
      '<div class="tgo">' + goBtn(["원인 찾기의 행선지 표", "sys", "intake/more"]) + " " + goBtn(["사례 W5 · 고객 트랙", "walk", "W5"]) + " " + goBtn(["전체 지도: 고객 이슈의 길", "atlas", "S2"]) + "</div></div>";
  }
  // workflow: 원인 찾기 한 줄 + 두 트랙의 왕복 + 고객 트랙 덧붙임 + 선택 도구
  function wfFig() {
    var F = W.sys.topics.workflow.fig; if (!F) return "";
    return '<div class="card" id="s-fig"><h2>원인 찾기 · 두 트랙 · 고객 트랙 <span class="tag y">가정 · 교정 대기</span></h2>' +
      h("h3", "", "원인 찾기(조사형) 한 줄") +
      '<div class="ctrack">' + F.diag.map(function (t, i) {
        return '<div class="ctk' + (i === 0 || i === F.diag.length - 1 ? " hum" : "") + '"><b>' + esc(t[0]) + "</b>" + h("span", "", tx(t[1])) + "</div>";
      }).join('<span class="car">→</span>') + "</div>" +
      h("h3", "", "모든 일에 두 트랙") +
      '<div class="srcs">' + F.tracks.map(function (r, i) {
        return '<div class="src s' + i + '"><b>' + esc(r[0]) + '</b><span class="ex">' + tx(r[1]) + "</span></div>";
      }).join("") + "</div>" +
      '<div class="cbug wb"><b>↺</b> ' + tx(F.back) + "</div>" +
      h("h3", "", "고객 트랙 = 트랙 덧붙임") +
      '<div class="wstack"><div class="wtop">' + F.cust.map(function (r) {
        return '<div class="wtk"><b>' + esc(r[0]) + "</b>" + h("span", "", tx(r[1])) + "</div>";
      }).join("") + '</div><div class="wbase">' + tx(F.custBase) + "</div></div>" +
      '<div class="cbug"><b>✕</b> ' + tx(F.custNo) + "</div>" +
      h("h3", "", "갈래 현장 절차: 선택 도구") +
      '<div class="wtools">' + F.tools.map(function (r) { return '<span class="chip">' + esc(r[0]) + " <i>" + esc(r[1]) + "</i></span>"; }).join("") + "</div>" +
      h("p", "dim small", tx(F.toolsNote)) +
      '<div class="tgo">' + goBtn(["자세히: 층 판별 · 두 트랙 · 고객 트랙", "sys", "workflow/more"]) + " " + goBtn(["고객 트랙 (TR-customer)", "bun", "wa/library/TR-customer"]) + " " + goBtn(["diagnose 층 사다리", "sys", "diagnose/fig"]) + " " + goBtn(["intake 고객 트랙 한 줄", "sys", "intake/fig"]) + "</div></div>";
  }
  var FIGS = { core: coreStrip, intake: intakeFig, chain: chainFig, diagnose: layerFig, workflow: wfFig };

  function topicRail(cur) {
    return '<div class="rail">' + W.sys.order.map(function (k) {
      return '<button data-sys-go="' + k + '"' + (k === cur ? ' class="on"' : "") + ">" + esc(W.sys.topics[k].name) + "</button>";
    }).join("") + "</div>";
  }
  function viewSys(id) {
    var S = W.sys, o = "";
    if (!id || !S.topics[id]) {
      o += '<div class="card"><h2>시스템</h2>' + h("p", "lead", tx(S.lead)) + "</div>";
      S.order.forEach(function (k) {
        var t = S.topics[k];
        o += '<button class="card topiccard" data-sys-go="' + k + '"><div class="tt"><b>' + esc(t.name) + "</b> " + h("span", "tag m", esc(t.role)) +
          h("span", "tag " + t.badge[1], esc(t.badge[0])) + "</div>" + h("p", "", tx(t.one)) +
          (t.map ? h("div", "dim xs", "▶ 한 장 · 해설 있음") : "") + "</button>";
      });
      o += '<div class="card"><h2>다음 주제 <span class="tag n">이름 · 성격만</span></h2>' +
        S.next.map(function (r) { return '<div class="seat c"><b>' + esc(r[0]) + "</b>" + h("div", "kv mut", tx(r[1])) + "</div>"; }).join("") + "</div>";
      return o;
    }
    var t = S.topics[id], idx = S.order.indexOf(id);
    o += topicRail(id);
    o += '<div class="card" id="s-what"><h2>' + esc(t.name) + " " + h("span", "tag m", esc(t.role)) + h("span", "tag " + t.badge[1], esc(t.badge[0])) + "</h2>" +
      h("p", "lead", tx(t.one)) + ul(t.what) + '<div class="tgo">' + goBtn(["전체 지도에서 이 주제", "atlas", "row:" + id]) + "</div></div>";
    if (t.map) o += '<div id="s-map">' + mapMedia(t.map, { title: t.name + " 한 장" }) + "</div>";
    o += '<div class="card" id="s-rules"><h2>핵심 규칙</h2><ol class="li">' + t.rules.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ol></div>";
    if (FIGS[id]) o += FIGS[id]();
    if (t.place) o += placeCard(t.place);
    o += '<div class="card" id="s-human"><h2>사람의 자리</h2>' + ul(t.human) + h("h3", "", "품질 기준") + ul(t.quality) + "</div>";
    o += '<div class="card" id="s-state"><h2>상태</h2>' + t.state.map(function (r) {
      return '<div class="strow"><span class="tag ' + r[0] + '">' + esc(r[1]) + "</span><span>" + tx(r[2]) + "</span></div>";
    }).join("") + "</div>";
    var d = t.more ? deepById(t.more) : null;
    if (d) {
      o += '<details class="doc" id="s-more"' + (state.sysSec === "more" ? " open" : "") + '><summary>자세히: ' + esc(d.title) + '</summary><div class="docbody">' +
        (d.lead ? h("p", "dim small", tx(d.lead)) : "") + (d.excluded ? h("div", "note", tx(d.excluded)) : "") + blocks(d.body) + "</div></details>";
    }
    var walks = W.walks.filter(function (w) { return w.go.some(function (g) { return g[1] === "sys" && g[2] === id; }); });
    o += '<div class="card" id="s-spec"><h2>원문과 사례</h2>' +
      (t.spec.length ? t.spec.map(goBtn).join(" ") : h("p", "dim small", "명세 원문은 설계 워크스페이스에 있다(이 앱에는 요약만).")) +
      (walks.length ? h("h3", "", "이 주제가 나오는 사례") + walks.map(function (w) { return goBtn([w.id + " " + w.title, "walk", w.id]); }).join(" ") : "") + "</div>";
    o += '<div class="pnav">' +
      '<button data-sys-go="' + (S.order[idx - 1] || "") + '"' + (idx ? "" : " disabled") + ">◂ " + esc(idx ? S.topics[S.order[idx - 1]].name : "") + "</button>" +
      '<button class="pri" data-sys-go="' + (S.order[idx + 1] || "") + '"' + (idx < S.order.length - 1 ? "" : " disabled") + ">" +
      esc(idx < S.order.length - 1 ? S.topics[S.order[idx + 1]].name : "") + " ▸</button></div>";
    return o;
  }

  /* ── ② 전체 지도 ── */
  var LANE_CLS = ["ln-h", "ln-i", "ln-w", "ln-t", "ln-k"];
  // 경계를 따로 설명한 열(atlas.shared)만 노랗게 칠한다
  function atlasSharedCol(ci) { return !!atlasShareNote(ci); }
  function atlasShareNote(ci) {
    var A = W.atlas, name = A.cols[ci][0];
    for (var i = 0; i < A.shared.length; i++) if (A.shared[i][0] === name) return A.shared[i][1];
    return "";
  }
  function atlasDetail() {
    var A = W.atlas, sel = state.acell;
    if (!sel) return h("p", "dim xs adhint", "칸(● · ○)을 누르면 그 칸의 뜻이, 열 이름을 누르면 그 책임을 누가 나눠 맡는지가 여기에 나온다. 주제 이름을 누르면 주제 카드로 간다.");
    var o = '<div class="adet">';
    if (sel.charAt(0) === "c") {
      var ci = +sel.slice(2), col = A.cols[ci];
      o += '<div class="adh"><b>' + esc(col[0]) + "</b> " + h("span", "dim small", tx(col[1])) + "</div>";
      var sn = atlasShareNote(ci);
      if (sn) o += h("div", "note", "<b>나눠 맡음 —</b> " + tx(sn));
      A.rows.forEach(function (r) {
        var c = r.cells[ci]; if (!c) return;
        o += '<div class="strow"><span class="ac ' + (c[0] === "●" ? "own" : "use") + ' st">' + c[0] + "</span>" + goBtn([r.name, r.go[0], r.go[1]]) + "<span>" + tx(c[1]) + "</span></div>";
      });
    } else {
      var p = sel.split(","), r = A.rows[+p[0]], cj = +p[1], c = r.cells[cj], cl = A.cols[cj];
      o += '<div class="adh"><span class="ac ' + (c[0] === "●" ? "own" : "use") + ' st">' + c[0] + "</span> <b>" + esc(r.name) + " × " + esc(cl[0]) + "</b> " +
        h("span", "tag " + (c[0] === "●" ? "g" : "n"), c[0] === "●" ? "정본: 이 주제가 규칙을 정한다" : "사용: 정본의 규칙을 따른다") + "</div>" +
        h("p", "", tx(c[1])) + h("div", "dim small", esc(cl[0]) + " = " + tx(cl[1]));
      var sn2 = atlasSharedCol(cj) ? atlasShareNote(cj) : "";
      if (sn2) o += h("div", "note", "<b>이 열은 나눠 맡는다 —</b> " + tx(sn2));
      var sec = ATLAS_SEC[cj] || "rules";
      if (r.go[1] === "kb" && cj === 9) sec = "place";
      o += '<div class="tgo">' + goBtn([r.name + " 카드 › " + SEC_NAME[sec], "sys", r.go[1] + "/" + sec]) + ' <button class="deeplink" data-acell="c:' + cj + '">▸ ' + esc(cl[0]) + " 열 전체</button></div>";
    }
    return o + "</div>";
  }
  // 겹침 지도의 열 → 주제 카드의 절
  var ATLAS_SEC = ["what", "rules", "rules", "rules", "rules", "rules", "human", "human", "state", "what"];
  var SEC_NAME = { what: "무엇", rules: "핵심 규칙", human: "사람의 자리 · 품질", state: "상태", place: "전체 안에서의 자리", more: "자세히", spec: "원문과 사례" };
  // 결과물 이름 → 명세 탐색기의 부품 명세
  var AGENT_DOC = {
    intake: ["intake_controller", "adapters", "raw_scanner", "dedup_linker", "work_judge", "understander", "categorizer", "gate_checker", "router", "reply_writer"],
    workflow: ["workflow_controller", "resolver", "planner", "checkpoint_runner", "evaluator_adapter", "policy_engine", "hitl_manager", "result_writer", "record_writer", "learner", "dry_replay_runner"]
  };
  function outItem(topic, name) {
    var ids = AGENT_DOC[topic];
    if (!ids) return tx(name);
    var k = name.split("(")[0].replace(/의 worker\s*$/, "").trim().toLowerCase().replace(/[- ]+/g, "_");
    var id = ids.indexOf(k) >= 0 ? k : ids.indexOf(k + "s") >= 0 ? k + "s" : null;
    return id ? '<button class="deeplink inl" data-bun-go="' + (topic === "intake" ? "ia" : "wa") + "/agents/" + id + '">' + tx(name) + "</button>" : tx(name);
  }
  function atlasOut(x) {
    var cell = function (lab, arr, note, link) {
      return '<div class="ocell"><div class="ol"><b>' + lab + "</b>" + (arr.length ? h("span", "tag m", String(arr.length)) : "") + "</div>" +
        (arr.length ? (link ? '<ul class="li">' + arr.map(function (n) { return h("li", "", outItem(x.go[1], n)); }).join("") + "</ul>" : ul(arr)) : h("p", "dim small", tx(note || "따로 없다"))) + "</div>";
    };
    var cnt = [["agent", x.agent], ["도구", x.tool], ["skill", x.skill]].map(function (z) { return z[0] + " " + (z[1].length || "없음"); }).join(" · ");
    return '<details class="doc out"><summary><span class="osum"><b>' + esc(x.name) + "</b> " + h("span", "tag m", cnt) + h("span", "og mut small", tx(x.goal)) + "</span></summary>" +
      '<div class="docbody">' + (x.allNote ? h("div", "note", tx(x.allNote)) : "") + '<div class="ogrid">' +
      (x.allNote ? "" : cell("agent · LLM이 판단", x.agent, x.agentNote, true) + cell("도구 · 결정론", x.tool, x.toolNote, true) + cell("skill · 불러 쓰는 절차", x.skill)) +
      cell("문서", x.doc) + "</div>" + (x.quality ? h("div", "dim small", "<b>기준 —</b> " + tx(x.quality)) : "") +
      '<div class="tgo">' + goBtn([x.name + " 카드", x.go[0], x.go[1]]) + "</div></div></details>";
  }
  function atlasFlow(f) {
    var A = W.atlas;
    var o = '<div class="lanekey">' + A.lanes.map(function (l, i) { return '<span class="lchip ' + LANE_CLS[i] + '">' + esc(l) + "</span>"; }).join("") +
      '<span class="stepper"><button data-astep="prev">◂</button><span>' + (state.astep === null ? "전체" : "단계 " + (state.astep + 1) + " / " + f.steps.length) +
      '</span><button data-astep="next">▶ 한 단계씩</button>' + (state.astep === null ? "" : '<button data-astep="all">전체</button>') + "</span></div>";
    o += '<div class="tblwrap"><table class="swim"><thead><tr><th>#</th>' + A.lanes.map(function (l, i) { return '<th class="' + LANE_CLS[i] + '">' + esc(l) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      f.steps.map(function (s, i) {
        var st = state.astep === null ? "" : i < state.astep ? " past" : i === state.astep ? " cur" : " fut";
        return '<tr class="' + st + '"><td class="sn">' + (i + 1) + "</td>" + s.map(function (c, li) {
          return '<td class="' + LANE_CLS[li] + (c ? " on" : " off") + '" data-l="' + esc(A.lanes[li]) + '">' + tx(c) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    o += '<div class="seat"><b>남는 파일</b>' + h("div", "kv mut", tx(f.files)) + "</div>" +
      '<div class="seat"><b>이 길의 다른 점</b>' + h("div", "kv mut", tx(f.diff)) + "</div>" +
      '<div class="tgo">' + f.walks.map(function (wid) {
        var w = W.walks.filter(function (x) { return x.id === wid; })[0];
        return w ? goBtn(["사례 " + w.id + " · " + w.title, "walk", w.id]) : "";
      }).join(" ") + "</div>";
    return o;
  }
  function viewAtlas() {
    var A = W.atlas, o = "";
    var fl = A.flows.filter(function (f) { return f.id === state.aflow; })[0] || A.flows[0];
    o += '<div class="hero">' + h("div", "tl", esc(A.title)) + h("p", "", tx(A.lead)) +
      '<div class="herobtns">' + [["겹침 지도", "a-grid"], ["결과물", "a-out"], ["일이 흐르는 길", "a-flow"], ["세우는 순서", "a-stage"], ["빈 곳", "a-gap"]].map(function (b) {
        return '<button class="deeplink" data-scroll="' + b[1] + '">▾ ' + esc(b[0]) + "</button>";
      }).join(" ") + "</div></div>";
    if (W.maps.atlas) o += mapMedia("atlas", { title: "전체 지도 한 장" });

    o += '<div class="card" id="a-grid"><h2>겹침 지도 <span class="tag g">● 정본</span><span class="tag n">○ 사용</span></h2>' +
      h("p", "mut small", "주제 여덟 × 책임 열. ● = 이 책임의 규칙을 정한다, ○ = 정본의 규칙을 따라 빌려 쓴다, 빈칸 = 관계 없음. 노란 열 셋(입구 · oracle · 학습)은 정본이 여럿이라 경계를 따로 적은 곳이다.") +
      '<div class="agwrap"><table class="agrid"><thead><tr><th class="rh"></th>' + A.cols.map(function (c, ci) {
        return '<th' + (atlasSharedCol(ci) ? ' class="sh"' : "") + '><button data-acell="c:' + ci + '"' + (state.acell === "c:" + ci ? ' class="on"' : "") + ">" + esc(c[0]) + "</button></th>";
      }).join("") + "</tr></thead><tbody>" + A.rows.map(function (r, ri) {
        return '<tr' + (state.arow && r.go[1] === state.arow ? ' class="hl"' : "") + '><th class="rh"><button data-sys-go="' + esc(r.go[1]) + '">' + esc(r.name) + "</button></th>" + r.cells.map(function (c, ci) {
          var cls = atlasSharedCol(ci) ? ' class="sh"' : "";
          if (!c) return "<td" + cls + "></td>";
          var k = ri + "," + ci;
          return "<td" + cls + '><button class="ac ' + (c[0] === "●" ? "own" : "use") + (state.acell === k ? " on" : "") + '" data-acell="' + k + '" title="' + esc(r.name + " × " + A.cols[ci][0] + ": " + c[1]) + '">' + c[0] + "</button></td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>" + atlasDetail() +
      h("h3", "", "나눠 맡는 열 셋") + A.shared.map(function (s) {
        return '<div class="seat c"><b>' + esc(s[0]) + "</b>" + h("div", "kv mut", tx(s[1])) + "</div>";
      }).join("") + h("div", "note", tx(A.kbNote)) + "</div>";

    o += '<div class="card" id="a-out"><h2>주제별 목표와 결과물</h2>' +
      h("p", "mut small", "결과물은 넷으로 나눈다: agent(LLM이 판단하는 부품) · 도구(결정론 script · evaluator · controller) · skill(사람이나 agent가 불러 쓰는 절차 묶음) · 문서(설계 · 계약 · 규칙 · workflow 파일 · 시험). 누르면 이름이 펼쳐진다.") +
      A.outputs.map(atlasOut).join("") +
      h("h3", "", "아직 정본이 없는 갈래") + A.pending.map(function (r) {
        return '<div class="seat c"><b>' + esc(r[0]) + "</b>" + h("div", "kv mut", tx(r[1])) + "</div>";
      }).join("") + "</div>";

    o += '<div class="card" id="a-flow"><h2>일이 흐르는 길 <span class="tag m">가상 셋</span></h2>' +
      h("p", "mut small", "줄 다섯(사람 · intake · workflow · 도구 · KB)에 단계마다 움직이는 부품을 적었다. 같은 부품이 세 길에 모두 나온다.") +
      '<div class="rail sub">' + A.flows.map(function (f) {
        return '<button data-aflow="' + f.id + '"' + (f === fl ? ' class="on"' : "") + ">" + esc(f.title) + "</button>";
      }).join("") + "</div>" + atlasFlow(fl) + "</div>";

    o += '<div class="card" id="a-stage"><h2>회사에 세우는 순서와 이 지도</h2>' +
      block({ table: { head: ["migration 단계", "켜지는 것"], rows: A.stages } }) + "</div>";
    o += '<div class="card" id="a-gap"><h2>이 지도에서 보이는 빈 곳 <span class="tag n">반영 대기</span></h2>' +
      block({ table: { head: ["빈 곳", "어디서 메우나"], rows: A.gaps } }) + "</div>";
    o += '<div class="card"><h2>상태</h2>' + A.state.map(function (r) {
      return '<div class="strow"><span class="tag ' + r[0] + '">' + esc(r[1]) + "</span><span>" + tx(r[2]) + "</span></div>";
    }).join("") + "</div>";
    return o;
  }

  function placeCard(P) {
    var col = function (arr, cls, arrow) {
      return '<div class="pcol ' + cls + '">' + arr.map(function (r) {
        return '<div class="pbox">' + (arrow === "l" ? "" : "") + "<b>" + esc(r[0]) + "</b>" + h("span", "", tx(r[1])) + "</div>";
      }).join("") + "</div>";
    };
    return '<div class="card" id="s-place"><h2>전체 안에서의 자리</h2>' + h("p", "mut small", tx(P.lead)) +
      '<div class="pgraph"><div class="phd">누가 무엇을 묻나</div><div></div><div class="phd">일의 끝이 들어오는 길</div>' +
      col(P.ask, "pask") + '<div class="pmid"><span class="parr">→</span><div class="pkb">KB<small>지식의 정본</small></div><span class="parr">←</span></div>' + col(P.back, "pback") + "</div>" +
      '<div class="tgo">' + goBtn(["전체 지도: 겹침 지도", "atlas", "row:kb"]) + " " + goBtn(["일이 흐르는 길", "atlas", "S1"]) + "</div></div>";
  }

  /* ── ③ 사례 ── */
  // 단계마다 '누가 정하나'(코드 · 규칙 · LLM · 사람)를 세어 쌓은 막대. "LLM → 사람"처럼 둘이면 반씩
  var WHO = [["코드", "wc"], ["규칙", "wr"], ["LLM", "wl"], ["사람", "wh"]];
  function whoBar(w, big) {
    var n = [0, 0, 0, 0];
    w.steps.forEach(function (s) {
      var parts = s[1].split(/\s*(?:→|\+)\s*/).filter(Boolean), f = 1 / parts.length;
      parts.forEach(function (p) { for (var i = 0; i < WHO.length; i++) if (p.indexOf(WHO[i][0]) >= 0) { n[i] += f; break; } });
    });
    var tot = n.reduce(function (a, b) { return a + b; }, 0) || 1;
    return '<div class="whobar' + (big ? " big" : "") + '" title="단계 ' + w.steps.length + '개를 누가 정하나">' + n.map(function (v, i) {
      return v ? '<span class="' + WHO[i][1] + '" style="flex:' + v.toFixed(2) + '">' + (big ? esc(WHO[i][0]) + " " + (Math.round(v * 10) / 10) : "") + "</span>" : "";
    }).join("") + "</div>";
  }
  function whoKey() {
    return '<div class="whokey">' + WHO.map(function (x) { return '<span class="' + x[1] + '"></span>' + esc(x[0]); }).join(" ") + "</div>";
  }
  var WHO_TAG = function (w) { return /사람/.test(w) ? "y" : /LLM/.test(w) ? "m" : /규칙/.test(w) ? "n" : ""; };
  function viewWalk(id) {
    var o = "", ws = W.walks, w = null;
    for (var i = 0; i < ws.length; i++) if (ws[i].id === id) w = ws[i];
    if (!w) {
      o += '<div class="card"><h2>사례</h2>' + h("p", "lead", "지금 명세로 걸어 본 일 다섯이다. 일 하나가 입구에서 끝까지 어떻게 지나가는지, 단계마다 누가(코드 · 규칙 · LLM · 사람) 정하는지를 본다. 모든 예시는 가상이다.") +
        h("p", "dim small", "막대 = 단계마다 누가 정하는지를 센 것. 사람의 몫이 좁을수록 사람은 검수와 결정에만 선다.") + whoKey() + "</div>";
      ws.forEach(function (x) {
        o += '<button class="card topiccard" data-walk-go="' + x.id + '"><div class="tt"><b>' + esc(x.id) + " · " + esc(x.title) + "</b></div>" +
          h("div", "dim xs", esc(x.from)) + h("p", "", tx(x.one)) + whoBar(x) + "</button>";
      });
      return o;
    }
    var idx = ws.indexOf(w);
    o += '<div class="rail">' + ws.map(function (x) {
      return '<button data-walk-go="' + x.id + '"' + (x === w ? ' class="on"' : "") + ">" + esc(x.id) + "</button>";
    }).join("") + "</div>";
    o += '<div class="card"><h2>' + esc(w.title) + "</h2>" + h("div", "dim small", esc(w.from)) + h("p", "lead", tx(w.one)) + whoBar(w, true) + "</div>";
    o += '<div class="card"><div class="walk">' + w.steps.map(function (s) {
      return '<div class="wstep"><div class="wh"><b>' + esc(s[0]) + '</b> <span class="tag ' + WHO_TAG(s[1]) + '">' + esc(s[1]) + "</span></div>" + h("div", "kv", tx(s[2])) + "</div>";
    }).join("") + "</div></div>";
    o += '<div class="card"><h2>이 사례에서 볼 것</h2>' + ul(w.see) + w.go.map(goBtn).join(" ") + "</div>";
    o += '<div class="pnav">' +
      '<button data-walk-go="' + (ws[idx - 1] || w).id + '"' + (idx ? "" : " disabled") + ">◂ 이전</button>" +
      '<button class="pri" data-walk-go="' + (ws[idx + 1] || w).id + '"' + (idx < ws.length - 1 ? "" : " disabled") + ">다음 ▸</button></div>";
    return o;
  }

  /* ── ④ 결정 ── */
  function talkItem(it) {
    var s = get("ws_seen_" + it.id, "");
    return '<div class="talk' + (s ? " seen" : "") + '"><div class="t">' + esc(it.t) +
      (it.tag ? h("span", "tag " + it.tag[1], esc(it.tag[0])) : "") + "</div>" +
      h("div", "kv", tx(it.what)) +
      (it.now ? '<div class="kv mut"><b>지금 가정 —</b> ' + tx(it.now) + "</div>" : "") +
      (it.ask ? '<div class="kv ask"><b>판단할 것 —</b> ' + tx(it.ask) + "</div>" : "") +
      '<div class="tgo">' + (it.go || []).map(function (g) {
        return goBtn(g[1] === "deep" ? [g[0], "sys", g[2]] : g);
      }).join(" ") +
      ' <button class="seenb" data-talk-seen="' + it.id + '">' + (s ? "✓ 봤음" : "○ 봤음 표시") + "</button></div></div>";
  }
  // 주제 × 상태 묶음(확정 · 가정 · 확인 · 반영 대기) + 갖춘 것(한 장 · 해설 · 자세히 · 탐색기 · 사례)
  var ST_COLS = [["확정", "g", /확정|정리/], ["가정 · 교정 대기", "y", /가정|교정/], ["확인 · 회사에서", "n", /확인|회사/], ["반영 대기", "r", /반영/]];
  function statusGrid() {
    var o = '<div class="card"><h2>주제별 상태</h2>' + h("p", "dim small", "칸의 숫자 = 그 상태에 든 항목 수(점 하나 = 항목 하나). 누르면 그 주제 카드의 상태로 간다.") +
      '<div class="tblwrap"><table class="stgrid"><thead><tr><th></th>' + ST_COLS.map(function (c) { return '<th><span class="tag ' + c[1] + '">' + esc(c[0]) + "</span></th>"; }).join("") +
      '<th class="sep">한 장 · 해설</th><th>자세히</th><th>탐색기</th><th>사례</th></tr></thead><tbody>';
    W.sys.order.forEach(function (k) {
      var t = W.sys.topics[k];
      var nW = W.walks.filter(function (w) { return w.go.some(function (g) { return g[1] === "sys" && g[2] === k; }); }).length;
      o += '<tr><th><button data-sys-go="' + k + '/state">' + esc(t.name) + "</button></th>" + ST_COLS.map(function (c) {
        var n = 0, txt = [];
        t.state.forEach(function (r) { if (c[2].test(r[1])) { var m = r[2].split(" · ").length; n += m; txt.push(r[2]); } });
        return '<td title="' + esc(txt.join(" / ")) + '">' + (n ? '<span class="stdot ' + c[1] + '">' + n + "</span>" : "") + "</td>";
      }).join("") +
        '<td class="sep">' + (t.map ? (W.maps[t.map] && W.maps[t.map].narr ? "●●" : "●") : "") + "</td><td>" + (t.more ? "●" : "") + "</td><td>" +
        (t.spec.some(function (g) { return g[1] === "bun"; }) ? "●" : "") + "</td><td>" + (nW || "") + "</td></tr>";
    });
    o += "</tbody></table></div>" + '<details class="doc"><summary>확정이 아닌 것만 글로 보기</summary><div class="docbody">' + W.sys.order.map(function (k) {
      var t = W.sys.topics[k];
      return '<div class="strow"><button class="deeplink inl" data-sys-go="' + k + '">' + esc(t.name) + "</button>" + h("span", "tag " + t.badge[1], esc(t.badge[0])) +
        "<span>" + t.state.filter(function (r) { return r[0] !== "g"; }).map(function (r) { return esc(r[1]) + ": " + tx(r[2]); }).join(" · ") + "</span></div>";
    }).join("") + "</div></details></div>";
    return o;
  }
  function viewDecide() {
    var D = W.decide, T = W.talk, o = "", all = {};
    T.groups.forEach(function (g) { g.items.forEach(function (it) { all[it.id] = it; }); });
    o += '<div class="hero">' + h("div", "tl", "지금 판단할 것") + h("p", "", tx(D.lead)) + h("div", "up", "봤음 표시는 이 기기에만 남는다") + "</div>";
    var seen = D.now.filter(function (k) { return get("ws_seen_" + k, ""); }).length;
    o += '<div class="card"><h2>먼저 볼 열 가지 <span class="tag y">' + seen + " / " + D.now.length + " 봤음</span></h2>" +
      D.now.map(function (k) { return all[k] ? talkItem(all[k]) : ""; }).join("") + "</div>";
    o += '<div class="card"><h2>다음</h2><ol class="li">' + D.next.map(function (s) { return h("li", "", tx(s)); }).join("") + "</ol></div>";
    o += statusGrid();
    var rest = 0;
    var groups = T.groups.map(function (g) {
      var items = g.items.filter(function (it) { return D.now.indexOf(it.id) < 0; });
      rest += items.length;
      return items.length ? '<details class="doc"><summary>' + esc(g.title) + " (" + items.length + ")</summary><div class=\"docbody\">" +
        h("p", "mut small", tx(g.note)) + items.map(talkItem).join("") + "</div></details>" : "";
    }).join("");
    o += '<div class="card"><h2>나머지 논의 거리 <span class="tag n">' + rest + "</span></h2>" + groups + "</div>";
    return o;
  }

  /* ── 자료실 ── */
  function viewLib() {
    var o = '<div class="card"><h2>자료실</h2>' + h("p", "lead", tx(W.lib.lead)) + "</div>";
    o += '<div class="card"><h2>명세 탐색기</h2>' +
      '<button class="topicbtn" data-bun-go="ia"><div class="tt"><b>intake agent system</b></div>' + h("div", "mut small", "명세 전문 · 부품 11 · 계약 3 · 규칙 9 · 시험 사례 114(고객 7) · 인계 문서") + "</button>" +
      '<button class="topicbtn" data-bun-go="wa"><div class="tt"><b>workflow agent system</b></div>' + h("div", "mut small", "명세 전문 · workflow 파일 28(트랙 1 · 특화 17) · 부품 11 · 계약 11 · 설정 4 · 시험 사례 84 · 인계 문서") + "</button></div>";
    o += '<div class="card"><h2>그림 문서 <span class="tag m">정적 · 폭이 넓다</span></h2><div class="igdocs">' + W.lib.docs.map(function (d) {
      return '<button class="igdoc" data-lv="doc/' + d[3] + '"><b>' + esc(d[1]) + "</b><span>" + tx(d[2]) + "</span></button>";
    }).join("") + "</div></div>";
    o += '<div class="card"><h2>15초 요약 · 해설</h2>' + W.mapOrder.map(function (k) {
      var M = W.maps[k];
      return '<div class="strow"><b>' + esc(M.tab) + '</b><span class="maplinks inl">' +
        LV_MEDIA.map(function (l) {
          return '<button class="lvm" data-lv="media/' + k + "/" + l[0] + '">' + l[1] + "</button>";
        }).join("") + "</span></div>";
    }).join("") + "</div>";
    o += '<details class="doc"><summary>용어</summary><div class="docbody"><dl class="glo">' +
      W.glossary.map(function (g) { return "<dt>" + tx(g[0]) + "</dt><dd>" + tx(g[1]) + "</dd>"; }).join("") + "</dl></div></details>";
    return o;
  }

  /* ── 자료실 안의 보기 화면(#lib/doc/<id> · #lib/media/<주제>/<종류>)과 '앞 페이지 · 자료실' 줄 ── */
  var LV_MEDIA = [["gif", "GIF"], ["mp4", "15초 mp4"], ["narr", "해설 mp4"], ["png", "그림"]];
  function libBar(title) {
    return '<div class="libbar"><button class="deeplink" data-nav-back="1">← 앞 페이지</button>' +
      '<button class="deeplink" data-tab-go="lib">▤ 자료실</button>' + (title ? '<span class="lbt">' + esc(title) + "</span>" : "") + "</div>";
  }
  function viewLibItem(v) {
    var p = v.split("/"), o;
    if (p[0] === "doc") {
      var d = W.lib.docs.filter(function (x) { return x[3] === p[1]; })[0];
      if (!d) return libBar("") + '<div class="card">없는 문서다.</div>';
      o = libBar(d[1]) + '<div class="card"><p class="small mut">' + tx(d[2]) +
        ' <a href="' + d[0] + '" target="_blank" rel="noopener">새 창으로 ↗</a></p>' +
        '<iframe class="docframe" src="' + d[0] + '" title="' + esc(d[1]) + '" loading="lazy"></iframe></div>';
      return o + libBar("");
    }
    var M = W.maps[p[1]], kind = p[2] || "gif", lab = (LV_MEDIA.filter(function (l) { return l[0] === kind; })[0] || ["", ""])[1];
    if (p[0] !== "media" || !M) return libBar("") + '<div class="card">없는 자료다.</div>';
    var src = kind === "gif" ? M.media.gif : kind === "mp4" ? M.media.mp4 : kind === "narr" ? "media/" + p[1] + "_narrated.mp4" : M.media.png[theme()];
    o = libBar(M.tab + " · " + lab) + '<div class="card"><div class="rail sub">' + LV_MEDIA.map(function (l) {
      return '<button data-lv="media/' + p[1] + "/" + l[0] + '"' + (l[0] === kind ? ' class="on"' : "") + ">" + l[1] + "</button>";
    }).join("") + "</div>" +
      (kind === "mp4" || kind === "narr" ? '<video class="lvmedia" src="' + src + '" controls playsinline preload="metadata"></video>' : '<img class="lvmedia" src="' + src + '" alt="' + esc(M.tab) + '">') +
      '<p class="small"><a href="' + src + '" target="_blank" rel="noopener">파일 따로 열기 ↗</a> · <button class="deeplink inl" ' + (p[1] === "atlas" ? 'data-atlas-go=""' : 'data-sys-go="' + p[1] + '/map"') + ">이 주제의 화면</button></p></div>";
    return o + libBar("");
  }

  /* ── 라우팅 ── */
  var TABS = ["home", "atlas", "sys", "walk", "decide", "lib", "ia", "wa"];
  var state = { tab: "home", lv: null, astep: null, sys: null, sysSec: null, walk: null, aflow: null, acell: null, arow: null, ascroll: null, ia: { sec: "overview", id: null }, iaf: {}, iaBun: null };
  // 옛 주소를 새 화면으로: #core/... #docs/... #deep/<id> #map/<id> #cases #status #talk #road #about
  function readHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return false;
    var p = raw.split("/");
    var A = { core: ["sys", "core"], docs: ["sys", "core"], road: ["decide"], about: ["home"], cases: ["walk"], status: ["decide"], talk: ["decide"],
      intake: ["sys", "intake"], workflow: ["sys", "workflow"], chain: ["sys", "chain"], diagnose: ["sys", "diagnose"], kb: ["sys", "kb"] };
    if ((p[0] === "deep" || p[0] === "map") && p[1] === "atlas") p = ["atlas"];
    else if (p[0] === "deep" || p[0] === "map") p = ["sys", p[1] || "core"];
    else if (A[p[0]]) p = A[p[0]];
    if (TABS.indexOf(p[0]) < 0) return false;
    state.tab = p[0];
    if (p[0] === "sys") { state.sys = p[1] || null; state.sysSec = p[2] || null; if (state.sysSec) state.ascroll = "s-" + state.sysSec; }
    else if (p[0] === "walk") state.walk = p[1] ? p[1].toUpperCase() : null;
    else if (p[0] === "atlas") atlasGo(p[1] || "");
    else if (p[0] === "ia" || p[0] === "wa") state.ia = { sec: p[1] || "overview", id: p[2] ? decodeURIComponent(p[2]) : null };
    else if (p[0] === "lib") state.lv = p[1] ? p.slice(1).join("/") : null;
    return true;
  }
  function writeHash() {
    var f = state.tab;
    if (f === "sys" && state.sys) f += "/" + state.sys + (state.sysSec ? "/" + state.sysSec : "");
    else if (f === "walk" && state.walk) f += "/" + state.walk;
    else if (f === "atlas" && state.aflow) f += "/" + state.aflow;
    else if (f === "ia" || f === "wa") f += "/" + (state.ia.sec || "overview") + (state.ia.id ? "/" + encodeURIComponent(state.ia.id) : "");
    else if (f === "lib" && state.lv) f += "/" + state.lv;
    if (("#" + f) === location.hash) return;
    // 화면이 바뀌면 기록을 쌓는다(앞 페이지 · 브라우저 뒤로 가기). 같은 화면 안의 고르기는 덮어쓴다
    var push = !replaceNext && location.hash !== "";
    replaceNext = false;
    try {
      if (push) { history.pushState(null, "", "#" + f); navDepth++; }
      else history.replaceState(null, "", "#" + f);
    } catch (e) { location.hash = f; }
  }
  var navDepth = 0, replaceNext = false;

  function paint(keepScroll) {
    var t = state.tab, html, y = window.scrollY;
    if (t === "sys") html = viewSys(state.sys);
    else if (t === "atlas") html = viewAtlas();
    else if (t === "walk") html = viewWalk(state.walk);
    else if (t === "decide") html = viewDecide();
    else if (t === "lib") html = state.lv ? viewLibItem(state.lv) : viewLib();
    else if (t === "ia" || t === "wa") {
      if (state.iaBun !== t) { if (state.iaBun) { state.ia = { sec: "overview", id: null }; state.iaf = {}; } state.iaBun = t; }
      if (!BD()) { app.innerHTML = '<div class="card">' + BUN[t].name + " 데이터를 불러오는 중…</div>"; return loadBun(t, paint); }
      html = libBar(BUN[t].name) + viewIA() + libBar("");
    } else html = viewHome();
    html += '<footer>RTL WorkSys · v' + W.meta.version + " · " + W.meta.updated +
      '<br>설계 중간 결과 뷰어. 모든 사례는 가상이고, 숫자 기준은 공란이다. <button class="deeplink inl" data-tab-go="lib">▤ 자료실</button></footer>';
    app.innerHTML = html;
    if (keepScroll) replaceNext = true;
    writeHash();
    hookNarr(curMapId());
    var navOn = t === "ia" || t === "wa" || t === "lib" ? "" : t;
    var btns = document.querySelectorAll("#nav button");
    for (var i = 0; i < btns.length; i++) btns[i].className = btns[i].dataset.tab === navOn ? "on" : "";
    if (state.ascroll) { var ae = document.getElementById(state.ascroll); state.ascroll = null; if (ae) { ae.scrollIntoView({ block: "start" }); return; } }
    window.scrollTo(0, keepScroll ? y : 0);
  }
  // #atlas/S1 = 그 길을 고르고 '일이 흐르는 길'로, #atlas/grid = 겹침 지도로
  function atlasGo(v) {
    if (/^S\d$/i.test(v)) { state.aflow = v.toUpperCase(); state.ascroll = "a-flow"; }
    else if (/^row:/.test(v)) { state.arow = v.slice(4); state.ascroll = "a-grid"; }
    else if (v) state.ascroll = "a-" + v;
  }

  document.getElementById("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.tab = b.dataset.tab; state.sys = null; state.sysSec = null; state.walk = null; state.arow = null;
    paint();
  });
  document.getElementById("libbtn").addEventListener("click", function () { state.tab = "lib"; state.lv = null; paint(); });

  app.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.sysGo !== undefined) {
      var sp = (b.dataset.sysGo || "").split("/");
      state.tab = "sys"; state.sys = sp[0] || null; state.sysSec = sp[1] || null;
      if (state.sysSec) state.ascroll = "s-" + state.sysSec;
      return paint();
    }
    if (b.dataset.atlasGo !== undefined) { state.tab = "atlas"; state.arow = null; atlasGo(b.dataset.atlasGo); return paint(); }
    if (b.dataset.acell !== undefined) { state.acell = state.acell === b.dataset.acell ? null : b.dataset.acell; return paint(true); }
    if (b.dataset.aflow) { state.aflow = b.dataset.aflow; state.astep = null; return paint(true); }
    if (b.dataset.astep) {
      var fl = W.atlas.flows.filter(function (f) { return f.id === state.aflow; })[0] || W.atlas.flows[0], a = b.dataset.astep;
      state.astep = a === "all" ? null : a === "next" ? (state.astep === null ? 0 : Math.min(state.astep + 1, fl.steps.length - 1)) : (state.astep === null ? fl.steps.length - 1 : Math.max(state.astep - 1, 0));
      return paint(true);
    }
    if (b.dataset.fig) { var fp = b.dataset.fig.split(":"); figSel[fp[0]] = fp.slice(1).join(":"); return paint(true); }
    if (b.dataset.walkGo !== undefined) { state.tab = "walk"; state.walk = b.dataset.walkGo || null; return paint(); }
    if (b.dataset.navBack) {
      if (navDepth > 0) return history.back();
      state.tab = "lib"; state.lv = null; return paint();
    }
    if (b.dataset.lv) { state.tab = "lib"; state.lv = b.dataset.lv; return paint(); }
    if (b.dataset.tabGo) { state.tab = b.dataset.tabGo; state.sys = null; state.walk = null; state.lv = null; return paint(); }
    if (b.dataset.iaSec) { state.tab = bk(); state.ia = { sec: b.dataset.iaSec, id: null }; return paint(); }
    if (b.dataset.iaDoc !== undefined) { var pp = b.dataset.iaDoc.split("/"); state.tab = bk(); state.ia = { sec: pp[0], id: pp[1] || null }; return paint(); }
    if (b.dataset.iaCase) { state.tab = bk(); state.ia = { sec: "golden", id: b.dataset.iaCase }; return paint(); }
    if (b.dataset.iaf !== undefined) { var kv2 = b.dataset.iaf.split("="); state.iaf[kv2[0]] = kv2.slice(1).join("="); state.ia.id = null; return paint(); }
    if (b.dataset.bunGo) { var bp = b.dataset.bunGo.split("/"); state.tab = bp[0]; if (state.iaBun && state.iaBun !== bp[0]) state.iaf = {}; state.iaBun = bp[0]; state.ia = { sec: bp[1] || "overview", id: bp[2] || null }; return paint(); }
    if (b.dataset.seek !== undefined && b.dataset.t) {
      var pl = document.querySelector(".player");
      if (pl) { pl.currentTime = +b.dataset.t; pl.scrollIntoView({ block: "center" }); var pr = pl.play(); if (pr && pr.catch) pr.catch(function () {}); }
      return;
    }
    if (b.dataset.talkSeen) { var ks = "ws_seen_" + b.dataset.talkSeen; set(ks, get(ks, "") ? "" : "1"); return paint(true); }
    if (b.dataset.scroll) { var se = document.getElementById(b.dataset.scroll); if (se) se.scrollIntoView({ block: "start" }); return; }
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
    paint(true);
  });

  window.addEventListener("hashchange", function () { if (readHash()) paint(); });
  window.addEventListener("popstate", function () { if (navDepth > 0) navDepth--; replaceNext = true; if (readHash()) paint(); });

  document.getElementById("sub").textContent = W.meta.subtitle;
  readHash();
  replaceNext = true;
  paint();
})();
