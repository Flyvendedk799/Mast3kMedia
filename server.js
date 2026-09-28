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
const { injectBlogArticle, renderBlogCard, renderBlogPager, parseMarkdown } = require('./assets/blog-markdown');
const { injectCase } = require('./assets/case-render');
const casework   = require('./lib/casework');
const pricingLib = require('./lib/pricing');

const PORT       = process.env.PORT        || 3000;
const JWT_SECRET = process.env.JWT_SECRET  || 'mast3k_dev_secret_CHANGE_ME';
const ADMIN_USER = process.env.ADMIN_USER  || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS  || 'abe12345';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_DEFAULTS !== '1') {
  if (JWT_SECRET === 'mast3k_dev_secret_CHANGE_ME') {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
  }
  if (ADMIN_PASS === 'abe12345') {
    console.error('FATAL: ADMIN_PASS must be set in production');
    process.exit(1);
  }
  if (!ADMIN_PASS.startsWith('$2')) {
    console.error('FATAL: ADMIN_PASS must be a bcrypt hash in production');
    process.exit(1);
  }
}


// ── Database ─────────────────────────────────────────────────────────────────
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(process.env.DB_PATH || path.join(DB_DIR, 'mast3k.db'));
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
    seo_title    TEXT,
    seo_description TEXT,
    cover_alt    TEXT,
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

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

try {
  db.prepare('ALTER TABLE leads ADD COLUMN notes TEXT').run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  const seeded = db.prepare("SELECT key FROM settings WHERE key='pricing'").get();
  if (!seeded) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('pricing', ?)").run(
      JSON.stringify(pricingLib.defaultPricing())
    );
  }
} catch (e) {
  console.error('pricing seed failed', e);
}

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

try {
  db.prepare("ALTER TABLE projects ADD COLUMN timeline TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN services TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN results TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN subtitle TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN client_logo TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN industry TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN deliverables TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN role_scope TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN og_image TEXT").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN team TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE projects ADD COLUMN awards TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try {
  db.prepare("ALTER TABLE blog_posts ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'").run();
} catch (e) {
  if (!/duplicate column/i.test(e.message)) throw e;
}

try { db.prepare("ALTER TABLE blog_posts ADD COLUMN seo_title TEXT").run(); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
try { db.prepare("ALTER TABLE blog_posts ADD COLUMN seo_description TEXT").run(); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
try { db.prepare("ALTER TABLE blog_posts ADD COLUMN cover_alt TEXT").run(); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }

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
const trimDesc = (val, max = 155) => {
  const s = String(val ?? '').trim();
  if (s.length <= max) return s;
  const sub = s.slice(0, max + 1);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 0 ? sub.slice(0, lastSpace) : sub.slice(0, max)) + '…';
};
const validEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || '').trim());

const SITE_ORIGIN = 'https://mast3kmedia.dk';
const absUrl = (url) => (/^https?:\/\//i.test(url) ? url : SITE_ORIGIN + url);
const escHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const jsLit = (value) => JSON.stringify(String(value ?? ''))
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

function renderMeasuredPage(html, opts) {
  const description = String(opts.description || '').replace(/\s+/g, ' ').trim();
  const canonical = opts.canonical;
  const image = opts.image || '';
  const swap = (source, regex, next) => source.replace(regex, () => next);
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${escHtml(opts.fullTitle)}</title>`);
  html = swap(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escHtml(description)}" />`);
  html = swap(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escHtml(canonical)}" />`);
  html = swap(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${escHtml(canonical)}" />`);
  html = swap(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escHtml(opts.fullTitle)}" />`);
  html = swap(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escHtml(description)}" />`);
  html = swap(html, /<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="article" />`);
  html = swap(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escHtml(opts.fullTitle)}" />`);
  html = swap(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escHtml(description)}" />`);
  const push = `<script>window.dataLayer=window.dataLayer||[];dataLayer.push({page_type:${jsLit(opts.pageType)},content_type:${jsLit(opts.contentType)},content_id:${jsLit(opts.contentId)},content_title:${jsLit(opts.contentTitle)},content_category:${jsLit(opts.contentCategory)}})</script>`;
  html = swap(
    html,
    /<script>window\.dataLayer=window\.dataLayer\|\|\[\];dataLayer\.push\(\{page_type:'[^']*'\}\)<\/script>/,
    push,
  );

  let extraHead = '';
  if (opts.image) {
    extraHead += `<meta property="og:image" content="${escHtml(opts.image)}" />\n`;
    extraHead += `<meta name="twitter:image" content="${escHtml(opts.image)}" />\n`;
    if (opts.imageWidth) extraHead += `<meta property="og:image:width" content="${opts.imageWidth}" />\n`;
    if (opts.imageHeight) extraHead += `<meta property="og:image:height" content="${opts.imageHeight}" />\n`;
    if (opts.imageAlt) {
      extraHead += `<meta property="og:image:alt" content="${escHtml(opts.imageAlt)}" />\n`;
      extraHead += `<meta name="twitter:image:alt" content="${escHtml(opts.imageAlt)}" />\n`;
    }
  }
  if (opts.article) {
    extraHead += `<meta property="article:published_time" content="${escHtml(opts.article.published_time)}" />\n`;
    extraHead += `<meta property="article:modified_time" content="${escHtml(opts.article.modified_time)}" />\n`;
    if (opts.article.author) extraHead += `<meta property="article:author" content="${escHtml(opts.article.author)}" />\n`;
    if (opts.article.section) extraHead += `<meta property="article:section" content="${escHtml(opts.article.section)}" />\n`;
    (opts.article.tags || []).forEach(t => {
      extraHead += `<meta property="article:tag" content="${escHtml(t)}" />\n`;
    });
  }
  if (opts.jsonLd) {
    extraHead += `<script type="application/ld+json">\n${opts.jsonLd.replace(/</g, '\\u003c')}\n</script>\n`;
  }
  if (extraHead) {
    html = html.replace('</head>', extraHead + '</head>');
  }

  return html;
}

const blogPostTemplate = fs.readFileSync(path.join(__dirname, 'blog-post.html'), 'utf8');
const caseTemplate = fs.readFileSync(path.join(__dirname, 'case.html'), 'utf8');

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

const { fmt } = casework;

const fmtCategory = (row) => row ? ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || null,
  created_at: row.created_at,
}) : null;

