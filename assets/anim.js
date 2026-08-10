/* ============================================================
   MAST3K — interaction layer
   Lenis smooth scroll · GSAP reveals · marquee · counters

   No preloader and no custom cursor: the design system asks for
   purposeful motion only, so the page paints straight away and the
   OS cursor is left alone.
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.remove('no-js');
  if (reduce) document.documentElement.classList.add('reduce');

  const ready = (fn) => (document.readyState !== 'loading') ? fn() : document.addEventListener('DOMContentLoaded', fn);

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  function initLenis() {
    if (reduce || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    // anchor links
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const el = document.querySelector(id);
          if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80, duration: 1.3 }); closeMenu(); }
        }
      });
    });
  }

  /* ---------- Navbar ---------- */
  function initNav() {
    const nav = document.querySelector('.nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
      onScroll(); addEventListener('scroll', onScroll, { passive: true });
    }

    // Mark the current page in the bar and the mobile menu.
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-links a, .menu a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('/').pop().split('?')[0].toLowerCase();
      if (href && href === here) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    const burger = document.querySelector('.nav-burger');
    const menu = document.querySelector('.menu');
    if (burger && menu) {
      burger.setAttribute('aria-expanded', 'false');
      burger.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Luk menu' : 'Menu');
        menu.setAttribute('aria-hidden', String(!open));
        document.documentElement.classList.toggle('lenis-stopped', open);
        document.body.style.overflow = open ? 'hidden' : '';
        if (lenis) open ? lenis.stop() : lenis.start();
        if (open) { const first = menu.querySelector('a'); if (first) first.focus(); }
      });
      menu.setAttribute('aria-hidden', 'true');
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); burger.focus(); }
      });
    }
  }
  function closeMenu() {
    const menu = document.querySelector('.menu');
    const burger = document.querySelector('.nav-burger');
    if (menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      if (burger) {
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Menu');
      }
      document.documentElement.classList.remove('lenis-stopped');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    }
  }

  /* ---------- Scroll progress ---------- */
  function initProgress() {
    const bar = document.querySelector('.scroll-prog');
    if (!bar) return;
    const upd = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    };
    upd(); addEventListener('scroll', upd, { passive: true });
  }

  /* ---------- Marquee ---------- */
  function initMarquees() {
    document.querySelectorAll('.marquee').forEach((mq) => {
      const track = mq.querySelector('.marquee__track');
      if (!track) return;
      const speed = parseFloat(mq.dataset.speed || '0.5');
      const dir = mq.dataset.dir === 'right' ? 1 : -1;
      const clone = track.cloneNode(true);
      mq.appendChild(clone);
      let x = 0; let w = track.offsetWidth;
      addEventListener('resize', () => { w = track.offsetWidth; });
      let last = performance.now();
      const step = (t) => {
        const dt = t - last; last = t;
        if (!reduce) {
          x += dir * speed * dt * 0.06;
          if (x <= -w) x += w; if (x >= 0 && dir === 1) x -= w;
          track.style.transform = `translateX(${x}px)`;
          clone.style.transform = `translateX(${x}px)`;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Magnetic ---------- */
  function initMagnetic() {
    if (!hasFinePointer || reduce) return;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic || '0.3');
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Counters ----------
     The markup ships the real figure as text, so a stat never reads "0" when JS
     is slow, blocked, or the element never crosses the observer threshold. The
     count-up only starts once we know we can finish it. */
  function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    const fmt = (val, dec) => dec ? val.toFixed(dec) : Math.round(val).toLocaleString('da-DK');
    const final = (el) => fmt(parseFloat(el.dataset.count), el.dataset.dec ? parseInt(el.dataset.dec) : 0);

    // Reduced motion: make sure the final value is on screen, then stop.
    if (reduce) { els.forEach((el) => { el.textContent = final(el); }); return; }

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dec = (el.dataset.dec ? parseInt(el.dataset.dec) : 0);
      const dur = 1700, t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, dec);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = final(el);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- GSAP reveals ---------- */
  function initReveals() {
    if (!window.gsap) { document.querySelectorAll('[data-reveal]').forEach((el) => el.style.opacity = 1); return; }
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    if (reduce) { document.querySelectorAll('[data-reveal]').forEach((el) => gsap.set(el, { clearProps: 'all' })); return; }

    // split headings into lines via .line-inner already in markup
    document.querySelectorAll('[data-reveal="lines"]').forEach((el) => {
      const lines = el.querySelectorAll('.line-inner');
      gsap.set(lines, { yPercent: 115 });
      gsap.to(lines, {
        yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // fade-up groups
    document.querySelectorAll('[data-reveal="up"]').forEach((el) => {
      gsap.fromTo(el, { y: 42, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // staggered children
    document.querySelectorAll('[data-reveal="stagger"]').forEach((el) => {
      const kids = el.children;
      gsap.fromTo(kids, { y: 46, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // scale/clip media
    document.querySelectorAll('[data-reveal="clip"]').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(12% 12% 12% 12% round 20px)', opacity: 0.5 }, {
        clipPath: 'inset(0% 0% 0% 0% round 20px)', opacity: 1, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // parallax (data-parallax="0.2")
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax);
      gsap.to(el, { yPercent: amt * 100, ease: 'none',
        scrollTrigger: { trigger: el.closest('[data-parallax-scope]') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Hero entrance (timeline) ---------- */
  function initHeroIntro() {
    if (!window.gsap) return;
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const tl = gsap.timeline({ delay: reduce ? 0 : 0.1 });
    if (reduce) return;
    const lines = hero.querySelectorAll('[data-hero-line] .line-inner');
    gsap.set(lines, { yPercent: 120 });
    tl.to(lines, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.1 }, 0);
    hero.querySelectorAll('[data-hero-fade]').forEach((el, i) => {
      gsap.set(el, { y: 26, opacity: 0 });
      tl.to(el, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.5 + i * 0.12);
    });
  }

  /* ---------- Word rotator ---------- */
  function initRotator() {
    document.querySelectorAll('[data-rotate]').forEach((el) => {
      const words = JSON.parse(el.dataset.rotate);
      let i = 0;
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      el.appendChild(span);
      span.textContent = words[0];
      if (reduce) return;
      setInterval(() => {
        i = (i + 1) % words.length;
        if (window.gsap) {
          gsap.to(span, { yPercent: -100, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => {
            span.textContent = words[i];
            gsap.fromTo(span, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
          }});
        } else { span.textContent = words[i]; }
      }, 2400);
    });
  }

  /* ---------- Tilt ---------- */
  function initTilt() {
    if (!hasFinePointer || reduce) return;
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt || '6');
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- boot ---------- */
  ready(() => {
    initLenis();
    initHeroIntro();
    initNav();
    initProgress();
    initMarquees();
    initMagnetic();
    initCounters();
    initReveals();
    initRotator();
    initTilt();
  });

  window.MAST3K = { closeMenu, getLenis: () => lenis };
})();
