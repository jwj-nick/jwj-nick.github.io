/* sq.js — 율이의 하늘 퀘스트 v0.2 · 1인칭 조종석 엔진 + 에피소드 1
 * 메인 = 루미호 조종석 카메라, 우상단 = 정지 관측 드론 D-1 카메라(탭 ⇄로 교체).
 * 일식 기하는 하나의 식: 관측점에서 본 태양 원판(각반지름 0.02rad)과 달 원판의 겹침 비율.
 *   → 조종석 '태양 가림 %', 지구 표면 그림자 셰이더, 그림자 원뿔 메시가 모두 같은 식.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CHARS, PORTRAIT } from './sq-story.js';
import { EP1, PHASES } from './sq-ep1.js';
import { EP2, EP3, EP4, EP5 } from './sq-eps.js';
import * as UI from './sq-ui.js';
import { GroundView } from './sq-ground.js';

const $ = (s) => document.querySelector(s);
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const D2R = Math.PI / 180, L = new THREE.Vector3(1, 0, 0), SUN_D = 80, SUN_R = 1.6, SUN_ANG = SUN_R / SUN_D, RM = 0.27;
const MOON = new THREE.Vector3(6, 0.6, 0);
const store = { get(k, d) { try { const v = localStorage.getItem('sq2-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sq2-' + k, JSON.stringify(v)); } catch (e) {} } };

/* ═════ 소리 · 음성 ═════ */
let muted = store.get('muted', false), voiceOn = store.get('voice', true), actx = null, master = null, eng = null;
function audioInit() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination);
    const o = actx.createOscillator(), o2 = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = 45; o2.frequency.value = 90; f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start(); eng = { o, o2, f, g };
  } catch (e) {}
}
function tone(fq, d = 0.15, type = 'sine', v = 0.08, delay = 0) {
  if (!actx || muted) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(fq, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
const sfx = {
  ring() { tone(784, 0.12, 'triangle', 0.08); tone(1175, 0.2, 'triangle', 0.07, 0.07); },
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.08)); },
  bad() { tone(200, 0.35, 'sawtooth', 0.07); tone(140, 0.45, 'sawtooth', 0.06, 0.12); },
  tick() { tone(900, 0.05, 'square', 0.03); },
  total() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 1.6, 'sine', 0.045, i * 0.06)); },
  warn() { tone(520, 0.08, 'square', 0.04); tone(520, 0.08, 'square', 0.04, 0.14); }
};
const synth = window.speechSynthesis;
let koVoice = null;
function pickVoice() { // 더 자연스러운 음성 우선: Premium/Enhanced/Natural/Neural/Online > Google > 기본
  if (!synth) return; const sc = v => (/premium|enhanced|natural|neural|online/i.test(v.name) ? 6 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/yuna|sunhi|heami|sora|jimin/i.test(v.name) ? 1 : 0) + (/ko[-_]KR/i.test(v.lang) ? 1 : 0);
  const ko = synth.getVoices().filter(v => /^ko/i.test(v.lang)).sort((a, b) => sc(b) - sc(a)); koVoice = ko[0] || null; }
if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
// 음높이는 과하게 바꾸면 기계음처럼 들려서 살짝만 차이를 둔다. 속도는 사용자 배속(1.0/1.3/1.6) 곱.
const VOICE = { lumi: { pitch: 1.08, rate: 1.0 }, nox: { pitch: 0.8, rate: 0.94 }, yul: { pitch: 1.22, rate: 1.06 } };
const SPEEDS = [1.0, 1.3, 1.6]; let speedI = store.get('spd', 1);
function speak(who, html) {
  const text = html.replace(/<[^>]+>/g, '');
  return new Promise(res => {
    const k = SPEEDS[speedI], fallback = setTimeout(res, (500 + text.length * 55) / k);
    if (!voiceOn || muted || !synth || !koVoice) return;
    clearTimeout(fallback);
    try {
      synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = koVoice; u.lang = koVoice.lang; const vc = VOICE[who] || { pitch: 1, rate: 1 }; u.pitch = vc.pitch; u.rate = Math.min(2, vc.rate * k);
      const safety = setTimeout(res, 2500 + text.length * 160); u.onend = u.onerror = () => { clearTimeout(safety); setTimeout(res, 90); }; synth.speak(u);
    } catch (e) { setTimeout(res, (500 + text.length * 55) / k); }
  });
}

/* ═════ 렌더러 · 장면 ═════ */
const cv = $('#cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000207);
const shipCam = new THREE.PerspectiveCamera(70, 1, 0.005, 2000);
const droneCam = new THREE.PerspectiveCamera(44, 1, 0.01, 2000);
droneCam.position.set(3.0, 3.4, 7.8); droneCam.lookAt(3.0, 0.4, 0);
const composer = new EffectComposer(renderer), rpass = new RenderPass(scene, shipCam);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.0, 0.65, 0.8);
composer.addPass(rpass); composer.addPass(bloom); composer.addPass(new OutputPass());

