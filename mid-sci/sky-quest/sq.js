/* sq.js — 율이의 하늘 퀘스트 · 엔진 + 스테이지 5(그림자 추격전)
 * 위: three.js 우주(태양·지구·달, 지구 셰이더가 달 그림자를 기하로 계산) / 아래: 같은 기하에서 계산한 "율이의 눈" 지표 하늘(2D).
 * 모형 스케일(실제 비율 아님): 지구 R=1, 달 r=0.27, 궤도 4, 햇빛은 +X 방향 평행광.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CHARS, PORTRAIT, STAGE5 } from './sq-story.js';

const D2R = Math.PI / 180, RO = 4, RM = 0.27, KU = 0.55, KP = 2.4, MOON_Y = 0.55;
const L = new THREE.Vector3(1, 0, 0); // 햇빛이 오는 방향(지구→태양)
const $ = (s) => document.querySelector(s);
const cv3 = $('#cv3'), cv2 = $('#cv2'), g2 = cv2.getContext('2d');

/* ═════ 저장 · 소리 ═════ */
const store = { get(k, d) { try { const v = localStorage.getItem('sq-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sq-' + k, JSON.stringify(v)); } catch (e) {} } };
let muted = store.get('muted', false), hq = store.get('hq', true), actx = null;
function tone(f, d = 0.15, type = 'sine', v = 0.08, delay = 0) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
const sfx = {
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.08)); },
  bad() { tone(220, 0.3, 'sawtooth', 0.06); tone(160, 0.4, 'sawtooth', 0.05, 0.12); },
  tick() { tone(880, 0.05, 'square', 0.03); },
  blip() { tone(660, 0.06, 'triangle', 0.05); },
  gate() { tone(392, 0.15, 'triangle', 0.07); tone(587, 0.25, 'triangle', 0.07, 0.12); },
  total() { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 1.2, 'sine', 0.05, i * 0.05)); }
};

/* ═════ 렌더러 · 장면 ═════ */
const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01020a);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// 별
{
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 180, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
    const b = 0.5 + Math.random() * 0.5, t = Math.random();
    col.set([b * (t < 0.2 ? 1 : 0.85), b * 0.9, b * (t > 0.8 ? 1 : 0.95)], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true })));
}
// 태양
function glowTex(c0, c1) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, c0); gr.addColorStop(0.25, c1); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const SUNP = new THREE.Vector3(10, 0, 0);
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c8 }));
sun.position.copy(SUNP); scene.add(sun);
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,200,1)', 'rgba(255,170,60,.45)'), blending: THREE.AdditiveBlending, depthWrite: false }));
sunGlow.scale.set(11, 11, 1); sunGlow.position.copy(SUNP); scene.add(sunGlow);
const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.copy(SUNP); scene.add(dl);
scene.add(new THREE.AmbientLight(0x223355, 0.12));

// 지구 (주야 + 달 그림자 셰이더)
const tl = new THREE.TextureLoader();
const texDay = tl.load('tex/earth-day.jpg'), texNight = tl.load('tex/earth-night.jpg');
[texDay, texNight].forEach(t => { t.anisotropy = 4; });
const earthU = {
  dayMap: { value: texDay }, nightMap: { value: texNight }, sunDir: { value: L.clone() },
  moonPos: { value: new THREE.Vector3() }, moonR: { value: RM }, kU: { value: KU }, kP: { value: KP }
};
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.ShaderMaterial({
  uniforms: earthU,
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform sampler2D dayMap,nightMap; uniform vec3 sunDir,moonPos; uniform float moonR,kU,kP;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 n=normalize(vN); float ndl=dot(n,sunDir);
      vec3 day=texture2D(dayMap,vUv).rgb, night=texture2D(nightMap,vUv).rgb;
      float dA=smoothstep(-0.12,0.2,ndl);
      vec3 col=mix(night*vec3(1.4,1.25,1.0)+day*0.025, day*(0.22+1.0*max(ndl,0.)), dA);
      vec3 mp=moonPos-vW; float al=dot(mp,sunDir);
      if(al>0.){ float d=length(mp-al*sunDir); float um=1.-smoothstep(kU*moonR*0.82,kU*moonR,d); float pe=1.-smoothstep(kU*moonR,kP*moonR,d);
        float sh=max(um*0.93,pe*0.6); col*=1.-sh*dA; col+=vec3(0.02,0.0,0.05)*um*dA; }
      float rim=pow(1.-max(dot(n,normalize(cameraPosition-vW)),0.),3.);
      col+=vec3(0.25,0.5,1.)*rim*0.45*(0.25+dA);
      gl_FragColor=vec4(col,1.);
    }`
}));
earth.rotation.y = -127 * D2R; // 서울(동경 127°)이 태양 쪽 정오
scene.add(earth);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.045, 64, 48), new THREE.ShaderMaterial({
  side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vN; void main(){ float i=pow(0.72-dot(vN,vec3(0,0,1.)),3.); gl_FragColor=vec4(0.35,0.6,1.,1.)*i*1.4; }`
}));
scene.add(atmo);

