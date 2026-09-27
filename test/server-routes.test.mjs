/**
 * Boots server.js and checks that routes registered after the static and
 * 404 handlers are reachable, and that repo files are not served.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

test('server.js serves API, /mcp and pages, and hides repo files', async (t) => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JWT_SECRET: 'test-jwt', ADMIN_PASS: 'test-pass', MCP_AUTH_TOKEN: 'test-mcp' },
    stdio: 'ignore',
  });
  t.after(() => child.kill());
  for (let i = 0; i < 100; i++) {
    try { await fetch(`${base}/robots.txt`); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }

  const posts = await fetch(`${base}/api/blog/posts`);
  assert.equal(posts.status, 200);
  assert.ok(Array.isArray((await posts.json()).posts));

  const lead = await fetch(`${base}/api/leads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(lead.status, 400);

  const mcp = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(mcp.status, 401);

  assert.equal((await fetch(`${base}/kontakt.html`)).status, 200);
  assert.equal((await fetch(`${base}/api/does-not-exist`)).status, 404);
  for (const p of ['/.git/HEAD', '/.git/config', '/.env', '/server.js', '/package.json']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
  assert.equal((await fetch(`${base}/admin/`)).headers.get('x-robots-tag'), 'noindex, nofollow');
});