const fmtPost = (row) => {
  if (!row) return null;
  let category = null;
  if (row.category_id) {
    if (row.category_name) {
      category = {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      };
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
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    cover_alt: row.cover_alt || null,
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

const POST_SELECT = `
  SELECT p.*,
         c.name AS category_name,
         c.slug AS category_slug
  FROM blog_posts p
  LEFT JOIN blog_categories c ON c.id = p.category_id
`;

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
app.set('trust proxy', true);
app.use((req, res, next) => {
  if (req.hostname === 'www.mast3kmedia.dk') {
    return res.redirect(301, 'https://mast3kmedia.dk' + req.originalUrl);
  }
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  }
  next();
});
app.use(express.json({ limit: '24mb' }));

const requestSearch = (req) => {
  const i = req.originalUrl.indexOf('?');
  return i === -1 ? '' : req.originalUrl.slice(i);
};

// Homepage figures: published cases, cases tagged SaaS, and GitHub commits
// for the current calendar year (Flyvendedk799, public commit contributions).
const COMMIT_LOGIN = 'Flyvendedk799';
const commitCache = { year: 0, n: null, at: 0 };

const hasSaasTag = (raw) => {
  const tags = Array.isArray(raw) ? raw : safeJSON(raw, []);
  return tags.some((t) => String(t).trim().toLowerCase() === 'saas');
};

const countsFromRows = (rows, tagsOf) => ({
  cases: rows.length,
  saas: rows.filter((r) => hasSaasTag(tagsOf(r))).length,
});

let remoteCountCache = { at: 0, value: null };

const portfolioCounts = async () => {
  const rows = db.prepare("SELECT tags FROM projects WHERE status='published'").all();
  const local = countsFromRows(rows, (r) => r.tags);
  if (local.cases > 0) return local;
  // Local dev DB is often empty; the published portfolio is the live case list.
  if (remoteCountCache.value && Date.now() - remoteCountCache.at < 10 * 60 * 1000) {
    return remoteCountCache.value;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('https://mast3kmedia.dk/api/projects', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return local;
    const projects = await res.json();
    if (!Array.isArray(projects) || !projects.length) return local;
    const counts = countsFromRows(projects, (p) => p.tags);
    remoteCountCache = { at: Date.now(), value: counts };
    return counts;
  } catch {
    return local;
  }
};

const fmtStat = (n) => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const paintHomeStat = (html, key, value) => {
  if (value == null || Number.isNaN(Number(value))) return html;
  const n = String(Math.round(Number(value)));
  return html.replace(
    new RegExp(`(data-home-stat="${key}" data-count=")[^"]*(">)[^<]*`, 'g'),
    `$1${n}$2${fmtStat(n)}`
  );
};

function refreshCommitsThisYear() {
  const year = new Date().getFullYear();
  if (commitCache.n != null && commitCache.year === year && Date.now() - commitCache.at < 6 * 60 * 60 * 1000) return;
  const { execFile } = require('child_process');
  const query = `query { user(login: "${COMMIT_LOGIN}") { contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") { totalCommitContributions } } }`;
  execFile('gh', ['api', 'graphql', '-f', `query=${query}`], { timeout: 8000 }, (err, stdout) => {
    if (err) return;
    try {
      const n = JSON.parse(stdout).data.user.contributionsCollection.totalCommitContributions;
      if (typeof n === 'number') {
        commitCache.year = year;
        commitCache.n = n;
        commitCache.at = Date.now();
      }
    } catch {}
  });
}

app.get('/', async (req, res, next) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const counts = await portfolioCounts();
    html = paintHomeStat(html, 'cases', counts.cases);
    html = paintHomeStat(html, 'saas', counts.saas);
    if (commitCache.n == null) refreshCommitsThisYear();
    html = paintHomeStat(html, 'commits', commitCache.n);
    const projects = db.prepare('SELECT * FROM projects WHERE status=? AND featured=1 ORDER BY sort_order ASC, created_at DESC').all('published').map(fmt);
    
    const buildCaseCard = (p, idx, total) => {
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let plate;
      if (p.thumbnail_url) {
        plate = '<img src="' + esc(p.thumbnail_url) + '" alt="' + esc(p.title) + '" class="case-shot" loading="lazy" />';
      } else {
        plate = '<span class="ph-label">' + esc(p.category) + '</span>';
      }
      const num = String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
      const tags = (p.tags || []).slice(0, 3).map(t => '<span class="tag">' + esc(t) + '</span>').join('');
      return '<a href="/arbejde/' + esc(p.slug) + '" class="card case-card" data-reveal="up" data-track="content" data-content-type="case" data-content-id="' + esc(p.slug) + '">' +
          '<div class="case-plate' + (p.thumbnail_url ? ' has-shot' : ' ph') + '" data-parallax-scope>' +
            '<div class="ph-inner" data-parallax="-0.06">' + plate + '</div>' +
            '<span class="ph-index">' + num + '</span>' +
          '</div>' +
          '<div class="case-body">' +
            '<div class="case-head"><h3 class="case-title">' + esc(p.title) + '</h3>' +
            '<span class="case-cat">' + esc(p.category) + ' · ' + esc(p.year) + '</span></div>' +
            '<p class="case-desc">' + esc(p.description || '') + '</p>' +
            '<div class="case-tags">' + tags + '</div>' +
          '</div>' +
        '</a>';
    };

    const cardsHtml = projects.map((p, i) => buildCaseCard(p, i, projects.length)).join('');
    html = html.replace(/<div class="case-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, '<div class="case-grid">' + cardsHtml + '</div></div></section>');
    
    // Remove the client-side script for featured projects
    html = html.replace(/<script>\s*\/\*\s*── Featured projects from the API.*?\s*\*\/[\s\S]*?<\/script>/, '');

    // Four latest cases, rendered inside the spec panel titled Senest leveret.
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const recentProjects = db.prepare('SELECT * FROM projects WHERE status=? ORDER BY sort_order ASC, created_at DESC LIMIT 4').all('published').map(fmt);
    if (recentProjects.length) {
      const rows = recentProjects.map(p =>
        '<a class="spec-row" href="/arbejde/' + esc(p.slug) + '"><span class="spec-case-n">' + esc(p.title) +
        '</span><span class="spec-case-c">' + esc(p.category || '') + (p.year ? ' · ' + esc(p.year) : '') + '</span></a>'
      ).join('');
      html = html.replace(/<div class="spec-recent">[\s\S]*?<\/div>/, '<div class="spec-recent">' + rows + '</div>');
    }
    html = html.replace(/<script>\s*\/\*\s*── Dynamic "Senest leveret".*?\s*\*\/[\s\S]*?<\/script>/, '');

    res.type('html').send(html);
  } catch(e) {
    next(e);
  }
});

app.get('/arbejde.html', (req, res, next) => {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'arbejde.html'), 'utf8');
    const projects = db.prepare('SELECT * FROM projects WHERE status=? ORDER BY sort_order ASC, created_at DESC').all('published').map(fmt);
    
    const buildWorkCard = (p) => {
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const media = p.thumbnail_url 
        ? '<img src="' + esc(p.thumbnail_url) + '" alt="' + esc(p.title) + '" loading="lazy">' 
        : '<div class="ph-inner"><span class="ph-label">' + esc(p.category || 'Case') + '</span></div>';
      const badge = esc(p.category || 'Case') + (p.year ? ' · ' + esc(p.year) : '');
      const tags = (p.tags || []).slice(0, 3).map(t => '<span class="tag">' + esc(t) + '</span>').join('');
      const tagsHtml = tags ? '<div class="wcard-tags">' + tags + '</div>' : '';

      return '<a href="/arbejde/' + esc(p.slug) + '" class="wcard work-item" data-cat="' + esc(p.category) + '" data-tags="' + esc((p.tags||[]).join(',')) + '" data-track="content" data-content-type="case" data-content-id="' + esc(p.slug) + '">' +
        '<div class="wcard-media' + (p.thumbnail_url ? '' : ' ph') + '">' + media +
        '<span class="wcard-badge">' + badge + '</span><span class="wcard-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span></div>' +
        '<div class="wcard-info"><h3 class="wcard-title">' + esc(p.title) + '</h3><span class="wcard-cat">' + esc(p.year) + '</span></div>' +
        '<p class="wcard-desc">' + esc(p.description) + '</p>' + tagsHtml + '</a>';
    };

    const cardsHtml = projects.map(p => buildWorkCard(p)).join('');
    html = html.replace(/<div class="work-grid" id="workGrid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, '<div class="work-grid" id="workGrid">' + cardsHtml + '</div></div></section>');
    
    res.type('html').send(html);
  } catch(e) {
    next(e);
  }
});

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const urlPath = req.path;
  if (urlPath !== '/' && urlPath.endsWith('/')) {
    if (!/^\/(admin|mcp)\//.test(urlPath)) {
      return res.redirect(301, urlPath.slice(0, -1) + requestSearch(req));
    }
  }
  if (urlPath === '/' || path.extname(urlPath)) return next();
  if (/^\/(api|admin|uploads|mcp|assets)(\/|$)/.test(urlPath)) return next();
  const resolved = path.resolve(__dirname, '.' + urlPath + '.html');
  if (!resolved.startsWith(__dirname + path.sep)) return next();
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return next();
  if (path.basename(resolved) === 'index.html') {
    return res.redirect(301, '/' + requestSearch(req));
  }
  res.redirect(301, urlPath + '.html' + requestSearch(req));
});