// 달
function moonTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#9a978f'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2200; i++) { const v = 120 + Math.random() * 70 | 0; x.fillStyle = `rgba(${v},${v},${v - 6},.25)`; x.fillRect(Math.random() * 512, Math.random() * 256, 3, 3); }
  for (let i = 0; i < 26; i++) { const cx = Math.random() * 512, cy = 30 + Math.random() * 196, r = 6 + Math.random() * 34; x.fillStyle = 'rgba(70,70,72,.35)'; x.beginPath(); x.ellipse(cx, cy, r, r * 0.9, 0, 0, 7); x.fill(); }
  for (let i = 0; i < 80; i++) { const cx = Math.random() * 512, cy = Math.random() * 256, r = 2 + Math.random() * 7; x.strokeStyle = 'rgba(210,210,205,.35)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); }
  const t = new THREE.CanvasTexture(c); return t;
}
const moon = new THREE.Mesh(new THREE.SphereGeometry(RM, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex(), roughness: 1, metalness: 0 }));
scene.add(moon);
const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, i) => new THREE.Vector3(RO * Math.cos(i / 180 * 2 * Math.PI), MOON_Y, -RO * Math.sin(i / 180 * 2 * Math.PI)))),
  new THREE.LineDashedMaterial({ color: 0x6fd6ff, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.55 }));
orbit.computeLineDistances(); scene.add(orbit);

// 그림자 원뿔(시각화용)
const coneMatU = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
const coneMatP = new THREE.MeshBasicMaterial({ color: 0x1a0830, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
const coneU = new THREE.Mesh(new THREE.CylinderGeometry(KU * RM, RM, 1, 40, 1, true), coneMatU);
const coneP = new THREE.Mesh(new THREE.CylinderGeometry(KP * RM, RM, 1, 40, 1, true), coneMatP);
scene.add(coneU, coneP);

// 마커: 율이, 서울, 녹스 구름
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const x = c.getContext('2d');
  x.font = '900 40px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 128, 36); x.fillStyle = color; x.fillText(text, 128, 36);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); s.scale.set(0.36, 0.1, 1); return s;
}
const yul = new THREE.Group();
{
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,140,1)', 'rgba(255,170,60,.5)'), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  glow.scale.set(0.16, 0.16, 1); yul.add(glow);
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), new THREE.MeshBasicMaterial({ color: 0xffb84d, depthTest: false }));
  pin.rotation.x = Math.PI; pin.position.y = 0.06; yul.add(pin);
  const lb = labelSprite('🐾 율이', '#ffb84d'); lb.position.y = 0.16; yul.add(lb);
  yul.visible = false; scene.add(yul);
}
const seoulV = new THREE.Vector3(Math.cos(37.5 * D2R), Math.sin(37.5 * D2R), 0); // 회전된 지구에서 서울(월드)
const seoulMk = labelSprite('● 서울', '#ffffff'); seoulMk.scale.set(0.3, 0.084, 1); seoulMk.position.copy(seoulV).multiplyScalar(1.07); scene.add(seoulMk);
const noxTex = glowTex('rgba(20,0,40,1)', 'rgba(110,60,200,.55)');
const clouds = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noxTex, depthWrite: false, transparent: true })); s.scale.set(0.2, 0.2, 1); s.visible = false; scene.add(s); return s; });

/* ═════ 기하 ═════ */
let theta = -40; // 달 위치각(도), 0 = 태양 방향
const moonPos = () => new THREE.Vector3(RO * Math.cos(theta * D2R), MOON_Y, -RO * Math.sin(theta * D2R));
function basis(P) { const east = new THREE.Vector3(0, 1, 0).cross(P).normalize(); const north = P.clone().cross(east).normalize(); return { east, north }; }
function overlap(r1, r2, d) {
  if (d >= r1 + r2) return 0; if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)), b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return a + b - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
}
// 지표점 P(단위벡터, 월드)에서 본 일식 상태
function skyAt(P) {
  if (P.dot(L) < 0.03) return { night: true, zone: 'night', frac: 0 };
  const v = moonPos().sub(P), al = v.dot(L);
  if (al <= 0) return { zone: 'none', frac: 0, off: 99, dir: { x: 0, y: 0 } };
  const perp = v.clone().sub(L.clone().multiplyScalar(al)), d = perp.length(), uR = KU * RM, pR = KP * RM;
  const off = Math.max(0, d - uR) / (pR - uR) * 2.06;
  const { east, north } = basis(P), ex = perp.dot(east), ny = perp.dot(north), m = Math.hypot(ex, ny) || 1;
  const frac = d < uR ? 1 : Math.min(1, overlap(1, 1.03, off) / Math.PI);
  return { zone: d < uR ? 'umbra' : (d < pR ? 'pen' : 'none'), frac, off, dir: { x: -ex / m, y: -ny / m } };
}
function umbraCenter() { // 본그림자 중심선이 지구에 닿는 점
  const M = moonPos(), b = -2 * M.dot(L), c = M.lengthSq() - 1, disc = b * b - 4 * c; if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / 2; return M.clone().sub(L.clone().multiplyScalar(t));
}

