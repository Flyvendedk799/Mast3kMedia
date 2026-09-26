(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.M3kCaseRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function attr(s) {
    return esc(s);
  }

  function inferProvider(item) {
    if (item && item.provider) return item.provider;
    var u = String((item && item.url) || '');
    if (/youtube\.com|youtu\.be/i.test(u)) return 'youtube';
    if (/vimeo\.com/i.test(u)) return 'vimeo';
    if (/\.(mp4|webm)(\?|#|$)/i.test(u)) return 'mp4';
    return 'file';
  }

  function isVideoItem(item) {
    if (!item) return false;
    if (item.type === 'video' || item.type === 'embed' || item.role === 'demo') return true;
    var p = inferProvider(item);
    return p === 'youtube' || p === 'vimeo' || p === 'mp4';
  }

  function isImage(item) {
    return item && item.url && !isVideoItem(item);
  }

  function roleOf(item) {
    return (item && item.role) || 'gallery';
  }

  function mediaCaption(item, fb) {
    return esc((item && (item.caption || item.alt)) || fb || 'Produktvisning');
  }

  function getMedia(p) {
    return (Array.isArray(p.media) ? p.media : []).filter(function (item) { return item && item.url; });
  }

  function byRole(media, role) {
    return media.filter(function (m) { return roleOf(m) === role; });
  }

  function imageMarkup(item, label) {
    var alt = attr((item && (item.alt || item.caption)) || label || 'Produktscreenshot');
    return '<img class="case-media-img" src="' + attr(item.url) + '" alt="' + alt + '" loading="lazy" decoding="async">';
  }

  function mdLite(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function renderHero(p, media) {
    var heroItem = byRole(media, 'hero')[0] || media.filter(isVideoItem)[0] || media.filter(isImage)[0] ||
      (p.thumbnail_url ? { type: 'image', url: p.thumbnail_url, caption: p.title, alt: p.title } : null);

    var pillsHtml = '';
    if (p.category) pillsHtml += '<span class="tag">' + esc(p.category) + '</span>';
    if (p.year) pillsHtml += '<span class="tag">' + esc(p.year) + '</span>';
    if (p.status) pillsHtml += '<span class="tag">' + esc(p.status) + '</span>';
    if (p.case_url) {
      pillsHtml += '<a href="' + attr(p.case_url) + '" target="_blank" rel="noopener" class="pill-live is-link" title="Besøg live projekt">' +
        '<span class="dot"></span>Live i produktion <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-left:4px;vertical-align:middle"><path d="M7 17 17 7M7 7h10v10"/></svg></a>';
    }

    var metaItems = [];
    var clientVal = p.client || (p.category && p.category.toLowerCase() === 'saas' ? 'Eget produkt' : '');
    if (clientVal) metaItems.push({ label: 'Kunde', val: clientVal });
    if (p.industry) metaItems.push({ label: 'Branche', val: p.industry });
    var servicesVal = p.services || '';
    if (servicesVal) metaItems.push({ label: 'Ydelser', val: servicesVal });
    if (p.deliverables) metaItems.push({ label: 'Leverancer', val: p.deliverables });
    if (p.role_scope) metaItems.push({ label: 'Rolle', val: p.role_scope });
    if (p.year) metaItems.push({ label: 'År', val: String(p.year) });
    var timelineVal = p.timeline || p.duration;
    if (timelineVal) metaItems.push({ label: 'Tidslinje', val: timelineVal, accent: true });
    if (p.case_url) metaItems.push({ label: 'Live site', val: '<a href="' + attr(p.case_url) + '" target="_blank" rel="noopener" class="kv-link" style="color:var(--lime);display:inline-flex;align-items:center;gap:4px">Besøg live projekt <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg></a>', isHtml: true });

    var metaListHtml = '';
    if (metaItems.length) {
      metaListHtml = '<dl class="case-meta-list rail rail-' + Math.min(metaItems.length, 5) + '" data-reveal="up">' +
        metaItems.map(function (it) {
          return '<div class="cml rail-kv' + (it.accent ? ' is-accent' : '') + '">' +
            '<dt class="kv-k">' + esc(it.label) + '</dt>' +
            '<dd class="kv-v">' + (it.isHtml ? it.val : esc(it.val)) + '</dd></div>';
        }).join('') + '</dl>';
    }

    var mediaHtml = '';
    if (heroItem) {
      if (isVideoItem(heroItem)) {
        var prov = inferProvider(heroItem);
        if (heroItem.type === 'embed' || prov === 'youtube' || prov === 'vimeo') {
          // We can't generate the full Lightbox embedURL on the server, fallback to a simple iframe or the poster
          mediaHtml = '<iframe class="case-hero-embed" src="' + attr(heroItem.url) + '" allow="fullscreen; picture-in-picture" allowfullscreen title="' + attr(heroItem.caption || p.title) + '"></iframe>';
        } else {
          mediaHtml = '<video class="case-media-img" src="' + attr(heroItem.url) + '" controls playsinline preload="metadata"' + (heroItem.poster ? ' poster="' + attr(heroItem.poster) + '"' : '') + '></video>';
        }
        if (heroItem.caption) mediaHtml += '<div class="case-media-caption">' + mediaCaption(heroItem, p.title) + '</div>';
      } else {
        mediaHtml = imageMarkup(heroItem, p.title) + '<div class="case-media-caption">' + mediaCaption(heroItem, p.title) + '</div>';
      }
    } else {
      mediaHtml = '<div class="ph-inner"><span class="ph-label">' + esc(p.title || 'Produktvisning') + '</span></div>';
    }

    var subtitleHtml = p.subtitle ? '<p class="page-subtitle" data-reveal="up">' + esc(p.subtitle) + '</p>' : '';
    var introHtml = p.description ? '<p class="page-intro" data-reveal="up">' + esc(p.description) + '</p>' : '';

    return '<section class="page-hero">' +
      '<div class="shell shell-read">' +
      '<span class="crumb mono"><a href="/">Forside</a> <span class="sep">/</span> <a href="/arbejde.html">Arbejde</a> <span class="sep">/</span> ' + esc(p.title) + '</span>' +
      '<div class="case-pills" data-reveal="up">' + pillsHtml + '</div>' +
      '<h1 class="page-title display" data-reveal="lines">' +
      '<span class="line-wrap"><span class="line-inner">' + esc(p.title) + '<span class="lime">.</span></span></span>' +
      '</h1>' +
      subtitleHtml +
      introHtml +
      metaListHtml +
      '<div class="case-hero-media' + (!heroItem ? ' ph ph-bloom' : '') + '" data-reveal="clip">' + mediaHtml + '</div>' +
      '</div>' +
      '</section>';
  }

  function formatParagraphs(text) {
    if (!text) return '';
    return String(text).split(/\n\s*\n|\r\n\s*\r\n/).map(function (para) {
      var trimmed = para.trim();
      return trimmed ? '<p class="muted" style="margin-bottom:1rem">' + esc(trimmed).replace(/\n/g, '<br>') + '</p>' : '';
    }).join('');
  }

  function renderOverview(p) {
    if (!p.long_description) return '';
    return '<section class="section-pad" style="padding-top:clamp(2.5rem,5vw,4rem)">' +
      '<div class="shell shell-read">' +
      '<div class="case-brief" data-reveal="up">' + formatParagraphs(p.long_description) + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderMetricChart(p) {
    if (!p.metrics || !p.metrics.length) return '';
    var items = p.metrics.filter(function (m) { return m.value && m.label; });
    if (!items.length) return '';
    
    // Simplification for metric band, omitting the complex chart logic on server side unless required
    var metricsHtml = items.map(function(m){
      return '<div class="metric"><div class="metric-n">' + esc(m.value) + '</div><div class="metric-l">' + esc(m.label) + '</div></div>';
    }).join('');
    
    return '<section class="section-pad" style="padding-block:clamp(2rem,4vw,3rem)">' +
      '<div class="shell shell-read">' +
      '<div class="ih ih-tight" data-reveal="up"><span class="eyebrow">Resultater</span></div>' +
      '<div class="metric-band" data-reveal="up" style="grid-template-columns: repeat(' + items.length + ', 1fr)">' +
      metricsHtml +
      '</div>' +
      '</div>' +
      '</section>';
  }

  function renderChallengeApproach(p) {
    if (!p.challenge && !p.approach) return '';
    var html = '';
    if (p.challenge) {
      html += '<div data-reveal="up">' +
        '<span class="eyebrow">Udfordringen</span>' +
        '<h2 class="ih-title display" style="margin-bottom:1.4rem">Problemet der skulle løses.</h2>' +
        formatParagraphs(p.challenge) +
        '</div>';
    }
    if (p.approach) {
      html += '<div data-reveal="up">' +
        '<span class="eyebrow">Tilgangen</span>' +
        '<h2 class="ih-title display" style="margin-bottom:1.4rem">Sådan løste vi det.</h2>' +
        formatParagraphs(p.approach) +
        '</div>';
    }
    var gridStyle = (!p.challenge || !p.approach) ? ' style="grid-template-columns: 1fr"' : '';
    return '<section class="section-pad" style="padding-top:clamp(2rem,4vw,3rem)">' +
      '<div class="shell about-cols"' + gridStyle + '>' + html + '</div>' +
      '</section>';
  }

  function renderFeatureShowcase(p, media) {
    var features = byRole(media, 'feature').filter(isImage);
    if (features.length < 1) return '';
    var domain = p.case_url ? p.case_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : (p.slug || 'produkt') + '.app';
    
    var tabsHtml = features.map(function(f, i){
      var label = (f.caption || f.alt || ('Visning ' + (i + 1)));
      var desc = (f.alt && f.alt !== label) ? f.alt : (f.caption && f.caption !== label ? f.caption : '');
      return '<button class="feat-tab' + (i === 0 ? ' active' : '') + '" type="button" role="tab" aria-selected="' + (i === 0) + '" data-feature-index="' + i + '">' +
        '<span class="ft-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg></span>' +
        '<span><h4>' + esc(label) + '</h4>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</span>' +
      '</button>';
    }).join('');

    var mockUrl = (p.case_url ? '<a href="' + attr(p.case_url) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px">' : '') +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' +
      esc(domain) + (p.case_url ? ' <span style="font-size:10px;opacity:0.7">↗</span></a>' : '');

    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up">' +
      '<span class="eyebrow">Highlights</span>' +
      '<h2 class="ih-title display">Funktioner der gør forskellen.</h2>' +
      '<p class="ih-sub">Klik dig igennem de centrale produktflader.</p>' +
      '</div>' +
      '<div class="showcase dynamic-showcase" data-showcase data-reveal="up">' +
      '<div class="feat-tabs" role="tablist">' + tabsHtml + '</div>' +
      '<div class="showcase-stage">' +
      '<span class="showcase-progress" style="width:100%"></span>' +
      '<div class="mock">' +
      '<div class="mock-bar"><div class="mock-dots"><span></span><span></span><span></span></div><div class="mock-url">' + mockUrl + '</div></div>' +
      '<div class="mock-screen">' + imageMarkup(features[0], features[0].caption) +
      '<span class="mock-label">' + esc(features[0].caption || 'Visning 1') + '</span></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>';
  }

  function renderBeforeAfter(p, media) {
    var before = byRole(media, 'before')[0];
    var after = byRole(media, 'after')[0];
    if (!before || !after) return '';
    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up">' +
      '<span class="eyebrow">Før / efter</span>' +
      '<h2 class="ih-title display">Se forskellen.</h2>' +
      '<p class="ih-sub">Træk i skyderen for at sammenligne før og efter.</p>' +
      '</div>' +
      '<div class="ba ba-media" data-ba data-reveal="clip">' +
      '<div class="ba-layer ba-before">' + imageMarkup(before, 'Før') + '<span class="ba-tag">' + esc(before.caption || 'Før') + '</span></div>' +
      '<div class="ba-layer ba-after" style="clip-path:inset(0 0 0 50%)">' + imageMarkup(after, 'Efter') + '<span class="ba-tag">' + esc(after.caption || 'Efter') + '</span></div>' +
      '<div class="ba-handle"><span class="ba-knob"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></span></div>' +
      '</div>' +
      '</div>' +
      '</section>';
  }

  function renderResults(p) {
    if (!p.results) return '';
    return '<section class="section-pad results-section">' +
      '<div class="shell"><div class="results-content" data-reveal="up">' +
      '<span class="eyebrow">Resultater</span>' +
      '<h2 class="ih-title display" style="margin-bottom:1.4rem">Hvad vi opnåede.</h2>' +
      formatParagraphs(p.results) +
      '</div></div>' +
      '</section>';
  }

  function renderGallery(p, media) {
    var images = media.filter(function (m) { return isImage(m) && (roleOf(m) === 'gallery' || roleOf(m) === 'demo'); });
    if (!images.length) return '';
    var classes = ['wide', 'tall', 'half', 'half', 'full'];
    var shotsHtml = images.map(function (item, i) {
      var cls = classes[i] || (i % 2 ? 'half' : 'wide');
      return '<figure class="shot ' + cls + '">' + imageMarkup(item, item.caption || p.title) +
        '<figcaption>' + mediaCaption(item, 'Produktscreenshot') + '</figcaption></figure>';
    }).join('');
    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">Inde i produktet</span><h2 class="ih-title display">Screenshots.</h2></div>' +
      '<div class="shots" data-reveal="stagger">' + shotsHtml + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderDeviceShowcase(p, media) {
    var desktop = byRole(media, 'device-desktop')[0];
    var mobile = byRole(media, 'device-mobile')[0];
    if (!desktop && !mobile) return '';
    var domain = p.case_url ? p.case_url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : (p.slug || 'produkt') + '.app';
    var mockUrl = (p.case_url ? '<a href="' + attr(p.case_url) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px">' : '') +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' +
      esc(domain) + (p.case_url ? ' <span style="font-size:10px;opacity:0.7">↗</span></a>' : '');
    
    var html = '';
    if (desktop) {
      html += '<div class="mock"><div class="mock-bar"><div class="mock-dots"><span></span><span></span><span></span></div>' +
        '<div class="mock-url">' + mockUrl + '</div></div>' +
        '<div class="mock-screen">' + imageMarkup(desktop, 'Desktop') + '<span class="mock-label">' + esc(desktop.caption || 'Desktop') + '</span></div></div>';
    }
    if (mobile) {
      html += '<div class="phone-mock"><div class="phone-screen"><span class="phone-notch"></span>' +
        imageMarkup(mobile, 'Mobil') + '<span class="mock-label">' + esc(mobile.caption || 'Mobil') + '</span></div></div>';
    }
    var singleCls = (!desktop || !mobile) ? ' devices-single' : '';
    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">På alle skærme</span><h2 class="ih-title display">Skarp på hver viewport.</h2><p class="ih-sub">Fuldt responsivt design — fra desktop til mobil.</p></div>' +
      '<div class="devices' + singleCls + '" data-reveal="up">' + html + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderVideos(p, media) {
    var videos = media.filter(isVideoItem);
    if (!videos.length) return '';
    var vidsHtml = videos.map(function(item, i){
      var poster = item.poster ? ' style="background-image:url(' + attr(item.poster) + ');background-size:cover;background-position:center"' : '';
      return '<figure class="vid vid-trigger" data-vid-index="' + i + '"' + poster + ' tabindex="0" role="button" aria-label="Afspil ' + attr(item.caption || 'video') + '">' +
        '<span class="play-mini"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
        '<figcaption class="vid-cap">' + mediaCaption(item, 'Demovideo') + '</figcaption></figure>';
    }).join('');
    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">I bevægelse</span><h2 class="ih-title display">Demovideoer.</h2></div>' +
      '<div class="vid-row" data-reveal="stagger">' + vidsHtml + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderTechAndTestimonial(p) {
    var hasTech = Array.isArray(p.tech_stack) && p.tech_stack.length > 0;
    var hasTesti = Boolean(p.testimonial_text && p.testimonial_text.trim());
    if (!hasTech && !hasTesti) return '';
    var gridStyle = (!hasTech || !hasTesti) ? ' style="align-items:center; grid-template-columns: 1fr"' : ' style="align-items:center"';
    
    var techHtml = '';
    if (hasTech) {
      techHtml = '<div data-reveal="up"><span class="eyebrow">Stack</span><h2 class="ih-title display" style="margin-bottom:1.6rem">Teknologi fra repoet.</h2>' +
        '<p class="muted" style="margin-bottom:1.6rem">Listen viser de teknologier, der er dokumenteret i projektdata og kildekode.</p>' +
        '<div class="tech-list">' + p.tech_stack.map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div></div>';
    }
    
    var testiHtml = '';
    if (hasTesti) {
      var initials = (p.testimonial_author || '').split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).slice(0, 2).join('').toUpperCase() || '★';
      var avatarHtml = p.client_logo
        ? '<img src="' + attr(p.client_logo) + '" alt="' + attr(p.testimonial_author || p.client || '') + '" class="quote-logo" />'
        : '<div class="ph" style="width:48px;height:48px;border-radius:var(--radius-full);display:grid;place-items:center;font-size:1.1rem;font-weight:600;letter-spacing:0.02em">' + esc(initials) + '</div>';
      testiHtml = '<blockquote class="case-quote" data-reveal="up">' +
        '<p>“' + esc(p.testimonial_text.trim()) + '”</p>' +
        '<div class="by">' + avatarHtml + '<div><strong>' + esc(p.testimonial_author) + '</strong><br><span class="mono">' + esc(p.testimonial_role || '') + '</span></div></div>' +
        '</blockquote>';
    }

    return '<section class="section-pad" style="padding-top:0">' +
      '<div class="shell about-cols"' + gridStyle + '>' + techHtml + testiHtml + '</div>' +
      '</section>';
  }

  function renderTeam(p) {
    var team = Array.isArray(p.team) ? p.team.filter(function(t){ return t && (t.name || t.role); }) : [];
    if (!team.length) return '';
    var teamHtml = team.map(function(t){
      var initials = (t.name || '').split(/\s+/).map(function(w){ return w.charAt(0); }).join('').substring(0, 2).toUpperCase() || '★';
      return '<div class="team-card">' +
        '<div class="team-avatar">' + esc(initials) + '</div>' +
        '<div class="team-name">' + esc(t.name || '') + '</div>' +
        '<div class="team-role">' + esc(t.role || '') + '</div>' +
      '</div>';
    }).join('');
    return '<section class="section-pad team-section">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">Teamet</span><h2 class="ih-title display">Hvem der stod bag.</h2></div>' +
      '<div class="team-grid" data-reveal="stagger">' + teamHtml + '</div>' +
      '</div>' +
      '</section>';
  }

  function renderAwards(p) {
    var awards = Array.isArray(p.awards) ? p.awards.filter(function(a){ return a && a.title; }) : [];
    if (!awards.length) return '';
    var awardsHtml = awards.map(function(a){
      return '<div class="award-badge">' +
        '<svg class="award-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 15l-3.5 2 .67-3.89L6 10.13l3.92-.57L12 6l2.08 3.56 3.92.57-2.84 2.98L15.83 17z"/></svg>' +
        '<div class="award-text"><span class="award-title">' + esc(a.title) + '</span>' +
        (a.org ? '<span class="award-org">' + esc(a.org) + '</span>' : '') +
        '</div></div>';
    }).join('');
    return '<section class="section-pad awards-section">' +
      '<div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">Anerkendelser</span><h2 class="ih-title display">Udmærkelser &amp; priser.</h2></div>' +
      '<div class="awards-row" data-reveal="stagger">' + awardsHtml + '</div>' +
      '</div>' +
      '</section>';
  }

  function blockRenderers() {
    return {
      richtext: function(b){
        return '<section class="section-pad block block-richtext"><div class="shell"><div class="block-rich" data-reveal="up">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + '</span>' : '') +
          (b.title ? '<h2 class="ih-title display" style="margin:0.6rem 0 1.2rem">' + esc(b.title) + '</h2>' : '') +
          '<div class="block-body muted">' + mdLite(b.body || '') + '</div>' +
        '</div></div></section>';
      },
      timeline: function(b){
        var phases = Array.isArray(b.phases) ? b.phases : [];
        if (!phases.length) return '';
        return '<section class="section-pad block block-timeline"><div class="shell">' +
          '<div class="ih" data-reveal="up"><span class="eyebrow">Proces</span><h2 class="ih-title display">' + esc(b.title || 'Forløbet.') + '</h2></div>' +
          '<ol class="timeline" data-reveal="stagger">' +
            phases.map(function(ph){
              return '<li class="tl-step">' +
                '<span class="tl-dot" aria-hidden="true"></span>' +
                '<div class="tl-content">' +
                  '<span class="tl-eyebrow eyebrow">' + esc(ph.label || '') + (ph.date ? ' · ' + esc(ph.date) : '') + '</span>' +
                  '<h3 class="tl-title">' + esc(ph.title || '') + '</h3>' +
                  (ph.body ? '<p class="muted tl-body">' + mdLite(ph.body) + '</p>' : '') +
                '</div></li>';
            }).join('') +
          '</ol></div></section>';
      },
      gallery: function(b){
        var items = (Array.isArray(b.items) ? b.items : []).filter(function(m){ return m && m.url; });
        if (!items.length) return '';
        var layout = b.layout === 'masonry' ? ' block-gallery-masonry' : '';
        return '<section class="section-pad block block-gallery"><div class="shell">' +
          (b.title ? '<div class="ih" data-reveal="up"><h2 class="ih-title display">' + esc(b.title) + '</h2></div>' : '') +
          '<div class="block-gallery-grid' + layout + '" data-reveal="stagger" data-block-gallery>' +
            items.map(function(item, i){
              return '<figure class="block-shot" data-bg-index="' + i + '" tabindex="0" role="button">' +
                imageMarkup(item, item.caption) +
                (item.caption ? '<figcaption>' + mediaCaption(item, '') + '</figcaption>' : '') +
              '</figure>';
            }).join('') +
          '</div></div></section>';
      },
      video: function(b){
        var items = (Array.isArray(b.items) ? b.items : []).filter(function(m){ return m && m.url; });
        if (!items.length) return '';
        return '<section class="section-pad block block-video"><div class="shell">' +
          (b.title ? '<div class="ih" data-reveal="up"><h2 class="ih-title display">' + esc(b.title) + '</h2></div>' : '') +
          '<div class="vid-row block-video-row" data-reveal="stagger" data-block-video>' +
            items.map(function(item, i){
              var poster = item.poster ? ' style="background-image:url(' + attr(item.poster) + ');background-size:cover;background-position:center"' : '';
              return '<figure class="vid vid-trigger" data-bv-index="' + i + '"' + poster + ' tabindex="0" role="button" aria-label="Afspil video">' +
                '<span class="play-mini"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
                '<figcaption class="vid-cap">' + mediaCaption(item, 'Video') + '</figcaption></figure>';
            }).join('') +
          '</div></div></section>';
      },
      before_after: function(b){
        if (!b.before || !b.after || !b.before.url || !b.after.url) return '';
        return '<section class="section-pad block block-before-after"><div class="shell">' +
          (b.title ? '<div class="ih" data-reveal="up"><h2 class="ih-title display">' + esc(b.title) + '</h2></div>' : '') +
          '<div class="ba ba-media" data-ba data-reveal="clip">' +
            '<div class="ba-layer ba-before"><img class="case-media-img" src="' + attr(b.before.url) + '" alt="' + attr(b.before.label || 'Før') + '" loading="lazy"><span class="ba-tag">' + esc(b.before.label || 'Før') + '</span></div>' +
            '<div class="ba-layer ba-after" style="clip-path:inset(0 0 0 50%)"><img class="case-media-img" src="' + attr(b.after.url) + '" alt="' + attr(b.after.label || 'Efter') + '" loading="lazy"><span class="ba-tag">' + esc(b.after.label || 'Efter') + '</span></div>' +
            '<div class="ba-handle"><span class="ba-knob"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></span></div>' +
          '</div></div></section>';
      },
      metrics: function(b){
        var items = (Array.isArray(b.items) ? b.items : []).filter(function(m){ return m && (m.value || m.label); });
        if (!items.length) return '';
        return '<section class="section-pad block block-metrics"><div class="shell">' +
          (b.title ? '<div class="ih" data-reveal="up"><h2 class="ih-title display">' + esc(b.title) + '</h2></div>' : '') +
          '<div class="metric-band" data-reveal="up">' +
            items.map(function(m){ return '<div class="metric"><div class="metric-n">' + esc(m.value || '') + '</div><div class="metric-l">' + esc(m.label || '') + '</div></div>'; }).join('') +
          '</div></div></section>';
      },
      quote: function(b){
        if (!b.text) return '';
        return '<section class="section-pad block block-quote"><div class="shell"><blockquote class="case-quote block-quote-inner" data-reveal="up">' +
          '<p>“' + esc(b.text) + '”</p>' +
          '<div class="by"><span class="ph"></span><div><strong>' + esc(b.author || '') + '</strong>' +
            (b.role ? '<br><span class="mono">' + esc(b.role) + '</span>' : '') + '</div></div>' +
        '</blockquote></div></section>';
      },
      embed: function(b){
        if (!b.url) return '';
        var src = b.url; // simplistic server-side fallback
        return '<section class="section-pad block block-embed"><div class="shell">' +
          '<div class="block-embed-frame" data-reveal="clip"><iframe src="' + attr(src) + '" allow="fullscreen; picture-in-picture" allowfullscreen title="' + attr(b.caption || 'Indlejret video') + '"></iframe></div>' +
          (b.caption ? '<p class="muted block-embed-cap" style="margin-top:1rem">' + esc(b.caption) + '</p>' : '') +
        '</div></section>';
      }
    };
  }

  function renderBlocks(p) {
    var blocks = Array.isArray(p.blocks) ? p.blocks : [];
    if (!blocks.length) return '';
    var r = blockRenderers();
    return '<div id="case-blocks">' + blocks.map(function(b) {
      if (!b || !b.type || !r[b.type]) return '';
      try { return r[b.type](b) || ''; } catch (e) { return ''; }
    }).join('') + '</div>';
  }

  function renderRelated(p) {
    var related = Array.isArray(p.related) ? p.related : [];
    if (!related.length) return '';
    var gridHtml = related.map(function(r){
      var media = r.thumbnail_url
        ? '<img src="' + attr(r.thumbnail_url) + '" alt="' + attr(r.title) + '" loading="lazy">'
        : '<div class="ph-inner"><span class="ph-label">' + esc(r.category || 'Case') + '</span></div>';
      var badge = esc(r.category || 'Case') + (r.year ? ' · ' + esc(r.year) : '');
      var tagsHtml = '';
      if (Array.isArray(r.tags) && r.tags.length) {
        tagsHtml = '<div class="wcard-tags">' +
          r.tags.slice(0, 3).map(function(t){ return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
        '</div>';
      }
      return '<a href="/case.html?slug=' + attr(r.slug) + '" class="wcard related-card" data-reveal="up" data-track="content" data-content-type="case" data-content-id="' + attr(r.slug) + '">' +
        '<div class="wcard-media' + (r.thumbnail_url ? '' : ' ph') + '">' + media +
          '<span class="wcard-badge">' + badge + '</span>' +
          '<span class="wcard-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span></div>' +
        '<div class="wcard-info"><h3 class="wcard-title">' + esc(r.title) + '</h3><span class="wcard-cat">' + esc(r.year || '') + '</span></div>' +
        '<p class="wcard-desc">' + esc(r.description || '') + '</p>' + tagsHtml + '</a>';
    }).join('');

    var next = related[0];
    var nextSection = '';
    if (next) {
      var nextCat = (next.category || '') + (next.year ? ' · ' + next.year : '');
      nextSection = '<section class="next-cta next-cta-card"><div class="shell">' +
        '<a href="case.html?slug=' + encodeURIComponent(next.slug) + '" class="next-case" data-track="content" data-content-type="case" data-content-id="' + attr(next.slug) + '">' +
        '<div><span class="nc-k">Næste case</span><span class="nc-title" data-next-title>' + esc(next.title) + ' <span class="lime">→</span></span></div>' +
        '<span class="nc-cat" data-next-cat>' + esc(nextCat) + '</span>' +
        '</a></div></section>';
    }

    return '<section class="section-pad related-section" id="related-section"><div class="shell">' +
      '<div class="ih" data-reveal="up"><span class="eyebrow">Mere fra studiet</span><h2 class="ih-title display">Relaterede cases.</h2></div>' +
      '<div class="related-grid" id="related-grid">' + gridHtml + '</div>' +
      '</div></section>' + nextSection;
  }

  function renderCase(p) {
    p = p || {};
    var media = getMedia(p);
    return renderHero(p, media) +
      renderOverview(p) +
      renderMetricChart(p) +
      renderChallengeApproach(p) +
      renderResults(p) +
      renderFeatureShowcase(p, media) +
      renderBeforeAfter(p, media) +
      renderGallery(p, media) +
      renderDeviceShowcase(p, media) +
      renderVideos(p, media) +
      renderTechAndTestimonial(p) +
      renderTeam(p) +
      renderAwards(p) +
      renderBlocks(p) +
      renderRelated(p);
  }

  function injectCase(templateHtml, p) {
    var html = String(templateHtml || '');
    return html.replace(
      /<main id="main">[\s\S]*?<\/main>/,
      function () { return '<main id="main">' + renderCase(p) + '</main>'; }
    );
  }

  return {
    renderCase: renderCase,
    injectCase: injectCase,
  };
});
