/**
 * Authenticated Streamable HTTP MCP endpoint for Express.
 *
 * Pattern adapted from ServerHoster global MCP (POST /mcp + Bearer +
 * StreamableHTTPServerTransport with sessionIdGenerator: undefined).
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMast3kMcpServer, ensureMcpSchema } from './mcp-app.mjs';
import jwt from 'jsonwebtoken';

function extractBearer(req) {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== 'string') return '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function unauthorized(res, message = 'Unauthorized MCP session') {
  return res.status(401).json({
    jsonrpc: '2.0',
    error: { code: -32001, message },
    id: null,
  });
}

/**
 * @param {import('express').Express} app
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   mcpAuthToken?: string,
 *   jwtSecret?: string,
 *   path?: string,
 * }} opts
 */
export function mountMcpHttp(app, opts) {
  const {
    db,
    mcpAuthToken = process.env.MCP_AUTH_TOKEN || '',
    jwtSecret = process.env.JWT_SECRET || 'mast3k_dev_secret_CHANGE_ME',
    path: mcpPath = '/mcp',
  } = opts;

  ensureMcpSchema(db);

  function isAuthorized(token) {
    if (!token) return false;
    if (mcpAuthToken && token === mcpAuthToken) return true;
    try {
      jwt.verify(token, jwtSecret);
      return true;
    } catch {
      return false;
    }
  }

  const handler = async (req, res) => {
    const token = extractBearer(req);
    if (!isAuthorized(token)) {
      return unauthorized(res);
    }

    // Stateless transport — one server+transport per request (ServerHoster pattern)
    const mcpServer = createMast3kMcpServer(db);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[mcp] HTTP request failed:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal MCP server error' },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await mcpServer.close().catch(() => undefined);
    }
  };

  app.post(mcpPath, handler);
  app.get(mcpPath, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'MCP endpoint accepts POST (Streamable HTTP) only' },
      id: null,
    });
  });
  app.delete(mcpPath, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'MCP endpoint accepts POST (Streamable HTTP) only' },
      id: null,
    });
  });

  return { path: mcpPath };
}
