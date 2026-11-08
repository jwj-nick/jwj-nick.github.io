/* sq-ground.js — 지표 관측 3D 장면 (P8 · F10·F11)
 * 지역 좌표: x=동, y=위(천정), -z=북. 관측자(율이)는 원점, 카메라는 율이 뒤에서 태양 방향을 바라본다.
 * 태양·달은 실제 우주 기하에서 구한 방향·각지름으로 배치 → 가림(부분/개기)이 저절로 정확.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SUN_ANG = 0.02;
function glow(c0, c1, size, opacity = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, c0); g.addColorStop(0.22, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false })); s.scale.set(size, size, 1); return s;
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

export class GroundView {
  constructor({ yul, yulAnims, yulAtlas, nature = [], fixMats }) {
    const S = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
    this.heading = 0; this.moveDir = new THREE.Vector3(0, 0, -1); this.mixer = null; this.acts = {}; this.curAct = '';
    // 하늘 돔
    this.skyU = { uSun: { value: new THREE.Vector3(0, 1, 0) }, uBright: { value: 1 }, uTotal: { value: 0 }, uNight: { value: 0 } };
    S.add(new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: this.skyU,
      vertexShader: `varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uSun; uniform float uBright,uTotal,uNight; varying vec3 vD;
        void main(){ vec3 d=normalize(vD); float h=max(d.y,0.);
          vec3 zen=vec3(.13,.38,.82), hor=vec3(.66,.83,.98); vec3 day=mix(hor,zen,pow(h,.55));
          float sd=max(dot(d,uSun),0.); day+=vec3(1.,.88,.65)*pow(sd,24.)*.55;
          vec3 col=day*uBright;
          float hg=exp(-abs(d.y)*9.); col+=vec3(1.,.5,.2)*hg*uTotal*.6; col+=vec3(.05,.07,.16)*uTotal*(1.-hg);
          vec3 nc=mix(vec3(.012,.018,.05),vec3(.04,.06,.14),exp(-h*4.)); col=mix(col,nc,uNight);
          if(d.y<0.) col*=.55; gl_FragColor=vec4(col,1.); }` })));
    // 별
    { const n = 1400, pos = new Float32Array(n * 3), r = rng(3); for (let i = 0; i < n; i++) { const u = r() * 0.98 + 0.02, a = r() * 6.283, s = Math.sqrt(1 - u * u); pos.set([170 * s * Math.cos(a), 170 * u, 170 * s * Math.sin(a)], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, fog: false })); this.starRot = new THREE.Group(); this.starRot.add(this.stars); S.add(this.starRot); }
    this.moonCv = document.createElement('canvas'); this.moonCv.width = this.moonCv.height = 256; this.moonTex = new THREE.CanvasTexture(this.moonCv);
    this.moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.moonTex, transparent: true, depthWrite: false, fog: false })); this.moonSpr.visible = false; S.add(this.moonSpr);
    this.extra = new THREE.Group(); S.add(this.extra);
    // 태양 · 코로나 · 달
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false })); S.add(this.sun);
    this.sunGlow = glow('rgba(255,245,220,1)', 'rgba(255,190,90,.35)', 70); S.add(this.sunGlow);
    this.corona = glow('rgba(255,255,255,1)', 'rgba(205,220,255,.75)', 34, 0); S.add(this.corona);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0x07080d, fog: false })); S.add(this.moon);
    // 빛
    this.hemi = new THREE.HemisphereLight(0xbfdcff, 0x3b5a2a, 1.1); S.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xfff1dc, 1.8); S.add(this.dir); S.add(this.dir.target);
    this.fill = new THREE.DirectionalLight(0xcfe0ff, 0.8); S.add(this.fill); S.add(this.fill.target); // 카메라 쪽 보조광(역광 보정)
    S.fog = new THREE.Fog(0xa8c8ee, 30, 150);
    // 땅 (언덕 + 색 변화)
    const geo = new THREE.CircleGeometry(150, 120, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), r = rng(9);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      const hgt = d < 8 ? 0 : (Math.sin(x * 0.05) * Math.cos(z * 0.045) * 4 + Math.sin(x * 0.13 + z * 0.09) * 1.4) * Math.min(1, (d - 8) / 25) + (d > 60 ? (d - 60) * 0.18 : 0);
      p.setY(i, hgt); const v = 0.85 + r() * 0.3; col.set([0.24 * v + hgt * 0.004, (0.45 + hgt * 0.01) * v, 0.18 * v], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    this.ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); S.add(this.ground);
    // 자연물 (CC0)
    this.props = new THREE.Group(); S.add(this.props);
    if (nature.length) { const r2 = rng(17);
      for (let i = 0; i < 110; i++) { const g = nature[i % nature.length]; const o = g.scene.clone(true); fixMats && fixMats(o);
        const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()); const tree = /Tree/i.test(g.name || ''), H = tree ? 4 + r2() * 4 : (/Rock/i.test(g.name || '') ? 0.6 + r2() * 0.8 : 0.4 + r2() * 0.6);
        o.scale.setScalar(H / Math.max(0.001, sz.y)); let x, z; do { x = (r2() - 0.5) * 110; z = (r2() - 0.5) * 110; } while (Math.hypot(x, z) < (tree ? 9 : 3));
        o.position.set(x, 0, z); o.rotation.y = r2() * 6.28; this.props.add(o); } }
    // 율이 (3인칭)
    this.yul = new THREE.Group(); S.add(this.yul);
    if (yul) {
      const y = SkeletonUtils.clone(yul); y.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); if (yulAtlas) m.material.map = yulAtlas; if (/pistol|gun/i.test(m.name)) m.visible = false; } }); fixMats && fixMats(y);
      const b = new THREE.Box3().setFromObject(y), h = b.max.y - b.min.y; y.scale.setScalar(1.0 / h); y.position.y = -b.min.y / h; this.yul.add(y);
      const bm = new THREE.MeshStandardMaterial({ color: 0xff4a5e, roughness: 0.45 }), bow = new THREE.Group();
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 10), bm); c1.rotation.z = Math.PI / 2; c1.position.x = -0.08; const c2 = c1.clone(); c2.rotation.z = -Math.PI / 2; c2.position.x = 0.08;
      bow.add(c1, c2, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bm)); bow.scale.setScalar(0.5); bow.position.set(0, 0.98, 0.0); this.yul.add(bow);
      this.mixer = new THREE.AnimationMixer(y); (yulAnims || []).forEach(c => { this.acts[c.name] = this.mixer.clipAction(c); }); this.play('Idle');
    } else { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 8), new THREE.MeshStandardMaterial({ color: 0xd69e54 })); m.position.y = 0.5; this.yul.add(m); }
    this.yul.position.set(0, 0, 0);
  }
  play(name) { if (!this.mixer || this.curAct === name || !this.acts[name]) return; const n = this.acts[name], o = this.acts[this.curAct]; n.reset().fadeIn(0.25).play(); if (o) o.fadeOut(0.25); this.curAct = name; }
  /* st: { sun (지역 단위벡터), moon (지역 단위벡터), moonAng, cover, night(0~1), move(지역 이동 벡터, 초당), dt } */
  update(st, aspect) {
    const { sun, moon, moonAng, cover, night, move, dt } = st;
    const bright = (1 - 0.97 * Math.pow(cover, 2.2)) * (1 - night), total = Math.max(0, (cover - 0.985) / 0.015) * (1 - night);
    this.skyU.uSun.value.copy(sun); this.skyU.uBright.value = Math.max(0.03, bright); this.skyU.uTotal.value = total; this.skyU.uNight.value = night;
    // 화면용 겉보기 크기: 달을 태양보다 4%만 크게 보이도록 각거리·각지름을 같은 비율로 축소(가림 비율은 그대로), 둘 다 1.7배 확대
    const VIS = 1.7, mA = SUN_ANG * 1.04, k = (mA / Math.max(1e-4, moonAng)) * VIS;
    const D = 120; this.sun.position.copy(sun).multiplyScalar(D); this.sun.scale.setScalar(D * Math.tan(SUN_ANG * VIS)); this.sun.visible = sun.y > -0.06;
    this.sunGlow.position.copy(this.sun.position); this.sunGlow.material.opacity = (1 - Math.pow(cover, 3)) * (1 - night) * 0.95; this.sunGlow.visible = this.sun.visible;
    this.corona.position.copy(this.sun.position); this.corona.material.opacity = total; this.corona.visible = this.sun.visible;
    const md = sun.clone().add(moon.clone().sub(sun).multiplyScalar(k)).normalize(), MD = 110;
    this.moon.position.copy(md).multiplyScalar(MD); this.moon.scale.setScalar(MD * Math.tan(mA * VIS)); this.moon.visible = !st.moonDraw && md.y > -0.06 && night < 0.5 && moon.dot(sun) > 0.9;
    if (st.moonDraw) { const c = this.moonCv.getContext('2d'); if (st.moonKey !== this._mk) { c.clearRect(0, 0, 256, 256); st.moonDraw(c, 128, 128, 100); this.moonTex.needsUpdate = true; this._mk = st.moonKey; }
      this.moonSpr.position.copy(moon).multiplyScalar(105); this.moonSpr.scale.setScalar(2 * 105 * Math.tan(0.05) * 1.28); this.moonSpr.visible = moon.y > -0.04; this.moonSpr.material.rotation = st.moonRot || 0;
    } else this.moonSpr.visible = false;
    if (st.starAxis) this.starRot.quaternion.setFromAxisAngle(st.starAxis, st.starAngle || 0); else this.starRot.quaternion.identity();
    this.yul.visible = !st.hideYul;
    this.stars.material.opacity = Math.min(1, night + total * 0.9 + Math.max(0, (cover - 0.9) * 4) * 0.3);
    this.hemi.intensity = 0.25 + 1.0 * bright; this.fill.intensity = 0.25 + 0.75 * Math.max(bright, 0.15); this.dir.intensity = 1.9 * bright * (sun.y > 0 ? 1 : 0); this.dir.position.copy(sun).multiplyScalar(50);
    const fogC = new THREE.Color(0.66, 0.83, 0.98).multiplyScalar(Math.max(0.05, bright)).lerp(new THREE.Color(0.04, 0.05, 0.12), night); if (total > 0) fogC.lerp(new THREE.Color(0.35, 0.18, 0.12), total * 0.6);
    this.scene.fog.color.copy(fogC);
    // 이동: 자연물을 반대로 흘려보내 이동감 (율이는 제자리, 세상이 움직임)
    const sp = move.length();
    if (sp > 0.001) { this.props.children.forEach(o => { o.position.x -= move.x * dt; o.position.z -= move.z * dt; if (o.position.x > 55) o.position.x -= 110; if (o.position.x < -55) o.position.x += 110; if (o.position.z > 55) o.position.z -= 110; if (o.position.z < -55) o.position.z += 110; });
      this.moveDir.copy(move).normalize(); this.play('Run'); } else this.play(st.wave ? 'Wave' : 'Idle');
    // 율이 방향: 움직이면 진행 방향, 멈추면 태양 쪽
    const face = sp > 0.001 ? this.moveDir : new THREE.Vector3(sun.x, 0, sun.z);
    if (face.lengthSq() > 1e-6) { const want = Math.atan2(face.x, face.z); let d = want - this.yul.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yul.rotation.y += d * Math.min(1, dt * 8); }
    if (this.mixer) this.mixer.update(dt);
    // 카메라: 율이 뒤, 태양 방위를 바라봄
    const foc = st.focus || sun, hz = Math.hypot(foc.x, foc.z);
    if (st.heading != null) { let d = st.heading - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, dt * 5); }
    else if (hz > 0.05) { const want = Math.atan2(foc.x, -foc.z); let d = want - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, dt * 3 + (this._init ? 0 : 1)); this._init = true; }
    const f = new THREE.Vector3(Math.sin(this.heading), 0, -Math.cos(this.heading)), right = new THREE.Vector3(-f.z, 0, f.x);
    // 율이 어깨 너머로 하늘을 올려다보는 구도: 카메라를 낮게, 태양이 화면 위 30% 지점에 오도록 기울임
    this.camera.aspect = aspect; this.camera.fov = aspect < 1 ? 92 : 76; this.camera.updateProjectionMatrix();
    const fovV = this.camera.fov * Math.PI / 180, alt = Math.asin(Math.max(-1, Math.min(1, foc.y)));
    const pitch = st.pitch != null ? st.pitch : (st.focus ? Math.max(0.06, Math.min(1.1, alt - 0.06 * fovV)) : night > 0.5 ? 0.1 : Math.max(0.06, Math.min(0.95, alt - 0.2 * fovV)));
    this.camera.position.copy(f).multiplyScalar(-3.1).add(right.clone().multiplyScalar(1.0)).setY(0.42);
    const tgt = f.clone().multiplyScalar(Math.cos(pitch)).setY(Math.sin(pitch)).multiplyScalar(30).add(this.camera.position);
    this.camera.lookAt(tgt);
    this.fill.position.copy(this.camera.position).add(new THREE.Vector3(0, 2, 0)); this.fill.target.position.set(0, 0.6, 0);
    return { forward: f, right };
  }
}
