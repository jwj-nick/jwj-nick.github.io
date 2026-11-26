/* Three guided paths on the home page. A step whose card or city is missing is left out.
   Ticks mark steps opened on this device (localStorage, optional). */
(function () {
  const L = (en, ko) => ({ en, ko });
  const PATHS = [
    { id: 'exam', title: L('Exam path: Korean units I, II, III and V', '기말 대비 길: I · II · III · V 단원'),
      intro: L('For each unit: a data card, a climate graph, then the places on the map. About 20 minutes per unit. Other cards for each unit are on the data cards page.',
               '단원마다 자료 카드, 기후 그래프, 지도에서 지명 찾기 순서로 봅니다. 단원마다 20분 정도 걸립니다. 단원의 다른 카드는 자료 카드 화면에 있습니다.'),
      stages: [
        [L('I · Living in a connected world', 'I · 세계화 시대, 지리의 힘'), [['cards.html#world-location-1', 'card'], ['cards.html#world-scale-1', 'card'], ['cards.html#world-localization-1', 'card'], ['cards.html#world-glocal-1', 'card'], ['explore.html#t-globalization', L('Map: globalization', '지도: 세계화')]]],
        [L('II · Asia', 'II · 아시아'), [['cards.html#as-monsoon-1', 'card'], ['cards.html#as-population-1', 'card'], ['climate.html#mumbai', 'city'], ['explore.html#r-asia/q', L('Find the places: Asia', '지명 찾기 연습: 아시아')]]],
        [L('III · Europe', 'III · 유럽'), [['cards.html#eu-climate-1', 'card'], ['cards.html#eu-integration-1', 'card'], ['climate.html#london', 'city'], ['explore.html#r-europe/q', L('Find the places: Europe', '지명 찾기 연습: 유럽')]]],
        [L('V · The Americas', 'V · 아메리카'), [['cards.html#am-highland-1', 'card'], ['cards.html#am-tnc-1', 'card'], ['climate.html#quito', 'city'], ['explore.html#r-americas/q', L('Find the places: the Americas', '지명 찾기 연습: 아메리카')]]],
      ] },
    { id: 'trip', title: L('World trip: five regions', '세계 여행 길: 다섯 지역'),
      intro: L('For each region: two climate graphs, one or two cards and the landforms.', '지역마다 기후 그래프 두 개와 카드 한두 장, 지형을 봅니다.'),
      stages: [
        [L('Asia', '아시아'), [['climate.html#ulaanbaatar', 'city'], ['climate.html#singapore', 'city'], ['cards.html#as-religion-1', 'card'], ['explore.html#r-asia', L('Landforms of Asia', '아시아의 지형')], ['explore.html#r-asia/q', L('Find the places: Asia', '지명 찾기 연습: 아시아')]]],
        [L('Europe', '유럽'), [['climate.html#oslo', 'city'], ['climate.html#athens', 'city'], ['cards.html#eu-integration-1', 'card'], ['explore.html#r-europe', L('Landforms of Europe', '유럽의 지형')], ['explore.html#r-europe/q', L('Find the places: Europe', '지명 찾기 연습: 유럽')]]],
        [L('Africa', '아프리카'), [['climate.html#cairo', 'city'], ['climate.html#kinshasa', 'city'], ['cards.html#af-young-1', 'card'], ['cards.html#af-sahel-1', 'card'], ['explore.html#r-africa', L('Landforms of Africa', '아프리카의 지형')], ['explore.html#r-africa/q', L('Find the places: Africa', '지명 찾기 연습: 아프리카')]]],
        [L('The Americas', '아메리카'), [['climate.html#manaus', 'city'], ['climate.html#montreal', 'city'], ['cards.html#am-migration-1', 'card'], ['explore.html#r-americas', L('Landforms of the Americas', '아메리카의 지형')], ['explore.html#r-americas/q', L('Find the places: the Americas', '지명 찾기 연습: 아메리카')]]],
        [L('Oceania and the poles', '오세아니아와 극지방'), [['climate.html#alice-springs', 'city'], ['climate.html#mcmurdo-sound', 'city'], ['cards.html#oc-islands-1', 'card'], ['cards.html#po-antarctica-1', 'card'], ['explore.html#r-oceania_polar/v-antarctic', L('Antarctica on the map', '지도에서 남극 보기')], ['explore.html#r-oceania_polar/q', L('Find the places: Oceania and the poles', '지명 찾기 연습: 오세아니아와 극지방')]]],
      ] },
    { id: 'look', title: L('Look around', '둘러보기 길'),
      intro: L('Learn to read a climate graph, then make a map and link the world to your country.',
               '기후 그래프 읽는 법부터 익히고, 지도를 직접 만들고, 내 나라와 세계를 이어 봅니다.'),
      stages: [
        [null, [['climate.html#read', L('How to read a climate graph', '기후 그래프 읽는 법')], ['climate.html#mystery', L('The mystery continent', '이름 없는 대륙')], ['mapmaker.html', L('Make a map and question it', '지도 만들고 따져 보기')], ['stories.html', L('My country and the world', '내 나라와 세계')]]],
      ] },
  ];
  const KEY = 'atlas.path.done';
  const seen = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} };
  const DATA = { cards: {}, cities: {} };

  function label(href, kind) {
    const id = href.split('#')[1];
    if (kind === 'card') { const c = DATA.cards[id]; return c ? Atlas.t(L('Card: ', '카드: ')) + Atlas.t(c.title) : null; }
    if (kind === 'city') { const c = DATA.cities[id]; return c ? Atlas.t(L('Climate graph: ', '기후 그래프: ')) + Atlas.t(c) : null; }
    return Atlas.t(kind);
  }

  function draw() {
    const box = document.getElementById('paths');
    if (!box) return;
    const done = new Set(seen());
    box.innerHTML = PATHS.map(p => {
      const items = p.stages.map(([stage, steps]) =>
        (stage ? '<p class="stage">' + Atlas.esc(Atlas.t(stage)) + '</p>' : '') + '<ol>' +
        steps.map(([h, k]) => {
          const l = label(h, k);
          return l ? '<li><a href="' + h + '"' + (done.has(h) ? ' class="done"' : '') + '>' + Atlas.esc(l) + '</a></li>' : '';
        }).join('') + '</ol>').join('');
      return '<section class="path" aria-labelledby="pt-' + p.id + '"><h3 id="pt-' + p.id + '">' + Atlas.esc(Atlas.t(p.title)) + '</h3>' +
        '<p class="small muted">' + Atlas.esc(Atlas.t(p.intro)) + '</p>' + items +
        '<button type="button" class="reset" data-p="' + p.id + '">' + Atlas.esc(Atlas.t(L('Clear ticks', '표시 지우기'))) + '</button></section>';
    }).join('');
    box.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      const s = new Set(seen()); s.add(a.getAttribute('href')); save([...s]);
    }));
    box.querySelectorAll('.reset').forEach(b => b.addEventListener('click', () => {
      const p = PATHS.find(x => x.id === b.dataset.p);
      const mine = new Set(p.stages.flatMap(s => s[1].map(x => x[0])));
      save(seen().filter(h => !mine.has(h)));
      draw();
    }));
  }

  Atlas.paths = PATHS;
  Promise.all([Atlas.json('data/cards.json'), Atlas.json('data/cities.json')]).then(([cj, cd]) => {
    (cj.cards || cj).forEach(c => { DATA.cards[c.id] = c; });
    cd.cities.forEach(c => { DATA.cities[c.id] = c; });
    draw(); Atlas.onLang(draw);
  }).catch(() => {});
})();
