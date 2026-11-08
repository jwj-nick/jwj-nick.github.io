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
const lbMoon = labelSprite('달 (삭)', '#e8e8f0', 1.3); lbMoon.position.set(MOON.x, MOON.y + 0.6, 0); scene.add(lbMoon);
const lbEarth = labelSprite('지구', '#9fd0ff', 1.2); lbEarth.position.set(0, 1.5, 0); scene.add(lbEarth);
const lbSun = labelSprite('태양 쪽 →', '#ffd27a', 1.6); lbSun.position.set(8.2, 1.4, 0); scene.add(lbSun);
// 그림자 원뿔 (달 → 지구)
const dEarth = MOON.x - Math.sqrt(1 - MOON.y * MOON.y);
const cone = (rTop, op, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, RM, dEarth, 48, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.z = Math.PI / 2; m.position.set(MOON.x - dEarth / 2, MOON.y, 0); scene.add(m); return m; };
const coneP = cone(RM + dEarth * SUN_ANG, 0.07, 0x5b3a9a), coneU = cone(RM - dEarth * SUN_ANG, 0.2, 0x000000);
function setMoonTheta(deg) { // 달 공전각(0 = 삭, +는 동쪽으로 공전)
  const a = deg * D2R; MOON.set(6 * Math.cos(a), 0.6, -6 * Math.sin(a)); moon.position.copy(MOON); earthU.moonPos.value.copy(MOON);
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
$('#b-dict').onclick = () => overlay(() => new Promise(r => UI.showDict(screen, PHASES, r)));
$('#b-map').onclick = () => { const m = EP1.missions[G.mi]; if (m) overlay(() => UI.showBrief(screen, m, G.mi, EP1.missions.length, mapOpts(m))); };
function mapOpts(m) { return { rings: m.rings, ringIdx: G.idx, target: m.target || m.land || null, ship: ship.pos.toArray(), heading: -ship.yaw, moonZ: MOON.z }; }
$('#b-snd').onclick = () => { muted = !muted; store.set('muted', muted); if (master) master.gain.value = muted ? 0 : 1; paintBtns(); if (muted && synth) synth.cancel(); };
$('#b-voice').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn); paintBtns(); if (!voiceOn && synth) synth.cancel(); toast(voiceOn ? (koVoice ? '🗣 음성 켬' : '🗣 이 기기에 한국어 음성이 없어 자막만 나와요') : '🗣 음성 끔 (자막만)'); };
$('#b-exit').onclick = () => titleScreen();
function paintBtns() { $('#b-snd').textContent = muted ? '🔇' : '🔊'; $('#b-voice').classList.toggle('off', !voiceOn); $('#b-spd').textContent = SPEEDS[speedI] + 'x'; }
$('#b-spd').onclick = () => { speedI = (speedI + 1) % SPEEDS.length; store.set('spd', speedI); paintBtns(); toast('⏩ 대사 속도 ' + SPEEDS[speedI] + '배'); };
paintBtns();

/* 대사: 자막 + 음성, 끝나면 자동 진행 (탭하면 건너뛰기) */
async function say(lines) {
  G.talking = true; sub.classList.remove('hide');
  for (const [who, text] of lines) {
    const ch = CHARS[who]; sub.className = who; sub.querySelector('.por').innerHTML = PORTRAIT[who];
    sub.querySelector('.nm').innerHTML = `<span style="color:${ch.color}">${ch.name}</span> <span style="opacity:.5">${ch.en}</span>`;
    sub.querySelector('.tt').innerHTML = text;
    await new Promise(res => { let done = false; const fin = () => { if (done) return; done = true; G.skip = null; sub.onclick = null; res(); };
      G.skip = () => { if (synth) synth.cancel(); fin(); }; sub.onclick = G.skip; speak(who, text).then(fin); });
  }
  sub.classList.add('hide'); G.talking = false;
}

