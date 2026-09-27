# Portfolio & casework: API, admin & MCP

Projects (cases) live in the `projects` table in the same SQLite DB as the blog. The admin form (`/admin`), the REST API and the MCP tools all read and write the same fields through `lib/casework.js`, so an agent can fill in everything an admin can. See [BLOG.md](./BLOG.md) for the blog and [mcp.md](./mcp.md) for MCP transport and auth.

Public pages: listing `/arbejde.html`, case `/arbejde/<slug>` (published only), draft preview `/arbejde/preview/<token>`.

## Fields

`describe_project_schema` (MCP) and `GET /api/admin/projects/schema` (REST) return the full schema: type, required, recommended max length, enum, and the Danish label, hint and question from the admin form. Summary:

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required. Keep under 60 characters |
| `slug` | string | Derived from title when omitted. Danish ASCII: æ=ae, ø=oe, å=aa. Rename with `new_slug` (MCP) or `slug` (REST) |
| `category` | enum | Required. `Software`, `SaaS`, `AI`, `Marketing`, `Fintech`, `E-commerce`, `App`, `Design`, `Andet` |
| `year` | integer | Required, 2000 to 2099 |
| `client`, `subtitle`, `role_scope`, `deliverables`, `timeline`, `services` | string | Fact sheet on the case page |
| `industry` | enum | `SaaS`, `FinTech`, `E-commerce`, `AI`, `Healthcare`, `Logistik`, `Uddannelse`, `Medie`, `Andet` |
| `description` | string | Required. Card text and meta description, about 160 characters |
| `long_description` | string | Required. Intro at the top of the case |
| `challenge` | string | "Hvad var problemet eller udfordringen?" |
| `approach` | string | "Hvordan løste vi det?" |
| `results` | string | "Hvad opnåede projektet? Beskriv den konkrete effekt." |
| `tags`, `tech_stack` | string[] | |
| `metrics` | `{value,label}[]` | Documented numbers only |
| `testimonial_text`, `testimonial_author`, `testimonial_role` | string | Real quotes only; author is required when text is set |
| `client_logo`, `thumbnail_url`, `case_url`, `og_image` | url | `thumbnail_url` is required to publish; `og_image` falls back to it |
| `media` | media item[] | See below |
| `blocks` | block[] | See below |
| `team` | `{name,role}[]` | |
| `awards` | `{title,org?}[]` | |
| `featured`, `sort_order`, `status` | | `status` is `draft` or `published` |

Updates are partial on both REST (`PUT`) and MCP (`update_project`): omitted fields keep their stored value. Send an empty string or empty array to clear a field.

## Media items and blocks

Media item: `{ type: image|video|embed, url, alt, caption, role, provider, poster }`.

- Roles: `hero`, `gallery`, `feature`, `before`, `after`, `device-desktop`, `device-mobile`, `demo`
- Providers: `file`, `mp4`, `youtube`, `vimeo` (inferred from the URL when absent)
- Images need Danish `alt` text; captions are recommended

Blocks (`set_blocks` replaces the list; each block is `{ type, id?, ...fields }`):

| Type | Fields |
|------|--------|
| `richtext` | `eyebrow?`, `title?`, `body` |
| `timeline` | `title?`, `phases: [{ label, title, body?, date? }]` |
| `gallery` | `title?`, `layout: grid\|masonry`, `items: [media item]` |
| `video` | `title?`, `items: [media item of type video or embed]` |
| `before_after` | `title?`, `before: { url, label }`, `after: { url, label }` |
| `metrics` | `title?`, `items: [{ value, label }]` |
| `quote` | `text`, `author?`, `role?` |
| `embed` | `provider: youtube\|vimeo`, `url` (embed URL), `caption?` |

## Uploads

Accepted: PNG, JPEG, GIF, WebP, AVIF (max 20 MB) and MP4, WebM (max 60 MB). The type is detected from the magic bytes, not the filename or declared MIME. SVG, MOV and OGV are rejected.

- Images are auto-rotated, resized to at most 2560 px wide and stored as WebP.
- MP4 files must contain a `moov` box and their full length, so truncated recordings are rejected.
- Pass `sha256` (hex, of the original file) and/or `bytes` to catch corrupted transfers. A mismatch returns 400 and nothing is stored.
- The response is `{ url, path, name, type, mime, bytes, width?, height?, source_bytes, source_sha256 }`, where `url` is absolute (`https://mast3kmedia.dk/uploads/…`) and `path` is `/uploads/…`.

REST takes the raw file as the request body:

```bash
curl -X POST "$BASE/api/admin/uploads" -H "Authorization: Bearer $JWT" \
  -H "X-Filename: skaermbillede.png" -H "X-Content-SHA256: $(sha256sum skaermbillede.png | cut -d' ' -f1)" \
  --data-binary @skaermbillede.png
```

MCP `upload_media` takes base64 in `data`. The HTTP MCP JSON body limit is 24 MB, so base64 uploads top out around 17 MB of file; use REST for larger videos. `blog_upload_media` uses the same pipeline and still returns a relative `url` plus `absolute_url`.

