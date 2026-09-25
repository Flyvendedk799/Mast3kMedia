(function () {
  var KEYS = [
    'form_id', 'lead_source', 'project_type', 'budget', 'timeline', 'lead_id', 'value', 'currency',
    'step_number', 'step_name', 'cta_id', 'cta_text', 'cta_location', 'link_url', 'link_location',
    'plan_id', 'plan_name', 'plan_price', 'content_type', 'content_id', 'content_title',
    'content_category', 'percent_scrolled', 'estimate_low', 'estimate_high', 'search_term', 'error_type'
  ];

  window.m3kTrack = function (event, params) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event };
    KEYS.forEach(function (key) { payload[key] = undefined; });
    if (params) {
      KEYS.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(params, key)) payload[key] = params[key];
      });
    }
    window.dataLayer.push(payload);
  };

  function linkLocation(el) {
    var explicit = el.getAttribute('data-track-location');
    if (explicit) return explicit;
    var node = el.closest('nav, .menu, footer, aside, section');
    if (!node) return 'body';
    if (node.classList.contains('menu')) return 'mobile_menu';
    if (node.tagName === 'NAV') return 'nav';
    if (node.tagName === 'FOOTER') return 'footer';
    if (node.tagName === 'ASIDE') return 'contact_aside';
    return 'body';
  }

  function textOf(el) {
    return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  }

  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest
      ? event.target.closest('a[href^="mailto:"], a[href*="/cdn-cgi/l/email-protection"], a[href^="tel:"], [data-track]')
      : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var track = el.getAttribute('data-track');

    if (el.matches('a[href^="mailto:"], a[href*="/cdn-cgi/l/email-protection"]')) {
      window.m3kTrack('click_email', { link_location: linkLocation(el), link_url: 'mailto' });
      return;
    }
    if (el.matches('a[href^="tel:"]')) {
      window.m3kTrack('click_phone', { link_location: linkLocation(el) });
      return;
    }
    if (track === 'booking') {
      window.m3kTrack('click_booking', {
        cta_id: el.getAttribute('data-cta-id') || '',
        link_url: href,
        link_location: linkLocation(el)
      });
      return;
    }
    if (track === 'cta') {
      window.m3kTrack('cta_click', {
        cta_id: el.getAttribute('data-cta-id') || '',
        cta_text: textOf(el),
        cta_location: el.getAttribute('data-cta-location') || '',
        link_url: href
      });
      return;
    }
    if (track === 'plan') {
      var price = el.getAttribute('data-plan-price');
      var plan = {
        plan_id: el.getAttribute('data-plan-id') || '',
        plan_name: el.getAttribute('data-plan-name') || '',
        currency: el.getAttribute('data-plan-currency') || ''
      };
      if (price != null && price !== '') plan.plan_price = Number(price);
      window.m3kTrack('select_pricing_plan', plan);
      return;
    }
    if (track === 'content') {
      window.m3kTrack('select_content', {
        content_type: el.getAttribute('data-content-type') || '',
        content_id: el.getAttribute('data-content-id') || ''
      });
    }
  });

  var marks = [25, 50, 75];
  var fired = {};
  function onScroll() {
    var html = document.documentElement;
    var height = Math.max(
      html.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    ) - window.innerHeight;
    if (height <= 0) return;
    var top = window.scrollY || html.scrollTop || 0;
    var pct = (top / height) * 100;
    marks.forEach(function (mark) {
      if (pct >= mark && !fired[mark]) {
        fired[mark] = true;
        window.m3kTrack('scroll_depth', { percent_scrolled: mark });
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();
