/* ─────────────────────────────────────────────────────────────
   work.js — work-listing search + tag filtering (workstream E)

   Fetches the published project list once (/api/projects) plus the
   tag/category vocabulary (/api/tags), renders the work-grid cards
   (preserving the existing markup + reveal animation), then filters
   entirely client-side for snappy interaction.

   Combines three filter dimensions:
     • active category button (existing .filter buttons)
     • free-text search (debounced ~150ms) across
       title/description/long_description/tags/tech
     • selected tag/tech chips (multi-select, OR semantics)
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ESC = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* Category → filter key mapping (mirrors the existing data-filter keys). */
  var CAT_MAP = {
    'saas': 'saas', 'app': 'app', 'ai': 'ai', 'fintech': 'fintech',
    'e-commerce': 'web saas', 'software': 'web', 'marketing': 'web',
    'design': 'web', 'andet': 'web', 'web': 'web'
  };
  function catToFilter(cat) { return CAT_MAP[(cat || '').toLowerCase()] || 'web'; }

  /* ── State ── */
  var PROJECTS = [];          // raw project objects from /api/projects
  var activeCat = 'all';      // current category-button filter key
  var activeChips = [];       // selected tag/tech chip values (lowercased)
  var searchTerm = '';        // current debounced search string (lowercased)

  /* ── DOM refs ── */
  var grid, countEl, emptyEl, chipsEl, searchInput, searchWrap;

  /* Build the searchable text blob + the tag/tech set for a project. */
  function asArray(v) {
    if (Array.isArray(v)) return v;
    if (v == null || v === '') return [];
    return [v];
  }
  function projectTags(p) {
    return asArray(p.tags).concat(asArray(p.tech_stack))
      .map(function (t) { return String(t).toLowerCase(); });
  }
  function searchBlob(p) {
    return [
      p.title, p.description, p.long_description,
      asArray(p.tags).join(' '), asArray(p.tech_stack).join(' '),
      p.category
    ].join(' ').toLowerCase();
  }

  /* ── Card markup (preserves existing .wcard structure) ── */
  function buildWcard(p) {
    var filter = catToFilter(p.category);
    var media = p.thumbnail_url
      ? '<img src="' + ESC(p.thumbnail_url) + '" alt="' + ESC(p.title) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy" />'
      : '<div class="ph-inner"><span class="ph-label">' + ESC(p.category) + '</span></div>';
    var badge = ESC(p.category) + (p.year ? ' · ' + ESC(p.year) : '');

    return '<a href="case.html?slug=' + ESC(p.slug) + '" class="wcard" data-cat="' + ESC(filter) + '" data-reveal="up">' +
      '<div class="wcard-media' + (p.thumbnail_url ? '' : ' ph') + '">' +
        media +
        '<span class="wcard-badge tag">' + badge + '</span>' +
        '<span class="wcard-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg></span>' +
      '</div>' +
      '<div class="wcard-info"><h3 class="wcard-title">' + ESC(p.title) + '</h3>' +
        '<span class="wcard-cat mono">' + ESC(p.year || '') + '</span></div>' +
      '<p class="wcard-desc">' + ESC(p.description || '') + '</p>' +
      '</a>';
  }

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
  function matches(p, card) {
    /* Category (from the existing buttons) — read the card's data-cat
       so dynamic and static cards behave identically. */
    if (activeCat !== 'all') {
      var cats = (card.dataset.cat || '').split(' ');
      if (cats.indexOf(activeCat) === -1) return false;
    }
    /* Search across title/description/tags/tech. */
    if (searchTerm && (card._blob || '').indexOf(searchTerm) === -1) return false;
    /* Tag/tech chips — OR semantics: match if ANY selected chip matches. */
    if (activeChips.length) {
      var tags = card._tags || [];
      var hit = activeChips.some(function (c) { return tags.indexOf(c) !== -1; });
      if (!hit) return false;
    }
    return true;
  }

  function applyFilters() {
    if (!grid) return;
    var cards = grid.querySelectorAll('.wcard');
    var shown = 0;
    cards.forEach(function (card) {
      var p = card._project;
      var show = p ? matches(p, card) : (function () {
        /* Static fallback cards: only category + search apply. */
        if (activeCat !== 'all' && (card.dataset.cat || '').split(' ').indexOf(activeCat) === -1) return false;
        if (searchTerm) {
          var blob = (card.textContent || '').toLowerCase();
          if (blob.indexOf(searchTerm) === -1) return false;
        }
        if (activeChips.length) return false; // no tag data on static cards
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
    chipsEl.innerHTML = list.map(function (t) {
      return '<button type="button" class="work-chip" data-tag="' + ESC(t.toLowerCase()) + '">' + ESC(t) + '</button>';
    }).join('');
    chipsEl.querySelectorAll('.work-chip').forEach(function (chip) {
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
    searchInput.addEventListener('input', function () {
      var raw = searchInput.value;
      if (searchWrap) searchWrap.classList.toggle('has-value', raw.length > 0);
      clearTimeout(t);
      t = setTimeout(function () {
        searchTerm = raw.trim().toLowerCase();
        applyFilters();
      }, 150);
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

  /* ── Render projects into the grid + attach per-card filter metadata ── */
  function renderProjects() {
    if (!grid || !PROJECTS.length) return;
    grid.innerHTML = PROJECTS.map(buildWcard).join('');
    var cards = grid.querySelectorAll('.wcard');
    cards.forEach(function (card, i) {
      var p = PROJECTS[i];
      card._project = p;
      card._blob = searchBlob(p);
      card._tags = projectTags(p);
    });
    revealNewCards(grid);
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

    Promise.all([
      fetch('/api/projects').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/tags').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var projects = res[0];
      var tagsData = res[1];

      if (projects && projects.length) {
        PROJECTS = projects;
        renderProjects();
      }

      if (tagsData && Array.isArray(tagsData.tags)) {
        renderChips(tagsData.tags);
      }

      applyFilters();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
