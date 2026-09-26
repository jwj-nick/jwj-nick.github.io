/* RTL WorkSys — 콘텐츠 데이터 (앱의 텍스트는 전부 여기).
   범위: core(ticket 한 건이 지나가는 아홉 단계) + 설계 작업 전체의 진행 현황(status) + 주제별 심화 페이지(deep).
   규율: 조직 실명·수치 없음. 모든 ticket·블록·신호 이름은 가상. 숫자 기준은 공란 + 결정 주체.
   본문 블록 형식: {h:"소제목"} {p:"문단"} {ul:[...]} {table:{head:[...],rows:[[...]]}} {code:"..."} {note:"..."} */
window.WS = {
  meta: {
    title: "RTL WorkSys",
    subtitle: "AI-native RTL 업무 시스템 · core 설계 노트",
    updated: "2026-09-26",
    version: "0.4",
    tagline: "ticket이 생기면 AI가 먼저 일을 시작한다. 사람은 검수와 결정에 선다."
  },

  /* ───────────── 홈 ───────────── */
  home: {
    summary: [
      "issue tracker(예: Jira)에 ticket이 생기면 AI가 스스로 읽고, 무슨 종류의 일인지 판정하고, 그 종류의 표준 workflow를 골라 sandbox 안에서 자율로 진행한다.",
      "사람이 반드시 등장하는 순간은 둘이다. 결과를 검수할 때(review)와 반영을 결정할 때(apply)다.",
      "그 밖에 시스템이 스스로 멈춰 사람을 부르는 조건이 있다. 위험 신호, 권한 범위 밖, 정보 부족, 해법이 매우 불확실함, 작업량 초과, 그리고 workflow에 미리 표시된 사람 결정 지점이다.",
      "모든 task는 검수 판정과 실행 기록을 학습으로 남기고, 그 학습은 개인 fork에는 즉시, 정본에는 정기 회의로 반영된다.",
      "이 설계에 숫자는 없다. 임계값·횟수·기간은 도입하는 팀이 정할 몫이다."
    ],
    why: "지금까지의 상식은 \"숙련된 엔지니어의 역량과 경험 위에서 heuristic한 결정으로 단 하나의 방향으로 일을 몰아가 완료하기\"였다. AI를 넣으면 같은 물리적 시간에 훨씬 다양하거나 깊은, 혹은 반복해서 개선하는 가설·실험·시도를 해 볼 수 있다. RTL 업무는 lint·simulation·synthesis·coverage·equivalence check(LEC)처럼 수십 년 검증된 결정론적 oracle을 이미 갖고 있으므로, 이 oracle들을 판정자로 재배선하면 AI의 시도를 안전하게 넓힐 수 있다.",
    notWhat: [
      "오늘의 프로세스에서 병목을 찾아 고치는 개선 도구가 아니다. 목표는 새로운 작업 방식이다.",
      "사람을 빼는 시스템이 아니다. 사람의 자리를 분류·배정·진행 관리에서 검수·결정으로 옮기는 시스템이다.",
      "issue tracker·Git 서버·batch runner(예: Jenkins)·legacy VCS(예: SVN)를 대체하지 않는다. 그 위에서 label 하나, comment 하나, task branch(또는 작업 copy), work repo의 폴더 하나로 흔적을 남긴다.",
      "조직의 LLM 입력 승인·차단 장치를 대체하지 않는다. 그 장치는 이 시스템의 gate와 별개로 항상 동작한다."
    ],
    must: [
      { when: "review (검수)", get: "한 장. 다섯 줄 요약(무엇을 요청받았고·무엇을 했고·어떻게 확인했고·무엇이 남았고·반영하려면 무엇을 결정해야 하는지) + 분류·posture와 이유 + 근거표 + 산출물 링크 + MR 후보 + 가정 목록 + 미완 + 학습 예고", do: "accept / accept-with-fix / reject 중 하나와 \"어디가 문제였나\". 목표는 10초에 방향, 10분에 판정. 한 장으로 판정할 수 없었다면 그것은 시스템의 결함으로 기록된다." },
      { when: "apply (반영)", get: "MR 후보(중요도·필요성·내용·동시 진행 task와 충돌 여부) 또는 commit 후보 또는 회신 초안", do: "MR 생성 / 직접 commit / 회신 / 보류 / 폐기를 정한다. 시스템은 main으로의 MR을 만들지 않고, 고객에게 회신하지 않고, ticket 상태를 바꾸지 않는다." }
    ],
    cond: [
      { n: 1, name: "위험 신호", hold: "stop", what: "계정·권한 등록 요청, 자격 증명이 본문에, 외부 발송·게시가 필요, 코드·문서 통째 반출, 인사·계약·가격, 신뢰하기 힘든 외부 링크, 유사 과거 ticket이 없는데 외부 정체성이 본문에", leaves: "실행 경로를 아예 만들지 않는다. label ai:risk + \"멈춘 이유\" 한 줄. 사람이 빨리 봐야 하는 유일한 label", you: "직접 처리한다. 위험이 아니었다면 label을 뗀다. 그 판정도 기록되어 목록의 정밀도를 올린다", silent: "아무것도 하지 않는다" },
      { n: 2, name: "권한 범위 밖", hold: "record-only", what: "선언된 범위(scope)에 이 카테고리 × 제품 조합이 없거나 필요한 행동이 허용 목록에 없음", leaves: "분류와 기록만. label ai:out-of-scope", you: "지금은 아무것도 안 해도 된다. 범위 확장은 정기 회의 자료로 올라간다", silent: "아무것도 하지 않는다" },
      { n: 3, name: "정보 부족", hold: "needs-info", what: "선택된 workflow가 필수로 요구하는 입력이 ticket에 없음", leaves: "질문 초안(다섯 칸: 맥락 / 질문 한 문장 / 선택지와 결과 / 무응답 기본값과 기한 / 관련 과거 결정)", you: "고객 ticket이면 발송은 사람. 내부 ticket이면 시스템이 직접 묻고 사람은 답만", silent: "읽기 전용 준비만. 기한이 지나도 실행으로 넘어가지 않는다" },
      { n: 4, name: "해법이 매우 불확실", hold: "discuss", what: "이 카테고리의 workflow가 없다 / 있어도 잘 굴러갈 것 같지 않다 / 새로 만들었지만 판정할 oracle이 없다", leaves: "무엇이 불확실한지 + 후보 접근 2~3개 + 각각의 결과 + workflow 신설 초안", you: "후보 하나를 고르거나 폐기하거나 직접 한다", silent: "논의 자료를 보강만 한다" },
      { n: 5, name: "작업량 초과", hold: "discuss", what: "checkpoint 수·sim·synth 횟수·예상 시간·병렬 후보 수의 추산이 카테고리별 기준(공란)을 크게 벗어남", leaves: "추산과 \"줄일 수 있는 방법\"", you: "범위를 정한다(\"서브블록 3개만, 나머지는 backlog\")", silent: "시작하지 않는다" },
      { n: 6, name: "[HD] 사람 결정 checkpoint", hold: "HD", what: "workflow 파일에 미리 표시된 자리. 아키텍처 옵션 선택, interface 변경 여부, coverage waiver, 고객 회신 문구", leaves: "선택지 + 근거 + 각 선택의 결과", you: "결정 한 줄. 채팅·STATE·ticket comment 어디에 써도 시스템이 읽는다", silent: "결정과 무관한 부분만 미리 준비한다. idle로 기다리지 않는다" }
    ],
    execHitl: "sandbox 안에서 진행하는 중에도 아홉 조건에서 사람을 부른다. 지식 요청 · 의도 확인 · 작업량 초과 · 실행 중 새 위험 · 되돌리기 어려운 행동 직전 · 진전 없음 · 분류 재확인 실패 · 자원 대기 장기화 · 범위 이탈 발견. 원칙은 하나다. 막히면 멈추지 않는다. 질문을 남기고 sandbox 안에서 가능한 부분을 계속 하며, 답이 없을 때의 기본값은 항상 보수적이다.",
    notYou: "ticket 읽기와 재료 수집, 분류, gate 검사(통과일 때), workflow 선택과 계획, sandbox 안 실행, evaluator 실행, 결과 패키지 작성, 학습 기록. 이 단계들은 사람 없이 끝난다. 분류는 사람에게 보고하기 위한 것이 아니라 AI 자신이 \"이 ticket으로 내가 무엇을 해야 하는가\"를 알기 위한 판정이다."
  },

  /* ───────────── 아홉 단계 ───────────── */
  stages: [
    { id: "intake", n: 1, name: "intake", ko: "받기", human: "no",
      does: "ticket을 그대로 보존하고 재료를 모은다. LLM이 본문을 읽기 전에 패턴 검사(raw scan)를 돌린다.",
      file: "00_intake.md",
      detail: [
        "제목·본문·field·comment·첨부 목록·연결 ticket을 그대로 보존한다. 첨부 내용은 열지 않는다.",
        "module index에서 본문에 나온 블록·신호·파일 이름을 찾는다. 같은 블록의 열린 ticket, 최근 닫힌 ticket, 유사 과거 ticket을 검색으로 모은다(사람이 하는 방식과 같다).",
        "raw 위험 scan = LLM 이전의 정규식·목록 검사. 메일 주소·계정 문구·자격 증명 패턴·allowlist 밖 링크·반출 문구. hit이면 gate 조건 1로 직행한다.",
        "하지 않는 것: 외부 링크 접속, field·상태 변경.",
        "시스템이 만든 backlog ticket·정기 ticket도 예외 없이 같은 단계를 지난다(부모 key를 기록)."
      ], docs: ["taskfolder", "gate"] },
    { id: "triage", n: 2, name: "triage", ko: "분류 [c]", human: "no",
      does: "카테고리·등급·제품/블록·정보 충분성·연결/중복을 판정한다. 값싼 모델 먼저, 애매하면 강한 모델이 재판정한다.",
      file: "10_triage.md + label cat:<id>, ai:triaged",
      detail: [
        "산출은 여섯 칸이다. ① 카테고리(주 1 + 보조 0~2) ② 등급과 근거 3줄 ③ 제품·블록 ④ 정보 충분성 ⑤ 연결·중복 ⑥ 분류 메모.",
        "등급은 숫자 confidence가 아니라 네 값이다. 명확 / 근사 / 새 카테고리 후보 / 정보 부족. 등급마다 다음 행동이 고정된다.",
        "④는 선택될 workflow의 입력 요건과 대조해 채운다. 카테고리가 미정이면 공통 최소 요건(대상·요구·판정 기준)과 대조한다.",
        "분류는 사람에게 보고하기 위한 것이 아니다. AI가 \"이 ticket으로 무엇을 해야 하는가\"를 스스로 알기 위한 첫 사고 단계다."
      ], docs: ["triage", "grades"] },
    { id: "gate", n: 3, name: "gate", ko: "문", human: "cond", humanNote: "걸렸을 때만",
      does: "위험 → 권한 → 정보 → 불확실 → 작업량 다섯 조건을 이 순서로 검사한다. 하나라도 걸리면 그 조건의 hold 유형으로 멈춘다.",
      file: "20_gate.md",
      detail: [
        "순서가 고정인 이유: 위험은 다른 무엇보다 먼저 멈춰야 하고, 권한 밖이면 정보를 요청할 이유도 없고, 정보가 없으면 불확실·작업량을 가늠할 수 없다.",
        "위험은 두 번 본다. intake 직후 raw scan(목록 신호)과 gate에서(유사 ticket 검색 뒤의 낯섦 신호).",
        "hold 유형 넷: stop(위험) / record-only(권한) / needs-info(정보) / discuss(불확실·작업량·신설).",
        "걸려도 뒤 조건은 검사만 하고 기록은 남긴다. 결론은 하나다."
      ], docs: ["gate", "reentry", "scope"] },
    { id: "plan", n: 4, name: "plan", ko: "계획 [d]", human: "cond", humanNote: "신설·논의일 때만",
      does: "workflow를 고르거나 신설하고, 실행 가능성을 가늠해 posture를 정하고, 지정 리소스와 실행 시간대를 확정한다.",
      file: "30_plan.md, resources.yaml",
      detail: [
        "선택 = 카테고리의 default_workflow. 보조 카테고리가 있으면 그 checkpoint를 부록으로 합친다.",
        "신설 = workflow가 없는 카테고리에서는 workflow 초안을 만드는 것이 첫 작업이다. 초안은 논의 hold의 자료가 된다.",
        "posture(full / draft / prepare / hold)는 근거 셋(실적·정보 충분성·oracle 강도)과 되돌림 축을 나란히 적고 이유 한 줄로 고른다. 숫자 임계값은 없다.",
        "규칙 snapshot: 시작 시점의 정본 commit을 적는다. 진행 중 task는 정본 갱신을 받지 않는다.",
        "실행 시간대(즉시 / 야간 backlog), 사슬이면 link 목록과 [HD] 위치, 같은 블록의 동시 진행 task와 충돌 가능 파일을 적는다."
      ], docs: ["workflow", "posture"] },
    { id: "execute", n: 5, name: "execute", ko: "실행 [d]", human: "cond", humanNote: "실행 중 HITL 조건에서만",
      does: "sandbox 안에서 checkpoint를 하나씩 통과한다. evaluator 결과는 공통 JSON으로 남긴다.",
      file: "STATE.md(갱신), eval/<n>_<tool>.json, 필요시 handoff.md",
      detail: [
        "checkpoint는 \"이것이 확인되어야 다음으로 간다\"의 목록이다. 도달 방법은 경로 힌트를 참고하되 자유다.",
        "비용 사다리(lint → 짧은 sim → 긴 sim·synth)를 지킨다. 긴 일은 batch runner, 작은 일은 local. 라이선스가 없으면 ai:waiting으로 바꾸고 다른 checkpoint나 다른 task를 진행한다.",
        "실행 중 HITL 아홉 조건에 걸리면 question을 남기고 가능한 부분을 계속 한다. idle 대기는 없다.",
        "STATE.md만 살아 움직인다. issue tracker의 status comment는 checkpoint 단위 mirror이며 하나를 갱신하고 늘리지 않는다."
      ], docs: ["sandbox", "hitl", "state"] },
    { id: "result", n: 6, name: "result", ko: "결과", human: "no",
      does: "검수자가 한 장으로 판정할 수 있게 만든다. 산출물은 sandbox에 두고 링크만.",
      file: "40_result.md + label ai:review",
      detail: [
        "여덟 항목: 다섯 줄 요약 / 분류·posture 한 줄 / 근거표(checkpoint ↔ evaluator 파일 ↔ pass/fail ↔ 근거 등급) / 산출물 링크 / MR 후보 / out-of-scope 후속 / 가정 목록 / 남은 질문·미완 / 학습 예고.",
        "근거 등급(evaluator 확인 / 코드·문서 추적 / 의견)은 판단형 일에서 검수자가 사실과 의견을 구분하는 열이다.",
        "미완도 결과 패키지다. \"여기까지 + 이유 + 다음 후보\"로 마감한다."
      ], docs: ["result"] },
    { id: "review", n: 7, name: "review", ko: "검수", human: "yes",
      does: "검수자가 한 장만 보고 판정한다. 이것이 학습 채널 ①이다.",
      file: "50_review.md (사람 원문, 시스템이 고치지 않는다)",
      detail: [
        "accept / accept-with-fix(무엇을 고쳤나) / reject(왜).",
        "어디가 문제였나: 분류 / workflow 선택 / posture(과함·부족) / 산출물 / 근거 / 위험 판단 / 결과 패키지 형식.",
        "위험 관련: \"사람 전용으로 했어야 했다\" 또는 \"위험이 아니었다\". 위험 목록의 정밀도 재료.",
        "다음: 폐기 / 사람이 이어받음. reject 뒤 시스템은 재시도하지 않는다."
      ], docs: ["review"] },
    { id: "apply", n: 8, name: "apply", ko: "반영", human: "yes",
      does: "반영 여부를 사람과 함께 결정한다. main MR은 시스템이 만들지 않는다.",
      file: "STATE §3에 결정 한 줄",
      detail: [
        "MR 후보는 중요도·필요성·내용 설명·동시 진행 task와의 충돌 여부와 함께 이미 결과 패키지에 있다.",
        "고객 회신·ticket transition·정본 규칙 수정은 사람이 한다.",
        "legacy VCS 제품이면 MR 후보 자리에 commit 후보가 온다."
      ], docs: ["result"] },
    { id: "learn", n: 9, name: "learn", ko: "학습 [g]", human: "no",
      does: "자동 기록과 검수 판정을 합쳐 제안 표를 만든다. 생략 불가.",
      file: "60_learn.md",
      detail: [
        "채널 ② 자동 기록: 경로·checkpoint별 시도·HITL 지점·자원·재plan. 이것이 분류기와 workflow의 실적 데이터다.",
        "채널 ① 검수 판정: accept → accepted+1, with-fix → rework+1, reject → 감점 + 원인 집계.",
        "제안 표: 어느 asset을, 무엇으로, 왜, 예상 효과, 검증 방법, 반영 대상(fork 즉시 / 정본 회의). 없으면 \"변경 불필요 + 이유\".",
        "너무 큰 일(재발 방지 test, 문서 부재)은 backlog ticket을 만든다. 그 ticket은 같은 엔진을 탄다."
      ], docs: ["learn", "fork"] }
  ],

  /* ───────────── 가상 ticket walkthrough ───────────── */
  cases: [
    {
      id: "C1", title: "\"입력 pattern P에서 출력 data 깨짐\"", from: "고객 · 본문 두 줄 · 첨부 없음",
      one: "정보 부족의 표준형. 시스템은 멈추되 놀지 않고, 답이 오면 끝까지 자율로 간다.",
      tags: ["needs-info", "prepare", "full"], humanCount: 3,
      steps: [
        { stage: "intake", text: "고객 경로. module index에 hit 없음(블록 이름이 없다). 같은 증상 문구의 과거 ticket 3건을 찾았고 전부 datapath 블록의 출력 mismatch로 종결되었다. raw scan 없음. 외부 링크 없음." },
        { stage: "triage", text: "① cat:bugfix-customer ② 등급 근사 — 유사 3건은 맞지만 블록 미상, 재현 입력 미첨부 ③ 제품은 field로 판별, 블록은 \"재현 입력을 받으면 그 설정값에서 판별\" ④ 버그 수정 workflow의 입력 요건과 대조: 재현 입력(test vector, 필수) 빠짐, 버전(필수) 빠짐 ⑤ 과거 3건 링크, 중복 아님." },
        { stage: "gate", hold: "needs-info", human: true, text: "1 통과(유사 3건이 있어 낯섦 아님) · 2 통과 · 3 HOLD needs-info · 4·5는 검사만. label ai:needs-info, 질문 초안을 comment에: \"재현 입력과 버전이 필요합니다. 재현 없이는 원인 격리를 할 수 없기 때문입니다. 없으면 과거 3건의 원인 요약만 전달하겠습니다.\" 고객 ticket이므로 발송은 사람이 한다. 사람의 첫 등장, 1분." },
        { stage: "execute", note: "기다리는 동안", text: "실행은 하지 않지만 놀지도 않는다(prepare). 과거 3건의 원인·수정 요약, 같은 datapath 블록의 열린 ticket 2건, 그 블록의 최근 변경 이력을 STATE에 정리해 둔다." },
        { stage: "gate", note: "재진입", text: "고객이 재현 입력과 버전을 첨부했다. 조건 1·2를 다시 검사하고(첨부에 외부 링크·자격 증명 없음) 3 통과 → plan." },
        { stage: "plan", text: "WF-bugfix v4. 실적 양호, 필수 3/3, oracle strong(sim vs reference), 되돌림 최고 = task branch push. posture full. handoff 예고: 읽기·분석은 windows, sim·regression은 linux." },
        { stage: "execute", text: "C1 재현(local sim) pass → C2 원인 격리(가설 3 → 1) → C3 수정 → C4 [SE] regression(batch runner, job id 기록) pass → C5 결과 패키지." },
        { stage: "result", text: "다섯 줄, 근거표(C1·C4 evaluator 파일), diff 링크, MR 후보(중요도 높음: 고객 영향), 가정(\"nightly set으로 충분\"), 학습 예고(재발 방지 test → backlog)." },
        { stage: "review", human: true, text: "한 장을 보고 accept. 사람의 두 번째 등장." },
        { stage: "apply", human: true, text: "MR을 만든다. 세 번째 등장." },
        { stage: "learn", text: "WF-bugfix accepted +1. 분류 record는 golden set에 \"맞은 예\"로. \"pattern P 계열 재발 방지 test\" backlog ticket이 생기고, 그 ticket은 같은 엔진을 타고 야간에 돈다. 해결 사례를 지식에." }
      ],
      takeaway: "사람은 세 번 등장했고 합쳐서 십여 분이다. 분류 결과를 사람이 확정하고 담당자를 배정하는 구조였다면 사람을 기다리는 지점이 하나 더 있었을 것이다. 여기에는 없다. 시스템이 곧 담당이다."
    },
    {
      id: "C2", title: "\"메일 주소 3개를 주며 포털 계정 등록 요청\"", from: "고객",
      one: "stop의 표준형. LLM이 본문을 읽기 전에 멈춘다.",
      tags: ["stop:risk"], humanCount: 1,
      steps: [
        { stage: "intake", hold: "stop", text: "raw scan(정규식·목록, LLM 이전): 메일 주소 3건 + \"계정 등록\" 문구 → HIT. 분류는 최소만 한다(cat:account-request, 명확)." },
        { stage: "gate", hold: "stop", human: true, text: "조건 1 stop:risk. label ai:risk, comment 한 줄 \"멈춘 이유: 계정·권한 등록 요청 + 외부 메일 주소(본문 2~4행)\". 실행 경로는 만들어지지 않는다. 2~5는 검사만 기록한다(권한 범위에도 없다)." },
        { stage: "gate", note: "재진입", text: "ai:risk는 사람이 빨리 봐야 하는 유일한 label이다. 사람이 직접 처리하고 label을 뗀다(또는 ai:manual). 시스템은 그 뒤에도 아무것도 하지 않는다." },
        { stage: "learn", text: "위험 신호 목록에 사례 하나. golden set에는 넣지 않는다(분류가 아니라 위험 판정이 핵심이므로)." }
      ],
      takeaway: "위험 검사는 넓게 잡는다. 잘못 멈춘 비용은 사람의 몇 분이고, 놓친 비용은 조직의 위험이기 때문이다. 대신 \"위험이 아니었다\"는 판정이 쌓이면 목록과 링크 allowlist가 자라 정밀도가 올라간다."
    },
    {
      id: "C3", title: "\"회의 action: 블록 Z가 feature W를 지원 가능한지 확인\"", from: "내부",
      one: "판단형 일, 새 카테고리 후보. workflow 초안을 만드는 것이 첫 작업이다.",
      tags: ["새 카테고리 후보", "discuss", "draft"], humanCount: 3,
      steps: [
        { stage: "intake", text: "회의 action 경로. module index hit 블록 Z. W를 언급한 ticket 0건. \"확인해 달라\"류 과거 5건(전부 문서로 종결)." },
        { stage: "triage", text: "① new:feasibility-review(가장 가까운 기존 = feature-request이지만 산출물이 코드가 아니라 판단 문서) ② 등급 새 카테고리 후보 ④ workflow 미정 → 공통 최소 요건으로 대조: 대상(있음)·요구(있음)·판정 기준(feature W 스펙 정본 위치 없음, 권장 빠짐) ⑥ 강한 모델 재판정: 동의." },
        { stage: "gate", hold: "discuss", human: true, text: "1·2 통과(scope에 design-review/any가 있어 읽기·분석·문서 초안 허용) → 4 HOLD discuss. 첨부: workflow 초안 WF-feasibility(스펙 대조표 / interface·RTL 대조 / 가능·불가·조건부 판정 초안 / 근거) + \"과거 5건이 이렇게 종결되었다\". 사람: \"그 초안으로 가 보자, 카테고리도 인정.\"" },
        { stage: "plan", text: "fork에 WF-feasibility draft, 카테고리 표에 proposal. oracle weak(사람 판단) → posture draft. 되돌림 최고 = 지정 page write." },
        { stage: "execute", text: "C1 스펙·RTL·interface 대조표 → C2 갭 목록 → C3 판정 초안(가능·불가·조건부 각각의 조건) → C4 결과 패키지. 실행 중 HITL(지식 요청): feature W 스펙 정본 위치 없음 → 가정 \"회의록의 설명이 스펙\"으로 draft 계속." },
        { stage: "result", text: "회의에 들고 갈 한 장. 근거표는 \"사람 확인\" 열이 많다(oracle weak)." },
        { stage: "review", human: true, text: "accept-with-fix(조건부 판정의 조건 하나 수정). 어디가 문제였나 = 산출물." },
        { stage: "learn", text: "WF-feasibility draft uses 1 · rework 1. 블록 Z 지식 갱신. 정본 회의 후보: 카테고리 proposal → adopted." }
      ],
      takeaway: "카테고리가 미정일 때 정보 충분성을 대조할 공통 최소 입력 요건(대상·요구·판정 기준)이 core에 있어야 한다. 그리고 workflow가 없는 일의 첫 작업은 workflow 초안 만들기이며, 초안은 논의 자료가 되고 사람이 인정하면 fork에서 즉시 쓴다."
    },
    {
      id: "C4", title: "\"다음 릴리스 backlog: parameter P 추가\"", from: "내부 · 이력 표식",
      one: "아무것도 하지 않는 것이 정답인 ticket.",
      tags: ["terminal"], humanCount: 0,
      steps: [
        { stage: "triage", text: "① cat:mgmt-backlog ② 명확(형식이 과거 backlog ticket과 같고 작업 지시가 없다)." },
        { stage: "gate", text: "1·2 통과. 이 카테고리는 workflow가 없는 것이 정상이다. 조건 4(\"workflow가 없다 → discuss\")를 예외 없이 적용하면 매 backlog ticket이 논의 hold가 되어 사람을 귀찮게 한다." },
        { stage: "plan", text: "카테고리 표의 terminal: true → plan에서 \"할 일 없음\"으로 종료. label은 ai:triaged에 머문다. 시스템은 \"지금 하면 안 되나요\"라고 묻지 않는다." },
        { stage: "learn", text: "자동 기록 한 줄." }
      ],
      takeaway: "관리성 카테고리(backlog·이력 표식)는 분류와 label만 하고 끝낸다. 설계에 이 예외가 없으면 시스템이 부지런할수록 사람이 피곤해진다."
    },
    {
      id: "C5", title: "\"이 ticket은 3개월 전 ticket과 같은 문제인가\"", from: "고객",
      one: "중복 후보. 시스템은 닫지 않고, \"재발 확인\"을 계획 맨 앞에 넣는다.",
      tags: ["중복 후보", "재발 확인"], humanCount: 2,
      steps: [
        { stage: "triage", text: "① 원 ticket과 같은 cat:bugfix-customer ② 근사 ⑤ 중복 후보 <3개월 전 key> — 같은 블록·증상·입력 pattern 계열. 다른 점 = 버전(그 사이 수정이 있었으므로 재발 가능)." },
        { stage: "gate", text: "proceed. 정보는 원 ticket에서 가져올 수 있다." },
        { stage: "plan", text: "WF-bugfix. 다만 맨 앞에 \"재발 확인\" checkpoint를 삽입: 원 ticket의 수정이 현재 버전에 들어 있는가, 같은 입력이 같은 증상을 내는가." },
        { stage: "execute", text: "C0 재발 확인 → \"수정은 들어 있고 증상은 다른 입력 구간에서 발생\" → 같은 문제가 아니다 → 정상 WF-bugfix 진행. (반대로 \"수정이 빠져 있음\"이면 result를 \"중복 확정 제안 + 원 수정 재적용 후보\"로 끝내고 사람이 duplicate로 닫는다.)" },
        { stage: "review", human: true, text: "accept." },
        { stage: "apply", human: true, text: "MR 생성. 중복이었다면 여기서 사람이 닫는다." }
      ],
      takeaway: "중복 후보의 다음 행동은 규칙으로 고정된다. triage는 hold하지 않고, plan이 \"재발 확인\"을 맨 앞에 넣고, 시스템은 어느 경우에도 ticket을 닫거나 상태를 바꾸지 않는다."
    },
    {
      id: "C6", title: "\"전체 블록 M 리팩토링 (코딩 스타일 통일)\"", from: "내부",
      one: "작업량 초과. 추산과 \"줄이는 방법\"을 들고 논의로 간다.",
      tags: ["discuss", "backlog"], humanCount: 1,
      steps: [
        { stage: "triage", text: "① cat:refactor ② 명확 ③ Git 제품 / 블록 M(파일 수십 개)." },
        { stage: "gate", hold: "discuss", human: true, text: "1·2·3 통과 → 4: WF-refactor adopted, oracle strong(LEC + regression) → 5: 추산 = 파일 수 × LEC·regression → 카테고리 기준(공란)을 크게 벗어남 → HOLD discuss. comment: 추산 + 줄이는 방법(서브블록 단위로 쪼개 backlog ticket으로, 또는 lint 자동 수정 가능 범위만). 사람: \"서브블록 3개만, 나머지는 backlog.\"" },
        { stage: "plan", note: "재진입", text: "결정이 범위를 바꿨으므로 plan부터 다시. 서브블록 3개 범위로 WF-refactor full." },
        { stage: "learn", text: "나머지 서브블록은 backlog ticket으로 생성(지정 project). 기준 숫자는 팀 리더·시스템 관리자의 몫으로 남는다." }
      ],
      takeaway: "작업량 기준은 이 설계에 숫자로 적혀 있지 않다. 시스템이 하는 일은 추산을 투명하게 보이고 줄이는 선택지를 함께 주는 것이고, 기준과 결정은 사람의 몫이다."
    },
    {
      id: "C7", title: "\"블록 Q 출력이 reference와 다름\"", from: "내부",
      one: "등급 근사 → 첫 checkpoint에서 분류 재확인 실패 → 사람 없이 재plan.",
      tags: ["근사", "재plan", "draft"], humanCount: 1,
      steps: [
        { stage: "triage", text: "① cat:bugfix-internal ② 근사 — 후보 2 = cat:reference-model-issue(과거에 reference 쪽 버그였던 사례 2건)." },
        { stage: "plan", text: "WF-bugfix. 등급이 근사이므로 C1에 [RC] 분류 재확인 \"RTL과 reference 중 어느 쪽이 스펙과 어긋나는가\"를 삽입." },
        { stage: "execute", text: "C1 스펙 대조 → reference가 스펙과 어긋난다 → 분류 재확인 실패 → 실행 중 HITL(g): 두 번째 후보로 재plan(사람 없이). 30_plan.md에 \"재plan @일시\" 절. WF-refmodel-issue(scope: 문서 초안·내부 comment만, reference 팀 소유) → posture draft: 어긋난 지점 보고서." },
        { stage: "result", text: "\"RTL은 맞고 reference가 틀림, 근거 = 스펙 §x 대조\"." },
        { stage: "review", human: true, text: "accept. 반영 = reference 팀에 ticket(사람)." },
        { stage: "learn", text: "분류 규칙 힌트(\"출력 mismatch는 reference 쪽 가능성을 후보 2로 항상 둔다\"). golden set에 \"헷갈린 예\"로." }
      ],
      takeaway: "등급 \"근사\"는 멈추는 등급이 아니다. 첫 checkpoint에서 재확인하고, 어긋나면 두 번째 후보로 사람 없이 재계획한다. 둘 다 어긋날 때만 논의로 간다."
    },
    {
      id: "C8", title: "검수 reject — \"블록 N 수정안이 스펙 오독\"", from: "내부",
      one: "reject 뒤 무엇이 오는가. 사람이 이어받고 시스템은 재시도하지 않는다.",
      tags: ["reject", "사람이 이어받음"], humanCount: 2,
      steps: [
        { stage: "result", text: "C1과 같은 흐름으로 결과 패키지까지 왔다." },
        { stage: "review", human: true, text: "reject. 어디가 문제였나 = 산출물(스펙 §y 오독). 위험 = 해당 없음. 반영 = 폐기. 다음 = 사람이 이어받음." },
        { stage: "apply", human: true, text: "사람이 직접 고친다. 시스템은 같은 일을 다시 시도하지 않는다." },
        { stage: "learn", text: "실적 rejected +1, 원인 항목 \"산출물\" 집계. 사람이 어떻게 고쳤는지 한 줄을 50_review.md 아래에 덧붙이면 학습 재료가 된다." }
      ],
      takeaway: "reject 뒤에 시스템이 재시도하는 루프를 두지 않는다. 검수자가 루프 안에 계속 있어야 학습 채널 ①이 끊기지 않고, 재시도 루프는 검수를 고무도장으로 만든다."
    },
    {
      id: "C9", title: "\"nightly regression이 이틀째 실패\"", from: "내부",
      one: "실행 중에 남은 일이 권한 범위 밖으로 드러난다. 여기까지를 결과로 마감한다.",
      tags: ["범위 이탈", "out-of-scope 후속"], humanCount: 1,
      steps: [
        { stage: "triage", text: "① cat:regression-failure ② 근사 — 환경인지 코드인지는 로그를 읽기 전엔 모른다. 후보 2: cat:infra." },
        { stage: "gate", text: "proceed. scope: regression-failure/Git 제품 = read·analyze·run-local·run-batch·comment-internal." },
        { stage: "plan", text: "WF-regr-triage, oracle medium(군집화 도구 + 재실행). full. \"원인이 환경이면 거기서 마감\"을 plan에 적는다." },
        { stage: "execute", text: "C1 [RC] 실패 로그 수집·군집화(통계 도구, LLM이 아니다) → 군집 1개, 전부 같은 디스크 오류 → 원인 = 환경. 다음 checkpoint(재현·코드 원인 격리)는 의미 없다. 필요한 행동 = 서버 디스크 정리 → scope에 없다 → 실행 중 HITL(i) 범위 이탈 발견." },
        { stage: "result", text: "여기까지를 결과 패키지로 마감(ai:review). 다섯 줄 \"원인 환경, 디스크. 코드 변경 없음. 후속 = 인프라 역할\". out-of-scope 후속 항목에 사람이 할 일을 적는다." },
        { stage: "review", human: true, text: "accept. 반영 = 없음(인프라에게 전달은 사람)." },
        { stage: "learn", text: "scope 확장 후보 \"환경 원인일 때 인프라 ticket 자동 생성 허용?\" → 정기 회의. 재판정 기록: 후보 2가 실제 원인 → 규칙 힌트 \"동일 메시지 군집 1개 = 환경 가능성\"." }
      ],
      takeaway: "범위 밖 행동은 하지 않되, 거기까지의 결과는 버리지 않는다. 결과 패키지의 \"out-of-scope 후속\" 항목이 사람에게 넘기는 손잡이다."
    }
  ],

  /* ───────────── 설계 절 ───────────── */
  docs: [
    { id: "taskfolder", group: "구조", title: "task 폴더 — 파일 하나가 단계 하나", body: [
      { p: "core는 ticket 한 건이 지나가는 아홉 단계와 그 단계마다 남는 파일 한 개다. 파일은 work repo의 tasks/<TICKET-KEY>/ 폴더에 번호 순으로 쌓이고, 사람은 어느 파일 하나만 열어도 \"지금 무슨 일이 어디까지 갔는지\"를 알 수 있어야 한다(forgetful expert). issue tracker에는 label과 comment 하나만 남는다." },
      { code: "work repo\n├── core/                        정본 (지식 + 기본 rule). MR은 정기 회의\n│   ├── categories.yaml          카테고리 표 (과거 ticket에서 귀납)\n│   ├── scope.yaml               권한 범위 선언 (카테고리 × 제품 × 허용 행동)\n│   ├── risk_signals.md          위험 신호 목록 + 링크 allowlist\n│   ├── workflows/<cat>/WF-*.md  표준 workflow 파일\n│   ├── knowledge/               module index, 해결 사례, 블록 노트\n│   └── registry.yaml            asset 실적\n├── fork/<person>/               개인 fork (프롬프트·규칙 세부·실험 workflow). 자유\n└── tasks/<TICKET-KEY>/\n    ├── 00_intake.md             원문 snapshot + 재료 + raw 위험 scan\n    ├── 10_triage.md             분류 record (여섯 칸)\n    ├── 20_gate.md               gate record (다섯 조건 + 결론 하나)\n    ├── 30_plan.md               workflow 선택·신설 + 가늠 + posture\n    ├── resources.yaml           지정 리소스 + rules_snapshot\n    ├── STATE.md                 살아 있는 단일 상태 문서\n    ├── handoff.md               host·tool 전환이 있을 때만\n    ├── eval/<n>_<tool>.json     evaluator 결과 (공통 형식)\n    ├── 40_result.md             검수자용 한 장 + 링크\n    ├── 50_review.md             검수 판정 (사람, 원문 불가침)\n    └── 60_learn.md              학습 기록 + 제안" },
      { ul: ["번호 파일은 단계가 끝나면 다시 쓰지 않는다. 재판정이 있으면 아래에 \"재판정 @일시\" 절을 덧붙인다.", "STATE.md만 살아 움직인다.", "50_review.md는 사람 원문이며 시스템이 고치지 않는다.", "legacy VCS 제품은 같은 폴더 구조에 코드 sandbox만 다르다(작업 copy)."] }
    ]},
    { id: "triage", group: "분류 [c]", title: "분류 record 여섯 칸", body: [
      { table: { head: ["칸", "내용", "값의 형태"], rows: [
        ["① 카테고리", "주 1개 + 보조 0~2개. 축 = 작업 방식 × 대상 영역", "categories.yaml의 id. 없으면 new:<임시 이름>"],
        ["② 등급과 근거", "판정이 얼마나 확실한가", "명확 / 근사 / 새 카테고리 후보 / 정보 부족. 근거 3줄 = 유사 과거 ticket 2~3건, 맞은 규칙, 어긋나는 점"],
        ["③ 제품·영역", "legacy VCS 제품 / Git 제품 / 해당 없음 + 블록 후보", "field → module index → \"미상 + 알아낼 방법\"의 세 겹"],
        ["④ 정보 충분성", "이 카테고리의 workflow가 요구하는 입력 중 빠진 것", "workflow의 입력 요건과 대조. 카테고리 미정이면 공통 최소 요건(대상·요구·판정 기준). 빠진 항목마다 왜 필요한지와 없으면 어떻게 할지"],
        ["⑤ 연결·중복", "같은 문제로 보이는 과거·열린 ticket, page, MR", "링크 + 닮은 이유. 중복 의심은 \"중복 후보\"까지. 시스템은 닫거나 transition하지 않는다"],
        ["⑥ 분류 메모", "재판정 여부, 사용 모델 등급, 헷갈린 후보", "학습 채널 ②의 재료"]
      ]}},
      { h: "왜 숫자 confidence가 아니라 네 등급인가" },
      { p: "LLM이 말로 하는 confidence는 값이 몇 개뿐이라 threshold의 근거가 되지 못한다. 등급은 \"근거 3줄이 서로 일치하는가\"로 정하고, 등급마다 다음 행동을 고정하면 사람도 시스템도 같은 규칙을 읽는다." },
      { h: "절차" },
      { ul: ["값싼 모델이 카테고리 표 + golden 예시 + 유사 과거 ticket으로 ①②③을 채운다.", "등급이 명확이 아니면 강한 모델이 근거를 다시 본다(cascade). 두 모델의 답이 다르면 등급은 \"근사\"이고 두 후보를 나란히 적는다. 강한 모델도 명확하게 못 하면 등급을 그대로 둔다. 추측하지 않는다.", "④는 선택될 workflow의 입력 요건과 대조해 채운다. 그래서 ④는 카테고리가 정해진 뒤에 채워진다.", "카테고리 표는 사람이 미리 정하지 않는다. 과거 ticket을 조사해 귀납한다. 축은 주제가 아니라 필요한 작업 방식 × 대상 영역이다."] },
      { code: "# TRIAGE — <TICKET-KEY>\n① 카테고리: <cat id> (주) · <cat id> (보조, 없으면 \"없음\")\n② 등급: 명확 | 근사 | 새 카테고리 후보 | 정보 부족\n   근거 1 유사 과거 ticket: <key> <닮은 점> / <key> <닮은 점>\n   근거 2 맞은 규칙: <field·키워드·module index 중 무엇>\n   근거 3 어긋나는 점: <없음 | 무엇>\n   (근사일 때) 후보 2: <cat id> — 첫 checkpoint에서 <무엇>으로 재확인\n③ 제품·영역: <제품> · 블록/모듈: <이름 | 미상 + 알아낼 방법>\n④ 정보 충분성 (workflow <WF-id> 입력 요건 대조):\n   | 요건 | 필수/권장 | 있음/빠짐 | 왜 필요한가 | 없으면 어떻게 |\n⑤ 연결·중복: <key> — 닮은 이유 / 중복 후보: <key>\n⑥ 분류 메모: 사용 모델 <값싼 → 강한 재판정 여부> · 헷갈린 후보\n→ label: cat:<id>, ai:triaged" }
    ]},
    { id: "grades", group: "분류 [c]", title: "등급 → 다음 행동 (고정 규칙)", body: [
      { table: { head: ["등급", "gate 뒤", "plan에서", "실행 중"], rows: [
        ["명확", "통과하면 바로 plan", "default_workflow", "없음"],
        ["근사", "통과하면 plan. 후보 2개면 첫 후보로", "첫 후보의 workflow", "첫 checkpoint에 [RC] 분류 재확인 삽입. 어긋나면 두 번째 후보로 재plan(사람 없이). 둘 다 어긋나면 논의 hold"],
        ["새 카테고리 후보", "조건 1·2만 검사 → 조건 4로 hold", "workflow 신설 초안을 만들어 논의에 첨부", "—"],
        ["정보 부족", "조건 1·2 검사 → 조건 3으로 hold", "—", "기다리는 동안 읽기 전용 준비. 카테고리도 미정이었다면 답이 온 뒤 triage부터 다시"],
        ["(중복 후보, 등급 무관)", "hold 없음", "\"재발 확인\" checkpoint를 맨 앞에. 같은 문제로 확인되면 result에 \"중복 확정 제안\"으로 끝내고 사람이 닫는다", "—"]
      ]}},
      { note: "관리성 카테고리(terminal: true)는 workflow가 없는 것이 정상이다. plan에서 \"할 일 없음\"으로 종료하고 label은 ai:triaged에 머문다." }
    ]},
    { id: "gate", group: "gate", title: "gate 다섯 조건 — 시스템이 결정하는 이른 HITL", body: [
      { p: "순서 고정: 위험 → 권한 → 정보 → 불확실 → 작업량. 하나라도 걸리면 그 조건의 hold 유형으로 끝내고 뒤 조건은 검사만 한다." },
      { table: { head: ["#", "조건", "판정 재료", "hold 유형", "시스템이 남기는 것"], rows: [
        ["1", "위험 신호", "(a) 목록 신호: 계정·권한 요청 / 자격 증명·token이 본문·첨부에 / 외부 발송·게시 필요 / 코드·문서 통째 반출 / 인사·계약·가격 / allowlist 밖 링크 접속 필요 / 첨부가 낯섦. (b) 낯섦 신호: 유사 과거 ticket 0건 그리고 외부 정체성이 본문에", "stop — 실행 경로를 만들지 않는다", "ai:risk, comment 한 줄(\"멈춘 이유: <신호>, 본문 어느 부분\")"],
        ["2", "권한 범위 밖", "scope.yaml에 (카테고리, 제품) 조합이 없거나 필요한 행동이 허용 목록에 없음", "record-only", "ai:out-of-scope. 범위 확장 후보로 learn에 기록"],
        ["3", "정보 부족", "triage ④에 빠진 항목이 있고 workflow가 그것을 필수로 표시", "hold:needs-info", "ai:needs-info, question 다섯 칸 초안. 고객 ticket이면 발송은 사람"],
        ["4", "해법이 매우 불확실", "workflow가 없다(새 카테고리 후보) / 실행 가능성 가늠이 hold / 신설 초안은 있지만 oracle이 없다. 예외: terminal 카테고리", "hold:discuss", "ai:discuss, \"무엇이 불확실한지 + 후보 접근 2~3개 + 각각의 결과\" + 신설 초안"],
        ["5", "작업량 기준 초과", "추산(checkpoint 수, sim·synth 횟수, 예상 시간, 병렬 후보 수)이 카테고리별 기준(공란)을 크게 벗어남", "hold:discuss", "ai:discuss, 추산과 \"줄일 수 있는 방법\""]
      ]}},
      { ul: ["위험은 두 번 검사한다. intake 직후 raw scan(목록 신호만, 분류 전)과 gate에서(낯섦 신호는 유사 ticket 검색이 필요하므로 triage 뒤). 둘 중 어디서든 hit이면 stop.", "false positive의 비용은 사람의 몇 분이고 false negative의 비용은 조직의 위험이므로 조건 1은 넓게 잡는다. \"위험이 아니었다\" 판정도 기록해 목록의 정밀도를 올린다.", "링크는 allowlist(조직 내부 도메인·issue tracker·wiki·Git 서버·batch runner) 밖일 때만 신호다. 이것이 없으면 내부 위키 링크가 든 ticket도 전부 멈춘다.", "조직의 LLM 입력 승인·차단 장치는 이 gate와 별개로 항상 동작한다. gate는 그것을 대체하지 않는다."] },
      { code: "# GATE — <TICKET-KEY> @ <일시>\n| # | 조건 | 판정 | 근거 |\n| 1 | 위험 신호 | 통과 | 목록 신호 없음(raw scan·gate 모두), 낯섦: 유사 ticket 3건 있음 |\n| 2 | 권한 범위 | 통과 | scope.yaml: (cat:bugfix-customer, Git 제품) 허용 행동에 edit-rtl·run-local 있음 |\n| 3 | 정보 | HOLD | 필수 요건 \"재현 입력\" 빠짐 |\n| 4 | 불확실 | (검사만) | WF-bugfix adopted, oracle strong |\n| 5 | 작업량 | (검사만) | 추산: checkpoint 7 — 기준 안 |\n결론: hold:needs-info\n남긴 것: ai:needs-info · comment 초안(Q-1, 발송 = 사람: 고객 ticket)\n기다리는 동안: prepare — 같은 블록 열린 ticket·최근 변경 이력·유사 사례 해결 방법을 STATE에 정리\n재진입: 새 comment·첨부 도착 → 조건 1·2 재검사 후 조건 3부터" }
    ]},
    { id: "reentry", group: "gate", title: "hold에서 돌아오는 법 (재진입)", body: [
      { table: { head: ["hold", "돌아오는 신호", "어디로", "기다리는 동안"], rows: [
        ["stop(위험)", "사람이 ai:risk를 떼고 다른 label을 붙임 또는 ai:manual", "사람이 지정한 단계(대개 처음부터)", "아무것도 하지 않는다"],
        ["record-only(권한)", "scope.yaml 갱신(정본 MR)", "intake부터 다시", "아무것도 하지 않는다"],
        ["needs-info", "ticket에 새 comment·첨부, 또는 STATE의 (사람) 답", "gate 조건 3부터 다시(조건 1·2도 재검사, 새 정보가 위험을 담을 수 있다)", "읽기 전용 준비: 같은 블록 열린 ticket, 최근 변경 이력, 유사 사례의 해결 방법을 STATE에 정리. 실행 행동은 없다"],
        ["discuss(불확실·작업량·신설)", "사람의 결정(채팅·comment·STATE (사람))", "plan부터 다시(결정이 workflow·posture·범위를 바꾼다)", "논의 자료 보강만"]
      ]}},
      { p: "무응답 기본값은 question 다섯 칸에 적어 두되, gate hold의 기본값은 언제나 보수적이다. 기한이 지나도 실행으로 넘어가지 않는다. 사람 부재로 진행할 수 있는 것은 sandbox 안 읽기 전용 준비까지다." }
    ]},
    { id: "scope", group: "gate", title: "권한 범위 선언 scope.yaml", body: [
      { p: "한 줄 = (카테고리, 제품, 허용 행동 목록, 최대 posture, 선언자). 처음에는 도입자 자신의 범위로 시작해 팀 → 전 개발자로 넓힌다. 범위를 넓히는 것이 곧 시스템의 성장이다." },
      { code: "# 행동 어휘: read analyze draft-doc edit-rtl edit-tb edit-script run-local run-batch comment-internal label propose-mr\n# 전역 금지(어디에도 쓰지 않는다): sandbox 밖 삭제, ticket transition, 외부 발송, 권한 변경, merge, main push, 정본 수정\n- category: bugfix-customer\n  product: git-product-A\n  allowed: [read, analyze, edit-rtl, edit-tb, run-local, run-batch, comment-internal, label, propose-mr]\n  max_posture: full\n  declared_by: <도입자 역할>\n- category: design-review\n  product: any\n  allowed: [read, analyze, draft-doc, label]\n  max_posture: draft       # 판단형: 결정은 사람" },
      { note: "\"허용 행동이 없으면 그 행동을 계획하지 않는다\"가 scope의 자연스러운 효과다. 라이선스 갱신 권한이 없으면 시스템은 영향 범위표까지만 만든다." }
    ]},
    { id: "labels", group: "gate", title: "label 체계 — issue tracker의 손잡이", body: [
      { table: { head: ["label", "뜻"], rows: [
        ["cat:<id>", "카테고리. 보조 카테고리는 붙이지 않는다(record에만)"],
        ["ai:triaged", "분류 끝, gate 진행 중(또는 terminal 종료)"],
        ["ai:risk", "gate 조건 1에서 멈춤. 사람이 빨리 봐야 하는 유일한 label"],
        ["ai:out-of-scope", "권한 범위 밖. 기록만"],
        ["ai:needs-info", "정보 부족. 질문 초안이 comment에 있음"],
        ["ai:discuss", "불확실·작업량·신설 workflow. 사람과 논의 대기"],
        ["ai:in-progress", "실행 중"],
        ["ai:waiting", "자원 또는 사람 답 대기 중이며 다른 일은 계속"],
        ["ai:review", "결과 나옴, 검수 대기"],
        ["ai:learned", "학습 기록 완료(선택)"],
        ["ai:manual", "사람이 \"이 ticket은 시스템이 건드리지 말 것\"으로 표시. intake에서 멈추고 폴더도 만들지 않는다"]
      ]}},
      { p: "상태 label은 한 번에 하나만 붙어 있다(옮긴다). status comment는 checkpoint 단위로 하나를 갱신하며 늘리지 않는다. label 이름은 도입 조직이 정한다(위는 기본안)." }
    ]},
    { id: "workflow", group: "workflow [d]", title: "workflow는 \"step 순서\"가 아니라 \"checkpoint 목록\"이다", body: [
      { p: "workflow 파일의 본문은 \"이것이 확인되어야 다음으로 간다\"의 목록이다. checkpoint마다 무엇이 참이어야 하는지, 어떻게 확인하는지(어느 evaluator·파일·사람), 실패하면 어떻게 하는지를 적는다. 도달하는 방법은 \"경로 힌트\"로 두되 강제하지 않는다. 그래야 모델이 좋아질수록 시스템이 좋아진다. 경로는 모델이 더 잘 찾고, checkpoint는 그대로 남아 품질을 지킨다." },
      { ul: ["[SE] 부작용이 있는 checkpoint(batch job 제출, comment 갱신). 제출 ID를 기록해 중복 제출을 막는다. gate는 \"제출 성공\"이 아니라 \"결과 수신\".", "[HD] 사람의 결정이 필요한 checkpoint. \"결정이 STATE §3에 기록되면 통과\". 기다리는 동안 결정과 무관한 부분을 prepare한다.", "[RC] 분류 재확인. 등급이 근사일 때 plan이 첫 checkpoint로 삽입한다.", "frontmatter: id, category, version, status(draft/candidate/adopted/stale/retired), oracle(kind, strength), cost_ladder, side_effects, default_posture, hitl_points, track_record, requires.", "입력 요건 표(필수/권장/없으면)를 triage ④가 대조한다.", "신설: workflow가 없는 카테고리에서 첫 작업은 초안 만들기. 재료 = 같은 카테고리의 과거 해결 방식, 이웃 workflow, oracle 후보. 사람이 \"이걸로 가 보자\"면 fork에서 status=draft로 즉시 쓴다.", "사슬(chain): 사람 판단이 중간에 끼는 긴 일은 workflow 하나가 아니라 link 여러 개다. link별 posture, link 사이 [HD], 앞 link의 결과 패키지가 다음 link의 입력 요건."] },
      { code: "## Checkpoints (무엇이 참이어야 하는가 · 어떻게 확인하는가)\n| # | 이름 | 참이어야 하는 것 | 확인 | 실패하면 | 근거 파일 |\n| C1 | 환경 | golden·제약이 지정되어 있다 | setup exit 0 → eval/01_setup.json | question(환경) | eval/01 |\n| C3 | 후보 | 후보 N개가 격리되어 각각 lint 통과 | eval/03_lint_<n>.json 전부 pass | 후보 0개 → question | eval/03_* |\n| C4 [SE] | 후보 synth | 각 후보 slack ≥ 0 | eval/04_synth_<n>.json (job id 기록) | 전부 실패 → 시도 요약 후 중단 | eval/04_* |\n| C5 | 등가성 | 승자 후보가 golden과 등가 | eval/05_lec.json pass | fail → 후보 폐기, 다음 후보 | eval/05 |\n| C7 | 결과 패키지 | 40_result.md 여덟 항목이 채워짐 | 파일 존재 + 링크가 전부 열림 | — | 40_result.md |" }
    ]},
    { id: "posture", group: "workflow [d]", title: "posture — 네 값, 숫자 없이 고른다", body: [
      { table: { head: ["posture", "뜻", "언제"], rows: [
        ["full", "마지막 checkpoint까지 자율 완주. 결과 패키지까지 만든다", "oracle strong + 실적 양호 + 정보 충분"],
        ["draft", "산출물은 초안까지. 판정·선택·회신 문구는 사람", "oracle weak(판단형: 설계 검토·feasibility·고객 답변·코드 리뷰) 또는 실적 부족"],
        ["prepare", "읽기 전용 준비만(재현 환경·이력·유사 사례 정리)", "정보 부족 hold 중, 또는 실적 없음 + oracle weak"],
        ["hold", "시작하지 않고 논의", "gate 조건 4·5"]
      ]}},
      { h: "근거 셋 + 되돌림 축 하나" },
      { table: { head: ["근거", "무엇을 보나", "어디서 오나"], rows: [
        ["실적", "같은 workflow의 uses·accepted·rework·hitl_per_use", "registry.yaml(learn이 갱신)"],
        ["정보 충분성", "입력 요건의 필수·권장 중 채워진 것", "triage ④"],
        ["oracle", "workflow의 oracle strength", "workflow 파일"],
        ["되돌림", "계획된 행동 중 가장 되돌리기 어려운 것: sandbox 안 수정(쉬움) → evaluator 실행(비용만) → task branch push(흔적) → ticket comment(남음) → 고객 회신·정본 수정(불가)", "scope 허용 행동 + workflow의 [SE]"]
      ]}},
      { ul: ["숫자 임계값은 없다. 세 근거와 되돌림 축을 30_plan.md에 나란히 적고 posture를 고른 이유를 한 줄로 쓴다.", "검수자가 그 이유에 동의하지 않으면 review에서 \"posture 과함/부족\"으로 기록하고, 그것이 실적에 들어간다.", "posture는 workflow 단위가 아니라 checkpoint 단위로 낮출 수 있다. 예: timing 개선은 full이지만 \"interface 변경이 필요한 후보\"만 draft로."] },
      { code: "## 실행 가능성 가늠\n| 근거 | 값 |\n| 실적 | WF-bugfix: uses n · accepted n · rework n · hitl/use n |\n| 정보 | 필수 3/3 · 권장 1/2 (nightly set으로 가정) |\n| oracle | strong (sim vs reference + regression) |\n| 되돌림 | 계획 행동 최고 등급 = task branch push(흔적) |\n→ posture: full — 이유: oracle strong, 필수 정보 완비, 실적 양호. 리뷰 부록은 draft." }
    ]},
    { id: "sandbox", group: "실행 [d]", title: "sandbox — 경계 안에서는 묻지 않는다", body: [
      { ul: ["경계 = task branch task/<KEY>(Git 제품) 또는 legacy VCS 작업 copy, 지정 ticket·page, work 폴더 tasks/<KEY>/. 경계는 스크립트가 만들고, 경계 안에서는 시스템이 필요한 모든 것을 한다(CI config·lint rule 복사·수정, 임시 파일 삭제).", "전역 금지(어느 권한 선언에도 없다): sandbox 밖 삭제, ticket 상태 변경, 외부 발송, 권한 변경, merge, main push, 정본 수정.", "규칙 snapshot: resources.yaml에 시작 시점의 정본 commit(또는 revision)을 적는다. 진행 중 task는 정본 갱신을 받지 않는다. 재plan 때만 갱신을 선택할 수 있다.", "자원 두 경로: 긴 일은 batch runner(자원 통제는 거기서), 작은 sim·syn은 local(라이선스 없으면 대기 메시지). 대기 중에는 ai:waiting으로 바꾸고 다른 checkpoint나 다른 task를 진행한다.", "비용 사다리: 싼 evaluator를 통과해야 비싼 evaluator를 부른다. 동시 실행 수는 공란(IT팀·시스템 관리자).", "야간: oracle이 수치인 workflow는 야간 backlog로 돌릴 수 있다. 시간대 정책은 공란.", "CI가 없는 제품이면 검증을 시스템이 local·batch runner로 직접 돌리고 evaluator JSON으로 남긴다. 같은 엔진이다.", "host·tool 전환(Windows↔Linux, coding agent 도구 간)은 시스템이 지점을 미리 표시하고 재개 명령 한 줄을 남기며, 전환 자체는 사람이 한다."] },
      { code: "# eval/<n>_<tool>.json — evaluator 결과 공통 형식\n{\n  \"tool\": \"synth\", \"checkpoint\": \"C4\", \"candidate\": 2,\n  \"status\": \"pass\",                 // pass | fail | error\n  \"metrics\": { \"wns_ps\": 0, \"area_um2\": 0 },\n  \"issues\": [ { \"severity\": \"warn\", \"file\": \"…\", \"line\": 0, \"message\": \"…\" } ],   // 상위 [ ]개만\n  \"raw_log\": \"eval/raw/04_synth_2.log\",   // 경로만. context에 넣지 않는다\n  \"runtime_s\": 0, \"commit_or_revision\": \"…\", \"tool_version\": \"…\", \"seed\": null,\n  \"submitted_id\": \"batch#1234\"          // [SE]일 때. 중복 제출 방지\n}" }
    ]},
    { id: "hitl", group: "실행 [d]", title: "실행 중 HITL 아홉 조건", body: [
      { table: { head: ["#", "조건", "시스템이 하는 것", "무응답이면"], rows: [
        ["a", "지식 요청(스펙·정본 위치·의도가 문서에 없음)", "question 다섯 칸 + 가능한 부분 계속", "가정을 STATE §7에 적고 그 가정 위에서 draft까지"],
        ["b", "의도 확인(요구를 두 가지로 읽을 수 있음)", "두 해석과 각각의 결과를 나란히", "더 보수적인 해석으로 draft까지"],
        ["c", "작업량 초과(추산이 plan을 크게 벗어남)", "추산 갱신 + 줄일 방법, 진행 중 checkpoint는 마무리", "새 checkpoint를 시작하지 않는다"],
        ["d", "위험 고지(실행 중 새 위험 신호 발견)", "즉시 그 행동 중단, ai:risk, 다른 안전한 checkpoint는 계속", "위험 관련 행동은 영구 보류"],
        ["e", "되돌리기 어려운 행동 직전(ticket 상태 변경, 고객 회신, 정본 수정, MR 생성)", "행동을 하지 않고 \"이 행동을 하려 한다 + 내용\"을 STATE와 comment에", "하지 않는다"],
        ["f", "진전 없음(같은 checkpoint에서 지표 개선 없이 [ ]회)", "시도 이력 요약 + 남은 접근 후보, 그 checkpoint 중단", "다른 checkpoint 진행, 없으면 result에 미완으로"],
        ["g", "분류 재확인 실패(등급 근사)", "두 번째 후보로 재plan", "둘 다 실패면 discuss"],
        ["h", "자원 대기 장기화", "대기 사실과 대안(local↔batch, 축소 세트) 제시", "대기 유지, 다른 task 진행"],
        ["i", "범위 이탈 발견(남은 일에 필요한 행동이 scope 밖으로 드러남)", "여기까지를 결과 패키지로 마감(ai:review), \"out-of-scope 후속\" 항목에 사람이 할 일", "범위 밖 행동은 하지 않는다"]
      ]}},
      { p: "원칙: 막히면 멈추지 않는다. question을 남기고 sandbox 안에서 가능한 부분을 계속 한다. 경계를 넘는 항목만 park한다. idle 대기는 없다." },
      { code: "### Q-<n> (열림 | 답변됨 | 기한 <일시>) — 발송: 시스템(내부) | 사람(고객)\n- 맥락 (3줄 이내): <왜 생겼는지, 무엇을 이미 했는지>\n- 질문 (한 문장): <무엇을 답하면 되는지>\n- 선택지와 결과: (a) … → <결과> (b) … → <결과> (c) … → <결과>\n- 무응답 시 기본값과 기한: <기본값 — gate hold라면 항상 보수적>, <일시>\n- 관련: 결정 <n> · checkpoint C<n>" }
    ]},
    { id: "state", group: "실행 [d]", title: "STATE.md — 살아 있는 단일 문서", body: [
      { p: "STATE는 일곱 절이다. 숫자 confidence·자율 등급 번호·budget 숫자는 쓰지 않는다. STATE만 갱신되고 issue tracker의 status comment는 checkpoint 단위 mirror다." },
      { code: "# STATE — <TICKET-KEY> <한 줄 제목>\n## 1. 이 일이 무엇인가\n- 한 줄: <요지>. sandbox: branch task/<KEY> | 작업 copy <경로>, tasks/<KEY>/\n- 카테고리 cat:<id> · 등급 <…> · workflow WF-<id> v<n> @ snapshot <…> · posture <…>\n- 동시 진행 task: <key: 겹치는 파일 | 없음> · 재plan 횟수: 0\n## 2. 지금 어디인가\n- 완료: C1 ✅ C2 ✅ · 진행: C4 (batch job #<id> 대기, ai:waiting) · 남음: C5~C8\n- 자원 사용: sim n · synth n · job n · 경과 <시간>  (기준은 공란)\n- prepare 메모(hold 중이면): <읽기 전용으로 정리한 것>\n## 3. 지금까지의 결정   | # | 언제 | 무엇을 | 왜 |\n## 4. 막힌 것 / 질문 (없으면 \"없음\")\n## 5. 답이 없으면\n## 6. Handoff note (전환이 있을 때만)\n## 7. 가정 목록 (틀린 것만 고쳐 주세요)" }
    ]},
    { id: "result", group: "결과·검수", title: "결과 패키지 — 검수자가 10초에 방향을, 10분에 판정을", body: [
      { ul: ["1. 다섯 줄 요약: 무엇을 요청받았고, 무엇을 했고, 어떻게 확인했고, 무엇이 남았고, 반영하려면 무엇을 결정해야 하는지.", "2. 분류·posture 한 줄: 카테고리·등급·workflow·posture와 이유. 검수자가 \"분류가 틀렸다\"를 여기서 판정할 수 있게.", "3. 근거표: checkpoint ↔ evaluator 결과 파일 ↔ pass/fail ↔ 근거 등급(evaluator 확인 / 코드·문서 추적 / 의견). 사람이 확인한 것은 \"사람\"으로.", "4. 산출물 링크: diff(branch·revision), 리포트, 문서. 본문에 붙이지 않는다.", "5. MR 후보(있으면): 중요도·필요성·내용 설명 + 동시 진행 task와의 충돌 여부(dry merge 결과). 시스템은 MR을 만들지 않는다.", "5b. out-of-scope 후속(있으면): 실행 중 범위 밖으로 드러난 일과 그것을 할 사람 역할.", "6. 가정 목록: 사람 답 없이 세운 가정(STATE §7 복사).", "7. 남은 질문·미완.", "8. 학습 예고: 이 task가 남길 제안의 머리말."] },
      { note: "검수자가 한 장만 보고 판정하지 못했다면 그 자체가 \"결과 패키지 형식의 결함\"이며 learn에 기록한다. 검수가 고무도장이 되지 않도록, 시스템은 한 장을 잘 만들 의무를 진다." }
    ]},
    { id: "review", group: "결과·검수", title: "검수 판정 — 세 값과 \"다음\"", body: [
      { table: { head: ["칸", "값"], rows: [
        ["판정", "accept / accept-with-fix / reject"],
        ["고친 것(with-fix)", "무엇을, 어떻게"],
        ["이유(reject)", "왜"],
        ["어디가 문제였나", "분류 / workflow 선택 / posture(과함·부족) / 산출물 / 근거 / 위험 판단 / 결과 패키지 형식"],
        ["위험 관련", "\"사람 전용으로 했어야 했다\" 또는 \"위험이 아니었다\" — 위험 목록의 정밀도 재료"],
        ["반영 결정", "MR 생성 / 직접 commit / 회신 / 보류 / 폐기 — 사람이 정한 것"],
        ["다음", "폐기 / 사람이 이어받음. reject 뒤 시스템은 재시도하지 않는다. 사람이 어떻게 고쳤나 한 줄을 덧붙이면 학습 재료"],
        ["자유 메모", "(검수자) 원문"]
      ]}},
      { p: "판정은 짧아도 된다. 칸이 비어 있으면 \"해당 없음\"으로 읽는다. 이 파일은 사람 원문이며 시스템이 고치지 않는다." }
    ]},
    { id: "learn", group: "학습 [g]", title: "학습 — 두 채널, 하나의 기록, 생략 불가", body: [
      { ul: ["채널 ② 자동 기록(시스템): 카테고리·등급·재판정 여부 / gate 결과 / workflow id·version / checkpoint별 시도 수·evaluator 호출 수·소요 / HITL 발생 지점과 종류 / 재plan 여부 / 자원 사용 / 되돌림 축에서 실제로 한 행동의 최고 등급.", "채널 ① 검수 판정: 50_review.md를 그대로 참조하고 실적에 반영한다. accept → accepted+1, with-fix → rework+1, reject → 감점 + 원인 항목별 집계.", "제안 표: asset(카테고리 표·분류 규칙·workflow·지식·위험 신호·권한 범위), 변경, 근거, 예상 효과, 검증 방법, 반영 대상(fork 즉시 / 정본 회의). 없으면 \"변경 불필요 + 이유\".", "backlog: 이번 task에서 생긴 큰 일은 지정 project에 ticket을 만든다. 그 ticket은 같은 엔진을 탄다."] },
      { h: "갱신 대상 다섯" },
      { table: { head: ["대상", "무엇이 바뀌나"], rows: [
        ["분류기", "golden set(검수자가 분류를 accept한 record가 자동 추가), 유사 사례 index, 분류 규칙(fork)"],
        ["workflow", "checkpoint 추가·삭제·순서, 입력 요건, 경로 힌트, oracle 정보, track_record"],
        ["지식", "module index, 해결 사례, 블록 노트"],
        ["위험 신호 목록", "사례 추가(멈춘 것·멈춰야 했던 것), 정밀도 메모(위험이 아니었던 것), allowlist 후보"],
        ["권한 범위", "out-of-scope 집계 → 확장 제안"]
      ]}},
      { h: "golden set은 별도 라벨링이 아니다" },
      { p: "초기 조사가 씨앗을 만들고, 그 뒤로는 검수자가 분류를 accept한 task의 10_triage.md가 자동으로 golden set에 들어간다. 분류를 고친 task는 \"헷갈린 예\"로 들어간다. 분류기 프롬프트·규칙을 바꿀 때 golden set으로 회귀 평가한다. 지표 셋: 후보 안에 정답이 있는 비율, 사람 수정률(카테고리별), 위험 놓침 0건(하나라도 있으면 되돌린다)." },
      { p: "시스템은 자기 자신을 개선하는 데 자기 자신을 쓴다. 정기 회의 준비(learn 집계·강등 후보·범위 확장 후보)도 정기 ticket으로 같은 엔진을 탄다. g(자기 개선)는 별도 갈래가 아니라 모든 task의 아홉 번째 단계다." }
    ]},
    { id: "fork", group: "학습 [g]", title: "정본 vs fork — 승격과 강등", body: [
      { table: { head: ["정본 core/ (지식 + 기본 rule, MR은 정기 회의)", "개인 fork/<person>/ (자유, 즉시)"], rows: [
        ["카테고리 표(id·정의·default_workflow)", "분류 프롬프트, 키워드 규칙, golden 예시의 선택"],
        ["record 형식(triage·gate·plan·result·review·learn)", "칸을 채우는 문구, comment 요약 형식"],
        ["위험 신호 목록 + 낯섦 규칙", "낯섦 판정의 세부"],
        ["gate 다섯 조건과 순서, 등급 → 행동 규칙", "— (fork에서도 바꾸지 않는다)"],
        ["scope.yaml", "— (범위는 정본만)"],
        ["workflow status=adopted", "workflow draft·candidate, 실험 checkpoint"],
        ["지식(module index·해결 사례)", "개인 노트"],
        ["golden set과 지표 정의", "개인 metrics·회고"]
      ]}},
      { ul: ["승격: fork의 draft → 정기 회의에서 정본 MR. 제안은 시스템이 얼마든지, 반영은 사람이. 승인은 병목이 되지 않는다. fork에서는 즉시 쓴다.", "강등: 정본 = 정기 회의에서 \"[ ]기간 미사용 또는 reject 사례와 연관\"인 workflow·규칙을 stale → retired로(결정 주체: 정본 승인자 소수). fork = 개인이 자유롭게, 다만 보조 agent(gardener)가 후보를 목록으로 제시한다.", "사람 역량 위축 방지: 정기적으로 사람이 직접 처리하는 ticket을 둔다. 형태·비율은 공란, 결정 주체 = 팀 리더. 시스템은 ai:manual ticket을 건드리지 않는다."] }
    ]}
  ],


  /* ───────────── 심화 — 주제별 전용 페이지 (intake 발생 · workflow 자율 · 이후 갈래) ───────────── */
  /* ───────────── 현황 (설계 작업 전체의 진행 상태, 동기화 때마다 갱신) ───────────── */
  status: {
    asOf: "2026-09-26",
    headline: [
      "core는 개념 설계 수준에서 두 부분이 모두 확정됐다. 입구인 intake와 본체인 workflow다. 구현은 이 설계 작업의 범위가 아니다.",
      "약점은 core 정본이 세 문서(core 설계서, intake, workflow)로 나뉘어 아직 서로 맞춰지지 않았다는 것이다. 이식 계획 18건이 대기 중이다.",
      "갈래 중에서는 chain의 틀만 나왔다. 지금은 설계 본선이 쉬는 동안 아이디어 메모(합성 시스템, RTL revision, knowledge base, mutation 기반 TB 평가)를 쌓고 있다."
    ],
    tracks: [
      { name: "core 설계", st: "done", label: "확정",
        what: "ticket 한 건이 지나가는 아홉 단계, gate 다섯 조건, posture 넷, 사람 자리. intake(입구 일반화)와 workflow(자율 진행)를 심화해 확정했다.",
        next: "intake·workflow 문서의 내용을 core 설계서·protocol·walkthrough·도입 단계 문서에 녹이는 이식(18건)." },
      { name: "주제별 심화", st: "wip", label: "셋째 주제",
        what: "주제 여덟 가운데 intake·workflow 확정, chain 틀. 주제 하나 = 세션 하나 방식의 규약과 브리핑(intake·workflow·chain)이 준비되어 있고, 심화 세션은 아직 열지 않았다.",
        next: "chain 기본값 일곱 교정 → chain 정본 문서. 그다음 timing-area → coverage → code-review → gaps." },
      { name: "아이디어 메모", st: "wip", label: "인터뷰 중",
        what: "전체 flow를 정리할 시간이 없을 때 단편 아이디어를 주제별 파일에 먼저 쌓는다(09-24 시작). 기록(말한 그대로)과 탐구(Claude 확장)를 파일로 나눈다.",
        next: "갈래를 좁히는 질문 여덟 가운데 셋째(성능·면적 판정 기준은 어디서 오는가)부터 이어 간다." },
      { name: "현업 적용 묶음", st: "done", label: "10 파일",
        what: "설계 문서 10개를 현업 세션용으로 묶어 두었다. 묶을 때 금지 토큰 검사를 돌리며 결과는 0건이다.",
        next: "이식이 끝나면 다시 묶는다. chain 정본이 생기면 추가한다." },
      { name: "이 뷰어", st: "done", label: "v0.4",
        what: "core 아홉 단계·사례·설계 절에 더해 심화 페이지 셋(intake·workflow·chain)과 이 현황 화면을 보여 준다.",
        next: "설계 쪽에서 무엇이 바뀔 때마다 동기화한다." }
    ],
    topics: [
      ["intake", "core 입구", "done", "확정", "일의 발생(ticket·tool 신호·backlog …)을 공통 레코드로 받아 처리에 착수시킨다. 입구 일곱, 여섯 단계, ask 종류 여섯."],
      ["workflow", "core 본체", "done", "확정", "착수된 일을 결과 패키지까지 자율로. 세 층(경계·checkpoint·posture) + 더한 것 여섯."],
      ["chain", "갈래", "wip", "틀 · 교정 대기", "아키텍처부터 검증까지. link 일곱, 원칙 다섯, 기본값 일곱. 정본 문서 없음."],
      ["timing-area", "갈래", "seed", "이름·성격만", "탐색형, oracle = synth + LEC. 도입 2단계의 첫 자율 갈래로 예정."],
      ["coverage", "갈래", "seed", "이름·성격만", "탐색형, oracle = coverage + sim. 다른 갈래가 남긴 backlog의 소비자."],
      ["code-review", "갈래", "seed", "이름·성격만", "판정형, oracle 약함. 다른 갈래의 마지막 단계로도 불린다."],
      ["gaps", "마지막", "seed", "빈칸 1순위 있음", "diagnose(\"왜 그런가\") 갈래가 없다. intake에 ask 종류 diagnose가 있는데 받아서 보낼 곳이 없다."],
      ["evolve", "core learn", "done", "갈래 아님", "시스템 자기 개선은 core의 learn 단계가 맡는다."]
    ],
    ideas: [
      { name: "합성 시스템 (DC synthesis)", st: "seed", label: "seed",
        what: "제품 수준의 여러 조건으로 합성 데이터를 확보·관리·실험·분석한다(sales용 조건 matrix). 개발 인사이트용으로 집중 조건 몇 개 × 서브모듈별 면적·최대 주파수를 본다. 기존 합성 자산을 먼저 확인·정리한다." },
      { name: "RTL revision", st: "wip", label: "인터뷰 중",
        what: "기존 RTL을 평가하고 개선을 판단해 진행한다. 작업 다섯: A 코드 리뷰(수준 높은 reviewer agent) · B 검증 상태 리뷰(module별, 추가 test 제안까지) · C 성능·면적 · D 합성 max freq · E 판단과 plan. 시작은 사람이 대상을 지정한다. 작업은 각각 독립으로 돌고 옵션으로 연결한다." },
      { name: "RTL 리뷰 확인 목록", st: "wip", label: "초안",
        what: "흔한 실수 · 꼭 피할 것 · coding style · copyright 문구 네 부분. 조직의 guideline과 대조해야 한다." },
      { name: "knowledge base 재정리", st: "seed", label: "seed",
        what: "흩어진 기존 자료를 주제별로 모아 다시 정리하고 주제끼리 엮는다. 필수 주제 다섯. 후보로 주제 목록, 주제별 필수 항목, product × 주제 지도(진척판), 필요한 실험이 있다." },
      { name: "mutation 기반 TB 평가", st: "seed", label: "seed",
        what: "상용 qualification tool 없이, AI가 RTL에 의도적인 결함을 넣어 TB가 잡아내는지로 TB의 검증력을 잰다. RTL revision의 B와 닿는다." },
      { name: "RTL 자동 검증 skill·agent", st: "plan", label: "예정",
        what: "test를 직접 작성하고 돌리는 일. RTL revision의 B(검증 상태 리뷰)와는 다른 scope로 분리했다. 아직 파일이 없다." }
    ],
    todo: {
      me: [
        "chain 기본값 일곱을 보고 다른 것만 고친다(심화 › chain 페이지 4절).",
        "원할 때 심화 세션을 연다(intake · workflow · chain).",
        "아이디어 메모의 좁히기 질문을 셋째부터 이어서 답한다."
      ],
      ai: [
        "이식 18건: intake·workflow 문서를 core 설계서·protocol·walkthrough·도입 단계 문서에 녹이고 묶음을 다시 만든다. 가장 먼저 갚을 부채로 제안되어 있다.",
        "chain 교정이 오면 chain 정본 문서를 쓰고 묶음과 이 뷰어에 넣는다.",
        "그다음 diagnose 갈래(gaps 1순위)."
      ]
    },
    timeline: [
      ["09-19", "착수", "리서치 네 편, 전체 구조 초안, 가상 시나리오, 핵심 질문 답변. 질문 배터리 방식을 버리고 가상 ticket을 걸어 보는 방식으로 전환."],
      ["09-19~20", "재정의 · core 설계", "분류를 AI 자신의 첫 단계로 재정의. core 둘(intake·workflow) + 갈래 넷. core 설계서, protocol 템플릿, 가상 사례 26건 walkthrough."],
      ["09-20", "현업 적용 준비", "동료용 개요, 작업 지시서, 확인 리스트, 도입 0~3단계, 문서 규칙, 묶음 도구. 이후 설계 작업의 성격을 리뷰·일반화·업그레이드로 전환."],
      ["09-20", "이 뷰어", "core 아홉 단계·사례 9건·설계 15절로 첫 배포."],
      ["09-20~21", "주제별 심화", "intake 확정, workflow 확정(\"더 생각할 것\" 절은 드롭), chain 틀. 심화 세션 규약과 브리핑."],
      ["09-24~", "아이디어 메모", "합성 시스템, RTL revision, 리뷰 확인 목록, knowledge base, mutation 기반 TB 평가."],
      ["09-26", "이름 · 조망", "주제 글자(a~f)를 이름(intake·workflow·chain …)으로 바꿈. 전체 조망과 core 상태 점검."]
    ],
    decisions: [
      ["09-20", "intake 확정", "입구는 ticket만이 아니다. 발생 → 공통 레코드 → 여섯 단계 → route. 범위 기본값 채택. 빈칸: diagnose 갈래 없음."],
      ["09-20", "workflow 확정", "자율의 세 층 + 더한 것 여섯. \"더 생각할 것\" 절은 과해서 드롭."],
      ["09-20", "chain 틀 (가정)", "카테고리가 아니라 사슬 template + link 카테고리 여럿. link 일곱, 원칙 다섯."],
      ["09-26", "주제 이름", "c·d·a·e·f·b·z·g → intake·workflow·chain·timing-area·coverage·code-review·gaps·evolve."]
    ]
  },

  deep: [
  { id: "intake", tab: "intake · 발생", short: "intake & routing", badge: "확정",
    title: "intake & routing — 일의 발생을 받아 처리에 착수시키는 단계",
    lead: "core의 앞 세 단계(intake → triage → gate)를 입구를 ticket 하나로 한정하지 않고 일반화한 설계다. ticket 분류(분류 record 여섯 칸, gate 다섯 조건)는 그대로 유효하며, 이 페이지는 그 앞뒤에 무엇이 더 있어야 하는지를 정한다.",
    summary: [
      "AI가 처리해야 할 \"일의 발생\"은 ticket만이 아니다. 도구가 낸 신호, 예정된 시각, 상태 변화, mail·chat의 요청, 시스템 내부에서 생긴 backlog가 모두 같은 core로 들어온다.",
      "그러려면 분류 앞에 \"발생 → 공통 intake 레코드\"로 정규화하는 adapter가 입구마다 있어야 한다.",
      "분류는 카테고리 하나 고르기가 아니라 축 여럿이다: 일인가 / 무엇을 원하는가 / 무엇에 대한 것인가 / 어떤 종류의 일인가 / gate / 누가 기다리는가 / 기존 일과의 관계.",
      "여섯 단계(capture → raw scan → work-or-not → understand → categorize → gate → route)를 거쳐 task 폴더가 열리고 workflow가 지정된다.",
      "이 설계에서 드러난 가장 큰 빈칸: \"왜 그런가\"를 찾는 diagnose(debug) 갈래가 없다."
    ],
    excluded: "사람이 말로 한 것을 기록으로 만드는 일(회의 → action item)은 이 단계의 범위가 아니다. 별도 도구·별도 갈래의 일이다.",
    body: [
      { h: "1. 발생의 모양 — 입구 목록" },
      { table: { head: ["입구", "예", "ticket과 다른 점", "범위"], rows: [
        ["ticket", "issue tracker의 ticket", "이미 \"일\"의 형식을 갖추고 있다", "포함 (첫 구현)"],
        ["tool 신호", "야간 regression 실패, lint 경고 증가, synthesis timing 악화, CI 실패", "요청자가 없다. \"이것이 일인가\"부터 판단해야 한다", "포함 (둘째 adapter)"],
        ["schedule", "주간 보고, 마일스톤 점검, 정기 회귀", "시각이 트리거다. workflow가 미리 정해져 있다", "나중에"],
        ["state 변화", "spec 개정, 상류 IP 새 버전", "직접 요청은 없지만 파급 작업이 생긴다", "나중에"],
        ["mail", "메일로 온 요청", "원문이 일의 형식이 아니다", "나중에 (LLM 입력 승인 범위 확인 뒤)"],
        ["chat / 메신저", "메신저 한 줄 요청", "같음. AI가 대신 ticket을 만들지 않고 ticket 개설을 회신으로 제안한다", "나중에"],
        ["고객 피드백", "고객이 보낸 문제 보고·질문", "대외 내용이라 별도 규율이 필요하다", "제외"],
        ["internal backlog", "다른 갈래가 남긴 \"나중에 test 보강\", 검수 reject 뒤 재작업", "시스템 내부에서 발생. 사람이 모르는 사이에 쌓인다", "포함"]
      ]}},

      { h: "2. 여섯 단계 (intake → triage → gate 안의 구조)" },
      { table: { head: ["단계", "하는 일", "산출물", "여기서 멈추는 경우"], rows: [
        ["0 capture", "adapter가 원문을 받아 intake 레코드 초안을 만든다. 규칙으로 채울 수 있는 필드는 LLM 없이 채운다", "`00_intake.md` 초안 + 원문 참조", "없음. 받은 것은 반드시 레코드가 된다"],
        ["1 raw scan", "LLM에 넣기 전에 pattern으로 위험 신호·금지 링크·민감 내용을 본다", "scan 결과", "위험 신호 → `ai:risk`, 사람에게 알리고 끝"],
        ["2 work-or-not", "일이다 / 기록만 한다 / 기존 일에 붙인다", "`work_decision` 필드", "기록만 → label 후 종료. 붙인다 → 기존 task에 comment, 종료"],
        ["3 understand", "ask의 종류·대상·요청자·\"끝\"의 모양·관계를 읽는다", "레코드의 나머지 필드", "없음. 빈 필드는 빈 채로 다음 단계로"],
        ["4 categorize", "업무 유형 `cat:<id>` 하나 + 근거 등급. 여러 유형에 걸치면 child 후보 목록", "`10_triage.md` (분류 record 여섯 칸)", "없음"],
        ["5 gate", "권한 범위 밖 / 정보 부족 / 해법 불확실·노력 초과·workflow 신설 / 진행", "`20_gate.md` + `ai:*` label", "범위 밖 → 기록만. 정보 부족 → 질문 다섯 칸. 불확실 → discuss"],
        ["6 route", "task 폴더 확정, workflow 지정, 초기 posture, 출처에 첫 회신", "`30_plan.md` 착수, 출처에 comment", "없음"]
      ]}},
      { ul: ["raw scan을 LLM 앞에 두는 이유: 입구가 늘수록 LLM에 넣기 전에 걸러야 할 원문(외부 mail, 첨부 링크)이 는다. gate의 위험 조건은 그 뒤 두 번째 검사다.", "work-or-not은 ticket에는 거의 \"일이다\"로 통과한다(관리성 ticket만 기록). tool 신호와 state 변화에서는 이 단계가 핵심이다."] },

      { h: "3. 공통 intake 레코드 (00_intake.md의 필드)" },
      { code: "source:        type(ticket|mail|chat|tool|schedule|state|internal), ref, received_at, raw_ref\nscan:          risk(none|flagged), links(allowed|blocked), notes\nwork_decision: work | info | attach(target task)\nask:           answer | change | diagnose | decide | notify | scheduled\nobject:        kind(rtl|tb|script|constraint|doc|spec|env|process), id\nrequester:     사람 또는 도구. 도구면 default owner 규칙으로 채운 사람\ndone_shape:    answer | patch | report | decision-material | none\ndeadline:      있으면 그대로, 없으면 공란\nrelation:      new | duplicate(of) | follow_up(of) | part_of(epic) | child_of(intake)\ncategory:      cat:<id>, grounds(explicit|similar-case|inferred), alternatives\ngate:          result, reason\nroute:         workflow id, initial posture, children[]" },
      { ul: ["누가 채우는가: `source`·`scan`·`received_at`·`deadline`은 adapter가 규칙으로. `work_decision`·`ask`·`object`·`relation`·`category`는 LLM이 근거 한 줄과 함께. `requester`·`done_shape`는 원문에 있으면 그대로, 없으면 기본값 규칙으로.", "LLM이 채운 필드는 모두 근거 한 줄을 옆에 둔다. 검수와 golden set이 그 근거를 본다.", "분류 record 여섯 칸을 대체하지 않는다. 여섯 칸은 `category` 이후의 상세이고, 이 레코드는 그 앞의 공통 껍데기다."] },

      { h: "4. 입구별 adapter — 하는 일과 못 하는 일" },
      { table: { head: ["입구", "규칙으로 채우는 것", "LLM이 읽어야 하는 것", "work-or-not 기본 규칙"], rows: [
        ["ticket", "ref, 시각, 요청자, 마감, 기존 label", "ask, object, category, relation", "일이다. 관리성 ticket은 기록만"],
        ["tool 신호", "ref, 시각, object, 실패 signature", "신규인가 재발인가, 심각도", "signature가 열린 task와 같으면 붙인다. 새로우면 shadow 단계에서는 owner에게 제안, 이후 자동 개설"],
        ["schedule", "전부 (workflow가 미리 정해져 있다)", "없음", "일이다. 분류 없이 바로 route"],
        ["state 변화", "ref, 시각, 무엇이 바뀌었는가", "파급 범위", "기록만 + 파급 child 후보를 owner에게 제안"],
        ["mail / chat", "시각, 발신자", "전부", "요청이면 일, 공유·잡담은 기록만. AI가 대신 ticket을 만들지 않고 개설을 제안"],
        ["internal", "전부 (시스템이 만든 레코드)", "없음", "일이다. 낮은 우선 queue. timing·area / test·coverage 갈래가 소비"]
      ]}},
      { note: "adapter 도입 순서: ticket → tool 신호 → (schedule, state 변화) → (mail, chat). tool 신호를 둘째로 두는 이유는 요청자가 없어 사람에게 부담이 없고, \"일인가\" 판단의 golden set이 쌓이기 때문이다." },

      { h: "5. ask의 종류 → workflow 묶음" },
      { table: { head: ["ask", "뜻", "가는 곳", "비고"], rows: [
        ["answer", "질문에 답하라", "knowledge 검색 + 근거 붙인 답. 짧은 판정형 workflow", "코드 리뷰 갈래와 같은 \"판정과 근거\" 틀"],
        ["change", "무언가를 바꿔라", "설계·검증 사슬 / timing·area / test·coverage 갈래 중 category로 결정", "산출물이 patch"],
        ["diagnose", "문제를 보고한다. 원인을 찾아라", "debug workflow (미설계)", "RTL 조직에서 가장 흔한 발생"],
        ["decide", "결정이 필요하다", "결정 자료 준비 → [HD]", "AI는 결정하지 않고 비교표·대안·근거를 만든다"],
        ["notify", "알려만 준다", "기록만, 또는 state 변화 adapter로", "일이 아니다"],
        ["scheduled", "정해진 시각이 됐다", "미리 정한 workflow", "분류 없음"]
      ]}},
      { p: "ask의 종류는 조직과 무관하게 일반적이라고 본다. 조직마다 다른 것은 업무 유형(categories.yaml)뿐이다." },

      { h: "6. 규칙 셋" },
      { ul: [
        "관계·중복(dedup): tool 신호는 `object + 실패 signature`를 fingerprint로 삼아 열린 task와 비교한다. 같으면 새 task를 열지 않고 기존 task에 comment로 붙인다. ticket은 유사 사례를 `follow_up(of)`로 표시만 하고 새 task는 연다. 사람이 적은 ticket을 AI가 닫지 않는다.",
        "분류 근거 등급(숫자 없음): `explicit`(원문이 유형을 명시) / `similar-case`(golden set의 채택 사례와 유사) / `inferred`(추론뿐). `inferred`이면 category를 정하되 gate에서 \"해법 불확실\"로 discuss를 건다. posture를 근거 셋으로 정하는 원리와 같다.",
        "틀린 분류를 잡는 자리 셋: ① golden set과의 불일치 ② 검수 판정의 \"category was wrong\" 항목 ③ 실행 중 재분류. 셋 다 `categories.yaml`을 고치는 입력이다."
      ] },

      { h: "7. 범위 결정 (설계 기본값. 조직이 바꾸면 그대로)" },
      { table: { head: ["대상(object)", "AI가 일을 열어도 되는가"], rows: [
        ["RTL 소스 · testbench·test · script · synthesis constraint · 문서", "허용 (고치는 범위는 workflow의 posture와 scope.yaml이 정한다)"],
        ["spec 자체", "결정 자료 준비까지 (spec 수정은 결정 사항)"],
        ["환경 설정 (tool version·license·CI job)", "열지 않음 (IT·관리자 영역)"],
        ["프로세스·규칙 문서 (팀 규칙·checklist)", "열지 않음 (정본 회의 영역)"]
      ]}},
      { ul: [
        "AI가 스스로 일을 열면 안 되는 것: 고객 대외 회신 / 릴리스·tag·배포 / 다른 팀 소유 영역 / 환경·권한·계정 변경 / 사람 평가·일정·인력 배치.",
        "tool 신호의 default owner: 그 block·TB의 owner(naming 또는 ownership 파일). ownership 파일이 없으면 준비 단계의 항목이 된다.",
        "한 ticket에 일이 여럿 섞여 있을 때: AI가 child 후보를 만들고 요청자에게 \"나눌까요\"로 묻는다. 자동 분할 개설은 shadow 단계 뒤에 owner 승인 아래 켠다."
      ] },

      { h: "8. 가상 사례 넷 — 여섯 단계를 태워 본다" },
      { ul: [
        "야간 regression에서 어제와 같은 test가 다시 실패 → tool adapter가 object·signature를 채움 → signature가 어제 열린 task와 같다 → attach. 기존 task에 \"재발, 로그 링크\" comment. 사람은 아무것도 받지 않는다.",
        "메신저 한 줄 \"block X timing 안 맞는데 한번 봐줄래?\" → 요청이다 → work → ask = diagnose인지 change인지 불명, grounds = inferred → gate 정보 부족 → 질문 다섯 칸을 발신자에게 회신하고 ticket 개설을 제안.",
        "spec 개정 알림 → info + 파급 child 후보 셋(RTL 두 block, TB 하나, 문서) → shadow 단계에서는 owner에게 \"이 셋을 열까요\"로 제안.",
        "설계 사슬 갈래가 남긴 \"나중에 test 보강\" backlog → internal adapter가 레코드를 통째로 만듦 → category = test·coverage → 낮은 우선 queue. 야간에 자원이 비면 그 갈래가 집어 간다."
      ] },

      { h: "9. 빈칸 — diagnose(debug) 갈래" },
      { p: "지금의 갈래 넷(설계·검증 사슬 / 코드 리뷰 / timing·area / test·coverage)은 모두 \"만들거나 고치거나 판정하는\" 갈래다. \"왜 그런가\"를 찾는 갈래가 없다. regression 실패의 원인 찾기, timing 악화의 원인 찾기, 보고된 오동작의 재현은 RTL 조직에서 가장 흔한 발생이며, tool 신호 입구의 대부분이 이 ask로 들어온다. 갈래 설계의 다음 항목이다. 그때까지 diagnose는 gate에서 \"workflow 없음 → discuss\"로 멈춘다." }
    ],
    related: ["triage", "grades", "gate"], stages: ["intake", "triage", "gate"]
  },
  { id: "workflow", tab: "workflow · 자율", short: "workflow & autonomy", badge: "확정",
    title: "workflow & autonomy — 착수된 일을 AI가 결과 패키지까지 스스로 끌고 가는 방식",
    lead: "core의 뒤 여섯 단계(plan → execute → result → review → apply → learn)가 이미 정해 둔 것을 \"AI가 일을 자율로 진행한다는 것이 무엇인가\"의 관점에서 다시 묶고, 거기에 없던 것 여섯을 더한 설계다. 앞 단계(발생)가 task 폴더와 workflow를 정해 주면 여기서 시작한다.",
    summary: [
      "자율 진행의 단위는 checkpoint, 자율의 정도는 posture, 자율의 경계는 sandbox와 scope.yaml이다. 이 셋은 설계 절에 이미 있다.",
      "더한 것 ①: workflow 파일은 AI 전용이 아니라 팀이 일하는 방식의 정본이다. 사람이 직접 처리하는 ticket도 같은 checkpoint를 따른다.",
      "더한 것 ②·③: workflow가 없는 일은 세 경로(이웃 합성 / 초안 신설 / one-off) 중 하나로 가고, 근거표에 들어가는 evaluator 결과는 기록되는 실행에서 나온 것이어야 한다(탐색은 local, 근거는 batch).",
      "더한 것 ④·⑤: 자율 선언 세 줄(하겠다 / 묻겠다 / 하지 않겠다)을 plan에 적고, 세션은 소모품이며 STATE가 정본이다(checkpoint마다 모델 등급 자리).",
      "더한 것 ⑥: workflow를 고치면 과거 accepted task의 evaluator 기록으로 새 checkpoint 목록을 판정해 본다(dry replay)."
    ],
    excluded: "이 페이지는 설계 절의 workflow·posture·실행 규칙·결과와 검수·학습을 다시 정하지 않는다. 그것들은 설계 탭에 그대로 있고, 여기서는 참조만 한다.",
    body: [
      { h: "1. 이미 정해진 것 (설계 탭 참조. 여기서 바꾸지 않는다)" },
      { table: { head: ["무엇", "요지"], rows: [
        ["workflow 파일", "step 순서가 아니라 checkpoint 목록(무엇이 참이어야 하는가 + 어떻게 확인하는가 + 실패하면). frontmatter에 oracle·cost_ladder·side_effects·default_posture·track_record. `[SE]` 부작용, `[HD]` 사람 결정"],
        ["선택·신설·재plan", "카테고리의 default_workflow. 보조 카테고리는 부록으로 합친다. 없으면 첫 작업이 초안 만들기 → discuss → draft로 fork에서 즉시 사용. 실행 중 맞지 않으면 멈추지 않고 재plan"],
        ["사슬(chain)", "긴 일은 workflow 여러 개의 link 목록. link 사이 `[HD]`. 앞 link의 결과 패키지 = 다음 link의 입력 요건"],
        ["posture", "full / draft / prepare / hold. 근거 셋(실적·정보 충분성·oracle 강도) + 되돌림 축. 숫자 없음. checkpoint 단위로 낮출 수 있다"],
        ["sandbox·자원", "경계는 스크립트가 만들고 안에서는 자유. 규칙 snapshot. 긴 일은 batch, 작은 sim·syn은 local. 비용 사다리. 야간 backlog"],
        ["실행 중 HITL 아홉", "지식 요청·의도 확인·작업량 초과·위험 고지·되돌리기 어려운 행동 직전·진전 없음·분류 재확인 실패·자원 대기·범위 이탈. 막히면 멈추지 않는다"],
        ["결과 패키지·검수", "다섯 줄 + 분류·posture + 근거표 + 링크 + MR 후보 + 가정 + 미완 + 학습 예고. accept / with-fix / reject. reject 뒤 재시도 없음, 사람이 이어받음"],
        ["학습", "채널 ① 검수 판정 + 채널 ② 자동 기록. golden set 자동 누적. 정본 vs fork, 승격·강등, 사람 직접 처리 ticket"]
      ]}},

      { h: "2. 자율 진행의 세 층" },
      { code: "scope.yaml + sandbox                 ← 경계: 이 밖은 하지 않는다 (어느 posture에서도)\n  └ workflow (checkpoint 목록)       ← 무엇이 참이어야 끝인가\n      └ posture (full/draft/prepare/hold)  ← 어디까지 스스로 가는가. checkpoint 단위로 낮춤\n          └ 행동 (읽기 / 수정 / evaluator 실행 / 제출 [SE] / 회신)  ← 되돌림 축으로 등급" },
      { ul: ["자율은 \"AI가 알아서 한다\"가 아니라 \"이 경계 안에서, 이 checkpoint를, 이 posture로\"의 세 겹이다. 사람은 세 겹 중 어느 것도 실행 중에 바꾸지 않는다. 바꾸는 자리는 검수(posture 과함·부족)와 정본 회의(경계·workflow)다.", "어떤 posture에서도 하지 않는 행동: 되돌리기 어려운 행동(issue tracker 상태 변경·고객 회신·정본 수정·MR 생성)은 \"하려 한다 + 내용\"까지만. 이것은 posture가 아니라 경계의 규칙이다."] },

      { h: "3. workflow 파일은 팀이 일하는 방식의 정본이다 (더한 것 ①)" },
      { ul: [
        "workflow 파일은 AI가 읽는 지시서가 아니라 \"이 종류의 일은 이것이 확인되어야 끝난 것이다\"라는 팀의 합의다. 사람이 직접 처리하는 ticket(`ai:manual`)도 같은 checkpoint를 따르고 같은 결과 패키지 형식으로 끝낸다. 그래야 사람이 한 일과 AI가 한 일이 같은 실적 표에 쌓이고, 사람이 한 일에서도 workflow가 배운다.",
        "workflow 신설은 \"AI 도구를 만드는 일\"이 아니라 \"팀의 절차를 적는 일\"이다. 초안은 AI가 만들지만 adopted로 올리는 것은 정본 회의다.",
        "팀에 이미 있는 checklist·절차서는 checkpoint 목록의 씨앗이다. 그대로 옮기지 않고 \"무엇이 참이어야 하는가 + 어떻게 확인하는가\"로 다시 쓴다. 확인 방법이 없는 항목은 `[HD]` 또는 \"사람 확인\"으로 남는다."
      ] },

      { h: "4. workflow가 없는 일이 들어왔을 때 (더한 것 ②)" },
      { table: { head: ["경로", "언제", "어떻게", "posture"], rows: [
        ["A 이웃 합성", "이웃 카테고리의 workflow가 checkpoint의 대부분을 덮는다", "이웃 workflow + 부록 checkpoint. plan에 \"합성\" 표시", "이웃의 default에서 한 단계 낮춤"],
        ["B 초안 신설", "같은 종류의 일이 다시 올 것이 분명하다", "첫 작업 = 초안 만들기(과거 해결 방식·이웃 workflow·oracle 후보). discuss에 첨부. 사람이 \"가 보자\" → draft로 fork에서 즉시 사용", "draft"],
        ["C one-off", "다시 올 것 같지 않고 되돌림 축이 낮다", "workflow 없이 최소 checkpoint 셋(입력 확인 / 산출물 / 검수)만으로 진행", "draft 고정"]
      ]}},
      { note: "one-off도 학습 기록에 \"이 일이 다시 올 것 같은가\"를 반드시 남긴다. 같은 one-off가 반복되면(횟수 공란, 결정 주체 = 정본 승인자) 초안 신설이 의무가 된다. diagnose(원인 찾기)는 지금 전부 경로 B다." },

      { h: "5. 실행 경로 규칙 — 탐색은 local, 근거는 기록되는 실행에서 (더한 것 ③)" },
      { ul: [
        "긴 job과 짧은 job의 경계는 숫자가 아니라 \"이 결과가 근거표에 들어가는가\"로 정한다.",
        "탐색(어느 방향이 맞는지 보는 sim·syn, 후보 비교의 첫 사다리)은 local이어도 된다. 결과는 STATE에 요약만 남는다.",
        "근거(checkpoint의 pass/fail을 판정하는 evaluator 결과)는 기록되는 실행(batch job, CI, 결과가 job id로 남는 실행)에서 나온 것이어야 한다. evaluator JSON의 commit/revision·tool_version·job ref가 채워져야 근거표에 들어간다.",
        "예외: 결정론적이고 짧은 도구(lint, 정적 검사, 스크립트 검사)는 local 결과도 근거가 된다. 어느 도구가 예외인지는 정본의 목록(결정 주체 = 시스템 관리자).",
        "효과: 검수자는 근거표의 모든 줄을 재현할 수 있고, 야간 backlog와 병렬 후보 탐색은 자연스럽게 batch로 간다."
      ] },

      { h: "6. 자율 선언 세 줄 (더한 것 ④)" },
      { code: "자율 선언 (30_plan.md, posture 아래)\n  하겠다:      <묻지 않고 할 행동. 예: sandbox 안 RTL 수정, lint·sim 실행, 후보 3개 병렬 탐색>\n  묻겠다:      <어느 checkpoint에서 무엇을. 예: interface 변경이 필요해지면 [HD]>\n  하지 않겠다: <경계 밖. 예: 정본 수정, MR 생성, 다른 block 파일 수정>" },
      { ul: ["검수자는 결과 패키지의 \"분류·posture 한 줄\"과 이 세 줄을 대조해 posture 과함·부족을 판정한다. 세 줄이 없으면 판정할 기준이 없다.", "세 줄은 workflow의 default_posture와 scope.yaml에서 자동으로 초안이 나오고, plan에서 이 task에 맞게 좁힌다. 넓히지는 못한다."] },

      { h: "7. 세션은 소모품, STATE가 정본 (더한 것 ⑤)" },
      { ul: [
        "한 task는 여러 세션(agent 실행)에 걸친다. 세션이 끝나거나 바뀌어도 STATE와 task 폴더만 있으면 이어진다. 남겨야 하는 것은 STATE의 결정·가정과 evaluator 기록이다.",
        "모델 등급 자리: checkpoint마다 \"어느 등급의 모델이 하는가\"를 적을 자리를 둔다. 기본 배치(이름은 공란): 분류·요약·evaluator 결과 해석 = 값싼 등급 / 계획·판단·결과 패키지·재plan·사람에게 보내는 문장 = 강한 등급.",
        "세션 분리 기준: 자원 대기(batch job 결과를 기다림)가 생기면 세션을 끝내고, 결과가 오면 새 세션이 STATE에서 재개한다. 기다리며 세션을 잡고 있지 않는다."
      ] },

      { h: "8. workflow의 회귀 시험 — dry replay (더한 것 ⑥)" },
      { ul: [
        "workflow(checkpoint 목록·입력 요건·oracle)를 고칠 때, 그 workflow로 accepted된 과거 task들의 evaluator 기록과 결과 패키지를 재료로 새 checkpoint 목록이 같은 판정을 내는지 본다. 실행을 다시 하지 않으므로 싸다.",
        "판정이 달라지는 task가 있으면 그것이 변경의 근거이거나(의도한 강화) 결함이다(의도하지 않은 탈락). 정본 회의의 승격 안건에 dry replay 결과를 붙인다.",
        "분류기의 golden set 회귀와 짝이다. 분류기는 golden set으로, workflow는 accepted task 기록으로."
      ] },

      { h: "9. 범위 결정 (설계 기본값. 조직이 바꾸면 그대로)" },
      { table: { head: ["항목", "기본값"], rows: [
        ["workflow 파일을 사람이 직접 처리하는 ticket에도 적용", "적용한다 (같은 checkpoint·같은 결과 패키지)"],
        ["팀의 기존 checklist·절차서", "workflow 초안의 씨앗으로 다시 쓴다"],
        ["workflow 없는 일의 one-off", "허용, draft 고정, 되돌림 축 낮은 일만, 학습 기록 의무. 반복되면 초안 신설 의무"],
        ["근거표에 들어가는 evaluator 결과", "기록되는 실행에서 나온 것만. 예외 = 결정론적 짧은 도구 목록"],
        ["자율 선언 세 줄", "plan 필수. 넓히지 못하고 좁히기만"],
        ["모델 등급", "checkpoint 필드로 둔다. 이름·수는 공란"],
        ["자원 대기 중 세션", "끝낸다. 결과가 오면 새 세션이 STATE에서 재개"],
        ["야간 backlog", "허용 (oracle이 수치인 workflow만). 시간대·동시 수 공란"],
        ["첫 자율 갈래", "timing·area 갈래(oracle = synth + LEC + regression). test·coverage가 둘째"],
        ["dry replay", "workflow 변경의 승격 안건에 필수 첨부"],
        ["reject 뒤", "재시도 없음. 사람이 이어받는다"]
      ]}}
    ],
    related: ["workflow", "posture", "sandbox", "hitl", "result", "review", "learn", "fork"], stages: ["plan", "execute", "result", "review", "apply", "learn"]
  },
  { id: "chain", tab: "chain · 사슬", short: "chain", badge: "틀 · 교정 대기",
    title: "chain — 아키텍처부터 검증까지 이어지는 사슬",
    lead: "core가 실행하는 workflow 갈래 가운데 가장 긴 일이다. 요구 정리에서 sign-off 준비까지를 workflow 하나로 두지 않고, link 여럿과 그것을 잇는 사슬 template으로 둔다. 지금은 기본안(틀)만 있고, 이름·개수·사람 결정 위치는 교정을 기다린다. 정본 문서는 아직 없다.",
    summary: [
      "chain은 카테고리 하나가 아니다. 카테고리 표에는 link 카테고리 여럿이 들어가고, 사슬 template이 그것을 잇는다. issue tracker에서는 epic이 사슬 인스턴스, child ticket이 link다.",
      "link 기본안은 일곱이다: 요구·feasibility → 아키텍처 → interface·register·시퀀스 spec → RTL 구현 ∥ 검증 환경·test → 통합·regression → sign-off 준비.",
      "핵심 leverage는 spec-derived oracle이다. 앞 link가 기계가 읽는 spec을 만들면, 그 spec이 뒤 link의 assertion·ref model 골격·coverage 목표·정합성 검사가 된다.",
      "검증 독립성: RTL link와 검증 link는 다른 세션이고, 공유 입력은 spec뿐이다. 검증 link는 RTL을 읽지 않는다.",
      "사람의 결정은 넷(착수·아키텍처 선택·interface freeze·sign-off)이다. 그 밖의 사람 자리는 검수다."
    ],
    excluded: "통합·regression 안에서 \"왜 실패했나\"를 찾는 일은 이 갈래가 아니라 diagnose 갈래의 일이다. diagnose 갈래는 아직 없다(빈칸 1순위).",
    body: [
      { h: "1. link 기본안 일곱" },
      { table: { head: ["link", "하는 일", "산출물", "oracle", "posture 상한", "사람 결정"], rows: [
        ["L1 요구·feasibility", "요구를 표로, 제약·리스크·대안 방향, 가능성 판단 재료", "요구표, feasibility 메모", "weak (사람)", "draft", "착수 결정"],
        ["L2 아키텍처", "대안 비교(구조·성능·면적·latency 추정), block 분할, 자원 예산", "대안 비교표, block 분할도, 예산표", "weak, 일부 medium (추정 script, 과거 실적)", "draft", "아키텍처 선택"],
        ["L3 interface·register·시퀀스 spec", "인터페이스 표, register map, 시퀀스·timing, 성능 예산을 machine-readable로", "spec 산출물 묶음", "medium (표 사이 정합성 검사: 이름·폭·주소 충돌·미정의 참조)", "draft → full (정합성 부분)", "interface freeze"],
        ["L4 RTL 구현 (block)", "spec에서 RTL, lint·compile, spec-derived assertion 통과, 단위 sim", "RTL + lint·assertion 결과", "strong", "full (sandbox 안). interface 변경은 `[HD]`", "—"],
        ["L5 검증 환경·test (block)", "test plan, TB, reference model, test, coverage 목표", "TB·test·ref model·coverage 보고", "strong (sim vs ref model, coverage)", "full", "test plan 승인 `[HD]`"],
        ["L6 통합·regression", "subsystem·top 연결, regression 구성·실행, 실패 분류", "통합 RTL·regression 결과", "strong (regression)", "full. 원인 찾기는 diagnose 갈래로", "통합 시점"],
        ["L7 sign-off 준비", "lint·CDC·synth·coverage 보고서 취합, 미결 목록, release note 초안", "sign-off 패키지", "strong (보고서) + 사람 판정", "draft", "sign-off"]
      ]}},
      { note: "link마다 workflow 파일이 하나(또는 여럿) 있고, checkpoint 규약·결과 패키지·학습은 workflow & autonomy 페이지와 같다. 이름과 개수는 기본안이며 과거 ticket 조사가 다르게 말하면 그쪽을 따른다." },
      { h: "2. chain 고유의 원칙 다섯" },
      { ul: [
        "앞에서 검증 가능한 산출물을 만든다(spec-derived oracle). 아키텍처·spec 산출물이 문서로만 끝나면 뒤 link의 oracle은 사람뿐이다. L3를 machine-readable로 만들면 L4 assertion, L5 ref model 골격·coverage 목표, L7 정합성 검사가 거기서 나온다. \"문서 → 코드 → 검증\"이 아니라 \"결정 → 기계가 읽는 spec → 그 spec이 판정하는 구현·검증\"이다.",
        "검증 독립성. L4와 L5는 같은 세션·같은 추론에서 나오면 안 된다. L5 세션은 RTL을 읽지 않고 test plan·ref model을 만든다. RTL을 읽는 것은 coverage hole 분석이라는 별도 checkpoint에서만이다. 사람 조직의 설계/검증 분리를 \"세션 분리 + 입력 제한\"으로 구현하며, 이것이 `scope.yaml`의 새 축(어느 link가 어느 산출물을 읽을 수 있는가)이 된다.",
        "사슬은 순서가 아니라 의존 그래프다. L4와 L5는 L3 뒤에서 병렬, L6은 둘 뒤, L7은 L6 뒤. 반복되는 사슬은 정본 자산 `core/chains/CH-<id>.md`(link·의존·병렬·`[HD]` 위치)로 둔다.",
        "spec 변경은 사슬 재plan이다. 진행 중 spec 개정이 들어오면 영향받는 link 목록을 만들고 각 link를 재plan하거나 child를 연다.",
        "사람의 결정은 넷이다. 착수(L1 뒤), 아키텍처 선택(L2), interface freeze(L3), sign-off(L7). test plan 승인은 다섯째 후보다. 사슬 전체의 결과 패키지는 link별 근거표 묶음과 결정 넷의 기록이다."
      ]},
      { h: "3. ticket 매핑과 도입 순서" },
      { ul: [
        "\"기능 X 신규\"가 들어오면 L1 child 하나만 연다. 착수 결정이 나면 L2, interface freeze가 나면 L4·L5를 병렬로 연다. 한 번에 다 열지 않는다.",
        "link 하나만 요구하는 ticket(\"block Y RTL 구현, spec 있음\")은 사슬 없이 그 link의 workflow 단독으로 간다.",
        "chain 전체는 도입 3단계지만 link 단위로 앞당길 수 있다. oracle이 강한 L5 TB 골격·test 생성이 먼저, L4 lint·assertion이 둘째다. L1~L3은 oracle이 약해 draft로 오래 간다."
      ]},
      { h: "4. 교정을 기다리는 기본값 일곱" },
      { table: { head: ["#", "항목", "기본값"], rows: [
        ["1", "link 일곱과 `[HD]` 위치", "위 표대로. 이름·개수는 과거 ticket 조사로 검증"],
        ["2", "검증 독립성", "적용 (세션 분리 + L5는 RTL을 읽지 않음)"],
        ["3", "ticket 매핑", "epic = 사슬, child = link, 한 번에 다 열지 않음"],
        ["4", "L3 machine-readable 산출물", "인터페이스 표 · register map · 시퀀스 · 성능 예산표 (넷)"],
        ["5", "사슬 template", "정본 자산 `core/chains/`로 둔다"],
        ["6", "도입 2단계로 앞당길 link", "L5 TB 골격·test 생성 먼저, L4 lint·assertion 둘째"],
        ["7", "교정 뒤 진행", "정본 문서 작성 → 이 페이지를 정본 기준으로 다시 씀"]
      ]}}
    ],
    related: ["workflow", "posture", "hitl", "sandbox", "result"], stages: ["plan", "execute", "review"]
  }
  ],

  /* ───────────── 원칙 열 개 ───────────── */
  principles: [
    { n: 1, name: "AI가 먼저 시작한다", what: "분류는 사람의 dispatch를 돕는 서비스가 아니라 AI 자신의 첫 사고 단계다.", why: "사람 확정 gate를 두는 순간 그것이 병목이고 시스템은 \"분류 도우미\"로 축소된다. 설계 질문도 \"오늘 어디서 시간이 새는가\"라는 진단으로 흐른다." },
    { n: 2, name: "oracle first", what: "lint·sim·synth·LEC·coverage처럼 결정론적 판정이 있는 곳은 무조건 그것으로 판정하고, LLM의 판단은 oracle이 없는 곳에서만 쓴다.", why: "공개된 자율 루프 사례는 예외 없이 실행 가능한 oracle 위에서만 보고되며, 성공률은 oracle 강도 순이다(compiler > golden sim > synth+SEC > coverage > 사람 판정)." },
    { n: 3, name: "sandbox 안에서는 최대 자율", what: "경계는 스크립트가 만들고, 그 안에서는 묻지 않는다. 경계를 넘는 행위와 gate 조건만 사람.", why: "업계 ticket→MR agent들의 공통 패턴 = 격리 sandbox + 전용 branch + 사람만 merge." },
    { n: 4, name: "사람은 검수와 결정에", what: "분류·계획·실행에서 사람을 빼고, review·apply와 gate·[HD]에 사람을 둔다. 검수자는 루프 안에 계속 있다.", why: "검수자가 루프 밖으로 나가면 학습 채널 ①이 끊긴다. EDA 업계의 상한도 \"다중 agent + EDA 루프 + 사람 checkpoint\"이며 최종 gate는 되돌리기 어려운 지점(sign-off)에 걸려 있다." },
    { n: 5, name: "forgetful expert", what: "사람은 세부를 잊은 전문가라고 가정한다. 어느 파일 하나만 열어도 상황을 알 수 있어야 하고, ID만 던지지 않고 내용을 같은 문장에서 다시 말한다.", why: "ID만 던지는 문서는 읽는 사람이 맥락을 복원해야 하고, 복원에 실패하면 재확인 라운드가 생긴다. 긴 글보다 재확인이 더 비싸다." },
    { n: 6, name: "checkpoint는 상세히, 경로는 느슨하게", what: "workflow는 step 순서가 아니라 확인 목록이다.", why: "모델이 좋아질수록 경로는 스스로 더 잘 찾는다. SOP 지침의 이득은 모델 능력에 gate된다는 연구 결과와 정합." },
    { n: 7, name: "위험은 넓게, 먼저", what: "위험 검사는 gate의 첫 조건이고 두 번 돌며 false positive를 감수한다.", why: "잘못 멈춘 비용은 사람의 몇 분, 놓친 비용은 조직의 위험. 정의되지 않은 위험도 \"일상적이지 않은 요청·과도한 정보\"라는 낯섦 신호로 조기에 잡는다." },
    { n: 8, name: "숫자는 공란, 결정 몫은 남긴다", what: "임계값·횟수·기간은 이 설계에 없다. 목적·결정 주체·결정 방법만 적는다.", why: "설계자가 초기값을 정해 버리면 IT팀·시스템 관리자·팀 리더가 생각하고 결정할 몫을 뺏는다. 스스로 정한 숫자는 지켜지고, 받은 숫자는 의심받는다." },
    { n: 9, name: "정본은 작게, fork는 자유, 학습은 강제", what: "정본에는 지식과 기본 rule만. 나머지는 개인 fork에서 즉시 진화. 정본 반영은 정기 회의. 모든 task는 학습 기록 없이 끝나지 않는다.", why: "진화 루프의 병목이 승인이 되어서는 안 된다. 절차 개선 연구의 공통 골격(수집 → 대조 → 편집 → 검증 → 반영, 기각 이력 보존)과 정합." },
    { n: 10, name: "설명·설득 우선", what: "받아들이는 사람이 스스로 생각하게 만드는 형태를 처음부터 고려한다.", why: "시스템은 잘 동작하고 진화하는 좋은 틀이 될 수 있지만, 사람들이 이해하고 받아들여야 그렇게 된다." }
  ],

  /* ───────────── 대안 ───────────── */
  alternatives: [
    { name: "A 단일 거대 agent", what: "모든 것을 context에 넣은 agent 하나", why: "수백 모듈·수천만 gate가 어떤 context에도 들어가지 않는다. 재현성이 없고 진화가 없다" },
    { name: "B 이 설계", what: "core(아홉 단계) + 갈래(workflow 가족) + oracle 기반 posture + 정본/fork 진화", why: "채택. 약점은 core가 무거워지면 모든 갈래가 느려진다는 것이며, 그래서 core는 절차의 골격만 갖고 살은 workflow에 둔다" },
    { name: "C 고정 DAG workflow engine", what: "카테고리별 DAG를 engine이 실행", why: "새 카테고리·모호한 ticket에 약하고, 실행 결과로 graph 자체를 고치는 기능이 없다. 부품으로 흡수(checkpoint 목록은 유연한 DAG다)" },
    { name: "D 자유 agent 군집", what: "workflow 없이 agent들이 협업", why: "재현성·예측 가능성이 낮고 비용이 폭주한다" },
    { name: "E 플랫폼 구매", what: "Git 서버 내장 agent 플랫폼, EDA vendor copilot", why: "입구·oracle·VCS·자율성 판정·진화 루프가 조직마다 다르다. 부품으로 검토" }
  ],

  /* ───────────── migration ───────────── */
  migration: [
    { n: 0, name: "준비", on: "아무 ticket도 자동으로 다루지 않는다. 조사와 규약만.", human: "조사자·검수자·팀 리더·IT팀", stack: "카테고리 표(과거 ticket에서 귀납), label 이름, 권한 범위 선언(도입자 한 사람의 범위), 위험 신호 목록·allowlist 초안, task 폴더 규약, golden set 씨앗", undo: "아무것도 자동으로 하지 않았으므로 되돌릴 것이 없다.", next: "카테고리 표에 \"기타\"가 충분히 작고(기준 공란), golden set이 카테고리마다 있고, label을 시스템 계정이 붙일 수 있음이 확인되었을 때. 결정 주체 = 팀 리더." },
    { n: 1, name: "shadow", on: "새 ticket마다 intake → triage → gate까지. label을 붙이되 plan으로 넘어가지 않는다.", human: "검수자가 분류·gate 판정만 review한다. 위험 hit는 즉시 사람이 본다. 정보 부족의 질문 초안은 사람이 읽고 보낼지 정한다.", stack: "golden set, 위험 목록·allowlist, 분류 실적, 정보 부족 사례", undo: "label을 떼면 끝이다. 시스템 계정의 label 권한을 닫으면 shadow가 꺼진다.", next: "어느 한 카테고리에서 분류 실적이 검수자가 신뢰할 만하고, 그 카테고리의 oracle이 강하며, 표준 workflow 파일이 있을 때. 결정 주체 = 팀 리더, 근거 = 검수자 판정 기록." },
    { n: 2, name: "첫 갈래 자율", on: "oracle이 강한 카테고리 하나에 권한 범위를 열고 plan → execute → result → review → apply → learn까지. posture는 draft부터.", human: "review·apply + gate·[HD]·실행 중 HITL", stack: "workflow 실적(checkpoint 단위), 검수 판정과 \"어디가 문제였나\", 학습 기록의 제안 표, 첫 정본 갱신 후보", undo: "scope에서 그 행을 닫으면 1단계로 돌아간다. 진행 중 task는 결과 패키지까지 마감하고 사람이 이어받는다.", next: "검수 reject의 원인이 \"workflow·posture\" 쪽에서 \"산출물 품질\" 쪽으로 옮겨 가고, 학습 기록의 제안이 실제로 workflow를 개선했음이 실적에서 보일 때." },
    { n: 3, name: "확장", on: "카테고리·제품·허용 행동을 넓힌다. 사슬형 workflow, 시스템 생성 ticket, 야간 실행, 정기 정본 회의.", human: "정기 회의(승격·강등), 검수자 다수, 사람이 직접 처리하는 ticket", stack: "adopted workflow 목록, 정본 지식, 팀 단위 실적, 위험 목록·allowlist의 정본 판", undo: "카테고리 단위로 scope 행을 닫는다.", next: "끝이 없다. 사용자 범위가 도입자 → 팀 → 전 개발자로 넓어지는 것이 이 단계 안에서 일어난다." }
  ],
  migrationAlways: [
    "위험 신호 hit는 어느 단계에서든 즉시 멈춘다(raw scan + gate, 실행 중 위험 고지).",
    "정보가 없으면 지어내지 않고 요청한다. 고객 ticket의 발송은 사람이 한다.",
    "main MR은 시스템이 만들지 않는다. 반영은 사람과 함께 결정한다.",
    "모든 task는 학습 기록을 남긴다. 0단계의 조사도 예외가 아니다.",
    "단계를 올릴 때보다 내릴 때가 더 쉬워야 한다. 어느 단계에서든 ai:manual이면 그 ticket은 시스템 밖이다."
  ],
  blanks: [
    ["카테고리별 작업량 기준(gate 조건 5)", "자원 폭주 방지", "팀 리더 · 시스템 관리자", "초기 task 실적을 보고 카테고리별로"],
    ["\"진전 없음\" 판정 회수", "무한 루프 방지", "시스템 관리자", "checkpoint 종류별"],
    ["자원 대기 장기화 기준", "놀지 않게", "시스템 관리자", "라이선스 풀 크기에 따라"],
    ["동시 실행 수 · 야간 시간대", "주간 업무 보호", "IT팀 · 시스템 관리자", "라이선스·서버 정책"],
    ["evaluator 상위 이슈 개수", "context 절약", "시스템 관리자", "tool별"],
    ["정본 강등 기간·조건", "비대화 방지", "정본 승인자", "정기 회의"],
    ["사람 직접 처리 비율", "역량 유지", "팀 리더", "정기 회의"],
    ["질문 무응답 기한", "보수적 기본값의 발동 시점", "팀 리더", "카테고리·hold 유형별"]
  ],

  /* ───────────── 열린 긴장 ───────────── */
  tensions: [
    { t: "위험 검사의 넓음 vs 귀찮음", p: "넓게 잡으면 잘못 멈추는 일이 생긴다. \"위험이 아니었다\" 판정의 누적으로 목록과 allowlist가 자라는 절차는 설계했지만, 얼마나 빨리 정밀해지는지는 실제 ticket을 겪어 봐야 안다." },
    { t: "자율 vs 사람 역량", p: "시스템이 잘 돌수록 사람은 분류·재현·수정을 덜 하게 된다. 사람 직접 처리 ticket을 두는 장치는 있지만 비율은 공란이고 효과는 측정해야 한다." },
    { t: "정본은 작게 vs 일관성", p: "fork가 자유로우면 같은 카테고리를 두 사람이 다르게 처리할 수 있다. 정기 회의가 그것을 모으지만 회의의 형태와 주기는 조직이 정한다." },
    { t: "분류 오류의 조용한 누적", p: "등급 \"근사\"의 재확인과 golden set 회귀 평가가 방어선이지만, 검수자가 분류 칸을 대충 accept하면 golden set이 오염된다. 결과 패키지의 \"분류·posture 한 줄\"이 그것을 막는 자리다." },
    { t: "검수의 고무도장화", p: "한 장이 잘 만들어질수록 accept가 빨라지고, 빨라질수록 덜 본다. \"한 장으로 판정 못 했다\"는 기록과 reject의 원인 집계가 계측이지만, \"너무 잘 돌아서 안 본다\"는 상태는 계측이 잡지 못한다." },
    { t: "공개 성공률은 소형 문제 기준이다", p: "모듈 단위 성공률은 작은 문제의 것이고, 실전형 benchmark에서는 최고 모델도 pass@1이 낮다. 수백 모듈 규모의 공개 사례는 없다. 그래서 module index와 oracle이 강한 카테고리부터 여는 순서가 중요하다." },
    { t: "CI가 없는 제품", p: "legacy VCS 제품에 CI가 없으면 검증을 시스템이 직접 돌려야 하고, 작업 copy의 격리·commit 권한·pre-commit hook은 별도 논의에 달려 있다." },
    { t: "모델 등급과 세션 분리", p: "어느 단계에 어느 등급의 모델을 쓰고 언제 세션을 나눌지는 아직 제안이 없다. cascade(값싼 것 먼저)와 checkpoint 단위 posture가 그 자리의 후보다." },
    { t: "\"답이 없으면 보수적으로\"가 유용한 초안을 내는가", p: "두 해석 중 보수적인 쪽으로 진행한 초안이 버려지는 일이 잦으면 규칙을 바꿔야 한다." }
  ],

  /* ───────────── 용어 ───────────── */
  glossary: [
    ["core", "분류(c) + workflow·자율 진행(d). ticket 한 건이 지나가는 아홉 단계와 단계마다 남는 파일 하나"],
    ["갈래", "core가 실행하는 workflow의 가족(아키텍처→검증·코드 리뷰·timing/area·test/coverage·…). 다른 것은 oracle과 posture뿐"],
    ["triage / 분류", "AI가 \"이 ticket으로 내가 무엇을 해야 하는가\"를 알기 위한 판정. 여섯 칸, 등급 넷"],
    ["등급", "명확 / 근사 / 새 카테고리 후보 / 정보 부족. 숫자 confidence 대신 쓴다"],
    ["gate", "분류 직후 시스템이 스스로 멈추는 다섯 조건(위험 → 권한 → 정보 → 불확실 → 작업량)"],
    ["hold 유형", "stop(위험) / record-only(권한) / needs-info(정보) / discuss(불확실·작업량·신설)"],
    ["raw scan", "LLM이 본문을 읽기 전에 정규식·목록으로 하는 위험 패턴 검사"],
    ["scope / 권한 범위 선언", "카테고리 × 제품 × 허용 행동 × 최대 posture. gate 조건 2의 재료"],
    ["workflow", "카테고리별 표준 절차 파일. 본문은 checkpoint 목록, 경로는 힌트"],
    ["checkpoint", "\"이것이 확인되어야 다음으로 간다\"의 한 항목. 무엇이 참이어야 하는가 + 어떻게 확인하는가 + 실패하면"],
    ["[SE] / [HD] / [RC]", "부작용이 있는 checkpoint / 사람의 결정이 필요한 checkpoint / 분류 재확인 checkpoint"],
    ["사슬(chain)", "link(workflow) 여러 개가 [HD]를 사이에 두고 이어진 것"],
    ["oracle", "맞았다고 판정하는 기준. lint·sim·synth·LEC·coverage처럼 결정론적일수록 강하다"],
    ["evaluator", "oracle을 실제로 돌리는 도구. 결과는 공통 JSON 한 형식"],
    ["posture", "자율의 정도. full / draft / prepare / hold"],
    ["되돌림 축", "계획된 행동 중 가장 되돌리기 어려운 것. sandbox 수정 → evaluator 실행 → branch push → comment → 고객 회신·정본 수정"],
    ["sandbox", "시스템이 묻지 않고 쓸 수 있는 범위. task branch 또는 작업 copy, 지정 ticket·page, work 폴더"],
    ["handoff", "host(Windows↔Linux)·tool 전환. 시스템이 지점과 재개 명령을 남기고 사람이 전환"],
    ["STATE.md", "task의 살아 있는 단일 상태 문서. 무엇인가 / 어디인가 / 결정 / 질문 / 답이 없으면 / handoff / 가정"],
    ["question 다섯 칸", "맥락 / 질문 / 선택지와 결과 / 무응답 기본값과 기한 / 관련 과거 결정"],
    ["결과 패키지 / 한 장", "검수자가 이것만 보고 판정하는 문서 40_result.md"],
    ["근거 등급", "근거표의 열. evaluator 확인 / 코드·문서 추적 / 의견"],
    ["검수 판정", "accept / accept-with-fix / reject + 어디가 문제였나 + 다음(폐기 / 사람이 이어받음)"],
    ["learn / 학습", "아홉 번째 단계. 검수 판정 + 자동 기록 → 제안 표. 생략 불가"],
    ["golden set", "검수자가 분류를 accept한 task의 분류 record 모음. 분류기 회귀 평가용"],
    ["정본 / fork", "지식과 기본 rule(정기 회의로 반영) / 개인의 자유 진화 영역(즉시)"],
    ["gardener", "정기 정리 workflow. learn 집계·강등 후보·범위 확장 후보를 회의 자료로"],
    ["forgetful expert", "세부를 잊은 전문가. 사람에게 보이는 모든 문서의 독자 모델"],
    ["label", "issue tracker의 손잡이. cat:<id> 하나 + ai:* 하나 + 사람용 ai:manual"],
    ["backlog ticket", "너무 큰 일·재발 방지 test·시스템 개선을 위해 시스템이 지정 project에 만드는 ticket. 같은 엔진을 탄다"]
  ],

  /* ───────────── 소개 ───────────── */
  about: {
    purpose: "이 앱은 설계 중인 AI-native RTL 업무 시스템의 중간 결과를 한곳에서 확인하기 위한 뷰어다. 설계 원본은 비공개 작업 공간에 있고, 이 앱은 그중 조직 고유 정보를 뺀 core를 옮겨 둔 사본이다. 외부 독자를 위해 쓴 문서가 아니며, 배포 수단으로 공개 페이지를 쓸 뿐이다.",
    how: "설계는 가상 ticket 수십 건을 아홉 단계에 태워 보며 만든다. 틀에 부족한 것이 드러나면 설계를 고치고, 그 결과가 이 앱의 사례와 설계 절로 옮겨진다. 실물 ticket을 겪어야 답이 나오는 것들은 \"열린 긴장\"에 적는다.",
    scope: "이 앱은 core(분류 → gate → 계획 → 실행 → 결과 → 검수 → 반영 → 학습), 주제별 심화 페이지, 설계 작업 전체의 현황(현황 탭)을 다룬다. 갈래는 core가 실행하는 workflow의 가족이고, 다른 것은 oracle과 posture뿐이다.",
    status: "설계는 계속 바뀐다. 바뀐 것은 이 앱에 반영되며 이전 판과의 비교는 두지 않는다."
  },
  sources: [
    { t: "Agentic 설계 패턴 일반 — plan/act/reflect, evaluator-optimizer, HITL 배치", n: "issue triage의 실용 결론(\"Top-1은 낮아도 후보 목록은 쓸 만하다\")과 agent 자기 보고 confidence의 한계가 등급 넷 + cascade의 근거" },
    { t: "Coding agent 도구의 공개 문서 — sandbox·hook·subagent·session 기능", n: "sandbox 경계와 handoff 설계의 재료" },
    { t: "반도체·EDA 분야의 AI agent 공개 사례 — LLM 기반 RTL 생성·검증 benchmark, EDA vendor의 agentic 워크플로우", n: "oracle first 원칙과 \"공개 성공률은 소형 문제 기준\"이라는 긴장의 근거. agent가 만든 testbench는 독립 oracle이 아니라는 함정" },
    { t: "ticket→MR 자동화 agent 제품군의 공통 패턴", n: "격리 sandbox + 전용 branch + 사람만 merge" }
  ]
};
