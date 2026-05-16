# PDF 접근 방법 — 잘 되는 것 / 안 되는 것

> NCC 2026-05-14 정리. 서울대·연세대·SKKU 시도 후 발견된 패턴.

---

## ✅ 잘 되는 것

| 방법 | 성공 사례 | 이유 |
|---|---|---|
| **WebFetch → PDF URL → Read tool (pages)** | 연세대 `2028_plan.pdf` | 직접 공개 URL, 인증 불필요, 바이너리 저장 후 Read tool로 이미지 추출 가능 |
| **PowerShell Invoke-WebRequest + Referer 헤더** | 서울대 `snu_2028_official.pdf` (743KB) | 서버가 Referer 헤더 확인 → 공지 URL을 Referer로 설정하면 PDF 다운 허용 |
| **WebSearch → 언론 기사·분석 사이트** | CAU 응통 모집인원, SKKU 수능 반영 | JS 렌더링 사이트 우회 가능. 다만 *공식 PDF 대비 신뢰도 ★★★☆☆* |
| **Nick이 PDF 이미지 직접 제공** | 서울대 PDF 1-5쪽, 연세대 PDF | 100% 확실, 추가 탐색 불필요 |

---

## ❌ 안 되는 것 (이유 포함)

| 방법 | 실패 사례 | 실패 이유 |
|---|---|---|
| **SKKU 공지 noticeView.html?idx=XXX WebFetch/PowerShell** | 59298~59830 전 범위 | 서버가 JS shell만 반환. 실제 게시물 데이터는 클라이언트 JS → API 호출. GET 요청으로는 내용 없음 |
| **SKKU download.php 직접 URL 추측** | `board/20260430XXXXXXX.pdf` | URL에 랜덤 해시(예: `VXQPU2`) 포함 → 추측 불가 |
| **negagea.net CDN SKKU 2028** | `univ_info2026/성균관대학교/...pdf` | 아직 2026 데이터 없음 (404). 2027 plan은 `univ_info2025`에 있었음 |
| **adiga.kr SKKU 2028 다운로드** | JS 렌더링으로 링크 비활성화 | JS 렌더링 포털 → WebFetch로 빈 결과. 링크도 "해당연도 발표 전" 상태 |
| **CAU FORMULA 페이지 WebFetch** | `formula.cau.ac.kr` | 완전한 JS SPA 구조 → WebFetch 시 빈 결과 (React/Vue 앱 추정) |
| **WebFetch → JS 렌더링 사이트** | 대부분의 대학 입학처 메인, SKKU, CAU | WebFetch는 서버 응답 HTML만 파싱, JavaScript 실행 불가. 내용이 JS로 로딩되면 빈 페이지 |

---

## 🔍 학교별 PDF 접근 방법 판별 기준

```
대학 공식 PDF URL 직접 공개? ──YES──→ WebFetch → Read tool (연세대 패턴)
        │
       NO
        │
공지 URL + 파일 ID 필요? ─────YES──→ PowerShell + Referer 헤더 (서울대 패턴)
        │
       NO
        │
SKKU처럼 JS 렌더링만? ────────YES──→ (1) Nick 직접 다운로드
                                    (2) 언론 기사 우회
                                    (3) CDN 미러 탐색 (negagea.net 등)
```

---

## 📋 학교별 PDF 현황

| 학교 | PDF 확보 | 방법 | 신뢰도 |
|---|---|---|---|
| **연세대** | ✅ `yonsei_appstat_2028.md` | WebFetch 직접 URL | ★★★★★ |
| **서울대** | ✅ `snu_2028_official.pdf` + `snu_stat_2028.md` | PowerShell + Referer | ★★★★★ |
| **중앙대** | ✅ `cau_appstat_2028.md` | Nick 수동 다운로드 → 공식PDF 전면재작성 | ★★★★★ |
| **성균관대** | ✅ `skku_socsci_2028.md` | Nick 수동 다운로드 (idx=59465) | ★★★★★ |
| **고려대** | ✅ `korea_stat_2028.md` | Nick 수동 다운로드 → 공식PDF 전면재작성 | ★★★★★ |
| **한양대** | ✅ `hanyang_2028.md` | Nick 수동 다운로드 → 공식PDF 신규 작성 | ★★★★★ |
| **서울시립대** | ✅ `uos_stat_2028.md` | Nick 수동 다운로드 → 공식PDF 신규 작성 | ★★★★★ |

---

## 💡 향후 확보 방법

### SKKU 2028 PDF (가장 시급)
1. **Nick 직접 다운로드** — 브라우저로 `admission.skku.edu` 공지사항에서 직접
2. **negagea.net CDN** — 나중에 `univ_info2026/성균관대학교/` 경로 생성될 수 있음
3. **메가스터디/유웨이 분석 기사** — 수치만 필요하면 언론 우회 가능

### 고려대·한양대·시립대·CAU PDF
- **모두 Nick 수동 다운로드로 확보 완료** (2026-05-14)
- 분석 파일: `korea_stat_2028.md`, `hanyang_2028.md`, `uos_stat_2028.md`, `cau_appstat_2028.md`
- 향후 추가 학교: 동일 패턴(Nick 수동 다운로드 or PowerShell+Referer) 적용
