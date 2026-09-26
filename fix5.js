const fs = require('fs');
const path = require('path');

const tmpl = fs.readFileSync('ydelser.html', 'utf8');

const srvs = [
  { slug: 'softwareudvikling', title: 'Softwareudvikling & webapps i København | Mast3kMedia', desc: 'Vi bygger skræddersyet software, web og apps. Håndkodet — ikke et no-code-korthus der vælter, dagen du begynder at skalere.' },
  { slug: 'saas-produkter', title: 'SaaS-produkter og white-label løsninger | Mast3kMedia', desc: 'Færdige platforme du kan sælge i morgen. White-label, hvis dit eget logo skal på. Vi bygger, hoster og passer dem.' },
  { slug: 'ai-automatisering', title: 'AI & Automatisering for ambitiøse virksomheder | Mast3kMedia', desc: 'AI der laver arbejde — ikke bare imponerer på et slide. Agenter, workflows og integrationer, fra prompt til produktion.' },
  { slug: 'marketing-vaekst', title: 'Marketing, Vækst & SEO i København | Mast3kMedia', desc: 'SEO og annoncer der måles i kroner, ikke i likes. Vi får produktet ud over rampen — og holder gang i det.' }
];

srvs.forEach(s => {
  let html = tmpl;
  html = html.replace(/<title>.*?<\/title>/, `<title>${s.title}</title>`);
  html = html.replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${s.desc}"`);
  
  html = html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">
    <section class="page-hero">
      <div class="shell shell-read">
        <span class="crumb mono"><a href="/">Forside</a> <span class="sep">/</span> <a href="/ydelser.html">Ydelser</a> <span class="sep">/</span> ${s.title.split('|')[0].trim()}</span>
        <h1 class="page-title display" data-reveal="lines">
          <span class="line-wrap"><span class="line-inner">${s.title.split('|')[0].trim()}<span class="lime">.</span></span></span>
        </h1>
        <p class="page-intro" data-reveal="up">${s.desc}</p>
      </div>
    </section>
  </main>`);
  
  const bc = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Forside", "item": "https://mast3kmedia.dk/" },
      { "@type": "ListItem", "position": 2, "name": "Ydelser", "item": "https://mast3kmedia.dk/ydelser.html" },
      { "@type": "ListItem", "position": 3, "name": s.title.split('|')[0].trim() }
    ]
  };
  
  html = html.replace('</head>', `\n<script type="application/ld+json">\n${JSON.stringify(bc)}\n</script>\n</head>`);
  
  fs.writeFileSync(path.join('ydelser', s.slug + '.html'), html);
});

// Update sitemap
let server = fs.readFileSync('server.js', 'utf8');
server = server.replace(/const SITEMAP_PAGES = \[\s*([\s\S]*?)\];/, (match, p1) => {
  return `const SITEMAP_PAGES = [\n${p1}  '/ydelser/softwareudvikling.html',\n  '/ydelser/saas-produkter.html',\n  '/ydelser/ai-automatisering.html',\n  '/ydelser/marketing-vaekst.html',\n];`;
});
fs.writeFileSync('server.js', server);

// Add Organization to index.html
const orgJson = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mast3kmedia.dk/#organization",
      "name": "Mast3kMedia ApS",
      "url": "https://mast3kmedia.dk/",
      "logo": "https://mast3kmedia.dk/assets/og-image.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+45 23 82 24 82",
        "contactType": "customer service",
        "email": "hej@mast3kmedia.dk"
      },
      "sameAs": ["https://linkedin.com/", "https://github.com/Flyvendedk799"]
    },
    {
      "@type": "WebSite",
      "@id": "https://mast3kmedia.dk/#website",
      "url": "https://mast3kmedia.dk/",
      "name": "Mast3kMedia",
      "publisher": { "@id": "https://mast3kmedia.dk/#organization" }
    }
  ]
};

let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('</head>', `\n<script type="application/ld+json">\n${JSON.stringify(orgJson)}\n</script>\n</head>`);
fs.writeFileSync('index.html', index);

// Make ydelser.html link to them
let yd = fs.readFileSync('ydelser.html', 'utf8');
yd = yd.replace(/href="[^"]*"/g, (match, p1) => {
  if (match === 'href="#"') return match;
  return match;
});
// The ydelser in index.html already points to /ydelser.html. I will replace the ydelser cards in ydelser.html to point to the new pages.
yd = yd.replace(/<div class="yd-card"([^>]*)>\s*<div class="yd-card-head">\s*<h3 class="yd-title">Softwareudvikling<\/h3>/, '<a href="/ydelser/softwareudvikling.html" class="yd-card"$1><div class="yd-card-head"><h3 class="yd-title">Softwareudvikling</h3>');
yd = yd.replace(/<div class="yd-card"([^>]*)>\s*<div class="yd-card-head">\s*<h3 class="yd-title">SaaS-produkter<\/h3>/, '<a href="/ydelser/saas-produkter.html" class="yd-card"$1><div class="yd-card-head"><h3 class="yd-title">SaaS-produkter</h3>');
yd = yd.replace(/<div class="yd-card"([^>]*)>\s*<div class="yd-card-head">\s*<h3 class="yd-title">AI &amp; Automatisering<\/h3>/, '<a href="/ydelser/ai-automatisering.html" class="yd-card"$1><div class="yd-card-head"><h3 class="yd-title">AI &amp; Automatisering</h3>');
yd = yd.replace(/<div class="yd-card"([^>]*)>\s*<div class="yd-card-head">\s*<h3 class="yd-title">Marketing &amp; Vækst<\/h3>/, '<a href="/ydelser/marketing-vaekst.html" class="yd-card"$1><div class="yd-card-head"><h3 class="yd-title">Marketing &amp; Vækst</h3>');
yd = yd.replace(/<\/div>\s*<\/div>\s*<p class="yd-desc">/g, '</div></div><p class="yd-desc">');
yd = yd.replace(/<\/div>\s*<!--/g, '</a><!--'); 

// The cards in ydelser.html end with </div>. If I turn them to <a>, I need to close with </a>.
fs.writeFileSync('ydelser.html', yd);

