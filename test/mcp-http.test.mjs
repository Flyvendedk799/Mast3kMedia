/**
 * Smoke tests for authenticated HTTP MCP endpoint.
 * Spins up a minimal Express app with the real mount helper + temp sqlite.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { mountMcpHttp } from '../lib/mcp-http.mjs';
import { ensureMcpSchema } from '../lib/mcp-app.mjs';
import casework from '../lib/casework.js';
import { png, mp4, webm, sha256, removeUpload, mcpTool, uploadsDir } from './fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeApp(token) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mast3k-mcp-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  ensureMcpSchema(db);

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  mountMcpHttp(app, {
    db,
    mcpAuthToken: token,
    jwtSecret: 'test-jwt-secret',
    path: '/mcp',
  });

  return { app, db, dir };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

const INIT_BODY = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1' },
  },
};

test('HTTP MCP rejects unauthenticated requests with 401 JSON-RPC', async () => {
  const { app, db, dir } = makeApp('secret-token');
  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(INIT_BODY),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.jsonrpc, '2.0');
    assert.equal(data.error.code, -32001);
  } finally {
    server.close();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('HTTP MCP accepts MCP_AUTH_TOKEN and initializes', async () => {
  const token = 'secret-token';
  const { app, db, dir } = makeApp(token);
  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(INIT_BODY),
    });
    assert.equal(res.status, 200);
    const text = await res.text();
    // Streamable HTTP may return SSE (`data: {...}`) or plain JSON
    let payload;
    const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
    if (dataLine) payload = JSON.parse(dataLine.slice(6));
    else payload = JSON.parse(text);
    assert.equal(payload.id, 1);
    assert.equal(payload.result.serverInfo.name, 'mast3kmedia');
  } finally {
    server.close();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

async function withMcp(t) {
  const token = 'secret-token';
  const { app, db, dir } = makeApp(token);
  const { server, base } = await listen(app);
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { db, call: (name, args) => mcpTool(base, token, name, args) };
}

test('MCP create_project stores every field and update_project only changes what is passed', async (t) => {
  const { call } = await withMcp(t);
  const full = {
    title: 'Fuld case', category: 'SaaS', case_url: 'https://example.dk', timeline: '6 uger',
    services: 'Design', results: 'Resultat', subtitle: 'Under', client_logo: '/uploads/logo.webp',
    industry: 'SaaS', deliverables: 'Web app', role_scope: 'Lead', og_image: '/uploads/og.webp',
    team: [{ name: 'Tobias', role: 'Udvikler' }], awards: [{ title: 'Pris' }],
  };
  const created = await call('create_project', full);
  assert.equal(created.isError, false, created.text);
  for (const [k, v] of Object.entries(full)) assert.deepEqual(created.data[k], v, k);

  const updated = await call('update_project', { ref: 'fuld-case', title: 'Nyt navn' });
  assert.equal(updated.data.title, 'Nyt navn');
  for (const [k, v] of Object.entries(full)) if (k !== 'title') assert.deepEqual(updated.data[k], v, k);

  const bulk = await call('bulk_import', { projects: [{ title: 'Import', subtitle: 'Sub', team: [{ name: 'A', role: 'B' }] }] });
  assert.match(bulk.text, /1 created/);
  const imported = await call('get_project', { ref: 'import' });
  assert.equal(imported.data.subtitle, 'Sub');
  assert.deepEqual(imported.data.team, [{ name: 'A', role: 'B' }]);
});

test('MCP upload_media converts images to webp and rejects corrupt, truncated or mismatched payloads', async (t) => {
  const { call } = await withMcp(t);
  const created = [];
  t.after(() => created.forEach(removeUpload));
  const image = await png();

  const ok = await call('upload_media', { data: image.toString('base64'), filename: 'Forside æøå.png', sha256: sha256(image), bytes: image.length });
  assert.equal(ok.isError, false, ok.text);
  created.push(ok.data.path);
  assert.match(ok.data.url, /^https:\/\/mast3kmedia\.dk\/uploads\/forside-aeoeaa-[0-9a-f]{8}\.webp$/);
  assert.equal(ok.data.mime, 'image/webp');
  assert.equal(ok.data.width, 200);
  const stored = fs.readFileSync(path.join(uploadsDir, ok.data.name));
  assert.equal(stored.toString('latin1', 8, 12), 'WEBP');

  const rejects = {
    corrupt: { data: Buffer.from('not an image at all').toString('base64'), filename: 'x.png' },
    truncated: { data: image.subarray(0, image.length / 2).toString('base64'), filename: 'x.png' },
    sha: { data: image.toString('base64'), filename: 'x.png', sha256: sha256(Buffer.from('other')) },
    bytes: { data: image.subarray(0, image.length - 10).toString('base64'), filename: 'x.png', bytes: image.length },
    base64: { data: '%%%not base64%%%', filename: 'x.png' },
    truncatedVideo: { data: mp4().subarray(0, 1000).toString('base64'), filename: 'x.mp4' },
  };
  for (const [name, args] of Object.entries(rejects)) {
    const res = await call('upload_media', args);
    assert.equal(res.isError, true, `${name} should be rejected`);
  }
  assert.match((await call('upload_media', rejects.bytes)).text, /Size mismatch/);

  for (const [buf, mime] of [[mp4(), 'video/mp4'], [webm(), 'video/webm']]) {
    const res = await call('upload_media', { data: buf.toString('base64'), filename: 'demo', sha256: sha256(buf) });
    assert.equal(res.isError, false, res.text);
    created.push(res.data.path);
    assert.equal(res.data.mime, mime);
    assert.equal(res.data.bytes, buf.length);
  }

  const blog = await call('blog_upload_media', { data: image.toString('base64'), filename: 'cover.png' });
  created.push(blog.data.url);
  assert.match(blog.data.url, /^\/uploads\/cover-.+\.webp$/);
  assert.equal(blog.data.absolute_url, `https://mast3kmedia.dk${blog.data.url}`);
});

test('MCP delete_media refuses while a project or post uses the file, unless forced', async (t) => {
  const { call, db } = await withMcp(t);
  const image = await png(40, 30);
  const up = await call('upload_media', { data: image.toString('base64'), filename: 'brugt.png' });
  t.after(() => removeUpload(up.data.path));
  await call('create_project', { title: 'Bruger', media: [{ url: up.data.url, alt: 'Skærmbillede' }] });
  db.prepare("INSERT INTO blog_posts (title, slug, body) VALUES ('Indlæg', 'indlaeg', ?)").run(`![alt](${up.data.path})`);

  const refused = await call('delete_media', { url: up.data.url });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.data.used_by.map((u) => [u.type, u.slug, u.fields]), [['project', 'bruger', ['media']], ['post', 'indlaeg', ['body']]]);
  assert.ok(fs.existsSync(path.join(uploadsDir, up.data.name)));

  const forced = await call('delete_media', { url: up.data.name, force: true });
  assert.equal(forced.data.deleted, true);
  assert.equal(fs.existsSync(path.join(uploadsDir, up.data.name)), false);
  assert.equal((await call('delete_media', { url: '../server.js' })).isError, true);
});

test('MCP describe_project_schema, validate_project and preview_project', async (t) => {
  const { call } = await withMcp(t);
  const schema = (await call('describe_project_schema')).data;
  assert.deepEqual(schema, casework.describe());
  assert.ok(schema.categories.includes('E-commerce'));
  assert.equal(schema.fields.challenge.question, 'Hvad var problemet eller udfordringen?');
  assert.deepEqual(Object.keys(schema.blocks), ['richtext', 'timeline', 'gallery', 'video', 'before_after', 'metrics', 'quote', 'embed']);

  await call('create_project', {
    title: 'Halv case', description: 'Kort — med tankestreg',
    media: [{ url: '/uploads/findes-ikke.webp', role: 'hero' }],
    blocks: [{ type: 'gallery', items: [] }, { type: 'mystery' }, { type: 'richtext', body: 'Skriv til mig på /kontakt' }],
    approach: 'Se https://kunde.dk/kontakt og mine /kontakter',
  });
  const report = (await call('validate_project', { ref: 'halv-case', remote: false })).data;
  assert.equal(report.ok, false);
  const codes = (list) => list.map((e) => `${e.field}:${e.code}`);
  for (const c of ['long_description:required', 'thumbnail_url:required', 'og_image:required', 'media[0]:alt_missing',
    'media[0].url:missing_file', 'blocks[0].items:required', 'blocks[1]:invalid_block']) {
    assert.ok(codes(report.errors).includes(c), c);
  }
  assert.ok(codes(report.warnings).includes('description:dash'));
  assert.ok(codes(report.warnings).includes('media[0]:caption_missing'));
  assert.ok(codes(report.warnings).includes('blocks[2].body:sales_link'));
  assert.equal(codes(report.warnings).includes('approach:sales_link'), false);

  const preview = (await call('preview_project', { ref: 'halv-case', hours: 2 })).data;
  assert.match(preview.path, /^\/arbejde\/preview\/[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.ok(new Date(preview.expires_at) > new Date());
  const token = preview.path.split('/').pop();
  assert.ok(casework.verifyPreview('test-jwt-secret', token));
  assert.equal(casework.verifyPreview('other-secret', token), null);
  assert.throws(() => jwt.verify(token, 'test-jwt-secret'), 'a preview token must not pass as an admin JWT');
});

test('MCP blog tools keep the category slug and return SEO fields', async (t) => {
  const { call } = await withMcp(t);
  await call('blog_create_category', { name: 'Nyheder', description: 'Beskrivelse' });
  const cat = await call('blog_update_category', { ref: 'nyheder', name: 'Nyt' });
  assert.equal(cat.isError, false, cat.text);
  assert.equal(cat.data.slug, 'nyheder');
  assert.equal(cat.data.description, 'Beskrivelse');
  const post = await call('blog_create_post', { title: 'SEO', seo_title: 'Titel', seo_description: 'Beskrivelse', cover_alt: 'Alt' });
  assert.equal(post.data.seo_title, 'Titel');
  assert.equal(post.data.cover_alt, 'Alt');
});
