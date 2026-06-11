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
- Uses real product media from the live URL, repo screenshot assets, or a successfully booted local frontend app as `thumbnail_url` and `media`.
- Captures multiple relevant product states where possible: homepage/primary view, useful scrolled detail, and strongest internal routes such as product, booking, checkout, dashboard, gallery, course, service, or case pages.
- Records a short guided browser flow with deliberate scroll/navigation rather than a passive page-load video.
- If no live/local app can be recorded but the repo contains real product screenshots, it may create a compact screenshot walkthrough video from those exact screenshots; caption it clearly as screenshot-based evidence.
- Validates repo image bytes and dimensions before embedding them, so logos, icons, placeholders, tiny assets, and mismatched MIME types do not become portfolio media.
- Boots recognizable frontend dev apps (Vite, Next, React Scripts, Astro, SvelteKit) only when no live URL or repo screenshot assets exist; supports npm/pnpm workspaces; login-only screens are kept as evidence, not portfolio media.
- When a repo exposes a Flask app instead of a Node frontend, runs it in an isolated virtualenv with sandbox/local environment values and captures real public routes such as product, catalog, support, chat, or dashboard pages.
- If a repo has a local setup script and `DATABASE_URL` points to localhost, runs that setup before browser capture so seeded demo apps can render without touching any remote database.
- Treats GitHub page screenshots as evidence artifacts only; never use them as `thumbnail_url` or case-page `media` unless the user explicitly asks for a draft-only documentation case.
- Uses the local Mast3kMedia MCP (`mcp-server.mjs`) to create or update the project.
- Syncs the same project payload to the live Mast3kMedia production API at `https://mast3kmedia.dk` unless `--local-only` is passed.
- Starts the local Mast3kMedia site and verifies the project in admin plus public case pages.
- Captures screenshots and videos for local Mast3kMedia and, when production sync is enabled, the live Mast3kMedia admin/public case too.

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
- Videos should show an actual product walkthrough: visible landing state, scroll to useful details, and one or two meaningful internal screens when available.
- Screenshot walkthrough videos are acceptable only as a fallback when a real browser flow cannot be captured, and the caption must say they are based on repo screenshots.
- Reject placeholder/config URLs such as localhost, `api.openai.com`, `trello.com/app-key`, `yourdomain`, `your-host`, bare `http://`, webhook examples, and tokenized sample URLs.
- Treat missing screenshots/video as a failed or incomplete run unless the user explicitly requested `--no-browser`.
- After a run, inspect `project.json`, `report.md`, screenshots, and videos before telling the user the result is complete.

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
8. Report the created/updated slug, production status, project payload, and artifact paths.

## When Updating This Skill

Read `references/mast3kmedia-contract.md` before changing field coverage. If a new admin field is added, update both the reference and the field constants inside `scripts/audit_repo.mjs`.
