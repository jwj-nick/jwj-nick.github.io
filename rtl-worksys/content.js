/* RTL WorkSys — 콘텐츠 데이터 (앱의 텍스트는 전부 여기).
   구조(v0.9, 최종판을 향한 정리): ① 한눈에(home) ② 시스템(sys: 주제마다 같은 틀) ③ 사례(walks) ④ 결정(decide · talk) + 자료실(lib · 탐색기).
   주제 카드의 한 장 · 해설판 = maps.<id>, '자세히' = deep[]의 같은 id.
   규율: 조직 실명·수치 없음. 모든 ticket·블록·신호 이름은 가상. 숫자 기준은 공란 + 결정 주체.
   본문 블록 형식: {h:"소제목"} {p:"문단"} {ul:[...]} {table:{head:[...],rows:[[...]]}} {code:"..."} {note:"..."} */
window.WS = {
  meta: {
    title: "RTL WorkSys",
    subtitle: "AI-native RTL 업무 시스템 · core 설계 노트",
    updated: "2026-10-02",
    version: "0.9",
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
    blank: "이 설계에 숫자 기준은 없다. 임계값 · 횟수 · 기간은 공란으로 두고, 누가 어떻게 정하는지만 적는다."
  },

  /* ───────────── ② 시스템: 주제마다 같은 틀 ───────────── */
  sys: {
    lead: "core 하나 위에 갈래가 얹힌다. 주제마다 같은 틀(무엇 · 한 장 · 핵심 규칙 · 사람의 자리 · 품질 기준 · 상태 · 명세 원문)로 본다.",
    order: ["core", "intake", "workflow", "chain", "diagnose", "workmap"],
    next: [
      ["timing-area", "탐색형 갈래. oracle = synth + LEC. workflow 라이브러리의 timing workflow가 목표 지표 mode(timing · area)로 첫 판을 덮는다."],
      ["coverage", "탐색형 갈래. oracle = coverage + sim. coverage workflow 첫 판이 있고, 다른 갈래가 남긴 test 보강 backlog를 소비한다."]
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
        human: ["반드시: 검수 · 반영", "조건부: gate hold · plan 때의 질문 · 사람 결정 checkpoint · 실행 중 HITL 아홉", "없음: intake · triage · result · learn은 사람 없이 끝난다"],
        quality: ["모든 일은 결과 패키지 한 장과 검수 판정 하나로 끝난다", "검수 판정이 곧 학습 재료다(accept · with-fix · reject와 '어디가 문제였나')"],
        state: [["g", "확정", "아홉 단계 · gate 다섯 조건 · posture 넷 · 사람의 자리 둘 · 결과 패키지 · 학습"], ["y", "교정 대기", "intake · workflow 명세에서 위임으로 정한 결정(intake 51 · workflow 75)이 core 설계서에 이식되어 있다"]],
        spec: [["intake 명세", "bun", "ia/overview"], ["workflow 명세", "bun", "wa/overview"]]
      },
      intake: {
        name: "intake", role: "core 입구", badge: ["확정 · 명세 교정 대기", "y"],
        one: "일의 발생을 받아 \"일인가 · 무엇을 원하나 · 어떤 종류인가 · 해도 되나 · 어디로 보내나\"를 정한다.",
        what: [
          "입구는 ticket만이 아니다: ticket · 도구 신호 · internal(backlog · 후속 · 사슬의 다음 link) · command, 나중에 schedule · 상태 변화 · mail · chat. 고객 이슈는 고객 트랙으로 간다.",
          "일곱 단계: 0 capture → 1 raw scan → 2 work-or-not → 3 understand → 4 categorize → 5 gate → 6 route. 결과는 task 폴더의 세 파일과 첫 회신 하나다.",
          "부품 열하나: 순서와 멈춤은 코드(controller · adapter · raw-scanner · dedup-linker · router), 판단은 규칙 + LLM(work-judge · gate-checker)과 LLM(understander · categorizer · reply-writer)."
        ],
        map: "intake", more: "intake",
        rules: [
          "raw scan은 LLM 앞의 코드다. 위험 문장이면 그 자리에서 멈춘다.",
          "기존 일에 붙이는 것은 값이 같을 때만(같은 branch · 같은 오류 문장, 같은 변경 구간). 한 원인의 신호 여럿은 하나로 묶는다. 닮았다는 이유로는 붙이지 않는다.",
          "flaky는 같은 입력(같은 revision · seed)에서 결과가 갈린 것만이다. seed 하나에서만 나는 실패는 버그 후보로 연다.",
          "LLM이 채운 칸에는 근거 한 줄과 근거 등급(explicit · similar-case · inferred)이 붙는다. inferred로는 '명확'을 내리지 않는다.",
          "틀릴 때의 방향: 애매하면 일로 본다, 행동이 실패하면 아무것도 하지 않는다, 보는 사람이 밖이면 쓰지 않는다."
        ],
        human: ["정보 부족이면 질문 다섯 칸에 답", "\"나눌까요\"에 답", "위험 hit 해제(오탐이면 label을 뗀다)", "배정은 하지 않는다: owner에게 알림만"],
        quality: ["hard-zero 셋: 위험 놓침 0 · 잘못 붙이기 0 · 밖으로 새기 0", "시험 사례 91건(입구별)"],
        state: [["g", "확정", "입구 일반화 · 일곱 단계 · 범위 기본값"], ["y", "교정 대기", "agent 명세의 결정 51(위임). 확정을 건드린 곳 셋(command 입구 · reject 재작업 삭제 · 스스로 열면 안 되는 일)은 먼저 확인"]],
        spec: [["intake agent 명세 (탐색기)", "bun", "ia/overview"], ["시험 사례 91", "bun", "ia/golden"]]
      },
      workflow: {
        name: "workflow", role: "core 본체", badge: ["확정 · 명세 교정 대기", "y"],
        one: "착수된 일을 결과 패키지까지 자율로 끌고 간다. 모든 workflow는 같은 골격을 물려받는다.",
        what: [
          "세 층 표준화: 공통 골격(자리 여덟 · 공통 checkpoint 넷) → 작업 모양 일곱(수정 · 탐색 · 판정 · 조사 · 작성 · 결정 자료 · 실험) → 업무별 특화 열여섯. 특화는 채우고 좁히기만 한다.",
          "여러 workflow는 조립한다: 한 task 안에서 auto로 잇는 pipeline(RTL review A~E), 사람의 결정 · 검수를 사이에 두고 task를 잇는 chain.",
          "부품 열하나: 코드 여섯(controller · resolver · policy · evaluator adapter · record writer · dry replay)과 LLM 다섯(planner · worker · hitl manager · result writer · learner)."
        ],
        map: "workflow", more: "workflow",
        rules: [
          "workflow는 step 목록이 아니라 checkpoint(무엇이 참이어야 하나 + 어떻게 확인하나)의 목록이고, 시작점(BL)을 먼저 기록한다.",
          "자율 선언(하겠다 · 묻겠다 · 하지 않겠다)이 실행 중 allowlist가 된다. guard가 선언 밖 행동을 막고, 끝에서 경계 확인이 고정 항목(port · parameter)까지 센다.",
          "근거는 기록되는 실행에서만 나온다. 판정 · 등급 · 유도값은 script가 계산하고, 보지 못한 것은 통과가 아니다.",
          "한 task = 한 결과 패키지 = 한 번의 검수. 리뷰어는 고치지 않는다. 자동 수정은 지적마다 한 번이다.",
          "세션은 소모품이고 STATE가 정본이다. batch를 기다리는 동안 세션이 끝나도 다음 세션이 이어 간다."
        ],
        human: ["검수 · 반영", "필수 mode 선택(예: 성능 · 면적 리뷰의 모드)", "실행 중 질문에 답(답이 없으면 보수적 기본값)"],
        quality: ["hard-zero 셋: 경계 넘기 0 · 근거 없는 판정 0 · 사람 기록 훼손 0", "시험 사례: 해석 29 · 한 바퀴 34 · replay 5"],
        state: [["g", "확정", "자율의 세 층 · checkpoint · posture"], ["y", "교정 대기", "agent 명세의 결정 75(위임). intake 계약과 맞물린 교정 후보 11"]],
        spec: [["workflow agent 명세 (탐색기)", "bun", "wa/overview"], ["workflow 라이브러리", "bun", "wa/library/wf_readme"]]
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
        state: [["g", "확정", "link 표 · 검증 독립성 · spec 변경 규칙"], ["y", "가정 · 교정 대기", "encoder/decoder의 oracle 구분"], ["n", "검증 예정", "link 이름 · 개수(과거 일감으로)"]],
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
        state: [["g", "확정", "층 판별 먼저"], ["y", "가정 · 교정 대기", "층 열 표 · 질문 묶음 · multi-test 묶음 · 실패 종류별 시작점"], ["n", "반영 대기", "조사형 모양의 층 판별 자리 · regression 원인 찾기 초안 · intake 질문 묶음과의 연결"]],
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
        state: [["g", "확정", "기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개"], ["y", "가정 · 교정 대기", "분류 축 다섯 · 업무 가족 열둘 · lifecycle 여덟 단계"], ["n", "회사에서 확인", "고객 이슈가 들어오는 경로 · 기존 자산의 위치와 담당"], ["n", "반영 대기", "intake의 출처 축 · 고객 입구, workflow의 Track B 칸 · 고객 회신 workflow"]],
        spec: []
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
      go: [["intake", "sys", "intake"], ["diagnose", "sys", "diagnose"], ["시험 사례 S02", "bun", "ia/golden/GC-S02"]] },
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
      go: [["workflow", "sys", "workflow"], ["WF-bugfix", "bun", "wa/library/WF-bugfix"], ["시험 사례 W01", "bun", "wa/golden/GW-W01"]] },
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
      go: [["chain", "sys", "chain"], ["CH-feature", "bun", "wa/library/CH-feature"]] },
    { id: "W5", title: "고객: \"특정 입력에서 출력이 깨진다\" → 고객 트랙", from: "고객 이슈 · 가상 고객",
      one: "질문과 자동 multi-test로 층을 가르고, 회신은 사람이 승인한다. 진짜 bug면 내부 이슈를 따로 열어 link한다.",
      steps: [
        ["접수", "코드", "출처 = 고객. 고객 표기는 별칭만. 첫 회신(접수 확인 + 다음 회신 예정)부터 시간이 기록된다."],
        ["범위 좁히기 질문", "LLM → 사람 승인", "층을 가르는 정보만 묶어서 묻는다: 쓰는 릴리즈, register 설정 값과 순서, 입력 조건, 환경(simulation · FPGA · 실리콘), 재현 빈도. 질문마다 왜 묻는지 한 줄."],
        ["자동 multi-test", "코드", "함께 돌린다: 고객 릴리즈로 우리 regression · 고객 설정 값으로 같은 입력 · 고객 memory latency 흉내 · 알려진 bug 목록 대조."],
        ["층 판별", "LLM", "고객 조건으로 우리 쪽에서도 재현된다 → 진짜 bug(새것)."],
        ["답 초안 → 승인 → 회신", "LLM → 사람", "AI는 초안까지. 회신은 늘 사람이 승인한다."],
        ["내부 이슈", "사람 → 시스템", "내부 이슈를 따로 열어 link한다(합치지 않는다). 내부에서는 diagnose → 버그 수정으로 간다. 고객 이슈는 그 진행을 따라가며 회신 일정을 관리한다."],
        ["종료", "사람", "고객이 확인하면 종료. 답이 없으면 정한 기간(공란) 뒤 담당자가 종료를 선언한다."],
        ["Track B", "코드", "어느 질문 · 어느 test가 실제로 층을 갈랐는지 기록해 질문 묶음과 test 묶음을 고친다."]
      ],
      see: ["같은 증상도 출처가 다르면 끝이 다르다(고객 확인 vs 수정과 검수).", "층부터 가른다. 원인이 고객 환경이나 문서일 수도 있다.", "Track B가 붙어야 완료다."],
      go: [["업무 지도", "sys", "workmap"], ["diagnose", "sys", "diagnose"]] }
  ],

  /* ───────────── ④ 결정 ───────────── */
  decide: {
    lead: "지금 판단할 것만 앞에 둔다. 나머지 논의 거리는 아래에 접어 두었다. 원본 문서와 이력은 설계 워크스페이스에 그대로 있다.",
    now: ["t-i-cmd", "t-i-reject", "t-i-self", "t-w-onresult", "t-w-human", "t-w-chain", "t-c-oracle", "t-i-s02", "t-i-flaky", "t-dg-layers"],
    next: [
      "교정: 위의 열 가지 중 틀린 것만 고친다. 확정을 건드린 intake 세 곳이 먼저다.",
      "읽기: diagnose와 업무 지도 카드(한 장 · 해설 포함)를 보고, 층 열 · 질문 묶음 · 업무 가족이 현장 감각과 맞는지 본다.",
      "설계 쪽 반영 대기: chain · diagnose · 업무 지도의 '반영할 곳'(intake의 출처 축 · 고객 입구, workflow의 Track B 칸 · 고객 회신 workflow, 조사형 모양의 층 판별 자리, core 설계서 · walkthrough)."
    ]
  },

  /* ───────────── 자료실 ───────────── */
  lib: {
    lead: "필요할 때만 여는 원문과 자료다. 앱의 다른 화면은 이것들을 요약한 것이다.",
    docs: [
      ["media/wf/02_workflow-standard.html", "workflow 표준화 (그림 문서)", "세 층 · 여덟 자리 · phase · 상속 규칙 · workflow가 없는 일"],
      ["media/wf/03_assembly-rtl-review.html", "조립과 RTL review (그림 문서)", "간선 종류 · pipeline preset · 리뷰 → 자동 수정 고리 · 합성 matrix"],
      ["media/wf/04_agent-system.html", "agent system (그림 문서)", "부품 지도 · task 폴더 파일과 계약 · 자율 선언 두 겹 · 세션과 STATE · hard-zero"],
      ["media/wf/01_core-one-page.html", "core 한 장 (그림 문서)", "아홉 단계 · 사람이 서는 자리 · intake와 workflow의 경계"]
    ]
  },

  /* ───────────── 주제의 '자세히' (시스템 카드 아래 접힘) ───────────── */
  deep: [
  { id: "intake", tab: "intake · 발생", short: "intake & routing", badge: "확정 · agent 명세 교정 대기",
    ext: { text: "이 주제는 09-27~28 심화에서 세울 수 있는 agent 시스템의 명세로 확장됐다. 부품 11, 데이터 계약 3, 규칙 설정 8, 시험 사례 91건, 결정 후보 51(위임에 의한 가정, 교정 대기). 아래는 요약이고, 전문과 사례는 intake agent 탐색기에 있다.", label: "◎ intake agent 탐색기 열기", go: "ia", map: "intake" },
    title: "intake & routing — 일의 발생을 받아 처리에 착수시키는 단계",
    lead: "core의 앞 세 단계(intake → triage → gate)를 입구를 ticket 하나로 한정하지 않고 일반화한 설계다. ticket 분류(분류 record 여섯 칸, gate 다섯 조건)는 그대로 유효하며, 이 페이지는 그 앞뒤에 무엇이 더 있어야 하는지를 정한다.",
    summary: [
      "AI가 처리해야 할 \"일의 발생\"은 ticket만이 아니다. 도구가 낸 신호, 예정된 시각, 상태 변화, mail·chat의 요청, 시스템 내부에서 생긴 backlog가 모두 같은 core로 들어온다.",
      "그러려면 분류 앞에 \"발생 → 공통 intake 레코드\"로 정규화하는 adapter가 입구마다 있어야 한다.",
      "분류는 카테고리 하나 고르기가 아니라 축 여럿이다: 일인가 / 무엇을 원하는가 / 무엇에 대한 것인가 / 어떤 종류의 일인가 / gate / 누가 기다리는가 / 기존 일과의 관계.",
      "일곱 단계(0 capture → 1 raw scan → 2 work-or-not → 3 understand → 4 categorize → 5 gate → 6 route)를 거쳐 task 폴더가 열리고 workflow가 지정된다. 순서와 멈춤은 코드가, 판단은 LLM이 맡는다.",
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
        ["internal backlog", "다른 갈래가 남긴 \"나중에 test 보강\", 학습 제안", "시스템 내부에서 발생. 사람이 모르는 사이에 쌓인다. (검수 reject 뒤 재작업은 넣지 않는다: reject 뒤에는 사람이 이어받는다)", "포함"],
        ["command", "사람이 시스템을 직접 부름(session 명령·skill 호출)", "부른 사람이 곧 요청자다. shadow 없이 결과는 부른 사람의 sandbox에 머문다", "포함 (도입 2단계부터)"]
      ]}},

      { h: "2. 일곱 단계 (intake → triage → gate 안의 구조)" },
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

      { h: "8. 가상 사례 넷 — 일곱 단계를 태워 본다" },
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
  { id: "workflow", tab: "workflow · 자율", short: "workflow & autonomy", badge: "확정 · agent 명세 교정 대기",
    ext: { text: "이 주제는 09-28 자율 세션에서 세울 수 있는 agent 시스템의 명세가 됐다. 중심은 표준화된 workflow 라이브러리(공통 골격 → 작업 모양 일곱 → 업무별 특화 열여섯, 조립 둘)이고, 부품 11(코드 여섯 · LLM 다섯) · 데이터 계약 11 · 시험 사례 68(해석 29 · 한 바퀴 34 · replay 5), 결정 75(위임에 의한 가정, 교정 대기)가 함께 있다. 순서와 멈춤은 코드가, 판단과 작업은 LLM이 한다. 아래는 확정 당시의 요약이고, 전문은 workflow agent 탐색기에 있다.", label: "◎ workflow agent 탐색기 열기", go: "wa", map: "workflow" },
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
  { id: "chain", tab: "chain · 사슬", short: "chain", badge: "정본 · 일부 가정",
    ext: { text: "이 주제는 10-01에 정본이 생겼다. link 여덟(L3와 C-model L3m이 나란히), C-model 세 층, 원칙 다섯, 가상 사례, 기본값. 사슬을 돌리는 조립 형식은 workflow agent 명세의 조립 CH-feature에 있다(L3m 노드와 C-model 간선까지 정본에 맞춤). link 표 · 검증 독립성 · spec 변경 규칙은 확정이고, encoder/decoder의 oracle 구분은 가정(교정 대기)이며, link 이름 · 개수는 과거 일감으로 검증할 예정이다.", label: "◎ 조립 CH-feature (workflow agent)", go: "wa/library/CH-feature", map: "chain" },
    title: "chain — 아키텍처부터 검증까지 이어지는 사슬",
    lead: "chain은 새 엔진이 아니라 core(intake · workflow) 위에서 도는 갈래다. 요구 정리부터 sign-off 준비까지를 workflow 하나로 두지 않고, link 하나 = task 하나 = workflow 하나로 나눈 뒤 조립(assembly)으로 잇는다. 사슬은 조립의 한 모양이다. 이 페이지는 사슬의 내용(link 몇 토막, 사람이 어디서 결정하는지, link 사이에 무엇이 넘어가는지, oracle이 어디서 오는지)을 정한 정본을 옮긴 것이다.",
    summary: [
      "chain은 core 위의 갈래다. link 하나 = task 하나 = workflow 하나이고, 사슬은 그것들을 잇는 조립(assembly)의 한 모양이다. 카테고리 표에는 link 카테고리가 들어가고, 사슬 진입 카테고리의 기본값이 사슬 id(CH-*)다.",
      "link: L1 요구 · feasibility → L2 아키텍처 → L3 spec ∥ L3m C-model → L4 RTL ∥ L5 검증(RTL 블라인드) → L6 통합 · regression → L7 sign-off 준비.",
      "사람의 결정은 넷이다: 착수 · 아키텍처 선택 · interface freeze · sign-off. 그 밖의 link 사이는 검수 accept로 넘어간다. 한 번에 다 열지 않고 첫 link만 연다.",
      "앞 link가 뒤 link의 oracle을 만든다. L3는 spec assertion을, L3m은 C-model 세 층(상위 model · exactness oracle model · module function-level trace model)을 맞춰 bit-exact 비교 기준과 module 경계의 bit-to-bit trace를 넘긴다.",
      "freeze 뒤 spec이 바뀌면 L3 · L3m으로 돌아가 다시 freeze하고, 영향받는 L4 · L5만 다시 연다."
    ],
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
    ],
    related: ["workflow", "posture", "hitl", "sandbox", "result"], stages: ["plan", "execute", "review"]
  },
  { id: "diagnose", tab: "diagnose · 원인", short: "diagnose", badge: "정본 · 일부 가정",
    title: "diagnose — 원인 찾기 갈래",
    lead: "intake는 \"원인을 찾아 달라\"(ask = diagnose)로 분류까지만 한다. 그 뒤 보낼 곳이 비어 있던 자리를 채운 갈래가 diagnose다. 버그 수정 · timing 개선 workflow의 원인 phase도 같은 방법을 따른다. 바탕은 업무 지도(분류 축 다섯 · 두 트랙 · 고객 트랙)다.",
    summary: [
      "순서: 층 판별 → 재현 → 가설 표 → 좁히기(싼 것부터) → before/after 확인 → 끝(층마다 다름) → Track B.",
      "층 열: 문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 원인이 RTL 밖에 있는 경우가 많아서 층부터 가른다. 같은 입력에서 결과가 갈리면 층이 아니라 '불안정' 상태로 보고 안정화 일감으로 넘긴다.",
      "고객 이슈는 처음 설명으로 층이 정해지지 않으면 후보를 가르는 질문만 한 번에 묶어 보내고, 동시에 증상별 자동 multi-test를 돌려 층을 가른다. 회신은 늘 사람이 승인한다.",
      "끝이 층마다 다르다: 문서 보강 · 결정 뒤 수정 · FAQ 축적 · 환경 안내 · errata · 내부 수정 이슈.",
      "대상을 고치지 않는다(계측은 scratch에서만). 확인하지 못한 것은 그렇다고 쓴다. 원인마다 따로 보고한다. 어느 질문 · test가 층을 갈랐는지 Track B로 남겨 묶음을 고친다."
    ],
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
      { h: "2. 층 열 (가정 · 교정 대기)" },
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
        ["층 열 표 · 질문 묶음 · multi-test 묶음 · 실패 종류별 시작점", "가정 · 교정 대기"],
        ["조사형 모양의 층 판별 자리, regression 원인 찾기 초안, intake 질문 묶음과의 연결", "반영 대기(설계 쪽)"]
      ]}}
    ],
    related: [], stages: []
  },
  { id: "workmap", tab: "업무 지도 · 분류", short: "work map", badge: "정본 · 일부 가정",
    title: "업무 지도 — 일의 분류와 진단의 바탕",
    lead: "intake(분류)와 workflow(실행) 사이에서 어떤 일이 어디서 생기고, 무엇으로 분류되며, 원인을 어떻게 좁히고, 어느 workflow로 일하는가를 한 장의 지도로 묶는다. 고객이 트리거한 일과 내부에서 생긴 일을 모두 덮는다. diagnose 갈래의 바탕이다.",
    summary: [
      "기존 자산을 먼저 옮긴다. AI용 완료 조건 · gate보다 먼저 팀의 checklist · 검증 환경 · 확인 환경 · 절차서 · 판정 기준 · 기록 양식을 workflow의 checkpoint · evaluator · policy로 옮겨 바닥으로 고정한다.",
      "모든 일에 두 트랙이 붙는다. Track A = 일 자체, Track B = 그 일이 쓴 workflow의 기록(revision · 막힌 곳 · 평가 · 개선 · 신설). Track B가 없으면 완료가 아니다. 분류와 진단에도 붙는다.",
      "분류 축 다섯: 출처(고객 · 내부) · 요청 종류(ask) · 업무 가족(열둘) · lifecycle 단계(여덟) · 층. ①~④는 intake가 정하고, ⑤는 진단이 좁혀 가며 정한다.",
      "고객 트랙: 범위 좁히기 질문 → 재현 · 자동 multi-test → 답 초안 → 사람 승인 → 회신 → 고객 확인으로 끝난다. 진짜 bug면 내부 이슈를 따로 열어 link한다.",
      "같은 증상이라도 출처가 다르면 끝까지의 과정이 다르다: 고객 이슈는 고객 확인으로, 내부 이슈는 수정과 검수로 끝난다."
    ],
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
        ["분류 축 다섯 · 업무 가족 열둘 · lifecycle 여덟 단계", "가정 · 교정 대기"],
        ["고객 이슈가 들어오는 경로 · 기존 자산의 위치와 담당", "회사에서 확인 예정"]
      ]}}
    ],
    related: [], stages: []
  }
  ],


  /* ───────────── core 한 장 (그림 · 15초 애니메이션) ─────────────
     그림과 애니메이션은 media/core_map.html 한 파일에서 30_tools/render_media.mjs가 뽑는다. */
  mapOrder: ["core", "intake", "workflow", "chain", "diagnose", "workmap"],
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
    lead: "AI workflow를 실무에 쓰려면 먼저 모든 일이 지나가는 길, 곧 core가 서 있어야 한다. 이 화면은 core 전체를 그림 한 장과 15초 애니메이션으로 보여 주고, 그림의 각 부분을 글로 풀어 둔다.",
    media: {
      mp4: "media/core_15s.mp4", gif: "media/core_15s.gif", html: "media/core_map.html",
      png: { light: "media/core_map_light.png", dark: "media/core_map_dark.png" }
    },
    story: [
      ["0~3초", "AI에게 실무를 맡기려면, 일이 지나갈 길부터 있어야 한다", "사람마다 제각각 쓰는 AI는 멈출 곳을 모르고, 배운 것이 쌓이지 않는다."],
      ["3~6.5초", "들어온 일은 모두 같은 아홉 단계를 지난다", "입구 넷에서 들어온 일이 intake와 gate를 지나고, 걸린 일은 멈춰 사람을 부른다."],
      ["6.5~9.5초", "AI는 판정자와 함께 스스로 진행하고, 사람은 두 자리에서 결정한다", "checkpoint마다 oracle이 판정하고, 검수와 반영 자리에 불이 켜진다."],
      ["9.5~11.5초", "결과는 learn으로 돌아가 다음 일을 더 잘하게 만든다", "learn 고리가 닫히고, 일이 고리를 타고 입구로 돌아간다."],
      ["11.5~15초", "core가 기틀이다. 주제마다 workflow를 얹으면 실무가 된다", "core 위에 주제 다섯이 얹히고, 왜 core가 먼저인지 네 줄이 나온다."]
    ],
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
          "세울 수 있는 agent 시스템 명세로 확장됐다: 부품 11, 데이터 계약 3, 규칙 설정 8, 시험 사례 91. 결정 후보 51이 교정을 기다린다."
        ],
        go: [["단계 › intake", "stage", "intake"], ["단계 › gate", "stage", "gate"], ["심화 › intake", "deep", "intake"], ["intake agent 탐색기", "tab", "ia"]] },
      { name: "본체 · workflow", z: 1, stages: "4 plan · 5 execute · 6 result",
        what: "workflow를 고르고 posture(full · draft · prepare · hold)를 정한 뒤, sandbox 안에서 checkpoint를 하나씩 통과해 검수자가 한 장으로 판정할 결과 패키지를 만든다.",
        ul: [
          "checkpoint마다 oracle(lint · sim · synth · LEC · coverage)이 판정한다. 결과 패키지의 근거 등급이 사실과 의견을 나눈다.",
          "실행 중에도 아홉 조건에서 사람을 부르지만 멈추지는 않는다. 질문을 남기고 sandbox 안에서 가능한 부분을 계속하며, 답이 없을 때의 기본값은 보수적이다.",
          "미완도 결과다. \"여기까지 + 이유 + 다음 후보\"로 마감한다."
        ],
        go: [["단계 › execute", "stage", "execute"], ["심화 › workflow", "deep", "workflow"]] },
      { name: "사람", z: 2, stages: "7 review · 8 apply",
        what: "사람이 반드시 서는 자리는 둘뿐이다. 사람의 역할은 분류 · 배정 · 진행 관리에서 검수 · 결정으로 옮겨 간다.",
        ul: [
          "review: 결과 패키지 한 장을 보고 accept / accept-with-fix / reject 중 하나를 고른다. 목표는 10초에 방향, 10분에 판정이다.",
          "apply: MR 생성 · 직접 commit · 회신 · 보류 · 폐기를 정한다. main으로의 MR, 고객 회신, ticket 상태 변경은 시스템이 하지 않는다.",
          "그 밖의 사람 자리는 조건부다. gate의 hold, workflow에 미리 표시된 사람 결정 checkpoint, 실행 중 HITL이 그것이다."
        ],
        go: [["단계 › review", "stage", "review"], ["개요 › 사람이 등장하는 순간", "tab", "home"]] },
      { name: "learn", z: 3, stages: "9 learn",
        what: "자동 실행 기록과 검수 판정을 합쳐 무엇을 고칠지 제안한다. 생략할 수 없는 단계다.",
        ul: [
          "제안은 개인 fork에는 즉시, 정본에는 정기 회의로 반영된다.",
          "너무 큰 개선(재발 방지 test, 문서 부재)은 backlog ticket이 되어 같은 core를 다시 탄다. 그림 왼쪽 입구의 backlog가 그것이다."
        ],
        go: [["단계 › learn", "stage", "learn"]] }
    ],
    topics: [
      ["intake", "core 입구", "확정 · agent 명세 교정 대기", "g", "이 그림의 1~3. 주제 한 장은 일곱 단계 + agent 부품으로 예정"],
      ["workflow", "core 본체", "확정", "g", "이 그림의 4~6. 주제 한 장은 세 층(경계 · checkpoint · posture)으로 예정"],
      ["chain", "갈래", "정본 · 일부 가정", "g", "있음 (#map/chain)"],
      ["timing-area", "갈래", "이름 · 성격만", "n", "예정"],
      ["coverage", "갈래", "이름 · 성격만", "n", "예정"],
      ["code-review", "갈래", "이름 · 성격만", "n", "예정"],
      ["diagnose", "갈래", "정본 · 첫 판", "y", "카드 있음 (한 장은 예정)"]
    ],
    topicsNote: "주제가 정리되면 같은 틀로 그 주제의 한 장을 만든다. 담을 것은 그 주제가 core의 어느 자리에 얹히는지, workflow의 checkpoint와 oracle, 사람이 서는 자리, 지금 상태다. 그림과 애니메이션은 장면 HTML 하나에서 같은 도구로 뽑으므로, 주제마다 장면만 새로 쓰면 된다.",
    docsNote: "workflow 자율 세션이 사람에게 설명하려고 그린 정적 그림 문서 중 core 편이다. 폭이 넓어 가로 화면이나 PC에서 보는 편이 낫다.",
    docs: [["media/wf/01_core-one-page.html", "core 한 장 (자세히)", "아홉 단계 · 사람이 서는 자리 · intake와 workflow의 경계를 한 장에 자세히"]]
  },
  intake: {
    tab: "intake",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "AI가 처리할 일은 ticket으로만 오지 않습니다. 야간 regression 실패 같은 도구 신호, 시스템이 남긴 backlog, 사람이 직접 부르는 command가 있고, 나중에는 schedule, 상태 변화, mail, chat도 들어옵니다. 입구가 늘수록 소음과 위험도 늘어납니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "intake는 어디서 온 발생이든 공통 레코드로 받아 일곱 단계를 지나게 합니다. 일인가, 무엇을 원하나, 어떤 종류인가, 해도 되나, 어디로 보내나를 차례로 정하고, 결과는 task 폴더의 세 파일과 첫 회신 하나입니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "LLM이 원문을 읽기 전에, 패턴 검사가 먼저 위험을 거릅니다. 그리고 커밋 하나가 test 서른 개를 깨뜨렸다면, 일은 서른 개가 아니라 하나입니다."},
      {"k": "intro", "seg": [9.5, 11.5], "text": "순서와 멈춤은 코드가 지키고, 판단은 LLM이 합니다."},
      {"k": "intro", "seg": [11.5, 15], "text": "입구가 정확해야 뒤의 모든 일이 삽니다. 부분별로 자세히 보겠습니다."},
      {"k": "tour", "view": [20, 240, 900, 506], "box": [90, 262, 160, 440], "text": "입구마다 adapter가 발생을 봉투로 바꿉니다. adapter는 판단하지 않고, 규칙으로 채울 수 있는 칸만 채웁니다. 입구는 꺼짐, shadow, active의 세 mode로 켜고, 무엇을 할 수 있는지는 허용 범위 설정이 막습니다. 도구 신호는 처음 켤 때 이력만 쌓고, 이미 알려진 실패는 일로 열지 않습니다."},
      {"k": "tour", "view": [380, 270, 800, 450], "box": [505, 330, 360, 280], "text": "1단계 raw scan은 LLM 앞에 둔 코드입니다. 자격 증명, 외부 반출 요구, 시스템을 조종하려는 문장이 있으면 그 자리에서 멈추고 사람에게 알립니다. 2단계에서는 일인지, 기록만 할지, 기존 일에 붙일지를 정합니다. 같은 branch에서 같은 오류 문장으로 다시 난 실패는 기존 일에 붙이고, 같은 변경 구간에서 함께 깨진 실패들은 하나로 묶습니다. 닮았다는 이유만으로는 붙이지 않습니다."},
      {"k": "tour", "view": [380, 270, 800, 450], "box": [680, 505, 200, 95], "text": "flaky는 같은 revision, 같은 seed에서 결과가 갈린 것만입니다. seed 하나에서만 나는 실패는 flaky로 넘기지 않고, 재현되는 버그 후보로 엽니다."},
      {"k": "tour", "view": [820, 270, 800, 450], "box": [865, 320, 540, 290], "text": "3단계부터 5단계는 LLM이 판단하는 자리입니다. 무엇을 원하는지, 요청이 여럿인지와 그 순서, 어떤 종류의 일인지를 읽습니다. LLM이 채운 칸에는 모두 근거 한 줄과 근거 등급이 붙습니다. 원문이 명시했는지, 채택된 사례와 닮았는지, 추론뿐인지입니다. 추론만으로는 명확하다고 판정하지 않습니다. gate는 범위 밖이면 기록만 하고, 정보가 부족하면 질문 다섯 칸을 쓰고, 불확실하면 논의로 멈춥니다."},
      {"k": "tour", "view": [1120, 260, 800, 450], "box": [1400, 310, 470, 375], "text": "6단계 route는 우선순위와 대기열을 정하고 workflow로 보냅니다. 우선순위는 규칙 근거로만 올리고, 원문이 급하다고 외쳐도 그것만으로는 올리지 않습니다. 시스템은 사람을 배정하지 않고 owner에게 알리기만 하며, ticket을 닫거나 옮기지도 않습니다. 보는 사람이 회사 밖이면 그 자리에 쓰지 않습니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "왜 intake부터 제대로 세워야 할까요. 순서가 무너지면 LLM이 위험한 원문을 먼저 읽습니다. 소음을 다스리지 못하면 알림에 지친 사람이 시스템을 끕니다. 근거가 남지 않으면 검수도 개선도 할 수 없습니다. 그래서 틀릴 때의 방향도 정해 두었습니다. 애매하면 일로 보고, 행동이 실패하면 아무것도 하지 않습니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [980, 736, 860, 314], "text": "품질 기준은 세 개의 hard-zero입니다. 위험을 놓치지 않고, 잘못 붙이지 않고, 밖으로 새지 않는 것입니다. 가상 발생 91건의 시험 세트가 이것을 확인하고, 무엇을 바꾸든 다시 돌립니다. 위임으로 정한 결정 51항은 지금 교정을 기다리고 있습니다."},
      {"k": "close", "text": "intake가 정확하면, 그 뒤의 workflow와 검수와 학습이 모두 옳은 일 위에서 돌아갑니다. 그래서 intake는 AI workflow를 실무에 넣는 첫 관문입니다."}
    ],
    title: "intake 한 장",
    whyTitle: "왜 intake부터 제대로 세워야 하나",
    lead: "intake는 일의 발생을 받아 \"일인가 · 무엇을 원하나 · 어떤 종류인가 · 해도 되나 · 어디로 보내나\"를 정하는 core의 입구다. 심화에서 세울 수 있는 agent 시스템의 명세(부품 11 · 데이터 계약 3 · 규칙 설정 8 · 시험 사례 91)가 됐다. 이 화면은 그 명세를 한 장과 15초로 보여 준다.",
    go: [["intake agent 탐색기", "bun", "ia"], ["intake 요약 페이지", "deep", "intake"]],
    media: {
      mp4: "media/intake_15s.mp4", gif: "media/intake_15s.gif", html: "media/intake_map.html",
      png: { light: "media/intake_map_light.png", dark: "media/intake_map_dark.png" }
    },
    story: [
      ["0~3초", "일은 ticket으로만 오지 않는다", "입구 여덟이 켜지고, 도구 신호에서 쏟아진 발생이 흩어진다. 입구가 늘면 소음과 위험도 는다."],
      ["3~6.5초", "모든 발생은 공통 레코드가 되어 일곱 단계를 지난다", "0 capture부터 6 route까지. 결과는 task 폴더의 세 파일과 첫 회신이다. 위험 문장이 있는 발생은 raw scan에서 빠진다."],
      ["6.5~9.5초", "LLM 앞에서 먼저 거르고, 같은 원인은 하나로 묶는다", "test 30개의 실패가 같은 변경 구간에서 났으므로 한 묶음이 된다."],
      ["9.5~11.5초", "순서와 멈춤은 코드가, 판단은 LLM이 한다", "단계마다 누가 정하는지(코드 · 규칙 + LLM · LLM)가 켜지고, gate의 hold와 route의 회신이 나온다."],
      ["11.5~15초", "입구가 정확해야 뒤의 모든 일이 산다", "왜 intake부터인지 네 줄과 품질 기준(hard-zero 셋 · 시험 사례 91)이 나온다."]
    ],
    why: [
      ["순서", "LLM 하나에게 ticket을 통째로 맡기면 원문 속 위험(자격 증명, 반출 요구, 시스템을 조종하려는 문장)을 패턴 검사보다 먼저 만난다. 그래서 raw scan을 LLM 앞에 코드로 둔다."],
      ["소음", "도구 신호는 양이 많고 반복된다. 커밋 하나가 test 서른 개를 깨뜨린 날 발생 하나를 일 하나로 열면 사람이 시스템을 끈다. 반대로 너무 쉽게 묶으면 새 버그가 옛 일 속에 묻힌다. 그래서 묶고 붙이는 일은 결정론 규칙과 이력으로 한다."],
      ["책임", "누가 무엇을 근거로 판정했는지 남지 않으면 검수도 개선도 할 수 없다. LLM이 채운 칸마다 근거 한 줄과 근거 등급이 붙고, 모든 사건과 판단이 원장에 남는다."],
      ["뒤가 산다", "intake가 틀리면 workflow · 검수 · 학습이 모두 틀린 일 위에서 돈다. 입구가 정확해야 AI workflow 전체를 실무에서 믿을 수 있다."]
    ],
    zones: [
      { name: "입구 여덟", z: 0, stages: "ticket · 도구 신호 · internal · command + 나중 넷",
        what: "adapter가 발생을 봉투로 바꾸고, 규칙으로 채울 수 있는 칸만 채운다. adapter는 판단하지 않는다.",
        ul: [
          "도구 신호는 run 하나를 봉투 하나로 보낸다. 처음 켤 때는 이력만 쌓고, 알려진 실패(waiver · expected-fail)는 일로 열지 않는다.",
          "command는 사람이 시스템을 직접 부르는 입구다. ticket 없이도 같은 intake · gate · 학습을 지나고, 결과는 부른 사람의 sandbox에 머문다.",
          "입구마다 mode(off · shadow · active)로 켜고, 무엇을 할 수 있는지는 scope가 막는다. 대화형 입구(command · chat · mail)에는 shadow가 없다."
        ],
        go: [["부품 › adapter", "bun", "ia/agents/adapters"], ["규칙 › entrances", "bun", "ia/rules/entrances"]] },
      { name: "거르고 묶기", z: 2, stages: "1 raw scan · 2 work-or-not",
        what: "LLM이 원문을 읽기 전에 pattern 검사가 위험을 거르고, 같은 일인지 · 한 원인인지를 결정론 규칙과 이력으로 정한다.",
        ul: [
          "raw scan에 걸리면 그 자리에서 멈춘다(`ai:risk`, 사람에게 알림). 사람이 해제한 hit는 다시 멈추지 않는다.",
          "dedup 두 층: sfp(같은 branch · 같은 오류 문장의 재발은 기존 일에 붙인다)와 cluster key(환경 → storm → 변경 구간 → 오류 문장 순으로 한 원인을 묶는다).",
          "flaky는 같은 입력(같은 revision · 같은 seed)에서 결과가 갈린 것만이다. seed 하나에서만 나는 실패는 재현되는 버그 후보로 연다.",
          "닮았다는 이유로는 붙이지 않는다. 기존 일에 붙이는 것은 값이 같을 때만이다."
        ],
        go: [["규칙 › dedup", "bun", "ia/rules/dedup"], ["부품 › dedup-linker", "bun", "ia/agents/dedup_linker"]] },
      { name: "읽고 판정하기", z: 1, stages: "3 understand · 4 categorize · 5 gate",
        what: "무엇을 원하나(요청 여럿과 순서), 어떤 종류인가, 해도 되나를 정한다. LLM이 채운 칸에는 근거 한 줄과 근거 등급이 붙는다.",
        ul: [
          "근거 등급은 explicit(원문이 명시) · similar-case(채택된 사례와 닮음) · inferred(추론뿐) 셋이다. inferred 근거로는 '명확' 판정을 내리지 않는다.",
          "categorize는 값싼 모델이 먼저 보고, 명확하지 않으면 강한 모델이 다시 본다.",
          "gate는 위험 → 권한 → 정보 → 불확실 → 작업량 순서로 검사한다. 범위 밖이면 좁혀서 할 수 있는 부분만 하고, 정보가 없으면 질문 다섯 칸을 쓴다."
        ],
        go: [["부품 › gate-checker", "bun", "ia/agents/gate_checker"], ["계약 › 공통 레코드", "bun", "ia/contracts/intake_record"]] },
      { name: "보내기와 회신", z: 3, stages: "6 route",
        what: "우선순위 · 대기열 · 이어진 요청을 정하고 workflow로 보낸다. 결과는 task 폴더의 세 파일과 첫 회신 하나다.",
        ul: [
          "우선순위는 규칙 근거로만 올린다. 원문의 어조('급함!!')로는 올리지 않는다.",
          "배정하지 않고 owner에게 알림만 한다. ticket을 닫거나 옮기지도 않는다.",
          "보는 사람이 밖이면 그 자리에 쓰지 않는다(초안 + 내부 알림)."
        ],
        go: [["부품 › router", "bun", "ia/agents/router"], ["규칙 › priority", "bun", "ia/rules/priority"]] }
    ]
  },
  workflow: {
    tab: "workflow",
    narr: [
      {"k": "intro", "seg": [0, 3], "text": "업무마다, 사람마다 절차가 다르면 무엇이 끝인지, 어디까지 해도 되는지, 무엇이 근거인지가 흐려집니다. 실적도 같은 표에 쌓이지 않으니 배울 곳이 없습니다."},
      {"k": "intro", "seg": [3, 6.5], "text": "그래서 모든 workflow는 같은 골격을 물려받습니다. 공통 골격 위에 작업 모양 일곱 가지가 있고, 그 위에 업무별 특화 workflow가 얹힙니다."},
      {"k": "intro", "seg": [6.5, 9.5], "text": "순서와 멈춤은 코드가 지키고, 판단과 작업은 LLM이 합니다. 선언하지 않은 행동은 guard가 막습니다."},
      {"k": "intro", "seg": [9.5, 12], "text": "여러 workflow는 조립해서 씁니다. 한 task는 한 결과 패키지이고 한 번의 검수입니다. 리뷰어는 고치지 않습니다."},
      {"k": "intro", "seg": [12, 15], "text": "한 번 표준화해 두면, 새 업무는 특화 한 장만 쓰면 됩니다. 하나씩 보겠습니다."},
      {"k": "tour", "view": [40, 200, 1180, 664], "box": [80, 258, 1080, 104], "text": "공통 골격에는 모든 workflow가 같은 순서로 지나는 여덟 자리가 있습니다. plan, 입력, 시작점, 본체, 판정, 회귀와 부작용, 결과, 학습입니다. 여기에 입력 확인, 경계 확인, 결과 패키지, 학습의 공통 checkpoint 넷이 구조로 붙습니다. 시작점이 모든 workflow에 있는 이유는, 끝을 판정하려면 처음에 무엇이 참이었는지가 기록되어 있어야 하기 때문입니다."},
      {"k": "tour", "view": [40, 330, 1180, 664], "box": [80, 398, 1080, 262], "text": "작업 모양은 일곱 가지입니다. 수정, 탐색, 판정, 조사, 작성, 결정 자료, 실험입니다. 모양이 자리를 어떻게 채울지 정하고, 특화 workflow는 업무의 구체만 씁니다. 특화는 채우고 좁힐 수만 있고 넓히지는 못합니다. 원인을 찾아 고쳐 달라는 일처럼 모양이 둘이면 phase가 다른 모양을 빌립니다. 그래서 원인만, 또는 수정만 해 달라는 요청도 같은 workflow가 받습니다."},
      {"k": "tour", "view": [1170, 240, 720, 405], "box": [1212, 300, 646, 256], "text": "agent 시스템의 부품은 열한 개입니다. controller, resolver, policy, evaluator, record writer, dry replay는 LLM이 없는 코드이고, planner, worker, hitl, result writer, learner는 LLM입니다. 판정과 등급처럼 계산이 필요한 값은 script가 내고, LLM이 쓴 판정 값은 근거와 대조해 낮춰질 수 있습니다."},
      {"k": "tour", "view": [1170, 300, 720, 405], "box": [1212, 574, 646, 94], "text": "plan에서 AI는 무엇을 하고, 무엇을 묻고, 무엇을 하지 않을지 선언합니다. 이 선언이 실행 중의 허용 목록이 되어, MR 생성이나 선언 밖 파일 수정, 고정된 port 변경 같은 행동을 guard가 막습니다. 끝에서는 경계 확인이 다시 셉니다. 세션은 소모품이고 STATE 파일이 정본이라, batch를 기다리는 동안 세션이 끝나도 다음 세션이 이어 갑니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 795, 830, 120], "text": "여러 workflow는 조립합니다. RTL review의 코드, 검증, 성능과 면적, 합성, 판단 다섯 작업은 한 task 안에서 이어지고, 수정은 판단 뒤에 다른 task로 열립니다. 자동 수정은 지적마다 한 번뿐이고, reject 뒤에는 다시 시도하지 않습니다. 합성 값은 실측, 유도, 계산을 구분해 출처와 함께 한 곳에 기록하고, 레포트는 그것을 가리키기만 합니다."},
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 925, 850, 115], "text": "품질 기준은 세 개의 hard-zero입니다. 경계를 넘지 않고, 근거 없이 판정하지 않고, 사람의 기록을 훼손하지 않습니다. 상속 해석 29건, 한 바퀴 34건, 과거 기록으로 판정만 다시 해 보는 replay 5건이 이것을 시험합니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면, 표준화는 네 가지를 지킵니다. 끝은 checkpoint로, 경계는 허용 목록으로, 근거는 기록되는 실행으로, 절차는 공통 골격 한 곳으로 지킵니다. 사람이 한 일과 AI가 한 일이 같은 표에 쌓이고, 한 곳을 고치면 모든 업무가 함께 좋아집니다."},
      {"k": "close", "text": "공통 골격과 작업 모양, 조립과 agent 부품은 그대로 두고 업무의 구체만 쓰면 됩니다. 이것이 AI workflow를 실무에 넣는 기틀입니다. 위임으로 정한 결정 75항은 지금 교정을 기다리고 있습니다."}
    ],
    title: "workflow 한 장",
    whyTitle: "왜 workflow를 표준화하나",
    lead: "workflow는 착수된 일을 결과 패키지까지 끌고 가는 core의 본체다. 자율 세션에서 세울 수 있는 agent 시스템의 명세가 됐고, 중심에는 표준화된 workflow 라이브러리(공통 골격 → 작업 모양 일곱 → 업무별 특화 열여섯, 조립 둘)가 있다. 이 화면은 그 구조를 한 장과 15초로 보여 준다.",
    go: [["workflow agent 탐색기", "bun", "wa"], ["workflow 요약 페이지", "deep", "workflow"]],
    media: {
      mp4: "media/workflow_15s.mp4", gif: "media/workflow_15s.gif", html: "media/workflow_map.html",
      png: { light: "media/workflow_map_light.png", dark: "media/workflow_map_dark.png" }
    },
    story: [
      ["0~3초", "업무마다 절차가 다르면, 실적이 쌓이지 않고 배울 수도 없다", "길이도 색도 다른 절차 막대가 흩어져 떠다닌다."],
      ["3~6.5초", "모든 workflow는 같은 골격을 물려받는다", "공통 골격(자리 여덟 · 공통 checkpoint 넷) 아래에 작업 모양 일곱, 그 아래에 업무별 특화 열여섯이 달린다."],
      ["6.5~9.5초", "순서와 멈춤은 코드가, 판단과 작업은 LLM이 한다", "controller를 가운데 두고 코드 부품과 LLM 부품이 붙는다. 선언 밖 행동 하나가 guard에 막혀 튕긴다."],
      ["9.5~12초", "여러 workflow는 조립한다. 리뷰어는 고치지 않는다", "RTL review A~E가 한 task 안에서 이어지고, 수정은 판단(E) 뒤에 다른 task로 열린다."],
      ["12~15초", "한 번 표준화하면, 새 업무는 특화 한 장이면 된다", "왜 표준화하는지 네 줄(끝 · 경계 · 근거 · 절차)과 hard-zero 셋이 나온다."]
    ],
    why: [
      ["끝", "무엇이 참이어야 끝인지 처음에 정해지지 않으면, 처음에는 잘 가다가 마무리가 되지 않는다. 그래서 workflow는 step 목록이 아니라 checkpoint(무엇이 참이어야 하는가 + 어떻게 확인하는가)의 목록이고, 시작점(BL)을 먼저 기록한다."],
      ["경계", "'고치는 김에'가 범위를 번지게 하고, 되돌리기 어려운 행동이 섞인다. 그래서 자율 선언을 실행 중 allowlist로 만들어 guard가 막고, 끝에서 경계 확인이 다시 센다."],
      ["근거", "'통과했다'는 말과 실제 기록이 어긋난다. 그래서 근거는 기록되는 실행에서만 나오고, 계산은 script가 하며, 보지 못한 것은 통과가 아니라 따로 적는다."],
      ["절차", "업무마다 사람마다 절차가 다르면 실적이 쌓이지 않고 배울 수도 없다. 공통 골격을 한 곳에 두고 차이만 특화에 쓰면, 사람이 한 일과 AI가 한 일이 같은 표에 쌓이고 한 곳을 고치면 모든 업무가 함께 좋아진다."]
    ],
    zones: [
      { name: "공통 골격", z: 0, stages: "WF-common",
        what: "모든 workflow가 같은 여덟 자리와 공통 checkpoint 넷을 물려받는다.",
        ul: [
          "자리 여덟: PL plan · IN 입력 · BL 시작점 · DO 본체 · OR 판정 · RG 회귀·부작용 · RS 결과 · LN 학습. 자리는 checkpoint 번호와 분리되어 있다.",
          "공통 checkpoint 넷: C0 입력 확인 · CB 경계 확인 · CR 결과 패키지 · CL 학습.",
          "시작점(BL)이 모든 workflow에 있는 이유: 끝을 판정하려면 처음에 무엇이 참이었는지가 기록되어 있어야 한다(\"원래부터 실패였나, 이번 변경 때문인가\")."
        ],
        go: [["라이브러리 › 공통 골격", "bun", "wa/library/WF-common"]] },
      { name: "작업 모양 일곱 + 특화", z: 1, stages: "모양 7 · 특화 16",
        what: "작업 모양(수정 · 탐색 · 판정 · 조사 · 작성 · 결정 자료 · 실험)이 자리를 어떻게 채울지 정하고, 특화 workflow는 업무의 구체만 쓴다.",
        ul: [
          "상속 규칙: 잠금 · 채우기(모양의 의무는 필수) · 좁히기만 · 더하기 · 자기 것. 특화는 넓히지 못한다.",
          "한 업무가 모양 둘을 가지면(원인 찾기 + 수정) 다중 상속 대신 phase가 모양을 빌린다. '원인만' · '수정만' 요청도 같은 workflow가 받는다.",
          "workflow가 없는 일의 세 경로: one-off(모양의 기본 채움만, draft) · 초안 신설(모양에서 시작) · 이웃 합성(이웃 특화 + 부록)."
        ],
        go: [["라이브러리 설명", "bun", "wa/library/wf_readme"], ["예: WF-bugfix", "bun", "wa/library/WF-bugfix"]] },
      { name: "agent 부품", z: 2, stages: "코드 6 · LLM 5",
        what: "순서와 멈춤은 결정론 프로그램이 지키고, LLM은 자기 칸의 판단과 작업만 한다.",
        ul: [
          "코드: controller · resolver · policy engine · evaluator adapter · record writer · dry replay runner. LLM: planner · checkpoint runner(worker) · hitl manager · result writer · learner.",
          "자율 선언 = 실행 중 allowlist. guard(권한 규칙 + hook)가 선언 밖 행동을 막고, 끝에서 경계 확인이 고정 항목(port · parameter)까지 비교한다.",
          "판정 · 등급 · 유도값은 script가 계산한다. LLM이 쓴 판정 값은 근거와 대조해 강등될 수 있다.",
          "세션은 소모품이고 STATE가 정본이다. batch를 기다리는 동안 세션은 끝나고, 결과가 오면 새 세션이 STATE에서 이어 간다."
        ],
        go: [["구조", "bun", "wa/arch"], ["부품 › checkpoint runner", "bun", "wa/agents/checkpoint_runner"]] },
      { name: "조립과 근거의 원천", z: 3, stages: "pipeline · chain · records",
        what: "여러 workflow는 조립한다. 한 task = 한 결과 패키지 = 한 번의 검수이고, 리뷰어는 고치지 않는다.",
        ul: [
          "간선 종류 넷: auto(같은 task) · on-decision · on-accept · on-result(다른 task). RTL review A~E는 preset으로 잇는 pipeline이고, 기능 개발은 link마다 task가 열리는 chain이다.",
          "자동 수정은 지적마다 한 번이다. reject 뒤에는 재시도하지 않는다.",
          "근거표의 evaluator 등급은 기록되는 실행에서만 나온다. 지적과 판정은 review ledger에, 합성 값과 출처(실측 · 유도 · 계산)는 QoR matrix에 살고, 레포트와 KB는 가리키기만 한다."
        ],
        go: [["조립 › PL-rtl-review", "bun", "wa/library/PL-rtl-review"], ["계약 › matrix 칸", "bun", "wa/contracts/matrix_cell"]] }
    ],
    docsNote: "workflow 자율 세션이 사람에게 설명하려고 그린 정적 그림 문서다. 폭이 넓은 그림이 많아 가로 화면이나 PC에서 보는 편이 낫다.",
    docs: [
      ["media/wf/02_workflow-standard.html", "workflow 표준화", "세 층 · 여덟 자리 · phase · 상속 규칙 · workflow가 없는 일의 세 경로"],
      ["media/wf/03_assembly-rtl-review.html", "조립과 RTL review", "간선 종류 · pipeline preset · 리뷰 → 자동 수정 고리 · 합성 matrix"],
      ["media/wf/04_agent-system.html", "agent system", "부품 지도 · task 폴더 파일과 계약 · 자율 선언 두 겹 · 세션과 STATE · hard-zero"],
      ["media/wf/01_core-one-page.html", "core 한 장 (자세히)", "아홉 단계 · 사람이 서는 자리 · intake와 workflow의 경계"],
      ["media/wf/index.html", "목차", "그림 문서 넷의 목차"]
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
    lead: "chain은 새 엔진이 아니라 core(intake · workflow) 위의 갈래다. 요구 정리부터 sign-off 준비까지를 link로 자르고, link 하나 = task 하나 = workflow 하나로 돌린 뒤 조립(assembly)으로 잇는다. 사람은 결정 넷에 서고, 앞 link가 뒤 link의 판정 기준(oracle)을 만든다. 이 화면은 그 사슬을 한 장과 15초로 보여 준다.",
    go: [["chain 요약 페이지", "deep", "chain"], ["조립 CH-feature", "bun", "wa/library/CH-feature"], ["workflow 한 장", "map", "workflow"]],
    media: {
      mp4: "media/chain_15s.mp4", gif: "media/chain_15s.gif", html: "media/chain_map.html",
      png: { light: "media/chain_map_light.png", dark: "media/chain_map_dark.png" }
    },
    story: [
      ["0~3초", "기능 개발을 통째로 맡기면, 따라갈 수도 판정할 수도 없다", "'요구부터 sign-off까지 task 하나'라는 큰 점선 상자 안에서 색색의 입자가 뒤섞인다. 검수할 자리도, 판정 기준도, 사람의 결정도 보이지 않는다."],
      ["3~6.5초", "link 하나 = task 하나. 사슬은 core 위의 조립이다", "아래에 core 띠(intake → workflow)가 깔리고, 그 위에 L1 → L2 → L3 ∥ L3m → L4 ∥ L5 → L6 → L7이 차례로 이어진다."],
      ["6.5~9.5초", "사람은 결정 넷에 서고, 나머지는 검수 accept로 넘어간다", "첫 link에서 출발한 표지가 사슬을 따라가며 결정 넷(◆)과 검수 accept(✓)를 켠다. L6은 L4 · L5 두 갈래가 모두 도착해야 열린다."],
      ["9.5~12초", "앞 link가 뒤 link의 oracle을 만든다", "L3 → L4에 spec assertion, L3m → L5에 bit-exact 기준 · module trace 화살표가 그려지고, L4와 L5 사이에 'RTL을 읽지 않는다' 선이 생긴다. 오른쪽 아래에 C-model 세 층이 나온다."],
      ["12~15초", "긴 개발이 검수할 수 있는 토막과 기계 판정으로 바뀐다", "왜 기틀인지 네 줄(토막 · oracle · 독립 · 결정)과 상태(확정 · 가정 · 검증 예정)가 나온다."]
    ],
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
        go: [["chain 요약 › link 표", "deep", "chain"], ["조립 CH-feature", "bun", "wa/library/CH-feature"]] },
      { name: "spec ∥ C-model", z: 1, stages: "L3 · L3m · interface freeze",
        what: "뒤 link의 oracle을 만드는 두 link가 나란히 가고, 함께 interface freeze를 받는다.",
        ul: [
          "L3 spec(작성형): interface 표 · register map · 시퀀스 · 성능 예산표를 기계가 읽는 형태로 쓰고, 거기서 spec assertion 골격을 만든다.",
          "L3m C-model(수정형): 상위 model 반영을 확인하고, exactness oracle model과 module function-level trace model을 고친다. trace 형식(어느 경계 · 어떤 필드 · 어떤 순서)은 spec의 일부로 함께 freeze된다.",
          "C-model 세 층: 상위 model(encoder algorithm · decoder golden) → L1 · L2 기준, exactness oracle model → L5 · L6 비교 기준, module trace model → L4 · L5 · diagnose의 bit-to-bit 대조.",
          "(가정 · 교정 대기) decoder는 golden model과의 bit-exact가 판정 기준이고, encoder는 HW 동작을 옮긴 oracle model과의 bit-exact에 golden decoder로 표준 적합성을 다시 확인한다.",
          "freeze 뒤 spec 변경 = 사슬 재plan: L3 · L3m을 다시 freeze하고 영향받는 L4 · L5만 다시 연다."
        ],
        go: [["chain 요약 › C-model 세 층", "deep", "chain"]] },
      { name: "RTL ∥ 검증", z: 2, stages: "L4 · L5 · 검증 독립성",
        what: "freeze 뒤 두 link가 병렬로 열리고, 공유 입력은 spec과 C-model뿐이다.",
        ul: [
          "L4 RTL: block 구현, lint, spec assertion 통과, module trace와 bit-to-bit 대조. assertion 묶음은 oracle로 받아 쓰고 고치지 않는다.",
          "L5 검증: RTL을 읽지 않고 spec · C-model로 TB · test · coverage 목표를 만든다. coverage hole 분석 checkpoint에서만 RTL을 읽는다. 사람은 test plan을 승인하고 검수한다.",
          "module trace model이 없는 module은 출력 비교만 하고, 그 사실을 coverage 목표의 빈칸으로 적는다.",
          "기본값: 먼저 AI에 맡길 link는 L5의 TB 골격 · test 생성, 둘째는 L4의 lint · assertion이다(팀 리더가 정한다)."
        ],
        go: [["chain 요약 › 원칙 다섯", "deep", "chain"], ["조립 CH-feature", "bun", "wa/library/CH-feature"]] },
      { name: "통합 · sign-off 준비", z: 3, stages: "L6 · L7 · join all",
        what: "L6은 L4 · L5가 모두 검수를 지나야 한 번 열리고, 마지막 결정 sign-off는 사람이 한다.",
        ul: [
          "L6 통합 · regression: 합쳐서 regression을 돌리고 결과표 · 실패 묶음을 남긴다. 원인 찾기는 사람이 요청해 diagnose 갈래로 간다. diagnose는 module trace로 첫 불일치 경계를 찾는다.",
          "L7 sign-off 준비(판정형): 보고서 취합, 미결 목록, spec · RTL · C-model 정합성 검사. 사람이 sign-off한다.",
          "ticket 매핑: epic = 사슬 인스턴스, child ticket = link. 열린 link의 child가 그때 생기고, 사슬 요약(결정 기록 넷 + link별 근거표)은 epic에 남는다.",
          "상태: link 표 · 검증 독립성 · spec 변경 규칙은 확정이다. link의 이름 · 개수는 과거 일감으로 검증할 예정이다."
        ],
        go: [["chain 요약 › 가상 사례", "deep", "chain"], ["workflow 한 장", "map", "workflow"]] }
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
      {"k": "close", "text": "버그 수정과 timing 개선의 원인 phase도 같은 방법을 따릅니다. 층 판별 먼저는 확정이고, 층 열 표와 질문 묶음은 가정입니다. 원인 찾기를 AI에 맡겨도 근거가 남고 묶음이 자라는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "diagnose 한 장",
    whyTitle: "왜 diagnose가 기틀인가",
    lead: "diagnose는 intake가 \"원인을 찾아 달라\"(ask = diagnose)로 분류한 일을 받는 갈래다. 층부터 가르고(문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과), 재현 → 가설 표 → 싼 것부터 좁히기 → before/after로 확인한다. 대상은 고치지 않고, 끝은 층마다 다르며, 층을 가른 질문 · test는 Track B로 남는다. 버그 수정 · timing 개선의 원인 phase도 같은 방법을 따른다. 이 화면은 그 흐름을 한 장과 15초로 보여 준다.",
    go: [["diagnose 카드", "sys", "diagnose"], ["업무 지도 한 장", "sys", "workmap"], ["조사형 모양", "bun", "wa/library/AR-diagnose"]],
    media: {
      mp4: "media/diagnose_15s.mp4", gif: "media/diagnose_15s.gif", html: "media/diagnose_map.html",
      png: { light: "media/diagnose_map_light.png", dark: "media/diagnose_map_dark.png" }
    },
    story: [
      ["0~3초", "\"원인을 찾아 달라\"는 분류되지만, 보낼 곳이 없었다", "intake → ask = diagnose 다음에 '보낼 곳 = ?'라는 빨간 점선 상자가 있고, 그 안에서 regression 새 실패 · 고객 출력 불일치 · 가끔 hang 같은 일감이 갈 곳 없이 떠다닌다."],
      ["3~6.5초", "층부터 가른다. 원인은 RTL 밖에 있는 경우가 많다", "intake 다음에 '층 판별' 노드가 서고, 그 아래로 층 열 열 칸이 차례로 나온다. 앞 일곱(문서~도구)에 'RTL 밖' 괄호가, 오른쪽 끝에 '불안정 = 층이 아니라 상태' 점선 칸이 붙는다."],
      ["6.5~9.5초", "내부는 재현 조건으로, 고객은 질문과 multi-test로 가른다", "왼쪽에 내부 이슈 판(재현 조건 대조), 오른쪽에 고객 이슈 줄(질문 묶음 ∥ 자동 multi-test → 층 판별 → 답 초안 → ◆ 사람 승인 → 회신 → 고객 확인)이 나오고, 표지가 그 줄을 따라간다. 층 판별에서 '진짜 bug면 내부 이슈 link' 점선이 내부 판으로 간다."],
      ["9.5~12초", "재현 → 가설 표 → 싼 것부터 좁히기 → before/after", "흐름도가 위로 올라가고 재현 · 가설 표 · 좁히기 · 확인 노드가 이어진다. 오른쪽 아래에 좁히기 사다리(bisect → seed · 설정 변주 → module trace 첫 불일치 → 텍스트 trace)와 원칙 둘(고치지 않는다 · before/after)이 나온다."],
      ["12~15초", "층마다 끝이 다르고, 층을 가른 질문 · test가 쌓인다", "끝 · Track B 노드가 붙고, Track B에서 층 판별로 돌아가는 고리('질문 · test 묶음이 자란다')가 그려진다. 왜 기틀인지 네 줄(층 · 근거 · 끝 · 자람)과 상태(확정 · 가정 · 반영 대기)가 나온다."]
    ],
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
          "층 열(가정 · 교정 대기): 문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 앞 일곱은 RTL 밖이다.",
          "예: TB 층은 같은 입력으로 checker 판정을 따로 계산하고(oracle = C-model · spec), 도구 층은 같은 입력을 도구 두 버전 · 두 종류로 돌린다(버전 bisect, 최소 예제).",
          "불안정은 층이 아니라 상태다. 같은 입력에서 결과가 갈리면(race · 초기화되지 않은 값 · X 전파 · 환경 요동) 원인 찾기를 멈추고 안정화 일감으로 넘긴다. 반복 횟수는 공란(검증 리더).",
          "층 판별 먼저는 확정이다. 층 열 표의 칸은 가정이고 교정을 기다린다."
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
          "반영 대기(설계 쪽): 조사형 모양의 층 판별 자리, regression 원인 찾기 초안, intake 질문 묶음과의 연결."
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
      {"k": "tour", "view": [940, 690, 980, 551], "box": [995, 903, 830, 138], "text": "옮긴 확인은 workflow가 상속하는 잠금 항목이고, AI용 조건은 그 위에만 붙습니다. 이식이 끝난 업무 가족부터 shadow를 시작합니다. 분류 축과 업무 가족, 단계는 가정이고, 고객 이슈가 들어오는 경로와 자산의 위치는 회사에서 확인합니다."},
      {"k": "tour", "view": [0, 0, 1920, 1080], "box": [80, 644, 1760, 50], "text": "모든 일에는 두 트랙이 붙습니다. Track A는 일 자체이고, Track B는 그 일이 쓴 workflow의 기록입니다. 막힌 곳, 평가, 개선 제안, revision이나 신설 초안이 남습니다. Track B가 없으면 사람이 직접 한 일도 완료가 아닙니다."},
      {"k": "tour", "view": [40, 690, 980, 551], "box": [80, 736, 860, 314], "text": "정리하면 업무 지도가 기틀인 이유는 넷입니다. 출처에 따라 끝을 다르게 하고, 팀의 기존 확인을 바닥으로 삼고, 다섯 축으로 workflow와 진단의 첫 갈래를 정하고, Track B로 분류와 질문, test 묶음을 키웁니다."},
      {"k": "close", "text": "업무 지도는 일이 어디서 생겨 어디로 가는지를 보여 주고, diagnose 갈래도 이 위에 섭니다. 기존 확인 위에 AI를 얹고 모든 일이 기록을 남기게 하는 것, 이것이 실무의 기틀입니다."}
    ],
    title: "업무 지도 한 장",
    whyTitle: "왜 업무 지도가 기틀인가",
    lead: "업무 지도는 intake(분류)와 workflow(실행) 사이에서 어떤 일이 어디서 생기고, 무엇으로 분류되며, 어느 workflow로 일하는가를 한 장으로 묶는다. 분류 축은 다섯(출처 · ask · 업무 가족 · lifecycle 단계 · 층)이고, 고객 이슈는 고객 트랙으로, 내부 일은 lifecycle 단계로 간다. 가장 먼저 팀의 기존 자산을 옮겨 바닥으로 고정하고, 모든 일에 Track A(일)와 Track B(쓴 workflow의 기록)가 붙는다. diagnose 갈래의 바탕이다.",
    go: [["업무 지도 카드", "sys", "workmap"], ["diagnose 한 장", "sys", "diagnose"], ["intake 카드", "sys", "intake"]],
    media: {
      mp4: "media/workmap_15s.mp4", gif: "media/workmap_15s.gif", html: "media/workmap_map.html",
      png: { light: "media/workmap_map_light.png", dark: "media/workmap_map_dark.png" }
    },
    story: [
      ["0~3초", "같은 증상도 출처가 다르면, 끝까지의 과정이 다르다", "'고객'과 '내부 regression'이 같은 증상(특정 입력에서 출력 불일치)으로 모인 뒤 '분류 없음 = 같은 처리 ?' 빨간 점선 상자로 들어간다. 상자 안의 '고객 확인 ?'과 '수정 · 검수 ?'가 구분되지 않고 뒤섞인다."],
      ["3~6.5초", "분류 축 다섯: 출처 · ask · 업무 가족 · lifecycle · 층", "다섯 축 칸이 차례로 서고 값이 채워진다(출처 넷 · ask 여섯 · 업무 가족 열둘 · 단계 여덟 · 층 열). 위에 '①~④ intake가 정한다', '⑤ 진단이 좁혀 가며 정한다' 괄호가 붙는다."],
      ["6.5~9.5초", "고객은 고객 트랙으로, 내부는 lifecycle 단계로 간다", "왼쪽에 고객 트랙(접수 → 범위 좁히기 질문 → multi-test → 답 초안 → ◆ 사람 승인 → 회신 → 고객 확인)이 나오고 표지가 따라간다. 오른쪽에 내부 예시 두 줄(S4 regression 새 실패 → RTL · TB · C-model → 조사형, S6 timing 위반 → 구현 결과 · constraint → timing)이 나오며, 위 축 칸에서 해당 값이 켜진다. '진짜 bug면 내부 이슈 link' 점선이 내부 판으로 간다."],
      ["9.5~12초", "기존 자산을 먼저 옮겨, 바닥으로 고정한다", "흐름도가 위로 올라가고 오른쪽 아래에 자산 여섯(checklist · 검증 환경 · 확인 환경 · 절차서 · 판정 기준 · 기록 양식)과 옮겨 가는 곳(checkpoint · evaluator · policy …)이 나온다. 'AI용 조건은 그 위에만' 줄이 붙는다."],
      ["12~15초", "모든 일에 Track B가 붙고, B가 없으면 완료가 아니다", "흐름도 아래에 Track A · Track B 띠가 깔리고, 왜 기틀인지 네 줄(출처 · 바닥 · 분류 · 기록)과 상태(확정 · 가정 · 회사 확인)가 나온다."]
    ],
    why: [
      ["출처", "같은 증상(예: 특정 입력에서 출력 불일치)이 고객에게서도, 내부 regression에서도 온다. 원인 찾기 방법은 같지만 고객 이슈는 사람이 승인한 회신과 고객 확인으로, 내부 이슈는 수정과 검수로 끝난다. 그래서 두 이슈는 합치지 않고 link한다. 분류 없이 일하면 회신 승인이나 고객 확인 같은 끝이 빠진다."],
      ["바닥", "팀은 checkpoint의 답 대부분을 이미 checklist · script · regression · sign-off 절차로 가지고 있다. 그것을 옮기지 않고 AI용 조건을 새로 만들면 검증된 확인이 빠지거나 두 기준이 따로 논다. 옮긴 확인은 workflow가 상속하는 잠금 항목이 되고, 사람이 한 일과 AI가 한 일이 같은 기준으로 비교된다."],
      ["분류", "축 다섯이 각각 다른 것을 바꾼다. 출처는 완료 조건과 회신 규율, ask는 workflow의 작업 모양, 업무 가족은 특화 workflow와 이식할 자산, lifecycle 단계는 그 단계의 기존 확인, 층은 진단의 첫 갈래와 끝의 모양을 정한다. ①~④는 intake가, ⑤는 진단이 정한다."],
      ["기록", "모든 일에 Track B(쓴 workflow와 revision, 막힌 곳과 사람이 메운 곳, 평가, 개선 제안, revision 제안이나 신설 초안)가 붙고, 이것이 없으면 사람이 한 일도 완료가 아니다. 분류와 진단에도 붙어서, 분류 규칙 · 질문 목록 · 진단 test 묶음이 이 기록으로 고쳐진다."]
    ],
    zones: [
      { name: "분류 축 다섯", z: 0, stages: "출처 · ask · 업무 가족 · lifecycle · 층",
        what: "①~④는 intake가 정하고, ⑤ 층은 진단이 좁혀 가며 정한다. 축마다 바꾸는 것이 다르다(가정 · 교정 대기).",
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
        what: "단계마다 생기는 상황, 진단의 첫 갈래, 쓰는 workflow가 정해져 있다(가정 · 교정 대기).",
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
  }
  },

  /* ───────────── 더 깊게 논의할 것 ─────────────
     원천: intake·workflow 심화의 인계 문서(교정 후보 · 업그레이드 후보 · 확인할 것), 읽기 안내, 설계 본선의 열린 스레드. */
  talk: {
    title: "더 깊게 논의할 것",
    asOf: "2026-09-29",
    lead: "intake와 workflow 심화는 세세한 결정을 위임받아 가정으로 정했다(intake 51항, workflow 75항). 전부 읽을 필요는 없다. 아래 순서로 보고 틀린 것만 고치면 된다. ① 이미 확정된 것을 건드린 곳 ② 현장 감각으로 판단할 가정 ③ 아직 설계하지 않은 주제 ④ 현장에서만 답이 나오는 것. 항목마다 '지금 가정'과 '판단할 것'을 적었고, 관련 원문으로 바로 갈 수 있다.",
    groups: [
      { id: "fix", short: "교정", cls: "r", title: "① 교정: 이미 확정된 것을 건드린 곳",
        note: "심화 세션이 확정된 설계나 서로의 계약을 바꾼 곳이다. 틀렸을 때만 고치면 된다. workflow 쪽 1~10은 intake 계약과 맞물린 곳이라, intake 원안을 유지하고 workflow 쪽 표지를 기본으로 꺼 두었다.",
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
            now: "intake 표지(on-result trigger) 뒤에만 쓰고 기본은 끔이다. 그전 최고 모드는 '검수 때 일괄 승인'이다. 부모가 reject되면 철회하고 표시한다.",
            ask: "검수 전에 자동 수정 task가 열리는 것을 허용할 것인가. 허용한다면 어떤 등급의 수정까지인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"], ["라이브러리 › WF-review-fix", "bun", "wa/library/WF-review-fix"]] },
          { id: "t-w-ref", t: "후속 요청 참조(부모 key + 후속 id)", tag: ["workflow ↔ intake", "y"],
            what: "자동 수정 task가 부모 결과의 항목만 적용하도록, intake의 internal 제안에 '부모 key + 후속 id'를 더하자는 제안이다.",
            now: "반영 전에는 목록이 필요한 후속 요청은 제안으로만 남는다.",
            ask: "intake 레코드에 후속 참조 칸을 더할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-ci", t: "CI 리뷰 요청 사건(MR · commit 대상)", tag: ["workflow ↔ intake", "y"],
            what: "intake의 tool 입구는 지금 run 결과만 나르고 MR branch를 제외한다. 'CI에서 코드 리뷰만' preset을 쓰려면 리뷰 요청 사건이 필요하다.",
            now: "반영 전에는 그 preset을 쓰지 않는다. MR 대상 run은 작성자의 개인 기록 범위에 쌓인다.",
            ask: "CI의 리뷰 요청을 intake 입구로 받을 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"], ["조립 › PL-rtl-review", "bun", "wa/library/PL-rtl-review"]] },
          { id: "t-w-preset", t: "route 블록에 preset, gate가 preset 노드의 필수 입력을 본다", tag: ["workflow ↔ intake", "y"],
            what: "RTL review처럼 preset을 고르는 조립은 필수 입력이 노드마다 다르다. gate의 '정보 부족' 조건이 이것을 봐야 한다.",
            now: "반영 전에는 plan이 실행 전에 검사하고, 빠지면 입력 확인만 돌린 뒤 질문을 남겨 기다린다(`ai:waiting`). workflow가 intake 레코드를 needs-info로 되돌리지는 않는다.",
            ask: "preset을 intake가 정할 것인가, workflow의 plan이 정할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-fork", t: "가용한 workflow에 개인 fork의 candidate도 포함", tag: ["workflow ↔ intake", "y"],
            what: "지금 문구는 정본에 채택된(adopted) workflow와 fork의 draft만 말한다. 정본 회의 전의 candidate를 fork 주인이 쓸 수 있게 하자는 제안이다.",
            now: "정본은 adopted만, fork의 draft · candidate는 fork 주인이 쓸 때만.",
            ask: "정본 회의를 기다리지 않고 개인이 candidate를 쓰게 할 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-lint", t: "lint 정리 업무의 허용 범위에 batch 실행", tag: ["workflow ↔ intake", "y"],
            what: "등가성 · regression 근거를 기록되는 실행으로 남기려면 lint 정리에도 batch 실행이 필요하다.",
            now: "workflow 쪽 시험 설정이 intake 설정을 덮어쓰고 있다.",
            ask: "lint 정리 같은 작은 수정에도 batch 실행 권한을 줄 것인가.",
            go: [["설정 › fixtures", "bun", "wa/rules/fixtures"]] },
          { id: "t-w-ask", t: "요청 종류에 review · 실험 요청이 없다", tag: ["workflow ↔ intake", "y"],
            what: "intake의 ask 종류(answer · change · diagnose · decide · notify · scheduled)에 '리뷰해 달라', '실험해 달라'가 따로 없다.",
            now: "지금은 answer · diagnose · scheduled로 받는다(카테고리가 덮는 요청으로).",
            ask: "ask 종류에 review를 따로 둘 것인가.",
            go: [["규칙 › asks", "bun", "ia/rules/asks"]] },
          { id: "t-w-human", t: "'사람 수행' command", tag: ["workflow ↔ intake", "y"],
            what: "사람이 같은 workflow로 직접 일을 하고 실적이 같은 표에 쌓이게 하는 경로다. intake가 ticket key와 함께 받아 사람 수행 레코드로 넘겨야 한다.",
            now: "반영 전에는 쓰지 않는다. 사람은 workflow 파일을 checklist로 직접 따른다.",
            ask: "사람이 한 일도 시스템 실적 표에 같은 형식으로 쌓을 것인가.",
            go: [["인계 문서 §7", "bun", "wa/session/handoff"]] },
          { id: "t-w-fx", t: "intake 시험 설정 동기화 둘", tag: ["workflow ↔ intake", "y"],
            what: "(가) 몇 카테고리의 야간 허용 값이 '야간 대기열은 수치 oracle만' 규칙과 어긋난다. (나) RTL 구현 workflow의 입력 요건이 intake 쪽에는 spec 하나뿐인데 workflow는 대상 block · 허용 범위 · spec assertion 묶음도 필수로 둔다.",
            now: "workflow 쪽 시험 설정이 덮어쓰고 있다.",
            ask: "intake 시험 설정을 workflow 쪽에 맞춰 고칠 것인가.",
            go: [["설정 › fixtures", "bun", "wa/rules/fixtures"]] },
          { id: "t-w-chain", t: "사슬(chain) 진입", tag: ["workflow ↔ intake", "y"],
            what: "카테고리의 기본 workflow가 사슬 id일 수 있게 하고, gate는 첫 link의 가용성 · 입력 요건을 보며 route는 첫 link만 연다.",
            now: "반영 전에는 그 카테고리의 기본값을 비워 논의로 멈추고, 결정 뒤 첫 link를 초안 신설 경로로 연다. 다음 link는 간선 종류대로 사슬 link 발생으로 연다.",
            ask: "기능 개발 같은 사슬 일을 intake가 처음부터 사슬로 알아보게 할 것인가.",
            go: [["조립 › CH-feature", "bun", "wa/library/CH-feature"], ["chain 요약", "deep", "chain"]] },
          { id: "t-w-85", t: "workflow 설계의 범위 기본값에 일곱 줄을 더했다", tag: ["workflow", "m"],
            what: "표준화 세 층, 판정형은 대상을 고치지 않음, 조립, 자동 수정은 한 번, system of record, 기록 범위, pipeline의 노드별 posture. 기존 열두 줄은 그대로다.",
            now: "확정된 workflow 설계 문서에 기본값으로 더해 두었다.",
            ask: "일곱 줄 중 받아들이기 어려운 것이 있는가.",
            go: [["설계 85 › 범위 기본값", "bun", "wa/design"]] }
        ] },
      { id: "field-i", short: "intake 가정", cls: "y", title: "② 현장 감각으로 판단할 가정 · intake",
        note: "회사 현실과 어긋날 가능성이 가장 큰 줄들이다. 검증 현장의 감각으로 바로 판단할 수 있는 곳이 많다.",
        items: [
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
      { id: "field-w", short: "workflow 가정", cls: "y", title: "② 현장 감각으로 판단할 가정 · workflow",
        note: "workflow 결정 75항 중 구조를 좌우하는 것만 골랐다. 전체는 인계 문서 §2에 있다.",
        items: [
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
      { id: "field-c", short: "chain 가정", cls: "y", title: "② 현장 감각으로 판단할 가정 · chain",
        note: "chain 정본(10-01)에서 확정이 아닌 줄이다. link 표 · 검증 독립성 · spec 변경 규칙은 확정이다.",
        items: [
          { id: "t-c-oracle", t: "encoder와 decoder의 oracle 구분", tag: ["가정 · 교정 대기", "y"],
            what: "decoder는 표준이 출력을 정하므로 golden model과의 bit-exact가 판정 기준이다. encoder는 출력이 구현 선택에 따라 달라질 수 있으므로, HW 동작을 그대로 옮긴 oracle model과의 bit-exact가 판정 기준이고, 표준 적합성은 golden decoder로 다시 확인한다.",
            now: "C-model 세 층(상위 · exactness oracle · module trace)은 교정을 받아 반영했고, 이 구분만 가정으로 남았다.",
            ask: "encoder 쪽 판정 기준이 이 모양이 맞는가.",
            go: [["chain › C-model 세 층", "deep", "chain"]] },
          { id: "t-c-links", t: "link 이름과 개수", tag: ["검증 예정", "n"],
            what: "L1 요구 · feasibility → L2 아키텍처 → L3 spec ∥ L3m C-model → L4 RTL ∥ L5 검증 → L6 통합 · regression → L7 sign-off 준비.",
            now: "표대로 쓰고, 이름 · 개수는 과거 일감 조사로 검증한다.",
            ask: "실제 기능 추가 일감이 이 토막으로 나뉘는가. 빠진 토막(예: 성능 모델 · FPGA 검증)이 있는가.",
            go: [["chain › link 표", "deep", "chain"]] },
          { id: "t-c-trace", t: "module trace model이 없는 module", tag: ["기본값", "n"],
            what: "module 경계의 bit-to-bit 대조가 불가능하다.",
            now: "L5가 출력 비교만 하고, 그 사실을 coverage 목표의 빈칸으로 적는다.",
            ask: "trace model이 없는 module을 사슬 안에서 만들게 할 것인가, 빈칸으로 둘 것인가.",
            go: [["chain › 기본값", "deep", "chain"]] },
          { id: "t-c-first", t: "먼저 AI에 맡길 link", tag: ["기본값", "n"],
            what: "oracle이 강한 link부터 연다.",
            now: "L5 TB 골격 · test 생성이 먼저, L4 lint · assertion이 둘째. L1~L3은 oracle이 약해 draft로 오래 간다.",
            ask: "현장에서 가장 먼저 효과가 보일 link가 이것이 맞는가.",
            go: [["chain › 기본값", "deep", "chain"]] }
        ] },
      { id: "field-dg", short: "diagnose · 분류 가정", cls: "y", title: "② 현장 감각으로 판단할 가정 · diagnose와 업무 지도",
        note: "층 판별 먼저 · 기존 자산 이식 먼저 · 두 트랙 · 고객 트랙 재개는 확정이다. 아래는 가정(교정 대기)이다.",
        items: [
          { id: "t-dg-layers", t: "층 열 열 개와 층마다의 끝", tag: ["가정 · 교정 대기", "y"],
            what: "문서 · 이해 · 환경 · TB · C-model · spec · 도구 · RTL · FW · 구현 결과. 층마다 재현 수단 · oracle · 좁히는 도구 · 끝을 정했다. 불안정은 층이 아니라 상태로 본다.",
            now: "원인이 RTL 밖에 있는 경우가 많다는 판단에서 층부터 가른다.",
            ask: "빠진 층이나 합쳐야 할 층이 있는가. 층마다의 끝이 현장과 맞는가.",
            go: [["diagnose › 자세히", "sys", "diagnose"]] },
          { id: "t-dg-bundles", t: "가족별 질문 묶음 · 증상별 multi-test 묶음", tag: ["가정 · 교정 대기", "y"],
            what: "고객 이슈의 층이 처음 설명으로 정해지지 않을 때, 후보를 가르는 질문만 한 번에 보내고 동시에 증상별 test를 돌린다.",
            now: "기능 불일치 · interface · 성능 · 구현 결과 · power · 문서 정합의 기본 질문, 다섯 증상의 test 묶음. Track B로 늘어난다.",
            ask: "첫 질문 묶음으로 실제로 층이 갈리는가. 먼저 만들어 둘 test 묶음은 무엇인가.",
            go: [["diagnose › 자세히", "sys", "diagnose"]] },
          { id: "t-dg-families", t: "업무 가족 열둘 · lifecycle 여덟 단계", tag: ["가정 · 교정 대기", "y"],
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
          { id: "t-d-diag", t: "diagnose 갈래 설계 (빈칸 1순위)", tag: ["반영됨 · 정본", "g"],
            what: "\"왜 그런가\"를 찾는 원인 조사 갈래가 없다. RTL 조직에서 가장 흔한 발생이다.",
            now: "조사형 모양은 골격까지, 특화 regr-diagnose는 골격(draft)이다. intake의 실패 묶음(변경 구간 · 구간 안 변경 목록 · member 전부 · 실패한 seed)이 첫 입력 후보이고, bisect checkpoint가 후보다.",
            ask: "원인 조사의 '끝'을 무엇으로 정할 것인가(재현 + 원인 변경 특정 + before/after?).",
            go: [["모양 › 조사형", "bun", "wa/library/AR-diagnose"], ["WF-regr-diagnose", "bun", "wa/library/WF-regr-diagnose"]] },
          { id: "t-d-chain", t: "chain 기본값 일곱 교정 → chain 정본", tag: ["반영됨 10-01", "g"],
            what: "아키텍처부터 검증까지 이어지는 사슬의 틀(link 일곱, 원칙 다섯, 기본값 일곱)이 교정을 기다린다. workflow 쪽에 조립(CH-feature)은 이미 생겼다.",
            now: "사슬 template + link 카테고리 여럿, link마다 task, 사이에 사람의 결정.",
            ask: "기본값 일곱 중 다른 것만 고치면 정본으로 간다.",
            go: [["chain 요약 › 기본값", "deep", "chain"], ["조립 › CH-feature", "bun", "wa/library/CH-feature"]] },
          { id: "t-d-poc", t: "첫 PoC 범위: 결정론 부품 먼저", tag: ["도입", "g"],
            what: "intake는 controller + ticket adapter + raw scan + 결정론 규칙을, workflow는 controller · resolver · policy engine · evaluator adapter를 LLM 없이 먼저 세운다.",
            now: "시험 사례의 결정론 칸이 전부 맞으면 LLM 부품을 붙인다.",
            ask: "회사에서 가장 먼저 세울 한 조각을 무엇으로 할 것인가.",
            go: [["intake 전체 설명 §7", "bun", "ia/overview"], ["workflow 전체 설명 §8", "bun", "wa/overview"]] },
          { id: "t-d-risk", t: "위험 감지가 자라는 절차", tag: ["core", "m"],
            what: "정의되지 않은 위험을 실무 중에 감지하고 경고하며 진화하는 능력. 지금은 raw scan(목록 신호) + gate(낯섦 신호)까지 왔다.",
            now: "검수의 '위험이 아니었다 / 멈췄어야 했다' 판정을 pattern 시험 문장으로 계속 더하는 절차가 제안되어 있다.",
            ask: "위험 목록과 allowlist를 누가 어떤 주기로 키울 것인가.",
            go: [["규칙 › risk_patterns", "bun", "ia/rules/risk_patterns"]] },
          { id: "t-d-fork", t: "정본과 개인 fork의 경계, 정기 회의의 형태", tag: ["core", "m"],
            what: "정본에는 지식과 기본 규칙만, 나머지는 개인 fork에서 자유롭게 진화하고 정기 회의로 정본에 올린다. 승인이 병목이 되지 않는 구조가 목표다.",
            now: "workflow 쪽은 dry replay(과거 accepted 기록으로 판정만 다시)를 승격 안건의 근거로 붙이게 했다.",
            ask: "정기 회의를 어떤 모양으로 할 것인가(주기 · 참석 · 안건 형식).",
            go: [["부품 › dry replay", "bun", "wa/agents/dry_replay_runner"]] },
          { id: "t-d-model", t: "모델 등급과 세션 분리의 기본 제안", tag: ["core", "m"],
            what: "가벼운 모델로 충분한 곳에 강한 모델을 쓰거나, 한 세션에서 오래 이어 가 품질이 떨어지는 문제.",
            now: "checkpoint마다 모델 등급 칸과 fresh 세션 칸이 있다. 제안 문서는 아직 없다.",
            ask: "checkpoint 단위로 모델 등급을 정하는 방식이 맞는가.",
            go: [["공통 골격", "bun", "wa/library/WF-common"]] },
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
  ]
};