function glowTex(c0, c1) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, c0); g.addColorStop(0.25, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); }
// 별
{ const n = 3500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 900; pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3); const b = 0.35 + Math.random() * 0.65; col.set([b, b * 0.95, b * (0.9 + Math.random() * 0.2)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }))); }
// 태양
const SUNP = L.clone().multiplyScalar(SUN_D);
const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); sun.position.copy(SUNP); scene.add(sun);
const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,250,235,1)', 'rgba(200,215,255,.35)'), blending: THREE.AdditiveBlending, depthWrite: false }));
corona.scale.set(SUN_R * 9, SUN_R * 9, 1);
// 개기일식용 외곽 코로나(달이 태양보다 크게 보이는 모형이라 넓게)
const corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(240,244,255,.95)', 'rgba(175,195,255,.32)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
corona2.scale.set(56, 56, 1); corona2.position.copy(L.clone().multiplyScalar(SUN_D)); scene.add(corona2); corona.position.copy(SUNP); scene.add(corona);
const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.copy(SUNP); scene.add(dl); scene.add(new THREE.AmbientLight(0x203050, 0.08));
// 지구
const tl = new THREE.TextureLoader();
const earthU = { dayMap: { value: tl.load('tex/earth-day.jpg') }, nightMap: { value: tl.load('tex/earth-night.jpg') }, sunDir: { value: L.clone() }, moonPos: { value: MOON.clone() }, moonR: { value: RM }, sunAng: { value: SUN_ANG } };
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), new THREE.ShaderMaterial({
  uniforms: earthU,
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `precision highp float; uniform sampler2D dayMap,nightMap; uniform vec3 sunDir,moonPos; uniform float moonR,sunAng; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    float ov(float r1,float r2,float d){ if(d>=r1+r2) return 0.; if(d<=abs(r1-r2)) return 3.14159265*min(r1,r2)*min(r1,r2);
      float a=r1*r1*acos(clamp((d*d+r1*r1-r2*r2)/(2.*d*r1),-1.,1.)); float b=r2*r2*acos(clamp((d*d+r2*r2-r1*r1)/(2.*d*r2),-1.,1.));
      float c=.5*sqrt(max(0.,(-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2))); return a+b-c; }
    void main(){ vec3 n=normalize(vN); float ndl=dot(n,sunDir); vec3 day=texture2D(dayMap,vUv).rgb, night=texture2D(nightMap,vUv).rgb;
      float dA=smoothstep(-0.1,0.18,ndl); vec3 col=mix(night*vec3(1.5,1.3,1.0)+day*0.02, day*(0.2+1.05*max(ndl,0.)), dA);
      vec3 mv=moonPos-vW; float dm=length(mv); float cs=dot(mv/dm,sunDir);
      if(cs>0.){ float ma=asin(min(1.,moonR/dm)); float sep=acos(clamp(cs,-1.,1.)); float cov=min(1.,ov(sunAng,ma,sep)/(3.14159265*sunAng*sunAng));
        col*=1.-0.94*cov*dA; }
      float rim=pow(1.-max(dot(n,normalize(cameraPosition-vW)),0.),3.); col+=vec3(.25,.5,1.)*rim*.5*(.2+dA);
      gl_FragColor=vec4(col,1.); }`
}));
earth.rotation.y = -127 * D2R; scene.add(earth);
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 48), new THREE.ShaderMaterial({ side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vN; void main(){ float i=pow(0.72-dot(vN,vec3(0,0,1.)),3.); gl_FragColor=vec4(.35,.6,1.,1.)*i*1.4; }` })));
// 달
function moonTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#8f8c86'; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 6000; i++) { const v = 110 + Math.random() * 80 | 0; x.fillStyle = `rgba(${v},${v},${v - 5},.22)`; x.fillRect(Math.random() * 1024, Math.random() * 512, 3, 3); }
  for (let i = 0; i < 40; i++) { const cx = Math.random() * 1024, cy = 40 + Math.random() * 430, r = 10 + Math.random() * 60; x.fillStyle = 'rgba(60,60,64,.33)'; x.beginPath(); x.ellipse(cx, cy, r, r * 0.9, 0, 0, 7); x.fill(); }
  for (let i = 0; i < 160; i++) { const cx = Math.random() * 1024, cy = Math.random() * 512, r = 2 + Math.random() * 12; x.strokeStyle = 'rgba(215,215,210,.32)'; x.lineWidth = 1.4; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); }
  return new THREE.CanvasTexture(c); }
const moon = new THREE.Mesh(new THREE.SphereGeometry(RM, 96, 64), new THREE.MeshStandardMaterial({ map: moonTex(), roughness: 1, metalness: 0, emissive: 0x2a3550, emissiveIntensity: 0.55 }));
moon.position.copy(MOON); scene.add(moon);
function labelSprite(text, color, w = 0.5) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.font = '900 36px -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.scale.set(w, w / 4, 1); sp.renderOrder = 5; return sp; }
const lbMoon = labelSprite('달', '#e8e8f0', 1.3); lbMoon.position.set(MOON.x, MOON.y + 0.6, 0); scene.add(lbMoon);
const lbEarth = labelSprite('지구', '#9fd0ff', 1.2); lbEarth.position.set(0, 1.5, 0); scene.add(lbEarth);
const lbSun = labelSprite('태양 쪽 →', '#ffd27a', 1.6); lbSun.position.set(8.2, 1.4, 0); scene.add(lbSun);
// 그림자 원뿔 (달 → 지구)
const dEarth = MOON.x - Math.sqrt(1 - MOON.y * MOON.y);
const cone = (rTop, op, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, RM, dEarth, 48, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.z = Math.PI / 2; m.position.set(MOON.x - dEarth / 2, MOON.y, 0); scene.add(m); return m; };
const coneP = cone(RM + dEarth * SUN_ANG, 0.07, 0x5b3a9a), coneU = cone(RM - dEarth * SUN_ANG, 0.2, 0x000000);
const ecU = new THREE.Mesh(new THREE.CylinderGeometry(1 - 9 * SUN_ANG, 1, 9, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
const ecP = new THREE.Mesh(new THREE.CylinderGeometry(1 + 9 * SUN_ANG, 1, 9, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x5b3a9a, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
[ecU, ecP].forEach(c => { c.rotation.z = Math.PI / 2; c.position.set(-4.5, 0, 0); c.visible = false; scene.add(c); });
const redRing = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 96, 128, 128, 128); g.addColorStop(0, 'rgba(255,90,40,0)'); g.addColorStop(0.18, 'rgba(255,110,50,.95)'); g.addColorStop(0.45, 'rgba(255,80,40,.35)'); g.addColorStop(1, 'rgba(255,60,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true })); s.scale.set(2.7, 2.7, 1); s.renderOrder = 9; s.visible = false; scene.add(s); return s; })();
const orbitLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, i) => new THREE.Vector3(6 * Math.cos(i / 160 * 6.2832), 0.3, -6 * Math.sin(i / 160 * 6.2832)))), new THREE.LineDashedMaterial({ color: 0x6fd6ff, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.5 }));
orbitLine.computeLineDistances(); orbitLine.visible = false; scene.add(orbitLine);
function setMoonTheta(deg) { setMoon(deg, MOON.y); }
function setMoon(deg, y) { // 달 공전각(0 = 삭, +는 동쪽으로 공전)
  const a = deg * D2R; MOON.set(6 * Math.cos(a), y, -6 * Math.sin(a)); const near = Math.abs(((deg % 360) + 540) % 360 - 180) > 155; coneU.visible = coneP.visible = near; moon.position.copy(MOON); earthU.moonPos.value.copy(MOON);
  [coneU, coneP].forEach(c => c.position.set(MOON.x - dEarth / 2, MOON.y, MOON.z)); lbMoon.position.set(MOON.x, MOON.y + 0.6, MOON.z); }
// 링 · 기뢰 · 착륙점
const ringMat = new THREE.MeshBasicMaterial({ color: 0x6fd6ff }), ringMatOn = new THREE.MeshBasicMaterial({ color: 0xffd27a });
const ringsG = new THREE.Group(); scene.add(ringsG);
const mineTex = glowTex('rgba(40,0,70,1)', 'rgba(170,100,255,.6)');
const minesG = new THREE.Group(); scene.add(minesG);
const beacon = new THREE.Group(); { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,230,160,1)', 'rgba(255,170,60,.6)'), blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(0.22, 0.22, 1); beacon.add(s);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.6 })); b.position.y = 0.6; beacon.add(b); }
beacon.visible = false; scene.add(beacon);
// 루미호 (외부 카메라에만 보임) + 궤적
const shipM = new THREE.Group(); { const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 12), new THREE.MeshBasicMaterial({ color: 0xffb84d })); c.rotation.x = -Math.PI / 2; shipM.add(c);
  const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,140,1)', 'rgba(255,170,60,.6)'), blending: THREE.AdditiveBlending, depthWrite: false })); g.scale.set(0.35, 0.35, 1); shipM.add(g); }
scene.add(shipM);

/* ═════ CC0 3D 에셋 (Quaternius) ═════ */
const A = {}, mixers = [];
const hero = new THREE.Group(); hero.visible = false; scene.add(hero); // 타이틀·클리어 시네마틱용 루미호 + 율이
const HERO_P = new THREE.Vector3(2.3, 1.35, 2.9);
const heroLight = new THREE.PointLight(0xffe6c8, 0.5, 0.9, 0); scene.add(heroLight);
const heroRim = new THREE.PointLight(0x7fc8ff, 0.45, 0.8, 0); scene.add(heroRim);
const noxShip = new THREE.Group(); noxShip.visible = false; scene.add(noxShip);
const rocksG = new THREE.Group(); scene.add(rocksG);
let yulHero = null, yulMixer = null, yulActs = {};
function fixMats(o, tint, emi) {
  o.traverse(m => { if (!m.isMesh) return; m.castShadow = false; const mats = Array.isArray(m.material) ? m.material : [m.material];
    m.material = mats.map(mt => { mt = mt.clone(); if (mt.map) { mt.map.colorSpace = THREE.NoColorSpace; mt.map.needsUpdate = true; } if (mt.color) mt.color.convertLinearToSRGB();
      if (tint) mt.color.multiply(new THREE.Color(tint)); if (emi) { mt.emissive = new THREE.Color(emi); mt.emissiveIntensity = 0.7; } return mt; });
    if (m.material.length === 1) m.material = m.material[0]; });
}
function fitTo(o, size) { // 가장 긴 변을 size로, 중심을 원점으로
  const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), k = size / Math.max(sz.x, sz.y, sz.z), c = b.getCenter(new THREE.Vector3());
  const w = new THREE.Group(); o.position.sub(c); w.add(o); w.scale.setScalar(k); return w;
}
function noseToZ(o) { // 기체의 긴 축을 +Z로 (Object3D.lookAt은 +Z를 목표로 향함)
  const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); if (sz.x > sz.z) o.rotation.y = Math.PI / 2; return o;
}
function glowSprite(c0, c1, s) { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c0, c1), blending: THREE.AdditiveBlending, depthWrite: false })); g.scale.set(s, s, 1); return g; }
const NATURE = ['CommonTree_1', 'CommonTree_3', 'PineTree_2', 'BirchTree_2', 'Bush_1', 'Rock_Moss_2', 'Flowers', 'Grass_2'];
const loader = new GLTFLoader(), loadState = { n: 0, of: 6 + NATURE.length };
const loadG = (k, url) => loader.loadAsync(url).then(g => { A[k] = g; loadState.n++; paintLoad(); }).catch(e => { console.warn('asset', k, e); loadState.n++; paintLoad(); });
function paintLoad() { const el = document.getElementById('load'); if (el) el.textContent = loadState.n < loadState.of ? `3D 에셋 불러오는 중… ${loadState.n}/${loadState.of}` : ''; }
const assetsReady = Promise.all([loadG('ship', 'models/lumi-ship.glb'), loadG('nox', 'models/nox-ship.glb'), loadG('minion', 'models/minion.glb'), loadG('yul', 'models/yuli.glb'), loadG('rock1', 'models/rock1.glb'), loadG('rock2', 'models/rock2.glb'), ...NATURE.map(n => loadG('nat_' + n, 'models/nature/' + n + '.glb'))]).then(setupAssets);
async function setupAssets() {
  if (A.ship) { // 루미호: 드론 화면 마커 + 시네마틱
    const m = noseToZ(A.ship.scene); fixMats(m); const s = fitTo(m, 0.16);
    shipM.clear(); const flip = new THREE.Group(); flip.add(s); shipM.add(flip); shipM.userData.flip = flip;
    const eg = glowSprite('rgba(140,220,255,1)', 'rgba(80,160,255,.5)', 0.07); eg.position.z = -0.085; shipM.add(eg);
    const halo = glowSprite('rgba(255,220,140,.9)', 'rgba(255,170,60,.25)', 0.42); shipM.add(halo); shipM.userData.halo = halo;
    const h = fitTo(SkeletonUtils.clone(m), 0.16); const hw = new THREE.Group(); hw.add(h); hero.add(hw); hero.userData.ship = hw;
    const eg2 = glowSprite('rgba(140,220,255,1)', 'rgba(80,160,255,.5)', 0.05); eg2.position.z = -0.085; hw.add(eg2); hero.userData.exhaust = eg2;
  }
  if (A.nox) { const m = noseToZ(A.nox.scene); fixMats(m, 0x8a6ac0, 0x1a0630); noxShip.add(fitTo(m, 0.28)); noxShip.add(glowSprite('rgba(170,110,255,.9)', 'rgba(90,40,180,.35)', 0.55)); }
  if (A.yul) {
    const t = await new THREE.TextureLoader().loadAsync('models/yuli-atlas.png'); t.flipY = false; t.magFilter = THREE.NearestFilter; A.yulAtlas = t;
    const y = SkeletonUtils.clone(A.yul.scene); y.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.map = t; if (/pistol|gun/i.test(m.name)) m.visible = false; } }); fixMats(y);
    const b0 = new THREE.Box3().setFromObject(y), hgt = b0.max.y - b0.min.y, k = 0.075 / hgt; y.scale.setScalar(k);
    yulMixer = new THREE.AnimationMixer(y); mixers.push(yulMixer);
    A.yul.animations.forEach(c => { yulActs[c.name] = yulMixer.clipAction(c); }); if (yulActs.Wave) yulActs.Wave.play();
    // 리본
    const bow = new THREE.Group(), bm = new THREE.MeshStandardMaterial({ color: 0xff4a5e, roughness: 0.45 });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 10), bm); c1.rotation.z = Math.PI / 2; c1.position.x = -0.08; const c2 = c1.clone(); c2.rotation.z = -Math.PI / 2; c2.position.x = 0.08;
    bow.add(c1, c2, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bm)); bow.scale.setScalar(0.5 * 0.075); bow.position.y = 0.075 * 0.97; bow.position.z = 0.002;
    yulHero = new THREE.Group(); yulHero.add(y, bow); yulHero.position.set(0.11, 0.035, 0.05); hero.add(yulHero);
    yulHero.add(glowSprite('rgba(255,240,210,.5)', 'rgba(120,180,255,.12)', 0.16));
  }
  if (A.minion) A.minionReady = true;
  const rocks = [A.rock1, A.rock2].filter(Boolean);
  if (rocks.length) { const r = E_rng(7);
    for (let i = 0; i < 46; i++) { const src = rocks[i % rocks.length].scene.clone(); fixMats(src, 0x9a8f86); const s = fitTo(src, 0.05 + r() * 0.16);
      let p; for (let k = 0; k < 20; k++) { p = new THREE.Vector3(0.8 + r() * 6.8, -1.6 + r() * 3.6, -2.6 + r() * 5.6); if (p.length() > 1.6 && p.distanceTo(MOON) > 0.8 && Math.hypot(p.y - 0.6, p.z) > 0.55 && distToRoute(p) > 0.45) break; }
      s.position.copy(p); s.rotation.set(r() * 6, r() * 6, r() * 6); s.userData.spin = (r() - 0.5) * 0.4; rocksG.add(s); } }
}
function E_rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function distToRoute(p) { const pts = [[1.2, 1.9, 3.4], [2.6, 1.5, 2.4], [4.0, 1.05, 1.2], [4.3, 0.6, 0]].map(V); let d = 9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); d = Math.min(d, a.clone().addScaledVector(ab, t).distanceTo(p)); } return d; }
const TRAIL = 120, trailPos = new Float32Array(TRAIL * 3), trailG = new THREE.BufferGeometry(); trailG.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trail = new THREE.Line(trailG, new THREE.LineBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.55 })); trail.frustumCulled = false; scene.add(trail);
// 우주 먼지(이동감)
const DUST = 700, dustPos = new Float32Array(DUST * 3), dustG = new THREE.BufferGeometry(); for (let i = 0; i < DUST * 3; i++) dustPos[i] = (Math.random() - 0.5) * 3;
dustG.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ size: 0.006, color: 0xbcd4ff, transparent: true, opacity: 0.75 })); dust.frustumCulled = false; scene.add(dust);

/* ═════ 기하 ═════ */
function ov(r1, r2, d) { if (d >= r1 + r2) return 0; if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos(Math.max(-1, Math.min(1, (d * d + r1 * r1 - r2 * r2) / (2 * d * r1)))), b = r2 * r2 * Math.acos(Math.max(-1, Math.min(1, (d * d + r2 * r2 - r1 * r1) / (2 * d * r2))));
  return a + b - 0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))); }
function sunCover(P) { // P에서 본 태양이 달(또는 지구)에 가려진 비율
  let best = 0;
  [[MOON, RM], [new THREE.Vector3(), 1]].forEach(([C, R]) => {
    const v = C.clone().sub(P), d = v.length(); if (d < R) return; const cs = v.dot(L) / d; if (cs <= 0) return;
    best = Math.max(best, Math.min(1, ov(SUN_ANG, Math.asin(Math.min(1, R / d)), Math.acos(Math.min(1, cs))) / (Math.PI * SUN_ANG * SUN_ANG)));
  });
  return best;
}

/* ═════ 루미호 ═════ */
const ship = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, speed: 0 };
const fwd = () => new THREE.Vector3(-Math.sin(ship.yaw) * Math.cos(ship.pitch), Math.sin(ship.pitch), -Math.cos(ship.yaw) * Math.cos(ship.pitch));
function lookAtTarget(t) { const d = t.clone().sub(ship.pos).normalize(); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(Math.max(-1, Math.min(1, d.y))) }; }
function placeShip(st) { ship.pos.copy(V(st.pos)); const a = lookAtTarget(V(st.look)); ship.yaw = a.yaw; ship.pitch = a.pitch; ship.speed = 0; for (let i = 0; i < TRAIL; i++) trailPos.set([ship.pos.x, ship.pos.y, ship.pos.z], i * 3); trailG.attributes.position.needsUpdate = true; }

/* ═════ 입력 ═════ */
const input = { up: 0, down: 0, left: 0, right: 0, fwd: 0, back: 0 }; let aim = false;
document.querySelectorAll('#pad button,#thr button').forEach(b => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); audioInit(); if (k === 'aim') { aim = !aim; b.classList.toggle('on', aim); if (aim) toast('🎯 자동 조준 — 목표 쪽으로 기수를 돌려요'); return; } input[k] = 1; b.classList.add('on'); if (k !== 'fwd' && k !== 'back') setAim(false); };
  const off = (e) => { if (k === 'aim') return; input[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});
function setAim(v) { aim = v; $('#pad [data-k=aim]').classList.toggle('on', v); }
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'fwd', W: 'fwd', s: 'back', S: 'back' };
window.addEventListener('keydown', e => { audioInit(); if (KEYMAP[e.key]) { input[KEYMAP[e.key]] = 1; if (!/fwd|back/.test(KEYMAP[e.key])) setAim(false); e.preventDefault(); } if (e.key === ' ') { setAim(!aim); e.preventDefault(); } if (e.key === 'Enter' && G.talking) G.skip && G.skip(); });
window.addEventListener('keyup', e => { if (KEYMAP[e.key]) input[KEYMAP[e.key]] = 0; });
let swapped = false; $('#swap').onclick = () => { swapped = !swapped; toast(swapped ? '📡 큰 화면: 관측 드론 (밖에서 본 모습)' : '🚀 큰 화면: 루미호 조종석'); };

/* ═════ UI ═════ */
const hud = $('#hud'), dash = $('#dash'), pad = $('#pad'), thr = $('#thr'), sub = $('#sub'), qa = $('#qa'), screen = $('#screen'), toastEl = $('#toast'), banner = $('#banner'), pipf = $('#pipf');
let toastT = 0;
function toast(h, bad) { toastEl.innerHTML = h; toastEl.className = 'on' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => toastEl.className = '', 2300); }
function showBanner(s, b) { banner.innerHTML = `<small>${s}</small>${b}`; banner.className = ''; void banner.offsetWidth; banner.className = 'on'; }
const chk = $('#chk'), compass = $('#compass'), tutEl = $('#tut'), DASH_FLY = dash.innerHTML;
const DASH_GROUND = `<div class="g"><span>현재 위치</span><b id="g-loc" style="font-size:13px">-</b><em id="g-ll"></em></div><div class="g wide"><span>태양 가림</span><div class="bar"><i id="d-cov"></i></div><b id="d-covt">0%</b><em id="d-zone">-</em></div><div class="g"><span>관측 도장</span><b id="g-st">0/4</b><em>개</em></div>`;
function flightUI(on) { [hud, dash, pad, thr, chk].forEach(e => e.classList.toggle('hide', !on)); compass.classList.add('hide'); }
async function overlay(fn) { G.overlay = true; input.fwd = input.back = 0; await fn(); G.overlay = false; }
$('#thr [data-k=shoot]') && ($('#thr [data-k=shoot]').onclick = () => shoot());
$('#b-dict').onclick = () => overlay(() => new Promise(r => UI.showDict(screen, PHASES, r)));
$('#b-map').onclick = () => { const m = EP.missions[G.mi]; if (m) overlay(() => UI.showBrief(screen, m, G.mi, EP.missions.length, mapOpts(m))); };
function mapOpts(m) { return Object.assign({}, EP.mapOpts || {}, { route: null, rings: m.rings, ringIdx: G.idx, target: m.target || m.land || null, beacons: m.beacons, ship: m.type === 'ground' ? null : ship.pos.toArray(), heading: -ship.yaw, moon: [MOON.x, MOON.z] }); }
$('#b-snd').onclick = () => { muted = !muted; store.set('muted', muted); if (master) master.gain.value = muted ? 0 : 1; paintBtns(); if (muted && synth) synth.cancel(); };
$('#b-voice').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn); paintBtns(); if (!voiceOn && synth) synth.cancel(); toast(voiceOn ? (koVoice ? '🗣 음성 켬' : '🗣 이 기기에 한국어 음성이 없어 자막만 나와요') : '🗣 음성 끔 (자막만)'); };
$('#b-exit').onclick = () => titleScreen();
function paintBtns() { $('#b-snd').textContent = muted ? '🔇' : '🔊'; $('#b-voice').classList.toggle('off', !voiceOn); $('#b-spd').textContent = SPEEDS[speedI] + 'x'; }
$('#b-spd').onclick = () => { speedI = (speedI + 1) % SPEEDS.length; store.set('spd', speedI); paintBtns(); toast('⏩ 대사 속도 ' + SPEEDS[speedI] + '배'); };
paintBtns();

/* 대사: 자막 + 음성, 끝나면 자동 진행 (탭하면 건너뛰기) */
async function say(lines) {
  G.talking = true; sub.classList.remove('hide'); document.body.classList.add('talk');
  for (const [who, text] of lines) {
    const ch = CHARS[who]; sub.className = who; sub.querySelector('.por').innerHTML = PORTRAIT[who];
    sub.querySelector('.nm').innerHTML = `<span style="color:${ch.color}">${ch.name}</span> <span style="opacity:.5">${ch.en}</span>`;
    sub.querySelector('.tt').innerHTML = text;
    await new Promise(res => { let done = false; const fin = () => { if (done) return; done = true; G.skip = null; sub.onclick = null; res(); };
      G.skip = () => { if (synth) synth.cancel(); fin(); }; sub.onclick = G.skip; speak(who, text).then(fin); });
  }
  sub.classList.add('hide'); G.talking = false; document.body.classList.remove('talk');
}

/* ═════ 게임 상태 ═════ */
const G = { overlay: false, tut: -1, totSeen: false, best: 99, bestT: 0, hintCd: 0, behindT: 0, stamps: {}, gPhase: '', gT: 0, zoneT: 0, zoneK: '', lookBack: false, lookTgt: null, camMode: '', spin: 0,
  mode: 'title', mi: -1, running: false, t: 0, tMax: 1, idx: 0, hold: 0, talking: false, skip: null, mines: [], penSeen: false, lastTick: 0, gq: 0, flags: {}, rk: 0, beacons: [] };
const EPISODES = [EP1, EP2, EP3, EP4, EP5]; let EP = EP1;
function clearObjects() { G.mines.forEach(o => { const mx = o.s.userData.mixer; if (mx) mixers.splice(mixers.indexOf(mx), 1); }); ringsG.clear(); minesG.clear(); G.mines = []; noxShip.visible = false; beacon.visible = false;
  G.beacons.forEach(b => scene.remove(b)); G.beacons = []; if (GV) GV.extra.clear(); }
function buildRings(list) { ringsG.clear(); list.forEach((p, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 12, 48), i === 0 ? ringMatOn : ringMat); r.position.copy(V(p)); const nx = list[i + 1] ? V(list[i + 1]) : MOON.clone(); r.lookAt(nx); ringsG.add(r); }); }
function makeBeacon(p, label, center) { const b = beacon.clone(true); b.visible = true; b.position.copy(p); b.lookAt(p.clone().add(p.clone().sub(center))); b.rotateX(Math.PI / 2);
  if (label) { const lb = labelSprite(label, '#ffd27a', 0.6); lb.position.set(0, 1.35, 0); b.add(lb); } scene.add(b); G.beacons.push(b); return b; }
function applySpace(sp) {
  setMoon(sp.moonTheta, sp.moonY); const d = sp.drone || EP1.space.drone;
  droneCam.position.copy(V(d[0])); droneCam.lookAt(V(d[1])); droneCam.fov = d[2];
  orbitLine.visible = !!sp.orbit; ecU.visible = ecP.visible = !!sp.earthCone; G.spin = 0; earth.rotation.y = -127 * D2R;
  EP.mapOpts = { route: EP.route, moon: [MOON.x, MOON.z], shadow: Math.abs(sp.moonTheta) < 20 ? 'moon' : sp.earthCone ? 'earth' : '', orbit: !!sp.orbit };
}
function shotBtn(on, label) { const b = $('#thr [data-k=shoot]'); b.classList.toggle('hide', !on); if (label) b.innerHTML = label; }

function titleScreen() {
  EP = EP1; applySpace(EP1.space); dash.innerHTML = DASH_FLY; tutEl.classList.add('hide'); dialUI(false); shotBtn(false);
  G.mode = 'title'; G.running = false; flightUI(false); sub.classList.add('hide'); qa.classList.add('hide'); clearObjects(); if (synth) synth.cancel();
  const clr = (e) => store.get('clear-' + e.id, false) ? '✅' : '▶';
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">MID-SCI · 3D SPACE OBSERVATORY</div><h1>율이의<br><span>하늘 퀘스트</span></h1>
    <p>요크셔테리어 관측 대원 <b>율이</b>가 우주선 <b>루미호</b>를 몰고 출동! 빛을 훔치는 <b style="color:var(--nox)">녹스</b>를 막고 하늘의 비밀을 되찾아요.</p>
    <div class="eps">${EPISODES.map((e, i) => `<button class="ep" data-ep="${i}"><i>${clr(e)}</i><b>EP${e.no} · ${e.title}</b><span>${e.rubric}</span></button>`).join('')}</div>
    <button class="btn sec" id="who">등장인물 소개 (이름의 뜻)</button>
    <button class="btn sec" id="dict0">📖 달 위상 사전 (삭·상현·망·하현)</button>
    <div class="howto">🎮 왼쪽 패드: 방향 · 🎯 자동 조준 · 오른쪽 <b>추진</b> 꾹 = 전진 · ⌨️ 화살표 · W/S · Space<br>📡 오른쪽 위 = 바깥 드론 화면(⇄ 크게) · 🗺 미션 다시 보기 · 📖 위상 사전<br>📱 가로 화면 추천 · 공유 → <b>홈 화면에 추가</b>하면 앱처럼 실행</div>
    <div class="credit">3D 모델: Quaternius (CC0) · 지구 텍스처: NASA Blue/Black Marble (퍼블릭 도메인) · three.js (MIT)</div></div>`;
  screen.querySelectorAll('[data-ep]').forEach(b => b.onclick = () => { unlockAudio(); EP = EPISODES[+b.dataset.ep]; store.get('seen', false) ? startEpisode() : charsScreen(true); });
  $('#who').onclick = () => charsScreen(false);
  $('#dict0').onclick = () => UI.showDict(screen, PHASES, titleScreen);
}
function unlockAudio() { audioInit(); if (actx && actx.state === 'suspended') actx.resume(); if (synth && voiceOn) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} } }
function charsScreen(thenStart) {
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">CHARACTERS</div><h1 style="font-size:30px;margin-top:3vh">등장인물</h1>` +
    ['yul', 'lumi', 'nox'].map(k => { const c = CHARS[k]; return `<div class="card"><div class="por">${PORTRAIT[k]}</div><div><h3 style="color:${c.color}">${c.name}<small>${c.en}</small></h3><div class="role">${k === 'lumi' ? '루미호의 인공지능 · 길잡이' : c.role}</div><p>${c.about}</p>${c.word ? `<div class="word">📖 ${c.word}</div>` : ''}</div></div>`; }).join('') +
    `<button class="btn pri" id="ok">${thenStart ? '▶ 출동!' : '← 돌아가기'}</button></div>`;
  store.set('seen', true);
  $('#ok').onclick = () => { unlockAudio(); thenStart ? startEpisode() : titleScreen(); };
}
async function startEpisode() {
  screen.className = ''; screen.innerHTML = ''; G.mode = 'fly'; applySpace(EP.space);
  const m0 = EP.missions[0]; if (m0.start) placeShip(m0.start); hud.querySelector('#m-name').textContent = EP.sub;
  $('#m-goal').textContent = ''; flightUI(false);
  await UI.showEpisodeMap(screen, EP, 0); flightUI(!EP.groundOnly); showBanner(EP.sub, EP.title);
  await say(EP.prologue);
  startMission(0, true);
}
async function startMission(i, first) {
  const m = EP.missions[i]; G.mi = i; G.running = false; G.lookBack = false; G.lookTgt = null; G.camMode = ''; G.idx = 0; G.hold = 0; G.penSeen = false; G.lastTick = 0; G.flags = {}; G.rk = 0; clearObjects(); setAim(false);
  $('#m-name').textContent = `EP${EP.no} M${i + 1}/${EP.missions.length} · ${m.name}`; $('#m-goal').innerHTML = '🎯 ' + m.brief.what;
  G.totSeen = false; G.best = 99; G.bestT = 0; G.behindT = 0; G.hintCd = 6; applySpace(EP.space); dialUI(false); shotBtn(false);
  if (first) { flightUI(false); speak('lumi', m.brief.what); await UI.showBrief(screen, m, i, EP.missions.length, mapOpts(m)); if (synth) synth.cancel(); }
  if (m.type === 'ground') return groundMission(m);
  dash.innerHTML = DASH_FLY; flightUI(true); placeShip(m.start);
  if (m.rings) buildRings(m.rings);
  if (m.type === 'descend') {
    const lp = V(m.land), ctr = m.landAbs ? MOON.clone() : new THREE.Vector3(); const bp = m.landAbs ? lp : lp.clone().multiplyScalar(1.03);
    makeBeacon(bp, '', ctr); if (!m.landAbs) { noxShip.visible = true; } if (m.mines !== false) spawnMines(); }
  if (m.type === 'chooseLand') { m.beacons.forEach(b => makeBeacon(V(b.p).multiplyScalar(1.03), b.k, new THREE.Vector3())); G.spin = 0.25; }
  if (m.type === 'watch') G.spin = 0.2;
  if (m.type === 'photo') shotBtn(true, '📸<br>촬영');
  if (m.type === 'phaseSet') { G.camMode = 'moon'; toast('🔭 망원 모드 — 달을 크게 보여 줄게요'); dialUI(true, '음력 날짜', 1, 29.5, 8, v => setMoon(dayToE(v), EP.space.moonY), '확인 ✔', () => phaseCheck(m)); setMoon(dayToE(8), EP.space.moonY); }
  showBanner(`MISSION ${i + 1} / ${EP.missions.length}`, m.name);
  if (first && m.pre) await say(m.pre);
  if (EP === EP1 && i === 0 && first && !store.get('tut', false)) await runTutorial();
  G.t = G.tMax = m.time || 999; G.running = true; G.mode = 'fly';
}
const dayToE = (d) => ((d - 1) / 29.53) * 360;
function adiff(a, b) { const d = ((a - b) % 360 + 360) % 360; return d > 180 ? 360 - d : d; }
function curTheta() { return ((Math.atan2(-MOON.z, MOON.x) / D2R) + 360) % 360; }
function phaseName(e) { e = ((e % 360) + 360) % 360; return e < 15 || e > 345 ? '삭' : e < 70 ? '초승달' : e < 110 ? '상현달' : e < 165 ? '상현~보름 사이' : e < 195 ? '보름달' : e < 250 ? '보름~하현 사이' : e < 290 ? '하현달' : '그믐달'; }
async function phaseCheck(m) {
  const r = m.rounds[G.rk]; if (!r || G.talking) return; const e = curTheta();
  if (adiff(e, r.e) <= 14) { G.rk++; sfx.ok(); toast(`✅ ${r.n} 완성!`); if (G.rk >= m.rounds.length) { dialUI(false); return missionDone(); } toast(`다음 주문: ${m.rounds[G.rk].n}`); }
  else { sfx.bad(); hint(`지금은 ${phaseName(e)}에 가까워. ${r.n}은(는) 달이 어디에 있어야 할까? 📖 사전을 봐!`); G.hintCd = 0; }
}
/* 다이얼 UI */
function dialUI(on, label, min, max, val, onInput, okLabel, onOk) {
  const d = $('#dial'); d.classList.toggle('hide', !on); if (!on) return;
  d.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="0.25" value="${val}"><b>${val}</b>${okLabel ? `<button>${okLabel}</button>` : ''}`;
  const inp = d.querySelector('input'), out = d.querySelector('b'); inp.oninput = () => { out.textContent = (+inp.value).toFixed(1) + (label.includes('음력') ? '일' : ''); onInput && onInput(+inp.value); }; inp.oninput();
  if (okLabel) d.querySelector('button').onclick = onOk;
}
/* 퀴즈 (오답이면 같은 문제 다시) */
function quiz(qs) {
  return new Promise(async done => {
    document.body.classList.add('quiz');
    for (const q of qs) {
      await new Promise(next => {
        qa.classList.remove('hide');
        qa.innerHTML = `<div class="q">🟣 ${q.q}</div><div class="o">${q.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div><div class="h"></div>`;
        qa.querySelectorAll('button').forEach(b => b.onclick = async () => {
          if (G.talking) return; const k = +b.dataset.k;
          if (k === q.a) { b.classList.add('ok'); sfx.ok(); await say([['lumi', '정답! ' + q.why]]); next(); }
          else { b.classList.add('no'); sfx.bad(); qa.querySelector('.h').innerHTML = '💡 ' + q.hint; await say([['nox', '틀렸다! 하하!'], ['lumi', q.hint]]); qa.querySelectorAll('button').forEach(x => x.classList.remove('no')); }
        });
      });
    }
    qa.classList.add('hide'); document.body.classList.remove('quiz'); done();
  });
}
function spawnMines() {
  const base = [[3.6, 0.66, 0.05], [2.6, 0.55, -0.06], [2.2, 0.68, 0.06], [1.5, 0.58, -0.04], [3.2, 0.52, 0.0]];
  G.mines = base.map((b, i) => {
    let s;
    if (A.minionReady) { const m = SkeletonUtils.clone(A.minion.scene); fixMats(m, 0x7a4ad0, 0x2a0a50); s = fitTo(m, 0.11); s.add(glowSprite('rgba(150,80,255,.55)', 'rgba(80,20,160,.2)', 0.22));
      const mx = new THREE.AnimationMixer(m); const clip = A.minion.animations.find(a => a.name === 'Flying_Idle') || A.minion.animations[0]; if (clip) { const ac = mx.clipAction(clip); ac.time = i * 0.3; ac.play(); } mixers.push(mx); s.userData.mixer = mx; }
    else { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mineTex, blending: THREE.NormalBlending, depthWrite: false })); s.scale.set(0.12, 0.12, 1); }
    minesG.add(s); return { s, b: V(b), ph: i * 1.7, amp: 0.11 + (i % 2) * 0.05 }; });
}
async function runTutorial() {
  G.mode = 'fly'; G.tut = 0; G.tutYaw = ship.yaw; setAim(false);
  const paint = () => { const T = EP1.tutorial; tutEl.innerHTML = `<b>조종 연습 ${Math.min(G.tut + 1, T.length)}/${T.length}</b> ${T[Math.min(G.tut, T.length - 1)].t}<div class="d">${T.map((t, k) => k < G.tut ? '✅' : k === G.tut ? '▶' : '☐').join(' ')}</div><button id="tut-skip">건너뛰기</button>`; $('#tut-skip').onclick = () => { G.tut = 99; }; };
  tutEl.classList.remove('hide'); paint(); speak('lumi', '조종 연습부터 해 보자!');
  await new Promise(res => { G.tutPaint = paint; G.tutDone = res; });
  tutEl.classList.add('hide'); store.set('tut', true); G.tut = -1; setAim(false); ship.speed *= 0.3; placeShip(EP1.missions[0].start);
  await say([['lumi', '좋아, 조종 완벽! 이제 진짜 출발이야.']]);
}
async function missionDone() {
  G.running = false; sfx.ok(); const m = EP.missions[G.mi]; dialUI(false); shotBtn(false);
  if (m.done) await say(m.done);
  if (G.mi + 1 < EP.missions.length) startMission(G.mi + 1, true); else episodeClear();
}
async function missionFail(reason) {
  if (!G.running) return; G.running = false; sfx.bad(); input.fwd = input.back = 0; ship.speed = 0;
  toast('⚠ ' + reason, true);
  await say([['nox', '하하! 다시 해 봐!'], ['lumi', reason + ' 다시 가자.']]);
  startMission(G.mi, false);
}
async function episodeClear() {
  G.mode = 'clear'; flightUI(false); qa.classList.add('hide'); dialUI(false); shotBtn(false); compass.classList.add('hide'); sfx.total(); applySpace(EP1.space);
  await say(EP.clear); store.set('clear-' + EP.id, true);
  const nx = EPISODES[EPISODES.indexOf(EP) + 1];
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">${EP.sub} CLEAR</div><h1 style="font-size:34px;margin-top:3vh">🏆 ${EP.title} 완료!</h1>
    <p>오늘 율이가 직접 보고 겪은 것을 시험지 요소로 정리하면:</p>
    <div class="sum">${EP.summary.map(s => `<div><span>${s[0]}</span><p style="margin:0">${s[1]}</p></div>`).join('')}</div>
    ${nx ? `<button class="btn pri" id="next">▶ 다음: EP${nx.no} · ${nx.title}</button>` : ''}
    <button class="btn sec" id="again">↺ 다시 하기</button><a class="btn sec" href="../earth-moon/">📘 지구와 달 스터디 앱</a><button class="btn sec" id="ti">타이틀로</button></div>`;
  if (nx) $('#next').onclick = () => { EP = nx; startEpisode(); };
  $('#again').onclick = startEpisode; $('#ti').onclick = titleScreen;
}
/* 사진 촬영 (EP3 M1) */
async function shoot() {
  const m = EP.missions[G.mi]; if (!G.running || G.talking) return;
  if (G.mode === 'ground') return trailsSubmit();
  if (m.type !== 'photo') return;
  const toM = MOON.clone().sub(ship.pos).normalize(), ang = Math.acos(Math.max(-1, Math.min(1, toM.dot(fwd()))));
  if (ang > 0.12) { sfx.bad(); return hint('달이 화면 가운데 오도록! 🎯를 눌러 봐.'); }
  G.flags.shot = true; G.running = false; shotBtn(false); sfx.ring();
  const e = curTheta(); qa.classList.remove('hide'); qa.innerHTML = `<div class="q">📸 찍은 사진</div><canvas id="photo" width="140" height="140" style="display:block;margin:0 auto;border-radius:12px"></canvas>`;
  const c = $('#photo').getContext('2d'); c.fillStyle = '#050914'; c.fillRect(0, 0, 140, 140); UI.drawPhase(c, 70, 70, 52, e);
  await new Promise(r => setTimeout(r, 1600)); await quiz([m.q]); missionDone();
}

/* ═════ 비행 HUD: 체크리스트 · 길 안내선 · 막힘 힌트 (P6-b·c·f) ═════ */
const guideG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
const guide = new THREE.Line(guideG, new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.85 })); guide.frustumCulled = false; scene.add(guide);
function hint(text) { if (G.hintCd > 0) return; G.hintCd = 12; toast('💡 ' + text); speak('lumi', text); }
function stepsDone(m, cov) {
  const r = n => Array.from({ length: n }, (_, k) => G.idx > k);
  switch (m.type) {
    case 'rings': return r(m.rings.length);
    case 'umbra': return [G.penSeen || cov > 0.02, G.totSeen, G.hold >= m.hold];
    case 'descend': return [...r(m.rings.length), false];
    case 'watch': return [...r(m.rings.length), !!G.flags.watched, !!G.flags.q];
    case 'chooseLand': return [!!G.flags.near, false];
    case 'photo': { const toM = MOON.clone().sub(ship.pos).normalize(); const ok = toM.dot(fwd()) > Math.cos(0.12); G.flags.aim = G.flags.aim || ok; return [!!G.flags.aim, !!G.flags.shot, false]; }
    case 'phaseSet': return m.rounds.map((_, k) => G.rk > k);
  }
  return [];
}
function flightHud(dt) {
  const m = EP.missions[G.mi]; G.hintCd -= dt;
  if (!m || m.type === 'ground' || G.tut >= 0) { if (G.tut < 0 && (!m || m.type !== 'ground')) UI.renderChk(chk, null, []); guide.visible = false; return; }
  const cov = sunCover(ship.pos); if (cov >= 0.999) G.totSeen = true;
  const done = stepsDone(m, cov);
  const extra = m.type === 'umbra' && G.hold > 0 ? `${G.hold.toFixed(1)}/${m.hold}초` : m.type === 'umbra' && !G.totSeen ? `가림 ${Math.round(cov * 100)}%` : m.type === 'phaseSet' && m.rounds[G.rk] ? `주문: ${m.rounds[G.rk].n}` : '';
  UI.renderChk(chk, m, done, extra);
  const T = currentTarget();
  guide.visible = !!T && G.running && !swapped;
  if (T) {
    const f = fwd(), a = ship.pos.clone().addScaledVector(f, 0.12).add(new THREE.Vector3(0, -0.03, 0));
    guideG.attributes.position.setXYZ(0, a.x, a.y, a.z); guideG.attributes.position.setXYZ(1, T.p.x, T.p.y, T.p.z); guideG.attributes.position.needsUpdate = true; guide.computeLineDistances();
    guide.material.dashOffset = -tAll * 0.2;
    if (G.running && !G.talking && !G.overlay) {
      const d = T.p.distanceTo(ship.pos); if (d < G.best - 0.03) { G.best = d; G.bestT = 0; } else G.bestT += dt;
      const toT = T.p.clone().sub(ship.pos).normalize(); if (toT.dot(f) < -0.2) G.behindT += dt; else G.behindT = 0;
      if (G.behindT > 2.5) hint('목표가 뒤쪽에 있어! 🎯를 누르면 자동으로 돌아.');
      else if (G.bestT > 9) { G.bestT = 0; hint(m.type === 'umbra' ? '진한 그림자 속으로! 🎯 누르고 추진.' : m.type === 'photo' ? '🎯를 누르면 달이 가운데로 와. 그다음 📸!' : '🎯를 누르고 추진을 꾹 눌러 봐!'); }
    }
  }
}

