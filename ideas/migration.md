# Hub Migration Guides — NCC 빌드 세션 인덱스

> 2026-06-29 · 각 hub를 **완전히 새 세션**(브레인스토밍 컨텍스트 0)에서 빌드하기 위한 **NCC용 킥오프 가이드** 모음.
> ⚠️ 계획은 끝났다. 이 가이드 = **빌드 세션이 단독으로 집어들고 실행**하는 실행서. 원본은 `C:\idea\migration\`.

---

## 어떻게 쓰나 (새 세션 부팅)

새 세션을 열 때 Nick은 **한 줄**만:

> `C:\idea\migration\<hub>.md 읽고 시작해.`

각 가이드는 **자기완결** — 맨 먼저 `_COMMON.md`(공통 규약)와 출처 플랜 문서를 읽으라 지시. 새 세션은 이 대화 기억이 없어도 끝까지 작업 가능.

⚠️ 새 세션은 `C:\01_Labs\<hub>\`에서 실행 → **C:\idea auto-memory는 로드 안 됨.** 글로벌 `~/.claude/MEMORY.md`(Nick 프로필)는 항상 로드. 그래서 가이드가 모든 맥락을 **full path**로 가리킴.

---

## 빌드 순서 (★ 의존성)

| # | hub | 가이드 (full path) | 선행 | 한 줄 |
|---|---|---|---|---|
| **0** | **hub-template** | `C:\idea\migration\00_hub-template.md` | 없음 | ★ **공통 플랫폼 씨앗. 반드시 먼저.** 나머지 전부 인스턴스화 |
| 1 | nvdla-lab | `C:\idea\migration\nvdla-lab.md` | 0 | NVDLA RTL+검증 메가 허브 (커리어 1순위) |
| 1 | codec-lab | `C:\idea\migration\codec-lab.md` | 0 | 20년 코덱 척추 + 디코더 tool forge (진행분 흡수) |
| 2 | semi-lab | `C:\idea\migration\semi-lab.md` | 0 | 반도체 인텔리전스(폭) + CXL深·Chiplet深(깊이) |
| 2 | ai-build-lab | `C:\idea\migration\ai-build-lab.md` | 0 | 빌드해서 이해하는 AI — 노트북·벤치·NPU lens |
| 3 | invest-hub | `C:\idea\migration\invest-hub.md` | 0 | 소비→자산화 인제스천 (실계좌 X, private) |
| 3 | son-hub | `C:\idea\migration\son-hub.md` | (0) | 아들 10년 학습 OS (C:\Kids, 별 생태계) |
| 4 | daughter-hub | (son-hub §8) | son 초기완성 | son-hub **통째 fork** |

> 스프린트(exec-strategy): S0=hub-template · S1=nvdla+codec · S2=semi+ai-build · S3=invest+son · S4=깊이1+daughter fork.
> WIP: Nick 깊은 집중 **1–2 hub만**, 나머지는 NCC가 틀만.

---

## 공통 규약 + 출처

- **공통 규약(모든 가이드가 먼저 읽음):** `C:\idea\migration\_COMMON.md` — 표준 구조·.claude 3계층·스택·배포·민감데이터 규칙·"틀 완성" 정의.
- **인덱스 원본:** `C:\idea\migration\_INDEX.md`
- **출처 플랜:** nvdla=`C:\idea\2026-06-27_nvdla-npu-lab-plan.md` · codec=`...codec-lab-plan.md` · semi=`...2026-06-28_semi-lab-plan.md` · ai=`...ai-build-lab-plan.md` · invest=`...invest-hub-plan.md`+`...invest-hub-migration-guide.md` · son=`...son-lab-questions.md`

---

## 황금 규칙 (모든 빌드 세션)

1. **빌드 세션이다** — 계획 재토론 아님. 스캐폴딩·구현·배포.
2. **P1** — 콘텐츠가 엔진을 당긴다. speculative 금지.
3. **P2** — NCC 품질 상시 자율 개선, 세션 끝 1줄.
4. **민감 런타임 데이터(보유·계좌·키·아이 기록)는 repo 밖.**
5. **흡수 = 재해석.** 복붙/링크 아님.
6. **막히면 rabbit hole 대신 Nick에게 결정 질문.**
