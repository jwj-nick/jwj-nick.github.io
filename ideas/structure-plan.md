# 구조 정리 계획 — 로컬 디렉토리 · .claude · GitHub

> 2026-06-28 · ⚠️ **계획(청사진)만. 실제 이동·repo 생성·마이그레이션은 전용 세션.** (이 세션은 아이디어/계획)
> 목적: 8개 허브 + 공통 플랫폼이 *일관·확장·인계* 가능하게, 흩어진 것 정리.

## 1. 원칙

1. **1 Lab = 1 자기완결 워크스페이스 = 1 repo**
2. **표준 내부 구조** 통일 (§3) — 어디를 열어도 같은 모양
3. **.claude 3계층** (글로벌/플랫폼/도메인, §4)
4. **콘텐츠=데이터**, 민감 데이터는 **repo 밖**(Supabase/env)
5. public/private = **가장 민감한 콘텐츠** 기준
6. 기존 자산은 **흡수**(복붙 아니라 재배치/재해석)

## 2. 루트 레이아웃 (★ Nick 확정 2026-06-28)

```
C:\01_Labs\                  ★ 실제 앱 작업 (top-level 신규) — 각 hub = 서브디렉토리 = repo
├── hub-template\            공통 플랫폼(씨앗)
├── nvdla-lab\
├── codec-lab\               (codec-cmodel-lab·deepdive-lab 흡수)
├── semi-lab\
├── ai-build-lab\
└── invest-hub\

C:\idea\                     ★ 그대로 유지 — 계획·아이디어 대시보드 소스 (이 문서 등)

C:\Nick\                     내 스터디·업무·기존 자산 (각 랩이 흡수/참조)
└── 10_Study\ 20_UVM_Study\ 25_VideoCodec\ 27_PQO\ 30_Apps\ 70_Invest\ 90_Archive\ …

C:\Kids\                     아이 허브 (사적, 아이 소유 — 같은 워크스페이스 패턴)
├── 00_LearningSystem\       (생성 엔진)
├── son-hub\                 ★ E (아들)
└── daughter-hub\            ★ F (son-hub fork, 나중)
```
> 확정: **C:\idea 유지** · 랩은 **C:\01_Labs\ 서브디렉토리**에서 실제 작업 · 기존 C:\Nick 자산은 각 랩이 흡수. (아이 허브는 별 생태계라 C:\Kids 유지.)

## 3. 표준 워크스페이스 내부 구조 (모든 Lab 공통)

```
<lab>/                       [git repo, 자기완결]
├── CLAUDE.md                진입점·프로젝트 컨텍스트
├── README.md                사람용
├── .claude/
│   ├── skills/              도메인 스킬 (nvdla-chapter …)
│   ├── agents/
│   └── settings.local.json
├── 00_meta/                 plan · status · sessions
├── content/                콘텐츠=데이터(md/json) + manifest.json
├── docs/                    지식베이스·원소스 노트 (비공개분 분리)
└── app/                     프론트 (or 루트 — Vercel)
```

## 4. .claude 3계층 ★

| 계층 | 위치 | 내용 |
|---|---|---|
| **글로벌** | `~/.claude/` | 범용 스킬(paper-study-app·quiz-publish·study-log·memory-sync·equity-scenario-app·figcrop) · commands · MEMORY.md · settings |
| **플랫폼(공통)** | hub-template (글로벌에 둘지 인스턴스 복제할지 §9) | `hub-ingest`·`hub-chapter`·`hub-card`·`hub-deploy`·`hub-audit` |
| **도메인** | `<lab>/.claude/` | `nvdla-*`·`codec-*`·`semi-*`·`invest-*` |

- 로딩: **cwd 로컬 + git루트까지 walk-up + 글로벌** → 그 폴더에서 Claude 실행해야 도메인 환경 로드.
- 기존 `se_*`(LearningSystem)·`uvm-*` → 플랫폼 스킬과 정합/일반화.

## 5. GitHub 전략 (★ Nick 확정)

