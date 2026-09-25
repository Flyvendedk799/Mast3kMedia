/* ============================================================
   Prisberegner controller — multi-step estimate (front-end only)
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = (n) => '€' + Math.round(n).toLocaleString('da-DK');
  const roundTo = (n, to) => Math.round(n / to) * to;

  function boot() {
    const calc = document.getElementById('calc');
    if (!calc) return;

    const steps = Array.from(calc.querySelectorAll('.step'));            // includes result (step 6)
    const interactive = steps.filter((s) => s.dataset.step <= '5');
    const result = calc.querySelector('.step.result');
    const segs = Array.from(calc.querySelectorAll('.calc-progress .seg'));
    const stepNum = document.getElementById('stepNum');
    const stepName = document.getElementById('stepName');
    const estVal = document.getElementById('estVal');
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');

    let current = 1; // 1..6 (6 = result)

    /* ---- selection ---- */
    calc.querySelectorAll('.step .opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const step = opt.closest('.step');
        const single = step.dataset.select === 'single';
        if (single) {
          step.querySelectorAll('.opt').forEach((o) => o.classList.remove('sel'));
          opt.classList.add('sel');
        } else {
          opt.classList.toggle('sel');
        }
        updateLive();
        updateNav();
      });
    });

    /* ---- compute ---- */
    function compute() {
      let base = 0, mult = 1, add = 0;
      interactive.forEach((step) => {
        const kind = step.dataset.kind;
        step.querySelectorAll('.opt.sel').forEach((o) => {
          if (kind === 'base') base += parseFloat(o.dataset.cost || 0);
          else if (kind === 'add') add += parseFloat(o.dataset.cost || 0);
          else if (kind === 'mult') mult *= parseFloat(o.dataset.mult || 1);
        });
      });
      const total = base * mult + add;
      const low = roundTo(total * 0.9, 500);
      const high = roundTo(total * 1.15, 500);
      return { base, mult, add, total, low, high };
    }

    function hasBase() { return calc.querySelector('.step[data-kind="base"] .opt.sel'); }

    function updateLive() { /* price intentionally hidden until the result step */ }

    /* ---- navigation requirements ---- */
    function canProceed() {
      if (current >= 6) return true;
      const step = interactive[current - 1];
      if (step.dataset.kind === 'add') return true;            // optional
      return !!step.querySelector('.opt.sel');
    }

    function updateNav() {
      btnBack.disabled = current === 1;
      if (current === 6) {
        btnNext.querySelector ? null : null;
        btnNext.innerHTML = 'Start forfra';
        btnNext.disabled = false;
        btnNext.classList.add('is-reset');
      } else {
        btnNext.classList.remove('is-reset');
        const label = current === 5 ? 'Se estimat' : 'Videre';
        btnNext.innerHTML = label + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
        btnNext.disabled = !canProceed();
      }
    }

    /* ---- step transitions ---- */
    function show(n, dir) {
      const prevEl = steps.find((s) => s.classList.contains('active'));
      const nextEl = steps.find((s) => s.dataset.step === String(n));
      if (!nextEl || prevEl === nextEl) return;
      // swap synchronously so it never depends on an animation callback
      steps.forEach((s) => s.classList.remove('active'));
      nextEl.classList.add('active');
      if (window.gsap && !reduce) {
        gsap.fromTo(nextEl, { opacity: 0, x: dir * 36 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' });
        const items = nextEl.querySelectorAll('.opt, .brk-row, .result-top, .result-contact');
        gsap.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04, delay: 0.04 });
      }
    }

    function setStep(n, dir) {
      current = n;
      show(n, dir);
      // progress
      segs.forEach((s, i) => {
        s.classList.toggle('done', i < n - 1);
        s.classList.toggle('active', i === n - 1 && n <= 5);
      });
      const labelStep = steps.find((s) => s.dataset.step === String(n));
      stepNum.textContent = String(Math.min(n, 5)).padStart(2, '0');
      stepName.textContent = labelStep ? labelStep.dataset.name : 'Estimat';
      const hint = calc.querySelector('.estimate');
      if (hint) hint.style.visibility = n === 6 ? 'hidden' : 'visible';
      if (n === 6) buildResult();
      updateNav();
      if (dir > 0 && window.m3kTrack) {
        if (n >= 1 && n <= 5) {
          const step = steps.find((s) => s.dataset.step === String(n));
          m3kTrack('form_progress', {
            form_id: 'price_calculator',
            step_number: n,
            step_name: step ? step.dataset.name : ''
          });
        } else if (n === 6) {
          const estimate = compute();
          const projectType = Array.from(calc.querySelectorAll('.step[data-kind="base"] .opt.sel .opt-name'))
            .map((el) => el.textContent.trim())
            .join(', ');
          m3kTrack('calculator_complete', {
            project_type: projectType,
            estimate_low: estimate.low,
            estimate_high: estimate.high,
            currency: 'EUR'
          });
        }
      }
      // keep the calculator in view
      const L = window.MAST3K && window.MAST3K.getLenis && window.MAST3K.getLenis();
      const y = calc.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > y + 40 || n === 6) { L ? L.scrollTo(y, { duration: 0.8 }) : window.scrollTo({ top: y, behavior: 'smooth' }); }
    }

    /* ---- result breakdown ---- */
    function buildResult() {
      const c = compute();
      document.getElementById('resLow').textContent = eur(c.low);
      document.getElementById('resHigh').textContent = eur(c.high);
      const bd = document.getElementById('breakdown');
      const rows = [];
      // types
      const typeEls = calc.querySelectorAll('.step[data-kind="base"] .opt.sel');
      typeEls.forEach((o) => rows.push([o.querySelector('.opt-name').textContent, eur(parseFloat(o.dataset.cost))]));
      // multipliers
      calc.querySelectorAll('.step[data-kind="mult"] .opt.sel').forEach((o) => {
        const step = o.closest('.step');
        const m = parseFloat(o.dataset.mult);
        const sign = m === 1 ? '' : (m > 1 ? '+' + Math.round((m - 1) * 100) + '%' : Math.round((m - 1) * 100) + '%');
        rows.push([step.dataset.name + ' · ' + o.querySelector('.opt-name').textContent, sign || 'basis']);
      });
      // addons
      calc.querySelectorAll('.step[data-kind="add"] .opt.sel').forEach((o) => {
        rows.push([o.querySelector('.opt-name').textContent, '+' + eur(parseFloat(o.dataset.cost))]);
      });
      let html = rows.map((r) => `<div class="brk-row"><span class="brk-k">${r[0]}</span><span class="brk-v">${r[1]}</span></div>`).join('');
      html += `<div class="brk-row total"><span class="brk-k">Estimeret interval</span><span class="brk-v">${eur(c.low)} – ${eur(c.high)}</span></div>`;
      bd.innerHTML = html;
    }

    /* ---- buttons ---- */
    btnNext.addEventListener('click', () => {
      if (current === 6) { resetCalc(); return; }
      if (!canProceed()) return;
      setStep(current + 1, 1);
    });
    btnBack.addEventListener('click', () => {
      if (current > 1) setStep(current - 1, -1);
    });

    function resetCalc() {
      calc.querySelectorAll('.opt.sel').forEach((o) => o.classList.remove('sel'));
      const f = document.getElementById('rcForm'), d = document.getElementById('rcDone');
      const errEl = document.getElementById('rcError');
      const btn = f && f.querySelector('.rc-send');
      if (f && d) { f.hidden = false; d.hidden = true; }
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      if (btn) btn.disabled = false;
      updateLive();
      setStep(1, -1);
    }

    let sending = false;
    window.prisContact = async function (e) {
      e.preventDefault();
      if (sending) return false;
      const form = document.getElementById('rcForm');
      const done = document.getElementById('rcDone');
      const errEl = document.getElementById('rcError');
      const email = (document.getElementById('rcEmail')?.value || '').trim();
      const website = (document.getElementById('rcWebsite')?.value || '').trim();
      const btn = form.querySelector('.rc-send');
      const estimate = compute();
      const projectType = Array.from(calc.querySelectorAll('.step[data-kind="base"] .opt.sel .opt-name'))
        .map((el) => el.textContent.trim())
        .join(', ');
      const timelineEl = calc.querySelector('.step[data-step="4"] .opt.sel .opt-name');
      const brief = Array.from(document.querySelectorAll('#breakdown .brk-row')).map((row) => {
        const k = (row.querySelector('.brk-k')?.textContent || '').trim();
        const v = (row.querySelector('.brk-v')?.textContent || '').trim();
        return k + ': ' + v;
      }).join('\n');
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      if (btn) btn.disabled = true;
      sending = true;
      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'pris',
            project_type: projectType,
            goal: 'Prisestimat',
            budget: '€' + estimate.low + '–€' + estimate.high,
            timeline: timelineEl ? timelineEl.textContent.trim() : '',
            email,
            brief,
            page_path: window.location.pathname || '/pris.html',
            website,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Kunne ikke sende');
        form.hidden = true;
        done.hidden = false;
        if (window.gsap) gsap.fromTo(done, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
        if (data.id && window.m3kTrack) {
          m3kTrack('generate_lead', {
            form_id: 'pris_estimate',
            lead_source: 'pris',
            project_type: projectType,
            estimate_low: estimate.low,
            estimate_high: estimate.high,
            value: estimate.low,
            currency: 'EUR',
            lead_id: String(data.id),
          });
        }
      } catch (err) {
        sending = false;
        if (btn) btn.disabled = false;
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = /email/i.test(err.message || '')
            ? 'Skriv en email vi kan svare på.'
            : 'Kunne ikke sende estimatet. Prøv igen.';
        }
      }
      return false;
    };

    updateLive();
    updateNav();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
