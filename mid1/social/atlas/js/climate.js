/* Climate graph lab: read, draw, match, mystery continent. */
(function () {
  const A = Atlas, T = A.t;
  A.topbar('climate.html', { en: 'Climate graph lab', ko: '기후 그래프 실험실' });

  let CITIES = [], CLUES = {}, WORLD = null;
  const byId = id => CITIES.find(c => c.id === id);
  const groupKey = c => (c.highland ? 'H' : c.koppen[0]);
  const cityName = c => (A.lang === 'ko' ? c.ko : c.en);
  const fmt = (v, d) => (v == null ? '–' : (+v).toFixed(d == null ? 1 : d));
  const L = (en, ko) => (A.lang === 'ko' ? ko : en);

  /* ---------- tabs ---------- */
  const tabs = ['read', 'draw', 'match', 'mystery'];
  function showTab(t) {
    tabs.forEach(x => {
      document.getElementById('tab-' + x).hidden = x !== t;
      const tb = document.querySelector('[data-tab="' + x + '"]'); tb.setAttribute('aria-selected', String(x === t)); tb.tabIndex = x === t ? 0 : -1;
    });
    if (t === 'match' && !matchState) newMatch();
  }
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.tab); showTab(b.dataset.tab); });
    b.addEventListener('keydown', ev => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      const nx = tabs[(tabs.indexOf(b.dataset.tab) + d + tabs.length) % tabs.length];
      const nb = document.querySelector('[data-tab="' + nx + '"]'); nb.click(); nb.focus();
    });
  });

  /* ---------- reasoning steps ---------- */
  function steps(c) {
    const k = A.koppen(c.temp, c.prec, c.lat, c.elev);
    const sum = a => a.reduce((s, v) => s + v, 0);
    const north = c.lat >= 0;
    const sIdx = north ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
    const Ps = sum(sIdx.map(i => c.prec[i]));
    let pth = 2 * k.MAT + 14;
    if (Ps >= 0.7 * k.MAP) pth = 2 * k.MAT + 28; else if (k.MAP - Ps >= 0.7 * k.MAP) pth = 2 * k.MAT;
    const dryLine = Math.max(0, 10 * pth);
    const out = [];
    const polar = k.Tmax < 10;
    out.push({ hit: polar, en: `Warmest month ${fmt(k.Tmax)} °C. ${polar ? 'Below 10 °C, so trees cannot grow: polar climate.' : 'At least 10 °C, so it is not polar.'}`,
      ko: `가장 더운 달 ${fmt(k.Tmax)} °C. ${polar ? '10 °C보다 낮아 나무가 자라기 어렵다: 한대 기후.' : '10 °C 이상이므로 한대 기후가 아니다.'}` });
    if (!polar) {
      const dry = k.MAP < dryLine;
      out.push({ hit: dry, en: `Rain in a year ${fmt(k.MAP, 0)} mm. With this heat, the dry line is about ${fmt(dryLine, 0)} mm. ${dry ? 'Less than that: dry climate (' + (k.MAP < dryLine / 2 ? 'desert' : 'steppe') + ').' : 'More than that, so it is not a dry climate.'}`,
        ko: `연 강수량 ${fmt(k.MAP, 0)} mm. 이 정도 기온이면 건조 기준선은 약 ${fmt(dryLine, 0)} mm다. ${dry ? '그보다 적으므로 건조 기후(' + (k.MAP < dryLine / 2 ? '사막' : '스텝') + ').' : '그보다 많으므로 건조 기후가 아니다.'}` });
      if (!dry) {
        const g = k.Tmin >= 18 ? 'A' : (k.Tmin > -3 ? 'C' : 'D');
        out.push({ hit: true, en: `Coldest month ${fmt(k.Tmin)} °C. ${g === 'A' ? '18 °C or more: tropical climate.' : g === 'C' ? 'Between -3 °C and 18 °C: temperate climate.' : '-3 °C or lower: continental (cold) climate.'}`,
          ko: `가장 추운 달 ${fmt(k.Tmin)} °C. ${g === 'A' ? '18 °C 이상: 열대 기후.' : g === 'C' ? '-3 °C보다 높고 18 °C보다 낮음: 온대 기후.' : '-3 °C 이하: 냉대 기후.'}` });
        const code = k.code;
        let det;
        if (g === 'A') {
          const dry2 = Math.min(...c.prec);
          det = code === 'Af' ? { en: `Driest month still has ${fmt(dry2, 0)} mm (60 mm or more): rain all year, tropical rainforest.`, ko: `가장 건조한 달도 ${fmt(dry2, 0)} mm(60 mm 이상): 일 년 내내 비, 열대 우림 기후.` }
            : code === 'Am' ? { en: `Driest month ${fmt(dry2, 0)} mm, but the wet season is so wet that forest survives: tropical monsoon.`, ko: `가장 건조한 달은 ${fmt(dry2, 0)} mm지만 우기가 매우 습해 숲이 유지된다: 열대 몬순 기후.` }
            : { en: `Driest month only ${fmt(dry2, 0)} mm: a clear dry season, savanna.`, ko: `가장 건조한 달 ${fmt(dry2, 0)} mm: 건기가 뚜렷한 사바나 기후.` };
        } else if (code[1] === 's') det = { en: 'Summer is the dry season, winter the wet one: dry-summer (Mediterranean type).', ko: '여름이 건조하고 겨울에 비가 많다: 여름 건조형(지중해성).' };
        else if (code[1] === 'w') det = { en: 'Winter is very dry compared with the wet summer: dry-winter type.', ko: '습한 여름에 비해 겨울이 매우 건조하다: 겨울 건조형.' };
        else det = { en: 'Rain falls in every season: no dry season.', ko: '계절마다 비가 온다: 건조한 계절이 없다.' };
        if (code === 'Cfb' || code === 'Cfc') det = { en: det.en + ' Summers stay cool (warmest month under 22 °C): marine west coast.', ko: det.ko + ' 여름도 선선하다(최난월 22 °C 미만): 서안 해양성 기후.' };
        if (code === 'Cfa') det = { en: det.en + ' Hot summers (warmest month 22 °C or more): humid subtropical.', ko: det.ko + ' 여름이 덥다(최난월 22 °C 이상): 온대 습윤 기후.' };
        out.push(Object.assign({ hit: true }, det));
      }
    }
    if (k.border) out.push({ hit: false, en: 'Borderline: yearly rain is within about 10% of the dry line, so books and websites may name this climate differently. A dry year or a wet year can move it across the line.',
      ko: '경계 기후: 연 강수량이 건조 기준선과 10% 안팎밖에 차이 나지 않아, 책과 자료마다 다른 기후로 부르기도 한다. 비가 적은 해와 많은 해에 따라 선을 넘나들 수 있다.' });
    if (c.highland) out.push({ hit: true, en: `It lies ${c.elev} m above sea level near the tropics: air cools about 0.6 °C per 100 m, so textbooks call it a highland climate.`,
      ko: `열대 가까이 있지만 해발 ${c.elev} m: 100 m 오를 때마다 약 0.6 °C씩 낮아지므로 교과서에서는 고산 기후라고 부른다.` });
    return { k, list: out };
  }

  function badge(c) {
    const g = groupKey(c);
    return '<span class="badge" style="background:' + A.GROUP_COLORS[g] + '">' + T(A.KOPPEN_NAMES[g]) + '</span>';
  }

  /* ---------- 1 read ---------- */
  let readMap, current;
  function legend() {
    document.getElementById('legend').innerHTML = ['A', 'B', 'C', 'D', 'E', 'H'].map(g =>
      '<span><span class="badge" style="background:' + A.GROUP_COLORS[g] + '">&nbsp;</span> ' + T(A.KOPPEN_NAMES[g]) + '</span>').join(' ');
  }
  function renderRead(id) {
    const c = byId(id) || CITIES[0];
    current = c.id;
    const st = steps(c);
    const name = A.koppenName(st.k.code);
    const p = document.getElementById('readPanel');
    p.innerHTML =
      '<div><h2 style="margin:0">' + A.esc(cityName(c)) + '</h2><div class="small muted">' + A.esc(c.station) + ' · ' + c.lat.toFixed(1) + '°, ' + c.lon.toFixed(1) + '° · ' + (c.elev != null ? c.elev + ' m' : '') + '</div></div>' +
      '<div class="row"><span class="code">' + st.k.code + '</span>' + badge(c) + '<span>' + A.esc(T(name)) + '</span></div>' +
      '<svg id="readChart" aria-label="Climate graph"></svg>' +
      '<div class="row small"><span>' + L('Year average', '연평균 기온') + ' <b class="mono">' + fmt(st.k.MAT) + ' °C</b></span><span>' + L('Year total', '연 강수량') + ' <b class="mono">' + fmt(st.k.MAP, 0) + ' mm</b></span><span>' + L('Range', '연교차') + ' <b class="mono">' + fmt(st.k.Tmax - st.k.Tmin) + ' °C</b></span></div>' +
      '<h3>' + L('Why this climate?', '왜 이 기후일까?') + '</h3><ol class="steps">' + st.list.map(s => '<li class="' + (s.hit ? 'hit' : '') + '">' + A.esc(T(s)) + '</li>').join('') + '</ol>' +
      (CLUES[c.id] ? '<p class="note small">' + A.esc(T(CLUES[c.id])) + '</p>' : '') +
      '<details class="small"><summary>' + L('Numbers', '숫자 보기') + '</summary>' + dataTable(c) + '</details>' +
      '<p class="src">' + L('Source', '출처') + ' (' + A.esc(A.gradeText(c.grade)) + ', ' + A.esc(A.periodText(c.period)) + '): ' + A.linkify(c.src) + '</p>' +
      '<div class="see-also" id="readSee"></div>';
    seeAlso(c);
    A.climograph(document.getElementById('readChart'), c.temp, c.prec);
    if (readMap) readMap.pins.selectAll('.pin circle').attr('r', d => (d.id === c.id ? 8 : 5));
  }
  /* See together: cards that draw this city's graph, landforms that point to it, and its region on the map. */
  let LINKS = null;
  function seeAlso(c) {
    const box = document.getElementById('readSee');
    if (!box || !LINKS) return;
    const cards = LINKS.cards.filter(k => k.sources.some(s => s.type === 'climograph' && s.city === c.id));
    const places = LINKS.places.filter(f => (f.links || []).includes('climate.html#' + c.id));
    const reg = (LINKS.countries[c.iso3] || {}).region;
    const chip = (h, t) => '<a class="chip" href="' + h + '">' + A.esc(t) + '</a>';
    box.innerHTML = '<h3 class="small">' + L('See together', '함께 보기') + '</h3><div class="chips">' +
      cards.map(k => chip('cards.html#' + k.id, T({ en: 'Card: ', ko: '카드: ' }) + T(k.title))).join('') +
      places.map(f => chip('explore.html#f-' + f.id, T({ en: 'On the map: ', ko: '지도에서: ' }) + T(f.name))).join('') +
      (reg ? chip('explore.html#r-' + reg + (reg === 'oceania_polar' && c.lat < -60 ? '/v-antarctic' : ''), T({ en: 'This region on the map', ko: '지도에서 이 지역 보기' })) : '') +
      '</div>';
  }
  function dataTable(c, hideP, hideT) {
    const mh = A.MONTHS.ko.map(m => '<th>' + m + '</th>').join('');
    return '<div class="scroll"><table class="data mono"><tr><th></th>' + mh + '</tr>' +
      (hideT ? '' : '<tr><th style="color:var(--temp)">°C</th>' + c.temp.map(v => '<td>' + fmt(v) + '</td>').join('') + '</tr>') +
      (hideP ? '' : '<tr><th style="color:var(--prec)">mm</th>' + c.prec.map(v => '<td>' + fmt(v, 0) + '</td>').join('') + '</tr>') + '</table></div>';
  }

  /* ---------- 2 draw ---------- */
  let drawCity = null, drawHidden = false, drawT = [], drawP = [], drawVar = 't', drawScales = null;
  function setupDraw() {
    const sel = document.getElementById('drawCity');
    sel.innerHTML = CITIES.slice().sort((a, b) => cityName(a).localeCompare(cityName(b))).map(c => '<option value="' + c.id + '">' + A.esc(cityName(c)) + '</option>').join('');
    if (drawCity) sel.value = drawHidden ? '' : drawCity.id;
  }
  function startDraw(c, hidden) {
    drawCity = c; drawHidden = hidden;
    drawT = new Array(12).fill(null); drawP = new Array(12).fill(null);
    document.getElementById('drawCity').value = hidden ? '' : c.id;
    document.getElementById('drawTable').outerHTML = '<table class="data mono" id="drawTable"></table>';
    document.getElementById('drawTable').innerHTML = dataTable(c).replace(/^<div class="scroll"><table class="data mono">|<\/table><\/div>$/g, '');
    document.getElementById('drawResult').innerHTML = hidden ? '<span class="muted small">' + L('City name hidden. Draw it, then guess its climate.', '도시 이름은 숨겨져 있습니다. 그래프를 그린 뒤 기후를 맞혀 보세요.') + '</span>' : '';
    document.getElementById('drawClassify').hidden = true;
    renderDraw();
  }
  function renderDraw(ghost) {
    const svgEl = document.getElementById('drawChart');
    drawScales = A.climograph(svgEl, drawT, drawP);
    const s = drawScales, g = s.g;
    if (ghost) {
      g.selectAll('.gp').data(drawCity.prec).join('rect').attr('class', 'ghost-p gp')
        .attr('x', (d, i) => s.x(i)).attr('width', s.x.bandwidth()).attr('y', d => s.yP(d)).attr('height', d => s.ih - s.yP(d));
      g.append('path').attr('class', 'ghost-t').attr('d', d3.line().x((d, i) => s.x(i) + s.x.bandwidth() / 2).y(d => s.yT(d))(drawCity.temp));
    }
    const hits = g.selectAll('.hitcol').data(d3.range(12)).join('rect').attr('class', 'hitcol')
      .attr('x', i => s.x(i) - s.x.step() * s.x.paddingInner() / 2).attr('width', s.x.step()).attr('y', 0).attr('height', s.ih);
    const set = (i, y) => {
      if (drawVar === 't') drawT[i] = Math.round(s.yT.invert(y));
      else drawP[i] = Math.max(0, Math.round(s.yP.invert(y) / 10) * 10);
      renderDraw(ghost);
    };
    const svg = d3.select(svgEl);
    const pick = ev => {
      const [mx, my] = d3.pointer(ev, g.node());
      const left = s.x(0) - s.x.step() * s.x.paddingInner() / 2;
      const i = Math.max(0, Math.min(11, Math.floor((mx - left) / s.x.step())));
      set(i, Math.max(0, Math.min(s.ih, my)));
    };
    // Keyboard: each month column takes focus; Up/Down change the value, Left/Right move month.
    hits.attr('tabindex', 0).attr('role', 'slider')
      .attr('aria-label', i => L('Month ', '') + (i + 1) + L('', '월') + ' · ' + (drawVar === 't' ? L('temperature', '기온') : L('precipitation', '강수량')))
      .attr('aria-valuenow', i => (drawVar === 't' ? drawT[i] : drawP[i]))
      .on('keydown', (ev, i) => {
        const k = ev.key;
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          ev.preventDefault();
          const n = Math.max(0, Math.min(11, i + (k === 'ArrowRight' ? 1 : -1)));
          const el = svgEl.querySelectorAll('.hitcol')[n]; if (el) el.focus();
          return;
        }
        if (k !== 'ArrowUp' && k !== 'ArrowDown') return;
        ev.preventDefault();
        const up = k === 'ArrowUp' ? 1 : -1;
        if (drawVar === 't') drawT[i] = Math.max(-30, Math.min(40, (drawT[i] == null ? 10 : drawT[i]) + up));
        else drawP[i] = Math.max(0, (drawP[i] == null ? 50 : drawP[i]) + up * 10);
        renderDraw(ghost);
        const el = svgEl.querySelectorAll('.hitcol')[i]; if (el) el.focus();
      });
    hits.on('pointerdown', ev => { ev.preventDefault(); svg.node().setPointerCapture && svg.node().setPointerCapture(ev.pointerId); pick(ev); svg.on('pointermove.draw', pick); });
    svg.on('pointerup.draw pointercancel.draw pointerleave.draw', () => svg.on('pointermove.draw', null));
  }
  window.__drawState = () => ({ t: drawT.slice(), p: drawP.slice() });
  function checkDraw() {
    if (!drawCity) return;
    let tOk = 0, pOk = 0;
    drawCity.temp.forEach((v, i) => { if (drawT[i] != null && Math.abs(drawT[i] - v) <= 3) tOk++; });
    drawCity.prec.forEach((v, i) => { if (drawP[i] != null && Math.abs(drawP[i] - v) <= Math.max(25, v * 0.2)) pOk++; });
    renderDraw(true);
    document.getElementById('drawResult').innerHTML =
      '<p>' + L('Close enough', '거의 맞은 달') + ': <span class="mono">' + L('temperature', '기온') + ' ' + tOk + '/12 · ' + L('precipitation', '강수량') + ' ' + pOk + '/12</span>. ' +
      '<span class="small muted">' + L('Dashed lines show the real data (±3 °C, ±20% counts as close).', '점선이 실제 자료입니다(±3 °C, ±20% 안이면 맞은 것으로 셉니다).') + '</span></p>';
    const box = document.getElementById('drawClassify'); box.hidden = false;
    document.getElementById('groupResult').innerHTML = '';
    document.getElementById('groupOpts').innerHTML = ['A', 'B', 'C', 'D', 'E', 'H'].map(gk =>
      '<button class="chip" data-g="' + gk + '">' + A.esc(T(A.KOPPEN_NAMES[gk])) + '</button>').join('');
    document.querySelectorAll('#groupOpts button').forEach(b => b.addEventListener('click', () => {
      const right = groupKey(drawCity);
      const ok = b.dataset.g === right;
      const st = steps(drawCity);
      document.getElementById('groupResult').innerHTML = '<p class="' + (ok ? 'ok' : 'no') + '">' + (ok ? L('Right!', '맞았어요!') : L('Not quite.', '아쉬워요.')) + ' ' +
        A.esc(cityName(drawCity)) + ': <span class="mono">' + st.k.code + '</span> ' + A.esc(T(A.koppenName(st.k.code))) + '</p><ol class="steps">' +
        st.list.map(s => '<li class="' + (s.hit ? 'hit' : '') + '">' + A.esc(T(s)) + '</li>').join('') + '</ol>';
    }));
  }

  /* ---------- 3 match ---------- */
  let matchState = null, matchMap = null;
  function newMatch() {
    const pool = A.shuffle(CITIES.filter(c => CLUES[c.id]));
    const picked = [], groups = new Set();
    for (const c of pool) { if (picked.length < 4 && !groups.has(groupKey(c) + c.koppen.slice(0, 2))) { picked.push(c); groups.add(groupKey(c) + c.koppen.slice(0, 2)); } }
    for (const c of pool) { if (picked.length < 4 && !picked.includes(c)) picked.push(c); }
    const graphOrder = A.shuffle(picked), placeOrder = A.shuffle(picked), clueOrder = A.shuffle(picked);
    matchState = { picked, graphOrder, placeOrder, clueOrder };
    renderMatch();
  }
  function renderMatch() {
    if (!matchState) return;
    const { graphOrder, placeOrder, clueOrder } = matchState;
    const letters = ['A', 'B', 'C', 'D'];
    const gWrap = document.getElementById('matchGraphs');
    gWrap.innerHTML = graphOrder.map((c, i) => '<figure><figcaption>' + letters[i] + '</figcaption><svg id="mg' + i + '"></svg></figure>').join('');
    graphOrder.forEach((c, i) => A.climograph(document.getElementById('mg' + i), c.temp, c.prec));
    matchMap = A.drawMap(document.getElementById('matchMap'), WORLD, { width: 720, height: 370 });
    matchMap.addPins(placeOrder.map((c, i) => ({ id: c.id, lat: c.lat, lon: c.lon, n: i + 1 })), { r: 9, color: () => 'var(--ink)', label: d => '' });
    matchMap.pins.selectAll('.pin').append('text').attr('text-anchor', 'middle').attr('y', 4).attr('x', 0)
      .style('fill', 'var(--bg)').style('stroke', 'none').style('font-weight', 600).text(d => d.n);
    document.getElementById('matchClues').innerHTML = clueOrder.map((c, i) =>
      '<div class="clue"><p>' + A.esc(T(CLUES[c.id])) + '</p><div class="sel">' +
      '<select aria-label="graph" data-k="g" data-i="' + i + '"><option value="">' + L('Graph', '그래프') + '</option>' + letters.map(l => '<option>' + l + '</option>').join('') + '</select>' +
      '<select aria-label="place" data-k="p" data-i="' + i + '"><option value="">' + L('Place', '위치') + '</option>' + [1, 2, 3, 4].map(n => '<option>' + n + '</option>').join('') + '</select>' +
      '</div></div>').join('');
    document.getElementById('matchResult').innerHTML = '';
  }
  function checkMatch() {
    const { graphOrder, placeOrder, clueOrder } = matchState;
    const letters = ['A', 'B', 'C', 'D'];
    let score = 0;
    const rows = document.querySelectorAll('#matchClues .clue');
    clueOrder.forEach((c, i) => {
      const g = rows[i].querySelector('[data-k="g"]').value, p = rows[i].querySelector('[data-k="p"]').value;
      const gR = letters[graphOrder.indexOf(c)], pR = String(placeOrder.indexOf(c) + 1);
      const ok = g === gR && p === pR;
      if (ok) score++;
      let r = rows[i].querySelector('.ans');
      if (!r) { r = A.el('div', { class: 'ans small' }); rows[i].appendChild(r); }
      r.innerHTML = '<span class="' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✗') + '</span> ' + A.esc(cityName(c)) + ' · ' + L('graph', '그래프') + ' ' + gR + ' · ' + L('place', '위치') + ' ' + pR + ' · <span class="mono">' + c.koppen + '</span>';
    });
    document.getElementById('matchResult').innerHTML = '<p><b class="mono">' + score + ' / 4</b> ' + L('rows fully right.', '줄을 완전히 맞혔습니다.') + '</p>';
  }

  /* ---------- 4 mystery continent ---------- */
  const yOf = lat => 30 + (55 - lat) * 5.4;
  const MP = [
    { id: 'A', x: 305, lat: 2, elev: 120, ans: 'Af', why: { en: 'On the equator the sun is high all year. Warm air rises every day and makes rain in every month: tropical rainforest.', ko: '적도 부근은 일 년 내내 해가 높다. 데워진 공기가 날마다 올라가 열두 달 비를 만든다: 열대 우림 기후.' } },
    { id: 'B', x: 335, lat: 15, elev: 300, ans: 'Aw', why: { en: 'About 15° from the equator, the rain belt arrives only in the summer half of the year. The rest is dry: savanna.', ko: '적도에서 15° 정도 떨어지면 비가 내리는 띠가 여름 반년에만 온다. 나머지는 건조하다: 사바나 기후.' } },
    { id: 'C', x: 222, lat: -24, elev: 50, ans: 'BW', why: { en: 'Near 23° south, sinking dry air (subtropical high) sits overhead, and the cold current offshore cools the air so clouds cannot make rain: desert.', ko: '남위 23° 부근에는 하강하는 건조한 공기(아열대 고압대)가 머물고, 앞바다의 찬 해류가 공기를 식혀 비구름이 생기지 않는다: 사막 기후.' } },
    { id: 'D', x: 245, lat: -36, elev: 80, ans: 'Cs', why: { en: 'On a west coast between 30° and 40°, summer is under the dry high-pressure belt and winter gets rain from the westerly winds: Mediterranean.', ko: '위도 30 ~ 40°의 서해안은 여름에 건조한 고압대 아래에 있고, 겨울에는 편서풍이 비를 가져온다: 지중해성 기후.' } },
    { id: 'E', x: 170, lat: 48, elev: 40, ans: 'Cfb', why: { en: 'At about 48° on a west coast, westerly winds blow from the ocean all year, keeping winters mild and bringing rain in every season: marine west coast.', ko: '위도 48° 정도의 서해안은 일 년 내내 바다에서 편서풍이 불어 겨울이 온화하고 계절마다 비가 온다: 서안 해양성 기후.' } },
    { id: 'F', x: 375, lat: 46, elev: 400, ans: 'Df', why: { en: 'Far inside the continent at the same latitude, the ocean no longer softens winter. Winters fall well below -3 °C while summers are warm: continental (cold) climate.', ko: '같은 위도라도 대륙 안쪽 깊은 곳은 바다의 영향을 받지 못한다. 겨울은 -3 °C보다 훨씬 춥고 여름은 따뜻하다: 냉대 기후.' } },
    { id: 'G', x: 208, lat: -2, elev: 3600, ans: 'H', why: { en: 'It is on the equator, but 3,600 m up. Air cools about 0.6 °C every 100 m, so it is about 20 °C cooler than the lowland: highland climate.', ko: '적도에 있지만 해발 3,600 m다. 100 m마다 약 0.6 °C씩 낮아져 저지대보다 20 °C 정도 서늘하다: 고산 기후.' } },
  ];
  const MOPTS = ['Af', 'Aw', 'BW', 'Cs', 'Cfb', 'Df', 'H'];
  let mSel = null; const mDone = {};
  function drawMystery() {
    const svg = d3.select('#mysteryMap'); svg.selectAll('*').remove();
    svg.append('rect').attr('width', 520).attr('height', 600).style('fill', 'var(--sea)');
    [55, 50, 40, 30, 23.4, 0, -23.4, -30, -40].forEach(lat => {
      const y = yOf(lat);
      svg.append('line').attr('x1', 40).attr('x2', 515).attr('y1', y).attr('y2', y).style('stroke', lat === 0 ? 'var(--muted)' : 'var(--line)').style('stroke-dasharray', Math.abs(lat) === 23.4 ? '5 4' : null);
      svg.append('text').attr('x', 4).attr('y', y + 4).style('font-size', '11px').style('font-family', 'var(--mono)').style('fill', 'var(--muted)')
        .text(lat === 0 ? '0°' : Math.abs(lat) + '°' + (lat > 0 ? 'N' : 'S'));
    });
    const outline = [[190, 46], [300, 38], [390, 68], [425, 130], [405, 190], [432, 250], [442, 320], [422, 390], [385, 450], [342, 500], [292, 548], [252, 556], [232, 522], [210, 470], [190, 410], [178, 350], [168, 300], [150, 240], [128, 190], [132, 130], [150, 80]];
    svg.append('path').attr('d', d3.line().curve(d3.curveCatmullRomClosed)(outline)).style('fill', 'var(--land)').style('stroke', 'var(--land-edge)').style('stroke-width', 1.5);
    // mountain range along the west side
    svg.append('path').attr('d', d3.line().curve(d3.curveBasis)([[196, 250], [204, 300], [210, 360], [216, 420]])).style('fill', 'none').style('stroke', '#8a5a2b').style('stroke-width', 14).style('stroke-linecap', 'round').style('opacity', .55);
    // cold current
    svg.append('path').attr('d', 'M150 560 C135 500 140 440 160 380').attr('marker-end', 'url(#arr)').style('fill', 'none').style('stroke', 'var(--prec)').style('stroke-width', 3);
    svg.append('defs').html('<marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="var(--prec)"/></marker>');
    // westerlies arrows near 48N
    [[60, 70], [60, 95]].forEach(([x, y]) => svg.append('path').attr('d', `M${x} ${y} h60`).attr('marker-end', 'url(#arrw)').style('stroke', 'var(--muted)').style('stroke-width', 2));
    svg.select('defs').append('marker').attr('id', 'arrw').attr('viewBox', '0 0 10 10').attr('refX', 5).attr('refY', 5).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto').append('path').attr('d', 'M0 0 10 5 0 10z').style('fill', 'var(--muted)');
    const leg = svg.append('g').attr('transform', 'translate(300,575)').style('font-size', '11px');
    leg.append('text').style('fill', 'var(--prec)').attr('x', -250).text(L('→ cold current', '→ 찬 해류'));
    leg.append('text').style('fill', '#8a5a2b').attr('x', -150).text(L('▬ mountains over 3,000 m', '▬ 해발 3,000 m 넘는 산지'));
    leg.append('text').style('fill', 'var(--muted)').attr('x', 50).text(L('→ westerly winds', '→ 편서풍'));
    const pts = svg.selectAll('.mpoint').data(MP).join('g').attr('class', d => 'mpoint' + (mSel === d.id ? ' sel' : '')).attr('tabindex', 0).attr('role', 'button')
      .attr('transform', d => 'translate(' + d.x + ',' + yOf(d.lat) + ')');
    pts.append('circle').attr('r', 11).style('fill', d => (mDone[d.id] == null ? 'var(--paper)' : mDone[d.id] ? 'var(--good)' : 'var(--bad)'));
    pts.append('text').attr('text-anchor', 'middle').attr('y', 4).style('font-weight', 700).style('font-size', '12px').style('fill', d => (mDone[d.id] == null ? 'var(--ink)' : '#fff')).text(d => d.id);
    // Right or wrong is also shown by a mark, not only by colour.
    pts.filter(d => mDone[d.id] != null).append('text').attr('x', 13).attr('y', -9).style('font-weight', 700).style('font-size', '13px')
      .style('fill', d => (mDone[d.id] ? 'var(--good)' : 'var(--bad)')).text(d => (mDone[d.id] ? '✓' : '✗'));
    pts.attr('aria-label', d => d.id + (mDone[d.id] == null ? '' : mDone[d.id] ? L(' correct', ' 맞음') : L(' wrong', ' 틀림')));
    pts.on('click', (ev, d) => selectPoint(d)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectPoint(d); } });
  }
  function selectPoint(d) {
    mSel = d.id; drawMystery();
    document.getElementById('mysteryPrompt').textContent = L(`Point ${d.id}: latitude ${Math.abs(d.lat)}°${d.lat >= 0 ? 'N' : 'S'}, ${d.elev} m above sea level. Which climate?`,
      `${d.id} 지점: ${d.lat >= 0 ? '북위' : '남위'} ${Math.abs(d.lat)}°, 해발 ${d.elev} m. 어떤 기후일까?`);
    const opts = document.getElementById('mysteryOpts');
    opts.innerHTML = MOPTS.map(k => '<button class="chip" data-k="' + k + '">' + A.esc(T(A.koppenName(k === 'H' ? 'H' : k))) + '</button>').join('');
    document.getElementById('mysteryResult').innerHTML = '';
    opts.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const ok = b.dataset.k === d.ans;
      if (mDone[d.id] == null) mDone[d.id] = ok;
      document.getElementById('mysteryResult').innerHTML = '<p class="' + (ok ? 'ok' : 'no') + '">' + (ok ? L('Yes.', '맞았어요.') : L('Not this one. Answer: ', '정답이 아니에요. 정답: ') + A.esc(T(A.koppenName(d.ans)))) + '</p><p class="small">' + A.esc(T(d.why)) + '</p>';
      const done = Object.values(mDone);
      document.getElementById('mysteryScore').textContent = L(`First tries right: ${done.filter(Boolean).length} of ${done.length} (7 points in all)`, `첫 시도에 맞힌 것: ${done.length}개 중 ${done.filter(Boolean).length}개 (모두 7지점)`);
      drawMystery();
    }));
  }

  /* ---------- boot ---------- */
  Promise.all([A.world('110m'), A.json('data/cities.json'), A.json('data/city_notes.json')]).then(([world, cd, notes]) => {
    WORLD = world; CITIES = cd.cities; CLUES = notes.clues;
    Promise.all([A.json('data/cards.json'), A.json('data/physical.json'), A.json('data/countries.json')]).then(([cj, pj, co]) => {
      LINKS = { cards: cj.cards || cj, places: pj.features || pj, countries: co.countries || co };
      const cur = byId(current); if (cur) seeAlso(cur);
    }).catch(() => {});
    readMap = A.drawMap(document.getElementById('readMap'), world, { width: 720, height: 380 });
    const pinOpts = { r: 5, color: c => A.GROUP_COLORS[groupKey(c)], onClick: c => renderRead(c.id) };
    readMap.addPins(CITIES, pinOpts);
    readMap.pins.selectAll('.pin').append('title').text(c => cityName(c));
    legend(); setupDraw();
    document.getElementById('drawCity').addEventListener('change', e => startDraw(byId(e.target.value), false));
    document.getElementById('drawRandom').addEventListener('click', () => startDraw(A.shuffle(CITIES)[0], true));
    document.querySelectorAll('.drawmode button').forEach(b => b.addEventListener('click', () => {
      drawVar = b.dataset.v; document.querySelectorAll('.drawmode button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    document.getElementById('drawCheck').addEventListener('click', checkDraw);
    document.getElementById('drawClear').addEventListener('click', () => startDraw(drawCity, drawHidden));
    document.getElementById('matchCheck').addEventListener('click', checkMatch);
    document.getElementById('matchNew').addEventListener('click', newMatch);
    startDraw(byId('seoul') || CITIES[0], false);
    drawMystery();
    const h = location.hash.slice(1);
    if (tabs.includes(h)) showTab(h); else { showTab('read'); }
    renderRead(byId(h) ? h : 'seoul');
    window.addEventListener('hashchange', () => {
      const x = location.hash.slice(1);
      if (tabs.includes(x)) showTab(x); else if (byId(x)) { showTab('read'); renderRead(x); }
    });
    A.onLang(() => { legend(); setupDraw(); renderRead(current); if (matchState) renderMatch(); drawMystery(); renderDraw(); });
  }).catch(e => { document.getElementById('readPanel').innerHTML = '<p class="no">Data could not load: ' + A.esc(e.message) + '</p>'; });
})();
