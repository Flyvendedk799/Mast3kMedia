/* ─────────────────────────────────────────────────────────────
   work.js — work-listing search + tag filtering (workstream E)
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ESC = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* ── State ── */
  var activeCat = 'all';      // current category-button filter key
  var activeChips = [];       // selected tag/tech chip values (lowercased)
  var searchTerm = '';        // current debounced search string (lowercased)

  /* ── DOM refs ── */
  var grid, countEl, emptyEl, chipsEl, searchInput, searchWrap;

  function revealNewCards(scope) {
    if (!(window.gsap && window.ScrollTrigger)) return;
    scope.querySelectorAll('[data-reveal="up"]').forEach(function (el) {
      gsap.fromTo(el, { y: 46, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
  }

  /* ── Filtering ── */
  function applyFilters() {
    if (!grid) return;
    var cards = grid.querySelectorAll('.wcard');
    var shown = 0;
    cards.forEach(function (card) {
      var show = (function () {
        if (activeCat !== 'all') {
          var cats = (card.dataset.cat || '').toLowerCase();
          if (cats.indexOf(activeCat) === -1) return false;
        }
        if (searchTerm) {
          var blob = (card.textContent || '').toLowerCase();
          var tagsAttr = (card.dataset.tags || '').toLowerCase();
          if (blob.indexOf(searchTerm) === -1 && tagsAttr.indexOf(searchTerm) === -1) return false;
        }
        if (activeChips.length) {
          var cardTags = (card.dataset.tags || '').toLowerCase().split(',');
          var hit = activeChips.some(function (c) { return cardTags.indexOf(c) !== -1; });
          if (!hit) return false;
        }
        return true;
      })();
      card.classList.toggle('hide', !show);
      if (show) shown++;
    });

    if (countEl) {
      countEl.innerHTML = '<b>' + shown + '</b> ' + (shown === 1 ? 'projekt' : 'projekter');
    }
    if (emptyEl) emptyEl.classList.toggle('show', shown === 0);
    if (grid) grid.style.display = shown === 0 ? 'none' : '';

    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  /* ── Category buttons (preserve existing behavior) ── */
  function initFilters() {
    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeCat = btn.dataset.filter || 'all';
        applyFilters();
      });
    });
  }

  /* ── Chips ── */
  function renderChips(tags) {
    if (!chipsEl) return;
    var seen = {};
    var list = [];
    (tags || []).forEach(function (t) {
      var key = String(t).trim();
      if (!key) return;
      var lk = key.toLowerCase();
      if (seen[lk]) return;
      seen[lk] = true;
      list.push(key);
    });
    list.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    var VISIBLE = 8;
    var chipHtml = list.map(function (t, i) {
      var hidden = i >= VISIBLE ? ' style="display:none" data-extra-chip' : '';
      return '<button type="button" class="work-chip"' + hidden + ' data-tag="' + ESC(t.toLowerCase()) + '">' + ESC(t) + '</button>';
    }).join('');
    if (list.length > VISIBLE) {
      chipHtml += '<button type="button" class="work-chip work-chip-toggle">Flere filtre ▾</button>';
    }
    chipsEl.innerHTML = chipHtml;
    var toggle = chipsEl.querySelector('.work-chip-toggle');
    if (toggle) {
      var expanded = false;
      toggle.addEventListener('click', function() {
        expanded = !expanded;
        chipsEl.querySelectorAll('[data-extra-chip]').forEach(function(c) {
          c.style.display = expanded ? '' : 'none';
        });
        toggle.textContent = expanded ? 'Færre filtre ▴' : 'Flere filtre ▾';
      });
    }
    chipsEl.querySelectorAll('.work-chip:not(.work-chip-toggle)').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var tag = chip.dataset.tag;
        var i = activeChips.indexOf(tag);
        if (i === -1) { activeChips.push(tag); chip.classList.add('active'); }
        else { activeChips.splice(i, 1); chip.classList.remove('active'); }
        applyFilters();
      });
    });
  }

  /* ── Search (debounced ~150ms) ── */
  function initSearch() {
    if (!searchInput) return;
    var t = null;
    var trackTimer = null;
    var lastTracked = '';
    searchInput.addEventListener('input', function () {
      var raw = searchInput.value;
      if (searchWrap) searchWrap.classList.toggle('has-value', raw.length > 0);
      clearTimeout(t);
      t = setTimeout(function () {
        searchTerm = raw.trim().toLowerCase();
        applyFilters();
      }, 150);
      clearTimeout(trackTimer);
      trackTimer = setTimeout(function () {
        var term = raw.trim();
        if (term.length < 3 || term === lastTracked || !window.m3kTrack) return;
        lastTracked = term;
        m3kTrack('search', { search_term: term });
      }, 1000);
    });
  }

  function clearSearch() {
    searchTerm = '';
    if (searchInput) searchInput.value = '';
    if (searchWrap) searchWrap.classList.remove('has-value');
    applyFilters();
    if (searchInput) searchInput.focus();
  }

  function resetAll() {
    searchTerm = '';
    activeChips = [];
    activeCat = 'all';
    if (searchInput) searchInput.value = '';
    if (searchWrap) searchWrap.classList.remove('has-value');
    if (chipsEl) chipsEl.querySelectorAll('.work-chip.active').forEach(function (c) { c.classList.remove('active'); });
    document.querySelectorAll('.filter').forEach(function (b) {
      b.classList.toggle('active', (b.dataset.filter || '') === 'all');
    });
    applyFilters();
  }

  /* ── Boot ── */
  function boot() {
    grid = document.querySelector('.work-grid');
    countEl = document.querySelector('.work-count');
    emptyEl = document.querySelector('.work-empty');
    chipsEl = document.querySelector('.work-chips');
    searchWrap = document.querySelector('.work-search');
    searchInput = searchWrap ? searchWrap.querySelector('input') : null;

    initFilters();
    initSearch();

    var resetBtn = emptyEl ? emptyEl.querySelector('.work-reset') : null;
    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    var clearBtn = searchWrap ? searchWrap.querySelector('.work-search-clear') : null;
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);

    fetch('/api/tags')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (tagsData) {
        if (tagsData && Array.isArray(tagsData.tags)) {
          renderChips(tagsData.tags);
        }
        applyFilters();
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
