// Service worker for the HWPX Tool PWA.
//  1. Offline: network-first for same-origin GET, falling back to cache, so
//     online visitors always get the latest build and offline still works.
//  2. Android share target: receives a .hwpx POSTed from another app's Share
//     sheet, stashes it, and redirects to the app which picks it up.
// Scope is the folder this file is served from (/app/ locally, /hwpx/ deployed).

const CACHE = 'hwpx-tool-v1';
const SHARE_CACHE = 'hwpx-share';
const SHARE_KEY = 'shared-file';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // --- Android Web Share Target: file POSTed from another app ---
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(
      (async () => {
        try {
          const form = await req.formData();
          const file = form.get('sharedFile') || [...form.values()].find((v) => v instanceof File);
          if (file) {
            const cache = await caches.open(SHARE_CACHE);
            await cache.put(
              SHARE_KEY,
              new Response(file, {
                headers: {
                  'content-type': 'application/hwp+zip',
                  'x-filename': encodeURIComponent(file.name || 'shared.hwpx'),
                },
              }),
            );
          }
        } catch {
          // fall through to the redirect; the app shows its normal picker
        }
        return Response.redirect('./?shared=1', 303);
      })(),
    );
    return;
  }

  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // --- app shell: network-first, cache fallback ---
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error('offline and not cached');
      }
    })(),
  );
});
