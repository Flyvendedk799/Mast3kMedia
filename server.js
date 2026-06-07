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
const ADMIN_PASS = process.env.ADMIN_PASS  || 'mast3k2026';

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
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS trg_projects_updated
  AFTER UPDATE ON projects FOR EACH ROW BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const safeJSON = (val, fb) => { try { return val ? JSON.parse(val) : fb; } catch { return fb; } };

const fmt = (row) => ({
  ...row,
  tags:       safeJSON(row.tags,       []),
  tech_stack: safeJSON(row.tech_stack, []),
  metrics:    safeJSON(row.metrics,    []),
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
app.use(express.json({ limit: '4mb' }));

// Admin SPA — serve index.html for /admin and /admin/*
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin/*', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

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
  const { featured, limit, category } = req.query;
  let sql = 'SELECT * FROM projects WHERE status=?';
  const args = ['published'];
  if (featured)  { sql += ' AND featured=1'; }
  if (category)  { sql += ' AND category=?'; args.push(category); }
  sql += ' ORDER BY sort_order ASC, created_at DESC';
  if (limit)     { sql += ' LIMIT ?'; args.push(parseInt(limit, 10)); }
  res.json(db.prepare(sql).all(...args).map(fmt));
});

app.get('/api/projects/:slug', (req, res) => {
  const row = db.prepare(
    'SELECT * FROM projects WHERE slug=? AND status=?'
  ).get(req.params.slug, 'published');
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(row));
});

// ── Admin: stats ───────────────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, (req, res) => {
  const n = (q, ...a) => db.prepare(q).get(...a).n;
  res.json({
    total:     n('SELECT COUNT(*) n FROM projects'),
    published: n("SELECT COUNT(*) n FROM projects WHERE status='published'"),
    drafts:    n("SELECT COUNT(*) n FROM projects WHERE status='draft'"),
    featured:  n('SELECT COUNT(*) n FROM projects WHERE featured=1'),
  });
});

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
         thumbnail_url,case_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
        thumbnail_url=?,case_url=?
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
