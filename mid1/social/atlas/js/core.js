/* atlas core: language, data loading, world map, climograph, Koppen classification.
   Needs d3@7 and topojson-client@3 loaded first (UMD globals). */
(function () {
  const A = {};
  window.Atlas = A;

  /* ---------- language ---------- */
  const LS_KEY = 'atlas.lang';
  function initialLang() {
    try { const v = localStorage.getItem(LS_KEY); if (v === 'en' || v === 'ko') return v; } catch (e) {}
    return (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  }
  A.lang = initialLang();
  A.listeners = [];
  A.t = function (o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return o[A.lang] != null ? o[A.lang] : (o.en != null ? o.en : '');
  };
  A.setLang = function (l) {
    A.lang = l;
    try { localStorage.setItem(LS_KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    A.applyI18n();
    A.listeners.forEach(fn => fn(l));
  };
  A.onLang = function (fn) { A.listeners.push(fn); };
  A.applyI18n = function (root) {
    (root || document).querySelectorAll('[data-en]').forEach(el => {
      const v = el.getAttribute('data-' + A.lang) || el.getAttribute('data-en');
      if (el.hasAttribute('data-html')) el.innerHTML = v; else el.textContent = v;
    });
    (root || document).querySelectorAll('[data-en-aria]').forEach(el => {
      el.setAttribute('aria-label', el.getAttribute('data-' + A.lang + '-aria') || el.getAttribute('data-en-aria'));
    });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === A.lang)));
    if (A.titles) document.title = A.t(A.titles);
  };

  /* ---------- top bar ---------- */
  const NAV = [
    ['index.html', { en: 'Home', ko: '처음' }],
    ['explore.html', { en: 'Explore map', ko: '지도 탐험' }],
    ['climate.html', { en: 'Climate lab', ko: '기후 실험실' }],
    ['cards.html', { en: 'Data cards', ko: '자료 카드' }],
    ['mapmaker.html', { en: 'Map maker', ko: '지도 만들기' }],
    ['stories.html', { en: 'My country', ko: '내 나라와 세계' }],
  ];
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 16h26M5.5 9h21M5.5 23h21" stroke="currentColor" stroke-width="1.2"/></svg>';
  A.topbar = function (active, titles) {
    A.titles = titles;
    const here = active;
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML =
      '<a class="brand" href="index.html">' + LOGO + '<span data-en="World Atlas Lab" data-ko="세계지리 실험실"></span></a>' +
      '<nav class="nav" aria-label="Pages">' + NAV.map(([href, l]) =>
        '<a href="' + href + '"' + (href === here ? ' aria-current="page"' : '') + ' data-en="' + l.en + '" data-ko="' + l.ko + '"></a>').join('') + '</nav>' +
      '<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en">EN</button><button type="button" data-lang="ko">한국어</button></div>';
    const wrap = document.querySelector('.wrap') || document.body;
    wrap.prepend(bar);
    bar.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => A.setLang(b.dataset.lang)));
    A.applyI18n();
  };

  /* ---------- data ---------- */
  const cache = {};
  A.json = function (url) {
    if (!cache[url]) cache[url] = fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
    return cache[url];
  };
  const WORLD = {
    '110m': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json',
    '50m': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
  };
  A.world = function (res) {
    return A.json(WORLD[res || '110m']).then(topo => ({
      countries: topojson.feature(topo, topo.objects.countries).features,
      borders: topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b),
      land: topojson.feature(topo, topo.objects.land),
    }));
  };

  /* ---------- map ---------- */
  // Draws a world map into an <svg>. Returns {svg, g, path, projection, zoomTo}.
  A.drawMap = function (svgEl, world, opts) {
    opts = opts || {};
    const W = opts.width || 960, H = opts.height || 500;
    const svg = d3.select(svgEl).attr('viewBox', '0 0 ' + W + ' ' + H).classed('map', true);
    svg.selectAll('*').remove();
    const projection = (opts.projection || d3.geoNaturalEarth1()).fitExtent([[6, 6], [W - 6, H - 6]], opts.fit || { type: 'Sphere' });
    const path = d3.geoPath(projection);
    const g = svg.append('g');
    g.append('path').datum({ type: 'Sphere' }).attr('class', 'sphere').attr('d', path);
    g.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule').attr('d', path);
    const cs = g.append('g').attr('class', 'countries').selectAll('path').data(world.countries).join('path')
      .attr('class', 'country' + (opts.onCountry ? ' hit' : ''))
      .attr('d', path);
    if (opts.fill) cs.style('fill', d => opts.fill(d) || null);
    if (opts.onCountry) cs.on('click', (ev, d) => opts.onCountry(d, ev));
    if (opts.title) cs.append('title').text(d => opts.title(d));
    const pins = g.append('g').attr('class', 'pins');
    const out = { svg, g, path, projection, countries: cs, pins, W, H };
    out.zoomTo = function (geo, ms) {
      const [[x0, y0], [x1, y1]] = path.bounds(geo);
      const k = Math.min(8, 0.9 / Math.max((x1 - x0) / W, (y1 - y0) / H));
      const tx = W / 2 - k * (x0 + x1) / 2, ty = H / 2 - k * (y0 + y1) / 2;
      g.transition().duration(ms == null ? 600 : ms).attr('transform', 'translate(' + tx + ',' + ty + ') scale(' + k + ')');
      out.k = k;
      pins.selectAll('.pin').attr('transform', function () { return this.dataset.base + ' scale(' + (1 / k) + ')'; });
    };
    out.reset = function () { g.transition().duration(500).attr('transform', null); out.k = 1;
      pins.selectAll('.pin').attr('transform', function () { return this.dataset.base; }); };
    out.addPins = function (items, o) {
      o = o || {};
      const sel = pins.selectAll('.pin').data(items, d => d.id).join(enter => {
        const p = enter.append('g').attr('class', 'pin').attr('tabindex', 0).attr('role', 'button');
        p.append('circle').attr('r', o.r || 5);
        p.append('text').attr('x', 7).attr('y', 4);
        return p;
      });
      sel.each(function (d) {
        const xy = projection([d.lon, d.lat]);
        this.dataset.base = 'translate(' + xy[0] + ',' + xy[1] + ')';
        d3.select(this).attr('transform', this.dataset.base + (out.k ? ' scale(' + (1 / out.k) + ')' : ''));
      });
      sel.select('circle').style('fill', d => (o.color ? o.color(d) : 'var(--ocean)'));
      sel.select('text').text(d => (o.label ? o.label(d) : ''));
      if (o.onClick) sel.on('click', (ev, d) => o.onClick(d, ev)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onClick(d, ev); } });
      out.pinClick = o.onClick || null;
      // one listener per <svg>, even when the map is redrawn into it many times
      const node = svg.node(); node.__pinMap = out;
      if (!node.__pinHitOn) { node.__pinHitOn = true; node.addEventListener('click', ev => A.pinHit(node.__pinMap, ev), true); }
      return sel;
    };
    return out;
  };

  // A pin is drawn small (r 5) so it does not hide the map, but a tap anywhere within
  // 22 CSS px of its centre (a 44 px target) picks it. Runs in the capture phase, so a
  // near tap wins over the country underneath; a tap farther away falls through.
  A.PIN_HIT = 22;
  A.pinHit = function (m, ev) {
    if (!m.pinClick || ev.target.closest && ev.target.closest('.pin')) return;
    let best = null, bd = A.PIN_HIT;
    m.pins.selectAll('.pin').each(function (d) {
      if (this.style.display === 'none') return;
      const r = this.getBoundingClientRect();
      const dist = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
      if (dist < bd) { bd = dist; best = d; }
    });
    if (best) { ev.stopPropagation(); ev.preventDefault(); m.pinClick(best, ev); }
  };

  /* ---------- climograph ---------- */
  A.MONTHS = { en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], ko: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] };
  // Fixed axes make charts comparable: temp -30..40 C, precipitation 0..700 mm (auto-extends above).
  A.climograph = function (svgEl, temp, prec, opts) {
    opts = opts || {};
    const W = 324, H = 220, m = { t: 18, r: 44, b: 24, l: 34 };
    const svg = d3.select(svgEl).attr('viewBox', '0 0 ' + W + ' ' + H).classed('climo', true);
    svg.selectAll('*').remove();
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const g = svg.append('g').attr('transform', 'translate(' + m.l + ',' + m.t + ')');
    const x = d3.scaleBand().domain(d3.range(12)).range([0, iw]).padding(0.18);
    const tMin = Math.min(opts.tMin != null ? opts.tMin : -30, d3.min(temp.filter(v => v != null)) || 0);
    const tMax = Math.max(opts.tMax != null ? opts.tMax : 40, d3.max(temp.filter(v => v != null)) || 0);
    const pMax = Math.max(opts.pMax || 700, d3.max(prec.filter(v => v != null)) || 0);
    const yT = d3.scaleLinear().domain([tMin, tMax]).range([ih, 0]).nice();
    const yP = d3.scaleLinear().domain([0, pMax]).range([ih, 0]).nice();
    g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + ih + ')')
      .call(d3.axisBottom(x).tickFormat(i => A.MONTHS[A.lang][i]).tickSizeOuter(0));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(yT).ticks(7));
    g.append('g').attr('class', 'axis').attr('transform', 'translate(' + iw + ',0)').call(d3.axisRight(yP).ticks(7));
    g.append('text').attr('class', 'lbl').attr('x', -m.l + 2).attr('y', -6).style('fill', 'var(--temp)').text('°C');
    g.append('text').attr('class', 'lbl').attr('x', iw + 4).attr('y', -6).style('fill', 'var(--prec)').text('mm');
    if (tMin < 0) g.append('line').attr('class', 'zero').attr('x1', 0).attr('x2', iw).attr('y1', yT(0)).attr('y2', yT(0));
    g.selectAll('.bar').data(prec).join('rect').attr('class', 'bar')
      .attr('x', (d, i) => x(i)).attr('width', x.bandwidth())
      .attr('y', d => (d == null ? ih : yP(d))).attr('height', d => (d == null ? 0 : ih - yP(d)));
    const pts = temp.map((v, i) => [i, v]).filter(p => p[1] != null);
    g.append('path').attr('class', 'tline').attr('d', d3.line().x(p => x(p[0]) + x.bandwidth() / 2).y(p => yT(p[1]))(pts));
    g.selectAll('.tdot').data(pts).join('circle').attr('class', 'tdot').attr('r', 2.6)
      .attr('cx', p => x(p[0]) + x.bandwidth() / 2).attr('cy', p => yT(p[1]));
    if (opts.title) svg.append('text').attr('class', 'lbl').attr('x', W / 2).attr('y', 11).attr('text-anchor', 'middle').style('fill', 'var(--ink)').style('font-weight', 600).text(opts.title);
    return { x, yT, yP, g, m, iw, ih };
  };

  /* ---------- Koppen ---------- */
  // Thresholds follow the Korean middle-school convention: coldest month -3 C separates C from D.
  A.koppen = function (T, P, lat, elev) {
    const sum = a => a.reduce((s, v) => s + v, 0);
    const MAT = sum(T) / 12, MAP = sum(P);
    const Tmax = Math.max(...T), Tmin = Math.min(...T);
    // summer half = the warmer of Apr-Sep and Oct-Mar (works near the equator too)
    const h1 = [3, 4, 5, 6, 7, 8], h2 = [9, 10, 11, 0, 1, 2];
    const north = sum(h1.map(i => T[i])) >= sum(h2.map(i => T[i]));
    const sIdx = north ? h1 : h2, wIdx = north ? h2 : h1;
    const Ps = sIdx.map(i => P[i]), Pw = wIdx.map(i => P[i]);
    let pth;
    if (sum(Ps) >= 0.7 * MAP) pth = 2 * MAT + 28; else if (sum(Pw) >= 0.7 * MAP) pth = 2 * MAT; else pth = 2 * MAT + 14;
    let code;
    if (Tmax < 10) code = Tmax > 0 ? 'ET' : 'EF';
    else if (MAP < 10 * pth) code = (MAP < 5 * pth ? 'BW' : 'BS') + (MAT >= 18 ? 'h' : 'k');
    else if (Tmin >= 18) {
      const Pdry = Math.min(...P);
      code = Pdry >= 60 ? 'Af' : (Pdry >= 100 - MAP / 25 ? 'Am' : 'Aw');
    } else {
      const grp = Tmin > -3 ? 'C' : 'D';
      const Psdry = Math.min(...Ps), Pswet = Math.max(...Ps), Pwdry = Math.min(...Pw), Pwwet = Math.max(...Pw);
      let s2 = 'f';
      const isS = Psdry < 40 && Psdry < Pwwet / 3, isW = Pwdry < Pswet / 10;
      if (isS && isW) s2 = sum(Ps) >= sum(Pw) ? 'w' : 's';
      else if (isS) s2 = 's';
      else if (isW) s2 = 'w';
      const warm = T.filter(v => v >= 10).length;
      let s3 = Tmax >= 22 ? 'a' : (warm >= 4 ? 'b' : (grp === 'D' && Tmin < -38 ? 'd' : 'c'));
      code = grp + s2 + s3;
    }
    const highland = elev != null && elev >= 1500 && Math.abs(lat) < 35;
    const dryLine = 10 * pth;
    const border = Tmax >= 10 && Math.abs(MAP - dryLine) < 0.12 * dryLine;
    return { code, group: code[0], highland, MAT, MAP, Tmax, Tmin, dryLine, border, summerIdx: sIdx };
  };
  A.KOPPEN_NAMES = {
    A: { en: 'Tropical', ko: '열대 기후' }, B: { en: 'Dry', ko: '건조 기후' }, C: { en: 'Temperate', ko: '온대 기후' },
    D: { en: 'Continental (cold)', ko: '냉대 기후' }, E: { en: 'Polar', ko: '한대 기후' }, H: { en: 'Highland', ko: '고산 기후' },
    Af: { en: 'Tropical rainforest', ko: '열대 우림 기후' }, Am: { en: 'Tropical monsoon', ko: '열대 몬순 기후' },
    Aw: { en: 'Tropical savanna', ko: '사바나 기후' },
    BW: { en: 'Desert', ko: '사막 기후' }, BS: { en: 'Steppe (semi-arid)', ko: '스텝 기후' },
    Cs: { en: 'Mediterranean', ko: '지중해성 기후' }, Cw: { en: 'Temperate, dry winter', ko: '온대 겨울 건조 기후' },
    Cfa: { en: 'Humid subtropical', ko: '온대 습윤 기후' }, Cfb: { en: 'Oceanic (marine west coast)', ko: '서안 해양성 기후' },
    Cfc: { en: 'Subpolar oceanic', ko: '서안 해양성 기후(한랭)' },
    Df: { en: 'Humid continental / subarctic', ko: '냉대 습윤 기후' }, Dw: { en: 'Continental, dry winter', ko: '냉대 겨울 건조 기후' },
    Ds: { en: 'Continental, dry summer', ko: '냉대 여름 건조 기후' },
    ET: { en: 'Tundra', ko: '툰드라 기후' }, EF: { en: 'Ice cap', ko: '빙설 기후' },
  };
  A.koppenName = function (code) {
    const N = A.KOPPEN_NAMES;
    return N[code] || N[code.slice(0, 2)] || N[code[0]];
  };
  A.GROUP_COLORS = { A: '#1f8a5b', B: '#d49a2a', C: '#7bb342', D: '#4b7bd1', E: '#8fa3b8', H: '#9c6ab8' };

  /* ---------- countries and statistics ---------- */
  let C = null, S = null, NUM = null;
  A.loadCountries = function () {
    return Promise.all([A.json('data/countries.json'), A.json('data/stats.json')]).then(([c, s]) => {
      C = c.countries; S = s; NUM = {};
      Object.entries(C).forEach(([iso3, v]) => { NUM[v.num] = iso3; });
      return { countries: C, stats: S };
    });
  };
  const dn = {};
  A.cname = function (iso3) {
    const c = C && C[iso3];
    if (!c) return iso3;
    try {
      dn[A.lang] = dn[A.lang] || new Intl.DisplayNames([A.lang], { type: 'region' });
      const n = dn[A.lang].of(c.a2);
      if (n && n !== c.a2) return n;
    } catch (e) {}
    return c.en;
  };
  A.iso3OfFeature = f => (NUM ? NUM[f.id] : null);
  A.regionOfFeature = f => { const i = A.iso3OfFeature(f); return i && C[i] ? C[i].region : null; };
  A.statYear = function (ind, which) {
    const ys = S.meta[ind].years;
    return String(which === '2000' || which === 'first' ? ys[0] : ys[ys.length - 1]);
  };
  A.stat = function (iso3, ind, which) {
    const d = S.data[iso3];
    if (!d || !d[ind]) return null;
    const v = d[ind][A.statYear(ind, which)];
    return v == null ? null : v;
  };
  A.statMeta = ind => S.meta[ind];
  A.fmtNum = function (v) {
    if (v == null) return '–';
    const a = Math.abs(v);
    if (A.lang === 'ko' && a >= 1e8) return (v / 1e8).toFixed(1) + '억';
    if (A.lang === 'ko' && a >= 1e5) return Math.round(v / 1e4).toLocaleString('ko') + '만';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
    return a >= 1000 ? Math.round(v).toLocaleString(A.lang) : (+v).toFixed(a < 100 ? 1 : 0);
  };
  A.statSource = function (ind) {
    const m = S.meta[ind];
    return 'Our World in Data · ' + m.source + ' · ' + m.license + ' · ' + m.owid_url;
  };

  // A view box for a region from catalog.js. Fitting to country outlines would pull in
  // overseas territories (France's French Guiana stretches a Europe map to South America).
  A.regionFit = function (id) {
    const r = window.CATALOG && id && id !== 'world' ? CATALOG.regions.find(x => x.id === id) : null;
    if (!r) return null;
    const [w, s, e, n] = r.box, pts = [];
    for (let i = 0; i <= 8; i++) {
      pts.push([w + (e - w) * i / 8, s], [w + (e - w) * i / 8, n], [w, s + (n - s) * i / 8], [e, s + (n - s) * i / 8]);
    }
    return { type: 'MultiPoint', coordinates: pts };
  };
  A.regionProjection = id => (id === 'europe' ? d3.geoConicConformal().rotate([-15, 0]).parallels([40, 65]) : d3.geoNaturalEarth1());

  // Climate-normal metadata for learners: period and grade in both languages, URLs as links.
  A.periodText = function (p) {
    if (p === '미명시') return A.t({ en: 'period not stated', ko: '관측 기간 미표시' });
    if (p === '미확인') return A.t({ en: 'period unconfirmed', ko: '관측 기간 미확인' });
    if (p && A.lang !== 'ko') return p.replace('기온', 'temperature').replace('강수', 'precipitation');
    return p || '';
  };
  A.gradeText = function (g) {
    if (!g || A.lang === 'ko') return g || '';
    return g.replace(/1차/g, 'primary').replace(/2차/g, 'secondary').replace(/낮은 확신/g, 'low confidence');
  };
  A.linkify = function (text) {
    return A.esc(text || '').replace(/(?:https?|ftp):\/\/[^\s;,)]+/g, u => '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^(?:https?|ftp):\/\//, '').slice(0, 48) + (u.length > 56 ? '…' : '') + '</a>');
  };
  A.LICENCE = {
    en: 'Map: Natural Earth (public domain): country outlines 1:110m via world-atlas, landforms, rivers, lakes and seas 1:50m, simplified. Climate: WMO 1991-2020 normals and national weather services, period and source shown per city. Statistics: Our World in Data, licence per layer (CC BY 4.0 or CC BY 3.0 IGO; the land area inside population density is FAO data under CC BY-NC-SA 3.0 IGO, non-commercial). Colours: ColorBrewer (Cynthia Brewer).',
    ko: '지도: Natural Earth(퍼블릭 도메인). 나라 경계는 1:110m(world-atlas), 지형 · 강 · 호수 · 바다는 1:50m를 단순화. 기후: WMO 1991-2020 평년값과 각국 기상청, 도시마다 기간 · 출처 표시. 통계: Our World in Data, 자료 층마다 라이선스가 다름(CC BY 4.0 또는 CC BY 3.0 IGO, 인구 밀도에 들어간 FAO 토지 면적은 CC BY-NC-SA 3.0 IGO로 비상업 조건). 색: ColorBrewer(Cynthia Brewer).',
  };
  A.ncNote = ind => (ind === 'population_density' ? ' · ' + A.t({ en: 'non-commercial reuse only (FAO land area)', ko: '비상업 용도로만 다시 쓸 수 있음(FAO 토지 면적)' }) : '');

  /* ---------- helpers ---------- */
  A.el = function (tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (html != null) e.innerHTML = html;
    return e;
  };
  A.bi = function (o) { return 'data-en="' + A.esc(o.en) + '" data-ko="' + A.esc(o.ko != null ? o.ko : o.en) + '"'; };
  A.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
  A.shuffle = function (a, seed) {
    let s = seed;
    const r = seed ? () => (s = (s * 16807) % 2147483647) / 2147483647 : Math.random;
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
})();
