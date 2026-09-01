// 생성물 — 원본은 data/tracks.json + 30_pipeline/build.py (직접 수정 금지)
window.APP_CONFIG = {
  "ns": "voca.high1",
  "track": "high",
  "title": "Voca Vault",
  "subtitle": "듣고 · 모으고 · 졸업하는 나의 단어장",
  "offlineBundle": false,
  "back": "../index.html",
  "backLabel": "← 고1 학습 앱",
  "algo": {
    "dailyNew": 10,
    "newMin": 4,
    "newMax": 14,
    "rMax": 5,
    "sMax": 2,
    "totalMax": 15,
    "vaultCap": 40,
    "knownDays": 7,
    "retestDays": 3
  },
  "mix": {
    "word": 7,
    "idiom": 2,
    "expr": 1
  },
  "mixUnlock": {
    "expr": {
      "fromBand": 2
    }
  },
  "quizTypes": [
    "meaning",
    "blank"
  ],
  "quizUnlock": {
    "dictation": {
      "fromBand": 4
    }
  },
  "bands": {
    "1": "기능어·기초 (검색 전용)",
    "2": "중등 복습",
    "3": "중등 심화",
    "4": "고등 기본",
    "5": "고등 핵심",
    "6": "고등 확장"
  },
  "dailyMinBand": 2,
  "defaultBand": 4,
  "blendBands": [
    4,
    5,
    6
  ],
  "defaultAccent": "us",
  "contentVersion": "2f5c19727a"
};
