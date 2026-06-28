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

## 2. 루트 레이아웃 (3 루트 역할 명확화)

```
C:\Nick\                      내 랩·스터디·업무
├── 00_Planning\             ★ 계획·미션컨트롤 (= 현 C:\idea 이전 후보, 대시보드 소스·로드맵·상태)
├── Labs\                    ★ 신규 — 개인 랩 한곳
│   ├── hub-template\        공통 플랫폼(씨앗)
│   ├── nvdla-lab\
│   ├── codec-lab\           (codec-cmodel-lab·deepdive-lab 흡수)
│   ├── semi-lab\
│   ├── ai-build-lab\
│   └── invest-hub\
├── 10_Study\ 20_UVM_Study\ 25_VideoCodec\ 27_PQO\   기존 — 랩이 docs로 흡수/참조
├── 30_Apps\                배포 앱(study-quiz·uvm-drill·jwj-nick.github.io …)
└── 70_Invest\ 90_Archive\ …

C:\Kids\                      아이 허브 (사적)
├── 00_LearningSystem\       (생성 엔진)
├── son-hub\                 ★ E (아들)
└── daughter-hub\            ★ F (son-hub fork, 나중)
```

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

## 5. GitHub 전략

- **멀티레포 유지** (각 Lab 독립 — 배포·fork·인계 용이). 네이밍 `<lab>-lab` / `hub-template` / `invest-hub` / `son-hub`.
- **민감 데이터는 repo 밖**(Supabase/env) → "지식층 공개 + 보유 비공개"를 *같은 repo에서 데이터 분리(RLS)*로. repo 자체 공개/비공개는 가장 민감한 *코드/콘텐츠* 기준.

| repo | 공개 | 이유 |
|---|---|---|
| hub-template | public(정리 후) | 재사용 씨앗 |
| nvdla-lab | public(대부분) | learn-in-public·커리어 |
| semi-lab | public | 공개 산업정보 + 내 분석 |
| ai-build-lab | public | 학습 산출물 |
| codec-lab | **private** | IP/기밀 |
| invest-hub | **private** | 보유·전략 |
| son-hub / daughter-hub | **private**(아이 계정) | 아이 사적 |
| jwj-nick.github.io | public | 허브·아이디어 대시보드 |

- **계정**: jwj-nick + **아들·딸 신규 계정**(자기 허브 소유 → 인계). org는 아직 불필요, 많아지면 고려.

## 6. 허브별 매핑 (한 표)

| 허브 | 로컬 | repo | 공개 | 흡수 대상 |
|---|---|---|---|---|
| 공통플랫폼 | Nick\Labs\hub-template | hub-template | pub | — |
| NVDLA(A) | Nick\Labs\nvdla-lab | nvdla-lab | pub | 30_HW_Study\nvdla_analysis |
| Codec(C) | Nick\Labs\codec-lab | codec-lab | priv | codec-cmodel-lab·deepdive-lab·25_VideoCodec·27_PQO·uvm-* |
| 반도체(J) | Nick\Labs\semi-lab | semi-lab | pub | — |
| AI Build(B) | Nick\Labs\ai-build-lab | ai-build-lab | pub | 30_HW_Study\microgpt-hw |
| 투자(K) | Nick\Labs\invest-hub | invest-hub | priv | 70_Invest·invest_companies·ParkJongHoon(재해석)·history/finance |
| 아들(E) | Kids\son-hub | son-hub(아들) | priv | high1·02_App_Eng·축구·역사(재해석) |
| 딸(F) | Kids\daughter-hub | daughter-hub(딸) | priv | son-hub fork |
| 대시보드 | Nick\00_Planning | jwj-nick.github.io/ideas | pub | — |

## 7. 정리(마이그레이션) 대상 — [실행: 전용 세션]

- codec-cmodel-lab·deepdive-lab → **codec-lab로 통합/서브모듈**
- 25_VideoCodec·27_PQO·20_UVM_Study → codec-lab가 흡수/참조(재해석)
- nvdla_analysis → nvdla-lab `docs/`
- microgpt-hw → ai-build-lab
- 죽은/중복 → 90_Archive
- C:\idea → C:\Nick\00_Planning 이전(결정 시)

## 8. 순서 (Sprint 0과 맞물림) — [실행: 전용 세션]

1. **hub-template 구조 확정** (이 계획) → 표준 박제
2. `Labs\` 골격 + 각 워크스페이스 `.claude`/`CLAUDE.md` 스캐폴딩 [NCC]
3. repo 생성(공개/비공개) [NCC] — 단 **계정 생성은 Nick**
4. 기존 자산 흡수는 각 Lab 빌드 시 (재해석)

## 9. 열린 결정 (Nick)

- **C:\idea 유지 vs C:\Nick\00_Planning 이전?**
- **Labs\ 신설 vs 기존 30_Apps에 합침?** (★제안: 신설 — 랩=스터디+앱 통합이라 30_Apps[배포전용]과 성격 다름)
- **플랫폼 스킬: 글로벌 단일소스 vs 인스턴스 복제?** (★제안: 글로벌 단일 + 도메인만 로컬 — 동기화 부담↓)
- **아이 계정 지금 생성?**
