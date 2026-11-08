/* sq-story.js — 하늘 퀘스트: 인물·대사·초상(SVG) 데이터 (콘텐츠 SSOT) */
export const CHARS = {
  yul: {
    name: '율이', en: 'YUL-I', role: '요크셔테리어 관측 대원 (주인공)', color: '#ffb84d',
    about: '작지만 겁 없는 요크셔테리어. 머리 위 빨간 리본이 트레이드마크예요. 하늘에서 사라진 빛을 되찾으러 우주 관측대에 합류했어요.'
  },
  lumi: {
    name: '루미', en: 'LUMI', role: '탐사 로봇 · 길잡이', color: '#6fd6ff',
    about: '율이의 단짝 탐사 로봇. 현상을 설명하고 힌트를 줘요.',
    word: '라틴어 <b>lumen</b> = <b>빛</b>. 영어 <b>luminous</b>(빛나는), <b>illuminate</b>(비추다)와 같은 뿌리예요. 이름 그대로 율이의 길을 비춰 줘요.'
  },
  nox: {
    name: '녹스', en: 'NOX', role: '빛을 훔치는 그림자', color: '#b48cff',
    about: '하늘의 빛나는 순간을 훔쳐 가는 그림자 존재. 제한 시간 안에 막지 못하면 그 장면은 사라져요.',
    word: '라틴어 <b>nox</b> = <b>밤</b>. 로마 신화의 밤의 여신 Nox(그리스 신화 Nyx). 영어 <b>nocturnal</b>(야행성), <b>equinox</b>(춘분·추분 = <i>aequus</i> 같은 + <i>nox</i> 밤 → 밤과 낮의 길이가 같은 날)와 같은 뿌리예요.'
  }
};

