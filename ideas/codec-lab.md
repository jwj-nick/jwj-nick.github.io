# Codec Lab — 종합 아이디어 (cat C) · rev2

> 합의: 2026-06-27, 보강: 2026-06-28(Nick 피드백) · 출처: 50선 **cat C(Codec/Verif, 17–21)를 종합 허브**로, **H + I** 적용.
> 자매: `nvdla-npu-lab-plan.md`(A) · `ai-build-lab-plan.md`(B). ⚠️ **아이디어/계획** — 빌드는 별도 세션. **챕터는 하나하나 다시 리뷰 예정.**

## 0. 한 줄

**내 20년 코덱 커리어의 척추 지식을 AI 힘을 빌어 A-to-Z 최종 정리 + 디코더 tool을 직접 HW 설계·모듈별 UVM 검증** 하는 평생 자산. **private-first(IP/기밀 경계 최우선).**

---

## 1. C는 A·B와 다르다 ★

| | A·B | **C — Codec** |
|---|---|---|
| Nick | 학습자 | **20년 마스터** |
| AI | 교사·코치 | **산파·서기·검증자 (elicitation)** |
| 본질 | 읽기/빌드 | **증류(머릿속→구조) + 단조(설계·검증)** |
| 해자 | — | **체험지 — 교과서에 없는 trade-off·함정·"왜"** |

→ AI가 Nick을 인터뷰해 끄집어내고, 빈칸은 검증된 레퍼런스로 채우고, 엄밀성을 도전한다. (`codec-elicit` 스킬)

## 2. 운영 원칙

- **P1/P2 공유** (콘텐츠가 엔진 당김 / NCC 자율 점진 개선)
- **C 전용 — IP·기밀 경계 ★★★**: 공개 표준 + 일반 원리 + Nick 개인 이해만. **회사 IP·특정 제품/칩/고객 수치 금지.** 체험지는 일반화. (27_PQO "회사 리소스 금지"를 Codec Lab 전체로)

---

## 3. 구조 한눈에 (rev2)

```
Codec Lab
├─ 기둥 1 — 지식 척추 (Knowledge, 광범위)
│   ├─ 1A 메인스트림 비디오 코덱 파이프라인 (디코더 중심)
│   ├─ 1B C model / 레퍼런스 SW  ← 표준 공식 ref + ffmpeg  ★신규
│   ├─ 1C 비주류·정지영상 코덱 (지식 only): LCEVC · JPEG · APV  ★신규
│   └─ 1D Frame Buffer Compression (별도 챕터): PVRIC · AFBC · AFRC  ★신규
│
└─ 기둥 2 — Tool Forge (HW 설계 + 모듈별 UVM 검증)
    ├─ ▶ 디코더 전용 (지금 범위)  ← UVM을 각 모듈 검증에 녹여냄
    └─ ▷ 인코더 (형제 레벨, TBD placeholder)
```

---

## 4. 기둥 1 — 지식 척추

### 1A. 메인스트림 비디오 코덱 파이프라인 (디코더 중심)
- 파이프라인: entropy(CAVLC·CABAC·rANS) → inverse quant → inverse transform → intra/inter prediction · ME/MC → in-loop filter(deblocking·SAO·ALF·CDEF·loop restoration) → reconstruction → DPB/참조관리
- 표준 진화 축: H.264/AVC → HEVC → VP9 → AV1 → VVC → **AV2**(진행) — "표준이 왜 이 tool을 택했나"
- **체험지(해자)**: 설계 trade-off · HW 친화성 · IP화 함정 (§10 추가 아이디어와 연결)

### 1B. C model / 레퍼런스 SW ★신규
- **표준 공식 레퍼런스**: JM(AVC) · HM(HEVC) · VTM(VVC) · libvpx(VP9) · **libaom(AV1)** · **libavm/AVM(AV2)**
- **실무 멀티코덱**: ffmpeg (실측·디버그·비교), dav1d(최적화 AV1 디코더 — HW 대조용)
- 역할: ① 지식의 "정답지" ② **기둥 2 검증의 golden 모델** ③ 비트스트림 파싱·tool 동작을 코드로 확인
- 정리 포인트: 어떻게 빌드·실행, trace 뽑기, HW 출력과 bit-exact 비교하는 법

### 1C. 비주류·정지영상 코덱 (지식 only) ★신규
- **LCEVC**(MPEG-5 Part2, 인핸스먼트 레이어) · **JPEG**(베이스라인·프로그레시브) · **APV**(Advanced Professional Video, intra-only 프로페셔널)
- 추가 후보(원하면): JPEG XL·JPEG2000 · AVIF/HEIF · WebP
- **이쪽은 HW 설계 안 함 — 지식 정리만.** "왜 존재/어디 쓰나/메인스트림과 뭐가 다른가"

### 1D. Frame Buffer Compression (별도 챕터) ★신규
- **PVRIC**(Imagination PowerVR Image Compression, ~v3/4) · **AFBC**(Arm Frame Buffer Compression, 무손실 가변율) · **AFRC**(Arm Fixed Rate Compression — **AFBC 다음 버전 ✓Nick 확인**, 고정율)
- 정리 축: 무손실 vs 고정율 · 압축률 · 랜덤액세스 · HW 비용 · 대역폭 절감
- ★ **연결**: FBC는 디코더 **DPB/참조프레임 대역폭** 절감의 핵심 → 기둥 2(디코더 메모리)와 직결 (지식이지만 HW 의미 큼)

