/* My country and the world: rank strips, a made-up production chain, news-to-concept
   matching, and a "where were my things made" counter kept in this browser only. */
(function () {
  const A = window.Atlas;
  A.topbar('stories.html', { en: 'My country and the world · World Atlas Lab', ko: '내 나라와 세계 · 세계지리 실험실' });
  const $ = id => document.getElementById(id);
  const LS_C = 'atlas.stories.country', LS_I = 'atlas.stories.items';
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let C, S, world, cities, ST, mine = lsGet(LS_C, A.lang === 'ko' ? 'KOR' : ''), items = lsGet(LS_I, []), step = 0, news = {};
  const LOG = new Set(['population', 'population_density', 'gdp_per_capita_ppp']);

  /* ---------- 1. rank strips ---------- */
  function countryOptions(sel, val) {
    const list = Object.keys(C).filter(i => S.data[i]).map(i => [i, A.cname(i)]).sort((a, b) => a[1].localeCompare(b[1], A.lang));
    sel.innerHTML = (sel.id === 'country' ? '<option value=""' + (val ? '' : ' selected') + '>' + A.esc(A.t({ en: 'Choose your country', ko: '나라를 고르세요' })) + '</option>' : '') + list.map(([i, n]) => '<option value="' + i + '"' + (i === val ? ' selected' : '') + '>' + A.esc(n) + '</option>').join('');
  }
  function strips() {
    const box = $('strips');
    box.innerHTML = '';
    Object.keys(S.meta).forEach(ind => {
      const vals = Object.keys(S.data).map(i => ({ i, v: A.stat(i, ind, 'latest') })).filter(d => d.v != null && C[d.i]);
      if (!vals.length) return;
      const sorted = vals.map(d => d.v).sort(d3.ascending), med = d3.median(sorted);
      const me = vals.find(d => d.i === mine);
      const rank = me ? vals.filter(d => d.v > me.v).length + 1 : null;
      const W = 360, H = 34;
      const lo = sorted[0], hi = sorted[sorted.length - 1];
      const useLog = LOG.has(ind) && lo > 0;
      const x = (useLog ? d3.scaleLog() : d3.scaleLinear()).domain([useLog ? lo : Math.min(0, lo), hi]).range([4, W - 4]);
      const div = A.el('div', { class: 'strip' });
      const unit = A.t(A.statMeta(ind).unit);
      div.innerHTML = '<div class="t"><span>' + A.esc(A.t(A.statMeta(ind).label)) + ' · ' + A.statYear(ind, 'latest') + '</span><b>' +
        (me ? A.fmtNum(me.v) + (unit.length <= 4 ? ' ' + A.esc(unit) : '') + ' · ' + A.esc(A.t({ en: 'rank ', ko: '' })) + rank + A.esc(A.t({ en: '', ko: '위' })) + '/' + vals.length : '–') + '</b></div>';
      const svg = d3.select(div).append('svg').attr('viewBox', '0 0 ' + W + ' ' + H).attr('role', 'img')
        .attr('aria-label', A.t(A.statMeta(ind).label));
      svg.selectAll('line.c').data(vals).join('line').attr('class', 'c').attr('x1', d => x(d.v)).attr('x2', d => x(d.v)).attr('y1', 8).attr('y2', 24)
        .style('stroke', 'var(--muted)').style('stroke-width', .7).style('opacity', .55);
      svg.append('line').attr('x1', x(med)).attr('x2', x(med)).attr('y1', 2).attr('y2', 30).style('stroke', 'var(--ink)').style('stroke-width', 1.2).style('opacity', .6);
      if (me) {
        svg.append('path').attr('d', 'M' + x(me.v) + ',30 l-5,4 h10 z').style('fill', 'var(--temp)');
        svg.append('line').attr('x1', x(me.v)).attr('x2', x(me.v)).attr('y1', 4).attr('y2', 28).style('stroke', 'var(--temp)').style('stroke-width', 2.4);
      }
      box.appendChild(div);
    });
    const reg = CATALOG.regions.find(r => r.id === (C[mine] || {}).region);
    const cs = cities.filter(c => c.iso3 === mine);
    $('mineNote').textContent = reg ? A.t(reg.name) : '';
    $('mineLinks').innerHTML = (cs.length ? A.esc(A.t({ en: 'Climate graphs here: ', ko: '이 나라의 기후 그래프: ' })) + cs.map(c => '<a href="climate.html#' + c.id + '">' + A.esc(A.t(c)) + '</a>').join(', ') + ' · ' : '') +
      (reg ? '<a href="explore.html#r-' + reg.id + '">' + A.esc(A.t({ en: 'Explore this region on the map', ko: '이 지역을 지도에서 탐험하기' })) + '</a>' : '');
  }

  /* ---------- 2. production chain ---------- */
  function chain() {
    const ch = ST.chain;
    $('chainTitle').textContent = '2. ' + A.t(ch.title);
    $('chainIntro').textContent = A.t(ch.intro);
    const m = A.drawMap($('chainMap'), world, { width: 900, height: 440 });
    const pts = ch.steps.map(s => ({ ...s, xy: m.projection([s.lon, s.lat]) }));
    const order = [['hq', 'rd'], ['rd', 'mat'], ['mat', 'fac1'], ['mat', 'fac2'], ['fac1', 'shop'], ['fac2', 'shop'], ['hq', 'fac1']];
    const P = id => pts.find(p => p.id === id).xy;
    m.g.insert('g', '.pins').selectAll('path').data(order).join('path').attr('class', 'flow').attr('d', ([a, b]) => {
      const [x1, y1] = P(a), [x2, y2] = P(b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.18 - 12;
      return 'M' + x1 + ',' + y1 + ' Q' + mx + ',' + my + ' ' + x2 + ',' + y2;
    });
    m.addPins(pts, { r: 6, color: (d, i) => (pts.indexOf(d) === step ? 'var(--temp)' : 'var(--ocean)'), label: d => String(pts.indexOf(d) + 1), onClick: d => { step = pts.indexOf(d); chain(); } });
    m.pins.selectAll('.pin circle').style('fill', d => (pts.indexOf(d) === step ? 'var(--temp)' : 'var(--ocean)'));
    $('steps').innerHTML = pts.map((s, i) => '<div class="step" role="button" tabindex="0" data-i="' + i + '" aria-current="' + (i === step) + '"><b>' + A.esc(A.t(s.what)) + '</b> · ' + A.esc(A.cname(s.iso3)) +
      (i === step ? '<p class="small" style="margin:.3rem 0 0">' + A.esc(A.t(s.why)) + '</p>' : '') + '</div>').join('');
    $('steps').querySelectorAll('.step').forEach(el => {
      const go = () => { step = +el.dataset.i; chain(); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    const ccs = [...new Set(pts.map(p => p.iso3))];
    $('chainTable').innerHTML = '<div style="overflow-x:auto"><table class="data small"><thead><tr><th></th>' + ch.indicators.map(k => '<th>' + A.esc(A.t(A.statMeta(k).label)) + '</th>').join('') + '</tr></thead><tbody>' +
      ccs.map(i => '<tr' + (i === mine ? ' style="font-weight:600"' : '') + '><td>' + A.esc(A.cname(i)) + '</td>' + ch.indicators.map(k => '<td style="text-align:right;font-family:var(--mono)">' + A.fmtNum(A.stat(i, k, 'latest')) + '</td>').join('') + '</tr>').join('') +
      (!mine || ccs.includes(mine) ? '' : '<tr style="font-weight:600"><td>' + A.esc(A.cname(mine)) + ' (' + A.esc(A.t({ en: 'my country', ko: '내 나라' })) + ')</td>' + ch.indicators.map(k => '<td style="text-align:right;font-family:var(--mono)">' + A.fmtNum(A.stat(mine, k, 'latest')) + '</td>').join('') + '</tr>') +
      '</tbody></table></div><p class="src">' + ch.indicators.map(k => A.esc(A.statMeta(k).source)).join(' · ') + ' (Our World in Data)</p>';
    $('chainQ').innerHTML = ch.questions.map((q, i) => '<div class="rung" style="margin-top:.4rem"><p><strong>' + A.esc(A.t(q.prompt)) + '</strong></p><textarea rows="3" data-q="' + i + '"></textarea>' +
      '<button type="button" class="btn" data-r="' + i + '">' + A.esc(A.t({ en: 'Compare with a model answer', ko: '모범 답안과 비교하기' })) + '</button><p class="note small" hidden data-m="' + i + '">' + A.esc(A.t(q.model)) + '</p></div>').join('');
    $('chainQ').querySelectorAll('textarea').forEach(t => {
      t.style.cssText = 'width:100%;font:inherit;padding:.5rem;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)';
      t.value = lsGet('atlas.stories.q' + t.dataset.q, '');
      t.addEventListener('input', () => lsSet('atlas.stories.q' + t.dataset.q, t.value));
    });
    $('chainQ').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { const p = $('chainQ').querySelector('[data-m="' + b.dataset.r + '"]'); p.hidden = !p.hidden; }));
  }

  /* ---------- 3. news ---------- */
  function newsCards() {
    $('news').innerHTML = ST.news.map(n => {
      const opts = A.shuffle(n.options, n.id.charCodeAt(1) * 7919);
      const picked = news[n.id];
      return '<article class="paper"><span class="synth" style="justify-self:start">' + A.esc(A.t({ en: 'made-up news', ko: '가상의 뉴스' })) + '</span><h3>' + A.esc(A.t(n.headline)) + '</h3><p class="small" style="margin:0">' + A.esc(A.t(n.body)) +
        '</p><div class="opts">' + opts.map(o => '<button type="button" class="o' + (picked ? (o === n.answer ? ' right' : o === picked ? ' wrong' : '') : '') + '" data-n="' + n.id + '" data-o="' + o + '">' + A.esc(A.t(ST.concepts[o].name)) + '</button>').join('') + '</div>' +
        (picked ? '<p class="small" style="margin:0">' + (picked === n.answer ? '✓ ' : '✗ ') + A.esc(A.t(ST.concepts[n.answer].why)) + ' <span class="muted">(' + A.esc(A.t({ en: 'Korean textbook unit ', ko: '한국 교과서 ' })) + ST.concepts[n.answer].unit + A.esc(A.t({ en: '', ko: '단원' })) + ')</span></p>' : '') + '</article>';
    }).join('');
    $('news').querySelectorAll('button.o').forEach(b => b.addEventListener('click', () => { news[b.dataset.n] = b.dataset.o; newsCards(); }));
  }

  /* ---------- 4. where my things were made ---------- */
  function made() {
    const counts = d3.rollup(items, v => v.length, d => d.iso3);
    const max = d3.max(counts.values()) || 1;
    const col = d3.scaleSequential(d3.interpolateOranges).domain([0, max]);
    A.drawMap($('madeMap'), world, {
      width: 900, height: 440,
      fill: f => { const i = A.iso3OfFeature(f); const n = i ? counts.get(i) : 0; return n ? col(0.25 * max + 0.75 * n) : null; },
      title: f => { const i = A.iso3OfFeature(f); return i ? A.cname(i) + ': ' + (counts.get(i) || 0) : ''; },
    });
    $('items').innerHTML = items.map((it, k) => '<div><span>' + A.esc(it.name || '–') + ' · ' + A.esc(A.cname(it.iso3)) + '</span><button type="button" data-k="' + k + '" aria-label="' + A.esc(A.t({ en: 'remove', ko: '지우기' })) + '">✕</button></div>').join('') ||
      '<p class="small muted">' + A.esc(A.t({ en: 'No items yet.', ko: '아직 넣은 물건이 없습니다.' })) + '</p>';
    $('items').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { items.splice(+b.dataset.k, 1); lsSet(LS_I, items); made(); }));
    const byReg = d3.rollup(items, v => v.length, d => (C[d.iso3] || {}).region || 'world');
    $('madeSum').textContent = items.length ? A.t({ en: 'By region: ', ko: '지역별: ' }) + [...byReg].sort((a, b) => b[1] - a[1]).map(([r, n]) => {
      const R = CATALOG.regions.find(x => x.id === r);
      return (R ? A.t(R.name) : r) + ' ' + n;
    }).join(', ') : '';
    $('madeLegend').innerHTML = items.length ? '<div class="legend"><span><i style="background:' + col(0.25 * max + 0.75) + '"></i>1</span><span><i style="background:' + col(max) + '"></i>' + max + '</span></div>' : '';
  }

  function render() {
    countryOptions($('country'), mine);
    countryOptions($('itemCountry'), lsGet('atlas.stories.lastMade', 'CHN'));
    $('itemName').placeholder = A.t({ en: 'e.g. T-shirt', ko: '예: 티셔츠' });
    strips(); chain(); newsCards(); made();
  }

  $('country').addEventListener('change', e => { mine = e.target.value; lsSet(LS_C, mine); strips(); chain(); });
  $('addItem').addEventListener('click', () => {
    const iso3 = $('itemCountry').value, name = $('itemName').value.trim().slice(0, 40);
    items.push({ name, iso3 }); lsSet(LS_I, items); lsSet('atlas.stories.lastMade', iso3);
    $('itemName').value = ''; made();
  });
  $('itemName').addEventListener('keydown', e => { if (e.key === 'Enter') $('addItem').click(); });
  A.onLang(render);

  Promise.all([A.loadCountries(), A.world('110m'), A.json('data/cities.json'), A.json('data/stories.json')]).then(([cs, w, cd, st]) => {
    C = cs.countries; S = cs.stats; world = w; cities = cd.cities; ST = st;
    if (!S.data[mine]) mine = '';
    render();
  }).catch(e => { $('strips').textContent = String(e); });
})();
