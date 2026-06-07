/**
 * Mast3kMedia MCP Server
 *
 * Exposes portfolio project management as MCP tools, resources, and prompts.
 * Connect with Claude Code, Cursor, Windsurf, Zed, VS Code Copilot, or any
 * MCP-compatible client.
 *
 * Usage (stdio):
 *   node mcp-server.mjs
 *
 * Claude Code auto-discovers this server via .mcp.json in the project root.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Database ──────────────────────────────────────────────────────────────────
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'mast3k.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure table exists (mirrors server.js schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    title              TEXT    NOT NULL,
    slug               TEXT    UNIQUE NOT NULL,
    category           TEXT    NOT NULL DEFAULT 'Software',
    description        TEXT,
    long_description   TEXT,
    challenge          TEXT,
    approach           TEXT,
    tags               TEXT    NOT NULL DEFAULT '[]',
    tech_stack         TEXT    NOT NULL DEFAULT '[]',
    client             TEXT,
    year               INTEGER NOT NULL DEFAULT ${new Date().getFullYear()},
    status             TEXT    NOT NULL DEFAULT 'draft'
                               CHECK(status IN ('draft','published')),
    featured           INTEGER NOT NULL DEFAULT 0,
    sort_order         INTEGER NOT NULL DEFAULT 0,
    metrics            TEXT    NOT NULL DEFAULT '[]',
    testimonial_text   TEXT,
    testimonial_author TEXT,
    testimonial_role   TEXT,
    thumbnail_url      TEXT,
    case_url           TEXT,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS trg_projects_updated
  AFTER UPDATE ON projects FOR EACH ROW BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const slugify = s =>
  String(s).toLowerCase().trim()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const safeJSON = (val, fb) => { try { return val ? JSON.parse(val) : fb; } catch { return fb; } };

const fmt = row => ({
  ...row,
  tags:       safeJSON(row.tags,       []),
  tech_stack: safeJSON(row.tech_stack, []),
  metrics:    safeJSON(row.metrics,    []),
  featured:   row.featured === 1,
});

const findProject = ref => {
  if (/^\d+$/.test(String(ref))) {
    const byId = db.prepare('SELECT * FROM projects WHERE id=?').get(Number(ref));
    if (byId) return byId;
  }
  return db.prepare('SELECT * FROM projects WHERE slug=?').get(ref);
};

const ok  = text  => ({ content: [{ type: 'text', text }] });
const err = text  => ({ content: [{ type: 'text', text }], isError: true });
const json = data => ok(JSON.stringify(data, null, 2));

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name:    'mast3kmedia',
  version: '1.0.0',
});

// ── Tools ─────────────────────────────────────────────────────────────────────

// -- list_projects ------------------------------------------------------------
server.tool(
  'list_projects',
  'List portfolio projects with optional filters. Returns all projects by default.',
  {
    status:   z.enum(['all', 'published', 'draft']).optional()
                .describe('Filter by status (default: all)'),
    featured: z.boolean().optional()
                .describe('Only return featured projects'),
    category: z.string().optional()
                .describe('Filter by category (case-insensitive): SaaS, App, AI, Fintech, Web, Software…'),
    limit:    z.number().int().positive().max(100).optional()
                .describe('Maximum number of results'),
  },
  async ({ status, featured, category, limit }) => {
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const args = [];
    if (status && status !== 'all') { sql += ' AND status=?'; args.push(status); }
    if (featured)  { sql += ' AND featured=1'; }
    if (category)  { sql += ' AND LOWER(category)=LOWER(?)'; args.push(category); }
    sql += ' ORDER BY sort_order ASC, created_at DESC';
    if (limit)     { sql += ' LIMIT ?'; args.push(limit); }
    const rows = db.prepare(sql).all(...args).map(fmt);
    return json(rows);
  },
);

// -- get_project --------------------------------------------------------------
server.tool(
  'get_project',
  'Get a single portfolio project by its slug (e.g. "nordsync") or numeric ID.',
  {
    ref: z.string().describe('Project slug or numeric ID'),
  },
  async ({ ref }) => {
    const row = findProject(ref);
    if (!row) return err(`No project found with slug/id "${ref}"`);
    return json(fmt(row));
  },
);

// -- get_stats ----------------------------------------------------------------
server.tool(
  'get_stats',
  'Get portfolio dashboard statistics: total, published, drafts, featured counts.',
  {},
  async () => {
    const n = q => db.prepare(q).get().n;
    return json({
      total:     n('SELECT COUNT(*) n FROM projects'),
      published: n("SELECT COUNT(*) n FROM projects WHERE status='published'"),
      drafts:    n("SELECT COUNT(*) n FROM projects WHERE status='draft'"),
      featured:  n('SELECT COUNT(*) n FROM projects WHERE featured=1'),
    });
  },
);

// -- create_project -----------------------------------------------------------
const PROJECT_FIELDS = {
  title:              z.string().describe('Project title (required)'),
  slug:               z.string().optional().describe('URL slug — auto-generated from title if omitted'),
  category:           z.string().optional().describe('Category: SaaS, App, AI, Fintech, Web, Software'),
  description:        z.string().optional().describe('Short description (1-2 sentences)'),
  long_description:   z.string().optional().describe('Full project narrative (multiple paragraphs)'),
  challenge:          z.string().optional().describe('The core problem or pain point'),
  approach:           z.string().optional().describe('How it was built — solution and key decisions'),
  tags:               z.array(z.string()).optional().describe('Short labels, e.g. ["SaaS","Dashboard"]'),
  tech_stack:         z.array(z.string()).optional().describe('Technologies, e.g. ["React","PostgreSQL"]'),
  client:             z.string().optional().describe('Client or company name'),
  year:               z.number().int().min(2000).max(2099).optional().describe('Year the project was completed'),
  status:             z.enum(['draft', 'published']).optional().describe('draft (default) or published'),
  featured:           z.boolean().optional().describe('Show on homepage hero section'),
  sort_order:         z.number().int().optional().describe('Manual sort position (lower = first)'),
  metrics:            z.array(z.object({ value: z.string(), label: z.string() })).optional()
                       .describe('Key metrics, e.g. [{value:"+64%",label:"Organic traffic"}]'),
  testimonial_text:   z.string().optional().describe('Client quote'),
  testimonial_author: z.string().optional().describe('Quote author name'),
  testimonial_role:   z.string().optional().describe('Quote author role/title'),
  thumbnail_url:      z.string().url().optional().describe('Cover image URL'),
  case_url:           z.string().url().optional().describe('External case study or live URL'),
};

server.tool(
  'create_project',
  'Create a new portfolio project. Returns the created project with its assigned ID and slug.',
  PROJECT_FIELDS,
  async b => {
    const slug = slugify(b.slug || b.title);
    try {
      const r = db.prepare(`
        INSERT INTO projects
          (title,slug,category,description,long_description,challenge,approach,
           tags,tech_stack,client,year,status,featured,sort_order,
           metrics,testimonial_text,testimonial_author,testimonial_role,
           thumbnail_url,case_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        b.title, slug,
        b.category        || 'Software',
        b.description     || null,
        b.long_description || null,
        b.challenge       || null,
        b.approach        || null,
        JSON.stringify(b.tags       ?? []),
        JSON.stringify(b.tech_stack ?? []),
        b.client          || null,
        b.year            || new Date().getFullYear(),
        b.status === 'published' ? 'published' : 'draft',
        b.featured  ? 1 : 0,
        b.sort_order ?? 0,
        JSON.stringify(b.metrics ?? []),
        b.testimonial_text   || null,
        b.testimonial_author || null,
        b.testimonial_role   || null,
        b.thumbnail_url      || null,
        b.case_url           || null,
      );
      const created = fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(r.lastInsertRowid));
      return ok(`Created project "${created.title}" (slug: ${created.slug}, id: ${created.id})\n\n${JSON.stringify(created, null, 2)}`);
    } catch (e) {
      if (e.message.includes('UNIQUE'))
        return err(`Slug "${slug}" already exists. Provide a unique slug or adjust the title.`);
      return err(e.message);
    }
  },
);

// -- update_project -----------------------------------------------------------
server.tool(
  'update_project',
  'Update fields on an existing project. Only the fields you provide are changed.',
  {
    ref:     z.string().describe('Project slug or numeric ID to update'),
    ...Object.fromEntries(
      Object.entries(PROJECT_FIELDS)
        .filter(([k]) => k !== 'title')
        .map(([k, v]) => [k, v.optional()])
    ),
    title:     z.string().optional().describe('New title'),
    new_slug:  z.string().optional().describe('New slug (replaces current)'),
  },
  async b => {
    const old = findProject(b.ref);
    if (!old) return err(`No project found with slug/id "${b.ref}"`);
    const newSlug = b.new_slug ? slugify(b.new_slug) : (b.slug ? slugify(b.slug) : old.slug);
    try {
      db.prepare(`
        UPDATE projects SET
          title=?,slug=?,category=?,description=?,long_description=?,
          challenge=?,approach=?,tags=?,tech_stack=?,client=?,year=?,
          status=?,featured=?,sort_order=?,metrics=?,
          testimonial_text=?,testimonial_author=?,testimonial_role=?,
          thumbnail_url=?,case_url=?
        WHERE id=?
      `).run(
        b.title            ?? old.title,
        newSlug,
        b.category         ?? old.category,
        b.description      !== undefined ? b.description      : old.description,
        b.long_description !== undefined ? b.long_description : old.long_description,
        b.challenge        !== undefined ? b.challenge        : old.challenge,
        b.approach         !== undefined ? b.approach         : old.approach,
        JSON.stringify(Array.isArray(b.tags)       ? b.tags       : safeJSON(old.tags,       [])),
        JSON.stringify(Array.isArray(b.tech_stack) ? b.tech_stack : safeJSON(old.tech_stack, [])),
        b.client       !== undefined ? b.client       : old.client,
        b.year         ?? old.year,
        ['draft', 'published'].includes(b.status) ? b.status : old.status,
        b.featured     !== undefined ? (b.featured ? 1 : 0) : old.featured,
        b.sort_order   !== undefined ? b.sort_order : old.sort_order,
        JSON.stringify(Array.isArray(b.metrics) ? b.metrics : safeJSON(old.metrics, [])),
        b.testimonial_text   !== undefined ? b.testimonial_text   : old.testimonial_text,
        b.testimonial_author !== undefined ? b.testimonial_author : old.testimonial_author,
        b.testimonial_role   !== undefined ? b.testimonial_role   : old.testimonial_role,
        b.thumbnail_url !== undefined ? b.thumbnail_url : old.thumbnail_url,
        b.case_url      !== undefined ? b.case_url      : old.case_url,
        old.id,
      );
      const updated = fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(old.id));
      return ok(`Updated project "${updated.title}"\n\n${JSON.stringify(updated, null, 2)}`);
    } catch (e) {
      if (e.message.includes('UNIQUE'))
        return err(`Slug "${newSlug}" already exists. Choose a different slug.`);
      return err(e.message);
    }
  },
);

// -- delete_project -----------------------------------------------------------
server.tool(
  'delete_project',
  'Permanently delete a project from the portfolio. This cannot be undone.',
  {
    ref: z.string().describe('Project slug or numeric ID to delete'),
  },
  async ({ ref }) => {
    const row = findProject(ref);
    if (!row) return err(`No project found with slug/id "${ref}"`);
    db.prepare('DELETE FROM projects WHERE id=?').run(row.id);
    return ok(`Deleted project "${row.title}" (slug: ${row.slug}, id: ${row.id})`);
  },
);

// -- publish_project ----------------------------------------------------------
server.tool(
  'publish_project',
  'Publish a project so it appears on the public portfolio site.',
  {
    ref: z.string().describe('Project slug or numeric ID'),
  },
  async ({ ref }) => {
    const row = findProject(ref);
    if (!row) return err(`No project found with slug/id "${ref}"`);
    db.prepare("UPDATE projects SET status='published' WHERE id=?").run(row.id);
    return ok(`Published "${row.title}" — it is now live on the site.`);
  },
);

// -- unpublish_project --------------------------------------------------------
server.tool(
  'unpublish_project',
  'Move a project back to draft so it is hidden from the public site.',
  {
    ref: z.string().describe('Project slug or numeric ID'),
  },
  async ({ ref }) => {
    const row = findProject(ref);
    if (!row) return err(`No project found with slug/id "${ref}"`);
    db.prepare("UPDATE projects SET status='draft' WHERE id=?").run(row.id);
    return ok(`Unpublished "${row.title}" — moved back to draft.`);
  },
);

// -- set_featured -------------------------------------------------------------
server.tool(
  'set_featured',
  'Feature or unfeature a project. Featured projects appear on the homepage hero section.',
  {
    ref:      z.string().describe('Project slug or numeric ID'),
    featured: z.boolean().describe('true to feature, false to unfeature'),
  },
  async ({ ref, featured }) => {
    const row = findProject(ref);
    if (!row) return err(`No project found with slug/id "${ref}"`);
    db.prepare('UPDATE projects SET featured=? WHERE id=?').run(featured ? 1 : 0, row.id);
    return ok(`${featured ? 'Featured' : 'Unfeatured'} "${row.title}"`);
  },
);

// -- reorder_projects ---------------------------------------------------------
server.tool(
  'reorder_projects',
  'Set the display order for multiple projects at once. Lower sort_order values appear first.',
  {
    order: z.array(z.object({
      ref:        z.string().describe('Project slug or numeric ID'),
      sort_order: z.number().int().describe('New position (0 = first)'),
    })).describe('List of projects with their new positions'),
  },
  async ({ order }) => {
    const stmt = db.prepare('UPDATE projects SET sort_order=? WHERE id=?');
    const results = [];
    const updateAll = db.transaction(items => {
      for (const item of items) {
        const row = findProject(item.ref);
        if (row) { stmt.run(item.sort_order, row.id); results.push(row.title); }
        else results.push(`[not found: ${item.ref}]`);
      }
    });
    updateAll(order);
    return ok(`Reordered ${results.length} projects:\n${results.map((t, i) => `  ${order[i].sort_order}. ${t}`).join('\n')}`);
  },
);

// -- bulk_import --------------------------------------------------------------
server.tool(
  'bulk_import',
  'Import multiple projects at once. Perfect for migrating from another CMS or seeding from a brief. Skips duplicates by slug and reports results.',
  {
    projects: z.array(z.object({
      title:              z.string(),
      slug:               z.string().optional(),
      category:           z.string().optional(),
      description:        z.string().optional(),
      long_description:   z.string().optional(),
      challenge:          z.string().optional(),
      approach:           z.string().optional(),
      tags:               z.array(z.string()).optional(),
      tech_stack:         z.array(z.string()).optional(),
      client:             z.string().optional(),
      year:               z.number().int().optional(),
      status:             z.enum(['draft', 'published']).optional(),
      featured:           z.boolean().optional(),
      sort_order:         z.number().int().optional(),
      metrics:            z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      testimonial_text:   z.string().optional(),
      testimonial_author: z.string().optional(),
      testimonial_role:   z.string().optional(),
      thumbnail_url:      z.string().optional(),
      case_url:           z.string().optional(),
    })).describe('Array of project objects to import'),
    default_status: z.enum(['draft', 'published']).optional()
                     .describe('Override status for all imports (default: draft)'),
  },
  async ({ projects, default_status }) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO projects
        (title,slug,category,description,long_description,challenge,approach,
         tags,tech_stack,client,year,status,featured,sort_order,
         metrics,testimonial_text,testimonial_author,testimonial_role,
         thumbnail_url,case_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const created = [], skipped = [];

    const importAll = db.transaction(items => {
      for (const b of items) {
        const slug = slugify(b.slug || b.title);
        const r = stmt.run(
          b.title, slug,
          b.category        || 'Software',
          b.description     || null,
          b.long_description || null,
          b.challenge       || null,
          b.approach        || null,
          JSON.stringify(b.tags       ?? []),
          JSON.stringify(b.tech_stack ?? []),
          b.client          || null,
          b.year            || new Date().getFullYear(),
          (default_status ?? b.status ?? 'draft') === 'published' ? 'published' : 'draft',
          b.featured  ? 1 : 0,
          b.sort_order ?? 0,
          JSON.stringify(b.metrics ?? []),
          b.testimonial_text   || null,
          b.testimonial_author || null,
          b.testimonial_role   || null,
          b.thumbnail_url      || null,
          b.case_url           || null,
        );
        if (r.changes > 0) created.push(`${b.title} (${slug})`);
        else               skipped.push(`${b.title} (${slug}) — slug already exists`);
      }
    });

    importAll(projects);

    const lines = [
      `Import complete: ${created.length} created, ${skipped.length} skipped`,
      '',
      ...(created.length ? ['Created:', ...created.map(s => `  ✓ ${s}`)] : []),
      ...(skipped.length ? ['Skipped:', ...skipped.map(s => `  ⚠ ${s}`)] : []),
    ];
    return ok(lines.join('\n'));
  },
);

// ── Resources ─────────────────────────────────────────────────────────────────

server.resource(
  'projects-all',
  'projects://all',
  { description: 'All portfolio projects including drafts, ordered by sort_order then date.' },
  async _uri => {
    const rows = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC').all().map(fmt);
    return { contents: [{ uri: 'projects://all', text: JSON.stringify(rows, null, 2), mimeType: 'application/json' }] };
  },
);

server.resource(
  'projects-published',
  'projects://published',
  { description: 'Published portfolio projects only — the ones visible on the live site.' },
  async _uri => {
    const rows = db.prepare("SELECT * FROM projects WHERE status='published' ORDER BY sort_order ASC, created_at DESC").all().map(fmt);
    return { contents: [{ uri: 'projects://published', text: JSON.stringify(rows, null, 2), mimeType: 'application/json' }] };
  },
);

// ── Prompts ───────────────────────────────────────────────────────────────────

server.prompt(
  'import_project',
  'Extract a structured create_project call from a plain-text brief. Pass the raw brief and Claude will parse all fields and call create_project for you.',
  {
    brief: z.string().describe('Plain-text project brief — client name, what was built, technologies, results, any quotes'),
  },
  async ({ brief }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Extract structured project data from the brief below and call create_project with it.

Field extraction guidelines:
- title: short, punchy product name (not a sentence)
- category: one of SaaS / App / AI / Fintech / Web / Software — pick the closest match
- description: 1-2 sentence marketing copy, present tense, no fluff
- long_description: 2-3 paragraph narrative — context, what was built, outcome
- challenge: the core problem or pain point the client had before this project
- approach: how it was built — key technical decisions, architecture, standout choices
- tags: 2-4 short labels (e.g. ["SaaS","Dashboard","Real-time"])
- tech_stack: specific technologies only (e.g. ["React","PostgreSQL","Redis"])
- metrics: measurable outcomes only, up to 4, each {value, label} — skip if no numbers in brief
- testimonial_*: extract only if a direct client quote is present in the brief
- status: always "draft" unless explicitly told to publish
- featured: false unless the brief says flagship / hero / homepage

Brief:
${brief}`,
      },
    }],
  }),
);

server.prompt(
  'project_summary',
  'Write a punchy case-study blurb for an existing project. Call /mcp__mast3kmedia__project_summary with a slug.',
  {
    ref: z.string().describe('Project slug or numeric ID'),
  },
  async ({ ref }) => {
    const row = findProject(ref);
    if (!row) throw new Error(`No project found with slug/id "${ref}"`);
    const p = fmt(row);
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Write a punchy one-paragraph case-study blurb (80-120 words) for the project below.
Structure: open with the challenge → explain the solution → close with the measurable outcome.
Tone: confident, professional, no buzzwords.
Do not use "we" — write in third person about what was built.

${JSON.stringify(p, null, 2)}`,
        },
      }],
    };
  },
);

// ── Connect ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
