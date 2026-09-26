const fs = require('fs');
['blog.html', 'blog-post.html', 'index.html', 'arbejde.html', 'case.html', 'kontakt.html', 'om.html', 'oss.html', 'pris.html', 'saas.html', 'ydelser.html', 'privatlivspolitik.html'].forEach(f => {
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<script src="\/assets\/analytics\.js\?v=1"><\/script>/, '<script src="/assets/analytics.js?v=1" defer></script>');
  s = s.replace(/<script src="assets\/analytics\.js\?v=1"><\/script>/, '<script src="assets/analytics.js?v=1" defer></script>');
  
  s = s.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.5\/gsap\.min\.js"><\/script>/, '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>');
  s = s.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\/3\.12\.5\/ScrollTrigger\.min\.js"><\/script>/, '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>');
  s = s.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@studio-freight\/lenis@1\.0\.42\/dist\/lenis\.min\.js"><\/script>/, '<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js" defer></script>');
  s = s.replace(/<script src="\/assets\/anim\.js\?v=20260818-hero"><\/script>/, '<script src="/assets/anim.js?v=20260818-hero" defer></script>');
  s = s.replace(/<script src="assets\/anim\.js\?v=20260818-hero"><\/script>/, '<script src="assets/anim.js?v=20260818-hero" defer></script>');
  
  s = s.replace(/<script src="\/assets\/blog\.js\?v=20260926-desk"><\/script>/, '<script src="/assets/blog.js?v=20260926-desk" defer></script>');
  s = s.replace(/<script src="assets\/blog\.js\?v=20260926-desk"><\/script>/, '<script src="assets/blog.js?v=20260926-desk" defer></script>');
  
  s = s.replace(/<script src="assets\/case\.js\?v=20260818-hero"><\/script>/, '<script src="assets/case.js?v=20260818-hero" defer></script>');
  
  fs.writeFileSync(f, s);
});