/* ═════ 지표 장면 — 모드: eclipse(일식) · lunar(월식) · evening(저녁 달) · day(하루) · trails(별 궤적) ═════ */
let GV = null;
const groundCam = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
const yulMk = new THREE.Group(); { yulMk.add(glowSprite('rgba(255,220,140,1)', 'rgba(255,170,60,.6)', 0.28)); const lb = labelSprite('🐾 율이', '#ffd27a', 0.9); lb.position.y = 0.16; yulMk.add(lb); } yulMk.visible = false; scene.add(yulMk);
const tgtMk = glowSprite('rgba(120,255,200,1)', 'rgba(60,200,160,.5)', 0.3); tgtMk.visible = false; scene.add(tgtMk);
const gP = new THREE.Vector3(); const gTargets = {}; let gOrder = [];
const ZONE_ORDER = ['total', 'partial', 'none', 'night'];
const LAT = 37.5 * D2R, Yv = new THREE.Vector3(0, 1, 0);
function basisAt(P) { const e = new THREE.Vector3(0, 1, 0).cross(P); if (e.lengthSq() < 1e-6) e.set(0, 0, -1); e.normalize(); return { e, n: P.clone().cross(e).normalize() }; }
function toLocal(v, P, b) { return new THREE.Vector3(v.dot(b.e), v.dot(P), -v.dot(b.n)); }
function zoneAt(P) { if (P.dot(L) < -0.03) return 'night'; const c = sunCover(P); return c >= 0.999 ? 'total' : c > 0.03 ? 'partial' : 'none'; }
function umbraCenter() { const M = MOON, b = -2 * M.dot(L), c = M.lengthSq() - 1, disc = b * b - 4 * c; if (disc < 0) return null; const t = (-b - Math.sqrt(disc)) / 2; return M.clone().sub(L.clone().multiplyScalar(t)).normalize(); }
function rotToward(P, dir, ang) { const t = dir.clone().sub(P.clone().multiplyScalar(dir.dot(P))).normalize(); return P.clone().multiplyScalar(Math.cos(ang)).add(t.multiplyScalar(Math.sin(ang))).normalize(); }
function seoulAt(T) { const a = (T - 12) * 15 * D2R; return new THREE.Vector3(Math.cos(LAT) * Math.cos(a), Math.sin(LAT), -Math.cos(LAT) * Math.sin(a)); }
const POLE = new THREE.Vector3(0, Math.sin(LAT), -Math.cos(LAT));
function skyDir(dec, H) { // 서울 지역 좌표의 천체 방향 (시간각 H: 서쪽 +)
  const Q = new THREE.Vector3(0, Math.cos(LAT), Math.sin(LAT)), Wv = new THREE.Vector3(-1, 0, 0), d = dec * D2R, h = H * D2R;
  return Q.multiplyScalar(Math.cos(d) * Math.cos(h)).addScaledVector(Wv, Math.cos(d) * Math.sin(h)).addScaledVector(POLE, Math.sin(d)).normalize(); }
