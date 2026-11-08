/* sw.js — 하늘 퀘스트 오프라인 캐시 (버전 바꾸면 갱신) */
const V = "sq-v0.4.1";
const ASSETS = ['./', 'index.html', 'sq.css', 'sq.js', 'sq-story.js', 'sq-ep1.js', 'sq-ui.js', 'sq-ground.js', 'models/nature/CommonTree_1.glb', 'models/nature/CommonTree_3.glb', 'models/nature/PineTree_2.glb', 'models/nature/BirchTree_2.glb', 'models/nature/Bush_1.glb', 'models/nature/Rock_Moss_2.glb', 'models/nature/Flowers.glb', 'models/nature/Grass_2.glb', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'tex/earth-day.jpg', 'tex/earth-night.jpg', 'models/lumi-ship.glb', 'models/nox-ship.glb', 'models/minion.glb', 'models/yuli.glb', 'models/yuli-atlas.png', 'models/rock1.glb', 'models/rock2.glb', 'img/yul.png', 'img/nox.png', 'img/yul-back.png', 'lib/addons/loaders/GLTFLoader.js', 'lib/addons/utils/BufferGeometryUtils.js', 'lib/addons/utils/SkeletonUtils.js', 'lib/three.module.min.js',
  'lib/addons/postprocessing/EffectComposer.js', 'lib/addons/postprocessing/RenderPass.js', 'lib/addons/postprocessing/ShaderPass.js', 'lib/addons/postprocessing/MaskPass.js',
  'lib/addons/postprocessing/Pass.js', 'lib/addons/postprocessing/UnrealBloomPass.js', 'lib/addons/postprocessing/OutputPass.js',
  'lib/addons/shaders/CopyShader.js', 'lib/addons/shaders/LuminosityHighPassShader.js', 'lib/addons/shaders/OutputShader.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 네트워크 우선(최신 배포 반영) → 실패 시 캐시
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