/* ═════ 지표 시점(2D) ═════ */
let groundW = 0, groundH = 0;
function sizeGround() { const r = cv2.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); groundW = r.width; groundH = r.height; cv2.width = groundW * dpr; cv2.height = groundH * dpr; g2.setTransform(dpr, 0, 0, dpr, 0, 0); }
const gStars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.7, Math.random()]);
function drawGround(sky, extra) {
  const c = g2, w = groundW, h = groundH; if (!w) return;
  const night = sky.night, f = sky.frac || 0, b = night ? 0 : 1 - 0.93 * Math.pow(f, 2.4);
  const gr = c.createLinearGradient(0, 0, 0, h);
  if (night) { gr.addColorStop(0, '#03060f'); gr.addColorStop(1, '#0d1838'); }
  else { gr.addColorStop(0, `rgb(${30 * b + 3 | 0},${105 * b + 5 | 0},${205 * b + 14 | 0})`); gr.addColorStop(1, `rgb(${150 * b + 12 | 0},${200 * b + 14 | 0},${245 * b + 30 | 0})`); }
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  const sa = night ? 1 : Math.max(0, (f - 0.9) / 0.1);
  if (sa > 0) gStars.forEach(s => { c.fillStyle = `rgba(230,238,255,${(0.4 + 0.6 * s[2]) * sa})`; c.fillRect(s[0] * w, s[1] * h, 1.6, 1.6); });
  const cx = w * 0.5, cy = h * 0.4, r = Math.min(w, h) * 0.13;
  if (!night) {
    if (f >= 0.999) { // 코로나
      const cg = c.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 3.2); cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(0.25, 'rgba(220,230,255,.45)'); cg.addColorStop(1, 'rgba(200,220,255,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, r * 3.2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + 0.3 * Math.sin(i * 7), l = r * (1.5 + (i % 5) * 0.35); c.beginPath(); c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); c.stroke(); }
      c.fillStyle = '#04050a'; c.beginPath(); c.arc(cx, cy, r * 1.01, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,90,110,.8)'; c.beginPath(); c.arc(cx - r * 0.98, cy + r * 0.2, 2.2, 0, 7); c.fill(); // 홍염
    } else {
      const sg = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6); sg.addColorStop(0, `rgba(255,236,170,${0.55 * b + 0.1})`); sg.addColorStop(1, 'rgba(255,200,90,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(cx, cy, r * 2.6, 0, 7); c.fill();
      const s2 = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); s2.addColorStop(0, '#fffbe6'); s2.addColorStop(1, '#ffd25a');
      c.fillStyle = s2; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      if (sky.off < 6) { c.fillStyle = '#0b0d14'; c.beginPath(); c.arc(cx + sky.dir.x * sky.off * r, cy + sky.dir.y * sky.off * r, r * 1.03, 0, 7); c.fill(); }
      if (f > 0.94) { const dx = cx - sky.dir.x * r, dy = cy - sky.dir.y * r, dg = c.createRadialGradient(dx, dy, 0, dx, dy, r * 0.9); dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(0.15, 'rgba(255,255,240,.8)'); dg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = dg; c.beginPath(); c.arc(dx, dy, r * 0.9, 0, 7); c.fill(); }
    }
  }
  // 언덕 + 율이 실루엣
  c.fillStyle = night ? '#02040a' : `rgb(${10 + 20 * b | 0},${22 + 40 * b | 0},${18 + 26 * b | 0})`;
  c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.86); c.quadraticCurveTo(w * 0.2, h * 0.76, w * 0.42, h * 0.87); c.quadraticCurveTo(w * 0.7, h * 0.95, w, h * 0.82); c.lineTo(w, h); c.fill();
  const yx = w * 0.16, yy = h * 0.8, s = Math.min(w, h) * 0.035; c.fillStyle = '#05070c';
  c.beginPath(); c.arc(yx, yy, s, 0, 7); c.fill(); c.beginPath(); c.moveTo(yx - s * 0.9, yy - s * 0.4); c.lineTo(yx - s * 0.5, yy - s * 1.6); c.lineTo(yx - s * 0.1, yy - s * 0.7); c.fill();
  c.beginPath(); c.moveTo(yx + s * 0.9, yy - s * 0.4); c.lineTo(yx + s * 0.5, yy - s * 1.6); c.lineTo(yx + s * 0.1, yy - s * 0.7); c.fill();
  c.fillStyle = '#e23b4e'; c.beginPath(); c.arc(yx, yy - s * 1.05, s * 0.28, 0, 7); c.fill();
  c.fillStyle = '#05070c'; c.fillRect(yx - s * 0.8, yy + s * 0.6, s * 1.6, s * 1.3);
  // 라벨
  c.font = '800 12px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(8, 8, 160, 22); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('👁 율이의 눈 · 지표의 하늘', 14, 19);
  c.textAlign = 'right'; c.fillStyle = f >= 0.999 ? '#ffe9a8' : '#fff';
  const lab = night ? '🌙 밤 — 태양이 안 보여요' : (f >= 0.999 ? '✨ 개기일식!' : (f > 0.002 ? `부분일식 · ${Math.round(f * 100)}% 가려짐` : '해가 쨍쨍'));
  c.fillText(lab, w - 10, 19);
  c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText('← 동', 28, h - 12); c.fillText('서 →', w - 28, h - 12);
  if (extra) extra(c, w, h, cx, cy, r);
}

