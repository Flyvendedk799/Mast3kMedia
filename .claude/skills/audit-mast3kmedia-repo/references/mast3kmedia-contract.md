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
| `media` | `fieldMedia` | structured case-page screenshots/videos |

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
