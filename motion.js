/* ============================================================
   TEKNOMEN — motion layer (loads after script.js)
   Navbar auto-hide, hero 3D scroll, pinned product coverflow,
   heading reveals, logo marquee, product filter, magnetic
   buttons, and the upgraded three-state telemetry dashboard.

   Dashboard states:
     run   → green,  values nominal, graph green
     break → red,    values drop to zero, graph red
     stuck → blue,   RPM collapses, tension spikes, graph blue

   The state is driven by 'tek:spindle-alert' dispatched by
   hero3d.js. The dashboard also runs its own random cycles so
   it stays alive even if WebGL is unavailable.
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

  /* ---------- navbar ---------- */
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

  /* ---------- hero scroll ---------- */
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

  /* ---------- product hero ---------- */
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

  /* ---------- headings ---------- */
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

  /* ---------- about statement ---------- */
  function aboutStatement() {
    const el = document.querySelector('.about-statement');
    if (!el) return;
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true },
    });
  }

  /* ---------- spotlight basics ---------- */
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

  /* ---------- spotlight pinned ---------- */
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

  /* ---------- marquee ---------- */
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

  /* ---------- product filter ---------- */
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

  /* ---------- magnetic ---------- */
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
     HERO TELEMETRY DASHBOARD — three-state version
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
      // trigger cascade after a beat
      requestAnimationFrame(() => matrixEl.classList.add('is-ready'));
    }
    let dotTimer = 0;
    function flashDot(kind) {
      if (!dots.length) return;
      // clear previous
      dots.forEach((d) => d.classList.remove('is-broken', 'is-stuck'));
      const idx = Math.floor(Math.random() * dots.length);
      const cls = kind === 'stuck' ? 'is-stuck' : 'is-broken';
      dots[idx].classList.add(cls);
      clearTimeout(dotTimer);
      dotTimer = setTimeout(() => dots[idx] && dots[idx].classList.remove(cls), 2800);
    }

    /* ---------- bump + icon wiggle ---------- */
    function bump(el) {
      if (!el) return;
      el.classList.remove('is-bump');
      void el.offsetWidth;
      el.classList.add('is-bump');
      setTimeout(() => el.classList.remove('is-bump'), 800);
    }
    function wiggleIcons() {
      icons.forEach((ic) => {
        ic.classList.remove('is-wiggle');
        void ic.offsetWidth;
        ic.classList.add('is-wiggle');
        setTimeout(() => ic.classList.remove('is-wiggle'), 900);
      });
    }

    /* ---------- state machine ---------- */
    const POINTS = 64;
    const RPM_IDLE = 18240, EFF_IDLE = 98.6, TEN_IDLE = 4.12, NOMINAL = 98.6;

    // stuck-state targets
    const RPM_STUCK = 1400, EFF_STUCK = 42, TEN_STUCK = 6.8;

    const data = new Array(POINTS).fill(EFF_IDLE);

    const s = {
      rpm: RPM_IDLE, eff: EFF_IDLE, ten: TEN_IDLE,
      spindle: 142,
      phase: 'run',          // 'run' | 'break' | 'stuck' | 'recover'
      recoveryTo: RPM_IDLE,
      phaseT: 0,
      breakFor: 2.4,
      nextBreak: 5 + Math.random() * 5,
      lastAlertAt: -99,
      status: 'Running',
      lastKind: 'break',
    };

    function fit() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function currentColor() {
      if (s.phase === 'break') return '#ff3b1f';
      if (s.phase === 'stuck') return '#4a9dff';
      if (s.phase === 'recover') return '#f5c542';
      return '#19d38f';
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

      // dashed nominal line
      const nominalY = toY(NOMINAL);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(130,180,255,.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, nominalY);
      ctx.lineTo(w, nominalY);
      ctx.stroke();
      ctx.restore();

      const alert = s.phase !== 'run';
      const line  = currentColor();

      // area
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      if (s.phase === 'break') {
        grd.addColorStop(0, 'rgba(255,59,31,.42)');
        grd.addColorStop(1, 'rgba(255,59,31,0)');
      } else if (s.phase === 'stuck') {
        grd.addColorStop(0, 'rgba(74,157,255,.42)');
        grd.addColorStop(1, 'rgba(74,157,255,0)');
      } else if (s.phase === 'recover') {
        grd.addColorStop(0, 'rgba(245,197,66,.38)');
        grd.addColorStop(1, 'rgba(245,197,66,0)');
      } else {
        grd.addColorStop(0, 'rgba(25,211,143,.42)');
        grd.addColorStop(1, 'rgba(25,211,143,0)');
      }
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
      ctx.shadowBlur = alert ? 12 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // head dot + end-of-line light
      const lx = (POINTS - 1) * stepX, ly = toY(data[POINTS - 1]);
      // outer glow
      const hl = ctx.createRadialGradient(lx - 2, ly, 0, lx - 2, ly, 18);
      hl.addColorStop(0, line);
      hl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(lx - 2, ly, 18, 0, Math.PI * 2);
      ctx.fill();
      // solid dot
      ctx.beginPath();
      ctx.arc(lx - 2, ly, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = line;
      ctx.shadowColor = line;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    /* ---------- react to 3D alerts ---------- */
    document.addEventListener('tek:spindle-alert', (e) => {
      const now = performance.now() / 1000;
      if (e && e.detail && e.detail.spindle && spindleEl) {
        s.spindle = e.detail.spindle;
        spindleEl.textContent = 'Spindle ' + s.spindle;
      }
      // ignore if we just triggered one
      if (now - s.lastAlertAt < 3) return;
      const kind = (e && e.detail && e.detail.type === 'stuck') ? 'stuck' : 'break';
      s.lastKind = kind;
      s.phase = kind;
      s.phaseT = 0;
      s.breakFor = kind === 'stuck' ? 2.8 + Math.random() * 1.2 : 2.2 + Math.random() * 1.4;
      s.lastAlertAt = now;
      flashDot(kind);
      wiggleIcons();
      if (toastEl) {
        toastEl.textContent = kind === 'stuck' ? '⚠ Spindle stuck — torque high' : '⚠ Yarn break detected';
      }
    });

    /* ---------- main loop ---------- */
    let last = performance.now();
    let acc = 0;
    const STEP = 0.36;

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      s.phaseT += dt;

      const prevPhase = s.phase;

      if (s.phase === 'run') {
        s.rpm += (RPM_IDLE - s.rpm) * 0.18 + (Math.random() - 0.5) * 90;
        s.rpm = Math.max(17700, Math.min(18700, s.rpm));
        s.eff += (EFF_IDLE - s.eff) * 0.14 + (Math.random() - 0.5) * 0.7;
        s.eff = Math.max(94.5, Math.min(99.7, s.eff));
        s.ten += (TEN_IDLE - s.ten) * 0.18 + (Math.random() - 0.5) * 0.06;
        s.ten = Math.max(3.5, Math.min(4.7, s.ten));
        s.status = 'Running';

        // self-trigger a new alert even if 3D is silent (e.g. no WebGL)
        if (s.phaseT > s.nextBreak) {
          const kind = Math.random() < 0.55 ? 'break' : 'stuck';
          s.lastKind = kind;
          s.phase = kind;
          s.phaseT = 0;
          s.breakFor = kind === 'stuck' ? 2.8 + Math.random() * 1.2 : 2.2 + Math.random() * 1.4;
          s.spindle = 100 + Math.floor(Math.random() * 900);
          s.lastAlertAt = performance.now() / 1000;
          if (spindleEl) spindleEl.textContent = 'Spindle ' + s.spindle;
          flashDot(kind);
          wiggleIcons();
          if (toastEl) {
            toastEl.textContent = kind === 'stuck' ? '⚠ Spindle stuck — torque high' : '⚠ Yarn break detected';
          }
        }
      } else if (s.phase === 'break') {
        s.rpm *= 0.80; s.eff *= 0.80; s.ten *= 0.78;
        if (s.rpm < 40)  s.rpm = 0;
        if (s.eff < 0.6) s.eff = 0;
        if (s.ten < 0.06) s.ten = 0;
        s.status = 'Yarn break';
        if (s.phaseT > s.breakFor) {
          s.phase = 'recover';
          s.phaseT = 0;
          s.recoveryTo = RPM_IDLE;
        }
      } else if (s.phase === 'stuck') {
        // slow collapse to the stuck targets; tension rises
        s.rpm += (RPM_STUCK - s.rpm) * 0.10;
        s.eff += (EFF_STUCK - s.eff) * 0.10;
        s.ten += (TEN_STUCK - s.ten) * 0.10;
        // small jitter to feel alive
        s.rpm += (Math.random() - 0.5) * 60;
        s.ten += (Math.random() - 0.5) * 0.08;
        s.status = 'Spindle stuck';
        if (s.phaseT > s.breakFor) {
          s.phase = 'recover';
          s.phaseT = 0;
          s.recoveryTo = RPM_IDLE;
        }
      } else {
        // recover
        s.rpm += (RPM_IDLE - s.rpm) * 0.07;
        s.eff += (EFF_IDLE - s.eff) * 0.07;
        s.ten += (TEN_IDLE - s.ten) * 0.07;
        s.status = 'Recovering';
        if (s.eff > 97.6) {
          s.phase = 'run';
          s.phaseT = 0;
          s.nextBreak = 6 + Math.random() * 6;
        }
      }

      // state-change animation triggers
      if (s.phase !== prevPhase) {
        bump(rpmWrap); bump(effWrap); bump(tenWrap);
      }
      if (Math.random() < 0.0012) {
        const pick = [rpmWrap, effWrap, tenWrap][Math.floor(Math.random() * 3)];
        bump(pick);
      }

      // update UI
      if (rpmEl) rpmEl.textContent = Math.round(s.rpm).toLocaleString('en-US');
      if (effEl) effEl.textContent = s.eff.toFixed(1);
      if (tenEl) tenEl.textContent = s.ten.toFixed(2);
      if (statusText) statusText.textContent = s.status;

      const isBreak = s.phase === 'break';
      const isStuck = s.phase === 'stuck';
      panel.classList.toggle('is-break', isBreak);
      panel.classList.toggle('is-stuck', isStuck);
      if (statusEl) {
        statusEl.classList.toggle('is-break', isBreak);
        statusEl.classList.toggle('is-stuck', isStuck);
      }

      // push a sample into the sparkline
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

  /* ---------- helpers ---------- */
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