/* ============================================================
   Brief — the four-step project intake on kontakt.html

   Posts to /api/leads. Moved off the home hero, where the design
   system now shows a studio datasheet instead: the form belongs on
   the page a visitor reaches when they have already decided to write.
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function brief() {
    const form = document.getElementById('briefForm');
    if (!form) return;
    const $ = (selector, root = form) => root.querySelector(selector);
    const $$ = (selector, root = form) => Array.from(root.querySelectorAll(selector));
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
        source: formValue('source') || 'kontakt',
        page_path: window.location.pathname || '/kontakt.html',
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

    if (reduce && track) track.style.transition = 'none';

    paintProgress();
    applyScopeMode();
    if (document.fonts?.ready) document.fonts.ready.then(setTrackHeight);
    window.addEventListener('load', setTrackHeight);
    window.addEventListener('resize', setTrackHeight);
    requestAnimationFrame(setTrackHeight);
  }

  if (document.readyState !== 'loading') brief();
  else document.addEventListener('DOMContentLoaded', brief);
})();
