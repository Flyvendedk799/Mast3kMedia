'use strict';

// Load .env manually (no dotenv dep needed)
const fs = require('fs');
const path = require('path');
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .forEach(line => {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
} catch {}

const express    = require('express');
const Database   = require('better-sqlite3');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');

const PORT       = process.env.PORT        || 3000;
const JWT_SECRET = process.env.JWT_SECRET  || 'mast3k_dev_secret_CHANGE_ME';
const ADMIN_USER = process.env.ADMIN_USER  || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS  || 'abe12345';

// ── Database ─────────────────────────────────────────────────────────────────
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'mast3k.db'));
db.pragma('journal_mode = WAL');
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
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS trg_projects_updated
  AFTER UPDATE ON projects FOR EACH ROW BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

  CREATE TABLE IF NOT EXISTS leads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL DEFAULT 'hero',
    project_type  TEXT    NOT NULL,
    goal          TEXT,
    budget        TEXT,
    timeline      TEXT,
    name          TEXT,
    company       TEXT,
    email         TEXT    NOT NULL,
    brief         TEXT,
    status        TEXT    NOT NULL DEFAULT 'new'
                         CHECK(status IN ('new','contacted','qualified','archived')),
    metadata      TEXT    NOT NULL DEFAULT '{}',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  db.prepare("ALTER TABLE projects ADD COLUMN media TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN blocks TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const safeJSON = (val, fb) => { try { return val ? JSON.parse(val) : fb; } catch { return fb; } };
const clipLine = (val, max = 240) =>
  String(val ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const clipText = (val, max = 1800) =>
  String(val ?? '').trim().replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').slice(0, max);
const validEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || '').trim());

// ── Upload helpers ──────────────────────────────────────────────────────────────
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

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
      return {};
    }
    // WebP: "RIFF"...."WEBP"
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt4 = buf.toString('ascii', 12, 16);
      if (fmt4 === 'VP8 ') {
        // lossy: dimensions in the frame header
        const width  = buf.readUInt16LE(26) & 0x3fff;
        const height = buf.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      if (fmt4 === 'VP8L') {
        // lossless: 14-bit width/height packed after 1-byte signature
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        const width  = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (fmt4 === 'VP8X') {
        // extended: 24-bit width/height minus one at offset 24/27
        const width  = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { width, height };
      }
    }
  } catch { /* best-effort only */ }
  return {};
};

const fmt = (row) => ({
  ...row,
  tags:       safeJSON(row.tags,       []),
  tech_stack: safeJSON(row.tech_stack, []),
  metrics:    safeJSON(row.metrics,    []),
  media:      safeJSON(row.media,      []),
  blocks:     safeJSON(row.blocks,     []),
  featured:   row.featured === 1,
});

// ── Auth middleware ────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(hdr.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
};

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '24mb' }));

