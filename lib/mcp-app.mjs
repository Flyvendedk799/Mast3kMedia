/**
 * Shared Mast3kMedia MCP application (tools, resources, prompts).
 * Used by both stdio (`mcp-server.mjs`) and HTTP Streamable transport (`lib/mcp-http.mjs`).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Upload helpers ────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(path.dirname(__dirname), 'uploads');

// mime → file extension (fallbacks; X-Filename ext used when mime is generic)
const MIME_EXT = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4':  'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg':  'ogv',
};

// Best-effort image dimension parser for PNG / JPEG / WebP. Returns {width,height} or {}.
const imageDimensions = (buf) => {
  try {
    if (buf.length < 24) return {};
    // PNG: 89 50 4E 47 0D 0A 1A 0A, IHDR width/height at offset 16/20 (big-endian)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG: FF D8 ... scan SOF markers for dimensions
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) { off++; continue; }
        const marker = buf[off + 1];
        // SOF0..SOF15 (excluding 0xC4 DHT, 0xC8 JPG, 0xCC DAC) carry frame dimensions
        if (marker >= 0xc0 && marker <= 0xcf &&
            marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = buf.readUInt16BE(off + 5);
          const width  = buf.readUInt16BE(off + 7);
          return { width, height };
        }
        // skip this segment by its length
        const segLen = buf.readUInt16BE(off + 2);
        if (segLen < 2) break;
        off += 2 + segLen;
      }
    }
  // WebP: "RIFF"...."WEBP"
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt4 = buf.toString('ascii', 12, 16);
      if (fmt4 === 'VP8 ') {
        const width  = buf.readUInt16LE(26) & 0x3fff;
        const height = buf.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      if (fmt4 === 'VP8L') {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        const width  = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (fmt4 === 'VP8X') {
        const width  = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { width, height };
      }
    }
  } catch { /* best-effort only */ }
  return {};
};

/**
 * Ensure projects + blog tables/triggers/migrations exist on an open better-sqlite3 db.
 */
export function ensureMcpSchema(db) {
  db.pragma('foreign_keys = ON');
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
    media              TEXT    NOT NULL DEFAULT '[]',
    blocks             TEXT    NOT NULL DEFAULT '[]',
    timeline           TEXT,
    services           TEXT,
    results            TEXT,
    subtitle           TEXT,
    client_logo        TEXT,
    industry           TEXT,
    deliverables       TEXT,
    role_scope         TEXT,
    og_image           TEXT,
    team               TEXT    NOT NULL DEFAULT '[]',
    awards             TEXT    NOT NULL DEFAULT '[]',
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS trg_projects_updated
  AFTER UPDATE ON projects FOR EACH ROW BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

  CREATE TABLE IF NOT EXISTS blog_categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slug        TEXT    UNIQUE NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    slug         TEXT    UNIQUE NOT NULL,
    excerpt      TEXT,
    body         TEXT,
    cover_image  TEXT,
    status       TEXT    NOT NULL DEFAULT 'draft'
                     CHECK(status IN ('draft','published')),
    category_id  INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
    published_at TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    author       TEXT,
    tags         TEXT    NOT NULL DEFAULT '[]'
  );

  CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
  CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
  CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);

  CREATE TRIGGER IF NOT EXISTS trg_blog_posts_updated
  AFTER UPDATE ON blog_posts FOR EACH ROW BEGIN
    UPDATE blog_posts SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
