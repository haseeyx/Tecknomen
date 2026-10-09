/* ============================================================
   TEKNOMEN — "How we work" 3D
   A yarn cop wound from glowing particles. As the section scrolls
   into view the yarn winds onto the bobbin, layer by layer, and
   a loose thread trails off the top. Follows the mouse lightly.
============================================================ */
import * as THREE from 'three';

const stage = document.getElementById('bobbin3d');
if (stage) init(stage);

function init(stage) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const group = new THREE.Group();
  group.rotation.z = -1.15; // lying on its side, like a cop just doffed off the spindle
  scene.add(group);

  /* ---------- yarn: points along a helix that follows the cop profile ---------- */
  // radius of the yarn body at height y (0 = base, 1 = tip)
  const profile = (y) => (y < 0.12 ? 0.55 + y * 2.2 : 0.82 - Math.pow((y - 0.12) / 0.88, 1.35) * 0.62);
  const H = 3.2, TURNS = 150, PER_TURN = 64, LAYERS = 3;
  const count = TURNS * PER_TURN * LAYERS;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cBase = new THREE.Color(0x635bff), cTip = new THREE.Color(0x80e9ff), tmp = new THREE.Color();
  let k = 0;
  for (let layer = 0; layer < LAYERS; layer++) {
    for (let i = 0; i < TURNS * PER_TURN; i++) {
      const f = i / (TURNS * PER_TURN);
      // wind up and back down, like a real ring-frame build
      const y = layer % 2 === 0 ? f : 1 - f;
      const a = (i / PER_TURN) * Math.PI * 2 + layer * 0.7;
      const r = profile(y) * (0.9 + layer * 0.05) + (Math.random() - 0.5) * 0.03;
      pos[k * 3] = Math.cos(a) * r;
      pos[k * 3 + 1] = (y - 0.5) * H;
      pos[k * 3 + 2] = Math.sin(a) * r;
      tmp.copy(cBase).lerp(cTip, y);
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
      k++;
    }
  }
  const yarnGeo = new THREE.BufferGeometry();
  yarnGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  yarnGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const yarn = new THREE.Points(yarnGeo, new THREE.PointsMaterial({
    size: 0.022, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, map: dotTexture(), alphaTest: 0.01,
  }));
  group.add(yarn);

  /* tube the yarn is wound on (shows through the gaps) */
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.2, H + 0.7, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x635bff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  tube.position.y = 0.2;
  group.add(tube);

  /* loose thread trailing off the tip */
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, H / 2, 0), new THREE.Vector3(0.5, H / 2 + 0.6, 0.3),
    new THREE.Vector3(-0.4, H / 2 + 1.4, -0.2), new THREE.Vector3(0.6, H / 2 + 2.4, 0.2),
  ]);
  const thread = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, 0.008, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x80e9ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  );
  group.add(thread);

  /* ---------- sizing ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduced) draw(1, 0);
  }

  /* ---------- scroll progress through the section ---------- */
  const section = stage.closest('section') || stage;
  function progress() {
    const r = section.getBoundingClientRect(), vh = window.innerHeight;
    return Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
  }

  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function draw(p, t) {
    const visibleCount = Math.floor(count * Math.min(1, p * 1.15));
    yarnGeo.setDrawRange(0, Math.max(1, visibleCount));
    thread.visible = p > 0.85;
    eased.x += (pointer.x - eased.x) * 0.04;
    eased.y += (pointer.y - eased.y) * 0.04;
    group.rotation.y = t * 0.35 + p * Math.PI * 1.5 + eased.x * 0.6;
    group.rotation.x = eased.y * 0.3;
    group.position.y = Math.sin(t * 0.7) * 0.06;
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(stage);
  resize();
  if (reduced) { draw(1, 0); return; }

  const clock = new THREE.Clock();
  let visible = false, running = false;
  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    draw(progress(), clock.getElapsedTime());
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !running) requestAnimationFrame(loop);
  }).observe(stage);
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
