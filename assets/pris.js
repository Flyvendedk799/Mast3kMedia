/* ============================================================
   Prisberegner — steps, prices and copy come from /api/pricing
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICONS = {
    site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 13h11"/><path d="M6 7h15l-2 7H7"/></svg>',
    growth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 17l5-5 4 4 8-9M21 7v5M21 7h-5"/></svg>',
  };

  function boot() {
    const calc = document.getElementById('calc');
    if (!calc) return;

    const result = calc.querySelector('.step.result');
    const body = document.getElementById('calcBody');
    const progress = document.getElementById('calcProgress');
    const stepNum = document.getElementById('stepNum');
    const stepTotal = document.getElementById('stepTotal');
    const stepName = document.getElementById('stepName');
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    let config = null;
    let current = 1;
    let sending = false;

    const money = (n) => (config.currency || '€') + Math.round(n).toLocaleString('da-DK');
    const roundTo = (n, to) => Math.round(n / to) * to;
    const interactive = () => Array.from(calc.querySelectorAll('.step')).filter((s) => s !== result);

    function metaOf(step, opt) {
      if (opt.meta) return opt.meta;
      if (step.kind === 'mult') {
        if (Number(opt.mult) === 1) return 'basis';
        const pct = Math.round((Number(opt.mult) - 1) * 100);
        return (pct > 0 ? '+' : '') + pct + '%';
      }
      const prefix = step.kind === 'add' ? '+' : 'fra ';
      return prefix + money(opt.cost || 0);
    }

    function optionButton(step, opt) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      if (step.kind === 'mult') btn.dataset.mult = String(opt.mult);
      else btn.dataset.cost = String(opt.cost || 0);
      if (opt.icon && ICONS[opt.icon]) {
        const ic = document.createElement('span');
        ic.className = 'opt-ic';
        ic.innerHTML = ICONS[opt.icon];
        btn.appendChild(ic);
      }
      const name = document.createElement('span');
      name.className = 'opt-name';
      name.textContent = opt.name;
      btn.appendChild(name);
      if (opt.desc) {
        const desc = document.createElement('span');
        desc.className = 'opt-desc';
        desc.textContent = opt.desc;
        btn.appendChild(desc);
      }
      const meta = document.createElement('span');
      meta.className = 'opt-meta';
      meta.textContent = metaOf(step, opt);
      btn.appendChild(meta);
      const check = document.createElement('span');
      check.className = 'opt-check';
      btn.appendChild(check);
      return btn;
    }

    function render(cfg) {
      config = cfg;
      calc.querySelectorAll('.step:not(.result)').forEach((node) => node.remove());
      const loading = document.getElementById('calcLoading');
      if (loading) loading.remove();
      cfg.steps.forEach((step, index) => {
        const panel = document.createElement('div');
        panel.className = 'step' + (index === 0 ? ' active' : '');
        panel.dataset.step = String(index + 1);
        panel.dataset.kind = step.kind;
        panel.dataset.select = step.select === 'single' ? 'single' : 'multi';
        panel.dataset.name = step.name;
        panel.dataset.optional = step.optional ? '1' : '0';
        if (step.mapsTo) panel.dataset.mapsTo = step.mapsTo;
        const title = document.createElement('h2');
        title.className = 'step-q';
        title.textContent = step.question;
        const help = document.createElement('p');
        help.className = 'step-help';
        help.textContent = step.help || '';
        const grid = document.createElement('div');
        grid.className = 'opt-grid' + (step.columns === 2 ? ' cols-2' : ' cols-3');
        step.options.forEach((opt) => grid.appendChild(optionButton(step, opt)));
        panel.append(title, help, grid);
        body.insertBefore(panel, result);
      });
      result.dataset.step = String(cfg.steps.length + 1);
      result.dataset.name = 'Estimat';
      progress.innerHTML = cfg.steps.map((_, i) => '<span class="seg' + (i === 0 ? ' active' : '') + '"></span>').join('');
      if (stepTotal) stepTotal.textContent = String(cfg.steps.length).padStart(2, '0');
      const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node && value) node.textContent = value;
      };
      setText('resultNote', cfg.resultNote);
      setText('offerTitle', cfg.offerTitle);
      setText('offerSub', cfg.offerSub);
      setText('offerButton', cfg.offerButton);
      setText('offerFoot', cfg.offerFoot);
      setText('successTitle', cfg.successTitle);
      setText('successBody', cfg.successBody);
      setText('hiddenHint', cfg.hiddenHint);
      setText('calcDisclaimer', cfg.disclaimer);
      current = 1;
      updateNav();
    }

    function compute() {
      let base = 0, mult = 1, add = 0;
      interactive().forEach((step) => {
        const kind = step.dataset.kind;
        step.querySelectorAll('.opt.sel').forEach((o) => {
          if (kind === 'base') base += parseFloat(o.dataset.cost || 0);
          else if (kind === 'add') add += parseFloat(o.dataset.cost || 0);
          else if (kind === 'mult') mult *= parseFloat(o.dataset.mult || 1);
        });
      });
      const total = base * mult + add;
      const low = roundTo(total * (config.lowFactor || 0.9), config.roundTo || 500);
      const high = roundTo(total * (config.highFactor || 1.15), config.roundTo || 500);
      return { low: Math.max(0, low), high: Math.max(0, high) };
    }

    function canProceed() {
      const last = config.steps.length + 1;
      if (current >= last) return true;
      const step = interactive()[current - 1];
      if (!step || step.dataset.optional === '1') return true;
      return !!step.querySelector('.opt.sel');
    }

    function updateNav() {
      const last = config.steps.length + 1;
      btnBack.disabled = current === 1;
      if (current === last) {
        btnNext.innerHTML = 'Start forfra';
        btnNext.disabled = false;
        btnNext.classList.add('is-reset');
      } else {
        btnNext.classList.remove('is-reset');
        const label = current === config.steps.length ? 'Se estimat' : 'Videre';
        btnNext.innerHTML = label + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
        btnNext.disabled = !canProceed();
      }
    }

    function show(n, dir) {
      const steps = Array.from(calc.querySelectorAll('.step'));
      const prevEl = steps.find((s) => s.classList.contains('active'));
      const nextEl = steps.find((s) => s.dataset.step === String(n));
      if (!nextEl || prevEl === nextEl) return;
      steps.forEach((s) => s.classList.remove('active'));
      nextEl.classList.add('active');
      if (window.gsap && !reduce) {
        gsap.fromTo(nextEl, { opacity: 0, x: dir * 36 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' });
        const items = nextEl.querySelectorAll('.opt, .brk-row, .result-top, .result-contact');
        gsap.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04, delay: 0.04 });
      }
    }

    function selectedNames(selector) {
      return Array.from(calc.querySelectorAll(selector)).map((el) => el.textContent.trim()).filter(Boolean);
    }

    function setStep(n, dir) {
      const last = config.steps.length + 1;
      current = n;
      show(n, dir);
      const segs = Array.from(progress.querySelectorAll('.seg'));
      segs.forEach((s, i) => {
        s.classList.toggle('done', i < n - 1);
        s.classList.toggle('active', i === n - 1 && n < last);
      });
      const labelStep = calc.querySelector('.step[data-step="' + n + '"]');
      stepNum.textContent = String(Math.min(n, config.steps.length)).padStart(2, '0');
      stepName.textContent = labelStep ? labelStep.dataset.name : 'Estimat';
      const hint = calc.querySelector('.estimate');
      if (hint) hint.style.visibility = n === last ? 'hidden' : 'visible';
      if (n === last) buildResult();
      updateNav();
      if (dir > 0 && window.m3kTrack) {
        if (n >= 1 && n < last) {
          m3kTrack('form_progress', {
            form_id: 'price_calculator',
            step_number: n,
            step_name: labelStep ? labelStep.dataset.name : ''
          });
        } else if (n === last) {
          const estimate = compute();
          m3kTrack('calculator_complete', {
            project_type: selectedNames('.step[data-maps-to="project_type"] .opt.sel .opt-name, .step[data-kind="base"] .opt.sel .opt-name').join(', '),
            estimate_low: estimate.low,
            estimate_high: estimate.high,
            currency: 'EUR'
          });
        }
      }
      const L = window.MAST3K && window.MAST3K.getLenis && window.MAST3K.getLenis();
      const y = calc.getBoundingClientRect().top + window.scrollY - 90;
      if (window.scrollY > y + 40 || n === last) {
        L ? L.scrollTo(y, { duration: 0.8 }) : window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    function buildResult() {
      const c = compute();
      document.getElementById('resLow').textContent = money(c.low);
      document.getElementById('resHigh').textContent = money(c.high);
      const rows = [];
      calc.querySelectorAll('.step[data-kind="base"] .opt.sel').forEach((o) => {
        rows.push([o.querySelector('.opt-name').textContent, money(parseFloat(o.dataset.cost))]);
      });
      calc.querySelectorAll('.step[data-kind="mult"] .opt.sel').forEach((o) => {
        const step = o.closest('.step');
        const m = parseFloat(o.dataset.mult);
        const sign = m === 1 ? 'basis' : (m > 1 ? '+' + Math.round((m - 1) * 100) + '%' : Math.round((m - 1) * 100) + '%');
        rows.push([step.dataset.name + ' · ' + o.querySelector('.opt-name').textContent, sign]);
      });
      calc.querySelectorAll('.step[data-kind="add"] .opt.sel').forEach((o) => {
        rows.push([o.querySelector('.opt-name').textContent, '+' + money(parseFloat(o.dataset.cost))]);
      });
      const bd = document.getElementById('breakdown');
      bd.replaceChildren();
      rows.forEach((row) => {
        const line = document.createElement('div');
        line.className = 'brk-row';
        const k = document.createElement('span');
        k.className = 'brk-k';
        k.textContent = row[0];
        const v = document.createElement('span');
        v.className = 'brk-v';
        v.textContent = row[1];
        line.append(k, v);
        bd.appendChild(line);
      });
      const total = document.createElement('div');
      total.className = 'brk-row total';
      const tk = document.createElement('span');
      tk.className = 'brk-k';
      tk.textContent = 'Estimeret interval';
      const tv = document.createElement('span');
      tv.className = 'brk-v';
      tv.textContent = money(c.low) + ' – ' + money(c.high);
      total.append(tk, tv);
      bd.appendChild(total);
    }

    function resetCalc() {
      calc.querySelectorAll('.opt.sel').forEach((o) => o.classList.remove('sel'));
      const form = document.getElementById('rcForm');
      const done = document.getElementById('rcDone');
      const errEl = document.getElementById('rcError');
      const btn = form && form.querySelector('.rc-send');
      if (form && done) { form.hidden = false; done.hidden = true; }
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      if (btn) btn.disabled = false;
      setStep(1, -1);
    }

    calc.addEventListener('click', (event) => {
      const opt = event.target.closest('.step .opt');
      if (!opt || !calc.contains(opt)) return;
      const step = opt.closest('.step');
      if (step.dataset.select === 'single') {
        step.querySelectorAll('.opt').forEach((o) => o.classList.remove('sel'));
        opt.classList.add('sel');
      } else {
        opt.classList.toggle('sel');
      }
      updateNav();
    });

    btnNext.addEventListener('click', () => {
      if (!config) return;
      if (current === config.steps.length + 1) { resetCalc(); return; }
      if (!canProceed()) return;
      setStep(current + 1, 1);
    });
    btnBack.addEventListener('click', () => {
      if (current > 1) setStep(current - 1, -1);
    });

    window.prisContact = async function (e) {
      e.preventDefault();
      if (sending || !config) return false;
      const form = document.getElementById('rcForm');
      const done = document.getElementById('rcDone');
      const errEl = document.getElementById('rcError');
      const email = (document.getElementById('rcEmail')?.value || '').trim();
      const website = (document.getElementById('rcWebsite')?.value || '').trim();
      const btn = form.querySelector('.rc-send');
      const estimate = compute();
      const typeStep = calc.querySelector('.step[data-maps-to="project_type"]') || calc.querySelector('.step[data-kind="base"]');
      const timeStep = calc.querySelector('.step[data-maps-to="timeline"]');
      const projectType = typeStep
        ? Array.from(typeStep.querySelectorAll('.opt.sel .opt-name')).map((el) => el.textContent.trim()).join(', ')
        : '';
      const timelineEl = timeStep && timeStep.querySelector('.opt.sel .opt-name');
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
            budget: money(estimate.low) + '–' + money(estimate.high),
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

    btnNext.disabled = true;
    fetch('/api/pricing')
      .then((res) => { if (!res.ok) throw new Error('status'); return res.json(); })
      .then((cfg) => render(cfg))
      .catch(() => {
        const loading = document.getElementById('calcLoading');
        if (loading) loading.textContent = 'Prisberegneren kunne ikke indlæses. Genindlæs siden.';
      });
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
