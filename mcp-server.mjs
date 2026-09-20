/**
 * Mast3kMedia MCP Server (stdio)
 *
 * Exposes portfolio project + blog management as MCP tools, resources, and prompts.
 * Connect with Claude Code, Cursor, Windsurf, Zed, VS Code Copilot, or any
 * MCP-compatible client.
 *
 * Usage (stdio):
 *   node mcp-server.mjs
 *   npm run mcp
 *
 * HTTP (Streamable) endpoint lives on the Express app — see docs/mcp.md.
 * Claude Code auto-discovers this stdio server via .mcp.json in the project root.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { openMcpDb, createMast3kMcpServer } from './lib/mcp-app.mjs';

const db = openMcpDb();
const server = createMast3kMcpServer(db);
const transport = new StdioServerTransport();
await server.connect(transport);
