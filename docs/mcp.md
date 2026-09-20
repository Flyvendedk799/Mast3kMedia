# Mast3kMedia MCP

Mast3kMedia exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) interface so AI agents (Grok Bot, Cursor, Claude Desktop, etc.) can manage the live portfolio and blog against the **same SQLite DB** as the Express app (`db/mast3k.db`).

There are two transports. Tool logic is shared via `lib/mcp-app.mjs` — do not duplicate CRUD in clients.

## 1. Stdio (local / Cursor project)

```bash
npm run mcp          # node mcp-server.mjs
```

Project config: `.mcp.json` → `node mcp-server.mjs`.

## 2. Streamable HTTP (production / remote bots)

| | |
|--|--|
| **URL** | `https://mast3kmedia.dk/mcp` (local: `http://localhost:3000/mcp`) |
| **Method** | `POST` only (Streamable HTTP / JSON-RPC) |
| **Auth** | `Authorization: Bearer <token>` |

### Authentication

Accepted Bearer tokens (first match wins):

1. **`MCP_AUTH_TOKEN`** — dedicated env secret (preferred for bots; same idea as ServerHoster’s `SURVHUB_AUTH_TOKEN`).
2. **Admin JWT** — token from `POST /api/auth/login` (valid against `JWT_SECRET`).

Missing/invalid auth → **401** with JSON-RPC body:

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32001, "message": "Unauthorized MCP session" },
  "id": null
}
```

Set in production (ServerHoster service env):

```bash
MCP_AUTH_TOKEN=<long-random-secret>
```

### Cursor / Grok — remote HTTP MCP

```json
{
  "mcpServers": {
    "mast3kmedia-blog": {
      "url": "https://mast3kmedia.dk/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

(Exact AddMcpServer / connector UI field names vary; the important parts are the URL and the `Authorization` header.)

### curl smoke

```bash
# 401 without auth
curl -sS -o /tmp/mcp401.json -w "%{http_code}\n" \
  -X POST http://localhost:3000/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

# 200 initialize with MCP_AUTH_TOKEN
export MCP_AUTH_TOKEN=dev-mcp-token
# (restart npm start with that env, then:)
curl -sS -X POST http://localhost:3000/mcp \
  -H "authorization: Bearer $MCP_AUTH_TOKEN" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

Automated smoke: `npm run test:mcp` (node:test).

## Tools

### Blog

| Tool | Purpose |
|------|---------|
| `blog_list_posts` | List/filter posts |
| `blog_get_post` | Get by slug or id |
| `blog_list_categories` | List categories |
| `blog_create_post` / `blog_update_post` / `blog_delete_post` | Post CRUD |
| `blog_create_category` / `blog_update_category` / `blog_delete_category` | Category CRUD |
| `blog_upload_media` | Upload image/video bytes (base64) + filename, returns `{ url, mime, bytes, width?, height? }` where url is `/uploads/<file>` |
| `blog_list_media` | List recent uploaded media files (name, url, bytes, mtime), capped at ~100 |
| `blog_publish_post` | Set post status to published, sets published_at if empty |
| `blog_unpublish_post` | Set post status to draft |
| `blog_set_cover` | Set cover image URL for a post (ref + URL) |

Resources: `blog://posts`, `blog://categories`.

### Projects (also registered)

`list_projects`, `get_project`, `get_stats`, `create_project`, `update_project`, `delete_project`, `publish_project`, `unpublish_project`, `set_featured`, `reorder_projects`, `bulk_import`, `set_blocks`, `add_media`, plus resources `projects://all` / `projects://published`.

## Architecture

```
mcp-server.mjs          → stdio transport → createMast3kMcpServer(db)
server.js + lib/mcp-http.mjs → POST /mcp → same createMast3kMcpServer(db)
lib/mcp-app.mjs         → shared tools / schema helpers
```

Both paths talk to `db/mast3k.db` (WAL). Public blog API and admin UI are unchanged.

## Follow-up after merge

1. Redeploy ServerHoster service **Mast3kMedia** so `/mcp` is live.
2. Set `MCP_AUTH_TOKEN` on that service.
3. Point Grok Bot / Cursor remote MCP at `https://mast3kmedia.dk/mcp` with the Bearer header.