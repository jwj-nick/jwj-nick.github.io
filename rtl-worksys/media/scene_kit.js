/* 한 장 장면 도구: SVG 1920×1080 + 결정론적 timeline.
   규약: 장면은 window.__DUR·window.__seek(t)·window.__ready를 둔다(렌더 도구 30_tools/render_media.mjs가 쓴다).
   주소 인자: ?t=<초> 고정 · ?poster=1 마지막 장면(입자 없음) · ?theme=light|dark · ?capture=1 */
(function () {
  "use strict";
  window.SceneKit = function (svg, DUR) {
    var Q = new URLSearchParams(location.search);
    if (Q.get("theme")) document.documentElement.dataset.theme = Q.get("theme");
    var K = { POSTER: Q.get("poster") === "1", CAPTURE: Q.get("capture") === "1", DUR: DUR, A: [], NS: "http://www.w3.org/2000/svg" };

    K.E = function (tag, at, st, parent) {
      var e = document.createElementNS(K.NS, tag);
      for (var k in at) e.setAttribute(k, at[k]);
      if (st) for (var j in st) e.style[j] = st[j];
      (parent || svg).appendChild(e);
      return e;
    };
    K.T = function (x, y, s, size, st, parent, anchor) {
      var e = K.E("text", { x: x, y: y, "text-anchor": anchor || "start" },
        Object.assign({ fontSize: size + "px", fill: "var(--fg)" }, st || {}), parent);
      e.textContent = s;
      return e;
    };
    K.G = function (parent) { return K.E("g", {}, null, parent); };
    K.wrap = function (x, y, s, size, width, lh, st, parent) {
      var g = K.G(parent), words = s.split(" "), line = "", lines = [];
      var probe = K.T(x, y, "", size, st, g);
      for (var i = 0; i < words.length; i++) {
        var trial = line ? line + " " + words[i] : words[i];
        probe.textContent = trial;
        if (probe.getComputedTextLength() > width && line) { lines.push(line); line = words[i]; } else line = trial;
      }
      if (line) lines.push(line);
      g.removeChild(probe);
      lines.forEach(function (l, n) { K.T(x, y + n * lh, l, size, st, g); });
      return { g: g, n: lines.length };
    };
    K.width = function (s, size, weight) {
      var t = K.T(0, -200, s, size, { fontWeight: weight || 700 }), w = t.getComputedTextLength();
      svg.removeChild(t);
      return w;
    };
    K.pill = function (cx, cy, label, size, color, parent, o) {
      o = o || {};
      var g = K.G(parent), t = K.T(cx, cy + size * 0.36, label, size, { fill: o.textColor || color, fontWeight: 700 }, g, "middle");
      var w = t.getComputedTextLength() + (o.pad || 30), hh = o.h || size * 2.1;
      var r = K.E("rect", { x: cx - w / 2, y: cy - hh / 2, width: w, height: hh, rx: o.rx !== undefined ? o.rx : hh / 2 },
        { fill: o.fill || "color-mix(in srgb," + color + " 14%, var(--card))", stroke: color, strokeWidth: o.sw || 2,
          strokeDasharray: o.dash || "none" });
      g.insertBefore(r, t);
      g._w = w; g._rect = r; g._text = t;
      return g;
    };
    K.box = function (x, y, w, hh, color, parent, o) {
      o = o || {};
      return K.E("rect", { x: x, y: y, width: w, height: hh, rx: o.rx || 14 },
        { fill: o.fill || "color-mix(in srgb," + color + " 10%, var(--card))", stroke: o.stroke || color, strokeWidth: o.sw || 2,
          strokeDasharray: o.dash || "none" }, parent);
    };

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function eo(x) { return 1 - Math.pow(1 - x, 3); }
    function eback(x) { var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
    K.clamp = clamp; K.eo = eo;
    K.fade = function (el, t0, d, t1, d1) { K.A.push({ k: "fade", el: el, t0: t0, d: d || 0.4, t1: t1, d1: d1 || 0.35 }); return el; };
    K.pop = function (el, cx, cy, t0, d) { K.A.push({ k: "pop", el: el, cx: cx, cy: cy, t0: t0, d: d || 0.45 }); return el; };
    K.rise = function (el, t0, d, dy) { K.A.push({ k: "rise", el: el, t0: t0, d: d || 0.5, dy: dy || 24 }); return el; };
    K.draw = function (el, t0, d) {
      var L = el.getTotalLength();
      el.style.strokeDasharray = L + " " + L;
      K.A.push({ k: "draw", el: el, t0: t0, d: d, L: L });
      return el;
    };
    function apply(a, t) {
      var p;
      if (a.k === "fade") {
        p = eo(clamp((t - a.t0) / a.d));
        if (a.t1 !== undefined) p *= 1 - eo(clamp((t - a.t1) / a.d1));
        a.el.style.opacity = p;
      } else if (a.k === "pop") {
        p = clamp((t - a.t0) / a.d);
        var s = p <= 0 ? 0.001 : eback(p);
        a.el.setAttribute("transform", "translate(" + a.cx + " " + a.cy + ") scale(" + s + ") translate(" + (-a.cx) + " " + (-a.cy) + ")");
        a.el.style.opacity = clamp(p * 2.5);
      } else if (a.k === "rise") {
        p = eo(clamp((t - a.t0) / a.d));
        a.el.setAttribute("transform", "translate(0 " + ((1 - p) * a.dy) + ")");
        a.el.style.opacity = p;
      } else if (a.k === "draw") {
        p = eo(clamp((t - a.t0) / a.d));
        a.el.style.strokeDashoffset = a.L * (1 - p);
      }
    }
    K.rng = function (seed) {
      return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    };

    // 제목줄: [{t0, t1, main, sub}] · 머리 이름표 · 진행 막대
    K.header = function (kicker, caps) {
      K.T(80, 78, kicker, 24, { fill: "var(--acc)", fontWeight: 800, letterSpacing: "1px" });
      var capG = K.G();
      caps.forEach(function (c, i) {
        var g = K.G(capG);
        K.T(80, 146, c.main, 46, { fontWeight: 800 }, g);
        K.T(80, 198, c.sub, 24, { fill: "var(--mut)" }, g);
        if (K.POSTER) { g.style.opacity = i === caps.length - 1 ? 1 : 0; return; }
        K.fade(g, c.t0 === 0 ? -1 : c.t0, 0.4, c.t1 < 99 ? c.t1 - 0.25 : undefined, 0.3);
      });
      K.bar = K.POSTER ? null : K.E("rect", { x: 80, y: 222, width: 0, height: 3, rx: 1.5 }, { fill: "var(--acc)", opacity: 0.5 });
    };

    // 흐름도 묶음을 가운데에서 위로 올린다: 앞 장면들이 화면 가운데에 오게
    K.lift = function (group, dy, t0, d) { K.liftG = group; K.liftDy = dy; K.liftT = t0; K.liftD = d || 0.7; };

    K.seekAll = function (t, extra) {
      for (var i = 0; i < K.A.length; i++) apply(K.A[i], t);
      if (K.bar) K.bar.setAttribute("width", 1760 * clamp(t / DUR));
      if (K.liftG) {
        var dy = K.POSTER ? 0 : K.liftDy * (1 - eo(clamp((t - K.liftT) / K.liftD)));
        K.liftG.setAttribute("transform", "translate(0 " + dy + ")");
      }
      if (extra) extra(t);
    };
    K.start = function (extra) {
      var seek = function (t) { K.seekAll(t, extra); };
      window.__DUR = DUR;
      window.__seek = seek;
      var fixed = Q.get("t");
      if (K.POSTER) seek(DUR);
      else if (fixed !== null) seek(+fixed);
      else if (!K.CAPTURE) {
        var start = performance.now();
        svg.addEventListener("click", function () { start = performance.now(); });
        (function loopFn(now) {
          var t = ((now - start) / 1000) % (DUR + 2);
          seek(Math.min(t, DUR));
          requestAnimationFrame(loopFn);
        })(start);
      } else seek(0);
      window.__ready = true;
    };
    // 경로 위 입자 위치: route = [{p, L}] 연결
    K.seg = function (p, L) { return { p: p, L: L === undefined ? p.getTotalLength() : L }; };
    K.along = function (route, s) {
      for (var i = 0; i < route.length; i++) {
        if (s <= route[i].L) { var pt = route[i].p.getPointAtLength(s); return { x: pt.x, y: pt.y, i: i, tail: i === route.length - 1 ? route[i].L - s : 999 }; }
        s -= route[i].L;
      }
      return null;
    };
    return K;
  };
})();
