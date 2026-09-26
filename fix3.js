const fs = require('fs');

const cmpSnippet = `<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  wait_for_update:500
});
</script>
<!-- CMP Script placeholder (e.g. Cookiebot) -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="00000000-0000-0000-0000-000000000000" data-blockingmode="auto" type="text/javascript"></script>
`;

['saas.html','oss.html','om.html','index.html','arbejde.html','kontakt.html', 'blog.html', 'blog-post.html', 'pris.html', 'ydelser.html', 'case.html'].forEach(f => {
  if(fs.existsSync(f)) {
    let s = fs.readFileSync(f,'utf8');
    
    // insert cmp snippet before GTM
    if(!s.includes('wait_for_update:500')) {
      s = s.replace('<!-- Google Tag Manager -->', cmpSnippet + '\n<!-- Google Tag Manager -->');
    }
    
    // link policy from footer
    if(!s.includes('/privatlivspolitik.html')) {
        s = s.replace(/<span class="mono">© 2026 Mast3kMedia ApS<\/span>/, '<span class="mono">© 2026 Mast3kMedia ApS</span><a href="/privatlivspolitik.html" class="mono" style="margin-left: 1rem; text-decoration: underline;">Privatlivspolitik</a>');
    }
    
    if (f === 'kontakt.html') {
      s = s.replace(/<label class="label consent">[\s\S]*?<\/label>/, '<label class="label consent"><input type="checkbox" name="consent" required> Jeg accepterer at Mast3kMedia behandler mine data iht. <a href="/privatlivspolitik.html" target="_blank" style="text-decoration:underline;color:var(--lime)">privatlivspolitikken</a>.</label>');
    }
    
    fs.writeFileSync(f,s);
  }
});

// Create privatlivspolitik.html
const template = fs.readFileSync('om.html', 'utf8');
const pHTML = template
  .replace(/<title>.*?<\/title>/, '<title>Privatlivs- og cookiepolitik | Mast3kMedia</title>')
  .replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">
    <section class="section-pad">
      <div class="shell">
        <h1 class="display">Privatlivspolitik.</h1>
        <p class="muted">Placeholder for privacy and cookie policy text.</p>
      </div>
    </section>
  </main>`);
fs.writeFileSync('privatlivspolitik.html', pHTML);
