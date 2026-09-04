// 생성물 — 원본은 data/tracks.json + 30_pipeline/build.py (직접 수정 금지)
window.APP_CONFIG = {
  "ns": "voca",
  "track": "all",
  "title": "Voca Vault",
  "subtitle": "듣고 · 모으고 · 졸업하는 나의 단어장",
  "offlineBundle": false,
  "back": "../index.html",
  "backLabel": "← 앱 모음",
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
    "gMax": 3,
    "levelN": 10,
    "levelPass": 8,
    "levelFail": 6,
    "levelDays": 14,
    "levelSignalN": 20,
    "kMax": 1,
    "boostShare": 0.3
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
    "1": "기능어·초등 (검색 전용)",
    "2": "중등 기초",
    "3": "중등 핵심",
    "4": "중등 심화",
    "5": "고등 기본",
    "6": "고등 핵심",
    "7": "고등 확장"
  },
  "dailyMinBand": 2,
  "defaultBand": 3,
  "blendBands": [],
  "presets": {
    "mid": {
      "label": "중학생",
      "start": 3
    },
    "high": {
      "label": "고등학생",
      "start": 5
    },
    "adult": {
      "label": "성인",
      "start": 6
    }
  },
  "legacyNs": [
    "voca.mid1",
    "voca.high1"
  ],
  "legacyIds": true,
  "defaultAccent": "us",
  "contentVersion": "79625116b5",
  "appVersion": "2.0.0",
  "builtAt": "2026-09-04"
};
