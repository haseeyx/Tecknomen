/* ============================================================
   TEKNOMEN — 3D hero
   A section of a ring spinning frame. The spindle LEDs and the
   spin rate follow the efficiency band dispatched by the
   dashboard via the 'tek:eff-state' event:

     green  → 95-100% : full speed, green LEDs
     blue   → 70-80%  : medium speed, blue LEDs
     yellow → 40-65%  : slow speed, yellow LEDs
     red    → 0-20%   : near stop, red LEDs, thread hidden on
                        the focus spindle

   One spindle is chosen as the "focus" and gets a bigger glow
   so the eye has somewhere to land.

   Safe boot: init only runs once #stage3d exists in the DOM.
============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function boot() {
  const el = document.getElementById('stage3d');
  if (el) { init(el); return true; }
  return false;
}
if (!boot()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    let tries = 0;
    const iv = setInterval(() => {
      if (boot() || ++tries > 20) clearInterval(iv);
    }, 100);
  }
}

function init(stage) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, 1.05, 0);

  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rimViolet = new THREE.DirectionalLight(0x7a73ff, 3.2);
  rimViolet.position.set(-7, 4, -5);
  scene.add(rimViolet);
  const rimCyan = new THREE.DirectionalLight(0x5fe3ff, 2.4);
  rimCyan.position.set(7, 3, -4);
  scene.add(rimCyan);
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x0a2540, 0.45));

  /* materials */
  const yarnTex = makeYarnTexture();
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xd3d8dc, metalness: 0.9, roughness: 0.28 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x8a9399, metalness: 0.85, roughness: 0.4 }),
    frame: new THREE.MeshPhysicalMaterial({ color: 0x2251d0, metalness: 0.2, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    whorl: new THREE.MeshPhysicalMaterial({ color: 0x1f46bf, metalness: 0.1, roughness: 0.3, clearcoat: 1 }),
    yarn: new THREE.MeshStandardMaterial({ color: 0xf3eee3, map: yarnTex, roughness: 0.95, metalness: 0 }),
    tube: new THREE.MeshPhysicalMaterial({ color: 0xe3352b, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x3a0d0a }),
    plate: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, roughness: 0.25, transmission: 0.35, thickness: 0.2, transparent: true, opacity: 0.92 }),
    thread: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
    sensorBar: new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.15, transmission: 0.6, thickness: 0.3, transparent: true, opacity: 0.7 }),
  };

  const G = {
    whorl: new THREE.CylinderGeometry(0.12, 0.14, 0.2, 40),
    collar: new THREE.CylinderGeometry(0.16, 0.16, 0.04, 40),
    cop: new THREE.LatheGeometry([
      new THREE.Vector2(0.075, 0.27), new THREE.Vector2(0.17, 0.31), new THREE.Vector2(0.205, 0.42),
      new THREE.Vector2(0.21, 0.6), new THREE.Vector2(0.19, 0.92), new THREE.Vector2(0.15, 1.2),
      new THREE.Vector2(0.11, 1.38), new THREE.Vector2(0.082, 1.46),
    ], 48),
    tube: new THREE.CylinderGeometry(0.068, 0.078, 0.44, 32),
    hole: new THREE.CircleGeometry(0.045, 24),
    ring: new THREE.TorusGeometry(0.255, 0.013, 12, 64),
    plate: new THREE.BoxGeometry(0.018, 0.95, 0.5),
    led: new THREE.BoxGeometry(0.07, 0.035, 0.03),
    guide: new THREE.TorusGeometry(0.03, 0.006, 8, 24),
  };

  const glowTex = makeGlowTexture();
  const machine = new THREE.Group();
  scene.add(machine);

  const LEN = 6.6;
  addMesh(new THREE.BoxGeometry(LEN, 0.5, 0.7), M.frame, 0, -0.36, -0.05);
  addMesh(new THREE.BoxGeometry(LEN, 0.08, 0.86), M.steel, 0, -0.07, 0);
  addMesh(new THREE.BoxGeometry(LEN, 0.05, 0.12), M.darkSteel, 0, 0.72, -0.36);
  addMesh(new THREE.BoxGeometry(LEN, 0.04, 0.08), M.darkSteel, 0, 2.08, -0.2);
  const roller1 = addMesh(new THREE.CylinderGeometry(0.075, 0.075, LEN, 32), M.steel, 0, 2.72, -0.12);
  roller1.rotation.z = Math.PI / 2;
  const roller2 = addMesh(new THREE.CylinderGeometry(0.06, 0.06, LEN, 32), M.darkSteel, 0, 2.8, 0.06);
  roller2.rotation.z = Math.PI / 2;
  const sensor = addMesh(new THREE.CylinderGeometry(0.05, 0.05, LEN, 24), M.sensorBar, 0, 0.05, 0.42);
  sensor.rotation.z = Math.PI / 2;

  /* spindles */
  const COUNT = 10, GAP = 0.62;
  const spindles = [];
  for (let i = 0; i < COUNT; i++) {
    const x = (i - (COUNT - 1) / 2) * GAP;
    const s = new THREE.Group();
    s.position.set(x, 0, 0);

    const whorl = mesh(G.whorl, M.whorl); whorl.position.y = 0.1;
    const collar = mesh(G.collar, M.steel); collar.position.y = 0.22;
    const rot = new THREE.Group();
    const cop = mesh(G.cop, M.yarn);
    const tube = mesh(G.tube, M.tube); tube.position.y = 1.62;
    const hole = mesh(G.hole, M.hole); hole.rotation.x = -Math.PI / 2; hole.position.y = 1.841;
    rot.add(cop, tube, hole);
    const ring = mesh(G.ring, M.steel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.76;
    const guide = mesh(G.guide, M.steel); guide.rotation.x = Math.PI / 2; guide.position.set(0, 2.08, -0.02);

    const threadGeo = new THREE.CylinderGeometry(0.005, 0.005, 1, 6);
    threadGeo.translate(0, 0.5, 0);
    const thread = new THREE.Mesh(threadGeo, M.thread);
    const from = new THREE.Vector3(0, 1.86, 0), to = new THREE.Vector3(0, 2.68, -0.1);
    thread.position.copy(from);
    thread.scale.y = from.distanceTo(to);
    thread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());

    const ledMat = new THREE.MeshStandardMaterial({ color: 0x0b3d2c, emissive: 0x19d38f, emissiveIntensity: 1.4 });
    const led = new THREE.Mesh(G.led, ledMat); led.position.set(0, 0.05, 0.47);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x19d38f, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    glow.scale.set(0.42, 0.42, 1); glow.position.set(0, 0.05, 0.50);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    halo.scale.set(1.4, 1.4, 1); halo.position.set(0, 0.05, 0.52);

    const alertRing = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.28, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    alertRing.rotation.x = -Math.PI / 2;
    alertRing.position.y = 0.015;

    s.add(whorl, collar, rot, ring, guide, thread, led, glow, halo, alertRing);
    if (i < COUNT - 1) {
      const plate = mesh(G.plate, M.plate);
      plate.position.set(GAP / 2, 1.18, -0.05);
      s.add(plate);
    }
    s.scale.set(1, 0.001, 1);
    machine.add(s);
    spindles.push({
      group: s, rot, thread,
      led: ledMat,
      glow: glow.material, glowSprite: glow,
      halo: halo.material, haloSprite: halo,
      alertRing,
      speed: 7 + Math.random() * 1.5,
      born: 0.15 + i * 0.07,
      angle: 0,
      currentRate: 7,
    });
  }

  /* floor + shadow */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 5, 6), new THREE.MeshStandardMaterial({
    color: 0x0d1d3a, metalness: 0.6, roughness: 0.32, transparent: true, alphaMap: makeFadeTexture(), depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.63;
  machine.add(floor);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 2.4, 3.2), new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.62;
  machine.add(shadow);

  /* dust */
  const DUST = 220;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 8;
    dustPos[i * 3 + 1] = Math.random() * 3.6 - 0.4;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xbfeeff, size: 0.024, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  machine.add(dust);

  /* focus point light */
  const focusLight = new THREE.PointLight(0x19d38f, 0, 2.6, 2);
  focusLight.position.set(0, 0.25, 0.7);
  machine.add(focusLight);

  machine.rotation.y = -0.5;

  /* pointer */
  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  const hero = stage.closest('.hero') || stage;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

  /* state */
  const STATES = {
    green:  { color: new THREE.Color(0x19d38f), speedMul: 1.00, thread: true  },
    blue:   { color: new THREE.Color(0x4a9dff), speedMul: 0.55, thread: true  },
    yellow: { color: new THREE.Color(0xf5c542), speedMul: 0.25, thread: true  },
    red:    { color: new THREE.Color(0xff3b1f), speedMul: 0.04, thread: false },
  };
  let state = 'green';
  let focusIdx = 3;
  let nextFocus = 4;

  document.addEventListener('tek:eff-state', (e) => {
    const s = e && e.detail && e.detail.state;
    if (STATES[s]) state = s;
  });

  const clock = new THREE.Clock();
  let visible = true, running = false;
  let lastT = 0;

  let baseDist = 10;
  function placeCamera(sp) {
    camera.position.set(0.3 - sp * 0.6, 2.3 + sp * 1.4, baseDist * (1 - sp * 0.32));
    camera.lookAt(lookAt);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseDist = 10.2 * Math.max(1, 1.25 / camera.aspect);
    placeCamera(0);
    camera.updateProjectionMatrix();
    if (reduced) render(10, 0.016);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  function render(t, dt) {
    const S = STATES[state];

    spindles.forEach((s, i) => {
      const k = Math.min(1, Math.max(0, (t - s.born) / 0.9));
      const e = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
      s.group.scale.y = Math.max(0.001, e);

      // smooth the spin rate for organic transitions
      const target = s.speed * S.speedMul;
      s.currentRate += (target - s.currentRate) * 0.06;
      s.angle += s.currentRate * dt;
      s.rot.rotation.y = s.angle;

      const isFocus = i === focusIdx;

      // thread hidden only in red state, on the focus spindle
      s.thread.visible = !(state === 'red' && isFocus);

      // pulses
      const soft = 0.5 + 0.5 * Math.sin(t * 2 + i);
      const fast = 0.5 + 0.5 * Math.sin(t * 9);

      let intensity, glowOp, glowScale, haloOp, haloScale, ringOp, ringScale;
      if (state === 'green') {
        intensity = 1.2 + soft * 0.5;
        glowOp = 0.44 + soft * 0.16;
        glowScale = isFocus ? 0.60 + soft * 0.10 : 0.42;
        haloOp = isFocus ? 0.10 : 0;
        haloScale = isFocus ? 1.1 : 1.4;
        ringOp = 0;
        ringScale = 1;
      } else if (state === 'blue') {
        intensity = 2.4 + soft * 1.2;
        glowOp = 0.62 + soft * 0.18;
        glowScale = isFocus ? 0.85 + soft * 0.15 : 0.62;
        haloOp = isFocus ? 0.18 + soft * 0.10 : 0.05;
        haloScale = isFocus ? 1.4 : 1.2;
        ringOp = isFocus ? 0.20 + soft * 0.12 : 0;
        ringScale = 0.85;
      } else if (state === 'yellow') {
        intensity = 3.6 + soft * 1.8;
        glowOp = 0.78 + soft * 0.16;
        glowScale = isFocus ? 1.0 + soft * 0.20 : 0.78;
        haloOp = isFocus ? 0.30 + soft * 0.20 : 0.10;
        haloScale = isFocus ? 1.7 : 1.4;
        ringOp = isFocus ? 0.32 + soft * 0.18 : 0;
        ringScale = 1.0;
      } else { // red
        intensity = 5.5 + fast * 4.5;
        glowOp = 0.90 + fast * 0.10;
        glowScale = isFocus ? 0.95 + fast * 0.55 : 0.75 + fast * 0.20;
        haloOp = isFocus ? 0.40 + fast * 0.45 : 0.15 + fast * 0.12;
        haloScale = isFocus ? 2.0 + fast * 1.3 : 1.4 + fast * 0.5;
        ringOp = isFocus ? 0.45 + fast * 0.45 : 0.18 + fast * 0.15;
        ringScale = isFocus ? 0.85 + fast * 0.70 : 0.75;
      }

      s.led.emissive.copy(S.color);
      s.led.emissiveIntensity = intensity;

      s.glow.color.copy(S.color);
      s.glow.opacity = glowOp;
      s.glowSprite.scale.setScalar(glowScale);

      s.halo.color.copy(S.color);
      s.halo.opacity = haloOp;
      s.haloSprite.scale.setScalar(haloScale);

      s.alertRing.material.color.copy(S.color);
      s.alertRing.material.opacity = ringOp;
      s.alertRing.scale.setScalar(ringScale);
    });

    // focus light follows the focus spindle
    const focus = spindles[focusIdx];
    focusLight.position.x += (focus.group.position.x - focusLight.position.x) * 0.2;
    focusLight.color.copy(S.color);
    if (state === 'green') {
      focusLight.intensity = 0.6;
    } else if (state === 'blue') {
      focusLight.intensity = 1.2 + Math.sin(t * 3) * 0.4;
    } else if (state === 'yellow') {
      focusLight.intensity = 2.0 + Math.sin(t * 4) * 0.7;
    } else {
      focusLight.intensity = 4.5 + Math.sin(t * 9) * 2;
    }

    // dust
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      p[i * 3 + 1] += 0.0025 + (i % 5) * 0.0004;
      p[i * 3] += Math.sin(t * 0.5 + i) * 0.0012;
      if (p[i * 3 + 1] > 3.3) p[i * 3 + 1] = -0.4;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // camera
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    const sp = window.__tekHero || 0;
    machine.rotation.y = -0.5 + eased.x * 0.22 + Math.sin(t * 0.25) * 0.04 + sp * 0.95;
    machine.rotation.x = eased.y * 0.06 + sp * 0.22;
    machine.position.y = Math.sin(t * 0.8) * 0.03 - sp * 0.35;
    placeCamera(sp);

    // rollers slow down with the state
    const rollMul = STATES[state].speedMul;
    roller1.rotation.x += dt * 2 * rollMul * 60;
    roller2.rotation.x -= dt * 2.4 * rollMul * 60;

    renderer.render(scene, camera);
  }

  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - lastT);
    lastT = t;

    // pick a new focus spindle every few seconds
    if (t > nextFocus) {
      let n; do { n = Math.floor(Math.random() * COUNT); } while (n === focusIdx);
      focusIdx = n;
      nextFocus = t + 3 + Math.random() * 3;
    }

    render(t, dt);
    requestAnimationFrame(loop);
  }

  if (reduced) { render(10, 0.016); return; }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !running) requestAnimationFrame(loop);
  }).observe(stage);

  function mesh(g, m) { return new THREE.Mesh(g, m); }
  function addMesh(g, m, x, y, z) { const o = mesh(g, m); o.position.set(x, y, z); machine.add(o); return o; }
}

/* texture helpers */
function makeYarnTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f3eee3'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(120,100,70,.22)'; g.lineWidth = 2;
  for (let i = -256; i < 512; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 140, 256); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
  for (let i = -256; i < 512; i += 14) { g.beginPath(); g.moveTo(i + 4, 0); g.lineTo(i + 144, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeFadeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, '#fff');
  grd.addColorStop(0.55, '#777');
  grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 64, 4, 128, 64, 128);
  grd.addColorStop(0, 'rgba(5,17,13,.55)');
  grd.addColorStop(1, 'rgba(5,17,13,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}