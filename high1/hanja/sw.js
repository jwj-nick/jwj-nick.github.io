// 최소 서비스워커 — 앱 셸 + 데이터 캐시(오프라인 지원). 빌드 없음.
// 전략 = 네트워크 우선, 실패 시(오프라인) 캐시로 대체. 앱이 활발히 개발 중이라 캐시 우선 전략은
// "낡은 버전이 영원히 서빙되는" 사고를 낳았음(2026-08-23) — 재발 방지를 위해 네트워크 우선으로 전환.
const CACHE = "hanja-v2-cache-v6"; // 배포 라운드마다 이 버전을 올려 즉시 갱신을 강제한다(v3 런북 규약).
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./config.js", "./site.webmanifest", "./icon.svg", "./data/manifest.json", "./data/words.json", "./data/idioms.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
