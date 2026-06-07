/* ============================================================
   Case study interactions — feature tabs, before/after, chart
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Interactive feature showcase ---- */
  function showcase() {
    const root = document.querySelector('[data-showcase]');
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll('.feat-tab'));
    const label = root.querySelector('.mock-label');
    const bars = root.querySelector('.skel-bars');
    const progress = root.querySelector('.showcase-progress');
    if (!tabs.length) return;
    let idx = 0, timer = null, raf = null;

    function randomize() {
      if (!bars) return;
      bars.querySelectorAll('i').forEach((b) => {
        const h = 25 + Math.random() * 75;
        b.style.height = h + '%';
      });
    }
    function activate(n, user) {
      idx = n;
      tabs.forEach((t, i) => t.classList.toggle('active', i === n));
      const t = tabs[n];
      if (label) label.textContent = t.dataset.screen || 'Skærm';
      randomize();
      if (window.gsap && !reduce) {
        gsap.fromTo(root.querySelector('.showcase-stage .mock'), { opacity: 0.4, scale: 0.985 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
      }
      if (user) restart();
    }
    function tick() {
      if (reduce) return;
      const dur = 4200; let t0 = performance.now();
      cancelAnimationFrame(raf);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        if (progress) progress.style.width = (p * 100) + '%';
        if (p >= 1) { activate((idx + 1) % tabs.length); t0 = performance.now(); }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    function restart() { cancelAnimationFrame(raf); if (progress) progress.style.width = '0%'; tick(); }

    tabs.forEach((t, i) => t.addEventListener('click', () => activate(i, true)));
    activate(0);
    if (!reduce) tick();
    root.addEventListener('mouseenter', () => cancelAnimationFrame(raf));
    root.addEventListener('mouseleave', () => { if (!reduce) restart(); });
  }

  /* ---- Before / After slider ---- */
  function beforeAfter() {
    document.querySelectorAll('[data-ba]').forEach((ba) => {
      const after = ba.querySelector('.ba-after');
      const handle = ba.querySelector('.ba-handle');
      let dragging = false;
      const setPos = (clientX) => {
        const r = ba.getBoundingClientRect();
        let p = ((clientX - r.left) / r.width) * 100;
        p = Math.max(2, Math.min(98, p));
        after.style.clipPath = `inset(0 0 0 ${p}%)`;
        handle.style.left = p + '%';
      };
      const down = (e) => { dragging = true; setPos((e.touches ? e.touches[0] : e).clientX); };
      const move = (e) => { if (dragging) setPos((e.touches ? e.touches[0] : e).clientX); };
      const up = () => { dragging = false; };
      ba.addEventListener('mousedown', down); ba.addEventListener('touchstart', down, { passive: true });
      window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, { passive: true });
      window.addEventListener('mouseup', up); window.addEventListener('touchend', up);
      // hover scrub on desktop
      ba.addEventListener('mousemove', (e) => { if (!dragging && matchMedia('(hover:hover)').matches) setPos(e.clientX); });
    });
  }

  /* ---- Chart reveal on scroll ---- */
  function chart() {
    const charts = document.querySelectorAll('.chart');
    if (!charts.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const bars = en.target.querySelectorAll('.chart-bar');
          bars.forEach((b, i) => setTimeout(() => b.style.transitionDelay = '0s', i * 80));
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    charts.forEach((c) => io.observe(c));
  }

  const boot = () => { showcase(); beforeAfter(); chart(); };
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
