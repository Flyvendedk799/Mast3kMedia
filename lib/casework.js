'use strict';

// Shared project/casework logic for the REST API (server.js) and MCP (lib/mcp-app.mjs):
// field schema, create/update, media upload + delete, preview tokens and validation.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const SITE_ORIGIN = 'https://mast3kmedia.dk';
const ROOT = path.join(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

const CATEGORIES = ['Software', 'SaaS', 'AI', 'Marketing', 'Fintech', 'E-commerce', 'App', 'Design', 'Andet'];
const INDUSTRIES = ['SaaS', 'FinTech', 'E-commerce', 'AI', 'Healthcare', 'Logistik', 'Uddannelse', 'Medie', 'Andet'];
const MEDIA_TYPES = ['image', 'video', 'embed'];
const MEDIA_ROLES = ['hero', 'gallery', 'feature', 'before', 'after', 'device-desktop', 'device-mobile', 'demo'];
const MEDIA_PROVIDERS = ['file', 'mp4', 'youtube', 'vimeo'];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 2560;
const PREVIEW_DEFAULT_HOURS = 24;
const PREVIEW_MAX_HOURS = 168;

const MEDIA_ITEM = {
  type: `${MEDIA_TYPES.join('|')} (default image)`,
  url: 'string, required',
  alt: 'string, Danish alt text (required for images)',
  caption: 'string, Danish caption',
  role: `${MEDIA_ROLES.join('|')} (default gallery)`,
  provider: `${MEDIA_PROVIDERS.join('|')} (inferred from url when absent)`,
  poster: 'string, poster image url for video/embed',
};

// Labels, hints and questions are the ones shown in the admin project form.
const FIELDS = {
  title: { type: 'string', required: true, recommended_max: 60, label: 'Titel' },
  slug: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', label: 'Slug', hint: 'Auto-genereret fra titel. Dansk ASCII: æ=ae, ø=oe, å=aa' },
  category: { type: 'string', required: true, enum: CATEGORIES, default: 'Software', label: 'Kategori' },
  year: { type: 'integer', required: true, min: 2000, max: 2099, label: 'År' },
  client: { type: 'string', label: 'Kunde' },
  sort_order: { type: 'integer', default: 0, label: 'Sorteringsrækkefølge' },
  subtitle: { type: 'string', recommended_max: 90, label: 'Undertitel / Tagline', hint: 'Kort slagord under overskriften' },
  industry: { type: 'string', enum: INDUSTRIES, label: 'Branche' },
  role_scope: { type: 'string', label: 'Vores rolle', hint: 'f.eks. Lead agency eller Design partner' },
  deliverables: { type: 'string', label: 'Leverancer', hint: 'f.eks. Web App · Design System · API' },
  timeline: { type: 'string', label: 'Tidslinje / Varighed', hint: 'f.eks. 9 uger eller Q1 2026' },
  services: { type: 'string', label: 'Ydelser', hint: 'f.eks. Strategi · Design · Engineering' },
  featured: { type: 'boolean', default: false, label: 'Featured på forsiden' },
  status: { type: 'string', enum: ['draft', 'published'], default: 'draft', label: 'Status' },
  description: { type: 'string', required: true, recommended_max: 160, label: 'Kort beskrivelse', hint: 'Vises på projektkortet og som meta description', question: 'En kortfattet beskrivelse til projektlisten og kortet.' },
  long_description: { type: 'string', required: true, label: 'Intro / lead', hint: 'Åbner case-siden', question: 'Den lidt længere intro der vises øverst på case-siden.' },
  challenge: { type: 'string', recommended: true, label: 'Udfordringen', hint: 'Venstre kolonne på case-siden', question: 'Hvad var problemet eller udfordringen?' },
  approach: { type: 'string', recommended: true, label: 'Tilgangen', hint: 'Højre kolonne på case-siden', question: 'Hvordan løste vi det?' },
  results: { type: 'string', recommended: true, label: 'Resultater', hint: 'Beskriv de konkrete resultater og forretningsmæssig effekt', question: 'Hvad opnåede projektet? Beskriv den konkrete effekt.' },
  tags: { type: 'string[]', recommended: true, label: 'Tags', hint: 'Kategori-labels (SaaS · Dashboard)' },
  tech_stack: { type: 'string[]', recommended: true, label: 'Tech stack', hint: 'Teknologier der vises i bunden af casen' },
  metrics: { type: 'object[]', shape: { value: 'string', label: 'string' }, label: 'Nøgletal', hint: 'Tal der vises i metrics-båndet på case-siden. Kun dokumenterede tal.' },
  testimonial_text: { type: 'string', label: 'Citat', hint: 'Citat fra kunden. Kun ægte citater.' },
  testimonial_author: { type: 'string', label: 'Navn' },
  testimonial_role: { type: 'string', label: 'Rolle' },
  client_logo: { type: 'url', label: 'Kundelogo URL', hint: 'SVG eller PNG logo til testimonial og faktaark' },
  thumbnail_url: { type: 'url', required: true, label: 'Thumbnail URL', hint: 'Cover til projektkortet og hero-fallback' },
  case_url: { type: 'url', label: 'Case URL', hint: 'Link til live projekt (valgfrit)' },
  og_image: { type: 'url', recommended: true, label: 'OG-billede URL', hint: 'Social sharing billede (1200×630). Bruger thumbnail hvis tom.' },
  media: { type: 'object[]', shape: MEDIA_ITEM, label: 'Case media' },
  blocks: { type: 'object[]', shape: '{ type, id?, ...fields } see blocks', label: 'Layout & blokke' },
  team: { type: 'object[]', shape: { name: 'string', role: 'string' }, label: 'Team' },
  awards: { type: 'object[]', shape: { title: 'string', org: 'string?' }, label: 'Anerkendelser' },
};

const BLOCKS = {
  richtext: { eyebrow: 'string?', title: 'string?', body: 'string, required (markdown-lite: **bold**, line breaks)' },
  timeline: { title: 'string?', phases: [{ label: 'string', title: 'string, required', body: 'string?', date: 'string?' }] },
  gallery: { title: 'string?', layout: 'grid|masonry', items: ['media item, required'] },
  video: { title: 'string?', items: ['media item (type video or embed), required'] },
  before_after: { title: 'string?', before: { url: 'string, required', label: 'string (used as alt)' }, after: { url: 'string, required', label: 'string (used as alt)' } },
  metrics: { title: 'string?', items: [{ value: 'string, required', label: 'string, required' }] },
  quote: { text: 'string, required', author: 'string?', role: 'string?' },
  embed: { provider: 'youtube|vimeo', url: 'string, required (embed url: youtube.com/embed/… or player.vimeo.com/video/…)', caption: 'string?' },
};

const TEXT_FIELDS = ['description', 'long_description', 'challenge', 'approach', 'client', 'testimonial_text',
  'testimonial_author', 'testimonial_role', 'thumbnail_url', 'case_url', 'timeline', 'services', 'results',
  'subtitle', 'client_logo', 'industry', 'deliverables', 'role_scope', 'og_image'];
const JSON_FIELDS = ['tags', 'tech_stack', 'metrics', 'media', 'blocks', 'team', 'awards'];
const COLUMNS = ['title', 'slug', 'category', 'year', 'status', 'featured', 'sort_order', ...TEXT_FIELDS, ...JSON_FIELDS];

const describe = () => ({
  required_to_create: ['title'],
  required_to_publish: Object.keys(FIELDS).filter(k => FIELDS[k].required),
  fields: FIELDS,
  categories: CATEGORIES,
  industries: INDUSTRIES,
  media: { item: MEDIA_ITEM, types: MEDIA_TYPES, roles: MEDIA_ROLES, providers: MEDIA_PROVIDERS },
  blocks: BLOCKS,
  upload: {
    image_types: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'],
    video_types: ['video/mp4', 'video/webm'],
    max_image_bytes: MAX_IMAGE_BYTES,
    max_video_bytes: MAX_VIDEO_BYTES,
    image_output: `webp, max ${MAX_IMAGE_WIDTH}px wide`,
    integrity: 'optional sha256 (hex) and bytes of the original file; magic bytes are always checked',
  },
  preview: { default_hours: PREVIEW_DEFAULT_HOURS, max_hours: PREVIEW_MAX_HOURS },
});

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const safeJSON = (val, fb) => { try { return val ? JSON.parse(val) : fb; } catch { return fb; } };

const fmt = (row) => ({
  ...row,
  ...Object.fromEntries(JSON_FIELDS.map(k => [k, safeJSON(row[k], [])])),
  featured: row.featured === 1,
});

const httpError = (status, message, extra) => Object.assign(new Error(message), { status }, extra);

const findProject = (db, ref) => {
  if (/^\d+$/.test(String(ref))) {
    const byId = db.prepare('SELECT * FROM projects WHERE id=?').get(Number(ref));
    if (byId) return byId;
  }
  return db.prepare('SELECT * FROM projects WHERE slug=?').get(String(ref));
};

// Insert (no `old`) or partially update (`old` row): omitted fields keep their stored value.
function saveProject(db, b, old) {
  const o = old || {};
  const slug = slugify(b.new_slug || b.slug || o.slug || b.title || '');
  const values = {
    title: b.title || o.title,
    slug,
    category: b.category || o.category || 'Software',
    year: b.year || o.year || new Date().getFullYear(),
    status: ['draft', 'published'].includes(b.status) ? b.status : (o.status || 'draft'),
    featured: b.featured !== undefined ? (b.featured ? 1 : 0) : (o.featured || 0),
    sort_order: b.sort_order !== undefined ? (b.sort_order || 0) : (o.sort_order || 0),
  };
  for (const k of TEXT_FIELDS) values[k] = b[k] !== undefined ? (b[k] || null) : (o[k] ?? null);
  for (const k of JSON_FIELDS) values[k] = Array.isArray(b[k]) ? JSON.stringify(b[k]) : (o[k] || '[]');
  if (!values.title) throw httpError(400, 'title is required');
  if (!slug) throw httpError(400, 'slug could not be derived from title');

  const args = COLUMNS.map(c => values[c]);
  let id = o.id;
  try {
    if (old) db.prepare(`UPDATE projects SET ${COLUMNS.map(c => `${c}=?`).join(',')} WHERE id=?`).run(...args, id);
    else id = db.prepare(`INSERT INTO projects (${COLUMNS.join(',')}) VALUES (${COLUMNS.map(() => '?').join(',')})`).run(...args).lastInsertRowid;
  } catch (e) {
    if (e.message.includes('UNIQUE')) throw httpError(409, `Slug "${slug}" already exists, choose another`);
    throw e;
  }
  return fmt(db.prepare('SELECT * FROM projects WHERE id=?').get(id));
}

// ── Media ──────────────────────────────────────────────────────────────────────
function sniffMime(buf) {
  const ascii = (a, b) => buf.toString('latin1', a, b);
  if (buf.length < 12) return null;
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (/^GIF8[79]a$/.test(ascii(0, 6))) return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (buf.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (['heic', 'heix', 'mif1', 'msf1', 'qt  '].includes(brand)) return null;
    return 'video/mp4';
  }
  return null;
}

// Walks the top-level MP4 boxes: a truncated file ends mid-box or lacks `moov`.
function mp4Complete(buf) {
  let off = 0;
  let moov = false;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    if (size === 1) size = off + 16 <= buf.length ? Number(buf.readBigUInt64BE(off + 8)) : 0;
    else if (size === 0) size = buf.length - off;
    if (size < 8) return false;
    if (buf.toString('latin1', off + 4, off + 8) === 'moov') moov = true;
    off += size;
  }
  return moov && off === buf.length;
}

