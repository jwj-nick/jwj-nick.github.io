# 웹서치·페치 로그 — 260514 R5 성균관대 경제학과 2028

> NCC 2026-05-14. **본격 작업 전 기초자료 수집** 단계. 모든 검색·페치 기록 보존.

---

## 컨텍스트

- 요청: "임시로 성균관대 경제학과를 기준으로 2028년 모집 정보 찾아봐주길.. 2026년 4월 30일에 각 대학들이 2028 입시에 대한 발표를 했다고 하던데"
- 발표 시점: **2026-04-30** = 한국대학교육협의회(대교협)가 194개 회원대학 *2028학년도 대학입학전형시행계획* 일제 공시일
- 아들 적용 학년도: **2028학년도 입학** (수능 2028.11.16 예정, 2026 현재 고1)
- 첫 PoC 대상으로 성균관대 경제학과 선택 → 실제 작업은 *사회과학계열* (광역 모집) 단위로 분석됨

---

## 검색 쿼리 + URL 인덱스

### Search 1: 성균관대 2028 시행계획
`Q: "성균관대학교 2028학년도 대학입학전형시행계획 발표 2026년 4월 30일"`

링크:
- https://www.skku.edu/skku/edu/bachelor/ca_de_schedule.do (학사일정)
- https://admission.skku.edu/admission/html/ipsi/notice.html ★ 통합공지
- https://admission.cha.ac.kr/.../?mod=document&uid=3296 (차의과대 — 참고)
- https://admission.skku.edu/common/download.php?fpath=board/20240530115427VXQPU2.pdf — **2026학년도 PDF** (구버전)
- https://cdn013.negagea.net/.../성균관대학교_2026학년도_대학입학전형계획.pdf — **2026 미러**
- https://www.jinhak.com/jh/high3/univ-entrance-info/ipsi-analysis/ipsi-strategy/160001125 (진학사 25 vs 26 분석)
- https://admission.skku.edu/admission/html/rolling/noticeView.html?idx=59307

### Search 2: 대교협 2028 발표 일반
`Q: "2028학년도 대학입학전형 시행계획 한국대학교육협의회 4월 30일 발표"`

링크:
- https://www.kcue.or.kr/_upload/news/2025/08/28/application_e184daa942fe84363f0a4d34381665f3.pdf — **대교협 2028 기본사항 (2025.08)**
- https://namu.wiki/w/2028%20대학입시제도%20개편 — 나무위키
- https://www.leaderstimes.co.kr/news/view.php?no=31847
- https://www.jeongpil.com/2515928
- https://www.idaegu.com/news/articleView.html?idxno=661454 (대구일보)
- https://www.newspim.com/news/view/20260430001047 (뉴스핌)
- https://www.moe.go.kr/boardCnts/fileDown.do?m=020402&s=moe&fileSeq=c6771be19593d96923d194f9281f7c47 — **교육부 다운로드**
- https://ipsi.hknu.ac.kr/upload_data/notice/20260429184615_25.pdf — **한경국립대 2028 시행계획 (HKNU)** ★참고용 구조
- https://www.fnnews.com/news/202604301200517272 (파이낸셜뉴스 — 5등급제 첫 적용, 수시 80.8%)

### Search 3: 성균관대 시행계획 site 한정
`Q: "성균관대 2028학년도 입학전형 시행계획 경제학과 사회과학계열 site:admission.skku.edu"`

링크:
- https://admission.skku.edu/admission/html/ipsi/noticeView.html?idx=59298 — **2027학년도 공지** (참조 기준)
- https://admission.skku.edu/admission/html/regular/guide.html (정시 모집요강)
- https://admission.skku.edu/admission/html/rolling/guide.html (수시 모집요강)
- https://admission.skku.edu/admission/html/ipsi/noticeView.html?idx=59161
- https://admission.skku.edu/admission/html/abroad/notice.html (재외국민)

