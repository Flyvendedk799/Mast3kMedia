# Mast3kMedia v2 — Project Viewer Upgrade Contract

**This document is the single source of truth for the v2 build.** Every workstream
(server, MCP, admin, public renderer, work-listing, skill) implements against the
schemas, endpoints, IDs, and tool names defined here. Do not invent alternative
names — if something is underspecified, prefer the closest existing convention in
the codebase and keep it consistent with this doc.

Architecture decision (locked): **Hybrid.** All existing case sections become
data-driven (no hardcoded demo content when real data exists), AND an optional
ordered `blocks` array drives custom sections appended after the core layout.
Media gets real file-upload + storage plus YouTube/Vimeo embeds. New visitor
features: image/video **lightbox**, **related/next projects**, **process-timeline**
block, and **search + rich tag filtering** on the work page.

---

## 1. Data model changes

### 1.1 New column on `projects`
```
blocks  TEXT NOT NULL DEFAULT '[]'
```
Idempotent migration (add to BOTH `server.js` and `mcp-server.mjs`, matching the
existing `media` ALTER pattern):
```js
try {
  db.prepare("ALTER TABLE projects ADD COLUMN blocks TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
```
Also add `blocks TEXT NOT NULL DEFAULT '[]'` to the `CREATE TABLE IF NOT EXISTS`.

`fmt(row)` must additionally parse `blocks`: `blocks: safeJSON(row.blocks, [])`.

### 1.2 Enriched `media` item shape (backward compatible)
Existing items only have `{type,url,caption,alt}` and MUST keep rendering. New
optional keys:
```jsonc
{
  "type":     "image" | "video" | "embed",   // existing
  "url":      "string",                        // existing — file URL, data URL, or embed/watch URL
  "caption":  "string",                        // existing, optional
  "alt":      "string",                        // existing, optional
  "provider": "file" | "mp4" | "youtube" | "vimeo",  // NEW optional; inferred from url if absent
  "poster":   "string",                        // NEW optional; poster image for video/embed
  "role":     "hero" | "gallery" | "feature" | "before" | "after"
              | "device-desktop" | "device-mobile" | "demo"  // NEW optional; default "gallery"
}
```
Provider inference rule (shared): url contains `youtube.com`/`youtu.be` ⇒ youtube;
`vimeo.com` ⇒ vimeo; ends `.mp4`/`.webm` ⇒ mp4; else file.

### 1.3 `blocks` array shape (ordered; rendered after core sections, before next-case CTA)
Each block is `{ "type": "...", "id"?: "anchor-id", ...typed fields }`. Renderers
MUST ignore unknown `type` values gracefully (skip, no crash). Supported types:

```jsonc
{ "type": "richtext",   "eyebrow"?: "", "title"?: "", "body": "string (markdown-lite: **bold**, line breaks)" }
{ "type": "timeline",   "title"?: "", "phases": [ { "label": "Fase 01", "title": "Discovery", "body": "", "date"?: "2026-01" } ] }
{ "type": "gallery",    "title"?: "", "layout"?: "grid"|"masonry", "items": [ <media item> ] }
{ "type": "video",      "title"?: "", "items": [ <media item, type video|embed> ] }
{ "type": "before_after","title"?: "", "before": { "url": "", "label"?: "" }, "after": { "url": "", "label"?: "" } }
{ "type": "metrics",    "title"?: "", "items": [ { "value": "", "label": "" } ] }
{ "type": "quote",      "text": "", "author"?: "", "role"?: "" }
{ "type": "embed",      "provider": "youtube"|"vimeo", "url": "", "caption"?: "" }
```

---

## 2. Media upload API (server.js — dependency-free, no multer)

- **Route:** `POST /api/admin/uploads` (requireAuth).
- **Body:** raw binary. Use `express.raw({ type: () => true, limit: '64mb' })` scoped
  to this route ONLY (do not change the global `express.json` limit).
- **Headers:** `Content-Type: <mime>`; optional `X-Filename: <original.ext>`.
- **Behavior:** derive extension from mime (fallback to X-Filename ext); generate a
  safe unique name (`Date.now()`-based + random hex slug); write under
  `<root>/uploads/`; for images, best-effort parse width/height (PNG/JPEG/WebP).
- **Response 201:** `{ "url": "/uploads/<name>", "type": "image"|"video", "mime": "", "bytes": 0, "width"?: 0, "height"?: 0 }`
- **Static serving:** `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))`.
- **Disk:** create `uploads/.gitkeep`; `uploads/` is gitignored (runtime data).
- Reject empty bodies (400) and non image/video mime types (415).

---

## 3. Server endpoint changes (server.js — workstream A)

Add `blocks` to INSERT, UPDATE (with old-value fallback like other JSON fields),
and `fmt`. Then:

1. **`GET /api/projects`** — add query params (keep existing featured/category/limit):
   - `search` — case-insensitive LIKE across `title`, `description`, `long_description`,
     `tags`, `tech_stack`.
   - `tag` — repeatable/comma-separated; match if any value appears in the project's
     `tags` OR `tech_stack` JSON (LIKE on the stored JSON string is acceptable).
2. **`GET /api/projects/:slug`** — include a `related` key in the response object:
   up to 3 OTHER published projects sharing `category` or any `tag`/`tech_stack`
   value, excluding self, each shaped `{ slug, title, category, year, thumbnail_url, description }`.
   Shape: `{ ...project, related: [...] }`.
3. **`GET /api/tags`** (public) — `{ "tags": [distinct tags+tech across published],
   "categories": [distinct categories] }` for the work-page filter chips.

All other routes unchanged. Keep CommonJS style.

---

## 4. MCP tools (mcp-server.mjs — workstream B)

- Add `blocks` to the `PROJECT_FIELDS` zod schema (array of block objects; loose
  object validation is fine — `z.array(z.record(z.any()))` or per-type union if easy).
- Extend the enriched `media` item zod shape with optional `role`, `provider`, `poster`.
- Wire `blocks` through `create_project`, `update_project`, `bulk_import`, `fmt`, and
  the CREATE TABLE / idempotent ALTER migration (§1.1).
- **Keep all 11 existing tools.** Add TWO new tools:
  - `set_blocks` — input `{ ref, blocks }` → replaces the project's blocks array.
  - `add_media` — input `{ ref, items: [<media item>], replace?: boolean }` → appends
    (or replaces when `replace:true`) the media array; supports `role`/`provider`.
- Update the `projects://all` and `projects://published` resources so emitted JSON
  includes `blocks`.
- Update the `import_project` prompt text to mention blocks + media roles.

---

## 5. Public case renderer (case.html + assets/case.js + assets/case.css — workstream D)

Build on the EXISTING enhanced renderer (case.html is already ~879 lines). Goal:
make every section honest + data-driven, add blocks, lightbox, related.

### 5.1 Core sections — drive from data, hide when empty
| Section | Data source | When hidden |
| --- | --- | --- |
| Hero media | media `role:"hero"`, else `thumbnail_url` | never (fallback gradient) |
| Metrics band + chart | `metrics[]` | metrics empty |
| Challenge / Approach | `challenge`, `approach` | both empty |
| Feature showcase (tabs) | media `role:"feature"` (caption→tab label) | no feature media |
| Before / After slider | media `role:"before"` + `role:"after"` | either missing |
| Screenshot gallery | media `role:"gallery"` + untagged images | no gallery images |
| Device showcase | media `role:"device-desktop"` / `device-mobile"` | none present |
| Video gallery | media `type:"video"|"embed"` | none present |
| Tech stack | `tech_stack[]` | empty |
| Testimonial | `testimonial_*` | text empty |

**Remove hardcoded demo content** so empty data ⇒ hidden section (NOT fake content).
The no-slug static demo page may keep placeholder content (acceptable demo mode).

### 5.2 Blocks
After core sections and before the next-case CTA, render `project.blocks` in order.
Implement a renderer per block type in §1.3. The **timeline** block is a first-class
new visual (vertical/stepped phases, eyebrow labels, lime accent line; new CSS in
case.css). Unknown block types are skipped silently.

### 5.3 Lightbox (new)
Any gallery image, device shot, before/after image, video, and block-gallery item is
clickable → full-screen overlay: prev/next, caption, ESC + ←/→ keys, click-backdrop
to close, focus trap, `body` scroll-lock, `aria-modal`. Videos/embeds play in the
overlay. Build as a small self-contained module in case.js + styles in case.css.