- **hub별 1 repo** (멀티레포). **각 repo = app 코드 + 콘텐츠 데이터(md/json) 한 공간.** 네이밍 `<lab>-lab` / `hub-template` / `invest-hub` / `son-hub`.
- **초기엔 전부 private로 생성.** 공개는 나중에 준비되면 선별 전환(아래 '공개 target').
- ⚠️ **민감 런타임 데이터(보유·계좌·API키)는 private repo여도 repo 밖**(Supabase/env). 이유: 나중 public 전환 시 **git 히스토리에 영구히 남음.** 콘텐츠 md는 repo OK, 사용자/보유 데이터는 절대 repo X.

| repo | 초기 | 공개 target | 이유 |
|---|---|---|---|
| hub-template | private | public(정리 후) | 재사용 씨앗 |
| nvdla-lab | private | public | learn-in-public·커리어 |
| semi-lab | private | public | 공개 산업정보 + 내 분석 |
| ai-build-lab | private | public | 학습 산출물 |
| codec-lab | private | **private 유지** | IP/기밀 |
| invest-hub | private | **private 유지** | 보유·전략 |
| son-hub / daughter-hub | private | **private 유지**(아이 계정) | 아이 사적 |
| jwj-nick.github.io | public(현행) | public | 허브·아이디어 대시보드 |

- **계정**: jwj-nick + **아들·딸 신규 계정**(자기 허브 소유 → 인계). org는 아직 불필요.

## 6. 허브별 매핑 (한 표)

> 모든 repo 초기 private. '공개 target'은 §5 참조.

| 허브 | 로컬 | repo | 흡수 대상 |
|---|---|---|---|
| 공통플랫폼 | C:\01_Labs\hub-template | hub-template | — |
| NVDLA(A) | C:\01_Labs\nvdla-lab | nvdla-lab | 30_HW_Study\nvdla_analysis |
| Codec(C) | C:\01_Labs\codec-lab | codec-lab | codec-cmodel-lab·deepdive-lab·25_VideoCodec·27_PQO·uvm-* |
| 반도체(J) | C:\01_Labs\semi-lab | semi-lab | — |
| AI Build(B) | C:\01_Labs\ai-build-lab | ai-build-lab | 30_HW_Study\microgpt-hw |
| 투자(K) | C:\01_Labs\invest-hub | invest-hub | 70_Invest·invest_companies·ParkJongHoon(재해석)·history/finance |
| 아들(E) | C:\Kids\son-hub | son-hub(아들 계정) | high1·02_App_Eng·축구·역사(재해석) |
| 딸(F) | C:\Kids\daughter-hub | daughter-hub(딸 계정) | son-hub fork |
| 대시보드 | C:\idea (유지) | jwj-nick.github.io/ideas | — |

## 7. 정리(마이그레이션) 대상 — [실행: 전용 세션]

- codec-cmodel-lab·deepdive-lab → **codec-lab로 통합/서브모듈**
- 25_VideoCodec·27_PQO·20_UVM_Study → codec-lab가 흡수/참조(재해석)
- nvdla_analysis → nvdla-lab `docs/`
- microgpt-hw → ai-build-lab
- 죽은/중복 → 90_Archive
- (C:\idea는 그대로 유지 — 이전 안 함)

## 8. 순서 (Sprint 0과 맞물림) — [실행: 전용 세션]

1. **hub-template 구조 확정** (이 계획) → 표준 박제
2. `Labs\` 골격 + 각 워크스페이스 `.claude`/`CLAUDE.md` 스캐폴딩 [NCC]
3. repo 생성(공개/비공개) [NCC] — 단 **계정 생성은 Nick**
4. 기존 자산 흡수는 각 Lab 빌드 시 (재해석)

## 9. 결정 현황

**✓ 확정 (Nick 2026-06-28):**
- C:\idea **유지** (이전 안 함)
- 랩 작업 = **C:\01_Labs\ 서브디렉토리**
- **hub별 1 repo** (app + 콘텐츠 md 한 공간)
- **초기 전부 private** → 나중 선별 공개

**남은 결정:**
- **플랫폼 스킬: 글로벌 단일소스 vs 인스턴스 복제?** (★제안: 글로벌 단일 + 도메인만 로컬 — 동기화 부담↓)
- **아이 계정 지금 생성?** (E 빌드 시점에 맞춰)
