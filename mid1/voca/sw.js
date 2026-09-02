// Voca Vault 서비스워커 — 앱 셸 + 콘텐츠 캐시(오프라인). 빌드 없음.
// 전략 = 네트워크 우선, 실패 시 캐시 (한자 나라 2026-08-23 교훈: 캐시 우선은 낡은 버전이 영원히 서빙됨).
// 예외: 웹폰트·오디오(mp3)는 불변 리소스라 캐시 우선.
// CACHE 버전은 30_pipeline/build.py가 콘텐츠 해시로 자동 갱신한다 (손으로 올리지 않는다).
const CACHE = "voca-cache-c58289c789";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./config.js", "./site.webmanifest", "./icon.svg"];
const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  const immutable = STATIC_HOSTS.some((h) => url.indexOf(h) >= 0) || /\/audio\/[^/]+\.mp3(\?|$)/.test(url);
  if (immutable) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(e.request).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
