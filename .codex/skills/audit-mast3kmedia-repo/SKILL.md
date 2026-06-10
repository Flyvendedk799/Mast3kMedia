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
- `screenshots/`: source project/GitHub and Mast3kMedia admin/public case screenshots
- `videos/`: recorded browser flows
- `work/repo/`: cloned target repo

## Default Behavior

- Clones the target repo into the artifact folder.
- Reads README/docs, manifests, routes, templates, tests, and assets.
- Detects stack, product category, feature set, live URL, and visible proof points.
- Builds a Danish Mast3kMedia project payload:
  - `title`, `slug`, `category`, descriptions, challenge, approach
  - `tags`, `tech_stack`, `client`, `year`, `status`, `featured`, `sort_order`
  - `metrics`, testimonial fields, `thumbnail_url`, `case_url`
- Leaves unsupported fields empty instead of inventing them, especially testimonials and client quotes.
- Uses only evidence from repo files, public/live pages, and field-contract inspection.
- Captures source screenshots/video before writing the case.
- Uses the captured source screenshot as the project thumbnail when it fits the site payload; otherwise keeps the screenshot as an artifact and uses a conservative fallback URL.
- Uses the local Mast3kMedia MCP (`mcp-server.mjs`) to create or update the project.
- Syncs the same project payload to the live Mast3kMedia production API at `https://mast3kmedia.dk` unless `--local-only` is passed.
- Starts the local Mast3kMedia site and verifies the project in admin plus public case pages.
- Captures screenshots and videos for local Mast3kMedia and, when production sync is enabled, the live Mast3kMedia admin/public case too.

By default, cases are created as `published` and `featured` so the live homepage/portfolio can show them. Use `--draft` for review-only entries, `--not-featured` to keep a case off the homepage, and `--local-only` to avoid changing production.

## Publishing Standards

- Write all case copy in Danish. Keep technology names in their original form.
- Do not claim business results, growth, revenue, conversion, uptime, quality, awards, or client satisfaction unless the repo or public source explicitly documents it.
- Do not fabricate testimonials. Keep testimonial fields empty unless there is a real quote and attribution in source material.
- Metrics must be factual and inspectable, such as documented integrations, test file counts, templates, modules, or live/deployment evidence. Do not invent percentage metrics.
- Prefer the source live URL for `case_url`; use the GitHub repo URL only when no live URL is evidenced.
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
   - source live URL or GitHub page screenshot/video
   - Mast3kMedia admin edit form screenshot
   - local Mast3kMedia public case screenshot when published
   - live Mast3kMedia public case screenshot when production sync is enabled
8. Report the created/updated slug, production status, project payload, and artifact paths.

## When Updating This Skill

Read `references/mast3kmedia-contract.md` before changing field coverage. If a new admin field is added, update both the reference and the field constants inside `scripts/audit_repo.mjs`.