---

## 5. 기둥 2 — Tool Forge: 디코더 전용 HW 설계 + 모듈별 UVM 검증

- **랜딩 = 디코더 레퍼런스 아키텍처 맵** (top-level 파이프라인 블록도)
- **디코더 tool 목록**: entropy decode(CABAC) · inverse transform · inverse quant · intra pred · inter pred/MC · deblocking · SAO · ALF · CDEF · loop restoration · reconstruction · DPB
- **각 tool 라이프사이클**:
  `스펙 → C model(1B) golden → RTL 설계 → ★모듈별 UVM 검증환경(TB·ref model=C model·커버리지·assertion) → conformance 비트스트림 회귀`
- ★ **UVM은 별도 기둥이 아니라 각 모듈 검증에 녹여냄** — tool마다 자기 UVM env. `uvm-*` 스킬·`uvm-drill` 재사용, 발견은 기둥 1로 환류.
- ▷ **인코더 = 형제 섹션, TBD placeholder** — 같은 레벨로 자리만 잡고 나중에. (ME/RDO/rate control 등은 추후)

---

## 6. 두 기둥 맞물림 — C model이 접착제

- **Forge → Spine**: tool 설계·검증의 깊은 이해가 척추로 환류
- **Spine → Forge**: 척추가 forge 우선순위(핵심·면접가치)를 정함
- **C model(1B)이 양쪽 golden**: 지식의 정답지이자 RTL 검증의 레퍼런스 — 한 자산이 두 기둥을 묶음

---

## 7. 엔진 (I 부분집합)

- **생산 라인**: 46 지식그래프(중심) · 40 paper-study-app(표준 spec·논문) · 44 파이프라인/아키텍처 viz · 42 한 장 카드 · 50 재사용엔진 · 51 전용환경(RTL+UVM+C model 빌드) · **NEW `codec-elicit`(지식 추출)**
- **개인 프로세스**: 48 회고 · 47 주간OS

## 8. 배포 — private-first ★ (C는 가장 보수적)
- 콘텐츠 repo private → 개인 서버/클라우드 로그인 앱 → github.io엔 **비기밀 증류분만** 선별 + uvm-drill 일부 환류 + 링크.

## 9. 커리어 (H)
- 포트폴리오(H37): "20년 코덱 IP 설계자의 코덱 A-to-Z + 직접 설계·검증한 디코더 tool" / 공개 글(H38, 비기밀만) / 면접 드릴(H39, codec·검증)

---

## 10. ★ 내 추가 아이디어 (계속 누적 — Nick 요청)

1. **Conformance 비트스트림 / test vector 중심 검증** — 표준별 공식 conformance stream을 디코더 검증의 1차 stimulus로 (C model golden과 짝). 코덱 검증의 진짜 토대.
2. **Bit-exactness / drift = 북극성** — 디코더는 ref와 비트정확해야. mismatch·drift 개념을 별도 노드로.
3. **FBC ↔ DPB 대역폭** — 1D를 디코더 메모리 대역폭 챕터와 명시적 링크 (AFBC/PVRIC가 왜 디코더에 붙나).
4. **HW 친화성 주석(해자)** — tool별 "HW에서 친절/적대"(CABAC 직렬 의존성, ALF 연산량, MC 랜덤액세스…) — Nick만 쓸 수 있는 층.
5. **Throughput / 병렬화** — WPP·tile·slice·프레임병렬, CTU/SB당 사이클 버짓 — 디코더 아키텍처 핵심.
6. **표준 횡단 비교 렌즈** — 같은 tool을 표준별로(예: transform HEVC vs AV1, in-loop filter 진화).
7. **AV2를 "live decoder"로** — 25_VideoCodec(AV2 디코더 IP)을 forge의 살아있는 대상으로 (지식+설계 동시 진행).
8. **검증 계층 지도** — directed → constrained-random(UVM) → conformance 회귀 → 커버리지 클로저 → (제어로직) formal. 각 모듈에 어디까지 적용할지.
9. **에러 내성/은닉(error resilience/concealment)** — 디코더 특유 주제, 별도 노드.
10. **파서/엔트로피 프론트엔드 분리** — 비트스트림 파싱(헤더·신택스) vs 픽셀 재구성 백엔드 구분 — 디코더 아키텍처의 첫 분할선.

> (이 목록은 열려 있음 — 매 세션 NCC가 후보 추가.)

---

## 11. 다음 — 챕터 하나하나 리뷰

- 위 구조(3장 트리)로 챕터 골격을 잡고 **Nick이 하나씩 다시 리뷰** → 확정.
- 당장 피드백 환영: 1A~1D / 기둥2 디코더 tool 목록 / §10 추가 아이디어 중 **뺄 것·더할 것·순서**.
- 실제 빌드는 Codec Lab 전용 세션에서 (워크스페이스 위치·private repo 결정 포함).
