const fs = require('fs');
let html = fs.readFileSync('case.html', 'utf8');
html = html.replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main"></main>');
html = html.replace(/<script>\s*\/\*\s*── Dynamic case loading from API ──\s*\*\/[\s\S]*?<\/script>/, '<script src="assets/case-render.js?v=1"></script>');
fs.writeFileSync('case.html', html);