/* ═════ 카메라 트윈 ═════ */
const camLook = new THREE.Vector3(), cam = { from: null, to: null, lf: null, lt: null, t: 1, dur: 1 };
function camTo(pos, look, dur = 1.6) { cam.from = camera.position.clone(); cam.to = pos.clone(); cam.lf = camLook.clone(); cam.lt = look.clone(); cam.t = 0; cam.dur = dur; }
function camSet(pos, look) { camera.position.copy(pos); camLook.copy(look); camera.lookAt(camLook); cam.t = 1; }
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/* ═════ UI ═════ */
const hud = $('#hud'), dlg = $('#dlg'), screen = $('#screen'), toastEl = $('#toast'), banner = $('#banner'), gq = $('#gq'), joyEl = $('#joy');
let toastT = 0;
function toast(html, bad) { toastEl.innerHTML = html; toastEl.className = 'on' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => toastEl.className = '', 2200); }
function showBanner(small, big) { banner.innerHTML = `<small>${small}</small>${big}`; banner.className = ''; void banner.offsetWidth; banner.className = 'on'; }
function say(lines, done) {
  let i = 0, typing = 0, full = '';
  dlg.classList.remove('hide');
  function show() {
    const [who, text] = lines[i], ch = CHARS[who];
    dlg.className = who; dlg.querySelector('.d-por').innerHTML = PORTRAIT[who];
    dlg.querySelector('.d-name').innerHTML = `<span style="color:${ch.color}">${ch.name}</span> <span style="opacity:.5">${ch.en}</span>`;
    full = text; const el = dlg.querySelector('.d-text'); el.innerHTML = ''; let k = 0; const plain = text.replace(/<[^>]+>/g, '');
    clearInterval(typing); typing = setInterval(() => { k += 2; el.textContent = plain.slice(0, k); if (k % 6 === 0) tone(who === 'nox' ? 180 : who === 'lumi' ? 900 : 600, 0.03, 'square', 0.015); if (k >= plain.length) { clearInterval(typing); typing = 0; el.innerHTML = full; } }, 22);
  }
  dlg.onclick = () => {
    if (typing) { clearInterval(typing); typing = 0; dlg.querySelector('.d-text').innerHTML = full; return; }
    i++; if (i < lines.length) show(); else { dlg.classList.add('hide'); dlg.onclick = null; done && done(); }
  };
  show();
}
function gatesHud(cur) { $('#h-gates').innerHTML = STAGE5.gates.map((g, i) => `<i class="${i < cur ? 'ok' : i === cur ? 'on' : ''}">${i < cur ? '✓' : i + 1}<span>·${g.name}</span></i>`).join(''); }
function setTimer(frac) { const t = $('#h-timer'); t.querySelector('i').style.transform = `scaleX(${Math.max(0, frac)})`; t.classList.toggle('warn', frac < 0.25); }
$('#b-snd').onclick = () => { muted = !muted; store.set('muted', muted); $('#b-snd').textContent = muted ? '🔇' : '🔊'; };
$('#b-hq').onclick = () => { hq = !hq; store.set('hq', hq); $('#b-hq').style.opacity = hq ? 1 : 0.4; toast(hq ? '✨ 고화질(빛 번짐) 켬' : '⚡ 가벼운 화질'); };
$('#b-exit').onclick = () => titleScreen();
$('#b-snd').textContent = muted ? '🔇' : '🔊'; $('#b-hq').style.opacity = hq ? 1 : 0.4;

