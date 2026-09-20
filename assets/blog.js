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

  /* Lightweight markdown → HTML (headings, lists, code, paragraphs, links, bold/italic, images).
     No longer treats HTML-like bodies as raw HTML to allow markdown image processing. */
  function renderBody(raw) {
    var src = String(raw || '');
    if (!src.trim()) return '<p class="faint">Ingen indhold.</p>';

    var lines = src.replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var inUl = false, inOl = false, inCode = false, codeBuf = [];

    function closeLists() {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    }
    function inline(t) {
      return ESC(t)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
    }
    function isAllowedImageUrl(url) {
      // Allow http(s) and site-relative /uploads/... and /assets/...
      return (/^https?:\/\//i.test(url) || /^\/uploads\//.test(url) || /^\/assets\//.test(url));
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('```') === 0) {
        if (inCode) {
          out.push('<pre><code>' + ESC(codeBuf.join('\n')) + '</code></pre>');
          codeBuf = []; inCode = false;
        } else {
          closeLists(); inCode = true;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      if (/^\s*$/.test(line)) { closeLists(); continue; }

      // Check for markdown image: ![alt](url)
      var imgMatch = line.match(/^\s*!\s*\[([^\]]*)\]\s*\(([^)]+)\)\s*$/);
      if (imgMatch) {
        var alt = imgMatch[1];
        var url = imgMatch[2];
        var caption = '';

        // Check next line for optional caption (italic line)
        if (i + 1 < lines.length) {
          var nextLine = lines[i + 1];
          var capMatch = nextLine.match(/^\s*\*([^*]+)\*\s*$/) || nextLine.match(/^\s*_([^_]+)_\s*$/);
          if (capMatch) {
            caption = capMatch[1];
            i++; // skip the caption line
          }
        }

        // Build image HTML only if URL is allowed
        if (isAllowedImageUrl(url)) {
          var imgTag = '<img src="' + ESC(url) + '" alt="' + ESC(alt) + '" loading="lazy" />';
          if (caption) {
            out.push('<figure>' + imgTag + '<figcaption>' + ESC(caption) + '</figcaption></figure>');
          } else {
            out.push('<p>' + imgTag + '</p>');
          }
        } else {
          // If URL not allowed, treat as plain text (so the image syntax is shown as text)
          closeLists();
          out.push('<p>' + inline(line) + '</p>');
        }
        continue;
      }

      var hm = line.match(/^(#{1,3})\s+(.+)$/);
      if (hm) {
        closeLists();
        var tag = 'h' + (hm[1].length + 1);
        if (hm[1].length === 1) tag = 'h2';
        else if (hm[1].length === 2) tag = 'h3';
        else tag = 'h3';
        out.push('<' + tag + '>' + inline(hm[2]) + '</' + tag + '>');
        continue;
      }

      var ul = line.match(/^\s*[-*]\s+(.+)$/);
      if (ul) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push('<li>' + inline(ul[1]) + '</li>');
        continue;
      }
      var ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ol) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push('<li>' + inline(ol[1]) + '</li>');
        continue;
      }

      closeLists();
      out.push('<p>' + inline(line) + '</p>');
    }
    closeLists();
    if (inCode) out.push('<pre><code>' + ESC(codeBuf.join('\n')) + '</code></pre>');
    return out.join('\n');
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

      return '<a class="bcard" href="/blog/' + ESC(p.slug) + '" data-reveal="up">' +
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

  /* ── Post detail ── */
  function initPost() {
    var article = document.getElementById('blogArticle');
    if (!article) return;
    var slug = qs('slug');
    if (!slug && location.pathname.startsWith('/blog/')) {
      var parts = location.pathname.split('/');
      if (parts.length >= 3) {
        slug = parts[2];
      }
    }
    var shell = article.querySelector('.blog-article-shell') || article;
    if (!slug) {
      shell.innerHTML = '<div class="blog-post-error">Mangler slug. <a href="blog.html" class="ulink">Tilbage til bloggen</a></div>';
      return;
    }
    fetch('/api/blog/posts/' + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (p) {
        document.title = p.title + ' — Mast3kMedia';
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
        var cat = p.category ? '<span class="blog-post-cat">' + ESC(p.category.name) + '</span>' : '';
      // Tags display
      var tags = Array.isArray(p.tags) ? p.tags.filter(function(t){ return t && t.toLowerCase() !== String(p.category || '').toLowerCase(); }).slice(0, 3) : [];
      var tagsHtml = tags.length
        ? '<div class="blog-post-tags">' +
            tags.map(function(t){ return '<span class="tag">' + ESC(t) + '</span>'; }).join('') +
          '</div>'
        : '';
      shell.innerHTML =
        '<span class="crumb mono blog-post-crumb"><a href="index.html">Forside</a> <span class="sep">/</span> <a href="blog.html">Blog</a> <span class="sep">/</span> ' + ESC(p.title) + '</span>' +
        '<div class="blog-post-meta">' + cat +
          '<span>' + ESC(fmtDate(p.published_at || p.created_at)) + '</span>' +
          (p.author ? '<span>' + ESC(p.author) + '</span>' : '') +
        '</div>' +
        tagsHtml +
        '<h1 class="blog-post-title display">' + ESC(p.title) + '</h1>' +
        (p.excerpt ? '<p class="blog-post-excerpt">' + ESC(p.excerpt) + '</p>' : '') +
        (p.cover_image ? '<div class="blog-post-cover"><img src="' + ESC(p.cover_image) + '" alt="' + ESC(p.title) + '" /></div>' : '') +
        '<div class="blog-post-body">' + renderBody(p.body) + '</div>';
      })
      .catch(function () {
        shell.innerHTML = '<div class="blog-post-error">Indlægget blev ikke fundet. <a href="blog.html" class="ulink">Tilbage til bloggen</a></div>';
      });
  }

  if (document.getElementById('blogGrid')) initList();
  if (document.getElementById('blogArticle')) initPost();
})();