function decodeBase64(data) {
  const s = String(data || '').replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '');
  if (!s || s.length % 4 === 1 || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(s)) {
    throw httpError(400, 'data is not valid base64');
  }
  return Buffer.from(s, 'base64');
}

async function saveMedia(buf, { filename = '', sha256, bytes, dir = UPLOAD_DIR } = {}) {
  if (!buf || !buf.length) throw httpError(400, 'Empty file');
  if (bytes !== undefined && bytes !== null && buf.length !== Number(bytes)) {
    throw httpError(422, `Size mismatch: received ${buf.length} bytes, expected ${bytes}. The upload is truncated or corrupt.`);
  }
  const digest = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha256 && digest !== String(sha256).trim().toLowerCase()) {
    throw httpError(422, `sha256 mismatch: received ${digest}, expected ${sha256}. The upload is corrupt.`);
  }
  const mime = sniffMime(buf);
  if (!mime) throw httpError(415, 'Unsupported or corrupt file: expected PNG, JPEG, GIF, WebP, AVIF, MP4 or WebM');
  const kind = mime.split('/')[0];
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buf.length > max) throw httpError(413, `${kind} is ${buf.length} bytes, max is ${max}`);

  const out = { type: kind, mime, source_bytes: buf.length, source_sha256: digest };
  let data = buf;
  let ext = mime === 'video/webm' ? 'webm' : 'mp4';
  if (kind === 'image') {
    try {
      const res = await sharp(buf, { animated: true })
        .rotate()
        .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      data = res.data;
      ext = 'webp';
      out.mime = 'image/webp';
      out.width = res.info.width;
      out.height = res.info.pageHeight || res.info.height;
    } catch (e) {
      throw httpError(422, `Image could not be decoded, it is corrupt or truncated (${e.message})`);
    }
  } else if (mime === 'video/mp4' && !mp4Complete(buf)) {
    throw httpError(422, 'MP4 is truncated or has no moov box');
  }

  const name = `${slugify(path.parse(String(filename)).name).slice(0, 60) || 'upload'}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), data);
  return { url: `${SITE_ORIGIN}/uploads/${name}`, path: `/uploads/${name}`, name, ...out, bytes: data.length };
}

const mediaName = (ref) => {
  const name = path.basename(String(ref || '').split(/[?#]/)[0]);
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) throw httpError(400, 'Invalid media name');
  return name;
};

function findMediaUsage(db, name) {
  const needle = `/uploads/${name}`;
  const scan = (type, rows) => rows.flatMap((row) => {
    const fields = Object.keys(row).filter(k => typeof row[k] === 'string' && row[k].includes(needle));
    return fields.length ? [{ type, id: row.id, slug: row.slug, title: row.title, status: row.status, fields }] : [];
  });
  return [
    ...scan('project', db.prepare('SELECT * FROM projects').all()),
    ...scan('post', db.prepare('SELECT * FROM blog_posts').all()),
  ];
}

function deleteMedia(db, ref, { force = false, dir = UPLOAD_DIR } = {}) {
  const name = mediaName(ref);
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) throw httpError(404, `No upload named ${name}`);
  const used_by = findMediaUsage(db, name);
  if (used_by.length && !force) {
    throw httpError(409, `${name} is still used by ${used_by.length} item(s). Remove the references or pass force to delete anyway.`, { used_by });
  }
  fs.unlinkSync(file);
  return { deleted: true, name, used_by };
}

// ── Preview tokens ─────────────────────────────────────────────────────────────
// Derived key, so a preview link can never pass as an admin/MCP JWT signed with the raw secret.
const previewKey = (secret) => crypto.createHmac('sha256', String(secret)).update('case-preview').digest('hex');

function signPreview(secret, projectId, hours = PREVIEW_DEFAULT_HOURS) {
  if (!secret) throw httpError(500, 'JWT_SECRET is not configured');
  const ttl = Math.round(Math.min(Math.max(Number(hours) || PREVIEW_DEFAULT_HOURS, 0.05), PREVIEW_MAX_HOURS) * 3600);
  const token = jwt.sign({ pid: projectId }, previewKey(secret), { expiresIn: ttl });
  const previewPath = `/arbejde/preview/${token}`;
  return { url: SITE_ORIGIN + previewPath, path: previewPath, expires_at: new Date(Date.now() + ttl * 1000).toISOString() };
}

function verifyPreview(secret, token) {
  try {
    return jwt.verify(String(token), previewKey(secret), { algorithms: ['HS256'] }).pid;
  } catch {
    return null;
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────
const DASH = /[\u2013\u2014]|(^|\s)--(\s|$)/;
const ENGLISH = /\b(the|and|with|of|showing|screenshot|image of)\b/i;
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

function localFile(url, root) {
  const u = String(url).startsWith(SITE_ORIGIN + '/') ? url.slice(SITE_ORIGIN.length) : url;
  if (!/^\/(uploads|assets)\//.test(u)) return null;
  const file = path.resolve(root, '.' + decodeURIComponent(u.split(/[?#]/)[0]));
  return file.startsWith(root + path.sep) ? file : '';
}

async function checkRemote(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
    return res.status;
  } catch {
    return 0;
  }
}

async function validateProject(p, { root = ROOT, remote = true } = {}) {
  const errors = [];
  const warnings = [];
  const add = (list, field, code, message) => list.push({ field, code, message });
  const urls = [];
  const url = (field, value) => { if (value) urls.push([field, String(value)]); };
  const text = (field, value) => {
    if (typeof value === 'string' && DASH.test(value)) add(warnings, field, 'dash', 'Contains an em dash, en dash or "--"; rewrite with commas, periods or parentheses');
  };
  const visual = (field, item, fallbackAlt) => {
    const alt = item.alt || fallbackAlt;
    if (!alt && !item.caption) add(errors, field, 'alt_missing', 'Image needs Danish alt text');
    else if (!alt) add(warnings, field, 'alt_missing', 'No alt text; the caption is used as alt');
    else if (ENGLISH.test(alt)) add(warnings, field, 'alt_not_danish', `Alt text looks English: "${alt}"`);
    if (!item.caption) add(warnings, field, 'caption_missing', 'No Danish caption');
  };
  const mediaItem = (field, m) => {
    if (!m || !m.url) return add(errors, field, 'url_missing', 'Media item has no url');
    if (m.type && !MEDIA_TYPES.includes(m.type)) add(errors, field, 'invalid_type', `type must be one of ${MEDIA_TYPES.join(', ')}`);
    if (m.role && !MEDIA_ROLES.includes(m.role)) add(errors, field, 'invalid_role', `role must be one of ${MEDIA_ROLES.join(', ')}`);
    if (m.provider && !MEDIA_PROVIDERS.includes(m.provider)) add(errors, field, 'invalid_provider', `provider must be one of ${MEDIA_PROVIDERS.join(', ')}`);
    if (!m.type || m.type === 'image') visual(field, m);
    else if (!m.caption) add(warnings, field, 'caption_missing', 'No Danish caption');
    text(`${field}.alt`, m.alt);
    text(`${field}.caption`, m.caption);
    url(`${field}.url`, m.url);
    url(`${field}.poster`, m.poster);
  };

  for (const [k, f] of Object.entries(FIELDS)) {
    const v = p[k];
    if (isEmpty(v)) {
      if (f.required) add(errors, k, 'required', `${f.label} (${k}) is required to publish`);
      else if (f.recommended) add(warnings, k, 'recommended', `${f.label} (${k}) is empty`);
      continue;
    }
    if (f.recommended_max && String(v).length > f.recommended_max) add(warnings, k, 'too_long', `${k} is ${String(v).length} characters, recommended max ${f.recommended_max}`);
    if (f.enum && !f.enum.includes(v)) add(k === 'status' ? errors : warnings, k, 'not_in_list', `${k} "${v}" is not one of ${f.enum.join(', ')}`);
    if (f.type === 'string') text(k, v);
    if (f.type === 'string[]') v.forEach((s, i) => text(`${k}[${i}]`, s));
  }
  if (p.slug && !new RegExp(FIELDS.slug.pattern).test(p.slug)) add(errors, 'slug', 'invalid_slug', 'Slug must be lowercase Danish ASCII (æ=ae, ø=oe, å=aa) joined by single hyphens');
  if (p.year && (p.year < FIELDS.year.min || p.year > FIELDS.year.max)) add(errors, 'year', 'out_of_range', `year must be ${FIELDS.year.min} to ${FIELDS.year.max}`);
  if (p.testimonial_text && !p.testimonial_author) add(errors, 'testimonial_author', 'required', 'A testimonial needs its real author');
  (p.metrics || []).forEach((m, i) => { if (!m || !m.value || !m.label) add(errors, `metrics[${i}]`, 'incomplete', 'Metric needs value and label'); else text(`metrics[${i}].label`, m.label); });
  (p.team || []).forEach((m, i) => { if (!m || !m.name) add(errors, `team[${i}]`, 'incomplete', 'Team member needs a name'); });
  (p.awards || []).forEach((m, i) => { if (!m || !m.title) add(errors, `awards[${i}]`, 'incomplete', 'Award needs a title'); });
  if (!p.og_image && !p.thumbnail_url) add(errors, 'og_image', 'required', 'No og_image and no thumbnail_url to fall back on');
  if (isEmpty(p.media)) add(warnings, 'media', 'recommended', 'No case media; the page only shows the thumbnail');
  if (p.case_url && !/^https?:\/\//.test(p.case_url)) add(errors, 'case_url', 'invalid_url', 'case_url must be an absolute http(s) URL');
  url('thumbnail_url', p.thumbnail_url);
  url('og_image', p.og_image);
  url('client_logo', p.client_logo);
  if (/^https?:\/\//.test(p.case_url || '')) url('case_url', p.case_url);

  (p.media || []).forEach((m, i) => mediaItem(`media[${i}]`, m));

  (p.blocks || []).forEach((b, i) => {
    const f = `blocks[${i}]`;
    if (!b || !BLOCKS[b.type]) return add(errors, f, 'invalid_block', `Unknown block type "${b && b.type}"; use ${Object.keys(BLOCKS).join(', ')}`);
    ['title', 'eyebrow', 'body', 'text', 'caption'].forEach(k => text(`${f}.${k}`, b[k]));
    const need = (cond, key, msg) => { if (!cond) add(errors, `${f}.${key}`, 'required', msg); };
    switch (b.type) {
      case 'richtext': need(b.body, 'body', 'richtext block needs body'); break;
      case 'quote': need(b.text, 'text', 'quote block needs text'); break;
      case 'timeline':
        need(Array.isArray(b.phases) && b.phases.length, 'phases', 'timeline block needs phases');
        (b.phases || []).forEach((ph, j) => { need(ph && ph.title, `phases[${j}].title`, 'phase needs a title'); text(`${f}.phases[${j}].body`, ph && ph.body); });
        break;
      case 'gallery':
      case 'video':
        need(Array.isArray(b.items) && b.items.length, 'items', `${b.type} block needs items`);
        (b.items || []).forEach((m, j) => mediaItem(`${f}.items[${j}]`, { type: b.type === 'video' ? 'video' : 'image', ...m }));
        break;
      case 'metrics':
        need(Array.isArray(b.items) && b.items.length, 'items', 'metrics block needs items');
        (b.items || []).forEach((m, j) => need(m && m.value && m.label, `items[${j}]`, 'metric needs value and label'));
        break;
      case 'before_after':
        ['before', 'after'].forEach((side) => {
          const s = b[side] || {};
          need(s.url, `${side}.url`, `before_after block needs ${side}.url`);
          if (!s.label) add(warnings, `${f}.${side}.label`, 'alt_missing', `${side}.label is used as Danish alt text`);
          url(`${f}.${side}.url`, s.url);
        });
        break;
      case 'embed':
        need(b.url, 'url', 'embed block needs url');
        if (b.provider && !['youtube', 'vimeo'].includes(b.provider)) add(errors, `${f}.provider`, 'invalid_provider', 'embed provider must be youtube or vimeo');
        if (b.url && !/youtube\.com\/embed\/|player\.vimeo\.com\/video\//.test(b.url)) add(warnings, `${f}.url`, 'not_embed_url', 'Use an embed URL (youtube.com/embed/ID or player.vimeo.com/video/ID); watch URLs do not load in the iframe');
        url(`${f}.url`, b.url);
        break;
    }
  });

  await Promise.all(urls.map(async ([field, u]) => {
    if (u.startsWith('data:')) return add(warnings, field, 'data_url', 'Inline data URL; upload the file and use its /uploads URL');
    const file = localFile(u, root);
    if (file !== null) {
      if (!file || !fs.existsSync(file)) add(errors, field, 'missing_file', `${u} does not exist on disk`);
      return;
    }
    if (!/^https?:\/\//.test(u)) return add(errors, field, 'invalid_url', `${u} is not an absolute URL or /uploads path`);
    if (u.startsWith('http:')) add(warnings, field, 'insecure_url', `${u} is not https`);
    if (!remote) return;
    const status = await checkRemote(u);
    if (status === 404 || status === 410) add(errors, field, 'broken_url', `${u} returned HTTP ${status}`);
    else if (!status || status >= 400) add(warnings, field, 'unreachable_url', `${u} ${status ? `returned HTTP ${status}` : 'could not be reached'}`);
  }));

  return { ok: errors.length === 0, project: { id: p.id, slug: p.slug, status: p.status }, errors, warnings, checked_urls: urls.length };
}

module.exports = {
  SITE_ORIGIN,
  UPLOAD_DIR,
  describe,
  slugify,
  safeJSON,
  fmt,
  findProject,
  saveProject,
  decodeBase64,
  saveMedia,
  findMediaUsage,
  deleteMedia,
  previewKey,
  signPreview,
  verifyPreview,
  validateProject,
};
