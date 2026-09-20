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
import { mountMcpHttp } from '../lib/mcp-http.mjs';
import { ensureMcpSchema } from '../lib/mcp-app.mjs';

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
