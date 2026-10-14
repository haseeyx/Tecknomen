/* ============================================================
   TEKNOMEN — 3D hero
   A section of a ring spinning frame: spinning yarn cops, rings,
   threads to the drafting rollers and a spindle-monitoring LED bar.
   One spindle at a time shows a "yarn break" (red LED, no thread),
   matching the Spindle Monitoring System. Reacts to the mouse.

   ALERT LIGHT: the broken spindle now has a much brighter LED,
   a wide additive halo, an expanding floor ring and a stronger
   point light so it's easy to spot at a glance.
============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ------------------------------------------------------------
   Safe boot: only init once #stage3d actually exists in the DOM.
   This fixes the "const stage = document.getElementById('stage3d');"
   error when the module runs before the element is parsed.
   ------------------------------------------------------------ */
function boot() {
  const el = document.getElementById('stage3d');
  if (el) { init(el); return true; }
  return false;
}

if (!boot()) {
  // DOM not ready yet → wait for it, then retry once.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    // DOM ready but the element still isn't there — retry shortly after,
    // in case the hero markup is injected later.
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
  } catch (e) { return; } // no WebGL: the HUD cards and gradient still show
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

  scene.environmentIntensity = 0.55; // darker studio for the night-shift hero
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rimViolet = new THREE.DirectionalLight(0x7a73ff, 3.2); // blurple edge light from behind-left
  rimViolet.position.set(-7, 4, -5);
  scene.add(rimViolet);
  const rimCyan = new THREE.DirectionalLight(0x5fe3ff, 2.4);   // cyan edge light from behind-right
  rimCyan.position.set(7, 3, -4);
  scene.add(rimCyan);
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x0a2540, 0.45));

  /* ---------- materials ---------- */
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

  /* ---------- geometry (shared) ---------- */
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

  /* frame, rails and rollers */
  const LEN = 6.6;
  addMesh(new THREE.BoxGeometry(LEN, 0.5, 0.7), M.frame, 0, -0.36, -0.05);
  addMesh(new THREE.BoxGeometry(LEN, 0.08, 0.86), M.steel, 0, -0.07, 0);
  addMesh(new THREE.BoxGeometry(LEN, 0.05, 0.12), M.darkSteel, 0, 0.72, -0.36); // ring rail
  addMesh(new THREE.BoxGeometry(LEN, 0.04, 0.08), M.darkSteel, 0, 2.08, -0.2);   // guide rail
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
    const rot = new THREE.Group(); // the part that spins
    const cop = mesh(G.cop, M.yarn);
    const tube = mesh(G.tube, M.tube); tube.position.y = 1.62;
    const hole = mesh(G.hole, M.hole); hole.rotation.x = -Math.PI / 2; hole.position.y = 1.841;
    rot.add(cop, tube, hole);
    const ring = mesh(G.ring, M.steel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.76;
    const guide = mesh(G.guide, M.steel); guide.rotation.x = Math.PI / 2; guide.position.set(0, 2.08, -0.02);

    // yarn from the cop tip up through the guide to the rollers
    const threadGeo = new THREE.CylinderGeometry(0.005, 0.005, 1, 6);
    threadGeo.translate(0, 0.5, 0);
    const thread = new THREE.Mesh(threadGeo, M.thread);
    const from = new THREE.Vector3(0, 1.86, 0), to = new THREE.Vector3(0, 2.68, -0.1);
    thread.position.copy(from);
    thread.scale.y = from.distanceTo(to);
    thread.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());

    // ---- LED + layered glow (much more visible on alert) ----
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x0b3d2c,
      emissive: 0x19d38f,
      emissiveIntensity: 1.4,
    });
    const led = new THREE.Mesh(G.led, ledMat);
    led.position.set(0, 0.05, 0.47);

    // tight core glow sitting right on the LED
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x19d38f,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    }));
    glow.scale.set(0.42, 0.42, 1);
    glow.position.set(0, 0.05, 0.50);

    // wide halo — only lights up on alert
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xff3b1f,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    }));
    halo.scale.set(1.4, 1.4, 1);
    halo.position.set(0, 0.05, 0.52);

    // expanding ring on the base plate under the spindle
    const alertRing = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.28, 48),
      new THREE.MeshBasicMaterial({
        color: 0xff3b1f,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
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
    });
  }

  /* glossy floor + soft contact shadow */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 5, 6), new THREE.MeshStandardMaterial({
    color: 0x0d1d3a, metalness: 0.6, roughness: 0.32, transparent: true, alphaMap: makeFadeTexture(), depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.63;
  machine.add(floor);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 2.4, 3.2), new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.62;
  machine.add(shadow);

  /* drifting fibre dust */
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

  /* alert light that follows the broken spindle (stronger + wider reach) */
  const alertLight = new THREE.PointLight(0xff4a2a, 0, 2.6, 2);
  alertLight.position.set(0, 0.25, 0.7);
  machine.add(alertLight);

  machine.rotation.y = -0.5;

  /* ---------- interaction ---------- */
  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  const hero = stage.closest('.hero') || stage;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

  /* ---------- state ---------- */
  let alertIdx = 3, nextSwitch = 3.2;
  const clock = new THREE.Clock();
  let visible = true, running = false;

  /* ---------- camera ---------- */
  let baseDist = 10;
  function placeCamera(sp) {
    camera.position.set(0.3 - sp * 0.6, 2.3 + sp * 1.4, baseDist * (1 - sp * 0.32));
    camera.lookAt(lookAt);
  }

  /* ---------- sizing ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseDist = 10.2 * Math.max(1, 1.25 / camera.aspect);
    placeCamera(0);
    camera.updateProjectionMatrix();
    if (reduced) render(10);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- animation ---------- */

  function render(t) {
    // spindles grow in on load
    spindles.forEach((s, i) => {
      const k = Math.min(1, Math.max(0, (t - s.born) / 0.9));
      const e = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2); // ease-out-back
      s.group.scale.y = Math.max(0.001, e);

      const broken = i === alertIdx && t > 1.4;
      s.rot.rotation.y = broken ? s.rot.rotation.y : t * s.speed;
      s.thread.visible = !broken;

      // fast pulse while broken, gentle idle breathing otherwise
      const pulse = 0.5 + 0.5 * Math.sin(t * 9);
      const soft  = 0.5 + 0.5 * Math.sin(t * 2 + i);

      s.led.emissive.setHex(broken ? 0xff3b1f : 0x19d38f);
      s.led.emissiveIntensity = broken ? 5.5 + pulse * 4.5 : 1.1 + soft * 0.5;

      s.glow.color.setHex(broken ? 0xff3b1f : 0x19d38f);
      s.glow.opacity = broken ? 0.90 + pulse * 0.10 : 0.42 + soft * 0.16;
      s.glowSprite.scale.setScalar(broken ? 0.85 + pulse * 0.55 : 0.42);

      s.halo.color.setHex(0xff3b1f);
      s.halo.opacity = broken ? 0.35 + pulse * 0.45 : 0;
      s.haloSprite.scale.setScalar(broken ? 1.7 + pulse * 1.3 : 1.4);

      s.alertRing.material.opacity = broken ? 0.45 + pulse * 0.45 : 0;
      s.alertRing.scale.setScalar(broken ? 0.85 + pulse * 0.70 : 1);
    });
    const a = spindles[alertIdx].group.position;
    alertLight.position.x += (a.x - alertLight.position.x) * 0.2;
    alertLight.intensity = t > 1.4 ? 4.5 + Math.sin(t * 9) * 2 : 0;

    // drifting dust
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      p[i * 3 + 1] += 0.0025 + (i % 5) * 0.0004;
      p[i * 3] += Math.sin(t * 0.5 + i) * 0.0012;
      if (p[i * 3 + 1] > 3.3) p[i * 3 + 1] = -0.4;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // camera-ish motion from pointer + idle sway
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    // scroll through the hero (set by motion.js): turn the frame towards you and dolly in
    const sp = window.__tekHero || 0;
    machine.rotation.y = -0.5 + eased.x * 0.22 + Math.sin(t * 0.25) * 0.04 + sp * 0.95;
    machine.rotation.x = eased.y * 0.06 + sp * 0.22;
    machine.position.y = Math.sin(t * 0.8) * 0.03 - sp * 0.35;
    placeCamera(sp);
    roller1.rotation.x = t * 2; roller2.rotation.x = -t * 2.4;

    renderer.render(scene, camera);
  }

  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    const t = clock.getElapsedTime();
    if (t > nextSwitch) {
      let n; do { n = Math.floor(Math.random() * COUNT); } while (n === alertIdx);
      alertIdx = n; nextSwitch = t + 3.2;
      document.dispatchEvent(new CustomEvent('tek:spindle-alert', { detail: { spindle: 100 + n * 7 + Math.floor(Math.random() * 6) } }));
    }
    render(t);
    requestAnimationFrame(loop);
  }

  if (reduced) { render(10); return; }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !running) requestAnimationFrame(loop);
  }).observe(stage);

  /* ---------- helpers ---------- */
  function mesh(g, m) { return new THREE.Mesh(g, m); }
  function addMesh(g, m, x, y, z) { const o = mesh(g, m); o.position.set(x, y, z); machine.add(o); return o; }
}

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
  g.scale(1, 1);
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}