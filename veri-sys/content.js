/* Veri-Sys 학습 앱 콘텐츠 — 21_Veri_Sys(비공개 워크스페이스)에서 증류한 공개 학습 로드맵.
   지속 업데이트: 이 파일만 고치면 앱이 갱신 (페이즈 진척·승격 지식 반영).
   원칙: 조직 내부 세부 사항 없음 — 전부 일반화된 방법론 수준. 특별한 아이디어는 공개 전 별도 판단.
   스타일: 영어 technical term 보존 + 한글 연결어.
   v0.2 (2026-08-18): P1 정독 가이드 탭 추가 — CTFL v4.0.1 실물 PDF에서 추출한 구조 기반.
   v0.3 (2026-08-19): "지금 여기" 상태 카드 + P2 예습 챕터(TDD by Example) + 동료 참조용 공개 톤 정비. */
window.VS = {
  updated: "2026-08-19",
  title: "Veri-Sys · Verification System",
  subtitle: "SW+HW 검증을 하나의 체계로 — AI-driven 시대의 verification process 스터디",

  /* 매 라운드 갱신: 지금 어디에 있고, 다음 작업이 무엇인지. */
  status: {
    round: "R3 · 2026-08-19",
    headline: "P1 진행 중 — CTFL 정독(self-paced) · P2 예습 챕터(TDD) 공개됨",
    next: [
      { who: "Nick", t: "정독 탭에서 CTFL Ch.0 → Ch.1 — 읽고 '정독 완료' 체크, Ch.1 리드 시뮬레이션 질문에 답 만들어 오기" },
      { who: "Nick", t: "(가벼운 예습) 정독 탭 하단 P2 그룹의 TDD 소개 챕터 — 책 재독 전 감각 복원" },
      { who: "다음 세션", t: "Ch.1 답 토론 → 워크스페이스 10_Knowledge/L0_istqb/에 용어 사전 v1 첫 승격" },
      { who: "이후", t: "Ch.2~6 동일 리듬 → Sample Exam A 모의(40문항·60분) → P1 증류 완료 → P2(TDD 실습) 진입" },
    ],
  },

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

  /* ───────────────────────── P1 정독 가이드 ─────────────────────────
     CTFL v4.0.1 (2024-09-15, 78p) 실물 PDF에서 추출: 장 구성·분량·키워드·LO 수.
     각 장 = 요약(앱에서 내용 파악용) + Nick 렌즈 + 리드 시뮬레이션 + 회사 적용 아이디어. */
  p1: {
    doc: {
      name: "ISTQB CTFL Syllabus v4.0.1",
      meta: "2024-09-15 · 78p · LO 64개 (K1 14 · K2 42 · K3 8)",
      local: "refs/istqb/ISTQB_CTFL_Syllabus_v4.0.1.pdf",
      exam: "시험: 40문항 · 합격 26/40(65%) · 60분(비원어민 +25%) · closed-book. Intro/Appendix 제외 전 절 출제.",
      samples: "Sample Exam A~D 문제+정답해설 로컬 확보 — 전 장 정독 후 Set A를 모의로, B~D는 보강용.",
    },
    loop: [
      "① 정독 — 장 원문을 PDF로 읽는다 (이 탭의 요약은 지도이지 대체물이 아님)",
      "② 이름 붙이기 — 20년 실무에서 겪은 현상에 syllabus 용어를 연결",
      "③ 리드 시뮬레이션 — 각 장의 질문에 리드로서 답을 써본다",
      "④ 승격 — 이해·동의한 것만 10_Knowledge/로, 정책 아이디어는 20_Policy/backlog로",
    ],
    principles: [
      { n: 1, name: "결함의 존재는 보여도, 부재는 증명 못 한다", codec: "sim 전부 통과 ≠ 무결함 — 테이프아웃 후에도 buglist가 늘 있는 이유" },
      { n: 2, name: "Exhaustive testing은 불가능하다", codec: "그래서 CRV + functional coverage가 존재한다 — 전수 대신 공간 탐색+측정" },
      { n: 3, name: "Early testing이 시간과 돈을 아낀다", codec: "스펙 리뷰에서 잡은 버그가 제일 싸다. netlist 이후 버그의 비용을 우리는 안다" },
      { n: 4, name: "결함은 뭉쳐 있다 (defect clustering)", codec: "버그는 특정 블록·특정 조합에 몰린다 — risk-based 차등 검증의 근거" },
      { n: 5, name: "테스트는 낡는다 (tests wear out)", codec: "고정 regression suite는 새 버그를 못 잡는다 — 시드·스트림 갱신이 필요한 이유" },
      { n: 6, name: "테스팅은 context 의존적이다", codec: "IP마다 검증 전략이 달랐고, c-model과 RTL의 검증법이 다른 것이 정상" },
      { n: 7, name: "무결함의 오류 (absence-of-defects fallacy)", codec: "스펙 conformance 전부 통과해도 고객 시나리오에서 깨지면 실패 — verification만으로 부족, validation 필요" },
    ],
    chapters: [
      { id: "p1-ch0", no: "Ch.0", title: "Introduction — 오리엔테이션", mins: null, lo: null,
        secs: ["0.4 Business Outcomes", "0.5 LO와 K-level (K1 recall / K2 understand / K3 apply)", "0.6 시험 구조"],
        keys: ["K-level", "learning objective", "business outcome"],
        sum: [
          "syllabus는 '준 spec'이다 — 모든 절이 examinable LO(FL-x.y.z)로 태깅되어 있고, K-level이 요구 깊이를 정의한다.",
          "K1=기억해낸다, K2=설명·비교할 수 있다, K3=주어진 상황에 적용할 수 있다 — 4장(기법)에만 K3가 몰려 있다.",
          "Intro와 Appendix는 시험 범위 밖. 참고 표준(ISO 29119 등)은 syllabus에 요약된 만큼만 출제.",
        ],
        nick: "K-level 분포를 보면 이 자격의 성격이 보인다 — 64개 LO 중 42개가 K2(설명), K3(적용)는 8개뿐. 즉 CTFL은 '실기'가 아니라 '공용 어휘 시험'이다. 우리가 이걸 읽는 목적(어휘 획득)과 정확히 일치한다.",
        lead: "K1/K2/K3 아이디어를 사내 지식 승격 기준으로 차용한다면 — '들어봤다/설명할 수 있다/적용해봤다'를 knowledge base 문서의 상태 태그로 쓸 수 있는가?",
        apply: [
          "지식 승격 게이트에 K-level 차용: K2(내 말로 설명 가능)가 되어야 10_Knowledge/ 승격, K3(실작업 적용)가 되어야 rule 승격.",
        ] },
      { id: "p1-ch1", no: "Ch.1", title: "Fundamentals of Testing", mins: 180, lo: 14,
        secs: ["1.1 What is Testing?", "1.2 Why is Testing Necessary?", "1.3 Testing Principles (7원칙)", "1.4 Test Activities · Testware · Roles", "1.5 Skills · Whole Team · Independence"],
        keys: ["verification vs validation", "error → defect → failure", "root cause", "test basis", "testware", "traceability", "test process", "independence of testing"],
        sum: [
          "testing = 실행(dynamic)만이 아니라 리뷰·정적 검사까지 포함한 프로세스. verification(스펙대로 만들었나)과 validation(요구를 충족하나)을 둘 다 다룬다.",
          "목적은 결함 발견만이 아니다 — 품질 정보 제공, 의사결정 근거, 결함 예방(shift left), 요구사항 검증까지 스펙트럼.",
          "인과 사슬: error(사람의 실수) → defect(산출물 속 결함) → failure(실행 시 오동작). root cause는 error를 낳은 더 깊은 원인.",
          "testing ≠ QA: testing은 product-oriented(결함을 찾는다), QA는 process-oriented(프로세스를 좋게 해 결함을 예방한다).",
          "test process 7활동: planning → monitoring & control → analysis → design → implementation → execution → completion.",
          "testware = 테스트가 만드는 모든 산출물(계획·케이스·데이터·스크립트·리포트) — 형상관리 대상.",
          "independence of testing 스펙트럼: 작성자 본인 → 같은 팀 동료 → 독립 테스트 팀 → 조직 외부. 독립성이 높을수록 자기 확신 편향에서 자유롭다.",
        ],
        nick: "RTL sim에서 mismatch(failure)를 보고 waveform으로 defect를 찾고 '왜 이렇게 설계했지'(error/root cause)까지 내려가는 일상이 1.2.3의 사슬 그대로다. '설계자가 아닌 사람이 TB를 만든다'는 오랜 관행에는 1.5.3 independence of testing이라는 이름이 있다.",
        lead: "c-model·FW·RTL 각각에 대해 '작성자≠검증자' 독립성이 지금 어느 수준인지 그려보고 — AI가 작성자가 되는 순간 이 스펙트럼에서 AI 산출물 검증을 어디에 배치할 것인가?",
        apply: [
          "7원칙을 검증 킥오프 1페이지 체크리스트로 — 특히 원칙1을 'sim/test 통과 = 무결함 증명 아님' 문구로 AI 산출물 게이트에 명문화.",
          "버그 티켓 필드를 error/defect/failure/root cause로 표준화 — root cause 필드 필수화가 재발 방지의 시작.",
          "testware 목록(TB·시드·스크립트·커버리지 DB)을 형상관리·리뷰 대상으로 rule화 — '테스트 코드도 코드다'.",
        ] },
      { id: "p1-ch2", no: "Ch.2", title: "Testing Throughout the SDLC", mins: 130, lo: 10,
        secs: ["2.1 SDLC와 테스팅 (test-first · DevOps · shift left · retrospective)", "2.2 Test Levels & Test Types", "2.3 Maintenance Testing"],
        keys: ["test level", "test type", "shift left", "confirmation vs regression", "component/system/acceptance testing", "test-first"],
        sum: [
          "test level 5종 사다리: component → component integration → system → system integration → acceptance. 레벨마다 목적·test basis·대상 결함이 다르다.",
          "test type 구분: functional(무엇을 하나) / non-functional(얼마나 잘 하나: 성능·보안·사용성) / black-box vs white-box. 모든 레벨에서 모든 타입이 가능.",
          "confirmation testing(고친 것이 고쳐졌나) vs regression testing(다른 곳이 안 깨졌나) — 목적이 다르므로 분리해서 세어야 한다. 회귀는 자동화가 정답.",
          "shift left: 검증 활동을 시간축 왼쪽(이른 단계)으로 — 스펙 리뷰, 정적 분석, test-first 접근(TDD/ATDD/BDD가 여기 속한다).",
          "DevOps: CI/CD 파이프라인이 '모든 커밋마다 자동 검증'을 가능하게 하지만, 자동 테스트웨어의 유지보수 비용을 낳는다.",
          "retrospective = 프로세스 개선의 공식 환류 고리.",
        ],
        nick: "IP 레벨 sim → 서브시스템 통합 → full-chip → FPGA/실리콘 브링업이라는 익숙한 사다리가 test level의 HW판이다. conformance 스트림 회귀는 regression, 버그픽스 재현 스트림 재실행은 confirmation — 우리는 이 둘을 종종 한 단어('회귀')로 뭉쳐 불렀다.",
        lead: "{c-model, FW, ref-SW, RTL} 각각의 test level 사다리를 그려본다면 — 지금 조직에서 부르는 이름들과 ISTQB 이름이 어디서 어긋나고, 어긋남이 소통 비용을 만드는 지점은 어디인가?",
        apply: [
          "객체별 test level 정의서 — 레벨마다 목적·test basis·oracle·완료 기준을 한 줄씩. 조직 공용 어휘의 뼈대.",
          "confirmation과 regression을 분리 집계 — '고침 확인'과 '회귀망 유지'를 다른 메트릭으로.",
          "AI-driven의 shift left = 작업 지시 단계에 acceptance 기준 선명문화 (TDD 리듬의 조직 rule화, 매핑 표 1행).",
        ] },
      { id: "p1-ch3", no: "Ch.3", title: "Static Testing", mins: 80, lo: 8,
        secs: ["3.1 Static Testing Basics (vs Dynamic)", "3.2 Feedback & Review Process (활동·역할·유형·성공 요인)"],
        keys: ["static analysis", "review", "informal review", "walkthrough", "technical review", "inspection", "anomaly"],
        sum: [
          "static = 실행 없이 검사: 리뷰(사람)와 static analysis(도구). 코드만이 아니라 스펙·계획·테스트웨어·계약까지 '읽을 수 있는 모든 산출물'이 대상.",
          "dynamic이 못 잡는 것을 직접 잡는다: 도달 불가 코드, 표준 위반, 스펙 모호성·불일치 — failure를 거치지 않고 defect를 바로 본다.",
          "review 공식화 스펙트럼: informal(가볍게) → walkthrough(작성자 주도) → technical review(전문가 합의) → inspection(규칙·메트릭 기반, 가장 공식적).",
          "review process 활동: planning → review initiation → individual review → communication & analysis → fixing & reporting.",
          "역할 분담: author / moderator(진행) / scribe(기록) / reviewer / review leader — 역할 분리가 리뷰 품질을 만든다.",
          "성공 요인: 명확한 목표·체크리스트·적절한 참가자, 그리고 '결함은 산출물 탓이지 사람 탓이 아니다'라는 심리적 안전.",
        ],
        nick: "RTL lint·CDC·synthesis 전 체크는 static analysis의 HW판이고, 우리 스펙 리뷰 회의는 대부분 informal~walkthrough 사이 어디쯤이었다. inspection급 공식 리뷰를 어디에 쓰는가를 보면 조직의 리뷰 성숙도가 드러난다.",
        lead: "AI가 생성한 코드·문서의 리뷰를 review type 스펙트럼 어디에 둘 것인가 — 사람 리뷰는 어느 수준으로 남기고, 무엇을 static analysis(결정론 게이트)로 내려보낼 것인가?",
        apply: [
          "산출물 등급별 요구 리뷰 수준 매트릭스 — 스펙=technical review 이상, AI 생성 코드=자동 게이트+사람 1인, 등.",
          "lint/컴파일/정적 분석을 AI 산출물의 1차 결정론 게이트로 명문화 — 씨앗 S1(툴체인 재배선)의 이론적 근거가 이 장.",
          "리뷰 체크리스트를 knowledge base로 축적 — 발견된 버그 패턴이 곧 다음 체크리스트 항목 (환류).",
        ] },
      { id: "p1-ch4", no: "Ch.4", title: "Test Analysis and Design", mins: 390, lo: 14,
        secs: ["4.1 Techniques Overview", "4.2 Black-box: EP · BVA · Decision Table · State Transition", "4.3 White-box: Statement/Branch Coverage", "4.4 Experience-based: Error Guessing · Exploratory · Checklist", "4.5 Collaboration-based: User Story · Acceptance Criteria · ATDD"],
        keys: ["equivalence partitioning", "boundary value analysis", "decision table", "state transition", "statement/branch coverage", "coverage item", "error guessing", "exploratory testing", "ATDD"],
        sum: [
          "기법 3분류: black-box(스펙 기반)·white-box(구조 기반)·experience-based(직관·이력 기반) + collaboration-based 접근(ATDD). 최대 분량(390분)에 K3(적용) LO가 몰린 실기 장.",
          "EP(equivalence partitioning): 같은 취급을 받는 입력을 파티션으로 묶고 파티션당 대표 1개 — '같은 buggy면 같이 buggy'라는 가설.",
          "BVA(boundary value analysis): 결함은 경계에 산다 — min/max와 그 ±1. EP의 경계 특화판.",
          "decision table: 조건 조합의 체계적 열거 — 모드/플래그 조합 검증. state transition: 상태×이벤트 표 — all states / all transitions 커버리지.",
          "white-box: branch coverage 100%가 statement coverage 100%를 함의(역은 성립 안 함). 커버리지 100% = '다 검증됨'이 아니라 '안 본 곳이 없음'의 최소 증명.",
          "coverage item 개념이 핵심 — 각 기법은 '세어야 할 단위'(파티션, 경계, 규칙, 전이, 분기)를 정의하고, coverage = 실행된 item / 전체 item.",
          "experience-based는 체계 기법의 보완재: error guessing은 버그 이력이 재료, exploratory는 학습·설계·실행을 동시에.",
          "ATDD: acceptance criteria를 먼저 합의하고 그것을 테스트로 만들어 개발을 이끈다 — TDD의 요구사항 레벨판.",
        ],
        nick: "EP/BVA는 해상도·비트뎁스·레벨 한계 파라미터 sweep으로 매일 하던 것이고, state transition testing은 디코더 FSM 검증 그 자체다. SW branch coverage는 RTL code coverage(line/branch/FSM/toggle)와 나란히 놓이고, coverage item = covergroup bin이라고 읽는 순간 4장 전체가 익숙한 지형이 된다.",
        lead: "AI에게 테스트 생성을 시킬 때 '어떤 기법으로 어떤 coverage item을 몇 개' 만들지 명시하게 한다면 — 우리 작업 지시 템플릿에는 어떤 필드가 들어가야 하는가?",
        apply: [
          "자극 설계에 기법 이름 붙이기 — 테스트 리뷰의 표준 질문: 'BVA 됐나? 상태 전이 다 돌았나? 이 decision table의 빈 칸은?'",
          "AI 테스트 생성 프롬프트에 기법 명시(EP/BVA/decision table/state transition) + coverage item 목록 요구 — 생성물 평가가 가능해진다.",
          "ATDD를 AI 작업 지시의 기본형으로: acceptance criteria 먼저, 구현 나중 — 매핑 표 1행의 근거 조항.",
        ] },
      { id: "p1-ch5", no: "Ch.5", title: "Managing the Test Activities", mins: 335, lo: 16,
        secs: ["5.1 Test Planning (plan · entry/exit criteria · estimation · prioritization · pyramid · quadrants)", "5.2 Risk Management (product vs project risk)", "5.3 Monitoring · Control · Completion (메트릭·리포트)", "5.4 Configuration Management", "5.5 Defect Management"],
        keys: ["test plan", "entry criteria", "exit criteria", "risk-based testing", "product risk", "test pyramid", "testing quadrants", "defect report", "test completion report"],
        sum: [
          "test plan = 범위·접근법·자원·일정·기준의 문서 — vPlan의 SW 이름. 계획은 문서가 아니라 '생각을 강제하는 행위'.",
          "entry criteria(시작해도 되는 조건) / exit criteria(끝났다고 선언하는 조건) — '언제 끝인가'의 공식 답. 보통 커버리지 달성 + 미해결 결함 기준 + 잔여 리스크 수용.",
          "estimation 4법: ratio(이력 비율) · extrapolation(외삽) · wideband delphi(전문가 합의) · three-point estimation.",
          "risk-based testing: product risk(제품이 잘못될 위험)와 project risk(일정·자원 위험)를 구분 → risk level = likelihood × impact → 검증의 깊이·순서를 차등.",
          "test pyramid: 아래층(작고 빠른 테스트 다수) → 위층(크고 느린 E2E 소수). testing quadrants: 비즈니스/기술 관점 × 팀 지원/제품 평가의 4분면 지도.",
          "monitoring 메트릭 → progress report(진행 중) → completion report(종료 시) — 보고는 청중별로 다르게.",
          "defect management: 결함 보고의 표준 필드(재현 절차·기대vs실제·심각도)와 생애주기 — 결함은 데이터다.",
        ],
        nick: "테이프아웃 sign-off 회의에서 커버리지 %와 open bug 목록으로 go/no-go를 정하던 것이 exit criteria 그 자체다. '위험한 블록부터 깊게 판다'는 직감적 우선순위에는 risk-based testing이라는 이름과 likelihood×impact라는 계산법이 붙어 있다.",
        lead: "AI 산출물의 exit criteria를 정의한다면 — 결정론 게이트 통과·eval 통과율·사람 승인 중 무엇을 필수 조건으로 놓고, 그 임계값(예: eval 몇 %)은 누가 어떤 근거로 정하는가?",
        apply: [
          "vPlan 템플릿에 entry/exit criteria를 명시적 필드로 — '끝났다'의 정의를 계획 시점에 강제하는 rule.",
          "risk-based 차등 파이프라인: 산출물 위험 등급별로 검증 깊이를 달리 (high = 사람 리뷰 필수 + 전체 회귀, low = 자동 게이트만).",
          "defect report 표준 필드 + 실패 사례의 eval 케이스 자동 환류(regression seeding)를 결함 프로세스에 내장.",
        ] },
      { id: "p1-ch6", no: "Ch.6", title: "Test Tools", mins: 20, lo: 2,
        secs: ["6.1 Tool Support for Testing", "6.2 Benefits and Risks of Test Automation"],
        keys: ["test automation"],
        sum: [
          "도구 스펙트럼: 테스트 관리·정적 분석·설계·실행·커버리지 측정·성능·CI/CD — 거의 모든 활동에 도구 지원이 존재.",
          "자동화의 이득: 반복의 신뢰성, 회귀 속도, 사람 시간을 더 가치 있는 일로. 위험: 도구 과신, 유지보수 비용 과소평가, 도구도 낡는다.",
          "20분짜리 미니 장이지만 — AI 도구 도입 정책(P5)의 씨앗이 되는 프레임.",
        ],
        nick: "EDA 툴체인은 이미 극단적 자동화 환경이다 — '자동화 과신의 위험'을 우리는 tool bug와 스크립트 부패(rot)로 이미 겪어서 안다. LLM 도구는 여기에 비결정성이라는 새 변수를 더한 것.",
        lead: "AI 도구 도입을 '새 EDA 툴 도입 평가'와 같은 절차에 태운다면 — 무엇이 같고(이득/위험/유지보수 평가), 무엇이 달라야 하는가(비결정성·환각 항목)?",
        apply: [
          "도구 도입 평가표(이득/위험/유지보수 주체/검증 방법)를 LLM 도구에도 동일 적용 — '특별 취급'이 아니라 '같은 규율 + 추가 항목'.",
        ] },
    ],
    extra: [
      { id: "p1-exam", t: "Sample Exam Set A 모의 (40문항 · 60분 · 26/40 합격선) — 오답을 용어 사전에 환류" },
      { id: "p1-dist", t: "증류·승격: 용어 사전 v1 (Nick의 언어로) + ISTQB↔ISO 29119 관계 정리 → 10_Knowledge/L0_istqb/" },
    ],
  },

  /* ───────────────────────── P2 예습 — TDD by Example 소개 챕터 ─────────────────────────
     Kent Beck 《Test-Driven Development: By Example》(2002)의 핵심을 한 페이지로.
     관점: 장난감 예제가 아니라 "수백 개 소스 파일 프로젝트"에서 TDD가 어떻게 동작하는가. */
  tdd: {
    id: "p2-tdd",
    no: "P2 예습",
    title: "TDD by Example — 소개와 실전 감각",
    intro:
      "Kent Beck의 원전은 기법서라기보다 '리듬'을 몸에 넣는 책이다. 규칙은 단 두 줄 — " +
      "① 실패하는 자동 테스트 없이는 새 코드를 쓰지 않는다 ② 중복을 제거한다. " +
      "이 두 줄에서 red(실패하는 테스트 먼저) → green(통과할 만큼만 구현) → refactor(테스트를 안전망 삼아 구조 정리)의 " +
      "분 단위 사이클이 나온다. 아래는 책의 뼈대와, 그것이 큰 코드베이스에서 어떤 모습이 되는가.",
    secs: [
      { h: "한 사이클을 codec 예제로 — exp-Golomb ue(v) 디코더", body:
        "TDD의 최소 단위를 우리 도메인 함수로 보면 이렇다. 주목할 것은 순서다 — 구현이 아니라 테스트가 먼저 태어난다.",
        code:
"// [RED] 실패하는 테스트를 먼저 쓴다 — decode_ue는 아직 없다\n" +
"TEST(UeDecoder, CodeZero) {            // bitstring '1' → 0\n" +
"  BitReader br({0b10000000});\n" +
"  EXPECT_EQ(decode_ue(br), 0u);        // 컴파일조차 안 됨 = RED\n" +
"}\n" +
"// [GREEN] 통과할 만큼만 — 가짜여도 된다 (Fake It)\n" +
"uint32_t decode_ue(BitReader& br) { return 0; }\n" +
"\n" +
"// [RED] 두 번째 예제가 가짜를 무너뜨린다 (Triangulation)\n" +
"TEST(UeDecoder, CodeOne) {             // bitstring '010' → 1\n" +
"  BitReader br({0b01000000});\n" +
"  EXPECT_EQ(decode_ue(br), 1u);\n" +
"}\n" +
"// [GREEN] 이제 일반 구현 (Obvious Implementation)\n" +
"uint32_t decode_ue(BitReader& br) {\n" +
"  int zeros = 0;\n" +
"  while (br.read_bit() == 0) zeros++;\n" +
"  return (1u << zeros) - 1 + br.read_bits(zeros);\n" +
"}\n" +
"// [REFACTOR] 이름·중복 정리 — 테스트가 안전망\n" +
"// 다음 테스트 목록(test list): 경계 32-zero(BVA!) · 비트 고갈 에러 ·\n" +
"//                             conformance 벡터 대조" },
      { h: "Beck의 진행 전략 3종", body:
        "green으로 가는 길은 셋이다. Fake It(상수를 반환하고 다음 테스트가 일반화를 강제하게), " +
        "Triangulation(예제 2개 이상으로 일반화 방향을 좁히기), Obvious Implementation(뻔하면 바로 구현). " +
        "불안하면 작게(fake→triangulate), 자신 있으면 크게(obvious) — 보폭을 상황에 맞게 조절하는 것이 숙련이다. " +
        "여기에 test list(떠오른 테스트를 목록에 적고 하나씩)와 assert first(단언문부터 거꾸로 쓰기)를 더하면 책의 패턴 대부분이다.",
        code: null },
      { h: "책의 구성 (재독 지도)", body:
        "Part 1 Money 예제(Java): 다중 통화 산술 $5 + 10CHF를 30여 개의 미세 사이클로 — 리듬 체득용. " +
        "Part 2 xUnit(Python): 테스트 프레임워크 자체를 TDD로 만든다 — 자기가 자기를 검증하는 부트스트랩. " +
        "Part 3 패턴 카탈로그: 위 전략들 + 픽스처·격리·리팩토링 패턴 사전. " +
        "재독이라면 Part 1을 실제로 타이핑하며 따라가는 것이 핵심이고(눈으로 읽으면 리듬이 안 남는다), Part 3은 사전처럼 필요할 때.",
        code: null },
      { h: "수백 개 소스 파일 프로젝트에서는 어떤 모습인가", body:
        "TDD는 분 단위 리듬이라 파일 수와 무관하다 — 스케일은 리듬이 아니라 구조가 담당한다. " +
        "구조 관례: src/module.cpp ↔ test/module_test.cpp 1:1 대응, 수백 모듈이면 수천 개의 작은 테스트가 초 단위로 돈다(test pyramid의 아래층). " +
        "의존성 규율: 느린 것(파일 I/O·전체 파이프라인·외부 툴 호출)은 test double(fake/stub)로 끊어 단위 테스트를 ms로 유지한다. " +
        "계층 운용: 커밋마다 unit 층(수 분) → nightly 통합·conformance 회귀(기존 스트림 회귀는 이 위층에 그대로 산다). " +
        "c-model에 대입하면: transform·quant·CABAC bin·deblock 같은 bit-exact 함수는 표준 문서의 수식이 test basis라 TDD 최적 지형이다. " +
        "'스트림 돌려 diff'만 하던 검증을 함수 레벨로 내리면 디버깅 반경이 파일 단위에서 함수 단위로 줄어든다.",
        code: null },
      { h: "레거시 코드에는 TDD를 바로 못 쓴다 — characterization test", body:
        "테스트 없는 기존 코드베이스(우리의 현실)에는 순서가 하나 앞에 붙는다. " +
        "① characterization test: 현재 동작을 그대로 스냅샷으로 고정하는 테스트를 먼저 만든다 — '옳은가'가 아니라 '지금 이렇다'를 못박는 것. " +
        "② seam 확보: 의존성을 끊을 수 있는 지점을 만들어 함수를 격리 가능하게. " +
        "③ 그 다음에야 수정 부위만 TDD. (이 주제의 원전 = Michael Feathers 《Working Effectively with Legacy Code》.) " +
        "AI-driven과의 접점: characterization test 생성은 AI에게 시키기 좋은 전형적 작업이고, 그 테스트가 AI 수정 작업의 안전망이 된다.",
        code: null },
      { h: "TDD가 못 하는 것 (두 질문 프레임으로)", body:
        "TDD는 Q-A(oracle)에 강하다 — 정답을 예제 형태로 코드보다 먼저 고정한다. " +
        "그러나 Q-B(coverage)는 거의 못 다룬다 — 내가 생각해낸 예제 밖의 입력, 그리고 요구사항 자체의 오류는 못 잡는다. " +
        "그래서 property-based·fuzzing·coverage 측정이 보완재이고(P2 후반 실습), conformance/CRV 같은 위층 검증은 TDD가 대체하는 게 아니라 그 위에 얹힌다.",
        code: null },
    ],
    nick: "책은 예전에 본 적이 있다 — 이번 재독의 목적은 '기법 지식'이 아니라 '리듬 복원'이다. 스트림 diff 디버깅 20년의 감각으로 읽으면, TDD는 새 이론이 아니라 디버깅 반경을 함수 단위로 줄이는 도구이고, self-checking TB를 RTL보다 먼저 쓰는 관행의 SW판이다.",
    lead: "우리 c-model 코드베이스에 TDD를 '신규 코드부터' 도입한다면 rule 첫 한 줄은 무엇이어야 하고, 레거시 부분에는 어떤 별도 규칙(characterization 우선 등)이 필요한가?",
    apply: [
      "신규 코드 rule: 테스트 없는 신규 함수 체크인 금지 — 단, 레거시 수정은 characterization test 우선이라는 별도 트랙으로.",
      "AI 작업 지시의 기본형을 TDD 리듬으로: 지시 = 테스트 목록(acceptance) → AI가 red→green 순서로 구현 → 테스트가 곧 완료 판정 기준.",
      "c-model 수정 워크플로우: 수정 전 해당 함수 characterization test 생성(AI 활용) → 수정 → 단위 테스트 + conformance 회귀 통과를 exit criteria로.",
    ],
  },

  layers: [
    { id: "L0", name: "표준 · 어휘", q: "무슨 말로 말하고, 무엇이 이미 표준화되어 있는가",
      items: ["ISTQB CTFL v4.0.1 — 공용 어휘의 준 spec (7원칙, test level/type, entry/exit criteria)",
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
      src: "《SWE at Google》 테스팅 파트(무료) · CTAL-TM v3.0 syllabus", phase: "P3" },
    { id: "L3", name: "검증 객체 지형", q: "우리 것(codec IP 스펙트럼)에 대입하면 무엇이 보이는가",
      items: ["{c-model, FW, ref-SW, RTL} × {oracle 가용성, coverage 수단, 관행, 갭} 매트릭스",
        "검증 도구의 검증 (tool qualification) — oracle 자체의 신뢰 문제",
        "RTL↔SW 검증 문화의 비대칭 — 교집합이 기회"],
      src: "실무 경험 + DV/SW 지도 문서", phase: "P4" },
    { id: "L4", name: "AI-driven 재검토", q: "작성자가 AI가 되면 무엇이 달라지는가",
      items: ["작성자≠검증자 원칙의 LLM 버전 (독립 검증 세션, multi-LLM cross-check)",
        "결정론 게이트 우선 (lint/컴파일/sim을 AI 산출물 게이트로 재배선)",
        "eval · regression seeding · 비결정성의 exit criteria (pass@k)"],
      src: "CT-AI v2.0 syllabus (2026-04 GA) · AI 작업 검증 패턴", phase: "P5" },
    { id: "L5", name: "정책 산출물", q: "결과물은 무엇인가",
      items: ["internal rules 초안", "verification workflow (skill/tool) 스케치",
        "sign-off 기준 · knowledge base 문서 표준", "multi-LLM 운용 기준"],
      src: "L0~L4의 증류", phase: "P5" },
  ],

  certMap: {
    note: "ISTQB syllabus는 전부 무료 공개 → 응시와 무관하게 '준 spec'으로 정독한다. 응시는 P1 후 판단. ✓ = 원문 로컬 확보(refs/).",
    tree: [
      { k: "CTFL v4.0.1 ✓", v: "Foundation — 공용 어휘. 6장·64 LO·시험 40문항/65%", tag: "P1" },
      { k: "CTAL-TM v3.0 ✓", v: "Advanced Test Management — 3장(활동 750분·제품 390분·팀 225분). 프로세스 리드에 가장 직결", tag: "P3" },
      { k: "CT-AI v2.0 ✓", v: "AI Testing, 2026-04 GA 신판 — ML workflow·데이터/모델 테스팅에 pretrained·fine-tuning·RAG까지", tag: "P5" },
      { k: "CT-TAE", v: "Specialist — 테스트 자동화 아키텍처", tag: "참고" },
    ],
  },

  phases: [
    { id: "P0", title: "워크스페이스 기틀 + 원문 확보", status: "done", goal: "역할 프레임·지형(L0~L5)·페이즈 확정, SSOT 구축, 공식 원문 로컬 확보", items: [],
      note: "2026-08-17 기틀 완료(부팅 문서 v2·SSOT·비공개 git·공개 앱 v0.1). 2026-08-18 원문 확보 완료: CTFL v4.0.1+샘플시험 4세트, CT-AI v2.0(2026 GA), CTAL-TM v3.0, TMMi R1.2, SWE at Google ch11~14. 미확보(유료): ISO 29119 원문(불필요—syllabus 요약으로 충분), TDD by Example(P2 전 확보 필요)." },
    { id: "P1", title: "ISTQB CTFL v4.0.1 정독", status: "active", goal: "공용 어휘와 프로세스의 뼈대 — syllabus를 준 spec으로. 장별 가이드는 P1 정독 탭",
      items: [
        { id: "p1-ch0", t: "Ch.0 오리엔테이션 — K-level·시험 구조 파악" },
        { id: "p1-ch1", t: "Ch.1 Fundamentals (180분) — 7원칙 × 실무 매핑" },
        { id: "p1-ch2", t: "Ch.2 SDLC (130분) — test level/type, shift left" },
        { id: "p1-ch3", t: "Ch.3 Static Testing (80분) — 리뷰 스펙트럼, static analysis" },
        { id: "p1-ch4", t: "Ch.4 Test Analysis & Design (390분) — EP/BVA/decision table/state transition/coverage" },
        { id: "p1-ch5", t: "Ch.5 Managing (335분) — entry/exit criteria, risk-based" },
        { id: "p1-ch6", t: "Ch.6 Test Tools (20분) — 자동화 이득/위험" },
        { id: "p1-exam", t: "Sample Exam Set A 모의 (40문항·60분)" },
        { id: "p1-dist", t: "용어 사전 v1 승격 + ISTQB↔ISO 29119 관계 정리" },
      ] },
    { id: "P2", title: "TDD 원류", status: "wait", goal: "《TDD by Example》 실습 — red-green-refactor를 손으로. 소개 챕터가 정독 탭에 공개됨(예습 가능)",
      items: [
        { id: "p2-tdd", t: "TDD 소개 챕터(정독 탭 P2 그룹) — 재독 전 감각 복원" },
        { id: "p2a", t: "oracle 유형 카탈로그 · TDD family 문서 정독" },
        { id: "p2b", t: "TDD by Example Part 1 실습 (Python으로 따라 하기)" },
        { id: "p2c", t: "test double · test pyramid 정리" },
        { id: "p2d", t: "\"TDD가 못 하는 것\" — Q-B 한계 정리" },
        { id: "p2e", t: "reference model류 SW 개발에 TDD 적용 시나리오 스케치" },
      ] },
    { id: "P3", title: "조직의 테스트 문화", status: "wait", goal: "《SWE at Google》 테스팅 파트 — 각 장을 '조직 번역' 연습으로 (원문 로컬 확보됨)",
      items: [
        { id: "p3a", t: "Ch.11 Testing Overview — 왜 조직 차원의 테스트인가" },
        { id: "p3b", t: "Ch.12 Unit Testing — 좋은 테스트의 성질" },
        { id: "p3c", t: "Ch.13 Test Doubles — 격리의 비용" },
        { id: "p3d", t: "Ch.14 Larger Testing — 통합·시스템 레벨" },
        { id: "p3e", t: "CTAL-TM v3.0 syllabus 훑기 (test management 준 spec)" },
        { id: "p3f", t: "TMMi R1.2 성숙도 모델 개요 — 체계화 기준 후보 평가" },
      ] },
    { id: "P4", title: "검증 객체 지형 매핑", status: "wait", goal: "codec IP 검증 대상 전체를 oracle×coverage 매트릭스로",
      items: [
        { id: "p4a", t: "RTL DV 지도 · SW 테스팅 지도 문서 정독 (비대칭 정리)" },
        { id: "p4b", t: "{c-model, FW, ref-SW, RTL} × {oracle, coverage, 관행, 갭} 매트릭스 작성" },
        { id: "p4c", t: "\"검증 도구의 검증\" (tool qualification) 문제 정식화" },
        { id: "p4d", t: "갭 목록 도출 → 정책 backlog 적립" },
      ] },
    { id: "P5", title: "AI-driven 재검토 + 정책 v0", status: "wait", goal: "AI 작업 검증 패턴 + CT-AI v2.0 → internal rule·workflow 초안",
      items: [
        { id: "p5a", t: "AI 작업 검증 패턴 카탈로그 정독 (독립 검증 세션, LLM-as-judge, eval)" },
        { id: "p5b", t: "CT-AI v2.0 syllabus 정독 — 비결정성·RAG·fine-tuning 테스팅 확인" },
        { id: "p5c", t: "작성자≠검증자 · 결정론 게이트 우선 rule 초안" },
        { id: "p5d", t: "eval · regression seeding workflow 스케치" },
        { id: "p5e", t: "비결정성 exit criteria (pass@k) 정리" },
        { id: "p5f", t: "multi-LLM 운용 기준 초안 (역할 분담·cross-check)" },
      ] },
  ],

  sources: [
    { title: "ISTQB CTFL Syllabus v4.0.1", note: "P1 교재 — 78p·64 LO. + Sample Exam A~D 문제/해설", url: "https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/", tag: "syllabus", local: "refs/istqb/" },
    { title: "ISTQB CT-AI Syllabus v2.0", note: "2026-04 GA 신판 — ML·데이터/모델 테스팅·RAG·fine-tuning. P5 준 spec. + Sample Exam", url: "https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/", tag: "syllabus", local: "refs/istqb/" },
    { title: "ISTQB CTAL-TM Syllabus v3.0", note: "Advanced Test Management — 프로세스 리드 직결. P3 참고 spec", url: "https://istqb.org/sdm_downloads/istqb_ctal-tm_syllabus_v3-0/", tag: "syllabus", local: "refs/istqb/" },
    { title: "Software Engineering at Google", note: "무료 웹 공개 — Ch.11~14 테스팅 파트가 P3 교재", url: "https://abseil.io/resources/swe-book", tag: "book-free", local: "refs/google_sw/ (ch11~14 html)" },
    { title: "TMMi Framework R1.2", note: "검증 프로세스 성숙도 모델 226p — '체계화 기준'의 기성 답안, P3 참고", url: "https://www.tmmi.org/tmmi-documents/", tag: "standard", local: "refs/tmmi/" },
    { title: "Kent Beck — TDD by Example", note: "TDD 원전, P2 교재 — 소개 챕터가 정독 탭에 있음. 재독용 도서 확보는 P2 진입 전", url: "https://www.oreilly.com/library/view/test-driven-development/0321146530/", tag: "book" },
    { title: "Feathers — Working Effectively with Legacy Code", note: "레거시 코드 × TDD의 원전 (characterization test·seam) — P2 참고 도서", url: "https://www.oreilly.com/library/view/working-effectively-with/0131177052/", tag: "book" },
    { title: "ISO/IEC/IEEE 29119-1:2022", note: "국제 표준 본체 (유료) — CTFL이 요약을 제공하므로 원문 구매는 보류", url: "https://www.iso.org/standard/81291.html", tag: "standard" },
    { title: "Siemens Verification Academy", note: "무료 코스 — verification planning / coverage (HW 쪽 보완, 로그인 필요)", url: "https://verificationacademy.com/", tag: "course" },
    { title: "Hypothesis (Python)", note: "property-based testing 체험 도구 — P2 실습 후보", url: "https://hypothesis.readthedocs.io/", tag: "tool" },
  ],
};
