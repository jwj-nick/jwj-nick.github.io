/* RTL WorkSys — 콘텐츠 데이터 (앱의 텍스트는 전부 여기).
   구조(v0.10): ① 한눈에(home) ② 전체 지도(atlas: 겹침 지도 · 결과물 · 일이 흐르는 길) ③ 시스템(sys: 주제마다 같은 틀, KB 포함) ④ 사례(walks) ⑤ 결정(decide · talk) + 자료실(lib · 탐색기).
   주제 카드의 한 장 · 해설판 = maps.<id>, '자세히' = deep[]의 같은 id.
   규율: 조직 실명·수치 없음. 모든 ticket·블록·신호 이름은 가상. 숫자 기준은 공란 + 결정 주체.
   본문 블록 형식: {h:"소제목"} {p:"문단"} {ul:[...]} {table:{head:[...],rows:[[...]]}} {code:"..."} {note:"..."} */
window.WS = {
  meta: {
    title: "RTL WorkSys",
    subtitle: "AI-native RTL 업무 시스템 · 전체 뷰어",
    updated: "2026-10-03",
    version: "0.14",
    tagline: "ticket이 생기면 AI가 먼저 일을 시작한다. 사람은 검수와 결정에 선다."
  },


  /* ───────────── ① 한눈에 ───────────── */
  home: {
    title: "일이 생기면 AI가 먼저 시작하고, 사람은 검수와 결정에 선다",
    summary: [
      "일이 어디서 오든(ticket · 도구 신호 · backlog · 사람의 command · 고객) 같은 core를 지난다. intake가 받아 무엇을 할지 정하고, workflow가 checkpoint를 하나씩 통과해 결과 패키지까지 간다.",
      "순서와 멈춤은 코드가, 판단과 작업은 LLM이 한다. 판정은 lint · sim · 합성 · LEC · coverage 같은 결정론 도구와, 앞 단계가 만든 oracle(spec assertion · C-model)이 한다.",
      "사람이 반드시 서는 자리는 검수와 반영 둘이다. 그 밖에는 시스템이 스스로 멈춰 부를 때만 나온다. 모든 일은 기록을 남겨 규칙과 workflow를 고친다."
    ],
    must: [
      ["검수 (review)", "결과 패키지 한 장을 보고 accept · accept-with-fix · reject 중 하나를 고른다. 목표는 10초에 방향, 10분에 판정이다. reject된 일은 사람이 이어받고 시스템은 다시 시도하지 않는다."],
      ["반영 (apply)", "MR을 만들지 · 직접 commit할지 · 회신할지 · 보류할지를 정한다. main으로 가는 MR, 고객 회신, ticket 상태 변경은 시스템이 하지 않는다."]
    ],
    cond: [
      ["gate에서 멈출 때", "위험 · 권한 · 정보 · 불확실 · 작업량 가운데 하나에 걸리면 그 방식으로 멈춘다(위험이면 실행 경로를 만들지 않고, 정보가 없으면 질문 다섯 칸, 불확실하면 논의 자료)."],
      ["plan 때의 질문", "필수 입력이 없거나, 작업량이 기준을 넘거나, 이웃 workflow로 합성할 수 없을 때. 일을 시작하지 않고 묻는다."],
      ["사람 결정 checkpoint", "workflow에 미리 표시된 자리([HD]): 아키텍처 선택, interface 변경, coverage waiver, 고객 회신 문구 등."],
      ["실행 중 HITL", "지식 요청 · 의도 확인 · 새 위험 · 되돌리기 어려운 행동 직전 · 진전 없음 등 아홉 조건. 막혀도 멈추지 않고 질문을 남긴 채 할 수 있는 부분을 계속한다."]
    ],
    notWhat: [
      "오늘의 병목을 고치는 개선 도구가 아니라 새 작업 방식이다.",
      "사람을 빼는 시스템이 아니라 사람의 자리를 분류 · 배정 · 진행 관리에서 검수 · 결정으로 옮기는 시스템이다.",
      "issue tracker · Git · CI를 대체하지 않는다. 그 위에서 label 하나, comment 하나, task 폴더 하나로 흔적을 남긴다."
    ],
    blank: "이 설계에 숫자 기준은 없다. 임계값 · 횟수 · 기간은 공란으로 두고, 누가 어떻게 정하는지만 적는다.",
    tuning: {
      title: "기본값은 출발점이다",
      lead: "이 시스템의 규칙 가운데 상당수는 회사 실물을 보지 않고 정한 출발점(기본값)이다. 가상 사례로 맞춰 보았지만 실제 ticket · 도구 · 팀 경계에서 그대로 맞는다는 보장은 없다. 실무를 하면서 확인하고, 정하고, 고친다. 고치는 것은 실패가 아니라 이 시스템이 의도한 운영 방식이다.",
      keep: ["위험 신호는 즉시 멈춘다", "고객에게 가는 글은 사람이 보낸다", "main MR은 시스템이 만들지 않는다", "보지 못한 것을 통과로 세지 않는다", "학습 기록(Track B) 없이 일이 끝나지 않는다"],
      adjust: [
        ["업무 가족 열둘 · 카테고리 표", "과거 ticket 조사 결과, \"기타\"의 크기, 분류 교정이 몰리는 곳", "조사자 · 팀 리더"],
        ["도구 신호의 원인 찾기는 사람이 요청할 때", "요청까지 걸린 시간, 요청 없이 되풀이된 실패 묶음", "팀 리더"],
        ["posture는 draft부터", "검수 판정의 \"posture 부족\" 반복, reject 원인의 변화", "팀 리더 · 검수자"],
        ["억제 기록은 코드가 바뀌면 효과 정지", "RTL 수정 직후 GATE FAIL과 재승인 부담", "팀 리더 · 검증 리더"],
        ["timing 위반의 층 판별 순서", "어느 층이 실제 원인이었나(Track B)", "설계 리더"],
        ["모델 등급의 역할별 기본값", "등급별 호출 수 · escalation 빈도 · 결함이 몰리는 역할", "시스템 관리자"]
      ],
      how: "조정은 근거(검수 판정 · Track B 집계 · shadow 기록)와 함께 한다. 개인 · 팀 fork에서 먼저 바꿔 쓰고, 효과가 보이면 정기 정본 회의에 \"기본값 조정\" 안건으로 올린다. 방향이 엄격하면 즉시, 중립이면 이의 기간 뒤, 완화면 회의에서 정한다. 처음의 기본값은 대부분 \"덜 자율 · 더 많이 묻기\" 쪽이고, 넓히는 것은 실적이 쌓인 뒤다."
    }
  },

  /* ───────────── 전체 지도 (atlas) ─────────────
     주제마다 어떤 책임의 정본이고 무엇을 빌려 쓰는가(겹침 지도), 주제별 결과물, 일 셋이 부품 사이를 지나가는 길(swimlane).
     새 내용은 없다. 각 칸의 정본은 그 주제 카드에 있다. */
  atlas: {
    title: "전체 지도",
    lead: "주제 카드는 따로 서 있지만 실제 일은 모두 같은 부품을 지나간다. 이 화면은 그것을 한 장으로 묶는다: 주제마다 어떤 책임의 정본인지, 무엇을 결과물로 내는지, 일 셋이 부품 사이를 어떻게 흐르는지.",
    cols: [
      ["입구", "일이 들어오는 자리: 입구의 종류, 입구마다의 adapter, 단계와 파일"],
      ["분류", "무엇에 대한 어떤 일인가를 정하는 축과 규칙"],
      ["gate", "해도 되는가: 위험 · 권한 · 정보 · 불확실 · 작업량"],
      ["plan", "어떻게 할 것인가: posture · 실행 중 허용 목록(allowlist) · 계획"],
      ["실행", "checkpoint를 하나씩 지나며 일을 하는 것"],
      ["oracle", "무엇으로 맞았다고 판정하나"],
      ["결과 · 검수", "결과 패키지 한 장과 사람의 판정"],
      ["반영", "MR · 회신 · 결정을 실제로 내보내는 자리"],
      ["학습", "Track B: 쓴 workflow · 규칙 · 묶음을 고치는 기록"],
      ["지식", "근거(원천 위치와 버전)가 붙은 제품 지식"]
    ],
    rows: [
      { name: "core 공통", go: ["sys", "core"], cells: [["●", "아홉 단계 · 단계마다 파일"], 0, ["●", "다섯 조건(위험 → 권한 → 정보 → 불확실 → 작업량) · 위험 목록이 자라는 법"], 0, 0, 0, ["●", "결과 패키지 · 검수"], ["●", "사람이 반영"], ["●", "learn 단계 · 정기 정본 회의"], 0] },
      { name: "intake", go: ["sys", "intake"], cells: [["●", "입구 · 입구마다 adapter"], ["●", "분류 축 · 규칙"], ["●", "판정 순서"], 0, 0, 0, 0, 0, ["○", "분류의 기록"], ["○", "module 목록"]] },
      { name: "workflow", go: ["sys", "workflow"], cells: [0, 0, 0, ["●", "posture · allowlist"], ["●", "checkpoint · 모델 등급"], ["●", "evaluator · 근거 자격(판정의 형식)"], ["●", "결과 패키지의 절"], 0, ["●", "LN 자리 · dry replay"], ["○", "설계 지식 질문"]] },
      { name: "업무 지도", go: ["sys", "workmap"], cells: [["●", "출처 축 · 고객 입구"], ["●", "업무 가족 열둘 · 층 축"], 0, 0, 0, 0, 0, 0, ["●", "두 트랙(Track B 의무) · 기존 자산 이식"], 0] },
      { name: "chain", go: ["sys", "chain"], cells: [["○", "첫 link만 연다"], 0, 0, ["○", "link마다"], ["○", "link = task"], ["●", "spec · C-model 층"], ["○", "link마다"], ["●", "사람 결정 넷"], 0, 0] },
      { name: "timing-area", go: ["sys", "timing"], cells: [["○", "정기 합성 · 수치 feed"], ["○", "ask"], 0, ["○", "workflow의 plan"], ["●", "층 다섯 · 억제 기록 운용"], ["●", "같은 조건 비교(숨은 축)"], ["○", "QoR 칸 · sign-off 재료"], ["●", "사람(constraint · 구조 · ECO)"], ["●", "층 분포 · path 계열"], ["○", "KB"]] },
      { name: "coverage", go: ["sys", "coverage"], cells: [["○", "정기 run · 수치 feed"], ["○", "ask"], 0, ["○", "workflow의 plan"], ["●", "hole 층 여섯 · exclusion 운용"], ["●", "채움 ≠ 확인 · 분모 바뀜 표시"], ["○", "closure 판정 자료"], ["●", "사람(closure · exclusion)"], ["●", "hole 층 · 되돌린 exclusion"], ["○", "KB"]] },
      { name: "diagnose", go: ["sys", "diagnose"], cells: [0, ["○", "ask = diagnose"], 0, 0, ["●", "층 판별 · 좁히기"], ["●", "재현 · before/after"], ["○", "원인 보고"], 0, ["●", "질문 · test 묶음의 revision"], ["○", "bug 패턴"]] },
      { name: "고객 트랙", go: ["sys", "workmap"], cells: [["●", "고객 입구"], ["○", "같은 분류 축"], ["○", "같은 gate"], 0, ["○", "diagnose를 쓴다"], 0, ["●", "회신 승인 · 고객 확인"], ["●", "회신"], ["○", "Track B"], ["○", "FAQ · errata"]] },
      { name: "KB", go: ["sys", "kb"], cells: [["○", "원천 사건(commit · ticket · 릴리즈 · 납품 …)"], 0, 0, 0, ["●", "KB agent의 작업"], ["●", "lint · 정답 표"], ["●", "MR 판정"], 0, ["●", "gap → 일감"], ["●", "지식의 정본"]] }
    ],
    shared: [
      ["입구", "core는 단계와 파일을, intake는 입구별 adapter를, 업무 지도는 출처 축과 고객 입구를 정한다. 고객 입구는 intake의 고객 입구 adapter가 받는다(늘 밖, 고객 별칭만, 회신은 사람 승인)."],
      ["실행", "workflow는 checkpoint의 형식과 모델 등급을, 갈래는 그 안에서 무엇을 하는지(diagnose = 층 판별 · 좁히기, timing-area = 하위 층 다섯과 억제 기록, coverage = hole 층과 exclusion)를 정한다."],
      ["oracle", "workflow는 판정의 형식(evaluator 공통 JSON · 근거 자격)을, 갈래는 무엇이 oracle인지(chain = spec · C-model 층, diagnose = 재현 · before/after, timing-area = 숨은 축까지 같은 조건의 비교, coverage = 채움과 확인의 구분, KB = lint · 정답 표)를 정한다."],
      ["반영", "core는 \"반영은 사람\"을, 갈래는 그 사람이 무엇을 정하는지(chain = 결정 넷, timing-area = constraint · 구조 · ECO, coverage = closure · exclusion)를 정한다."],
      ["학습", "core는 learn 단계를, workflow는 LN 자리와 dry replay를, 업무 지도는 \"Track B가 늘 붙는다\"는 의무를, diagnose는 질문 · test 묶음의 revision을 정한다. 하나의 Track B 기록 형식으로 모인다."]
    ],
    kbNote: "KB는 거의 모든 열에서 ○ 또는 ●다. 지식은 KB만 정본이다. 다른 주제는 묻기만 하고 KB에 직접 쓰지 않는다(MR로 제안한다).",
    outputs: [
      { name: "intake", go: ["sys", "intake"], goal: "어떤 발생이든 같은 레코드로 받아, 일인지 · 무엇을 원하는지 · 무엇에 대한 것인지 · 어떤 종류인지 · 해도 되는지를 정하고 workflow로 보낸다.",
        agent: ["work-judge", "understander", "categorizer", "gate-checker(판단 부분)", "reply-writer"],
        tool: ["intake-controller", "adapter(입구마다)", "raw-scanner", "dedup-linker", "router", "원장(append-only)"],
        skill: ["사람이 시스템을 직접 부르는 command 입구(사람 수행 command 포함)"],
        doc: ["설계서", "명세 묶음: README · architecture", "계약 셋(발생 봉투 · 공통 레코드 · 원장 한 줄)", "부품 명세 열", "규칙 YAML 아홉(asks · dedup · entrances · event_actions · narrowing_questions · ownership · priority · risk_patterns · work_decision)", "시험 사례 119건(고객 7 포함) · 평가"],
        quality: "hard-zero 셋: 위험 놓침 0 · 잘못 붙이기 0 · 밖으로 새기 0" },
      { name: "workflow", go: ["sys", "workflow"], goal: "일 하나를 checkpoint 단위로 끝까지 진행하고, 판정은 도구가 하며, 결과는 한 장으로 검수받는다.",
        agent: ["planner", "checkpoint runner의 worker", "result writer(서술)", "hitl manager(질문 · 답 해석)", "learner(제안)", "판정형의 관점별 sub-reviewer"],
        tool: ["workflow-controller", "resolver(+ registry)", "policy engine", "evaluator adapter", "record writer", "dry replay runner", "행동 guard(권한 규칙 + hook)"],
        skill: ["특화 workflow마다 하나. workflow 파일에서 생성하고 손으로 고치지 않는다"],
        doc: ["설계서", "명세 묶음: 계약 열하나 · 부품 명세 열하나", "WF-common · 작업 모양 일곱 · 트랙 덧붙임 하나(고객) · 특화 열일곱(블록 sign-off 포함) · 조립 둘", "evaluators(선택 도구 일곱 포함) · policies · multi-test 묶음 · 모델 등급", "시험(해석 36 · 한 바퀴 46 · replay 6) · 평가 · 포장", "설명 그림 다섯"],
        quality: "hard-zero 셋, 리뷰어는 고치지 않는다, 한 task = 한 결과 패키지 = 한 번의 검수" },
      { name: "chain", go: ["sys", "chain"], goal: "아키텍처부터 검증까지 이어지는 긴 일을 link(= task) 사슬로 나누고, 앞 link가 뒤 link의 oracle을 만든다.",
        agent: [], agentNote: "따로 없다. link마다 workflow의 agent를 쓴다.",
        tool: [], toolNote: "따로 없다. 조립 계약(간선 종류 넷)과 controller가 다음 link를 연다.",
        skill: ["link의 workflow skill"],
        doc: ["정본: link 표 · C-model 세 층 · 원칙 다섯 · 사례 · 기본값", "조립 CH-feature"],
        quality: "사람의 결정 넷: 착수 · 아키텍처 선택 · interface freeze · sign-off" },
      { name: "timing-area", go: ["sys", "timing"], goal: "timing · area 일을 사실을 내는 일과 고치는 일로 나누고, 위반은 층부터 가르며, 같은 조건(숨은 축 포함)끼리만 비교한다.",
        agent: [], agentNote: "따로 없다. timing · sub-top fmax · 합성 matrix · 성능 · 면적 리뷰 workflow의 agent를 쓴다.",
        tool: ["합성 · STA evaluator", "선택 도구: constraint 검사 · netlist 등가성 · power 추정(없으면 보지 못한 것)"],
        skill: ["그 workflow들의 skill"],
        doc: ["정본: 일의 종류와 workflow 대응 · 층 가르기 · 억제 기록 운용 · 추세와 milestone · 보지 못한 것 · 사람이 정하는 자리 · Track B · 기본값"],
        quality: "사람: constraint 변경 · 예외 승인 · 구조 변경 · 목표 변경 · ECO · sign-off" },
      { name: "coverage", go: ["sys", "coverage"], goal: "hole을 층부터 가르고, 채운 것과 확인한 것을 구분하며, closure는 AI가 판정 자료를 만들고 사람이 판정한다.",
        agent: [], agentNote: "따로 없다. coverage 보강 · 검증 상태 리뷰 · 블록 sign-off 판정 workflow의 agent를 쓴다.",
        tool: ["coverage 추출 evaluator", "선택 도구: formal 도달성(없으면 보지 못한 것)"],
        skill: ["그 workflow들의 skill"],
        doc: ["정본: 일의 종류와 workflow 대응 · hole 층 · exclusion 운용 · closure와 sign-off · 추세 · mutation 자리(보류) · Track B · 기본값"],
        quality: "사람: exclusion 승인 · covergroup 축소 승인 · closure 판정 · sign-off" },
      { name: "diagnose", go: ["sys", "diagnose"], goal: "원인을 층부터 가르고, 재현 → 가설 → 좁히기 → before/after로 확인한다. 대상을 고치지 않는다.",
        agent: ["조사형 workflow의 worker(가설 생성 · 좁히기)", "고객 트랙의 질문 작성"],
        tool: ["bisect", "seed 변주", "module trace 대조", "자동 multi-test 묶음 실행", "evaluator"],
        skill: ["조사형 특화 workflow skill(WF-regr-diagnose 등)", "원인 phase를 가진 WF-bugfix · WF-timing"],
        doc: ["정본: 층 열 표 · 질문 묶음 · multi-test 묶음 · 실패 종류별 시작점", "작업 모양 AR-diagnose", "특화 초안 WF-regr-diagnose"] },
      { name: "업무 지도", go: ["sys", "workmap"], goal: "일이 어디서 생기고 무엇으로 분류되며 어느 workflow로 가는지 한 장으로 보이고, 시스템 전체의 원칙(기존 자산 이식 먼저 · 두 트랙)을 정한다.",
        agent: [], tool: [], skill: [], allNote: "agent · 도구 · skill은 따로 없다. intake와 workflow의 규칙 · 설정 값으로 들어간다.",
        doc: ["정본: 자산 이식 · 두 트랙 · 분류 축 다섯 · 업무 가족 열둘 · 고객 트랙 · 내부 lifecycle 단계별 상황 표", "migration 0단계의 자산 이식 항목"] },
      { name: "KB", go: ["sys", "kb"], goal: "어떤 제품의 어떤 질문이든 근거(원천 위치와 버전)가 붙은 답을 찾고, 답하지 못한 빈 곳이 채울 일이 된다. 세 성질: 믿을 수 있다 · 살아 있다 · 빈 곳이 보인다.",
        agent: ["Surveyor(원천 조사)", "Harvester(초안 · 갱신)", "Curator(정리 · 검수 보조)", "Librarian(답)", "Release recorder(확정 기록)"],
        tool: ["reference 도구 여덟: lint · 문서 생성 · template · 시험 실행 · 채점 둘 · 사례 검사 · git adapter 자가 시험", "event router"],
        skill: ["골격 여덟: ask · eval · harvest · lint · release-record · review · survey · sync"],
        doc: ["설계 · 셋업", "계약 열둘", "규칙 묶음(문서 종류 서른 · 연결 열여덟 · 출처 우선순위 · 질문 유형 · 사건 표 · checklist · template)", "가상 제품 견본 · 합격 사례", "평가 · 세우기 · 도입", "작업 요청 열둘 · 인터뷰 키트 · 설명 그림"],
        quality: "agent는 MR로 제안하고 사람이 reviewed로 올린다. core와 별도 묶음으로 가져간다." }
    ],
    pending: [
      ["code-review", "workflow 묶음 안에 특화 workflow(RTL review 다섯 · lint)와 조립 RTL review pipeline이 있고 현장 절차와 대조를 마쳤다. 갈래 고유의 문서는 아직 없고, 회사의 review 절차를 겪으며 채운다."],
      ["evolve", "별도 갈래가 아니다. learn 단계와 정기(schedule) 입구, Track B, 정기 정본 회의가 맡는다."]
    ],
    lanes: ["사람", "intake", "workflow", "도구", "KB"],
    flows: [
      { id: "S1", title: "내부: 야간 regression 실패", walks: ["W1", "W2"],
        steps: [
          ["", "adapter가 실패 신호를 봉투로 만든다 → raw-scanner 통과", "", "regression 결과(job id)", ""],
          ["", "dedup-linker가 같은 변경 구간의 실패 서른 개를 묶음 하나로 → work-judge \"일이다\" → categorizer \"기능 불일치\", ask = diagnose", "", "", ""],
          ["owner digest 맨 위에서 묶음을 보고 원인 찾기를 요청한다", "gate 통과 → router가 WF-regr-diagnose로", "", "", ""],
          ["", "", "planner: posture full(원인 보고까지) · allowlist(scratch만)", "", ""],
          ["", "", "worker: 층 판별(TB · C-model 먼저 지운다) → 구간 bisect → module trace 첫 불일치", "bisect · trace 대조 · evaluator", "과거 bug 패턴을 묻는다(Librarian)"],
          ["", "", "before/after 확인 → result writer가 원인 보고", "evaluator 결과 파일", ""],
          ["검수: accept. 수정도 원하면 후속 요청", "", "후속 요청 → WF-bugfix(수정 phase)", "", ""],
          ["", "", "learner: Track B(쓴 workflow · 막힌 곳 · 어느 test가 층을 갈랐나)", "", "bug 문서 초안 MR(Harvester)"]
        ],
        files: "00_intake · 10_triage · 20_gate · 30_plan · STATE(가설 표) · 40_result(원인 보고) · 50_review · 60_learn(Track B)",
        diff: "원인 찾기는 사람이 요청할 때 연다. 원인 보고로 끝나고, 수정은 후속 요청이 연다." },
      { id: "S2", title: "고객: \"특정 입력에서 출력이 깨진다\"", walks: ["W5"],
        steps: [
          ["", "고객 입구 adapter → 출처 = 고객, 보는 사람 = 밖", "", "", ""],
          ["", "categorizer \"기능 불일치\"(업무 가족 채움), 층 미정 → gate: 범위 좁히기 질문 묶음(릴리즈 · 설정 · 입력 · 환경 · 빈도). 받은 자료에 있는 것은 묻지 않고, 멈추는 것은 workflow 필수 입력이 빠졌을 때뿐", "", "", "알려진 bug · errata 대조(Librarian)"],
          ["질문 초안을 승인해 보낸다", "", "", "", ""],
          ["", "답이 오면 다시 읽는다 → 카테고리의 workflow(원인 찾기 phase만)로 보내고, 고객 트랙 덧붙임(고객 경계 · posture 상한 draft · 자동 multi-test · 회신 초안)이 얹힌다", "자동 multi-test 묶음: 고객 릴리즈로 regression · 고객 설정으로 같은 입력 · latency 흉내", "regression · evaluator", ""],
          ["", "", "층 = 진짜 bug → 결과 패키지에 내부 이슈 후속을 제안, 검수자가 고른 것만 내부 이슈로 열려 link(→ 내부 길의 5~8과 같은 길). 고객 레코드에서는 고치지 않는다", "", ""],
          ["회신 초안(원인 · 회피책 · 고쳐질 릴리즈)을 승인해 보낸다", "", "result writer가 회신 초안", "", ""],
          ["고객 확인 → 종료 선언", "", "learner: Track B(어느 질문 · test가 층을 갈랐나)", "", "errata 후보 · FAQ 후보 MR"]
        ],
        files: "고객 이슈의 task 폴더와 내부 이슈의 task 폴더가 따로 남고 서로 link된다",
        diff: "회신은 늘 사람이 승인한다. 응답 시간 · 재질문 · 고객 확인이 지표다. 고객 이슈와 내부 이슈는 합치지 않는다. 고객 이슈에서 파생된 레코드는 고객 별칭을 물려받고, 다른 고객의 자료는 근거 · 초안에 쓰지 않는다." },
      { id: "S3", title: "기능 추가: 사슬", walks: ["W4"],
        steps: [
          ["", "categorizer \"기능 추가\" → 기본값 = 사슬 CH-feature → 첫 link만 연다", "", "", ""],
          ["착수 결정", "", "L1 결정 자료형: 요구 목록 · 비용 근거표", "", "요구 · 계약 문서의 요구 축"],
          ["아키텍처 선택", "결정이 기록되면 다음 link가 발생한다(사슬 link)", "L2 결정 자료형: 대안 비교표", "", ""],
          ["interface freeze", "", "L3 spec ∥ L3m C-model(oracle model · module trace)", "assertion 생성", ""],
          ["검수 둘", "", "L4 RTL ∥ L5 검증(RTL 블라인드)", "lint · sim · coverage", ""],
          ["검수", "두 link가 모두 accept되면 합류 link가 발생한다", "L6 통합 · regression. 실패는 기록만(원인 찾기는 사람이 요청 → 내부 길)", "regression", ""],
          ["sign-off", "", "L7 판정형: 보고서 취합 · 미결 목록 · spec · RTL · C-model 정합성", "", "릴리즈 기록(Release recorder)"]
        ],
        files: "link마다 task 폴더 하나(결과 패키지 하나). 조립 파일이 link 사이의 간선을 기록한다",
        diff: "link 하나 = task 하나 = 결과 패키지 하나. 사람 결정 넷 외에는 검수 accept로 넘어간다. freeze 뒤 spec이 바뀌면 L3 · L3m을 다시 freeze하고 영향받는 L4 · L5만 다시 연다." }
    ],
    stages: [
      ["0 준비", "업무 지도의 기존 자산 이식(checklist · 검증 · 확인 환경 → checkpoint · evaluator), 카테고리 조사, KB 묶음 반입과 회사 Claude 세션의 가설 확인"],
      ["1 shadow", "intake 열 전체(분류 · gate까지), 고객 트랙은 질문 초안까지"],
      ["2 첫 갈래 자율", "workflow 열 + 이식이 끝난 업무 가족 하나(oracle이 강한 것), diagnose(원인 보고까지)"],
      ["3 확장", "chain(사슬), 고객 트랙 회신 초안, KB와의 hook(FAQ · errata · bug 문서)"]
    ],
    gaps: [
      ["core와 KB의 접점(intake의 module 목록 = KB view, workflow의 설계 지식 질문 = kb-ask)이 경계 표 수준이다", "접점 대응표"],
      ["합성 matrix · review ledger와 KB의 연결 필드가 없다", "필드 대응표"],
      ["code-review 갈래의 고유 문서가 없다(특화 workflow와 조립은 있다)", "회사 review 절차를 겪은 뒤"],
      ["test 검증력 측정(mutation)은 보류다(들어오면 붙을 자리는 coverage 갈래에 적어 둠). 블록 sign-off 기준표 · 억제 기록의 기계가 읽는 형식은 회사 checklist와 도구 형식을 본 뒤 정한다", "회사 확인 · 업그레이드 원장"]
    ],
    state: [
      ["g", "정리", "이 지도에는 새 결정이 없다. 칸마다의 정본과 상태는 그 주제 카드에 있다."],
      ["g", "확정 · 실무에서 조정", "core 공통 규약 · intake · workflow 명세(위임 결정 포함) · chain · diagnose 층 열 · 업무 지도(분류 축 · 업무 가족 열둘 · lifecycle 여덟 단계 · 두 트랙) · 겹침 지도 · KB. 확정은 합리적 출발점이고 실무에서 조정한다"],
      ["y", "가정(위임) · 실무에서 조정", "실행 중 위험 고지 · 블록 sign-off의 자리 · 위험 감지가 자라는 법 · 정기 정본 회의 · 모델 등급 · timing-area · coverage 갈래"],
      ["n", "확인 대기", "KB의 고객 표기 해석 · 계약의 상업 조건 · 기존 문서화 AI와의 분담"],
      ["n", "반영 대기", "아래 '이 지도에서 보이는 빈 곳' 넷"]
    ]
  },

  /* ───────────── ② 시스템: 주제마다 같은 틀 ───────────── */
  sys: {
    lead: "core 하나 위에 갈래가 얹히고, 옆에서 KB가 지식의 정본을 맡는다. 주제마다 같은 틀(무엇 · 한 장 · 핵심 규칙 · 사람의 자리 · 품질 기준 · 상태 · 명세 원문)로 본다. 주제 사이의 겹침은 전체 지도에서 본다.",
    order: ["core", "intake", "workflow", "chain", "diagnose", "timing", "coverage", "workmap", "kb"],
    next: [
      ["code-review", "판정형 갈래. 특화 workflow(RTL review 다섯 · lint)와 조립 RTL review pipeline이 있고 현장 절차와 대조를 마쳤다. 갈래 고유의 문서는 회사의 review 절차를 겪은 뒤에 쓴다."],
      ["evolve", "별도 갈래가 아니다. learn 단계와 정기 입구, Track B, 정기 정본 회의가 맡는다."]
    ],
    topics: {
      core: {
        name: "core 공통 규약", role: "core", badge: ["확정", "g"],
        one: "일 하나가 지나가는 아홉 단계와, 단계마다 남는 파일 하나.",
        what: [
          "아홉 단계: intake → triage → gate → plan → execute → result → review → apply → learn. 앞 셋은 intake(입구), 뒤 여섯은 workflow(본체)가 맡는다.",
          "단계마다 work repo의 task 폴더에 파일 하나가 번호 순으로 쌓인다(00_intake · 10_triage · 20_gate · 30_plan · STATE · 40_result · 50_review · 60_learn). 어느 파일 하나만 열어도 지금 어디까지 갔는지 알 수 있다.",
          "issue tracker에는 label 하나와 comment 하나만 남긴다. 살아 움직이는 것은 STATE 하나다."
        ],
        map: "core",
        rules: [
          "gate 다섯 조건은 순서가 고정이다: 위험 → 권한 → 정보 → 불확실 → 작업량. 하나라도 걸리면 그 조건의 hold(stop · record-only · needs-info · discuss)로 멈춘다.",
          "posture 넷(full · draft · prepare · hold)은 근거 셋(실적 · 정보 충분성 · oracle 강도)과 되돌림 축으로 고른다. 숫자 임계값은 없다.",
          "결과 패키지는 검수자가 한 장으로 판정하게 만든다: 다섯 줄 요약 · 근거표(evaluator 확인 · 추적 · 의견) · 산출물 링크 · MR 후보 · 가정 · 미완 · 학습 예고.",
          "학습은 생략할 수 없다. 자동 기록과 검수 판정을 합쳐 제안 표를 만들고, 개인 fork에는 바로, 정본에는 정기 회의로 반영한다.",
          "숫자 기준은 공란이다. 목적과 결정 주체(IT팀 · 시스템 관리자 · 팀 리더)만 적는다."
        ],
        boxes: [
          { id: "risk", title: "위험 감지가 자라는 법", tag: ["가정(위임) · 실무에서 조정", "y"],
            lead: "위험 목록은 엄격하게 하는 쪽과 느슨하게 하는 쪽을 다르게 다룬다. 잘못된 엄격화의 비용은 사람의 몇 분이고, 잘못된 완화의 비용은 회사의 위험이다.",
            rows: [
              ["엄격화", "신호를 더하거나 pattern을 넓히는 변경. 정본 승인자 또는 IT팀(보안) 한 명이 승인하면 즉시 반영하고, 회의에는 사후 보고한다."],
              ["완화", "allowlist를 더하거나 pattern을 좁히는 변경. pattern 시험과 과거 원장 replay를 붙여 정기 회의에서만 정한다."],
              ["오탐의 근거", "사람이 위험 label을 떼며 \"위험이 아니었다\"고 적은 것과 검수 판정뿐이다. 같은 묶음에 놓친 기록이 하나라도 있으면 완화 후보가 아니다."],
              ["놓친 위험", "그 문장을 반드시 걸려야 하는 시험 문장으로 먼저 더하고, 지금 열린 일(intake 중 · 실행 중)을 다시 검사한다. 정본 갱신이 진행 중인 일에 들어가는 유일한 예외다."],
              ["fork", "개인 · 팀 fork는 위험 신호를 더할 수만 있고, 빼거나 allowlist를 넓히지 못한다."]
            ] },
          { id: "meeting", title: "정기 정본 회의", tag: ["가정(위임) · 실무에서 조정", "y"],
            lead: "정본을 바꾸는 통로다. 안건은 파일 하나씩 대기열에 쌓이고, 방향에 따라 세 길로 간다. 승인이 병목이 되지 않게 하면서, 덜 묻는 쪽의 변경만 사람이 모여서 본다.",
            rows: [
              ["안건의 출처 일곱", "fork 변경 · Track B 집계 · 검수 집계 · 위험 목록 · 권한 범위 · 기본값 조정 · 사람의 제안"],
              ["세 길", "엄격화 = 즉시 반영(사후 보고) / 중립 · 저위험 개선 = 이의 기간 동안 이의가 없으면 채택 / 완화 · 확장 · 신설 · 삭제 = 회의 결정. 방향이 애매하면 회의로 간다."],
              ["회의 자료", "agent가 미리 만든다. 검증 자료(dry replay · pattern 시험 · 원장 replay · 등급 비교)가 없는 안건은 올리지 않는다."],
              ["제안자", "자기 안건을 승인하지 않는다."],
              ["강등 두 단계", "후보는 즉시 \"낡음\" 표시, 다음 회의까지 쓰임이나 이의가 없으면 은퇴."],
              ["공란", "주기 · 이의 기간 · 정족수(팀 리더가 정한다)"]
            ] }
        ],
        human: ["반드시: 검수 · 반영", "조건부: gate hold · plan 때의 질문 · 사람 결정 checkpoint · 실행 중 HITL 아홉", "없음: intake · triage · result · learn은 사람 없이 끝난다", "정본을 바꾸는 것: 정기 정본 회의(엄격화는 승인자 한 명으로 즉시)"],
        quality: ["모든 일은 결과 패키지 한 장과 검수 판정 하나로 끝난다", "검수 판정이 곧 학습 재료다(accept · with-fix · reject와 '어디가 문제였나')"],
        state: [["g", "확정", "아홉 단계 · gate 다섯 조건 · posture 넷 · 사람의 자리 둘 · 결과 패키지 · 학습"], ["g", "확정 · 실무에서 조정", "intake · workflow 명세에서 위임으로 정한 결정이 core 설계서에 이식되어 있고, 모두 확정되었다. 확정은 합리적 출발점이라는 뜻이고 실무에서 조정한다"], ["y", "가정(위임) · 실무에서 조정", "위험 감지가 자라는 법 · 정기 정본 회의 · 모델 등급과 세션 분리"]],
        spec: [["intake 명세", "bun", "ia/overview"], ["workflow 명세", "bun", "wa/overview"]]
      },
      intake: {
        name: "intake", role: "core 입구", badge: ["확정 · 실무에서 조정", "g"],
        one: "일의 발생을 받아 \"어디서 왔나 · 일인가 · 무엇을 원하나 · 어떤 종류인가 · 해도 되나 · 어디로 보내나\"를 정한다. 같은 내용이라도 출처가 다르면 끝까지의 과정이 다르다.",
        what: [
          "입구는 ticket만이 아니다: ticket · 고객 · 도구 신호(CI 리뷰 요청 포함) · internal(후속 요청 · 사슬의 다음 link · backlog) · command(사람 수행 포함), 나중에 schedule · 상태 변화 · mail · chat. 출처 넷(고객 · 내부 사람 · 내부 도구 · 다른 일의 뒤)은 입구와 계정으로 규칙이 채운다.",
          "일곱 단계: 0 capture → 1 raw scan → 2 work-or-not → 3 understand → 4 categorize → 5 gate → 6 route. 결과는 task 폴더의 세 파일과 첫 회신 하나다. 원인이 어느 층에 있는가는 intake가 정하지 않고 진단이 정한다.",
          "부품 열하나: 순서와 멈춤은 코드(controller · adapter · raw-scanner · dedup-linker · router), 판단은 규칙 + LLM(work-judge · gate-checker)과 LLM(understander · categorizer · reply-writer). 회사가 값을 채우는 규칙 YAML은 아홉이다(범위 좁히기 질문 묶음 포함)."
        ],
        fig: {
          track: [
            ["고객 입구", "별칭만 · 보는 사람은 늘 밖 · 요청자 = 고객 대응 담당"],
            ["범위 좁히기 질문", "받은 자료에 있는 것은 묻지 않는다. 멈추는 것은 필수 입력이 빠졌을 때뿐"],
            ["진단", "원인 찾기 · 자동 multi-test(workflow 쪽)"],
            ["사람 승인 회신", "회신은 늘 초안, 담당이 승인해 보낸다"],
            ["고객 확인", "끝. 답이 없으면 정한 기간(공란) 뒤 담당이 선언"]
          ],
          bug: "진짜 bug면 결과 패키지에 내부 이슈 후속을 제안하고, 검수자가 고른 것만 내부 이슈로 열린다(합치지 않고 link). 고객 레코드에서는 고치지 않는다.",
          sources: [
            ["고객", "고객 입구(tracker · 지원 mail · portal), 밖의 mail 발신자", "고객 확인으로 끝난다. 회신은 사람이 승인한다"],
            ["내부 사람", "ticket · command(사람 수행 포함) · mail · chat", "결과 패키지 → 검수 · 반영으로 끝난다"],
            ["내부 도구", "도구 신호 · CI 리뷰 요청 · 정기 · 상태 변화", "묶음으로 보이고, 원인 찾기는 사람이 요청할 때 열린다"],
            ["다른 일의 뒤", "후속 요청 · 사슬 link · 학습 backlog · 파급 child", "부모의 계약(조립 간선)이 정한 workflow로 열린다"]
          ],
          same: "같은 \"출력이 깨진다\"도 고객이 보내면 질문 → 진단 → 승인 회신 → 고객 확인으로, 야간 regression이 내면 묶음 → 요청 → 원인 보고 → 검수로, 사람이 ticket으로 쓰면 원인 찾기와 수정 → 검수 · 반영으로 끝난다."
        },
        map: "intake", more: "intake",
        rules: [
          "raw scan은 LLM 앞의 코드다. 위험 문장이면 그 자리에서 멈춘다.",
          "기존 일에 붙이는 것은 값이 같을 때만(같은 branch · 같은 오류 문장, 같은 변경 구간). 한 원인의 신호 여럿은 하나로 묶는다. 고객 이슈는 같은 실패를 가리켜도 합치지 않고 잇기만 한다.",
          "원인 찾기의 행선지: 덮는 workflow가 있으면 그것, 없고 원인 찾기뿐이면 조사형 one-off, 도구 신호의 실패는 사람이 요청할 때, 고객 이슈는 고객 트랙.",
          "LLM이 채운 칸에는 근거 한 줄과 근거 등급(explicit · similar-case · inferred)이 붙는다. inferred로는 '명확'을 내리지 않는다.",
          "틀릴 때의 방향: 애매하면 일로 본다, 행동이 실패하면 아무것도 하지 않는다, 보는 사람이 밖이면 쓰지 않는다(고객이 보는 자리에는 label도 쓰지 않는다).",
          "고객 ticket이 위험으로 멈추면 고객이 보지 않는 내부 project에 손잡이 ticket을 만들어 위험 label과 멈춘 이유를 둔다. 해제는 사람이 손잡이의 label을 떼는 것이다.",
          "workflow가 보내는 사건 셋을 받는다: 학습 완료(원장에 Track B 줄을 덧붙임) · route 거부(지금의 정본으로 분류 → route를 한 번 다시 계산, 경로가 같으면 논의) · 실행 중 위험 고지(손잡이 없는 고객 레코드면 손잡이를 확보).",
          "블록 sign-off 판정 카테고리는 사람이 부를 때만 연다(도구 신호로는 열지 않는다). 합성 칸이 met → 미달로 바뀌면 일이 되고, coverage 감소 지적은 열려 있는 수치 feed 일에 붙는다."
        ],
        human: ["정보 부족이면 질문에 답한다(범위 좁히기 질문은 진행과 함께 간다)", "고객 대응 담당: 질문 · 회신 초안을 승인해 보내고, 고객 확인 또는 무응답 뒤 종료를 선언한다", "도구 신호 실패의 원인 찾기를 요청한다(feed마다 바로 열기로 팀 리더가 바꿀 수 있다)", "검수자: 고객 이슈의 진짜 bug를 내부 이슈로 열지 고른다", "\"나눌까요\"에 답하고, 위험 hit를 해제한다(고객 이슈는 손잡이 ticket의 label을 뗀다). 배정은 하지 않는다: owner에게 알림만"],
        quality: ["hard-zero 셋: 위험 놓침 0 · 잘못 붙이기 0 · 밖으로 새기 0(다른 고객의 자료가 초안 · 근거에 들어가는 것도 센다)", "시험 사례 119건(고객 7 포함)", "분류의 Track B: 레코드가 끝날 때 원장에 한 줄. 없으면 \"Track B 빠짐\"으로 센다"],
        state: [["g", "확정 · 실무에서 조정", "입구 일반화 · 일곱 단계 · 범위 기본값 · 고객 트랙 · 명세의 위임 결정(첫 판 · 동기화 · workflow 반영 · 손잡이 ticket: 위험으로 멈출 때만 만들고, 손잡이 project의 내부 사람이면 해제)"], ["y", "가정(위임) · 실무에서 조정", "실행 중 위험 고지 사건 · 사람 계기만 여는 블록 sign-off 카테고리 · met → 미달 전이 feed · coverage 감소 지적 붙이기"]],
        spec: [["intake agent 명세 (탐색기)", "bun", "ia/overview"], ["시험 사례 119", "bun", "ia/golden"], ["범위 좁히기 질문 묶음", "bun", "ia/rules/narrowing_questions"]]
      },
      workflow: {
        name: "workflow", role: "core 본체", badge: ["확정 · 실무에서 조정", "g"],
        one: "착수된 일을 결과 패키지까지 자율로 끌고 간다. 모든 workflow는 같은 골격을 물려받고, 일의 출처가 고객이면 고객 트랙이 그 위에 덧붙는다.",
        what: [
          "세 층 표준화: 공통 골격(자리 여덟 · 공통 checkpoint 넷) → 작업 모양 일곱(수정 · 탐색 · 판정 · 조사 · 작성 · 결정 자료 · 실험) → 업무별 특화 열일곱(블록 sign-off 판정 포함). 특화는 채우고 좁히기만 한다. 상속 층과 따로, 출처가 고객이면 트랙 덧붙임(고객 트랙)이 얹힌다.",
          "여러 workflow는 조립한다: 한 task 안에서 auto로 잇는 pipeline(RTL review A~E, preset 여섯 · milestone 포함), 사람의 결정 · 검수를 사이에 두고 task를 잇는 chain. 사슬은 진입 link를 연 레코드가 직접 돌고, L3 → L4 간선이 대상 block 범위를 나른다.",
          "부품 열하나: 코드 여섯(controller · resolver · policy · evaluator adapter · record writer · dry replay)과 LLM 다섯(planner · worker · hitl manager · result writer · learner). 회사가 값을 채우는 설정은 evaluators(선택 도구 일곱 포함) · policies · multi-test 묶음 · 모델 등급 넷이다."
        ],
        fig: {
          diag: [
            ["층 판별", "문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과 가운데 어디인가. 내부는 재현 조건 대조, 고객은 질문의 답 + 자동 multi-test"],
            ["재현", "같은 입력 · 같은 revision · 같은 seed. 질문형이면 건너뛴다"],
            ["가설", "가설 표: 후보마다 근거와 가를 test"],
            ["좁히기", "싼 것부터(비용 사다리): bisect · seed 변주 · module trace 첫 불일치"],
            ["before/after", "원인마다 따로. 고치기 전과 후를 scratch에서 확인"],
            ["층마다 다른 끝", "RTL이면 수정 방향, 고객 환경 · 문서면 out-of-scope 또는 회신, 지식이면 학습 backlog"],
            ["Track B", "정한 층과 층을 가른 질문 · test를 기록하고 intake 원장으로 돌려준다"]
          ],
          tracks: [
            ["Track A · 일 자체", "결과 패키지 하나 → 검수 → 반영"],
            ["Track B · workflow의 기록", "쓴 workflow · 막힌 곳과 메운 사람 · 평가 · 개선 · 결과. 원인 찾기를 했으면 층 · 질문 결과 · test · 분류 교정. 결과 패키지에는 미리보기, 학습 기록에는 확정본"]
          ],
          back: "Track B가 비면 결과 칸(CR)과 학습 칸(CL)이 통과하지 않는다. 분류 쪽으로 돌려줄 것(층 · 질문 결과 · test · 분류 교정)은 학습 완료 사건으로 intake에 가고, intake가 원장의 그 레코드에 Track B 줄을 덧붙인다(레코드가 닫힌 뒤에도).",
          cust: [
            ["고객 경계 (CT1)", "고객 별칭만, 다른 고객의 자료를 읽거나 근거 · 초안에 쓰지 않음, 고객이 보는 자리에 쓰지 않음. 받은 자료와 질문의 답을 입력 표로"],
            ["자동 multi-test (CT2)", "증상별 묶음을 한 번에: 고객 릴리즈로 우리 regression · 고객 설정으로 같은 입력 · 알려진 bug 대조 …"],
            ["회신 초안", "결과 패키지의 한 절(원인 · 회피책 · 수정 일정은 내부에서 확인 중). 보내는 것은 고객 대응 담당"],
            ["트랙 후속 둘", "진짜 bug → 내부 이슈, 기능 요청 → 내부 레코드가 사슬. 둘 다 검수 뒤에, 검수자가 고를 때만(기본은 고르지 않음)"]
          ],
          custBase: "아래층 = 카테고리의 workflow(예: 기능 불일치면 버그 수정 workflow의 원인 phase만)",
          custNo: "고객 레코드에서는 고치는 phase를 고를 수 없다(resolver가 막는다). posture 상한은 draft다. 상태 label은 고객이 볼 수 있는 ticket에 붙이지 않는다.",
          tools: [["RDC", "code-review"], ["X-propagation", "code-review"], ["DFT rule", "code-review"], ["formal 도달성", "code-review · coverage"], ["constraint 검사", "timing-area"], ["netlist 등가성", "timing-area"], ["power 추정", "timing-area"]],
          toolsNote: "회사에 있으면 쓰고, 없으면 그 확인은 '보지 못한 것'으로 남는다(통과로 세지 않는다). GATE 줄에 '보지 못한 확인 n건'이 붙는다. 소관이 회사마다 다른 넷(RDC sign-off · DFT 경계 · SDC 소유 · netlist 등가성)은 회사가 정하기 전까지 지적과 알림만 하고 'clean'을 선언하지 않는다."
        },
        map: "workflow", more: "workflow",
        rules: [
          "workflow는 step 목록이 아니라 checkpoint(무엇이 참이어야 하나 + 어떻게 확인하나)의 목록이고, 시작점(BL)을 먼저 기록한다.",
          "자율 선언(하겠다 · 묻겠다 · 하지 않겠다)이 실행 중 allowlist가 된다. guard가 선언 밖 행동을 막고, 끝에서 경계 확인이 고정 항목(port · parameter)까지 센다.",
          "근거는 기록되는 실행에서만 나온다. 판정 · 등급 · 유도값은 script가 계산하고, 보지 못한 것(판정 불가 · 선택 도구 없음 포함)은 통과가 아니다.",
          "원인 찾기는 층 판별부터 한다(조사형의 의무). 원인이 RTL 밖에 있을 수 있다.",
          "한 task = 한 결과 패키지 = 한 번의 검수. 리뷰어는 고치지 않는다. 자동 수정은 지적마다 한 번이다.",
          "waiver · coverage exclusion · 합성 예외(억제 기록)는 승인 때의 구문에 묶인다. 구문이 바뀌면 재확인이 필요하고 그동안 효과를 잃는다.",
          "workflow는 ticket을 만들지 않는다. 상태 label은 레코드가 정한 ticket 하나(고객 ticket이면 손잡이 ticket)에만 붙는다.",
          "intake와 주고받는 사건은 셋이다: 학습 완료(Track B 줄을 원장에) · route 거부(intake가 한 번 다시 계산) · 실행 중 위험 고지(손잡이 없는 고객 레코드면 intake가 손잡이를 만듦, 켜는 표지는 기본 꺼짐)."
        ],
        boxes: [
          { id: "tiers", title: "모델 등급과 세션", tag: ["가정(위임) · 실무에서 조정", "y"],
            lead: "강한 모델이 필요 없는 곳에 쓰지 않고, 필요한 곳에서 아끼지 않는다. 모델 이름은 공란이고 등급만 정한다.",
            rows: [
              ["가벼운", "분류 · 추출 · 결과 해석"],
              ["표준", "계약이 분명한 수정 · 작성 · 후보 생성"],
              ["강한", "계획 · 원인 판정 · 지적 · 결과 서술 · 사람에게 가는 글"],
              ["내리지 않는 자리", "위험의 두 번째 검사 · planner · reviewer · result writer · 사람에게 가는 질문"],
              ["올리기 · 내리기", "판정이 갈리거나 진전이 없으면 한 등급 올려 한 번 더(시도 수에 셈). 기본 등급 올리기는 즉시, 내리기는 그림자 실행 비교 기록을 붙여 정본 회의에서. 비용 때문에 몰래 내리지 않고 사람에게 묻는다"],
              ["세션", "산출물 하나 = 세션 하나. 품질 저하 신호(context 사용량 · 시도 수 · guard 차단 연속 · 결정과 어긋난 행동)가 보이면 새 세션을 열고, STATE와 버린 시도의 한 줄 요약만 넘긴다"]
            ] }
        ],
        human: ["검수 · 반영", "필수 mode 선택(예: 성능 · 면적 리뷰의 모드)", "실행 중 질문에 답(답이 없으면 보수적 기본값)", "억제 기록(waiver · exclusion · 합성 예외)의 승인과 재확인", "블록 sign-off: 판정은 시스템이 모으고, sign-off는 기준표의 책임자가 한다", "고객 일: 회신은 고객 대응 담당이 보내고, 진짜 bug의 내부 이슈는 검수자가 고른다"],
        quality: ["hard-zero 셋: 경계 넘기 0(밖 레코드의 공개 자리 쓰기 · 다른 고객 자료 · 고객 레코드에서 대상 수정 포함) · 근거 없는 판정 0 · 사람 기록 훼손 0", "시험 사례: 해석 36 · 한 바퀴 46 · replay 6", "Track B 빠짐 0", "현장 절차 대조(덮음 / 일부 / 빠짐): code-review 23 / 0 / 0 · timing-area 19 / 0 / 0 · coverage 13 / 1 / 0(남은 일부 = mutation, 보류)"],
        state: [["g", "확정 · 실무에서 조정", "자율의 세 층 · checkpoint · posture · 두 트랙 · agent 명세의 결정(첫 판과 후속 · 현장 절차 · 손잡이 ticket) · 고객 트랙 = 트랙 덧붙임 · 고객 일의 posture 상한 draft · regression 원인 찾기는 실적이 생길 때까지 draft · 블록 sign-off 별도 판정 · 억제 기록 효과 정지 기본"], ["y", "가정(위임) · 실무에서 조정", "실행 중 위험 고지 사건 · 블록 sign-off의 자리(사람 계기 카테고리) · 모델 등급 · timing-area와 coverage 갈래의 이식(QoR 추세 · covergroup 수정 판정 · 돌지 않은 test)"], ["n", "회사에서 확인", "선택 도구의 유무와 소관 · 블록 sign-off 기준표 · 억제 기록의 기계가 읽는 형식"], ["n", "보류", "test 검증력 측정(mutation)"]],
        spec: [["workflow agent 명세 (탐색기)", "bun", "wa/overview"], ["workflow 라이브러리", "bun", "wa/library/wf_readme"], ["고객 트랙 (TR-customer)", "bun", "wa/library/TR-customer"], ["블록 sign-off 판정", "bun", "wa/library/WF-block-signoff"], ["multi-test 묶음", "bun", "wa/rules/multi_test_bundles"], ["모델 등급", "bun", "wa/rules/model_tiers"]]
      },
      chain: {
        name: "chain", role: "갈래 · 아키텍처부터 검증까지", badge: ["정본 · 일부 가정", "y"],
        one: "새 엔진이 아니라 core 위의 갈래다. link 하나 = task 하나 = workflow 하나, 사슬은 조립의 한 모양.",
        what: [
          "link: L1 요구 · feasibility → L2 아키텍처 → L3 spec ∥ L3m C-model → L4 RTL ∥ L5 검증(RTL 블라인드) → L6 통합 · regression → L7 sign-off 준비.",
          "C-model 세 층: 상위 model(encoder algorithm / decoder golden) · exactness oracle model · module function-level trace model(bit-to-bit). 앞 link가 뒤 link의 oracle을 만든다.",
          "한 번에 다 열지 않는다. 첫 link만 열고, 다음 link는 사람의 결정이나 검수 accept로 열린다."
        ],
        map: "chain", more: "chain",
        rules: [
          "spec-derived oracle: 뒤 link는 앞 link가 만든 spec assertion · oracle model · module trace로 판정한다.",
          "검증 독립성: L4와 L5는 다른 세션이고, L5는 RTL을 읽지 않는다(coverage hole 분석만 예외). 공유 입력은 spec과 C-model뿐이다.",
          "사슬은 의존 그래프다. L6은 L4 · L5가 모두 검수를 지나야 한 번 열린다.",
          "freeze 뒤 spec 변경 = L3 · L3m 재freeze, 영향받는 L4 · L5만 다시.",
          "L6의 실패 원인 찾기는 사람이 요청해 diagnose 갈래로 간다."
        ],
        human: ["결정 넷: 착수 · 아키텍처 선택 · interface freeze · sign-off", "그 밖의 link 사이는 검수 accept"],
        quality: ["oracle은 앞에서 만든다: spec assertion · bit-exact 기준 · module trace", "사슬 요약 = 결정 기록 넷 + link별 근거표"],
        state: [["g", "확정", "link 표 · 검증 독립성 · spec 변경 규칙"], ["y", "가정 · 교정 대기", "encoder/decoder의 oracle 구분"], ["g", "반영됨", "workflow 묶음: 진입 link 둘 이상 허용 · L3 → L4 간선이 block 범위를 나름 · 구현 link의 module trace 대조 · sign-off link는 블록 sign-off 판정을 읽기만"], ["n", "검증 예정", "link 이름 · 개수(과거 일감으로)"]],
        spec: [["조립 CH-feature", "bun", "wa/library/CH-feature"]]
      },
      diagnose: {
        name: "diagnose", role: "갈래 · 원인 찾기", badge: ["정본 · 일부 가정", "y"],
        one: "intake는 \"원인을 찾아 달라\"로 분류만 한다. 그 뒤 보낼 곳이 비어 있던 자리를 채운 갈래다. 층부터 가르고, 고치지 않으며, 확인하지 못한 것은 그렇다고 쓴다.",
        what: [
          "흐름: 층 판별 → 재현 → 가설 표 → 좁히기(싼 것부터) → 확인(before/after) → 끝(층마다 다름) → Track B(어느 질문 · test가 층을 갈랐나).",
          "층 열: 문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 층마다 재현 수단 · oracle · 좁히는 도구 · 끝이 다르다. 불안정(같은 입력에서 결과가 갈림)은 층이 아니라 상태다.",
          "좁히기 순서: 변경 구간 bisect → seed · 설정 변주 → module trace 첫 불일치 → 경계 안 신호의 텍스트 trace. waveform은 사람이 볼 때만."
        ],
        map: "diagnose", more: "diagnose",
        rules: [
          "층부터 가른다. 원인이 RTL 밖(문서 · 이해 · 환경 · TB · C-model · spec · 도구)에 있는 경우가 많다. 층을 모른 채 RTL을 파고들지 않는다.",
          "고치지 않는다. 계측은 scratch 사본 안에서만 넣고 지운다. 수정은 요청이 있을 때 다음 phase나 후속 요청으로 간다.",
          "내부 이슈는 재현 조건 대조로 층을 가른다. oracle 쪽(TB · C-model)이 틀렸을 가능성을 먼저 지운다.",
          "고객 이슈는 범위 좁히기 질문(후보를 가르는 것만, 한 번에, 왜 묻는지 한 줄)과 자동 multi-test를 함께 돌린다.",
          "끝이 층마다 다르다: 문서 보강 · 결정 뒤 수정 · FAQ 축적 · 환경 안내 · errata · 내부 수정 이슈. 원인마다 따로 보고하고, 어느 질문 · test가 층을 갈랐는지 Track B로 남긴다."
        ],
        human: ["원인 찾기를 연다: 도구 신호의 실패는 사람이 요청할 때, 사람의 요청과 고객 이슈는 바로", "원인 보고를 검수하고 수정 여부를 정한다"],
        quality: ["확인 = 되돌린 scratch에서 증상이 사라지고 원래에서 다시 나타남(또는 최소 재현)", "질문 묶음 · multi-test 묶음은 가족 · 층별 정본 자산이고 Track B로 고쳐진다"],
        state: [["g", "확정", "층 판별 먼저"], ["g", "확정 · 실무에서 조정", "층 열 표 · 질문 묶음 · multi-test 묶음 · 실패 종류별 시작점"], ["g", "반영됨", "workflow 묶음: 조사형 모양의 층 판별 의무 · regression 원인 찾기 채움(draft 유지) · 고객 트랙의 자동 multi-test"]],
        spec: [["조사형 모양 (AR-diagnose)", "bun", "wa/library/AR-diagnose"], ["regression 원인 찾기 (초안)", "bun", "wa/library/WF-regr-diagnose"]]
      },
      workmap: {
        name: "업무 지도", role: "분류 · diagnose의 바탕", badge: ["정본 · 일부 가정", "y"],
        one: "어떤 일이 어디서 생기고, 무엇으로 분류되며, 원인을 어떻게 좁히고, 어느 workflow로 일하는가.",
        what: [
          "기존 자산을 먼저 옮긴다. 팀이 이미 쓰는 checklist · 검증 환경 · 확인 환경 · 절차서 · 판정 기준을 workflow의 checkpoint와 evaluator로 옮긴다. 기존 확인은 바닥이고, AI용 조건은 그 위에 더할 뿐이다.",
          "모든 일에는 두 트랙이 붙는다. Track A는 일 자체, Track B는 그 일이 쓴 workflow의 기록(사용 · 평가 · 개선 · revision · 신설). Track B 기록이 없으면 완료가 아니다.",
          "분류 축 다섯: 출처(고객 · 내부) · 요청 종류 · 업무 가족(열둘) · lifecycle 단계 · 층. 같은 증상이라도 출처가 다르면 끝까지의 과정이 다르다."
        ],
        map: "workmap", more: "workmap",
        rules: [
          "옮긴 checkpoint는 workflow가 상속하는 잠금 항목이다. 자산이 없는 자리는 '기존 확인 없음'으로 표시한다.",
          "이식이 끝난 업무 가족부터 shadow를 시작한다. 끝나지 않은 가족은 AI가 초안까지만 한다.",
          "고객 트랙: 접수 → 범위 좁히기 질문 → 재현 · 자동 multi-test → 답 초안 → 사람 승인 → 회신 → 고객 확인. 진짜 bug면 내부 이슈를 따로 열어 link한다.",
          "고객 이슈와 내부 이슈는 합치지 않고 link한다. 고객 표기는 별칭만 쓴다.",
          "같은 일이 정해진 횟수 넘게 'workflow 없음'으로 끝나면 신설이 의무가 된다."
        ],
        human: ["고객 회신은 늘 사람이 승인한다", "자산 목록의 완결 · 옮긴 checkpoint의 승인(팀 리더 · 정본 승인자)"],
        quality: ["고객 응답 지표: 첫 회신 · 최종 회신 시간, 재질문, 고객 확인 비율(목표 공란)", "Track B 기록이 모든 일의 완료 조건"],
        state: [["g", "확정", "기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개"], ["g", "확정 · 실무에서 조정", "분류 축 다섯 · 업무 가족 열둘 · lifecycle 여덟 단계"], ["n", "회사에서 확인", "고객 이슈가 들어오는 경로 · 기존 자산의 위치와 담당"], ["g", "반영됨", "workflow 묶음의 Track B 칸 · 고객 트랙 덧붙임"]],
        spec: []
      },
      timing: {
        name: "timing-area", role: "갈래", map: "timing", badge: ["정본 · 가정(위임, 실무에서 조정)", "y"],
        one: "합성 결과의 timing과 area를 다루는 일. 사실을 내는 일과 고치는 일을 나누고, 위반은 층부터 가르며, 같은 조건끼리만 비교한다.",
        what: [
          "사실을 내는 일(sub-top 합성 · fmax · 고객 레포트용 matrix)은 사실과 지적만 낸다. RTL을 고치는 것은 timing 개선 workflow뿐이고, 고칠지는 사람이 정한다(직접 요청, 또는 판단과 plan의 결정 뒤).",
          "timing 위반의 상당수는 RTL 밖에 원인이 있다. 하위 층 다섯을 싼 것부터 가른다: 측정 → constraint → 합성 설정 → library · corner · 도구 → RTL 구조. 앞의 넷이 지워진 path만 RTL 후보가 된다.",
          "새 엔진이 아니다. timing · sub-top fmax · 합성 matrix · 성능 · 면적 리뷰의 특화 workflow 넷과 합성 · STA evaluator를 쓰고, 이 갈래 문서는 그 사이(일의 종류 · 층 · 예외 운용 · 추세 · 사람의 자리)를 잇는다."
        ],
        fig: {
          layers: [
            ["측정", "두 run의 recipe · corner · 숨은 축이 다르면 같은 조건으로 다시 비교. 차이가 사라지면 일 아님"],
            ["constraint", "clock 정의 · unconstrained endpoint · 근거 없는 예외 · IO delay. 후보를 만들지 않고 constraint 담당에게 알림"],
            ["합성 설정", "recipe · 합성 mode · floorplan · clock 가정의 변경. 합성 담당에게 알림, 의도된 변경이면 기준선을 새로"],
            ["library · corner · 도구", "같은 RTL을 두 버전으로. 담당에게 넘기고 회피책 기록"],
            ["RTL 구조", "변경 구간 좁히기, 논리 깊이 · fanout. 요청이 있을 때만 timing 개선 workflow의 수정 phase"]
          ],
          note: "불안정(같은 조건에서 결과가 흔들림)은 층이 아니라 상태다. area도 같은 순서로 본다(clock이 빡빡해지면 합성이 cell을 키운다)."
        },
        rules: [
          "합성 · fmax · matrix는 사실과 지적만 낸다. RTL을 고치는 것은 timing 개선 workflow뿐이다.",
          "층부터 가른다. 층을 모른 채 RTL 후보를 만들지 않는다.",
          "숨은 축(합성 mode · floorplan · clock 가정)이나 recipe · library · corner · constraint가 다른 run끼리는 비교하지 않는다. 추세도 그 자리에서 \"조건 바뀜\"으로 끊는다.",
          "constraint · netlist · library는 남의 것이다. 고치지 않고 지적과 알림을 낸다. false path · multicycle 예외는 사람만 MR로 쓰고, RTL이 바뀌면 효과가 멈춘다(그 path의 met은 조건부). 예외를 더하자는 제안은 AI가 하지 않는다.",
          "추세의 원천은 정기 sub-top 합성이다. met → 미달로 바뀐 칸은 변화 폭과 무관하게 일이 된다(원인 찾기는 사람이 요청할 때). WNS · TNS · area 변화는 기준(공란)을 넘을 때만 일이다.",
          "회사에 없는 선택 도구(constraint 검사 · netlist 등가성 · power 추정)의 확인은 통과가 아니다. constraint 검사가 없으면 블록 sign-off의 timing 재료는 판정 불가다."
        ],
        human: ["constraint 변경(clock 정의 · uncertainty · IO delay · 예외): constraint 담당(소유는 회사에서 정함)", "예외 승인 · 재확인 · 철회: 동료 또는 설계 리더", "latency · interface를 바꾸는 후보, 구조 변경: 설계 리더 · 아키텍트", "목표 주파수 · area budget 변경: 제품 · 설계 리더", "netlist ECO: 구현 담당(지금은 범위 밖)", "고객에게 낼 QoR 값: 제품 · 영업 리더", "블록 sign-off: 기준표의 책임자"],
        quality: ["같은 조건끼리만 비교(거짓 악화 · 거짓 개선 0)", "효과를 잃은 예외 · 기록 없는 예외는 milestone 리뷰와 블록 sign-off에서 0", "Track B: 층 판별 결과의 분포 · path 계열별 잘 된 방법 · 비교 실수 · 억제 기록의 부담"],
        state: [["g", "정본", "갈래 문서(일의 종류와 workflow 대응 · 층 가르기 · 억제 기록 운용 · 추세와 milestone · 보지 못한 것 · 사람이 정하는 자리 · Track B · 기본값)와 workflow 묶음 이식"], ["y", "가정(위임) · 실무에서 조정", "층 판별 순서 · met → 미달 전이 · 숨은 축 규칙 · 예외의 RTL 변경 시 동작 · constraint 변경 리뷰 = 판정형 one-off"], ["n", "회사에서 정할 것", "변화 기준 · 정기 합성의 주기와 branch · 예외 tier2 범위 · constraint 소유 · hold와 ECO의 소관"]],
        spec: [["갈래 정본 (탐색기)", "bun", "wa/design/timing_area"], ["WF-timing", "bun", "wa/library/WF-timing"], ["WF-syn-subtop-fmax", "bun", "wa/library/WF-syn-subtop-fmax"], ["WF-syn-matrix", "bun", "wa/library/WF-syn-matrix"]],
        more: "timing"
      },
      coverage: {
        name: "coverage", role: "갈래", map: "coverage", badge: ["정본 · 가정(위임, 실무에서 조정)", "y"],
        one: "hole에서 closure까지. hole은 층부터 가르고, 채운 것과 확인한 것을 구분하며, closure는 AI가 판정 자료를 만들고 사람이 판정한다.",
        what: [
          "건드린 것과 확인한 것은 다르다. test가 hole의 논리를 실행했어도 그 동작이 틀렸을 때 실패하지 않으면 채운 것이 아니다. coverage 숫자(도구 사실)와 관측 수단(checker · assertion · reference 비교)을 따로 센다.",
          "모든 hole이 test 부족은 아니다. 층 여섯을 가른다: 측정 환경 · spec 변경 · covergroup 정의 오류 · 도달 불가 · test 부족 · RTL 결함 의심.",
          "새 엔진이 아니다. coverage 보강 · 검증 상태 리뷰 · 블록 sign-off 판정의 특화 workflow와 coverage 추출 · formal 도달성 evaluator를 쓰고, 이 갈래 문서는 그 사이를 채운다."
        ],
        fig: {
          layers: [
            ["측정 환경", "DB revision · merge 정의 · 실패 test가 merge됨 · 돌지 않은 test · 도구 변경. coverage 일이 아니다: 측정을 바로잡거나 다시 merge해 재판정"],
            ["spec 변경", "bin이 가리키는 동작이 spec에서 빠졌거나 바뀜. covergroup 정리 또는 만료 조건이 붙은 exclusion 후보"],
            ["covergroup 정의 오류", "bin · cross가 spec의 값 범위 · 조합과 안 맞음. 수정 제안(분모가 바뀌므로 spec 근거 대조로 판정)"],
            ["도달 불가", "parameter로 꺼진 기능 · 방어용 branch. 근거 등급이 붙은 exclusion 후보"],
            ["test 부족", "도달 가능한데 지금 test가 조건을 만들지 않음. test 후보(채움과 확인을 따로 판정)"],
            ["RTL 결함 의심", "spec은 도달 가능하다는데 formal이 도달 불가를 증명. exclusion이 아니라 원인 찾기로"]
          ],
          note: "근거 등급: formal 증명 > spec 절 · 설계 조건 > 추론. formal의 \"결론 없음\"은 근거가 아니다. formal 증명은 그 run의 constraint 아래의 사실이므로 constraint 버전을 함께 적는다."
        },
        rules: [
          "hole은 측정 환경부터 지운다. 그다음 spec · covergroup 대조, 도달 가능성, test 부족 순이다.",
          "도달 가능한데 채워지지 않는 hole은 formal(있으면)로 다시 본다. 도달 불가가 증명되면 RTL 결함 의심으로 원인 찾기에 보내고, exclusion으로 덮지 않는다.",
          "covergroup 수정은 분모를 바꾼다. 판정은 coverage 증가가 아니라 spec 근거 대조와 분모 바뀜 표시로 하고, bin을 지우거나 줄이는 수정은 exclusion과 같은 승인 등급을 받는다.",
          "exclusion은 억제 기록이다. 사람만 승인하고, RTL이 바뀌면 효과가 멈추며(분모에서 빼지 않음), spec 변경 · 기능 비활성으로 낸 것에는 만료 조건을 붙인다.",
          "closure는 보수적으로 센다: 목표 없는 종류는 충족이 아니고, 실패 test가 merge되었으면 판정 불가, 돌지 않은 test가 덮을 bin이 남은 종류도 판정 불가다. closure 충족은 동작이 확인되었다는 뜻이 아니다.",
          "같은 변화가 두 길(정기 리뷰의 감소 지적 · intake의 수치 feed)로 오면 하나로 붙고, feed 레코드가 주인이다."
        ],
        human: ["exclusion 승인(동료 또는 검증 리더) · 재확인 · 철회", "covergroup 축소 승인", "closure 판정의 수용, closure를 켜는 milestone", "종류별 목표 표(공란)", "블록 sign-off: 기준표의 책임자", "mutation 도입 여부와 시점(지금은 보류)"],
        quality: ["채움과 확인을 따로 센다(관측 수단이 없는 동작은 closure와 별개로 지적)", "보지 못한 것(없는 도구 · 돌지 않은 test · 다른 revision의 DB · 실패 test가 섞인 merge)은 충족으로 세지 않는다", "Track B: 어느 test가 어느 hole을 닫았나 · hole의 층 · 되돌려진 exclusion · 관측 수단이 없는 module"],
        state: [["g", "정본", "갈래 문서(일의 종류와 workflow 대응 · hole 층 · exclusion 운용 · closure와 sign-off · 추세 · mutation 자리 · Track B · 기본값)와 workflow 묶음 이식"], ["y", "가정(위임) · 실무에서 조정", "hole 층 판별 순서 · 도달 불가 근거 등급 · covergroup 축소 승인 · 돌지 않은 test = 판정 불가 · 두 길을 하나로"], ["n", "회사에서 정할 것", "종류별 목표 · closure를 켜는 milestone · 감소 지적 기준 · exclusion tier2 범위"], ["n", "보류", "test 검증력 측정(mutation): 들어오면 붙을 자리 셋만 적어 둠"]],
        spec: [["갈래 정본 (탐색기)", "bun", "wa/design/coverage"], ["WF-coverage", "bun", "wa/library/WF-coverage"], ["WF-rtl-verif-review", "bun", "wa/library/WF-rtl-verif-review"], ["WF-block-signoff", "bun", "wa/library/WF-block-signoff"]],
        more: "coverage"
      },
      kb: {
        name: "KB", role: "지식의 정본 · 별도 묶음", badge: ["확정 · 확인 대기 셋", "g"],
        one: "어떤 제품의 어떤 질문이든 근거(원천 위치와 버전)가 붙은 답을 찾고, 답하지 못한 빈 곳은 채울 일감이 된다. intake · workflow · diagnose · 고객 트랙이 모두 묻는 자리다.",
        what: [
          "세 성질: 믿을 수 있다(모든 사실이 원천 위치와 revision을 가리킨다) · 살아 있다(원천이 바뀌면 stale 표시와 갱신 제안이 나온다) · 빈 곳이 보인다(답하지 못한 질문과 없는 자료가 일감 목록이 된다).",
          "전용 agent system이 짓는다. agent 다섯(Surveyor 원천 조사 · Harvester 초안과 갱신 · Curator 정리와 검수 보조 · Librarian 답 · Release recorder 확정 기록)과 결정론 script(lint · event router · 생성)다. agent는 MR로 제안하고, 사람이 받아들여야 reviewed가 된다.",
          "core와 별도 묶음(zip)으로 가져간다. 회사의 Claude 세션이 먼저 원천을 읽고, 파일럿 · 순서 · 숫자 · 기존 template과의 정본 관계를 가설 확인 시트로 도입 리더 · 담당과 정한다."
        ],
        map: "kb", more: "kb",
        rules: [
          "근거: KB의 모든 사실은 원천 위치와 revision을 가리킨다. 가리키고 복사하지 않는다. 추론은 근거와 함께 (추정), 계산은 (계산), 모르면 모른다고 쓴다.",
          "사람이 판정한다: agent는 초안과 갱신을 MR로 제안하고, 사람이 받아들여야 reviewed가 된다. 확정된 릴리즈 · 납품 기록은 바뀌지 않는다(사후 정정은 덧붙이기만).",
          "계산은 script: 신선도 · 연결 · 누출 · 릴리즈 포함 여부는 결정론 script가 판정한다. script는 LLM을 부르지 않고 문서를 고치지 않는다.",
          "고객 정보는 섞지 않는다: 고객 정보는 따로 두고, 본 KB에는 고객 별칭만 쓰며, 한 세션은 고객 하나만 본다.",
          "빈 곳은 일감이다: 있어야 하는데 없는 자료와 답하지 못한 질문은 목록이 되고, 채워지면 KB가 갱신된다."
        ],
        human: ["문서 담당: 자기 범위의 MR을 판정해 reviewed로 올린다(판정 등급 auto · light · full), 충돌 판정", "릴리즈 담당 · FAE: 릴리즈 확정 · 납품 확인 · FAQ 판정", "KB 관리자: 규칙과 registry의 정본, 정기 정본 회의", "보안 담당: 고객 저장소 권한 · AI 읽기 허용 범위 · 전처리 규칙", "팀 리더 · 제품 리더: 질문 표본과 품질 목표, 파일럿 제품, 단계 전환"],
        quality: ["hard-zero 넷: 근거 없는 사실 · 고객 정보 누출 · 확정 기록 훼손 · 낡음 은폐. 하나라도 나오면 그 변경을 되돌린다", "질문 표본을 KB만으로 답하게 해서 답한 비율을 잰다(목표 공란, 팀 리더)"],
        state: [["g", "확정", "북극성 · 세 성질 · 원칙 다섯 · agent 다섯과 script · 큰 할 일 여섯 · core와 별도 묶음으로 가져가기"], ["y", "확인 대기", "고객 표기의 해석 · 계약의 상업 조건 · 기존 문서화 AI와의 분담. 묶음에 기본안으로 적혀 있고 회사에서 사람과 확인한다"], ["n", "회사에서 정할 것", "파일럿 제품과 작업 순서 · 기존 template과 KB 문서 종류의 정본 관계 · 고객 별칭 목록 · 숫자 기준"], ["n", "반영 대기", "core와의 접점(intake의 module 목록 = KB view, workflow의 설계 지식 질문 = kb-ask)이 경계 표 수준이다"]],
        place: {
          lead: "다른 주제는 KB에 묻기만 하고 직접 쓰지 않는다. 일이 끝나며 생긴 지식은 Harvester가 MR로 제안하고 사람이 판정한다.",
          ask: [
            ["intake", "무엇에 대한 일인가: module 목록과 유사 사례"],
            ["workflow", "설계 지식 질문(kb-ask): plan과 실행 중에 필요한 spec · 결정 · 과거 사례"],
            ["diagnose", "과거 bug 패턴: 같은 증상의 알려진 원인(Librarian)"],
            ["고객 트랙", "알려진 bug · errata 대조, 그 고객이 가진 릴리즈(고객 권한 단위로만)"],
            ["chain", "요구 · 계약 문서의 요구 축(첫 link), spec · RTL · C-model 정합성의 근거"],
            ["RTL review", "module의 제약과 함정, bug 패턴"]
          ],
          back: [
            ["원인 보고가 accept됨", "bug 문서 초안 MR(Harvester)"],
            ["고객 이슈가 고객 확인으로 끝남", "errata 후보 · FAQ 후보 MR"],
            ["sign-off · 릴리즈 · 납품", "릴리즈 · 납품 기록(Release recorder), 확정되면 바뀌지 않는다"],
            ["commit · ticket 종료 · 요구 변경 · 합성 · 리뷰 · task accept", "event router가 사건을 받아 갱신 · 확인 제안(MR)"],
            ["답하지 못한 질문", "gap 한 건 → 채울 일감 목록"]
          ]
        },
        spec: [["공개 해설: KB 한 장", "url", "../kb-system/"], ["공개 해설: 단계별 입력 · 출력", "url", "../kb-system/stages.html"], ["전체 지도에서 KB의 자리", "atlas", "row:kb"]]
      }
    }
  },

  /* ───────────── ③ 사례: 지금 명세로 걷는 일 다섯 ───────────── */
  walks: [
    { id: "W1", title: "야간 regression 30개 실패 → 일은 하나", from: "도구 신호 · main branch · 모든 예시는 가상",
      one: "원인 하나가 낸 신호 여럿을 하나로 묶고, 다시 난 실패는 붙인다. 원인 찾기는 사람이 요청할 때 연다.",
      steps: [
        ["intake 0 capture", "코드", "도구 adapter가 run 하나(main, rev 104, 실패 신호 30개)를 봉투 하나로 만든다. 판단하지 않는다."],
        ["1 raw scan", "코드", "신호마다 로그 문장을 pattern으로 검사한다. 위험 문장 없음. 한 신호에 위험이 있으면 그 신호만 멈춘다."],
        ["2 work-or-not · 묶기", "코드", "열린 일이 없다. 30개 모두 \"rev 100 pass, rev 104 첫 fail\"이라 같은 변경 구간이다. 오류 모양(assertion · timeout · mismatch)이 달라도 하나로 묶는다. 원인 후보는 rev 101~104의 변경."],
        ["3 understand · 4 categorize", "규칙", "요청은 규칙으로 '원인 찾기', 요청자는 커밋 작성자가 아니라 TB owner, 카테고리는 regression 실패(명확). LLM을 부르지 않는다."],
        ["5 gate", "규칙", "위험 · 권한 · 정보는 통과. 원인 찾기 workflow가 아직 초안이라 논의(hold)로 둔다. 원인 찾기는 사람이 요청할 때 연다."],
        ["6 route", "코드", "main은 보호 branch라 우선순위 now. owner의 digest 맨 위에 \"새 실패 묶음 1건: test 30개, rev 101~104 변경이 원인 후보\". 배정하지 않는다."],
        ["다음 날", "코드", "같은 test가 같은 오류 문장으로 또 실패하면 이 묶음에 '재발'로 붙는다. 같은 test라도 다른 assertion이면 붙이지 않고 새 실패로 다시 판정한다."],
        ["owner가 원인 찾기를 요청", "사람 → LLM", "diagnose: 우리 regression에서 재현되므로 TB · C-model · RTL 가운데서 좁힌다. oracle 쪽부터 지우고, 변경 구간 bisect → module trace 첫 불일치 → before/after로 확인. 고치지 않는다."]
      ],
      see: ["일은 30개가 아니라 1개다. 알림이 쏟아지면 사람이 시스템을 끈다.", "붙이는 것은 값이 같을 때만이다.", "원인 찾기는 층부터, 그리고 고치지 않는다."],
      go: [["intake", "sys", "intake"], ["diagnose", "sys", "diagnose"], ["시험 사례 S02", "bun", "ia/golden/GC-S02"], ["전체 지도: 내부 regression의 길", "atlas", "S1"]] },
    { id: "W2", title: "\"원인 찾아서 고쳐 주세요\" → 버그 수정 한 바퀴", from: "내부 ticket · \"blk_d 출력이 reference와 다릅니다\"",
      one: "요청 둘(원인 · 수정)이 한 workflow의 두 phase가 되고, 자율 선언이 실행 중 허용 목록이 된다.",
      steps: [
        ["intake", "코드", "ticket adapter가 편집이 멈출 때까지 기다린 뒤 봉투로 만든다. raw scan 위험 없음. 사람이 쓴 ticket이라 기본 규칙으로 '일이다'."],
        ["understand · categorize", "LLM", "요청 둘: ① 원인 찾기 ② 수정(①을 기다림). 과거 비슷한 ticket이 RTL 수정으로 끝났으므로 '내부 버그 수정, 명확'."],
        ["gate · route", "규칙 + LLM", "다섯 조건 통과. 버그 수정 workflow가 원인과 수정을 함께 덮으므로 child 없이 두 phase로 보낸다. ticket에는 label 하나와 comment 하나."],
        ["plan", "LLM + 코드", "posture full(oracle 강함 · 필수 입력 있음 · 실적 충분). 자율 선언: 하겠다 = blk_d 두 파일만(port 고정) / 묻겠다 = interface를 바꿔야 할 때 / 하지 않겠다 = MR 생성 · ticket 상태 변경. 선언이 allowlist가 된다."],
        ["execute", "LLM + guard", "재현(시작점) → 원인 확인(scratch에서 before/after) → 수정 → 재현 test(batch) → regression(batch). batch를 기다리는 동안 세션은 끝나고, 결과가 오면 새 세션이 STATE에서 이어 간다."],
        ["result", "코드 + LLM", "경계 확인: 선언 밖 변경 0, 고정 port 그대로. 결과 패키지 = 원인 보고 · diff 요약 · 의도 대조 · MR 후보."],
        ["review · apply", "사람", "검수 accept. MR은 사람이 만든다."],
        ["learn", "코드", "재발 방지 test를 intake의 internal 입구로 backlog에 보낸다. 그 일도 다시 intake를 지난다."]
      ],
      see: ["두 요청 = 한 workflow의 두 phase. '원인만'이면 수정 phase가 빠지고 대상 diff는 비어야 한다.", "선언이 곧 allowlist. 막힌 시도는 결과 패키지에 남는다.", "세션은 소모품, STATE가 정본."],
      go: [["workflow", "sys", "workflow"], ["WF-bugfix", "bun", "wa/library/WF-bugfix"], ["시험 사례 W01", "bun", "wa/golden/GW-W01"], ["전체 지도: 내부 regression의 길", "atlas", "S1"]] },
    { id: "W3", title: "\"blk_ctrl 리뷰해 줘\" → 리뷰어는 고치지 않는다", from: "사람이 직접 부름(command)",
      one: "판정과 수정을 떼어 놓는다. 사람이 부른 run의 결과는 부른 사람의 개인 범위에 머문다.",
      steps: [
        ["intake", "코드", "command도 같은 intake와 gate를 지난다. 부른 사람이 곧 요청자다."],
        ["plan", "LLM + 코드", "RTL review pipeline. 작업 지정이 없어 '코드 리뷰(A)만'으로 가정한다. 기록 범위 = 부른 사람의 개인 범위."],
        ["execute · 도구 층", "코드", "lint · CDC · compile을 끝까지 돌리고, 메시지 수천 건을 원인 수십 개로 묶어 실제 위험 / waiver 제안 / 무시로 가른다."],
        ["execute · AI 층", "LLM", "확인 목록 · 코드 의미 · 문서 · bug 패턴으로 지적을 쌓고, 수정 제안은 scratch에서 검증한다. 대상 파일은 한 줄도 고치지 않는다."],
        ["policy", "코드", "지적의 강등 · 차단 · GATE를 계산한다. LLM이 쓴 판정 값은 근거와 대조해 낮춰질 수 있다."],
        ["result", "코드 + LLM", "지적은 개인 범위 ledger에 잠정으로. 수정은 제안으로만 남는다."],
        ["review · apply", "사람", "공유 기록으로 올리기(records MR)와 수정 ticket을 여는 것은 사람이 한다."],
        ["정기 run이라면", "코드", "밤의 전체 run(A~E)은 공유 ledger에 잠정으로 쓰고 검수 뒤 확정한다. 판단(E)이 있으면 수정 task는 E의 결정 뒤에만 열린다."]
      ],
      see: ["리뷰어는 고치지 않는다. 수정은 늘 다른 task다.", "계산은 script, 서술은 AI.", "개인 범위와 공유 기록을 가른다."],
      go: [["workflow", "sys", "workflow"], ["PL-rtl-review", "bun", "wa/library/PL-rtl-review"], ["시험 사례 W33", "bun", "wa/golden/GW-W33"]] },
    { id: "W4", title: "새 in-loop filter mode 추가 → 사슬", from: "기능 추가 · 디코더 IP",
      one: "긴 개발이 link로 잘리고, 앞 link가 뒤 link의 oracle을 만든다.",
      steps: [
        ["L1 요구 · feasibility", "LLM → 사람", "표준 문서의 해당 절과 고객 요구에서 요구 목록. golden model에 새 mode가 있으면 그 revision을 적는다. 영향 block 후보 = filter · line buffer. 담당 리더가 착수를 결정한다."],
        ["L2 아키텍처", "LLM → 사람", "대안 둘(기존 pipeline 확장 · 별도 stage)을 latency · area · line buffer로 비교. 아키텍트가 고른다."],
        ["L3 ∥ L3m", "LLM → 사람", "L3는 새 register 필드와 stage 사이 interface를 기계가 읽는 형태로 쓰고 assertion 골격을 만든다. L3m은 oracle model에 새 mode, filter module trace model에 새 경로, trace 경계를 spec에. 둘이 함께 interface freeze."],
        ["L4 ∥ L5", "LLM", "L4는 block을 구현하고 module trace와 bit-to-bit로 대조. L5는 RTL을 보지 않고 spec과 oracle model로 test와 coverage 목표를 만든다."],
        ["L6 통합 · regression", "코드 → 사람", "새 mode의 특정 크기 조합이 실패. 실패 묶음이 결과표에 적히고, 원인 찾기는 담당이 요청해 diagnose로 간다(module trace로 첫 불일치 경계)."],
        ["freeze 뒤 변경", "사람 → LLM", "고객 요구로 register 필드 하나가 바뀌면 L3 · L3m을 다시 freeze하고, 그 필드를 쓰는 L4 block과 L5 test만 다시 연다."],
        ["L7 sign-off 준비", "LLM → 사람", "보고서 · 미결 목록 취합, spec · RTL · C-model 정합성 검사. 책임자가 sign-off한다."]
      ],
      see: ["사람의 결정은 넷이다.", "검증은 RTL을 읽지 않는다.", "spec이 바뀌어도 영향받는 link만 다시 연다."],
      go: [["chain", "sys", "chain"], ["CH-feature", "bun", "wa/library/CH-feature"], ["전체 지도: 사슬의 길", "atlas", "S3"]] },
    { id: "W5", title: "고객: \"특정 입력에서 출력이 깨진다\" → 고객 트랙", from: "고객 이슈 · 가상 고객",
      one: "질문과 자동 multi-test로 층을 가르고, 회신은 사람이 승인한다. 진짜 bug면 검수자가 고른 것만 내부 이슈로 따로 열어 link한다.",
      steps: [
        ["접수", "코드", "고객 입구 adapter: 출처 = 고객, 보는 사람 = 늘 밖, 고객 표기는 별칭만, 요청자 = 고객 대응 담당. 첫 회신(접수 확인)부터 시간이 기록된다."],
        ["범위 좁히기 질문", "LLM → 사람 승인", "업무 가족의 질문 묶음에서 층을 가르는 것만, 받은 자료에 이미 있는 것은 빼고 한 번에 묻는다: 쓰는 릴리즈, register 설정 값과 순서, 입력 조건, 환경(simulation · FPGA · 실리콘), 재현 빈도. 질문마다 왜 묻는지 한 줄. 필수 입력이 있으면 멈추지 않고 진단과 함께 간다."],
        ["자동 multi-test", "코드", "함께 돌린다: 고객 릴리즈로 우리 regression · 고객 설정 값으로 같은 입력 · 고객 memory latency 흉내 · 알려진 bug 목록 대조."],
        ["층 판별", "LLM", "고객 조건으로 우리 쪽에서도 재현된다 → 진짜 bug(새것)."],
        ["답 초안 → 승인 → 회신", "LLM → 사람", "AI는 초안까지. 회신은 늘 사람이 승인한다."],
        ["내부 이슈", "사람 → 시스템", "고객 레코드에서는 고치지 않는다. 결과 패키지의 후속 제안 가운데 검수자가 고른 것만 내부 이슈로 열려 link된다(합치지 않는다, 고객 별칭을 물려받는다). 내부에서는 버그 수정으로 간다."],
        ["종료", "사람", "고객이 확인하면 종료. 답이 없으면 정한 기간(공란) 뒤 담당자가 종료를 선언한다."],
        ["Track B", "코드", "원장의 Track B 줄: 분류가 맞았는가, 어느 질문 · 어느 test가 실제로 층을 갈랐는가, 받은 자료로 알 수 있었는데 물었는가. 질문 묶음과 test 묶음을 고치는 재료다."]
      ],
      see: ["같은 증상도 출처가 다르면 끝이 다르다(고객 확인 vs 수정과 검수).", "층부터 가른다. 원인이 고객 환경이나 문서일 수도 있다.", "Track B가 붙어야 완료다."],
      go: [["업무 지도", "sys", "workmap"], ["diagnose", "sys", "diagnose"], ["전체 지도: 고객 이슈의 길", "atlas", "S2"]] }
  ],

  /* ───────────── ④ 결정 ───────────── */
  decide: {
    lead: "지금까지 물었던 설계 질문은 모두 기본안으로 확정되었다. 확정은 합리적 출발점이라는 뜻이고, 회사에서 실무를 하며 조정한다. 앞에는 그 뒤 위임으로 정한 가정(실무에서 조정)을 두었다. 틀려 보이는 것만 알려 주면 된다.",
    now: ["t-r-riskraised", "t-r-signoffcat", "t-r-riskgrow", "t-r-meeting", "t-r-tiers", "t-r-talayers", "t-r-tatrend", "t-r-cvformal", "t-r-cvnotrun", "t-r-cvtwo"],
    next: [
      "확정: 지금까지의 질문은 모두 기본안으로 확정되었다. 확정은 합리적 출발점이라는 뜻이고, 회사에서 실무를 하며 조정한다(한눈에의 \"기본값은 출발점\").",
      "읽기: 전체 지도에서 주제 사이의 겹침(●가 둘 이상인 열 다섯)과 일 셋의 길을 보고, 그다음 diagnose · timing-area · coverage · 업무 지도 · KB 카드에서 층 열 · 질문 묶음 · 업무 가족이 현장 감각과 맞는지 본다.",
      "설계 쪽 반영 대기: core와 KB의 접점 대응표, 합성 matrix · review ledger와 KB의 연결 필드, code-review 갈래 문서(회사 review 절차 뒤). test 검증력(mutation)은 보류."
    ]
  },

  /* ───────────── 자료실 ───────────── */
  lib: {
    lead: "필요할 때만 여는 원문과 자료다. 앱의 다른 화면은 이것들을 요약한 것이다.",
    docs: [
      ["media/wf/02_workflow-standard.html", "workflow 표준화 (그림 문서)", "세 층 · 여덟 자리 · phase · 상속 규칙 · workflow가 없는 일", "wf-standard"],
      ["media/wf/03_assembly-rtl-review.html", "조립과 RTL review (그림 문서)", "간선 종류 · pipeline preset · 리뷰 → 자동 수정 고리 · 합성 matrix", "wf-assembly"],
      ["media/wf/04_agent-system.html", "agent system (그림 문서)", "부품 지도 · task 폴더 파일과 계약 · 자율 선언 두 겹 · 세션과 STATE · hard-zero", "wf-agent"],
      ["media/wf/01_core-one-page.html", "core 한 장 (그림 문서)", "아홉 단계 · 사람이 서는 자리 · intake와 workflow의 경계", "core-one-page"],
      ["../kb-system/", "KB agent system (공개 해설)", "북극성 · 문서 구조 · 채우기 · 운영 · 시험과 세우는 순서", "kb-system"],
      ["../kb-system/stages.html", "KB 단계별 입력 · 출력 (공개 해설)", "세우는 단계마다 무엇이 들어가고 무엇이 나오는가", "kb-stages"]
    ]
  },

  /* ───────────── 주제의 '자세히' (시스템 카드 아래 접힘) ───────────── */
  deep: [
  { id: "intake", badge: "확정 · 실무에서 조정",
    title: "intake & routing — 일의 발생을 받아 처리에 착수시키는 단계",
    excluded: "사람이 말로 한 것을 기록으로 만드는 일(회의 → action item)은 이 단계의 범위가 아니다. 별도 도구 · 별도 갈래의 일이다. 명세의 세부 결정은 위임으로 정했고 확정되었다(실무에서 조정).",
    body: [
      { h: "1. 발생의 모양 — 입구 목록" },
      { table: { head: ["입구", "예", "ticket과 다른 점", "범위"], rows: [
        ["ticket", "issue tracker의 ticket", "이미 \"일\"의 형식을 갖추고 있다", "포함 (첫 구현)"],
        ["고객", "고객이 보낸 문제 보고 · 질문(고객이 보는 tracker project, 지원 mail 주소, 고객 portal)", "대외 내용이다. 시스템의 글을 늘 고객이 볼 수 있다고 보고, 끝이 고객 확인이다", "포함 (고객 트랙)"],
        ["tool 신호", "야간 regression 실패, lint 경고 증가, timing 악화, CI 실패, CI의 리뷰 요청(MR · commit)", "요청자가 없다. \"이것이 일인가\"부터 판단한다. 양이 많고 반복된다", "포함 (둘째 adapter)"],
        ["internal", "다른 갈래가 남긴 test 보강, 이어진 요청의 뒷부분, 조립이 낸 후속, 사슬의 다음 link", "시스템 내부에서 생긴다", "포함"],
        ["command", "사람이 시스템을 직접 부름. 사람이 workflow를 따라 직접 하겠다는 \"사람 수행\"도 여기다", "요청자가 대화 안에 있다", "포함 (migration 2단계부터)"],
        ["schedule · state 변화", "주간 보고 · 정기 회귀 / spec 개정 · 상류 IP 새 버전", "발생이 아니라 시각이 트리거 / 파급 작업이 생긴다", "나중에"],
        ["mail · chat", "시스템 주소로 온 요청 · 메신저 한 줄", "원문이 일의 형식이 아니다. AI가 ticket을 대신 만들지 않고 개설을 제안한다", "나중에 (LLM 입력 승인 범위 확인 뒤)"]
      ] } },
      { ul: [
        "검수 reject 뒤의 재작업은 internal 발생이 아니다. reject 뒤에는 사람이 이어받고 시스템은 다시 시도하지 않는다.",
        "tool 신호는 정해진 branch만 받는다(main · release · nightly 등). 예외는 CI 리뷰 요청이다: MR 작성자 자신의 \"판정해 달라\"이므로 MR branch도 받고, 기록은 작성자의 개인 범위에 쓴다.",
        "사람 수행 command는 ticket key와 함께 받아 그 ticket의 레코드에 묶는다. 위험과 따를 workflow가 있는지만 보고, 시스템은 그 ticket에 쓰지 않는다. 사람이 한 일도 같은 checkpoint와 결과 패키지로 끝난다."
      ] },
      { h: "2. 출처 축 넷 — 같은 내용, 다른 출처 = 다른 끝" },
      { table: { head: ["출처", "무엇이 해당하나", "끝까지의 과정"], rows: [
        ["고객", "고객 입구, 밖의 mail · chat 발신자", "범위 좁히기 질문 → 진단 → 사람 승인 회신 → 고객 확인. 수정은 내부 이슈로 따로"],
        ["내부 사람", "ticket · command · mail · chat", "결과 패키지 → 검수 → 반영"],
        ["내부 도구", "도구 신호 · CI 리뷰 요청 · 정기 · 상태 변화, 시스템 계정이 만든 ticket", "묶음으로 보이고, 원인 찾기는 사람이 요청할 때. 리뷰 요청은 작성자의 개인 범위"],
        ["다른 일의 뒤", "후속 요청 · 사슬 link · 학습 backlog · 파급 child", "부모의 조립 간선이 정한 workflow로 열리고, 부모의 우선순위 · 요청자를 물려받는다"]
      ] } },
      { p: "출처는 origin(사람 · 기계)을 넷으로 나눈 칸이다. 입구와 계정으로 규칙이 채우고, 출처가 고객이면 고객 트랙 규율이 붙는다. 분류 축 다섯 가운데 출처 · 요청 종류 · 업무 가족 · lifecycle 단계는 레코드의 칸이고(업무 가족은 카테고리의 상위 묶음으로 규칙이 채우고, lifecycle 단계는 원문이 드러낼 때만 적는다), 층은 레코드에 칸이 없다. 진단이 좁혀 가며 정한다." },
      { h: "3. 일곱 단계 (intake → triage → gate 안의 구조)" },
      { table: { head: ["단계", "하는 일", "산출물", "여기서 멈추는 경우"], rows: [
        ["0 capture", "adapter가 원문을 받아 레코드 초안을 만든다. 출처 · 시각 · 요청자 · 마감 · 대상 후보 · owner · 내용이 밖에서 왔는가 · 글을 밖에서 보는가는 LLM 없이 채운다", "레코드 초안 + 원문 참조", "없음. 받은 것은 반드시 레코드가 된다"],
        ["1 raw scan", "LLM에 넣기 전에 pattern으로 위험 신호 · 금지 link · 민감 내용을 본다. tool run은 신호 하나씩", "scan", "위험 신호 → ai:risk, 끝. tool은 hit 신호만 멈춘다"],
        ["2 work-or-not", "먼저 관계(같은 일인가, 한 원인인가), 그다음 일이다 / 기록만 / 기존 일에 붙인다", "work_decision · cluster · relation", "기록만 → 끝. 붙인다 → 기존 일의 comment 갱신, 끝"],
        ["3 understand", "요청(여럿이면 순서와 의존) · 대상 · 요청자 · 끝의 모양 · 마감 · 관계를 읽는다", "00_intake.md 확정", "없음. 빈 칸은 빈 채로"],
        ["4 categorize", "카테고리 하나 + 분류 등급 + 근거 등급 + 업무 가족(규칙) + 원문이 드러내면 lifecycle 단계", "10_triage.md (분류 record 여섯 칸)", "없음"],
        ["5 gate", "위험 → 권한 → 정보 → 불확실 → 작업량. pipeline이면 preset과 그 노드의 입력, 사슬이면 진입 link, 고객 이슈의 원인 찾기면 범위 좁히기 질문 묶음을 본다", "20_gate.md 앞부분 + ai:* label", "범위 밖 → 기록만. 정보 부족 → 질문. 불확실 → discuss"],
        ["6 route", "우선순위, workflow 지정(사슬이면 진입 link만), 초기 posture 제안, 대기열(도구 신호의 원인 찾기는 요청을 기다림, 사람 수행은 사람 수행 레코드로), 이어진 요청 · 나눌까요 · 고객 이슈의 수정 미루기, 첫 회신", "20_gate.md route 블록, 대기열, 회신", "없음"]
      ] } },
      { ul: [
        "순서는 코드가 지킨다. LLM이 무슨 말을 하든 raw scan보다 먼저 원문을 읽거나 gate를 건너뛸 수 없다.",
        "사람이 쓴 ticket은 LLM 판단만으로 \"일 아님\"이 되지 않는다. tool 신호와 state 변화에서는 work-or-not이 핵심이다.",
        "intake의 마지막 파일은 20_gate.md다. 그 route 블록이 workflow 쪽 plan의 입력이다. 번호 파일은 확정 시점의 값이고, 살아 있는 상태는 원장(append-only)에 있다."
      ] },
      { h: "4. 공통 intake 레코드 (세 파일 frontmatter의 합)" },
      { code: "key, cycle, mode(shadow|active)\nsource:   entrance(ticket|customer|tool|internal|command|schedule|state|mail|chat), ref, event_id,\n          origin(human|machine), from(customer|internal-human|internal-tool|internal-followup),\n          external, audience_external, customer(별칭·제품·경로), review_target(MR·commit)\nscan:     risk, hits, links, cleared, unscanned\nwork_decision: work | info | attach(target)\nasks[]:   order, type(answer|change|diagnose|decide|notify|scheduled), depends_on, effective\nobject[]: kind, id, product, owner(resolved_by)\nrequester, done_shape, deadline, priority(now|normal|low), relation, cluster(tool)\ncategory: cat:<id>, grade, evidence, grounds, family(업무 가족), stage(lifecycle 단계, 드러날 때만)\ngate:     result, 다섯 조건, workflow 가용성, questions(왜 묻는지 · 묶음 항목 · 멈추게 하는가)\nroute:    path, workflow, preset, chain(사슬 id·key·link), follow_up_ref(부모 key·후속 id),\n          executor(사람 수행), initial_posture, queue, dispatch, phases, pending_asks, reply, notify\nstatus:   state, label, parent_notice" },
      { ul: [
        "모든 칸에 filled_by(source · rule · llm · human)가 붙는다. 규칙이 채운 칸은 LLM이 덮어쓰지 않는다.",
        "LLM이 채운 칸은 근거 한 줄과 근거 등급을 옆에 둔다. 근거 등급: explicit(원문이 명시) / similar-case(채택된 사례와 닮음) / inferred(추론뿐). 명확 등급은 inferred로 내릴 수 없다."
      ] },
      { h: "5. ask의 종류 → workflow 묶음" },
      { table: { head: ["ask", "뜻", "가는 곳"], rows: [
        ["answer", "질문에 답하라. 판정을 달라(리뷰) · 값을 달라(측정 · 실험)도 여기다", "근거 붙인 답(판정형 · 실험형은 카테고리가 정한다)"],
        ["change", "무언가를 바꿔라", "설계 · 검증 사슬 / timing · area / test · coverage 갈래 중 카테고리로"],
        ["diagnose", "문제가 있다. 원인을 찾아라", "원인 찾기 갈래(§6의 행선지 표). 도구 신호의 실패는 기본 diagnose"],
        ["decide", "결정이 필요하다", "결정 자료 준비 → [HD]. AI는 결정하지 않는다"],
        ["notify", "알려만 준다", "기록만"],
        ["scheduled", "정해진 시각이 됐다", "미리 정한 workflow, 분류 없음"]
      ] } },
      { p: "리뷰 · 실험 요청에 따로 종류를 두지 않는 이유: ask는 \"무엇을 돌려받고 싶은가\"(답 · patch · 원인 보고 · 결정 자료)의 축이고, 리뷰 · 실험은 \"어떻게 일하는가\"(작업 모양)의 축이다. 어떻게 일할지는 카테고리 → workflow가 정한다. 요청이 여럿이면: 이어진 요청을 한 workflow가 덮으면 한 task의 phase로, 다 덮지 못하면 첫 요청만 하고 뒤 요청은 결과 패키지의 후속 제안으로(검수 accept · 사람 결정 뒤 internal로 열림), 독립 요청이면 \"나눌까요\"를 묻는 동안 첫 요청을 진행한다." },
      { h: "6. 원인 찾기(diagnose)의 행선지" },
      { table: { head: ["경우", "행선지"], rows: [
        ["카테고리의 workflow가 원인 찾기를 덮는다(버그 수정 · timing 개선의 원인 phase, 쓸 수 있는 regression 원인 찾기 특화)", "그 workflow"],
        ["덮는 workflow가 없고, 이 task의 요청이 원인 찾기(와 답)뿐이다", "조사형 모양의 기본 채움 + 층 표(one-off, draft 고정). 대상을 고치지 않고 방법이 정해져 있어 논의를 기다리지 않는다. 되풀이되면 특화 workflow 신설이 의무(Track B가 센다)"],
        ["원인 찾기 + 수정인데 한 workflow가 다 덮지 못한다", "원인 찾기만 이 task에서, 수정은 결과 패키지의 후속 요청으로"],
        ["도구 신호의 실패", "묶음으로 모아 보이고, 원인 찾기는 사람이 요청할 때 연다(feed마다 바로 열기로 팀 리더가 정할 수 있다). 되풀이되면 요청을 제안만 한다"],
        ["사람의 요청(\"원인을 찾아 달라\")", "바로 연다"],
        ["고객 이슈", "고객 트랙이 연다. 범위 좁히기 질문의 답과 자동 multi-test(workflow의 진단 phase)가 층을 가른다. 진짜 bug면 내부 이슈를 따로"]
      ] } },
      { ul: [
        "첫 입력: 도구 신호면 cluster(변경 구간 · 구간 안의 변경 · member 전부 · 실패한 seed), 고객 이슈면 질문의 답과 받은 자료, 사슬의 통합 link면 그 link의 결과표 · 실패 묶음.",
        "층은 intake가 정하지 않는다. 진단이 정하고, 그 결과가 분류의 Track B 줄로 돌아와 질문 묶음과 분류 규칙을 고친다."
      ] },
      { h: "7. 고객 트랙" },
      { ul: [
        "고객 입구 adapter는 고객 이름을 별칭으로 바꾸고(실명은 레코드에 남지 않는다) 보는 사람을 늘 밖으로 둔다. 요청자 자리에는 고객 대응 담당이 선다.",
        "범위 좁히기 질문은 업무 가족별 묶음(규칙 파일)에서 고른다. 후보 층을 가르는 질문만, 받은 자료에서 읽을 수 있는 것은 빼고, 한 번에, 질문마다 왜 묻는지를 붙인다. 멈추는 근거는 workflow의 필수 입력뿐이고, 나머지 질문은 진행과 함께 보내 진단과 질문이 동시에 간다.",
        "질문 · 회신은 언제나 초안이고 고객 대응 담당이 승인해 보낸다. 자동 multi-test는 intake가 하지 않는다(workflow의 진단 phase).",
        "수정은 고객 이슈에서 하지 않는다. 진짜 bug면 결과 패키지의 후속으로 제안하고 검수자가 고른 것만 내부 이슈로 열려 잇는다. 사람이 손으로 연 내부 ticket이 있으면 새로 열지 않고 잇는다. 고객의 기능 추가 요청도 고객 이슈는 답 · 회신까지, 사슬은 내부 이슈로 따로.",
        "고객 이슈에서 파생된 레코드는 그 고객의 별칭을 물려받아 다른 고객의 일에 근거로 쓰이지 않는다. 한 작업이 두 고객의 자료를 읽지 않는다. 고객이 보는 자리에는 label도 쓰지 않는다.",
        "고객이 label을 볼 수 있는 project(회사 확인 전 기본)에서는 고객 ticket에 label을 붙이지 않는다. 위험으로 멈추면 intake controller가 고객이 보지 않는 내부 project에 손잡이 ticket을 하나 만들어 위험 label과 멈춘 이유를 둔다. 고객 ticket의 내부 전용 comment 첫 줄은 \"확인 중: 손잡이 <key>\"뿐이다. 해제는 사람이 손잡이의 위험 label을 떼는 것이고, 손잡이가 생기면 그 뒤의 상태 label은 끝까지 손잡이에 간다. 손잡이를 닫아도 고객 이슈는 끝나지 않는다.",
        "고객이 확인하면 끝나고, 답하지 않으면 정한 기간(공란, 고객 대응 리더) 뒤 담당이 종료를 선언한다. 시스템은 닫지 않는다. 지표: 첫 회신 · 최종 회신 시간, 재질문 횟수, 고객 확인 비율(목표 공란)."
      ] },
      { h: "8. 사슬 진입" },
      { ul: [
        "기능 추가처럼 카테고리의 기본값이 사슬이면, 사람의 ticket 레코드가 사슬 인스턴스(epic)가 되고 그 레코드의 task가 첫 link를 직접 돈다. 첫 link를 child로 다시 열지 않는다.",
        "다음 link는 결정이 기록되거나(on-decision) 검수가 accept되면(on-accept) 사슬 link 발생(child)으로 열린다. 간선이 넘긴 산출물(spec · assertion 묶음 · 대상 block)로 입력 요건을 채운다.",
        "나란한 두 link가 모두 accept되면 합류 link가 열린다. 두 번째 배달이 와도 합류 link는 한 번만 열린다.",
        "덮는 요청은 사슬 전체로, 쓸 수 있는가와 입력은 진입 link로 본다. 진입 link가 작업 모양뿐이면 논의 → 정할 사람이 정하면 그 link 하나만 초안 신설로 대기열에."
      ] },
      { h: "9. 관계 · 중복 규칙" },
      { ul: [
        "1층 sfp: (run 종류 · branch · 대상 · check · 오류 종류 · 오류 문장 template)가 열린 일과 같으면 붙인다. 같은 check라도 오류 문장이 다르면 새 실패다.",
        "2층 cluster: 환경 오류 → storm(build 붕괴) → 변경 구간 → 오류 문장 → 하나씩. 커밋 하나가 test 서른 개를 깨뜨려도 일은 하나다.",
        "flaky는 같은 입력(같은 revision · 같은 seed)에서 결과가 갈린 것만이다. seed 하나에서만 나는 실패는 새 실패로 열고 그 seed를 재현 입력으로 적는다.",
        "붙이는 것은 값이 같을 때만이다. 닮았다는 이유로는 붙이지 않는다(허용 0건). 사람의 발생은 흡수되지 않는다: 닮으면 후보로 표시만 하고 새 task를 연다.",
        "고객 이슈는 합치지 않는다. 같은 실패를 가리켜도 관계만 잇는다. 유사 검색은 같은 고객 별칭의 레코드와 내부 레코드에서만 한다.",
        "CI 리뷰 요청은 신호가 아니다. 같은 MR의 새 revision은 새 cycle로 받고 옛 대기를 거둔다."
      ] },
      { h: "10. 틀린 분류를 잡는 자리 넷과 분류의 Track B" },
      { ul: [
        "① golden set과의 불일치(shadow에서 사람이 채택하지 않은 분류) ② 검수 판정의 \"category was wrong\" ③ 실행 중 재분류 ④ 사람이 ticket의 cat: label을 바꾼 것.",
        "레코드가 끝날 때(닫힘 · 끝남 · 대체됨) 원장에 Track B 줄 하나: 처음 카테고리와 끝 카테고리, 업무 가족, 교정(자리 넷 중 어디서 무엇이 무엇으로), 보낸 질문마다 답이 왔는가, 받은 자료로 알 수 있었는데 물었는가. 진단이 정한 층과 층을 가른 질문 · test는 검수자와 workflow 학습이 같은 줄에 채운다.",
        "workflow의 학습이 끝나면 학습 완료 사건이 와서 같은 레코드에 Track B 줄(층 · 층을 가른 질문과 test · 분류 교정)을 덧붙인다. 레코드가 닫힌 뒤에도 덧붙인다. workflow가 route 결함으로 거부하면(route 거부 사건) 지금의 정본으로 분류 → route를 한 번 다시 계산하고, 경로가 달라지면 새로 보내고 같거나 두 번째면 논의로 둔다.",
        "실행 중 위험 고지(risk-raised): workflow가 손잡이 없는 고객 레코드에서 위험을 올리면 보낸다. intake는 dispatch가 지금 것이고 진행 중일 때만 손잡이를 확보해 위험 label을 두고, 레코드 상태는 그대로 둔다. 레코드당 손잡이는 하나이고, label 자리가 이미 있으면 계약 위반으로 원장에 남기고 운영자에게 알린다.",
        "이 줄 없이 끝난 레코드는 \"Track B 빠짐\"으로 센다. 정기 집계(주기 공란, 정본 승인자)가 분류 규칙 · 카테고리 표 · 범위 좁히기 질문 묶음을 고치는 MR의 재료다. 제안은 시스템이, 반영은 사람이 한다."
      ] },
      { h: "11. 범위 결정 (설계 기본값)" },
      { table: { head: ["대상(object)", "AI가 일을 열어도 되는가"], rows: [
        ["RTL 소스 · testbench · test · script · synthesis constraint · 문서", "허용 (고치는 범위는 workflow의 posture와 scope가 정한다)"],
        ["spec 자체", "결정 자료 준비까지. 수정 요청은 gate가 좁혀 진행하고 회신에 적는다"],
        ["환경 설정(tool version · license · CI job)", "열지 않음. 환경 원인 묶음은 기록 + 운영자 알림"],
        ["프로세스 · 규칙 문서", "열지 않음 (정본 회의 영역)"]
      ] } },
      { ul: [
        "시스템이 스스로 열면 안 되는 것(도구 · internal · state · schedule 발생에 적용): 고객 대외 회신 / 릴리스 · tag · 배포 / 다른 팀 소유 영역의 변경 / 환경 · 권한 · 계정 변경 / 사람 평가 · 일정 · 인력 배치. 사람이 연 일은 각 조건으로 판정한다(고객 회신은 초안까지).",
        "다른 팀 소유 대상을 바꾸는 요청은 범위 밖이다. 읽기로 할 수 있는 요청이 함께 있으면 좁혀서 진행하고, 결과는 그 팀에 전할 보고서가 된다.",
        "시스템은 owner에게 알리기만 하고 배정하지 않는다."
      ] },
      { h: "12. 가상 사례 아홉 (요지)" },
      { ul: [
        "어제와 같은 test가 같은 방식으로 다시 실패 → sfp가 같다 → 기존 일에 \"재발\" 한 줄. 사람은 새로 받는 것이 없다.",
        "메신저 \"block X timing 안 맞는데 봐줄래?\" → 원인 보고인지 수정인지 불명 → 질문 다섯 칸을 thread에. 수정이면 ticket 개설을 제안한다.",
        "spec 개정 알림 → 기록만 + 파급 child 후보 넷 → owner가 승인한 child만 internal 발생으로.",
        "설계 사슬이 남긴 \"나중에 test 보강\" → internal → test · coverage, 낮은 우선, 야간 대기열.",
        "커밋 하나가 test 서른 개를 깨뜨림 → 한 묶음 → 원인 찾기뿐이라 조사형으로 할 수 있음 → owner digest에 \"요청하시면 시작합니다\". 요청 글이 오면 그 글이 요청이 된다.",
        "\"원인 찾아서 고쳐 주세요\" ticket → 요청 둘이 한 workflow의 두 phase.",
        "random regression에서 seed 하나만 실패 → flaky가 아니다 → 새 실패, 그 seed를 재현 입력으로.",
        "고객(가상): \"release 3.2에서 특정 입력의 frame 30부터 블록 경계가 깨진다\" → 별칭 · 늘 밖 · 요청자 = 고객 대응 담당 → 필수 입력이 있어 진행, 받은 자료에 없는 것(설정 값과 순서 · 환경 · 재현 빈도)만 질문 → 원인 찾기만 고객 레코드에서, 수정은 미룸 → 진짜 bug로 accept되면 내부 이슈가 따로 열려 이어진다.",
        "\"디코더에 feature F를 추가해 주세요\" → 기본값 = 사슬 → 이 ticket이 epic이 되어 진입 link를 직접 돈다 → 다음 link는 착수 결정이 기록되면 열린다."
      ] },
      { note: "시험 세트 119건(입구별 건수는 탐색기의 시험 사례 화면에 있다). 회사에서 agent를 만든 뒤에는 이 목록이 회귀 시험이 된다. 전문과 기대 결과는 intake agent 탐색기에 있다." }
    ]
  },
  { id: "workflow",   badge: "확정 · 실무에서 조정",
    title: "workflow & autonomy — 착수된 일을 AI가 결과 패키지까지 스스로 끌고 가는 방식",
    lead: "§1~§9는 자율 진행의 설계(세 층 · 경로 · 선언 · 세션 · 회귀 시험), §10~§17은 그 뒤 명세 묶음에 더해진 것(층 판별 · 두 트랙 · 고객 트랙 · 갈래별 현장 절차 · 억제 기록 · 블록 sign-off · label 자리 · 시험)이다.",
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
      { note: "one-off도 학습 기록에 \"이 일이 다시 올 것 같은가\"를 반드시 남긴다. 같은 one-off가 반복되면(횟수 공란, 결정 주체 = 정본 승인자) 초안 신설이 의무가 된다. 원인 찾기만 남은 일은 조사형 one-off로 바로 진행한다(§10)." },

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
      ]}},
      { h: "10. 원인 찾기는 층 판별부터 (조사형 모양의 의무)" },
      { table: { head: ["순서", "하는 일", "남는 것"], rows: [
        ["1 층 판별", "원인이 있을 수 있는 층(문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과)의 후보를 적고 가른다. 내부 일은 재현 조건 대조, 고객 일은 질문의 답 + 자동 multi-test, 질문형은 근거 찾기. 불안정(간헐 실패)은 층이 아니라 상태다", "층 후보와 가른 근거, 정한 층 또는 남은 후보"],
        ["2 재현", "같은 입력 · 같은 revision · 같은 seed로 재현한다. 질문형이면 건너뛴다", "재현 조건"],
        ["3 가설 · 좁히기", "가설 표를 세우고 싼 것부터 좁힌다(bisect · seed 변주 · module trace 첫 불일치)", "가설 표(STATE)"],
        ["4 원인 확인", "원인마다 따로 before/after를 scratch에서 확인한다", "원인 보고 · 층 표(결과 절)"],
        ["끝", "층마다 끝이 다르다: 수정 방향 / out-of-scope(고객 환경 · 문서면 회신) / 학습 backlog", "후속 제안"]
      ]}},
      { ul: [
        "버그 수정 · timing 개선 workflow의 원인 phase도 같은 의무를 이행한다(run 시작점에서 재현 조건 대조로 층 첫 갈래).",
        "regression 원인 찾기 특화(WF-regr-diagnose)는 실패 종류 · 층 판별 → 재현 → 가설 표 → 좁히기 → 원인마다 before/after로 채웠지만, 실적이 생길 때까지 draft로 둔다(가정).",
        "덮는 workflow가 없고 원인 찾기만 남은 일은 조사형 one-off로 바로 진행한다. 같은 일이 되풀이되면 Track B가 세어 특화 신설이 의무가 된다."
      ] },

      { h: "11. 모든 일에 두 트랙 — Track B의 왕복" },
      { code: "Track A  일 자체 ─────────────▶ 결과 패키지 ─▶ 검수 ─▶ 반영\nTrack B  workflow의 기록 ─────▶ 결과 패키지의 Track B 절(미리보기)\n                               └▶ 학습 기록의 track_b(확정본)\n                                    └▶ 학습 완료 사건 ─▶ intake 원장의 그 레코드에 Track B 줄 덧붙임\n                                       (층 · 질문 결과 · 층을 가른 test · 분류 교정)" },
      { ul: [
        "Track B 칸: 쓴 workflow · 막힌 곳과 메운 사람 · 평가 · 개선 · 결과. 원인 찾기를 했으면 정한 층 · 다른 층 후보 · 질문마다 답이 왔는가와 층을 갈랐는가 · 받은 자료로 알 수 있었는가 · 돌린 test와 층을 가른 test · 분류 교정.",
        "칸이 비면 결과 칸(CR)과 학습 칸(CL)이 통과하지 않는다. 일이 끝나도 완료가 아니다.",
        "검수 판정의 '어디가 틀렸나'에 Track B가 있고, '분류가 이것이어야 했다'를 적을 수 있다. 정기 집계가 분류 규칙 · 질문 묶음 · test 묶음을 고치는 재료다."
      ] },

      { h: "12. 고객 트랙 = 트랙 덧붙임" },
      { table: { head: ["덧붙는 것", "내용"], rows: [
        ["언제", "레코드의 출처가 고객일 때. 카테고리의 workflow(예: 기능 불일치 → 버그 수정의 원인 phase) 위에 얹힌다. 별도 workflow가 아니다(가정)"],
        ["CT1 고객 경계 · 질문의 답", "고객 별칭만 쓴다. 다른 고객의 자료(customer_scope)를 읽거나 근거 · 초안에 쓰지 않는다. 고객이 보는 자리에 쓰지 않는다. 받은 자료와 범위 좁히기 질문의 답을 입력 표로 옮긴다"],
        ["CT2 자동 multi-test", "원인 찾기 phase가 있을 때, 증상별 묶음(설정 파일)을 한 번에 돌려 층을 가른다. 알려진 bug 대조는 늘 함께"],
        ["회신 초안", "결과 패키지의 한 절. 원인 · 회피책 · '수정 일정은 내부에서 확인 중'. 회신 문구 검사를 거치고, 보내는 것은 고객 대응 담당"],
        ["트랙 후속 둘", "진짜 bug → 내부 이슈 · 기능 요청 → 내부 레코드가 사슬 인스턴스. 둘 다 검수 뒤, 검수자가 고를 때만(기본은 고르지 않음). 미뤄 둔 수정 요청의 번호를 잇는다"],
        ["하지 않는 것", "고객 레코드에서 대상을 고치지 않는다(트랙 아래 수정 phase 금지, resolver가 막음). posture 상한은 draft다(가정)"]
      ]}},
      { note: "같은 증상이 내부 ticket으로 오면 버그 수정 workflow가 원인과 수정을 함께 덮는다. 출처가 고객이면 원인 phase만 돌고, 수정은 검수자가 고른 내부 이슈에서 따로 한다." },

      { h: "13. 갈래별 현장 절차" },
      { table: { head: ["갈래", "더한 것"], rows: [
        ["공통", "선택 도구 일곱(RDC · X-propagation · DFT rule · formal 도달성 · constraint 검사 · netlist 등가성 · power 추정): 있으면 쓰고, 없으면 그 확인은 '보지 못한 것'(통과 아님, GATE 줄에 '보지 못한 확인 n건'). 판정에 꼭 필요한 도구는 팀 리더가 필수로 올린다. 소관이 회사마다 다른 넷(RDC sign-off · DFT 경계 · SDC 소유 · netlist 등가성)은 회사가 정하기 전까지 지적 · 알림만"],
        ["code-review", "확인 목록에 X 발생과 전파 · reset domain crossing · DFT 친화성(scan 제어 reset · test mode clock mux · 내부 tri-state), reset 정책 · FSM 도달 불가와 deadlock · clock gating, assertion 목록. CDC · RDC setup이 불완전하면 clean 판정 불가. 지원 config마다 elaboration"],
        ["code-review (단계)", "제품 단계별 ruleset 엄격도 표: 같은 rule이 RTL freeze 뒤에는 차단이 된다(GATE의 별도 항). 도구 층이 깨끗해야 사람 리뷰가 시작된다"],
        ["timing-area", "합성의 숨은 축(합성 mode · floorplan 입력 · clock 가정)을 칸의 신원으로. constraint 건전성(clock 정의 · unconstrained endpoint · 예외의 근거 · 소유자 · RTL 대응 · IO delay의 budget 근거) → 문제가 있으면 '조건부 met'. DRV 위반 수, 경고 닫힌 집합(latch · 상수 flop · 조합 loop …), 지정 corner · mode 전부 met. power는 관측 지표(순위에 쓰지 않음). hold · netlist ECO는 범위 밖"],
        ["timing-area (추세)", "정기 sub-top 합성의 QoR 추세: met → 미달은 변화 폭과 무관하게 일, 숨은 축이 바뀌면 추세를 끊는다. timing 개선 workflow는 기준과 후보를 같은 합성 조건으로 재고, 승자는 QoR 칸이 아니다(merge 뒤 정기 run이 칸을 갱신)"],
        ["coverage", "검증 상태 리뷰에 closure 판정(종류별 목표는 공란 · 검증 리더, 승인된 exclusion만 분모에서 뺌, 통과한 test만 merge, 미충족이면 GATE FAIL, 돌지 않은 test가 덮을 bin이 남으면 판정 불가)과 이전 accept run 대비 추이. vacuous assertion은 따로 센다. 도달 불가 hole은 formal 도달성으로(exclusion 후보일 뿐), spec상 도달 가능한데 도달 불가가 증명되면 RTL 결함 의심. covergroup 수정은 spec 근거 대조와 분모 바뀜 표시로 판정"]
      ]}},

      { h: "14. 억제 기록의 수명 (waiver · coverage exclusion · 합성 예외)" },
      { ul: [
        "'이 경고나 빈칸은 문제 삼지 않는다'는 사람의 승인 기록을 한 종류로 묶는다. 정본은 review ledger의 억제 항목이고, 도구 파일은 그 사본이다.",
        "상태 여섯: 제안 · 유효 · 재확인 필요 · 만료 · 고아 · 철회. 효과는 유효만 낸다. 승인 때의 대상 구문이 바뀌면 재확인 필요가 되고 효과를 잃는다(waiver는 다시 판정, exclusion은 분모에서 빼지 않음, 예외는 덮는 path가 조건부 met). 표시만 할지는 팀 리더 · 검증 리더가 고른다(기본 = 효과 정지, 가정).",
        "맞는 것이 없으면 고아(정리 제안), 도구 파일에만 있으면 '기록 없음' 지적. 승인 등급(동료 / 리더)의 구분은 공란. 도입 때 기존 승인은 일괄 등록해 인정한다."
      ] },

      { h: "15. 블록 sign-off 판정" },
      { ul: [
        "\"이 블록이 이 milestone을 통과할 준비가 되었는가\"를 판정하는 판정형 특화 하나(WF-block-signoff, candidate). 지금까지의 판정은 task 단위(\"이 일이 끝났는가\")였다.",
        "같은 revision에서 accept된 결과만 재료로 모은다: lint 차단 0(단계 차단 포함) · CDC clean · RDC clean · coverage closure · 지정 corner · mode 전부 met(조건부 met 아님) · 효과를 잃은 억제 기록 0 · 기준표가 더한 것. 도구를 다시 돌리지 않는다.",
        "결과는 준비됨 / 미충족 / 판정 불가와 미결 목록이다. 준비됨 = 필수 전부 충족 ∧ 보지 못한 확인 0. sign-off 자체는 기준표의 책임자(사람)가 한다. 기준표는 공란(설계 리더 · 검증 리더). 사슬의 sign-off link는 이 판정을 읽기만 한다."
      ] },

      { h: "16. label 자리와 손잡이 ticket" },
      { ul: [
        "workflow의 상태 label(진행 중 · 대기 · 위험 · 검수 · 학습됨)은 레코드가 정한 ticket 하나에만 붙는다. 고객이 label을 볼 수 있는 고객 ticket에는 붙이지 않는다.",
        "위험으로 멈춘 고객 이슈에는 intake가 고객이 보지 않는 내부 project에 손잡이 ticket을 만들고, 그 뒤의 label은 끝까지 손잡이에 간다. controller는 label을 쓸 때마다 레코드에서 자리를 다시 읽는다(실행 중에 손잡이가 생길 수 있다). 멈춘 이유는 손잡이와 결과 패키지에만 쓴다.",
        "workflow는 ticket을 만들지 않는다. 실행 중 worker · guard의 위험 고지가 손잡이 없는 고객 레코드에서 나면 intake에 위험 고지 사건(risk-raised)을 보낸다. intake는 그 dispatch가 지금 것이고 진행 중일 때만 손잡이를 확보하고 위험 label을 둔다(레코드 상태는 그대로, 해제는 손잡이에서). 켜는 것은 workflow 쪽 표지 하나이고 기본은 꺼짐이다. 꺼져 있으면 label 없이 내부 알림과 결과 맨 위 줄로 처리한다."
      ] },

      { h: "17. 시험 세트와 대조" },
      { ul: [
        "해석 36 · 한 바퀴 46 · dry replay 6. 고객 트랙(고객 버그 · 고객 성능 · 손잡이 ticket · 실행 중 위험 고지), 원인이 둘인 regression, 사슬 인스턴스, 구현 link의 block 범위, 블록 sign-off(RTL freeze에서 not-ready), QoR 추세 · covergroup 수정 · formal이 증명한 도달 불가 사례가 들어 있다.",
        "intake 명세와의 대조 325항목이 모두 맞는다(ask phase · 사슬 조립 · 고객 사례 짝 · label 자리 · 사건 셋 · 수치 feed).",
        "workflow를 고칠 때 dry replay로 과거 accept 기록의 판정이 어떻게 바뀌는지 본다(§8)."
      ] },
      { h: "18. 모델 등급과 세션" },
      { note: "카드의 '모델 등급과 세션' 상자에 있다. 등급 셋(가벼운 · 표준 · 강한)과 LLM 없음, 내리지 않는 자리, 올리기는 즉시 · 내리기는 비교 기록 + 정본 회의, 산출물 하나 = 세션 하나." }
    ]
  },
  { id: "chain",   badge: "정본 · 일부 가정",
    title: "chain — 아키텍처부터 검증까지 이어지는 사슬",
    excluded: "L6 통합 · regression에서 \"왜 실패했나\"를 찾는 일은 이 갈래가 아니라 diagnose 갈래의 일이다. L6은 실패를 기록하고, 원인 찾기는 사람이 요청한다. diagnose는 module trace로 첫 불일치 경계를 찾는다.",
    body: [
      { h: "0. 한 장" },
      { code: " L1 요구·feasibility ─[착수]─▶ L2 아키텍처 ─[아키텍처 선택]─┬─▶ L3 spec (기계가 읽는 형태) ────────┐\n                                                         └─▶ L3m C-model (oracle · module trace) ─┤\n                                                                         [interface freeze]       │\n                                   ┌──────────────────────────────────────────────────────────┘\n                                   ├─▶ L4 RTL ──────────────┐\n                                   └─▶ L5 검증 (RTL 블라인드) ─┴─[검수]─▶ L6 통합·regression ─[검수]─▶ L7 sign-off 준비 ─[sign-off]" },
      { ul: [
        "사슬은 카테고리가 아니다. 사슬 template 하나와 link 카테고리 여럿이다.",
        "한 번에 다 열지 않는다. 첫 link만 열고, 다음 link는 사람의 결정(on-decision)이나 검수 accept(on-accept)로 열린다. 합류 link(L6)는 들어오는 간선이 모두 채워졌을 때 한 번 열린다.",
        "link 하나만 요구하는 ticket(\"block Y RTL 구현, spec 있음\")은 사슬 없이 그 link의 workflow 단독으로 간다."
      ] },
      { h: "1. link 표" },
      { table: { head: ["link", "작업 모양", "AI가 하는 일", "사람이 결정하는 것", "다음으로 넘기는 것"], rows: [
        ["L1 요구 · feasibility", "결정 자료형", "표준 문서 · 고객 요구에서 요구 목록, 영향 block 후보, 비용 근거표", "착수", "요구 목록(항목마다 id)"],
        ["L2 아키텍처", "결정 자료형", "대안 비교(latency · area · memory 영향), block 분할, 자원 예산", "아키텍처 선택", "선택안 · block 분할 · 자원 예산"],
        ["L3 spec", "작성형", "interface 표 · register map · 시퀀스 · 성능 예산표를 기계가 읽는 형태로, 거기서 assertion 골격 생성", "interface freeze(L3m과 함께)", "spec · spec assertion"],
        ["L3m C-model", "수정형", "상위 model 반영 확인, exactness oracle model 수정, module function-level trace model 수정", "interface freeze(L3와 함께)", "oracle model · module trace model · trace 형식"],
        ["L4 RTL", "수정형", "block 구현, lint, spec assertion 통과, module trace와 bit-to-bit 대조", "검수", "RTL"],
        ["L5 검증", "수정형", "RTL을 읽지 않고 spec · C-model로 TB · test · coverage 목표", "test plan 승인, 검수", "TB · test · coverage 목표"],
        ["L6 통합 · regression", "수정형", "합쳐서 regression. 실패는 기록하고, 원인 찾기는 사람이 요청한다(diagnose 갈래로)", "검수", "결과표 · 실패 묶음"],
        ["L7 sign-off 준비", "판정형", "보고서 취합, 미결 목록, spec · RTL · C-model 정합성 검사", "sign-off", "사슬 요약"]
      ]}},
      { note: "link의 이름과 개수는 과거 일감으로 검증할 예정이다. 특화 workflow가 아직 없는 link는 작업 모양(결정 자료형 · 작성형 · 수정형 · 판정형)의 기본 채움으로 돈다." },
      { h: "2. C-model의 세 층과 oracle" },
      { table: { head: ["층", "무엇", "사슬에서의 쓰임"], rows: [
        ["상위 model", "encoder는 algorithm model, decoder는 golden model(표준 기준)", "L1 · L2의 기준. 새 기능이 상위 model에 먼저 들어가 있어야 L2가 대안을 비교할 수 있다"],
        ["exactness oracle model", "출력이 bit-exact인지 판정하는 C-model", "L5 · L6의 출력 비교 기준"],
        ["module function-level trace model", "module마다 function 단위로 trace를 내는 C-model", "module 경계의 bit-to-bit 대조. L4의 block 단위 확인, L5의 module 단위 checker, diagnose의 경계 관측"]
      ]}},
      { ul: [
        "L3m은 L3와 나란히 간다. block 분할(L2)이 정해지면 module trace model의 경계도 정해진다. trace 형식(어느 경계에서, 어떤 필드를, 어떤 순서로)은 spec의 일부로 함께 freeze된다.",
        "상위 model이 아직 새 기능을 담지 않았으면 L1의 비용 근거표에 그 일을 적고, 상위 model 작업은 사슬 밖의 선행 일감(알고리즘 담당)으로 둔다.",
        "(가정 · 교정 대기) encoder와 decoder는 oracle의 성격이 다르다. decoder는 표준이 출력을 정하므로 golden model과의 bit-exact가 판정 기준이다. encoder는 출력이 구현 선택에 따라 달라질 수 있으므로 HW 동작을 그대로 옮긴 oracle model과의 bit-exact가 판정 기준이고, 표준 적합성은 golden decoder로 다시 확인한다.",
        "module trace model이 없는 module은 L5가 출력 비교만 하고, 그 사실을 coverage 목표의 빈칸으로 적는다."
      ] },
      { h: "3. 원칙 다섯" },
      { ul: [
        "spec-derived oracle. 앞 link가 검증 가능한 산출물(spec assertion · oracle model · module trace)을 만들고, 뒤 link는 그것을 oracle로 쓴다. 뒤 link가 스스로 정답을 만들지 않는다.",
        "검증 독립성. L4와 L5는 다른 세션이다. L5는 RTL을 읽지 않는다(coverage hole 분석 checkpoint에서만 예외). 공유 입력은 spec과 C-model뿐이다. 설계와 검증이 같은 추론에서 나오지 않게 하려는 것이다.",
        "사슬 = 의존 그래프. 사슬 template은 정본 자산(`core/chains/CH-<id>.md`)이고, 형식은 workflow agent 명세의 조립 계약을 따른다.",
        "spec 변경 = 사슬 재plan. interface freeze 뒤에 spec이 바뀌면 L3 · L3m으로 되돌아가 다시 freeze하고, 영향받는 L4 · L5만 다시 연다. 영향 범위는 spec 항목 id와 block 분할로 계산한다.",
        "사람 결정 넷. 착수 · 아키텍처 선택 · interface freeze · sign-off는 AI가 대신하지 않는다. AI는 결정 자료만 만든다."
      ] },
      { h: "4. ticket 매핑" },
      { ul: [
        "epic = 사슬 인스턴스, child ticket = link.",
        "첫 link만 child로 열고, 다음 link는 간선이 채워질 때 연다. 열린 link의 child ticket이 그때 생긴다.",
        "사슬 요약(결정 기록 넷 + link별 근거표)은 epic에 남는다."
      ] },
      { h: "5. 가상 사례: 디코더 IP에 새 in-loop filter mode 추가" },
      { table: { head: ["link", "일어나는 일"], rows: [
        ["L1", "표준 문서의 해당 절과 고객 요구에서 요구 목록을 뽑는다. golden model에 새 mode가 이미 있는지 확인하고, 있으면 그 revision을 요구 목록에 적는다. 영향 block 후보는 filter와 line buffer다. 담당 리더가 착수를 결정한다."],
        ["L2", "대안 둘(기존 filter pipeline 확장, 별도 stage 추가)을 latency · area · line buffer 영향으로 비교한다. 아키텍트가 선택한다."],
        ["L3 ∥ L3m", "L3는 새 register 필드와 filter stage 사이 interface를 기계가 읽는 형태로 쓰고 assertion 골격을 만든다. L3m은 exactness oracle model에 새 mode를 넣고, filter module의 trace model에 새 경로를 더하며, trace 경계를 spec에 적는다. 둘이 함께 interface freeze된다."],
        ["L4 ∥ L5", "L4는 filter block을 구현하고 module trace와 bit-to-bit 대조로 확인한다. L5는 RTL을 보지 않고 spec과 oracle model로 test(새 mode 조합)와 coverage 목표를 만든다."],
        ["L6", "regression에서 새 mode의 특정 크기 조합이 실패한다. 실패 묶음이 결과표에 적히고, 원인 찾기는 담당이 요청해 diagnose 갈래로 간다. diagnose는 module trace로 첫 불일치 경계를 찾는다."],
        ["freeze 뒤 변경", "고객 요구로 register 필드 하나가 바뀌면 L3 · L3m을 다시 freeze하고, 그 필드를 쓰는 L4 block과 L5 test만 다시 연다."],
        ["L7", "보고서와 미결 목록을 취합하고 spec · RTL · C-model의 정합성을 검사한다. 책임자가 sign-off한다."]
      ]}},
      { h: "6. 기본값과 상태" },
      { table: { head: ["항목", "기본값", "결정 주체", "상태"], rows: [
        ["link 표와 사람 결정 넷", "표대로, 이름 · 개수는 과거 일감으로 검증", "설계 리더", "확정 · 이름과 개수는 검증 예정"],
        ["검증 독립성", "세션 분리 + L5는 RTL을 읽지 않음", "검증 리더", "확정"],
        ["spec 변경 규칙", "L3 · L3m 재freeze, 영향받는 L4 · L5만 다시", "설계 리더", "확정"],
        ["C-model link(L3m)", "L3와 나란히, interface freeze를 함께", "설계 리더 · C-model 담당", "확정(C-model 세 층 반영)"],
        ["encoder/decoder oracle 구분", "decoder = golden과 bit-exact, encoder = HW 동작 oracle model과 bit-exact + golden decoder로 적합성", "C-model 담당", "가정 · 교정 대기"],
        ["module trace model이 없는 module", "출력 비교만, coverage 빈칸으로 기록", "검증 리더", "기본값"],
        ["사슬 template 정본", "`core/chains/`", "정본 승인자", "기본값"],
        ["먼저 AI에 맡길 link", "L5 TB 골격 · test 생성 먼저, L4 lint · assertion 둘째", "팀 리더", "기본값"]
      ]}}
    ]
  },
  { id: "diagnose",   badge: "정본 · 일부 가정",
    title: "diagnose — 원인 찾기 갈래",
    excluded: "원인을 찾은 뒤의 수정은 이 갈래가 하지 않는다. 버그 수정처럼 원인과 수정을 함께 덮는 workflow면 같은 task의 다음 phase로, 요청자가 수정도 요청했으면 후속 요청으로 간다. 서버 · license · disk 같은 환경 실패는 범위 밖이라 운영 담당에 넘기고 여기까지의 결과로 마감한다.",
    body: [
      { h: "1. 순서" },
      { code: " 층 판별 ──▶ 재현 ──▶ 가설 표 ──▶ 좁히기 ──▶ 확인(before/after) ──▶ 끝(층마다 다름) ──▶ Track B\n (질문 · 자동 multi-test)                     (싼 것부터)                                 (어느 질문 · test가 갈랐나)" },
      { ul: [
        "재현: 같은 입력(revision · seed · 설정 · 환경)으로. 재현되지 않으면 결과가 갈리는지 본다(갈리면 불안정). 상대 환경의 재현은 상대 조건을 흉내 낸 우리 환경에서 한다.",
        "가설 표: 가설 · 예측(맞다면 무엇이 보여야 하나) · 가르는 실험 · 결과 · 판정. 세션이 바뀌어도 이 표로 이어 간다. 가설은 변경 구간의 diff → trace 첫 불일치 경계 → 과거 bug 패턴 → 실패 묶음의 공통점 순으로 만든다.",
        "좁히기는 싼 것부터: 변경 구간 bisect → seed · 설정 변주 → module trace 첫 불일치 → 경계 안 신호의 텍스트 trace. module trace model이 있으면 RTL 쪽에도 같은 형식의 trace dump를 넣어 텍스트로 대조한다. waveform은 사람이 볼 때만 쓴다.",
        "확인: 원인으로 지목한 변경을 되돌리거나 고정한 scratch에서 증상이 사라지고 원래에서 다시 나타나야 확인이다. 또는 최소 재현.",
        "여러 원인: 하나를 되돌려도 증상이 남으면 남은 불일치의 첫 경계에서 다음 가설을 세운다. 원인마다 before/after와 보고를 따로 낸다."
      ] },
      { h: "2. 층 열 (확정 · 실무에서 조정)" },
      { table: { head: ["층", "재현 수단", "oracle", "좁히는 도구", "끝"], rows: [
        ["문서", "문서의 해당 절과 사용자의 적용을 나란히", "코드 · spec(정본)", "문서와 코드의 항목 대조", "문서 보강 · 수정 이슈, 회신"],
        ["이해", "질문을 문서 · KB로 답해 봄", "문서 · KB의 근거", "근거 위치 찾기", "회신 + FAQ 축적"],
        ["환경", "상대 환경의 조건을 우리 쪽에서 흉내", "우리 환경의 정상 결과", "조건 하나씩 바꿔 차이 찾기", "회신(차이와 맞추는 법) + 환경 요구 보강"],
        ["TB", "같은 입력으로 checker 판정을 따로 계산", "C-model · spec", "checker 기대값 계산 경로 trace", "TB 수정 이슈"],
        ["C-model", "같은 입력으로 C-model 두 층 비교", "상위 model · 표준", "module trace 경계에서 model끼리 대조", "C-model 수정 이슈"],
        ["spec", "해석이 갈리는 문장의 두 해석 결과 비교", "사람의 결정", "해석별 영향 범위", "결정 자료 → spec 갱신"],
        ["도구", "같은 입력을 도구 두 버전 · 두 종류로", "다른 도구 · 이전 버전의 결과", "버전 bisect, 최소 예제", "도구 담당에 넘기고 마감, 회피책 기록"],
        ["RTL", "같은 revision · seed · 설정으로 simulation", "oracle model · module trace · spec assertion", "변경 구간 bisect → trace 첫 불일치 → 경계 안 신호", "원인 보고 → 수정(요청 시)"],
        ["FW", "driver · firmware를 붙인 co-sim 또는 FPGA", "문서의 설정 순서 · register 정의", "register 접근 log, 설정 순서 trace", "FW 수정 이슈 또는 문서 정합"],
        ["구현 결과", "같은 script · constraint · library로 합성 · STA · GLS", "이전 결과 · 목표표 · RTL simulation", "경로 · 변경 구간 대조, RTL과 GLS 경계 대조", "개선 이슈 · constraint 확인 · 회신"]
      ]}},
      { note: "불안정은 층이 아니라 상태다. 같은 입력으로 결과가 갈리면(race · 초기화되지 않은 값 · X 전파 · 환경 요동) 원인 찾기를 멈추고 안정화 일감으로 넘긴다. 반복 횟수는 공란(검증 리더)." },
      { h: "3. 층을 가르는 법" },
      { ul: [
        "내부 이슈: 재현 조건을 대조해 가른다. 우리 regression에서 같은 입력으로 재현되면 TB · C-model · RTL · 구현 결과 가운데서 좁히되, oracle 쪽(TB · C-model)이 틀렸을 가능성을 먼저 지운다. 특정 환경(통합 · co-sim · FPGA)에서만 생기면 환경 · FW · interface 가정부터. 도구 · 버전이 바뀐 뒤에만 생기면 도구부터.",
        "고객 이슈: 처음 설명으로 층이 정해지지 않으면 범위 좁히기 질문을 보내고, 동시에 자동 multi-test를 돌린다. 질문은 후보 층을 가르는 정보만, 받은 자료에서 읽을 수 있는 것은 묻지 않고, 한 번에 묶어, 질문마다 왜 묻는지 한 줄."
      ] },
      { table: { head: ["업무 가족", "기본 질문 묶음 (가정)"], rows: [
        ["기능 불일치", "쓰는 릴리즈, register 설정 값과 순서, 입력 조건, 환경(simulation · FPGA · 실리콘), 재현 빈도"],
        ["interface · 통합", "clock · reset 구성, bus 설정(outstanding · burst · QoS), memory 구성과 latency, interrupt 처리 방식"],
        ["성능", "측정 조건(해상도 · 입력 종류 · 설정), clock, memory 대역과 latency, 측정 방법"],
        ["구현 결과", "도구와 버전, library · corner, constraint, log 전문"],
        ["power", "측정 조건, 활동률 가정, gating 설정, 측정 방법"],
        ["문서 정합", "참조한 문서와 판, 해당 절, 기대한 동작"]
      ]}},
      { table: { head: ["증상", "함께 돌리는 자동 multi-test (가정)", "가르는 층"], rows: [
        ["상대 환경에서만 출력 불일치", "상대 릴리즈로 우리 regression · 상대 설정 값으로 같은 입력 · 상대 memory latency 흉내 · 알려진 bug 대조", "환경 · 진짜 bug(알려짐 · 새것)"],
        ["성능 미달", "상대 조건으로 성능 test · 우리 기준 조건으로 같은 test · memory latency 변주", "환경(조건) · 설계"],
        ["가끔 hang", "같은 입력 반복 · timeout watchdog trace · handshake checker 켠 simulation", "불안정 · 설계 · 환경"],
        ["합성 warning · 목표 미달", "상대 도구 버전 · 우리 버전, 상대 constraint · 우리 constraint", "도구 · 환경(constraint) · 구현 결과"],
        ["설정 뒤 동작 이상", "문서 순서 · 상대 순서로 설정, register 접근 log", "문서 · 이해 · FW"]
      ]}},
      { note: "질문 묶음과 multi-test 묶음은 업무 가족 · 층별 정본 자산이고, Track B 기록으로 늘어난다. 어떤 질문 · test가 실제로 층을 갈랐는지가 기록의 핵심이다." },
      { h: "4. 실패 종류별 시작점 (가정)" },
      { table: { head: ["종류", "시작점"], rows: [
        ["새 실패(변경 구간 있음)", "구간 bisect"],
        ["오래된 실패(구간 없음)", "module trace 경계부터"],
        ["간헐 실패", "같은 입력 반복으로 불안정부터 가름"],
        ["묶음 실패(변경 하나가 여럿을 깨뜨림)", "intake의 실패 묶음 전체를 한 원인 후보로, member의 공통점부터"],
        ["환경 실패(server · license · disk)", "범위 밖: 운영 담당에 넘기고 여기까지의 결과로 마감"],
        ["릴리즈 사이 차이", "릴리즈 구간 bisect"],
        ["질문형(재현할 실패가 없음)", "층 판별만: 문서 · 이해 · spec에서 근거를 찾아 답. 근거가 없으면 문서 빈칸으로 기록"]
      ]}},
      { h: "5. 누가 여나 · 어느 workflow로" },
      { ul: [
        "도구 신호의 실패는 intake가 묶음으로 모으고, 원인 찾기 task는 사람이 요청할 때 연다. 같은 묶음이 되풀이되면 intake가 요청을 제안만 한다.",
        "사람의 요청(\"원인을 찾아 달라\")은 바로 연다. \"원인을 찾아 고쳐 달라\"면 원인과 수정을 함께 덮는 workflow(버그 수정 · timing)의 두 phase가 된다.",
        "고객 이슈는 고객 트랙이 연다. 진짜 bug로 판별되면 내부 이슈를 따로 열어 link한다(합치지 않는다).",
        "workflow: 버그 수정 · timing의 원인 phase가 이 방법을 따른다. regression 실패 원인 찾기는 전용 workflow 초안. 덮는 특화가 없으면 조사형 모양(재현 · 가설 표 · before/after 의무)의 기본 채움 + 층 표. 같은 일이 되풀이되면 특화 초안을 신설한다."
      ] },
      { h: "6. 가상 사례 셋" },
      { table: { head: ["사례", "흐름"], rows: [
        ["regression 새 실패", "야간 regression에서 test 여럿이 rev 101~104 사이에서 처음 실패 → intake가 한 묶음으로 → owner가 원인 찾기를 요청 → 층 판별: 우리 regression에서 재현되므로 TB · C-model · RTL 가운데 → checker 기대값을 C-model로 다시 계산해 oracle 쪽 오류를 지움 → 변경 구간 bisect로 rev 103 → module trace 첫 불일치 경계 → scratch에서 rev 103의 변경을 되돌리면 사라지고 원래에서 다시 나타남(확인) → 원인 보고. 수정은 요청이 있으면 다음 phase."],
        ["고객 환경에서만 출력 불일치", "고객: \"특정 입력에서 출력이 다르다, 우리 쪽 simulation에서만\" → 층 미정 → 질문 묶음(릴리즈 · 설정 값과 순서 · 입력 조건 · 환경 · 재현 빈도)을 한 번에 보내고, 동시에 multi-test(고객 릴리즈로 우리 regression · 고객 설정 값 · 고객 memory latency 흉내 · 알려진 bug 대조) → 고객 설정 값에서만 재현, 문서의 설정 순서와 다름 → 층 = 문서와 코드 불일치 → 답 초안 → 사람 승인 → 회신 + 어느 쪽이 맞는지 결정 → 문서 또는 코드 수정 이슈. Track B: 설정 순서 질문이 층을 갈랐다고 기록."],
        ["가끔 hang", "통합 환경에서 가끔 멈춤 → 같은 입력 반복으로 먼저 가름 → 결과가 갈림 → 층이 아니라 불안정 상태로 보고 안정화 일감으로 넘김(원인 찾기를 멈춤). 결과가 갈리지 않으면 timeout watchdog trace · handshake checker로 설계 · 환경을 가른다."]
      ]}},
      { h: "7. 상태" },
      { table: { head: ["항목", "상태"], rows: [
        ["층 판별 먼저", "확정"],
        ["층 열 표 · 질문 묶음 · multi-test 묶음 · 실패 종류별 시작점", "확정 · 실무에서 조정"],
        ["조사형 모양의 층 판별 자리, regression 원인 찾기 초안", "반영 대기(설계 쪽)"]
      ]}}
    ]
  },
  { id: "workmap",   badge: "정본 · 일부 가정",
    title: "업무 지도 — 일의 분류와 진단의 바탕",
    excluded: "업무 가족 열둘과 lifecycle 여덟 단계는 가상의 기본안이다. 실제 이름과 경계는 조직의 과거 일감과 기존 자산 목록으로 다시 정한다.",
    body: [
      { h: "1. 기존 자산 이식 (가장 먼저)" },
      { table: { head: ["종류", "예", "옮겨 가는 곳"], rows: [
        ["checklist", "설계 review · 검증 sign-off · 릴리즈 · 납품 checklist", "workflow의 checkpoint(참이어야 하는 것)"],
        ["검증 환경", "regression 묶음, testbench, C-model 비교 환경, coverage 수집 설정", "evaluator(결정론 도구), oracle"],
        ["확인 환경", "lint 규칙 묶음, CDC · RDC 검사, synthesis · STA script, equivalence check, power 분석", "evaluator, gate의 입력"],
        ["절차서", "bring-up 순서, FPGA test 절차, 릴리즈 절차, 고객 대응 절차", "workflow의 단계 순서와 사람 자리"],
        ["판정 기준", "waiver 규칙, 허용 warning 목록, 성능 목표표", "policy(숫자 공란, 결정 주체)"],
        ["기록 양식", "bug report · 고객 회신 · 결과 보고서 양식", "결과 패키지의 절 구성"]
      ]}},
      { ul: [
        "그대로 복사하지 않고 다시 쓴다. 항목 하나를 \"참이어야 하는 것\"과 \"확인하는 방법(사람 · script · evaluator)\"으로 나눈다.",
        "옮긴 checkpoint는 workflow가 상속하는 잠금 항목이다. AI용 조건은 그 위에만 붙는다. 자산이 없는 자리는 '기존 확인 없음'으로 표시한다.",
        "이식이 끝난 업무 가족부터 shadow를 시작한다. 끝나지 않은 가족은 AI가 초안까지만 한다."
      ] },
      { h: "2. 두 트랙" },
      { table: { head: ["트랙", "무엇", "끝"], rows: [
        ["Track A", "일 자체: 답 · patch · 원인 보고 · 결정 자료 · 고객 회신", "결과 패키지와 검수(고객 트랙이면 고객 확인)"],
        ["Track B", "그 일이 쓴 workflow의 기록: 쓴 workflow와 revision, 막힌 곳과 사람이 메운 곳, 평가, 개선 제안, revision 제안 또는 신설 초안", "workflow 원장 한 줄 + (있으면) 개선 · revision · 신설"]
      ]}},
      { ul: [
        "Track B 기록이 없으면 완료 선언을 할 수 없다. 사람이 직접 한 일도 같다.",
        "분류와 진단에도 Track B가 붙는다: 분류가 맞았는지, 질문이 범위를 실제로 좁혔는지, 자동 test가 후보를 갈랐는지가 기록되어 분류 규칙 · 질문 목록 · 진단 test 묶음을 고친다.",
        "같은 일이 정해진 횟수(공란) 넘게 'workflow 없음'으로 끝나면 신설이 의무가 된다."
      ] },
      { h: "3. 분류 축 다섯 (가정)" },
      { table: { head: ["축", "값", "무엇을 바꾸는가"], rows: [
        ["① 출처", "고객 · 내부(사람) · 내부(tool 신호) · 내부(사슬 · 후속)", "lifecycle과 완료 조건, 회신 규율"],
        ["② 요청 종류(ask)", "answer · change · diagnose · decide · notify · scheduled", "workflow의 작업 모양"],
        ["③ 업무 가족", "열둘(아래)", "쓰는 특화 workflow, 이식할 자산"],
        ["④ lifecycle 단계", "여덟(아래)", "그 단계의 기존 확인 · 다음 단계"],
        ["⑤ 층", "문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과", "진단의 첫 갈래, 끝의 모양"]
      ]}},
      { table: { head: ["업무 가족 (가정)", "대표 일", "주된 ask"], rows: [
        ["F1 이해 · 질문", "spec · 문서 · 동작에 대한 질문, 사용법", "answer"],
        ["F2 문서 정합", "문서와 코드 불일치, 설명 부족, 문서 보강", "diagnose → change"],
        ["F3 기능 불일치", "출력 · 동작이 기대와 다름", "diagnose → change"],
        ["F4 interface · 통합", "bus · clock · reset · interrupt · register · API, 통합 환경에서만 생기는 문제", "diagnose · answer"],
        ["F5 성능", "throughput · latency · bandwidth", "diagnose · answer · change"],
        ["F6 구현 결과", "frequency · area · SRAM 목록 · synthesis · PnR · lint log", "answer · diagnose"],
        ["F7 power", "소비 전력, 효율, clock gating", "answer · diagnose · change"],
        ["F8 PPA 최적화", "power · performance · area · frequency 균형", "decide → change"],
        ["F9 기능 추가", "새 feature, 고객 custom feature", "decide → change(사슬)"],
        ["F10 검증 지표", "coverage · regression 시간 · test 보강", "change · diagnose"],
        ["F11 환경 · 도구", "build · CI · license · 도구 버전 · simulator 차이", "diagnose"],
        ["F12 일정 · 대응", "일정 압박, 항의, 확인 요청, 진행 보고", "answer(사람 우선)"]
      ]}},
      { h: "4. 고객 트랙" },
      { code: "접수 → 범위 좁히기(질문) → 재현 · 자동 multi-test 진단 → 답 초안 → 사람 승인 → 회신 → 고객 확인 → 종료\n                                     └─ 진짜 bug → 내부 이슈 열기(link) → 수정 · 릴리즈 계획 → 회신에 반영" },
      { table: { head: ["고객 이슈의 층", "뜻", "끝"], rows: [
        ["설명 부족", "우리 문서의 설명이 모자람", "회신 + 문서 보강 이슈"],
        ["문서와 코드 불일치", "고객에게는 모순으로 보임", "회신 + 어느 쪽이 맞는지 결정 → 수정 이슈"],
        ["고객 이해도", "문서 · 코드는 충분함", "회신 + FAQ 축적"],
        ["제공된 설명을 보지 못함", "설명이 있는데 상식으로 적용함", "회신(그 설명의 위치) + 찾기 쉽게 하는 문서 개선 후보"],
        ["고객 환경 차이", "우리 환경에서는 정상, 고객 simulation · FPGA에서 문제", "회신(차이와 맞추는 방법) + 환경 요구 보강"],
        ["진짜 bug", "고객 조건으로 우리 쪽에서도 재현", "회신 + 내부 이슈 + errata 후보"]
      ]}},
      { ul: [
        "회신은 늘 사람이 승인한다. AI는 초안까지 쓴다.",
        "종료: 고객이 확인하면 종료. 답이 없으면 정한 기간(공란) 뒤 담당자가 종료를 선언한다.",
        "지표: 첫 회신 · 최종 회신까지의 시간, 재질문 횟수, 고객 확인 비율(목표값 공란).",
        "고객 표기는 별칭만 쓰고, 한 작업이 두 고객의 자료를 읽지 않는다."
      ] },
      { h: "5. 내부 lifecycle 여덟 단계 (가정)" },
      { code: "S1 spec · feature 학습 → S2 검증 환경 → S3 구현 → S4 검증 · 디버깅 → S5 각종 test → S6 합성 · 구현 → S7 상위 SW co-sim → S8 FPGA test" },
      { table: { head: ["단계", "생기는 상황 (예)", "진단의 첫 갈래", "workflow"], rows: [
        ["S1", "spec 해석이 둘로 갈림", "spec", "결정 자료형"],
        ["S2", "checker가 틀린 판정", "TB · C-model", "조사형"],
        ["S3", "spec assertion 발화", "RTL · spec · assertion", "조사형 → 버그 수정"],
        ["S4", "regression 새 실패 / 간헐 실패 / C-model과 bit 불일치", "RTL · TB · C-model / 불안정 / RTL · C-model", "조사형(diagnose)"],
        ["S5", "coverage hole / 성능 목표 미달", "stimulus · 도달 불가 조건 / 설계 · test 조건", "coverage / 조사형 → 결정 자료형"],
        ["S6", "timing 위반 / equivalence check 실패", "구현 결과 · RTL · constraint / 도구 · RTL", "timing / 조사형"],
        ["S7", "driver · firmware를 붙이면 hang", "FW · register 순서 · RTL", "조사형"],
        ["S8", "FPGA에서만 실패", "환경 · clock · memory model · RTL", "조사형"]
      ]}},
      { note: "chain의 link와의 관계: S1은 L1~L3의 앞, S2는 L5, S3는 L4, S4 · S5는 L5 · L6, S6은 L6과 L7 사이, S7 · S8은 L6 뒤의 통합 확인이다." },
      { h: "6. 상태" },
      { table: { head: ["항목", "상태"], rows: [
        ["기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개", "확정"],
        ["분류 축 다섯 · 업무 가족 열둘 · lifecycle 여덟 단계", "확정 · 실무에서 조정"],
        ["고객 이슈가 들어오는 경로 · 기존 자산의 위치와 담당", "회사에서 확인 예정"]
      ]}}
    ]
  },
  {"id": "timing", "badge": "정본 · 가정(위임, 실무에서 조정)", "title": "timing-area — 합성 결과의 timing · area 갈래", "lead": "정본 갈래 문서의 절을 옮겼다. 층 가르기(§2)는 카드의 그림에 있다. 규칙 상당수는 회사 실물을 보지 않고 정한 출발점이고, 실무에서 확인 · 결정 · 수정한다. 숫자는 공란이다.", "body": [{"h": "1. 일의 종류와 workflow 대응"}, {"table": {"head": ["일", "주된 입구", "ask", "workflow", "덮지 않는 부분과 그 처리"], "rows": [["합성 · STA의 timing 위반(새로 생김 · 악화)", "STA feed, 사람 요청", "diagnose(왜) · change(고쳐)", "WF-timing mode timing", "원인만이면 C2까지. 경계 path만 미달이면 constraint 담당 알림이 먼저"], ["area 증가 · area 목표 미달", "정기 합성의 변화, 사람 요청", "diagnose · change", "WF-timing mode area", "승자는 slack이 기준보다 나빠지지 않아야 한다"], ["sub-top 목표 달성 확인과 fmax", "정기 계기, 사람 요청, milestone", "answer · diagnose", "WF-syn-subtop-fmax", "개선 방법은 내지 않는다"], ["고객 레포트용 조건 표", "사람 요청, 정기", "answer · scheduled", "WF-syn-matrix", "밖으로 내는 값은 사람이 확정하고 보낸다"], ["module의 성능 · 면적 적절성", "RTL review pipeline", "answer · diagnose", "WF-rtl-perf-area-review", "모드는 사람이 고른다. 개선은 판단과 plan"], ["어느 submodule을 고칠지, PPA 균형", "리뷰 결과, 고객(F8)", "decide", "판단과 plan(WF-improvement-plan), 그 밖은 결정 자료형 모양(AR-decide)의 기본 채움", "결정 뒤 WF-timing이 후속 요청(on-decision)으로 열린다"], ["constraint 변경 리뷰(예외 추가 · clock 정의 변경)", "사람 요청, MR", "answer", "특화 없음 → 판정형 one-off(AR-assess 기본 채움 + constraint-check 전후 비교)", "constraint 소유가 RTL 조직으로 정해지고 되풀이되면 특화 초안 신설"], ["equivalence check 실패, GLS 불일치", "도구 신호, 사람 요청", "diagnose", "조사형 one-off(원인 찾기 갈래의 구현 결과 층)", "되풀이되면 특화 초안"], ["power 감축", "사람 요청, 고객(F7)", "change", "WF-timing을 이웃으로 빌림(부록 checkpoint가 power 추정으로 승자 선택)", "되풀이되면 power 특화 신설 의무"], ["고객의 \"목표 frequency를 못 맞춘다\"", "고객 입구", "diagnose → answer", "고객 트랙 덧붙임 + multi-test 묶음 mt.synth-warning-target", "진짜 문제면 내부 이슈를 따로 열어 link"], ["netlist ECO, hold 수정", "", "", "범위 밖", "소관을 회사에서 정한 뒤 ECO 특화(수정형, 대상 netlist)를 둘 수 있다"]]}}, {"ul": ["원인과 수정의 경계. \"왜 나빠졌는지\"만 물으면 WF-timing은 원인 phase(C1 기준 재현, C7 constraint 건전성, C2 원인 분석)까지 돌고 path 분석 보고로 끝난다. 원인이 constraint로 판정되면 수정 phase로 넘어가지 않고 constraint 담당에게 알린다.", "판정과 개선의 연결. sub-top 합성의 timing_groups(submodule별 critical path 묶음)와 area_breakdown이 판단과 plan의 근거다. 같은 revision의 묶음이 있으면 WF-timing의 C1 · C2는 그것을 읽어 출발점으로 삼는다(다시 재지 않는 것이 아니라, 무엇부터 볼지 정하는 데 쓴다)."]}, {"h": "3. 억제 기록: false path · multicycle · waiver"}, {"p": "합성 예외는 assess.waiver-lifecycle의 세 종류 가운데 하나(constraint-exception)이고, lint waiver · coverage exclusion과 같은 수명 규칙을 쓴다. 이 갈래에서의 운용은 다음과 같다."}, {"table": {"head": ["질문", "기본 운용"], "rows": [["정본은 어디인가", "review ledger의 억제 항목(예외 근거 기록의 줄). constraint 파일의 예외는 그 내보내기이거나 맞춰 볼 대상이다(어느 쪽인지는 CAD · flow 담당이 정함)"], ["누가 쓰나", "사람만 MR로 쓴다. 근거 · 소유 역할 · 승인 · 만료 조건은 사람 칸이다. 시스템은 새 예외 · 재확인 · 고아 정리를 결과 패키지의 반영 후보로만 낸다"], ["누가 승인하나", "기본안: 동료 확인(tier1), 설계 리더(tier2). 어떤 예외가 tier2인지(예: milestone 뒤 새 예외, 넓은 범위를 덮는 예외)는 공란(설계 리더)"], ["RTL이 바뀌면", "시작 · 끝 지점의 RTL 구문 hash가 승인 때와 다르면 재확인 필요. 기본 suspend: constraint는 그대로 적용되지만 그 예외가 덮는 path의 met은 \"조건부 met\"이 되고, WF-timing은 그 path에 후보를 만들지 않는다. 팀이 warn으로 바꾸면 표시만 한다"], ["맞는 path가 없으면", "완료된 constraint 검사가 같은 조건으로 돌았는데 0이면 고아. 판정은 바꾸지 않고 정리 제안"], ["기록이 없으면", "constraint에는 있는데 근거 기록이 없는 예외는 \"기록 없음\" 지적(S2, 합성 단위마다 묶음 하나)"], ["RTL과 맞나", "multicycle은 enable · hold 구조가 RTL에 있는가, false path는 두 끝이 같은 동작 시점에 쓰이지 않는가를 reviewer가 읽어 쓴다. 의견 등급이고 확인 필요(역할 = constraint 담당)로 낸다"], ["리뷰 대상인가", "그렇다. milestone 리뷰와 블록 sign-off에서 효과를 잃은 예외(제안 · 재확인 필요 · 만료)와 기록 없음은 0이어야 한다(assess.block-signoff suppressions)"], ["도입 때", "기존 예외와 그 주석 · 목록을 일괄 등록하고 기존 승인을 인정한다. 옮긴 자산이 바닥이다"]]}}, {"ul": ["예외를 더하자는 제안은 AI가 하지 않는다. 위반 path가 \"실제로는 false path 같다\"고 보이면 그 판단을 근거와 함께 constraint 담당 알림으로 낸다. 위반을 예외로 없애는 것은 개선이 아니다."]}, {"h": "4. 추세와 milestone"}, {"p": "정기로 보는 것. 정기 sub-top 합성(WF-syn-subtop-fmax, 정기 입구)이 추세의 원천이다. 주기와 대상 branch는 공란(합성 담당 리더 · 팀 리더)이다. 값은 QoR matrix에 쌓이고, 같은 칸 신원(sub-top · revision · recipe · library · corner · 숨은 축)의 이전 accept 칸과 비교한다."}, {"p": "어떤 변화가 일이 되나."}, {"table": {"head": ["변화", "입구", "처리"], "rows": [["met → 미달로 바뀜(지정 corner · mode 어느 칸이든)", "상태 변화", "변화 기준과 무관하게 일이다. ask = diagnose, 원인 찾기는 사람이 요청할 때 연다(diagnose_open on-request). owner digest 맨 위"], ["WNS · TNS · area가 기준 이상 변함", "정기 · STA feed", "기준(공란, 합성 담당 리더)을 넘으면 digest에 올리고 같은 처리. 넘지 않으면 기록만"], ["새 경고 종류(latch · multi-driven · 조합 loop · logic 삭제)", "정기", "지적(D:warn-*)으로 ledger. 일로 열지 않고 리뷰에서 본다"], ["예외가 재확인 필요 · 만료가 됨", "정기 · RTL 변경", "suppress 지적 + 승인 요청 묶음. 그 path의 met은 조건부"], ["library · constraint · recipe 버전이 바뀜", "상태 변화", "영향 칸이 낡음이 된다(campaign.stale-propagation). 다시 돌릴 칸 제안을 owner에게"], ["숨은 축이 바뀜", "(변화 아님)", "추세를 끊고 \"조건 바뀜\"으로 표시한다. 줄어든 것처럼 보이지 않게 한다"]]}}, {"p": "milestone. RTL freeze · release 같은 milestone에서는 sign-off corner · mode 목록 전부로 sub-top 합성을 돌리고(목록과 기준표는 설계 리더 · 합성 담당 리더), 블록 sign-off 판정(WF-block-signoff)이 그 칸을 timing 재료로 읽는다. 재료가 되는 것은 같은 revision의 accept된 칸뿐이다. WF-timing의 승자는 task branch의 결과라 QoR 칸이 아니다. merge 뒤 다음 정기 run이 칸을 갱신하고, milestone이 가까우면 그 revision으로 sub-top 합성을 명시 요청한다."}, {"h": "5. 보지 못한 것"}, {"p": "이 갈래가 기대는 선택 도구는 셋이다. 회사에 없으면 adapter가 status unavailable인 eval 파일을 남기고, 그 확인은 결과의 \"보지 못한 것: 도구 없음\"에 적힌다."}, {"table": {"head": ["선택 도구", "없으면 보지 못하는 것", "일상 run에서", "블록 sign-off에서"], "rows": [["constraint-check", "clock 정의 · unconstrained endpoint · IO delay · 예외 목록과 맞는 path 수(고아 판정 포함)", "met을 그대로 내되 \"constraint 건전성: 보지 못함\" 한 줄, GATE 줄에 보지 못한 확인 수. AI가 constraint 문서를 읽어 찾은 문제는 의견 등급 지적", "timing 재료는 판정 불가(풀 방법: 기존 STA의 constraint 점검 report를 evaluator로 등록하거나, 기준표가 그 확인을 참고 재료로 내림)"], ["lec-netlist", "RTL ↔ 합성 netlist 등가성", "기본 off. 등가 여부 = 보지 않음", "기준표가 필수 재료로 넣었을 때만 판정 불가"], ["power-estimate", "power 추정(관측 지표)", "후보 비교표의 power 칸이 보지 못함. 순위에는 원래 쓰지 않으므로 승자는 그대로", "기준표가 넣었을 때만"]]}}, {"ul": ["보지 못한 확인은 통과로도 실패로도 바꾸지 않는다. GATE를 막는 것은 팀 리더가 gate_required에 올린 확인뿐이다.", "소관이 회사마다 다른 둘(constraint 소유, netlist 등가성)은 정해지기 전까지 지적과 알림만 내고 \"clean\"을 선언하지 않는다.", "범위 밖이라 늘 적는 것: hold(구현 단계), netlist ECO. sign-off corner · mode 목록이 없으면 \"기준 corner 하나만 봄\"도 늘 적는다."]}, {"h": "6. 사람이 정하는 자리"}, {"p": "AI는 다음을 하지 않는다. 필요하면 근거를 붙인 제안 · 알림 · 결정 자료까지 낸다."}, {"table": {"head": ["결정", "정하는 사람", "AI가 내는 것"], "rows": [["constraint 변경(clock 정의 · uncertainty · IO delay · 예외 추가와 삭제)", "constraint 담당(소유는 회사에서 정함)", "문제 path와 근거, 대안 설명"], ["예외 승인 · 재확인 · 철회", "설계 리더(tier2) 또는 동료(tier1)", "재확인 요청 묶음, 고아 정리 diff"], ["latency · interface를 바꾸는 후보(pipeline 추가 등) 채택", "설계 리더 · 아키텍트", "그 후보만 draft로"], ["구조 변경(병렬도 · memory 구성 · block 분할)", "아키텍트(필요하면 사슬의 결정으로)", "대안 비교표(결정 자료형)"], ["목표 주파수 · area budget 변경", "제품 · 설계 리더", "도달값과 목표의 차, 다음 후보"], ["진전 없음 뒤의 방향", "설계 리더", "도달값 · 시도한 후보 · 다음 후보"], ["netlist ECO 여부와 수행", "구현 담당(소관은 회사에서 정함)", "범위 밖 알림"], ["유도 규칙 승인, 고객에게 낼 QoR 값과 종류", "규칙 승인자, 제품 · 영업 리더", "유도값 표시, 보기 초안"], ["블록 sign-off", "기준표의 책임자", "준비됨 · 미충족 · 판정 불가와 미결 목록"]]}}, {"h": "7. 학습(Track B)"}, {"p": "다음을 task마다 기록하고 정기적으로 모으면, 다음 일이 빨라진다."}, {"ul": ["층 판별 결과의 분포. 어느 하위 층이 실제 원인이었나, 어느 확인이 층을 갈랐나. 분포가 쏠리면 C1의 첫 갈래 순서를 바꾼다.", "path 계열별 잘 된 방법. retiming · 논리 단순화 · pipeline 가운데 무엇이 어떤 path 계열에서 목표에 닿았나. WF-timing 경로 힌트의 순서와 병렬 후보 수의 근거가 된다.", "constraint 문제가 되풀이되는 합성 단위. constraint 담당과 정리할 안건 후보로 모은다.", "억제 기록의 부담. 재확인 필요가 RTL 수정마다 몇 건 생기고, 재승인까지 얼마나 걸리나. suspend와 warn 사이 조정의 근거다.", "비교 실수. 숨은 축이 달라서 생긴 거짓 악화 · 거짓 개선. 숨은 축 가운데 필수로 고정할 것의 근거다.", "흔들림과 유도 오차. 같은 조건에서 흔들린 단위, 유도값과 나중 실측의 차이. 탐색 정의와 유도 규칙 보정의 근거다.", "분류되지 않은 경고 문형. \"기타\"로 센 합성 경고의 문형을 분류 표 보강 제안으로.", "one-off의 되풀이. constraint 변경 리뷰 · equivalence 실패 원인 · power 감축이 one-off로 몇 번 끝났나. 기준(공란, 정본 승인자)을 넘으면 특화 초안 신설 의무다."]}, {"h": "8. 기본값"}, {"p": "모두 출발점이며 실무에서 조정한다."}, {"table": {"head": ["항목", "기본값", "결정 주체"], "rows": [["timing 위반의 층 판별 순서", "측정 → constraint → 합성 설정 → library · corner · 도구 → RTL", "설계 리더"], ["met → 미달 전이", "변화 기준과 무관하게 일(diagnose), 원인 찾기는 사람 요청 시", "팀 리더"], ["WNS · TNS · area 변화 기준", "공란", "합성 담당 리더"], ["정기 sub-top 합성의 주기 · 대상 branch", "공란", "합성 담당 리더 · 팀 리더"], ["숨은 축이 다른 run의 비교", "하지 않음, 추세는 \"조건 바뀜\"으로 끊음", "합성 담당 리더"], ["예외의 RTL 변경 시 동작", "suspend(met은 조건부, 후보 만들지 않음)", "설계 리더"], ["예외 tier2 범위", "공란", "설계 리더"], ["constraint-check가 없을 때 블록 sign-off의 timing 재료", "판정 불가(풀 방법 제시)", "설계 리더"], ["lec-netlist", "off(등가 여부 = 보지 않음)", "팀 리더 · 합성 담당 리더"], ["power", "관측 지표, 순위에 쓰지 않음", "팀 리더"], ["constraint 변경 리뷰", "판정형 one-off", "정본 승인자"], ["hold · netlist ECO", "범위 밖", "팀 리더"], ["흔들림 판별의 반복 횟수", "공란", "합성 담당 리더"]]}}]},
  {"id": "coverage", "badge": "정본 · 가정(위임, 실무에서 조정)", "title": "coverage — hole에서 closure까지", "lead": "정본 갈래 문서의 절을 옮겼다. 규칙 상당수는 회사 실물을 보지 않고 정한 출발점이고, 실무에서 확인 · 결정 · 수정한다. 숫자는 공란이다.", "body": [{"h": "1. 일의 종류와 workflow 대응"}, {"p": "intake는 coverage에 관한 일을 업무 가족 \"검증 지표\"로 분류하고 ask(무엇을 원하는가)로 workflow를 고른다. 덮는 특화 workflow가 없으면 작업 모양의 기본 채움으로 진행하는 one-off가 되고, 같은 one-off가 되풀이되면 특화 초안을 신설한다."}, {"table": {"head": ["일", "ask", "덮는 workflow", "비고"], "rows": [["hole 채우기(test 보강)", "change", "WF-coverage", "hole 정의가 필수 입력이다. 없으면 질문"], ["재발 방지 test", "change", "WF-coverage(부모 결함 입력)", "버그 수정 · 원인 찾기가 남긴 backlog가 들어온다. 결함을 되돌린 RTL에서 test가 실패해야 채택"], ["hole 분석만(왜 비었나, 채울 수 있나)", "answer · diagnose", "WF-rtl-verif-review(module 범위, closure off)", "hole 몇 개만 좁게 보면 조사형 one-off로 §2의 층 표를 따른다"], ["covergroup 추가 · 수정", "change", "WF-coverage(후보 종류 covergroup 수정, C3 · C8)", "분모가 바뀌므로 \"coverage 증가\"로 판정하지 않고 spec 근거 대조와 분모 바뀜 표시로 판정한다. 축소는 exclusion과 같은 승인 등급이고, 승인 전에는 줄어든 분모를 closure에 쓰지 않는다(§2.3)"], ["exclusion 리뷰(재확인 · 정리 · 승인 요청 묶음)", "answer", "WF-rtl-verif-review", "결과 B5가 수명 상태와 억제 기록 diff 하나를 낸다. 승인은 사람(§3)"], ["closure 판정", "answer", "WF-rtl-verif-review(closure = on)", "보통 RTL review의 milestone preset 안에서 돈다(§4)"], ["블록 sign-off의 coverage 부분", "answer", "WF-block-signoff", "같은 revision의 accept된 closure 판정을 재료로 읽을 뿐 다시 계산하지 않는다"], ["추세 관찰", "answer", "RTL review 정기 preset 안의 WF-rtl-verif-review", "이전 run 대비 종류별 변화 줄(§5)"], ["coverage 수치 악화의 원인 찾기", "diagnose", "조사형 one-off(AR-diagnose + §2)", "측정 환경 층부터 지운다. 되풀이되면 특화 초안 후보"], ["사슬 안의 검증 link(TB · test · coverage 목표)", "change", "기능 추가 사슬의 검증 link(사슬 갈래)", "검증 link는 RTL을 읽지 않는다. hole 분석 checkpoint에서만 예외"], ["test 검증력 측정(mutation)", "answer", "보류(§6)", "목록에만 둔다"]]}}, {"h": "2. hole을 층으로 가르는 법"}, {"note": "hole 층 표(층 여섯과 알아보는 법 · 끝)는 카드의 그림에 있다."}, {"h": "2.2 가르는 순서"}, {"ul": ["측정 환경을 먼저 지운다. DB revision · merge 정의 · test 결과 필터 · 돌지 않은 test를 본다. WF-coverage C1과 B의 C1이 이미 하는 일이며, 여기서 걸리면 그 hole은 아직 hole이 아니다.", "spec과 covergroup을 대조한다. bin이 가리키는 동작이 spec에 있는가, 값 범위 · 조합이 spec과 맞는가. 맞지 않으면 test가 아니라 coverage 모델의 문제다.", "도달 가능성을 근거와 함께 판정한다. 근거 등급은 formal 증명(도구 사실) > spec 절 · 설계 조건(문서) > 추론(의견)이다. formal이 도달 trace를 찾으면 LLM의 판정을 뒤집고 test 후보로 되돌린다. formal의 \"결론 없음\"은 근거가 아니다. formal 증명은 그 run이 쓴 constraint 아래의 사실이므로, constraint가 과하면 도달 불가가 거짓일 수 있다. constraint 버전을 근거에 함께 적는다.", "도달 가능하면 test 부족으로 본다. test 후보를 만들고, 채워졌는지(C4)와 동작을 확인하는지(C5)를 따로 판정한다.", "채워지지 않는 도달 가능 hole은 다시 가른다. 후보를 바꿔도 채워지지 않으면 formal 도달성(있으면)을 돌린다. 도달 불가가 증명되면 spec과 RTL이 어긋난 것이므로 RTL 결함 의심으로 원인 찾기 후속을 낸다. exclusion으로 덮지 않는다."]}, {"h": "2.3 covergroup을 고칠 때의 판정"}, {"p": "covergroup 수정은 분모를 바꾼다. bin을 지우면 coverage가 오르고, 이것은 채운 것이 아니다. 그래서 covergroup 수정의 oracle은 coverage 증가가 아니라 spec 근거 대조(수정한 bin · cross마다 spec 절과 값 범위)와 분모 바뀜 표시(추세 줄에서 늘어남과 따로 보임)다. bin을 지우거나 줄이는 수정은 exclusion과 같은 승인 등급을 요구하는 것을 기본안으로 둔다(결정: 검증 리더)."}, {"h": "3. exclusion(억제 기록)의 운용"}, {"p": "규칙의 정본은 policy assess.waiver-lifecycle 하나이고, waiver · 합성 예외와 같은 규칙을 쓴다. coverage 갈래에서 운용할 때의 요지는 다음과 같다."}, {"table": {"head": ["항목", "운용"], "rows": [["근거 필수", "exclusion 후보마다 맞추는 키(instance + 종류 + bin · 지점) · anchor 구문 hash · 이유 · 근거 등급(§2.2의 셋) · 요구 승인 등급이 있다. 근거가 추론뿐이면 후보는 낼 수 있지만 요구 승인 등급이 높다"], ["누가 승인하나", "tier1 = 작성자가 아닌 설계자 · 검증자 한 명, tier2 = 검증 리더. 어느 exclusion이 tier2인지(예: closure에 드는 것, milestone 뒤의 새 exclusion, 근거가 도구 사실이 아닌 것)는 공란이며 검증 리더가 정한다. 등급이 모자라면 제안 상태로 센다"], ["RTL이 바뀌면", "anchor 구문의 hash가 승인 때와 다르면 재확인 필요가 되고, 기본(suspend)에서는 분모에서 빼지 않는다. 사람이 같은 등급으로 다시 승인하면 유효로 돌아온다. 팀이 warn을 고르면 효과는 유지하고 지적만 낸다"], ["만료", "spec 변경이나 기능 비활성으로 낸 exclusion에는 만료 조건(milestone · revision)을 붙이는 것을 기본안으로 둔다. 기능이 다시 켜질 때 저절로 hole로 돌아오게 하기 위해서다"], ["고아", "완료된 run이 같은 coverage 모델로 돌았는데 맞는 bin이 0이면 고아다. 판정을 바꾸지 않고 정리 제안만 낸다"], ["기록 없음", "도구용 exclusion 파일에만 있고 억제 기록이 없는 exclusion은 효과는 그대로 두되 지적으로 낸다"], ["시스템이 하지 않는 것", "억제 기록의 사람 칸(이유 · 승인 · 만료 조건)을 쓰지 않는다. 새 exclusion · 재확인 · 정리는 결과 패키지의 반영 후보(억제 기록 diff 하나)로만 낸다"], ["도입", "팀의 기존 exclusion은 도입 때 억제 기록으로 일괄 등록하고 기존 승인을 인정한다. 옮긴 자산이 바닥이다"]]}}, {"h": "4. closure 판정과 sign-off"}, {"ul": ["closure는 검증 상태 리뷰의 판정 mode다. 입력 closure 판정 = on이면 종류별(line · branch · condition · toggle · FSM state · FSM transition · functional · assertion) coverage를 유효한 exclusion만 분모에서 뺀 뒤 목표 표와 비교한다. 목표 표의 값은 공란이며 검증 리더가 정한 정본(버전)에 있다. workflow는 위치만 가리킨다.", "언제 켜나. milestone(RTL freeze · release 등)에서 사람이 RTL review의 milestone preset으로 지정하거나, 정기 preset이 켜도록 정한다. 어느 milestone에 켤지는 검증 리더가 정한다.", "AI가 만드는 것은 판정 자료다. 종류별 충족 · 미충족(남은 bin · 지점 목록) · 목표 없음 · 판정 불가, 승인 대기 exclusion 수, 남은 bin마다 추가 제안 또는 exclusion 후보. closure를 받아들이는 것, 그리고 sign-off는 사람이다.", "보수적으로 센다. - 목표 표에 없는 종류는 \"목표 없음\"으로 표시할 뿐 충족으로 세지 않는다. - 실패 test가 merge되었거나 결과 필터를 모르면 closure는 판정 불가다. - test 목록에 있는데 돌지 않은 test(merge에 없음)는 보지 못한 것으로 적는다. 그 test가 덮기로 한 bin이 남아 있으면 그 종류는 판정 불가로 본다(기본안). - formal 도달성 같은 선택 도구가 없으면 그 근거는 unavailable(보지 못한 것)이고, 그 도구에만 기댄 exclusion 근거는 도구 사실로 세지 않는다. - closure 충족은 동작이 확인되었다는 뜻이 아니다. 관측 수단이 없는 동작은 closure와 별개로 지적(확인할 수 없음)으로 남는다.", "블록 sign-off와의 관계. 블록 sign-off 판정은 같은 revision의 accept된 closure 판정 결과를 재료 하나로 읽는다. closure 판정이 없거나 DB revision이 다르거나 실패 test가 merge되었으면 그 재료는 판정 불가이고, 풀 방법은 \"milestone preset으로 B를 closure on으로 돌린다\"이다. 기능 추가 사슬의 마지막 link(sign-off 준비)는 블록마다 accept된 sign-off 판정을 읽을 뿐이다."]}, {"h": "5. 추세와 regression 결과의 연결"}, {"p": "coverage 숫자의 변화가 일이 되는 길은 둘이고, 계기가 다르다."}, {"table": {"head": ["계기", "무엇을 보나", "언제 일이 되나", "비교 기준"], "rows": [["정기(RTL review 정기 preset의 B)", "이전 run 대비 instance별 · 종류별 변화 줄(줄어든 종류가 맨 앞, 분모 바뀜은 따로)", "줄어듦이 기준을 넘으면 지적(coverage 감소)으로 오른다. 기준은 공란(검증 리더)", "같은 merge 정의의 이전 accept run"], ["상태 변화(intake의 coverage 수치 feed)", "regression이 낸 coverage 값", "기준값보다 정한 폭 이상 나빠지면 실패처럼 다룬다. 폭은 공란(검증 리더 · 팀 리더)", "마지막 정상 상태의 기준값(사람이 수치 일을 닫으며 새로 정할 때만 바뀜)"]]}}, {"ul": ["분모가 바뀐 줄어듦은 hole이 아닐 수 있다. RTL에 코드가 늘었거나 covergroup이 바뀌었거나 exclusion이 효과를 잃은 경우다. 앞의 둘은 새 hole이 맞을 수 있고, 마지막은 재확인 요청이다. 추세 줄은 이 셋을 가려서 보인다.", "측정이 바뀐 줄어듦은 coverage 일이 아니다. merge 정의가 바뀌었거나, test가 돌지 않았거나(regression 중단 · 환경 실패), 도구 버전이 바뀐 경우다. §2의 측정 환경 층으로 마감하고 운영 쪽 후속을 낸다.", "같은 변화가 두 길로 두 번 일이 되지 않게 한다. intake의 수치 feed가 연 일이 열려 있으면 정기 run의 감소 지적은 그 일에 붙는다(기본안).", "regression 실패와의 관계. 실패한 test는 merge에 넣지 않으므로, regression 실패가 늘면 coverage가 함께 줄어든다. 이때 원인은 실패이고 hole이 아니다. 실패 묶음의 원인 찾기(WF-regr-diagnose)가 먼저이고, coverage 일은 실패가 풀린 뒤의 값으로 본다."]}, {"h": "6. mutation(test 검증력 측정): 보류"}, {"p": "mutation은 RTL에 일부러 작은 결함을 넣어 test가 그것을 잡는지로 검증 환경의 품질을 재는 방법이다. 지금은 보류이며 목록에만 둔다. 들어온다면 붙을 자리는 다음과 같다."}, {"ul": ["evaluator: 선택 도구 하나(결함을 넣은 사본에서 test를 돌리고 결함마다 잡힘 · 놓침 · 결론 없음을 내는 것). 없으면 보지 못한 것이다.", "검증 상태 리뷰의 관측 수단 대응: \"관측 수단이 있다\"를 LLM의 읽기(의견)에서 도구 사실로 올리는 근거가 된다.", "coverage 보강의 의미 없는 채우기 방지: WF-coverage C5의 \"부모 결함을 되돌린 RTL에서 test가 실패한다\"는 결함 하나짜리 mutation이다. mutation이 들어오면 부모 결함이 없는 hole에도 같은 확인을 쓸 수 있다.", "결정 주체와 도입 시점은 검증 리더 · 팀 리더가 정한다."]}, {"h": "7. 학습(Track B)"}, {"p": "모든 coverage 일의 Track B에 공통 칸(쓴 workflow · 막힌 곳 · 평가)에 더해 다음을 남긴다."}, {"table": {"head": ["남길 것", "어디에 쓰이나"], "rows": [["어느 test가 어느 hole을 닫았나(채움과 확인을 따로)", "비슷한 hole의 test 후보 출발점, 건드리기만 한 test 계열의 정리"], ["hole의 층(§2.1)과 층을 가른 근거", "층별 빈도 → 측정 환경 개선 · covergroup 리뷰의 필요"], ["어떤 exclusion이 되돌려졌나(formal trace로 도달 가능 판명 · 재확인에서 거절 · 철회 · 만료로 hole 복귀)", "근거 등급과 승인 등급의 기본안 조정. 추론 근거 exclusion이 자주 되돌려지면 등급을 올린다"], ["채워지지 않은 도달 가능 hole과 그 끝(RTL 결함 의심 포함)", "원인 찾기와의 연결, 과거 bug 패턴"], ["관측 수단이 없는 module · 동작", "검증 환경 개선 후보(checker · assertion 추가)"], ["판정 불가가 된 이유(merge · revision · 돌지 않은 test · 도구 없음)", "측정 환경 정비, milestone 전 준비 항목"], ["수치 신호 가운데 측정 환경으로 끝난 것", "intake 수치 feed의 기준 폭 조정"]]}}, {"h": "8. 기본값"}, {"p": "각 항목은 출발점이며 실무에서 조정한다."}, {"table": {"head": ["항목", "기본값", "결정 주체"], "rows": [["hole 층 판별 순서", "측정 환경 → spec · covergroup → 도달 가능성 → test 부족", "검증 리더"], ["도달 불가 근거 등급", "formal 증명 > spec 절 · 설계 조건 > 추론, formal 결론 없음은 근거 아님", "검증 리더"], ["exclusion 요구 승인 등급", "근거가 도구 사실이면 tier1, 아니면 tier2. tier2 대상 목록은 공란", "검증 리더"], ["RTL 변경 시 exclusion", "suspend(분모에서 빼지 않음), warn으로 바꿀 수 있음", "검증 리더"], ["spec 변경 · 기능 비활성 exclusion의 만료 조건", "붙이는 것을 기본으로", "검증 리더"], ["covergroup에서 bin을 지우거나 줄이는 수정", "exclusion과 같은 승인 등급", "검증 리더"], ["coverage merge", "통과한 test만", "검증 리더"], ["closure 종류별 목표", "공란(목표 표, 버전)", "검증 리더"], ["closure를 켜는 milestone", "공란", "검증 리더"], ["돌지 않은 test가 덮기로 한 bin이 남은 종류", "판정 불가", "검증 리더"], ["정기 추세의 감소 지적 기준", "공란", "검증 리더"], ["intake 수치 feed의 악화 폭 · 기준값", "공란, 기준값은 사람이 수치 일을 닫을 때만 갱신", "검증 리더 · 팀 리더"], ["수치 신호의 일", "두 길(정기 · feed)이 같은 변화면 하나로 붙음", "시스템 관리자"], ["채워지지 않는 도달 가능 hole", "formal(있으면) → 증명되면 원인 찾기 후속, exclusion 금지", "검증 리더"], ["mutation", "보류", "검증 리더 · 팀 리더"]]}}]},
  { id: "kb",   badge: "확정 · 확인 대기 셋",
    title: "KB agent system — 근거가 붙은 제품 지식",
    excluded: "이 페이지의 제품 · 고객 · 수치는 모두 가상이다(가상 제품 family VX, 가상 고객 NOVA 등). 회사 자료가 들어간 KB가 아니며, 실제 KB를 채우고 실험하는 일은 회사에서 한다.",
    body: [
      { h: "1. 질문 셋이 지나가는 길 (가상)" },
      { p: "(가) 신입 설계자가 \"blk_parse의 header FIFO 깊이는?\"이라고 묻는다. Librarian이 module 목록에서 그 module 문서를 연다. port · parameter 표는 코드에서 생성한 칸이라 코드 값 16이 있다. spec과의 열린 충돌(spec은 32)이 있어 답에 \"코드 16, spec 32, 담당이 판정 중\"을 충돌 표시와 함께 적는다. 인용은 문서 id와 원천 revision이다." },
      { p: "(나) 고객 권한이 있는 FAE가 \"이 고객이 쓰는 릴리즈에 AXI burst bug가 있나?\"라고 묻는다. Librarian이 그 고객의 납품 기록 → 지금 쓰는 릴리즈 → bug 문서의 fixed-in을 따라가 \"없다, 이전 납품에는 있었다\"를 답한다. 같은 질문을 고객 권한이 없는 사람이 하면 고객의 보유 릴리즈는 말하지 않고 '권한 밖' gap을 남긴다. 다른 고객의 존재는 어느 경우에도 드러나지 않는다." },
      { p: "(다) bug ticket이 종료된다(사건). event router가 Harvester를 부른다. Harvester는 ticket(전처리본)과 수정 commit을 읽어 bug 문서 초안을 쓴다. 고객은 별칭으로만 쓰고, 영향 릴리즈가 ticket에 없으면 commit과 tag로 계산해 (계산)으로 표시한다. 같은 commit으로 바뀐 module 문서의 확인 제안도 함께 낸다. 모두 MR이고, 담당이 판정하면 reviewed가 된다." },
      { h: "2. 부품: agent 다섯과 결정론 script" },
      { table: { head: ["부품", "하는 일"], rows: [
        ["모든 agent 공통", "고객 권한(없음 또는 고객 하나)을 입력으로 받고, 한 세션이 두 고객 폴더를 읽지 않는다. 원천은 읽기만, KB에는 MR로만 쓴다"],
        ["Surveyor", "제품 하나의 원천을 조사해 registry와 제품 이해 카드를 만든다. 사람에게는 찾지 못한 것만 짧게 묻는다"],
        ["Harvester", "원천에서 template대로 초안을 쓰고, 원천 사건마다 갱신 · 확인 제안을 낸다"],
        ["Curator", "MR 검수 요약, 충돌 · FAQ · 중복 · 은퇴 · gap 순위 정리"],
        ["Librarian", "KB만으로 인용이 붙은 답을 낸다. 답하지 못하면 gap을 남긴다"],
        ["Release recorder", "릴리즈 · 납품 기록, checklist 자동 판정, 동결 사본"],
        ["lint · 생성 · event router", "검사와 지도, 코드에서 만드는 칸, 사건 분배. 모두 결정론이다"]
      ] } },
      { h: "3. 큰 할 일 여섯 (회사에서 하는 일)" },
      { table: { head: ["큰 할 일", "의미"], rows: [
        ["1. 기존 문서화 AI와 결합해 1차 문서를 만든다", "이미 있는 과정을 대신하지 않고, 그 결과에 출처 · 판정 · 연결 · 신선도를 붙인다"],
        ["2. 믿음의 장치를 세운다", "lint CI, 확정 원장, 권한 · hook, agent · skill"],
        ["3. 원천을 KB에 잇는다", "코드 · 문서 저장소와 issue tracker에서 revision을 읽고, 고객 이름을 지우고, 릴리즈 포함 여부를 계산한다"],
        ["4. 릴리즈 축을 세운다", "릴리즈 · 납품 · errata · 합성 · 동반 자산(C-model · 검증 SW)이 \"어느 버전에서\"의 기준이 된다"],
        ["5. 요구 축을 세운다", "고객 제품마다의 계약을 원본으로 요구 → spec · module · 검증 · 릴리즈를 잇는다"],
        ["6. 살아 있게 하고 품질을 잰다", "사건 → 작업 → 지도의 고리, 실제 질문 표본으로 답하는 비율"]
      ] } },
      { note: "큰 할 일은 작업 요청 열둘로 나뉘어 있다. 작업 요청마다 왜 필요한지 · 만들 것 · 요구사항(필수와 기본안) · 끝났다고 보는 시험이 적혀 있다. 필수는 원칙에서 나온 것이라 바꾸지 않고, 기본안은 회사에서 사람과 상의해 바꿔도 된다." },
      { h: "4. 시험으로 확인한 것 (가상 제품)" },
      { table: { head: ["시험", "결과"], rows: [
        ["lint mutation(결함을 하나씩 넣어 잡는지)", "66건 전부 통과"],
        ["질의응답(명세만 준 Librarian)", "25건 전부 맞음, hard-zero 0(근거 없는 주장 · 누출 · 표시 누락)"],
        ["수집(명세만 준 Harvester)", "3건 전부 통과, 작업 공간 lint 오류 0, 고객 이름 0"],
        ["회사 구현용 정답 표(조상 관계 10 · 전처리 13 · router 15)", "38건 모순 0. 정답을 일부러 틀리게 바꾸면 모두 잡는다"],
        ["git 원천 adapter", "6건 전부 통과"],
        ["적대적 설계 검토", "명세만 읽은 검토자의 지적 15건을 반영한 뒤 위 시험을 다시 돌렸다"]
      ] } },
      { h: "5. 회사에서 세우는 순서" },
      { table: { head: ["단계", "무엇을"], rows: [
        ["0 준비", "본 KB 저장소와 고객 저장소, 규칙 설치, lint CI, 권한 · 전처리"],
        ["1 파일럿 bootstrap", "Surveyor가 registry · 카드, Release recorder가 과거 릴리즈 재구성, Harvester가 순서대로 초안, 문서 담당이 MR 판정"],
        ["2 살아 있게", "사건 hook(commit · ticket · 릴리즈), 매일 lint, 정기 정리, stale 줄이기"],
        ["3 쓰게", "사람이 kb-ask를 쓰고, intake · workflow · RTL review agent가 묻는다. 질문 표본으로 성적을 잰다"],
        ["4 넓히기", "다음 제품은 카드부터, 지도 순위대로, 정본 회의 정례화"]
      ] } },
      { h: "6. 가져가는 방식" },
      { ul: [
        "core 묶음과 별도인 zip 하나로 가져간다. 묶음을 만들 때 시험이 하나라도 실패하면 zip을 만들지 않는다.",
        "처음 여는 문서는 작업 요청 묶음의 안내(북극성 · 원칙 다섯 · 큰 할 일 여섯 · 회사에서 사람과 정할 것)다.",
        "회사의 Claude 세션은 먼저 원천(기존 문서화 자산 · 제품 저장소 목록)을 읽고, 정할 것을 가설 확인 시트로 만들어 도입 리더에게 한 번에 보인다. 빈 설문이 아니라 원천에서 읽은 가설 · 기본안 · 답이 바꾸는 것을 붙인다.",
        "고객 정보는 고객 저장소 · 전처리가 준비되고 보안 담당이 승인한 뒤에 다룬다. 그 전에는 본 KB가 고객을 다루지 않는다."
      ] },
      { h: "7. 회사에서 사람과 정할 것과 확인 대기" },
      { table: { head: ["무엇", "상태"], rows: [
        ["파일럿 제품과 작업 순서", "회사에서 정할 것"],
        ["기존 문서화 template과 KB 문서 종류 · 절 가운데 무엇을 정본으로 할지", "회사에서 정할 것"],
        ["고객 별칭 · 분류 코드 목록, 고객 정보를 여는 시점", "회사에서 정할 것(보안 담당과)"],
        ["숫자 기준(기한 · 상한 · 주기 · 표본 크기)과 판정 등급", "회사에서 정할 것(공란)"],
        ["고객 표기의 해석(별칭 + 고객 문서 분류 + 번호)", "확인 대기(기본안이 묶음에 있다)"],
        ["계약에서 가져올 범위(기술 요구 항목만, 상업 조건은 위치만)", "확인 대기(기본안이 묶음에 있다)"],
        ["기존 문서화 AI와의 분담(기존 과정 = 1차 생성, KB = 출처 · 판정 · 연결 · 신선도)", "확인 대기(기본안이 묶음에 있다)"]
      ] } }
    ]
  }
  ],


  /* ───────────── core 한 장 (그림 · 15초 애니메이션) ─────────────
     그림과 애니메이션은 media/core_map.html 한 파일에서 30_tools/render_media.mjs가 뽑는다. */
  mapOrder: ["core", "intake", "workflow", "chain", "diagnose", "timing", "coverage", "workmap", "atlas", "kb"],
  maps: {
  core: {
    tab: "core",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "AI에게 실무를 맡기려면 먼저 일이 지나갈 길이 있어야 합니다. 사람마다 제각각 AI를 쓰면 어디서 멈춰야 하는지 모르고, 배운 것도 쌓이지 않습니다. 우리는 이 길을 core라고 부릅니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "ticket, 도구 신호, backlog, 사람이 직접 부르는 command. 어디서 들어온 일이든 같은 아홉 단계를 지납니다. 위험하거나 정보가 부족한 일은 gate에서 멈추고 사람을 부릅니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "gate를 통과한 일은 AI가 sandbox 안에서 스스로 진행합니다. lint, simulation, 합성, LEC, coverage 같은 판정자가 checkpoint마다 결과를 확인하고, 사람은 검수와 반영, 두 자리에서만 결정합니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "검수 판정과 실행 기록은 learn 단계로 돌아가 규칙과 workflow를 고칩니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "그리고 이 core 위에 chain, timing-area, coverage, code-review 같은 주제가 workflow로 얹힙니다. 이제 부분별로 자세히 보겠습니다."},
      {"k": "tour", "view": [40, 230, 1000, 563], "box": [80, 244, 680, 265], "text": "첫째, 입구입니다. 일이 어디서 오든 공통 레코드로 받고, AI가 스스로 무슨 일인지 판정합니다. 이 분류는 사람에게 보고하려는 것이 아닙니다. AI가 이 일로 무엇을 해야 하는지 알기 위한 첫 사고 단계입니다."},
      {"k": "tour", "view": [380, 260, 800, 450], "box": [562, 352, 232, 270], "text": "gate는 다섯 조건을 순서대로 봅니다. 위험, 권한, 정보, 불확실, 작업량입니다. 하나라도 걸리면 그 조건에 맞는 방식으로 멈춥니다. 위험이면 실행 경로를 아예 만들지 않고, 정보가 부족하면 질문 초안을 남기고, 불확실하거나 일이 너무 크면 논의 자료를 만듭니다."},
      {"k": "tour", "view": [720, 230, 960, 540], "box": [820, 244, 410, 380], "text": "둘째, 본체인 workflow입니다. workflow는 해야 할 일의 목록이 아니라, 무엇이 참이어야 다음으로 가는지를 적은 checkpoint의 목록입니다. AI는 얼마나 스스로 할지, 곧 posture를 근거와 함께 정하고, checkpoint마다 결정론적 도구가 판정합니다. 막혀도 멈추지 않고, 질문을 남긴 채 할 수 있는 부분을 계속합니다."},
      {"k": "tour", "view": [1080, 230, 880, 495], "box": [1280, 240, 320, 380], "text": "셋째, 사람의 자리입니다. 사람은 결과 패키지 한 장을 보고 accept, accept-with-fix, reject 중 하나를 고르고, MR을 만들지, 회신할지, 보류할지를 정합니다. main으로 가는 MR, 고객 회신, ticket 상태 변경은 시스템이 하지 않습니다. reject된 일은 사람이 이어받고, 시스템은 다시 시도하지 않습니다."},
      {"k": "tour", "view": [200, 200, 1640, 922], "box": [380, 636, 1420, 58], "text": "넷째, 학습입니다. 모든 일은 생략 없이 학습 기록을 남깁니다. 자동 실행 기록과 검수 판정을 합쳐 무엇을 고칠지 제안하고, 개인 fork에는 바로, 정본에는 정기 회의를 거쳐 반영합니다. 너무 큰 개선은 backlog가 되어 같은 core를 다시 탑니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "왜 core가 먼저일까요. 네 가지입니다. 입구와 주제가 늘어도 모든 일이 같은 길을 지납니다. gate가 먼저 멈추고 판정자가 확인하고 사람이 결정하니, AI의 시도를 넓혀도 통제가 유지됩니다. 경험이 개인의 요령으로 흩어지지 않고 시스템에 쌓입니다. 그리고 새 주제가 생겨도 core를 다시 만들지 않습니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [980, 736, 860, 314], "text": "그래서 주제별 심화는 모두 core 위에 얹힙니다. core의 두 부분인 intake와 workflow는 확정됐고, chain은 정본이 생겼으며, timing-area, coverage, code-review는 이름과 성격만 있습니다. 원인을 찾는 diagnose 갈래도 첫 정본이 생겼습니다. 어느 층의 문제인지부터 가릅니다."},
      {"k": "close", "text": "임계값 같은 숫자는 비워 두고, 도입하는 팀이 정합니다. core는 AI workflow를 실무에 넣는 기틀입니다. 주제마다 workflow와 checkpoint, 판정자를 정리해 얹으면, 그 일이 실무가 됩니다."}
    ],
    whyTitle: "왜 core가 먼저인가",
    title: "core 한 장",
    media: {
      mp4: "media/core_15s.mp4", gif: "media/core_15s.gif", html: "media/core_map.html",
      png: { light: "media/core_map_light.png", dark: "media/core_map_dark.png" }
    },
    why: [
      ["같은 길", "입구(ticket · 도구 신호 · backlog · command)가 늘고 주제가 늘어도 모든 일이 같은 아홉 단계를 지난다. 일마다 AI 쓰는 법을 따로 만들 필요가 없고, 누가 맡겨도 같은 방식으로 처리된다."],
      ["안전", "gate가 일을 시작하기 전에 위험 · 권한 · 정보 · 불확실 · 작업량을 검사해 멈추고, 실행 중에는 lint · sim · synth · LEC · coverage 같은 결정론적 oracle이 판정한다. 사람은 검수와 반영에서 결정하므로, AI의 시도를 넓혀도 통제가 유지된다."],
      ["누적", "검수 판정과 실행 기록이 learn으로 돌아가 분류 규칙과 workflow를 고친다. 개인의 요령으로 흩어지던 경험이 시스템에 쌓이고, 쓸수록 좋아진다."],
      ["확장", "새 주제(chain · timing-area · coverage · code-review · diagnose)는 core를 다시 만들지 않는다. 그 주제의 workflow · checkpoint · oracle만 정리해 얹으면 실무에 들어간다. 그래서 core를 먼저 제대로 세우는 것이 전체의 기틀이다."]
    ],
    zones: [
      { name: "입구 · intake", z: 0, stages: "1 intake · 2 triage · 3 gate",
        what: "일이 어디서 오든 공통 레코드로 받고, 무슨 일인지 AI가 스스로 판정하고, 시작해도 되는지 gate 다섯 조건으로 검사한다.",
        ul: [
          "intake 심화에서 일곱 단계(capture → raw scan → work-or-not → understand → categorize → gate → route)로 펼쳐졌다. 그림의 1~3은 이 일곱 단계를 core 단계로 묶어 보인 것이다.",
          "gate는 위험 → 권한 → 정보 → 불확실 → 작업량 순서로 검사한다. 걸리면 hold(stop · record-only · needs-info · discuss)로 멈추고 사람을 부른다.",
          "세울 수 있는 agent 시스템 명세로 확장됐다: 부품 11, 데이터 계약 3, 규칙 설정 9, 시험 사례 119. 위임 결정은 확정되었다(실무에서 조정)."
        ],
        go: [["intake 카드", "sys", "intake"], ["gate 다섯 조건 · core 규칙", "sys", "core/rules"], ["intake agent 탐색기", "bun", "ia"]] },
      { name: "본체 · workflow", z: 1, stages: "4 plan · 5 execute · 6 result",
        what: "workflow를 고르고 posture(full · draft · prepare · hold)를 정한 뒤, sandbox 안에서 checkpoint를 하나씩 통과해 검수자가 한 장으로 판정할 결과 패키지를 만든다.",
        ul: [
          "checkpoint마다 oracle(lint · sim · synth · LEC · coverage)이 판정한다. 결과 패키지의 근거 등급이 사실과 의견을 나눈다.",
          "실행 중에도 아홉 조건에서 사람을 부르지만 멈추지는 않는다. 질문을 남기고 sandbox 안에서 가능한 부분을 계속하며, 답이 없을 때의 기본값은 보수적이다.",
          "미완도 결과다. \"여기까지 + 이유 + 다음 후보\"로 마감한다."
        ],
        go: [["workflow 카드", "sys", "workflow"], ["workflow agent 탐색기", "bun", "wa"]] },
      { name: "사람", z: 2, stages: "7 review · 8 apply",
        what: "사람이 반드시 서는 자리는 둘뿐이다. 사람의 역할은 분류 · 배정 · 진행 관리에서 검수 · 결정으로 옮겨 간다.",
        ul: [
          "review: 결과 패키지 한 장을 보고 accept / accept-with-fix / reject 중 하나를 고른다. 목표는 10초에 방향, 10분에 판정이다.",
          "apply: MR 생성 · 직접 commit · 회신 · 보류 · 폐기를 정한다. main으로의 MR, 고객 회신, ticket 상태 변경은 시스템이 하지 않는다.",
          "그 밖의 사람 자리는 조건부다. gate의 hold, workflow에 미리 표시된 사람 결정 checkpoint, 실행 중 HITL이 그것이다."
        ],
        go: [["core › 사람의 자리", "sys", "core/human"], ["한눈에 › 사람이 서는 자리", "tab", "home"]] },
      { name: "learn", z: 3, stages: "9 learn",
        what: "자동 실행 기록과 검수 판정을 합쳐 무엇을 고칠지 제안한다. 생략할 수 없는 단계다.",
        ul: [
          "제안은 개인 fork에는 즉시, 정본에는 정기 회의로 반영된다.",
          "너무 큰 개선(재발 방지 test, 문서 부재)은 backlog ticket이 되어 같은 core를 다시 탄다. 그림 왼쪽 입구의 backlog가 그것이다."
        ],
        go: [["core › 핵심 규칙(학습)", "sys", "core/rules"]] }
    ]
  },
  intake: {
    tab: "intake",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "AI가 처리할 일은 ticket으로만 오지 않습니다. 고객의 이슈, 야간 regression 실패 같은 도구 신호, 다른 일이 남긴 후속, 사람이 부르는 command가 있고, 나중에는 mail과 chat도 들어옵니다. 입구가 늘수록 소음과 위험도 늘어납니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "intake는 이 발생들을 출처 넷으로 나눠 받습니다. 고객, 내부 사람, 내부 도구, 다른 일의 뒤입니다. 모두 같은 일곱 단계를 지나지만, 같은 내용이라도 출처가 다르면 끝까지의 과정이 다릅니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "LLM이 원문을 읽기 전에 raw scan이 위험을 거르고, 한 원인의 신호 여럿은 하나로 묶습니다. 판정에는 근거 등급이 붙고, 원인 찾기는 정해진 행선지로 갑니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "고객 이슈는 고객 트랙을 따라가고, 고치는 일은 내부 이슈로 따로 엽니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "입구가 정확해야 뒤의 모든 일이 살고, 틀린 분류는 기록으로 모여 스스로 고쳐집니다. 부분별로 자세히 보겠습니다."},
      {"k": "tour", "view": [20, 236, 900, 506], "box": [40, 250, 262, 412], "text": "출처는 입구와 계정으로 규칙이 채웁니다. 고객 입구는 고객 이름을 별칭으로 바꾸고, 보는 사람을 늘 밖으로 둡니다. 요청자 자리에는 고객 대응 담당이 섭니다. 내부 도구에는 도구 신호와 CI 리뷰 요청이, 다른 일의 뒤에는 후속 요청과 사슬의 다음 link가 들어옵니다."},
      {"k": "tour", "view": [300, 236, 820, 461], "box": [340, 296, 506, 248], "text": "0단계 capture는 규칙으로 채울 칸만 LLM 없이 채웁니다. 1단계 raw scan은 LLM 앞에 둔 코드라서, 자격 증명이나 시스템을 조종하려는 문장이 있으면 그 자리에서 멈춥니다. 2단계에서는 커밋 하나가 test 서른 개를 깨뜨렸다면 하나로 묶고, 닮았다는 이유만으로는 붙이지 않습니다."},
      {"k": "tour", "view": [700, 236, 820, 461], "box": [852, 300, 312, 246], "text": "3단계와 4단계에서는 LLM이 무엇을 원하는지, 어떤 종류의 일인지를 읽습니다. 채운 칸마다 근거 한 줄과 근거 등급이 붙고, 추론뿐인 근거로는 명확하다고 판정하지 않습니다."},
      {"k": "tour", "view": [900, 250, 800, 450], "box": [1190, 300, 322, 290], "text": "5단계 gate는 해도 되는지를, 6단계 route는 어디로 보낼지를 정합니다. 원인 찾기는 덮는 workflow가 있으면 그것으로, 없고 원인 찾기뿐이면 조사형 one-off로 바로 엽니다. 도구 신호의 실패는 묶음으로 보여 주고 사람이 요청할 때 열며, 고객 이슈는 고객 트랙이 엽니다."},
      {"k": "tour", "view": [300, 400, 960, 540], "box": [338, 598, 884, 104], "text": "범위 좁히기 질문은 받은 자료에 있는 것은 묻지 않고, workflow의 필수 입력이 빠졌을 때만 멈춥니다. 회신은 늘 담당이 승인해 보냅니다. 진짜 bug는 검수자가 고른 것만 내부 이슈로 열리고, 고객 이슈와 합치지 않고 link로 잇습니다. 사슬이 필요하면 사람의 ticket이 epic이 되어 첫 link를 직접 돌고, 다음 link는 child로 열립니다."},
      {"k": "tour", "view": [1080, 236, 820, 461], "box": [1590, 250, 292, 412], "text": "그래서 같은 출력 깨짐도 끝이 다릅니다. 고객이 보내면 고객 확인으로, ticket이면 검수와 반영으로, 야간 regression이면 묶음과 요청으로, 다른 일의 뒤라면 부모의 계약이 정한 workflow로 끝납니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "왜 intake부터 세워야 할까요. 순서가 무너지면 LLM이 위험한 원문을 먼저 읽고, 소음을 못 다스리면 사람이 시스템을 끕니다. 틀린 분류를 잡는 자리 넷, 곧 golden 불일치, 검수의 category was wrong, 실행 중 재분류, 사람이 바꾼 cat label이 분류의 Track B 한 줄로 모여 분류 규칙과 질문 묶음을 고칩니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [980, 736, 860, 314], "text": "품질 기준은 hard-zero 셋, 곧 위험 놓침과 잘못 붙이기와 밖으로 새기가 없는 것이고, 시험 사례 119건이 이것을 확인합니다. 명세의 결정들은 확정되었지만, 확정은 합리적인 출발점이라는 뜻이고 실무에서 확인하고 조정합니다."},
      {"k": "close", "text": "intake가 정확하면 뒤의 workflow와 검수와 학습이 옳은 일 위에서 돌고, 틀린 분류도 기록으로 고쳐집니다. 그래서 intake는 AI workflow를 실무에 넣는 첫 관문입니다."}
    ],
    title: "intake 한 장",
    whyTitle: "왜 intake부터 제대로 세워야 하나",
    media: {
      mp4: "media/intake_15s.mp4", gif: "media/intake_15s.gif", html: "media/intake_map.html",
      png: { light: "media/intake_map_light.png", dark: "media/intake_map_dark.png" }
    },
    why: [
      ["순서", "LLM 하나에게 발생을 통째로 맡기면 원문 속 위험(자격 증명, 반출 요구, 시스템을 조종하려는 문장)을 패턴 검사보다 먼저 만난다. 그래서 raw scan을 LLM 앞에 코드로 두고, 순서와 멈춤은 controller가 지킨다."],
      ["소음", "도구 신호는 양이 많고 반복된다. 커밋 하나가 test 서른 개를 깨뜨린 날 신호 하나를 일 하나로 열면 사람이 시스템을 끈다. 그래서 한 원인의 신호는 결정론 규칙과 이력으로 하나로 묶고, 그 원인 찾기는 사람이 요청할 때 연다."],
      ["출처", "같은 내용이라도 출처가 다르면 끝까지의 과정이 다르다. 고객 이슈는 범위 좁히기 질문 → 진단 → 사람 승인 회신 → 고객 확인으로 끝나고, 고치는 일은 검수자가 고른 것만 내부 이슈로 따로 열려 link된다. 고객의 글은 시스템이 보내지 않는다."],
      ["교정", "틀린 분류를 잡는 자리 넷(golden 불일치 · 검수의 category was wrong · 실행 중 재분류 · 사람이 바꾼 cat: label)이 레코드가 끝날 때 원장의 Track B 한 줄로 모인다. 정기 집계가 분류 규칙과 범위 좁히기 질문 묶음을 고치는 재료가 되어, 입구가 스스로 나아진다."]
    ],
    zones: [
      { name: "출처 넷과 입구", z: 0, stages: "고객 · 내부 사람 · 내부 도구 · 다른 일의 뒤",
        what: "입구마다 adapter가 발생을 봉투로 바꾸고, 출처는 입구와 계정으로 규칙이 채운다. 같은 내용이라도 출처가 다르면 끝까지의 과정이 다르다.",
        ul: [
          "고객: 고객 입구(고객이 보는 tracker · 지원 mail · portal)와 밖의 발신자. 이름은 별칭으로만 남고, 보는 사람은 늘 밖이며, 요청자 자리에는 고객 대응 담당이 선다. 끝은 고객 확인이다.",
          "내부 사람: ticket · command(사람이 workflow를 따라 직접 하는 사람 수행 포함), 나중에 mail · chat. 끝은 결과 패키지 → 검수 · 반영이다.",
          "내부 도구: 도구 신호 · CI 리뷰 요청, 나중에 정기 · 상태 변화. 묶음으로 보이고, 원인 찾기는 사람이 요청할 때 열린다.",
          "다른 일의 뒤: 후속 요청 · 사슬 link · 학습 backlog · 파급 child. 부모의 계약(조립 간선)이 정한 workflow로 열린다."
        ],
        go: [["intake › 출처 넷과 고객 트랙", "sys", "intake/fig"], ["규칙 › entrances", "bun", "ia/rules/entrances"], ["부품 › adapter", "bun", "ia/agents/adapters"]] },
      { name: "거르고 묶기", z: 2, stages: "0 capture · 1 raw scan · 2 work-or-not",
        what: "LLM이 원문을 읽기 전에 pattern 검사가 위험을 거르고, 같은 일인지 · 한 원인인지를 결정론 규칙과 이력으로 정한다.",
        ul: [
          "raw scan에 걸리면 그 자리에서 멈춘다(`ai:risk`, 사람에게 알림). 사람이 해제한 hit는 다시 멈추지 않는다.",
          "dedup 두 층: sfp(같은 branch · 같은 오류 문장의 재발은 기존 일에 붙인다)와 cluster key(환경 → storm → 변경 구간 → 오류 문장 순으로 한 원인을 묶는다).",
          "닮았다는 이유로는 붙이지 않는다. 사람의 발생은 흡수되지 않고, 고객 이슈는 같은 실패를 가리켜도 합치지 않고 잇기만 한다."
        ],
        go: [["규칙 › dedup", "bun", "ia/rules/dedup"], ["부품 › dedup-linker", "bun", "ia/agents/dedup_linker"]] },
      { name: "읽고 판정하고 보내기", z: 1, stages: "3 understand · 4 categorize · 5 gate · 6 route",
        what: "무엇을 원하나, 어떤 종류인가, 해도 되나, 어디로 보내나를 정한다. LLM이 채운 칸에는 근거 한 줄과 근거 등급이 붙고, 결과는 task 폴더의 세 파일과 첫 회신 하나다.",
        ul: [
          "근거 등급은 explicit(원문이 명시) · similar-case(채택된 사례와 닮음) · inferred(추론뿐) 셋이다. inferred 근거로는 '명확'을 내리지 않는다.",
          "원인 찾기의 행선지: 덮는 workflow가 있으면 그것, 없고 원인 찾기뿐이면 조사형 one-off, 도구 신호의 실패는 사람이 요청할 때(feed마다 바로 열기로 바꿀 수 있다), 고객 이슈는 고객 트랙.",
          "우선순위는 규칙 근거로만 올린다. 시스템은 owner에게 알리기만 하고 배정하지 않는다."
        ],
        go: [["부품 › gate-checker", "bun", "ia/agents/gate_checker"], ["부품 › router", "bun", "ia/agents/router"], ["diagnose (원인 찾기)", "sys", "diagnose"]] },
      { name: "고객 트랙과 사슬 진입", z: 3, stages: "고객 입구 → 질문 → 진단 → 승인 회신 → 고객 확인",
        what: "고객 이슈는 고객 트랙 한 줄을 따라가고, 고치는 일은 내부 이슈로 따로 연다. 기능 추가처럼 사슬이 필요하면 사람의 ticket이 epic이 되어 첫 link를 직접 돈다.",
        ul: [
          "범위 좁히기 질문은 업무 가족별 묶음에서 고른다. 받은 자료에 있는 것은 묻지 않고, 멈추는 것은 workflow 필수 입력이 빠졌을 때뿐이다. 나머지 질문은 진단과 함께 간다.",
          "질문 · 회신은 늘 초안이고 고객 대응 담당이 승인해 보낸다. 고객이 확인하면 끝나고, 답이 없으면 정한 기간(공란) 뒤 담당이 종료를 선언한다. 시스템은 닫지 않는다.",
          "진짜 bug면 결과 패키지에 내부 이슈 후속을 제안하고, 검수자가 고른 것만 내부 이슈로 열려 link된다. 고객 레코드에서는 고치지 않는다.",
          "사슬: 첫 link는 사람의 ticket(epic) 레코드가 직접 돌고, 다음 link는 결정 · 검수 뒤 child로 열리며, 합류 link는 한 번만 열린다."
        ],
        go: [["범위 좁히기 질문 묶음", "bun", "ia/rules/narrowing_questions"], ["intake › 자세히", "sys", "intake/more"], ["chain (사슬)", "sys", "chain"]] },
      { name: "분류의 Track B와 품질", z: 2, stages: "틀린 분류를 잡는 자리 넷 · hard-zero 셋",
        what: "분류도 방법이므로 기록이 붙는다. 틀린 분류를 잡는 자리 넷이 원장의 Track B 한 줄로 모여 분류 규칙과 질문 묶음을 고친다.",
        ul: [
          "자리 넷: golden 불일치(shadow에서 사람이 채택하지 않은 분류) · 검수의 \"category was wrong\" · 실행 중 재분류 · 사람이 `cat:` label을 바꿈.",
          "레코드가 끝날 때 Track B 줄 하나: 처음과 끝 카테고리, 업무 가족, 교정, 질문마다 답이 왔는가, 받은 자료로 알 수 있었는데 물었는가. 이 줄 없이 끝나면 \"Track B 빠짐\"으로 센다.",
          "품질 기준은 hard-zero 셋(위험 놓침 0 · 잘못 붙이기 0 · 밖으로 새기 0)과 시험 사례 119건(고객 7 포함)이다. 부품 열하나 · 데이터 계약 셋 · 규칙 YAML 아홉.",
          "위임 결정(첫 판 · 동기화 · 이후)은 모두 확정되었다. 확정은 합리적 출발점이고 실무에서 조정한다."
        ],
        go: [["시험 사례 119", "bun", "ia/golden"], ["평가 방법", "bun", "ia/eval"]] }
    ]
  },
  workflow: {
    tab: "workflow",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "업무마다 절차가 다르면 끝과 경계와 근거가 흐려집니다. 원인을 RTL부터 파고, 보지 못한 확인을 통과로 세며, 일이 끝나도 workflow는 배우지 못합니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "그래서 모든 workflow는 같은 골격을 물려받습니다. 골격 위에 작업 모양 일곱이 있고, 그 위에 업무별 특화 열일곱이 얹힙니다. 일의 출처가 고객이면 고객 트랙이 그 위에 덧붙습니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "원인 찾기는 층 판별부터 시작합니다. 재현, 가설, 좁히기, before/after를 지나 층마다 다른 끝에 닿습니다. 모든 일에는 Track B가 붙고, 비어 있으면 완료가 아닙니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "판정은 도구와 script가 냅니다. 보지 못한 것은 통과가 아니고, sign-off 자체는 사람이 합니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "한 골격 위에서 일하고 배우니, 새 업무는 특화 한 장이면 됩니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 200, 1180, 664], "box": [80, 258, 1080, 104], "text": "공통 골격에는 모든 workflow가 지나는 여덟 자리와, 입력 확인, 경계 확인, 결과 패키지, 학습의 공통 checkpoint 넷이 있습니다. 끝을 판정하려면 처음의 사실이 있어야 하므로 시작점을 먼저 기록합니다."},
      {"k": "tour", "view": [40, 300, 1180, 664], "box": [76, 386, 1088, 206], "text": "작업 모양은 수정, 탐색, 판정, 조사, 작성, 결정 자료, 실험의 일곱 가지입니다. 특화 workflow는 업무의 구체만 쓰고, 채우고 좁힐 수만 있을 뿐 넓히지 못합니다. 특화는 열일곱이고, 판정형에 블록 sign-off 판정이 새로 들어왔습니다."},
      {"k": "tour", "view": [40, 400, 1180, 664], "box": [76, 580, 1088, 116], "text": "고객 트랙은 별도 workflow가 아니라 덧붙임입니다. 카테고리의 workflow 위에 고객 경계와 질문의 답, 자동 multi-test, 회신 초안이 얹힙니다. 다른 고객의 자료도, 고객이 보는 자리도 건드리지 않습니다. 고객 레코드에서는 대상을 고치지 않고, posture 상한은 draft입니다. 진짜 bug라면 검수자가 고를 때만 내부 이슈가 열립니다."},
      {"k": "tour", "view": [1160, 230, 720, 405], "box": [1200, 266, 658, 158], "text": "원인은 문서, 이해, 환경, TB, C-model, spec, 도구, RTL, FW, 구현 결과 어디에나 있을 수 있어서, 층 판별이 먼저입니다. 내부 일은 재현 조건을 대조하고, 고객 일은 질문의 답과 자동 multi-test로 층을 가릅니다. 그다음 재현, 가설 표, 싼 것부터 좁히기, 원인마다 before/after를 거칩니다. 끝은 층마다 다릅니다."},
      {"k": "tour", "view": [1160, 400, 720, 405], "box": [1200, 446, 658, 232], "text": "모든 일에는 두 트랙이 붙습니다. Track A는 일 자체이고, Track B는 그 일이 쓴 workflow의 기록입니다. 막힌 곳과 평가, 그리고 원인 찾기를 했다면 정한 층과 층을 가른 질문과 test를 남깁니다. Track B가 비면 완료가 아닙니다. 학습이 끝나면 이 내용이 intake 원장의 레코드로 돌아가 분류가 배웁니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [996, 796, 832, 152], "text": "선택 도구 일곱은 회사에 있으면 쓰고, 없으면 그 확인을 보지 못한 것으로 남깁니다. waiver, coverage exclusion, 합성 예외 같은 억제 기록은 승인 때의 구문이 바뀌면 효과를 잃고 재확인을 기다립니다. 블록 sign-off 판정은 accept된 결과를 모아 준비됨, 미충족, 판정 불가를 냅니다. sign-off는 기준표의 책임자가 합니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [996, 962, 832, 84], "text": "품질 기준은 세 개의 hard-zero입니다. 경계를 넘지 않고, 근거 없이 판정하지 않고, 사람의 기록을 훼손하지 않습니다. 상속 해석 36건, 한 바퀴 46건, 판정만 다시 해 보는 dry replay 6건이 이것을 시험합니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 workflow가 기틀인 이유는 넷입니다. 절차는 골격 한 곳에 두고, 원인은 층 판별부터 가르고, 근거는 도구와 script가 내고, 학습은 Track B로 돌려줍니다."},
      {"k": "close", "text": "사람이 한 일과 AI가 한 일이 같은 표에 쌓이고, 한 곳을 고치면 모든 업무가 함께 좋아집니다. 이것이 AI workflow를 실무에 넣는 기틀입니다. 명세의 결정들은 확정되었지만 합리적인 출발점이고, 회사에서 실무를 하며 조정합니다."}
    ],
    title: "workflow 한 장",
    whyTitle: "왜 workflow가 실무의 기틀인가",
    media: {
      mp4: "media/workflow_15s.mp4", gif: "media/workflow_15s.gif", html: "media/workflow_map.html",
      png: { light: "media/workflow_map_light.png", dark: "media/workflow_map_dark.png" }
    },
    why: [
      ["절차", "업무마다 사람마다 절차가 다르면 실적이 쌓이지 않고 배울 수도 없다. 공통 골격(자리 여덟 · 공통 checkpoint 넷)을 한 곳에 두고 차이만 특화에 쓴다. 고객이 트리거한 일도 새 workflow를 만들지 않고 고객 트랙을 덧붙인다."],
      ["원인", "원인이 RTL 밖(문서 · 이해 · 환경 · TB · C-model · spec · 도구 · FW · 구현 결과)에 있는데 RTL부터 파면 시간이 샌다. 그래서 조사형 모양의 의무는 층 판별이고, 그 뒤 재현 · 가설 · 싼 것부터 좁히기 · 원인마다 before/after를 거친다."],
      ["근거", "'통과했다'는 말과 실제 기록이 어긋난다. 판정은 도구와 script가 내고, 없는 선택 도구 · 효과를 잃은 억제 기록 · 판정 불가는 통과가 아니라 '보지 못한 것'으로 따로 센다. 블록 sign-off 판정도 이 재료로 계산하고, sign-off는 사람이 한다."],
      ["학습", "일은 끝났는데 workflow가 배우지 못하면 같은 막힘이 되풀이된다. 모든 일에 Track B(쓴 workflow · 막힌 곳 · 평가 · 개선, 원인 찾기를 했으면 층 · 질문 · test)가 붙고, 비면 완료가 아니다. 이 기록은 학습 완료 사건으로 intake 원장에 돌아가 분류가 배운다."]
    ],
    zones: [
      { name: "세 층 표준화", z: 0, stages: "골격 · 모양 7 · 특화 17",
        what: "모든 workflow가 같은 골격을 물려받고, 작업 모양 일곱 → 특화 열일곱으로 좁힌다.",
        ul: [
          "공통 골격: 자리 여덟(PL plan · IN 입력 · BL 시작점 · DO 본체 · OR 판정 · RG 회귀·부작용 · RS 결과 · LN 학습)과 공통 checkpoint 넷(C0 입력 확인 · CB 경계 확인 · CR 결과 패키지 · CL 학습).",
          "작업 모양 일곱(수정 · 탐색 · 판정 · 조사 · 작성 · 결정 자료 · 실험)이 자리를 어떻게 채울지 정하고, 특화는 채우고 좁히기만 한다. 넓히지 못한다.",
          "특화 열일곱. 판정형에 블록 sign-off 판정이 새로 들어왔고, regression 원인 찾기는 실적이 생길 때까지 draft로 둔다(확정 · 실무에서 조정)."
        ],
        go: [["탐색기 › 공통 골격", "bun", "wa/library/WF-common"], ["workflow › 자세히", "sys", "workflow/more"]] },
      { name: "고객 트랙 덧붙임", z: 1, stages: "TR-customer",
        what: "출처가 고객이면 카테고리의 workflow 위에 고객 트랙이 덧붙는다. 별도 workflow가 아니다(확정 · 실무에서 조정).",
        ul: [
          "CT1 고객 경계와 질문의 답: 고객 별칭만 쓰고, 다른 고객의 자료를 읽거나 근거 · 초안에 쓰지 않으며, 고객이 보는 자리에 쓰지 않는다.",
          "CT2 자동 multi-test: 원인 찾기 phase가 있으면 증상별 묶음을 한 번에 돌려 층을 가른다. 알려진 bug 대조는 늘 함께 돈다.",
          "회신 초안은 결과 패키지의 한 절이고, 보내는 것은 고객 대응 담당이다. 진짜 bug의 내부 이슈 · 기능 요청의 사슬은 검수자가 고를 때만 열린다(기본은 고르지 않음).",
          "고객 레코드에서는 대상을 고치지 않는다(resolver가 막는다). posture 상한은 draft다(확정 · 실무에서 조정). 상태 label은 고객이 볼 수 있는 ticket에 붙이지 않는다."
        ],
        go: [["탐색기 › TR-customer", "bun", "wa/library/TR-customer"], ["workflow › 카드 그림", "sys", "workflow/fig"]] },
      { name: "층 판별과 두 트랙", z: 2, stages: "조사형 의무 · Track A/B",
        what: "원인 찾기는 층 판별부터 하고, 모든 일에 Track B가 붙어 그 기록이 intake 원장으로 돌아간다.",
        ul: [
          "순서: 층 판별 → 재현 → 가설 → 좁히기(싼 것부터) → before/after(원인마다) → 층마다 다른 끝(수정 방향 · out-of-scope와 회신 · 학습 backlog) → Track B.",
          "층을 가르는 법: 내부 일은 재현 조건 대조, 고객 일은 질문의 답 + 자동 multi-test, 질문형은 근거 찾기. 불안정(간헐 실패)은 층이 아니라 상태다.",
          "Track B가 비면 결과 칸(CR)과 학습 칸(CL)이 통과하지 않는다. 층 · 질문 결과 · test · 분류 교정은 학습 완료 사건으로 intake에 가고, 원장의 그 레코드에 Track B 줄로 덧붙는다."
        ],
        go: [["diagnose › 카드 그림", "sys", "diagnose/fig"], ["workflow › 카드 그림", "sys", "workflow/fig"]] },
      { name: "판정과 품질 기준", z: 3, stages: "선택 도구 7 · 억제 기록 · 블록 sign-off · 시험",
        what: "판정은 도구와 script가 내고, 보지 못한 것은 통과가 아니다. 품질은 hard-zero 셋과 시험 사례로 잰다.",
        ul: [
          "선택 도구 일곱(RDC · X-propagation · DFT rule · formal 도달성 · constraint 검사 · netlist 등가성 · power 추정): 있으면 쓰고, 없으면 '보지 못한 확인'으로 남는다.",
          "억제 기록(waiver · coverage exclusion · 합성 예외)은 유효할 때만 효과를 낸다. 승인 때의 구문이 바뀌면 재확인 필요가 되어 효과를 잃는다.",
          "블록 sign-off 판정: 같은 revision에서 accept된 결과를 모아 준비됨 / 미충족 / 판정 불가와 미결 목록을 낸다. sign-off는 기준표의 책임자(사람)가 한다. 기준표는 공란이다.",
          "hard-zero 셋: 경계 넘기 0 · 근거 없는 판정 0 · 사람 기록 훼손 0. 시험 사례: 상속 해석 36 · 한 바퀴 46 · dry replay 6."
        ],
        go: [["탐색기 › WF-block-signoff", "bun", "wa/library/WF-block-signoff"], ["탐색기 › 시험 세트", "bun", "wa/golden"], ["workflow › 자세히", "sys", "workflow/more"]] }
    ]
  },
  chain: {
    tab: "chain",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "요구부터 sign-off까지의 기능 개발을 AI에게 한 덩어리로 맡기면, 사람은 따라갈 수도 판정할 수도 없습니다. 검수할 자리가 없고, 정답을 만든 쪽이 자기 답을 채점합니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "chain은 이 긴 일을 link로 자릅니다. link 하나는 task 하나이고 workflow 하나입니다. 사슬은 새 엔진이 아니라 core 위에서 link들을 잇는 조립의 한 모양입니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "사람은 착수, 아키텍처 선택, interface freeze, sign-off의 네 결정에 섭니다. 그 밖의 link 사이는 검수 accept로 넘어가고, intake는 첫 link만 엽니다."},
      {"k": "intro", "seg": [9.5, 12], "text": "앞 link는 뒤 link의 판정 기준, 곧 oracle을 만듭니다. spec은 assertion을, C-model은 bit-exact 기준과 module trace를 넘깁니다."},
      {"k": "intro", "seg": [12, 15], "text": "그래서 긴 개발이 검수할 수 있는 토막과 기계 판정으로 바뀝니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 230, 1100, 619], "box": [80, 372, 525, 128], "text": "L1은 표준 문서와 고객 요구에서 요구 목록, 영향 block 후보, 비용 근거표를 만들고, 담당 리더가 착수를 결정합니다. L2는 대안을 latency, area, memory 영향으로 비교하고 아키텍트가 고릅니다. AI는 결정 자료만 만들고 결정은 사람이 합니다."},
      {"k": "tour", "view": [400, 220, 860, 484], "box": [640, 326, 350, 226], "text": "L3는 interface 표, register map, 시퀀스를 기계가 읽는 형태로 쓰고 assertion 골격을 만듭니다. 나란히 가는 L3m은 C-model을 맞춥니다. 둘은 함께 interface freeze를 받습니다. freeze 뒤에 spec이 바뀌면 둘을 다시 freeze하고, 영향받는 L4와 L5만 다시 엽니다."},
      {"k": "tour", "view": [520, 200, 900, 506], "box": [628, 276, 584, 334], "text": "freeze 뒤에는 L4 RTL과 L5 검증이 나란히 열립니다. L4는 block을 구현하고 spec assertion과 module trace로 대조합니다. L5는 RTL을 읽지 않고 spec과 C-model만으로 test와 coverage 목표를 만듭니다. 설계와 검증이 같은 추론에서 나오지 않게 하려는 것입니다."},
      {"k": "tour", "view": [1000, 240, 920, 518], "box": [1240, 370, 600, 136], "text": "L6은 L4와 L5가 모두 검수를 지나야 한 번 열립니다. regression 실패는 기록만 하고, 원인 찾기는 사람이 요청해 diagnose 갈래로 넘깁니다. L7은 spec, RTL, C-model의 정합성을 검사하고, sign-off는 책임자가 합니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 268, 1780, 424], "text": "가상 사례는 디코더 IP에 새 in-loop filter mode를 더하는 일입니다. 이 일은 epic 하나가 되고, link마다 child ticket이 열립니다. regression에서 특정 크기 조합이 실패하면, diagnose가 module trace로 첫 불일치 경계를 찾습니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 795, 830, 135], "text": "C-model은 세 층입니다. 상위 model은 encoder의 algorithm model, decoder의 golden model로 L1과 L2의 기준입니다. exactness oracle model은 출력이 bit-exact인지 판정합니다. module trace model은 module 경계를 bit-to-bit로 대조합니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 952, 830, 90], "text": "link 표와 사람 결정 넷, 검증 독립성, spec 변경 규칙은 확정입니다. encoder와 decoder의 oracle 구분은 가정이고, 교정을 기다립니다. link의 이름과 개수는 과거 일감으로 검증할 예정입니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 chain이 기틀인 이유는 넷입니다. 긴 개발을 검수할 수 있는 토막으로 자르고, 판정은 앞 link가 만든 oracle로 하며, 설계와 검증을 떼어 놓고, 사람은 네 결정에 집중합니다."},
      {"k": "close", "text": "chain은 core 위의 조립이라, 기능 개발도 같은 intake와 workflow로 돕니다. AI에게 큰 일을 맡겨도 사람이 따라가고 판정할 수 있게 하는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "chain 한 장",
    whyTitle: "왜 chain이 기틀인가",
    media: {
      mp4: "media/chain_15s.mp4", gif: "media/chain_15s.gif", html: "media/chain_map.html",
      png: { light: "media/chain_map_light.png", dark: "media/chain_map_dark.png" }
    },
    why: [
      ["토막", "긴 기능 개발을 한 덩어리로 맡기면 사람이 중간에 따라갈 수 없다. link마다 결과 패키지 하나, 검수 하나로 자르면 AI에게 큰 일을 맡겨도 사람이 한 토막씩 확인하며 따라간다. 한 번에 다 열지 않고 첫 link만 연다."],
      ["oracle", "AI 산출물을 사람의 감으로 판정하면 판정이 사람마다 다르고 근거가 남지 않는다. 앞 link가 뒤 link의 판정 기준을 만든다. L3는 spec assertion을, L3m은 bit-exact 기준과 module 경계의 bit-to-bit trace를 넘기고, 뒤 link는 스스로 정답을 만들지 않는다."],
      ["독립", "설계와 검증이 같은 추론에서 나오면 같은 오해가 양쪽에 들어가 서로를 통과시킨다. 그래서 L4와 L5는 다른 세션이고, L5는 RTL을 읽지 않는다(coverage hole 분석에서만 예외). 공유 입력은 spec과 C-model뿐이다."],
      ["결정", "사람은 착수 · 아키텍처 선택 · interface freeze · sign-off 넷에 집중하고, AI는 결정 자료만 만든다. freeze 뒤에 spec이 바뀌면 L3 · L3m을 다시 freeze하고 영향받는 L4 · L5만 다시 연다. 영향 범위는 spec 항목 id와 block 분할로 계산한다."]
    ],
    zones: [
      { name: "요구 · 아키텍처", z: 0, stages: "L1 · L2 · 결정 자료형",
        what: "AI가 결정 자료를 만들고, 사람이 착수와 아키텍처 선택을 결정한다.",
        ul: [
          "L1 요구 · feasibility: 표준 문서 · 고객 요구에서 요구 목록(항목마다 id), 영향 block 후보, 비용 근거표를 만든다. 사람은 착수를 결정한다.",
          "L2 아키텍처: 대안을 latency · area · memory 영향으로 비교하고 block 분할 · 자원 예산을 낸다. 사람은 아키텍처를 선택한다.",
          "상위 model이 새 기능을 아직 담지 않았으면 L1의 비용 근거표에 적고, 상위 model 작업은 사슬 밖의 선행 일감으로 둔다.",
          "intake는 사슬 진입 ticket을 받으면 첫 link만 연다. link 하나만 요구하는 ticket은 사슬 없이 그 link의 workflow 단독으로 간다."
        ],
        go: [["chain 요약 › link 표", "sys", "chain/more"], ["조립 CH-feature", "bun", "wa/library/CH-feature"]] },
      { name: "spec ∥ C-model", z: 1, stages: "L3 · L3m · interface freeze",
        what: "뒤 link의 oracle을 만드는 두 link가 나란히 가고, 함께 interface freeze를 받는다.",
        ul: [
          "L3 spec(작성형): interface 표 · register map · 시퀀스 · 성능 예산표를 기계가 읽는 형태로 쓰고, 거기서 spec assertion 골격을 만든다.",
          "L3m C-model(수정형): 상위 model 반영을 확인하고, exactness oracle model과 module function-level trace model을 고친다. trace 형식(어느 경계 · 어떤 필드 · 어떤 순서)은 spec의 일부로 함께 freeze된다.",
          "C-model 세 층: 상위 model(encoder algorithm · decoder golden) → L1 · L2 기준, exactness oracle model → L5 · L6 비교 기준, module trace model → L4 · L5 · diagnose의 bit-to-bit 대조.",
          "(가정 · 교정 대기) decoder는 golden model과의 bit-exact가 판정 기준이고, encoder는 HW 동작을 옮긴 oracle model과의 bit-exact에 golden decoder로 표준 적합성을 다시 확인한다.",
          "freeze 뒤 spec 변경 = 사슬 재plan: L3 · L3m을 다시 freeze하고 영향받는 L4 · L5만 다시 연다."
        ],
        go: [["chain 요약 › C-model 세 층", "sys", "chain/more"]] },
      { name: "RTL ∥ 검증", z: 2, stages: "L4 · L5 · 검증 독립성",
        what: "freeze 뒤 두 link가 병렬로 열리고, 공유 입력은 spec과 C-model뿐이다.",
        ul: [
          "L4 RTL: block 구현, lint, spec assertion 통과, module trace와 bit-to-bit 대조. assertion 묶음은 oracle로 받아 쓰고 고치지 않는다.",
          "L5 검증: RTL을 읽지 않고 spec · C-model로 TB · test · coverage 목표를 만든다. coverage hole 분석 checkpoint에서만 RTL을 읽는다. 사람은 test plan을 승인하고 검수한다.",
          "module trace model이 없는 module은 출력 비교만 하고, 그 사실을 coverage 목표의 빈칸으로 적는다.",
          "기본값: 먼저 AI에 맡길 link는 L5의 TB 골격 · test 생성, 둘째는 L4의 lint · assertion이다(팀 리더가 정한다)."
        ],
        go: [["chain 요약 › 원칙 다섯", "sys", "chain/more"], ["조립 CH-feature", "bun", "wa/library/CH-feature"]] },
      { name: "통합 · sign-off 준비", z: 3, stages: "L6 · L7 · join all",
        what: "L6은 L4 · L5가 모두 검수를 지나야 한 번 열리고, 마지막 결정 sign-off는 사람이 한다.",
        ul: [
          "L6 통합 · regression: 합쳐서 regression을 돌리고 결과표 · 실패 묶음을 남긴다. 원인 찾기는 사람이 요청해 diagnose 갈래로 간다. diagnose는 module trace로 첫 불일치 경계를 찾는다.",
          "L7 sign-off 준비(판정형): 보고서 취합, 미결 목록, spec · RTL · C-model 정합성 검사. 사람이 sign-off한다.",
          "ticket 매핑: epic = 사슬 인스턴스, child ticket = link. 열린 link의 child가 그때 생기고, 사슬 요약(결정 기록 넷 + link별 근거표)은 epic에 남는다.",
          "상태: link 표 · 검증 독립성 · spec 변경 규칙은 확정이다. link의 이름 · 개수는 과거 일감으로 검증할 예정이다."
        ],
        go: [["chain 요약 › 가상 사례", "sys", "chain/more"], ["workflow 카드", "sys", "workflow"]] }
    ]
  },
  diagnose: {
    tab: "diagnose",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "regression 실패, 고객 이슈, 가끔 생기는 hang처럼 원인을 찾아야 하는 일은 가장 흔합니다. intake는 이런 일을 원인 찾기로 분류만 합니다. 그 뒤 보낼 곳이 비어 있던 자리를 채우는 갈래가 diagnose입니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "diagnose는 층부터 가릅니다. 문서, 이해, 환경, TB, C-model, spec, 도구, RTL, FW, 구현 결과의 열 층입니다. 원인이 RTL 밖에 있는 경우가 많아서, 층을 모른 채 RTL부터 파고들지 않습니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "층을 가르는 방법은 출처에 따라 다릅니다. 내부 이슈는 재현 조건을 대조하고, 고객 이슈는 후보를 가르는 질문과 자동 multi-test를 함께 돌립니다. 고객 회신은 늘 사람이 승인합니다."},
      {"k": "intro", "seg": [9.5, 12], "text": "층이 정해지면 재현, 가설 표, 좁히기, 확인으로 갑니다. 좁히기는 싼 것부터이고, 확인은 before/after입니다. 대상은 고치지 않습니다."},
      {"k": "intro", "seg": [12, 15], "text": "그래서 층마다 알맞은 끝으로 가고, 층을 가른 질문과 test가 쌓입니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 240, 1120, 630], "box": [80, 428, 1016, 124], "text": "층 열의 앞 일곱, 문서부터 도구까지는 모두 RTL 밖입니다. 층마다 재현 수단, oracle, 좁히는 도구, 끝이 다릅니다. TB 층은 같은 입력으로 checker 판정을 따로 계산해 보고, 도구 층은 같은 입력을 두 버전으로 돌려 봅니다."},
      {"k": "tour", "view": [880, 250, 1040, 585], "box": [1560, 440, 292, 74], "text": "가끔 hang이 나는 사례입니다. 먼저 같은 입력을 반복합니다. 결과가 갈리면 층이 아니라 불안정 상태로 보고, 원인 찾기를 멈추고 안정화 일감으로 넘깁니다. 갈리지 않으면 timeout watchdog trace와 handshake checker로 설계와 환경을 가릅니다."},
      {"k": "tour", "view": [40, 400, 1100, 619], "box": [80, 556, 780, 138], "text": "regression 새 실패 사례입니다. 여러 test가 같은 변경 구간에서 처음 실패하면 intake가 한 묶음으로 모으고, owner가 요청할 때 원인 찾기가 열립니다. 우리 regression에서 재현되므로 TB, C-model, RTL 가운데서 좁히되, checker 기대값을 C-model로 다시 계산해 oracle 쪽 오류부터 지웁니다."},
      {"k": "tour", "view": [440, 250, 1440, 810], "box": [532, 324, 858, 96], "text": "다음은 변경 구간 bisect로 원인 revision을 찾고, module trace 첫 불일치 경계로 좁힙니다. 그 변경을 되돌린 scratch에서 증상이 사라지고 원래에서 다시 나타나면 확인입니다. 수정은 요청이 있을 때 다음 phase로 갑니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 800, 830, 120], "text": "좁히기 사다리는 싼 것부터입니다. 변경 구간 bisect, seed와 설정 변주, module trace 첫 불일치, 경계 안 텍스트 trace 순서입니다. 계측은 scratch 사본에서만 넣고, 확인하지 못한 것은 남은 후보와 이유를 씁니다."},
      {"k": "tour", "view": [860, 400, 1060, 596], "box": [900, 556, 940, 138], "text": "고객 환경에서만 출력이 다르다는 사례입니다. 릴리즈, 설정 값과 순서, 입력 조건, 환경, 재현 빈도를 한 번에 묻고, 고객 조건을 흉내 낸 multi-test를 함께 돌립니다. 고객 설정 값에서만 재현되고 문서의 순서와 다르면, 층은 문서와 코드의 불일치입니다. 답 초안은 사람이 승인해 회신하고, 진짜 bug라면 내부 이슈를 따로 열어 link합니다."},
      {"k": "tour", "view": [940, 240, 980, 551], "box": [1436, 300, 406, 120], "text": "끝은 층마다 다릅니다. 문서 보강, 결정 뒤 수정, FAQ 축적, 환경 안내, errata, 내부 수정 이슈입니다. 어느 질문과 test가 층을 실제로 갈랐는지는 Track B로 남겨 두 묶음을 고칩니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 diagnose가 기틀인 이유는 넷입니다. 층부터 가르니 헛짚지 않고, before/after로 확인하니 근거가 남습니다. 층마다 알맞은 끝으로 가고, 층을 가른 질문과 test가 쌓입니다."},
      {"k": "close", "text": "버그 수정과 timing 개선의 원인 phase도 같은 방법을 따릅니다. 층 판별 먼저도, 층 열 표와 질문 묶음도 확정되었고, 실무에서 조정합니다. 원인 찾기를 AI에 맡겨도 근거가 남고 묶음이 자라는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "diagnose 한 장",
    whyTitle: "왜 diagnose가 기틀인가",
    media: {
      mp4: "media/diagnose_15s.mp4", gif: "media/diagnose_15s.gif", html: "media/diagnose_map.html",
      png: { light: "media/diagnose_map_light.png", dark: "media/diagnose_map_dark.png" }
    },
    why: [
      ["층", "원인 찾기를 AI에 맡기면 가장 먼저 RTL을 파고들기 쉽다. 그런데 원인은 문서 · 이해 · 환경 · TB · C-model · spec · 도구처럼 RTL 밖에 있는 경우가 많다. 층부터 가르면 헛짚는 시간이 줄고, 같은 입력에서 결과가 갈리는 '불안정'은 원인 찾기를 멈추고 안정화 일감으로 넘긴다."],
      ["근거", "원인 찾기는 대상을 고치지 않는다. 계측은 scratch 사본에서만 넣고 지우고, 원인은 되돌린 scratch에서 증상이 사라지고 원래에서 다시 나타나는 before/after로 확인한다. 확인하지 못한 것은 남은 후보와 이유를 그대로 쓰고, 원인이 여럿이면 원인마다 따로 보고한다. 그래서 검수자가 원인 보고를 근거로 판정할 수 있다."],
      ["끝", "층이 정해지면 끝도 정해진다. 문서는 문서 보강, spec은 결정 자료 → spec 갱신, 이해는 회신 + FAQ 축적, 환경은 차이와 맞추는 법의 안내, 진짜 bug는 회신 + 내부 수정 이슈 + errata 후보. 모든 원인 찾기를 'RTL 수정'으로 끝내지 않는다."],
      ["자람", "어느 질문 · 어느 test가 층을 실제로 갈랐는지를 Track B로 남긴다. 그 기록으로 업무 가족별 질문 묶음과 증상별 multi-test 묶음이 고쳐지고 늘어난다. 같은 원인 찾기가 되풀이되면 특화 workflow 초안을 신설한다. 원인 찾기가 일할수록 빨라지는 구조다."]
    ],
    zones: [
      { name: "층 판별 · 층 열", z: 0, stages: "층 판별 · 열 층 · 불안정",
        what: "원인 찾기는 층부터 가른다. 층마다 재현 수단 · oracle · 좁히는 도구 · 끝이 다르다.",
        ul: [
          "층 열(확정 · 실무에서 조정): 문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 앞 일곱은 RTL 밖이다.",
          "예: TB 층은 같은 입력으로 checker 판정을 따로 계산하고(oracle = C-model · spec), 도구 층은 같은 입력을 도구 두 버전 · 두 종류로 돌린다(버전 bisect, 최소 예제).",
          "불안정은 층이 아니라 상태다. 같은 입력에서 결과가 갈리면(race · 초기화되지 않은 값 · X 전파 · 환경 요동) 원인 찾기를 멈추고 안정화 일감으로 넘긴다. 반복 횟수는 공란(검증 리더).",
          "층 판별 먼저도, 층 열 표의 칸도 확정되었다(실무에서 조정)."
        ],
        go: [["diagnose 카드", "sys", "diagnose"]] },
      { name: "층을 가르는 법", z: 1, stages: "내부 이슈 · 고객 이슈",
        what: "내부 이슈는 재현 조건 대조로, 고객 이슈는 질문 묶음과 자동 multi-test를 함께 돌려 층을 가른다.",
        ul: [
          "내부: 우리 regression에서 같은 입력으로 재현되면 TB · C-model · RTL · 구현 결과 가운데서 좁히되, oracle 쪽(TB · C-model)이 틀렸을 가능성을 먼저 지운다. 특정 환경에서만 생기면 환경 · FW · interface 가정부터, 도구 · 버전이 바뀐 뒤에만 생기면 도구부터.",
          "고객: 처음 설명으로 층이 정해지지 않으면 후보 층을 가르는 질문만 한 번에 묶어 보낸다(받은 자료에서 읽을 수 있는 것은 묻지 않고, 질문마다 왜 묻는지 한 줄). 업무 가족마다 기본 묶음이 있다(가정).",
          "동시에 증상별 자동 multi-test를 돌린다. 예: 상대 환경에서만 출력 불일치 → 상대 릴리즈로 우리 regression · 상대 설정 값 · 상대 memory latency 흉내 · 알려진 bug 대조(가정).",
          "고객 회신은 늘 사람이 승인한다. 진짜 bug면 내부 이슈를 따로 열어 link한다(합치지 않는다)."
        ],
        go: [["업무 지도 카드", "sys", "workmap"], ["diagnose 카드", "sys", "diagnose"]] },
      { name: "재현에서 확인까지", z: 2, stages: "재현 · 가설 표 · 좁히기 · before/after",
        what: "조사형 모양의 의무(재현 · 가설 표 · before/after)를 층 판별 뒤에 이어 간다.",
        ul: [
          "재현: 같은 입력(revision · seed · 설정 · 환경)으로. 상대 환경의 재현은 상대 조건을 흉내 낸 우리 환경에서 한다.",
          "가설 표: 가설 · 예측 · 가르는 실험 · 결과 · 판정. 세션이 바뀌어도 이 표로 이어 간다. 가설은 변경 구간의 diff → trace 첫 불일치 경계 → 과거 bug 패턴 → 실패 묶음의 공통점 순으로 만든다.",
          "좁히기는 싼 것부터: 변경 구간 bisect → seed · 설정 변주 → module trace 첫 불일치 → 경계 안 신호의 텍스트 trace. waveform은 사람이 볼 때만.",
          "확인: 되돌리거나 고정한 scratch에서 증상이 사라지고 원래에서 다시 나타나야 확인이다(또는 최소 재현). 대상은 고치지 않고, 수정은 요청이 있을 때 다음 phase나 후속 요청으로 간다.",
          "실패 종류별 시작점(가정): 새 실패 = 구간 bisect, 오래된 실패 = module trace 경계부터, 간헐 실패 = 같은 입력 반복으로 불안정부터, 환경 실패 = 범위 밖(운영 담당에 넘기고 마감)."
        ],
        go: [["조사형 모양", "bun", "wa/library/AR-diagnose"], ["regression 원인 찾기 (초안)", "bun", "wa/library/WF-regr-diagnose"]] },
      { name: "끝 · Track B · 여는 주체", z: 3, stages: "끝(층마다) · Track B · 누가 여나",
        what: "끝은 층마다 다르고, 층을 가른 질문 · test가 Track B로 남아 묶음을 고친다.",
        ul: [
          "끝: 문서 보강 · 수정 이슈, 결정 자료 → spec 갱신, 회신 + FAQ 축적, 환경 안내 + 환경 요구 보강, 도구 담당에 넘기고 회피책 기록, errata 후보, 내부 수정 이슈.",
          "여는 주체: 도구 신호의 실패는 intake가 묶음으로 모으고, 원인 찾기는 사람이 요청할 때 연다. 사람의 요청과 고객 이슈는 바로 연다. \"원인을 찾아 고쳐 달라\"면 버그 수정 · timing workflow의 두 phase가 된다.",
          "덮는 특화 workflow가 없으면 조사형 모양의 기본 채움 + 층 표로 일하고, 같은 일이 되풀이되면 특화 초안을 신설한다.",
          "반영 대기(설계 쪽): 조사형 모양의 층 판별 자리, regression 원인 찾기 초안."
        ],
        go: [["intake 카드", "sys", "intake"], ["업무 지도 카드", "sys", "workmap"]] }
    ]
  },
  workmap: {
    tab: "업무 지도",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "같은 증상이라도 출처가 다르면 끝까지의 과정이 다릅니다. 출력이 다르다는 이슈가 고객에게서 오면 고객 확인으로 끝나고, 내부 regression에서 오면 수정과 검수로 끝납니다. 분류 없이 일하면 이 차이가 사라집니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "업무 지도는 일을 다섯 축으로 분류합니다. 출처, 요청 종류인 ask, 업무 가족, lifecycle 단계, 그리고 층입니다. 앞의 넷은 intake가 정하고, 층은 진단이 좁혀 가며 정합니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "고객 이슈는 고객 트랙으로 가고, 회신은 늘 사람이 승인합니다. 내부 일은 lifecycle 단계마다 생기는 상황과 진단의 첫 갈래, 쓰는 workflow가 정해져 있습니다."},
      {"k": "intro", "seg": [9.5, 12], "text": "가장 먼저 할 일은 기존 자산의 이식입니다. 팀이 이미 쓰는 확인을 workflow로 옮겨 바닥으로 고정합니다."},
      {"k": "intro", "seg": [12, 15], "text": "그리고 모든 일에 Track B가 붙습니다. Track B가 없으면 완료가 아닙니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 240, 1100, 619], "box": [80, 276, 550, 218], "text": "출처는 고객, 내부의 사람, 내부의 tool 신호, 사슬과 후속으로 나뉩니다. 출처는 lifecycle과 완료 조건, 회신 규율을 바꿉니다. 요청 종류는 answer, change, diagnose, decide, notify, scheduled이고, workflow의 작업 모양을 정합니다."},
      {"k": "tour", "view": [600, 240, 1100, 619], "box": [660, 306, 530, 188], "text": "업무 가족은 열둘입니다. 이해와 질문, 문서 정합, 기능 불일치부터 환경과 도구, 일정과 대응까지입니다. 가족이 정해지면 쓰는 특화 workflow와 이식할 자산이 정해집니다. 열두 가족은 가상의 기본안이고, 과거 일감으로 다시 정합니다."},
      {"k": "tour", "view": [1000, 240, 920, 518], "box": [1208, 276, 644, 358], "text": "내부 lifecycle은 spec 학습부터 FPGA test까지 여덟 단계입니다. 검증 단계의 regression 새 실패는 RTL, TB, C-model에서 찾고 조사형으로 갑니다. 합성 단계의 timing 위반은 구현 결과와 constraint부터 보고 timing workflow로 갑니다."},
      {"k": "tour", "view": [40, 360, 1200, 675], "box": [80, 508, 1110, 124], "text": "고객 트랙은 접수, 범위 좁히기 질문, multi-test, 답 초안, 사람 승인, 회신, 고객 확인의 순서입니다. 특정 입력에서 출력이 깨진다는 이슈가 고객 조건으로 우리 쪽에서도 재현되면 진짜 bug입니다. 그러면 내부 이슈를 따로 열어 link하고, 고객 이슈는 그 진행을 따라가며 회신 일정을 관리합니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 795, 830, 100], "text": "checklist는 checkpoint로, 검증 환경과 확인 환경은 evaluator로, 절차서는 단계 순서와 사람 자리로, 판정 기준은 policy로, 기록 양식은 결과 패키지의 절로 옮깁니다. 그대로 복사하지 않고, 참이어야 하는 것과 확인하는 방법으로 나눠 다시 씁니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 903, 830, 138], "text": "옮긴 확인은 workflow가 상속하는 잠금 항목이고, AI용 조건은 그 위에만 붙습니다. 이식이 끝난 업무 가족부터 shadow를 시작합니다. 분류 축과 업무 가족, 단계는 확정되었지만 출발점이고, 고객 이슈가 들어오는 경로와 자산의 위치는 회사에서 확인합니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [80, 644, 1760, 50], "text": "모든 일에는 두 트랙이 붙습니다. Track A는 일 자체이고, Track B는 그 일이 쓴 workflow의 기록입니다. 막힌 곳, 평가, 개선 제안, revision이나 신설 초안이 남습니다. Track B가 없으면 사람이 직접 한 일도 완료가 아닙니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 업무 지도가 기틀인 이유는 넷입니다. 출처에 따라 끝을 다르게 하고, 팀의 기존 확인을 바닥으로 삼고, 다섯 축으로 workflow와 진단의 첫 갈래를 정하고, Track B로 분류와 질문, test 묶음을 키웁니다."},
      {"k": "close", "text": "업무 지도는 일이 어디서 생겨 어디로 가는지를 보여 주고, diagnose 갈래도 이 위에 섭니다. 기존 확인 위에 AI를 얹고 모든 일이 기록을 남기게 하는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "업무 지도 한 장",
    whyTitle: "왜 업무 지도가 기틀인가",
    media: {
      mp4: "media/workmap_15s.mp4", gif: "media/workmap_15s.gif", html: "media/workmap_map.html",
      png: { light: "media/workmap_map_light.png", dark: "media/workmap_map_dark.png" }
    },
    why: [
      ["출처", "같은 증상(예: 특정 입력에서 출력 불일치)이 고객에게서도, 내부 regression에서도 온다. 원인 찾기 방법은 같지만 고객 이슈는 사람이 승인한 회신과 고객 확인으로, 내부 이슈는 수정과 검수로 끝난다. 그래서 두 이슈는 합치지 않고 link한다. 분류 없이 일하면 회신 승인이나 고객 확인 같은 끝이 빠진다."],
      ["바닥", "팀은 checkpoint의 답 대부분을 이미 checklist · script · regression · sign-off 절차로 가지고 있다. 그것을 옮기지 않고 AI용 조건을 새로 만들면 검증된 확인이 빠지거나 두 기준이 따로 논다. 옮긴 확인은 workflow가 상속하는 잠금 항목이 되고, 사람이 한 일과 AI가 한 일이 같은 기준으로 비교된다."],
      ["분류", "축 다섯이 각각 다른 것을 바꾼다. 출처는 완료 조건과 회신 규율, ask는 workflow의 작업 모양, 업무 가족은 특화 workflow와 이식할 자산, lifecycle 단계는 그 단계의 기존 확인, 층은 진단의 첫 갈래와 끝의 모양을 정한다. ①~④는 intake가, ⑤는 진단이 정한다."],
      ["기록", "모든 일에 Track B(쓴 workflow와 revision, 막힌 곳과 사람이 메운 곳, 평가, 개선 제안, revision 제안이나 신설 초안)가 붙고, 이것이 없으면 사람이 한 일도 완료가 아니다. 분류와 진단에도 붙어서, 분류 규칙 · 질문 목록 · 진단 test 묶음이 이 기록으로 고쳐진다."]
    ],
    zones: [
      { name: "분류 축 다섯", z: 0, stages: "출처 · ask · 업무 가족 · lifecycle · 층",
        what: "①~④는 intake가 정하고, ⑤ 층은 진단이 좁혀 가며 정한다. 축마다 바꾸는 것이 다르다(확정 · 실무에서 조정).",
        ul: [
          "① 출처: 고객 · 내부(사람) · 내부(tool 신호) · 내부(사슬 · 후속) → lifecycle과 완료 조건, 회신 규율.",
          "② 요청 종류(ask): answer · change · diagnose · decide · notify · scheduled → workflow의 작업 모양.",
          "③ 업무 가족 열둘: 이해 · 질문, 문서 정합, 기능 불일치, interface · 통합, 성능, 구현 결과, power, PPA 최적화, 기능 추가, 검증 지표, 환경 · 도구, 일정 · 대응 → 특화 workflow와 이식할 자산.",
          "④ lifecycle 단계 · ⑤ 층 → 그 단계의 기존 확인과 다음 단계, 진단의 첫 갈래와 끝의 모양.",
          "처음 설명만으로 업무 가족이나 층이 정해지지 않으면 후보를 가르는 질문만 보낸다. 열두 가족과 여덟 단계는 가상의 기본안이고, 조직의 과거 일감과 자산 목록으로 다시 정한다."
        ],
        go: [["업무 지도 카드", "sys", "workmap"], ["intake 카드", "sys", "intake"]] },
      { name: "고객 트랙", z: 1, stages: "접수 → 질문 · multi-test → 승인 → 회신 → 고객 확인",
        what: "고객 이슈는 따로 간다. 회신은 늘 사람이 승인하고, 진짜 bug면 내부 이슈를 따로 열어 link한다(확정: 고객 트랙 재개).",
        ul: [
          "접수 → 범위 좁히기 질문 → 재현 · 자동 multi-test 진단 → 답 초안 → 사람 승인 → 회신 → 고객 확인 → 종료. AI는 초안까지 쓴다.",
          "고객 이슈의 층: 설명 부족 · 문서와 코드 불일치 · 고객 이해도 · 제공된 설명을 보지 못함 · 고객 환경 차이 · 진짜 bug. 층마다 끝이 다르다(문서 보강 · 결정 → 수정 · FAQ · 문서 위치 안내 · 환경 요구 보강 · 내부 이슈 + errata 후보).",
          "종료: 고객이 확인하면 종료, 답이 없으면 정한 기간(공란) 뒤 담당자가 종료를 선언한다. 지표는 첫 회신 · 최종 회신 시간, 재질문, 고객 확인 비율(목표 공란).",
          "고객 표기는 별칭만 쓰고, 한 작업이 두 고객의 자료를 읽지 않는다. 고객 이슈가 들어오는 경로는 회사에서 확인한다."
        ],
        go: [["diagnose 한 장", "sys", "diagnose"], ["업무 지도 카드", "sys", "workmap"]] },
      { name: "내부 lifecycle", z: 2, stages: "S1 spec 학습 → … → S8 FPGA test",
        what: "단계마다 생기는 상황, 진단의 첫 갈래, 쓰는 workflow가 정해져 있다(확정 · 실무에서 조정).",
        ul: [
          "여덟 단계: spec · feature 학습 → 검증 환경 → 구현 → 검증 · 디버깅 → 각종 test → 합성 · 구현 → 상위 SW co-sim → FPGA test.",
          "예: 검증 · 디버깅 단계의 regression 새 실패 → RTL · TB · C-model → 조사형(diagnose 갈래). 간헐 실패 → 불안정부터.",
          "예: 합성 · 구현 단계의 timing 위반 → 구현 결과 · RTL · constraint → timing workflow. equivalence check 실패 → 조사형.",
          "예: SW co-sim에서 driver를 붙이면 hang → FW · register 순서 · RTL. FPGA에서만 실패 → 환경 · clock · memory model · RTL.",
          "chain의 link와의 관계: 첫 단계는 요구 · 아키텍처 · spec의 앞, 검증 환경은 검증 link, 구현은 RTL link, 마지막 두 단계는 통합 뒤의 확인이다."
        ],
        go: [["diagnose 카드", "sys", "diagnose"], ["chain 카드", "sys", "chain"]] },
      { name: "자산 이식 · 두 트랙", z: 3, stages: "기존 자산 → checkpoint · evaluator · policy · Track A/B",
        what: "가장 먼저 기존 자산을 옮겨 바닥으로 고정하고, 모든 일에 Track B 기록을 붙인다(확정).",
        ul: [
          "옮길 것: checklist → checkpoint, 검증 환경 → evaluator · oracle, 확인 환경 → evaluator · gate 입력, 절차서 → 단계 순서와 사람 자리, 판정 기준 → policy(숫자 공란), 기록 양식 → 결과 패키지의 절.",
          "그대로 복사하지 않고 '참이어야 하는 것'과 '확인하는 방법(사람 · script · evaluator)'으로 나눠 다시 쓴다. 자산이 없는 자리는 '기존 확인 없음'으로 표시하고, 그 자리의 첫 조건은 담당 리더가 승인한다.",
          "이식이 끝난 업무 가족부터 shadow를 시작한다. 끝나지 않은 가족은 AI가 초안까지만 한다.",
          "Track A = 일 자체(답 · patch · 원인 보고 · 결정 자료 · 고객 회신), Track B = 그 일이 쓴 workflow의 기록. 같은 일이 정해진 횟수(공란) 넘게 'workflow 없음'으로 끝나면 신설이 의무가 된다.",
          "기존 자산의 위치와 담당은 회사에서 확인한다."
        ],
        go: [["업무 지도 카드", "sys", "workmap"], ["workflow 카드", "sys", "workflow"]] }
    ]
  },
  atlas: {
    tab: "전체 지도",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "이 설계는 주제가 여럿으로 나뉘어 있습니다. intake, workflow, chain, diagnose, timing-area, coverage, 업무 지도, 고객 트랙, 그리고 KB입니다. 그래도 실제 일은 모두 같은 core 한 바퀴를 지납니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "갈래는 엔진이 아닙니다. chain은 link 표를, diagnose는 층 표를, timing-area는 하위 층 다섯을, coverage는 hole 층을 정하고, code-review는 특화 workflow와 oracle을 씁니다. 업무 지도는 출처와 고객 트랙을 정합니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "지식은 KB 한 곳이 정본입니다. intake, workflow, diagnose, 고객 트랙이 KB에 묻고, 일의 끝에서 나온 FAQ와 errata, bug 문서는 MR로 제안되어 사람이 reviewed로 올립니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "겹침 지도는 주제 열과 책임 열 칸을 맞춰 봅니다. 채운 점은 정본, 빈 점은 빌려 쓰는 곳입니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "그래서 내부 실패도, 고객 이슈도, 기능 추가도 같은 부품을 지나갑니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 236, 1780, 128], "text": "core는 둘입니다. intake는 무슨 일인지, 해도 되는지, 어디로 보낼지를 맡고, workflow는 어떻게 끝내고 무엇으로 맞았다고 할지를 맡습니다. learn에 남은 Track B는 분류 규칙과 workflow를 고칩니다. core 규약과 intake, workflow 명세는 확정이고, 실무에서 조정하는 출발점입니다."},
      {"k": "tour", "view": [300, 200, 1300, 731], "box": [330, 386, 1100, 92], "text": "chain은 긴 일을 link 사슬로 나누고, 앞 link가 뒤 link의 oracle을 만듭니다. timing-area와 coverage는 갈래 정본이 생겼고, code-review는 특화 workflow만 있습니다. chain은 확정이고 oracle 구분만 가정이며, diagnose는 확정입니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 488, 1780, 92], "text": "KB는 별도 묶음으로 반입하는 system입니다. 어떤 제품의 어떤 질문이든 원천 위치와 버전이 붙은 답을 주고, 답하지 못한 빈 곳은 채울 일감이 됩니다. 다른 주제는 KB에 직접 쓰지 않고 MR로 제안합니다. KB는 확정이고, 고객 표기 해석 등 세 줄은 확인 대기입니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 790, 830, 236], "text": "한 열에 채운 점이 여럿이면 경계를 확인할 곳입니다. 그런 열은 입구, 실행, oracle, 반영, 학습의 다섯입니다. 입구는 core가 단계와 파일을, intake가 adapter를, 업무 지도가 고객 입구를 정합니다. 실행과 oracle은 workflow가 형식을, 갈래가 그 안의 내용을 정하고, 반영은 사람이 무엇을 정하는지를 갈래가 정합니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 580, 1780, 36], "text": "첫째 길은 야간 regression 실패입니다. 같은 변경 구간의 실패 서른 개가 묶음 하나가 되고, owner가 요청하면 WF-regr-diagnose가 원인 보고를 씁니다. 수정은 후속 요청으로 가고, Track B와 bug 문서 MR이 남습니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 618, 1780, 36], "text": "둘째 길은 고객 이슈입니다. 범위 좁히기 질문 뒤에 multi-test를 돌리고, 진짜 bug면 내부 이슈를 따로 열어 첫째 길로 보냅니다. 회신은 늘 사람이 승인하고, 고객 확인으로 끝나며, errata와 FAQ 후보가 MR로 남습니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 656, 1780, 36], "text": "셋째 길은 기능 추가 사슬입니다. intake는 첫 link만 열고, link 하나가 task 하나입니다. 사람 결정 넷 외에는 검수 accept로 다음 link가 열리고, 끝에서 릴리즈 기록이 KB에 남습니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 이유는 넷입니다. 일은 모두 같은 core를 지나고, 갈래는 내용을 채우며, 지식은 KB 한 곳이 정본이고, 책임마다 정본이 하나라서 부품을 바꿔도 다른 곳이 흔들리지 않습니다."},
      {"k": "close", "text": "회사에는 자산 이식과 KB 반입, intake shadow, workflow와 diagnose, chain과 KB hook 순서로 세웁니다. core와 KB의 접점 표와 code-review 갈래 문서는 반영 대기입니다. 주제가 늘어도 같은 길 위에 내용을 더하는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "전체 지도 한 장",
    whyTitle: "왜 전체 지도가 기틀인가",
    media: {
      mp4: "media/atlas_15s.mp4", gif: "media/atlas_15s.gif", html: "media/atlas_map.html",
      png: { light: "media/atlas_map_light.png", dark: "media/atlas_map_dark.png" }
    },
    why: [
      ["한 길", "어떤 일이든 발생 → intake → workflow → 사람의 검수 → 반영 → learn을 지난다. 단계마다 남는 파일도 같다(00_intake · 10_triage · 20_gate · 30_plan · STATE · 40_result · 50_review · 60_learn). 새 갈래가 생겨도 길을 새로 만들지 않고, 사람은 어떤 일이든 같은 자리에서 같은 모양의 결과 한 장을 검수한다."],
      ["내용", "갈래는 엔진이 아니다. chain은 link 표와 C-model 층을, diagnose는 층 표와 질문 · test 묶음을, code-review · timing-area · coverage는 특화 workflow와 oracle을 정한다. 실행 · 판정 · 검수의 형식은 workflow가 한 번만 정하므로, 갈래를 더하는 일은 workflow 파일과 그 내용을 더하는 일이 된다."],
      ["지식", "지식은 KB 한 곳이 정본이다. intake(module 목록) · workflow(설계 지식 질문) · diagnose(과거 bug 패턴) · 고객 트랙(알려진 bug · errata)이 모두 KB에 묻고, 일의 끝에서 나온 FAQ · errata · bug 문서는 KB에 직접 쓰지 않고 MR로 제안해 사람이 reviewed로 올린다. 그래서 같은 사실이 여러 곳에 따로 적혀 어긋나는 일이 없다."],
      ["정본", "책임마다 정본이 하나다. 한 열에 ●가 여럿이면 그 책임을 나눠 맡는 것이고(예: 입구 = core의 단계 · 파일, intake의 adapter, 업무 지도의 출처 축 · 고객 입구), 나머지는 정본의 규칙을 빌려 쓴다. 그래서 부품 하나를 고치거나 바꿔도 다른 주제가 흔들리지 않고, 고칠 곳이 어디인지 바로 보인다."]
    ],
    zones: [
      { name: "core 한 바퀴", z: 0, stages: "발생 → intake → workflow → 사람의 검수 → 반영 → learn",
        what: "core는 둘이다. intake는 \"무슨 일인가 · 해도 되는가 · 어디로 보내나\"를, workflow는 \"어떻게 끝내고 무엇으로 맞았다고 하나\"를 맡는다.",
        ul: [
          "발생: ticket · tool 신호 · 고객 · command · 사슬의 다음 link · backlog. 어떤 발생이든 같은 레코드로 받는다.",
          "intake: 받기 → 분류 → gate. 품질 기준은 hard-zero 셋(위험 놓침 · 잘못 붙이기 · 밖으로 새기). 확정이고, 명세의 세세한 위임 결정도 확정되었다(실무에서 조정).",
          "workflow: plan → checkpoint 실행 → oracle 판정 → 결과 패키지. 판정은 도구가 하고, 한 task = 한 결과 패키지 = 한 번의 검수다. 명세 묶음의 위임 결정은 확정되었다(실무에서 조정).",
          "사람의 검수 → 반영 → learn: 사람이 결과 한 장으로 검수하고 반영한다. learn에서 Track B(쓴 workflow의 기록)가 남아 분류 규칙과 workflow revision을 고친다. core 공통 규약은 확정이다."
        ],
        go: [["core 카드", "sys", "core"], ["intake 카드", "sys", "intake"], ["workflow 카드", "sys", "workflow"]] },
      { name: "갈래 = 내용", z: 1, stages: "chain · diagnose · code-review · timing-area · coverage · 업무 지도",
        what: "갈래는 엔진이 아니다. workflow 파일(특화 · 조립)과 그 내용(link 표 · 층 표 · oracle)을 정한다.",
        ul: [
          "chain: 아키텍처부터 검증까지의 긴 일을 link(= task) 사슬로 나누고, 앞 link가 뒤 link의 oracle을 만든다. 사람 결정 넷(착수 · 아키텍처 선택 · interface freeze · sign-off). 확정이고, encoder/decoder의 oracle 구분만 가정이다.",
          "diagnose: 원인을 층부터 가르고 재현 → 가설 → 좁히기 → before/after로 확인한다. 대상을 고치지 않는다. 확정 · 실무에서 조정.",
          "timing-area: 하위 층 다섯 · 억제 기록 운용 · 같은 조건 비교. coverage: hole 층 여섯 · 채움 ≠ 확인 · closure는 사람. 둘 다 갈래 정본이 있고 가정(실무에서 조정)이다. code-review는 특화 workflow만 있고, 갈래 문서는 회사 review 절차 뒤에 쓴다.",
          "업무 지도: intake와 workflow 사이의 지도. 기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개는 확정, 분류 축 다섯 · 업무 가족 열둘 · lifecycle 여덟 단계도 확정이다(실무에서 조정). 자기 agent · 도구는 없고 intake와 workflow의 규칙 · 설정 값으로 들어간다."
        ],
        go: [["chain 카드", "sys", "chain"], ["diagnose 카드", "sys", "diagnose"], ["업무 지도 카드", "sys", "workmap"]] },
      { name: "KB = 지식의 정본", z: 2, stages: "묻기(kb-ask) · 일의 끝 → MR",
        what: "KB는 별도 묶음으로 반입하는 system이다. 어떤 제품의 어떤 질문이든 근거(원천 위치와 버전)가 붙은 답을 주고, 답하지 못한 빈 곳은 채울 일감이 된다.",
        ul: [
          "묻는 쪽: intake(module 목록), workflow(설계 지식 질문), diagnose(과거 bug 패턴), 고객 트랙(알려진 bug · errata 대조).",
          "들어오는 것: 일의 끝에서 나온 FAQ · errata 후보 · bug 문서 초안 · 릴리즈 기록. 다른 주제는 KB에 직접 쓰지 않고 MR로 제안하고, 사람이 reviewed로 올린다.",
          "KB 묶음은 확정이다. 고객 표기 해석 · 계약의 상업 조건 · 기존 문서화 AI와의 분담 세 줄은 확인 대기다.",
          "core와 KB의 접점(intake의 module 목록 = KB view, workflow의 설계 지식 질문 = kb-ask)은 아직 경계 표 수준이다(반영 대기)."
        ],
        go: [["KB 한 장", "sys", "kb"]] },
      { name: "겹침 지도", z: 3, stages: "주제 여덟 × 책임 열 칸 (● 정본 · ○ 사용)",
        what: "책임 열 칸(입구 · 분류 · gate · plan · 실행 · oracle · 검수 · 반영 · 학습 · 지식)마다 어느 주제가 규칙을 정하고(●) 어느 주제가 빌려 쓰는지(○)를 본다.",
        ul: [
          "한 열에 ●가 여럿이면 경계를 확인할 곳이다. 그런 열은 다섯(입구 · 실행 · oracle · 반영 · 학습)이고, 모두 나눠 맡는다.",
          "입구: core는 단계와 파일을, intake는 입구별 adapter를, 업무 지도는 출처 축과 고객 입구를 정한다. 고객 입구는 intake의 고객 입구 adapter가 받는다.",
          "oracle: workflow는 판정의 형식(evaluator 공통 JSON, 근거 자격)을, 갈래는 무엇이 oracle인지(chain = spec · C-model 층, diagnose = 재현 · before/after, KB = lint · 정답 표)를 정한다.",
          "학습: core는 learn 단계를, workflow는 LN 자리와 dry replay를, 업무 지도는 'Track B가 늘 붙는다'는 의무를, diagnose는 질문 · test 묶음의 revision을 정한다. 하나의 Track B 기록 형식으로 모인다.",
          "KB는 거의 모든 열에서 ● 또는 ○다. 지식의 정본은 KB뿐이다."
        ],
        go: [["시스템 카드", "tab", "sys"]] },
      { name: "일 셋 · 세우는 순서 · 빈 곳", z: 0, stages: "내부 regression · 고객 이슈 · 기능 추가 사슬",
        what: "가상의 일 셋이 같은 부품(사람 · intake · workflow · 도구 · KB)을 지나가며, 단계마다 남는 파일이 같다.",
        ul: [
          "내부 regression 실패: adapter → 같은 변경 구간의 실패 서른 개를 묶음 하나로 → owner가 원인 찾기 요청 → WF-regr-diagnose(층 판별 → bisect → module trace 첫 불일치 → before/after) → 원인 보고 검수 → 수정은 후속 요청 → Track B · bug 문서 초안 MR.",
          "고객 이슈(가상: 특정 입력에서 출력이 깨진다): 고객 입구 → 범위 좁히기 질문(받은 자료에 있는 것은 묻지 않음, 사람 승인) → 자동 multi-test → 진짜 bug면 검수자가 고른 것만 내부 이슈로 열려 link → 회신 초안을 사람이 승인 → 고객 확인 → errata · FAQ 후보 MR.",
          "기능 추가 사슬: intake는 첫 link만 연다 → link마다 workflow 한 바퀴(L3 spec ∥ L3m C-model, L4 RTL ∥ L5 검증) → 사람 결정 넷 외에는 검수 accept로 다음 link → sign-off에서 릴리즈 기록(KB).",
          "세우는 순서(migration): 0 준비 = 기존 자산 이식 · 카테고리 조사 · KB 묶음 반입 → 1 shadow = intake(분류 · gate까지) · 고객 트랙 질문 초안 → 2 첫 갈래 자율 = workflow + oracle이 강한 업무 가족 하나 · diagnose(원인 보고까지) → 3 확장 = chain · 고객 회신 초안 · KB hook.",
          "빈 곳(반영 대기): core와 KB의 접점 대응표, 합성 matrix · review ledger와 KB의 연결 필드, code-review · timing-area · coverage의 고유 내용."
        ],
        go: [["사례 다섯", "tab", "walk"], ["diagnose 카드", "sys", "diagnose"]] }
    ]
  },
  kb: {
    tab: "KB",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "제품 자료는 코드, spec, issue, 릴리즈, 합성 결과, 고객 질문으로 흩어져 있습니다. 정리한 문서는 그날부터 낡고, 출처 없는 문장이 섞여서 어느 것이 맞는지 알기 어렵습니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "KB의 북극성은 하나입니다. 어떤 제품의 어떤 질문이든 원천 위치와 버전이 붙은 답을 찾고, 답하지 못한 빈 곳은 채울 일감이 됩니다. KB는 원천을 가리키고 복사하지 않습니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "KB는 전용 agent 다섯과 script가 짓습니다. agent는 MR로 제안하고, 사람이 받아들여야 reviewed가 됩니다. 계산은 script가 하고, 확정된 릴리즈와 납품 기록은 바뀌지 않습니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "큰 할 일 여섯을 정했고, 가상 제품으로 시험했으며, 별도 묶음으로 회사에 가져갑니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "그리고 intake, workflow, diagnose, 고객 트랙이 모두 KB에 묻습니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [300, 180, 1100, 619], "box": [432, 252, 780, 160], "text": "KB의 세 성질입니다. 믿을 수 있다는 것은 모든 사실이 원천 위치와 revision을 가리키고, 추론이면 추정, 계산이면 계산이라고 표시한다는 뜻입니다. 살아 있다는 것은 원천이 바뀌면 stale 표시와 갱신 제안이 뜬다는 뜻이고, 빈 곳이 보인다는 것은 답하지 못한 질문이 gap으로 남는다는 뜻입니다."},
      {"k": "tour", "view": [1000, 200, 900, 506], "box": [1272, 252, 568, 74], "text": "가상의 질문 셋을 따라가 봅니다. 신입 설계자가 가상 module blk_parse의 header FIFO 깊이를 묻습니다. Librarian은 코드에서 생성한 표의 16과, spec의 32가 충돌 중이라는 기록을 함께 찾아, 코드 16, spec 32, 담당이 판정 중이라고 인용과 함께 답합니다."},
      {"k": "tour", "view": [1000, 200, 900, 506], "box": [1272, 338, 568, 74], "text": "FAE가 가상 고객 NOVA의 권한으로, 그 고객이 쓰는 릴리즈에 AXI burst bug가 있는지 묻습니다. Librarian은 납품 기록과 bug 문서의 fixed-in을 따라가 없다고 답합니다. 권한이 없는 사람이 물으면 고객 정보는 말하지 않고 권한 밖 gap을 남깁니다."},
      {"k": "tour", "view": [40, 380, 1200, 675], "box": [92, 478, 1072, 118], "text": "KB를 짓는 agent는 다섯입니다. Surveyor는 원천을 조사해 registry와 제품 카드를 만들고, 사람에게는 찾지 못한 것만 짧게 묻습니다. Harvester는 초안과 갱신 제안을, Curator는 정리와 검수 보조를, Librarian은 답을, Release recorder는 확정 기록을 맡습니다."},
      {"k": "tour", "view": [900, 380, 1000, 563], "box": [1176, 478, 650, 118], "text": "셋째 질문은 사건입니다. bug ticket이 종료되면 event router가 Harvester를 부르고, Harvester는 ticket과 수정 commit을 읽어 bug 문서 초안을 씁니다. 고객은 별칭으로만 적습니다. 이 초안은 MR이고, 담당이 판정해야 reviewed가 됩니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 795, 830, 112], "text": "hard-zero는 넷입니다. 근거 없는 사실, 고객 정보 누출, 확정 기록 훼손, 낡음 은폐 가운데 하나라도 나오면 그 변경을 되돌립니다. 가상 제품으로 lint 시험 66건, 질의응답 25건, 수집 3건이 모두 통과했고, 정답 표 38건은 모순이 없습니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 905, 830, 135], "text": "이 묶음은 별도 zip으로 가져가고, 회사의 Claude 세션이 가설 확인 시트로 사람과 세부를 정합니다. 파일럿 제품, 기존 template과의 정본 관계, 고객 별칭 목록, 숫자 기준은 아직 정하지 않았습니다. 고객 표기 해석, 계약의 상업 조건, 문서화 AI 분담은 확인 대기입니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [70, 608, 1780, 92], "text": "그래서 intake, workflow, diagnose, 고객 트랙이 같은 KB에 묻고, 일의 끝에서 나온 FAQ와 errata, bug 문서, 릴리즈 기록이 사건을 거쳐 KB로 돌아옵니다."},
      {"k": "close", "text": "원칙은 다섯입니다. 근거를 붙이고, 사람이 판정하고, 계산은 script가 하고, 고객 정보는 섞지 않고, 빈 곳은 일감으로 삼습니다. 근거가 붙은 지식 위에서 AI가 일하게 하는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "KB 한 장",
    whyTitle: "왜 KB가 기틀인가",
    media: {
      mp4: "media/kb_15s.mp4", gif: "media/kb_15s.gif", html: "media/kb_map.html",
      png: { light: "media/kb_map_light.png", dark: "media/kb_map_dark.png" }
    },
    why: [
      ["근거", "AI가 일하려면 믿을 수 있는 지식이 필요하다. KB의 모든 사실은 원천 위치와 revision을 가리키고, 추론이면 (추정), 계산이면 (계산), 모르면 '모름'으로 쓴다. 답에는 문서 id와 원천 revision이 인용으로 붙고, 인용 없는 주장은 hard-zero다. 자료끼리 다르면 지우지 않고 사실 종류별 우선순위로 고르며 진 쪽도 남긴다."],
      ["판정", "agent는 KB에 직접 쓰지 않고 MR로 초안과 갱신을 제안한다. 사람이 받아들여야 reviewed가 되고, 사람이 확인한 뒤 본문이 바뀌면 reviewed-outdated로 보인다. 확정된 릴리즈 · 납품 기록은 보호 원장의 hash로 묶여 바뀌지 않고, 사후 정정은 덧붙이기만 한다. 신선도 · 연결 · 누출 · 포함 여부 같은 계산은 결정론 script가 한다."],
      ["살아 있음", "정리한 날부터 낡는 문서 모음과 달리, 원천에서 사건(commit · ticket 종료 · 릴리즈 · 납품 · 고객 답변 · 합성 · 리뷰 · task accept)이 생기면 event router가 Harvester를 불러 갱신 제안을 낸다. 원천이 바뀌었는데 표시가 없으면 '낡음 은폐' hard-zero다. 답하지 못한 질문은 gap으로 남아 채울 일감이 되고, 있어야 하는데 없는 자료는 기대 자료 목록에 오른다."],
      ["한 곳", "intake(module 목록) · workflow(설계 지식 질문) · diagnose(과거 bug 패턴) · 고객 트랙(알려진 bug · errata)이 모두 같은 KB에 묻는다(kb-ask, 고객 권한과 audience를 함께 넘긴다). 일의 끝에서 나온 FAQ · errata · bug 문서 · 릴리즈 기록은 사건을 거쳐 MR로 돌아온다. 그래서 KB는 시스템 전체가 기대는 지식의 정본이 된다."]
    ],
    zones: [
      { name: "북극성 · 세 성질 · 원칙", z: 0, stages: "원천 → KB → 근거가 붙은 답 · 빈 곳 = 일감",
        what: "어떤 제품의 어떤 질문이든 근거(원천 위치와 버전)가 붙은 답을 찾고, 답하지 못한 빈 곳은 채울 일감이 된다. 세 성질 = 믿을 수 있다 · 살아 있다 · 빈 곳이 보인다.",
        ul: [
          "가리키고 복사하지 않는다. KB 문서는 원천의 위치 · revision · 요약 · 연결을 가진다. 숫자는 system of record에만 있고, 고객에게 나간 것만 동결 사본을 둔다.",
          "구조는 고정, 회사마다 다른 점은 registry의 값. 문서 종류 30 · 연결 18 · 두 축(주제 + 릴리즈) · 두 repo(본 KB + 접근 제한 고객 repo). 본문 절 구성은 기존 template에 맞춘다.",
          "원칙 다섯(바뀌지 않는 것): ① 근거 ② 사람이 판정한다 ③ 계산은 script ④ 고객 정보는 섞지 않는다(본 KB에는 고객 별칭만, 한 세션은 고객 하나만) ⑤ 빈 곳은 일감이다.",
          "원본과 정본: spec 원본 = 데이터시트, bug 최종 정리본 = errata, register 정본 = RTL · firmware code. C-model · 검증 SW는 릴리즈가 버전을 가리키는 동반 자산이다."
        ],
        go: [["KB 카드", "sys", "kb"]] },
      { name: "누가 짓나", z: 1, stages: "agent 다섯 · script · 사람(MR 판정)",
        what: "KB는 전용 agent system이 짓는다. agent는 MR로 제안하고, 사람이 reviewed로 올린다. 원천은 읽기만 한다.",
        ul: [
          "Surveyor: 제품 하나의 원천을 조사해 registry와 제품 이해 카드를 만든다. 사람에게는 빈 설문이 아니라 가설 확인 시트(원천에서 읽은 가설 → 맞음 · 고침 · 모름)로 찾지 못한 것만 묻는다.",
          "Harvester: 원천에서 template대로 초안을 쓰고, 원천 사건마다 갱신 · 확인 제안을 낸다. Curator: MR 검수 요약, 충돌 · FAQ · 중복 · 은퇴 · gap 순위 정리. Librarian: KB만으로 인용이 붙은 답, 답 못 하면 gap. Release recorder: 릴리즈 · 납품 기록, checklist 자동 판정, 동결 사본.",
          "script(결정론): lint(신선도 · 연결 · 고객 누출 · 확정 기록 변조 · 근거 없는 추정 검사, 지도 생성), generator(코드에서 port · parameter 표 생성), event router(사건 분배). script는 문서를 고치지 않고, 자기 메시지로 고객 정보를 흘리지 않는다.",
          "사람의 자리: KB 관리자 · 제품 리더 · 문서 담당(MR 판정) · 릴리즈 담당 · FAE · 보안 담당 · 팀 리더. 모든 agent는 고객 권한을 입력으로 받고, 한 세션이 두 고객 폴더를 읽지 않는다."
        ],
        go: [["KB 카드", "sys", "kb"]] },
      { name: "질문 셋이 지나가는 길", z: 2, stages: "(가) 설계 질문 · (나) 고객 질문 · (다) 사건",
        what: "가상의 질문 셋이 같은 KB를 지나가는 길이다. 제품 vx-dec, module blk_parse, 고객 NOVA는 모두 가상이다.",
        ul: [
          "(가) 신입 설계자: \"blk_parse의 header FIFO 깊이는?\" Librarian이 module 문서를 연다. port · parameter 표는 코드에서 생성한 블록이라 코드 값 16이 있고, spec과의 열린 충돌(spec은 32)이 있어 \"코드 16, spec 32, 담당이 판정 중\"을 conflict 표시와 함께, 문서 id와 원천 revision을 인용해 답한다.",
          "(나) FAE(고객 NOVA 권한): \"이 고객이 쓰는 릴리즈에 AXI burst bug가 있나?\" 납품 기록 → 지금 쓰는 릴리즈 → bug 문서의 fixed-in을 따라가 \"없다, 이전 납품에는 있었다\"를 답한다. 권한 없는 사람이 물으면 고객의 보유 릴리즈는 말하지 않고 '권한 밖' gap을 남긴다. 다른 고객의 존재는 어느 경우에도 드러나지 않는다.",
          "(다) bug ticket 종료(사건): event router가 Harvester를 부른다. ticket(전처리본)과 수정 commit을 읽어 bug 문서 초안을 쓴다. 고객은 별칭으로만, 영향 릴리즈가 ticket에 없으면 commit과 tag로 계산해 (계산) 표시, fixed-in은 \"다음 릴리즈(미정)\". module 문서의 확인 제안도 함께 낸다. 모두 MR이고, 담당이 판정하면 reviewed가 된다."
        ],
        go: [["KB 카드", "sys", "kb"]] },
      { name: "시험 · hard-zero", z: 3, stages: "가상 제품 family · lint · 질의응답 · 수집 · 정답 표",
        what: "가상 제품 family 하나(문서 51)로 설계를 시험했다. 통과율보다 설계의 구멍을 찾은 것이 가치였다.",
        ul: [
          "hard-zero 넷(하나라도 나오면 그 변경을 되돌린다): 근거 없는 사실 · 고객 정보 누출 · 확정 기록 훼손 · 낡음 은폐.",
          "lint mutation 시험 66건 전부 통과, 명세만 준 agent의 질의응답 25건과 수집 3건 통과(hard-zero 0), git 원천 adapter 6건 통과, 회사 구현용 합격 사례(조상 관계 10 · 전처리 13 · router 15)의 정답 표 38건 모순 0.",
          "시험이 찾아낸 결함은 반영했다. 예: 역색인이 고객 문서 id를 권한 구분 없이 담던 누출 → 권한 단위로 분리하고 회귀 사례를 더했다.",
          "지표(답한 비율 · reviewed 비율 · stale 수 · 사람 수정률 · 판정 부담)는 측정하되 목표값은 공란이고, 운영하는 사람(팀 리더 · KB 관리자)이 실적을 보고 정한다."
        ],
        go: [["KB 카드", "sys", "kb"]] },
      { name: "반입 · 세우는 순서 · 정할 것", z: 0, stages: "별도 zip → 회사 Claude 세션 → 파일럿 제품 하나부터",
        what: "이 설계와 별도 묶음(zip)으로 가져간다. 묶음은 큰 틀(북극성 · 원칙 · 큰 할 일)만 정하고, 세부는 회사의 Claude 세션이 가설 확인 시트로 사람과 정한다.",
        ul: [
          "큰 할 일 여섯: ① 기존 문서화 AI와 결합해 1차 문서 ② 믿음의 장치(lint CI · 확정 원장 · 권한 · hook) ③ 원천을 KB에 잇기 ④ 릴리즈 축 ⑤ 요구 축(고객 제품마다의 계약) ⑥ 살아 있게 하고 품질을 잰다. 작업 요청 열둘이 이것을 나눈다.",
          "세우는 단계(기본안): 0 준비(repo 둘 · 규칙 설치 · lint CI · 권한 · 전처리) → 1 파일럿 제품 bootstrap(card → 릴리즈 축 → bug → 요구 · spec → 고객) → 2 살아 있게(사건 hook · 매일 lint) → 3 쓰게(사람 → intake · workflow agent) → 4 넓히기.",
          "회사에서 사람과 정할 것(정하지 않았다): 파일럿 제품과 작업 순서, 기존 문서화 template과 KB 문서 종류 · 절 가운데 무엇을 정본으로 할지, 고객 별칭과 분류 코드 목록, 숫자 기준(기한 · 상한 · 주기 · 표본 크기)과 판정 등급.",
          "상태: KB 묶음은 확정이다. 고객 표기 해석 · 계약의 상업 조건(기술 요구만 가져오고 상업 조건은 옮기지 않는다는 기본안) · 기존 문서화 AI와의 분담(1차 생성은 기존 과정, KB는 출처 · 판정 · 연결 · 신선도라는 기본안) 세 줄은 확인 대기다."
        ],
        go: [["전체 지도", "tab", "atlas"], ["KB 카드", "sys", "kb"]] }
    ]
  },
  coverage: {
    tab: "coverage",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "coverage 숫자가 올랐다고 동작이 확인된 것은 아닙니다. test가 hole의 논리를 건드려도, 그 동작이 틀렸을 때 실패하지 않으면 채운 것이 아닙니다. 그리고 모든 hole이 test 부족도 아닙니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "그래서 이 갈래는 coverage 숫자와 관측 수단을 따로 셉니다. hole은 층 여섯으로 가릅니다. 측정 환경, spec 변경, covergroup 정의 오류, 도달 불가, test 부족, 그리고 RTL 결함 의심입니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "분모를 바꾸는 일은 사람이 승인합니다. covergroup을 줄이는 수정은 exclusion과 같은 승인을 받습니다. exclusion은 근거 등급이 붙고, RTL이 바뀌면 효과가 멈춥니다."},
      {"k": "intro", "seg": [9.5, 12], "text": "closure는 AI가 판정 자료를 만들고 사람이 판정합니다. 목표가 없는 종류는 충족이 아니고, 보지 못한 것이 남으면 판정 불가입니다."},
      {"k": "intro", "seg": [12, 15], "text": "채움과 확인을 따로 세니, 숫자를 믿을 수 있습니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 40, 1840, 1035], "box": [76, 300, 1768, 62], "text": "먼저 맨 위의 두 셈입니다. 채워졌는지는 coverage 숫자, 곧 도구 사실로 봅니다. 동작을 확인하는지는 checker, assertion, reference 비교 같은 관측 수단으로 봅니다. 관측 수단이 없는 동작은 따로 지적합니다."},
      {"k": "tour", "view": [40, 250, 1000, 563], "box": [72, 396, 876, 152], "text": "hole을 가르는 첫째는 측정 환경입니다. DB revision이 대상과 다르거나, merge 정의가 바뀌었거나, test가 돌지 않았으면 그 hole은 아직 hole이 아닙니다. 측정을 바로잡고 다시 판정합니다. 다음으로 bin이 가리키는 동작이 spec에서 빠졌거나 cross가 불가능한 조합이면, test가 아니라 coverage 모델의 문제입니다."},
      {"k": "tour", "view": [920, 250, 1000, 563], "box": [954, 396, 876, 152], "text": "도달 불가는 parameter로 꺼진 기능이나 방어용 branch입니다. 근거 등급은 formal 증명, spec 절과 설계 조건, 추론 순이고, formal의 결론 없음은 근거가 아닙니다. 도달 가능하면 test 후보를 만듭니다. 그래도 채워지지 않는데 formal이 도달 불가를 증명하면, spec과 RTL이 어긋난 것이므로 원인 찾기로 보냅니다."},
      {"k": "tour", "view": [40, 420, 1000, 563], "box": [74, 554, 572, 152], "text": "covergroup 수정은 분모를 바꿉니다. bin을 지우면 coverage가 오르지만, 이것은 채운 것이 아닙니다. 그래서 수정마다 spec 절과 값 범위를 대조하고, 추세에서 분모가 바뀐 것을 따로 표시합니다. bin을 지우거나 줄이는 수정은 exclusion과 같은 승인 등급을 받습니다."},
      {"k": "tour", "view": [660, 400, 1200, 675], "box": [664, 554, 1182, 152], "text": "exclusion은 억제 기록입니다. 후보마다 근거 등급과 요구 승인 등급이 붙고, 사람만 승인합니다. 승인한 뒤 RTL이 바뀌면 재확인 필요가 되어 분모에 다시 들어가고, 다시 승인하면 유효로 돌아옵니다. spec 변경으로 낸 것에는 만료 조건을 붙여, 기능이 다시 켜지면 hole로 돌아오게 합니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 800, 830, 146], "text": "closure는 검증 상태 리뷰의 판정 mode입니다. AI는 종류별 충족, 미충족과 남은 bin, 목표 없음, 판정 불가를 자료로 만들고, 사람이 받아들입니다. 실패 test가 merge되었거나 돌지 않은 test가 덮기로 한 bin이 남으면 판정 불가입니다. 같은 변화가 정기 감소 지적과 수치 feed 두 길로 오면 일 하나로 붙습니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 coverage 갈래가 기틀인 이유는 넷입니다. 채움과 확인을 따로 세고, 층부터 가릅니다. 분모를 바꾸는 일과 closure는 사람이 정하고, 보지 못한 것은 통과로 세지 않습니다."},
      {"k": "close", "text": "test 검증력 측정인 mutation은 보류이고, 붙을 자리만 적어 두었습니다. 규칙 상당수는 회사 실물을 보지 않고 정한 출발점이라 가정으로 두고 실무에서 조정하며, 목표와 기준 숫자는 공란입니다. coverage 숫자를 믿을 수 있는 근거로 만드는 것, 이것이 AI workflow를 실무에 넣는 기틀입니다."}
    ],
    title: "coverage 한 장",
    whyTitle: "왜 coverage 갈래가 기틀인가",
    media: {
      mp4: "media/coverage_15s.mp4", gif: "media/coverage_15s.gif", html: "media/coverage_map.html",
      png: { light: "media/coverage_map_light.png", dark: "media/coverage_map_dark.png" }
    },
    why: [
      ["확인", "test가 hole의 논리를 실행했어도 그 동작이 틀렸을 때 실패하지 않으면 채운 것이 아니다. 그래서 모든 판정이 coverage 숫자(도구 사실)와 관측 수단(checker · assertion · reference 비교)을 따로 센다. 관측 수단이 없는 동작은 closure와 별개로 지적으로 남는다."],
      ["층", "모든 hole이 test 부족은 아니다. 측정 환경 → spec 변경 · covergroup 정의 오류 → 도달 불가 → test 부족 순으로 지우고, 도달 가능한데 채워지지 않는 hole은 RTL 결함 의심으로 원인 찾기에 보낸다. 그래서 의미 없는 test와 근거 없는 exclusion이 생기지 않는다."],
      ["사람", "분모를 바꾸는 일은 사람이 승인한다. covergroup 축소는 exclusion과 같은 승인 등급을 받고, exclusion은 사람만 승인하며 RTL이 바뀌면 효과가 멈춘다. closure의 수용과 sign-off도 사람이다. 시스템은 억제 기록 · 목표 표를 고치지 않고 반영 후보로만 낸다."],
      ["보수", "보지 못한 것은 통과로 세지 않는다. 목표 없음은 충족이 아니고, 실패 test가 merge되었거나 돌지 않은 test가 덮을 bin이 남으면 판정 불가다. 어느 test가 어느 hole을 닫았는지, 어느 exclusion이 되돌려졌는지가 Track B로 남아 다음 판정의 근거가 된다."]
    ],
    zones: [
      { name: "두 셈 · hole 층 여섯", z: 0, stages: "채움 ≠ 확인 · 측정 환경 → … → RTL 결함 의심",
        what: "coverage 숫자와 관측 수단을 따로 세고, hole은 층 여섯으로 가른다. 층마다 끝이 다르다.",
        ul: [
          "두 셈: coverage 숫자(line · branch · condition · toggle · FSM · functional · assertion)는 도구 사실로 '건드렸다'를 말한다. '확인했다'는 checker · assertion · reference 비교 같은 관측 수단이 말한다.",
          "층 여섯과 끝: 측정 환경(coverage 일이 아니다, 측정을 바로잡고 재판정) · spec 변경(covergroup 정리 또는 만료 조건이 붙은 exclusion 후보) · covergroup 정의 오류(수정 제안) · 도달 불가(exclusion 후보) · test 부족(test 후보) · RTL 결함 의심(원인 찾기).",
          "도달 불가의 근거 등급: formal 증명 > spec 절 · 설계 조건 > 추론. formal의 '결론 없음'은 근거가 아니고, formal 증명은 그 run의 constraint 아래의 사실이므로 constraint 버전을 함께 적는다.",
          "도달 가능한데 채워지지 않으면 formal(있으면)로 다시 본다. 도달 불가가 증명되면 spec과 RTL이 어긋난 것이므로 exclusion으로 덮지 않는다.",
          "상태: 가정(위임) · 실무에서 조정. 판별 순서와 근거 등급의 결정 주체는 검증 리더다."
        ],
        go: [["coverage 카드 · 층 그림", "sys", "coverage/fig"], ["갈래 정본 (탐색기)", "bun", "wa/design/coverage"]] },
      { name: "covergroup 수정 · exclusion", z: 1, stages: "분모 바뀜 · 억제 기록 · 사람 승인",
        what: "분모를 바꾸는 일은 사람이 승인한다. covergroup 축소와 exclusion이 같은 승인 등급을 쓴다.",
        ul: [
          "covergroup 수정의 oracle은 coverage 증가가 아니라 spec 근거 대조(수정한 bin · cross마다 spec 절과 값 범위)와 분모 바뀜 표시다. 승인 전에는 줄어든 분모를 closure에 쓰지 않는다.",
          "exclusion 후보마다 맞추는 키 · anchor 구문 hash · 이유 · 근거 등급 · 요구 승인 등급이 있다. tier1은 작성자가 아닌 설계자 · 검증자 한 명, tier2는 검증 리더다. tier2의 범위는 공란이다.",
          "RTL이 바뀌어 anchor hash가 다르면 재확인 필요가 되고, 기본(suspend)에서는 분모에서 빼지 않는다. 같은 등급으로 다시 승인하면 유효로 돌아온다.",
          "spec 변경 · 기능 비활성으로 낸 exclusion에는 만료 조건(milestone · revision)을 붙여 기능이 다시 켜지면 hole로 돌아오게 한다. 시스템은 사람 칸(이유 · 승인 · 만료 조건)을 쓰지 않고 억제 기록 diff로만 제안한다."
        ],
        go: [["WF-coverage", "bun", "wa/library/WF-coverage"], ["coverage 카드 · 더 보기", "sys", "coverage/more"]] },
      { name: "closure · 추세", z: 2, stages: "판정 자료 · 사람 판정 · 블록 sign-off · 두 길",
        what: "closure는 검증 상태 리뷰의 판정 mode다. AI가 판정 자료를 만들고, 사람이 받아들인다.",
        ul: [
          "유효한 exclusion만 분모에서 뺀 뒤 종류별로 목표 표와 비교해 충족 · 미충족(남은 bin 목록) · 목표 없음 · 판정 불가를 낸다. 목표 표의 값과 closure를 켜는 milestone은 공란(검증 리더)이다.",
          "보수적으로 센다: 목표 없음은 충족이 아니고, 실패 test가 merge되었거나 결과 필터를 모르면 판정 불가, 돌지 않은 test가 덮기로 한 bin이 남으면 그 종류는 판정 불가다. closure 충족은 동작 확인이 아니다.",
          "블록 sign-off 판정은 같은 revision의 accept된 closure 판정을 재료로 읽을 뿐 다시 계산하지 않는다. 없으면 판정 불가이고, 풀 방법은 milestone에서 closure를 켜고 리뷰를 돌리는 것이다.",
          "추세: 정기 리뷰의 감소 지적과 intake의 수치 feed가 같은 변화면 일 하나로 붙는다. 분모가 바뀐 줄어듦은 따로 보이고, 측정이 바뀐 줄어듦은 coverage 일이 아니다. regression 실패가 늘어 줄었으면 실패의 원인 찾기가 먼저다."
        ],
        go: [["WF-rtl-verif-review", "bun", "wa/library/WF-rtl-verif-review"], ["WF-block-signoff", "bun", "wa/library/WF-block-signoff"]] },
      { name: "끝 · Track B · 보류", z: 3, stages: "원인 찾기로 · 학습 · mutation 보류",
        what: "채워지지 않는 도달 가능 hole은 원인 찾기로 가고, 무엇이 hole을 닫았는지가 Track B로 쌓인다.",
        ul: [
          "RTL 결함 의심과 coverage 수치 악화의 원인 찾기는 diagnose의 방법(측정 환경 층부터)을 따른다.",
          "Track B: 어느 test가 어느 hole을 닫았나(채움과 확인을 따로) · hole의 층과 근거 · 되돌려진 exclusion · 관측 수단이 없는 module · 판정 불가가 된 이유. 추론 근거 exclusion이 자주 되돌려지면 승인 등급을 올린다.",
          "mutation(RTL에 작은 결함을 넣어 test가 잡는지로 검증 환경을 재는 방법)은 보류다. 들어오면 선택 도구 evaluator, 관측 수단의 근거, 의미 없는 채우기 방지의 자리에 붙는다.",
          "상태: 갈래 정본과 workflow 이식이 있다. 규칙 상당수는 회사 실물을 보지 않고 정한 출발점이라 가정(위임)으로 두고 실무에서 조정한다."
        ],
        go: [["diagnose 그림", "sys", "diagnose/fig"], ["coverage 카드 · 더 보기", "sys", "coverage/more"]] }
    ]
  },
  timing: {
    tab: "timing-area",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "합성이나 STA에서 WNS가 나빠지면, 가장 쉬운 길은 RTL부터 고치는 것입니다. 그런데 조건이 다른 두 run을 비교했거나, constraint가 바뀌었을 수도 있습니다. 근거 없이 고치면 숫자만 남고 이유는 사라집니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "timing-area 갈래는 먼저 일을 둘로 나눕니다. sub-top 합성과 fmax, 고객 레포트용 조건 표인 matrix는 사실과 지적만 냅니다. RTL을 고치는 것은 timing 개선 workflow 하나뿐이고, 고칠지는 사람이 정합니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "위반의 원인은 하위 층 다섯으로 가릅니다. 측정, constraint, 합성 설정, library와 corner와 도구, 그리고 RTL 구조입니다. 싼 것부터 지우고, 앞의 넷이 지워진 path만 RTL 후보가 됩니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "비교는 같은 조건끼리만 합니다. constraint와 library는 남의 것이라 고치지 않고 알립니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "그래서 AI가 고치는 숫자에는 늘 근거가 붙습니다. 부분별로 보겠습니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [80, 318, 1760, 150], "text": "위 줄기는 사실을 내는 일입니다. 정기 sub-top 합성이 fmax와 QoR 칸을 쌓고, 성능과 면적 리뷰가 bottleneck을 지적합니다. 아래 줄기가 고치는 일입니다. 사람이 직접 요청하거나, 판단과 plan의 결정이 나온 뒤에만 timing 개선 workflow가 열립니다. 원인 phase에서 층을 가르고, 수정 phase에서 후보를 LEC와 regression으로 확인해 MR 후보를 냅니다."},
      {"k": "tour", "view": [40, 380, 1100, 619], "box": [80, 500, 1040, 90], "text": "층 판별은 싼 것부터입니다. 먼저 측정입니다. 비교한 두 run의 recipe나 corner가 다르면 같은 조건으로 다시 재고, 차이가 사라지면 일이 아닙니다. 다음은 constraint입니다. clock 정의가 빠졌거나 근거 없는 예외가 있으면 후보를 만들지 않고 constraint 담당에게 알립니다. 합성 설정이 바뀌었으면 합성 담당에게 알립니다."},
      {"k": "tour", "view": [800, 380, 1100, 619], "box": [1160, 470, 680, 120], "text": "library나 corner, 도구 버전이 바뀐 뒤에만 생긴 위반은 같은 RTL을 두 버전으로 돌려 가르고 담당에게 넘깁니다. 이 넷이 지워진 path만 RTL 구조 층으로 가서, 요청이 있을 때 수정 phase로 이어집니다."},
      {"k": "tour", "view": [40, 440, 1000, 563], "box": [80, 600, 860, 100], "text": "비교는 같은 조건끼리만 합니다. 합성 mode, floorplan, clock 가정 같은 숨은 축이 하나라도 다르면 비교하지 않습니다. 추세는 정기 sub-top 합성에서 보고, 숨은 축이 바뀌면 추세를 끊어 조건 바뀜으로 표시합니다. met에서 미달로 바뀐 칸은 변화 폭과 무관하게 일이 됩니다. WNS와 TNS 변화의 기준은 공란입니다."},
      {"k": "tour", "view": [920, 440, 1000, 563], "box": [980, 600, 860, 100], "text": "constraint, netlist, library는 남의 것입니다. 고치지 않고 지적과 알림을 냅니다. false path와 multicycle 예외는 사람만 MR로 쓰고, 덮는 path의 RTL이 바뀌면 효과가 멈춰 그 path의 met은 조건부가 됩니다. AI는 예외를 더하자고 제안하지 않습니다. 위반을 예외로 지우는 것은 개선이 아니기 때문입니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 800, 830, 120], "text": "결정은 사람이 합니다. constraint 변경은 constraint 담당이, 예외 승인은 동료나 설계 리더가, latency나 구조를 바꾸는 후보는 설계 리더와 아키텍트가 정합니다. 회사에 없는 선택 도구의 확인은 통과로 치지 않고, 보지 못한 것으로 적습니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 timing-area가 기틀인 이유는 넷입니다. 사실과 수정을 나누고, 싼 층부터 지우고, 같은 조건끼리만 비교하고, 남의 설정과 예외는 사람 몫으로 남깁니다."},
      {"k": "close", "text": "갈래 정본은 있지만, 층 순서와 추세 규칙, 예외 규칙의 상당수는 회사 실물을 보지 않고 정한 출발점입니다. 실무에서 조정합니다. AI가 timing을 고쳐도 숫자마다 근거가 남는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "timing-area 한 장",
    whyTitle: "왜 timing-area가 기틀인가",
    media: {
      mp4: "media/timing_15s.mp4", gif: "media/timing_15s.gif", html: "media/timing_map.html",
      png: { light: "media/timing_map_light.png", dark: "media/timing_map_dark.png" }
    },
    why: [
      ["나눔", "합성 · fmax · matrix는 사실과 지적만 내고 개선 방법은 내지 않는다. RTL을 고치는 것은 timing 개선 workflow뿐이고, 고칠지는 사람이 정한다(직접 요청, 또는 판단과 plan의 결정 뒤). 그래서 정기 합성이 돌 때마다 RTL이 바뀌는 일이 없고, 수정에는 늘 요청과 근거가 붙는다."],
      ["층", "timing 위반의 상당수는 RTL 밖(측정 · constraint · 합성 설정 · library · corner · 도구)에 원인이 있다. 싼 것부터 지우면 입력 대조와 검사 도구로 끝나는 일이 많고, 합성을 여러 번 돌리는 것은 RTL 구조 층뿐이다. 층을 모른 채 RTL 후보를 만들지 않는다."],
      ["같은 조건", "recipe · library · corner · constraint, 그리고 합성 mode · floorplan · clock 가정(숨은 축)이 다른 run끼리는 비교하지 않는다. 숨은 축이 바뀌면 추세를 '조건 바뀜'으로 끊어 거짓 악화 · 거짓 개선을 막는다. met → 미달은 변화 폭과 무관하게 일이다."],
      ["남의 것", "constraint · netlist · library는 고치지 않고 지적과 알림을 낸다. false path · multicycle 예외는 사람만 MR로 쓰고, RTL이 바뀌면 효과가 멈춰 그 path의 met은 조건부가 된다. AI는 예외 추가를 제안하지 않고, 회사에 없는 선택 도구의 확인은 통과가 아니라 '보지 못함'으로 적는다."]
    ],
    zones: [
      { name: "사실을 내는 일 · 고치는 일", z: 0, stages: "intake → 사실(sub-top 합성 · fmax · matrix · 리뷰) / 고치는 일(timing 개선 workflow)",
        what: "사실을 내는 workflow와 RTL을 고치는 workflow를 나눈다. 고칠지는 사람이 정한다(가정 · 실무에서 조정).",
        ul: [
          "입구: STA · 합성 feed, 정기 sub-top 합성, 사람 요청, 고객, milestone. intake가 요청 종류(diagnose · change · answer · decide)를 정해 workflow로 보낸다.",
          "사실: sub-top 합성과 fmax 확인, 고객 레포트용 조건 표(matrix), module의 성능 · 면적 리뷰. 사실과 지적(QoR 칸 · bottleneck · 낭비)만 내고 개선 방법은 내지 않는다. 밖으로 내는 값은 사람이 확정한다.",
          "고치는 일: timing 개선 workflow의 두 phase. 원인 phase(기준 재현 · constraint 건전성 · 원인 분석)는 path 분석 보고로 끝나고, 수정 phase는 후보 → 합성 → LEC → regression으로 MR 후보를 낸다.",
          "\"왜 나빠졌나\"만 물으면 원인 phase까지만 돈다. 원인이 constraint로 판정되면 수정 phase로 넘어가지 않고 constraint 담당에게 알린다.",
          "판단과 plan의 결정 뒤에 timing 개선 workflow가 후속 요청으로 열린다. 같은 revision의 submodule별 critical path 묶음과 area 분해가 있으면 원인 phase가 무엇부터 볼지 정하는 데 쓴다."
        ],
        go: [["timing-area 그림", "sys", "timing/fig"], ["sub-top 합성 · fmax workflow", "bun", "wa/library/WF-syn-subtop-fmax"], ["timing 개선 workflow", "bun", "wa/library/WF-timing"]] },
      { name: "하위 층 다섯", z: 1, stages: "측정 → constraint → 합성 설정 → library · corner · 도구 → RTL 구조",
        what: "timing 위반은 싼 층부터 가른다. 앞의 넷은 입력 대조와 검사 도구로 끝나고, 합성을 여러 번 돌리는 것은 RTL 구조 층뿐이다(가정 · 실무에서 조정).",
        ul: [
          "측정: 두 run의 recipe · corner · 숨은 축이 다르거나 덜 끝난 run, hierarchy 처리가 달라 area 귀속이 바뀜 → 같은 조건으로 다시 비교. 차이가 사라지면 일 아님으로 마감.",
          "constraint: clock 정의 누락 · unconstrained endpoint · 근거 없는 예외 · IO delay가 budget과 다름 · 경계 path만 미달 → 그 path는 후보를 만들지 않고 constraint 담당에게 알림.",
          "합성 설정: recipe · 합성 mode · floorplan · clock 가정의 변경 → 합성 담당에게 알림. 의도된 변경이면 기준선을 새로 잡는다.",
          "library · corner · 도구: 버전이 바뀐 뒤에만 생김 → 같은 RTL을 두 버전으로 돌려 가르고, 담당에게 넘기고 회피책을 기록한다.",
          "RTL 구조: 위 넷이 지워졌고 변경 구간이 있음, 논리 깊이 · fanout이 늘어난 path → 요청이 있을 때 timing 개선 workflow의 수정 phase.",
          "area도 같은 순서로 본다(clock이 빡빡해지면 합성이 cell을 키운다). 같은 조건에서 결과가 흔들리면 층이 아니라 불안정 상태다. 원인이 둘 섞이면 path 묶음마다 따로 보고한다."
        ],
        go: [["층 가르기 그림", "sys", "timing/fig"], ["diagnose 한 장", "sys", "diagnose/fig"]] },
      { name: "같은 조건 · 추세", z: 2, stages: "숨은 축 · 정기 sub-top 합성 · met → 미달",
        what: "같은 조건끼리만 비교하고, 추세는 정기 sub-top 합성에서 본다. 숨은 축이 바뀌면 추세를 끊는다(가정 · 실무에서 조정).",
        ul: [
          "숨은 축: 합성 mode · floorplan · clock 가정(uncertainty · latency). recipe · library · corner · constraint와 함께 하나라도 다르면 비교하지 않는다.",
          "추세의 원천은 정기 sub-top 합성이다. 값은 QoR matrix에 쌓이고, 같은 칸(sub-top · revision · recipe · library · corner · 숨은 축)의 이전 accept 칸과 비교한다. 주기와 대상 branch는 공란(합성 담당 리더 · 팀 리더).",
          "met → 미달로 바뀐 칸은 변화 폭과 무관하게 일이다(원인 찾기는 사람이 요청할 때 연다). WNS · TNS · area 변화는 기준(공란, 합성 담당 리더)을 넘을 때만 일이고, 넘지 않으면 기록만 한다.",
          "library · constraint · recipe 버전이 바뀌면 영향 칸이 낡음이 되고, 다시 돌릴 칸을 owner에게 제안한다. 숨은 축이 바뀌면 \"조건 바뀜\"으로 끊어 줄어든 것처럼 보이지 않게 한다.",
          "milestone에서는 sign-off corner · mode 목록 전부로 sub-top 합성을 돌리고, 블록 sign-off 판정이 같은 revision의 accept된 칸만 timing 재료로 읽는다."
        ],
        go: [["갈래 정본 (탐색기)", "bun", "wa/design/timing_area"], ["timing-area 요약 · 더 보기", "sys", "timing/more"]] },
      { name: "남의 것 · 예외 · 사람의 자리", z: 3, stages: "constraint · netlist · library · false path · multicycle · 보지 못한 것",
        what: "남의 설정은 고치지 않고 알린다. 예외는 사람만 쓰고 수명이 있다. 보지 못한 것은 보지 못했다고 쓴다(가정 · 실무에서 조정).",
        ul: [
          "constraint · netlist · library는 고치지 않는다. 문제를 찾으면 근거를 붙인 지적과 알림을 낸다.",
          "false path · multicycle 예외는 사람만 MR로 쓴다(근거 · 소유 역할 · 승인 · 만료 조건은 사람 칸). 승인은 동료 확인 또는 설계 리더이고, 어떤 예외가 설계 리더 승인인지는 공란이다.",
          "예외가 덮는 path의 RTL이 바뀌면 재확인이 필요해지고, 그 path의 met은 조건부가 된다. timing 개선 workflow는 그 path에 후보를 만들지 않는다. constraint에는 있는데 근거 기록이 없는 예외는 '기록 없음'으로 지적한다.",
          "예외를 더하자는 제안은 AI가 하지 않는다. \"실제로는 false path 같다\"고 보이면 그 판단을 근거와 함께 constraint 담당 알림으로 낸다.",
          "선택 도구 셋(constraint 검사 · netlist 등가성 · power 추정)이 회사에 없으면 그 확인은 '보지 못함'이다. 통과로도 실패로도 바꾸지 않는다. constraint 검사가 없으면 블록 sign-off의 timing 재료는 판정 불가다. hold와 netlist ECO는 범위 밖이다.",
          "사람이 정하는 자리: constraint 변경(constraint 담당), 예외 승인(동료 · 설계 리더), latency · interface · 구조를 바꾸는 후보(설계 리더 · 아키텍트), 목표 주파수 · area budget(제품 · 설계 리더), 고객에게 낼 QoR 값(제품 · 영업 리더).",
          "상태: 갈래 정본과 workflow 묶음 이식이 있다. 층 순서 · met → 미달 규칙 · 숨은 축 규칙 · 예외의 RTL 변경 시 동작은 회사 실물을 보지 않고 정한 출발점(가정, 위임)이고 실무에서 조정한다. 변화 기준 · 합성 주기 · constraint 소유는 회사에서 정한다."
        ],
        go: [["갈래 정본 (탐색기)", "bun", "wa/design/timing_area"], ["workflow 한 장", "sys", "workflow/fig"], ["timing-area 요약 · 더 보기", "sys", "timing/more"]] }
    ]
  }
  },

  /* ───────────── 더 깊게 논의할 것 ─────────────
     원천: intake·workflow 심화의 인계 문서(교정 후보 · 업그레이드 후보 · 확인할 것), 읽기 안내, 설계 본선의 열린 스레드. */
  talk: {
    title: "더 깊게 논의할 것",
    asOf: "2026-10-03",
    lead: "심화 세션들이 세세한 결정을 위임받아 가정으로 정했고, 그 가정은 모두 기본안으로 확정되었다(확정 = 실무에서 조정하는 출발점). 아래 ①~④는 확정된 결정의 이유와, 실무에서 조정할 때 볼 질문으로 남긴다. 맨 앞 ⓪은 그 뒤 위임으로 정한 가정이다. 항목마다 '지금'과 '볼 것'을 적었고, 관련 원문으로 바로 갈 수 있다.",
    groups: [
      { id: "recent", short: "최근 가정", cls: "y", title: "⓪ 최근 위임 가정 (실무에서 조정)",
        note: "확정 이후 위임으로 정한 것이다. 기본안으로 이미 진행되어 있고, 틀려 보이는 것만 알려 주면 된다.",
        items: [
          { id: "t-r-riskraised", t: "실행 중 위험 고지는 workflow가 보내고 intake가 손잡이를 만든다", tag: ["intake · workflow", "m"],
            what: "실행 중 worker · guard가 손잡이 없는 고객 레코드에서 위험을 올리면 workflow가 사건을 보낸다. intake는 그 dispatch가 지금 것이고 진행 중일 때만 손잡이를 확보해 위험 label을 둔다.",
            now: "레코드 상태는 그대로 두고 해제는 손잡이에서 한다. 켜는 것은 workflow 쪽 표지 하나이고 기본은 꺼짐이다.",
            ask: "실행 중 위험 고지에도 레코드를 멈춤 상태로 바꿀 것인가.",
            go: [["workflow › 자세히 §16", "sys", "workflow/more"], ["intake › 자세히", "sys", "intake/more"]] },
          { id: "t-r-signoffcat", t: "블록 sign-off 판정은 사람이 부를 때만 여는 카테고리", tag: ["intake · workflow", "m"],
            what: "intake에 블록 sign-off 카테고리를 두고 '사람 계기만'으로 표시했다. 사슬의 sign-off link는 그대로이고, 판정 결과가 있으면 읽는다.",
            now: "milestone의 추가 필수 입력은 workflow의 plan이 검사한다(gate는 바꾸지 않음).",
            ask: "정기 release처럼 일정으로 sign-off 판정을 자동으로 열 것인가.",
            go: [["WF-block-signoff", "bun", "wa/library/WF-block-signoff"]] },
          { id: "t-r-riskgrow", t: "위험 목록: 엄격화는 즉시, 완화는 회의", tag: ["core", "m"],
            what: "신호를 더하는 변경은 승인자 한 명으로 즉시, allowlist를 더하는 변경은 pattern 시험 · 원장 replay를 붙여 회의에서. 오탐의 근거는 해제 사유와 검수 판정뿐이다.",
            now: "놓친 위험이 드러나면 시험 문장을 먼저 더하고 열린 일을 다시 검사한다. fork는 신호를 더할 수만 있다.",
            ask: "엄격화도 회의를 거치게 할 것인가(멈춤이 갑자기 늘 수 있다).",
            go: [["core › 위험 감지가 자라는 법", "sys", "core/box-risk"]] },
          { id: "t-r-meeting", t: "정기 정본 회의: 세 길과 강등 두 단계", tag: ["core", "m"],
            what: "안건은 대기열에 파일로 쌓이고, 엄격화 = 즉시 / 중립 · 저위험 = 이의 기간 뒤 채택 / 완화 · 확장 · 신설 · 삭제 = 회의 결정으로 간다.",
            now: "제안자는 자기 안건을 승인하지 않는다. 강등은 즉시 '낡음' 표시 → 다음 회의까지 쓰임 · 이의가 없으면 은퇴. 주기 · 이의 기간 · 정족수는 공란(팀 리더).",
            ask: "이의 기간 채택이 팀 문화에 맞는가.",
            go: [["core › 정기 정본 회의", "sys", "core/box-meeting"]] },
          { id: "t-r-tiers", t: "모델 등급 셋과 내리지 않는 자리", tag: ["workflow", "m"],
            what: "분류 · 추출 · 해석 = 가벼운, 계약이 분명한 수정 · 작성 = 표준, 계획 · 원인 판정 · 지적 · 결과 서술 · 사람에게 가는 글 = 강한.",
            now: "위험 두 번째 검사 · planner · reviewer · result writer · 질문은 내리지 않는다. 내리기는 그림자 실행 비교 기록을 붙여 회의에서.",
            ask: "표준 등급이 맡는 수정 · 작성의 범위가 맞는가.",
            go: [["workflow › 모델 등급과 세션", "sys", "workflow/box-tiers"], ["모델 등급 설정", "bun", "wa/rules/model_tiers"]] },
          { id: "t-r-talayers", t: "timing 위반의 층 판별 순서", tag: ["timing-area", "m"],
            what: "측정 → constraint → 합성 설정 → library · corner · 도구 → RTL 구조. 앞의 넷이 지워진 path만 RTL 후보가 된다.",
            now: "앞의 넷은 입력 대조와 검사 도구로 끝나 싸다. 예외(false path · multicycle)는 사람만 쓰고, AI는 예외 추가를 제안하지 않는다.",
            ask: "우리 팀에서 실제로 가장 흔한 원인 층이 이 순서와 맞는가.",
            go: [["timing-area", "sys", "timing/fig"]] },
          { id: "t-r-tatrend", t: "met → 미달 전이는 변화 폭과 무관하게 일", tag: ["timing-area", "m"],
            what: "정기 sub-top 합성의 칸이 met에서 미달로 바뀌면 일이 된다(원인 찾기는 사람 요청 시). WNS · TNS · area 변화는 기준(공란)을 넘을 때만.",
            now: "숨은 축이 바뀌면 추세를 끊고 '조건 바뀜'으로 표시한다.",
            ask: "경계에서 met과 미달을 오가는 칸이 일을 너무 많이 만들지 않을까.",
            go: [["timing-area › 자세히", "sys", "timing/more"]] },
          { id: "t-r-cvformal", t: "도달 가능한데 도달 불가가 증명된 hole = RTL 결함 의심", tag: ["coverage", "m"],
            what: "spec상 도달 가능한 hole을 formal이 도달 불가로 증명하면 exclusion이 아니라 원인 찾기로 보낸다.",
            now: "formal 증명은 그 run의 constraint 아래의 사실이므로 constraint 버전을 근거에 함께 적는다. formal의 '결론 없음'은 근거가 아니다.",
            ask: "formal 도구가 없는 팀에서는 이 hole을 어떻게 다룰 것인가.",
            go: [["coverage", "sys", "coverage/fig"]] },
          { id: "t-r-cvnotrun", t: "돌지 않은 test가 덮을 bin이 남으면 closure 판정 불가", tag: ["coverage", "m"],
            what: "test 목록에 있는데 merge에 없는 test는 보지 못한 것이다. 그 test가 덮기로 한 bin이 남은 종류는 판정 불가로 본다.",
            now: "test와 bin의 대응이 적혀 있지 않으면 남은 bin이 있는 종류 전부가 판정 불가다.",
            ask: "대응을 모를 때 이 처리가 너무 보수적이지 않은가.",
            go: [["coverage › 자세히", "sys", "coverage/more"]] },
          { id: "t-r-cvtwo", t: "coverage 악화가 두 길로 오면 하나로", tag: ["coverage · intake", "m"],
            what: "정기 리뷰의 감소 지적과 intake의 수치 feed가 같은 변화를 가리키면 하나로 붙고 feed 레코드가 주인이다.",
            now: "feed의 기본 요청은 곧장 coverage 보강이고, 측정 환경은 그 workflow의 기준 checkpoint가 거른다.",
            ask: "측정 환경 확인(원인 찾기)을 먼저 열어야 하는가.",
            go: [["coverage › 자세히", "sys", "coverage/more"]] }
        ] },
      { id: "fix", short: "교정", cls: "r", title: "① 확정 · 실무에서 조정: 이미 확정된 것을 건드렸던 곳",
        note: "심화 세션이 확정된 설계나 서로의 계약을 바꾼 곳이다. 틀렸을 때만 고치면 된다. workflow 쪽 항목들은 intake 계약과 맞물린 곳이었고, intake 동기화로 양쪽이 맞춰졌다(반영됨). 표지가 있는 것은 켜는 사람이 시스템 관리자다.",
        items: [
          { id: "t-i-cmd", t: "intake 입구에 command를 더했다", tag: ["intake", "m"],
            what: "사람이 시스템을 직접 부르는 입구(session 명령 · skill 호출)를 입구 목록에 넣었다. 확정 당시에는 없던 입구다.",
            now: "부른 사람이 곧 요청자다. ticket 없이도 같은 intake · gate · 학습을 지나고, 결과는 부른 사람의 sandbox에 머문다. 도입 2단계부터 쓴다.",
            ask: "사람이 직접 부른 일도 intake를 지나게 할 것인가, 아니면 command는 intake 밖의 도구 호출로 둘 것인가.",
            go: [["intake 설계 › 입구 표", "bun", "ia/design"], ["부품 › adapter", "bun", "ia/agents/adapters"]] },
          { id: "t-i-reject", t: "internal 예시에서 '검수 reject 뒤 재작업'을 뺐다", tag: ["intake", "m"],
            what: "시스템 내부에서 생기는 발생의 예시에 있던 'reject 뒤 재작업'을 지웠다.",
            now: "reject 뒤에는 사람이 이어받고 시스템은 재시도하지 않는다는 core 확정과 맞췄다.",
            ask: "reject된 일을 시스템이 다시 여는 경로가 정말 없어도 되는가.",
            go: [["intake 설계", "bun", "ia/design"]] },
          { id: "t-i-self", t: "'스스로 열면 안 되는 일'을 기계가 낸 발생에만 적용", tag: ["intake", "m"],
            what: "고객 대외 회신 · 릴리스 · 다른 팀 영역 · 환경과 권한 · 사람 평가처럼 AI가 스스로 열면 안 되는 일의 목록을, 도구 · internal · state · schedule 발생에만 적용했다.",
            now: "사람이 연 일은 이 목록이 아니라 gate의 각 조건으로 판정한다.",
            ask: "사람이 요청했더라도 이 목록에 있는 일은 처음부터 막아야 하는가.",
            go: [["부품 › gate-checker §2.1", "bun", "ia/agents/gate_checker"]] },
          { id: "t-w-onresult", t: "결과가 나오면 바로 자동 수정 task (on-result)", tag: ["workflow ↔ intake", "y"],
            what: "판정형 결과가 나오자마자 policy가 기계로 허락한 자동 수정 항목만 새 task로 여는 간선이다. intake의 확정 결정('후속은 검수 뒤나 결정 뒤, reject면 만들지 않는다')과 다르다.",
            now: "intake가 on-result trigger를 받아들였다(반영됨). 켜는 것은 시스템 관리자이고 기본은 끔이다. 그전 최고 모드는 '검수 때 일괄 승인'이다. 부모가 reject되면 철회하고 표시한다.",
            ask: "검수 전에 자동 수정 task가 열리는 것을 허용할 것인가. 허용한다면 어떤 등급의 수정까지인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"], ["라이브러리 › WF-review-fix", "bun", "wa/library/WF-review-fix"]] },
          { id: "t-w-ref", t: "후속 요청 참조(부모 key + 후속 id)", tag: ["workflow ↔ intake", "y"],
            what: "자동 수정 task가 부모 결과의 항목만 적용하도록, intake의 internal 제안에 '부모 key + 후속 id'를 더하자는 제안이다.",
            now: "intake가 후속 요청 참조를 route에 받아들였다(반영됨).",
            ask: "intake 레코드에 후속 참조 칸을 더할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-ci", t: "CI 리뷰 요청 사건(MR · commit 대상)", tag: ["workflow ↔ intake", "y"],
            what: "intake의 tool 입구는 지금 run 결과만 나르고 MR branch를 제외한다. 'CI에서 코드 리뷰만' preset을 쓰려면 리뷰 요청 사건이 필요하다.",
            now: "intake가 tool 입구의 CI 리뷰 요청으로 받아들였다(반영됨). MR 대상 run은 작성자의 개인 기록 범위에 쌓인다.",
            ask: "CI의 리뷰 요청을 intake 입구로 받을 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"], ["조립 › PL-rtl-review", "bun", "wa/library/PL-rtl-review"]] },
          { id: "t-w-preset", t: "route 블록에 preset, gate가 preset 노드의 필수 입력을 본다", tag: ["workflow ↔ intake", "y"],
            what: "RTL review처럼 preset을 고르는 조립은 필수 입력이 노드마다 다르다. gate의 '정보 부족' 조건이 이것을 봐야 한다.",
            now: "intake route에 preset이 들어갔고 gate가 preset 노드의 필수 입력을 본다(반영됨). workflow의 plan도 실행 전에 한 번 더 검사한다.",
            ask: "preset을 intake가 정할 것인가, workflow의 plan이 정할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-fork", t: "가용한 workflow에 개인 fork의 candidate도 포함", tag: ["workflow ↔ intake", "y"],
            what: "지금 문구는 정본에 채택된(adopted) workflow와 fork의 draft만 말한다. 정본 회의 전의 candidate를 fork 주인이 쓸 수 있게 하자는 제안이다.",
            now: "intake의 가용성 판단에 fork candidate가 들어갔다(반영됨). 정본은 adopted만, fork의 draft · candidate는 fork 주인이 쓸 때만.",
            ask: "정본 회의를 기다리지 않고 개인이 candidate를 쓰게 할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-lint", t: "lint 정리 업무의 허용 범위에 batch 실행", tag: ["workflow ↔ intake", "y"],
            what: "등가성 · regression 근거를 기록되는 실행으로 남기려면 lint 정리에도 batch 실행이 필요하다.",
            now: "intake 설정에 반영되어, workflow 쪽 시험 설정이 덮어쓰던 줄을 지웠다.",
            ask: "lint 정리 같은 작은 수정에도 batch 실행 권한을 줄 것인가.",
            go: [["설정 › fixtures", "bun", "wa/rules/fixtures"]] },
          { id: "t-w-ask", t: "요청 종류에 review · 실험 요청이 없다", tag: ["workflow ↔ intake", "y"],
            what: "intake의 ask 종류(answer · change · diagnose · decide · notify · scheduled)에 '리뷰해 달라', '실험해 달라'가 따로 없다.",
            now: "요청 종류는 여섯 그대로 두고, 리뷰 · 실험 요청은 answer로 받는다(어떻게 일할지는 카테고리 → workflow가 정한다). intake 동기화의 가정이다.",
            ask: "ask 종류에 review를 따로 둘 것인가.",
            go: [["규칙 › asks", "bun", "ia/rules/asks"]] },
          { id: "t-w-human", t: "'사람 수행' command", tag: ["workflow ↔ intake", "y"],
            what: "사람이 같은 workflow로 직접 일을 하고 실적이 같은 표에 쌓이게 하는 경로다. intake가 ticket key와 함께 받아 사람 수행 레코드로 넘겨야 한다.",
            now: "intake가 사람 수행 command를 받아들였다(반영됨). ticket key와 함께 받아 그 레코드에 묶고, 시스템은 그 ticket에 쓰지 않는다.",
            ask: "사람이 한 일도 시스템 실적 표에 같은 형식으로 쌓을 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-fx", t: "intake 시험 설정 동기화 둘", tag: ["workflow ↔ intake", "y"],
            what: "(가) 몇 카테고리의 야간 허용 값이 '야간 대기열은 수치 oracle만' 규칙과 어긋난다. (나) RTL 구현 workflow의 입력 요건이 intake 쪽에는 spec 하나뿐인데 workflow는 대상 block · 허용 범위 · spec assertion 묶음도 필수로 둔다.",
            now: "intake 설정과 같아져 workflow 쪽 덮어쓰기를 지웠다.",
            ask: "intake 시험 설정을 workflow 쪽에 맞춰 고칠 것인가.",
            go: [["설정 › fixtures", "bun", "wa/rules/fixtures"]] },
          { id: "t-w-chain", t: "사슬(chain) 진입", tag: ["workflow ↔ intake", "y"],
            what: "카테고리의 기본 workflow가 사슬 id일 수 있게 하고, gate는 첫 link의 가용성 · 입력 요건을 보며 route는 첫 link만 연다.",
            now: "intake가 사슬 진입을 받아들였다(반영됨). 사람의 ticket 레코드가 진입 link를 직접 돌고, 다음 link부터 사슬 link 발생으로 연다.",
            ask: "기능 개발 같은 사슬 일을 intake가 처음부터 사슬로 알아보게 할 것인가.",
            go: [["조립 › CH-feature", "bun", "wa/library/CH-feature"], ["chain 요약", "sys", "chain/more"]] },
          { id: "t-w-85", t: "workflow 설계의 범위 기본값에 일곱 줄을 더했다", tag: ["workflow", "m"],
            what: "표준화 세 층, 판정형은 대상을 고치지 않음, 조립, 자동 수정은 한 번, system of record, 기록 범위, pipeline의 노드별 posture. 기존 열두 줄은 그대로다.",
            now: "확정된 workflow 설계 문서에 기본값으로 더해 두었다.",
            ask: "일곱 줄 중 받아들이기 어려운 것이 있는가.",
            go: [["설계 85 › 범위 기본값", "bun", "wa/design"]] }
        ] },
      { id: "field-i", short: "intake 가정", cls: "y", title: "② 확정 · 실무에서 조정: intake",
        note: "회사 현실과 어긋날 가능성이 가장 큰 줄들이다. 검증 현장의 감각으로 바로 판단할 수 있는 곳이 많다.",
        items: [
          { id: "t-i-handle", t: "고객 이슈의 손잡이 ticket은 위험으로 멈출 때만 만든다", tag: ["intake", "m"],
            what: "손잡이 ticket = 고객이 보지 않는 내부 project의 짝 ticket. 고객 ticket에 붙일 수 없는 label과 멈춘 이유를 여기에 둔다.",
            now: "위험 멈춤은 드물어서 ticket 수가 적게 유지된다. 다른 안: 고객 이슈마다 처음부터 만든다(label이 한곳에 모이지만, 담당은 이슈마다 ticket 두 개를 본다).",
            ask: "손잡이를 언제 만드는가.",
            go: [["intake › 자세히 §7", "sys", "intake/more"], ["workflow › 자세히 §16", "sys", "workflow/more"]] },
          { id: "t-i-handle-clear", t: "고객 이슈의 위험 멈춤은 손잡이 project의 내부 사람이면 해제할 수 있다", tag: ["intake", "m"],
            what: "해제 = 손잡이 ticket의 위험 label을 떼는 것. 내부 ticket의 해제와 같다.",
            now: "고객 이슈의 위험은 외부 공격일 수 있다. 다른 안: 운영자나 지정된 사람만(그러면 권한 없는 사람이 뗀 label을 시스템이 다시 붙이는 동작이 필요하다).",
            ask: "해제 권한을 좁힐 것인가.",
            go: [["intake › 자세히 §7", "sys", "intake/more"]] },
          { id: "t-i-flaky", t: "flaky의 정의",
            what: "flaky = 같은 입력(같은 revision · 같은 seed)에서 결과가 갈린 것만이다.",
            now: "seed 하나에서만 나는 실패는 flaky가 아니라 재현되는 버그 후보로 열고, 그 해소는 같은 seed의 pass로만 센다.",
            ask: "검증 현장에서 이 정의로 운영할 수 있는가. random regression의 현실과 맞는가.",
            go: [["규칙 › dedup", "bun", "ia/rules/dedup"], ["사례 S15", "bun", "ia/golden/GC-S15"]] },
          { id: "t-i-base", t: "수치 신호의 기준값은 사람이 닫을 때만 바뀐다",
            what: "lint 경고 수 · slack · coverage 같은 수치는 기준값(마지막 정상 상태)과 비교한다. 기준 초과는 실패처럼, 기준 안은 pass처럼 다룬다.",
            now: "기준값이 저절로 바뀌면 조금씩 나빠지는 것을 놓치므로, 사람이 일을 닫으며 정할 때만 바꾼다.",
            ask: "기준값 관리가 사람에게 부담이 되지 않는가.",
            go: [["규칙 › dedup", "bun", "ia/rules/dedup"]] },
          { id: "t-i-end", t: "도구가 연 일의 끝",
            what: "연속 pass가 나오면 해소 후보(`ai:review`)로 올리고, 닫는 것은 사람이다. 다시 실패하거나 사람이 '아직 안 고쳐졌다'고 하면 되살린다.",
            now: "도구가 연 일도 시스템이 스스로 닫지 않는다.",
            ask: "해소 후보를 사람이 일일이 닫는 것이 현장에서 버틸 만한가.",
            go: [["전체 설명 §5", "bun", "ia/overview"]] },
          { id: "t-i-human", t: "사람이 쓴 ticket은 LLM 판단만으로 '일 아님'이 되지 않는다",
            what: "사람이 쓴 ticket을 '일 아님'으로 돌리는 것은 결정론 규칙으로만 한다.",
            now: "사람의 요청을 조용히 버리는 것보다 가끔 불필요한 일을 여는 쪽이 낫다고 보았다.",
            ask: "이 방향(애매하면 일로 본다)이 맞는가.",
            go: [["전체 설명 §4", "bun", "ia/overview"]] },
          { id: "t-i-assign", t: "시스템은 ticket을 닫거나 옮기거나 사람을 배정하지 않는다",
            what: "owner에게 알림까지만 한다.",
            now: "AI가 배정하면 조직의 반발이 크다고 보았다.",
            ask: "알림만으로 일이 굴러가는가, 아니면 배정 제안 정도는 필요한가.",
            go: [["규칙 › ownership", "bun", "ia/rules/ownership"]] },
          { id: "t-i-order", t: "세우는 순서: 도구 신호를 ticket shadow 뒤에",
            what: "회사에서 세우는 순서를 0 준비 → … → 3 ticket shadow → 4 도구 신호 → … 로 두었다.",
            now: "ticket 흐름을 먼저 검수로 익힌 뒤 도구 신호를 연다.",
            ask: "도구 신호(요청자가 없어 사람 부담이 적다)를 더 먼저 여는 편이 낫지 않은가.",
            go: [["전체 설명 §7", "bun", "ia/overview"]] },
          { id: "t-i-s02", t: "첫 사례 걷기: 야간 regression 30개 실패(S02)",
            what: "main branch의 야간 regression에서 tb_d의 test 30개가 서로 다른 모양(assertion · timeout · mismatch)으로 실패했다. 30개 모두 rev 100에서 pass, rev 104에서 첫 fail이다.",
            now: "① 오류 모양이 달라도 같은 변경 구간이면 하나로 묶는다 ② 요청자는 커밋 작성자가 아니라 TB owner ③ main의 실패는 곧바로 now ④ 원인 찾기 workflow가 없으면 '논의'로 멈추고 실행하지 않는다.",
            ask: "넷 중 현장 감각과 다른 것이 있는가. 모두 맞으면 'S02 맞음'이면 충분하다.",
            go: [["읽기 안내 · 걷기 전문", "bun", "ia/session/r03"], ["사례 S02", "bun", "ia/golden/GC-S02"]] },
          { id: "t-i-next", t: "다음에 걸을 사례 여섯",
            what: "S15(random regression에서 seed 하나만 실패) · S04(license 오류가 여러 TB에서) · S25(build 붕괴 기록이 열린 동안) · U01(정보 부족 질문에 답이 옴) · U10('나눌까요'에 '나눠 주세요') · U23(대체된 도구 ticket을 사람이 중복으로 닫음).",
            now: "도구 신호 사례를 먼저 두었다. 가정이 가장 많이 들어간 곳이다.",
            ask: "어느 사례부터 걸을 것인가.",
            go: [["시험 사례 목록", "bun", "ia/golden"]] }
        ] },
      { id: "field-w", short: "workflow 가정", cls: "y", title: "② 확정 · 실무에서 조정: workflow",
        note: "workflow 결정(첫 판 75항 · 이후 79항) 중 구조를 좌우하는 것만 골랐다. 앞의 일곱이 가장 최근에 더해진 것이다. 전체는 인계 문서의 각 절 §2에 있다.",
        items: [
          { id: "t-w-track", t: "고객 트랙은 별도 workflow가 아니라 '트랙 덧붙임'이다", tag: ["workflow 후속", "m"],
            what: "고객 이슈는 카테고리(기능 불일치 · 성능 · 질문 …)의 workflow로 가고, 출처가 고객이면 그 위에 고객 경계 · 자동 multi-test · 회신 초안 · 트랙 후속이 덧붙는다.",
            now: "고객 이슈는 여러 업무 가족에 걸쳐 있어 workflow 하나로 덮을 수 없다고 보았다. 큰 가정이라 틀렸을 때만 고친다.",
            ask: "고객 대응을 업무 하나로 보고 따로 workflow를 둘 것인가.",
            go: [["workflow › 고객 트랙", "sys", "workflow/fig"], ["TR-customer", "bun", "wa/library/TR-customer"]] },
          { id: "t-w-custdraft", t: "고객 일의 posture 상한은 draft", tag: ["workflow 후속", "m"],
            what: "고객 일은 진단까지는 끝까지 돌리되, 원인 판정과 회신 문구는 사람이 확정한다.",
            now: "다른 안: 실적이 쌓이면 진단은 full로 올리고 '회신만 늘 초안'으로 둔다.",
            ask: "고객 일의 진단도 실적에 따라 full로 올릴 수 있게 할 것인가.",
            go: [["workflow › 자세히 §12", "sys", "workflow/more"]] },
          { id: "t-w-regr", t: "regression 원인 찾기 workflow는 실적이 생길 때까지 draft", tag: ["workflow 후속", "m"],
            what: "regression 원인 찾기 특화를 원인 찾기 갈래의 방법으로 채웠지만 draft로 둔다. 그동안은 조사형 one-off로 진행되고, 되풀이되면 Track B가 세어 정식으로 올린다.",
            now: "실적 없이 adopted로 올리지 않는다는 원칙을 따랐다.",
            ask: "야간 regression처럼 매일 오는 일은 처음부터 정식으로 둘 것인가.",
            go: [["WF-regr-diagnose", "bun", "wa/library/WF-regr-diagnose"], ["diagnose", "sys", "diagnose"]] },
          { id: "t-w-signoff", t: "블록 sign-off 판정을 별도 workflow로 둔다", tag: ["현장 절차", "m"],
            what: "\"이 블록이 milestone을 통과할 준비가 되었나\"를 판정형 workflow 하나가 모은다. 갈래(코드 리뷰 · 검증 상태 · 합성)는 자기 GATE에 재료만 기여하고, 사슬의 sign-off link는 그 판정을 읽기만 한다.",
            now: "다른 안: (가) 갈래별 GATE만으로 판단(블록 전체를 한 장으로 보는 자리가 없다) (나) 사슬의 sign-off link 안에 넣기(사슬 밖의 정기 release에서는 쓸 수 없다).",
            ask: "블록 sign-off를 따로 두는 것이 맞는가.",
            go: [["WF-block-signoff", "bun", "wa/library/WF-block-signoff"], ["workflow › 자세히 §15", "sys", "workflow/more"]] },
          { id: "t-w-suspend", t: "RTL이 바뀌면 걸린 waiver · exclusion은 기본으로 효과 정지", tag: ["현장 절차", "m"],
            what: "억제 기록은 승인 때의 대상 구문에 묶인다. 구문이 바뀌면 재확인이 필요해지고, 그동안 효과를 잃는다(waiver는 다시 판정, exclusion은 분모에서 빼지 않음).",
            now: "안전한 쪽을 기본으로 두고, 팀 리더 · 검증 리더가 '표시만'으로 바꿀 수 있게 열었다. RTL을 고친 직후 GATE FAIL이 늘고 다시 승인하는 부담이 생긴다.",
            ask: "표시만 하고 재확인은 milestone 때 몰아서 할 것인가.",
            go: [["workflow › 자세히 §14", "sys", "workflow/more"]] },
          { id: "t-w-milestone", t: "milestone 리뷰의 필수 입력이 빠지면 workflow의 plan이 막는다", tag: ["현장 절차", "m"],
            what: "필요한 입력: 지원 config 목록 · 단계별 엄격도 표 · closure 켜기 · sign-off corner · mode 목록. 빠지면 plan이 질문하고 기다린다.",
            now: "다른 안: intake의 gate가 일을 받을 때 먼저 막는다(더 이르게 멈추지만 intake에 milestone 규칙을 더해야 한다).",
            ask: "누가 막는 것이 맞는가.",
            go: [["PL-rtl-review", "bun", "wa/library/PL-rtl-review"]] },
          { id: "t-w-owner4", t: "소관이 회사마다 다른 넷은 지적 · 알림만", tag: ["현장 절차", "m"],
            what: "RDC sign-off · DFT 경계 · SDC 소유 · RTL ↔ netlist 등가성. 회사가 정하기 전까지 시스템은 지적과 알림만 내고 'clean'을 선언하지 않는다.",
            now: "실제 소관(어느 팀이 하는지)은 묻지 않고 회사에서 확인할 목록에 두었다.",
            ask: "이 기본 동작이 맞는가.",
            go: [["workflow › 자세히 §13", "sys", "workflow/more"]] },
          { id: "t-w-3layer", t: "세 층 표준화와 작업 모양 일곱",
            what: "공통 골격 → 작업 모양(수정 · 탐색 · 판정 · 조사 · 작성 · 결정 자료 · 실험) → 업무별 특화. 모양에 posture 상한은 두지 않는다.",
            now: "특화는 채우고 좁히기만 하고, 넓히지 못한다.",
            ask: "우리 업무가 이 일곱 모양 안에 들어오는가. 빠진 모양이 있는가.",
            go: [["라이브러리 설명", "bun", "wa/library/wf_readme"]] },
          { id: "t-w-phase", t: "phase: 요청마다 phase, 모양은 빌린다",
            what: "'원인 찾아서 고쳐 주세요'는 한 workflow의 두 phase(조사형 + 수정형)다. '원인만' 요청이면 수정 phase가 빠지고, 대상 diff는 비어야 한다.",
            now: "다중 상속 대신 phase가 다른 모양을 빌린다.",
            ask: "원인 찾기와 수정을 한 task로 묶는 것이 검수하기에 편한가.",
            go: [["예: WF-bugfix", "bun", "wa/library/WF-bugfix"], ["공통 골격 §3", "bun", "wa/library/WF-common"]] },
          { id: "t-w-task", t: "한 task = 한 결과 패키지 = 한 번의 검수, 리뷰어는 고치지 않는다",
            what: "같은 task로 잇는 것은 auto 간선뿐이다. 판정형에서 수정형으로 가는 auto 간선은 금지다.",
            now: "수정은 늘 다른 task다. 리뷰 결과의 수정 제안은 판단 노드(E)의 결정 자료로 들어가거나 검수 뒤에 열린다.",
            ask: "리뷰와 수정을 분리하는 비용(task가 둘)이 받아들일 만한가.",
            go: [["조립 › PL-rtl-review", "bun", "wa/library/PL-rtl-review"]] },
          { id: "t-w-allow", t: "자율 선언 = 실행 중 allowlist, 고정 항목",
            what: "plan의 '하겠다 · 묻겠다 · 하지 않겠다'가 guard의 허용 목록이 된다. 고치는 module의 port · parameter는 기본 고정이고, interface 변경은 사람 결정([HD]) 뒤에만 풀린다.",
            now: "guard가 실행 중에 막고, 끝에서 경계 확인이 run 시작 전 상태와 비교한다.",
            ask: "port · parameter를 기본 고정하는 것이 너무 빡빡하지 않은가.",
            go: [["부품 › checkpoint runner §3", "bun", "wa/agents/checkpoint_runner"]] },
          { id: "t-w-scope", t: "기록 범위: 사람이 부른 run은 개인 범위",
            what: "command로 부른 run과 MR 대상 CI run의 지적은 부른 사람의 개인 범위에 쌓이고, 후속은 제안으로만 남는다. 공유 branch의 정기 run은 공유 ledger에 잠정으로 쓴다.",
            now: "공유 기록은 검수 accept 뒤에 확정된다.",
            ask: "개인 리뷰 결과가 팀 ledger에 섞이지 않게 하는 이 경계가 맞는가.",
            go: [["구조", "bun", "wa/arch"]] },
          { id: "t-w-posture", t: "posture는 plan에서 표대로",
            what: "oracle이 약하면 draft, 실적도 없고 oracle도 약하면 prepare, oracle이 중간이면 실적이 충분할 때만 full이다.",
            now: "경로 규칙이 먼저다: one-off = draft 고정, 초안 신설 = draft, 이웃 합성 = 한 단계 낮춤.",
            ask: "우리 업무의 oracle 강도를 이렇게 세 값으로 나눌 수 있는가.",
            go: [["부품 › planner", "bun", "wa/agents/planner"]] },
          { id: "t-w-records", t: "records는 검수 전까지 잠정",
            what: "review ledger와 QoR matrix는 제품 코드 repo가 아닌 별도 저장소에 두고, run별 변경분은 검수 accept로 확정, reject면 그 run의 것만 되돌리고 격리한다.",
            now: "남이 인용하거나 밖으로 내보내는 것은 accept 뒤에만.",
            ask: "잠정 기록을 다른 run이 비교 기준으로 쓰는 방식이 혼란스럽지 않은가.",
            go: [["계약 › 지적 record", "bun", "wa/contracts/finding"]] },
          { id: "t-w-mode", t: "workflow mode: 필수 모드는 사람이 고른다",
            what: "성능 · 면적 리뷰(C)처럼 모드를 골라야 하는 작업은 모드를 입력 요건으로 선언한다.",
            now: "필수 모드가 없으면 기본값으로 대신 고르지 않고 질문한다. 권장 모드는 추론할 수 있고 가정으로 남긴다.",
            ask: "필수 모드를 매번 묻는 것이 번거롭지 않은가.",
            go: [["예: WF-rtl-perf-area-review", "bun", "wa/library/WF-rtl-perf-area-review"]] }
        ] },
      { id: "field-c", short: "chain 가정", cls: "y", title: "② 확정 · 실무에서 조정: chain",
        note: "chain 정본(10-01)에서 확정이 아닌 줄이다. link 표 · 검증 독립성 · spec 변경 규칙은 확정이다.",
        items: [
          { id: "t-c-oracle", t: "encoder와 decoder의 oracle 구분", tag: ["가정 · 교정 대기", "y"],
            what: "decoder는 표준이 출력을 정하므로 golden model과의 bit-exact가 판정 기준이다. encoder는 출력이 구현 선택에 따라 달라질 수 있으므로, HW 동작을 그대로 옮긴 oracle model과의 bit-exact가 판정 기준이고, 표준 적합성은 golden decoder로 다시 확인한다.",
            now: "C-model 세 층(상위 · exactness oracle · module trace)은 교정을 받아 반영했고, 이 구분만 가정으로 남았다.",
            ask: "encoder 쪽 판정 기준이 이 모양이 맞는가.",
            go: [["chain › C-model 세 층", "sys", "chain/more"]] },
          { id: "t-c-links", t: "link 이름과 개수", tag: ["검증 예정", "n"],
            what: "L1 요구 · feasibility → L2 아키텍처 → L3 spec ∥ L3m C-model → L4 RTL ∥ L5 검증 → L6 통합 · regression → L7 sign-off 준비.",
            now: "표대로 쓰고, 이름 · 개수는 과거 일감 조사로 검증한다.",
            ask: "실제 기능 추가 일감이 이 토막으로 나뉘는가. 빠진 토막(예: 성능 모델 · FPGA 검증)이 있는가.",
            go: [["chain › link 표", "sys", "chain/more"]] },
          { id: "t-c-trace", t: "module trace model이 없는 module", tag: ["기본값", "n"],
            what: "module 경계의 bit-to-bit 대조가 불가능하다.",
            now: "L5가 출력 비교만 하고, 그 사실을 coverage 목표의 빈칸으로 적는다.",
            ask: "trace model이 없는 module을 사슬 안에서 만들게 할 것인가, 빈칸으로 둘 것인가.",
            go: [["chain › 기본값", "sys", "chain/more"]] },
          { id: "t-c-first", t: "먼저 AI에 맡길 link", tag: ["기본값", "n"],
            what: "oracle이 강한 link부터 연다.",
            now: "L5 TB 골격 · test 생성이 먼저, L4 lint · assertion이 둘째. L1~L3은 oracle이 약해 draft로 오래 간다.",
            ask: "현장에서 가장 먼저 효과가 보일 link가 이것이 맞는가.",
            go: [["chain › 기본값", "sys", "chain/more"]] }
        ] },
      { id: "field-dg", short: "diagnose · 분류 가정", cls: "y", title: "② 확정 · 실무에서 조정: diagnose와 업무 지도",
        note: "층 판별 먼저 · 기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개는 확정이다. 아래도 R57에 확정되었다(실무에서 조정).",
        items: [
          { id: "t-dg-layers", t: "층 열 열 개와 층마다의 끝", tag: ["확정 · 실무에서 조정", "g"],
            what: "문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 층마다 재현 수단 · oracle · 좁히는 도구 · 끝을 정했다. 불안정은 층이 아니라 상태로 본다.",
            now: "원인이 RTL 밖에 있는 경우가 많다는 판단에서 층부터 가른다.",
            ask: "빠진 층이나 합쳐야 할 층이 있는가. 층마다의 끝이 현장과 맞는가.",
            go: [["diagnose › 자세히", "sys", "diagnose"]] },
          { id: "t-dg-bundles", t: "가족별 질문 묶음 · 증상별 multi-test 묶음", tag: ["확정 · 실무에서 조정", "g"],
            what: "고객 이슈의 층이 처음 설명으로 정해지지 않을 때, 후보를 가르는 질문만 한 번에 보내고 동시에 증상별 test를 돌린다.",
            now: "기능 불일치 · interface · 성능 · 구현 결과 · power · 문서 정합의 기본 질문, 다섯 증상의 test 묶음. Track B로 늘어난다.",
            ask: "첫 질문 묶음으로 실제로 층이 갈리는가. 먼저 만들어 둘 test 묶음은 무엇인가.",
            go: [["diagnose › 자세히", "sys", "diagnose"]] },
          { id: "t-dg-families", t: "업무 가족 열둘 · lifecycle 여덟 단계", tag: ["확정 · 실무에서 조정", "g"],
            what: "분류 축 다섯(출처 · ask · 업무 가족 · lifecycle 단계 · 층) 가운데 가족과 단계의 기본안이다.",
            now: "F1 이해 · 질문 … F12 일정 · 대응, S1 spec 학습 … S8 FPGA test. 실제 이름과 경계는 과거 일감과 기존 자산 목록으로 다시 정한다.",
            ask: "우리 조직의 일이 이 가족 · 단계로 나뉘는가.",
            go: [["업무 지도 › 자세히", "sys", "workmap"]] },
          { id: "t-dg-company", t: "회사에서 확인할 것: 고객 이슈 경로 · 기존 자산 위치", tag: ["회사에서 확인", "n"],
            what: "고객 이슈가 어디로 들어오는지, 기존 checklist · 검증 · 확인 환경이 어디에 있고 누가 담당하는지.",
            now: "자산 이식이 0단계의 중심 작업이므로 이 목록이 먼저 필요하다.",
            ask: "목록을 누가 언제 만들 것인가.",
            go: [["업무 지도", "sys", "workmap"]] }
        ] },
      { id: "design", short: "설계할 주제", cls: "m", title: "③ 아직 설계하지 않은 주제",
        note: "심화 세션들이 '다음에 깊게 볼 곳'으로 남긴 것과 설계 본선의 열린 스레드다. 순서는 제안이다.",
        items: [
          { id: "t-d-poc", t: "첫 PoC 범위: 결정론 부품 먼저", tag: ["도입", "g"],
            what: "intake는 controller + ticket adapter + raw scan + 결정론 규칙을, workflow는 controller · resolver · policy engine · evaluator adapter를 LLM 없이 먼저 세운다.",
            now: "시험 사례의 결정론 칸이 전부 맞으면 LLM 부품을 붙인다.",
            ask: "회사에서 가장 먼저 세울 한 조각을 무엇으로 할 것인가.",
            go: [["intake 전체 설명 §7", "bun", "ia/overview"], ["workflow 전체 설명 §8", "bun", "wa/overview"]] },
          { id: "t-d-tools", t: "도구 넷: 원장 replay · 자동 등급 측정 · skill 생성기 · records 저장소", tag: ["도구", "g"],
            what: "① 규칙을 바꿀 때 과거 사건의 판정만 다시 돌리는 원장 replay ② 자동 수정 등급을 계산만 하고 사람 판정과 비교하는 측정 도구 ③ workflow 파일에서 skill · 권한 규칙 · guard hook을 만드는 생성기 ④ review ledger · QoR matrix를 repo로 둘지 DB로 둘지.",
            now: "업그레이드 후보로만 적혀 있다.",
            ask: "넷 중 무엇이 가장 먼저 필요한가.",
            go: [["agent·skill로 세우기", "bun", "wa/eval/packaging"]] },
          { id: "t-d-digest", t: "owner digest의 모양", tag: ["도입", "g"],
            what: "알림 피로를 줄이는 digest(now 맨 위 · 재발 · 해소 후보 · owner 미상 · 알려진 실패 정리 후보)를 메신저와 메일 중 어디에 둘지.",
            now: "shadow 단계에서는 digest가 사람이 보는 유일한 창이다.",
            ask: "사람들이 매일 실제로 보는 자리는 어디인가.",
            go: [["평가", "bun", "ia/eval"]] }
        ] },
      { id: "site", short: "현장에서", cls: "n", title: "④ 현장에서만 답이 나오는 것",
        note: "이 설계 공간에서는 정할 수 없고, 조직의 실제 도구와 규칙을 봐야 답이 나오는 것들이다. 전체 목록은 두 인계 문서의 §5에 있다.",
        items: [
          { id: "t-s-tool", t: "도구 신호의 재료",
            what: "run 결과를 어디에 어떤 형식으로 남기는가, pass 결과도 남는가, 마지막 pass revision과 seed를 찾을 수 있는가, path → block · TB 대응표, waiver · expected-fail 목록, 수치 기준값의 출처.",
            go: [["intake 인계 문서 §5", "bun", "ia/session/handoff"]] },
          { id: "t-s-tracker", t: "issue tracker의 사건",
            what: "변경 이력의 유일한 id, 내부 전용 comment, 고객이 보는 project, 시스템 계정 구분, 생성 · 편집 · comment · label · 상태 변경을 각각 사건으로 받을 수 있는가, 자동 배정 규칙.",
            go: [["intake 인계 문서 §5", "bun", "ia/session/handoff"]] },
          { id: "t-s-run", t: "실행과 근거",
            what: "local 결과를 믿는 정책, batch job id와 로그 보존, 결정론적 짧은 도구 목록, 모델 등급 목록, scratch 사본 위치, elaboration 기반 port · parameter 추출 도구.",
            go: [["workflow 인계 문서 §5", "bun", "wa/session/handoff"]] },
          { id: "t-s-rec", t: "기록과 보고",
            what: "records 저장소 위치와 권한, coverage DB의 instance 단위 추출과 revision, recipe · library · constraint 버전 체계, 최대 주파수 탐색의 정의, 고객 레포트 형식과 공개 정책.",
            go: [["workflow 인계 문서 §5", "bun", "wa/session/handoff"]] }
        ] }
    ]
  }
,

  /* ───────────── 용어 ───────────── */
  glossary: [
    ["core 공통 규약", "일 하나가 지나가는 아홉 단계(intake → triage → gate → plan → execute → result → review → apply → learn)와, 단계마다 task 폴더에 남는 파일 하나"],
    ["intake", "core 입구. 발생을 받아 일인가 · 무엇을 원하나(ask) · 무엇에 대한 것인가 · 어떤 종류인가 · 해도 되나를 정하고 workflow로 보낸다"],
    ["workflow", "core 본체. 일 하나를 checkpoint 단위로 끝까지 진행하고 결과 패키지 한 장으로 검수받는다. 그 절차를 적은 파일도 workflow라고 부른다"],
    ["갈래", "workflow 파일과 그 내용(link 표 · 층 표 · oracle)을 정하는 주제(chain · diagnose · code-review · timing-area · coverage). 엔진은 core 하나다"],
    ["ask", "요청의 종류: answer · change · diagnose · decide · notify · scheduled. 여러 요청이 섞이면 한 workflow의 phase가 되거나 순서가 붙는다"],
    ["triage / 분류", "AI가 \"이 일로 내가 무엇을 해야 하는가\"를 알기 위한 판정. 분류 record 여섯 칸, 등급 넷(명확 · 근사 · 새 카테고리 후보 · 정보 부족)"],
    ["묶기 (dedup)", "같은 원인의 신호 여럿을 일 하나로 묶고, 다시 난 실패는 붙인다. 붙이는 것은 값이 같을 때만이다"],
    ["gate", "분류 직후 시스템이 스스로 멈추는 다섯 조건. 순서 고정: 위험 → 권한 → 정보 → 불확실 → 작업량"],
    ["hold 유형", "stop(위험) / record-only(권한) / needs-info(정보) / discuss(불확실 · 작업량 · 신설)"],
    ["raw scan", "LLM이 본문을 읽기 전에 정규식 · 목록으로 하는 위험 패턴 검사"],
    ["posture", "자율의 정도: full / draft / prepare / hold. 근거 셋(실적 · 정보 충분성 · oracle 강도)과 되돌림 축으로 고른다. 숫자 임계값은 없다"],
    ["자율 선언 · allowlist", "plan에서 \"하겠다 · 묻겠다 · 하지 않겠다\"로 선언한 범위가 실행 중 허용 목록이 되고, 행동 guard가 강제한다"],
    ["checkpoint", "\"이것이 확인되어야 다음으로 간다\"의 한 항목: 무엇이 참이어야 하는가 + 어떻게 확인하는가 + 실패하면"],
    ["[SE] / [HD] / [RC]", "부작용이 있는 checkpoint / 사람의 결정이 필요한 checkpoint / 분류 재확인 checkpoint"],
    ["세 층 표준", "WF-common(공통) → 작업 모양 일곱(예: 조사형 AR-diagnose) → 특화(예: WF-bugfix). 특화는 모양의 의무를 잠금 · 채우기 · 좁히기로 이행한다"],
    ["조립 · 간선", "workflow 여러 개를 노드와 간선(auto · on-decision · on-accept · on-result)으로 잇는 파일. pipeline과 사슬은 같은 계약의 두 모양이다"],
    ["link · 사슬", "link 하나 = task 하나 = 결과 패키지 하나. 아키텍처부터 검증까지 L1~L7(+ L3m)로 잇고, 앞 link가 뒤 link의 oracle을 만든다"],
    ["L3m · C-model 세 층", "L3 spec과 나란한 C-model link. 상위 model · exactness oracle · module trace(bit-to-bit). L3와 함께 interface freeze"],
    ["oracle", "맞았다고 판정하는 기준. lint · sim · synth · LEC · coverage, 앞 link가 만든 spec assertion · C-model처럼 결정론적일수록 강하다"],
    ["evaluator", "oracle을 실제로 돌리는 도구. 결과는 공통 JSON 한 형식"],
    ["STATE", "task의 살아 있는 상태 하나. 세션은 소모품이고 STATE가 정본이다"],
    ["question 다섯 칸", "맥락 / 질문 / 선택지와 결과 / 무응답 기본값과 기한 / 관련 과거 결정"],
    ["결과 패키지", "검수자가 이것만 보고 판정하는 한 장(40_result): 다섯 줄 요약 · 근거표 · 산출물 · MR 후보 · 가정 · 미완 · 학습 예고"],
    ["근거 등급", "근거표의 열. evaluator 확인 / 코드 · 문서 추적 / 의견"],
    ["검수 판정", "accept / accept-with-fix / reject + 어디가 문제였나. reject된 일은 사람이 이어받는다"],
    ["learn · Track B", "Track A = 일 자체, Track B = 그 일이 쓴 workflow의 기록(사용 · 막힌 곳 · 평가 · 개선 · revision). Track B가 없으면 완료가 아니다"],
    ["정본 / fork", "규칙과 지식의 정본(정기 회의로 반영) / 개인의 자유 진화 영역(바로 반영)"],
    ["층", "diagnose가 먼저 가르는 원인의 자리 열: 문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 불안정은 층이 아니라 상태다"],
    ["질문 묶음 · multi-test 묶음", "고객 이슈의 층을 가르는 질문만 한 번에 묻고, 증상별 test를 동시에 돌린다. Track B로 고쳐진다"],
    ["분류 축 다섯", "출처(고객 · 내부) · ask · 업무 가족(열둘) · lifecycle 단계(여덟) · 층"],
    ["기존 자산 이식", "팀의 checklist · 검증 · 확인 환경 · 절차서 · 판정 기준을 checkpoint · evaluator · policy로 먼저 옮겨 바닥으로 고정한다"],
    ["고객 트랙", "범위 좁히기 질문 → 자동 multi-test → 답 초안 → 사람 승인 회신 → 고객 확인. 내부 이슈와 합치지 않고 link한다. workflow 쪽에서는 별도 workflow가 아니라 카테고리 workflow 위에 덧붙는 묶음(트랙 덧붙임)이고, 고객 레코드에서는 고치지 않으며 posture 상한은 draft다"],
    ["hard-zero", "하나라도 나오면 변경을 되돌리는 지표. intake는 셋(위험 놓침 · 잘못 붙이기 · 밖으로 새기), workflow도 셋(경계 넘기 · 근거 없는 판정 · 사람 기록 훼손), KB는 넷"],
    ["시험 사례 (golden)", "명세 묶음이 정답과 함께 가진 가상 사례. 부품을 바꾸면 다시 돌린다"],
    ["label · backlog ticket", "issue tracker에 남기는 손잡이 하나 / 너무 큰 일 · 재발 방지 test · 시스템 개선을 위해 시스템이 만드는 ticket. 같은 core를 지난다"],
    ["손잡이 ticket", "고객이 보지 않는 내부 project에 두는 고객 이슈의 짝 ticket. 고객이 label을 볼 수 있으면 위험 label · 멈춘 이유 · 그 뒤의 상태 label을 여기에 둔다. 위험으로 멈출 때 intake가 만들고, workflow는 만들지 않는다"],
    ["선택 도구 · 보지 못한 것", "회사에 있으면 쓰는 evaluator(RDC · X-propagation · DFT rule · formal 도달성 · constraint 검사 · netlist 등가성 · power 추정). 없으면 그 확인은 보지 못한 것으로 남고 통과로 세지 않는다"],
    ["억제 기록", "waiver · coverage exclusion · 합성 예외처럼 사람이 승인해 도구 결과의 일부를 판정에서 빼는 기록. 승인 때의 구문에 묶이고, 구문이 바뀌면 재확인이 필요해 효과를 잃는다"],
    ["블록 sign-off 판정", "milestone에서 같은 revision의 accept된 결과를 모아 블록이 준비됨 / 미충족 / 판정 불가인지와 미결 목록을 내는 판정. sign-off 자체는 사람이 한다"],
    ["정기 정본 회의", "정본을 바꾸는 통로. 안건은 대기열에 파일로 쌓이고 방향으로 세 길에 나뉜다: 엄격화 = 즉시, 중립 · 저위험 = 이의 기간 뒤 채택, 완화 · 확장 · 신설 · 삭제 = 회의 결정"],
    ["모델 등급", "가벼운 · 표준 · 강한(과 LLM 없음). 역할마다 기본 등급이 있고, 위험 두 번째 검사 · planner · reviewer · result writer · 질문은 내리지 않는다"],
    ["숨은 축", "조건 표에 잘 드러나지 않지만 합성 결과를 바꾸는 조건(합성 mode · floorplan · clock 가정). 다르면 비교하지 않고 추세를 끊는다"],
    ["hole 층", "coverage hole이 생긴 자리: 측정 환경 · spec 변경 · covergroup 정의 오류 · 도달 불가 · test 부족 · RTL 결함 의심"],
    ["기본값은 출발점", "확정된 규칙도 회사 실물을 보기 전의 출발점이다. 근거와 함께 fork에서 먼저 바꾸고 정기 정본 회의로 정본에 올린다. 바꾸면 안 되는 것은 다섯이다"],
    ["● 정본 / ○ 사용", "전체 지도의 표시. ● = 그 책임의 규칙을 정하는 주제, ○ = 정본의 규칙을 따라 빌려 쓰는 주제"],
    ["KB", "제품 지식의 정본. 모든 사실이 원천 위치와 revision을 가리키고, agent가 MR로 제안하면 사람이 reviewed로 올린다"],
    ["reviewed", "KB 문서를 사람이 확인한 상태. agent는 만들 수 없다. 확인 뒤 본문이 바뀌면 reviewed-outdated가 된다"],
    ["gap", "KB가 답하지 못한 이유 한 건(문서 없음 · 절 없음 · 연결 없음 · 낡음 · 충돌 · 권한 밖 · KB 밖). 채울 일감이 된다"],
    ["stale", "문서가 본 원천 revision과 원천의 현재 revision이 다르다. lint가 계산하고 갱신 제안이 나온다"]
  ]
};
