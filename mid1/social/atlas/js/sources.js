/* Source renderers shared by cards.html and stories.html.
   Atlas.Sources.render(box, src, ctx) draws one source into box.
   ctx = { cities: {id: city}, world: {countries, borders, land} } */
(function () {
  const A = window.Atlas;
  const S = {};
  A.Sources = S;

  function head(box, src, extra) {
    box.insertAdjacentHTML('beforeend', '<h4>' + A.esc(A.t(src.label)) + (extra || '') + '</h4>');
  }
  function srcLine(box, html) { box.insertAdjacentHTML('beforeend', '<p class="src">' + html + '</p>'); }
  function link(u) { return /^https?:/.test(u) ? '<a href="' + A.esc(u) + '" target="_blank" rel="noopener">' + A.esc(u.replace(/^https?:\/\//, '').slice(0, 60)) + '</a>' : A.esc(u); }
  function yearLabel(ind, which) { return A.statYear(ind, which); }
  function indTitle(ind, which) {
    const m = A.statMeta(ind);
    return A.t(m.label) + ' (' + A.t(m.unit) + ', ' + yearLabel(ind, which) + ')';
  }

  const PPP = { en: 'PPP (purchasing power parity): adjusted so that one dollar buys about the same amount of goods in every country.', ko: '구매력 기준: 나라마다 물가가 달라서, 같은 돈으로 살 수 있는 물건의 양이 같아지도록 맞춘 값이다.' };
  S.PPP = PPP;

  S.climograph = function (box, src, ctx) {
    const c = ctx.cities[src.city];
    head(box, src);
    if (!c) { box.insertAdjacentHTML('beforeend', '<p class="note">missing city ' + A.esc(src.city) + '</p>'); return; }
    const name = src.hideName ? '?' : A.t({ en: c.en, ko: c.ko });
    box.insertAdjacentHTML('beforeend', '<p class="small muted">' + A.esc(name) + (src.hideName ? '' : ' · ' + A.esc(A.cname(c.iso3))) +
      ' · ' + Math.abs(c.lat).toFixed(1) + '°' + (c.lat >= 0 ? 'N' : 'S') + ' · ' + c.elev + ' m</p>');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.appendChild(svg);
    A.climograph(svg, c.temp, c.prec);
    const T = c.temp, P = c.prec;
    box.insertAdjacentHTML('beforeend', '<p class="small">' + A.esc(A.t({ en: 'Yearly mean ', ko: '연평균 기온 ' })) +
      (T.reduce((a, b) => a + b, 0) / 12).toFixed(1) + ' °C · ' + A.esc(A.t({ en: 'total rain ', ko: '연 강수량 ' })) +
      Math.round(P.reduce((a, b) => a + b, 0)) + ' mm</p>');
    srcLine(box, A.esc(c.station || '') + ' · ' + A.esc(A.periodText(c.period)) + ' · ' + A.linkify(c.src));
  };

  S.bars = function (box, src) {
    const ind = src.indicator, which = src.year || 'latest';
    head(box, src);
    box.insertAdjacentHTML('beforeend', '<p class="small muted">' + A.esc(indTitle(ind, which)) + '</p>');
    const rows = src.countries.map(i => ({ iso3: i, v: A.stat(i, ind, which) }));
    if (src.sort !== false) rows.sort((a, b) => (b.v == null ? -1 : b.v) - (a.v == null ? -1 : a.v));
    const W = 340, rh = 26, lw = 104, H = rows.length * rh + 6;
    const max = d3.max(rows, r => r.v) || 1;
    const x = d3.scaleLinear().domain([0, max]).range([0, W - lw - 58]);
    const svg = d3.select(box).append('div').attr('class', 'bars').append('svg').attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img').attr('aria-label', indTitle(ind, which));
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (d, i) => 'translate(0,' + (i * rh + 3) + ')');
    g.append('text').attr('x', lw - 6).attr('y', rh / 2 + 1).attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .style('font-size', '12px').style('fill', 'var(--ink)').text(d => A.cname(d.iso3));
    g.append('rect').attr('x', lw).attr('y', 4).attr('height', rh - 10).attr('rx', 2)
      .attr('width', d => (d.v == null ? 0 : Math.max(1, x(d.v)))).style('fill', 'var(--ocean)');
    g.append('text').attr('x', d => lw + (d.v == null ? 0 : x(d.v)) + 5).attr('y', rh / 2 + 1).attr('dominant-baseline', 'middle')
      .style('font-size', '12px').style('font-family', 'var(--mono)').style('fill', 'var(--ink)')
      .text(d => A.fmtNum(d.v) + (d.v == null || A.t(A.statMeta(ind).unit).length > 4 ? '' : ' ' + A.t(A.statMeta(ind).unit)));
    if (ind === 'gdp_per_capita_ppp') box.insertAdjacentHTML('beforeend', '<p class="small muted">' + A.esc(A.t(PPP)) + '</p>');
    srcLine(box, A.esc(A.statSource(ind) + A.ncNote(ind)));
  };

  S.map = function (box, src, ctx) {
    const ind = src.indicator, which = src.year || 'latest';
    head(box, src);
    box.insertAdjacentHTML('beforeend', '<p class="small muted">' + A.esc(indTitle(ind, which)) + '</p>');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.appendChild(svg);
    const vals = ctx.world.countries.map(f => {
      const i = A.iso3OfFeature(f);
      return { f, i, v: i ? A.stat(i, ind, which) : null, r: A.regionOfFeature(f) };
    });
    const inReg = vals.filter(d => !src.region || src.region === 'world' || d.r === src.region);
    const vs = inReg.map(d => d.v).filter(v => v != null).sort(d3.ascending);
    const breaks = [0.2, 0.4, 0.6, 0.8].map(p => d3.quantileSorted(vs, p));
    const col = d3.scaleThreshold().domain(breaks).range(['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c']);
    const byF = new Map(vals.map(d => [d.f, d]));
    const fit = A.regionFit(src.region);
    A.drawMap(svg, ctx.world, {
      width: 480, height: 330,
      projection: A.regionProjection(src.region),
      fit: fit || undefined,
      fill: f => { const d = byF.get(f); return d && d.v != null && (!src.region || src.region === 'world' || d.r === src.region) ? col(d.v) : null; },
      title: f => { const d = byF.get(f); return d && d.i ? A.cname(d.i) + ': ' + A.fmtNum(d.v) : ''; },
    });
    const fmt = A.fmtNum;
    const items = [[null, breaks[0]]].concat(breaks.map((b, k) => [b, breaks[k + 1]]));
    box.insertAdjacentHTML('beforeend', '<div class="legend">' + items.map((it, k) =>
      '<span><i style="background:' + col.range()[k] + '"></i>' + (it[0] == null ? '< ' + fmt(it[1]) : it[1] == null ? '≥ ' + fmt(it[0]) : fmt(it[0]) + '–' + fmt(it[1])) + '</span>').join('') +
      '<span><i class="nodata"></i>' + A.esc(A.t({ en: 'no data / outside', ko: '자료 없음 · 범위 밖' })) + '</span></div>');
    srcLine(box, A.esc(A.statSource(ind)) + ' · ' + A.esc(A.t({ en: 'Classes: five groups with the same number of countries, in the shown region', ko: '구간: 보이는 지역에서 나라 수가 같은 5구간' })) + ' · Natural Earth');
  };
  S.text = function (box, src) {
    head(box, src, src.synthetic ? '<span class="synth">' + A.esc(A.t({ en: 'made-up example', ko: '가상의 예' })) + '</span>' : '');
    const body = A.t(src.body).split(/\n+/).map(p => '<p>' + A.esc(p) + '</p>').join('');
    box.insertAdjacentHTML('beforeend', '<div class="small">' + body + '</div>');
    if (src.src) srcLine(box, link(src.src));
  };

  S.table = function (box, src) {
    head(box, src);
    const th = src.columns.map(c => '<th>' + A.esc(A.t(c)) + '</th>').join('');
    const tr = src.rows.map(r => '<tr>' + r.map(v => '<td>' + A.esc(typeof v === 'object' && v ? A.t(v) : v) + '</td>').join('') + '</tr>').join('');
    box.insertAdjacentHTML('beforeend', '<div style="overflow-x:auto"><table class="data"><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>');
    if (src.src) srcLine(box, A.linkify(src.src));
  };

  S.render = function (box, src, ctx) {
    const fn = S[src.type];
    if (!fn) { box.textContent = 'unknown source type ' + src.type; return; }
    fn(box, src, ctx);
  };
})();