### 5.4 Related / next projects (new)
Render `project.related[]` (from §3.2) as a card grid near the bottom ("Relaterede
cases"). Reuse work-card visual language. Keep/upgrade the existing next-case CTA
(use first related project when no explicit next case).

Accessibility: keyboard-operable tabs/slider/lightbox, alt text, `prefers-reduced-motion`
respected. All new CSS goes in `assets/case.css`; do not edit `assets/base.css`.

---

## 6. Work listing page (arbejde.html — workstream E)

Add above the work grid, alongside the existing 6 category buttons:
- A **search input** (debounced ~150ms) filtering by title/description/tags/tech.
- **Tag/tech filter chips** built from `GET /api/tags` (multi-select; AND/OR — use OR:
  show project if it matches any selected chip). Combine with category + search.
- An **empty-state** message when no projects match; a result count.

Implementation: fetch the full published list once (`/api/projects`) + `/api/tags`,
filter client-side for snappy interaction. Keep existing category filtering working.
Put new styles in a NEW file `assets/work.css` and new JS in `assets/work.js`, both
linked from `arbejde.html`. Do NOT edit `assets/base.css`.

---

## 7. Admin dashboard (admin/index.html + admin.js + admin.css — workstream C)

### 7.1 Media manager (upgrade form section "06 — Links & Media")
Replace the raw `media` JSON textarea with a structured list editor (keep a collapsed
"Advanced: raw JSON" escape hatch that stays in sync):
- **Upload**: file input + drag-drop → `POST /api/admin/uploads` (raw body, Bearer
  token, `X-Filename` header) → push media item with returned `url`.
- **Add embed**: input for a YouTube/Vimeo URL → media item `{type:"embed",provider,url}`.
- **Per item**: thumbnail/preview, `role` dropdown (the §1.2 roles), `caption`, `alt`,
  remove, reorder (up/down).

### 7.2 New form section "07 — Layout & Blocks" (block builder)
- "Add block" with a type selector (the §1.3 types). Per-type field inputs.
- Reorder (up/down) and remove blocks. Timeline block has a sub-editor for phases.
- Serialize to a hidden field and include as `blocks` in the create/update payload.
- On edit, hydrate the builder from `project.blocks`.

### 7.3 Required element IDs (so the audit skill can verify parity — workstream F depends on these)
```
fieldBlocks        // hidden input/textarea holding JSON of the blocks array
blocksBuilder      // container for the block builder UI
mediaManager       // container for the structured media editor
mediaUploadInput   // <input type=file> for uploads
embedUrlInput      // text input for YouTube/Vimeo embed URL
```
Keep existing field IDs intact. New CSS goes in `admin/admin.css`. The save/publish
payload (admin.js) must include `blocks` and the enriched `media` items.

---

## 8. Skill + contract (.claude/ and .codex/ skills — workstream F)

Update BOTH skill copies identically (`.claude/skills/audit-mast3kmedia-repo/` and
`.codex/skills/audit-mast3kmedia-repo/`):
- **`references/mast3kmedia-contract.md`**: add `blocks` to the Destination Project
  Fields table; document the §1.2 media roles + §1.3 block types; document the
  `/api/admin/uploads` route and `/uploads` static path; add `set_blocks` + `add_media`
  to Required MCP Tools; add the §7.3 admin element IDs.
- **`scripts/audit_repo.mjs`**: add `blocks` to `PROJECT_FIELDS`; add the §7.3 IDs to
  `ADMIN_FIELD_IDS`; add `set_blocks`/`add_media` to required-tools checks; add a
  heuristic that (a) assigns media `role` from filename/caption keywords
  (hero/dashboard→hero, mobile→device-mobile, before/after→before/after, demo/video→demo)
  and (b) auto-generates a `timeline` block (from documented project phases) and a
  `gallery` block from screenshots when evidence supports it; prefer uploaded `/uploads`
  URLs over base64 when the runner can POST to the upload route.
- **`SKILL.md`** (both): note the block-driven layout, media roles, timeline, and the
  upload-over-base64 preference in the publishing standards.
- Keep `.codex/config.toml` and `.codex/skills/.../agents/openai.yaml` consistent.

---

## 9. Design tokens (reuse — defined in assets/base.css, DO NOT edit that file)

Surfaces `--bg`,`--bg-1`,`--bg-2`,`--bg-3`; text `--paper`,`--muted`,`--faint`;
lines `--line`,`--line-soft`,`--line-strong`; accents `--lime` `#00FF88`,`--lime-deep`,
`--coral` `#FF5060`,`--cyan` `#00CFFF`; radii `--radius-sm..2xl`,`--radius-full`;
spacing `--space-1..10`, `--pad`, `--maxw` 1480px; easing `--ease`,`--ease-io`,
`--transition-spring`. Fonts: Space Grotesk (display), DM Sans (body), JetBrains Mono
(mono). Classes available: `.display`, `.mono`, `.eyebrow`, `.btn`/`.btn-solid`/`.btn-ghost`.

---

## 10. File ownership (STRICT — agents edit only their files; the tree is shared)

| WS | Owns (edit only these) |
| --- | --- |
| A server | `server.js`, `uploads/.gitkeep` (create), `package.json` (only if a dep is truly required — prefer none) |
| B mcp | `mcp-server.mjs` |
| C admin | `admin/index.html`, `admin/admin.js`, `admin/admin.css` |
| D renderer | `case.html`, `assets/case.js`, `assets/case.css` |
| E work | `arbejde.html`, `assets/work.css` (create), `assets/work.js` (create) |
| F skill | everything under `.claude/skills/audit-mast3kmedia-repo/` and `.codex/skills/audit-mast3kmedia-repo/` |

Shared/forbidden for everyone: `assets/base.css`, `index.html`, `.mcp.json`,
`docs/V2_CONTRACT.md`, git operations, starting the server. Integration, server
start, end-to-end testing, and commits are handled by the orchestrator afterward.
