/**
 * Shared helpers for the casework tests: media fixtures and an MCP-over-HTTP client.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const uploadsDir = path.join(root, 'uploads');

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export const png = (width = 200, height = 120) =>
  sharp(crypto.randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).png().toBuffer();

const box = (type, ...parts) => {
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + body.length);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, body]);
};

export const mp4 = () => Buffer.concat([
  box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2mp41', 'latin1')),
  box('moov', box('mvhd', Buffer.alloc(100))),
  box('mdat', crypto.randomBytes(4096)),
]);

export const webm = () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), crypto.randomBytes(512)]);

export const removeUpload = (url) => {
  if (url) fs.rmSync(path.join(uploadsDir, path.basename(url)), { force: true });
};

const parse = (text) => {
  try { return JSON.parse(text); } catch {}
  const i = text.indexOf('\n\n');
  try { return JSON.parse(text.slice(i + 2)); } catch { return null; }
};

async function rpc(base, token, method, params) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.text();
  const line = body.split('\n').find((l) => l.startsWith('data: '));
  return JSON.parse(line ? line.slice(6) : body);
}

// Calls one MCP tool over the stateless Streamable HTTP endpoint.
export async function mcpTool(base, token, name, args = {}) {
  const msg = await rpc(base, token, 'tools/call', { name, arguments: args });
  if (msg.error) return { isError: true, text: msg.error.message, data: null };
  const text = msg.result.content[0].text;
  return { isError: !!msg.result.isError, text, data: parse(text) };
}

export const mcpToolList = async (base, token) => (await rpc(base, token, 'tools/list', {})).result.tools;
