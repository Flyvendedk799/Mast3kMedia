# Mast3kMedia Repo-To-Case Contract

The target repo is source material. Mast3kMedia is the destination portfolio site.

## Required Destination Surfaces

The Mast3kMedia checkout should expose:

- `mcp-server.mjs`
- `.mcp.json`
- `.codex/config.toml`
- `server.js`
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`
- public pages that consume projects: `index.html`, `arbejde.html`, `case.html`
- `uploads/` static directory served at the `/uploads` path

### Required Admin Element IDs (v2 media manager + block builder)

The audit verifies these IDs exist in `admin/index.html` so field/surface parity holds:

- `fieldBlocks` — hidden input/textarea holding JSON of the `blocks` array.
- `blocksBuilder` — container for the block builder UI.
- `mediaManager` — container for the structured media editor.
- `mediaUploadInput` — `<input type=file>` for uploads to `POST /api/admin/uploads`.
- `embedUrlInput` — text input for a YouTube/Vimeo embed URL.

Existing field IDs (`fieldTitle`, `fieldSlug`, `fieldMedia`, etc.) remain intact.

## Destination Project Fields

The MCP must support everything the admin UI can submit:

| Field | Admin UI source | Use |
| --- | --- | --- |
| `title` | `fieldTitle` | project/case name |
| `slug` | `fieldSlug` | `/case.html?slug=...` |
| `category` | `fieldCategory` | filters/cards/case tags |
| `description` | `fieldDescription` | card copy and case brief |
| `long_description` | `fieldLongDesc` | case lead |
| `challenge` | `fieldChallenge` | case challenge column |
| `approach` | `fieldApproach` | case approach column |
| `tags` | `tagsInput` / `fieldTags` | card labels |
| `tech_stack` | `techInput` / `fieldTech` | case tech list |
| `client` | `fieldClient` | client metadata |
| `year` | `fieldYear` | case/card metadata |
| `status` | save/publish buttons | public visibility |
| `featured` | `fieldFeatured` | homepage placement |
| `sort_order` | `fieldSortOrder` | display order |
| `metrics` | `metricsRows` | case metrics band |
| `testimonial_text` | `fieldTestiText` | optional quote |
| `testimonial_author` | `fieldTestiAuthor` | optional quote attribution |
| `testimonial_role` | `fieldTestiRole` | optional quote role |
| `thumbnail_url` | `fieldThumb` | card media URL/data URL, or empty to clear |
| `case_url` | `fieldCaseUrl` | live app/repo URL, or empty to clear |
| `media` | `fieldMedia` / `mediaManager` | structured case-page screenshots/videos (enriched items, see Media Roles) |
| `blocks` | `fieldBlocks` / `blocksBuilder` | ordered custom layout sections appended after the core case sections (see Block Types) |

### Media Roles (enriched `media` item shape — backward compatible)

Existing items (`{type,url,caption,alt}`) keep rendering unchanged. New optional keys:

- `provider`: `file` | `mp4` | `youtube` | `vimeo`. Inferred from the URL when absent
  (`youtube.com`/`youtu.be` ⇒ youtube; `vimeo.com` ⇒ vimeo; `.mp4`/`.webm` ⇒ mp4; else file).
- `poster`: optional poster image URL for video/embed items.
- `role`: how the renderer places the item. Default `gallery`. Allowed values:
  `hero`, `gallery`, `feature`, `before`, `after`, `device-desktop`, `device-mobile`, `demo`.

The runner assigns `role` from filename/caption keywords: hero/dashboard/overview ⇒ `hero`,
mobile ⇒ `device-mobile`, before ⇒ `before`, after ⇒ `after`, demo/video/walkthrough ⇒ `demo`,
everything else ⇒ `gallery`. Exactly one item is promoted to `hero`.

### Block Types (`blocks` is an ordered array, rendered after core sections)

Each block is `{ "type": "...", "id"?: "anchor-id", ...typed fields }`. Renderers ignore
unknown `type` values gracefully. Supported types:

- `richtext` — `eyebrow?`, `title?`, `body` (markdown-lite).
- `timeline` — `title?`, `phases: [{ label, title, body, date? }]` (first-class process visual).
- `gallery` — `title?`, `layout?` (`grid`|`masonry`), `items: [<media item>]`.
- `video` — `title?`, `items: [<media item, type video|embed>]`.
- `before_after` — `title?`, `before: {url,label?}`, `after: {url,label?}`.
- `metrics` — `title?`, `items: [{value,label}]`.
- `quote` — `text`, `author?`, `role?`.
- `embed` — `provider` (`youtube`|`vimeo`), `url`, `caption?`.

The runner auto-generates a `timeline` block from documented project phases
(Roadmap/Process/Milestones/Phases sections) and a `gallery` block from screenshots
when the evidence supports it; otherwise `blocks` stays `[]`.

## Media Upload API

The destination server exposes media storage so case media is served as static files
instead of inlined base64:

- `POST /api/admin/uploads` (auth required, `Bearer` token). Raw binary body with
  `Content-Type: <mime>` and optional `X-Filename: <original.ext>`. Rejects empty bodies
  (400) and non image/video MIME types (415).
- Response `201`: `{ "url": "/uploads/<name>", "type": "image"|"video", "mime", "bytes", "width"?, "height"? }`.
- Uploaded files are served from the static `/uploads` path.
- Prefer uploaded `/uploads/<name>` URLs over base64 data URLs when the upload route is
  reachable from the runner.

## Public Case Renderer Capabilities

`case.html` may expose richer visual modules than the persisted MCP/admin fields. Prefer driving these modules from existing fields before changing the MCP schema:

- `metrics` can feed the metric band and any factual numeric chart/graph.
- `media` can feed the hero image, screenshot gallery, video gallery, interactive feature showcase, and device showcase.
- `tech_stack` feeds the stack list.
- `challenge` and `approach` feed the narrative columns.
- testimonial fields feed the quote block only when a real quote exists.

Use renderer modules only when evidence supports them:

- Feature/showcase tabs should be based on real screenshots and documented workflows.
- Device/mobile sections require a real narrow/mobile viewport screenshot, not a cropped desktop image.
- Before/after sections may show an evidence-backed workflow contrast, but must not imply measured impact unless the source proves it.
- Next-case CTAs should stay hidden unless a curated next case is explicitly defined.
- Do not add a new MCP/admin field unless the existing fields cannot represent the needed published behavior cleanly.

## Required Destination MCP Tools

- `list_projects`
- `get_project`
- `get_stats`
- `create_project`
- `update_project`
- `delete_project`
- `publish_project`
- `unpublish_project`
- `set_featured`
- `reorder_projects`
- `bulk_import`
- `set_blocks` — input `{ ref, blocks }`; replaces the project's `blocks` array.
- `add_media` — input `{ ref, items: [<media item>], replace?: boolean }`; appends (or replaces when `replace:true`) the `media` array; supports `role`/`provider`/`poster`.

## Evidence Requirements

A complete run should produce:

- source repo analysis
- Mast3kMedia MCP/admin field parity check
- project payload sent to MCP
- MCP create/update result
- production create/update result for `https://mast3kmedia.dk`, unless local-only was requested
- screenshots/videos for the source live URL, repo-provided product screenshots, or a booted local frontend app
- screenshots/videos for local Mast3kMedia admin and public case rendering
- screenshots/videos for live Mast3kMedia admin and public case rendering when production sync is enabled
- desktop and mobile public-case verification for reference-grade cases, including lazy media, video readiness, console/page errors, and horizontal overflow checks

## Publishing Requirements

- Case copy must be Danish.
- Claims must be conservative and tied to repo files or public/live evidence.
- Do not invent growth numbers, quality guarantees, awards, customer satisfaction, production readiness, or testimonials.
- Leave testimonial fields empty unless source material contains a real quote and attribution.
- Metrics should be factual evidence such as documented integrations, test files, templates, modules, or live/deployment proof.
- Real product screenshots should be used as `thumbnail_url` and `media` when the site payload can carry them.
- If no live URL or repo screenshot assets exist, the runner may boot a recognizable frontend dev app and use screenshots/videos from that local app, as long as it is not just a login wall.
- GitHub page screenshots are evidence only; they are not valid portfolio thumbnails or case media.
- Videos may be embedded only when the `media` item is a real video URL or data URL and the case page renders it. Screenshot walkthrough videos are allowed only when clearly captioned as being generated from repo-provided product screenshots.
- If no usable product media exists, keep the case as draft/unfeatured rather than publishing a weak public case.
- For flagship/reference cases, treat the automated case as a draft baseline until the public page uses every evidence-backed case capability available in the current Mast3kMedia template.
