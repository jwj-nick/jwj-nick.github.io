# 투자 허브 — Migration / Build Guide (detail)

> 2026-06-28 · **빌드 세션용 상세.** 마스터플랜(`2026-06-28_invest-hub-plan.md`)의 *"어떻게"*.
> ⚠️ 이 문서는 *다른(전용) 세션*에서 실제 작업할 때 따라가는 가이드. 지금 세션에선 만들지 않음.
> 살아있는 문서 — 빌드 진행하며 갱신.

---

## 0. 용도 / 읽는 순서

마스터플랜 = 왜·무엇(존재의미·원칙·P1~P10·진화·주의점). **이 문서 = 데이터·파이프라인·스택·빌드 순서·보안.** 빌드 세션은 이 문서 §2→§7을 따라간다.

## 1. 아키텍처 한 장

```
[캡처 표면]            [처리(서버)]                 [데이터]          [프론트]
폰 공유/봇/퀵애드  →  인제스천 워커               →  Supabase     ←  PWA
                      fetch→추출→임베딩→LLM초안       (2단: 지식/보유)   (읽기·검토·퀵캡처)
                              ↑ Claude API(키 서버 only)
원칙: 캡처(즉시) / 처리(비동기) / 검토(아무때나) 분리
```

## 2. 데이터 모델 (스키마 초안) ★

> 2단 프라이버시 = **지식층(공유 가능)** vs **보유층(절대 비공개)**. Supabase RLS 또는 별도 스키마로 분리.

**지식층 (knowledge)**
- `sources` (id, type[yt/article/book/news], url, title, credibility[1-5], captured_at, raw_text, status)
- `claims` (id, source_id, text)
- `cards` (id, kind[insight/quote], text, source_id, tags[], sr_state)  ← P8 SR
- `principles` (id, text, category[가치/매크로/행동/리스크], source_ids[], updated_at)
- `market_views` (id, topic[금리/유동성/…], stance, source_ids[], updated_at)  ← P4 매크로
- `theses` (id, ticker, thesis, invalidation_triggers[], conviction[1-5], status[active/invalidated])  ← P2
- `ingest_inbox` (id, source_id, ai_draft_json, status[pending/approved/edited/discarded])

**보유층 (private — RLS 강제)**
- `holdings` (id, ticker, qty, cost, opened_at)
- `decisions` (id, ticker, action[buy/sell/hold], rationale, emotion, market_context, confidence_pct, ts)  ← P1·P10
- `portfolio_reviews` (id, period, notes, ts)  ← P9

**연결**: thesis ↔ holdings, market_view ↔ theses(P4 전파), card ↔ principle, source ↔ everything(트레이스).

## 3. 인제스천 파이프라인 (구체) ★

1. **캡처 엔드포인트** `POST /ingest {url|text, note?}` → `sources`(status=raw) + 큐
2. **추출**: yt→자막(yt-dlp/transcript, 폴백 whisper) · article→`trafilatura` · book→OCR/수동
3. **검색(RAG)**: 텍스트 임베딩 → 관련 `theses`·`principles`·`market_views` top-k 회수 = "내 시스템 컨텍스트"
4. **LLM 초안**: Claude API structured output →
   ```
   { source:{credibility}, key_claims:[], 
     routing:{type:[new/reinforce/contradict/market-shift/affects-thesis], targets:[]},
     drafts:{cards:[], principle_updates:[], thesis_impacts:[], portfolio_notes:[]} }
   ```
   - 동시에 P5(데블스: 반론 1쌍) · P2(무효화 트리거 대조) 생성
5. **인박스 적재**: `ingest_inbox`(pending)
6. **검토·커밋**: 카드별 approve/edit/discard → 지식층 write + source 트레이스. (고등급·저영향 자동승인 임계 옵션)

## 4. 캡처 표면 구현

| 단계 | 방식 | 메모 |
|---|---|---|
| PoC | **Telegram 봇**(python-telegram-bot) → /ingest, 또는 Claude Code `invest-ingest` | 앱·서버 최소 |
| 성숙 | **PWA Share Target**(manifest `share_target`) | iOS 지원 제약 → Shortcuts 대안 |
| 상시 | 퀵캡처 박스 + **오프라인 큐**(IndexedDB→동기화) | 지하철 OK |

