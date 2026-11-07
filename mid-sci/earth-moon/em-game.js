/* em-game.js — "하늘 관측대 미션" : 평가요소 5개 = 스테이지 5개 + 보스(수행평가 리허설)
 * 그림 문제 중심(그림을 보고 판단 → 시험에서 그림 그리기로 연결). 매 문항 해설 필수.
 * 진행도는 localStorage(실패해도 동작). 문항은 생성기로 매번 섞여 나옴.
 */
(function () {
  'use strict';
  var E = window.EM, D2R = E.D2R, KEY = 'em-game-v1';

  /* ── 유틸 ── */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { var k = typeof x === 'object' ? JSON.stringify(x) : x; if (!s[k]) { s[k] = 1; o.push(x); } }); return o; }
  // 보기 텍스트 4지선다
  function mc(q, right, wrongs, why, fig) {
    var opts = shuffle([right].concat(shuffle(uniq(wrongs.filter(function (w) { return w !== right; }))).slice(0, 3)));
    return { q: q, fig: fig, opts: opts.map(function (t) { return { t: t }; }), ans: opts.indexOf(right), why: why };
  }
  // 그림 보기 4지선다 (e = 이각)
  function mcPic(q, rightE, wrongEs, why, fig) {
    var es = shuffle([rightE].concat(shuffle(wrongEs).slice(0, 3)));
    return { q: q, fig: fig, pic: true, opts: es.map(function (e) { return { e: e }; }), ans: es.indexOf(rightE), why: why };
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { stars: {} }; } catch (e) { return { stars: {} }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  /* ── 그림 그리기 ── */
  function figEarth(T) { return { ratio: 0.6, draw: function (c, w, h) { E.spaceBg(c, w, h, 2); E.earthTop(c, w * 0.42, h * 0.54, Math.min(h * 0.27, w * 0.17), T, { obsLabel: '?' }); } }; }
  function figSky(dir, hrs) { return { ratio: 0.62, draw: function (c, w, h) { E.skyTrails(c, w, h, dir, hrs, { noCompass: true, hideTitle: true }); E.label(c, '? 쪽 하늘', w / 2, h - 14, E.C.accent, 13); } }; }
  function figSkyLabeled(dir, hrs) { return { ratio: 0.62, draw: function (c, w, h) { E.skyTrails(c, w, h, dir, hrs, { angle: true, arrows: false }); } }; }
  function figMoon(e) { return { ratio: 0.45, draw: function (c, w, h) { E.spaceBg(c, w, h, 5); E.moonPhase(c, w / 2, h / 2, h * 0.36, e); } }; }
  function figOrbit(e) { return { ratio: 0.8, draw: function (c, w, h) { window.EMLab.orbitScene(c, w, h, e, { sight: true }); E.label(c, '위에서 본 모습 · 햇빛은 오른쪽에서', 10, 14, E.C.muted, 11, 'left'); } }; }
  function figEclipse(kind) {
    return { ratio: 0.5, draw: function (c, w, h) {
      var cx = w / 2, cy = h / 2, r = h * 0.25;
      if (kind === 'solar') {
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a6fb8'); g.addColorStop(1, '#8fc4f0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        E.sun(c, cx, cy, r); c.fillStyle = '#0d0f14'; c.beginPath(); c.arc(cx + r * 1.1, cy - r * 0.15, r * 1.03, 0, 7); c.fill();
      } else {
        E.spaceBg(c, w, h, 22); var m = r;
        c.fillStyle = '#f0e6c8'; c.beginPath(); c.arc(cx, cy, m, 0, 7); c.fill();
        c.save(); c.beginPath(); c.arc(cx, cy, m, 0, 7); c.clip(); c.fillStyle = 'rgba(70,22,14,.92)'; c.beginPath(); c.arc(cx - m * 2.9, cy + m * 0.2, m * 2.6, 0, 7); c.fill(); c.restore();
      }
      E.label(c, '← 동', 30, h - 12, '#fff', 11); E.label(c, '서 →', w - 30, h - 12, '#fff', 11);
    } };
  }

  /* ── 문항 생성기 (스테이지별) ── */
  var PH = [ // e, 이름, 날짜, 모양
    { e: 30, n: '초승달', d: '음력 2~3일경', s: '오른쪽이 가늘게 밝음' }, { e: 90, n: '상현달', d: '음력 7~8일경', s: '오른쪽 반원' },
    { e: 180, n: '보름달(망)', d: '음력 15일경', s: '둥근 원' }, { e: 270, n: '하현달', d: '음력 22~23일경', s: '왼쪽 반원' },
    { e: 330, n: '그믐달', d: '음력 27~28일경', s: '왼쪽이 가늘게 밝음' }
  ];
  var ALL_E = [30, 90, 180, 270, 330, 135, 225];
  var G = {
    s1: [
      function () { return mc('지구의 자전 방향은?', '서쪽 → 동쪽', ['동쪽 → 서쪽', '북쪽 → 남쪽', '남쪽 → 북쪽'], '지구는 <b>서→동</b>으로 자전해요. 그래서 하늘의 천체는 반대로 <b>동→서</b>로 움직여 보여요.'); },
      function () { return mc('북극 위에서 내려다보면 지구는 어느 방향으로 돌까요?', '시계 반대 방향', ['시계 방향', '계절마다 바뀐다', '돌지 않는다'], '북극 위에서 보면 <b>시계 반대 방향</b>. (서→동과 같은 말이에요)'); },
      function () { var t = pick([2, 3, 4, 5, 6, 8]); return mc('천체는 ' + t + '시간 동안 몇 도 움직여 보일까요?', 15 * t + '°', [10 * t + '°', 30 * t + '°', (15 * t + 15) + '°', 12 * t + '°'], '하루 24시간에 360° → <b>1시간에 15°</b>. 15 × ' + t + ' = <b>' + 15 * t + '°</b>'); },
      function () {
        var T = pick([6, 12, 18, 0]), L = { 6: '오전 6시 (해 뜰 무렵)', 12: '정오 12시', 18: '오후 6시 (해 질 무렵)', 0: '자정 (밤 12시)' };
        var W = { 6: '밤(왼쪽) → 낮(오른쪽)으로 막 넘어가는 곳 = 해 뜰 무렵.', 12: '태양을 정면으로 마주 보는 곳 = 정오.', 18: '낮 → 밤으로 막 넘어가는 곳 = 해 질 무렵.', 0: '태양 반대편 한가운데 = 자정.' };
        return mc('지구는 시계 반대 방향으로 자전해요. 그림 속 관측자(?)의 시각은?', L[T], [L[6], L[12], L[18], L[0]], W[T] + ' 지구가 시계 반대로 도는 걸 떠올리면 쉬워요.', figEarth(T));
      },
      function () { return mc('태양이 동쪽에서 떠서 서쪽으로 지는 것처럼 보이는 까닭은?', '지구가 서→동으로 자전하기 때문', ['태양이 지구 주위를 돌기 때문', '지구가 태양 주위를 공전하기 때문', '달이 지구 주위를 돌기 때문'], '하늘이 도는 게 아니라 <b>내가(지구가) 도는</b> 거예요 → 천체의 <b>겉보기 운동</b>.'); },
      function () { return mc('우리나라에서 정오에 태양은 어느 쪽 하늘에 있을까요?', '남쪽 하늘 (가장 높음)', ['북쪽 하늘', '동쪽 하늘', '서쪽 하늘'], '태양은 동쪽에서 떠서 <b>남쪽 하늘</b>을 지나 서쪽으로 져요. 정오에 남쪽에서 가장 높아요(남중).'); },
      function () { return mc('지구 자전 때문에 천체가 움직여 보이는 방향은?', '동 → 서', ['서 → 동', '남 → 북', '북 → 남'], '자전(서→동)의 <b>반대</b> 방향 → 천체는 <b>동→서</b>.'); }
    ],
    s2: [
      function () {
        var d = pick(['N', 'E', 'S', 'W']), nm = { N: '북쪽 하늘', E: '동쪽 하늘', S: '남쪽 하늘', W: '서쪽 하늘' };
        var why = { N: '한 점(북극성)을 중심으로 <b>동심원</b>을 그리면 북쪽 하늘.', E: '지평선에서 <b>오른쪽 위로 비스듬히</b> 올라가면 동쪽 하늘.', S: '지평선과 나란한 <b>둥근 호</b>(왼→오)면 남쪽 하늘.', W: '<b>오른쪽 아래로 비스듬히</b> 내려가면 서쪽 하늘.' };
        return mc('사진기 셔터를 4시간 열어 찍은 별의 궤적이에요. 어느 방향 하늘일까요? (노란 화살표 = 별이 가는 방향)', nm[d], [nm.N, nm.E, nm.S, nm.W], why[d], figSky(d, 4));
      },
      function () { return mc('북쪽 하늘의 별은 무엇을 중심으로 돌까요?', '북극성', ['태양', '북두칠성', '달'], '지구 자전축을 북쪽으로 늘리면 <b>북극성</b> 근처. 그래서 북극성이 회전 중심이고 거의 안 움직여요.'); },
      function () { return mc('북쪽 하늘에서 별은 어느 방향으로 돌까요?', '시계 반대 방향', ['시계 방향', '위에서 아래로 직선', '움직이지 않는다'], '북쪽 하늘의 별은 북극성을 중심으로 <b>시계 반대 방향</b>. 시험 그림에 화살표 방향 꼭!'); },
      function () { var t = pick([2, 3, 4, 6]); return mc('북쪽 하늘을 ' + t + '시간 동안 찍었어요. 별이 그린 호의 중심각은?', 15 * t + '°', [10 * t + '°', 30 * t + '°', 15 * t + 30 + '°', 20 * t + '°'], '1시간에 15° → 15 × ' + t + ' = <b>' + 15 * t + '°</b>', figSkyLabeled('N', t)); },
      function () { var a = pick([30, 45, 60, 90]); return mc('북극성 둘레 별의 궤적이 ' + a + '°였어요. 몇 시간 동안 찍었을까요?', a / 15 + '시간', [a / 15 + 1 + '시간', a / 30 + '시간', a / 10 + '시간', a / 15 + 2 + '시간'], a + ' ÷ 15 = <b>' + a / 15 + '시간</b>'); },
      function () {
        var k = pick(['E', 'S', 'W']), R = { E: '오른쪽 위로 비스듬히 떠오른다', S: '지평선과 나란하게 왼쪽(동)→오른쪽(서)으로 움직인다', W: '오른쪽 아래로 비스듬히 진다' }, nm = { E: '동쪽', S: '남쪽', W: '서쪽' };
        return mc(nm[k] + ' 하늘에서 별은 어떻게 움직일까요?', R[k], [R.E, R.S, R.W, '북극성 중심으로 시계 방향으로 돈다'], '동쪽: 오른쪽 위 ↗ / 남쪽: 왼→오 호 / 서쪽: 오른쪽 아래 ↘ / 북쪽: 시계 반대 원.');
      },
      function () { return mc('별의 일주 운동이 일어나는 까닭은?', '지구의 자전', ['지구의 공전', '달의 공전', '별이 실제로 움직여서'], '“일주(하루에 한 바퀴)” → 하루 주기 = <b>자전</b>.'); }
    ],
    s3: [
      function () { var p = pick(PH); return mc('이 달의 이름과 음력 날짜는?', p.n + ' · ' + p.d, PH.map(function (x) { return x.n + ' · ' + x.d; }), '<b>' + p.n + '</b> — ' + p.s + ', ' + p.d + '.', figMoon(p.e)); },
      function () { var p = pick(PH); return mcPic('<b>' + p.n + '</b>을(를) 고르세요.', p.e, ALL_E.filter(function (e) { return e !== p.e; }), p.n + ' = ' + p.s + '.'); },
      function () { var p = pick(PH); return mc(p.d.replace('경', '') + '경에 볼 수 있는 달은?', p.n, PH.map(function (x) { return x.n; }).concat(['삭']), p.d + ' → <b>' + p.n + '</b> (' + p.s + ')'); },
      function () { var p = pick(PH); return mc(p.n + '은(는) 음력 며칠경?', p.d, PH.map(function (x) { return x.d; }), '<b>' + p.n + '</b> → ' + p.d); },
      function () {
        var S = [['해 진 직후 서쪽 하늘에 낮게 뜬 가는 달', '초승달'], ['해 진 직후 남쪽 하늘에 뜬 반달', '상현달'], ['새벽 남쪽 하늘에 뜬 반달', '하현달'], ['해 뜨기 직전 동쪽 하늘의 가는 달', '그믐달'], ['해가 질 때 동쪽에서 떠오르는 둥근 달', '보름달']];
        var s = pick(S); return mc(s[0] + '은?', s[1], ['초승달', '상현달', '보름달', '하현달', '그믐달'], '초승(저녁 서) · 상현(저녁 남) · 보름(저녁 동→밤새) · 하현(새벽 남) · 그믐(새벽 동)');
      },
      function () { return mc('달의 위상 변화 순서로 옳은 것은?', '삭 → 초승달 → 상현달 → 망 → 하현달 → 그믐달', ['삭 → 상현달 → 초승달 → 망 → 그믐달 → 하현달', '망 → 상현달 → 초승달 → 삭 → 그믐달 → 하현달', '삭 → 그믐달 → 하현달 → 망 → 상현달 → 초승달'], '오른쪽부터 차올라(초승→상현→망) 오른쪽부터 줄어들어요(하현→그믐).'); },
      function () { return mc('상현달과 하현달의 차이로 옳은 것은?', '상현달은 오른쪽, 하현달은 왼쪽 반원이 밝다', ['상현달은 왼쪽, 하현달은 오른쪽 반원이 밝다', '둘 다 오른쪽이 밝다', '모양은 같고 크기만 다르다'], '<b>상현 = 오른쪽</b>(음력 7~8일), <b>하현 = 왼쪽</b>(음력 22~23일).'); }
    ],
    s4: [
      function () {
        var e = pick([0, 45, 90, 180, 270, 315]), nm = { 0: '삭', 45: '초승달', 90: '상현달', 180: '보름달', 270: '하현달', 315: '그믐달' };
        return mcPic('그림 위치에 있는 달은 지구에서 어떤 모양으로 보일까요?', e, [0, 30, 90, 180, 270, 330, 135, 225].filter(function (x) { return Math.abs(x - e) > 20; }), '이 위치 = <b>' + nm[e] + '</b>. 달의 밝은 반쪽(태양 쪽) 중 <b>지구를 향한 부분</b>만 보여요.', figOrbit(e));
      },
      function () { return mc('달이 밝게 보이는 까닭은?', '햇빛을 반사하기 때문', ['스스로 빛을 내기 때문', '지구의 불빛을 반사하기 때문', '별빛을 모으기 때문'], '달은 <b>스스로 빛을 못 내요</b>. 햇빛을 반사해서 밝게 보여요. 답안 첫 줄에 꼭!'); },
      function () { return mc('달의 위상이 변하는 까닭은?', '달이 공전하며 태양·지구·달의 상대적 위치가 달라지기 때문', ['지구의 그림자가 달을 가리기 때문', '달이 스스로 밝기를 바꾸기 때문', '구름이 달을 가리기 때문'], '“지구 그림자가 가려서”는 <b>월식</b>이에요. 위상 변화는 <b>위치 관계</b> 때문!'); },
      function () { return mc('보름달(망)일 때 세 천체의 배열은?', '태양 - 지구 - 달', ['태양 - 달 - 지구', '지구 - 태양 - 달', '지구를 중심으로 직각'], '보름달은 지구에서 볼 때 태양 <b>반대편</b>에 있어요 → 태양-지구-달.'); },
      function () { return mc('상현달·하현달일 때 태양·지구·달의 배열은?', '지구를 중심으로 태양과 달이 직각(90°)', ['태양 - 달 - 지구 일직선', '태양 - 지구 - 달 일직선', '셋이 겹쳐 있다'], '반달 = <b>직각</b>. 일직선은 삭(태양-달-지구)과 망(태양-지구-달).'); },
      function () { return mc('달의 공전 방향은?', '서 → 동 (북극 위에서 보면 시계 반대)', ['동 → 서 (시계 방향)', '북 → 남', '공전하지 않는다'], '자전과 같은 <b>서→동</b>. 그래서 같은 시각에 보면 달이 매일 동쪽으로 약 13°씩 옮겨가요.'); },
      function () { return mc('달의 위상이 한 바퀴 변하는 데 걸리는 시간은?', '약 29.5일 (약 한 달)', ['약 1일', '약 7일', '약 365일'], '삭 → 삭이 약 <b>29.5일</b>. 그래서 음력 한 달과 거의 같아요.'); },
      function () { return mc('매일 같은 시각(저녁)에 달을 보면 위치가 어떻게 바뀔까요?', '서쪽에서 동쪽으로 하루 약 13°씩 옮겨간다', ['동쪽에서 서쪽으로 하루 약 15°씩 옮겨간다', '항상 같은 자리에 있다', '남쪽에서 북쪽으로 옮겨간다'], '초승달(서) → 상현달(남) → 보름달(동). 달이 <b>서→동 공전</b>하기 때문.'); },
      function () { return mc('우주에서 보면 달의 밝은 부분은?', '항상 태양 쪽 반쪽이 밝다', ['항상 전체가 밝다', '항상 지구 쪽 반쪽이 밝다', '날마다 크기가 바뀐다'], '우주에서 보면 달은 언제나 <b>반쪽(태양 쪽)</b>이 밝아요. 우리가 보는 부분만 달라질 뿐.'); }
    ],
    s5: [
      function () { var s = Math.random() < 0.5; return mc((s ? '일식' : '월식') + '이 일어날 때 세 천체의 배열은?', s ? '태양 - 달 - 지구' : '태양 - 지구 - 달', ['태양 - 달 - 지구', '태양 - 지구 - 달', '달 - 태양 - 지구', '지구를 중심으로 직각'], '일식: 달이 가운데서 <b>태양을 가림</b>. 월식: 지구가 가운데, 달이 <b>지구 그림자</b>에 들어감.'); },
      function () { var s = Math.random() < 0.5; return mc((s ? '일식' : '월식') + '이 일어날 때 달의 위상은?', s ? '삭' : '망(보름달)', ['삭', '망(보름달)', '상현달', '하현달'], '일식 = <b>삭</b>(태양-달-지구), 월식 = <b>망</b>(태양-지구-달). 거꾸로 쓰는 실수 1순위!'); },
      function () { return mc('일식 때 태양은 어느 쪽부터 가려질까요?', '태양의 오른쪽(서쪽)부터', ['태양의 왼쪽(동쪽)부터', '태양의 위쪽부터', '한가운데부터'], '달이 하늘에서 오른쪽(서)→왼쪽(동)으로 움직이며 태양을 덮어요 → <b>태양의 오른쪽(서쪽)부터</b>.', figEclipse('solar')); },
      function () { return mc('월식 때 달은 어느 쪽부터 가려질까요?', '달의 왼쪽(동쪽)부터', ['달의 오른쪽(서쪽)부터', '달의 아래쪽부터', '한가운데부터'], '달이 서→동으로 움직여 지구 그림자에 들어가니까, 앞장선 <b>왼쪽(동쪽)</b>이 먼저 가려져요.', figEclipse('lunar')); },
      function () { return mc('개기일식을 볼 수 있는 곳은?', '달의 본그림자가 생기는 지역', ['달의 반그림자가 생기는 지역', '밤인 모든 지역', '지구 어디서나'], '본그림자 → <b>개기일식</b>, 반그림자 → <b>부분일식</b>. 본그림자는 좁아서 아주 좁은 지역에서만 보여요.'); },
      function () { return mc('월식을 관찰할 수 있는 지역은?', '밤이 되는 모든 지역', ['달의 본그림자가 생기는 좁은 지역', '낮인 지역', '적도 근처만'], '월식은 달 자체가 어두워지는 현상이라 <b>달이 보이는(밤인) 곳이면 어디서나</b> 보여요.'); },
      function () { return mc('부분일식이 관찰되는 지역은?', '달의 반그림자가 생기는 지역', ['달의 본그림자가 생기는 지역', '밤인 지역', '그림자가 없는 지역'], '<b>반그림자 → 부분일식</b>. 태양이 일부만 가려져 보여요.'); },
      function () { return mc('개기월식 때 달은 어떻게 보일까요?', '붉은빛을 띤다', ['완전히 사라진다', '파랗게 빛난다', '더 밝아진다'], '지구 대기를 지나며 굴절된 <b>붉은빛</b>이 그림자 속 달을 비춰요.'); },
      function () { var s = Math.random() < 0.5; return mc('이 사진은 무엇일까요?', s ? '일식' : '월식', ['일식', '월식', '상현달', '그믐달'], s ? '낮하늘에서 <b>태양</b>이 검은 원(달)에 가려짐 → 일식. 오른쪽부터 가려지는 중!' : '밤하늘의 <b>보름달</b>이 지구 그림자(둥근 경계)에 가려짐 → 월식. 왼쪽부터!', figEclipse(s ? 'solar' : 'lunar')); },
      function () { return mc('삭·망 때마다 일식·월식이 일어나지 않는 까닭은?', '달의 공전 궤도면이 지구 공전 궤도면에 약 5° 기울어져서', ['달이 너무 작아서', '지구가 자전해서', '태양이 너무 멀어서'], '(심화) 궤도가 <b>약 5° 기울어져</b> 있어 세 천체가 정확히 일직선이 되는 때가 드물어요.'); }
    ]
  };
  var STAGES = [
    { id: 's1', ic: '🌏', t: '자전 탐험', ds: '평가요소 ① 자전과 겉보기 운동', n: 6 },
    { id: 's2', ic: '✨', t: '별의 궤적', ds: '평가요소 ② 별의 일주운동', n: 6 },
    { id: 's3', ic: '🌙', t: '달 모양 도감', ds: '평가요소 ③ 날짜·모양·이름', n: 6 },
    { id: 's4', ic: '🔭', t: '위상의 비밀', ds: '평가요소 ④ 위상변화 원리', n: 6 },
    { id: 's5', ic: '🌑', t: '그림자 사냥', ds: '평가요소 ⑤ 일식과 월식', n: 7 },
    { id: 'boss', ic: '🏆', t: '수행평가 리허설', ds: '전 범위 12문항 · 하트 3개', n: 12, boss: true }
  ];
  var RANKS = [[0, '견습 관측자'], [4, '별지기'], [8, '달 탐정'], [12, '그림자 사냥꾼'], [16, '천문대장']];

  function buildQs(st) {
    var gens = st.boss ? [].concat(G.s1, G.s2, G.s3, G.s4, G.s5) : G[st.id];
    var order = shuffle(gens), out = [];
    for (var i = 0; i < st.n; i++) out.push(order[i % order.length]());
    return out;
  }

  /* ── 화면 ── */
  function render(mount) {
    var S = load(), alive = true;
    function totalStars() { return STAGES.reduce(function (a, s) { return a + (S.stars[s.id] || 0); }, 0); }
    function rank() { var t = totalStars(), r = RANKS[0][1]; RANKS.forEach(function (x) { if (t >= x[0]) r = x[1]; }); return r; }
    function unlocked(i) { if (i === 0) return true; if (STAGES[i].boss) return STAGES.slice(0, 5).every(function (s) { return S.stars[s.id] > 0; }); return (S.stars[STAGES[i - 1].id] || 0) > 0; }

    function map() {
      var html = '<div class="sec"><div class="eyebrow"><span class="tag">GAME</span>하늘 관측대 미션</div><h2 class="title">🎮 별 18개를 모아 천문대장 되기</h2>' +
        '<p class="lede">스테이지 = 수행평가 평가요소. 틀리면 하트가 줄고, 매 문제마다 <b>왜</b> 그런지 해설이 나와요. 연속 정답이면 콤보 보너스!</p></div>' +
        '<div class="rank card"><div class="r1">현재 등급 · 별 ' + totalStars() + ' / 18</div><div class="r2">' + rank() + '</div></div><div class="map" style="margin-top:12px">';
      STAGES.forEach(function (s, i) {
        var st = S.stars[s.id] || 0, ok = unlocked(i);
        html += '<button class="st' + (s.boss ? ' boss' : '') + '" data-s="' + i + '"' + (ok ? '' : ' disabled') + '><span class="ic">' + (ok ? s.ic : '🔒') + '</span>' +
          '<span><div class="tt">' + s.t + '</div><div class="ds">' + s.ds + (ok ? '' : (s.boss ? ' · 5개 스테이지를 모두 깨면 열려요' : ' · 앞 스테이지를 깨면 열려요')) + '</div></span>' +
          '<span class="sr">' + '★★★'.slice(0, st) + '<span style="opacity:.25">' + '★★★'.slice(0, 3 - st) + '</span></span></button>';
      });
      html += '</div><p class="lede" style="margin-top:14px;font-size:13px">💡 막히면 해당 장(1~5)의 시뮬을 다시 만져보고 오세요. 게임은 몇 번이든 다시 할 수 있어요.</p>';
      mount.innerHTML = html;
      mount.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { play(STAGES[+b.getAttribute('data-s')]); }; });
    }

    function play(st) {
      var qs = buildQs(st), i = 0, hearts = 3, combo = 0, score = 0, miss = 0;
      function q() {
        if (!alive) return;
        var Q = qs[i];
        mount.innerHTML = '<div class="stage pop"><div class="g-hud"><span>' + st.ic + ' ' + st.t + '</span><span class="g-combo">' + (combo >= 2 ? '🔥 ' + combo + '콤보' : '') + '</span>' +
          '<span class="g-hearts">' + '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts) + '</span></div>' +
          '<div class="g-prog"><i style="width:' + (i / qs.length * 100) + '%"></i></div><div class="g-body">' +
          '<div class="lede" style="font-size:12px;font-weight:800">문제 ' + (i + 1) + ' / ' + qs.length + ' · 점수 ' + score + '</div>' +
          '<p class="g-q">' + Q.q + '</p>' + (Q.fig ? '<div class="g-fig"><canvas data-fig></canvas></div>' : '') +
          '<div class="g-opts' + (Q.pic ? ' grid4' : '') + '">' + Q.opts.map(function (o, k) { return '<button class="g-opt' + (Q.pic ? ' pic' : '') + '" data-k="' + k + '">' + (Q.pic ? '<canvas data-pc="' + k + '"></canvas>' : o.t) + '</button>'; }).join('') + '</div>' +
          '<div class="g-fb" data-fb></div></div></div>';
        if (Q.fig) { var cv = mount.querySelector('[data-fig]'), F = E.fit(cv, Q.fig.ratio, 360); Q.fig.draw(F.ctx, F.w, F.h); }
        if (Q.pic) mount.querySelectorAll('[data-pc]').forEach(function (cv) {
          var k = +cv.getAttribute('data-pc'), c = E.setup(cv, 78, 78); c.fillStyle = '#070b16'; c.fillRect(0, 0, 78, 78);
          var e = Q.opts[k].e; if (e === 0) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(39, 39, 30, 0, 7); c.stroke(); E.label(c, '안 보임', 39, 39, '#93a3bb', 11); } else E.moonPhase(c, 39, 39, 30, e);
        });
        mount.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { answer(+b.getAttribute('data-k')); }; });
      }
      function answer(k) {
        var Q = qs[i], ok = k === Q.ans, fb = mount.querySelector('[data-fb]');
        mount.querySelectorAll('[data-k]').forEach(function (b) { var kk = +b.getAttribute('data-k'); b.disabled = true; if (kk === Q.ans) b.classList.add('right'); else if (kk === k) b.classList.add('wrong'); });
        if (ok) { combo++; score += 100 + Math.min(5, combo - 1) * 20; } else { combo = 0; hearts--; miss++; mount.querySelector('.stage').classList.add('shake'); }
        var last = i === qs.length - 1 || hearts <= 0;
        fb.className = 'g-fb show ' + (ok ? 'ok' : 'no');
        fb.innerHTML = '<div class="h">' + (ok ? pick(['정답! 🎯', '완벽해요! ✨', '맞았어요! 🌟']) : '아쉬워요 — 이렇게 기억해요 💡') + '</div>' + Q.why +
          '<div style="margin-top:10px"><button class="btn pri" data-n>' + (last ? '결과 보기' : '다음 문제 →') + '</button></div>';
        fb.querySelector('[data-n]').onclick = function () { if (hearts <= 0) return end(false); i++; if (i >= qs.length) return end(true); q(); };
        fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      function end(clear) {
        var stars = clear ? (miss === 0 ? 3 : miss === 1 ? 2 : 1) : 0;
        if (stars > (S.stars[st.id] || 0)) { S.stars[st.id] = stars; save(S); }
        var nextIdx = STAGES.indexOf(st) + 1, hasNext = clear && nextIdx < STAGES.length && unlocked(nextIdx);
        mount.innerHTML = '<div class="stage pop result"><div class="big">' + (clear ? (stars === 3 ? '🏆' : '🎉') : '💫') + '</div>' +
          '<h3>' + (clear ? st.t + ' 클리어!' : '하트를 다 썼어요') + '</h3>' +
          '<div style="font-size:30px;letter-spacing:4px">' + '★★★'.slice(0, stars) + '<span style="opacity:.2">' + '★★★'.slice(0, 3 - stars) + '</span></div>' +
          '<p class="lede">점수 ' + score + ' · 틀린 문제 ' + miss + '개' + (clear ? '' : ' — 해설을 떠올리며 한 번 더!') + '</p>' +
          (st.boss && clear ? '<p class="lede">이제 마지막 단계: <b>백지에 직접 써보기</b>. 모범 답안 체크리스트로 확인해요.</p>' : '') +
          '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-again>다시 하기</button>' +
          (hasNext ? '<button class="btn pri" data-next>다음 스테이지 →</button>' : '') +
          (st.boss && clear ? '<a class="btn pri" href="#answer">📝 백지 답안 연습 →</a>' : '') +
          '<button class="btn" data-map>미션 지도</button></div></div>';
        mount.querySelector('[data-again]').onclick = function () { play(st); };
        mount.querySelector('[data-map]').onclick = map;
        var nx = mount.querySelector('[data-next]'); if (nx) nx.onclick = function () { play(STAGES[nextIdx]); };
        window.scrollTo(0, 0);
      }
      q(); window.scrollTo(0, 0);
    }
    map();
    return function () { alive = false; };
  }

  window.EMGame = { render: render, _G: G, _STAGES: STAGES, _buildQs: buildQs };
})();