// Admin SPA — serve index.html for /admin and /admin/*
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin/*', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// Uploaded media (runtime data)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root static files
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// ── Auth endpoints ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  if (username !== ADMIN_USER)
    return res.status(401).json({ error: 'Invalid credentials' });
  // Support plain-text env pw (dev) or bcrypt hash
  const ok = password === ADMIN_PASS ||
    (ADMIN_PASS.startsWith('$2') && bcrypt.compareSync(password, ADMIN_PASS));
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
});

app.get('/api/auth/me', requireAuth, (req, res) =>
  res.json({ ok: true, user: req.admin }));

// ── Public: projects ───────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  const { featured, limit, category, search, tag } = req.query;
  let sql = 'SELECT * FROM projects WHERE status=?';
  const args = ['published'];
  if (featured)  { sql += ' AND featured=1'; }
  if (category)  { sql += ' AND category=?'; args.push(category); }

  // search — case-insensitive LIKE across the textual + JSON fields
  if (search && String(search).trim()) {
    const like = `%${String(search).trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(title)            LIKE ? OR
      LOWER(description)      LIKE ? OR
      LOWER(long_description) LIKE ? OR
      LOWER(tags)             LIKE ? OR
      LOWER(tech_stack)       LIKE ?
    )`;
    args.push(like, like, like, like, like);
  }

  // tag — comma-separated; match if any value appears in tags OR tech_stack JSON
  if (tag) {
    const values = (Array.isArray(tag) ? tag : [tag])
      .flatMap(t => String(t).split(','))
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    for (const v of values) {
      const like = `%${v}%`;
      sql += ' AND (LOWER(tags) LIKE ? OR LOWER(tech_stack) LIKE ?)';
      args.push(like, like);
    }
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';
  if (limit)     { sql += ' LIMIT ?'; args.push(parseInt(limit, 10)); }
  res.json(db.prepare(sql).all(...args).map(fmt));
});

// ── Public: tags + categories (for work-page filter chips) ──────────────────────
app.get('/api/tags', (req, res) => {
  const rows = db.prepare(
    'SELECT tags, tech_stack, category FROM projects WHERE status=?'
  ).all('published');
  const tagSet = new Set();
  const catSet = new Set();
  for (const r of rows) {
    for (const t of safeJSON(r.tags, []))       if (t) tagSet.add(String(t));
    for (const t of safeJSON(r.tech_stack, []))  if (t) tagSet.add(String(t));
    if (r.category) catSet.add(String(r.category));
  }
  const byName = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
  res.json({
    tags:       [...tagSet].sort(byName),
    categories: [...catSet].sort(byName),
  });
});

app.get('/api/projects/:slug', (req, res) => {
  const row = db.prepare(
    'SELECT * FROM projects WHERE slug=? AND status=?'
  ).get(req.params.slug, 'published');
  if (!row) return res.status(404).json({ error: 'Not found' });

  const project = fmt(row);

  // Related: up to 3 OTHER published projects sharing category or any tag/tech value
  const candidates = db.prepare(
    'SELECT slug, title, category, year, thumbnail_url, description, tags, tech_stack ' +
    'FROM projects WHERE status=? AND slug<>? ORDER BY sort_order ASC, created_at DESC'
  ).all('published', row.slug);

  const ownValues = new Set(
    [...project.tags, ...project.tech_stack].map(v => String(v).toLowerCase())
  );

  const related = candidates
    .filter(c => {
      if (c.category === row.category) return true;
      const cv = [...safeJSON(c.tags, []), ...safeJSON(c.tech_stack, [])]
        .map(v => String(v).toLowerCase());
      return cv.some(v => ownValues.has(v));
    })
    .slice(0, 3)
    .map(c => ({
      slug:          c.slug,
      title:         c.title,
      category:      c.category,
      year:          c.year,
      thumbnail_url: c.thumbnail_url,
      description:   c.description,
    }));

  res.json({ ...project, related });
});

// ── Public: lead intake ───────────────────────────────────────────────────────
app.post('/api/leads', (req, res) => {
  const b = req.body || {};

  // Honeypot: real visitors never fill this hidden field.
  if (clipLine(b.website, 120)) return res.status(201).json({ ok: true });

  const lead = {
    source:       clipLine(b.source || 'hero', 40),
    project_type: clipLine(b.project_type || b.projectType, 80),
    goal:         clipText(b.goal, 900),
    budget:       clipLine(b.budget, 80),
    timeline:     clipLine(b.timeline, 80),
    name:         clipLine(b.name, 160),
    company:      clipLine(b.company, 180),
    email:        clipLine(b.email, 220).toLowerCase(),
    brief:        clipText(b.brief, 1800),
  };

  if (!lead.project_type)
    return res.status(400).json({ error: 'project_type is required' });
  if (!validEmail(lead.email))
    return res.status(400).json({ error: 'valid email is required' });
  if (!lead.goal && !lead.brief)
    return res.status(400).json({ error: 'goal or brief is required' });

  const metadata = {
    page_path: clipLine(b.page_path || req.headers.referer || '/', 500),
    user_agent: clipLine(req.headers['user-agent'], 500),
    ip: clipLine(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 120),
  };

  try {
    const r = db.prepare(`
      INSERT INTO leads
        (source,project_type,goal,budget,timeline,name,company,email,brief,metadata)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      lead.source,
      lead.project_type,
      lead.goal || null,
      lead.budget || null,
      lead.timeline || null,
      lead.name || null,
      lead.company || null,
      lead.email,
      lead.brief || null,
      JSON.stringify(metadata),
    );
    res.status(201).json({ ok: true, id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: stats ───────────────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, (req, res) => {
  const n = (q, ...a) => db.prepare(q).get(...a).n;
  res.json({
    total:     n('SELECT COUNT(*) n FROM projects'),
    published: n("SELECT COUNT(*) n FROM projects WHERE status='published'"),
    drafts:    n("SELECT COUNT(*) n FROM projects WHERE status='draft'"),
    featured:  n('SELECT COUNT(*) n FROM projects WHERE featured=1'),
    leads:     n('SELECT COUNT(*) n FROM leads'),
    new_leads: n("SELECT COUNT(*) n FROM leads WHERE status='new'"),
  });
});

app.get('/api/admin/leads', requireAuth, (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '100', 10) || 100));
  const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(rows.map((row) => ({ ...row, metadata: safeJSON(row.metadata, {}) })));
});

// ── Admin: media upload (dependency-free, raw binary body) ──────────────────────
app.post(
  '/api/admin/uploads',
  requireAuth,
  express.raw({ type: () => true, limit: '64mb' }),
  (req, res) => {
    const buf = Buffer.isBuffer(req.body) ? req.body : null;
    if (!buf || buf.length === 0)
      return res.status(400).json({ error: 'Empty body' });

    const mime = String(req.headers['content-type'] || '')
      .split(';')[0].trim().toLowerCase();
    const kind = mime.startsWith('image/') ? 'image'
               : mime.startsWith('video/') ? 'video'
               : null;
    if (!kind)
      return res.status(415).json({ error: `Unsupported mime type: ${mime || '(none)'}` });

    // Derive extension: prefer mime map, fall back to X-Filename extension
    let ext = MIME_EXT[mime];
    if (!ext) {
      const xf = String(req.headers['x-filename'] || '');
      const m = xf.match(/\.([a-z0-9]+)$/i);
      ext = m ? m[1].toLowerCase() : (kind === 'image' ? 'bin' : 'bin');
    }

    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    const out = {
      url:   `/uploads/${name}`,
      type:  kind,
      mime,
      bytes: buf.length,
    };
    if (kind === 'image') {
      const dim = imageDimensions(buf);
      if (dim.width)  out.width  = dim.width;
      if (dim.height) out.height = dim.height;
    }
    res.status(201).json(out);
  }
);

// ── Admin: CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/projects', requireAuth, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC')
      .all().map(fmt)
  );
});

app.post('/api/admin/projects', requireAuth, (req, res) => {
  const b = req.body;
  if (!b?.title) return res.status(400).json({ error: 'title is required' });
  const slug = slugify(b.slug || b.title);
  try {
    const r = db.prepare(`
      INSERT INTO projects
        (title,slug,category,description,long_description,challenge,approach,
         tags,tech_stack,client,year,status,featured,sort_order,
         metrics,testimonial_text,testimonial_author,testimonial_role,
         thumbnail_url,case_url,media,blocks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      b.title, slug,
      b.category || 'Software',
      b.description        || null,
      b.long_description   || null,
      b.challenge          || null,
      b.approach           || null,
      JSON.stringify(Array.isArray(b.tags)       ? b.tags       : []),
      JSON.stringify(Array.isArray(b.tech_stack) ? b.tech_stack : []),
      b.client || null,
      b.year   || new Date().getFullYear(),
      b.status === 'published' ? 'published' : 'draft',
      b.featured ? 1 : 0,
      b.sort_order || 0,
      JSON.stringify(Array.isArray(b.metrics) ? b.metrics : []),
      b.testimonial_text   || null,
      b.testimonial_author || null,
      b.testimonial_role   || null,
      b.thumbnail_url      || null,
      b.case_url           || null,
      JSON.stringify(Array.isArray(b.media) ? b.media : []),
      JSON.stringify(Array.isArray(b.blocks) ? b.blocks : []),
    );
    res.status(201).json(
      fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(r.lastInsertRowid))
    );
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists — choose another` });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/projects/:id', requireAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const b    = req.body;
  const slug = b.slug ? slugify(b.slug) : old.slug;
  try {
    db.prepare(`
      UPDATE projects SET
        title=?,slug=?,category=?,description=?,long_description=?,
        challenge=?,approach=?,tags=?,tech_stack=?,client=?,year=?,
        status=?,featured=?,sort_order=?,metrics=?,
        testimonial_text=?,testimonial_author=?,testimonial_role=?,
        thumbnail_url=?,case_url=?,media=?,blocks=?
      WHERE id=?
    `).run(
      b.title     ?? old.title,
      slug,
      b.category  ?? old.category,
      b.description          !== undefined ? b.description          : old.description,
      b.long_description     !== undefined ? b.long_description     : old.long_description,
      b.challenge            !== undefined ? b.challenge            : old.challenge,
      b.approach             !== undefined ? b.approach             : old.approach,
      JSON.stringify(Array.isArray(b.tags)       ? b.tags       : safeJSON(old.tags,       [])),
      JSON.stringify(Array.isArray(b.tech_stack) ? b.tech_stack : safeJSON(old.tech_stack, [])),
      b.client !== undefined ? b.client : old.client,
      b.year   ?? old.year,
      ['draft','published'].includes(b.status) ? b.status : old.status,
      b.featured   !== undefined ? (b.featured ? 1 : 0) : old.featured,
      b.sort_order !== undefined ? b.sort_order           : old.sort_order,
      JSON.stringify(Array.isArray(b.metrics) ? b.metrics : safeJSON(old.metrics, [])),
      b.testimonial_text   !== undefined ? b.testimonial_text   : old.testimonial_text,
      b.testimonial_author !== undefined ? b.testimonial_author : old.testimonial_author,
      b.testimonial_role   !== undefined ? b.testimonial_role   : old.testimonial_role,
      b.thumbnail_url !== undefined ? b.thumbnail_url : old.thumbnail_url,
      b.case_url      !== undefined ? b.case_url      : old.case_url,
      JSON.stringify(Array.isArray(b.media) ? b.media : safeJSON(old.media, [])),
      JSON.stringify(Array.isArray(b.blocks) ? b.blocks : safeJSON(old.blocks, [])),
      req.params.id,
    );
    res.json(fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id)));
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists — choose another` });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/projects/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.patch('/api/admin/projects/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!['draft','published'].includes(status))
    return res.status(400).json({ error: 'status must be draft or published' });
  const r = db.prepare('UPDATE projects SET status=? WHERE id=?').run(status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id)));
});

app.patch('/api/admin/projects/:id/featured', requireAuth, (req, res) => {
  const { featured } = req.body;
  const r = db.prepare('UPDATE projects SET featured=? WHERE id=?').run(featured ? 1 : 0, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id)));
});

// Reorder (update sort_order for multiple projects at once)
app.post('/api/admin/projects/reorder', requireAuth, (req, res) => {
  const { order } = req.body; // array of { id, sort_order }
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  const stmt = db.prepare('UPDATE projects SET sort_order=? WHERE id=?');
  const updateMany = db.transaction((items) => items.forEach(({ id, sort_order }) => stmt.run(sort_order, id)));
  updateMany(order);
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const W = 48;
  const line = '─'.repeat(W);
  console.log(`\n  ┌${line}┐`);
  console.log(`  │  Mast3kMedia${' '.repeat(W - 13)}│`);
  console.log(`  ├${line}┤`);
  console.log(`  │  Site   →  http://localhost:${PORT}${' '.repeat(W - 26 - PORT.toString().length)}│`);
  console.log(`  │  Admin  →  http://localhost:${PORT}/admin${' '.repeat(W - 32 - PORT.toString().length)}│`);
  console.log(`  │  API    →  http://localhost:${PORT}/api/projects${' '.repeat(W - 38 - PORT.toString().length)}│`);
  console.log(`  └${line}┘`);
  console.log(`\n  Login: ${ADMIN_USER} / ${ADMIN_PASS.startsWith('$2') ? '[bcrypt hash]' : ADMIN_PASS}\n`);
});
