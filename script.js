/* ============================================================
   TEKNOMEN — site behaviour (all pages)
   Gradient mesh (WebGL), smooth scroll (Lenis), scroll animations
   (GSAP ScrollTrigger), 3D card tilt, counters, quote form.
   Product content lives in tools/build_products.py.
   Everything degrades gracefully: without JS or WebGL the page
   is fully visible with a static gradient.
============================================================ */
const WA_NUMBER = '923156185476';
const EMAIL = 'info@teknomenltd.com';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!REDUCED && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -80 } });
  window.tekLenis = lenis; // motion.js reads its velocity
  if (HAS_GSAP) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

/* ---------- nav ---------- */
(function () {
  const bar = document.getElementById('navBar');
  const btn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  const onScroll = () => bar && bar.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (!btn || !nav) return;
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();

/* ---------- nav: highlight the section in view (home page) ---------- */
(function () {
  const links = [...document.querySelectorAll('.nav-links a[href*="#"]')].filter((a) => !a.classList.contains('nav-mobile-cta'));
  if (!document.body.classList.contains('pg-home') || !links.length) return;
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      const a = byId.get(en.target.id);
      if (a) a.classList.add('is-active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
})();

/* ---------- phones: sticky quote bar once past the hero, hidden at the form ---------- */
(function () {
  const bar = document.getElementById('mCta');
  if (!bar) return;
  const quote = document.getElementById('quote');
  let quoteInView = false;
  if (quote) new IntersectionObserver(([en]) => { quoteInView = en.isIntersecting; update(); }).observe(quote);
  function update() { bar.classList.toggle('is-visible', window.scrollY > 520 && !quoteInView); }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------- FAQ: smooth open / close ---------- */
(function () {
  if (REDUCED || !Element.prototype.animate) return;
  const ease = 'cubic-bezier(.22,1,.36,1)';
  document.querySelectorAll('.faq details').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = d.querySelector('summary + *');
    if (!summary || !body) return;
    let busy = false;
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      // finish on the animation's end, with a timer as a backstop if that event never fires
      const finish = (fn, ms, anim) => {
        let done = false;
        const run = () => { if (done) return; done = true; anim.cancel(); fn(); busy = false; };
        anim.onfinish = run;
        setTimeout(run, ms + 80);
      };
      if (d.open) {
        const h = body.offsetHeight;
        const anim = body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0, paddingBottom: '0px' }], { duration: 300, easing: ease });
        finish(() => { d.open = false; }, 300, anim);
      } else {
        d.open = true;
        const h = body.offsetHeight;
        const anim = body.animate([{ height: '0px', opacity: 0, paddingBottom: '0px' }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: ease });
        finish(() => {}, 420, anim);
      }
    });
  });
})();