// Admin SPA — serve index.html for /admin and /admin/*
app.use('/admin', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin/*', (_, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// Uploaded media (runtime data)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  immutable: true
}));

app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res, fp) => {
    if (res.req && res.req.query && res.req.query.v) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.get('/blog.html', (req, res, next) => {
  if (req.query.category) {
    return res.redirect(301, `/blog/kategori/${encodeURIComponent(req.query.category)}`);
  }
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = 12;
  const offset = (page - 1) * limit;
  const total = db.prepare(`SELECT COUNT(*) n FROM blog_posts WHERE status='published'`).get().n;
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages && pages > 0) return res.status(404).send('Not found');
  
  const posts = db.prepare(`${POST_SELECT} WHERE p.status='published' ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?`)
    .all(limit, offset).map(fmtPost);
  
  let html = fs.readFileSync(path.join(__dirname, 'blog.html'), 'utf8');
  const cardsHtml = posts.map(renderBlogCard).join('');
  html = html.replace(/<div class="blog-grid" id="blogGrid">[\s\S]*?<\/div>/, '<div class="blog-grid" id="blogGrid">' + cardsHtml + '</div>');
  html = html.replace(/<div class="blog-pager" id="blogPager">[\s\S]*?<\/div>/, '<div class="blog-pager" id="blogPager">' + renderBlogPager({page, pages, base: '/blog.html'}) + '</div>');
  html = html.replace(/<span id="blogCount">[\s\S]*?<\/span>/, `<span id="blogCount">${total}</span>`);
  
  // Replace filters to be links
  const categories = db.prepare('SELECT name, slug FROM blog_categories ORDER BY name ASC').all();
  const filtersHtml = '<a href="/blog.html" class="filter active" aria-current="page">Alle <span class="filter-count">' + total + '</span></a>' +
    categories.map(c => {
      const ccount = db.prepare(`SELECT COUNT(*) n FROM blog_posts WHERE category_id=(SELECT id FROM blog_categories WHERE slug=?) AND status='published'`).get(c.slug).n;
      return '<a href="/blog/kategori/' + escHtml(c.slug) + '" class="filter">' + escHtml(c.name) + ' <span class="filter-count">' + ccount + '</span></a>';
    }).join('');
  html = html.replace(/<div class="blog-filters" id="blogFilters" role="tablist">[\s\S]*?<\/div>/, '<nav class="blog-filters" id="blogFilters" aria-label="Kategorier">' + filtersHtml + '</nav>');

  if (page > 1) {
    html = renderMeasuredPage(html, {
      fullTitle: `Blog, side ${page} — Mast3kMedia`,
      description: `Læs artikler om software, SaaS, AI og vækst fra Mast3kMedia. Side ${page}.`,
      canonical: `${SITE_ORIGIN}/blog.html?page=${page}`,
      pageType: 'blog_index', contentType: 'blog_index', contentId: 'blog', contentTitle: 'Blog', contentCategory: ''
    });
  }
  
  // Strip client-side fetch script
  html = html.replace(/<script>\s*\/\*\s*── Dynamic blog.*?\s*\*\/[\s\S]*?<\/script>/, '');

  res.type('html').send(html);
});

app.get('/blog/kategori/:slug', (req, res, next) => {
  const slug = req.params.slug;
  const category = db.prepare('SELECT * FROM blog_categories WHERE slug=?').get(slug);
  if (!category) return res.status(404).send('Not found');

  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = 12;
  const offset = (page - 1) * limit;
  const total = db.prepare(`SELECT COUNT(*) n FROM blog_posts WHERE status='published' AND category_id=?`).get(category.id).n;
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages && pages > 0) return res.status(404).send('Not found');

  const posts = db.prepare(`${POST_SELECT} WHERE p.status='published' AND p.category_id=? ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?`)
    .all(category.id, limit, offset).map(fmtPost);

  let html = fs.readFileSync(path.join(__dirname, 'blog.html'), 'utf8');
  const cardsHtml = posts.map(renderBlogCard).join('');
  html = html.replace(/<div class="blog-grid" id="blogGrid">[\s\S]*?<\/div>/, '<div class="blog-grid" id="blogGrid">' + cardsHtml + '</div>');
  html = html.replace(/<div class="blog-pager" id="blogPager">[\s\S]*?<\/div>/, '<div class="blog-pager" id="blogPager">' + renderBlogPager({page, pages, base: `/blog/kategori/${slug}`}) + '</div>');
  html = html.replace(/<span id="blogCount">[\s\S]*?<\/span>/, `<span id="blogCount">${total}</span>`);
  
  // Replace filters to be links, setting active on the right one
  const totalAll = db.prepare(`SELECT COUNT(*) n FROM blog_posts WHERE status='published'`).get().n;
  const categories = db.prepare('SELECT name, slug FROM blog_categories ORDER BY name ASC').all();
  const filtersHtml = '<a href="/blog.html" class="filter">Alle <span class="filter-count">' + totalAll + '</span></a>' +
    categories.map(c => {
      const ccount = db.prepare(`SELECT COUNT(*) n FROM blog_posts WHERE category_id=(SELECT id FROM blog_categories WHERE slug=?) AND status='published'`).get(c.slug).n;
      const act = c.slug === slug ? ' active" aria-current="page"' : '"';
      return '<a href="/blog/kategori/' + escHtml(c.slug) + '" class="filter' + act + '>' + escHtml(c.name) + ' <span class="filter-count">' + ccount + '</span></a>';
    }).join('');
  html = html.replace(/<div class="blog-filters" id="blogFilters" role="tablist">[\s\S]*?<\/div>/, '<nav class="blog-filters" id="blogFilters" aria-label="Kategorier">' + filtersHtml + '</nav>');

  const desc = category.description || `Læs de seneste artikler om ${category.name} fra Mast3kMedia.`;
  html = renderMeasuredPage(html, {
    fullTitle: `${category.name} — Blog | Mast3kMedia${page > 1 ? `, side ${page}` : ''}`,
    description: desc,
    canonical: `${SITE_ORIGIN}/blog/kategori/${slug}${page > 1 ? `?page=${page}` : ''}`,
    pageType: 'blog_category', contentType: 'blog_category', contentId: slug, contentTitle: category.name, contentCategory: category.name
  });
  
  html = html.replace(/<script>\s*\/\*\s*── Dynamic blog.*?\s*\*\/[\s\S]*?<\/script>/, '');

  res.type('html').send(html);
});

app.get('/forfatter/tobias-mastek', (req, res) => {
  const posts = db.prepare(`${POST_SELECT} WHERE p.status='published' AND p.author='Tobias Mastek' ORDER BY COALESCE(p.published_at, p.created_at) DESC`).all().map(fmtPost);
  
  let html = fs.readFileSync(path.join(__dirname, 'blog.html'), 'utf8');
  const cardsHtml = posts.map(renderBlogCard).join('');
  html = html.replace(/<div class="blog-grid" id="blogGrid">[\s\S]*?<\/div>/, 
    `<div class="author-bio section-pad">
      <div class="shell" style="max-width:800px; margin:0 auto; padding-bottom:3rem">
        <h1 class="display">Tobias Mastek</h1>
        <p class="muted">Stifter af Mast3kMedia. Udvikler og designer med fokus på SaaS og AI-automatisering.</p>
      </div>
    </div>
    <div class="blog-grid" id="blogGrid">${cardsHtml}</div>`
  );
  html = html.replace(/<div class="blog-pager" id="blogPager">[\s\S]*?<\/div>/, '<div class="blog-pager" id="blogPager"></div>');
  html = html.replace(/<div class="blog-filters" id="blogFilters" role="tablist">[\s\S]*?<\/div>/, '');

  html = renderMeasuredPage(html, {
    fullTitle: `Tobias Mastek — Mast3kMedia`,
    description: `Læs artikler skrevet af Tobias Mastek.`,
    canonical: `${SITE_ORIGIN}/forfatter/tobias-mastek`,
    pageType: 'author', contentType: 'author', contentId: 'tobias', contentTitle: 'Tobias Mastek', contentCategory: ''
  });
  
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Tobias Mastek",
    "url": `${SITE_ORIGIN}/forfatter/tobias-mastek`,
    "jobTitle": "Stifter",
    "worksFor": { "@type": "Organization", "name": "Mast3kMedia ApS" },
    "sameAs": ["https://linkedin.com/", "https://github.com/Flyvendedk799"]
  };
  html = html.replace('</head>', `\n<script type="application/ld+json">\n${JSON.stringify(personJsonLd)}\n</script>\n</head>`);
  html = html.replace(/<script>\s*\/\*\s*── Dynamic blog.*?\s*\*\/[\s\S]*?<\/script>/, '');

  res.type('html').send(html);
});

app.get('/rss.xml', (req, res) => res.redirect(301, '/blog/rss.xml'));
app.get('/feed.xml', (req, res) => res.redirect(301, '/blog/rss.xml'));

app.get('/blog/rss.xml', (req, res) => {
  const posts = db.prepare(`${POST_SELECT} WHERE p.status='published' ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT 20`).all().map(fmtPost);
  
  const items = posts.map(p => {
    const pubDate = new Date(p.published_at ? p.published_at + 'Z' : p.created_at + 'Z').toUTCString();
    const url = `${SITE_ORIGIN}/blog/${encodeURIComponent(p.slug)}`;
    const desc = p.seo_description || trimDesc(p.excerpt || '', 155);
    let enc = '';
    if (p.cover_image) {
      enc = `\n      <enclosure url="${absUrl(p.cover_image)}" type="image/webp" length="0" />`;
    }
    return `    <item>
      <title>${escHtml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escHtml(desc)}</description>
      <category>${escHtml(p.category_name || '')}</category>
      <dc:creator>Tobias Mastek</dc:creator>${enc}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mast3kMedia blog</title>
    <link>${SITE_ORIGIN}/blog.html</link>
    <description>Læs artikler om software, SaaS, AI og vækst fra Mast3kMedia.</description>
    <language>da-DK</language>
    <atom:link href="${SITE_ORIGIN}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  res.type('application/rss+xml; charset=utf-8').send(xml);
});

// Blog post pretty URLs
app.get('/blog-post.html', (req, res) => {
  const slug = req.query.slug;
  if (slug) {
    res.redirect(301, `/blog/${slug}`);
  } else {
    res.sendFile(path.join(__dirname, 'blog-post.html'));
  }
});

app.get('/blog/:slug', (req, res) => {
  const { slug } = req.params;
  try {
    const post = db.prepare(
      `${POST_SELECT} WHERE p.slug=? AND p.status='published'`
    ).get(slug);

    if (!post) {
      return res.status(404).type('html').send(notFoundHtml);
    }

    const fmtP = fmtPost(post);

    const baseTitle = fmtP.seo_title || fmtP.title;
    const suffix = " — Mast3kMedia";
    const fullTitle = (baseTitle + suffix).length <= 60 ? baseTitle + suffix : baseTitle;
    const finalDesc = fmtP.seo_description || trimDesc(fmtP.excerpt || '', 155);
    const pubDate = new Date(post.published_at ? post.published_at + 'Z' : post.created_at + 'Z').toISOString();
    const modDate = new Date(post.updated_at ? post.updated_at + 'Z' : pubDate).toISOString();

    let jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": fmtP.title,
      "description": finalDesc,
      "image": post.cover_image ? absUrl(post.cover_image) : '',
      "datePublished": pubDate,
      "dateModified": modDate,
      "author": {
        "@type": "Person",
        "name": "Tobias Mastek",
        "url": `${SITE_ORIGIN}/forfatter/tobias-mastek`
      },
      "publisher": {
        "@type": "Organization",
        "name": "Mast3kMedia ApS",
        "logo": { "@type": "ImageObject", "url": `${SITE_ORIGIN}/assets/og-image.png` }
      },
      "mainEntityOfPage": `${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}`,
      "inLanguage": "da-DK",
      "articleSection": post.category_name || '',
      "keywords": fmtP.tags.join(', ')
    };

    const mdState = { ids: {}, toc: [], faq: [] };
    parseMarkdown(post.body || '', mdState);
    if (mdState.faq.length >= 2) {
      jsonLd = [jsonLd, {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": mdState.faq.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }];
    }

    // Related posts
    const candidates = db.prepare(`${POST_SELECT} WHERE p.status='published' AND p.slug<>? ORDER BY COALESCE(p.published_at, p.created_at) DESC`).all(slug).map(fmtPost);
    const ownValues = new Set([...fmtP.tags].map(v => String(v).toLowerCase()));
    
    fmtP.related = candidates.sort((a, b) => {
      let aScore = 0, bScore = 0;
      if (a.category_id === fmtP.category_id) aScore += 100;
      if (b.category_id === fmtP.category_id) bScore += 100;
      aScore += a.tags.filter(t => ownValues.has(String(t).toLowerCase())).length;
      bScore += b.tags.filter(t => ownValues.has(String(t).toLowerCase())).length;
      return bScore - aScore;
    }).slice(0, 3);

    const catId = (fmtP.category_name || '').toLowerCase();
    const ctaConfig = {
      ai: { text: "Klar til at sætte AI i produktion?", srv: "AI & Automatisering", url: "/ydelser/ai-automatisering.html" },
      software: { text: "Skal vi bygge dit næste projekt?", srv: "Softwareudvikling", url: "/ydelser/softwareudvikling.html" }
    };
    fmtP.cta = ctaConfig[catId] || { text: "Klar til at bygge noget nyt?", srv: "Se vores ydelser", url: "/ydelser.html" };

    let imgW, imgH;
    if (post.cover_image && post.cover_image.startsWith('/uploads/')) {
      try {
        const buf = fs.readFileSync(path.join(__dirname, post.cover_image));
        const dim = imageDimensions(buf);
        if (dim.width) imgW = dim.width;
        if (dim.height) imgH = dim.height;
      } catch (e) {}
    }

    let measured = renderMeasuredPage(blogPostTemplate, {
      fullTitle: fullTitle,
      description: finalDesc,
      canonical: `${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}`,
      image: post.cover_image ? absUrl(post.cover_image) : '',
      imageAlt: post.cover_alt || post.title,
      imageWidth: imgW,
      imageHeight: imgH,
      pageType: 'blog_post',
      contentType: 'blog_post',
      contentId: post.slug,
      contentTitle: post.title,
      contentCategory: post.category_name || '',
      article: {
        published_time: pubDate,
        modified_time: modDate,
        author: `${SITE_ORIGIN}/forfatter/tobias-mastek`,
        section: post.category_name || '',
        tags: fmtP.tags
      },
      jsonLd: JSON.stringify((Array.isArray(jsonLd) ? jsonLd : [jsonLd]).concat([{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Forside", "item": SITE_ORIGIN + '/' },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": SITE_ORIGIN + '/blog.html' },
          { "@type": "ListItem", "position": 3, "name": post.category_name || 'Kategori', "item": SITE_ORIGIN + '/blog/kategori/' + encodeURIComponent(post.category_slug || 'andet') },
          { "@type": "ListItem", "position": 4, "name": fmtP.title }
        ]
      }]))
    });

    const ctaHtml = `
<section class="post-cta section-pad" data-track="cta" data-cta-id="blog_post_end_${catId}" data-cta-location="blog_post_end">
  <div class="shell">
    <div class="ih" data-reveal="up">
      <span class="eyebrow">Læst færdig?</span>
      <h2 class="ih-title display">${fmtP.cta.text}</h2>
    </div>
    <div style="display:flex;gap:1rem;margin-top:2rem;" data-reveal="up">
      <a href="${fmtP.cta.url}" class="btn btn-solid"><span class="btn-label">${fmtP.cta.srv} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a>
      <a href="/kontakt.html#brief" class="btn">Kontakt os</a>
      <a href="/blog.html" class="btn">Tilbage til bloggen</a>
    </div>
  </div>
</section>
<section class="section-pad related-section">
  <div class="shell">
    <div class="ih" data-reveal="up">
      <span class="eyebrow">Mere fra bloggen</span>
      <h2 class="ih-title display">Læs også.</h2>
    </div>
    <div class="blog-grid" data-reveal="stagger">
      ${fmtP.related.map(renderBlogCard).join('')}
    </div>
  </div>
</section>`;

    measured = measured.replace(/<section class="next-cta">[\s\S]*?<\/section>/, ctaHtml);

    res.type('html').send(injectBlogArticle(measured, fmtP));
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).type('html').send(blogPostTemplate);
  }
});

app.get('/case.html', (req, res, next) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (slug) {
    return res.redirect(301, `/arbejde/${encodeURIComponent(slug)}`);
  }
  return res.redirect(301, '/arbejde.html');
});

function renderCasePage(row, preview = false) {
  const project = fmt(row);
  // Add related cases for injection
  const candidates = db.prepare(
    'SELECT slug, title, category, year, thumbnail_url, description, tags, tech_stack ' +
    'FROM projects WHERE status=? AND slug<>? ORDER BY sort_order ASC, created_at DESC'
  ).all('published', project.slug);
  const ownValues = new Set([...project.tags, ...project.tech_stack].map(v => String(v).toLowerCase()));
  project.related = candidates.filter(c => {
    if (c.category === project.category) return true;
    const cv = [...safeJSON(c.tags, []), ...safeJSON(c.tech_stack, [])].map(v => String(v).toLowerCase());
    return cv.some(v => ownValues.has(v));
  }).slice(0, 3).map(c => ({
    slug: c.slug, title: c.title, category: c.category, year: c.year,
    thumbnail_url: c.thumbnail_url, description: c.description, tags: safeJSON(c.tags, [])
  }));

  const image = project.og_image || project.thumbnail_url;
  let template = caseTemplate;
  // The template's default og:image would otherwise come first and win over the case image.
  if (image) template = template.replace(/<meta (property="og:image(:\w+)?"|name="twitter:image") content="[^"]*" \/>\n/g, '');
  // Draft previews never reach analytics: drop the dataLayer, consent, GTM and analytics.js.
  if (preview) template = template
    .replace(/(<head>\n)[\s\S]*?(?=<meta charset)/, '$1')
    .replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->\n/, '');
  let html = renderMeasuredPage(template, {
    fullTitle: `${project.title} — Case · Mast3kMedia`,
    description: project.description || '',
    canonical: `${SITE_ORIGIN}/arbejde/${encodeURIComponent(project.slug)}`,
    image: image ? absUrl(image) : '',
    pageType: 'case',
    contentType: 'case',
    contentId: project.slug,
    contentTitle: project.title,
    contentCategory: project.category || '',
  });
  if (preview) html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>');
  return injectCase(html, project);
}

app.get('/arbejde/:slug', (req, res) => {
  try {
    const row = db.prepare(
      'SELECT * FROM projects WHERE slug=? AND status=?'
    ).get(req.params.slug, 'published');
    if (!row) {
      return res.status(404).type('html').send(notFoundHtml);
    }
    res.type('html').send(renderCasePage(row));
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).type('html').send(caseTemplate);
  }
});

// Signed, expiring preview of any project (drafts included), rendered like the public case page.
app.get('/arbejde/preview/:token', (req, res) => {
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  const id = casework.verifyPreview(JWT_SECRET, req.params.token);
  const row = id && db.prepare('SELECT * FROM projects WHERE id=?').get(id);
  if (!row) return res.status(404).type('html').send(notFoundHtml);
  res.type('html').send(renderCasePage(row, true));
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nAllow: /\n\nSitemap: https://mast3kmedia.dk/sitemap.xml\n'
  );
});

const SITEMAP_PAGES = [
'/',
  '/ydelser.html',
  '/pris.html',
  '/arbejde.html',
  '/blog.html',
  '/kontakt.html',
  '/om.html',
  '/oss.html',
  '/saas.html',
  '/privatlivspolitik.html',
  '/ydelser/softwareudvikling.html',
  '/ydelser/saas-produkter.html',
  '/ydelser/ai-automatisering.html',
  '/ydelser/marketing-vaekst.html',
];

app.get('/sitemap.xml', (_req, res) => {
  const urls = SITEMAP_PAGES.map((page) => `<url><loc>${SITE_ORIGIN + page}</loc></url>`);
  const posts = db.prepare(
    "SELECT slug, updated_at FROM blog_posts WHERE status='published' ORDER BY slug"
  ).all();
  const projects = db.prepare(
    "SELECT slug, updated_at FROM projects WHERE status='published' ORDER BY slug"
  ).all();
  const cats = db.prepare(
    "SELECT slug FROM blog_categories ORDER BY slug"
  ).all();

  for (const post of posts) {
    const d = new Date(post.updated_at ? post.updated_at + 'Z' : new Date()).toISOString();
    urls.push(`<url><loc>${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}</loc><lastmod>${d}</lastmod></url>`);
  }
  for (const project of projects) {
    const d = new Date(project.updated_at ? project.updated_at + 'Z' : new Date()).toISOString();
    urls.push(`<url><loc>${SITE_ORIGIN}/arbejde/${encodeURIComponent(project.slug)}</loc><lastmod>${d}</lastmod></url>`);
  }
  for (const c of cats) {
    urls.push(`<url><loc>${SITE_ORIGIN}/blog/kategori/${encodeURIComponent(c.slug)}</loc></url>`);
  }
  urls.push(`<url><loc>${SITE_ORIGIN}/forfatter/tobias-mastek</loc></url>`);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  ${u}`),
    '</urlset>',
    '',
  ].join('\n');
  res.setHeader('Cache-Control', 'max-age=3600');
  res.type('application/xml').send(xml);
});

// Deny access to sensitive files and directories before the static handler
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  
  // Deny sensitive directories
  const blockedDirs = ['/db', '/logs', '/lib', '/test', '/docs', '/chats', '/project', '/mast3kmedia-repo-case', '/_ds', '/node_modules'];
  if (blockedDirs.some(dir => p === dir || p.startsWith(dir + '/'))) {
    return res.status(404).send('Not found');
  }
  
  // Deny root .js and specific extensions anywhere
  if (p === '/server.js' || p === '/mailer.js' || p === '/mcp-server.js') {
    return res.status(404).send('Not found');
  }
  
  const ext = path.extname(p);
  const blockedExts = ['.mjs', '.md', '.json', '.db', '.log', '.gz', '.toml', '.yaml'];
  if (blockedExts.includes(ext)) {
    return res.status(404).send('Not found');
  }
  
  next();
});

const notFoundHtml = fs.readFileSync(path.join(__dirname, '404.html'), 'utf8');

// Root static: HTML pages only (assets, uploads and admin have their own mounts), never dot-paths like /.git
const rootPages = express.static(__dirname, { dotfiles: 'ignore' });
app.use((req, res, next) => (req.path.endsWith('.html') ? rootPages(req, res, next) : next()));

// ── Auth endpoints ─────────────────────────────────────────────────────────────
const loginAttempts = new Map();

app.post('/api/auth/login', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, time: now };
  if (now - attempt.time > 15 * 60 * 1000) {
    attempt.count = 0;
    attempt.time = now;
  }
  if (attempt.count >= 5) {
    return res.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  if (username !== ADMIN_USER) {
    attempt.count++;
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Support plain-text env pw (dev) or bcrypt hash
  const ok = password === ADMIN_PASS ||
    (ADMIN_PASS.startsWith('$2') && bcrypt.compareSync(password, ADMIN_PASS));
  if (!ok) {
    attempt.count++;
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  loginAttempts.delete(ip);
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
      tags:          safeJSON(c.tags, []),
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
    project_type: clipLine(b.project_type || b.projectType, 240),
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
  const phone = clipLine(b.phone, 40);
  if (phone) metadata.phone = phone;

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
    // Best-effort owner notification — never let SMTP break the 201 the form expects.
    require('./mailer')
      .sendLeadNotification(lead)
      .catch((err) => console.error('lead notification email failed', err));
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
    blog_posts:     n('SELECT COUNT(*) n FROM blog_posts'),
    blog_published: n("SELECT COUNT(*) n FROM blog_posts WHERE status='published'"),
    blog_drafts:    n("SELECT COUNT(*) n FROM blog_posts WHERE status='draft'"),
    blog_categories:n('SELECT COUNT(*) n FROM blog_categories'),
  });
});

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'archived'];
const presentLead = (row) => ({ ...row, metadata: safeJSON(row.metadata, {}) });

function readPricingConfig() {
  const row = db.prepare("SELECT value FROM settings WHERE key='pricing'").get();
  if (!row) return pricingLib.defaultPricing();
  try {
    return pricingLib.normalizePricing(JSON.parse(row.value));
  } catch (e) {
    console.error('stored pricing config is invalid, using defaults', e.message);
    return pricingLib.defaultPricing();
  }
}

app.get('/api/pricing', (req, res) => {
  res.json(readPricingConfig());
});

app.get('/api/admin/leads', requireAuth, (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || '200', 10) || 200));
  const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(rows.map(presentLead));
});

app.patch('/api/admin/leads/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM leads WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const sets = [];
  const args = [];
  if (b.status !== undefined) {
    if (!LEAD_STATUSES.includes(b.status)) return res.status(400).json({ error: 'invalid status' });
    sets.push('status=?');
    args.push(b.status);
  }
  if (b.notes !== undefined) {
    sets.push('notes=?');
    args.push(clipText(b.notes, 4000) || null);
  }
  if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
  args.push(id);
  db.prepare('UPDATE leads SET ' + sets.join(', ') + ' WHERE id=?').run(...args);
  res.json(presentLead(db.prepare('SELECT * FROM leads WHERE id=?').get(id)));
});

app.delete('/api/admin/leads/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM leads WHERE id=?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

app.get('/api/admin/pricing', requireAuth, (req, res) => {
  res.json(readPricingConfig());
});

app.get('/api/admin/pricing/defaults', requireAuth, (req, res) => {
  res.json(pricingLib.defaultPricing());
});

app.put('/api/admin/pricing', requireAuth, (req, res) => {
  try {
    const config = pricingLib.normalizePricing(req.body || {});
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('pricing', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    `).run(JSON.stringify(config));
    res.json(config);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── Admin: media (raw binary body; images become webp, integrity + magic bytes checked) ──
const sendError = (res, e) =>
  res.status(e.status || 500).json({ error: e.message, ...(e.used_by && { used_by: e.used_by }) });

const rawUpload = express.raw({ type: () => true, limit: '64mb' });
app.post(
  '/api/admin/uploads',
  requireAuth,
  (req, res, next) => rawUpload(req, res, (e) => (e ? sendError(res, e) : next())),
  async (req, res) => {
    try {
      res.status(201).json(await casework.saveMedia(Buffer.isBuffer(req.body) ? req.body : null, {
        filename: req.headers['x-filename'],
        sha256: req.headers['x-content-sha256'],
      }));
    } catch (e) {
      sendError(res, e);
    }
  }
);

app.delete('/api/admin/uploads/:name', requireAuth, (req, res) => {
  try {
    res.json(casework.deleteMedia(db, req.params.name, { force: ['1', 'true'].includes(req.query.force) }));
  } catch (e) {
    sendError(res, e);
  }
});

// ── Admin: CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/projects', requireAuth, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC')
      .all().map(fmt)
  );
});

app.get('/api/admin/projects/schema', requireAuth, (req, res) => res.json(casework.describe()));

app.get('/api/admin/projects/:ref', requireAuth, (req, res) => {
  const row = casework.findProject(db, req.params.ref);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(fmt(row));
});

app.get('/api/admin/projects/:ref/validate', requireAuth, async (req, res, next) => {
  const row = casework.findProject(db, req.params.ref);
  if (!row) return res.status(404).json({ error: 'Not found' });
  try {
    res.json(await casework.validateProject(fmt(row), { remote: req.query.remote !== '0' }));
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/projects/:ref/preview', requireAuth, (req, res) => {
  const row = casework.findProject(db, req.params.ref);
  if (!row) return res.status(404).json({ error: 'Not found' });
  try {
    res.json(casework.signPreview(JWT_SECRET, row.id, (req.body || {}).hours));
  } catch (e) {
    sendError(res, e);
  }
});

app.post('/api/admin/projects', requireAuth, (req, res) => {
  try {
    res.status(201).json(casework.saveProject(db, req.body || {}));
  } catch (e) {
    sendError(res, e);
  }
});

app.put('/api/admin/projects/:id', requireAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  try {
    res.json(casework.saveProject(db, req.body || {}, old));
  } catch (e) {
    sendError(res, e);
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

// ── Public: blog ───────────────────────────────────────────────────────────────
app.get('/api/blog/categories', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM blog_categories ORDER BY name ASC'
  ).all().map(fmtCategory);
  res.json(rows);
});

app.get('/api/blog/posts', (req, res) => {
  const { category, page, limit } = req.query;
  const lim = Math.min(100, Math.max(1, parseInt(limit || '12', 10) || 12));
  const pg  = Math.max(1, parseInt(page || '1', 10) || 1);
  const offset = (pg - 1) * lim;

  let where = "WHERE p.status='published'";
  const args = [];
  if (category) {
    where += ' AND (c.slug=? OR c.name=?)';
    args.push(String(category), String(category));
  }

  const total = db.prepare(
    `SELECT COUNT(*) n FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id ${where}`
  ).get(...args).n;

  const rows = db.prepare(
    `${POST_SELECT} ${where} ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?`
  ).all(...args, lim, offset).map(fmtPost);

  res.json({ posts: rows, page: pg, limit: lim, total, pages: Math.ceil(total / lim) || 1 });
});

app.get('/api/blog/posts/:slug', (req, res) => {
  const row = db.prepare(
    `${POST_SELECT} WHERE p.slug=? AND p.status=?`
  ).get(req.params.slug, 'published');
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(fmtPost(row));
});

// ── Admin: blog categories ─────────────────────────────────────────────────────
app.get('/api/admin/blog/categories', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM blog_categories ORDER BY name ASC').all().map(fmtCategory));
});

app.post('/api/admin/blog/categories', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const slug = slugify(b.slug || b.name);
  try {
    const r = db.prepare(
      'INSERT INTO blog_categories (name, slug, description) VALUES (?,?,?)'
    ).run(b.name, slug, b.description || null);
    res.status(201).json(fmtCategory(db.prepare('SELECT * FROM blog_categories WHERE id=?').get(r.lastInsertRowid)));
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists` });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/blog/categories/:id', requireAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM blog_categories WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const slug = b.slug ? slugify(b.slug) : old.slug;
  try {
    db.prepare(
      'UPDATE blog_categories SET name=?, slug=?, description=? WHERE id=?'
    ).run(
      b.name ?? old.name,
      slug,
      b.description !== undefined ? b.description : old.description,
      req.params.id,
    );
    res.json(fmtCategory(db.prepare('SELECT * FROM blog_categories WHERE id=?').get(req.params.id)));
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists` });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/blog/categories/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM blog_categories WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ── Admin: blog posts ──────────────────────────────────────────────────────────
app.get('/api/admin/blog/posts', requireAuth, (req, res) => {
  const { status, category } = req.query;
  let sql = `${POST_SELECT} WHERE 1=1`;
  const args = [];
  if (status && ['draft', 'published'].includes(status)) {
    sql += ' AND p.status=?'; args.push(status);
  }
  if (category) {
    sql += ' AND (c.slug=? OR CAST(p.category_id AS TEXT)=?)';
    args.push(String(category), String(category));
  }
  sql += ' ORDER BY p.updated_at DESC, p.created_at DESC';
  res.json(db.prepare(sql).all(...args).map(fmtPost));
});

app.get('/api/admin/blog/posts/:id', requireAuth, (req, res) => {
  const row = db.prepare(`${POST_SELECT} WHERE p.id=?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(fmtPost(row));
});

app.post('/api/admin/blog/posts', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'title is required' });
  const slug = slugify(b.slug || b.title);
  const status = b.status === 'published' ? 'published' : 'draft';
  const categoryId = b.category_id != null && b.category_id !== ''
    ? parseInt(b.category_id, 10) : null;
  const publishedAt = status === 'published'
    ? (b.published_at || new Date().toISOString().slice(0, 19).replace('T', ' '))
    : (b.published_at || null);
  const tagsJson = b.tags !== undefined ? JSON.stringify(Array.isArray(b.tags) ? b.tags : []) : '[]';
  try {
    const r = db.prepare(`
      INSERT INTO blog_posts
        (title, slug, excerpt, body, cover_image, seo_title, seo_description, cover_alt, status, category_id, published_at, author, tags)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      b.title, slug,
      b.excerpt || null,
      b.body || null,
      b.cover_image || null,
      b.seo_title || null,
      b.seo_description || null,
      b.cover_alt || null,
      status,
      Number.isFinite(categoryId) ? categoryId : null,
      publishedAt,
      b.author || null,
      tagsJson,
    );
    res.status(201).json(fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(r.lastInsertRowid)));
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists — choose another` });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/blog/posts/:id', requireAuth, (req, res) => {
  const old = db.prepare('SELECT * FROM blog_posts WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const slug = b.slug ? slugify(b.slug) : old.slug;
  const status = ['draft', 'published'].includes(b.status) ? b.status : old.status;
  let categoryId = old.category_id;
  if (b.category_id !== undefined) {
    if (b.category_id === null || b.category_id === '') categoryId = null;
    else {
      const n = parseInt(b.category_id, 10);
      categoryId = Number.isFinite(n) ? n : null;
    }
  }
  let publishedAt = old.published_at;
  if (b.published_at !== undefined) publishedAt = b.published_at || null;
  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  if (status === 'draft' && b.clear_published) publishedAt = null;
  let tags = old.tags;
  if (b.tags !== undefined) {
    tags = JSON.stringify(Array.isArray(b.tags) ? b.tags : []);
  }

  try {
    db.prepare(`
      UPDATE blog_posts SET
        title=?, slug=?, excerpt=?, body=?, cover_image=?,
        seo_title=?, seo_description=?, cover_alt=?,
        status=?, category_id=?, published_at=?, author=?, tags=?
      WHERE id=?
    `).run(
      b.title ?? old.title,
      slug,
      b.excerpt !== undefined ? b.excerpt : old.excerpt,
      b.body !== undefined ? b.body : old.body,
      b.cover_image !== undefined ? b.cover_image : old.cover_image,
      b.seo_title !== undefined ? b.seo_title : old.seo_title,
      b.seo_description !== undefined ? b.seo_description : old.seo_description,
      b.cover_alt !== undefined ? b.cover_alt : old.cover_alt,
      status,
      categoryId,
      publishedAt,
      b.author !== undefined ? b.author : old.author,
      tags,
      req.params.id,
    );
    res.json(fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(req.params.id)));
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: `Slug "${slug}" already exists — choose another` });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/blog/posts/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM blog_posts WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.patch('/api/admin/blog/posts/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!['draft', 'published'].includes(status))
    return res.status(400).json({ error: 'status must be draft or published' });
  const old = db.prepare('SELECT * FROM blog_posts WHERE id=?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const publishedAt = status === 'published'
    ? (old.published_at || new Date().toISOString().slice(0, 19).replace('T', ' '))
    : old.published_at;
  db.prepare('UPDATE blog_posts SET status=?, published_at=? WHERE id=?')
    .run(status, publishedAt, req.params.id);
  res.json(fmtPost(db.prepare(`${POST_SELECT} WHERE p.id=?`).get(req.params.id)));
});

// ── MCP (Streamable HTTP) + Start ─────────────────────────────────────────────
async function start() {
  const { mountMcpHttp } = await import('./lib/mcp-http.mjs');
  const { path: mcpPath } = mountMcpHttp(app, {
    db,
    mcpAuthToken: MCP_AUTH_TOKEN,
    jwtSecret: JWT_SECRET,
    path: '/mcp',
  });

  // Registered last so they never shadow the API routes or /mcp above.
  app.use((req, res) => {
    res.status(404).type('html').send(notFoundHtml);
  });

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (res.headersSent) return next(err);
    res.status(500).type('html').send(notFoundHtml.replace('Siden findes <span class="lime">ikke</span>.', 'Der skete en <span class="lime">fejl</span>.').replace('404', '500'));
  });

  refreshCommitsThisYear();

  app.listen(PORT, () => {
    const W = 48;
    const line = '─'.repeat(W);
    console.log(`\n  ┌${line}┐`);
    console.log(`  │  Mast3kMedia${' '.repeat(W - 13)}│`);
    console.log(`  ├${line}┤`);
    console.log(`  │  Site   →  http://localhost:${PORT}${' '.repeat(W - 26 - PORT.toString().length)}│`);
    console.log(`  │  Admin  →  http://localhost:${PORT}/admin${' '.repeat(W - 32 - PORT.toString().length)}│`);
    console.log(`  │  API    →  http://localhost:${PORT}/api/projects${' '.repeat(W - 38 - PORT.toString().length)}│`);
    console.log(`  │  MCP    →  http://localhost:${PORT}${mcpPath}${' '.repeat(Math.max(0, W - 26 - PORT.toString().length - mcpPath.length))}│`);
    console.log(`  └${line}┘`);
    console.log(`\n  Login: ${ADMIN_USER} / [set via ADMIN_PASS]`);
    if (MCP_AUTH_TOKEN) {
      console.log(`  MCP auth: MCP_AUTH_TOKEN is set (Bearer)`);
    } else {
      console.log(`  MCP auth: admin JWT accepted; set MCP_AUTH_TOKEN for a dedicated bot token`);
    }
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});