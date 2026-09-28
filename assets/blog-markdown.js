/* Shared blog markdown → HTML.
   Used by the browser (assets/blog.js) and by server.js so the post body
   is in the first HTML response. HTML in the source is escaped. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.M3kBlogMarkdown = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function unescapeHtml(s) {
    return String(s)
      .replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  function isAllowedImageUrl(url) {
    return (/^https?:\/\//i.test(url) || /^\/uploads\//.test(url) || /^\/assets\//.test(url));
  }

  function isSafeHref(url) {
    var u = String(url || '').trim();
    if (!u || /[\u0000-\u001f\\]/.test(u)) return false;
    if (/^(https?:|mailto:|tel:)/i.test(u)) return true;
    if (u.charAt(0) === '#') return true;
    if (u.charAt(0) === '/') return u.charAt(1) !== '/' && u.charAt(1) !== '\\';
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false;
    return true;
  }

  function inline(t) {
    var codes = [];
    var s = esc(t).replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return '\uE000C' + (codes.length - 1) + '\uE000';
    });
    s = s.replace(/!\[([^\]]*)\]\(((?:[^()\s]|\([^)]*\))+)\)/g, function (full, alt, url) {
      var raw = unescapeHtml(url).trim();
      if (!isAllowedImageUrl(raw)) return full;
      return '<img src="' + url + '" alt="' + alt + '" loading="lazy" />';
    });
    s = s.replace(/(^|[^!])\[([^\]]+)\]\(((?:[^()\s]|\([^)]*\))+)\)/g, function (full, prefix, text, url) {
      var raw = unescapeHtml(url).trim();
      if (!isSafeHref(raw)) return full;
      
      // T2.1 Internal link normalisation
      if (raw.indexOf('https://mast3kmedia.dk/') === 0) {
        raw = raw.substring(22); // strip domain
        if (raw === '' || raw === '/') raw = '/';
        else if (/^\/(kontakt|ydelser|arbejde|pris|blog|om|oss|saas)$/.test(raw)) raw += '.html';
      }
      
      var external = /^https?:/i.test(raw);
      var rel = external ? ' rel="noopener noreferrer"' : '';
      return prefix + '<a href="' + raw + '"' + rel + '>' + text + '</a>';
    });
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\uE000C(\d+)\uE000/g, function (_, i) {
      return '<code>' + codes[Number(i)] + '</code>';
    });
    return s;
  }

  /* The post <h1> is the title. A single '#' stays an h2 so the body
     does not add a second h1. ## → h2, ### → h3, #### → h4. */
  function headingTag(level) {
    if (level <= 2) return 'h2';
    if (level === 3) return 'h3';
    if (level === 4) return 'h4';
    if (level === 5) return 'h5';
    return 'h6';
  }

  function headingId(html, ids) {
    var base = unescapeHtml(html.replace(/<[^>]+>/g, '')).toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'afsnit';
    var id = base;
    for (var n = 2; ids[id]; n++) id = base + '-' + n;
    ids[id] = true;
    return id;
  }

  function isHr(line) {
    return /^\s*((?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})\s*$/.test(line);
  }

  function splitRow(line) {
    var t = String(line).trim();
    if (t.indexOf('|') === -1) return null;
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    var parts = [];
    var cur = '';
    for (var i = 0; i < t.length; i++) {
      if (t.charAt(i) === '\\' && t.charAt(i + 1) === '|') {
        cur += '|';
        i++;
        continue;
      }
      if (t.charAt(i) === '|') {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
      cur += t.charAt(i);
    }
    parts.push(cur.trim());
    return parts;
  }

  function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every(function (c) {
      return /^:?-{3,}:?$/.test(c);
    });
  }

  function columnAlign(spec) {
    var left = spec.charAt(0) === ':';
    var right = spec.charAt(spec.length - 1) === ':';
    if (left && right) return 'center';
    if (right) return 'right';
    return '';
  }

  function cellHtml(tag, text, align) {
    var style = align ? ' style="text-align:' + align + '"' : '';
    var scope = tag === 'th' ? ' scope="col"' : '';
    return '<' + tag + scope + style + '>' + inline(text || '') + '</' + tag + '>';
  }

  function tryParseTable(lines, start) {
    if (start + 1 >= lines.length) return null;
    if (lines[start].indexOf('|') === -1) return null;
    if (/^\s*([-*]|\d+\.)\s+/.test(lines[start]) && !/^\s*\|/.test(lines[start])) return null;
    var header = splitRow(lines[start]);
    var sep = splitRow(lines[start + 1]);
    if (!header || !sep || !header.length || header.length !== sep.length || !isSeparatorRow(sep)) return null;
    var aligns = sep.map(columnAlign);
    var body = [];
    var i = start + 2;
    while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') !== -1) {
      var row = splitRow(lines[i]);
      if (!row) break;
      body.push(row);
      i++;
    }
    var html = ['<div class="blog-table-wrap"><table><thead><tr>'];
    for (var c = 0; c < header.length; c++) html.push(cellHtml('th', header[c], aligns[c]));
    html.push('</tr></thead>');
    if (body.length) {
      html.push('<tbody>');
      for (var r = 0; r < body.length; r++) {
        html.push('<tr>');
        for (var c2 = 0; c2 < header.length; c2++) html.push(cellHtml('td', body[r][c2] || '', aligns[c2]));
        html.push('</tr>');
      }
      html.push('</tbody>');
    }
    html.push('</table></div>');
    return { html: html.join(''), next: i };
  }

  function parseMarkdown(raw, state) {
    state = state || { ids: {}, toc: [], faq: [] };
    var src = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!src.trim()) return '';
    var lines = src.split('\n');
    var out = [];
    var listStack = [];
    var inCode = false;
    var codeBuf = [];
    
    var faqMode = false;
    var curQ = null;
    var curA = [];

    function closeFaq() {
      if (curQ && state.faq) state.faq.push({ q: curQ, a: curA.join('\n\n') });
      curQ = null;
      curA = [];
    }

    function closeLists() {
      while (listStack.length) {
        var top = listStack.pop();
        if (top.liOpen) out.push('</li>');
        out.push(top.ordered ? '</ol>' : '</ul>');
      }
    }

    function pushItem(level, ordered, text) {
      while (listStack.length && listStack[listStack.length - 1].level > level) {
        var deeper = listStack.pop();
        if (deeper.liOpen) out.push('</li>');
        out.push(deeper.ordered ? '</ol>' : '</ul>');
      }
      var top = listStack[listStack.length - 1];
      if (top && top.level === level && top.ordered !== ordered) {
        if (top.liOpen) out.push('</li>');
        out.push(top.ordered ? '</ol>' : '</ul>');
        listStack.pop();
        top = listStack[listStack.length - 1];
      }
      if (!top || top.level < level) {
        out.push(ordered ? '<ol>' : '<ul>');
        listStack.push({ level: level, ordered: ordered, liOpen: false });
        top = listStack[listStack.length - 1];
      }
      if (top.liOpen) out.push('</li>');
      out.push('<li>' + inline(text));
      top.liOpen = true;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (/^\s*```/.test(line)) {
        if (inCode) {
          out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
          codeBuf = [];
          inCode = false;
        } else {
          closeLists();
          inCode = true;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      if (/^\s*$/.test(line)) { closeLists(); continue; }

      if (isHr(line)) {
        closeLists();
        out.push('<hr />');
        continue;
      }

      var hm = line.match(/^(#{1,6})\s+(.+)$/);
      if (hm) {
        closeLists();
        var text = hm[2].replace(/\s+#+\s*$/, '');
        var tag = headingTag(hm[1].length);
        var content = inline(text);
        if (tag === 'h2') {
          closeFaq();
          faqMode = /^(FAQ|Ofte stillede spørgsmål|Spørgsmål og svar)/i.test(text);
          var id = headingId(content, state.ids);
          if (state.toc) state.toc.push({ id: id, text: content.replace(/<[^>]+>/g, '') });
          out.push('<h2 id="' + id + '">' + content + '</h2>');
        } else if (tag === 'h3' && faqMode) {
          closeFaq();
          curQ = text;
          out.push('<' + tag + '>' + content + '</' + tag + '>');
        } else {
          out.push('<' + tag + '>' + content + '</' + tag + '>');
        }
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        closeLists();
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        i--;
        var inner = parseMarkdown(quote.join('\n'), { ids: state.ids, toc: null });
        out.push('<blockquote>' + inner + '</blockquote>');
        continue;
      }

      var imgMatch = line.match(/^\s*!\s*\[([^\]]*)\]\s*\(([^)]+)\)\s*$/);
      if (imgMatch) {
        closeLists();
        var alt = imgMatch[1];
        var url = imgMatch[2].trim();
        if (isAllowedImageUrl(url)) {
          var caption = '';
          if (i + 1 < lines.length) {
            var capMatch = lines[i + 1].match(/^\s*\*([^*]+)\*\s*$/) || lines[i + 1].match(/^\s*_([^_]+)_\s*$/);
            if (capMatch) {
              caption = capMatch[1];
              i++;
            }
          }
          var imgTag = '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy" />';
          out.push(caption
            ? '<figure>' + imgTag + '<figcaption>' + inline(caption) + '</figcaption></figure>'
            : '<p>' + imgTag + '</p>');
        } else {
          out.push('<p>' + inline(line) + '</p>');
        }
        continue;
      }

      var listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        var indent = listMatch[1].replace(/\t/g, '    ').length;
        var level = Math.floor(indent / 2);
        pushItem(level, /\d+\./.test(listMatch[2]), listMatch[3]);
        continue;
      }

      var table = tryParseTable(lines, i);
      if (table) {
        closeLists();
        out.push(table.html);
        i = table.next - 1;
        continue;
      }

      closeLists();
      if (faqMode && curQ) curA.push(line);
      out.push('<p>' + inline(line) + '</p>');
    }

    closeFaq();
    closeLists();
    if (inCode) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
    return out.join('\n');
  }

  function renderBlogMarkdown(raw, state) {
    var html = parseMarkdown(raw, state);
    if (!html || !String(html).trim()) return '<p class="faint">Ingen indhold.</p>';
    return html;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var raw = String(iso);
    var hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
    var d = new Date(raw.replace(' ', 'T') + (hasZone ? '' : 'Z'));
    if (isNaN(d.getTime())) d = new Date(raw.replace(' ', 'T'));
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    try {
      return d.toLocaleDateString('da-DK', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/Copenhagen' });
    } catch (_) {
      return raw.slice(0, 10);
    }
  }

  function renderBlogArticle(p) {
    p = p || {};
    var cat = p.category && p.category.name
      ? '<span class="blog-post-cat">' + esc(p.category.name) + '</span>'
      : '';
    var tags = Array.isArray(p.tags)
      ? p.tags.filter(function (t) {
          var cn = p.category && typeof p.category === 'object' ? p.category.name : (p.category_name || p.category || '');
          return t && String(t).toLowerCase() !== String(cn).toLowerCase();
        })
      : [];
    var tagsHtml = tags.length
      ? '<div class="blog-post-tags">' +
          tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '</div>'
      : '';
    var state = { ids: {}, toc: [] };
    var bodyHtml = renderBlogMarkdown(p.body, state);
    var words = String(p.body || '').split(/\s+/).filter(Boolean).length;
    var date = esc(fmtDate(p.published_at || p.created_at));
    var author = p.author ? '<span>' + esc(p.author) + '</span>' : '';
    var toc = state.toc.length > 1
      ? '<nav class="blog-post-toc" aria-label="Indhold"><span class="blog-post-rail-label">Indhold</span><ol>' +
          state.toc.map(function (h) { return '<li><a href="#' + h.id + '">' + h.text + '</a></li>'; }).join('') +
        '</ol></nav>'
      : '';
    var rail = '<aside class="blog-post-rail">' + toc +
      '<div class="blog-post-rail-meta">' + cat + '<span>' + date + '</span>' + author +
        '<span>' + Math.max(1, Math.round(words / 220)) + ' min. læsning</span></div>' +
      tagsHtml + '</aside>';
    var authorHtml = p.author === 'Tobias Mastek' 
      ? '<div class="author-box section-pad" style="margin-top:2rem;padding:2rem;background:var(--card-bg);border-radius:var(--radius-lg);display:flex;align-items:center;gap:1rem;">' +
          '<div class="ph" style="width:60px;height:60px;border-radius:50%;display:grid;place-items:center;font-weight:bold;">TM</div>' +
          '<div><strong style="display:block;margin-bottom:0.2rem;"><a href="/forfatter/tobias-mastek" style="color:var(--text);text-decoration:none;">Tobias Mastek</a></strong>' +
          '<p class="muted" style="margin:0;font-size:0.9rem;">Stifter af Mast3kMedia. Udvikler og designer med fokus på SaaS og AI.</p></div>' +
        '</div>'
      : '';

    return '<span class="crumb mono blog-post-crumb"><a href="/">Forside</a> <span class="sep">/</span> <a href="/blog.html">Blog</a> <span class="sep">/</span> ' + esc(p.title) + '</span>' +
      '<div class="blog-post-meta">' + cat +
        '<time datetime="' + (p.published_at || p.created_at) + '">' + date + '</time>' + author +
      '</div>' +
      tagsHtml +
      '<h1 class="blog-post-title display">' + esc(p.title) + '</h1>' +
      (p.excerpt ? '<p class="blog-post-excerpt">' + esc(p.excerpt) + '</p>' : '') +
      (p.cover_image ? '<div class="blog-post-cover"><img src="' + esc(p.cover_image) + '" alt="' + esc(p.cover_alt || p.title) + '" width="1600" height="900" fetchpriority="high" decoding="async" /></div>' : '') +
      '<div class="blog-post-body">' + bodyHtml + authorHtml + '</div>' + rail;
  }

  function injectBlogArticle(templateHtml, post) {
    var category = post && post.category && post.category.name ? post.category.name : '';
    var html = String(templateHtml || '').replace(
      '<article class="blog-article" id="blogArticle">',
      '<article class="blog-article" id="blogArticle" data-slug="' + esc(post && post.slug) +
        '" data-title="' + esc(post && post.title) +
        '" data-category="' + esc(category) + '">'
    );
    return html.replace(
      /<div class="blog-loading mono" id="blogPostLoading">[\s\S]*?<\/div>/,
      function () { return renderBlogArticle(post); }
    );
  }

  function renderBlogCard(p) {
    if (!p) return '';
    var catName = p.category && p.category.name ? esc(p.category.name) : '';
    var tags = Array.isArray(p.tags)
      ? p.tags.filter(function (t) { return t && String(t).toLowerCase() !== String(catName).toLowerCase(); }).slice(0, 3)
      : [];
    var tagsHtml = tags.length
      ? '<div class="bcard-tags">' + tags.map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>'
      : '';
    var mediaHtml = p.cover_image
      ? '<img src="' + esc(p.cover_image) + '" alt="' + esc(p.title) + '" loading="lazy" />'
      : '<div class="ph-inner"><span class="ph-label">' + catName + '</span></div>';
    var badge = catName + ' · ' + esc(fmtDate(p.published_at || p.created_at));
    
    return '<a href="/blog/' + esc(p.slug) + '" class="bcard" data-reveal="up">' +
      '<div class="bcard-media' + (p.cover_image ? '' : ' ph') + '">' +
        mediaHtml +
        '<span class="bcard-badge">' + badge + '</span>' +
      '</div>' +
      '<div class="bcard-info">' +
        '<h3 class="bcard-title">' + esc(p.title) + '</h3>' +
        (p.excerpt ? '<p class="bcard-desc">' + esc(p.excerpt) + '</p>' : '') +
        tagsHtml +
      '</div></a>';
  }

  function renderBlogPager(state) {
    var page = Number(state.page) || 1;
    var pages = Number(state.pages) || 1;
    var base = state.base || '/blog.html';
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    var html = [];
    if (page > 1) {
      var prev = page === 2 ? base : base + sep + 'page=' + (page - 1);
      html.push('<a href="' + prev + '" class="btn" rel="prev">Forrige side</a>');
    }
    if (page < pages) {
      html.push('<a href="' + base + sep + 'page=' + (page + 1) + '" class="btn" rel="next">Næste side</a>');
    }
    return html.join('');
  }

  return {
    parseMarkdown: parseMarkdown,
    renderBlogMarkdown: renderBlogMarkdown,
    renderBlogArticle: renderBlogArticle,
    injectBlogArticle: injectBlogArticle,
    renderBlogCard: renderBlogCard,
    renderBlogPager: renderBlogPager,
  };
});
