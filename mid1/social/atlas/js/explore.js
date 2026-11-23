/* Explore map: two doors (region, theme), statistic layers, and a class-break switch that
   shows how the same numbers look different at world scale and at region scale. */
(function () {
  const A = window.Atlas;
  A.topbar('explore.html', { en: 'Explore map · World Atlas Lab', ko: '지도 탐험 · 세계지리 실험실' });

  // layers each theme suggests first (the rest stay in the menu)
  const THEME_LAYERS = {
    climate: [],
    population: ['population_density', 'share_65_plus', 'fertility_rate', 'urban_share', 'population'],
    religion_culture: ['migrant_share'],
    industry_tnc: ['employment_agriculture', 'employment_industry', 'employment_services', 'gdp_per_capita_ppp'],
    integration: ['gdp_per_capita_ppp', 'migrant_share'],
    globalization: ['internet_users', 'migrant_share', 'urban_share'],
    sustainability: ['urban_share', 'population', 'gdp_per_capita_ppp'],
  };
  const THEME_HINT = {
    climate: { en: 'Climate is shown by the coloured station dots (colour = climate group). Click a dot to open its climate graph.', ko: '기후는 색 점(기후 관측 도시)으로 봅니다. 점 색은 기후 무리이고, 점을 누르면 기후 그래프가 열립니다.' },
    religion_culture: { en: 'This atlas has no religion map yet: we have not found religion data with a clear open licence. People born abroad is one sign of mixed cultures.', ko: '종교 지도는 아직 없습니다. 이용 조건이 분명한 공개 종교 자료를 찾지 못했기 때문입니다. 해외 출생 인구 비율은 문화가 섞이는 정도를 보여 주는 단서 하나입니다.' },
  };
  const PALETTE = ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

  const st = { region: null, theme: null, layer: 'population_density', year: 'latest', scale: 'world', pins: true, sel: null };
  let world, m, cities, cards = [];
  const $ = id => document.getElementById(id);

  function parseHash() {
    decodeURIComponent(location.hash.slice(1)).split('/').forEach(p => {
      if (p.startsWith('r-')) st.region = p.slice(2) || null;
      if (p.startsWith('t-')) st.theme = p.slice(2) || null;
    });
    if (st.theme && THEME_LAYERS[st.theme]) st.layer = THEME_LAYERS[st.theme][0] || '';
  }
  function writeHash() {
    const parts = [];
    if (st.region) parts.push('r-' + st.region);
    if (st.theme) parts.push('t-' + st.theme);
    history.replaceState(null, '', parts.length ? '#' + parts.join('/') : location.pathname);
  }

  function chips() {
    $('regionChips').innerHTML = CATALOG.regions.map(r => '<button type="button" class="chip" data-r="' + r.id + '" aria-pressed="' + (st.region === r.id) + '">' + A.esc(A.t(r.name)) + '</button>').join('') +
      '<button type="button" class="chip" data-r="" aria-pressed="' + (!st.region) + '">' + A.esc(A.t({ en: 'World', ko: '세계 전체' })) + '</button>';
    $('themeChips').innerHTML = CATALOG.themes.map(t => '<button type="button" class="chip" data-t="' + t.id + '" aria-pressed="' + (st.theme === t.id) + '">' + A.esc(A.t(t.name)) + '</button>').join('');
    $('regionChips').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { st.region = b.dataset.r || null; if (!st.region) st.scale = 'world'; update(true); }));
    $('themeChips').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      st.theme = st.theme === b.dataset.t ? null : b.dataset.t;
      if (st.theme) { st.layer = THEME_LAYERS[st.theme][0] || ''; st.pins = true; }
      update(false);
    }));
  }

  function layerMenu() {
    const suggested = st.theme ? THEME_LAYERS[st.theme] : [];
    const all = Object.keys(window.__S.meta);
    const opt = k => '<option value="' + k + '"' + (k === st.layer ? ' selected' : '') + '>' + A.esc(A.t(A.statMeta(k).label)) + '</option>';
    let html = '<option value=""' + (st.layer ? '' : ' selected') + '>' + A.esc(A.t({ en: '(none: outline only)', ko: '(없음: 윤곽만)' })) + '</option>';
    if (suggested.length) html += '<optgroup label="' + A.esc(A.t({ en: 'Suggested for this theme', ko: '이 주제에 맞는 자료' })) + '">' + suggested.map(opt).join('') + '</optgroup>';
    html += '<optgroup label="' + A.esc(A.t({ en: 'All layers', ko: '모든 자료' })) + '">' + all.filter(k => !suggested.includes(k)).map(opt).join('') + '</optgroup>';
    $('layer').innerHTML = html;
  }
  function segs() {
    $('yearSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.y === st.year)));
    $('scaleSeg').querySelectorAll('button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.s === st.scale));
      b.disabled = b.dataset.s === 'region' && !st.region;
    });
    $('pinsOn').checked = st.pins;
  }

  function colourScale() {
    if (!st.layer) return null;
    const pool = world.countries.filter(f => st.scale === 'world' || A.regionOfFeature(f) === st.region)
      .map(f => A.iso3OfFeature(f)).filter(Boolean).map(i => A.stat(i, st.layer, st.year)).filter(v => v != null).sort(d3.ascending);
    if (pool.length < 5) return null;
    const br = [0.2, 0.4, 0.6, 0.8].map(p => d3.quantileSorted(pool, p));
    return d3.scaleThreshold().domain(br).range(PALETTE);
  }

  function draw() {
    const col = colourScale();
    const fitObj = A.regionFit(st.region);
    m = A.drawMap($('map'), world, {
      width: 960, height: 520,
      projection: A.regionProjection(st.region),
      fit: fitObj || undefined,
      fill: f => {
        const i = A.iso3OfFeature(f);
        if (!col || !i) return null;
        const v = A.stat(i, st.layer, st.year);
        if (v == null) return null;
        if (st.region && st.scale === 'region' && A.regionOfFeature(f) !== st.region) return null;
        return col(v);
      },
      onCountry: f => select(f),
      title: f => { const i = A.iso3OfFeature(f); return i ? A.cname(i) + (st.layer ? ': ' + A.fmtNum(A.stat(i, st.layer, st.year)) + ' ' + A.t(A.statMeta(st.layer).unit) : '') : ''; },
    });
    m.countries.classed('sel', f => st.sel && A.iso3OfFeature(f) === st.sel);
    // dim countries outside the chosen region
    if (st.region) m.countries.style('opacity', f => (A.regionOfFeature(f) === st.region ? 1 : 0.35));
    if (st.pins) {
      const ps = cities.filter(c => !st.region || c.region === st.region);
      m.addPins(ps, { r: 4.5, color: c => A.GROUP_COLORS[c.highland ? 'H' : c.koppen[0]], onClick: c => { location.href = 'climate.html#' + c.id; } });
      m.pins.selectAll('.pin').each(function (c) { d3.select(this).selectAll('title').remove(); d3.select(this).append('title').text(A.t(c) + ' · ' + c.koppen); });
    }
    legend(col);
  }

  function legend(col) {
    if (!col) {
      $('legend').innerHTML = st.pins ? '<div class="legend">' + 'ABCDEH'.split('').map(g => '<span><i style="background:' + A.GROUP_COLORS[g] + '"></i>' + A.esc(A.t(A.KOPPEN_NAMES[g])) + '</span>').join('') + '</div>' : '';
      $('src').textContent = '';
      return;
    }
    const b = col.domain(), f = A.fmtNum, u = A.t(A.statMeta(st.layer).unit);
    const lab = [' < ' + f(b[0])].concat(b.slice(0, 3).map((x, k) => f(x) + '–' + f(b[k + 1])), ['≥ ' + f(b[3])]);
    $('legend').innerHTML = '<p class="small" style="margin:.3rem 0">' + A.esc(A.t(A.statMeta(st.layer).label)) + ' (' + A.esc(u) + ', ' + A.statYear(st.layer, st.year) + ') · ' +
      A.esc(A.t(st.scale === 'world' ? { en: 'five equal-count classes, world', ko: '나라 수가 같은 5구간, 세계 기준' } : { en: 'five equal-count classes, this region only', ko: '나라 수가 같은 5구간, 이 지역만 기준' })) + '</p>' +
      '<div class="legend">' + lab.map((l, k) => '<span><i style="background:' + PALETTE[k] + '"></i>' + A.esc(l) + '</span>').join('') +
      '<span><i class="nodata"></i>' + A.esc(A.t({ en: 'no data', ko: '자료 없음' })) + '</span></div>';
    $('src').textContent = A.statSource(st.layer) + A.ncNote(st.layer);
  }

  function question() {
    const r = st.region && CATALOG.regions.find(x => x.id === st.region);
    const t = st.theme && CATALOG.themes.find(x => x.id === st.theme);
    const q = t ? t.q : r ? r.q : { en: 'Pick a region or a theme. Then click a country.', ko: '지역이나 주제를 고르고, 나라를 눌러 보세요.' };
    $('bigq').textContent = A.t(q);
    let hint = st.theme && THEME_HINT[st.theme] ? A.t(THEME_HINT[st.theme]) : '';
    if (st.region && st.layer) hint = (hint ? hint + ' ' : '') + A.t({ en: 'Try switching "classes: world" and "classes: this region". The numbers stay the same, but the colours, and the story the map tells, change.', ko: '"구간: 세계 기준"과 "구간: 이 지역 기준"을 바꿔 보세요. 수치는 그대로인데 색이 바뀌고, 지도가 하는 이야기도 달라집니다.' });
    if (!hint) hint = A.t({ en: 'Click any country to see its numbers for 2000 and the latest year.', ko: '아무 나라나 누르면 2000년과 최근 연도의 수치를 볼 수 있습니다.' });
    $('hint').textContent = hint;
  }

  function select(f) {
    const i = A.iso3OfFeature(f);
    if (!i) return;
    st.sel = i;
    m.countries.classed('sel', g => A.iso3OfFeature(g) === i);
    info();
  }
  function info() {
    const box = $('info');
    if (!st.sel) { box.innerHTML = '<h3>' + A.esc(A.t({ en: 'Country', ko: '나라' })) + '</h3><p class="small muted">' + A.esc(A.t({ en: 'Click a country on the map.', ko: '지도에서 나라를 누르세요.' })) + '</p>'; return; }
    const i = st.sel, all = Object.keys(window.__S.meta);
    const reg = CATALOG.regions.find(r => r.id === (window.__C[i] || {}).region);
    const rows = all.map(k => {
      const a = A.stat(i, k, 'first'), b = A.stat(i, k, 'latest');
      if (a == null && b == null) return '';
      return '<tr' + (k === st.layer ? ' style="font-weight:600"' : '') + '><td>' + A.esc(A.t(A.statMeta(k).label)) + ' <span class="muted">(' + A.esc(A.t(A.statMeta(k).unit)) + ')</span></td><td>' + A.fmtNum(a) + '</td><td>' + A.fmtNum(b) + '</td></tr>';
    }).join('');
    const cs = cities.filter(c => c.iso3 === i);
    box.innerHTML = '<h3>' + A.esc(A.cname(i)) + '</h3><p class="small muted">' + A.esc(reg ? A.t(reg.name) : '') + '</p>' +
      '<div style="overflow-x:auto"><table class="data small"><thead><tr><th></th><th>2000</th><th>' + A.esc(A.t({ en: 'latest', ko: '최근' })) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="src">' + A.esc(A.t({ en: 'Latest year differs by layer (2023-2025). Source: Our World in Data.', ko: '최근 연도는 자료마다 다릅니다(2023 ~ 2025). 출처: Our World in Data.' })) + '</p>' +
      (cs.length ? '<p class="small">' + A.esc(A.t({ en: 'Climate graph: ', ko: '기후 그래프: ' })) + cs.map(c => '<a href="climate.html#' + c.id + '">' + A.esc(A.t(c)) + ' (' + c.koppen + ')</a>').join(', ') + '</p>' : '');
  }

  function cardLinks() {
    const box = $('cardsBox');
    const hits = cards.filter(c => (!st.region || c.region === st.region) && (!st.theme || c.theme === st.theme));
    box.innerHTML = '<h3>' + A.esc(A.t({ en: 'Data cards here', ko: '여기에 맞는 자료 카드' })) + '</h3>' +
      (hits.length ? '<div class="cardlinks">' + hits.map(c => '<a href="cards.html#' + c.id + '">' + A.esc(A.t(c.title)) + '</a>').join('') + '</div>'
        : '<p class="small muted">' + A.esc(A.t({ en: 'No card for this choice yet. Try another region or theme.', ko: '이 조합에 맞는 카드는 아직 없습니다. 다른 지역이나 주제를 골라 보세요.' })) + '</p>');
  }

  function update() {
    writeHash(); chips(); layerMenu(); segs(); question(); draw(); info(); cardLinks();
  }

  $('layer').addEventListener('change', e => { st.layer = e.target.value; update(); });
  $('yearSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.year = b.dataset.y; update(); } });
  $('scaleSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) { st.scale = b.dataset.s; update(); } });
  $('pinsOn').addEventListener('change', e => { st.pins = e.target.checked; update(); });
  window.addEventListener('hashchange', () => { parseHash(); update(true); });
  A.onLang(() => update());

  Promise.all([A.world('110m'), A.loadCountries(), A.json('data/cities.json'), A.json('data/cards.json').catch(() => ({ cards: [] }))])
    .then(([w, cs, cd, cj]) => {
      world = w; window.__S = cs.stats; window.__C = cs.countries; cities = cd.cities; cards = cj.cards || cj;
      parseHash();
      update(true);
    })
    .catch(e => { $('bigq').textContent = String(e); });
})();
