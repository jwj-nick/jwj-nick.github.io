/* Map maker: the student picks the data, the class method, the number of classes and the
   colours, and sees the distribution strip with the breaks under the map. */
(function () {
  const A = window.Atlas;
  A.topbar('mapmaker.html', { en: 'Map maker · World Atlas Lab', ko: '지도 만들기 · 세계지리 실험실' });
  const $ = id => document.getElementById(id);
  const LS = 'atlas.mapmaker.concl';

  const PALS = {
    blues: { name: { en: 'one colour, light to dark', ko: '한 색, 옅게에서 진하게' }, f: k => d3.schemeBlues[k] },
    oranges: { name: { en: 'one colour (orange)', ko: '한 색(주황)' }, f: k => d3.schemeOranges[k] },
    ylgn: { name: { en: 'two colours, light to dark', ko: '두 색, 옅게에서 진하게' }, f: k => d3.schemeYlGnBu[k] },
    rainbow: { name: { en: 'rainbow (try it: can you tell which is more?)', ko: '무지개(써 보기: 어느 쪽이 더 많은지 보이는가?)' }, f: k => d3.quantize(t => d3.interpolateRainbow(0.05 + 0.8 * t), k) },
  };
  const st = { ind: 'population_density', reg: 'world', yr: 'latest', meth: 'equal', k: 5, pal: 'blues', manual: null };
  let world, S;

  const TASKS = [
    { id: 't1', set: { ind: 'population_density', reg: 'world', meth: 'equal', k: 5, pal: 'blues' },
      title: { en: 'Task 1. Same numbers, two maps', ko: '과제 1. 같은 수치, 두 지도' },
      body: { en: 'Population density with "equal interval": almost every country gets the lightest colour. Look at the dots: a few very crowded countries (such as Bangladesh) sit far to the right and stretch the classes. Now switch to "quantile". What changed, and what did each map hide?', ko: '인구 밀도를 "같은 간격"으로 칠하면 거의 모든 나라가 가장 옅은 색이 됩니다. 점 그림을 보세요. 사람이 아주 빽빽한 몇 나라(방글라데시 등)가 오른쪽 끝에 떨어져 있어 구간을 늘려 놓습니다. 이제 "같은 개수"로 바꿔 보세요. 무엇이 달라졌고, 두 지도는 각각 무엇을 가렸나요?' } },
    { id: 't2', set: { ind: 'population', reg: 'asia', meth: 'quantile', k: 5, pal: 'blues' },
      title: { en: 'Task 2. Counting people or crowding?', ko: '과제 2. 사람 수인가, 붐빔인가?' },
      body: { en: 'This map shows total population in Asia. Big countries look dark just because they are big. Switch the data to population density. Which countries change the most? Why do geographers prefer ratios (per km², %) for this kind of map?', ko: '아시아의 총인구 지도입니다. 큰 나라는 크다는 이유만으로 진하게 보입니다. 자료를 인구 밀도로 바꿔 보세요. 어느 나라가 가장 많이 바뀌나요? 지리학자는 왜 이런 지도에 비율(㎢당, %)을 쓸까요?' } },
    { id: 't3', set: { ind: 'share_65_plus', reg: 'europe', meth: 'manual', k: 3, pal: 'oranges', manual: [5, 10] },
      title: { en: 'Task 3. Breaks can tell a story', ko: '과제 3. 경계가 이야기를 만든다' },
      body: { en: 'Share of people aged 65+ in Europe, with breaks at 5% and 10%: all of Europe looks equally "old". Change the breaks so that differences inside Europe show. Then write: who might choose each version, and why?', ko: '유럽의 65세 이상 인구 비율을 경계 5%와 10%로 나누면 유럽 전체가 똑같이 "늙은" 것처럼 보입니다. 유럽 안의 차이가 보이도록 경계를 바꿔 보세요. 그리고 써 보세요: 누가 어떤 지도를 고를 수 있을까, 그 까닭은?' } },
  ];

  function values() {
    return world.countries.map(f => {
      const i = A.iso3OfFeature(f);
      const inReg = st.reg === 'world' || A.regionOfFeature(f) === st.reg;
      return { f, i, inReg, v: i ? A.stat(i, st.ind, st.yr) : null };
    });
  }
  function breaks(vs) {
    const k = st.k, lo = vs[0], hi = vs[vs.length - 1];
    if (st.meth === 'equal') return d3.range(1, k).map(j => lo + (hi - lo) * j / k);
    if (st.meth === 'quantile') return d3.range(1, k).map(j => d3.quantileSorted(vs, j / k));
    const m = (st.manual || []).filter(x => x != null && !isNaN(x)).sort(d3.ascending);
    return m.slice(0, k - 1);
  }
  const nice = v => { const a = Math.abs(v); const p = a >= 1000 ? -2 : a >= 100 ? -1 : a >= 10 ? 0 : 1; return p >= 0 ? +v.toFixed(p) : Math.round(v / 10 ** -p) * 10 ** -p; };

  function controls() {
    $('ind').innerHTML = Object.keys(S.meta).map(k => '<option value="' + k + '"' + (k === st.ind ? ' selected' : '') + '>' + A.esc(A.t(S.meta[k].label)) + '</option>').join('');
    $('reg').innerHTML = '<option value="world">' + A.esc(A.t({ en: 'World', ko: '세계' })) + '</option>' +
      CATALOG.regions.map(r => '<option value="' + r.id + '"' + (r.id === st.reg ? ' selected' : '') + '>' + A.esc(A.t(r.name)) + '</option>').join('');
    document.querySelectorAll('input[name=yr]').forEach(r => { r.checked = r.value === st.yr; });
    document.querySelectorAll('input[name=meth]').forEach(r => { r.checked = r.value === st.meth; });
    $('k').value = st.k;
    $('pals').innerHTML = Object.entries(PALS).map(([id, p]) => '<label><input type="radio" name="pal" value="' + id + '"' + (id === st.pal ? ' checked' : '') + '> <span class="swatch">' +
      p.f(5).map(c => '<i style="background:' + c + '"></i>').join('') + '</span> ' + A.esc(A.t(p.name)) + '</label>').join('');
    document.querySelectorAll('input[name=pal]').forEach(r => r.addEventListener('change', () => { st.pal = r.value; draw(); }));
    const absolute = st.ind === 'population';
    $('kind').textContent = A.t(absolute
      ? { en: 'A count (absolute number). Big countries look dark just because they are big.', ko: '절대량(사람 수)입니다. 큰 나라는 크다는 이유만으로 진하게 보입니다.' }
      : { en: 'A ratio or rate (per person, per km², %). Countries of any size can be compared.', ko: '비율(1인당, ㎢당, %)입니다. 크기가 다른 나라끼리도 비교할 수 있습니다.' });
  }

  function manualBox(vs) {
    const box = $('breaksBox');
    box.hidden = st.meth !== 'manual';
    if (st.meth !== 'manual') return;
    if (!st.manual || st.manual.length !== st.k - 1) st.manual = d3.range(1, st.k).map(j => nice(d3.quantileSorted(vs, j / st.k)));
    box.innerHTML = st.manual.map((b, j) => '<label><span>' + A.esc(A.t({ en: 'break ', ko: '경계 ' })) + (j + 1) + '</span> <input type="number" step="any" data-j="' + j + '" value="' + b + '"></label>').join('');
    box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => { st.manual[+inp.dataset.j] = parseFloat(inp.value); draw(false); }));
  }

  function draw(rebuildManual) {
    const all = values();
    byF = new Map(all.map(d => [d.f, d]));
    const vs = all.filter(d => d.inReg && d.v != null).map(d => d.v).sort(d3.ascending);
    if (rebuildManual !== false) manualBox(vs);
    const br = breaks(vs);
    const cols = PALS[st.pal].f(Math.max(3, br.length + 1)).slice(0, br.length + 1);
    const col = d3.scaleThreshold().domain(br).range(cols);
    const m = A.drawMap($('map'), world, {
      width: 960, height: 500, projection: A.regionProjection(st.reg), fit: A.regionFit(st.reg) || undefined,
      fill: f => { const d = byF.get(f); return d && d.inReg && d.v != null ? col(d.v) : null; },
      title: f => { const d = byF.get(f); return d && d.i ? A.cname(d.i) + ': ' + A.fmtNum(d.v) : ''; },
    });
    if (st.reg !== 'world') m.countries.style('opacity', f => (byF.get(f).inReg ? 1 : 0.35));
    const meta = S.meta[st.ind], unit = A.t(meta.unit), yr = A.statYear(st.ind, st.yr);
    const regName = st.reg === 'world' ? A.t({ en: 'World', ko: '세계' }) : A.t(CATALOG.regions.find(r => r.id === st.reg).name);
    $('mtitle').textContent = A.t(meta.label) + ' · ' + regName + ' · ' + yr;
    // legend with counts per class
    const counts = cols.map((c, j) => vs.filter(v => (j === 0 || v >= br[j - 1]) && (j === cols.length - 1 || v < br[j])).length);
    $('legend').innerHTML = '<div class="legend">' + cols.map((c, j) => '<span><i style="background:' + c + '"></i>' + (j === 0 ? '< ' + A.fmtNum(br[0]) : j === cols.length - 1 ? '≥ ' + A.fmtNum(br[j - 1]) : A.fmtNum(br[j - 1]) + '–' + A.fmtNum(br[j])) +
      ' <span class="muted">(' + counts[j] + ')</span></span>').join('') + '<span><i class="nodata"></i>' + A.esc(A.t({ en: 'no data', ko: '자료 없음' })) + '</span></div>' +
      '<p class="small muted" style="margin:.2rem 0 0">' + A.esc(unit) + ' · ' + A.esc(A.t({ en: '(n) = number of countries in the class', ko: '(n) = 그 구간의 나라 수' })) + '</p>';
    $('src').textContent = A.statSource(st.ind) + A.ncNote(st.ind) +
      ' · ' + A.t({ en: 'range ', ko: '범위 ' }) + A.fmtNum(vs[0]) + '–' + A.fmtNum(vs[vs.length - 1]);
    strip(vs, br, col);
    checks(counts);
    seeAlso();
  }

  /* See together: cards whose bar charts use the same data, and the chosen region on the explore map. */
  let CARDS = [];
  function seeAlso() {
    let box = $('mmSee');
    if (!box) { box = A.el('div', { class: 'see-also', id: 'mmSee' }); $('src').after(box); }
    const uses = k => k.sources.some(s => s.type === 'bars' && (s.indicator || s.ind) === st.ind);
    const hits = CARDS.filter(k => uses(k) && (st.reg === 'world' || k.region === st.reg || k.region === 'world'));
    const chip = (h, t) => '<a class="chip" href="' + h + '">' + A.esc(t) + '</a>';
    const links = hits.map(k => chip('cards.html#' + k.id, A.t({ en: 'Card: ', ko: '카드: ' }) + A.t(k.title))).join('') +
      (st.reg !== 'world' ? chip('explore.html#r-' + st.reg, A.t({ en: 'This region on the explore map', ko: '지도 탐험에서 이 지역 보기' })) : '');
    box.innerHTML = links ? '<h3 class="small">' + A.esc(A.t({ en: 'See together', ko: '함께 보기' })) + '</h3><div class="chips">' + links + '</div>' : '';
  }
  let byF = new Map();

  function strip(vs, br, col) {
    const W = 960, H = 90, m = { l: 12, r: 12, t: 10, b: 26 };
    const svg = d3.select($('strip')).attr('viewBox', '0 0 ' + W + ' ' + H);
    svg.selectAll('*').remove();
    const lo = vs[0], hi = vs[vs.length - 1];
    const useLog = lo > 0 && hi / lo > 100;
    const x = (useLog ? d3.scaleLog() : d3.scaleLinear()).domain([useLog ? lo : Math.min(0, lo), hi]).range([m.l, W - m.r]).nice();
    svg.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(useLog
      ? d3.axisBottom(x).tickValues(x.ticks().filter(t => Math.abs(Math.log10(t) % 1) < 1e-9)).tickFormat(t => (t < 1000 ? String(+t.toPrecision(3)) : A.fmtNum(t)))
      : d3.axisBottom(x).ticks(8).tickFormat(A.fmtNum));
    const rnd = d3.randomLcg(42);
    svg.append('g').selectAll('circle').data(vs).join('circle').attr('r', 3.2)
      .attr('cx', v => x(v)).attr('cy', () => m.t + 6 + rnd() * (H - m.t - m.b - 14))
      .style('fill', v => col(v)).style('stroke', 'var(--ink)').style('stroke-width', .4);
    svg.append('g').selectAll('line').data(br).join('line').attr('x1', b => x(b)).attr('x2', b => x(b)).attr('y1', m.t - 4).attr('y2', H - m.b)
      .style('stroke', 'var(--temp)').style('stroke-width', 1.5).style('stroke-dasharray', '4 3');
    if (useLog) svg.append('text').attr('class', 'lbl').attr('x', W - m.r).attr('y', m.t).attr('text-anchor', 'end').style('fill', 'var(--muted)').text(A.t({ en: 'log scale: each step right is 10 times more', ko: '로그 눈금: 오른쪽으로 한 칸 갈 때마다 10배' }));
  }

  function checks(counts) {
    const items = [
      [true, { en: 'a title that says what, where and when (the app adds it; check it is right)', ko: '무엇 · 어디 · 언제를 밝힌 제목(앱이 넣어 줌, 맞는지 확인)' }],
      [true, { en: 'a legend with units (the app adds it)', ko: '단위가 있는 범례(앱이 넣어 줌)' }],
      [true, { en: 'a source line (the app adds it)', ko: '출처(앱이 넣어 줌)' }],
      [st.ind !== 'population', { en: 'a ratio, not a raw count (a count favours big countries)', ko: '절대량이 아닌 비율(절대량은 큰 나라를 진하게 만든다)' }],
      [st.pal !== 'rainbow', { en: 'colours that go from light to dark, so "more" is easy to see', ko: '옅은 색에서 진한 색으로 이어져 "더 많음"이 바로 보이는 색' }],
      [!counts.some(c => c === 0), { en: 'no empty class', ko: '나라가 하나도 없는 빈 구간이 없음' }],
      [counts.length && Math.max(...counts) < 0.7 * counts.reduce((a, b) => a + b, 0), { en: 'no single class holding most of the countries', ko: '한 구간에 대부분의 나라가 몰려 있지 않음' }],
    ];
    $('checks').innerHTML = items.map(([ok, t]) => '<div>' + (ok ? '✓ ' : '✗ ') + '<span style="color:' + (ok ? 'var(--ink)' : 'var(--temp)') + '">' + A.esc(A.t(t)) + '</span></div>').join('');
  }

  function tasks() {
    $('tasks').innerHTML = '<h3>' + A.esc(A.t({ en: 'Try these', ko: '해 볼 것' })) + '</h3>' + TASKS.map(t => '<div><p style="margin:.3rem 0"><strong>' + A.esc(A.t(t.title)) + '</strong><br><span class="small">' + A.esc(A.t(t.body)) +
      '</span></p><button type="button" class="btn go" data-t="' + t.id + '">' + A.esc(A.t({ en: 'Set up this map', ko: '이 지도로 맞추기' })) + '</button></div>').join('');
    $('tasks').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const t = TASKS.find(x => x.id === b.dataset.t);
      Object.assign(st, t.set);
      if (!t.set.manual) st.manual = null; else st.manual = t.set.manual.slice();
      controls(); draw(); $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  function all() { controls(); tasks(); draw(); }

  $('ind').addEventListener('change', e => { st.ind = e.target.value; st.manual = null; controls(); draw(); });
  $('reg').addEventListener('change', e => { st.reg = e.target.value; st.manual = null; draw(); });
  document.querySelectorAll('input[name=yr]').forEach(r => r.addEventListener('change', () => { st.yr = r.value; draw(); }));
  document.querySelectorAll('input[name=meth]').forEach(r => r.addEventListener('change', () => { st.meth = r.value; draw(); }));
  $('k').addEventListener('change', e => { st.k = Math.max(3, Math.min(7, +e.target.value || 5)); st.manual = null; draw(); });
  const c = $('concl');
  try { c.value = localStorage.getItem(LS) || ''; } catch (e) {}
  c.addEventListener('input', () => { try { localStorage.setItem(LS, c.value); } catch (e) {} });
  A.onLang(all);

  Promise.all([A.world('110m'), A.loadCountries()]).then(([w, cs]) => {
    world = w; S = cs.stats;
    all();
    A.json('data/cards.json').then(cj => { CARDS = cj.cards || cj; seeAlso(); }).catch(() => {});
  }).catch(e => { $('mtitle').textContent = String(e); });
})();
