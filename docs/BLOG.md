# Blog — API, admin & MCP

Danish public blog + admin CRUD + MCP tools. Shares the same SQLite DB as projects (`db/mast3k.db` via `better-sqlite3`).

## Run

```bash
npm start          # Express site + API (default :3000)
npm run mcp        # MCP stdio server (blog + project tools)
```

Admin: `http://localhost:3000/admin`  
Public: `http://localhost:3000/blog.html` · post `blog-post.html?slug=…`

## Schema

- `blog_categories` — `id`, `name`, `slug` UNIQUE, `description`, `created_at`
- `blog_posts` — `id`, `title`, `slug` UNIQUE, `excerpt`, `body`, `cover_image`, `status` (`draft`|`published`), `category_id` FK nullable, `published_at`, `created_at`, `updated_at`, `author`

Indexes on `slug`, `status`, `category_id`. Schemas are created in `server.js` and ensured by `lib/mcp-app.mjs` (stdio + HTTP MCP).

## Public API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/blog/categories` | All categories |
| GET | `/api/blog/posts?category=&page=&limit=` | Published only; paginated `{ posts, page, limit, total, pages }` |
| GET | `/api/blog/posts/:slug` | Published only |

## Admin API (`Authorization: Bearer <jwt>`)

| Method | Path |
|--------|------|
| CRUD | `/api/admin/blog/categories` |
| CRUD | `/api/admin/blog/posts` |
| GET | `/api/admin/blog/posts/:id` |
| PATCH | `/api/admin/blog/posts/:id/status` `{ status: "draft"\|"published" }` |

## Admin UI

Sidebar: **Blog-indlæg**, **Kategorier**. Same SPA patterns as projects (list / form / status / delete).

## MCP tools

Shared tool logic lives in `lib/mcp-app.mjs`.

| Transport | How |
|-----------|-----|
| Stdio | `npm run mcp` / `.mcp.json` |
| HTTP | `POST https://mast3kmedia.dk/mcp` with `Authorization: Bearer <MCP_AUTH_TOKEN\|admin JWT>` |

Full HTTP auth, Cursor/Grok config, and smoke tests: **[docs/mcp.md](./mcp.md)**.

### Tool list (`npm run mcp` or HTTP)


| Tool | Purpose |
|------|---------|
| `blog_list_posts` | List/filter posts |
| `blog_get_post` | Get by slug or id |
| `blog_list_categories` | List categories |
| `blog_create_post` / `blog_update_post` / `blog_delete_post` | Post CRUD |
| `blog_create_category` / `blog_update_category` / `blog_delete_category` | Category CRUD |

Resources: `blog://posts`, `blog://categories`. Stdio client config: `.mcp.json` → `node mcp-server.mjs`. See [mcp.md](./mcp.md) for HTTP.

## Quick smoke test

```bash
# create category + published post via admin login, then:
curl -s 'http://localhost:3000/api/blog/categories'
curl -s 'http://localhost:3000/api/blog/posts'
curl -s 'http://localhost:3000/api/blog/posts/<slug>'
```
