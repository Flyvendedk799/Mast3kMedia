# Blog — API, admin & MCP

Danish public blog + admin CRUD + MCP tools. Shares the same SQLite DB as projects (`db/mast3k.db` via `better-sqlite3`).

## Run

```bash
npm start          # Express site + API (default :3000)
npm run mcp        # MCP stdio server (blog + project tools)
```

Admin: `http://localhost:3000/admin`  
Public: `http://localhost:3000/blog.html` · post `/blog/<slug>`

## Schema

- `blog_categories` — `id`, `name`, `slug` UNIQUE, `description`, `created_at`
- `blog_posts` — `id`, `title`, `slug` UNIQUE, `excerpt`, `body`, `cover_image`, `status` (`draft`|`published`), `category_id` FK nullable, `tags` (JSON string array), `published_at`, `created_at`, `updated_at`, `author`

Indexes on `slug`, `status`, `category_id`. Schemas are created in `server.js` and ensured by `lib/mcp-app.mjs` (stdio + HTTP MCP).

## Public API

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/blog/categories` | All categories |
| GET | `/api/blog/posts?category=&page=&limit=&tag=` | Published only; paginated `{ posts, page, limit, total, pages }` |
| GET | `/api/blog/posts/:slug` | Published only |
| GET | `/blog/:slug` | Pretty URL for published posts (redirects from `blog-post.html?slug=`) |

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
| `blog_upload_media` | Upload image/video to persistent storage, returns public URL |
| `blog_list_media` | List recent uploaded media files |
| `blog_publish_post` | Set post status to published |
| `blog_unpublish_post` | Set post status to draft |
| `blog_set_cover` | Set cover image URL for a post |

Resources: `blog://posts`, `blog://categories`. Stdio client config: `.mcp.json` → `node mcp-server.mjs`. See [mcp.md](./mcp.md) for HTTP.

## For Mast3kMedia Blogger bot

The recommended publish sequence for agents:

1. `blog_upload_media` (for cover image)
2. `blog_upload_media` (for in-article images as needed)
3. `blog_create_post` / `blog_update_post` with:
   - `cover_image`: URL from step 1
   - `body`: markdown containing `![alt](/uploads/...)` for images
   - `tags`: array of strings
   - `category`: slug or ID
4. `blog_publish_post` (if not published in step 3)
5. Verify with `blog_get_post` and public `/blog/<slug>`

## Quick smoke test

```bash
# create category + published post via admin login, then:
curl -s 'http://localhost:3000/api/blog/categories'
curl -s 'http://localhost:3000/api/blog/posts'
curl -s 'http://localhost:3000/api/blog/posts/<slug>'
# or with pretty URL:
curl -s 'http://localhost:3000/blog/<slug>'
```