/* ═════ 게임 상태 ═════ */
const G = { mode: 'title', gate: -1, tLeft: 0, tMax: 1, running: false, yulP: null, meter: 0, stun: 0, hold: 0, joy: null, keys: {}, qi: 0, anim: 0, totalOnce: false, lastTick: 0, cloudsV: [] };

function titleScreen() {
  G.mode = 'title'; G.running = false; hud.classList.add('hide'); dlg.classList.add('hide'); gq.classList.add('hide'); joyEl.classList.add('hide');
  yul.visible = false; clouds.forEach(c => c.visible = false); theta = -40;
  screen.className = 'on'; screen.innerHTML = `<div class="sc"><div class="eye">MID-SCI · 3D OBSERVATORY</div>
    <h1>율이의<br><span>하늘 퀘스트</span></h1>
    <p>우주와 지표, <b>두 시점</b>을 오가며 빛을 훔치는 <b style="color:var(--nox)">녹스</b>를 막아요. 관문을 하나라도 놓치면 스테이지 처음부터!</p>
    <button class="btn pri" id="go">▶ STAGE 5 · 그림자 추격전</button>
    <button class="btn sec" id="who">등장인물 소개 (이름의 뜻)</button>
    <div class="stage-list">🔒 STAGE 1 해돋이 탈환 · 2 북극성 항법 · 3 달 배송 레이스 · 4 두 시점 퍼즐 · 6 붉은 달 — 준비 중<br>📘 개념 공부는 <a href="../earth-moon/" style="color:var(--cy)">지구와 달 실험실</a>에서</div></div>`;
  $('#go').onclick = () => { tone(1, 0.01); store.get('seenChars', false) ? startStage(true) : charsScreen(true); };
  $('#who').onclick = () => charsScreen(false);
}
function charsScreen(thenStart) {
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">CHARACTERS</div><h1 style="font-size:30px;margin-top:4vh">등장인물</h1>` +
    ['yul', 'lumi', 'nox'].map(k => { const c = CHARS[k]; return `<div class="card"><div class="por">${PORTRAIT[k]}</div><div><h3 style="color:${c.color}">${c.name}<small>${c.en}</small></h3><div class="role">${c.role}</div><p>${c.about}</p>${c.word ? `<div class="word">📖 ${c.word}</div>` : ''}</div></div>`; }).join('') +
    `<button class="btn pri" id="ok">${thenStart ? '▶ 출동!' : '← 돌아가기'}</button></div>`;
  store.set('seenChars', true);
  $('#ok').onclick = () => thenStart ? startStage(true) : titleScreen();
}

function startStage(withIntro) {
  screen.className = ''; screen.innerHTML = ''; hud.classList.remove('hide');
  $('#h-stage').textContent = `STAGE ${STAGE5.no} · ${STAGE5.title}`;
  G.mode = 'stage'; theta = -40; yul.visible = false; G.yulP = null; G.meter = 0; G.totalOnce = false;
  clouds.forEach(c => c.visible = false); $('#h-meter').classList.add('hide'); gq.classList.add('hide'); joyEl.classList.add('hide');
  camTo(new THREE.Vector3(4.2, 19, 8.5), new THREE.Vector3(4.2, 0, 0), 2.2);
  gatesHud(0); $('#h-goal').innerHTML = ''; setTimer(1);
  const go = () => runGate(0);
  withIntro ? say(STAGE5.intro, go) : say([STAGE5.fail], go);
}

