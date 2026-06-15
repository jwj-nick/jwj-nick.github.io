/* PQO 학습 앱 콘텐츠 — 27_PQO(비공개 워크스페이스)에서 증류한 공개 학습 로드맵.
   지속 업데이트: 이 파일(개요/Part 구조)과 studies.js(논문별 공부 페이지)를 고치면 앱이 갱신.
   스타일: 영어 technical term 보존 + 한글은 연결어. */
window.PQO = {
  updated: "2026-06-15",
  title: "PQO · Perceptual Preprocessing",
  subtitle: "Encoder-independent preprocessing으로 동일 perceptual quality에 bit saving — theory·signal·HW",

  overview: {
    what:
      "PQO = Perceptual Quality Optimization. Encoder와 연동하지 않는 encoder-independent preprocessing block " +
      "만으로 동일 perceptual quality에서 bitrate를 줄이는 기법을 theory→ML(CNN)→HW까지 분해 학습한다. " +
      "HVS가 못 보는 high-frequency·noise를 입력단에서 미리 제거하면 transform·quantization·entropy coding 전 단계에서 bit가 빠진다.",
    insight: {
      title: "AV1 FGS — \"들어갈 때 지우고 나올 때 다시 그린다\"",
      body:
        "FGS는 2-stage다. ① Encoder front-end (preprocessing): grainy source에서 grain을 denoise하고 " +
        "AR(autoregressive) parameters로 요약 → bit saving은 여기서. ② Decoder back-end: AR parameters로 " +
        "grain을 synthesize해 원래 look 복원. \"noise 생성\"은 decoder side에서 맞고, 이 스터디가 다루는 saving은 " +
        "encoder 앞단의 removal이다.",
    },
    metricPolicy:
      "Metric = VMAF 단독 집중. VMAF-NEG는 '점수 목표'가 아니라 metric hacking 탐지 게이지 " +
      "(VMAF↔NEG gap 크면 enhancement 의심). MOS/SSIM은 source가 줄 때만 부기.",
    costLadder: [
      { k: "2DNR", v: "line buffer" },
      { k: "3DNR", v: "frame buffer" },
      { k: "CNN", v: "lightweight NPU" },
      { k: "NLM/MCTF", v: "motion estimation" },
    ],
    metricQuestions: [
      "무슨 metric? — VMAF / VMAF-NEG / SSIM / MOS",
      "누구 source? — peer-reviewed paper / vendor / blog / patent",
      "어떤 content? — grainy면 -50~66%, clean이면 미미 + over-smoothing 위험",
    ],
  },

  parts: [
    {
      id: "part1",
      title: "Part 1 — Theory & Metrics",
      status: "active",
      goal: "JND·metric 잣대를 세워 '왜 bit가 주나'와 'VMAF를 어디까지 믿나'를 판별.",
      cats: [
        {
          id: "c1", title: "C1. JND model", tag: null,
          goal: "JND의 4요소: spatial CSF / luminance adaptation / contrast(texture) masking / temporal.",
          checkpoint: "Texture masking이 preprocessing saving의 주 원천인 이유를 codec residual 관점으로 한 문단.",
        },
        {
          id: "c2", title: "C2. Saving mechanism", tag: null,
          goal: "Preprocessing이 bit를 빼는 3-path: transform-domain high-freq↓ / prediction residual↓ / Dirty Window 회복.",
          checkpoint: "denoise=real saving vs sharpening=metric hacking을 정보량(removal vs addition)으로 설명.",
        },
        {
          id: "c3", title: "C3. VMAF (primary metric)", tag: null,
          goal: "VMAF = VIF + DLM + TI fusion. VMAF-NEG는 enhancement gain을 차단.",
          checkpoint: "Codec 비교엔 VMAF, preprocessing 평가엔 NEG(또는 둘 다)인 이유 3줄.",
        },
        {
          id: "c4", title: "C4. Metric hacking (guardrail)", tag: null,
          goal: "Preprocessing만으로 VMAF +218.8%, NEG +23.6% 부풀림 가능(CLAHE 최대).",
          checkpoint: "VMAF +40% / NEG +5% preprocessing을 보면 결론은? (즉답)",
        },
      ],
    },
    {
      id: "part2",
      title: "Part 2 — Signal Processing & Standards",
      status: "active",
      goal: "Part 1 잣대로 실제 기법(FGS·MCTF·denoise) 분석. 매번 encoder-independent/coupled 못 박기.",
      cats: [
        {
          id: "d1", title: "D1. AV1 FGS", tag: "mixed",
          goal: "Encoder front-end denoise(independent, saving) + AR parameters + decoder re-synthesis(codec-defined).",
          checkpoint: "Bit saving은 encoder의 어느 동작? Decoder가 bit를 줄이나? (즉답)",
        },
        {
          id: "d2", title: "D2. MCTF / EA-MCTF", tag: "coupled",
          goal: "VTM GOP temporal filter는 QP·GOP 의존 → encoder-coupled. ME cost가 지배적.",
          checkpoint: "Independent block으로 떼면 무엇을 잃나(QP/GOP info)?",
        },
        {
          id: "d3", title: "D3. Denoise filters (4종)", tag: "independent",
          goal: "bilateral < hqdn3d < NL-means < BM3D — HW cost ladder의 본체.",
          checkpoint: "Clean content에 BM3D 쓰면 왜 세 가지가 동시에 나빠지나?",
        },
        {
          id: "d4", title: "D4. Synthesis (종합)", tag: null,
          goal: "D1~D3을 Part 1 잣대로 일괄 채점 + comparison matrix.",
          checkpoint: "Cost ladder에서 'CNN' 자리가 비어 있음 체감 → Part 3 진입 훅.",
        },
      ],
    },
  ],

  upcoming: [
    { id: "part3", title: "Part 3 — Learned CNN preprocessing", note: "Non-differentiable codec 우회 (proxy / surrogate gradient). Part 1·2 진행 후 안내." },
    { id: "part4", title: "Part 4 — HW/RTL·NPU synthesis", note: "Cost ladder 정량화 + 가상 preprocessing IP architecture note. Part 1·2 진행 후." },
  ],
};
