import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderBlogMarkdown, renderBlogArticle, injectBlogArticle } = require('../assets/blog-markdown.js');

test('heading levels: ## is h2, ### is h3, #### is h4', () => {
  const html = renderBlogMarkdown('# Top\n\n## Afsnit\n\n### Under\n\n#### Detalje\n\n##### Mindre');
  assert.match(html, /<h2 id="top">Top<\/h2>/);
  assert.match(html, /<h2 id="afsnit">Afsnit<\/h2>/);
  assert.match(html, /<h3>Under<\/h3>/);
  assert.match(html, /<h4>Detalje<\/h4>/);
  assert.match(html, /<h5>Mindre<\/h5>/);
  assert.doesNotMatch(html, /<h1>/);
  assert.doesNotMatch(html, /<h3>Afsnit<\/h3>/);
});

test('renders tables instead of raw pipes', () => {
  const html = renderBlogMarkdown([
    '| Pakke | Pris |',
    '| :--- | ---: |',
    '| Basis | **5.000** |',
    '| Plus | [kontakt](/kontakt) |',
  ].join('\n'));
  assert.match(html, /<table>/);
  assert.match(html, /<th scope="col">Pakke<\/th>/);
  assert.match(html, /<th scope="col" style="text-align:right">Pris<\/th>/);
  assert.match(html, /<td style="text-align:right"><strong>5\.000<\/strong><\/td>/);
  assert.match(html, /<td style="text-align:right"><a href="\/kontakt">kontakt<\/a><\/td>/);
  assert.doesNotMatch(html, /\| Pakke \|/);
});

test('renders root-relative links and external links', () => {
  const html = renderBlogMarkdown('Se [ydelser](/ydelser) og [kontakt](/kontakt) eller [docs](https://example.com/docs).');
  assert.match(html, /<a href="\/ydelser">ydelser<\/a>/);
  assert.match(html, /<a href="\/kontakt">kontakt<\/a>/);
  assert.match(html, /<a href="https:\/\/example\.com\/docs" rel="noopener noreferrer">docs<\/a>/);
  assert.doesNotMatch(html, /\[ydelser\]/);
});

test('does not turn unsafe URLs into links or images', () => {
  const html = renderBlogMarkdown('[x](javascript:alert(1))\n\n![y](javascript:alert(2))\n\n[z](data:text/html,hi)');
  assert.doesNotMatch(html, /href\s*=\s*["']javascript:/i);
  assert.doesNotMatch(html, /href\s*=\s*["']data:/i);
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /\[x\]\(javascript:alert\(1\)\)/);
});

test('escapes raw HTML in the body', () => {
  const html = renderBlogMarkdown('Hej <script>alert(1)</script>');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('renders blockquotes, dividers, and strikethrough', () => {
  const html = renderBlogMarkdown('> Et citat med **fed**\n\n---\n\nDette er ~~væk~~ og *kursiv*.');
  assert.match(html, /<blockquote><p>Et citat med <strong>fed<\/strong><\/p><\/blockquote>/);
  assert.match(html, /<hr \/>/);
  assert.match(html, /<del>væk<\/del>/);
  assert.match(html, /<em>kursiv<\/em>/);
});

test('nests lists inside the parent item', () => {
  const html = renderBlogMarkdown('- a\n  - b\n  1. c\n- d');
  assert.match(html, /<ul>\n<li>a\n<ul>\n<li>b\n<\/li>\n<\/ul>\n<ol>\n<li>c\n<\/li>\n<\/ol>\n<\/li>\n<li>d\n<\/li>\n<\/ul>/);
});

test('keeps code fences literal and still renders images', () => {
  const html = renderBlogMarkdown('```\n**no** <b>\n```\n\n![Alt](/uploads/a.png)\n*Caption*');
  assert.match(html, /<pre><code>\*\*no\*\* &lt;b&gt;<\/code><\/pre>/);
  assert.doesNotMatch(html, /<strong>no<\/strong>/);
  assert.match(html, /<figure><img src="\/uploads\/a.png" alt="Alt" loading="lazy" \/><figcaption>Caption<\/figcaption><\/figure>/);
});

test('article HTML includes the rendered body for crawlers', () => {
  const template = '<article class="blog-article" id="blogArticle"><div class="shell"><div class="blog-loading mono" id="blogPostLoading">Indlæser indlæg…</div></div></article>';
  const html = injectBlogArticle(template, {
    title: 'Pris & plan',
    slug: 'pris-plan',
    excerpt: 'Kort',
    author: 'Mast3kMedia',
    category: { name: 'Indsigt', slug: 'indsigt' },
    tags: ['seo'],
    published_at: '2026-09-25 12:00:00',
    body: 'Pris $100 og $& mere\n\n## Afsnit\n\nSe [ydelser](/ydelser).\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
  });
  assert.match(html, /data-slug="pris-plan"/);
  assert.match(html, /data-title="Pris &amp; plan"/);
  assert.match(html, /<h1 class="blog-post-title display">Pris &amp; plan<\/h1>/);
  assert.match(html, /<div class="blog-post-body">/);
  assert.match(html, /<h2 id="afsnit">Afsnit<\/h2>/);
  assert.match(html, /href="\/ydelser"/);
  assert.match(html, /<table>/);
  assert.match(html, /\$100/);
  assert.match(html, /\$&/);
  assert.doesNotMatch(html, /id="blogPostLoading"/);
  assert.equal(renderBlogArticle({ title: 'Tom', body: '   ' }).includes('Ingen indhold'), true);
});

test('h2 ids are unique and feed the table of contents', () => {
  const html = renderBlogArticle({
    title: 'T',
    author: 'Mast3kMedia',
    tags: ['seo'],
    body: '## Hvad får du?\n\ntekst\n\n## Hvad får du?\n\n> ## Citat\n\n## **Pris** & [plan](/pris)\n\n### Under',
  });
  assert.match(html, /<h2 id="hvad-faar-du">Hvad får du\?<\/h2>/);
  assert.match(html, /<h2 id="hvad-faar-du-2">Hvad får du\?<\/h2>/);
  assert.match(html, /<blockquote><h2 id="citat">Citat<\/h2><\/blockquote>/);
  assert.match(html, /<h2 id="pris-plan"><strong>Pris<\/strong> &amp; <a href="\/pris">plan<\/a><\/h2>/);
  const toc = html.match(/<nav class="blog-post-toc"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...toc.matchAll(/href="#([^"]+)">([^<]*)</g)].map((m) => [m[1], m[2]]), [
    ['hvad-faar-du', 'Hvad får du?'],
    ['hvad-faar-du-2', 'Hvad får du?'],
    ['pris-plan', 'Pris &amp; plan'],
  ]);
  assert.match(html, /<aside class="blog-post-rail">[\s\S]*Mast3kMedia[\s\S]*1 min\. læsning[\s\S]*<span class="tag">seo<\/span>[\s\S]*<\/aside>$/);
  assert.doesNotMatch(renderBlogArticle({ title: 'T', body: '## Kun én\n\ntekst' }), /blog-post-toc/);
});
