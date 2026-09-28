import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

test('forms and pricing calculator are managed from admin', async (t) => {
  const port = await freePort();
  const dbPath = path.join(os.tmpdir(), `m3k-forms-${process.pid}-${Date.now()}.db`);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      DB_PATH: dbPath,
      JWT_SECRET: 'test-jwt',
      ADMIN_USER: 'admin',
      ADMIN_PASS: 'test-pass',
      MCP_AUTH_TOKEN: 'test-mcp',
    },
    stdio: 'ignore',
  });
  t.after(async () => {
    child.kill();
    await new Promise((resolve) => {
      if (child.exitCode != null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2500);
    });
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.rmSync(dbPath + suffix, { force: true }); } catch { /* Windows may still be releasing the file */ }
    }
  });
  let ready = false;
  for (let i = 0; i < 200 && !ready; i++) {
    try { ready = (await fetch(`${base}/robots.txt`)).ok; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  assert.equal(ready, true, 'server did not start');

  const pricing = await fetch(`${base}/api/pricing`);
  assert.equal(pricing.status, 200);
  const config = await pricing.json();
  assert.equal(config.steps[0].options[0].name, 'Website / Landing');
  assert.equal(config.steps[0].options[0].cost, 6000);

  const brief = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'kontakt',
      project_type: 'Software',
      goal: 'Lancér nyt',
      budget: '100–300k',
      timeline: '1–3 mdr',
      name: 'Ada',
      company: 'Nord',
      email: 'ada@example.com',
      phone: '+45 12 34 56 78',
      brief: 'En kort brief',
      page_path: '/kontakt.html',
    }),
  });
  assert.equal(brief.status, 201);
  const briefBody = await brief.json();
  assert.ok(briefBody.id);

  const estimate = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'pris',
      project_type: 'Webapp / SaaS',
      goal: 'Prisestimat',
      budget: '€16200–€20700',
      timeline: '1–3 måneder',
      email: 'price@example.com',
      brief: 'Webapp / SaaS: €18.000',
      page_path: '/pris.html',
    }),
  });
  assert.equal(estimate.status, 201);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'test-pass' }),
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const leads = await fetch(`${base}/api/admin/leads`, { headers: auth });
  assert.equal(leads.status, 200);
  const rows = await leads.json();
  const ada = rows.find((row) => row.email === 'ada@example.com');
  const price = rows.find((row) => row.email === 'price@example.com');
  assert.equal(ada.source, 'kontakt');
  assert.equal(ada.metadata.phone, '+45 12 34 56 78');
  assert.equal(ada.status, 'new');
  assert.equal(price.source, 'pris');

  const patched = await fetch(`${base}/api/admin/leads/${ada.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ status: 'contacted', notes: 'Ringer i morgen' }),
  });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).notes, 'Ringer i morgen');

  const removed = await fetch(`${base}/api/admin/leads/${price.id}`, { method: 'DELETE', headers: auth });
  assert.equal(removed.status, 200);

  const next = structuredClone(config);
  next.steps[0].options[0].cost = 7000;
  next.steps[0].options[0].meta = 'fra €7.000';
  const saved = await fetch(`${base}/api/admin/pricing`, { method: 'PUT', headers: auth, body: JSON.stringify(next) });
  assert.equal(saved.status, 200);
  const live = await (await fetch(`${base}/api/pricing`)).json();
  assert.equal(live.steps[0].options[0].cost, 7000);

  const bad = await fetch(`${base}/api/admin/pricing`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ steps: [] }),
  });
  assert.equal(bad.status, 400);
});