### Search 4: 2028 PDF filetype
`Q: '"2028학년도" "성균관대" "시행계획" filetype:pdf'`

링크:
- https://files-scs.pstatic.net/2025/05/08/2A24OCxaDP/2028%20전형%20연구.pdf — **2028 전형 개선 연구 (네이버 캐시)**
- https://ipsi.hknu.ac.kr/upload_data/notice/20260429184615_25.pdf (HKNU 2028)
- https://school.busanedu.net/upload/bbs/files/2025/hgschl/gaesung-h/ntt/1018346/05/8b87c5740f7a1d24006bbe419a6e746d.pdf — **개성고 자료실 2028 기본사항**
- https://files-scs.pstatic.net/2024/07/02/Ic4S8r8egU/...2028+대학입시제도+개편+확정안.pdf — **교육부 2028 확정안 (네이버 캐시)**
- https://files-scs.pstatic.net/2024/04/23/.../대학교육지%20224호%20-%20이슈%20진단%20및%20분석.pdf — **대학교육 224호**

### Search 5: 2028 SKKU 경제학과 모집인원
`Q: "성균관대 2028 사회과학계열 모집인원 학생부교과 학생부종합 논술 정시"`

링크:
- https://admission.skku.edu/admission/html/rolling/guide.html
- https://www.adiga.kr/man/sch/searchView.do?menuId=PCMANSCH5001&checkMiss=1&search=성균관대학교 — **어디가 검색**
- https://www.adiga.kr/ucp/uvt/uni/univDetail.do?menuId=PCUVTINF2000&searchSyr=2026&unvCd=0000133 — **어디가 SKKU 상세**
- https://www.kyobit.com/news/articleView.html?idxno=246 (연세·성균·경희·중앙 공동연구)
- https://namu.wiki/w/성균관대학교/학부 — 학부 구조 참조
- https://addon.jinhakapply.com/RatioV1/RatioH/Ratio10920201.html — **진학사 경쟁률 서비스**
- https://www.kyobit.com/news/articleView.html?idxno=5220 ★★ **2028 한양대 vs 성균관대 노선 비교** ★★

### Search 6: 상위15개대 변화
`Q: '"2028학년도" 성균관대 시행계획 경상계열 경제학과 모집인원 수시 정시'`

링크:
- https://www.megastudy.net/Entinfo/ipsi_News/news_view_ax.asp?idx=7506 — **정시 학생부 폐지/반영 변화**
- http://www.veritas-a.com/news/articleView.html?idxno=562665 — **상위15개대 정성평가 강화 단독**
- http://www.veritas-a.com/news/articleView.html?idxno=546393 — **SKY 정시 축소**
- https://riroschool.kr/kceenews/detail/242 — **2028 주요 대학 변화 (리로스쿨)**
- https://www.betanews.net/article/view/beta202605130022 ★ **2028 SKKU 교과전형 분석 (2026.05.13)**

---

## 페치한 페이지 핵심 정리

### A. 대교협 공식 발표 (2026-04-30)
- 전국 2028학년도 총 모집 *348,789명* (전년 +3,072)
- 수시 281,895명 (**80.8%**) — 전년 +0.5%p
- 정시 66,894명 (**19.2%**) — 전년 -1,240명
- **내신 5등급제** 첫 적용, **통합형 수능** 첫 적용 (국·수·탐 선택과목 폐지)

### B. 성균관대 노선 — "수능 사수"
- 한양대 학종 올인 vs **SKKU 수능 사수** 노선 (kyobit 5220)
- 정시 비중 유지 (사회과학계열도 정시 *국어+탐구 특화* 도입)
- 수시 학생부교과: 정성평가 30%로 확대 (정량 70% = 공통 35 + 선택 35)
- 수능최저학력기준 **3개 영역 합 7** 요구 (교과)
- 정시 30% 축소 자율권은 서울대·한양대·동국대만 (SKKU 미포함)