/* ---------- animated gradient mesh (WebGL fragment shader) ---------- */
(function () {
  const canvases = document.querySelectorAll('.mesh-canvas');
  if (!canvases.length) return;
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `precision highp float;
uniform vec2 r;uniform float t;
uniform vec3 c0,c1,c2,c3,c4;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
void main(){
  vec2 uv=gl_FragCoord.xy/r;vec2 q=uv;q.x*=r.x/r.y;
  float s=t*.045;
  vec2 w=q+.35*vec2(sn(vec3(q*.9,s)),sn(vec3(q*.9+7.,s)));
  vec3 col=c0;
  col=mix(col,c1,smoothstep(-.35,.55,sn(vec3(w*.8,s*1.2+1.))));
  col=mix(col,c2,smoothstep(-.1,.75,sn(vec3(w*1.1+3.,s*1.4+2.))));
  col=mix(col,c3,smoothstep(.15,.85,sn(vec3(w*.9+11.,s+3.)))*.95);
  col=mix(col,c4,smoothstep(.35,.95,sn(vec3(w*1.3+19.,s*1.6+4.)))*.8);
  col+= (fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const PALETTE = ['#0a2540', '#1b2a6b', '#3d36b8', '#0b4f7a', '#1aa0c8'].map(hex);

  canvases.forEach((canvas) => {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) return; // CSS gradient behind stays as fallback
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't');
    PALETTE.forEach((c, i) => gl.uniform3fv(gl.getUniformLocation(prog, 'c' + i), c));

    const scale = 0.5; // render at half resolution: it's a soft gradient
    const size = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uR, canvas.width, canvas.height);
    };
    new ResizeObserver(() => { size(); if (REDUCED) draw(20); }).observe(canvas);
    size();

    const start = performance.now() - Math.random() * 20000;
    const draw = (sec) => { gl.uniform1f(uT, sec); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    if (REDUCED) { draw(20); return; }
    let visible = false, running = false;
    const loop = () => {
      if (!visible) { running = false; return; }
      running = true;
      draw((performance.now() - start) / 1000);
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !running) requestAnimationFrame(loop);
    }).observe(canvas);
  });
})();

/* ---------- client logos: duplicate the row for a seamless loop ---------- */
(function () {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  track.querySelectorAll('img').forEach((img) => {
    const c = img.cloneNode(true);
    c.alt = '';
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
  });
})();

/* ---------- scroll animations ---------- */
(function () {
  if (!HAS_GSAP || REDUCED) return;
  gsap.registerPlugin(ScrollTrigger);

  // hero intro
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const lines = document.querySelectorAll('.hero-title .line > span');
  if (lines.length) tl.from(lines, { yPercent: 115, duration: 1.3, stagger: 0.09 }, 0.1);
  const bits = document.querySelectorAll('.hero-anim');
  if (bits.length) tl.from(bits, { y: 28, opacity: 0, duration: 1.2, stagger: 0.08 }, lines.length ? 0.35 : 0.1);
  const huds = document.querySelectorAll('.hud');
  if (huds.length) tl.from(huds, { y: 20, opacity: 0, scale: 0.92, duration: 1, stagger: 0.15 }, 1.1);

  // scroll entrances: AOS for most elements; GSAP for the 3D-tilt cards,
  // because AOS's own transform would cancel the tilt once it finishes
  const all = gsap.utils.toArray('.reveal');
  const useAOS = typeof window.AOS !== 'undefined';
  if (useAOS) {
    const effect = (el) =>
      el.matches('.stat, .process li') ? 'flip-up' :
      el.matches('.form-card, .cta-panel, .spec-card, .list-card') ? 'zoom-in-up' :
      el.matches('.marquee') ? 'fade' : 'fade-up';
    // headings and the About statement get word-by-word animation in motion.js instead
    all.filter((el) => !el.classList.contains('tilt') && !el.matches('.sec-head, .about-statement')).forEach((el) => {
      const peers = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.setAttribute('data-aos', effect(el));
      el.setAttribute('data-aos-delay', String((peers.indexOf(el) % 4) * 90));
    });
    AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 60 });
    window.addEventListener('load', () => AOS.refresh());
    // safety net: anything on screen that AOS hasn't revealed within 1.2 s gets revealed anyway,
    // so content can never stay invisible if a scroll event is missed
    const pending = new Set(document.querySelectorAll('[data-aos]'));
    const firstSeen = new Map();
    const net = setInterval(() => {
      const now = performance.now(), vh = window.innerHeight;
      pending.forEach((el) => {
        if (el.classList.contains('aos-animate')) { pending.delete(el); return; }
        const r = el.getBoundingClientRect();
        if (r.top >= vh || r.bottom <= 0) return;
        if (!firstSeen.has(el)) firstSeen.set(el, now);
        else if (now - firstSeen.get(el) > 1200) { el.classList.add('aos-animate'); pending.delete(el); }
      });
      if (!pending.size) clearInterval(net);
    }, 400);
  }
  // only hide what is below the fold, so nothing is ever stuck invisible
  const tiltReveals = (useAOS ? all.filter((el) => el.classList.contains('tilt')) : all)
    .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.95);
  gsap.set(tiltReveals, { opacity: 0, y: 60, rotateX: -14, transformPerspective: 1000, transformOrigin: '50% 100%' });
  ScrollTrigger.batch(tiltReveals, {
    start: 'top 90%',
    once: true,
    // clearProps hands the transform back to CSS, so the hover tilt keeps working
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true, clearProps: 'transform,opacity' }),
  });

  // counters
  document.querySelectorAll('[data-count]').forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0);
    const o = { v: from };
    el.textContent = from;
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
    });
  });

  // process line fills as you scroll through it
  const fill = document.getElementById('processFill');
  const track = document.getElementById('processTrack');
  if (fill && track) {
    fill.style.setProperty('--p', 0);
    ScrollTrigger.create({
      trigger: track, start: 'top 75%', end: 'bottom 55%', scrub: 0.6,
      onUpdate: (st) => fill.style.setProperty('--p', st.progress.toFixed(3)),
    });
  }

  // gentle parallax on the hero visual
  const visual = document.querySelector('.hero-visual');
  if (visual) gsap.to(visual, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
})();

/* ---------- 3D tilt on cards ---------- */
(function () {
  if (REDUCED || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.tilt').forEach((card) => {
    const max = card.classList.contains('pv-card') ? 7 : 5;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', ((x - 0.5) * max * 2).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * max * 2).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---------- hero HUD: follow the pointer a little, show the live alert ---------- */
(function () {
  const hero = document.querySelector('.hero, .p-hero');
  const huds = document.querySelectorAll('.hud');
  if (!hero || !huds.length) return;
  if (!REDUCED) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      huds.forEach((h, i) => {
        const d = (i + 1) * 8;
        // GSAP x/y so the scroll animation (xPercent/yPercent) can combine with it
        if (HAS_GSAP) gsap.to(h, { x: x * d, y: y * d, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        else h.style.transform = `translate(${(x * d).toFixed(1)}px, ${(y * d).toFixed(1)}px)`;
      });
    });
  }
  const label = document.querySelector('.hud-b small');
  document.addEventListener('tek:spindle-alert', (e) => { if (label) label.textContent = 'Spindle ' + e.detail.spindle; });
})();

/* ---------- quote form: composes the request and opens WhatsApp ---------- */
(function () {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  const mail = document.getElementById('mailLink');
  const product = form.elements.product;

  // preselect a product when arriving from a product page (?product=id)
  const wanted = new URLSearchParams(location.search).get('product');
  if (wanted && [...product.options].some((o) => o.value === wanted)) product.value = wanted;

  function compose() {
    const f = form.elements;
    const productName = product.value ? product.options[product.selectedIndex].text : 'Not sure yet / custom project';
    return [
      'Quote request (teknomenltd.com)',
      'Name: ' + f.name.value.trim(),
      f.company.value.trim() && 'Company: ' + f.company.value.trim(),
      'Phone: ' + f.phone.value.trim(),
      'Product: ' + productName,
      f.machine.value.trim() && 'Machine model: ' + f.machine.value.trim(),
      f.qty.value.trim() && 'Quantity: ' + f.qty.value.trim(),
      f.message.value.trim() && 'Details: ' + f.message.value.trim(),
    ].filter(Boolean).join('\n');
  }

  // keep the email link in step with the form, as an alternative to WhatsApp
  function updateMail() {
    if (mail) mail.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Quote request') + '&body=' + encodeURIComponent(compose());
  }
  form.addEventListener('input', updateMail);
  updateMail();

  function check(field, ok, message) {
    const wrap = field.closest('.field');
    let err = wrap.querySelector('.err');
    if (ok) {
      wrap.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
      if (err) err.remove();
      return true;
    }
    wrap.classList.add('has-error');
    field.setAttribute('aria-invalid', 'true');
    if (!err) {
      err = document.createElement('span');
      err.className = 'err';
      err.id = field.id + 'Err';
      wrap.appendChild(err);
      field.setAttribute('aria-describedby', err.id);
    }
    err.textContent = message;
    return false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const okName = check(f.name, f.name.value.trim().length > 1, 'Enter your name.');
    const okPhone = check(f.phone, f.phone.value.replace(/\D/g, '').length >= 10, 'Enter a phone number with at least 10 digits.');
    if (!okName || !okPhone) {
      (okName ? f.phone : f.name).focus();
      status.textContent = '';
      status.classList.remove('is-success');
      return;
    }
    const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(compose());
    // 'noopener' would make window.open return null, so detach the opener by hand
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else location.href = url;
    status.textContent = 'WhatsApp opened with your request. Press send there to deliver it. No WhatsApp? Use the email link.';
    status.classList.add('is-success');
  });
})();

/* ---------- product page: switch product views ---------- */
(function () {
  const main = document.getElementById('pvMain');
  const thumbs = document.querySelectorAll('.pv-thumb');
  if (!main || !thumbs.length) return;
  thumbs.forEach((t) => t.addEventListener('click', () => {
    main.style.opacity = 0;
    setTimeout(() => { main.src = t.dataset.src; main.style.opacity = 1; }, 180);
    thumbs.forEach((x) => {
      const on = x === t;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', String(on));
    });
  }));
})();

/* ---------- year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
