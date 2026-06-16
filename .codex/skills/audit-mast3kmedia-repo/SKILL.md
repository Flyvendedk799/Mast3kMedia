---
name: audit-mast3kmedia-repo
description: Analyze any public software repository and turn it into a Mast3kMedia portfolio case. Use when Codex is asked to run a repo URL through the Mast3kMedia workflow, inspect the repo, extract product/technical/story details, verify the local Mast3kMedia MCP/admin field contract, create or update the project through the MCP, and capture screenshots/videos of the source project plus the resulting Mast3kMedia case.
---

# Audit Mast3kMedia Repo

## Purpose

Use a repo as source material for a Mast3kMedia portfolio case. The repo under review can be any stack. The Mast3kMedia checkout is the destination system: its MCP and admin UI receive the generated case.

Do not judge the target repo for missing Mast3kMedia files. Instead, inspect the target repo, extract what was built, and create/update a Mast3kMedia project record with all fields the admin UI supports.

This is a professional company-site workflow. The output must be in Danish, evidence-bound, and suitable for publishing on `mast3kmedia.dk`.

## Quick Start

From the Mast3kMedia checkout:

```bash
node .codex/skills/audit-mast3kmedia-repo/scripts/audit_repo.mjs https://github.com/OWNER/REPO
```

From Claude Code in this repository:

```bash
node .claude/skills/audit-mast3kmedia-repo/scripts/audit_repo.mjs https://github.com/OWNER/REPO
```

The runner writes artifacts to `mast3kmedia-repo-case/<timestamp>/` by default:

- `report.md`: human-readable summary
- `report.json`: machine-readable checks/evidence
- `project.json`: exact payload sent through the MCP
- `screenshots/`: source product/live page, repo-provided product assets, and Mast3kMedia admin/public case screenshots
- `videos/`: recorded browser flows
- `work/repo/`: cloned target repo

## Default Behavior

- Clones the target repo into the artifact folder.
- Reads README/docs, GitHub repo metadata, nested package manifests, routes, templates, tests, and assets.
- Detects stack, product category, feature set, live URL, and visible proof points.
- Builds a Danish Mast3kMedia project payload:
  - `title`, `slug`, `category`, descriptions, challenge, approach
  - `tags`, `tech_stack`, `client`, `year`, `status`, `featured`, `sort_order`
  - `metrics`, testimonial fields, `thumbnail_url`, `case_url`, `media`
- Leaves unsupported fields empty instead of inventing them, especially testimonials and client quotes.
- Uses only evidence from repo files, public/live pages, and field-contract inspection.
- Checks that generated copy is repo-specific, not reused from another domain. A normal webshop must not receive garden, course, event, HR, or lead-intelligence language unless the repo itself contains that evidence.
- Captures source product screenshots/video before writing the case.
- Uses real product media from the live URL first, then a successfully booted local frontend app, then substantial static product HTML, and only then repo screenshot assets as a fallback for `thumbnail_url` and `media`.
- Captures multiple relevant product states where possible: homepage/primary view, useful scrolled detail, and strongest internal routes such as product, booking, checkout, dashboard, gallery, course, service, or case pages.
- Records a short guided browser flow with deliberate scroll/navigation rather than a passive page-load video.
- If no live/local app can be recorded but the repo contains real product screenshots, it may create a compact screenshot walkthrough video from those exact screenshots; caption it clearly as screenshot-based evidence.
- Validates repo image bytes and dimensions before embedding them, so logos, icons, placeholders, tiny assets, and mismatched MIME types do not become portfolio media.
- Boots recognizable frontend dev apps (Vite, Next, React Scripts, Astro, SvelteKit) when no live product URL is evidenced, before accepting repo image assets; supports npm/pnpm workspaces; login-only and application-error screens are kept as evidence, not portfolio media.
- When a repo exposes a Flask app instead of a Node frontend, runs it in an isolated virtualenv with sandbox/local environment values and captures real public routes such as product, catalog, support, chat, or dashboard pages.
- If a repo has a local setup script and `DATABASE_URL` points to localhost, runs that setup before browser capture so seeded demo apps can render without touching any remote database.
- If a runnable app is login-only or too thin but the repo contains a substantial static product/landing HTML page, captures that page as product evidence; bare framework shells still fail the media gate.
- Treats GitHub page screenshots as evidence artifacts only; never use them as `thumbnail_url` or case-page `media` unless the user explicitly asks for a draft-only documentation case.
- Uses the local Mast3kMedia MCP (`mcp-server.mjs`) to create or update the project.
- Syncs the same project payload to the live Mast3kMedia production API at `https://mast3kmedia.dk` unless `--local-only` is passed.
- Starts the local Mast3kMedia site and verifies the project in admin plus public case pages.
- Captures screenshots and videos for local Mast3kMedia and, when production sync is enabled, the live Mast3kMedia admin/public case too.
- Treats the automated runner as a baseline, not the finish line, when the user asks for a reference-quality, flagship, or "from the ground up" case. In those situations, run the reference-grade pass below before saying the work is complete.

