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

  /* expose re-init for dynamically injected content (blocks, before/after) */
  window.CaseInteractions = { beforeAfter, chart };
})();

/* ============================================================
   Lightbox — self-contained full-screen media overlay
   Public API: window.Lightbox.attach(triggerEl, itemsArray, index)
               window.Lightbox.open(itemsArray, index)
   An "item" is { url, type:'image'|'video'|'embed', provider?, caption?,
                  alt?, poster? }
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let overlay = null, mediaWrap = null, capEl = null, counterEl = null;
  let prevBtn = null, nextBtn = null, closeBtn = null;
  let items = [], idx = 0, lastFocus = null, isOpen = false;

  const esc = (s) => String(s == null ? '' : s);
  const attr = (s) => esc(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function inferProvider(item) {
    if (item.provider) return item.provider;
    const u = String(item.url || '');
    if (/youtube\.com|youtu\.be/i.test(u)) return 'youtube';
    if (/vimeo\.com/i.test(u)) return 'vimeo';
    if (/\.(mp4|webm)(\?|#|$)/i.test(u)) return 'mp4';
    return 'file';
  }
  function embedUrl(item, provider) {
    const u = String(item.url || '');
    if (provider === 'youtube') {
      let id = '';
      const m1 = u.match(/[?&]v=([^&]+)/);
      const m2 = u.match(/youtu\.be\/([^?&/]+)/);
      const m3 = u.match(/youtube\.com\/embed\/([^?&/]+)/);
      id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || '';
      return id ? 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0' : u;
    }
    if (provider === 'vimeo') {
      const m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      const id = m && m[1];
      return id ? 'https://player.vimeo.com/video/' + id + '?autoplay=1' : u;
    }
    return u;
  }

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Mediegalleri');
    overlay.innerHTML =
      '<div class="lightbox-backdrop" data-lb-close></div>' +
      '<button class="lightbox-btn lightbox-close" type="button" aria-label="Luk (Esc)">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button class="lightbox-btn lightbox-prev" type="button" aria-label="Forrige">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18 9 12l6-6"/></svg></button>' +
      '<button class="lightbox-btn lightbox-next" type="button" aria-label="Næste">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></button>' +
      '<figure class="lightbox-stage">' +
        '<div class="lightbox-media" tabindex="-1"></div>' +
        '<figcaption class="lightbox-caption mono"></figcaption>' +
      '</figure>' +
      '<span class="lightbox-counter mono"></span>';
    document.body.appendChild(overlay);
    mediaWrap = overlay.querySelector('.lightbox-media');
    capEl = overlay.querySelector('.lightbox-caption');
    counterEl = overlay.querySelector('.lightbox-counter');
    closeBtn = overlay.querySelector('.lightbox-close');
    prevBtn = overlay.querySelector('.lightbox-prev');
    nextBtn = overlay.querySelector('.lightbox-next');

    overlay.querySelector('[data-lb-close]').addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    document.addEventListener('keydown', onKey);
  }

  function render() {
    const item = items[idx];
    if (!item) return;
    const provider = inferProvider(item);
    mediaWrap.innerHTML = '';
    let node;
    if (item.type === 'embed' || provider === 'youtube' || provider === 'vimeo') {
      node = document.createElement('iframe');
      node.src = embedUrl(item, provider === 'file' ? 'youtube' : provider);
      node.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      node.setAttribute('allowfullscreen', '');
      node.setAttribute('title', esc(item.caption || item.alt || 'Video'));
      node.className = 'lightbox-embed';
    } else if (item.type === 'video' || provider === 'mp4') {
      node = document.createElement('video');
      node.src = item.url;
      node.controls = true;
      node.autoplay = !reduce;
      node.playsInline = true;
      if (item.poster) node.poster = item.poster;
      node.className = 'lightbox-video';
    } else {
      node = document.createElement('img');
      node.src = item.url;
      node.alt = esc(item.alt || item.caption || 'Billede');
      node.className = 'lightbox-img';
    }
    mediaWrap.appendChild(node);
    const cap = item.caption || item.alt || '';
    capEl.textContent = cap;
    capEl.style.display = cap ? '' : 'none';
    const multi = items.length > 1;
    prevBtn.style.display = multi ? '' : 'none';
    nextBtn.style.display = multi ? '' : 'none';
    counterEl.textContent = multi ? (idx + 1) + ' / ' + items.length : '';
  }

  function go(dir) {
    if (items.length < 2) return;
    idx = (idx + dir + items.length) % items.length;
    render();
  }

  function open(list, start) {
    if (!list || !list.length) return;
    build();
    items = list;
    idx = Math.max(0, Math.min(start || 0, list.length - 1));
    lastFocus = document.activeElement;
    isOpen = true;
    document.body.classList.add('lb-lock');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    render();
    closeBtn.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    mediaWrap.innerHTML = '';
    document.body.classList.remove('lb-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function trapFocus(e) {
    const focusable = Array.from(
      overlay.querySelectorAll('button:not([style*="display: none"]):not([style*="display:none"])')
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onKey(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'Tab') { trapFocus(e); }
  }

  function attach(el, list, start) {
    if (!el) return;
    el.classList.add('lb-trigger');
    if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
    }
    el.addEventListener('click', (e) => { e.preventDefault(); open(list, start); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(list, start); }
    });
  }

  window.Lightbox = { open, close, attach, inferProvider, embedUrl };
})();