Deleting: `DELETE /api/admin/uploads/<name>` or MCP `delete_media { url }`. While any project or blog post references the file, the call returns 409 with `used_by: [{ type, id, slug, title, status, fields }]`. Add `?force=1` (REST) or `force: true` (MCP) to delete anyway.

## Validate

`GET /api/admin/projects/<id|slug>/validate` or MCP `validate_project { ref, remote? }` returns `{ ok, project, errors[], warnings[], checked_urls }`. Each issue is `{ field, code, message }`. `ok` is true when there are no errors.

Errors (fix before publishing): missing required fields, no `og_image` and no `thumbnail_url`, an invalid slug, a year out of range, images with neither alt nor caption, unknown media types, roles or providers, unknown block types or blocks missing required fields, a testimonial without an author, incomplete metrics, team or awards, a relative `case_url`, local `/uploads` or `/assets` files that do not exist, and remote URLs answering 404 or 410.

Warnings: empty recommended fields, text over the recommended length, values outside the category or industry lists, alt text that looks English, missing captions, em dashes, en dashes or `--` in prose, mentions of `/kontakt` or `/ydelser` in prose (`sales_link`; case pages must not link there), no case media, non embed URLs in embed blocks, inline `data:` URLs, plain `http://` URLs and remote URLs that could not be checked. Remote URLs get a HEAD request (5 s timeout, GET fallback); pass `remote=0` (REST) or `remote: false` (MCP) to skip that.

`publish_project` (and `PATCH /api/admin/projects/:id/status`) never block on validation errors: validation only reports. Run it before publishing.

## Preview

`POST /api/admin/projects/<id|slug>/preview { hours? }` or MCP `preview_project { ref, hours? }` returns `{ url, path, expires_at }`. Default lifetime 24 hours, max 168.

The link renders the case exactly like the public page, with `<meta name="robots" content="noindex, nofollow">`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`, and without the consent script, Cookiebot, GTM, `analytics.js` and the dataLayer push, so draft URLs never reach analytics. Public case pages keep GTM unchanged. Tokens are signed with a key derived from `JWT_SECRET` and only grant access to that one case; they are not valid admin tokens. Expired or tampered tokens return 404.

## REST endpoints (`Authorization: Bearer <jwt>`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/projects` | List all projects |
| GET | `/api/admin/projects/schema` | Field schema (same as `describe_project_schema`) |
| GET | `/api/admin/projects/:ref` | One project by id or slug, drafts included |
| POST | `/api/admin/projects` | Create |
| PUT | `/api/admin/projects/:id` | Partial update |
| DELETE | `/api/admin/projects/:id` | Delete |
| PATCH | `/api/admin/projects/:id/status` | `{ status }` |
| PATCH | `/api/admin/projects/:id/featured` | `{ featured }` |
| POST | `/api/admin/projects/reorder` | `{ order: [{ id, sort_order }] }` |
| GET | `/api/admin/projects/:ref/validate` | Validate (`?remote=0` skips remote checks) |
| POST | `/api/admin/projects/:ref/preview` | Signed preview link |
| POST | `/api/admin/uploads` | Upload raw bytes (`X-Filename`, `X-Content-SHA256`) |
| DELETE | `/api/admin/uploads/:name` | Delete (`?force=1`) |

## MCP tools

| Tool | Purpose |
|------|---------|
| `describe_project_schema` | Fields, categories, industries, block shapes, media roles and providers, upload limits |
| `list_projects` / `get_project` / `get_stats` | Read |
| `create_project` / `update_project` / `delete_project` | CRUD; update is partial |
| `bulk_import` | Create many projects with the full field set |
| `set_blocks` / `add_media` | Layout blocks and case media |
| `upload_media` / `delete_media` | Media with integrity checks and usage-aware delete |
| `validate_project` | Structured errors and warnings |
| `preview_project` | Signed noindex preview link for drafts |
| `publish_project` / `unpublish_project` / `set_featured` / `reorder_projects` | Publishing and ordering |

## Publishing workflow

1. `describe_project_schema` to get the current fields and enums.
2. `upload_media` for screenshots (1440 and 390 px wide) and an optional short MP4 or WebM, passing `sha256` and `bytes`.
3. `create_project` as a draft with the text fields, `thumbnail_url`, `og_image`, tags, tech stack and media.
4. `set_blocks` for the case layout.
5. `validate_project` until `errors` is empty, and fix warnings where possible.
6. `preview_project` and check the page at desktop and mobile widths.
7. `publish_project`, then check `/arbejde/<slug>` and that the case shows on `/arbejde.html`.

Case text and blocks must not link to or mention `/kontakt` or `/ydelser`.

Leads (admin "Henvendelser", `GET /api/admin/leads`) are intentionally not exposed over MCP because they hold personal data.

The portable agent skill for this flow is [`skills/mast3kmedia-portfolio-case/SKILL.md`](../skills/mast3kmedia-portfolio-case/SKILL.md).
