/* PQO 학습 앱 콘텐츠 — 27_PQO(비공개 워크스페이스)에서 증류한 공개 학습 로드맵.
   지속 업데이트: 이 파일만 고치면 앱 내용이 바뀐다. 출처는 모두 공개 논문/표준/repo. */
window.PQO = {
  updated: "2026-06-15",
  title: "PQO · Perceptual Preprocessing",
  subtitle: "인코더 독립 전처리로 동일 지각품질에 비트 절감 — 이론·신호·HW 학습",

  overview: {
    what:
      "PQO = Perceptual Quality Optimization. 인코더와 연동하지 않는 독립 전처리 블록만으로 " +
      "동일 지각 품질에서 비트레이트를 줄이는 기법을 이론→ML(CNN)→HW까지 분해 학습한다. " +
      "HVS가 못 보는 고주파·노이즈를 입력단에서 미리 제거하면 변환·양자화·엔트로피 전 단계에서 비트가 빠진다.",
    insight: {
      title: "AV1 FGS — \"들어갈 때 지우고 나올 때 다시 그린다\"",
      body:
        "FGS는 2단계다. ① 인코더 앞단(전처리): grainy 원본에서 grain을 제거(denoise)하고 AR 파라미터로 요약 → 비트 절감은 여기서. " +
        "② 디코더 뒷단: AR 파라미터로 grain을 재생성(synthesize)해 원래 룩 복원. " +
        "\"noise 생성\"은 디코더 측에서 맞고, 이 스터디가 다루는 절감은 인코더 앞단의 제거다.",
    },
    metricPolicy:
      "메트릭 = VMAF 단독 집중. VMAF-NEG는 '점수 목표'가 아니라 메트릭 해킹 탐지 계기판 " +
      "(VMAF↔NEG 격차 크면 enhancement 의심). MOS/SSIM은 출처가 줄 때만 부기.",
    costLadder: [
      { k: "2DNR", v: "라인버퍼" },
      { k: "3DNR", v: "프레임버퍼" },
      { k: "CNN", v: "경량 NPU" },
      { k: "NLM/MCTF", v: "모션추정(ME)" },
    ],
    metricQuestions: [
      "무슨 메트릭? — VMAF / VMAF-NEG / SSIM / MOS",
      "누구 출처? — 논문(동료심사) / 벤더 / 블로그 / 특허",
      "어떤 콘텐츠? — grainy면 -50~66%, clean이면 미미 + over-smooth 위험",
    ],
  },

  parts: [
    {
      id: "part1",
      title: "Part 1 — 이론 & 메트릭",
      status: "active",
      goal: "JND·메트릭 잣대를 세워 '왜 비트가 주나'와 '어디까지 믿나(VMAF)'를 판별.",
      cats: [
        {
          id: "c1", title: "C1. JND 모델", tag: null,
          goal: "지각 임계(JND)의 4요소: 공간 CSF / 휘도 적응 / 대비(텍스처) 마스킹 / 시간.",
          items: [
            "Lin&Kuo 2011 서베이 훑기 — perceptual vs statistical redundancy",
            "Wei&Ngan 2009 DCT-JND — 4요소 식별",
            "Bae&Kim 2013 — 휘도 적응 항 정교화 이유",
            "산출물 notes/jnd_model.md (4요소 표 + DCT-JND 의사코드)",
          ],
          checkpoint: "텍스처 마스킹이 전처리 절감의 주 원천인 이유를 코덱 잔차 관점으로 한 문단.",
        },
        {
          id: "c2", title: "C2. 절감 메커니즘", tag: null,
          goal: "전처리가 비트를 빼는 3경로: 변환 고주파↓ / 예측 잔차↓ / Dirty Window 회복.",
          items: [
            "3경로 이해 + 코덱 단계(변환/양자화/예측/엔트로피) 매핑",
            "산출물 notes/saving_mechanism.md (3경로 표 + over-smooth 부작용)",
          ],
          checkpoint: "denoise=진짜 절감 vs sharpening=메트릭 해킹을 정보량(제거 vs 추가)으로 설명.",
        },
        {
          id: "c3", title: "C3. VMAF (주 메트릭)", tag: null,
          goal: "VMAF = VIF + DLM + TI 융합. VMAF-NEG는 enhancement gain을 차단.",
          items: [
            "Netflix 2016 — VMAF 구조",
            "Netflix 2020 — VMAF-NEG가 빼는 것(enhancement)",
            "Netflix 2018 — failure modes",
            "산출물 notes/vmaf_internals.md (3성분 + VMAF↔NEG 반응 표)",
          ],
          checkpoint: "코덱 비교엔 VMAF, 전처리 평가엔 NEG(또는 둘 다)인 이유 3줄.",
        },
        {
          id: "c4", title: "C4. 메트릭 해킹 (가드레일)", tag: null,
          goal: "전처리만으로 VMAF +218.8%, NEG +23.6% 부풀림 가능(CLAHE 최대).",
          items: [
            "Siniukov 2021 'Hacking VMAF' 정독 — 부풀림 % 확인",
            "부풀리는 전처리 목록(감마/샤프닝/톤매핑/CLAHE)",
            "산출물 notes/metric_hacking.md + '의심 룰' 체크리스트(전 기법 재사용)",
            "open_questions Q02 격차 의심선 수치화",
          ],
          checkpoint: "VMAF +40% / NEG +5% 전처리를 보면 결론은? (즉답)",
        },
      ],
    },
    {
      id: "part2",
      title: "Part 2 — 전통 신호처리 & 표준",
      status: "active",
      goal: "Part 1 잣대로 실제 기법(FGS·MCTF·denoise) 분석. 매번 인코더 독립/결합 못 박기.",
      cats: [
        {
          id: "d1", title: "D1. AV1 FGS", tag: "mixed",
          goal: "인코더 앞단 denoise(독립, 절감) + AR 파라미터 + 디코더 재합성(코덱 정의).",
          items: [
            "Norkin&Birkbeck 2018 — 2단계 분리",
            "AV1 spec §7.18.3 — 디코더 정규 프로세스(LUT/AR/PRNG/32×32)",
            "결합 = mixed 명시 / Norkin 50%=heavy-grain best, Netflix 36%=벤더(신뢰 하향)",
            "산출물 notes/av1_fgs.md + techniques.json FGS entry",
          ],
          checkpoint: "비트 절감은 인코더의 어느 동작? 디코더가 비트를 줄이나? (즉답)",
        },
        {
          id: "d2", title: "D2. MCTF / EA-MCTF", tag: "coupled",
          goal: "VTM GOP temporal filter는 QP·GOP 의존 → 인코더 결합. ME 비용이 지배적.",
          items: [
            "Vanam&Sethuraman 2023 — 784% vs 17%(인코딩 시간 오버헤드)",
            "QP/GOP 의존 = coupled 이유",
            "−12.4% BD-rate = VMAF base(NEG 아님) → enhancement 의심 메모",
            "산출물 notes/mctf.md + Q03 갱신",
          ],
          checkpoint: "독립 블록으로 떼면 무엇을 잃나(QP/GOP 정보)?",
        },
        {
          id: "d3", title: "D3. Denoise 필터 4종", tag: "independent",
          goal: "bilateral < hqdn3d < NLM < BM3D — HW 비용 사다리의 본체.",
          items: [
            "Bilateral(1998) 라인버퍼 / hqdn3d 프레임버퍼1 / NL-means 패치 / BM3D 변환",
            "4종을 비용 사다리(2DNR<3DNR<CNN<NLM/MCTF)에 배치",
            "산출물 notes/denoise_filters.md(라인/프레임버퍼·MAC/pixel) + 4 entry",
          ],
          checkpoint: "clean 콘텐츠에 BM3D 쓰면 왜 세 가지가 동시에 나빠지나?",
        },
        {
          id: "d4", title: "D4. 종합", tag: null,
          goal: "D1~D3을 Part 1 잣대로 일괄 채점 + 비교 매트릭스.",
          items: [
            "결합/절감(메트릭·출처·콘텐츠)/해킹의심/사다리 위치로 채점",
            "/tech-map — techniques.json 무결성·통계, status→reviewed 승격",
            "산출물 notes/part2_summary.md (Part 3 CNN 대조 베이스라인)",
          ],
          checkpoint: "비용 사다리에서 'CNN' 자리가 비어 있음 체감 → Part 3 진입 훅.",
        },
      ],
    },
  ],

  // status: active 진행 / planned 예정(Part 1·2 진행 후 안내)
  upcoming: [
    { id: "part3", title: "Part 3 — 학습형 CNN 전처리", note: "비미분 코덱 우회 (proxy/surrogate gradient). Part 1·2 진행 후 안내." },
    { id: "part4", title: "Part 4 — HW/RTL·NPU 종합", note: "비용 사다리 정량화 + 가상 전처리 IP 아키텍처 노트. Part 1·2 진행 후." },
  ],

  refs: {
    part1: [
      { t: "Perceptual visual quality metrics: A survey", w: "Lin & Kuo, 2011 · JVCIR", g: "peer", u: "https://www.sciencedirect.com/science/article/abs/pii/S1047320311000204", n: "perceptual vs statistical redundancy 최강 단일 레퍼런스" },
      { t: "Spatio-temporal JND profile (DCT domain)", w: "Wei & Ngan, 2009 · IEEE T-CSVT", g: "peer", u: "https://ieeexplore.ieee.org/document/4783051/", n: "정전 DCT-JND: 공간CSF+휘도+대비+시간" },
      { t: "DCT-based JND for luminance adaptation", w: "Bae & Kim, 2013 · IEEE SPL", g: "peer", u: "https://ieeexplore.ieee.org/document/6553124/", n: "휘도 적응 항 정교화" },
      { t: "JND profile (subband coder)", w: "Chou & Li, 1995 · IEEE T-CSVT", g: "peer", u: "https://ieeexplore.ieee.org/document/475889/", n: "픽셀/서브밴드 JND 원점" },
      { t: "Visual fidelity criterion (CSF 원점)", w: "Mannos & Sakrison, 1974 · IEEE T-IT", g: "peer", u: "https://ieeexplore.ieee.org/document/1055250", n: "Contrast Sensitivity Function 기초" },
      { t: "Toward A Practical Perceptual Video Quality Metric", w: "Netflix, 2016", g: "vendor", u: "https://netflixtechblog.com/toward-a-practical-perceptual-video-quality-metric-653f208b9652", n: "VMAF 원조 발표 (VIF+DLM+TI)" },
      { t: "Toward a Better Quality Metric (VMAF-NEG)", w: "Netflix, 2020", g: "vendor", u: "https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30", n: "VMAF-NEG 공식 설명 — 핵심 가드레일" },
      { t: "Netflix/vmaf (libvmaf + NEG 모델)", w: "Netflix · repo", g: "repo", u: "https://github.com/Netflix/vmaf", n: "실제로 돌릴 구현 + models.md" },
      { t: "Hacking VMAF and VMAF NEG", w: "Siniukov et al., 2021 · AICCC", g: "peer", u: "https://arxiv.org/abs/2107.04510", n: "+218.8% / NEG +23.6% 출처" },
      { t: "VQM benchmark (compression)", w: "Antsiferova et al., 2022 · NeurIPS", g: "peer", u: "https://arxiv.org/abs/2211.12109", n: "대규모 MOS vs VMAF 현실 점검" },
    ],
    part2: [
      { t: "Film Grain Synthesis for AV1", w: "Norkin & Birkbeck, 2018 · DCC", g: "peer", c: "mixed", u: "https://norkin.org/pdf/DCC_2018_AV1_film_grain.pdf", n: "denoise+AR+재합성 핵심 논문" },
      { t: "AV1 Bitstream Spec — Film Grain (§7.18.3)", w: "AOMedia, 2019", g: "standard", c: "n/a", u: "https://aomediacodec.github.io/av1-spec/av1-spec.pdf", n: "디코더 정규 프로세스(실리콘 bit-exact)" },
      { t: "AFGS1 Spec (codec-agnostic FGS)", w: "AOMedia, 2024", g: "standard", c: "n/a", u: "https://aomediacodec.github.io/afgs1-spec/", n: "독립 메타데이터 구동 합성 블록" },
      { t: "AV1 @ Scale: Film Grain Synthesis", w: "Netflix, 2025", g: "vendor", c: "mixed", u: "https://netflixtechblog.com/av1-scale-film-grain-synthesis-the-awakening-ee09cfdff40b", n: "~36%/~10% (메트릭 미명시, 벤더)" },
      { t: "Encoder-aware MCTF", w: "Vanam & Sethuraman, 2023 · SPIE", g: "peer", c: "coupled", u: "https://www.amazon.science/publications/encoder-aware-motion-compensated-temporal-filtering-for-video-compression", n: "EA-MCTF 17% vs HM 784%" },
      { t: "JVET-O0549 GOP temporal filter", w: "Wennersten et al., 2019 · JVET", g: "standard", c: "coupled", u: "https://jvet-experts.org/", n: "VTM MCTF 베이스라인 (PDF URL 출처 미확인)" },
      { t: "BM3D collaborative filtering", w: "Dabov et al., 2007 · IEEE TIP", g: "peer", c: "independent", u: "https://webpages.tuni.fi/foi/GCF-BM3D/BM3D_TIP_2007.pdf", n: "변환 도메인, 최고 HW 비용" },
      { t: "Non-Local Means", w: "Buades et al., 2005 · CVPR", g: "peer", c: "independent", u: "https://www.iro.umontreal.ca/~mignotte/IFT6150/Articles/Buades-NonLocal.pdf", n: "패치 가중평균, 메모리 비용↑" },
      { t: "Bilateral Filtering", w: "Tomasi & Manduchi, 1998 · ICCV", g: "peer", c: "independent", u: "https://users.soe.ucsc.edu/~manduchi/Papers/ICCV98.pdf", n: "최저 비용(라인버퍼)" },
      { t: "hqdn3d (FFmpeg)", w: "FFmpeg · docs", g: "docs", c: "independent", u: "https://ffmpeg.org/ffmpeg-filters.html#hqdn3d", n: "공간+시간 재귀, 프레임버퍼1 (3DNR)" },
    ],
    sw: [
      { name: "Netflix VMAF", use: "품질 메트릭 (libvmaf + NEG 모델)", c: "metric", u: "https://github.com/Netflix/vmaf" },
      { name: "FFmpeg", use: "denoise(hqdn3d/nlmeans/bm3d/bilateral) + libvmaf", c: "independent", u: "https://ffmpeg.org/ffmpeg-filters.html" },
      { name: "SVT-AV1", use: "프로덕션 AV1 인코더 (FGS 지원)", c: "encoder", u: "https://gitlab.com/AOMediaCodec/SVT-AV1" },
      { name: "libaom", use: "AV1 ref codec + grain 툴링", c: "encoder", u: "https://aomedia.googlesource.com/aom/" },
      { name: "x265", use: "HEVC (FGC SEI, --aom-film-grain)", c: "encoder", u: "https://bitbucket.org/multicoreware/x265_git" },
      { name: "dav1d", use: "AV1 디코더 (grain 재합성 cost 관찰)", c: "decoder", u: "https://code.videolan.org/videolan/dav1d/" },
    ],
  },
};
