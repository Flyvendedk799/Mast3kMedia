const fs = require('fs');
let css = fs.readFileSync('assets/blog.css', 'utf8');

// (a) in-text link contrast
css = css.replace(/\.blog-post-body a \{[\s\S]*?\}/, `.blog-post-body a { color: var(--lime); text-decoration: underline; text-underline-offset: .15em; text-decoration-thickness: 1px; }
.blog-post-body a:hover, .blog-post-body a:focus-visible { color: var(--lime-lift); text-decoration-thickness: 2px; }`);

fs.writeFileSync('assets/blog.css', css);
