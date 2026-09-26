import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';

test('HTML regression checks', () => {
  const files = ['index.html', 'ydelser.html', 'pris.html', 'arbejde.html', 'blog.html', 'blog-post.html', 'kontakt.html', 'om.html', 'oss.html', 'saas.html', 'case.html'];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const html = fs.readFileSync(f, 'utf8');
    
    // Check consent default snippet before GTM
    const consentIdx = html.indexOf("gtag('consent','default'");
    const gtmIdx = html.indexOf('googletagmanager.com/gtm.js');
    assert.ok(consentIdx !== -1, `${f} missing consent snippet`);
    assert.ok(consentIdx < gtmIdx, `${f} consent snippet must be before GTM`);

    // Check no href="#"
    const matches = html.match(/href="#"/g);
    assert.ok(!matches, `${f} contains href="#"`);
  }
});