function runGate(i) {
  G.gate = i; const gd = STAGE5.gates[i]; gatesHud(i);
  const begin = () => {
    showBanner(`관문 ${i + 1} / 4`, gd.name); sfx.gate();
    $('#h-goal').innerHTML = gd.goal; G.tMax = G.tLeft = gd.time; G.running = true; G.hold = 0; G.lastTick = 0;
    if (gd.id === 'chase') { $('#h-meter').classList.remove('hide'); G.meter = 0; spawnClouds(); }
    if (gd.id === 'quiz') { G.qi = 0; showQ(); }
    toast('💡 ' + (gd.hint || ''), false);
  };
  // 게이트별 카메라·상태
  if (gd.id === 'align') { theta = -40; camTo(new THREE.Vector3(4.2, 19, 8.5), new THREE.Vector3(4.2, 0, 0), 1.6); }
  if (gd.id === 'land') { theta = -6; camTo(new THREE.Vector3(3.05, 0.95, 0.35), new THREE.Vector3(0, 0.45, 0), 2.4); }
  if (gd.id === 'chase') { theta = -6; }
  if (gd.id === 'quiz') { camTo(new THREE.Vector3(6.5, 2.2, 3.5), new THREE.Vector3(1.5, 0.3, 0), 2); }
  gd.pre ? say(gd.pre, begin) : begin();
}
function gateDone() {
  G.running = false; sfx.ok(); const gd = STAGE5.gates[G.gate]; joyEl.classList.add('hide');
  const next = () => { if (G.gate + 1 < STAGE5.gates.length) runGate(G.gate + 1); else stageClear(); };
  gd.done ? say(gd.done, next) : next();
}
function stageFail(reason) {
  if (!G.running && G.mode !== 'stage') return;
  G.running = false; sfx.bad(); joyEl.classList.add('hide'); gq.classList.add('hide'); clouds.forEach(c => c.visible = false);
  screen.className = 'on fail';
  screen.innerHTML = `<div class="sc fail" style="text-align:center"><div class="eye" style="color:var(--nox)">GATE ${G.gate + 1} FAILED</div><h1 style="font-size:30px">녹스가 코로나를 훔쳐갔다!</h1>
    <div class="card" style="text-align:left"><div class="por">${PORTRAIT.lumi}</div><div><h3 style="color:var(--cy)">루미의 분석</h3><p>${reason}</p></div></div>
    <button class="btn pri" id="re">↺ 스테이지 처음부터</button><button class="btn sec" id="ti">타이틀로</button></div>`;
  $('#re').onclick = () => startStage(false); $('#ti').onclick = titleScreen;
}
function stageClear() {
  G.running = false; hud.classList.add('hide'); sfx.total();
  camTo(new THREE.Vector3(-3.5, 3.2, 7.5), new THREE.Vector3(1.8, 0.2, 0), 3);
  say(STAGE5.clear, () => {
    store.set('clear-s5', true);
    screen.className = 'on';
    screen.innerHTML = `<div class="sc"><div class="eye">STAGE 5 CLEAR</div><h1 style="font-size:34px;margin-top:4vh">🏆 코로나를 지켰다!</h1>
      <p>오늘 율이가 본 <b>일식</b>을 시험지 4요소로 정리하면:</p>
      <div class="sum">${STAGE5.summary.map(s => `<div><span>${s[0]}</span><p>${s[1]}</p></div>`).join('')}</div>
      <p style="font-size:13px;color:var(--muted)">※ 월식은 반대로 태양-<b>지구</b>-달, 위상 <b>망</b>, 달의 <b>왼쪽(동쪽)</b>부터, <b>밤인 모든 지역</b>에서 관찰 — 녹스가 다음에 노리는 장면이에요.</p>
      <button class="btn pri" id="again">↺ 다시 도전 (더 빠르게!)</button><a class="btn sec" href="../earth-moon/#u5">📘 일식·월식 단원 복습</a><button class="btn sec" id="ti">타이틀로</button></div>`;
    $('#again').onclick = () => startStage(false); $('#ti').onclick = titleScreen;
  });
}

/* 관문 4: 녹스의 질문 */
function showQ() {
  const gd = STAGE5.gates[3], q = gd.qs[G.qi]; G.tLeft = G.tMax = gd.time;
  gq.classList.remove('hide');
  gq.innerHTML = `<div class="q">🟣 ${q.q}</div><div class="o">${q.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div>`;
  gq.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (!G.running) return; const k = +b.dataset.k;
    if (k === q.a) { b.classList.add('ok'); sfx.blip(); toast('✅ ' + q.why); G.running = false; setTimeout(() => { G.qi++; if (G.qi < gd.qs.length) { G.running = true; showQ(); } else { gq.classList.add('hide'); G.running = true; gateDone(); } }, 1400); }
    else { b.classList.add('no'); stageFail('오답이에요. ' + q.why); }
  });
}

/* 녹스 구름 */
function spawnClouds() {
  G.cloudsV = clouds.map((c, i) => {
    const lat = (24 + i * 9) * D2R, z = 0.35 - i * 0.35, P = new THREE.Vector3(Math.cos(lat), Math.sin(lat), z).normalize();
    c.visible = true; return { P, v: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12) };
  });
}