/* ═════ 게임 상태 ═════ */
const G = { overlay: false, tut: -1, totSeen: false, best: 99, bestT: 0, hintCd: 0, behindT: 0, stamps: {}, gPhase: '', gT: 0, zoneT: 0, zoneK: '', lookBack: false, mode: 'title', mi: -1, running: false, t: 0, tMax: 1, idx: 0, hold: 0, talking: false, skip: null, mines: [], penSeen: false, lastTick: 0, gq: 0, ganim: 0 };
function clearObjects() { G.mines.forEach(o => { const mx = o.s.userData.mixer; if (mx) mixers.splice(mixers.indexOf(mx), 1); }); ringsG.clear(); minesG.clear(); G.mines = []; noxShip.visible = false; beacon.visible = false; }
function buildRings(list) { ringsG.clear(); list.forEach((p, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 12, 48), i === 0 ? ringMatOn : ringMat); r.position.copy(V(p)); const nx = list[i + 1] ? V(list[i + 1]) : MOON.clone(); r.lookAt(nx); ringsG.add(r); }); }

function titleScreen() {
  setMoonTheta(0); dash.innerHTML = DASH_FLY; tutEl.classList.add('hide');
  G.mode = 'title'; G.running = false; flightUI(false); sub.classList.add('hide'); qa.classList.add('hide'); $('#sky').classList.add('hide'); clearObjects(); if (synth) synth.cancel();
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">MID-SCI · 3D SPACE OBSERVATORY</div><h1>율이의<br><span>하늘 퀘스트</span></h1>
    <p>요크셔테리어 관측 대원 <b>율이</b>가 우주선 <b>루미호</b>를 몰고 출동! 조종석에서 직접 날아다니며, 빛을 훔치는 <b style="color:var(--nox)">녹스</b>를 막아요.</p>
    <button class="btn pri" id="go">▶ EPISODE 1 · 그림자 속으로</button>
    <button class="btn sec" id="who">등장인물 소개 (이름의 뜻)</button>
    <button class="btn sec" id="dict0">📖 달 위상 사전 (삭·상현·망·하현)</button>
    <div class="howto">🎮 <b>조종</b> — 왼쪽 방향 패드: 기수 돌리기 · 🎯: 목표 자동 조준 · 오른쪽 <b>추진</b>을 누르고 있으면 전진<br>⌨️ 키보드 — 화살표 · W/S · Space(조준)<br>📡 오른쪽 위 모니터 = 멀리 멈춰 있는 드론이 찍는 바깥 모습 (⇄로 크게)<br>🗣 루미·녹스는 목소리로 말해요 (🗣 버튼으로 끄기)<br>📱 가로 화면 추천 · 공유 메뉴 → <b>홈 화면에 추가</b>하면 앱처럼 실행<br>🔒 EPISODE 2 붉은 달(월식) · 3 달 모양 탐사 — 준비 중</div><div class="credit">3D 모델: Quaternius (CC0) · 지구 텍스처: NASA Blue/Black Marble (퍼블릭 도메인) · three.js (MIT)</div></div>`;
  $('#go').onclick = () => { unlockAudio(); store.get('seen', false) ? startEpisode() : charsScreen(true); };
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
  screen.className = ''; screen.innerHTML = ''; G.mode = 'fly';
  placeShip(EP1.missions[0].start); flightUI(true); hud.querySelector('#m-name').textContent = EP1.sub;
  $('#m-goal').textContent = ''; flightUI(false);
  await UI.showEpisodeMap(screen, EP1, 0); flightUI(true); showBanner(EP1.sub, EP1.title);
  await say(EP1.prologue);
  startMission(0, true);
}
async function startMission(i, first) {
  const m = EP1.missions[i]; G.mi = i; G.running = false; G.lookBack = false; G.idx = 0; G.hold = 0; G.penSeen = false; G.lastTick = 0; clearObjects(); setAim(false);
  $('#m-name').textContent = `M${i + 1}/${EP1.missions.length} · ${m.name}`; $('#m-goal').innerHTML = '🎯 ' + m.brief.what;
  G.totSeen = false; G.best = 99; G.bestT = 0; G.behindT = 0; G.hintCd = 6; setMoonTheta(0);
  if (first) { flightUI(false); speak('lumi', m.brief.what); await UI.showBrief(screen, m, i, EP1.missions.length, mapOpts(m)); if (synth) synth.cancel(); }
  if (m.type === 'ground') return groundMission(m);
  dash.innerHTML = DASH_FLY;
  $('#sky').classList.add('hide'); flightUI(true); placeShip(m.start);
  if (m.rings) buildRings(m.rings);
  if (m.type === 'descend') { noxShip.visible = true; } if (m.type === 'descend') { beacon.position.copy(V(m.land)).multiplyScalar(1.03); beacon.lookAt(beacon.position.clone().multiplyScalar(2)); beacon.rotateX(Math.PI / 2); beacon.visible = true; spawnMines(); }
  showBanner(`MISSION ${i + 1} / ${EP1.missions.length}`, m.name);
  if (first && m.pre) await say(m.pre);
  if (i === 0 && first && !store.get('tut', false)) await runTutorial();
  G.t = G.tMax = m.time; G.running = true; G.mode = 'fly';
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
async function runTutorial() { // P4 첫 비행 연습 (시간 제한 없음)
  G.mode = 'fly'; G.tut = 0; G.tutYaw = ship.yaw; setAim(false);
  const paint = () => { const T = EP1.tutorial; tutEl.innerHTML = `<b>조종 연습 ${Math.min(G.tut + 1, T.length)}/${T.length}</b> ${T[Math.min(G.tut, T.length - 1)].t}<div class="d">${T.map((t, k) => k < G.tut ? '✅' : k === G.tut ? '▶' : '☐').join(' ')}</div><button id="tut-skip">건너뛰기</button>`; $('#tut-skip').onclick = () => { G.tut = 99; }; };
  tutEl.classList.remove('hide'); paint(); speak('lumi', '조종 연습부터 해 보자!');
  await new Promise(res => { G.tutPaint = paint; G.tutDone = res; });
  tutEl.classList.add('hide'); store.set('tut', true); G.tut = -1; setAim(false); ship.speed *= 0.3; placeShip(EP1.missions[0].start);
  await say([['lumi', '좋아, 조종 완벽! 이제 진짜 출발이야.']]);
}
async function missionDone() {
  G.running = false; sfx.ok(); const m = EP1.missions[G.mi];
  if (m.done) await say(m.done);
  if (G.mi + 1 < EP1.missions.length) startMission(G.mi + 1, true); else episodeClear();
}
async function missionFail(reason) {
  if (!G.running) return; G.running = false; sfx.bad(); input.fwd = input.back = 0; ship.speed = 0;
  toast('⚠ ' + reason, true);
  await say([['nox', '하하! 다시 해 봐!'], ['lumi', reason + ' 다시 가자.']]);
  startMission(G.mi, false);
}
async function episodeClear() {
  G.mode = 'clear'; flightUI(false); qa.classList.add('hide'); sfx.total();
  await say(EP1.clear); store.set('clear-ep1', true);
  screen.className = 'on';
  screen.innerHTML = `<div class="sc"><div class="eye">EPISODE 1 CLEAR</div><h1 style="font-size:34px;margin-top:3vh">🏆 코로나를 지켰다!</h1>
    <p>오늘 율이가 <b>직접 날아서 본</b> 일식을 시험지 4요소로 정리하면:</p>
    <div class="sum">${EP1.summary.map(s => `<div><span>${s[0]}</span><p style="margin:0">${s[1]}</p></div>`).join('')}</div>
    <p style="font-size:13px;color:var(--muted)">※ 조종석에서 태양이 100% 가려진 곳 = <b>본그림자</b>, 일부만 가려진 곳 = <b>반그림자</b>. 지구 위 그 그림자 안에 있는 사람이 개기일식·부분일식을 봐요.</p>
    <button class="btn pri" id="again">↺ 다시 비행</button><a class="btn sec" href="../earth-moon/#u5">📘 일식·월식 단원 복습</a><button class="btn sec" id="ti">타이틀로</button></div>`;
  $('#again').onclick = startEpisode; $('#ti').onclick = titleScreen;
}

/* ═════ 비행 HUD: 체크리스트 · 길 안내선 · 막힘 힌트 (P6-b·c·f) ═════ */
const guideG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
const guide = new THREE.Line(guideG, new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.05, gapSize: 0.04, transparent: true, opacity: 0.85 })); guide.frustumCulled = false; scene.add(guide);
function hint(text) { if (G.hintCd > 0) return; G.hintCd = 12; toast('💡 ' + text); speak('lumi', text); }
function flightHud(dt) {
  const m = EP1.missions[G.mi]; G.hintCd -= dt;
  if (!m || m.type === 'ground' || G.tut >= 0) { if (G.tut < 0) UI.renderChk(chk, null, []); guide.visible = false; return; }
  const cov = sunCover(ship.pos); if (cov >= 0.999) G.totSeen = true;
  const done = m.type === 'umbra' ? [G.penSeen || cov > 0.02, G.totSeen, G.hold >= m.hold] : m.type === 'descend' ? [G.idx >= 1, G.idx >= 2, false] : [G.idx >= 1, G.idx >= 2];
  const extra = m.type === 'umbra' && G.hold > 0 ? `${G.hold.toFixed(1)}/${m.hold}초` : m.type === 'umbra' && !G.totSeen ? `가림 ${Math.round(cov * 100)}%` : '';
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
      else if (G.bestT > 9) { G.bestT = 0; hint(m.type === 'umbra' ? '달과 지구 사이, 진한 그림자 속으로! 🎯 누르고 추진.' : '🎯를 누르고 추진을 꾹 눌러 봐!'); }
    }
  }
}

/* ═════ M4 지표 일식 탐사 (P8 · F10·F11) ═════ */
let GV = null;
const groundCam = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
const yulMk = new THREE.Group(); { yulMk.add(glowSprite('rgba(255,220,140,1)', 'rgba(255,170,60,.6)', 0.28)); const lb = labelSprite('🐾 율이', '#ffd27a', 0.9); lb.position.y = 0.16; yulMk.add(lb); } yulMk.visible = false; scene.add(yulMk);
const tgtMk = glowSprite('rgba(120,255,200,1)', 'rgba(60,200,160,.5)', 0.3); tgtMk.visible = false; scene.add(tgtMk);
const gP = new THREE.Vector3(); const gTargets = {};
const ZONE_ORDER = ['total', 'partial', 'none', 'night'];
function basisAt(P) { const e = new THREE.Vector3(0, 1, 0).cross(P); if (e.lengthSq() < 1e-6) e.set(0, 0, -1); e.normalize(); return { e, n: P.clone().cross(e).normalize() }; }
function toLocal(v, P, b) { return new THREE.Vector3(v.dot(b.e), v.dot(P), -v.dot(b.n)); }
function zoneAt(P) { if (P.dot(L) < -0.03) return 'night'; const c = sunCover(P); return c >= 0.999 ? 'total' : c > 0.03 ? 'partial' : 'none'; }
function umbraCenter() { const M = MOON, b = -2 * M.dot(L), c = M.lengthSq() - 1, disc = b * b - 4 * c; if (disc < 0) return null; const t = (-b - Math.sqrt(disc)) / 2; return M.clone().sub(L.clone().multiplyScalar(t)).normalize(); }
function rotToward(P, dir, ang) { const t = dir.clone().sub(P.clone().multiplyScalar(dir.dot(P))).normalize(); return P.clone().multiplyScalar(Math.cos(ang)).add(t.multiplyScalar(Math.sin(ang))).normalize(); }
const CITIES = [['서울', 37.6, 127], ['도쿄', 35.7, 139.7], ['베이징', 39.9, 116.4], ['상하이', 31.2, 121.5], ['블라디보스토크', 43.1, 131.9], ['타이베이', 25, 121.5], ['마닐라', 14.6, 121], ['방콕', 13.8, 100.5], ['뉴델리', 28.6, 77.2], ['울란바토르', 47.9, 106.9], ['캄차카', 53, 158.7], ['시드니', -33.9, 151.2], ['모스크바', 55.8, 37.6], ['런던', 51.5, -0.1], ['뉴욕', 40.7, -74], ['로스앤젤레스', 34, -118.2], ['하와이', 21.3, -157.8], ['알래스카', 61.2, -149.9], ['북극', 89, 0], ['아이슬란드', 64.1, -21.9], ['카이로', 30, 31.2], ['자카르타', -6.2, 106.8]];
function latLon(P) { const lat = Math.asin(Math.max(-1, Math.min(1, P.y))) / D2R; let lon = Math.atan2(-P.z, P.x) / D2R + 127; lon = ((lon + 540) % 360) - 180; return [lat, lon]; }
function placeName(P) { const [la, lo] = latLon(P); let best = null, bd = 9; CITIES.forEach(c => { const a = la * D2R, b = c[1] * D2R, d = Math.acos(Math.max(-1, Math.min(1, Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos((lo - c[2]) * D2R)))); if (d < bd) { bd = d; best = c[0]; } });
  return { name: bd < 0.2 ? best + ' 근처' : (best ? best + ' 쪽 ' + Math.round(bd * 6371 / 100) * 100 + 'km' : '-'), ll: `${Math.abs(la).toFixed(0)}°${la >= 0 ? 'N' : 'S'} ${Math.abs(lo).toFixed(0)}°${lo >= 0 ? 'E' : 'W'}` }; }
function nextZone() { return ZONE_ORDER.find(k => !G.stamps[k]); }
function groundUI() {
  hud.classList.remove('hide'); dash.classList.remove('hide'); pad.classList.remove('hide'); thr.classList.add('hide'); chk.classList.remove('hide'); compass.classList.remove('hide');
  $('#m-timer').classList.add('hide'); $('#tgt').style.display = 'none'; $('#xhair').classList.add('hide'); dash.innerHTML = DASH_GROUND;
  pipf.querySelector('span').textContent = '🛰 우주 모니터 · 지구 위 내 위치'; }
async function groundMission(m) {
  G.mode = 'ground'; G.running = false; guide.visible = false; clearObjects();
  if (!GV) GV = new GroundView({ yul: A.yul && A.yul.scene, yulAnims: A.yul && A.yul.animations, yulAtlas: A.yulAtlas, nature: NATURE.map(n => A['nat_' + n] && Object.assign(A['nat_' + n], { name: n })).filter(Boolean), fixMats });
  setMoonTheta(0); const Pu = umbraCenter() || new THREE.Vector3(0.8, 0.6, 0).normalize(); const Y = new THREE.Vector3(0, 1, 0);
  gTargets.total = Pu.clone(); gTargets.partial = rotToward(Pu, Y.clone().negate(), 0.28); gTargets.none = rotToward(Pu, Y.clone().negate(), 0.62); gTargets.night = L.clone().negate().add(Y.clone().multiplyScalar(0.35)).normalize();
  gP.copy(Pu); G.stamps = {}; G.zoneT = 0; G.zoneK = ''; G.gq = 0; G.gPhase = 'intro'; G.gT = 0; setMoonTheta(-9);
  groundUI(); showBanner('MISSION 4 / 4', m.name);
  await say([['lumi', '하늘을 봐! 달이 오른쪽에서 태양을 덮어 와.']]);
  await new Promise(r => { G.gIntroDone = r; });
  sfx.total(); await say([['yul', '깜깜해! 별도 보이고 하얀 왕관이…'], ['lumi', '코로나야. 이제 지구 위를 걸어 다니며 하늘이 어떻게 다른지 도장을 모아 보자!']]);
  if (m.pre) await say(m.pre);
  G.gPhase = 'explore'; G.running = true;
}
async function stamp(k) {
  const m = EP1.missions[3], z = m.zones[k]; G.stamps[k] = true; sfx.ok(); toast(`🏅 ${z.n} 도장! (${z.s})`);
  G.running = false; await say([['lumi', z.line]]); G.running = true;
  if (ZONE_ORDER.every(q => G.stamps[q])) { G.gPhase = 'quiz'; G.running = false; await say([['lumi', '네 가지 하늘을 다 봤어! 같은 순간인데 위치마다 이렇게 달라.'], ...(m.pre || [])]); G.gq = 0; askQ(m); }
}
function groundFrame(dt) {
  if (!GV) return;
  const m = EP1.missions[3];
  if (G.gPhase === 'intro') { G.gT += dt; const th = -9 + 9 * Math.min(1, G.gT / 8); setMoonTheta(th); if (G.gT >= 9 && G.gIntroDone) { const d = G.gIntroDone; G.gIntroDone = null; d(); } }
  // 이동
  const b = basisAt(gP); let mv = new THREE.Vector3();
  if (G.gPhase === 'explore' && G.running && !G.talking && !G.overlay) {
    const f = G.gF || new THREE.Vector3(0, 0, -1), r = G.gR || new THREE.Vector3(1, 0, 0);
    mv.addScaledVector(f, input.up - input.down).addScaledVector(r, input.right - input.left);
    const nz = nextZone();
    if (aim && nz) { const tl = toLocal(gTargets[nz].clone().sub(gP), gP, b); tl.y = 0; if (tl.length() > 1e-4) mv.copy(tl.normalize()); }
    if (mv.lengthSq() > 0) { mv.normalize(); const w = b.e.clone().multiplyScalar(mv.x).addScaledVector(b.n, -mv.z); gP.addScaledVector(w, 0.32 * dt).normalize(); mv.multiplyScalar(14); }
    // 도장
    const z = zoneAt(gP); if (z === G.zoneK) G.zoneT += dt; else { G.zoneK = z; G.zoneT = 0; }
    if (!G.stamps[z] && G.zoneT > 1.2) stamp(z);
  }
  // 하늘 상태 (실제 기하)
  const sunL = toLocal(L, gP, b).normalize(), mvec = MOON.clone().sub(gP), md = mvec.length(), moonL = toLocal(mvec.clone().divideScalar(md), gP, b).normalize();
  const night = Math.max(0, Math.min(1, (-sunL.y + 0.02) / 0.1)), cover = gP.dot(L) < -0.03 ? 0 : sunCover(gP);
  const r = GV.update({ sun: sunL, moon: moonL, moonAng: Math.asin(RM / md), cover, night, move: mv, dt, wave: G.gPhase === 'quiz' }, W / H); G.gF = r.forward; G.gR = r.right;
  // HUD
  const pn = placeName(gP), zk = gP.dot(L) < -0.03 ? 'night' : cover >= 0.999 ? 'total' : cover > 0.03 ? 'partial' : 'none';
  const zl = { total: '본그림자', partial: '반그림자', none: '그림자 밖', night: '밤 (태양 없음)' }[zk];
  const el = (id) => document.getElementById(id);
  if (el('g-loc')) { el('g-loc').textContent = pn.name; el('g-ll').textContent = pn.ll; el('d-cov').style.width = (cover * 100) + '%'; el('d-covt').textContent = Math.round(cover * 100) + '%'; el('d-zone').textContent = zl; el('g-st').textContent = ZONE_ORDER.filter(k => G.stamps[k]).length + '/4'; }
  const done = [...ZONE_ORDER.map(k => !!G.stamps[k]), G.gPhase === 'done'];
  UI.renderChk(chk, m, done, G.gPhase === 'quiz' ? `${G.gq + 1}/3` : (G.zoneT > 0.2 && !G.stamps[zk] ? '관측 중…' : ''));
  const nz = nextZone();
  if (nz && G.gPhase === 'explore') { const tl = toLocal(gTargets[nz].clone().sub(gP), gP, b), f = G.gF; const ang = Math.atan2(tl.x, -tl.z) - Math.atan2(f.x, -f.z), dist = Math.acos(Math.max(-1, Math.min(1, gP.dot(gTargets[nz])))) * 6371;
    compass.innerHTML = `<i style="transform:rotate(${ang}rad)">⬆</i><div><b>다음 도장: ${m.zones[nz].n}</b><span>${m.zones[nz].s} · ${dist < 150 ? '거의 다 왔어요!' : Math.round(dist / 100) * 100 + 'km'}</span></div>`;
    compass.classList.remove('hide'); }
  else compass.classList.add('hide');
  // 렌더: 지표 장면 + 우주 모니터
  rpass.scene = GV.scene; rpass.camera = GV.camera; composer.render(); rpass.scene = scene;
  const camP = gP.clone().add(L.clone().multiplyScalar(0.9)).add(new THREE.Vector3(0, 0.35, 0)).normalize().multiplyScalar(3.6);
  groundCam.position.copy(camP); groundCam.lookAt(gP.clone().multiplyScalar(0.55).add(MOON.clone().multiplyScalar(0.12))); groundCam.aspect = pip.w / pip.h; groundCam.updateProjectionMatrix();
  yulMk.position.copy(gP).multiplyScalar(1.03); yulMk.visible = true; tgtMk.visible = !!nz; if (nz) { tgtMk.position.copy(gTargets[nz]).multiplyScalar(1.03); tgtMk.scale.setScalar(0.2 + 0.08 * Math.sin(tAll * 6)); }
  shipM.visible = trail.visible = dust.visible = hero.visible = false; lbMoon.visible = lbEarth.visible = lbSun.visible = true;
  renderer.setScissorTest(true); renderer.setScissor(pip.x, H - pip.y - pip.h, pip.w, pip.h); renderer.setViewport(pip.x, H - pip.y - pip.h, pip.w, pip.h);
  renderer.render(scene, groundCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
  yulMk.visible = tgtMk.visible = false; pipf.classList.remove('hide');
}
function askQ(m) {
  const q = m.qs[G.gq]; qa.classList.remove('hide');
  qa.innerHTML = `<div class="q">🟣 ${q.q}</div><div class="o">${q.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div><div class="h"></div>`;
  qa.querySelectorAll('button').forEach(b => b.onclick = async () => {
    if (G.talking) return; const k = +b.dataset.k;
    if (k === q.a) { b.classList.add('ok'); sfx.ok(); await say([['lumi', '정답! ' + q.why]]); G.gq++; if (G.gq < m.qs.length) askQ(m); else { G.gPhase = 'done'; qa.classList.add('hide'); compass.classList.add('hide'); $('#m-timer').classList.remove('hide'); $('#xhair').classList.remove('hide'); pipf.querySelector('span').textContent = '📡 외부 카메라 · 관측 드론 D-1 (정지)'; episodeClear(); } }
    else { b.classList.add('no'); sfx.bad(); qa.querySelector('.h').innerHTML = '💡 ' + q.hint; await say([['nox', '틀렸다! 하하!'], ['lumi', q.hint]]); qa.querySelectorAll('button').forEach(x => x.classList.remove('no')); }
  });
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
  const m = EP1.missions[G.mi]; if (!m || G.mode !== 'fly') return null;
  if (m.type === 'rings' || m.type === 'descend') { if (m.rings && G.idx < m.rings.length) return { p: V(m.rings[G.idx]), n: `링 ${G.idx + 1}` }; if (m.land) return { p: V(m.land).multiplyScalar(1.03), n: '착륙점' }; }
  if (m.type === 'umbra') return { p: V(m.target), n: '본그림자' };
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
      if (G.lookBack && !(input.left || input.right || input.up || input.down)) { const a = lookAtTarget(MOON); let dy = a.yaw - ship.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ship.yaw += dy * Math.min(1, 2.2 * dt); ship.pitch += (a.pitch - ship.pitch) * Math.min(1, 2.2 * dt); }
      else if (aim && T) { const a = lookAtTarget(T.p); let dy = a.yaw - ship.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); ship.yaw += dy * Math.min(1, 3.2 * dt); ship.pitch += (a.pitch - ship.pitch) * Math.min(1, 3.2 * dt); }
      ship.speed += (input.fwd * 0.55 - input.back * 0.8) * dt; ship.speed -= ship.speed * 0.28 * dt; ship.speed = Math.max(-0.25, Math.min(1.0, ship.speed));
    } else ship.speed *= Math.pow(0.05, dt);
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
  shipCam.fov = 70 + Math.abs(ship.speed) * 14; shipCam.updateProjectionMatrix(); droneCam.updateProjectionMatrix();
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
  const m = EP1.missions[G.mi];
  G.t -= dt; if (G.t < 6 && Math.ceil(G.t) !== G.lastTick) { G.lastTick = Math.ceil(G.t); sfx.tick(); }
  if (G.t <= 0) return missionFail('시간이 다 됐어.');
  const p = ship.pos;
  if (p.length() < 1.02 && !(m.type === 'descend' && G.idx >= (m.rings || []).length)) return missionFail('지구에 너무 가까이 갔어!');
  if (p.distanceTo(MOON) < RM + 0.03) return missionFail('달에 부딪혔어!');
  if (p.length() > 16) return missionFail('궤도를 너무 벗어났어.');
  const cov = sunCover(p);
  if (cov > 0.02 && cov < 0.999 && !G.penSeen && m.type === 'umbra') { G.penSeen = true; toast('🌗 반그림자 진입 — 태양이 일부만 가려졌어요'); }
  if (m.rings && G.idx < m.rings.length) { if (p.distanceTo(V(m.rings[G.idx])) < 0.21) { G.idx++; sfx.ring(); toast(`✅ 링 ${G.idx} 통과!`); if (m.type === 'rings' && G.idx >= m.rings.length) return missionDone(); } }
  if (m.type === 'umbra') {
    if (cov >= 0.999) { if (G.hold === 0) { sfx.total(); toast('🌑 본그림자! 뒤를 돌아 태양 쪽을 봐요 — 3초 유지!'); G.lookBack = true; setAim(false); } G.hold += dt; $('#m-goal').innerHTML = `본그림자 유지 <b>${G.hold.toFixed(1)} / ${m.hold}초</b> — 속도를 줄여요(역추진)`; if (G.hold >= m.hold) return missionDone(); }
    else if (G.hold > 0) { G.hold = 0; $('#m-goal').innerHTML = m.goal; toast('본그림자를 벗어났어요!', true); }
  }
  if (m.type === 'descend') {
    for (const o of G.mines) if (o.s.position.distanceTo(p) < 0.085) return missionFail('녹스의 그림자 기뢰에 닿았어!');
    if (G.idx >= m.rings.length && p.distanceTo(V(m.land).multiplyScalar(1.03)) < 0.15) return missionDone();
  }
}
titleScreen();
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__SQ = { G, ship, input, sunCover, EP1, setAim, THREE, MOON, gP, gTargets, zoneAt, get GV() { return GV; }, get swapped() { return swapped; } };
