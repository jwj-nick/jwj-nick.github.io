// 최소 서비스워커 — 앱 셸 + 데이터 캐시(오프라인 지원). 빌드 없음.
// 전략 = 네트워크 우선, 실패 시(오프라인) 캐시로 대체. 앱이 활발히 개발 중이라 캐시 우선 전략은
// "낡은 버전이 영원히 서빙되는" 사고를 낳았음(2026-08-23) — 재발 방지를 위해 네트워크 우선으로 전환.
// 예외: 웹폰트(Google Fonts)·CDN 라이브러리/획순 데이터(jsdelivr)는 불변 리소스라 캐시 우선 — 오프라인 유지.
const CACHE = "hanja-v2-cache-v15"; // 배포 라운드마다 이 버전을 올려 즉시 갱신을 강제한다(v3 런북 규약).
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./config.js", "./site.webmanifest", "./icon.svg", "./data/manifest.json", "./data/words.json", "./data/idioms.json"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

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
  if (FONT_HOSTS.some((h) => e.request.url.indexOf(h) >= 0)) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone(); // opaque 응답(no-cors CSS)도 캐시 가능 — ok 검사 없이 저장
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }
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