function azName(v) { const a = ((Math.atan2(v.x, -v.z) / D2R) + 360) % 360; return ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(a / 45) % 8]; }
const CITIES = [['서울', 37.6, 127], ['도쿄', 35.7, 139.7], ['베이징', 39.9, 116.4], ['상하이', 31.2, 121.5], ['블라디보스토크', 43.1, 131.9], ['타이베이', 25, 121.5], ['마닐라', 14.6, 121], ['방콕', 13.8, 100.5], ['뉴델리', 28.6, 77.2], ['울란바토르', 47.9, 106.9], ['캄차카', 53, 158.7], ['시드니', -33.9, 151.2], ['모스크바', 55.8, 37.6], ['런던', 51.5, -0.1], ['뉴욕', 40.7, -74], ['로스앤젤레스', 34, -118.2], ['하와이', 21.3, -157.8], ['알래스카', 61.2, -149.9], ['북극', 89, 0], ['아이슬란드', 64.1, -21.9], ['카이로', 30, 31.2], ['자카르타', -6.2, 106.8], ['리우데자네이루', -22.9, -43.2], ['케이프타운', -33.9, 18.4]];
function latLon(P) { const lat = Math.asin(Math.max(-1, Math.min(1, P.y))) / D2R; let lon = Math.atan2(-P.z, P.x) / D2R + 127; lon = ((lon + 540) % 360) - 180; return [lat, lon]; }
function placeName(P) { const [la, lo] = latLon(P); let best = null, bd = 9; CITIES.forEach(c => { const a = la * D2R, b = c[1] * D2R, d = Math.acos(Math.max(-1, Math.min(1, Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos((lo - c[2]) * D2R)))); if (d < bd) { bd = d; best = c[0]; } });
  return { name: bd < 0.2 ? best + ' 근처' : (best ? best + ' 쪽 ' + Math.round(bd * 6371 / 100) * 100 + 'km' : '-'), ll: `${Math.abs(la).toFixed(0)}°${la >= 0 ? 'N' : 'S'} ${Math.abs(lo).toFixed(0)}°${lo >= 0 ? 'E' : 'W'}` }; }
