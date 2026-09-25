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
      var external = /^https?:/i.test(raw);
      var rel = external ? ' rel="noopener noreferrer"' : '';
      return prefix + '<a href="' + url + '"' + rel + '>' + text + '</a>';
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

  function parseMarkdown(raw) {
    var src = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!src.trim()) return '';
    var lines = src.split('\n');
    var out = [];
    var listStack = [];
    var inCode = false;
    var codeBuf = [];

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
        out.push('<' + tag + '>' + inline(text) + '</' + tag + '>');
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
        var inner = parseMarkdown(quote.join('\n'));
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
      out.push('<p>' + inline(line) + '</p>');
    }

    closeLists();
    if (inCode) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
    return out.join('\n');
  }

  function renderBlogMarkdown(raw) {
    var html = parseMarkdown(raw);
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
      return d.toLocaleDateString('da-DK', { year: 'numeric', month: 'short', day: 'numeric' });
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
          return t && String(t).toLowerCase() !== String(p.category || '').toLowerCase();
        }).slice(0, 3)
      : [];
    var tagsHtml = tags.length
      ? '<div class="blog-post-tags">' +
          tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '</div>'
      : '';
    return '<span class="crumb mono blog-post-crumb"><a href="/">Forside</a> <span class="sep">/</span> <a href="/blog.html">Blog</a> <span class="sep">/</span> ' + esc(p.title) + '</span>' +
      '<div class="blog-post-meta">' + cat +
        '<span>' + esc(fmtDate(p.published_at || p.created_at)) + '</span>' +
        (p.author ? '<span>' + esc(p.author) + '</span>' : '') +
      '</div>' +
      tagsHtml +
      '<h1 class="blog-post-title display">' + esc(p.title) + '</h1>' +
      (p.excerpt ? '<p class="blog-post-excerpt">' + esc(p.excerpt) + '</p>' : '') +
      (p.cover_image ? '<div class="blog-post-cover"><img src="' + esc(p.cover_image) + '" alt="' + esc(p.title) + '" /></div>' : '') +
      '<div class="blog-post-body">' + renderBlogMarkdown(p.body) + '</div>';
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

  return {
    renderBlogMarkdown: renderBlogMarkdown,
    renderBlogArticle: renderBlogArticle,
    injectBlogArticle: injectBlogArticle,
  };
});