### C. SKKU 2028 모집 구조 (전체)
| 구분 | 인원 | 핵심 |
|---|---|---|
| 수시 학생부교과 (추천인재) | 415 | 정량 70% + 정성 30%. 졸업예정자만 |
| 수시 학생부종합 | 1,270 | 4트랙: 융합인재 325 + 탐구인재 568 + 면접형 성균인재 222 + ? |
| 수시 논술 | 376 | 언어형 156 + 수리형 220. 인문·사회 3합6, 일부 이공 3합5 |
| 정시 일반형 | 1,307 | 가·나·다군 수능 100% |
| 정시 특화형 | 150 | 사회과학 *국어+탐구* / 공학 *수학+탐구* |
| **수시 합계** | **2,367** | 57% |
| **정시 합계** | **1,708** | 43% |
| 총계 | 4,075 |  |

### D. 학종 트랙 세부 (kyobit 5220)
- 융합인재 (325): 수능최저 3합6 적용
- 탐구인재 (568): 수능최저 **미적용**
- 면접형 성균인재 (222): *사회과학계열·공학계열 신규 포함*

### E. 상위15개대 공통 흐름
- 정성평가를 교과·정시까지 확산
- 5개교(서울·고대·연대·경희·인하): **권장과목/심화과목 이수 평가**
- 시립대·인하대: **면접 강화**
- SKKU: 정성평가 확대 + 면접형 학종 확대 (단, 권장과목 가/감점은 공시 안 됨)

### F. 경제학과 진입 경로 — 성균관대 구조
- **경제학과는 단독 모집단위 ✗**. *사회과학계열* 광역 모집 후 진입.
- 사회과학계열 = 경제·정치외교·사회·사회복지·심리·미디어커뮤니케이션·소비자·통계 등 포함
- 진입 = 1학년 *학점·면담* 결과로 2학년 학과 결정
- 따라서 *경제 지망생*도 입시는 *사회과학계열 단위*로 대비

---

## 검증 한계 (반드시 기억)

1. **공식 PDF 직접 확보 실패** — admission.skku.edu의 download.php는 세션/JS 필요. 미러는 dead.
2. 위 수치들은 *언론 분석 기사* 인용. *대학 공식 발표 원문 확인은 보류*.
3. 시행계획은 *큰 틀*만 공시. **실제 모집요강(전형 세부)**은 *시험 학년도 5~6월에 별도 공시* (즉 2027년 봄).
4. 2026~2028 사이에 수정 가능성 있음 (대교협 1차 시행계획 후 *수정/추가 공지* 통상 발생).
5. 아들 입시 *최종 기준*은 **2028년 5월경 공시되는 모집요강**.

---

## 다음 단계 후보

- [ ] 공식 PDF 직접 다운로드 (수동 — Nick이 admission.skku.edu 방문)
- [ ] 대교협 *대입정보포털(어디가)* 로그인 후 SKKU 상세 확인
- [ ] HKNU 2028 PDF로 *시행계획 표 구조* 분석 (자동 파싱 가능성 평가)
- [ ] 네이버 캐시의 *2028 전형 개선 연구 PDF* 확보
- [ ] 어디가 robots.txt 확인 (자동 수집 가능 여부)

---

## 사용한 도구·횟수

- WebSearch × 6
- WebFetch × 7 (성공 5, 실패 2: cdn redirect dead, namu wiki 403)
- 총 페이지 데이터 약 30개 URL 인덱스 확보

---

## 메모 (다음 세션을 위한 힌트)

- *어디가 + 한경국립대 PDF* 조합이 *시행계획 표 구조*를 가장 잘 보여줌
- 입시 분석 기사 중 *kyobit·veritas-a·riroschool·betanews*가 깊이 있음
- *megastudy 7506*은 정시 학생부 트랙 변화 핵심 자료
- *나무위키 2028 대학입시제도 개편*은 403이라 일반 검색으로 우회
- 성균관대 *입학처 download.php*는 직접 페치 실패 → 브라우저 수동
