/* Regions and themes: the two doors into the atlas.
   Region boxes are [west, south, east, north] in degrees; a country belongs to the region
   whose box holds its centroid (with a few explicit exceptions by ISO numeric id). */
window.CATALOG = {
  regions: [
    { id: 'asia', name: { en: 'Asia', ko: '아시아' }, box: [25, -11, 150, 56],
      q: { en: 'Why do so many people live in Asia, and how are their lives changing?', ko: '아시아에는 왜 이렇게 많은 사람이 살고, 그 삶은 어떻게 바뀌고 있을까?' },
      themes: ['climate', 'religion_culture', 'population', 'industry_tnc'] },
    { id: 'europe', name: { en: 'Europe', ko: '유럽' }, box: [-25, 35, 45, 72],
      q: { en: 'What changes when countries join together?', ko: '나라끼리 하나로 묶이면 무엇이 바뀔까?' },
      themes: ['climate', 'integration', 'globalization'] },
    { id: 'africa', name: { en: 'Africa', ko: '아프리카' }, box: [-20, -36, 52, 37],
      q: { en: 'How did Africa become the youngest continent, and what is that youth changing?', ko: '아프리카는 어떻게 가장 젊은 대륙이 되었고, 그 젊음은 무엇을 바꾸고 있을까?' },
      themes: ['climate', 'population', 'sustainability'] },
    { id: 'americas', name: { en: 'The Americas', ko: '아메리카' }, box: [-170, -56, -34, 72],
      q: { en: 'How did people from many places build new cultures and new industries?', ko: '여러 곳에서 온 사람들은 어떻게 새로운 문화와 산업을 만들었을까?' },
      themes: ['climate', 'religion_culture', 'industry_tnc'] },
    { id: 'oceania_polar', name: { en: 'Oceania and the poles', ko: '오세아니아와 극지방' }, box: [110, -50, 180, 0],
      q: { en: 'How do people live with great distances and extreme cold?', ko: '먼 거리와 혹독한 추위 속에서 사람들은 어떻게 살아갈까?' },
      themes: ['climate', 'sustainability', 'globalization'] },
  ],
  // ISO 3166-1 numeric ids placed by hand (centroid rule gets them wrong or they matter in two units)
  regionOverrides: { '643': 'europe', '792': 'asia', '304': 'oceania_polar', '010': 'oceania_polar', '398': 'asia', '818': 'africa',
    '364': 'asia', '368': 'asia', '682': 'asia', '887': 'asia', '512': 'asia', '784': 'asia', '634': 'asia', '414': 'asia', '048': 'asia',
    '376': 'asia', '400': 'asia', '422': 'asia', '760': 'asia', '196': 'asia', '268': 'asia', '051': 'asia', '031': 'asia',
    '352': 'europe', '598': 'oceania_polar', '242': 'oceania_polar', '090': 'oceania_polar', '548': 'oceania_polar', '540': 'oceania_polar', '554': 'oceania_polar' },
  themes: [
    { id: 'climate', name: { en: 'Climate', ko: '기후' },
      q: { en: 'Why is it hot, cold, wet or dry here, and how do people adapt?', ko: '이곳은 왜 덥고 춥고 습하고 건조할까, 사람들은 어떻게 적응할까?' } },
    { id: 'population', name: { en: 'Population', ko: '인구' },
      q: { en: 'Where do people live, and why are some countries ageing fast?', ko: '사람들은 어디에 모여 살고, 어떤 나라는 왜 빨리 늙어 갈까?' } },
    { id: 'religion_culture', name: { en: 'Religion and culture', ko: '종교와 문화' },
      q: { en: 'How do beliefs and mixed cultures shape daily life?', ko: '종교와 섞인 문화는 일상을 어떻게 바꿀까?' } },
    { id: 'industry_tnc', name: { en: 'Industry and global companies', ko: '산업과 초국적 기업' },
      q: { en: 'Why does a company design in one country and build in another?', ko: '기업은 왜 한 나라에서 설계하고 다른 나라에서 만들까?' } },
    { id: 'integration', name: { en: 'Joining together', ko: '지역 통합' },
      q: { en: 'What do countries gain and give up when they join a union?', ko: '나라들이 하나로 묶이면 무엇을 얻고 무엇을 내줄까?' } },
    { id: 'globalization', name: { en: 'Globalization and local identity', ko: '세계화와 지역화' },
      q: { en: 'When the world shares more, how does a place stay special?', ko: '세계가 더 많이 닮아 갈 때, 한 장소는 어떻게 특별함을 지킬까?' } },
    { id: 'sustainability', name: { en: 'Sustainability', ko: '지속 가능성' },
      q: { en: 'How can we use land, water and resources without using them up?', ko: '땅과 물과 자원을 다 써 버리지 않고 쓰려면 어떻게 해야 할까?' } },
  ],
};
CATALOG.regionOf = function (feature, d3) {
  if (CATALOG.regionOverrides[feature.id]) return CATALOG.regionOverrides[feature.id];
  const [lon, lat] = d3.geoCentroid(feature);
  if (lat < -60) return 'oceania_polar';
  for (const r of CATALOG.regions) {
    const [w, s, e, n] = r.box;
    if (lon >= w && lon <= e && lat >= s && lat <= n) return r.id;
  }
  return null;
};
