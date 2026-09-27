/**
 * Boots server.js on a temp DB and covers the casework REST endpoints, the
 * preview route and REST/MCP parity.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import casework from '../lib/casework.js';
import { root, png, mp4, sha256, removeUpload, mcpTool, mcpToolList } from './fixtures.mjs';

const JWT_SECRET = 'test-jwt';
const MCP_TOKEN = 'test-mcp';

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

let base;
let auth;
let child;
const uploaded = [];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mast3k-rest-'));

test.after(() => {
  child.kill();
  uploaded.forEach(removeUpload);
  fs.rmSync(dir, { recursive: true, force: true });
});

test.before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', DB_PATH: path.join(dir, 'test.db'), JWT_SECRET, ADMIN_PASS: 'test-pass', MCP_AUTH_TOKEN: MCP_TOKEN },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try { await fetch(`${base}/robots.txt`); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'test-pass' }),
  });
  auth = { authorization: `Bearer ${(await login.json()).token}` };
});

const api = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { ...auth, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
};
const upload = async (buf, headers = {}) => {
  const res = await fetch(`${base}/api/admin/uploads`, { method: 'POST', headers: { ...auth, 'content-type': 'image/png', 'x-filename': 'skaermbillede.png', ...headers }, body: buf });
  const data = await res.json();
  if (data.path) uploaded.push(data.path);
  return { status: res.status, data };
};
const mcp = (name, args) => mcpTool(base, MCP_TOKEN, name, args);

test('REST upload converts images to webp and rejects corrupt, oversize or mismatched files', async () => {
  const image = await png();
  const ok = await upload(image, { 'x-content-sha256': sha256(image) });
  assert.equal(ok.status, 201);
  assert.match(ok.data.url, /^https:\/\/mast3kmedia\.dk\/uploads\/skaermbillede-[0-9a-f]{8}\.webp$/);
  assert.equal(ok.data.source_sha256, sha256(image));
  const served = await fetch(base + ok.data.path);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');

  assert.equal((await upload(image, { 'x-content-sha256': sha256(Buffer.from('x')) })).status, 422);
  assert.equal((await upload(Buffer.from('garbage bytes, not an image'))).status, 415);
  assert.equal((await upload(image.subarray(0, 500))).status, 422);
  const oversize = Buffer.concat([image.subarray(0, 16), Buffer.alloc(20 * 1024 * 1024)]);
  assert.equal((await upload(oversize)).status, 413);

  const video = await upload(mp4(), { 'content-type': 'video/mp4', 'x-filename': 'demo.mp4' });
  assert.equal(video.status, 201);
  assert.equal(video.data.type, 'video');
  assert.match(video.data.path, /^\/uploads\/demo-[0-9a-f]{8}\.mp4$/);

  const noAuth = await fetch(`${base}/api/admin/uploads`, { method: 'POST', body: image });
  assert.equal(noAuth.status, 401);
});

test('REST media delete reports usage and refuses unless forced', async () => {
  const up = await upload(await png(30, 20));
  const project = await api('POST', '/api/admin/projects', { title: 'Logo case', client_logo: up.data.url });
  assert.equal(project.status, 201);
  const refused = await api('DELETE', `/api/admin/uploads/${up.data.name}`);
  assert.equal(refused.status, 409);
  assert.deepEqual(refused.data.used_by, [{ type: 'project', id: project.data.id, slug: 'logo-case', title: 'Logo case', status: 'draft', fields: ['client_logo'] }]);
  const forced = await api('DELETE', `/api/admin/uploads/${up.data.name}?force=1`);
  assert.equal(forced.status, 200);
  assert.equal((await fetch(base + up.data.path)).status, 404);
  assert.equal((await api('DELETE', `/api/admin/uploads/${up.data.name}`)).status, 404);
});

test('preview links render drafts like the public page with noindex and no analytics, and reject expired or tampered tokens', async () => {
  const draft = await api('POST', '/api/admin/projects', { title: 'Hemmelig kladde', description: 'Kladdebeskrivelse', challenge: 'Udfordringstekst', og_image: '/uploads/kladde.webp' });
  assert.equal((await fetch(`${base}/arbejde/hemmelig-kladde`)).status, 404);
  assert.doesNotMatch(await (await fetch(`${base}/arbejde.html`)).text(), /href="\/arbejde\/hemmelig-kladde"/);

  const preview = await api('POST', '/api/admin/projects/hemmelig-kladde/preview', { hours: 1 });
  assert.equal(preview.status, 200);
  assert.ok(preview.data.url.startsWith('https://mast3kmedia.dk/arbejde/preview/'));
  const page = await fetch(base + preview.data.path);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  const html = await page.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(html, /<title>Hemmelig kladde — Case · Mast3kMedia<\/title>/);
  assert.match(html, /Udfordringstekst/);
  for (const tracker of ['googletagmanager.com', 'GTM-PS7PV9XN', 'dataLayer', 'gtag(', 'analytics.js', 'Cookiebot']) {
    assert.equal(html.includes(tracker), false, `preview must not include ${tracker}`);
  }
  assert.deepEqual(html.match(/property="og:image" content="[^"]*"/g), ['property="og:image" content="https://mast3kmedia.dk/uploads/kladde.webp"']);

  const token = preview.data.path.split('/').pop();
  const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
  const expired = jwt.sign({ pid: draft.data.id, exp: Math.floor(Date.now() / 1000) - 60 }, casework.previewKey(JWT_SECRET));
  const adminJwt = auth.authorization.slice(7);
  for (const bad of [tampered, expired, adminJwt, 'nope']) {
    const res = await fetch(`${base}/arbejde/preview/${bad}`);
    assert.equal(res.status, 404, bad);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
  assert.equal((await fetch(`${base}/api/admin/projects`, { headers: { authorization: `Bearer ${token}` } })).status, 401);

  await api('PATCH', `/api/admin/projects/${draft.data.id}/status`, { status: 'published' });
  const live = await (await fetch(`${base}/arbejde/hemmelig-kladde`)).text();
  assert.doesNotMatch(live, /name="robots"/);
  const tpl = fs.readFileSync(path.join(root, 'case.html'), 'utf8');
  const analyticsHead = tpl.slice(tpl.indexOf('<script>\nwindow.dataLayer'), tpl.indexOf('<meta charset'));
  const gtmNoscript = tpl.match(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->\n/)[0];
  const push = live.match(/<script>window\.dataLayer=window\.dataLayer\|\|\[\];dataLayer\.push\(\{page_type:"case",[^\n]*<\/script>\n/)[0];
  assert.match(analyticsHead, /GTM-PS7PV9XN/);
  assert.ok(live.includes(analyticsHead) && live.includes(gtmNoscript), 'public case keeps the GTM snippet unchanged');
  const outsideMain = (s) => s.replace(/<main id="main">[\s\S]*<\/main>/, '');
  assert.equal(outsideMain(live).replace(push, '').replace(analyticsHead, '').replace(gtmNoscript, ''),
    outsideMain(html).replace('<meta name="robots" content="noindex, nofollow" />\n', ''));

  const listing = await (await fetch(`${base}/arbejde.html`)).text();
  assert.match(listing, /<div class="work-grid" id="workGrid"><a href="\/arbejde\/hemmelig-kladde"/);
  assert.doesNotMatch(listing, /NordSync/);
});

test('REST describe and validate match the MCP tools', async () => {
  const rest = await api('GET', '/api/admin/projects/schema');
  assert.equal(rest.status, 200);
  assert.deepEqual(rest.data, (await mcp('describe_project_schema')).data);

  const image = await upload(await png());
  const good = {
    title: 'Gyldig case', category: 'SaaS', year: 2026, description: 'Kort beskrivelse.', long_description: 'Intro.',
    challenge: 'Udfordring.', approach: 'Tilgang.', results: 'Resultat.', tags: ['SaaS'], tech_stack: ['Node.js'],
    thumbnail_url: image.data.url, og_image: image.data.path,
    media: [{ type: 'image', url: image.data.url, role: 'hero', alt: 'Forsiden på desktop', caption: 'Forsiden' }],
    blocks: [{ type: 'timeline', phases: [{ label: 'Fase 1', title: 'Research' }] }],
  };
  await api('POST', '/api/admin/projects', good);
  const valid = await api('GET', '/api/admin/projects/gyldig-case/validate?remote=0');
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.data.errors, []);
  assert.deepEqual(valid.data.warnings, []);
  assert.equal(valid.data.ok, true);
  assert.deepEqual(valid.data, (await mcp('validate_project', { ref: 'gyldig-case', remote: false })).data);

  await api('PUT', `/api/admin/projects/${valid.data.project.id}`, { thumbnail_url: '/uploads/mangler.webp' });
  const broken = await api('GET', '/api/admin/projects/gyldig-case/validate?remote=0');
  assert.equal(broken.data.ok, false);
  assert.deepEqual(broken.data.errors.map((e) => e.code), ['missing_file']);
  assert.equal((await api('GET', '/api/admin/projects/findes-ikke/validate')).status, 404);
});

test('every admin field round-trips through REST and MCP, and updates are partial on both', async () => {
  const schema = casework.describe();
  const payload = {
    title: 'Paritet', slug: 'paritet', category: 'AI', year: 2025, client: 'Kunde ApS', sort_order: 3,
    subtitle: 'Undertitel', industry: 'Medie', role_scope: 'Lead', deliverables: 'App', timeline: '8 uger',
    services: 'Strategi', featured: true, status: 'draft', description: 'Kort', long_description: 'Lang',
    challenge: 'Udfordring', approach: 'Tilgang', results: 'Resultat', tags: ['AI'], tech_stack: ['Python'],
    metrics: [{ value: '3', label: 'Apps' }], testimonial_text: 'Citat', testimonial_author: 'Navn',
    testimonial_role: 'CEO', client_logo: 'https://mast3kmedia.dk/uploads/l.webp', thumbnail_url: '/uploads/t.webp',
    case_url: 'https://example.dk', og_image: '/uploads/og.webp',
    media: [{ type: 'video', url: '/uploads/d.mp4', role: 'demo', provider: 'mp4', poster: '/uploads/p.webp', caption: 'Demo', alt: '' }],
    blocks: [{ type: 'quote', text: 'Tekst', author: 'A', role: 'B' }],
    team: [{ name: 'Tobias', role: 'Udvikler' }], awards: [{ title: 'Pris', org: 'Org' }],
  };
  assert.deepEqual(Object.keys(payload).sort(), Object.keys(schema.fields).sort(), 'payload covers every schema field');
  const createTool = (await mcpToolList(base, MCP_TOKEN)).find((t) => t.name === 'create_project');
  assert.deepEqual(Object.keys(createTool.inputSchema.properties).sort(), Object.keys(schema.fields).sort(), 'MCP create_project accepts every schema field');

  const created = await api('POST', '/api/admin/projects', payload);
  assert.equal(created.status, 201);
  const viaMcp = (await mcp('get_project', { ref: 'paritet' })).data;
  for (const k of Object.keys(schema.fields)) assert.deepEqual(viaMcp[k], payload[k], k);

  await mcp('update_project', { ref: 'paritet', results: 'Nyt resultat' });
  const viaRest = (await api('GET', `/api/admin/projects/${created.data.id}`)).data;
  for (const k of Object.keys(schema.fields)) assert.deepEqual(viaRest[k], k === 'results' ? 'Nyt resultat' : payload[k], k);

  await api('PUT', `/api/admin/projects/${created.data.id}`, { subtitle: 'REST' });
  const after = (await mcp('get_project', { ref: String(created.data.id) })).data;
  assert.equal(after.subtitle, 'REST');
  assert.equal(after.results, 'Nyt resultat');
  assert.deepEqual(after.team, payload.team);
});
