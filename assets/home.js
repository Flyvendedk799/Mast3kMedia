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
    const $ = (selector, root = form) => root.querySelector(selector);
    const $$ = (selector, root = form) => Array.from(root.querySelectorAll(selector));
    const cockpit = document.getElementById('heroCockpit');
    const stage = form.closest('.stage') || form;
    const track = $('#track');
    const steps = $$('.step');
    const backBtn = $('#back');
    const nextBtn = $('#next');
    const nextLabel = $('.lbl', nextBtn);
    const success = $('#success');
    const refEl = $('#ref');
    const TOTAL = 4;
    const titles = {
      1: 'Hvad skal vi bygge?',
      2: 'Definér scope',
      3: 'Hvem skriver vi til?',
      4: 'Tjek og send'
    };
    const state = {
      type: null,
      outcome: null,
      budget: null,
      timeline: null,
      brief: '',
      name: '',
      company: '',
      email: '',
      phone: ''
    };
    let current = 1;

    const formValue = (name) => String(form.elements[name]?.value || '').trim();

    const clearError = (field) => {
      if (field) field.classList.remove('invalid');
    };

    const setTrackHeight = () => {
      const active = $(`.step[data-step="${current}"]`);
      if (track && active) track.style.height = active.scrollHeight + 'px';
    };

    const applyScopeMode = () => {
      const free = state.type === 'Noget helt andet';
      const fOutcome = $('#field-outcome');
      const fBudget = $('#field-budget');
      const fTimeline = $('#field-timeline');
      const fBrief = $('#field-brief');
      const briefLabel = $('#brief-label');
      const textarea = $('#f-brief');
      if (!fOutcome || !fBudget || !fTimeline || !fBrief || !briefLabel || !textarea) return;

      fOutcome.style.display = free ? 'none' : '';
      if (free) {
        fOutcome.removeAttribute('data-req');
        fBudget.removeAttribute('data-req');
        fTimeline.removeAttribute('data-req');
        fBrief.setAttribute('data-req', 'brief');
        briefLabel.innerHTML = 'Fortæl frit <span class="hint">det er her du former det</span>';
        textarea.setAttribute('placeholder', 'Du har noget der ikke passer i en kasse — beskriv det. Hvad er det, hvad skal det kunne, og hvorfor nu?');
        textarea.classList.add('tall');
      } else {
        fOutcome.setAttribute('data-req', 'outcome');
        fBudget.setAttribute('data-req', 'budget');
        fTimeline.setAttribute('data-req', 'timeline');
        fBrief.removeAttribute('data-req');
        clearError(fBrief);
        briefLabel.innerHTML = 'Kort om projektet <span class="hint">valgfrit, men hjælper</span>';
        textarea.setAttribute('placeholder', 'Hvad skal det kunne? Hvad er problemet i dag? Hvad findes der allerede?');
        textarea.classList.remove('tall');
      }
      requestAnimationFrame(setTrackHeight);
    };

    const paintProgress = () => {
      $$('.node').forEach((node) => {
        const idx = Number(node.dataset.node);
        node.classList.toggle('done', idx < current);
        node.classList.toggle('current', idx === current);
        node.innerHTML = idx < current
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>'
          : String(idx);
      });
      $$('.bar').forEach((bar) => {
        bar.classList.toggle('filled', Number(bar.dataset.bar) < current);
      });
    };

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[char]);

    const renderReview = () => {
      const review = $('#review');
      if (!review) return;
      const isFree = state.type === 'Noget helt andet';
      const rows = [
        ['Type', state.type, 1],
        ['Mål', isFree ? '' : state.outcome, 2],
        ['Budget', isFree ? '' : state.budget, 2],
        ['Tidslinje', isFree ? '' : state.timeline, 2],
        ['Brief', state.brief, 2],
        ['Navn', state.name, 3],
        ['Firma', state.company, 3],
        ['Email', state.email, 3],
        ['Telefon', state.phone, 3]
      ];
      review.innerHTML = rows.map(([key, value, targetStep]) => {
        const hasValue = value && value.length;
        return '<div class="row"><span class="k">' + key + '</span>' +
          '<span class="v' + (hasValue ? '' : ' empty') + '">' + (hasValue ? escapeHtml(value) : '—') + '</span>' +
          '<button type="button" class="edit" data-goto="' + targetStep + '">ret</button></div>';
      }).join('');
      $$('.edit', review).forEach((button) => {
        button.addEventListener('click', () => showStep(Number(button.dataset.goto)));
      });
    };

    const showStep = (step) => {
      current = Math.max(1, Math.min(step, TOTAL));
      steps.forEach((panel) => {
        const idx = Number(panel.dataset.step);
        panel.classList.toggle('is-active', idx === current);
        panel.classList.toggle('is-prev', idx < current);
      });
      const stepNum = $('#stepNum');
      const stepTitle = $('#stepTitle');
      if (stepNum) stepNum.textContent = String(current);
      if (stepTitle) stepTitle.textContent = titles[current] || titles[1];
      if (backBtn) backBtn.hidden = current === 1;
      if (nextLabel) nextLabel.textContent = current === TOTAL ? 'Send brief' : 'Næste';
      paintProgress();
      if (current === 2) applyScopeMode();
      if (current === TOTAL) renderReview();
      requestAnimationFrame(setTrackHeight);
    };

    const validateStep = (step) => {
      let ok = true;
      let firstBad = null;
      const fields = $$(`.step[data-step="${step}"] .field[data-req]`);
      fields.forEach((field) => {
        const key = field.dataset.req;
        const valid = key === 'email'
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)
          : Boolean(state[key]);
        if (!valid) {
          field.classList.add('invalid');
          if (!firstBad) firstBad = field;
          ok = false;
        } else {
          clearError(field);
        }
      });
      if (firstBad) {
        const input = $('.input, .textarea', firstBad);
        if (input) {
          try { input.focus({ preventScroll: true }); }
          catch { input.focus(); }
        }
      }
      return ok;
    };

    const validateAll = () => {
      for (let step = 1; step <= TOTAL; step += 1) {
        if (!validateStep(step)) {
          showStep(step);
          return false;
        }
      }
      return true;
    };

    const collectPayload = () => {
      const isFree = state.type === 'Noget helt andet';
      const briefParts = [];
      if (state.brief) briefParts.push(state.brief);
      if (state.phone) briefParts.push('Telefon: ' + state.phone);
      return {
        source: formValue('source') || 'hero',
        page_path: window.location.pathname || '/',
        website: formValue('website'),
        project_type: state.type,
        goal: isFree ? 'Noget helt andet' : (state.outcome || ''),
        budget: isFree ? '' : (state.budget || ''),
        timeline: isFree ? '' : (state.timeline || ''),
        name: state.name,
        company: state.company,
        email: state.email,
        phone: state.phone,
        brief: briefParts.join('\n\n')
      };
    };

    const submit = async (event) => {
      if (event) event.preventDefault();
      if (!validateAll()) return false;
      nextBtn.classList.add('loading');
      nextBtn.disabled = true;
      if (backBtn) backBtn.disabled = true;

      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collectPayload()),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Kunne ikke sende briefet');
        const ref = data.id ? 'M3K-' + String(data.id).padStart(4, '0') : 'M3K-' + String(Math.floor(1000 + Math.random() * 8999));
        if (refEl) refEl.textContent = 'REF · ' + ref;
        if (success) success.classList.add('show');
      } catch (error) {
        nextBtn.classList.remove('loading');
        nextBtn.disabled = false;
        if (backBtn) backBtn.disabled = false;
        const emailField = $('#f-email')?.closest('.field');
        if (emailField && /email/i.test(error.message || '')) {
          showStep(3);
          emailField.classList.add('invalid');
          $('#f-email')?.focus({ preventScroll: true });
        } else {
          const briefField = $('#field-brief');
          showStep(2);
          briefField?.classList.add('invalid');
        }
      }
      return false;
    };

    $$('.type').forEach((button) => {
      button.addEventListener('click', () => {
        $$('.type').forEach((item) => {
          item.classList.remove('sel');
          item.setAttribute('aria-checked', 'false');
        });
        button.classList.add('sel');
        button.setAttribute('aria-checked', 'true');
        state.type = button.dataset.value;
        clearError(button.closest('.field'));
        applyScopeMode();
      });
    });

    $$('.chip').forEach((button) => {
      button.addEventListener('click', () => {
        const field = button.dataset.field;
        $$(`.chip[data-field="${field}"]`).forEach((chip) => chip.classList.remove('sel'));
        button.classList.add('sel');
        state[field] = button.dataset.value;
        clearError(button.closest('.field'));
      });
    });

    $$('[data-field]').forEach((field) => {
      if (field.tagName !== 'INPUT' && field.tagName !== 'TEXTAREA') return;
      field.addEventListener('input', () => {
        state[field.dataset.field] = field.value.trim();
        clearError(field.closest('.field'));
        if (current === TOTAL) renderReview();
      });
    });

    nextBtn?.addEventListener('click', () => {
      if (!validateStep(current)) return;
      if (current === TOTAL) submit();
      else showStep(current + 1);
    });
    backBtn?.addEventListener('click', () => {
      if (current > 1) showStep(current - 1);
    });
    form.addEventListener('submit', submit);
    window.heroQuickContact = submit;

    if (!reduce && cockpit && window.matchMedia('(min-width: 981px)').matches) {
      let frame = null;
      let tiltX = 0;
      let tiltY = 0;
      const applyTilt = () => {
        frame = null;
        cockpit.style.setProperty('--ry', (tiltX * 9).toFixed(2) + 'deg');
        cockpit.style.setProperty('--rx', (-tiltY * 7).toFixed(2) + 'deg');
      };
      stage.addEventListener('pointermove', (event) => {
        const rect = cockpit.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        tiltX = (event.clientX - cx) / rect.width;
        tiltY = (event.clientY - cy) / rect.height;
        cockpit.style.setProperty('--mx', (((event.clientX - rect.left) / rect.width) * 100) + '%');
        cockpit.style.setProperty('--my', (((event.clientY - rect.top) / rect.height) * 100) + '%');
        if (!frame) frame = requestAnimationFrame(applyTilt);
      });
      stage.addEventListener('pointerleave', () => {
        tiltX = 0;
        tiltY = 0;
        if (!frame) frame = requestAnimationFrame(applyTilt);
      });
    }

    paintProgress();
    applyScopeMode();
    if (document.fonts?.ready) document.fonts.ready.then(setTrackHeight);
    window.addEventListener('load', setTrackHeight);
    window.addEventListener('resize', setTrackHeight);
    requestAnimationFrame(setTrackHeight);
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
