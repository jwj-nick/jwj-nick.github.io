/* lecture.js — 관문 특강("완전정복") 공용 엔진 v1 (2026-09-02)
 *
 * math-story-telling의 speed-mastery.html(중1 속력 특강)에서 검증된 7단계 골격을
 * subject_hub 규약(단일 HTML · 바닐라 · 외부 라이브러리 없음, KaTeX만 예외)에 맞게 이식한 것.
 * drill.js처럼 과목 폴더에 함께 배포하고 <script src="lecture.js"></script>로 읽는다.
 *
 * 7단계:  ⓪ 도입 공감(hero) → ① 감 잡기(위젯) → ② 공식은 읽는 것(유도) → ③ 핵심 도구
 *         → ④ 유형별 완전정복(무한 재생성) → ⑤ 실전 총정리(틀리면 유형 앵커) → ⑥ 치트시트(인쇄)
 *
 * 쓰는 법 (특강 HTML 안에서):
 *   <section class="lec-sec reveal" data-step="1" id="s1"> ... </section>     ← 단계 섹션
 *   <section class="lec-type reveal" id="type1"> ... <div id="type1body"></div></section>
 *   <script id="gen"> window.GEN = { type1:{label:'…', anchor:'#type1', gen:function(){…}, verify:function(p){…}}, … } </script>
 *   <script> LEC.boot({key:'mat2_sp_coord', color:'#0d9488', color2:'#14b8a6'});
 *            LEC.types(['type1','type2','type3','type4']);  LEC.quiz('quizArea', {n:5}); </script>
 *
 * 생성기 계약 (순수 함수 — DOM 금지, Node 재검산 대상):
 *   gen() → { q: HTML(KaTeX $…$ 허용, $ 안 한글 금지), steps:[HTML…], ans:number | choices:[HTML…]+ans:index,
 *             unit?: '단위', fig?: any(렌더 훅에 전달), tol?: 허용오차 }
 *   verify(p) → true/false  (답을 독립 계산으로 재확인. 없으면 형식만 검사)
 *
 * localStorage: lec:<key> = {last:{score,n,date}, best}. 결과 전송 UI 없음(FLOW V2 아웃루프 차단).
 */