`);

  const addCol = (sql) => {
    try { db.prepare(sql).run(); }
    catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
  };
  addCol("ALTER TABLE projects ADD COLUMN media TEXT NOT NULL DEFAULT '[]'");
  addCol("ALTER TABLE projects ADD COLUMN blocks TEXT NOT NULL DEFAULT '[]'");
  addCol("ALTER TABLE projects ADD COLUMN timeline TEXT");
  addCol("ALTER TABLE projects ADD COLUMN services TEXT");
  addCol("ALTER TABLE projects ADD COLUMN results TEXT");
  addCol("ALTER TABLE projects ADD COLUMN subtitle TEXT");
  addCol("ALTER TABLE projects ADD COLUMN client_logo TEXT");
  addCol("ALTER TABLE projects ADD COLUMN industry TEXT");
  addCol("ALTER TABLE projects ADD COLUMN deliverables TEXT");
  addCol("ALTER TABLE projects ADD COLUMN role_scope TEXT");
  addCol("ALTER TABLE projects ADD COLUMN og_image TEXT");
  addCol("ALTER TABLE projects ADD COLUMN team TEXT NOT NULL DEFAULT '[]'");
  addCol("ALTER TABLE projects ADD COLUMN awards TEXT NOT NULL DEFAULT '[]'");
  addCol("ALTER TABLE blog_posts ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
}

/**
 * Handle file upload - shared helper for both admin REST and MCP
 * @param {Buffer} buffer - File data as Buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} [filename] - Original filename (optional)
 * @returns {Promise<{url: string, mime: string, bytes: number, width?: number, height?: number}>}
 */
export async function handleUpload(buffer, mimeType, filename) {
  // Validate that it's an image or video
  const kind = mimeType.startsWith('image/') ? 'image'
             : mimeType.startsWith('video/') ? 'video'
             : null;
  if (!kind) {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  // Derive extension: prefer mime map, fall back to X-Filename extension
  let ext = MIME_EXT[mimeType];
  if (!ext && filename) {
    const m = filename.match(/\.([a-z0-9]+)$/i);
    ext = m ? m[1].toLowerCase() : (kind === 'image' ? 'bin' : 'bin');
  }
  if (!ext) {
    ext = (kind === 'image' ? 'bin' : 'bin');
  }

  const name = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

  const out = {
    url:   `/uploads/${name}`,
    type:  kind,
    mime:  mimeType,
    bytes: buffer.length,
  };

  if (kind === 'image') {
    const dim = imageDimensions(buffer);
    if (dim.width)  out.width  = dim.width;
    if (dim.height) out.height = dim.height;
  }

  return out;
}

/**
 * Open the shared Mast3kMedia SQLite DB (WAL) and ensure schema.
 * @param {string} [dbPath]
 */
export function openMcpDb(dbPath) {
  const resolved = dbPath || path.join(path.dirname(__dirname), 'db', 'mast3k.db');
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  ensureMcpSchema(db);
  return db;
}

/**
 * Create a fully-registered Mast3kMedia McpServer bound to `db`.
 * @param {import('better-sqlite3').Database} db
 */
export function createMast3kMcpServer(db) {
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
    media:      safeJSON(row.media,      []),
    blocks:     safeJSON(row.blocks,     []),
    team:       safeJSON(row.team,       []),
    awards:     safeJSON(row.awards,     []),
    featured:   row.featured === 1,
  });

  const findProject = ref => {
    if (/^\d+$/.test(String(ref))) {
      const byId = db.prepare('SELECT * FROM projects WHERE id=?').get(Number(ref));
      if (byId) return byId;
    }
    return db.prepare('SELECT * FROM projects WHERE slug=?').get(ref);
  };

  const POST_SELECT = `
    SELECT p.*,
           c.name AS category_name,
           c.slug AS category_slug
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
  `;

  const fmtCategory = row => row ? ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    created_at: row.created_at,
  }) : null;

  const fmtPost = row => {
    if (!row) return null;
    let category = null;
    if (row.category_id) {
      if (row.category_name) {
        category = { id: row.category_id, name: row.category_name, slug: row.category_slug };
      } else {
        const cat = db.prepare('SELECT id, name, slug FROM blog_categories WHERE id=?').get(row.category_id);
        if (cat) category = cat;
      }
    }
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt || null,
      body: row.body || null,
      cover_image: row.cover_image || null,
      status: row.status,
      category_id: row.category_id || null,
      category,
      tags: safeJSON(row.tags, []),
      published_at: row.published_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: row.author || null,
    };
  };

  const findPost = ref => {
    if (/^\d+$/.test(String(ref))) {
      const byId = db.prepare(`${POST_SELECT} WHERE p.id=?`).get(Number(ref));
      if (byId) return byId;
    }
    return db.prepare(`${POST_SELECT} WHERE p.slug=?`).get(ref);
  };

  const findCategory = ref => {
    if (/^\d+$/.test(String(ref))) {
      const byId = db.prepare('SELECT * FROM blog_categories WHERE id=?').get(Number(ref));
      if (byId) return byId;
    }
    return db.prepare('SELECT * FROM blog_categories WHERE slug=?').get(ref);
  };

  const ok  = text  => ({ content: [{ type: 'text', text }] });
  const err = text  => ({ content: [{ type: 'text', text }], isError: true });
  const json = data => ok(JSON.stringify(data, null, 2));

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
        blog_posts:      n('SELECT COUNT(*) n FROM blog_posts'),
        blog_published:  n("SELECT COUNT(*) n FROM blog_posts WHERE status='published'"),
        blog_drafts:     n("SELECT COUNT(*) n FROM blog_posts WHERE status='draft'"),
        blog_categories: n('SELECT COUNT(*) n FROM blog_categories'),
      });
    },
  );

  // -- shared zod shapes --------------------------------------------------------
  // Enriched media item (§1.2) — backward compatible with {type,url,caption,alt}.
  const MEDIA_ITEM = z.object({
    type:     z.enum(['image', 'video', 'embed']).optional().describe('Media type. Defaults to image.'),
    url:      z.string().describe('Public URL, data URL, or embed/watch URL for the asset'),
    caption:  z.string().optional().describe('Short Danish caption shown under the asset'),
    alt:      z.string().optional().describe('Accessible alt text for images'),
    provider: z.enum(['file', 'mp4', 'youtube', 'vimeo']).optional()
                .describe('Source provider — inferred from url if absent (youtube/vimeo/mp4/file)'),
    poster:   z.string().optional().describe('Poster image URL for video/embed'),
    role:     z.enum(['hero', 'gallery', 'feature', 'before', 'after',
                      'device-desktop', 'device-mobile', 'demo']).optional()
                .describe('Layout role for the case renderer (default "gallery")'),
  });

  // Block items (§1.3) — loose object validation; renderers ignore unknown types.
  const BLOCK_ITEM = z.record(z.any());

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
    thumbnail_url:      z.string().optional().describe('Cover image URL, data URL, or empty string to clear'),
    case_url:           z.string().optional().describe('External case study/live URL, repo URL, or empty string to clear'),
    media:              z.array(MEDIA_ITEM).optional()
                       .describe('Case-page media gallery. Use real product screenshots/video only. Supports role/provider/poster.'),
    blocks:             z.array(BLOCK_ITEM).optional()
                       .describe('Ordered custom content blocks (richtext, timeline, gallery, video, before_after, metrics, quote, embed) rendered after the core sections.'),
    timeline:           z.string().optional().describe('Project timeline or duration (e.g. "8 uger" or "Q1 2026")'),
    services:           z.string().optional().describe('Services delivered (e.g. "Strategi · Design · Engineering")'),
    results:            z.string().optional().describe('Results narrative describing outcomes and business impact'),
    subtitle:           z.string().optional().describe('Project subtitle or tagline shown in hero'),
    client_logo:        z.string().optional().describe('Client logo image URL (SVG/PNG)'),
    industry:           z.string().optional().describe('Industry or sector (e.g. SaaS, FinTech, Healthcare)'),
    deliverables:       z.string().optional().describe('What was delivered (e.g. "Web App · Design System · API")'),
    role_scope:         z.string().optional().describe('Agency role or scope (e.g. "Lead agency", "Design partner")'),
    og_image:           z.string().optional().describe('Custom Open Graph image URL for social sharing (1200×630)'),
    team:               z.array(z.object({ name: z.string(), role: z.string() })).optional().describe('Team members who worked on the project'),
    awards:             z.array(z.object({ title: z.string(), org: z.string().optional() })).optional().describe('Awards and recognition received'),
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
             thumbnail_url,case_url,media,blocks,timeline,services,
             results,subtitle,client_logo,industry,deliverables,
             role_scope,og_image,team,awards)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
          JSON.stringify(b.media ?? []),
          JSON.stringify(b.blocks ?? []),
          b.timeline        || null,
          b.services        || null,
          b.results         || null,
          b.subtitle        || null,
          b.client_logo     || null,
          b.industry        || null,
          b.deliverables    || null,
          b.role_scope      || null,
          b.og_image        || null,
          JSON.stringify(b.team ?? []),
          JSON.stringify(b.awards ?? []),
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
            thumbnail_url=?,case_url=?,media=?,blocks=?,
            timeline=?,services=?,results=?,subtitle=?,client_logo=?,industry=?,deliverables=?,
            role_scope=?,og_image=?,team=?,awards=?
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
          b.case_url      !== undefined ? b.case_url      : b.case_url,
          JSON.stringify(Array.isArray(b.media) ? b.media : safeJSON(old.media, [])),
          JSON.stringify(Array.isArray(b.blocks) ? b.blocks : safeJSON(old.blocks, [])),
          b.timeline      !== undefined ? b.timeline      : b.timeline,
          b.services      !== undefined ? b.services      : b.services,
          b.results       !== undefined ? b.results       : b.results,
          b.subtitle      !== undefined ? b.subtitle      : b.subtitle,
          b.client_logo   !== undefined ? b.client_logo   : b.client_logo,
          b.industry      !== undefined ? b.industry      : b.industry,
          b.deliverables  !== undefined ? b.deliverables  : b.deliverables,
          b.role_scope    !== undefined ? b.role_scope    : b.role_scope,
          b.og_image      !== undefined ? b.og_image      : b.og_image,
          JSON.stringify(Array.isArray(b.team) ? b.team : safeJSON(old.team, [])),
          JSON.stringify(Array.isArray(b.awards) ? b.awards : safeJSON(old.awards, [])),
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
        media:              z.array(MEDIA_ITEM).optional(),
        blocks:             z.array(BLOCK_ITEM).optional(),
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
           thumbnail_url,case_url,media,blocks)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
            JSON.stringify(b.media ?? []),
            JSON.stringify(b.blocks ?? []),
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

  // -- set_blocks ---------------------------------------------------------------
  server.tool(
    'set_blocks',
    'Replace the ordered custom content blocks (layout) for a project. Returns the updated project. Block types: richtext, timeline, gallery, video, before_after, metrics, quote, embed.',
    {
      ref:    z.string().describe('Project slug or numeric ID'),
      blocks: z.array(BLOCK_ITEM)
                .describe('Full replacement blocks array (ordered). Each block is { type, id?, ...typed fields }.'),
    },
    async ({ ref, blocks }) => {
      const row = findProject(ref);
      if (!row) return err(`No project found with slug/id "${ref}"`);
      db.prepare('UPDATE projects SET blocks=? WHERE id=?').run(JSON.stringify(blocks ?? []), row.id);
      const updated = fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(row.id));
      return ok(`Set ${updated.blocks.length} block(s) on "${updated.title}"\n\n${JSON.stringify(updated, null, 2)}`);
    },
  );

  // -- add_media ----------------------------------------------------------------
  server.tool(
    'add_media',
    'Append media items to a project (or replace the whole media array when replace:true). Items support role/provider/poster. Returns the updated project.',
    {
      ref:     z.string().describe('Project slug or numeric ID'),
      items:   z.array(MEDIA_ITEM).describe('Media items to add (or the whole replacement set when replace:true)'),
      replace: z.boolean().optional().describe('Replace the entire media array instead of appending (default false)'),
    },
    async ({ ref, items, replace }) => {
      const row = findProject(ref);
      if (!row) return err(`No project found with slug/id "${ref}"`);
      const existing = safeJSON(row.media, []);
      const next = replace ? (items ?? []) : [...existing, ...(items ?? [])];
      db.prepare('UPDATE projects SET media=? WHERE id=?').run(JSON.stringify(next), row.id);
      const updated = fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(row.id));
      return ok(`${replace ? 'Replaced' : 'Added'} media on "${updated.title}" — now ${updated.media.length} item(s)\n\n${JSON.stringify(updated, null, 2)}`);
    },
  );

  // ── Blog tools ────────────────────────────────────────────────────────────────

  server.tool(
    'blog_list_posts',
    'List blog posts with optional filters (status, category slug/id, limit).',
    {
      status:   z.enum(['all', 'published', 'draft']).optional()
                  .describe('Filter by status (default: all)'),
      category: z.string().optional()
                  .describe('Filter by category slug or numeric id'),
      limit:    z.number().int().positive().max(100).optional()
                  .describe('Maximum number of results'),
    },
    async ({ status, category, limit }) => {
      let sql = `${POST_SELECT} WHERE 1=1`;
      const args = [];
      if (status && status !== 'all') { sql += ' AND p.status=?'; args.push(status); }
      if (category) {
        sql += ' AND (c.slug=? OR CAST(p.category_id AS TEXT)=?)';
        args.push(String(category), String(category));
      }
      sql += ' ORDER BY COALESCE(p.published_at, p.created_at) DESC';
      if (limit) { sql += ' LIMIT ?'; args.push(limit); }
      return json(db.prepare(sql).all(...args).map(fmtPost));
    },
  );

  server.tool(
    'blog_get_post',
    'Get a single blog post by slug or numeric ID.',
    {
      ref: z.string().describe('Post slug or numeric ID'),
    },
    async ({ ref }) => {
      const row = findPost(ref);
      if (!row) return err(`No blog post found with slug/id "${ref}"`);
      return json(fmtPost(row));
    },
  );

  server.tool(
    'blog_list_categories',
    'List all blog categories.',
    {},
    async () => json(db.prepare('SELECT * FROM blog_categories ORDER BY name ASC').all().map(fmtCategory)),
  );

  // -- blog_upload_media ---------------------------------------------------------
  server.tool(
    'blog_upload_media',
    'Upload an image or video file. Accepts base64-encoded bytes, filename, and optional MIME type. Returns file metadata including URL.',
    {
      data: z.string().describe('Base64-encoded file bytes'),
      filename: z.string().describe('Original filename'),
      mime: z.string().optional().describe('MIME type (auto-detected from filename if omitted)'),
    },
    async ({ data, filename, mime }) => {
      // Decode base64 data
      let buffer;
      try {
        buffer = Buffer.from(data, 'base64');
      } catch (e) {
        return err(`Invalid base64 data: ${e.message}`);
      }

      // Determine MIME type
      let mimeType = mime;
      if (!mimeType && filename) {
        // Try to detect MIME from filename extension
        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'webp': 'image/webp',
          'gif': 'image/gif',
          'avif': 'image/avif',
          'svg': 'image/svg+xml',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'mov': 'video/quicktime',
          'ogv': 'video/ogg',
        };
        mimeType = mimeMap[ext] || 'application/octet-stream';
      }
      if (!mimeType) {
        return err('MIME type must be provided or deducible from filename');
      }

      // Use shared upload handler
      let result;
      try {
        result = await handleUpload(buffer, mimeType, filename);
      } catch (e) {
        return err(e.message);
      }

      // Convert to MCP response format
      const response = {
        url: result.url,
        mime: result.mime,
        bytes: result.bytes,
      };
      if (result.width !== undefined) response.width = result.width;
      if (result.height !== undefined) response.height = result.height;

      return json(response);
    },
  );

  // -- blog_list_media -----------------------------------------------------------
  server.tool(
    'blog_list_media',
    'List recent media files in the uploads directory, newest first.',
    {
      limit: z.number().int().positive().max(100).optional()
             .describe('Maximum number of results to return (default: 20)'),
    },
    async ({ limit }) => {
      const fs = await import('fs');
      const path = await import('path');

      const uploadPath = path.join(path.dirname(__dirname), 'uploads');
      if (!fs.existsSync(uploadPath)) {
        return json([]);
      }

      const files = fs.readdirSync(uploadPath);
      const fileEntries = [];

      for (const file of files) {
        const filePath = path.join(uploadPath, file);
        const stats = fs.statSync(filePath);

        // Skip directories
        if (stats.isDirectory()) continue;

        // Get MIME type from extension
        const ext = file.split('.').pop().toLowerCase();
        const mimeMap = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'webp': 'image/webp',
          'gif': 'image/gif',
          'avif': 'image/avif',
          'svg': 'image/svg+xml',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'mov': 'video/quicktime',
          'ogv': 'video/ogg',
        };
        const mimeType = mimeMap[ext] || 'application/octet-stream';

        // Only include image and video files
        if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
          continue;
        }

        fileEntries.push({
          url: `/uploads/${file}`,
          mime: mimeType,
          bytes: stats.size,
          created_at: stats.birthtime.toISOString(),
        });
      }

      // Sort by creation time, newest first
      fileEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Apply limit
      const limited = limit ? fileEntries.slice(0, limit) : fileEntries.slice(0, 20);

      return json(limited);
    },
  );

  const BLOG_POST_FIELDS = {
    title:       z.string().describe('Post title (required)'),
    slug:        z.string().optional().describe('URL slug — auto from title if omitted'),
    excerpt:     z.string().optional().describe('Short summary shown on list cards'),
    body:        z.string().optional().describe('Full post body (markdown or HTML text)'),
    cover_image: z.string().optional().describe('Cover image URL'),
    status:      z.enum(['draft', 'published']).optional().describe('draft (default) or published'),
    category_id: z.number().int().optional().describe('Category ID (nullable)'),
    category:    z.string().optional().describe('Category slug — resolved to category_id if category_id omitted'),
    author:      z.string().optional().describe('Author display name'),
    published_at:z.string().optional().describe('ISO/datetime published_at (auto-set on publish if omitted)'),
    tags:        z.array(z.string()).optional().describe('Short labels, e.g. ["Tech","News"]'),
  };

  server.tool(
    'blog_create_post',
    'Create a new blog post. Returns the created post.',
    BLOG_POST_FIELDS,
    async b => {
      const slug = slugify(b.slug || b.title);
      let categoryId = b.category_id ?? null;
      if (categoryId == null && b.category) {
        const cat = findCategory(b.category);
        if (!cat) return err(`No category found with slug/id "${b.category}"`);
        categoryId = cat.id;
      }
      const status = b.status === 'published' ? 'published' : 'draft';
      const publishedAt = status === 'published'
        ? (b.published_at || new Date().toISOString().slice(0, 19).replace('T', ' '))
        : (b.published_at || null);
      try {
        const r = db.prepare(`
          INSERT INTO blog_posts
            (title, slug, excerpt, body, cover_image, status, category_id, published_at, author, tags)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run(
          b.title, slug,
          b.excerpt || null,
          b.body || null,
          b.cover_image || null,
          status,
          categoryId,
          publishedAt,
          b.author || null,
          JSON.stringify(b.tags ?? []),
        );
        const created = fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(r.lastInsertRowid));
        return ok(`Created blog post "${created.title}" (slug: ${created.slug}, id: ${created.id})\n\n${JSON.stringify(created, null, 2)}`);
      } catch (e) {
        if (e.message.includes('UNIQUE'))
          return err(`Slug "${slug}" already exists. Provide a unique slug.`);
        return err(e.message);
      }
    },
  );

  server.tool(
    'blog_update_post',
    'Update fields on an existing blog post. Only provided fields change.',
    {
      ref: z.string().describe('Post slug or numeric ID to update'),
      title:       z.string().optional(),
      slug:        z.string().optional().describe('New slug'),
      excerpt:     z.string().optional(),
      body:        z.string().optional(),
      cover_image: z.string().optional(),
      status:      z.enum(['draft', 'published']).optional(),
      category_id: z.number().int().nullable().optional().describe('Category ID, or null to clear'),
      category:    z.string().optional().describe('Category slug (alternative to category_id)'),
      author:      z.string().optional(),
      published_at:z.string().nullable().optional(),
      tags:        z.array(z.string()).optional().describe('Short labels, e.g. ["Tech","News"]'),
    },
    async b => {
      const old = findPost(b.ref);
      if (!old) return err(`No blog post found with slug/id "${b.ref}"`);
      const newSlug = b.slug ? slugify(b.slug) : old.slug;
      const status = ['draft', 'published'].includes(b.status) ? b.status : old.status;
      let categoryId = old.category_id;
      if (b.category_id !== undefined) categoryId = b.category_id;
      else if (b.category !== undefined) {
        if (!b.category) categoryId = null;
        else {
          const cat = findCategory(b.category);
          if (!cat) return err(`No category found with slug/id "${b.category}"`);
          categoryId = cat.id;
        }
      }
      let publishedAt = old.published_at;
      if (b.published_at !== undefined) publishedAt = b.published_at;
      if (status === 'published' && !publishedAt) {
        publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      try {
        db.prepare(`
          UPDATE blog_posts SET
            title=?, slug=?, excerpt=?, body=?, cover_image=?,
            status=?, category_id=?, published_at=?, author=?, tags=?
          WHERE id=?
        `).run(
          b.title ?? old.title,
          newSlug,
          b.excerpt !== undefined ? b.excerpt : old.excerpt,
          b.body !== undefined ? b.body : old.body,
          b.cover_image !== undefined ? b.cover_image : old.cover_image,
          status,
          categoryId,
          publishedAt,
          b.author !== undefined ? b.author : old.author,
          JSON.stringify(Array.isArray(b.tags) ? b.tags : safeJSON(old.tags, [])),
          old.id,
        );
        const updated = fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(old.id));
        return ok(`Updated blog post "${updated.title}"\n\n${JSON.stringify(updated, null, 2)}`);
      } catch (e) {
        if (e.message.includes('UNIQUE'))
          return err(`Slug "${newSlug}" already exists.`);
        return err(e.message);
      }
    },
  );

  server.tool(
    'blog_delete_post',
    'Permanently delete a blog post.',
    {
      ref: z.string().describe('Post slug or numeric ID'),
    },
    async ({ ref }) => {
      const row = findPost(ref);
      if (!row) return err(`No blog post found with slug/id "${ref}"`);
      db.prepare('DELETE FROM blog_posts WHERE id=?').run(row.id);
      return ok(`Deleted blog post "${row.title}" (slug: ${row.slug}, id: ${row.id})`);
    },
  );

  // -- blog_publish_post ----------------------------------------------------------
  server.tool(
    'blog_publish_post',
    'Publish a blog post (set status=published and set published_at if empty).',
    {
      ref: z.string().describe('Post slug or numeric ID'),
    },
    async ({ ref }) => {
      const old = findPost(ref);
      if (!old) return err(`No blog post found with slug/id "${ref}"`);
      const status = 'published';
      let publishedAt = old.published_at;
      if (!publishedAt) {
        publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      try {
        db.prepare(`
          UPDATE blog_posts SET
            status=?,
            published_at=?
          WHERE id=?`
        ).run(status, publishedAt, old.id);
        const updated = fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(old.id));
        return ok(`Published blog post "${updated.title}"${updated.published_at ? '' : ' (published_at set)'}\n\n${JSON.stringify(updated, null, 2)}`);
      } catch (e) {
        return err(e.message);
      }
    },
  );

  // -- blog_unpublish_post ----------------------------------------------------------
  server.tool(
    'blog_unpublish_post',
    'Unpublish a blog post (set status=draft).',
    {
      ref: z.string().describe('Post slug or numeric ID'),
    },
    async ({ ref }) => {
      const old = findPost(ref);
      if (!old) return err(`No blog post found with slug/id "${ref}"`);
      const status = 'draft';
      try {
        db.prepare(`
          UPDATE blog_posts SET
            status=?
            WHERE id=?`
        ).run(status, old.id);
        const updated = fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(old.id));
        return ok(`Unpublished blog post "${updated.title}"\n\n${JSON.stringify(updated, null, 2)}`);
      } catch (e) {
        return err(e.message);
      }
    },
  );

  // -- blog_set_cover ----------------------------------------------------------
  server.tool(
    'blog_set_cover',
    'Set the cover image URL for a blog post.',
    {
      ref: z.string().describe('Post slug or numeric ID'),
      cover_image: z.string().describe('Cover image URL'),
    },
    async ({ ref, cover_image }) => {
      const old = findPost(ref);
      if (!old) return err(`No blog post found with slug/id "${ref}"`);
      try {
        db.prepare(`
          UPDATE blog_posts SET
            cover_image=?
            WHERE id=?`
        ).run(cover_image, old.id);
        const updated = fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(old.id));
        return ok(`Set cover image on blog post "${updated.title}"\n\n${JSON.stringify(updated, null, 2)}`);
      } catch (e) {
        return err(e.message);
      }
    },
  );

  server.tool(
    'blog_create_category',
    'Create a blog category.',
    {
      name:        z.string().describe('Category name'),
      slug:        z.string().optional().describe('URL slug — auto from name if omitted'),
      description: z.string().optional().describe('Optional description'),
    },
    async b => {
      const slug = slugify(b.slug || b.name);
      try {
        const r = db.prepare(
          'INSERT INTO blog_categories (name, slug, description) VALUES (?,?,?)'
        ).run(b.name, slug, b.description || null);
        const created = fmtCategory(db.prepare('SELECT * FROM blog_categories WHERE id=?').get(r.lastInsertRowid));
        return ok(`Created category "${created.name}" (slug: ${created.slug}, id: ${created.id})\n\n${JSON.stringify(created, null, 2)}`);
      } catch (e) {
        if (e.message.includes('UNIQUE'))
          return err(`Slug "${slug}" already exists.`);
        return err(e.message);
      }
    },
  );

  server.tool(
    'blog_update_category',
    'Update a blog category by slug or id.',
    {
      ref:         z.string().describe('Category slug or numeric ID'),
      name:        z.string().optional(),
      slug:        z.string().optional().describe('New slug'),
      description: z.string().optional(),
    },
    async b => {
      const old = findCategory(b.ref);
      if (!old) return err(`No category found with slug/id "${b.ref}"`);
      const newSlug = b.slug ? slugify(b.slug) : b.slug;
      try {
        db.prepare(
          'UPDATE blog_categories SET name=?, slug=?, description=? WHERE id=?'
        ).run(
          b.name ?? old.name,
          newSlug,
          b.description !== undefined ? b.description : b.description,
          old.id,
        );
        const updated = fmtCategory(db.prepare('SELECT * FROM blog_categories WHERE id=?').get(old.id));
        return ok(`Updated category "${updated.name}"\n\n${JSON.stringify(updated, null, 2)}`);
      } catch (e) {
        if (e.message.includes('UNIQUE'))
          return err(`Slug "${newSlug}" already exists.`);
        return err(e.message);
      }
    },
  );

  server.tool(
    'blog_delete_category',
    'Delete a blog category. Posts keep their content; category_id is set NULL.',
    {
      ref: z.string().describe('Category slug or numeric ID'),
    },
    async ({ ref }) => {
      const row = findCategory(ref);
      if (!row) return err(`No category found with slug/id "${ref}"`);
      db.prepare('DELETE FROM blog_categories WHERE id=?').run(row.id);
      return ok(`Deleted category "${row.name}" (slug: ${row.slug}, id: ${row.id})`);
    },
  );

  // ── Resources ────────────────────────────────────────────────────────────────

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

  server.resource(
    'blog-posts-all',
    'blog://posts',
    { description: 'All blog posts including drafts, newest first.' },
    async _uri => {
      const rows = db.prepare(`${POST_SELECT} ORDER BY COALESCE(p.published_at, p.created_at) DESC`).all().map(fmtPost);
      return { contents: [{ uri: 'blog://posts', text: JSON.stringify(rows, null, 2), mimeType: 'application/json' }] };
    },
  );

  server.resource(
    'blog-categories',
    'blog://categories',
    { description: 'All blog categories.' },
    async _uri => {
      const rows = db.prepare('SELECT * FROM blog_categories ORDER BY name ASC').all().map(fmtCategory);
      return { contents: [{ uri: 'blog://categories', text: JSON.stringify(rows, null, 2), mimeType: 'application/json' }] };
    },
  );

  // ── Prompts ──────────────────────────────────────────────────────────────────

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
- media: real product screenshots/video only — set each item's "role" (hero / gallery / feature / before / after / device-desktop / device-mobile / demo) and "provider" (file / mp4 / youtube / vimeo) when known; "hero" marks the cover shot
- blocks: optional ordered custom sections rendered after the core layout — use them for richer storytelling. Supported types: richtext, timeline (phases), gallery, video, before_after, metrics, quote, embed. Build a "timeline" block when the brief describes project phases, and a "gallery" block when there are grouped screenshots.

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

  return server;
}