By default, cases are created as `published` and `featured` so the live homepage/portfolio can show them. Use `--draft` for review-only entries, `--not-featured` to keep a case off the homepage, and `--local-only` to avoid changing production.

## Publishing Standards

- Write all case copy in Danish. Keep technology names in their original form.
- Before publishing, compare `description`, `long_description`, `challenge`, and `approach` against the repo evidence and against existing live cases. Rewrite any generic or cross-domain sentence that could plausibly belong to another repo.
- Do not claim business results, growth, revenue, conversion, uptime, quality, awards, or client satisfaction unless the repo or public source explicitly documents it.
- Do not fabricate testimonials. Keep testimonial fields empty unless there is a real quote and attribution in source material.
- Metrics must be factual and inspectable, such as documented integrations, test file counts, templates, modules, or live/deployment evidence. Do not invent percentage metrics.
- Prefer the source live URL for `case_url`; use the GitHub repo URL only when no live URL is evidenced.
- Publish only when the run has real product media from a live page, local product app, or repo screenshot assets: at least two useful screenshots/images and one walkthrough video. If that bar is not met, keep the project as draft and unfeatured.
- Screenshots must be useful on the public case page: no GitHub repo views, no bare login screens, no tiny logo/asset crops, no placeholders, and no near-duplicate home-only captures when a product flow can be reached.
- Do not use framework documentation, download/archive, vendor, or tooling URLs as source product pages just because a repo homepage points there.
- Videos should show an actual product walkthrough: visible landing state, scroll to useful details, and one or two meaningful internal screens when available.
- Screenshot walkthrough videos are acceptable only as a fallback when a real browser flow cannot be captured, and the caption must say they are based on repo screenshots.
- Reject placeholder/config URLs such as localhost, `api.openai.com`, `trello.com/app-key`, `yourdomain`, `your-host`, bare `http://`, webhook examples, and tokenized sample URLs.
- Treat missing screenshots/video as a failed or incomplete run unless the user explicitly requested `--no-browser`.
- After a run, inspect `project.json`, `report.md`, screenshots, and videos before telling the user the result is complete.
- Assign each `media` item a `role` so the v2 case renderer can place it correctly: `hero` (one only), `gallery`, `feature`, `before`/`after`, `device-desktop`/`device-mobile`, or `demo`. Roles come from filename/caption evidence (hero/dashboard/overview ⇒ hero, mobile ⇒ device-mobile, before/after ⇒ before/after, demo/video/walkthrough ⇒ demo, else gallery); set `provider` (`file`/`mp4`/`youtube`/`vimeo`) from the URL when not already present.
- Drive the case layout from the ordered `blocks` array (richtext, timeline, gallery, video, before_after, metrics, quote, embed) appended after the core sections. Only add a block when evidence supports it; never invent a process narrative.
- Auto-generate a `timeline` block from documented project phases (Roadmap/Process/Milestones/Phases sections) and a `gallery` block from screenshots when the evidence clears the bar; otherwise leave `blocks` empty.
- Prefer uploaded `/uploads/<name>` URLs over inlined base64: when `POST /api/admin/uploads` is reachable, upload media (and block-gallery items) and persist the returned static URL so payloads stay small and media is served as files. Fall back to base64 only when the upload route is unavailable.

## Reference-Grade Case Pass

Use this pass when the user says the case is important, will be a reference case, should be built from the ground up, or when the first automated result is generic, login-walled, visually thin, or underusing the Mast3kMedia case page.

1. Re-read the source repo and the generated artifacts. Replace generic copy with Danish, repo-specific narrative about the actual product workflows, architecture, and user/operator decisions.
2. If the app can be booted locally, prefer authenticated product states over public landing/login screens. Seed realistic demo data only to reveal product surfaces; never turn seeded data into business outcomes, testimonials, uptime claims, or customer results.
3. Capture a product media set, not a single hero screenshot:
   - desktop overview or primary dashboard
   - main workflow/control surface
   - build/deploy/admin or transactional flow
   - logs/diagnostics/integrations when relevant
   - data/database/settings surface when relevant
   - at least one narrow/mobile viewport when the UI supports it
