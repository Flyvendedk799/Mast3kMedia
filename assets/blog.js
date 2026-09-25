/* blog.js — public list + post detail against /api/blog/* */
(function () {
  'use strict';

  var ESC = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch (_) { return null; }
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).replace(' ', 'T') + (String(iso).indexOf('Z') >= 0 || String(iso).indexOf('+') >= 0 ? '' : 'Z'));
    if (isNaN(d.getTime())) {
      // try as local sqlite datetime
      d = new Date(String(iso).replace(' ', 'T'));
    }
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    try {
      return d.toLocaleDateString('da-DK', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return String(iso).slice(0, 10);
    }
  }

  function markdownApi() {
    return window.M3kBlogMarkdown || {};
  }

  /* ── List page ── */
  function initList() {
    var grid = document.getElementById('blogGrid');
    var filters = document.getElementById('blogFilters');
    var countEl = document.getElementById('blogCount');
    var emptyEl = document.getElementById('blogEmpty');
    var pager = document.getElementById('blogPager');
    if (!grid || !filters) return;

    var state = { category: qs('category') || '', page: parseInt(qs('page') || '1', 10) || 1, limit: 12 };

    function setUrl() {
      var u = new URL(location.href);
      if (state.category) u.searchParams.set('category', state.category);
      else u.searchParams.delete('category');
      if (state.page > 1) u.searchParams.set('page', String(state.page));
      else u.searchParams.delete('page');
      history.replaceState(null, '', u.pathname + u.search);
    }

    function cardHtml(p) {
      var cat = p.category ? p.category.name : 'Indlæg';
      var media = p.cover_image
        ? '<img src="' + ESC(p.cover_image) + '" alt="' + ESC(p.title) + '" loading="lazy" />'
        : '<div class="ph-inner"><span class="ph-label">' + ESC(cat) + '</span></div>';

      // Tags display (similar to work.js)
      var tags = Array.isArray(p.tags) ? p.tags.filter(function(t){ return t && t.toLowerCase() !== String(p.category || '').toLowerCase(); }).slice(0, 3) : [];
      var tagsHtml = tags.length
        ? '<div class="bcard-tags">' +
            tags.map(function(t){ return '<span class="tag">' + ESC(t) + '</span>'; }).join('') +
          '</div>'
        : '';

      return '<a class="bcard" href="/blog/' + ESC(p.slug) + '" data-reveal="up" data-track="content" data-content-type="blog_post" data-content-id="' + ESC(p.slug) + '">' +
        '<div class="bcard-media' + (p.cover_image ? '' : ' ph') + '">' + media +
          '<span class="bcard-badge">' + ESC(cat) + '</span></div>' +
        '<div class="bcard-body">' +
          '<div class="bcard-meta"><span>' + ESC(fmtDate(p.published_at || p.created_at)) + '</span>' +
            (p.author ? '<span>' + ESC(p.author) + '</span>' : '') + '</div>' +
          '<h3 class="bcard-title">' + ESC(p.title) + '</h3>' +
          (p.excerpt ? '<p class="bcard-excerpt">' + ESC(p.excerpt) + '</p>' : '') +
          tagsHtml +
          '<span class="bcard-arrow">Læs indlæg →</span>' +
        '</div></a>';
    }

    function reveal(scope) {
      if (!(window.gsap && window.ScrollTrigger)) return;
      scope.querySelectorAll('[data-reveal="up"]').forEach(function (el) {
        gsap.fromTo(el, { y: 40, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
      });
    }

    function renderPager(pages) {
      if (!pager) return;
      if (pages <= 1) { pager.hidden = true; pager.innerHTML = ''; return; }
      pager.hidden = false;
      pager.innerHTML =
        '<button type="button" data-dir="-1"' + (state.page <= 1 ? ' disabled' : '') + '>← Forrige</button>' +
        '<span class="mono" style="align-self:center;font-size:0.75rem;color:var(--muted,#8a8a9a)">Side ' +
          state.page + ' / ' + pages + '</span>' +
        '<button type="button" data-dir="1"' + (state.page >= pages ? ' disabled' : '') + '>Næste →</button>';
      pager.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.page += parseInt(btn.getAttribute('data-dir'), 10);
          loadPosts();
        });
      });
    }

    function loadPosts() {
      setUrl();
      grid.innerHTML = '<div class="blog-loading mono">Indlæser indlæg…</div>';
      if (emptyEl) emptyEl.hidden = true;
      var url = '/api/blog/posts?page=' + state.page + '&limit=' + state.limit;
      if (state.category) url += '&category=' + encodeURIComponent(state.category);
      fetch(url).then(function (r) { return r.json(); }).then(function (data) {
        var posts = (data && data.posts) || [];
        if (countEl) {
          countEl.textContent = (data.total || 0) + ' indlæg';
        }
        if (!posts.length) {
          grid.innerHTML = '';
          if (emptyEl) emptyEl.hidden = false;
          renderPager(1);
          return;
        }
        grid.innerHTML = posts.map(cardHtml).join('');
        reveal(grid);
        renderPager(data.pages || 1);
      }).catch(function () {
        grid.innerHTML = '<div class="blog-loading mono">Kunne ikke hente indlæg.</div>';
      });
    }

    function loadCategories() {
      fetch('/api/blog/categories').then(function (r) { return r.json(); }).then(function (cats) {
        (cats || []).forEach(function (c) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'filter' + (state.category === c.slug ? ' active' : '');
          btn.setAttribute('data-category', c.slug);
          btn.textContent = c.name;
          filters.appendChild(btn);
        });
        if (state.category) {
          filters.querySelectorAll('.filter').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-category') === state.category);
          });
        }
      }).catch(function () { /* ignore */ });
    }

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      filters.querySelectorAll('.filter').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.category = btn.getAttribute('data-category') || '';
      state.page = 1;
      loadPosts();
    });

    loadCategories();
    loadPosts();
  }

  function trackPost(id, title, category) {
    if (!window.m3kTrack) return;
    m3kTrack('content_view', {
      content_type: 'blog_post',
      content_id: id || '',
      content_title: title || '',
      content_category: category || ''
    });
  }

  /* ── Post detail ── */
  function initPost() {
    var article = document.getElementById('blogArticle');
    if (!article) return;
    if (article.querySelector('.blog-post-body')) {
      trackPost(
        article.getAttribute('data-slug'),
        article.getAttribute('data-title'),
        article.getAttribute('data-category')
      );
      return;
    }
    var slug = qs('slug');
    if (!slug && location.pathname.startsWith('/blog/')) {
      var parts = location.pathname.split('/');
      if (parts.length >= 3) {
        slug = parts[2];
      }
    }
    var shell = article.querySelector('.blog-article-shell') || article;
    if (!slug) {
      shell.innerHTML = '<div class="blog-post-error">Mangler slug. <a href="/blog.html" class="ulink">Tilbage til bloggen</a></div>';
      return;
    }
    fetch('/api/blog/posts/' + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (p) {
        document.title = p.title + ' — Mast3kMedia';
        trackPost(p.slug, p.title, (p.category && p.category.name) || '');
        var desc = p.excerpt || p.title;
        var md = document.querySelector('meta[name="description"]');
        if (md) md.setAttribute('content', desc);
        // Set canonical URL
        var canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
          canonicalLink.setAttribute('href', location.origin + '/blog/' + ESC(p.slug));
        }
        // Set og:url
        var ogUrlMeta = document.querySelector('meta[property="og:url"]');
        if (!ogUrlMeta) {
          ogUrlMeta = document.createElement('meta');
          ogUrlMeta.setAttribute('property', 'og:url');
          document.head.appendChild(ogUrlMeta);
        }
        ogUrlMeta.setAttribute('content', location.origin + '/blog/' + ESC(p.slug));
        var renderArticle = markdownApi().renderBlogArticle;
        shell.innerHTML = renderArticle
          ? renderArticle(p)
          : '<div class="blog-post-error">Indholdet kunne ikke vises.</div>';
      })
      .catch(function () {
        shell.innerHTML = '<div class="blog-post-error">Indlægget blev ikke fundet. <a href="/blog.html" class="ulink">Tilbage til bloggen</a></div>';
      });
  }

  if (document.getElementById('blogGrid')) initList();
  if (document.getElementById('blogArticle')) initPost();
})();
