/* Veri-Sys 학습 앱 콘텐츠 — 21_Veri_Sys(비공개 워크스페이스)에서 증류한 공개 학습 로드맵.
   지속 업데이트: 이 파일만 고치면 앱이 갱신 (페이즈 진척·승격 지식 반영).
   원칙: 조직 내부 세부 사항 없음 — 전부 일반화된 방법론 수준. 특별한 아이디어는 공개 전 별도 판단.
   스타일: 영어 technical term 보존 + 한글 연결어. */
window.VS = {
  updated: "2026-08-17",
  title: "Veri-Sys · Verification System",
  subtitle: "SW+HW 검증을 하나의 체계로 — AI-driven 시대의 verification process 스터디",

  overview: {
    what:
      "20년 video codec IP RTL 설계 경험에서 출발해, \"검증 프로세스 리드가 된다면\"이라는 역할 가정 아래 " +
      "SW 검증(방법론·표준·자격 체계·TDD)과 HW DV를 하나의 체계로 재구성하는 개인 스터디. " +
      "AI-driven development가 들어오면서 '누가 무엇을 어떤 기준으로 검증하는가'를 처음부터 다시 짜야 한다는 문제의식이 출발점이다. " +
      "산출물은 두 층 — ① 기반 지식(표준·방법론을 실무 경험에 이름 붙이기) ② 정책(internal rule·workflow·multi-LLM 운용 기준).",
    frame: {
      title: "핵심 프레임 — 모든 검증 방법론이 답하려는 두 질문",
      qa: { k: "Q-A · Oracle", v: "정답을 어떻게 아는가 — 판정 기준(oracle) 없이는 테스트가 아무리 많아도 검증이 아니다." },
      qb: { k: "Q-B · Coverage", v: "충분히 봤는지 어떻게 아는가 — '안 본 곳'을 모르면 검증을 끝낼 수 없다." },
      note: "이 프레임으로 보면 방법론들은 경쟁 관계가 아니라 분업 관계다. TDD는 Q-A에 강하고 Q-B에 약하며, constrained-random+coverage는 그 반대. formal은 범위 내에서 Q-B를 '증명'으로 닫는다.",
    },
    objects: [
      { k: "c-model", v: "RTL의 oracle 역할을 하는 SW — 그 자체는 누가 검증하나?" },
      { k: "firmware", v: "HW 위에서 도는 SW — HW/model 의존 검증" },
      { k: "reference verification SW", v: "검증기 그 자체 — '검증 도구의 검증' 문제" },
      { k: "RTL IP · sub-module", v: "전통 DV 영역 — directed→CRV/UVM→formal" },
    ],
    objectsNote:
      "video codec IP 조직의 검증 대상은 이 네 종류가 얽혀 있고, 각각 oracle 가용성과 coverage 수단이 다르다. " +
      "그래서 검증 정책은 하나가 아니라 객체별 매트릭스가 되어야 한다. 특수 문제 = tool qualification: " +
      "c-model은 RTL의 oracle이면서 동시에 검증 대상이다.",
    mapping: [
      { dv: "Verification plan (vPlan)", sw: "Test plan · acceptance criteria", ai: "작업 지시에 완료 판정 기준을 먼저 명문화 (TDD 리듬)" },
      { dv: "Scoreboard + reference model", sw: "Test oracle · golden output", ai: "작성 세션과 분리된 독립 검증 세션 (자기 채점 금지)" },
      { dv: "Independent checker", sw: "Code review · 4-eyes", ai: "별도 세션의 adversarial review" },
      { dv: "Constrained-random", sw: "Property-based · fuzzing", ai: "반박 프롬프트(\"이 결론을 깨보라\") · 다관점 검증" },
      { dv: "Functional coverage", sw: "Coverage · mutation score", ai: "eval 통과율 · 시나리오/루브릭 커버리지" },
      { dv: "Assertion (SVA)", sw: "Runtime contract · lint gate", ai: "hooks — 도구 실행 전후 결정론적 자동 게이트" },
      { dv: "Regression suite", sw: "CI pipeline", ai: "headless 실행 + eval 정기 회귀" },
      { dv: "Sign-off criteria", sw: "Exit criteria", ai: "merge/publish 게이트: 리뷰 + eval + 사람 승인" },
      { dv: "Bug → regression 환류", sw: "Defect management", ai: "실패 사례를 eval 케이스로 영구 편입 (regression seeding)" },
    ],
    open:
      "미해결 축 하나 — AI 특유의 비결정성(같은 입력, 다른 출력)을 exit criteria에 어떻게 넣을 것인가. " +
      "기존 방법론에 직접 대응물이 없는 갭이며 P5의 핵심 질문이다.",
  },

  layers: [
    { id: "L0", name: "표준 · 어휘", q: "무슨 말로 말하고, 무엇이 이미 표준화되어 있는가",
      items: ["ISTQB CTFL v4.0 — 공용 어휘의 준 spec (7원칙, test level/type, entry/exit criteria)",
        "ISO/IEC/IEEE 29119 — SW 테스팅 국제 표준 본체 (ISTQB와의 관계 구분이 핵심)",
        "TMMi — 검증 프로세스 성숙도 모델. '어떤 기준에 의한 체계화'의 기성 답안"],
      src: "istqb.org 무료 PDF · tmmi.org", phase: "P1" },
    { id: "L1", name: "방법론 본체", q: "어떤 기법이 Q-A/Q-B 중 어느 질문에 답하는가",
      items: ["TDD family — oracle을 예제로 코드보다 먼저 고정하는 설계 리듬",
        "test double · test pyramid · property-based · fuzzing · mutation testing",
        "coverage 종류와 함정, exit criteria"],
      src: "Kent Beck 《TDD by Example》", phase: "P2" },
    { id: "L2", name: "조직 · 프로세스", q: "리드가 조직에 심는 것은 무엇인가",
      items: ["대규모 조직이 테스트를 문화로 만드는 법 (test size, flaky, CI)",
        "test management — 계획·모니터링·종료 기준·결함 관리",
        "risk-based testing"],
      src: "《SWE at Google》 테스팅 파트(무료) · CTAL-TM syllabus", phase: "P3" },
    { id: "L3", name: "검증 객체 지형", q: "우리 것(codec IP 스펙트럼)에 대입하면 무엇이 보이는가",
      items: ["{c-model, FW, ref-SW, RTL} × {oracle 가용성, coverage 수단, 관행, 갭} 매트릭스",
        "검증 도구의 검증 (tool qualification) — oracle 자체의 신뢰 문제",
        "RTL↔SW 검증 문화의 비대칭 — 교집합이 기회"],
      src: "실무 경험 + DV/SW 지도 문서", phase: "P4" },
    { id: "L4", name: "AI-driven 재검토", q: "작성자가 AI가 되면 무엇이 달라지는가",
      items: ["작성자≠검증자 원칙의 LLM 버전 (독립 검증 세션, multi-LLM cross-check)",
        "결정론 게이트 우선 (lint/컴파일/sim을 AI 산출물 게이트로 재배선)",
        "eval · regression seeding · 비결정성의 exit criteria (pass@k)"],
      src: "CT-AI syllabus · AI 작업 검증 패턴", phase: "P5" },
    { id: "L5", name: "정책 산출물", q: "결과물은 무엇인가",
      items: ["internal rules 초안", "verification workflow (skill/tool) 스케치",
        "sign-off 기준 · knowledge base 문서 표준", "multi-LLM 운용 기준"],
      src: "L0~L4의 증류", phase: "P5" },
  ],

  certMap: {
    note: "ISTQB syllabus는 전부 무료 공개 → 응시와 무관하게 '준 spec'으로 정독한다. 응시는 P1 후 판단.",
    tree: [
      { k: "CTFL v4.0", v: "Foundation — 공용 어휘", tag: "P1" },
      { k: "CTAL-TM", v: "Advanced Test Management — 프로세스 리드에 가장 직결", tag: "P3" },
      { k: "CT-AI", v: "Specialist — AI 시스템 테스팅", tag: "P5" },
      { k: "CT-TAE", v: "Specialist — 테스트 자동화 아키텍처", tag: "참고" },
    ],
  },

  phases: [
    { id: "P0", title: "워크스페이스 기틀", status: "done", goal: "역할 프레임·지형(L0~L5)·페이즈 확정, SSOT 구축", items: [],
      note: "2026-08-17 완료 — 목표 재해석, 학습 루프(정독→이름 붙이기→리드 시뮬레이션→승격) 확정." },
    { id: "P1", title: "ISTQB CTFL v4.0 정독", status: "next", goal: "공용 어휘와 프로세스의 뼈대 — syllabus를 준 spec으로",
      items: [
        { id: "p1a", t: "ISTQB 체계 지도 프라이머 정독 (CTFL 구조·자격 트리)" },
        { id: "p1b", t: "CTFL v4.0 syllabus PDF 확보 · 전체 구조 파악" },
        { id: "p1c", t: "테스팅 7원칙 × 20년 실무 경험 매핑" },
        { id: "p1d", t: "test level / test type · static vs dynamic 정리" },
        { id: "p1e", t: "entry/exit criteria · risk-based testing 정리" },
        { id: "p1f", t: "ISTQB ↔ ISO 29119 관계 정리 + 용어 사전 v1 승격" },
      ] },
    { id: "P2", title: "TDD 원류", status: "wait", goal: "《TDD by Example》 실습 — red-green-refactor를 손으로",
      items: [
        { id: "p2a", t: "oracle 유형 카탈로그 · TDD family 문서 정독" },
        { id: "p2b", t: "TDD by Example Part 1 실습 (Python으로 따라 하기)" },
        { id: "p2c", t: "test double · test pyramid 정리" },
        { id: "p2d", t: "\"TDD가 못 하는 것\" — Q-B 한계 정리" },
        { id: "p2e", t: "reference model류 SW 개발에 TDD 적용 시나리오 스케치" },
      ] },
    { id: "P3", title: "조직의 테스트 문화", status: "wait", goal: "《SWE at Google》 테스팅 파트 — 각 장을 '조직 번역' 연습으로",
      items: [
        { id: "p3a", t: "Ch.11 Testing Overview — 왜 조직 차원의 테스트인가" },
        { id: "p3b", t: "Ch.12 Unit Testing — 좋은 테스트의 성질" },
        { id: "p3c", t: "Ch.13 Test Doubles — 격리의 비용" },
        { id: "p3d", t: "Ch.14 Larger Testing — 통합·시스템 레벨" },
        { id: "p3e", t: "CTAL-TM syllabus 훑기 (test management 준 spec)" },
        { id: "p3f", t: "TMMi 성숙도 모델 개요 — 체계화 기준 후보 평가" },
      ] },
    { id: "P4", title: "검증 객체 지형 매핑", status: "wait", goal: "codec IP 검증 대상 전체를 oracle×coverage 매트릭스로",
      items: [
        { id: "p4a", t: "RTL DV 지도 · SW 테스팅 지도 문서 정독 (비대칭 정리)" },
        { id: "p4b", t: "{c-model, FW, ref-SW, RTL} × {oracle, coverage, 관행, 갭} 매트릭스 작성" },
        { id: "p4c", t: "\"검증 도구의 검증\" (tool qualification) 문제 정식화" },
        { id: "p4d", t: "갭 목록 도출 → 정책 backlog 적립" },
      ] },
    { id: "P5", title: "AI-driven 재검토 + 정책 v0", status: "wait", goal: "AI 작업 검증 패턴 + CT-AI → internal rule·workflow 초안",
      items: [
        { id: "p5a", t: "AI 작업 검증 패턴 카탈로그 정독 (독립 검증 세션, LLM-as-judge, eval)" },
        { id: "p5b", t: "CT-AI syllabus 정독 — 비결정성을 다루는지 확인" },
        { id: "p5c", t: "작성자≠검증자 · 결정론 게이트 우선 rule 초안" },
        { id: "p5d", t: "eval · regression seeding workflow 스케치" },
        { id: "p5e", t: "비결정성 exit criteria (pass@k) 정리" },
        { id: "p5f", t: "multi-LLM 운용 기준 초안 (역할 분담·cross-check)" },
      ] },
  ],

  sources: [
    { title: "ISTQB CTFL v4.0 Syllabus", note: "Foundation — 공용 어휘의 준 spec, 무료 PDF", url: "https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/", tag: "syllabus" },
    { title: "ISTQB CT-AI Syllabus", note: "AI 시스템 테스팅 — P5의 준 spec", url: "https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/", tag: "syllabus" },
    { title: "ISTQB 자격 전체 목록 (CTAL-TM 등)", note: "Advanced·Specialist syllabus 전부 무료", url: "https://istqb.org/certifications/", tag: "syllabus" },
    { title: "Software Engineering at Google", note: "무료 웹 공개 — Ch.11~14 테스팅 파트가 P3 교재", url: "https://abseil.io/resources/swe-book", tag: "book-free" },
    { title: "Kent Beck — TDD by Example", note: "TDD 원전, P2 교재 (유료 도서)", url: "https://www.oreilly.com/library/view/test-driven-development/0321146530/", tag: "book" },
    { title: "ISO/IEC/IEEE 29119-1:2022", note: "SW 테스팅 국제 표준 본체 — ISTQB와의 관계가 P1 정리 대상", url: "https://www.iso.org/standard/81291.html", tag: "standard" },
    { title: "TMMi Foundation", note: "검증 프로세스 성숙도 모델 — framework 무료 PDF", url: "https://www.tmmi.org/", tag: "standard" },
    { title: "Siemens Verification Academy", note: "무료 — verification planning / coverage 코스 (HW 쪽 보완)", url: "https://verificationacademy.com/", tag: "course" },
    { title: "Hypothesis (Python)", note: "property-based testing 체험 도구 — P2 실습 후보", url: "https://hypothesis.readthedocs.io/", tag: "tool" },
  ],
};