## 5. 기존 자산 마이그레이션 (흡수 — 재해석, 링크 아님) ★

| 자산 | 절차 |
|---|---|
| `history/tracks/finance` | 콘텐츠 추출 → **재해석** → `principles`/`cards`/`market_views`로 |
| ParkJongHoon (13칼럼·eBook·강의) | 스터디 → **내 언어로 재해석** → 지식층 (원문 비공개, 게시 X) |
| `equity-scenario-app` | 차트·시나리오 **컴포넌트를 기업분석 모듈로 이식/재구현** |
| `invest_companies`(에스에이엠티) | 기존 분석 데이터 → `theses`/company로 |

> 모든 마이그레이션 공통: **원문 보존(비공개) + 재해석분만 앱에 + 출처 트레이스.**

## 6. 기술 스택 (권고 — Nick 확정 필요)

- **서버**: **FastAPI(Python)** — yt-dlp·trafilatura·whisper·임베딩 생태계 친화. (대안 Node)
- **DB**: **Supabase**(Postgres + RLS + auth). 2단 프라이버시 = **RLS**로 깔끔.
- **프론트**: **바닐라 + supabase-js + 차트 라이브러리(uPlot/Chart.js, CDN)** 로 시작 → 검토 UI·상태 복잡해지는 모듈만 경량 프레임. (10년 내구성·아들 가독성 우선, 손허브 결정과 일관)
- **AI**: Claude API(structured output) + 임베딩(voyage 등). **키는 서버 only.**
- **호스팅**: 개인 서버(집/VPS) — 마스터플랜 '개인 앱서버'. PoC는 로컬.

## 7. 빌드 순서 + acceptance (P1~P10 매핑)

| Phase | 내용 | accept | P 매핑 |
|---|---|---|---|
| 0 | 데이터모델 + `invest-ingest` PoC(텍스트→초안→인박스) | 1개 자산화 end-to-end | 인제스천 |
| 1 | 캡처 봇 + 유튜브 자막 추출 | URL→초안 | 마찰0 |
| 2 | 지식 모듈 + 카드 SR + 재해석 흡수 1소스 | 카드 재등장 | P6·P8 |
| 3 | 기업·포트폴리오(수동) + 결정저널 + thesis/무효화 | 매수 1건 저널+thesis | P1·P2·P10 |
| 4 | PWA + 오프라인 퀵캡처 + 검토 UI + 폭락 플레이북 | 폰 1탭 캡처·검토 | 폰우선·P3 |
| 5 | 매크로→마이크로 전파 + AI 데블스 + 리뷰 리듬 | 인사이트 전파 동작 | P4·P5·P9 |
| 6 | (성숙 후) 개인 서버 + 실계좌/증권 API | 실데이터 안전 연동 | — |

## 8. 위험·완화 (마스터플랜 §11-3 상세)

| 장벽 | 영향 | 완화 |
|---|---|---|
| 자막 추출 실패 | 캡처 끊김 | whisper 폴백·수동 입력 경로 |
| AI 환각/오라우팅 | 잘못된 지식 누적 | 사람 검토 게이트 필수·출처등급·트레이스 |
| 검토 병목 | 방치 위험 | 자동승인 임계·인박스 우선순위 |
| 프라이버시 누수 | 치명 | RLS 2단·키 서버only·가족공유 시 보유층 차단 |
| 스키마 노후 | 10년 수명 위협 | export 항상·마이그레이션 스크립트 |
| LLM 비용 | 지속성 | 배치·캐시·1차 라우팅 소형모델 |

## 9. 보안·프라이버시 체크리스트

- [ ] API 키·시크릿 **서버 전용**(클라이언트 노출 X)
- [ ] `holdings`/`decisions`/`portfolio_*` **RLS 비공개**, 지식층과 물리 분리
- [ ] 데이터 **export**(JSON/CSV) 항상 가능 — lock-in 금지
- [ ] 자동 **백업**
- [ ] 가족/유튜브 공유 시 **지식층만**, 보유층 자동 차단
- [ ] 저작권: **재해석분만** 앱·공개, 원문 비공개
- [ ] "투자 조언 아님" 면책(가족·아이 공유 시)
