# high1 앱 배포 가이드

**URL:** https://jwj-nick.github.io/high1/  
**로컬 경로:** `C:/Nick/30_Apps/jwj-nick.github.io/high1/`

---

## 구조

```
jwj-nick.github.io/
└── high1/
    ├── index.html          ← 과목 선택 화면 (카드 목록)
    ├── math/
    │   ├── index.html      ← 수학 앱 목록
    │   ├── 1sem_mid_Q12_poly_div.html
    │   └── ...
    ├── history/
    │   ├── index.html
    │   └── ...
    ├── korean/             ← 아직 없음, 새로 만들어야 함
    └── ...
```

---

## Case A: 기존 과목에 앱 추가 (가장 흔한 경우)

예: 수학 수행평가 앱 `1sem_perf_viete.html` 추가

**Step 1 — HTML 파일 복사**
```
Kids 쪽 원본:   C:/Kids/70_HighSchool/2604_고1_중간고사/수행평가-수학/1sem_perf_viete.html
복사 대상:      C:/Nick/30_Apps/jwj-nick.github.io/high1/math/1sem_perf_viete.html
```

**Step 2 — `math/index.html` 에 카드 추가**

`index.html` 안 `apps` 배열 또는 grid HTML에 항목 추가:
```html
<!-- section-title 아래에 카드 추가 -->
<a class="card" href="1sem_perf_viete.html">
  <span class="tag tag-perf">수행평가</span>
  <div class="name">비에트 공식 활용</div>
  <div class="sub">Viete's Formulas · 수행평가</div>
</a>
```

**Step 3 — Git push**
```bash
cd C:/Nick/30_Apps/jwj-nick.github.io
git add high1/math/1sem_perf_viete.html high1/math/index.html
git commit -m "수학: 비에트 수행평가 앱 추가"
git push
```

배포는 GitHub Pages가 자동 처리. 1~2분 후 URL에서 확인.

---

## Case B: 새 과목 추가 (예: 국어)

**Step 1 — 폴더 + index.html 생성**
```
C:/Nick/30_Apps/jwj-nick.github.io/high1/korean/
├── index.html          ← history/index.html을 복사해서 수정
└── NCC_모범답안_견해문.html
```

`korean/index.html` 핵심 수정:
- `<title>` → `Korean_1_1`
- `<h1>` → `Korean_1_1`
- `<p>` → `1학기 · 국어 수행평가`
- 카드 목록 교체

**Step 2 — 최상위 `high1/index.html`에 과목 카드 추가**
```html
<a class="card" href="korean/index.html">
  <div class="icon">📝</div>
  <div class="label">Korean_1_1</div>
  <div class="sub">수행평가 · 견해문 · 1 apps</div>
</a>
```

**Step 3 — Git push**
```bash
cd C:/Nick/30_Apps/jwj-nick.github.io
git add high1/korean/ high1/index.html
git commit -m "국어: 수행평가 앱 추가"
git push
```

---

## 파일명 규칙

| 용도 | 패턴 | 예시 |
|---|---|---|
| 중간고사 오답노트 | `1sem_mid_Q<번호>_<영어주제>.html` | `1sem_mid_Q12_poly_div.html` |
| 중간고사 연습문제 | `1sem_mid_Q<번호>_<영어주제>_practice.html` | `1sem_mid_Q12_poly_div_practice.html` |
| 수행평가 앱 | `1sem_perf_<영어주제>.html` | `1sem_perf_viete.html` |

---

## NCC 가 자동으로 하던 것 vs 수동 필요 항목

| 항목 | NCC 자동 | 수동 |
|---|---|---|
| HTML 앱 생성 | ✅ | — |
| HTML 파일 → high1/ 복사 | ✅ | **직접 복사** |
| index.html 카드 추가 | ✅ | **직접 편집** |
| git add/commit/push | ✅ | **직접 실행** |