4. Record a guided walkthrough video with deliberate navigation. Inspect early frames and trim/re-encode if the first frame is blank, white, loading-only, or otherwise weak. Verify the video loads on the public case page.
5. Use factual metrics only: route counts, dashboard/page counts, test files, package manifests, integrations, modules, templates, or other inspectable repo facts.
6. Use the full Mast3kMedia case template when evidence supports it:
   - metrics band from `metrics`
   - chart/graph from numeric `metrics`
   - interactive feature showcase from real media and documented workflows
   - before/after only for an evidence-backed workflow contrast, not invented measured impact
   - device showcase only with a real narrow/mobile screenshot
   - video gallery only with real product video
   - testimonial and next-case sections only when source data explicitly supports them
7. Prefer deriving richer public sections from existing MCP fields (`metrics`, `media`, `tech_stack`, copy fields) before adding MCP/admin fields. Update `mcp-server.mjs`, `admin/admin.js`, and `references/mast3kmedia-contract.md` only if a new persisted field is truly required.
8. Sync through the local MCP and production API unless the user requested local-only. Use the correct public endpoint shape (`/api/projects/:slug`) when verifying the live payload.
9. Verify the live public case like a visitor would: desktop and mobile Playwright checks, screenshots after the preloader clears, no console/page errors, no horizontal overflow, lazy images loaded after scroll, video `readyState` good, and all expected sections present.
10. If `mast3kmedia.dk` is served through a local tunnel, verify the configured origin is listening before and after publishing.

## Commands

```bash
node <skill-path>/scripts/audit_repo.mjs [repo-url-or-path] \
  --portfolio-root /absolute/path/to/Mast3kMedia \
  --output /tmp/m3k-case \
  --production-url https://mast3kmedia.dk \
  --draft \
  --not-featured \
  --local-only \
  --no-browser \
  --headed
```

- `--portfolio-root`: Mast3kMedia checkout. Defaults to the current working directory.
- `--output`: base directory for artifacts.
- `--production-url`: production Mast3kMedia site. Defaults to `https://mast3kmedia.dk`.
- `--admin-user`, `--admin-pass`: admin credentials. Prefer `MAST3KMEDIA_ADMIN_USER` and `MAST3KMEDIA_ADMIN_PASS` environment variables.
- `--draft`: create/update the project as a draft.
- `--not-featured`: keep the project out of featured/homepage placement.
- `--local-only` / `--no-production`: skip live production sync.
- `--no-browser`: skip Playwright screenshots/videos.
- `--headed`: launch Chromium visibly for debugging.

## Manual Fallback

If the runner cannot execute:

1. Read `references/mast3kmedia-contract.md`.
2. Clone/read the source repo and summarize:
   - product purpose
   - customer/user workflows
   - admin/backoffice workflows
   - technical architecture
   - integrations
   - tests/deployment status
3. Verify Mast3kMedia MCP field parity against `admin/admin.js` and `mcp-server.mjs`.
4. Draft Danish case copy with strict evidence boundaries:
   - no invented testimonials
   - no invented performance claims
   - only factual metrics from repo/public evidence
5. Use the Mast3kMedia MCP:
   - call `get_project` by slug
   - call `create_project` if missing
   - call `update_project` if it exists
6. Sync the same payload to production unless the user asked for local-only.
7. Capture evidence:
   - source live URL screenshot/video or repo-provided product screenshots
   - Mast3kMedia admin edit form screenshot
   - local Mast3kMedia public case screenshot when published
   - live Mast3kMedia public case screenshot when production sync is enabled
8. Run the reference-grade case pass when the user asked for a flagship/reference result or when the generated case is visually or narratively weak.
9. Report the created/updated slug, production status, project payload, verification results, and artifact paths.

## When Updating This Skill

Read `references/mast3kmedia-contract.md` before changing field coverage. If a new admin field is added, update both the reference and the field constants inside `scripts/audit_repo.mjs` (`PROJECT_FIELDS`, `ADMIN_FIELD_IDS`, `REQUIRED_MCP_TOOLS`). The v2 contract adds the `blocks` field, the `set_blocks`/`add_media` MCP tools, the media `role`/`provider` keys, the `fieldBlocks`/`blocksBuilder`/`mediaManager`/`mediaUploadInput`/`embedUrlInput` admin IDs, and the `POST /api/admin/uploads` route with `/uploads` static serving — keep all of these in sync across both the `.claude/` and `.codex/` skill copies.
