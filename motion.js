/* ============================================================
   TEKNOMEN — motion layer (loads after script.js)
   - navbar hides on scroll down, returns on scroll up, with a progress line
   - hero 3D scroll: camera dolly + machine turn (read by hero3d.js),
     text lifts away, glass cards fly apart
   - pinned 3D coverflow of the flagship products
   - headings rise word by word; About statement fills in as you scroll
   - logo marquee reacts to scroll speed
   - product filter with GSAP Flip
   - magnetic buttons (mouse only)
   - hero telemetry dashboard: live RPM / efficiency / tension, a sparkline
     graph that dips to zero on a "yarn break", a 24-dot spindle matrix and
     a toast banner. Listens for 'tek:spindle-alert' from hero3d.js.
   Every effect checks for reduced motion and missing libraries, and nothing
   is hidden in a way that could leave content invisible.
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
  run(heroDashboard);          // runs regardless of GSAP
  if (!HAS_GSAP || REDUCED) return;

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);

  [heroScroll, productHeroScroll, headings, aboutStatement, spotlightPinned, velocityMarquee].forEach(run);
  if (FINE) run(magnetic);
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------- navbar: hide on the way down, show on the way up ---------- */
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

  /* ---------- hero: scroll drives the 3D camera and pulls the layers apart ---------- */
  function heroScroll() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    window.__tekHero = 0;
    ScrollTrigger.create({ ...st, onUpdate: (s) => { window.__tekHero = s.progress; } });
    gsap.to('.hero-text', { yPercent: -22, ease: 'none', scrollTrigger: st });
    gsap.to('.hero-text', { opacity: 0.15, ease: 'none', scrollTrigger: { ...st, start: 'top+=10% top' } });
    const paths = [[-70, -60, -6], [60, -30, 5], [-40, 60, -4]];
    gsap.utils.toArray('.hero .hud').forEach((h, i) => {
      const [x, y, r] = paths[i % paths.length];
      gsap.to(h, { xPercent: x, yPercent: y, rotate: r, ease: 'none', scrollTrigger: st });
    });
  }

  /* ---------- product pages: the product card tilts away in 3D as you scroll ---------- */
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

  /* ---------- headings: words rise in from a mask ---------- */
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

  /* ---------- About: words fill in as you read down ---------- */
  function aboutStatement() {
    const el = document.querySelector('.about-statement');
    if (!el) return;
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: true },
    });
  }

  /* ---------- flagship spotlight: coverflow transforms for any layout ---------- */
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

  /* ---------- flagship spotlight: pinned horizontal scroll (desktop) ---------- */
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

  /* ---------- logos: speed and lean follow the scroll velocity ---------- */
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

  /* ---------- product filter with Flip ---------- */
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

  /* ---------- magnetic buttons ---------- */
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
     HERO TELEMETRY DASHBOARD — upgraded
     · live RPM / efficiency / tension with gentle noise
     · sparkline with dashed nominal line and glow head dot
     · 24-dot spindle matrix (one flashes red on break)
     · value bump flash + status pill + toast banner
     · syncs to 'tek:spindle-alert' dispatched by hero3d.js
     ============================================================ */
  function heroDashboard() {
    const panel    = document.getElementById('heroDash');
    const canvas   = document.getElementById('hdCanvas');
    if (!panel || !canvas) return;

    const ctx       = canvas.getContext('2d');
    const rpmEl     = document.getElementById('hdRpm');
    const effEl     = document.getElementById('hdEff');
    const tenEl     = document.getElementById('hdTen');
    const statusEl  = document.getElementById('hdStatus');
    const spindleEl = document.getElementById('hdSpindle');
    const matrixEl  = document.getElementById('hdMatrix');
    const rpmWrap   = document.getElementById('hdRpmWrap');
    const effWrap   = document.getElementById('hdEffWrap');
    const tenWrap   = document.getElementById('hdTenWrap');

    /* --- build the spindle matrix (one dot per spindle) --- */
    const DOT_COUNT = 24;
    const dots = [];
    if (matrixEl) {
      for (let i = 0; i < DOT_COUNT; i++) {
        const d = document.createElement('i');
        matrixEl.appendChild(d);
        dots.push(d);
      }
    }
    function flashDot() {
      if (!dots.length) return;
      dots.forEach((d) => d.classList.remove('is-broken'));
      const idx = Math.floor(Math.random() * dots.length);
      dots[idx].classList.add('is-broken');
      setTimeout(() => dots[idx] && dots[idx].classList.remove('is-broken'), 2800);
    }

    /* --- bump flash on a metric value --- */
    function bump(el) {
      if (!el) return;
      el.classList.remove('is-bump');
      // force reflow so the animation restarts
      void el.offsetWidth;
      el.classList.add('is-bump');
      setTimeout(() => el.classList.remove('is-bump'), 750);
    }

    /* --- sparkline history --- */
    const POINTS = 64;
    const RPM_IDLE = 18240, EFF_IDLE = 98.6, TEN_IDLE = 4.12, NOMINAL = 98.6;
    const data = new Array(POINTS).fill(EFF_IDLE);

    const s = {
      rpm: RPM_IDLE, eff: EFF_IDLE, ten: TEN_IDLE,
      spindle: 142,
      phase: 'run', phaseT: 0, breakFor: 2.4,
      nextBreak: 6 + Math.random() * 5,
      lastBreakAt: -99,
      status: 'Running',
    };

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

      // horizontal grid lines
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const y = Math.round((h * i) / 4) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const stepX = w / (POINTS - 1);
      const toY = (v) => h - (Math.max(0, Math.min(100, v)) / 100) * (h - 8) - 4;

      // dashed nominal line at ~98.6%
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
      const line  = alert ? '#ff3b1f' : '#19d38f';

      // area fill
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, alert ? 'rgba(255,59,31,.42)' : 'rgba(25,211,143,.42)');
      grd.addColorStop(1, alert ? 'rgba(255,59,31,0)'  : 'rgba(25,211,143,0)');
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
      ctx.shadowBlur = alert ? 10 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // head dot with a soft glow
      const lx = (POINTS - 1) * stepX, ly = toY(data[POINTS - 1]);
      ctx.beginPath();
      ctx.arc(lx - 1.5, ly, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = line;
      ctx.shadowColor = line;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    /* --- react to the 3D alert --- */
    document.addEventListener('tek:spindle-alert', (e) => {
      if (e && e.detail && e.detail.spindle && spindleEl) {
        s.spindle = e.detail.spindle;
      }
      const now = performance.now() / 1000;
      if (s.phase === 'run' && (now - s.lastBreakAt) > 5) {
        s.phase = 'break';
        s.phaseT = 0;
        s.breakFor = 2.2 + Math.random() * 1.2;
        s.lastBreakAt = now;
      }
      flashDot();
      if (spindleEl) spindleEl.textContent = 'Spindle ' + s.spindle;
    });

    /* --- main loop --- */
    let last = performance.now();
    let acc = 0;
    const STEP = 0.36; // seconds per graph sample

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
        if (s.phaseT > s.nextBreak) {
          s.phase = 'break';
          s.phaseT = 0;
          s.breakFor = 2.2 + Math.random() * 1.4;
          s.spindle = 100 + Math.floor(Math.random() * 900);
          s.lastBreakAt = performance.now() / 1000;
          if (spindleEl) spindleEl.textContent = 'Spindle ' + s.spindle;
          flashDot();
        }
      } else if (s.phase === 'break') {
        s.rpm *= 0.80; s.eff *= 0.80; s.ten *= 0.78;
        if (s.rpm < 40)  s.rpm = 0;
        if (s.eff < 0.6) s.eff = 0;
        if (s.ten < 0.06) s.ten = 0;
        s.status = 'Yarn break';
        if (s.phaseT > s.breakFor) { s.phase = 'recover'; s.phaseT = 0; }
      } else {
        s.rpm += (RPM_IDLE - s.rpm) * 0.07;
        s.eff += (EFF_IDLE - s.eff) * 0.07;
        s.ten += (TEN_IDLE - s.ten) * 0.07;
        s.status = 'Recovering';
        if (s.eff > 97.6) { s.phase = 'run'; s.phaseT = 0; s.nextBreak = 6 + Math.random() * 6; }
      }

      // bump the metric values whenever the phase changes
      if (s.phase !== prevPhase) {
        bump(rpmWrap); bump(effWrap); bump(tenWrap);
      }

      // occasional tiny "tick" bump for liveliness
      if (Math.random() < 0.0012) {
        const pick = [rpmWrap, effWrap, tenWrap][Math.floor(Math.random() * 3)];
        bump(pick);
      }

      if (rpmEl) rpmEl.textContent = Math.round(s.rpm).toLocaleString('en-US');
      if (effEl) effEl.textContent = s.eff.toFixed(1);
      if (tenEl) tenEl.textContent = s.ten.toFixed(2);
      if (statusEl) statusEl.textContent = s.status;

      const alert = s.phase !== 'run';
      panel.classList.toggle('is-alert', alert);
      if (statusEl) statusEl.classList.toggle('is-alert', alert);

      // push a new sample into the sparkline
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