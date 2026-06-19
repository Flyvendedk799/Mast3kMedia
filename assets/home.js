/* ============================================================
   Home — hero canvas field + pinned process scroll
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Hero canvas: drifting connected node field ---- */
  function heroField() {
    const cv = document.getElementById('heroCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, nodes = [], mouse = { x: -999, y: -999 };
    const COUNT = window.innerWidth < 760 ? 34 : 70;

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      nodes = [];
      for (let i = 0; i < COUNT; i++) {
        nodes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.5
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        // mouse repel
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 130) { n.x += dx / d * 0.8; n.y += dy / d * 0.8; }
      }
      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            const o = (1 - dist / 130) * 0.16;
            ctx.strokeStyle = `rgba(214,243,124,${o})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(220,230,210,0.5)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    let raf;
    function start() { cancelAnimationFrame(raf); size(); init(); if (!reduce) frame(); else { /* draw one static frame */ frameOnce(); } }
    function frameOnce() { ctx.clearRect(0,0,w,h); for (const n of nodes){ ctx.fillStyle='rgba(220,230,210,0.4)'; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill(); } }
    window.addEventListener('resize', () => { size(); init(); });
    window.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    start();
  }

  /* ---- Hero intake cockpit ---- */
  function heroIntake() {
    const form = document.getElementById('heroForm');
    if (!form) return;

    const steps = Array.from(form.querySelectorAll('[data-hcta-step]'));
    const backBtn = form.querySelector('[data-hcta-back]');
    const nextBtn = form.querySelector('[data-hcta-next]');
    const submitBtn = form.querySelector('[data-hcta-submit]');
    const progress = document.getElementById('heroProgress');
    const stepMark = document.getElementById('heroStepMark');
    const errorEl = document.getElementById('heroError');
    const done = document.getElementById('heroDone');
    let current = 0;

    const titles = [
      'Byg briefet. Send signalet.',
      'Sæt rammerne.',
      'Hvor skal vi svare?',
      'Klar til launch.'
    ];

    const getCheckedValue = (name) => {
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : '';
    };

    const getValue = (name) => {
      const field = form.elements[name];
      if (!field) return '';
      if (field instanceof RadioNodeList) return field.value || getCheckedValue(name);
      return String(field.value || '').trim();
    };

    const setError = (msg) => {
      if (errorEl) errorEl.textContent = msg || '';
      if (msg) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
      }
    };

    const syncChoiceState = (name) => {
      const radios = Array.from(form.querySelectorAll(`input[type="radio"][name="${name}"]`));
      radios.forEach((radio) => {
        const label = radio.closest('.hcta-choice, .hcta-pill');
        if (label) label.classList.toggle('is-selected', radio.checked);
      });
    };

    const updateReview = () => {
      const pairs = {
        project_type: getValue('project_type') || 'Software',
        budget: getValue('budget') || '75-150k',
        timeline: getValue('timeline') || '2-6 uger'
      };
      Object.keys(pairs).forEach((key) => {
        form.querySelectorAll(`[data-review="${key}"], [data-meter="${key}"]`).forEach((el) => {
          el.textContent = pairs[key];
        });
      });
    };

    const showStep = (idx) => {
      current = Math.max(0, Math.min(idx, steps.length - 1));
      steps.forEach((step, i) => {
        step.hidden = i !== current;
        step.classList.toggle('is-active', i === current);
      });
      form.classList.toggle('is-final', current === steps.length - 1);
      if (backBtn) backBtn.disabled = current === 0;
      if (progress) progress.style.width = (((current + 1) / steps.length) * 100) + '%';
      if (stepMark) stepMark.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(steps.length).padStart(2, '0');
      const title = document.getElementById('heroFormTitle');
      if (title) title.textContent = titles[current] || titles[0];
      setError('');
      updateReview();
    };

    const firstInvalidInStep = (step) => {
      const required = Array.from(step.querySelectorAll('input[required], textarea[required], select[required]'));
      const radioNames = new Set();
      for (const field of required) {
        if (field.type === 'radio') {
          if (radioNames.has(field.name)) continue;
          radioNames.add(field.name);
          if (!form.querySelector(`input[name="${field.name}"]:checked`)) return field;
          continue;
        }
        if (!field.checkValidity()) return field;
      }
      return null;
    };

    const validateStep = (idx) => {
      const invalid = firstInvalidInStep(steps[idx]);
      if (!invalid) {
        setError('');
        return true;
      }
      const msg = invalid.type === 'email'
        ? 'Smid en rigtig e-mail, så vi kan svare.'
        : 'Udfyld feltet, så briefet ikke mangler ben.';
      setError(msg);
      invalid.focus({ preventScroll: true });
      return false;
    };

    const collectPayload = () => ({
      source: getValue('source') || 'hero',
      page_path: window.location.pathname || '/',
      website: getValue('website'),
      project_type: getValue('project_type'),
      goal: getValue('goal'),
      budget: getValue('budget'),
      timeline: getValue('timeline'),
      name: getValue('name'),
      company: getValue('company'),
      email: getValue('email'),
      brief: getValue('brief'),
    });

    const submit = async (e) => {
      if (e) e.preventDefault();
      for (let i = 0; i < steps.length; i++) {
        if (firstInvalidInStep(steps[i])) {
          showStep(i);
          validateStep(i);
          return false;
        }
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      if (backBtn) backBtn.disabled = true;

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collectPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Kunne ikke sende briefet');
        form.hidden = true;
        if (done) {
          done.hidden = false;
          requestAnimationFrame(() => requestAnimationFrame(() => done.classList.add('anim-in')));
        }
      } catch (err) {
        setError(err.message || 'Noget gik galt. Skriv til hej@mast3kmedia.dk.');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        if (backBtn) backBtn.disabled = false;
      }
      return false;
    };

    window.heroQuickContact = submit;

    nextBtn?.addEventListener('click', () => {
      if (validateStep(current)) showStep(current + 1);
    });
    backBtn?.addEventListener('click', () => showStep(current - 1));
    form.addEventListener('submit', submit);

    ['project_type', 'budget', 'timeline'].forEach((name) => {
      syncChoiceState(name);
      form.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((radio) => {
        radio.addEventListener('change', () => {
          syncChoiceState(name);
          updateReview();
          const label = radio.closest('.hcta-choice, .hcta-pill');
          if (label && !reduce) {
            label.animate(
              [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-3px) scale(1.03)' }, { transform: 'translateY(0) scale(1)' }],
              { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }
            );
          }
        });
      });
    });

    form.querySelectorAll('input, textarea').forEach((field) => {
      field.addEventListener('input', updateReview);
    });

    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      form.addEventListener('mousemove', (e) => {
        const r = form.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        form.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        form.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        form.style.transform = `perspective(1200px) rotateY(${px * 7}deg) rotateX(${-py * 5}deg)`;
      });
      form.addEventListener('mouseleave', () => {
        form.style.transform = '';
      });
    }

    showStep(0);
  }

  /* ---- Pinned horizontal process ---- */
  function processScroll() {
    if (!window.gsap || !window.ScrollTrigger || reduce) return;
    const track = document.querySelector('.proc-track');
    const pin = document.querySelector('.proc-pin');
    if (!track || !pin) return;
    if (window.innerWidth < 760) return; // vertical scroll on mobile
    const getScroll = () => track.scrollWidth - window.innerWidth + (window.innerWidth * 0.08);
    gsap.to(track, {
      x: () => -getScroll(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + getScroll(),
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  }

  window.heroQuickContact = function(e) {
    if (e) e.preventDefault();
    return false;
  };

  const boot = () => { heroField(); heroIntake(); processScroll(); };
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