/* ═════ 입력 ═════ */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(ev) { const r = cv3.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
let dragging = false;
cv3.addEventListener('pointerdown', (ev) => {
  if (!G.running) return; dragging = true; try { cv3.setPointerCapture(ev.pointerId); } catch (e) {}
  const gid = STAGE5.gates[G.gate].id;
  if (gid === 'align') alignDrag(ev);
  if (gid === 'land') landTap(ev);
  if (gid === 'chase') { const r = cv3.getBoundingClientRect(); G.joy = { x0: ev.clientX, y0: ev.clientY, dx: 0, dy: 0 }; joyEl.style.left = (ev.clientX - r.left) + 'px'; joyEl.style.top = (ev.clientY - r.top) + 'px'; joyEl.classList.remove('hide'); joyEl.querySelector('i').style.transform = ''; }
});
cv3.addEventListener('pointermove', (ev) => {
  if (!dragging || !G.running) return; const gid = STAGE5.gates[G.gate].id;
  if (gid === 'align') alignDrag(ev);
  if (gid === 'chase' && G.joy) { let dx = ev.clientX - G.joy.x0, dy = ev.clientY - G.joy.y0; const m = Math.hypot(dx, dy), k = m > 50 ? 50 / m : 1; G.joy.dx = dx * k; G.joy.dy = dy * k; joyEl.querySelector('i').style.transform = `translate(${G.joy.dx}px,${G.joy.dy}px)`; }
});
const endDrag = () => { dragging = false; G.joy = null; joyEl.classList.add('hide'); };
cv3.addEventListener('pointerup', endDrag); cv3.addEventListener('pointercancel', endDrag);
window.addEventListener('keydown', e => { G.keys[e.key] = true; }); window.addEventListener('keyup', e => { G.keys[e.key] = false; });
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MOON_Y), hitP = new THREE.Vector3();
function alignDrag(ev) { pick(ev); if (ray.ray.intersectPlane(plane, hitP)) { let a = Math.atan2(-hitP.z, hitP.x) / D2R; theta = Math.max(-80, Math.min(80, a)); } }
function landTap(ev) {
  pick(ev); const hit = ray.intersectObject(earth)[0]; if (!hit) return;
  const P = hit.point.clone().normalize(), s = skyAt(P);
  G.yulP = P; yul.visible = true;
  if (s.zone === 'umbra') { toast('🎯 본그림자 착륙! 개기일식 구역'); setTimeout(gateDone, 900); G.running = false; return; }
  sfx.bad(); G.tLeft -= 3;
  toast(s.zone === 'night' ? '🌙 여긴 밤 — 태양이 안 보여요 (−3초)' : s.zone === 'pen' ? '🌗 반그림자 — 부분일식만 보여요 (−3초)' : '☀️ 그림자 밖 — 일식이 안 보여요 (−3초)', true);
}

/* ═════ 루프 ═════ */
function resize() {
  const r = cv3.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); composer.setSize(r.width, r.height);
  bloom.resolution.set(r.width, r.height); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); sizeGround();
}
window.addEventListener('resize', resize); resize();
camSet(new THREE.Vector3(-2.5, 3, 8.5), new THREE.Vector3(1.5, 0.2, 0));