function nextZone() { return gOrder.find(k => !G.stamps[k]); }
const dashG = (a, b, c) => `<div class="g"><span>${a[0]}</span><b id="g1" style="font-size:13px">-</b><em id="g1e"></em></div><div class="g wide"><span>${b}</span><div class="bar"><i id="d-cov"></i></div><b id="d-covt">-</b><em id="d-zone">-</em></div><div class="g"><span>${c}</span><b id="g-st">0</b><em></em></div>`;
function groundUI(m) {
  hud.classList.remove('hide'); dash.classList.remove('hide'); pad.classList.remove('hide'); thr.classList.add('hide'); chk.classList.remove('hide');
  $('#m-timer').classList.add('hide'); $('#tgt').style.display = 'none'; $('#xhair').classList.add('hide');
  const g = m.gmode; dash.innerHTML = g === 'trails' ? dashG(['방향'], '노출 시간', '사진') : g === 'day' ? dashG(['시각'], '태양 고도', '도장') : g === 'evening' ? dashG(['음력 날짜'], '달 방향', '도장') : dashG(['현재 위치'], g === 'lunar' ? '달 가림 (지구 그림자)' : '태양 가림', '도장');
  pipf.querySelector('span').textContent = g === 'evening' ? '🛰 우주 모니터 · 달 궤도 위치' : '🛰 우주 모니터 · 지구 위 내 위치'; }
