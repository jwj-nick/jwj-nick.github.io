# 앱 배포 가이드 (jwj-nick.github.io)

---

## 전체 그림 — "어떻게 연결되어 있나"

브라우저에서 https://jwj-nick.github.io 를 열면 **Nick's Apps** 포털이 뜬다.
이 포털이 앱 카드를 만드는 방식은 두 가지다.

### 방식 1 — 별도 repo (자동 감지)

앱마다 GitHub에 독립적인 저장소(repo)가 있고, 그 repo에 Pages가 켜져 있으면
포털이 GitHub API로 자동으로 찾아서 카드를 만든다.
코드 소스는 `C:/Nick/30_Apps/` 아래 각 폴더에 있다.

```
study-quiz repo           → https://jwj-nick.github.io/study-quiz/
uvm-drill repo            → https://jwj-nick.github.io/uvm-drill/
anthropic_skilljar_study  → https://jwj-nick.github.io/anthropic_skilljar_study/
Cert-CompSys              → https://jwj-nick.github.io/Cert-CompSys/
```

### 방식 2 — 서브폴더 (수동 등록)

`high1/`은 별도 repo가 아니라 `jwj-nick.github.io` repo 안에 폴더로 들어 있다.
API로는 감지가 안 되므로, 포털 `index.html` 안 `EXTRA_APPS` 목록에 직접 써두었다.

```
jwj-nick.github.io repo
├── index.html        ← 포털 (EXTRA_APPS에 high1 수동 등록)
└── high1/            ← 여기에 과목별 폴더 + HTML 파일이 들어 있음
    ├── index.html    ← 과목 선택 화면
    ├── math/
    ├── korean/
    ├── history/
    └── ...
```

> **왜 high1만 서브폴더인가?**  
> 고등학교 3년치 과목이 한 묶음이라 별도 repo보다 한 폴더 안에 모으는 게 관리가 쉬워서.

---

## 앱 하나 배포하는 절차

### Case A — 기존 과목에 앱 추가 (가장 흔한 경우)

**Step 1.** HTML 파일을 Kids 폴더에서 high1 폴더로 복사
```
원본:  C:/Kids/70_HighSchool/2604_고1_중간고사/수행평가-수학/1sem_perf_viete.html
목적:  C:/Nick/30_Apps/jwj-nick.github.io/high1/math/1sem_perf_viete.html
```

**Step 2.** 해당 과목 `index.html`에 카드 한 줄 추가
```html
<a class="card" href="1sem_perf_viete.html">
  <span class="tag">수행평가</span>
  <div class="name">비에트 공식 활용</div>
  <div class="sub">Viete's Formulas</div>
</a>
```

**Step 3.** Git push
```bash
cd C:/Nick/30_Apps/jwj-nick.github.io
git add high1/math/
git commit -m "수학: 비에트 수행평가 앱 추가"
git push
```
1~2분 후 URL에서 확인.

---

### Case B — 새 과목 추가 (예: 국어)

**Step 1.** 새 폴더 만들고 HTML 복사
```
C:/Nick/30_Apps/jwj-nick.github.io/high1/korean/
├── index.html                  ← history/index.html 복사 후 내용만 수정
└── 1sem_perf_essay_model.html
```

`korean/index.html` 수정 포인트:
- `<title>`, `<h1>` → `Korean_1_1`
- `<p>` → `1학기 · 국어 수행평가`
- 카드 목록 교체

**Step 2.** 최상위 `high1/index.html`에 과목 카드 추가
```html
<a class="card" href="korean/index.html">
  <div class="icon">📝</div>
  <div class="label">Korean_1_1</div>
  <div class="sub">수행평가 · 견해문 · 1 app</div>
</a>
```

**Step 3.** Git push
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

URL에 한글이 들어가면 인코딩 문제가 생길 수 있으므로 영어 파일명 사용.

---

## NCC가 자동으로 하던 것 vs 수동 필요 항목

| 항목 | NCC 자동 | 수동 |
|---|---|---|
| HTML 앱 생성 | ✅ | — |
| HTML 파일 → high1/ 복사 | ✅ | 직접 복사 |
| index.html 카드 추가 | ✅ | 직접 편집 (아래 참조) |
| git add / commit / push | ✅ | 직접 실행 |

---

## 수동 배포의 핵심 병목 — index.html 편집

GitHub Pages는 폴더 안에 파일을 넣는다고 자동으로 목록을 만들어주지 않는다.
각 `index.html`에 카드가 하드코딩되어 있기 때문에,
**새 HTML 파일을 추가할 때마다 index.html 코드를 직접 수정해야 한다.**

수정 범위는 좁다 — 카드 한 블록(5줄 내외)을 복붙하고 파일명·제목만 바꾸면 끝.
하지만 코드를 열어야 한다는 점에서 진입장벽이 존재한다.

### 이 문제를 없애는 방법 (현재 미적용)

**옵션 A — 스크립트 방식**
HTML 파일을 폴더에 넣은 뒤, `update_index.py` 같은 스크립트를 실행하면
index.html을 자동 재생성. 코드 편집 없이 스크립트 한 번 실행으로 끝.

**옵션 B — 지금처럼 수동 유지**
어차피 NCC가 배포를 대신 처리하는 경우가 대부분이면 현 구조로 충분.

> 현재는 옵션 B(수동 유지). 혼자 배포할 일이 생기면 옵션 A로 전환 검토.