export const PORTRAIT = {
  yul: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="hy" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#e8b878"/><stop offset="1" stop-color="#b9813f"/></radialGradient></defs>
    <circle cx="50" cy="54" r="40" fill="#1b2a44" stroke="#6fd6ff" stroke-width="3" opacity=".9"/>
    <path d="M22 40 L30 12 L42 34 Z" fill="#4a5a72"/><path d="M78 40 L70 12 L58 34 Z" fill="#4a5a72"/>
    <path d="M26 36 L31 20 L38 33 Z" fill="#d79a5a"/><path d="M74 36 L69 20 L62 33 Z" fill="#d79a5a"/>
    <ellipse cx="50" cy="56" rx="27" ry="25" fill="url(#hy)"/>
    <path d="M26 46 Q50 22 74 46 Q66 36 50 36 Q34 36 26 46Z" fill="#4a5a72"/>
    <path d="M44 24 l-9 -7 l2 11 z M56 24 l9 -7 l-2 11 z" fill="#e23b4e"/><circle cx="50" cy="24" r="3.5" fill="#ff5a6e"/>
    <circle cx="40" cy="54" r="5.2" fill="#14110d"/><circle cx="60" cy="54" r="5.2" fill="#14110d"/>
    <circle cx="41.6" cy="52.2" r="1.7" fill="#fff"/><circle cx="61.6" cy="52.2" r="1.7" fill="#fff"/>
    <ellipse cx="50" cy="65" rx="5" ry="3.6" fill="#14110d"/>
    <path d="M44 70 Q50 75 56 70" stroke="#5a3a1c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M36 66 Q30 76 38 82 M64 66 Q70 76 62 82" stroke="#a87038" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M18 84 Q50 100 82 84" stroke="#cfe3ff" stroke-width="5" fill="none"/>
  </svg>`,
  lumi: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <line x1="50" y1="8" x2="50" y2="22" stroke="#cfe3ff" stroke-width="3"/><circle cx="50" cy="8" r="5" fill="#6fd6ff"/>
    <circle cx="50" cy="8" r="9" fill="#6fd6ff" opacity=".25"/>
    <rect x="18" y="22" width="64" height="58" rx="26" fill="#eef4ff"/>
    <rect x="26" y="36" width="48" height="26" rx="13" fill="#0b1630"/>
    <circle cx="40" cy="49" r="6" fill="#6fd6ff"/><circle cx="60" cy="49" r="6" fill="#6fd6ff"/>
    <circle cx="40" cy="49" r="10" fill="#6fd6ff" opacity=".2"/><circle cx="60" cy="49" r="10" fill="#6fd6ff" opacity=".2"/>
    <path d="M42 70 Q50 75 58 70" stroke="#6fd6ff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="10" y="44" width="8" height="18" rx="4" fill="#cfe3ff"/><rect x="82" y="44" width="8" height="18" rx="4" fill="#cfe3ff"/>
    <rect x="34" y="82" width="32" height="8" rx="4" fill="#9fb6d8"/>
  </svg>`,
  nox: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="nx" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a1748"/><stop offset="1" stop-color="#07030f"/></radialGradient></defs>
    <path d="M50 6 C22 10 14 40 16 62 C12 76 8 86 4 96 L96 96 C92 86 88 76 84 62 C86 40 78 10 50 6Z" fill="url(#nx)"/>
    <path d="M4 96 Q14 84 22 92 Q30 80 38 92 Q46 82 54 92 Q62 80 70 92 Q78 84 96 96Z" fill="#07030f"/>
    <ellipse cx="50" cy="48" rx="22" ry="20" fill="#000"/>
    <path d="M34 46 L46 50 L34 53 Z" fill="#c9a2ff"/><path d="M66 46 L54 50 L66 53 Z" fill="#c9a2ff"/>
    <circle cx="40" cy="49.5" r="9" fill="#b48cff" opacity=".25"/><circle cx="60" cy="49.5" r="9" fill="#b48cff" opacity=".25"/>
    <path d="M40 62 Q50 58 60 62" stroke="#6d4bb0" stroke-width="2" fill="none"/>
  </svg>`
};

/* 스테이지 5 — 그림자 추격전 */
export const STAGE5 = {
  id: 's5', no: 5, title: '그림자 추격전', sub: '평가요소 ⑤ 일식',
  intro: [
    ['nox', '흐흐… 오늘 낮, 한반도 위로 <b>개기일식</b>이 지나가지. 태양의 왕관 — <b>코로나</b>는 내가 가져가겠다!'],
    ['lumi', '율이! 녹스보다 먼저 개기일식을 관측해야 해. 관문은 4개, 하나라도 놓치면 처음부터야.'],
    ['yul', '멍! 준비됐어. 뭐부터 하면 돼?'],
    ['lumi', '먼저 위 화면(우주)에서 달을 움직여 <b>일식이 일어나는 배치</b>를 만들어. 아래 화면은 지표에 있는 네 눈에 보이는 하늘이야.']
  ],
  gates: [
    { id: 'align', name: '정렬', time: 25, goal: '달을 끌어 태양과 지구 <b>사이</b>에 일직선으로!',
      hint: '달을 좌우로 끌어요. 아래 하늘에서 달이 태양을 덮으면 정답 근처!',
      done: [['lumi', '완벽해! <b>태양 - 달 - 지구</b>가 일직선. 이때 달의 위상은 <b>삭</b>이야. 지구에서 보면 달의 어두운 면만 향하고 있지.']] },
    { id: 'land', name: '착륙', time: 18, goal: '개기일식이 보이는 곳 — <b>달의 본그림자</b> 안에 착륙!',
      hint: '지구 위 가장 진한 검은 점이 본그림자, 옅은 둥근 그늘이 반그림자.',
      pre: [['lumi', '달의 그림자가 지구에 떨어졌어! 진한 부분이 <b>본그림자</b>, 옅은 부분이 <b>반그림자</b>. 개기일식을 보려면 어디로 가야 할까?']],
      done: [['lumi', '착륙 성공! <b>본그림자</b> 안에서만 태양이 완전히 가려지는 <b>개기일식</b>이 보여. 반그림자에선 <b>부분일식</b>뿐이야.']] },
    { id: 'chase', name: '추격', time: 32, goal: '움직이는 본그림자 안에 머물러 <b>개기일식 6초</b>를 채워요!',
      hint: '화면을 누른 채 끌면 율이가 그 방향으로 달려요. 그림자는 서→동으로 움직여요.',
      pre: [['nox', '그림자는 멈춰 있지 않지! 달이 <b>서→동</b>으로 공전하니 본그림자도 지표를 동쪽으로 질주한다. 따라올 수 있을까?'],
            ['lumi', '본그림자는 실제로 시속 1,700km 넘게 움직여! 녹스의 그림자 구름은 피해!']],
      done: [['yul', '봤다! 코로나다아아! 🐾'], ['lumi', '대성공! 녹스가 마지막 문제를 낸대. 방금 본 걸 떠올려!']] },
    { id: 'quiz', name: '판정', time: 9, goal: '녹스의 질문에 빠르게 답해요!',
      pre: [['nox', '눈으로 봤다고 아는 건 아니지. 대답해 봐!']],
      qs: [
        { q: '일식이 시작될 때 태양은 <b>어느 쪽</b>부터 가려졌지?', opts: ['왼쪽(동쪽)', '오른쪽(서쪽)'], a: 1, why: '달이 서→동(오른쪽→왼쪽)으로 움직이며 덮으니 <b>태양의 오른쪽(서쪽)</b>부터.' },
        { q: '일식이 일어날 때 달의 <b>위상</b>은?', opts: ['삭', '망', '상현', '하현'], a: 0, why: '태양-달-지구 일직선 = <b>삭</b>.' },
        { q: '<b>부분일식</b>만 보이는 곳은?', opts: ['본그림자 지역', '반그림자 지역', '밤인 지역'], a: 1, why: '<b>반그림자</b> 지역은 태양이 일부만 가려져요. 밤인 지역은 일식을 볼 수 없어요.' }
      ] }
  ],
  fail: ['nox', '하하! 코로나는 내 것이다… 다시 처음부터 와 봐!'],
  clear: [['nox', '크윽… 이번엔 내가 졌다. 하지만 다음엔 <b>보름달</b>을 훔치러 가겠다!'], ['lumi', '율이 최고! 오늘 본 걸 정리해 볼까?']],
  summary: [
    ['천체의 위치', '태양 - <b>달</b> - 지구 일직선'],
    ['달의 위상', '<b>삭</b> (음력 1일경)'],
    ['가려지는 부분', '태양의 <b>오른쪽(서쪽)</b>부터'],
    ['관찰 지역', '본그림자 → <b>개기일식</b>, 반그림자 → <b>부분일식</b> (좁은 지역)']
  ]
};