(function () {
  'use strict';
  var LEC = {};

  /* ───────── 유틸(순수) ───────── */
  LEC.ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  LEC.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  LEC.shuffle = function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  LEC.nz = function (a, b) { var v = 0; while (v === 0) v = LEC.ri(a, b); return v; };   // 0 아닌 정수
  LEC.gcd = function (a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; };
  LEC.fmt = function (n) { var r = Math.round(n * 1e6) / 1e6; return String(r).replace('-', '−'); };
  LEC.frac = function (p, q) {                 // 기약분수 KaTeX 문자열 (정수면 정수)
    if (q < 0) { p = -p; q = -q; }
    var g = LEC.gcd(p, q); p /= g; q /= g;
    if (q === 1) return String(p);
    return (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}';
  };
  LEC.term = function (c, sym, first) {        // 계수 c, 기호 sym → 다항식 항 (첫 항이면 + 생략)
    if (c === 0) return '';
    var s = c < 0 ? '-' : (first ? '' : '+');
    var a = Math.abs(c);
    if (sym === '') return s + a;
    return s + (a === 1 ? '' : a) + sym;
  };
  LEC.poly = function (coefs, x) {             // [a,b,c] → ax^2+bx+c (KaTeX, 0계수 생략)
    x = x || 'x'; var n = coefs.length - 1, out = '', first = true;
    for (var i = 0; i <= n; i++) {
      var d = n - i, c = coefs[i]; if (c === 0) continue;
      var sym = d === 0 ? '' : (d === 1 ? x : x + '^{' + d + '}');
      out += LEC.term(c, sym, first); first = false;
    }
    return out === '' ? '0' : out;
  };
  LEC.pt = function (x, y) { return '(' + LEC.fmt(x).replace('−', '-') + ',\\,' + LEC.fmt(y).replace('−', '-') + ')'; };
  LEC.sgnParen = function (n) { return n < 0 ? '(' + n + ')' : String(n); };   // 음수 대입 시 괄호
  LEC.parseNum = function (s) {                // "3/2", "-1.5", "−2" → number
    s = String(s || '').trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (!s) return NaN;
    var m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return parseFloat(s);
    return NaN;
  };
  LEC.same = function (v, ans, tol) { return Math.abs(v - ans) <= (tol == null ? 1e-6 : tol); };

  /* ───────── 브라우저 전용 ───────── */
  var doc = typeof document !== 'undefined' ? document : null;
  var CFG = { key: 'lec', color: '#2563eb', color2: '#60a5fa' };

  LEC.tex = function (el) {
    if (typeof renderMathInElement === 'function') {
      try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { }
    }
  };
  LEC.$ = function (id) { return doc.getElementById(id); };
  LEC.el = function (tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  var CSS = ''
    + ':root{--lec:' + '#2563eb' + ';--lec2:#60a5fa;--ink:#1e293b;--sub:#64748b;--line:#e2e8f0;--panel:#fff;--soft:#f8fafc;--ok:#15803d;--ok-bg:#ecfdf5;--bad:#b91c1c;--bad-bg:#fef2f2}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:#f1f5f9;color:var(--ink);line-height:1.7;-webkit-text-size-adjust:100%}'
    + 'a{color:var(--lec)}'
    + '.crumb{background:#f8fafc;border-bottom:1px solid var(--line);padding:7px 16px;font-size:12px;display:flex;align-items:center;gap:5px;flex-wrap:wrap}'
    + '.crumb a{color:var(--sub);text-decoration:none}.crumb a.cur{color:var(--lec);font-weight:600}.crumb span{color:#cbd5e1}'
    + '.wrap{max-width:740px;margin:0 auto;padding:14px 16px 80px}'
    + '.lec-hero{border-radius:22px;padding:26px 22px;margin:10px 0 16px;color:#fff;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--lec),var(--lec2));box-shadow:0 10px 28px rgba(15,23,42,.14)}'
    + '.lec-hero::after{content:"";position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.14)}'
    + '.lec-hero .tag{display:inline-block;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:2px 11px;font-size:11.5px;margin-bottom:8px}'
    + '.lec-hero h1{font-size:23px;font-weight:800;letter-spacing:-.3px;margin-bottom:8px;line-height:1.35}'
    + '.lec-hero p{font-size:14px;opacity:.95}.lec-hero p b{color:#fff}'
    + '.lec-goal{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.lec-goal a{background:rgba(255,255,255,.22);border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:700;color:#fff;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}'
    + '.lec-nav{position:sticky;top:0;z-index:40;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;background:rgba(241,245,249,.94);backdrop-filter:blur(6px);padding:8px 0;margin:0 0 6px}.lec-nav::-webkit-scrollbar{display:none}'
    + '.lec-nav a{flex:0 0 auto;font-size:12px;font-weight:700;color:var(--sub);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 12px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;gap:5px}'
    + '.lec-nav a.on{color:#fff;background:var(--lec);border-color:var(--lec)}'
    + '.lec-sec{margin:34px 0}.lec-type{margin:22px 0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px 18px 16px;box-shadow:0 2px 8px rgba(15,23,42,.05)}'
    + '.eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--lec);font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:9px}'
    + '.eyebrow .n{background:linear-gradient(135deg,var(--lec),var(--lec2));color:#fff;border-radius:999px;width:26px;height:26px;display:grid;place-items:center;font-size:12.5px;flex-shrink:0}'
    + '.lec-sec>p,.lec-type>p{font-size:14.5px;margin:0 0 12px}'
    + '.lec-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:12px 0;box-shadow:0 2px 8px rgba(15,23,42,.05)}'
    + '.lec-card h4{font-size:14px;font-weight:800;margin-bottom:8px}'
    + '.lec-widget{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 14px 12px;margin:12px 0;box-shadow:0 2px 8px rgba(15,23,42,.05)}'
    + '.lec-widget canvas{display:block;width:100%;max-width:480px;margin:0 auto;border-radius:10px;background:#fff;touch-action:none}'
    + '.lec-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 4px;font-size:13px}.lec-row input[type=range]{flex:1;min-width:120px;accent-color:var(--lec)}'
    + '.lec-row .v{font-variant-numeric:tabular-nums;font-weight:800;color:var(--lec);min-width:60px;text-align:right}'
    + '.lec-formula{background:linear-gradient(135deg,#f5f3ff,#eef2ff);border:1px solid #ddd6fe;border-radius:14px;padding:14px 16px;margin:12px 0;text-align:center}'
    + '.lec-formula .f{font-size:18px;font-weight:800;color:var(--ink)}.lec-formula small{display:block;font-size:12.5px;color:var(--sub);font-weight:500;margin-top:4px}'
    + '.lec-key{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:11px 14px;margin:10px 0;font-size:13.5px}.lec-key b{color:#b45309}'
    + '.lec-warn{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:11px 14px;margin:10px 0;font-size:13.5px}.lec-warn b{color:#b91c1c}'
    + '.lec-type-h{display:flex;align-items:center;gap:12px;margin-bottom:10px}.lec-type-h .badge{background:linear-gradient(135deg,var(--lec),var(--lec2));color:#fff;border-radius:12px;width:40px;height:40px;display:grid;place-items:center;font-weight:800;font-size:17px;flex-shrink:0}'
    + '.lec-type-h .t{font-weight:800;font-size:16px}.lec-type-h .d{font-size:12.5px;color:var(--sub)}'
    + '.lec-prob{background:var(--soft);border-left:4px solid var(--lec);border-radius:0 12px 12px 0;padding:12px 14px;margin:10px 0;font-size:15px;line-height:1.8}'
    + '.lec-fig{margin:8px 0}'
    + '.lec-checkrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}'
    + '.lec-checkrow input.num{flex:1;min-width:110px;max-width:220px;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit;font-size:15px;min-height:44px}'
    + '.lec-checkrow input.num:focus{outline:none;border-color:var(--lec)}'
    + '.lec-checkrow button,.lec-btn{background:var(--lec);color:#fff;border:none;border-radius:10px;padding:10px 16px;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;min-height:44px}'
    + '.lec-btn.ghost{background:none;border:1.5px solid var(--lec);color:var(--lec)}'
    + '.lec-out{margin-top:8px;font-size:14px;min-height:1.4em;font-weight:700}.lec-out.ok{color:var(--ok)}.lec-out.bad{color:var(--bad)}'
    + '.lec-choices{display:grid;gap:8px;margin-top:8px}.lec-choices button{text-align:left;border:2px solid var(--line);background:#fff;border-radius:12px;padding:12px 14px;font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;min-height:48px}'
    + '.lec-choices button.ok{border-color:#6ee7b7;background:var(--ok-bg)}.lec-choices button.bad{border-color:#fecaca;background:var(--bad-bg)}.lec-choices button.dim{opacity:.5}'
    + '.lec-sol{display:none;margin-top:10px}.lec-sol.show{display:block}'
    + '.lec-step{border:1px solid var(--line);border-radius:12px;padding:10px 13px;margin:7px 0;background:#fff;font-size:14px;animation:lecpop .3s ease}'
    + '.lec-step .sn{display:inline-block;background:var(--lec);color:#fff;border-radius:6px;padding:0 8px;font-size:12px;font-weight:800;margin-right:6px;line-height:20px}'
    + '.lec-ans{background:var(--ok-bg);border:2px solid #6ee7b7;border-radius:12px;padding:10px 14px;text-align:center;font-size:15.5px;font-weight:800;color:#065f46;margin:8px 0}'
    + '.lec-tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}'
    + '.lec-again{background:none;border:1.5px solid var(--lec);color:var(--lec);border-radius:999px;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;min-height:44px}'
    + '@keyframes lecpop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
    + '.reveal{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}.reveal.in{opacity:1;transform:none}'
    + '@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}'
    + '.lec-quiz{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:12px 0;box-shadow:0 2px 8px rgba(15,23,42,.05)}'
    + '.lec-quiz .qh{display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:13px;color:var(--sub);font-weight:700}.lec-quiz .qh b{color:var(--lec)}'
    + '.lec-hint{display:none;margin-top:8px;font-size:13.5px;color:var(--bad);font-weight:700}.lec-hint.show{display:block}.lec-hint a{color:var(--lec)}'
    + '.lec-score{background:linear-gradient(135deg,var(--lec),var(--lec2));color:#fff;border-radius:16px;padding:18px;text-align:center;margin:12px 0}.lec-score .big{font-size:36px;font-weight:800}.lec-score p{font-size:13.5px;margin-top:4px}.lec-score a{color:#fff;font-weight:800}'
    + '.lec-cheat{background:linear-gradient(135deg,var(--lec),var(--lec2));color:#fff;border-radius:18px;padding:20px 22px;margin:14px 0}'
    + '.lec-cheat h3{margin:0 0 10px;font-size:16px}.lec-cheat .row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}'
    + '.lec-cheat .chip{background:rgba(255,255,255,.2);border-radius:10px;padding:8px 12px;font-size:12.5px;flex:1;min-width:150px}.lec-cheat .chip b{display:block;font-size:13px;margin-bottom:2px}'
    + '.lec-cheat .katex{color:#fff}'
    + '#printCheat{background:#fff;color:var(--lec);border:none;border-radius:999px;padding:9px 18px;font-weight:800;font-size:13px;cursor:pointer;margin-top:12px;min-height:44px}'
    + '#printArea{display:none}'
    + '@media print{body>*:not(#printArea){display:none!important}#printArea{display:block!important;color:#000}#printArea .lec-cheat{background:none;color:#000;border:1px solid #000}#printArea .chip{border:1px solid #999;background:none}#printArea .katex{color:#000}}'
    + '.keeper{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d;border-radius:12px;padding:14px 16px;margin:12px 0}.keeper .kt{color:#b45309;font-weight:800;font-size:14px;margin-bottom:6px}.keeper li{list-style:none;position:relative;padding:6px 0 6px 30px;font-size:13.5px;border-bottom:1px dashed #fde68a}.keeper li:last-child{border-bottom:none}.keeper li::before{content:"\\1F4CC";position:absolute;left:2px;top:6px}'
    + '.insight{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:13px 15px;margin:12px 0;font-size:13.5px}.insight .it{color:#6d28d9;font-weight:800;margin-bottom:4px}'
    + '.reallife{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:13px 15px;margin:12px 0;font-size:13.5px}.reallife .rt{color:#15803d;font-weight:800;margin-bottom:4px}'
    + '.lec-table{width:100%;border-collapse:collapse;font-size:13.5px;margin:8px 0}.lec-table th,.lec-table td{border:1px solid var(--line);padding:8px 9px;text-align:center}.lec-table th{background:var(--soft)}.lec-table td.q{color:var(--bad);font-weight:800}.lec-table td.k{color:var(--lec);font-weight:700}'
    + '.lec-foot{text-align:center;color:#94a3b8;font-size:12px;margin-top:26px}'
    + '@media (max-width:640px){.lec-hero h1{font-size:20px}.lec-type{padding:14px}}';

  LEC.boot = function (cfg) {
    if (!doc) return;
    cfg = cfg || {}; for (var k in cfg) CFG[k] = cfg[k];
    var st = doc.createElement('style');
    st.textContent = CSS.replace('--lec:#2563eb;--lec2:#60a5fa', '--lec:' + CFG.color + ';--lec2:' + (CFG.color2 || CFG.color));
    doc.head.appendChild(st);
    // 단계 내비 (data-step 섹션)
    var secs = doc.querySelectorAll('[data-step]');
    var nav = doc.getElementById('lecNav');
    if (nav && secs.length) {
      var s = '';
      secs.forEach(function (sec) { s += '<a href="#' + sec.id + '" data-for="' + sec.id + '"><span>' + sec.getAttribute('data-step') + '</span>' + (sec.getAttribute('data-label') || '') + '</a>'; });
      nav.innerHTML = s;
    }
    // reveal
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
      doc.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
      if (nav) {
        var io2 = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-for') === e.target.id); }); } });
        }, { rootMargin: '-40% 0px -55% 0px' });
        secs.forEach(function (sec) { io2.observe(sec); });
      }
    } else { doc.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); }
    // 인쇄
    var pb = doc.getElementById('printCheat');
    if (pb) pb.addEventListener('click', function () {
      var src = doc.querySelector('.lec-cheat'); var pa = doc.getElementById('printArea');
      if (src && pa) { pa.innerHTML = '<h2 style="font-size:18px;margin:0 0 10px">' + (doc.title || '') + '</h2>' + src.outerHTML; var b = pa.querySelector('#printCheat'); if (b) b.remove(); window.print(); }
    });
    LEC.tex(doc.body);
  };

  /* ───────── 함께 생각하기 (숫자/객관식 확인) ───────── */
  // LEC.check('q1', answer, {unit:'km', ok:'…', bad:'…', tol:0.01})
  LEC.check = function (id, ans, o) {
    o = o || {}; var inp = LEC.$(id), btn = LEC.$(id + 'b'), out = LEC.$(id + 'o'); if (!inp || !btn || !out) return;
    function run() {
      var v = LEC.parseNum(inp.value);
      if (isNaN(v)) { out.className = 'lec-out bad'; out.textContent = '숫자로 적어 주세요. (분수는 3/2처럼)'; return; }
      var hit = Array.isArray(ans) ? ans.some(function (a) { return LEC.same(v, a, o.tol); }) : LEC.same(v, ans, o.tol);
      out.className = 'lec-out ' + (hit ? 'ok' : 'bad');
      out.innerHTML = hit ? ('⭕ ' + (o.ok || '맞아요!')) : ('❌ ' + (o.bad || '다시 생각해 봐요.'));
      LEC.tex(out);
    }
    btn.addEventListener('click', run); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  };

  /* ───────── 유형별 완전정복 렌더 ───────── */
  function renderProblem(host, p, spec, opts) {
    opts = opts || {};
    host.innerHTML = '';
    var prob = LEC.el('div', 'lec-prob', p.q); host.appendChild(prob);
    if (p.fig && spec.fig) { var fg = LEC.el('div', 'lec-fig'); host.appendChild(fg); try { spec.fig(p, fg); } catch (e) { } }
    var out = LEC.el('div', 'lec-out'); var sol = LEC.el('div', 'lec-sol'); var answered = false;
    var hint = LEC.el('div', 'lec-hint');
    function showSol() {
      sol.innerHTML = ''; (p.steps || []).forEach(function (s, i) { sol.appendChild(LEC.el('div', 'lec-step', '<span class="sn">' + (i + 1) + '</span>' + s)); });
      var a = p.choices ? p.choices[p.ans] : (LEC.fmt(p.ans) + (p.unit ? ' ' + p.unit : ''));
      sol.appendChild(LEC.el('div', 'lec-ans', '정답: ' + a)); sol.classList.add('show'); LEC.tex(sol);
    }
    function mark(ok) {
      answered = true;
      out.className = 'lec-out ' + (ok ? 'ok' : 'bad'); out.textContent = ok ? '⭕ 정답!' : '❌ 아쉬워요. 풀이를 보고 다시 한 번.';
      if (!ok && opts.onWrong) opts.onWrong(hint);
      if (ok && opts.onRight) opts.onRight();
      if (!ok || opts.showSolOnRight !== false) showSol();
    }
    if (p.choices) {
      var order = LEC.shuffle(p.choices.map(function (_, i) { return i; }));
      var box = LEC.el('div', 'lec-choices'); host.appendChild(box);
      order.forEach(function (idx) {
        var b = LEC.el('button', '', p.choices[idx]); b.addEventListener('click', function () {
          if (answered) return; var ok = idx === p.ans;
          box.querySelectorAll('button').forEach(function (bb, k) { var oi = order[k]; if (oi === p.ans) bb.classList.add('ok'); else if (bb === b) bb.classList.add('bad'); else bb.classList.add('dim'); });
          mark(ok);
        }); box.appendChild(b);
      });
    } else {
      var row = LEC.el('div', 'lec-checkrow');
      var inp = LEC.el('input', 'num'); inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('aria-label', '답'); inp.placeholder = '답' + (p.unit ? ' (' + p.unit + ')' : '');
      var btn = LEC.el('button', '', '확인'); row.appendChild(inp); if (p.unit) row.appendChild(LEC.el('span', '', p.unit)); row.appendChild(btn); host.appendChild(row);
      function go() { if (answered) return; var v = LEC.parseNum(inp.value); if (isNaN(v)) { out.className = 'lec-out bad'; out.textContent = '숫자로 적어 주세요. (분수는 3/2처럼)'; return; } mark(LEC.same(v, p.ans, p.tol)); }
      btn.addEventListener('click', go); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }
    host.appendChild(out); host.appendChild(hint); host.appendChild(sol);
    var tools = LEC.el('div', 'lec-tools');
    var sb = LEC.el('button', 'lec-again', '💡 풀이 보기'); sb.addEventListener('click', function () { showSol(); });
    tools.appendChild(sb);
    if (opts.again) { var ab = LEC.el('button', 'lec-again', '🔄 다른 문제로'); ab.addEventListener('click', opts.again); tools.appendChild(ab); }
    host.appendChild(tools); LEC.tex(host);
  }

  LEC.types = function (ids) {
    if (!doc || !window.GEN) return;
    ids.forEach(function (id) {
      var spec = window.GEN[id]; var host = LEC.$(id + 'body'); if (!spec || !host) return;
      (function draw() { var p = spec.gen(); renderProblem(host, p, spec, { again: draw }); })();
    });
  };

  /* ───────── 실전 총정리 ───────── */
  LEC.quiz = function (hostId, o) {
    if (!doc || !window.GEN) return; o = o || {}; var host = LEC.$(hostId); if (!host) return;
    var ids = o.types || Object.keys(window.GEN); var n = o.n || 5;
    function build() {
      host.innerHTML = ''; var score = 0, done = 0, wrong = {};
      var seq = []; while (seq.length < n) seq = seq.concat(LEC.shuffle(ids)); seq = seq.slice(0, n);
      seq.forEach(function (id, i) {
        var spec = window.GEN[id]; var p = spec.gen();
        var card = LEC.el('div', 'lec-quiz'); card.innerHTML = '<div class="qh"><b>Q' + (i + 1) + '</b><span>유형은 비밀 — 스스로 판단해요</span></div>';
        var body = LEC.el('div'); card.appendChild(body); host.appendChild(card);
        renderProblem(body, p, spec, {
          showSolOnRight: false,
          onRight: function () { score++; done++; fin(); },
          onWrong: function (hint) { wrong[id] = (wrong[id] || 0) + 1; done++; hint.innerHTML = '이 문제는 <b>' + (spec.label || id) + '</b> 유형이에요 → <a href="' + (spec.anchor || '#' + id) + '">그 유형으로 돌아가 다시 익히기 ↑</a>'; hint.classList.add('show'); fin(); }
        });
      });
      function fin() {
        if (done < n) return;
        var sc = LEC.el('div', 'lec-score'); var w = Object.keys(wrong);
        var msg = score === n ? '완벽해요! 이 특강은 졸업이에요.' : (score >= n - 1 ? '거의 다 왔어요. 틀린 유형만 한 번 더.' : '틀린 유형으로 돌아가서 다시 익히고 새 5문제로 확인해요.');
        sc.innerHTML = '<div class="big">' + score + ' / ' + n + '</div><p>' + msg + '</p>' + (w.length ? '<p>다시 볼 유형: ' + w.map(function (id) { var s = window.GEN[id]; return '<a href="' + (s.anchor || '#' + id) + '">' + (s.label || id) + '</a>'; }).join(' · ') + '</p>' : '');
        host.appendChild(sc); sc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { var key = 'lec:' + CFG.key; var rec = JSON.parse(localStorage.getItem(key) || '{}'); rec.last = { score: score, n: n, date: new Date().toISOString().slice(0, 10) }; rec.best = Math.max(rec.best || 0, score); localStorage.setItem(key, JSON.stringify(rec)); } catch (e) { }
      }
    }
    build();
    var again = LEC.$(hostId + 'Again'); if (again) again.addEventListener('click', function () { build(); host.scrollIntoView({ behavior: 'smooth' }); });
  };

  /* ───────── 좌표평면 Canvas ───────── */
  // var P = LEC.plane(cv, {xmin,xmax,ymin,ymax,h,square:true,grid:1}); P.clear().grid().axes(); P.plot(fn); P.dot(x,y)
  LEC.plane = function (cv, o) {
    o = o || {};
    var P = { cv: cv, xmin: o.xmin == null ? -6 : o.xmin, xmax: o.xmax == null ? 6 : o.xmax, ymin: o.ymin == null ? -6 : o.ymin, ymax: o.ymax == null ? 6 : o.ymax, h: o.h || 300, gridStep: o.grid || 1, square: !!o.square };
    var yc0 = (P.ymin + P.ymax) / 2;
    P.resize = function () {
      var dpr = window.devicePixelRatio || 1; var w = cv.clientWidth || cv.parentElement.clientWidth || 320;
      cv.style.width = '100%'; cv.style.height = P.h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(P.h * dpr);
      P.ctx = cv.getContext('2d'); P.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); P.w = w;
      if (P.square) { var unit = w / (P.xmax - P.xmin); var yr = P.h / unit; P.ymin = yc0 - yr / 2; P.ymax = yc0 + yr / 2; }
      return P;
    };
    P.X = function (x) { return (x - P.xmin) / (P.xmax - P.xmin) * P.w; };
    P.Y = function (y) { return P.h - (y - P.ymin) / (P.ymax - P.ymin) * P.h; };
    P.ix = function (px) { return P.xmin + px / P.w * (P.xmax - P.xmin); };
    P.iy = function (py) { return P.ymin + (P.h - py) / P.h * (P.ymax - P.ymin); };
    P.clear = function () { P.ctx.clearRect(0, 0, P.w, P.h); return P; };
    P.grid = function () {
      var c = P.ctx, s = P.gridStep; c.lineWidth = 1; c.strokeStyle = '#e2e8f0';
      for (var x = Math.ceil(P.xmin / s) * s; x <= P.xmax; x += s) { c.beginPath(); c.moveTo(P.X(x), 0); c.lineTo(P.X(x), P.h); c.stroke(); }
      for (var y = Math.ceil(P.ymin / s) * s; y <= P.ymax; y += s) { c.beginPath(); c.moveTo(0, P.Y(y)); c.lineTo(P.w, P.Y(y)); c.stroke(); }
      return P;
    };
    P.axes = function (labels) {
      var c = P.ctx; c.lineWidth = 1.6; c.strokeStyle = '#64748b';
      c.beginPath(); c.moveTo(0, P.Y(0)); c.lineTo(P.w, P.Y(0)); c.stroke(); c.beginPath(); c.moveTo(P.X(0), 0); c.lineTo(P.X(0), P.h); c.stroke();
      if (labels !== false) {
        c.fillStyle = '#94a3b8'; c.font = '11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
        var s = P.gridStep * (P.xmax - P.xmin > 14 ? 2 : 1);
        for (var x = Math.ceil(P.xmin / s) * s; x <= P.xmax; x += s) { if (x === 0) continue; c.fillText(LEC.fmt(x), P.X(x), P.Y(0) + 3); }
        c.textAlign = 'right'; c.textBaseline = 'middle';
        for (var y = Math.ceil(P.ymin / s) * s; y <= P.ymax; y += s) { if (y === 0) continue; c.fillText(LEC.fmt(y), P.X(0) - 4, P.Y(y)); }
        c.fillText('O', P.X(0) - 4, P.Y(0) + 8);
      }
      return P;
    };
    P.plot = function (fn, color, width, from, to) {
      var c = P.ctx; c.lineWidth = width || 2.4; c.strokeStyle = color || '#2563eb'; c.beginPath(); var started = false;
      var a = from == null ? P.xmin : from, b = to == null ? P.xmax : to; var N = Math.max(200, P.w);
      for (var i = 0; i <= N; i++) { var x = a + (b - a) * i / N; var y = fn(x); if (!isFinite(y) || Math.abs(y) > 1e4) { started = false; continue; } var py = P.Y(y); if (py < -2000 || py > 2000) { started = false; continue; } if (!started) { c.moveTo(P.X(x), py); started = true; } else c.lineTo(P.X(x), py); }
      c.stroke(); return P;
    };
    P.seg = function (x1, y1, x2, y2, color, width, dash) { var c = P.ctx; c.save(); if (dash) c.setLineDash(dash); c.lineWidth = width || 2; c.strokeStyle = color || '#0f172a'; c.beginPath(); c.moveTo(P.X(x1), P.Y(y1)); c.lineTo(P.X(x2), P.Y(y2)); c.stroke(); c.restore(); return P; };
    P.lineABC = function (a, b, cc, color, width, dash) { // ax+by+c=0
      if (Math.abs(b) < 1e-9) { var x0 = -cc / a; return P.seg(x0, P.ymin, x0, P.ymax, color, width, dash); }
      return P.seg(P.xmin, (-a * P.xmin - cc) / b, P.xmax, (-a * P.xmax - cc) / b, color, width, dash);
    };
    P.circle = function (cx, cy, r, color, width, fill) { var c = P.ctx; c.lineWidth = width || 2.4; c.strokeStyle = color || '#2563eb'; c.beginPath(); var rx = r / (P.xmax - P.xmin) * P.w, ry = r / (P.ymax - P.ymin) * P.h; c.ellipse(P.X(cx), P.Y(cy), rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } c.stroke(); return P; };
    P.dot = function (x, y, color, r, label, pos) { var c = P.ctx; c.fillStyle = color || '#dc2626'; c.beginPath(); c.arc(P.X(x), P.Y(y), r || 6, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); if (label) { P.text(x, y, label, color || '#dc2626', pos || 'ne'); } return P; };
    P.text = function (x, y, str, color, pos, font) { var c = P.ctx; c.fillStyle = color || '#0f172a'; c.font = font || 'bold 12.5px sans-serif'; var px = P.X(x), py = P.Y(y); var dx = 8, dy = -8; c.textAlign = 'left'; c.textBaseline = 'bottom'; if (pos === 'nw') { dx = -8; c.textAlign = 'right'; } if (pos === 'se') { dy = 8; c.textBaseline = 'top'; } if (pos === 'sw') { dx = -8; dy = 8; c.textAlign = 'right'; c.textBaseline = 'top'; } if (pos === 'n') { dx = 0; c.textAlign = 'center'; } if (pos === 's') { dx = 0; dy = 8; c.textAlign = 'center'; c.textBaseline = 'top'; } c.fillText(str, px + dx, py + dy); return P; };
    P.poly = function (pts, color, fill, width) { var c = P.ctx; c.beginPath(); pts.forEach(function (p, i) { if (i === 0) c.moveTo(P.X(p[0]), P.Y(p[1])); else c.lineTo(P.X(p[0]), P.Y(p[1])); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (color) { c.strokeStyle = color; c.lineWidth = width || 2; c.stroke(); } return P; };
    P.fillUnder = function (fn, a, b, fill, base) { var c = P.ctx; base = base || 0; c.beginPath(); c.moveTo(P.X(a), P.Y(base)); var N = 200; for (var i = 0; i <= N; i++) { var x = a + (b - a) * i / N; c.lineTo(P.X(x), P.Y(fn(x))); } c.lineTo(P.X(b), P.Y(base)); c.closePath(); c.fillStyle = fill; c.fill(); return P; };
    // 드래그: points = [{x,y}], cb(point) — 터치/마우스 공용
    P.drag = function (points, cb, snap) {
      var active = null;
      function pos(e) { var r = cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { px: t.clientX - r.left, py: t.clientY - r.top }; }
      function down(e) { var q = pos(e); var best = null, bd = 22; points.forEach(function (p) { var d = Math.hypot(P.X(p.x) - q.px, P.Y(p.y) - q.py); if (d < bd) { bd = d; best = p; } }); active = best; if (active) { e.preventDefault(); move(e); } }
      function move(e) { if (!active) return; e.preventDefault(); var q = pos(e); var x = P.ix(q.px), y = P.iy(q.py); if (snap) { x = Math.round(x / snap) * snap; y = Math.round(y / snap) * snap; } x = Math.max(P.xmin, Math.min(P.xmax, x)); y = Math.max(P.ymin, Math.min(P.ymax, y)); active.x = x; active.y = y; cb(active); }
      function up() { active = null; }
      cv.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
      cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
      return P;
    };
    P.resize();
    return P;
  };
  LEC.onResize = function (fn) { var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fn, 200); }); };

  if (typeof window !== 'undefined') window.LEC = LEC;
  if (typeof module !== 'undefined' && module.exports) module.exports = LEC;
})();