let last = performance.now(), tAll = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAll += dt;
  // 카메라
  if (cam.t < 1) { cam.t = Math.min(1, cam.t + dt / cam.dur); const e = ease(cam.t); camera.position.lerpVectors(cam.from, cam.to, e); camLook.lerpVectors(cam.lf, cam.lt, e); }
  else if (G.mode === 'title') { const a = tAll * 0.08; camera.position.set(1.5 + 8.5 * Math.sin(a), 2.6, 8.5 * Math.cos(a)); camLook.set(1.5, 0.2, 0); earth.rotation.y += dt * 0.05; theta = (theta + dt * 6) % 360; }
  camera.lookAt(camLook);
  if (G.mode !== 'title') earth.rotation.y = -127 * D2R;

  // 게이트 로직
  let sky = skyAt(G.yulP || seoulV);
  if (G.running) {
    const gid = STAGE5.gates[G.gate].id;
    G.tLeft -= dt; setTimer(G.tLeft / G.tMax);
    if (G.tLeft < 5 && Math.ceil(G.tLeft) !== G.lastTick) { G.lastTick = Math.ceil(G.tLeft); sfx.tick(); }
    if (G.tLeft <= 0) {
      const why = { align: '시간 안에 정렬하지 못했어요. 일식은 달이 태양과 지구 <b>사이</b>, 즉 <b>태양-달-지구</b> 일직선일 때예요.', land: '본그림자에 착륙하지 못했어요. <b>개기일식</b>은 달의 <b>본그림자</b>(가장 진한 점) 안에서만 보여요.', chase: '본그림자를 놓쳤어요. 달이 서→동으로 공전하니 그림자도 <b>동쪽</b>으로 움직여요. 미리 동쪽으로 가 있어 봐요!', quiz: '시간 초과! 방금 본 장면을 떠올리면 답이 보여요.' }[gid];
      stageFail(why);
    } else if (gid === 'align') {
      sky = skyAt(seoulV);
      if (Math.abs(theta) < 2.5) { G.hold += dt; if (G.hold > 0.5) { G.running = false; theta = 0; toast('🎯 정렬 완료! 태양-달-지구'); setTimeout(gateDone, 700); } } else G.hold = 0;
    } else if (gid === 'chase') {
      theta = Math.min(8, theta + dt * (14 / 26));
      // 율이 이동
      let jx = 0, jy = 0; if (G.joy) { jx = G.joy.dx / 50; jy = -G.joy.dy / 50; }
      if (G.keys.ArrowLeft) jx = -1; if (G.keys.ArrowRight) jx = 1; if (G.keys.ArrowUp) jy = 1; if (G.keys.ArrowDown) jy = -1;
      if (G.stun > 0) { G.stun -= dt; jx = jy = 0; }
      const { east, north } = basis(G.yulP), sp = 0.075 * dt;
      G.yulP.addScaledVector(east, jx * sp).addScaledVector(north, jy * sp).normalize();
      // 녹스 구름
      G.cloudsV.forEach((o, i) => {
        o.P.addScaledVector(o.v, dt * 0.35).normalize(); if (o.P.dot(L) < 0.3) o.v.negate();
        const uc = umbraCenter(); if (uc && Math.random() < 0.02) o.v.lerp(uc.clone().sub(o.P), 0.2);
        clouds[i].position.copy(o.P).multiplyScalar(1.02); clouds[i].material.rotation += dt;
        if (G.stun <= 0 && o.P.distanceTo(G.yulP) < 0.075) { G.stun = 1.1; sfx.bad(); toast('🟣 녹스의 그림자 구름! 잠깐 멈춤', true); G.yulP.addScaledVector(o.P.clone().sub(G.yulP).negate().normalize(), 0.05).normalize(); }
      });
      sky = skyAt(G.yulP);
      if (sky.zone === 'umbra') { G.meter += dt; if (!G.totalOnce) { G.totalOnce = true; sfx.total(); } }
      $('#h-meter i').style.width = Math.min(100, G.meter / 6 * 100) + '%'; $('#h-meter em').textContent = G.meter.toFixed(1) + ' / 6초';
      if (G.meter >= 6) { G.running = false; $('#h-meter').classList.add('hide'); clouds.forEach(c => c.visible = false); gateDone(); }
      // 추적 카메라
      const want = G.yulP.clone().add(L.clone().multiplyScalar(0.9)).normalize().multiplyScalar(2.45).add(new THREE.Vector3(0, 0.25, 0));
      camera.position.lerp(want, 1 - Math.pow(0.02, dt)); camLook.lerp(G.yulP.clone().multiplyScalar(0.7), 1 - Math.pow(0.02, dt)); cam.t = 1;
    } else if (gid === 'quiz') {
      G.anim = (G.anim + dt * 0.22) % 1; theta = -11 + 9.5 * G.anim; sky = skyAt(seoulV);
    }
  } else if (G.mode === 'stage' && G.gate === 3) { G.anim = (G.anim + dt * 0.22) % 1; theta = -11 + 9.5 * G.anim; sky = skyAt(seoulV); }

  // 장면 갱신
  const M = moonPos(); moon.position.copy(M); moon.rotation.y = -theta * D2R; earthU.moonPos.value.copy(M);
  const al = Math.abs(((theta + 540) % 360) - 180) > 160 ? 0 : 1; // 태양 반대편이면 그림자 원뿔 숨김
  const showCone = Math.abs(theta) < 22 && G.mode === 'stage' && !(G.running && STAGE5.gates[G.gate].id === 'chase');
  const tipT = (() => { const c = M.x - Math.sqrt(Math.max(0, 1 - M.y * M.y - M.z * M.z)); return Math.max(0.3, c); })();
  [coneU, coneP].forEach(c => { c.visible = showCone && al; c.scale.set(1, tipT, 1); c.position.set(M.x - tipT / 2, M.y, M.z); c.rotation.set(0, 0, Math.PI / 2); });
  orbit.visible = G.mode === 'title' || (G.gate === 0);
  seoulMk.visible = G.mode === 'stage';
  if (G.yulP) yul.position.copy(G.yulP).multiplyScalar(1.01);
  yul.visible = !!G.yulP && G.mode === 'stage';

  if (hq) composer.render(); else renderer.render(scene, camera);
  drawGround(G.mode === 'title' ? skyAt(seoulV) : sky);
  requestAnimationFrame(frame);
}
titleScreen();
requestAnimationFrame(frame);
window.__SQ = { G, get theta() { return theta; }, set theta(v) { theta = v; }, skyAt, umbraCenter, camera, earth, THREE };