async function stampK(k, name, line) {
  G.stamps[k] = true; sfx.ok(); toast(`🏅 ${name} 도장!`);
  G.running = false; if (line) await say([['lumi', line]]); G.running = true;
  if (gOrder.every(q => G.stamps[q])) await groundFinish();
}
async function groundFinish() {
  const m = EP.missions[G.mi]; G.running = false; G.gPhase = 'quiz';
  if (m.qs) { if (m.pre) await say(m.pre); await quiz(m.qs); }
  G.flags.q = true; G.gPhase = 'done'; compass.classList.add('hide'); dialUI(false); shotBtn(false); missionDone();
}
async function groundMission(m) {
  G.mode = 'ground'; G.running = false; guide.visible = false; clearObjects(); G.gm = m.gmode; G.stamps = {}; G.zoneT = 0; G.zoneK = ''; G.gT = 0; G.gPhase = 'explore';
  if (!GV) GV = new GroundView({ yul: A.yul && A.yul.scene, yulAnims: A.yul && A.yul.animations, yulAtlas: A.yulAtlas, nature: NATURE.map(n => A['nat_' + n] && Object.assign(A['nat_' + n], { name: n })).filter(Boolean), fixMats });
  groundUI(m); showBanner(`MISSION ${G.mi + 1} / ${EP.missions.length}`, m.name);
  const g = m.gmode;
  if (g === 'eclipse') {
    setMoon(0, 0.6); const Pu = umbraCenter() || new THREE.Vector3(0.8, 0.6, 0).normalize();
    gTargets.total = Pu.clone(); gTargets.partial = rotToward(Pu, Yv.clone().negate(), 0.28); gTargets.none = rotToward(Pu, Yv.clone().negate(), 0.62); gTargets.night = L.clone().negate().add(Yv.clone().multiplyScalar(0.35)).normalize();
    gOrder = ZONE_ORDER.slice(); gP.copy(Pu); G.gPhase = 'intro'; setMoon(-9, 0.6);
    await say([['lumi', '하늘을 봐! 달이 오른쪽에서 태양을 덮어 와.']]);
    await new Promise(r => { G.gIntroDone = r; });
    sfx.total(); await say([['yul', '깜깜해! 별도 보이고 하얀 왕관이…'], ['lumi', '코로나야. 이제 지구 위를 걸어 다니며 하늘이 어떻게 다른지 도장을 모아 보자!']]);
  } else if (g === 'lunar') {
    setMoon(166, 0); gP.copy(L.clone().negate().add(Yv.clone().multiplyScalar(0.55)).normalize());
    gTargets.here = gP.clone(); gTargets.far = new THREE.Vector3(-0.55, -0.25, 0.8).normalize(); gTargets.day = L.clone().add(Yv.clone().multiplyScalar(0.35)).normalize();
    gOrder = ['here', 'far', 'day']; G.gPhase = 'intro';
    await say([['lumi', '밤하늘의 보름달을 봐! 지구 그림자가 다가오고 있어.']]);
    await new Promise(r => { G.gIntroDone = r; });
    sfx.total(); await say([['yul', '달이 왼쪽부터 어두워지더니 빨개졌어!'], ['lumi', '개기월식이야! 이제 다른 곳에서도 보이는지 확인해 보자.']]);
  } else if (g === 'evening') {
    gOrder = m.targets.map(t => t.k); G.eDay = 3; setMoon(dayToE(3), 0.3);
    dialUI(true, '음력 날짜', 1, 29.5, 3, v => { G.eDay = v; setMoon(dayToE(v), 0.3); });
    await say([['lumi', '해가 막 진 저녁이야. 날짜 다이얼을 돌리면 같은 시각의 달이 보여!']]);
  } else if (g === 'day') {
    gOrder = m.targets.map(t => t.k); G.T = 4.6;
    await say([['lumi', '◀ ▶로 시간을 돌려 봐. 🎯를 누르면 시간이 저절로 흘러!']]);
  } else if (g === 'trails') {
    G.T = 22; G.expH = 0; G.dirI = 0; G.shotI = 0; G.trBuilt = -1; buildTrailsBase();
    shotBtn(false); if (!store.get('trtip', false)) { await say([['lumi', '◀ ▶는 방향, ▲를 꾹 누르면 셔터가 열려 별의 길이 그려져. 🎯로 사진 제출!']]); store.set('trtip', true); }
  }
  G.gPhase = 'explore'; G.running = true;
}
/* 별 궤적 */
const DIRS = ['N', 'E', 'S', 'W'], DIRK = { N: '북쪽', E: '동쪽', S: '남쪽', W: '서쪽' };
const STARS2 = (() => { const r = E_rng(31), o = []; for (let i = 0; i < 420; i++) o.push({ dec: Math.asin(-0.5 + r() * 1.5) / D2R, H0: r() * 360, b: 0.4 + r() * 0.6 }); o.push({ dec: 89.2, H0: 30, b: 1.4, pol: true }); return o; })();
let trailMesh = null, trailDots = null, polLabel = null;
function buildTrailsBase() {
  GV.extra.clear(); trailMesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, fog: false })); trailMesh.frustumCulled = false; GV.extra.add(trailMesh);
  trailDots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: 0xffffff, fog: false })); trailDots.frustumCulled = false; GV.extra.add(trailDots);
  polLabel = labelSprite('★ 북극성', '#fff3b0', 12); polLabel.material.fog = false; GV.extra.add(polLabel);
}
function updateTrails() {
  if (Math.abs(G.expH - G.trBuilt) < 0.04) return; G.trBuilt = G.expH;
  const pos = [], col = [], dots = [], H0off = 15 * (G.T - 12), steps = Math.max(1, Math.ceil(G.expH * 6)), R = 150;
  STARS2.forEach(s => { let prev = null;
    for (let k = 0; k <= steps; k++) { const h = G.expH * k / steps, v = skyDir(s.dec, s.H0 + H0off + 15 * h).multiplyScalar(R);
      if (prev && v.y > 0 && prev.y > 0 && G.expH > 0.02) { const f = 0.25 + 0.75 * k / steps, br = s.b * f; pos.push(prev.x, prev.y, prev.z, v.x, v.y, v.z); col.push(br * 0.75, br * 0.85, br, br * 0.75, br * 0.85, br); }
      prev = v; }
    if (prev.y > 0) dots.push(prev.x, prev.y, prev.z); if (s.pol) polLabel.position.copy(prev).add(new THREE.Vector3(10, 6, 0)); });
  trailMesh.geometry.dispose(); trailMesh.geometry = new THREE.BufferGeometry(); trailMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); trailMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  trailDots.geometry.dispose(); trailDots.geometry = new THREE.BufferGeometry(); trailDots.geometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
}
async function trailsSubmit() {
  const m = EP.missions[G.mi], s = m.shots[G.shotI]; if (!s || !G.running || G.talking) return; const d = DIRS[G.dirI], ang = Math.round(15 * G.expH);
  if (d !== s.dir) { sfx.bad(); toast(`지금은 ${DIRK[d]} 하늘이야. 목표: ${DIRK[s.dir]} 하늘`, true); return; }
  if (s.minH && G.expH < s.minH) { sfx.bad(); toast(`노출이 짧아요 (${G.expH.toFixed(1)}시간). ▲를 더 눌러 ${s.minH}시간 이상!`, true); return; }
  if (s.h && Math.abs(G.expH - s.h) > s.tol) { sfx.bad(); toast(`지금 각도 ${ang}° (= 15° × ${G.expH.toFixed(1)}시간). 목표 45°!`, true); speak('lumi', '1시간에 15도야. 45도면 몇 시간일까?'); return; }
  G.shotI++; sfx.ring(); toast(`📸 ${DIRK[d]} 하늘 사진 성공! (${ang}°)`); G.expH = 0;
  const lines = { N: '북극성을 중심으로 시계 반대 방향 동심원! 북극성은 거의 그대로야.', E: '동쪽 별은 지평선에서 오른쪽 위로 비스듬히 떠올라.', W: '서쪽 별은 오른쪽 아래로 비스듬히 져.', S: '남쪽 별은 지평선과 나란히 왼쪽(동)에서 오른쪽(서)으로!' };
  G.running = false; await say([['lumi', lines[d]]]); G.running = true;
  if (G.shotI >= m.shots.length) await groundFinish();
}
function groundSteps(m) {
  const g = m.gmode;
  if (g === 'trails') { if (m.steps.length === 3 && m.shots.length === 1) return [DIRS[G.dirI] === m.shots[0].dir, G.expH >= (m.shots[0].minH || 0), G.shotI >= 1]; const a = m.shots.map((_, k) => G.shotI > k); if (m.qs) a.push(!!G.flags.q); return a; }
  return [...gOrder.map(k => !!G.stamps[k]), ...(m.qs ? [!!G.flags.q] : [])];
}
const moonCraters = [[-.3, -.2, .18], [.25, .3, .14], [.1, -.45, .1], [-.15, .4, .1], [.4, -.1, .09], [-.45, .15, .08]];
function drawFullMoon(c, x, y, r) { const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#dccfa9'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,110,90,.22)'; moonCraters.forEach(k => { c.beginPath(); c.arc(x + k[0] * r, y + k[1] * r, k[2] * r, 0, 7); c.fill(); }); }
function groundFrame(dt) {
  if (!GV) return;
  const m = EP.missions[G.mi], g = m.gmode, act = G.gPhase === 'explore' && G.running && !G.talking && !G.overlay;
  let P = gP, sunL, moonL, moonAng = 0.05, cover = 0, mv = new THREE.Vector3(), st = {}, hud = ['-', '', 0, '-', '-'];
  if (g === 'eclipse' || g === 'lunar') {
    if (G.gPhase === 'intro') { G.gT += dt; if (g === 'eclipse') setMoon(-9 + 9 * Math.min(1, G.gT / 8), 0.6); else setMoon(166 + 14 * Math.min(1, G.gT / 9), 0); if (G.gT >= (g === 'eclipse' ? 9 : 10) && G.gIntroDone) { const d = G.gIntroDone; G.gIntroDone = null; d(); } }
    const b = basisAt(gP);
    if (act) {
      const f = G.gF || new THREE.Vector3(0, 0, -1), r = G.gR || new THREE.Vector3(1, 0, 0);
      mv.addScaledVector(f, input.up - input.down).addScaledVector(r, input.right - input.left);
      const nz = nextZone(); if (aim && nz) { const tl = toLocal(gTargets[nz].clone().sub(gP), gP, b); tl.y = 0; if (tl.length() > 1e-4) mv.copy(tl.normalize()); }
      if (mv.lengthSq() > 0) { mv.normalize(); const w = b.e.clone().multiplyScalar(mv.x).addScaledVector(b.n, -mv.z); gP.addScaledVector(w, 0.32 * dt).normalize(); mv.multiplyScalar(14); }
    }
    const b2 = basisAt(gP); sunL = toLocal(L, gP, b2).normalize(); const mvec = MOON.clone().sub(gP), md = mvec.length(); moonL = toLocal(mvec.clone().divideScalar(md), gP, b2).normalize(); moonAng = Math.asin(RM / md);
    const pn = placeName(gP); hud[0] = pn.name; hud[1] = pn.ll;
    if (g === 'eclipse') {
      cover = gP.dot(L) < -0.03 ? 0 : sunCover(gP); const zk = zoneAt(gP);
      hud[2] = cover; hud[3] = Math.round(cover * 100) + '%'; hud[4] = { total: '본그림자', partial: '반그림자', none: '그림자 밖', night: '밤 (태양 없음)' }[zk];
      if (act) { if (zk === G.zoneK) G.zoneT += dt; else { G.zoneK = zk; G.zoneT = 0; } if (!G.stamps[zk] && G.zoneT > 1.2) { const z = m.zones[zk]; stampK(zk, `${z.n} (${z.s})`, z.line); } }
    } else {
      // 달에 드리운 지구 그림자 (실제 기하)
      const A2 = L.clone().multiplyScalar(MOON.dot(L)), v = A2.clone().sub(MOON), dd = v.length() / RM, D = Math.abs(MOON.dot(L)), ru = (1 - D * SUN_ANG) / RM, rp = (1 + D * SUN_ANG) / RM;
      const fr = Math.min(1, ov(1, ru, dd) / Math.PI), right = moonL.clone().cross(Yv).normalize(), upS = right.clone().cross(moonL).normalize(), vL = toLocal(v, gP, b2);
      const sx = vL.dot(right), sy = vL.dot(upS), sl = Math.hypot(sx, sy) || 1, ox = sx / sl * dd, oy = -sy / sl * dd;
      st.moonDraw = (c, x, y, r) => { drawFullMoon(c, x, y, r); c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
        c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.arc(x + ox * r, y + oy * r, rp * r, 0, 7); c.fill();
        c.fillStyle = fr > 0.995 ? 'rgba(150,40,20,.78)' : 'rgba(60,18,10,.9)'; c.beginPath(); c.arc(x + ox * r, y + oy * r, ru * r, 0, 7); c.fill(); c.restore(); };
      st.moonKey = dd.toFixed(2) + '_' + Math.round(Math.atan2(oy, ox) * 20); st.focus = moonL.y > 0 ? moonL : null;
      const night = gP.dot(L) < -0.03, zk = !night ? 'day' : gP.distanceTo(gTargets.far) < 0.32 ? 'far' : 'here';
      hud[2] = fr; hud[3] = Math.round(fr * 100) + '%'; hud[4] = night ? (fr > 0.995 ? '개기월식 (붉은 달)' : fr > 0.01 ? '부분월식' : '보름달') : '낮 — 달이 지평선 아래';
      if (act) { if (zk === G.zoneK) G.zoneT += dt; else { G.zoneK = zk; G.zoneT = 0; } if (!G.stamps[zk] && G.zoneT > 1.2 && (zk !== 'here' || fr > 0.99)) { const z = m.zones[zk]; stampK(zk, z.n, z.line); } }
    }
    const nz = nextZone();
    if (nz && G.gPhase === 'explore') { const tl = toLocal(gTargets[nz].clone().sub(gP), gP, b2), f = G.gF || new THREE.Vector3(0, 0, -1); const ang = Math.atan2(tl.x, -tl.z) - Math.atan2(f.x, -f.z), dist = Math.acos(Math.max(-1, Math.min(1, gP.dot(gTargets[nz])))) * 6371;
      const zz = m.zones[nz]; compass.innerHTML = `<i style="transform:rotate(${ang}rad)">⬆</i><div><b>다음 도장: ${zz.n}</b><span>${zz.s} · ${dist < 150 ? '거의 다 왔어요!' : Math.round(dist / 100) * 100 + 'km'}</span></div>`; compass.classList.remove('hide');
      tgtMk.position.copy(gTargets[nz]).multiplyScalar(1.03); tgtMk.visible = true; } else { compass.classList.add('hide'); tgtMk.visible = false; }
  } else if (g === 'evening') {
    const Hs = 94; sunL = skyDir(0, Hs); const e = dayToE(G.eDay); moonL = skyDir(0, Hs - e); P = seoulAt(18.25);
    const right = moonL.clone().cross(Yv).normalize(), upS = right.clone().cross(moonL).normalize(), vs = sunL.clone().sub(moonL);
    st.moonDraw = (c, x, y, r) => { c.fillStyle = 'rgba(0,0,0,0)'; UI.drawPhase(c, x, y, r, e); }; st.moonKey = 'p' + Math.round(e);
    st.moonRot = Math.atan2(vs.dot(upS), vs.dot(right)) - (e > 180 ? Math.PI : 0); st.focus = moonL.y > -0.02 ? moonL : new THREE.Vector3(0, 0.3, 1).normalize();
    hud[0] = G.eDay.toFixed(1) + '일'; hud[2] = Math.max(0, Math.asin(moonL.y) / (Math.PI / 2)); hud[3] = moonL.y > 0 ? azName(moonL) + '쪽' : '지평선 아래'; hud[4] = moonL.y > 0 ? '고도 ' + Math.round(Math.asin(moonL.y) / D2R) + '°' : '저녁엔 안 보임';
    if (act) { const t = m.targets.find(t => adiff(e, t.e) < 12 && moonL.y > 0.02); const zk = t ? t.k : ''; if (zk === G.zoneK) G.zoneT += dt; else { G.zoneK = zk; G.zoneT = 0; }
      if (t && !G.stamps[t.k] && G.zoneT > 1.0) stampK(t.k, `${t.n} (${t.s})`, `${t.n}! 저녁 ${t.s}에 보여. 음력 ${Math.round(G.eDay)}일쯤이야.`); }
  } else if (g === 'day' || g === 'trails') {
    if (g === 'day' && act) { G.T += ((input.right - input.left) * 3 + (aim ? 1.6 : 0)) * dt; G.T = Math.max(3.5, Math.min(26, G.T)); }
    sunL = skyDir(0, 15 * (G.T - 12)); moonL = new THREE.Vector3(0, -1, 0); P = seoulAt(G.T);
    st.starAxis = POLE; st.starAngle = -15 * (G.T - 12) * D2R;
    if (g === 'day') {
      const alt = Math.asin(sunL.y) / D2R, hh = ((G.T % 24) + 24) % 24; hud[0] = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}`; hud[1] = '◀▶ 시간';
      hud[2] = Math.max(0, alt / 60); hud[3] = Math.round(alt) + '°'; hud[4] = alt > -1 ? '태양: ' + azName(sunL) + '쪽' : '밤 — 별이 동→서';
      st.focus = alt > -6 ? sunL : new THREE.Vector3(0.25, 0.55, 1).normalize();
      if (act) { const t = m.targets.find(t => G.T >= t.t[0] && G.T <= t.t[1]); const zk = t ? t.k : ''; if (zk === G.zoneK) G.zoneT += dt; else { G.zoneK = zk; G.zoneT = 0; }
        const L2 = { rise: '해가 동쪽 지평선에서 떠올라! 지구가 서→동으로 돌아서야.', noon: '정오, 태양이 남쪽 하늘 가장 높은 곳!', set: '해가 서쪽으로 져. 태양은 동→남→서로 움직여 보여.', night: '별들도 동쪽에서 서쪽으로 흘러가! 모두 지구 자전 때문이야.' };
        if (t && !G.stamps[t.k] && G.zoneT > 0.5) stampK(t.k, t.n, L2[t.k]); }
    } else {
      if (act) {
        if ((input.left || input.right) && !G.dirLock) { G.dirI = (G.dirI + (input.right ? 1 : 3)) % 4; G.dirLock = true; sfx.ring(); }
        if (!input.left && !input.right) G.dirLock = false;
        if (input.up) G.expH = Math.min(12, G.expH + 1.6 * dt); if (input.down) G.expH = 0;
        if (aim) { setAim(false); trailsSubmit(); }
      }
      updateTrails(); polLabel.visible = DIRS[G.dirI] === 'N';
      st.heading = [0, Math.PI / 2, Math.PI, -Math.PI / 2][G.dirI]; st.pitch = DIRS[G.dirI] === 'N' ? 0.52 : DIRS[G.dirI] === 'S' ? 0.42 : 0.3; st.starsOff = true; st.hideYul = false;
      hud[0] = DIRK[DIRS[G.dirI]]; hud[1] = '◀▶ 돌리기'; hud[2] = G.expH / 6; hud[3] = G.expH.toFixed(1) + '시간'; hud[4] = '각도 ' + Math.round(15 * G.expH) + '°';
    }
  }
  if (g === 'eclipse' || g === 'lunar') {} else { tgtMk.visible = false; compass.classList.add('hide'); }
  const night = Math.max(0, Math.min(1, (-sunL.y + 0.02) / 0.1));
  const r = GV.update(Object.assign({ sun: sunL, moon: moonL, moonAng, cover, night, move: mv, dt, wave: G.gPhase === 'quiz' }, st), W / H); G.gF = r.forward; G.gR = r.right;
  if (st.starsOff) GV.stars.material.opacity = 0;
  // HUD
  const el = (id) => document.getElementById(id);
  if (el('g1')) { el('g1').textContent = hud[0]; el('g1e').textContent = hud[1]; el('d-cov').style.width = (Math.max(0, Math.min(1, hud[2])) * 100) + '%'; el('d-covt').textContent = hud[3]; el('d-zone').textContent = hud[4];
    el('g-st').textContent = g === 'trails' ? `${G.shotI}/${m.shots.length}` : `${gOrder.filter(k => G.stamps[k]).length}/${gOrder.length}`; }
  const extra = G.gPhase === 'quiz' ? '질문 중' : g === 'trails' ? `${DIRK[DIRS[G.dirI]]} · ${G.expH.toFixed(1)}h` : (G.zoneT > 0.2 && G.zoneK && !G.stamps[G.zoneK] ? '관측 중…' : '');
  UI.renderChk(chk, m, groundSteps(m), extra);
  // 렌더: 지표 + 우주 모니터
  rpass.scene = GV.scene; rpass.camera = GV.camera; composer.render(); rpass.scene = scene;
  let pc = groundCam;
  if (g === 'evening') pc = droneCam;
  else if (g === 'day' || g === 'trails') { earth.rotation.y = -127 * D2R + (G.T - 12) * 15 * D2R; groundCam.position.copy(P.clone().add(L.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 0.6, 0)).normalize().multiplyScalar(3.4)); groundCam.lookAt(0, 0, 0); }
  else { groundCam.position.copy(gP.clone().add(L.clone().multiplyScalar(g === 'lunar' ? -0.9 : 0.9)).add(new THREE.Vector3(0, 0.35, 0)).normalize().multiplyScalar(3.6)); groundCam.lookAt(gP.clone().multiplyScalar(0.55).add(MOON.clone().multiplyScalar(0.12))); }
  pc.aspect = pip.w / pip.h; pc.updateProjectionMatrix();
  yulMk.position.copy(P).multiplyScalar(1.03); yulMk.visible = true;
  shipM.visible = trail.visible = dust.visible = hero.visible = false; lbMoon.visible = lbEarth.visible = lbSun.visible = true; redRing.visible = false;
  renderer.setScissorTest(true); renderer.setScissor(pip.x, H - pip.y - pip.h, pip.w, pip.h); renderer.setViewport(pip.x, H - pip.y - pip.h, pip.w, pip.h);
  renderer.render(scene, pc); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  if (pc === droneCam) { droneCam.aspect = W / H; droneCam.updateProjectionMatrix(); }
  yulMk.visible = tgtMk.visible = false; pipf.classList.remove('hide');
}

/* ═════ 루프 ═════ */
let W = 1, H = 1, pip = { x: 0, y: 0, w: 1, h: 1 };
function resize() {
  W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); composer.setSize(W, H); bloom.resolution.set(W / 2, H / 2);
  const land = W > H; pip.w = Math.round(land ? Math.min(W * 0.27, 300) : W * 0.46); pip.h = Math.round(land ? Math.min(H * 0.3, pip.w * 0.62) : pip.w * 0.7);
  pip.x = W - pip.w - 10; pip.y = land ? 58 : 96;
  Object.assign(pipf.style, { left: pip.x + 'px', top: pip.y + 'px', width: pip.w + 'px', height: pip.h + 'px' });
  shipCam.aspect = W / H; droneCam.aspect = W / H; $('#rot').classList.toggle('hide', land || G.mode === 'title');
}
window.addEventListener('resize', resize); resize();

const tmp = new THREE.Vector3(), tgtEl = $('#tgt');
let last = performance.now(), tAll = 0;
function currentTarget() {
  const m = EP.missions[G.mi]; if (!m || G.mode !== 'fly') return null;
  if (m.rings && G.idx < m.rings.length) return { p: V(m.rings[G.idx]), n: `링 ${G.idx + 1}` };
  if (m.type === 'descend') return { p: m.landAbs ? V(m.land) : V(m.land).multiplyScalar(1.03), n: m.landAbs ? '달 착륙점' : '착륙점' };
  if (m.type === 'umbra') return { p: V(m.target), n: m.shadow === 'earth' ? '지구 그림자' : '본그림자' };
  if (m.type === 'photo') return { p: MOON.clone(), n: '달' };
  return null;
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAll += dt;
  if (G.mode === 'title' || G.mode === 'clear') { // 시네마틱 공전 카메라
    if (hero.userData.ship) {
      hero.visible = true; hero.position.copy(HERO_P); hero.position.y += Math.sin(tAll * 0.9) * 0.01; hero.lookAt(MOON);
      if (hero.userData.exhaust) hero.userData.exhaust.scale.setScalar(0.045 + Math.random() * 0.012);
      const a = 0.6 + Math.sin(tAll * 0.1) * 0.9, r = 0.3; ship.pos.set(HERO_P.x + r * Math.sin(a) - 0.05, HERO_P.y + 0.07 + 0.03 * Math.sin(tAll * 0.3), HERO_P.z + r * Math.cos(a));
      heroLight.position.copy(ship.pos).lerp(HERO_P, 0.35).add(new THREE.Vector3(0, 0.12, 0)); heroRim.position.copy(HERO_P).add(new THREE.Vector3(0.25, 0.15, -0.25)); heroLight.visible = heroRim.visible = true;
      if (yulHero) { const wp = yulHero.getWorldPosition(new THREE.Vector3()); yulHero.parent.worldToLocal(tmp.copy(ship.pos)); yulHero.rotation.y = Math.atan2(tmp.x - yulHero.position.x, tmp.z - yulHero.position.z); }
      const lk = lookAtTarget(HERO_P.clone().add(new THREE.Vector3(0.05, 0.045, 0))); ship.yaw = lk.yaw; ship.pitch = lk.pitch;
      noxShip.visible = true; noxShip.position.set(4.9, 1.8, -1.6); noxShip.lookAt(HERO_P);
    } else { const a = tAll * 0.06; ship.pos.set(3 + 8.5 * Math.sin(a), 2.2 + Math.sin(a * 0.7), 8.5 * Math.cos(a)); const lk = lookAtTarget(new THREE.Vector3(3, 0.4, 0)); ship.yaw = lk.yaw; ship.pitch = lk.pitch; }
  } else if (G.mode === 'fly') {
    hero.visible = false; heroLight.visible = heroRim.visible = false;
    const ctrl = (G.running || G.tut >= 0) && !G.talking && !G.overlay;
    if (ctrl) {
      const yr = (input.left - input.right) * 1.05, pr = (input.up - input.down) * 0.85;
      ship.yaw += yr * dt; ship.pitch = Math.max(-1.35, Math.min(1.35, ship.pitch + pr * dt));
      const T = currentTarget();
      if (G.lookBack && !(input.left || input.right || input.up || input.down)) { const a = lookAtTarget(G.lookTgt || MOON); let dy = a.yaw - ship.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ship.yaw += dy * Math.min(1, 2.2 * dt); ship.pitch += (a.pitch - ship.pitch) * Math.min(1, 2.2 * dt); }
      else if (aim && T) { const a = lookAtTarget(T.p); let dy = a.yaw - ship.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ship.yaw += dy * Math.min(1, 3.2 * dt); ship.pitch += (a.pitch - ship.pitch) * Math.min(1, 3.2 * dt); }
      ship.speed += (input.fwd * 0.55 - input.back * 0.8) * dt; ship.speed -= ship.speed * 0.28 * dt; ship.speed = Math.max(-0.25, Math.min(1.0, ship.speed));
    } else ship.speed *= Math.pow(0.05, dt);
    if (G.camMode === 'moon') { ship.speed = 0; const a = lookAtTarget(MOON); let dy = a.yaw - ship.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ship.yaw += dy * Math.min(1, 4 * dt); ship.pitch += (a.pitch - ship.pitch) * Math.min(1, 4 * dt); }
    if (G.camMode === 'down') { ship.speed *= Math.pow(0.02, dt); ship.pitch += (-1.5 - ship.pitch) * Math.min(1, 2 * dt); }
    if (G.spin) earth.rotation.y += G.spin * dt;
    redRing.visible = EP.space.earthCone && ship.pos.dot(L) < 0 && sunCover(ship.pos) > 0.999 && Math.hypot(ship.pos.y, ship.pos.z) < 0.95;
    ship.pos.addScaledVector(fwd(), ship.speed * dt);
    if (G.running && !G.talking && !G.overlay) missionUpdate(dt);
    if (G.tut >= 0) { const done = [Math.abs(ship.yaw - G.tutYaw) > 0.35, ship.speed > 0.35, aim];
      if (G.tut < 3 && done[G.tut]) { G.tut++; sfx.ring(); G.tutPaint && G.tutPaint(); }
      if (G.tut >= 3 && G.tutDone) { const d = G.tutDone; G.tutDone = null; setTimeout(d, 500); } }
    flightHud(dt);
    // 엔진음
    if (eng) { const s = Math.abs(ship.speed); eng.g.gain.value = muted ? 0 : 0.012 + s * 0.05 + (input.fwd ? 0.02 : 0); eng.o.frequency.value = 40 + s * 70; eng.o2.frequency.value = 80 + s * 140; eng.f.frequency.value = 220 + s * 900; }
  }
  if (G.mode !== 'fly' && eng) eng.g.gain.value = 0;
  // 카메라
  shipCam.position.copy(ship.pos); const f = fwd(); shipCam.up.set(0, 1, 0); shipCam.lookAt(tmp.copy(ship.pos).add(f));
  if (input.fwd && G.running) { shipCam.position.x += (Math.random() - 0.5) * 0.0012; shipCam.position.y += (Math.random() - 0.5) * 0.0012; }
  shipCam.fov = G.camMode === 'moon' ? 9 : 70 + Math.abs(ship.speed) * 14; shipCam.updateProjectionMatrix(); droneCam.updateProjectionMatrix();
  // 먼지
  for (let i = 0; i < DUST; i++) { for (let k = 0; k < 3; k++) { const c = ship.pos.getComponent(k); let v = dustPos[i * 3 + k] - c; v = ((v + 1.5) % 3 + 3) % 3 - 1.5; dustPos[i * 3 + k] = c + v; } }
  dustG.attributes.position.needsUpdate = true;
  // 루미호 마커 · 궤적
  shipM.position.copy(ship.pos); shipM.lookAt(tmp.copy(ship.pos).add(f));
  if (G.mode === 'fly') { trailPos.copyWithin(3, 0, (TRAIL - 1) * 3); trailPos.set([ship.pos.x, ship.pos.y, ship.pos.z], 0); trailG.attributes.position.needsUpdate = true; }
  // 링 강조
  ringsG.children.forEach((r, i) => { r.material = i === G.idx ? ringMatOn : ringMat; r.visible = i >= G.idx; r.rotation.z += dt * 0.6; });
  G.mines.forEach(o => { o.s.position.set(o.b.x, o.b.y + Math.sin(tAll * 1.4 + o.ph) * o.amp, o.b.z + Math.cos(tAll * 1.1 + o.ph) * o.amp); if (o.s.isSprite) o.s.material.rotation += dt * 2; else o.s.lookAt(ship.pos); });
  mixers.forEach(m => m.update(dt));
  rocksG.children.forEach(r => { r.rotation.x += r.userData.spin * dt; r.rotation.y += r.userData.spin * 0.7 * dt; });
  if (noxShip.visible) { const a = tAll * 0.35; noxShip.position.set(2.7 + Math.sin(a) * 0.5, 1.05 + Math.sin(a * 1.3) * 0.12, -0.45 + Math.cos(a) * 0.25); noxShip.lookAt(ship.pos); }
  // 계기판 · 목표 표시
  const cov = sunCover(ship.pos);
  if (G.mode === 'fly') {
    $('#d-spd').textContent = Math.round(Math.abs(ship.speed) * 640); $('#d-cov').style.width = (cov * 100) + '%'; $('#d-covt').textContent = Math.round(cov * 100) + '%';
    $('#d-zone').textContent = cov >= 0.999 ? '본그림자' : cov > 0.005 ? '반그림자' : '햇빛';
    const T = currentTarget();
    if (T) {
      $('#d-dst').textContent = (T.p.distanceTo(ship.pos) * 6.371).toFixed(1);
      tmp.copy(T.p).project(shipCam); const behind = tmp.z > 1; let sx = (tmp.x + 1) / 2 * W, sy = (1 - tmp.y) / 2 * H;
      const inView = !behind && sx > 30 && sx < W - 30 && sy > 60 && sy < H - 60;
      tgtEl.style.display = 'block';
      if (inView) { tgtEl.className = ''; tgtEl.style.transform = ''; tgtEl.style.left = sx + 'px'; tgtEl.style.top = sy + 'px'; }
      else { let dx = sx - W / 2, dy = sy - H / 2; if (behind) { dx = -dx; dy = -dy; } const a = Math.atan2(dy, dx), R = Math.min(W, H) * 0.36; tgtEl.className = 'edge'; tgtEl.style.left = (W / 2 + Math.cos(a) * R) + 'px'; tgtEl.style.top = (H / 2 + Math.sin(a) * R) + 'px'; tgtEl.style.transform = `rotate(${a + Math.PI / 2}rad)`; }
      tgtEl.querySelector('b').textContent = T.n;
    } else { tgtEl.style.display = 'none'; $('#d-dst').textContent = '-'; }
    const tm = $('#m-timer'); tm.querySelector('i').style.transform = `scaleX(${Math.max(0, G.t / G.tMax)})`; tm.classList.toggle('warn', G.t < 10);
  }
  // 렌더: 큰 화면 + 외부 모니터
  const bigCam = swapped ? droneCam : shipCam, smallCam = swapped ? shipCam : droneCam;
  bigCam.aspect = W / H; bigCam.updateProjectionMatrix();
  const showPip = G.mode === 'fly' || G.mode === 'ground';
  pipf.classList.toggle('hide', !showPip); $('#frame').classList.toggle('hide', (swapped && G.mode === 'fly') || G.mode === 'title' || G.mode === 'clear' || G.mode === 'ground');
  if (G.mode !== 'ground') {
    shipM.visible = trail.visible = bigCam === droneCam && G.mode === 'fly'; dust.visible = bigCam === shipCam && G.mode === 'fly';
    lbMoon.visible = lbEarth.visible = lbSun.visible = bigCam === droneCam;
    rpass.camera = bigCam; composer.render();
    if (showPip && G.mode === 'fly') {
      shipM.visible = trail.visible = smallCam === droneCam; dust.visible = false; lbMoon.visible = lbEarth.visible = lbSun.visible = smallCam === droneCam; smallCam.aspect = pip.w / pip.h; smallCam.updateProjectionMatrix();
      renderer.setScissorTest(true); renderer.setScissor(pip.x, H - pip.y - pip.h, pip.w, pip.h); renderer.setViewport(pip.x, H - pip.y - pip.h, pip.w, pip.h);
      renderer.render(scene, smallCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
    }
  } else { groundFrame(dt); }
  requestAnimationFrame(frame);
}
function missionUpdate(dt) {
  const m = EP.missions[G.mi];
  if (m.time) { G.t -= dt; if (G.t < 6 && Math.ceil(G.t) !== G.lastTick) { G.lastTick = Math.ceil(G.t); sfx.tick(); } if (G.t <= 0) return missionFail('시간이 다 됐어.'); }
  const p = ship.pos;
  if (m.type === 'chooseLand') { let near = 9; for (const bk of m.beacons) { const bp = V(bk.p).multiplyScalar(1.03), d = p.distanceTo(bp); near = Math.min(near, d); if (d < 0.16) { if (bk.ok) return missionDone(); return missionFail(m.wrong); } } G.flags.near = near < 0.6; }
  const landing = m.type === 'descend' && !m.landAbs && G.idx >= (m.rings || []).length;
  if (p.length() < 1.02 && !landing) return missionFail('지구에 너무 가까이 갔어!');
  if (p.distanceTo(MOON) < RM + 0.03) return missionFail('달에 부딪혔어!');
  if (p.length() > 16) return missionFail('궤도를 너무 벗어났어.');
  const cov = sunCover(p);
  if (cov > 0.02 && cov < 0.999 && !G.penSeen && m.type === 'umbra') { G.penSeen = true; toast('🌗 반그림자 진입 — 태양이 일부만 가려졌어요'); }
  if (m.rings && G.idx < m.rings.length) { if (p.distanceTo(V(m.rings[G.idx])) < 0.21) { G.idx++; sfx.ring(); toast(`✅ 링 ${G.idx} 통과!`); if (m.type === 'rings' && G.idx >= m.rings.length) return missionDone(); if (m.type === 'watch' && G.idx >= m.rings.length) watchSeq(m); } }
  if (m.type === 'umbra') {
    if (cov >= 0.999) { if (G.hold === 0) { sfx.total(); toast(m.shadow === 'earth' ? '🌑 지구 그림자 속! 태양 쪽을 돌아봐요 — 3초 유지!' : '🌑 본그림자! 뒤를 돌아 태양 쪽을 봐요 — 3초 유지!'); G.lookBack = true; G.lookTgt = m.shadow === 'earth' ? new THREE.Vector3() : null; setAim(false); }
      G.hold += dt; $('#m-goal').innerHTML = `그림자 유지 <b>${G.hold.toFixed(1)} / ${m.hold}초</b> — 역추진으로 멈춰요`; if (G.hold >= m.hold) return missionDone(); }
    else if (G.hold > 0) { G.hold = 0; $('#m-goal').innerHTML = '🎯 ' + m.brief.what; toast('그림자를 벗어났어요!', true); }
  }
  if (m.type === 'descend') {
    for (const o of G.mines) if (o.s.position.distanceTo(p) < 0.085) return missionFail('녹스의 그림자 정령에 닿았어!');
    const lp = m.landAbs ? V(m.land) : V(m.land).multiplyScalar(1.03); if (G.idx >= m.rings.length && p.distanceTo(lp) < 0.15) return missionDone();
  }
}
async function watchSeq(m) { // 북극 위에서 자전 관찰 → 질문
  G.running = false; G.camMode = 'down'; G.spin = 1.4; toast('🌍 북극 위! 지구가 도는 방향을 잘 봐요'); await new Promise(r => setTimeout(r, 6500));
  G.flags.watched = true; G.spin = 0.35; await quiz(m.qs); G.flags.q = true; G.camMode = ''; G.spin = 0; missionDone();
}
titleScreen();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__SQ = { G, ship, input, sunCover, EP1, get EP() { return EP; }, setEP(i) { EP = EPISODES[i]; }, startEpisode, startMission, setAim, quiz, THREE, MOON, gP, gTargets, zoneAt, get GV() { return GV; }, get swapped() { return swapped; } };
