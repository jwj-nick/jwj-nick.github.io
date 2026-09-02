// 생성물 — 원본은 data/tracks.json + 30_pipeline/build.py (직접 수정 금지)
window.APP_CONFIG = {
  "ns": "voca.mid1",
  "track": "mid",
  "title": "Voca Vault",
  "subtitle": "듣고 · 모으고 · 졸업하는 나의 단어장",
  "offlineBundle": false,
  "back": "../index.html",
  "backLabel": "← 중1 학습 앱",
  "algo": {
    "dailyNew": 10,
    "newMin": 4,
    "newMax": 14,
    "rMax": 5,
    "sMax": 2,
    "totalMax": 15,
    "vaultCap": 40,
    "knownDays": 7,
    "retestDays": 3,
    "gradDays": [
      30,
      90
    ],
    "gMax": 3
  },
  "mix": {
    "word": 7,
    "idiom": 2,
    "expr": 1
  },
  "mixUnlock": {
    "expr": {
      "fromBand": 3
    }
  },
  "quizTypes": [
    "meaning",
    "reverse",
    "blank"
  ],
  "quizUnlock": {
    "dictation": {
      "fromBand": 4
    }
  },
  "bands": {
    "1": "초등·문법어 (검색 전용)",
    "2": "중등 기초",
    "3": "중등 핵심",
    "4": "중등 심화"
  },
  "dailyMinBand": 2,
  "defaultBand": 3,
  "blendBands": [
    3,
    4
  ],
  "defaultAccent": "us",
  "contentVersion": "3bd3c80f87"
};
