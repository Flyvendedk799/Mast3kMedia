const fs = require('fs');
['saas.html','oss.html','om.html','index.html','arbejde.html','kontakt.html', 'blog.html', 'blog-post.html', 'pris.html', 'ydelser.html', 'case.html'].forEach(f => {
  if(fs.existsSync(f)) {
    let s = fs.readFileSync(f,'utf8');
    s = s.replace(/href="#"/g, '');
    
    // T2.9 Fix double escaped og:title
    s = s.replace(/&amp;amp;/g, '&amp;');
    fs.writeFileSync(f,s);
  }
});
