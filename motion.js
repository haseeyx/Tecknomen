/* ============================================================
   TEKNOMEN — motion layer
   - navbar, hero scroll, spotlight, headings, marquee, filter,
     magnetic buttons (unchanged)
   - telemetry dashboard: 4-band efficiency system
       green  : 95-100%
       blue   : 70-80%
       yellow : 40-65%
       red    : 0-20%
     A new band is chosen randomly every ~3s. RPM and tension
     scale with efficiency. The state is broadcast to the 3D
     hero via the 'tek:eff-state' event.
============================================================ */
(function () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const lenis = window.tekLenis || null;

  const run = (fn) => { try { fn(); } catch (err) { console.error('[motion] ' + fn.name + ' failed:', err); } };

  run(navAutoHide);
  run(productFilter);
  run(spotlightBasics);
  run(heroDashboard);
  if (!HAS_GSAP || REDUCED) return;

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  [heroScroll, productHeroScroll, headings, aboutStatement, spotlightPinned, velocityMarquee].forEach(run);
  if (FINE) run(magnetic);
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* navbar */
  function navAutoHide() {
    const bar = document.getElementById('navBar');
    const prog = document.getElementById('navProgress');
    const menu = document.getElementById('nav');
    if (!bar) return;
    let last = window.scrollY, queued = false;
    function update() {
      queued = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const menuOpen = menu && menu.classList.contains('is-open');
      if (!menuOpen && y > 420 && y > last + 4) bar.classList.add('is-hidden');
      else if (y < last - 4 || y <= 420) bar.classList.remove('is-hidden');
      last = y;
    }
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
    update();
  }

  /* hero scroll */
  function heroScroll() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    window.__tekHero = 0;
    ScrollTrigger.create({ ...st, onUpdate: (s) => { window.__tekHero = s.progress; } });
    gsap.to('.hero-text > :not(.hero-dash)', { yPercent: -22, ease: 'none', scrollTrigger: st });
    gsap.to('.hero-text > :not(.hero-dash)', { opacity: 0.15, ease: 'none', scrollTrigger: { ...st, start: 'top+=10% top' } });
    const paths = [[-70, -60, -6], [60, -30, 5], [-40, 60, -4]];
    gsap.utils.toArray('.hero .hud').forEach((h, i) => {
      const [x, y, r] = paths[i % paths.length];
      gsap.to(h, { xPercent: x, yPercent: y, rotate: r, ease: 'none', scrollTrigger: st });
    });
  }

  /* product hero */
  function productHeroScroll() {
    const hero = document.querySelector('.p-hero');
    if (!hero) return;
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.p-hero .pv', { rotateX: 16, rotateY: -12, scale: 0.9, yPercent: 8, transformPerspective: 1200, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: st });
    gsap.to('.p-hero-text', { yPercent: -14, ease: 'none', scrollTrigger: st });
    const paths = [[-50, -50], [50, 40]];
    gsap.utils.toArray('.p-hero .hud').forEach((h, i) => {
      gsap.to(h, { xPercent: paths[i % 2][0], yPercent: paths[i % 2][1], ease: 'none', scrollTrigger: st });
    });
  }

  /* headings */
  function headings() {
    document.querySelectorAll('.sec-head').forEach((head) => {
      const h = head.querySelector('h2');
      if (!h) return;
      const words = splitWords(h);
      const extras = [...head.children].filter((c) => c !== h);
      if (head.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      gsap.set(words, { yPercent: 115, rotate: 4 });
      gsap.set(extras, { opacity: 0, y: 22 });
      let done = false;
      const reveal = () => {
        if (done) return;
        done = true;
        gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, ease: 'expo.out', stagger: 0.045 });
        gsap.to(extras, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.12 });
      };
      ScrollTrigger.create({ trigger: head, start: 'top 86%', once: true, onEnter: reveal });
      failsafe(head, reveal);
    });
  }

  /* about statement */
  function aboutStatement() {
    const el = document.querySelector('.about-statement');
    if (!el) return;
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true },
    });
  }

  /* spotlight */
  function spotlightBasics() {
    const track = document.getElementById('spotTrack');
    if (!track) return;
    const viewport = track.parentElement;
    const cards = [...track.querySelectorAll('.spot-card')];
    const now = document.getElementById('spotNow');
    const bar = document.getElementById('spotBar');
    function layout() {
      const v = viewport.getBoundingClientRect();
      const mid = v.left + v.width / 2;
      let best = 0, bestD = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const d = (r.left + r.width / 2 - mid) / r.width;
        const ad = Math.abs(d);
        if (ad < bestD) { bestD = ad; best = i; }
        if (!REDUCED) {
          card.style.transform = `translateX(${(-d * 6).toFixed(1)}%) translateZ(${(-ad * 300).toFixed(1)}px) rotateY(${Math.max(-38, Math.min(38, d * -22)).toFixed(2)}deg) scale(${(1 - Math.min(ad, 1.5) * 0.1).toFixed(3)})`;
          card.style.opacity = (1 - Math.min(ad * 0.4, 0.65)).toFixed(3);
        }
      });
      cards.forEach((card, i) => card.classList.toggle('is-active', i === best));
      if (now) now.textContent = String(best + 1).padStart(2, '0');
    }
    track.__layout = layout;
    viewport.addEventListener('scroll', () => requestAnimationFrame(() => {
      layout();
      const m = viewport.scrollWidth - viewport.clientWidth;
      if (bar) bar.style.transform = `scaleX(${m > 0 ? viewport.scrollLeft / m : 0})`;
    }), { passive: true });
    window.addEventListener('resize', layout);
    layout();
  }

  /* spotlight pinned */
  function spotlightPinned() {
    const section = document.getElementById('spotlight');
    const track = document.getElementById('spotTrack');
    if (!section || !track || !track.__layout) return;
    const bar = document.getElementById('spotBar');
    ScrollTrigger.matchMedia({
      '(min-width: 900px)': () => {
        section.classList.add('is-pinned');
        const cards = track.querySelectorAll('.spot-card');
        const shift = () => {
          const first = cards[0], last = cards[cards.length - 1];
          return (last.offsetLeft + last.offsetWidth / 2) - (first.offsetLeft + first.offsetWidth / 2);
        };
        gsap.to(track, {
          x: () => -shift(), ease: 'none',
          onUpdate() { track.__layout(); if (bar) bar.style.transform = `scaleX(${this.progress()})`; },
          scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + shift() * 1.1, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        track.__layout();
        return () => { section.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'transform' }); track.__layout(); };
      },
    });
  }

  /* marquee */
  function velocityMarquee() {
    const track = document.querySelector('.marquee-track');
    if (!track) return;
    track.classList.add('is-js');
    const box = track.parentElement;
    let x = 0, skew = 0, slow = false, visible = true;
    box.addEventListener('pointerenter', () => { slow = true; });
    box.addEventListener('pointerleave', () => { slow = false; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(box);
    gsap.ticker.add((time, dt) => {
      if (!visible) return;
      const v = lenis ? lenis.velocity : 0;
      x -= ((slow ? 0.15 : 0.55) + Math.min(Math.abs(v), 60) * 0.12) * (dt / 16.67);
      const half = track.scrollWidth / 2;
      if (half > 0 && -x >= half) x += half;
      skew += (Math.max(-9, Math.min(9, -v * 0.3)) - skew) * 0.1;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
  }

  /* product filter */
  function productFilter() {
    const grid = document.querySelector('#products .bento');
    const buttons = document.querySelectorAll('.filter-btn');
    if (!grid || !buttons.length) return;
    buttons.forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      buttons.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      const cards = [...grid.children];
      const canAnimate = !REDUCED && window.Flip && window.gsap;
      const state = canAnimate ? Flip.getState(cards) : null;
      cards.forEach((c) => {
        const show = f === 'all' ? true : c.dataset.group === f;
        c.classList.toggle('is-out', !show);
        if (show) { c.style.opacity = ''; }
      });
      grid.classList.toggle('is-filtered', f !== 'all');
      if (state) {
        Flip.from(state, {
          duration: 0.7, ease: 'power3.inOut', absolute: true, scale: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, clearProps: 'opacity,transform' }),
          onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3 }),
          onComplete: () => window.ScrollTrigger && ScrollTrigger.refresh(),
        });
      } else if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }
    }));
  }

  /* magnetic */
  function magnetic() {
    document.querySelectorAll('.hero .btn, .p-hero .btn, .nav-cta .btn, .cta-content .btn, .spot-progress, .filter-btn').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.28);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  /* ============================================================
     HERO TELEMETRY DASHBOARD — 4-band efficiency system
     ============================================================ */
  function heroDashboard() {
    const panel    = document.getElementById('heroDash');
    const canvas   = document.getElementById('hdCanvas');
    if (!panel || !canvas) return;

    const ctx        = canvas.getContext('2d');
    const rpmEl      = document.getElementById('hdRpm');
    const effEl      = document.getElementById('hdEff');
    const tenEl      = document.getElementById('hdTen');
    const statusEl   = document.getElementById('hdStatus');
    const statusText = document.getElementById('hdStatusText');
    const spindleEl  = document.getElementById('hdSpindle');
    const matrixEl   = document.getElementById('hdMatrix');
    const toastEl    = document.getElementById('hdToast');
    const rpmWrap    = document.getElementById('hdRpmWrap');
    const effWrap    = document.getElementById('hdEffWrap');
    const tenWrap    = document.getElementById('hdTenWrap');
    const icons      = [...panel.querySelectorAll('.hd-ico')];

    /* ---------- bands ---------- */
    const BANDS = [
      { key: 'green',  min: 95, max: 100, hex: '#19d38f', rgb: '25, 211, 143', label: 'Running',       toast: 'All spindles normal',              cls: 'is-eff-green'  },
      { key: 'blue',   min: 70, max: 80,  hex: '#4a9dff', rgb: '74, 157, 255', label: 'Load reduced',  toast: '⚠ Load reduced — 70–80%',          cls: 'is-eff-blue'   },
      { key: 'yellow', min: 40, max: 65,  hex: '#f5c542', rgb: '245, 197, 66', label: 'Degraded',      toast: '⚠ Efficiency degraded — 40–65%',   cls: 'is-eff-yellow' },
      { key: 'red',    min: 0,  max: 20,  hex: '#ff3b1f', rgb: '255, 59, 31',  label: 'Critical',      toast: '⚠ Critical — spindles stopped',    cls: 'is-eff-red'    },
    ];

    /* ---------- spindle matrix ---------- */
    const DOT_COUNT = 24;
    const dots = [];
    if (matrixEl) {
      for (let i = 0; i < DOT_COUNT; i++) {
        const d = document.createElement('i');
        d.style.animationDelay = (i * 22) + 'ms';
        matrixEl.appendChild(d);
        dots.push(d);
      }
      requestAnimationFrame(() => matrixEl.classList.add('is-ready'));
    }
    let focusDot = Math.floor(Math.random() * DOT_COUNT);
    function moveFocusDot() {
      if (!dots.length) return;
      dots.forEach((d) => d.classList.remove('is-focus'));
      focusDot = Math.floor(Math.random() * dots.length);
      dots[focusDot].classList.add('is-focus');
    }
    moveFocusDot();

    /* ---------- bump + wiggle ---------- */
    function bump(el) {
      if (!el) return;
      el.classList.remove('is-bump');
      void el.offsetWidth;
      el.classList.add('is-bump');
      setTimeout(() => el.classList.remove('is-bump'), 850);
    }
    function bumpAll() { bump(rpmWrap); bump(effWrap); bump(tenWrap); }
    function wiggleIcons() {
      icons.forEach((ic) => {
        ic.classList.remove('is-wiggle');
        void ic.offsetWidth;
        ic.classList.add('is-wiggle');
        setTimeout(() => ic.classList.remove('is-wiggle'), 900);
      });
    }

    /* ---------- state ---------- */
    const POINTS = 64;

    const s = {
      effTarget: 98.6,     // where efficiency is heading
      eff: 98.6,           // displayed value (lerped)
      rpm: 18240,
      ten: 4.12,
      band: BANDS[0],
      nextSwitch: 3.2,     // seconds until next band change
      holdT: 0,
      spindle: 142,
      status: 'Running',
    };

    const data = new Array(POINTS).fill(98.6);

    function pickBand(avoidKey) {
      // pick a random band different from the current one
      let b;
      do { b = BANDS[Math.floor(Math.random() * BANDS.length)]; }
      while (b.key === avoidKey && Math.random() < 0.85);
      return b;
    }

    function applyBand(band) {
      s.band = band;
      // pick a target efficiency inside the band
      s.effTarget = band.min + Math.random() * (band.max - band.min);
      // update the panel class
      BANDS.forEach((b) => panel.classList.toggle(b.cls, b.key === band.key));
      if (statusText) statusText.textContent = band.label;
      if (toastEl) toastEl.textContent = band.toast;
      // wiggle icons + bump values
      wiggleIcons();
      bumpAll();
      // pick a new focus spindle number
      s.spindle = 100 + Math.floor(Math.random() * 900);
      if (spindleEl) spindleEl.textContent = 'Spindle ' + s.spindle;
      // pulse a new matrix dot
      moveFocusDot();
      // tell the 3D hero
      document.dispatchEvent(new CustomEvent('tek:eff-state', { detail: { state: band.key } }));
    }

    /* ---------- canvas ---------- */
    function fit() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const y = Math.round((h * i) / 4) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const stepX = w / (POINTS - 1);
      const toY = (v) => h - (Math.max(0, Math.min(100, v)) / 100) * (h - 8) - 4;

      // dashed nominal line at 98.6
      const nominalY = toY(98.6);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(130,180,255,.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, nominalY);
      ctx.lineTo(w, nominalY);
      ctx.stroke();
      ctx.restore();

      const line = s.band.hex;

      // area fill
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, `rgba(${s.band.rgb}, .40)`);
      grd.addColorStop(1, `rgba(${s.band.rgb}, 0)`);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < POINTS; i++) ctx.lineTo(i * stepX, toY(data[i]));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      // line
      ctx.beginPath();
      for (let i = 0; i < POINTS; i++) {
        const x = i * stepX, y = toY(data[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = line;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // head glow — "the light at the end"
      const lx = (POINTS - 1) * stepX, ly = toY(data[POINTS - 1]);
      const hl = ctx.createRadialGradient(lx - 2, ly, 0, lx - 2, ly, 20);
      hl.addColorStop(0, `rgba(${s.band.rgb}, .85)`);
      hl.addColorStop(0.6, `rgba(${s.band.rgb}, .25)`);
      hl.addColorStop(1, `rgba(${s.band.rgb}, 0)`);
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(lx - 2, ly, 20, 0, Math.PI * 2);
      ctx.fill();

      // solid dot
      ctx.beginPath();
      ctx.arc(lx - 2, ly, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = line;
      ctx.shadowColor = line;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    /* ---------- main loop ---------- */
    let last = performance.now();
    let acc = 0;
    const STEP = 0.36;

    // initial band
    applyBand(BANDS[0]);

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      s.holdT += dt;

      // every ~3s, jump to a new random band
      if (s.holdT >= s.nextSwitch) {
        s.holdT = 0;
        s.nextSwitch = 2.8 + Math.random() * 1.4; // 2.8–4.2s
        applyBand(pickBand(s.band.key));
      }

      // lerp efficiency toward target
      s.eff += (s.effTarget - s.eff) * Math.min(1, dt * 3.5);

      // derive RPM and tension from efficiency
      const e = s.eff;
      // 100% → 18800 rpm ; 0% → 500 rpm
      const rpmTarget = 500 + (e / 100) * 18300;
      // 100% → 4.0 cN ; 0% → 9.0 cN
      const tenTarget = 4.0 + (1 - e / 100) * 5.0;

      s.rpm += (rpmTarget - s.rpm) * Math.min(1, dt * 3.5);
      s.ten += (tenTarget - s.ten) * Math.min(1, dt * 3.5);

      // tiny jitter for realism
      s.rpm += (Math.random() - 0.5) * 30;
      s.ten += (Math.random() - 0.5) * 0.03;

      // occasional small bump
      if (Math.random() < 0.0012) {
        const pick = [rpmWrap, effWrap, tenWrap][Math.floor(Math.random() * 3)];
        bump(pick);
      }

      // paint values
      if (rpmEl) rpmEl.textContent = Math.round(s.rpm).toLocaleString('en-US');
      if (effEl) effEl.textContent = s.eff.toFixed(1);
      if (tenEl) tenEl.textContent = s.ten.toFixed(2);

      // status label
      const statusIcon = statusEl && statusEl.querySelector('svg path');
      if (statusIcon) {
        // change icon: check for green, warning triangle for others
        if (s.band.key === 'green') statusIcon.setAttribute('d', 'M20 6 9 17l-5-5');
        else if (s.band.key === 'yellow') statusIcon.setAttribute('d', 'M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z');
        else if (s.band.key === 'blue') statusIcon.setAttribute('d', 'M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z');
        else statusIcon.setAttribute('d', 'M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01');
      }

      // push sample into sparkline
      while (acc >= STEP) {
        acc -= STEP;
        const jitter = (Math.random() - 0.5) * 1.3;
        data.push(Math.max(0, Math.min(100, s.eff + jitter)));
        if (data.length > POINTS) data.shift();
      }

      draw();
      requestAnimationFrame(frame);
    }

    fit();
    draw();
    requestAnimationFrame(frame);
    new ResizeObserver(() => { fit(); draw(); }).observe(canvas);
  }

  /* helpers */
  function splitWords(el) {
    const words = [];
    (function walk(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
            words.push(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
    return words;
  }

  function failsafe(el, reveal) {
    let seen = 0;
    const id = setInterval(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        seen = seen || performance.now();
        if (performance.now() - seen > 1500) { reveal(); clearInterval(id); }
      } else {
        seen = 0;
      }
    }, 500);
    setTimeout(() => clearInterval(id), 120000);
  }
})();