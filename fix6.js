const fs = require('fs');
['blog.html', 'blog-post.html', 'index.html', 'arbejde.html', 'case.html', 'kontakt.html', 'om.html', 'oss.html', 'pris.html', 'saas.html', 'ydelser.html', 'privatlivspolitik.html', 'ydelser/softwareudvikling.html', 'ydelser/saas-produkter.html', 'ydelser/ai-automatisering.html', 'ydelser/marketing-vaekst.html'].forEach(f => {
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<button class="nav-burger" aria-label="Menu"><span><\/span><span><\/span><\/button>/, '<button class="nav-burger" aria-label="Menu" aria-controls="site-menu" aria-expanded="false"><span></span><span></span></button>');
  s = s.replace(/<div class="menu">/, '<div class="menu" id="site-menu" inert aria-hidden="true">');
  
  // T1.12 Fix dead contact/social links
  s = s.replace(/<a [^>]*class="ulink">LinkedIn<\/a>/, '<a href="https://linkedin.com/" class="ulink" rel="me">LinkedIn</a>');
  s = s.replace(/<a [^>]*class="ulink">GitHub<\/a>/, '<a href="https://github.com/Flyvendedk799" class="ulink" rel="me">GitHub</a>');
  s = s.replace(/<a [^>]*class="ulink">Instagram<\/a>/, '<a href="https://instagram.com/" class="ulink" rel="me">Instagram</a>');
  s = s.replace(/<a [^>]*class="ulink">Dribbble<\/a>/, '<a href="https://dribbble.com/" class="ulink" rel="me">Dribbble</a>');
  
  // Also on the bottom of kontakt.html
  if (f === 'kontakt.html') {
    s = s.replace(/<a href="#" class="btn btn-outline" data-magnetic="0.2">cal.com\/mast3kmedia <span class="lime">→<\/span><\/a>/, '<a href="https://cal.com/mast3kmedia" class="btn btn-outline" data-magnetic="0.2">cal.com/mast3kmedia <span class="lime">→</span></a>');
    // T1.14 Programmatic labels on contact form
    s = s.replace(/<div class="label">Navn<\/div>/, '<label class="label" for="f-name">Navn</label>');
    s = s.replace(/<div class="label">Firma \(valgfrit\)<\/div>/, '<label class="label" for="f-company">Firma (valgfrit)</label>');
    s = s.replace(/<div class="label">Email<\/div>/, '<label class="label" for="f-email">Email</label>');
    s = s.replace(/<div class="label">Telefon \(valgfrit\)<\/div>/, '<label class="label" for="f-phone">Telefon (valgfrit)</label>');
    s = s.replace(/<div class="label">Projektbrief<\/div>/, '<label class="label" for="f-brief">Projektbrief</label>');
    
    s = s.replace(/<input type="text" id="f-name"/, '<input type="text" id="f-name" name="name" required aria-required="true"');
    s = s.replace(/<input type="text" id="f-company"/, '<input type="text" id="f-company" name="company"');
    s = s.replace(/<input type="email" id="f-email"/, '<input type="email" id="f-email" name="email" required aria-required="true"');
    s = s.replace(/<input type="tel" id="f-phone"/, '<input type="tel" id="f-phone" name="phone"');
    s = s.replace(/<textarea id="f-brief"/, '<textarea id="f-brief" name="brief" required aria-required="true"');
  }

  // T2.15 Heading order
  // om.html
  if (f === 'om.html') {
    s = s.replace(/<h4 class="v-title">/g, '<h3 class="v-title">');
    s = s.replace(/<h4 class="member-name">/g, '<h3 class="member-name">');
  }
  if (f === 'index.html') {
    s = s.replace(/<h4>/g, '<h3>');
    s = s.replace(/<\/h4>/g, '</h3>');
  }

  // T2.16 Evergreen capacity message
  s = s.replace(/<span class="pill-live"><span class="dot"><\/span>Plads til 2 nye i Q3<\/span>/g, '<span class="pill-live"><span class="dot"></span>Plads til 2 nye</span>');
  s = s.replace(/<span class="pill-live"><span class="dot"><\/span>2 pladser i Q3<\/span>/g, '<span class="pill-live"><span class="dot"></span>2 pladser ledige</span>');

  fs.writeFileSync(f, s);
});

let anim = fs.readFileSync('assets/anim.js', 'utf8');
anim = anim.replace(/menu\.classList\.toggle\('open'\);/, "const isOpen = menu.classList.toggle('open'); menu.inert = !isOpen; burger.setAttribute('aria-expanded', isOpen);");
fs.writeFileSync('assets/anim.js', anim);

let baseCss = fs.readFileSync('assets/base.css', 'utf8');
baseCss += '\n.menu { visibility: hidden; }\n.menu.open { visibility: visible; }\n';
fs.writeFileSync('assets/base.css', baseCss);
