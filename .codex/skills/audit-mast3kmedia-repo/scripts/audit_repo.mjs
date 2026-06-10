#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROJECT_FIELDS = [
  'title',
  'slug',
  'category',
  'description',
  'long_description',
  'challenge',
  'approach',
  'tags',
  'tech_stack',
  'client',
  'year',
  'status',
  'featured',
  'sort_order',
  'metrics',
  'testimonial_text',
  'testimonial_author',
  'testimonial_role',
  'thumbnail_url',
  'case_url',
];

const REQUIRED_MCP_TOOLS = [
  'list_projects',
  'get_project',
  'get_stats',
  'create_project',
  'update_project',
  'delete_project',
  'publish_project',
  'unpublish_project',
  'set_featured',
  'reorder_projects',
  'bulk_import',
];

const DESTINATION_FILES = [
  'mcp-server.mjs',
  '.mcp.json',
  '.codex/config.toml',
  'server.js',
  'admin/index.html',
  'admin/admin.js',
  'admin/admin.css',
  'index.html',
  'arbejde.html',
  'case.html',
];

const ADMIN_FIELD_IDS = {
  title: ['fieldTitle'],
  slug: ['fieldSlug'],
  category: ['fieldCategory'],
  description: ['fieldDescription'],
  long_description: ['fieldLongDesc'],
  challenge: ['fieldChallenge'],
  approach: ['fieldApproach'],
  tags: ['tagsInput', 'tagsDisplay', 'fieldTags'],
  tech_stack: ['techInput', 'techDisplay', 'fieldTech'],
  client: ['fieldClient'],
  year: ['fieldYear'],
  featured: ['fieldFeatured'],
  sort_order: ['fieldSortOrder'],
  metrics: ['metricsRows', 'addMetricBtn'],
  testimonial_text: ['fieldTestiText'],
  testimonial_author: ['fieldTestiAuthor'],
  testimonial_role: ['fieldTestiRole'],
  thumbnail_url: ['fieldThumb', 'thumbPreview'],
  case_url: ['fieldCaseUrl'],
};

function parseArgs(argv) {
  const args = {
    target: null,
    portfolioRoot: process.cwd(),
    productionUrl: process.env.MAST3KMEDIA_PRODUCTION_URL || 'https://mast3kmedia.dk',
    output: null,
    adminUser: process.env.MAST3KMEDIA_ADMIN_USER || 'admin',
    adminPass: process.env.MAST3KMEDIA_ADMIN_PASS || 'abe12345',
    draft: false,
    featured: true,
    production: true,
    noBrowser: false,
    headed: false,
    port: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--portfolio-root') args.portfolioRoot = argv[++i];
    else if (arg === '--production-url') args.productionUrl = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--admin-user') args.adminUser = argv[++i];
    else if (arg === '--admin-pass') args.adminPass = argv[++i];
    else if (arg === '--draft') args.draft = true;
    else if (arg === '--featured') args.featured = true;
    else if (arg === '--not-featured') args.featured = false;
    else if (arg === '--local-only' || arg === '--no-production') args.production = false;
    else if (arg === '--no-browser') args.noBrowser = true;
    else if (arg === '--headed') args.headed = true;
    else if (arg === '--port') args.port = Number(argv[++i]);
    else if (!args.target) args.target = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.target) throw new Error('Usage: audit_repo.mjs <repo-url-or-path>');
  args.portfolioRoot = path.resolve(args.portfolioRoot);
  return args;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function isRepoUrl(value) {
  return /^(https?:\/\/|git@|ssh:\/\/)/.test(value);
}

function repoParts(target) {
  const match = String(target).match(/github\.com[:/]([^/]+)\/([^/.#?]+)(?:\.git)?/i);
  if (!match) return { owner: null, repo: path.basename(String(target)).replace(/\.git$/, '') };
  return { owner: match[1], repo: match[2] };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

function runCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120000;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      const result = { code, stdout, stderr, command: `${command} ${args.join(' ')}` };
      if (code === 0 || options.allowFailure) resolve(result);
      else reject(new Error(`${result.command} failed with ${code}\n${stderr || stdout}`));
    });
  });
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function makeCheck(checks, id, label, passed, details = {}, severity = 'error') {
  const check = { id, label, passed: Boolean(passed), severity, details };
  checks.push(check);
  return check;
}

function slugify(value) {
  return String(value).toLowerCase().trim()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromRepoName(name) {
  return String(name || 'Project')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

const TAG_DA = new Map([
  ['E-commerce', 'E-commerce'],
  ['SaaS', 'SaaS'],
  ['Web', 'Web'],
  ['Software', 'Software'],
  ['Rental', 'Udlejning'],
  ['Booking', 'Booking'],
  ['Payments', 'Betaling'],
  ['Admin', 'Admin'],
  ['Calendar', 'Kalender'],
  ['Delivery', 'Levering'],
  ['Email', 'E-mail'],
]);

const FEATURE_DA = new Map([
  ['Product Catalog', 'produktkatalog med kategorier, søgning og filtrering'],
  ['Product Details', 'produktsider med billeder og tilgængelighedstjek'],
  ['Availability Calendar', 'visuel kalender til ledighed og bookingperioder'],
  ['Interactive Calendar', 'interaktiv kalender med ledighedstjek for valgte datoer'],
  ['Shopping Cart', 'kurv med datoer, antal og flere produkter'],
  ['Checkout', 'checkout-flow med betaling'],
  ['Payment Processing', 'betalingsflow via Stripe'],
  ['Order Confirmation', 'ordrebekræftelse og faktura-download'],
  ['Customer Portal', 'kundeportal med login, bookinghistorik og status'],
  ['Responsive Design', 'responsivt interface til mobil og desktop'],
  ['Dashboard', 'dashboard med bookinger, omsætning og driftsoverblik'],
  ['Product Management', 'produktstyring med kategorier, billeder og lagerdata'],
  ['Booking Management', 'bookingstyring med status og kundehistorik'],
  ['Customer Management', 'kundestyring med konti og bookinghistorik'],
  ['Calendar View', 'kalendervisning for alle bookinger'],
  ['Upsell Products', 'styring af tilkøbsprodukter og accessories'],
  ['Email System', 'e-mails til nyhedsbreve, bekræftelser og notifikationer'],
  ['Calendar Integration', 'kalendersynkronisering til Outlook eller Google Calendar'],
  ['Settings', 'indstillinger for levering, moms og CMS-indhold'],
  ['User Management', 'bruger- og rolleadministration'],
]);

function translateTag(tag) {
  return TAG_DA.get(tag) || tag;
}

function translateFeature(raw) {
  const [name, rest] = String(raw).split(/:\s*/, 2);
  const mapped = FEATURE_DA.get(name.trim());
  if (mapped) return mapped;
  return (rest || name || raw).trim();
}

function daList(items, fallback) {
  const clean = items.filter(Boolean);
  if (!clean.length) return fallback;
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} og ${clean.at(-1)}`;
}

async function resolveTarget(target, outputDir) {
  if (isRepoUrl(target)) {
    const cloneDir = path.join(outputDir, 'work', 'repo');
    await fs.mkdir(path.dirname(cloneDir), { recursive: true });
    await runCommand('git', ['clone', '--depth', '1', target, cloneDir], { timeoutMs: 180000 });
    return { repoDir: cloneDir, cloned: true };
  }
  const repoDir = path.resolve(target);
  if (!(await exists(repoDir))) throw new Error(`Target path does not exist: ${repoDir}`);
  return { repoDir, cloned: false };
}

async function listRepoFiles(repoDir) {
  const git = await runCommand('git', ['ls-files'], { cwd: repoDir, allowFailure: true });
  if (git.code === 0 && git.stdout.trim()) {
    return git.stdout.split('\n').map(line => line.trim()).filter(Boolean);
  }
  const find = await runCommand('find', ['.', '-type', 'f'], { cwd: repoDir, allowFailure: true });
  return find.stdout.split('\n').map(line => line.replace(/^\.\//, '').trim()).filter(Boolean);
}

async function readIfPresent(repoDir, relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!(await exists(filePath))) return '';
  return readText(filePath).catch(() => '');
}

function firstParagraph(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map(block => block.replace(/^#+\s+.*/gm, '').replace(/```[\s\S]*?```/g, '').trim())
    .find(block => block.length > 80 && !block.startsWith('-')) || '';
}

function normalizeHeading(value) {
  return String(value)
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractSection(text, heading) {
  const lines = String(text).split(/\r?\n/);
  const wanted = normalizeHeading(heading);
  let collecting = false;
  let startLevel = null;
  const collected = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const normalized = normalizeHeading(line);
      if (collecting && level <= startLevel) break;
      if (!collecting && (normalized === wanted || normalized.includes(wanted))) {
        collecting = true;
        startLevel = level;
        continue;
      }
    }
    if (collecting) collected.push(line);
  }

  return collected.join('\n').trim();
}

function extractBullets(text, max = 12) {
  const bullets = [];
  const re = /^\s*[-*]\s+(?:\*\*)?([^:\n*]+)(?:\*\*)?:?\s*(.*)$/gm;
  let match;
  while ((match = re.exec(text)) && bullets.length < max) {
    const title = match[1].trim();
    const rest = match[2].trim();
    if (title.length > 2) bullets.push(rest ? `${title}: ${rest}` : title);
  }
  return bullets;
}

function extractLiveUrl(text, target) {
  const { owner, repo } = repoParts(target);
  const repoNeedle = String(repo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const urls = [...String(text).matchAll(/https?:\/\/[^\s)>"']+/g)]
    .map(match => match[0].replace(/[`.,;)\]]+$/, ''));
  const filtered = urls.filter(url => {
    const lower = url.toLowerCase();
    return !lower.includes('github.com')
      && !lower.includes('stripe.com')
      && !lower.includes('yourdomain.')
      && !lower.includes('example.')
      && !lower.includes('/stripe/webhook')
      && !lower.includes('pythonanywhere.com/user')
      && !lower.includes('localhost')
      && !lower.includes('127.0.0.1');
  });
  const preferred = filtered.find(url => url.toLowerCase().replace(/[^a-z0-9]/g, '').includes(repoNeedle));
  if (preferred) return preferred;
  if (filtered.length) return filtered[0];
  return owner && repo ? `https://github.com/${owner}/${repo}` : null;
}

function detectTechStack(files, docs, requirements, packageJson) {
  const stack = new Set();
  const addIf = (needle, label) => {
    if (docs.toLowerCase().includes(needle.toLowerCase())) stack.add(label);
  };

  if (files.some(file => file.endsWith('.py'))) stack.add('Python');
  if (requirements.includes('Flask')) stack.add('Flask');
  if (requirements.includes('SQLAlchemy') || docs.includes('SQLAlchemy')) stack.add('SQLAlchemy');
  if (requirements.includes('stripe') || docs.toLowerCase().includes('stripe')) stack.add('Stripe');
  if (requirements.includes('Flask-Mail') || docs.includes('SMTP')) stack.add('Flask-Mail');
  if (requirements.includes('reportlab') || docs.includes('PDF')) stack.add('ReportLab');
  if (requirements.includes('pytest')) stack.add('pytest');
  if (docs.includes('MySQL')) stack.add('MySQL');
  if (docs.includes('SQLite')) stack.add('SQLite');
  addIf('Tailwind', 'Tailwind CSS');
  addIf('HTMX', 'HTMX');
  addIf('Alpine.js', 'Alpine.js');
  addIf('FullCalendar', 'FullCalendar');
  addIf('DAWA', 'DAWA');
  addIf('Brevo', 'Brevo SMTP');
  addIf('Outlook', 'ICS Calendar');
  addIf('Google Calendar', 'ICS Calendar');

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      for (const deps of [pkg.dependencies, pkg.devDependencies]) {
        for (const name of Object.keys(deps || {})) stack.add(name);
      }
    } catch {
      // Ignore malformed package.json.
    }
  }

  return [...stack].slice(0, 18);
}

function detectCategory(docs, stack) {
  const lower = docs.toLowerCase();
  if (lower.includes('stripe') || lower.includes('checkout') || lower.includes('cart') || lower.includes('webshop')) return 'E-commerce';
  if (lower.includes('dashboard') || lower.includes('admin') || lower.includes('customer portal')) return 'SaaS';
  if (lower.includes('ai') || lower.includes('llm')) return 'AI';
  if (stack.includes('React') || stack.includes('Vue') || stack.includes('Flask')) return 'Web';
  return 'Software';
}

function detectTags(docs, stack, category) {
  const lower = docs.toLowerCase();
  const tags = new Set([category]);
  if (lower.includes('rental')) tags.add('Rental');
  if (lower.includes('booking')) tags.add('Booking');
  if (lower.includes('payment') || lower.includes('stripe')) tags.add('Payments');
  if (lower.includes('admin')) tags.add('Admin');
  if (lower.includes('calendar')) tags.add('Calendar');
  if (lower.includes('delivery')) tags.add('Delivery');
  if (lower.includes('email') || lower.includes('newsletter')) tags.add('Email');
  for (const tech of stack.slice(0, 3)) tags.add(tech);
  return [...tags].slice(0, 8).map(translateTag);
}

async function analyzeRepo(repoDir, target, options) {
  let parts = repoParts(target);
  if (!parts.owner) {
    const remote = await runCommand('git', ['remote', 'get-url', 'origin'], { cwd: repoDir, allowFailure: true });
    if (remote.code === 0 && remote.stdout.trim()) parts = repoParts(remote.stdout.trim());
  }
  const files = await listRepoFiles(repoDir);
  const readme = await readIfPresent(repoDir, 'README.md');
  const explainerCandidates = files.filter(file => /explainer|project_status|status|deployment/i.test(file) && /\.(md|txt)$/i.test(file)).slice(0, 5);
  const extraDocs = [];
  for (const file of explainerCandidates) extraDocs.push(await readIfPresent(repoDir, file));
  const docs = [readme, ...extraDocs].filter(Boolean).join('\n\n');
  const requirements = await readIfPresent(repoDir, 'requirements.txt');
  const packageJson = await readIfPresent(repoDir, 'package.json');
  const stack = detectTechStack(files, docs, requirements, packageJson);
  const category = detectCategory(docs, stack);
  const tags = detectTags(docs, stack, category);
  const title = titleFromRepoName(parts.repo || path.basename(repoDir));
  const slug = slugify(title);
  const liveUrl = extractLiveUrl(docs, target);
  const repoUrl = parts.owner && parts.repo ? `https://github.com/${parts.owner}/${parts.repo}` : (isRepoUrl(target) ? target : null);
  const features = extractBullets(`${extractSection(docs, 'Features')}\n${extractSection(docs, 'Key Features')}\n${extractSection(docs, 'Completed Features')}`, 10);
  const publicFeatures = extractBullets(`${extractSection(docs, 'Public Features')}\n${extractSection(docs, 'Customer-Facing Features')}`, 6);
  const adminFeatures = extractBullets(`${extractSection(docs, 'Admin Features')}\n${extractSection(docs, 'Admin Management System')}`, 6);
  const latestCommit = await runCommand('git', ['log', '-1', '--format=%cd', '--date=format:%Y'], { cwd: repoDir, allowFailure: true });
  const year = Number(latestCommit.stdout.trim()) || new Date().getFullYear();
  const routeCount = files.filter(file => /blueprints|routes|pages|app\/.*\.py|src\/.*\.(tsx|jsx|vue|svelte)$/i.test(file)).length;
  const templateCount = files.filter(file => /templates\/.*\.(html|jinja|jinja2)$/i.test(file)).length;
  const testCount = files.filter(file => /^tests\/|\.test\.|\.spec\./i.test(file)).length;
  const integrationCount = ['Stripe', 'Flask-Mail', 'Brevo SMTP', 'ICS Calendar', 'DAWA', 'ReportLab']
    .filter(name => stack.includes(name)).length;

  const publicDa = publicFeatures.slice(0, 4).map(translateFeature);
  const adminDa = adminFeatures.slice(0, 4).map(translateFeature);
  const stackDa = stack.slice(0, 6).join(', ') || 'projektets eksisterende stack';
  const repoSaysProduction = /production deployment|successfully deployed|live at|produktion|deployed to/i.test(docs);
  const repoSaysRental = /rental|udlejning/i.test(docs);
  const repoSaysPayment = /stripe|payment|checkout|betaling/i.test(docs);

  const description = repoSaysRental
    ? `${title} er en webplatform til udlejning af eventudstyr med katalog, datobaseret booking, betaling, kundeportal og adminstyring.`
    : `${title} er et ${category.toLowerCase()}-projekt bygget med ${stack.slice(0, 4).join(', ') || 'en specialbygget webstack'}.`;

  const longDescription = [
    repoSaysRental
      ? `${title} samler en serviceforretning med udlejning, lager, datoer og betaling i et digitalt flow. Kunden kan gå fra produktvalg til booking, mens virksomheden får styr på drift, tilgængelighed og kommunikation.`
      : `${title} omsætter et konkret produktbehov til en webbaseret løsning med tydelige brugerflows og vedligeholdbar kode.`,
    `Repoet dokumenterer en full-stack løsning omkring ${stackDa}. Kundevendte flows omfatter ${daList(publicDa, 'de centrale brugerflows')}. På driftssiden dokumenterer repoet ${daList(adminDa, 'admin- og backofficefunktioner')}.`,
  ].join('\n\n');

  const challenge = repoSaysRental
    ? 'En udlejningsforretning skal koordinere produkter, datoer, lager, levering, depositum, betaling og kundekommunikation på samme tid. Hvis de dele ligger spredt, bliver hver booking tung at håndtere og svær at stole på.'
    : 'Projektet skulle samle produktidé, brugerflow, datahåndtering og drift i en løsning, der kan forstås, vedligeholdes og videreudvikles.';

  const approach = [
    `Løsningen er bygget med ${stack.slice(0, 8).join(', ') || 'en pragmatisk applikationsstack'} og opdeler public site, transaktionelle flows, kundeområde og admin i separate moduler.`,
    integrationCount
      ? `Dokumenterede integrationer i repoet inkluderer ${stack.filter(item => ['Stripe', 'Flask-Mail', 'Brevo SMTP', 'ICS Calendar', 'DAWA', 'ReportLab'].includes(item)).join(', ')}.`
      : 'Kodebasen er organiseret omkring applikationsmoduler, templates, services og dokumentation.',
    testCount ? `Der er ${testCount} testfiler i repoet for dele af forretningslogikken.` : 'Repoet indeholder dokumentation til opsætning, drift eller deployment.',
  ].join(' ');

  const metrics = [];
  if (repoSaysProduction) metrics.push({ value: 'Live', label: 'produktion dokumenteret i repoet' });
  if (integrationCount) metrics.push({ value: String(integrationCount), label: 'dokumenterede integrationer' });
  if (testCount) metrics.push({ value: String(testCount), label: 'testfiler i repoet' });
  if (templateCount) metrics.push({ value: String(templateCount), label: 'UI-templates kortlagt' });
  if (!metrics.length && routeCount) metrics.push({ value: String(routeCount), label: 'appmoduler kortlagt' });

  const thumbnailUrl = parts.owner && parts.repo
    ? `https://opengraph.githubassets.com/${Date.now()}/${parts.owner}/${parts.repo}`
    : (liveUrl || repoUrl || 'https://github.com');

  const project = {
    title,
    slug,
    category,
    description,
    long_description: longDescription,
    challenge,
    approach,
    tags,
    tech_stack: stack,
    client: title,
    year,
    status: options.draft ? 'draft' : 'published',
    featured: Boolean(options.featured),
    sort_order: options.featured ? -10 : 0,
    metrics: metrics.slice(0, 4),
    testimonial_text: '',
    testimonial_author: '',
    testimonial_role: '',
    thumbnail_url: thumbnailUrl,
    case_url: liveUrl || repoUrl || target,
  };

  return {
    parts,
    files,
    docsUsed: ['README.md', ...explainerCandidates],
    liveUrl,
    repoUrl,
    stack,
    category,
    tags,
    features,
    publicFeatures,
    adminFeatures,
    routeCount,
    templateCount,
    testCount,
    integrationCount,
    claims: {
      production: repoSaysProduction,
      rental: repoSaysRental,
      payments: repoSaysPayment,
      docsUsed: ['README.md', ...explainerCandidates],
      note: 'Copy and metrics are derived from repository files and public/live-page evidence only.',
    },
    project,
  };
}

function validateProjectTruthfulness(analysis, checks) {
  const project = analysis.project;
  const unsupportedClaims = [];
  const text = [
    project.description,
    project.long_description,
    project.challenge,
    project.approach,
  ].join('\n').toLowerCase();

  const inventedMarketingPatterns = [
    /\baward[-\s]?winning\b/,
    /\bbest[-\s]?in[-\s]?class\b/,
    /\bguaranteed\b/,
    /\b100%\b/,
    /\bproven results\b/,
    /\benterprise[-\s]?grade\b/,
    /\bmarkedsledende\b/,
    /\bgaranteret\b/,
    /\bdokumenterede resultater\b/,
  ];

  for (const pattern of inventedMarketingPatterns) {
    if (pattern.test(text)) unsupportedClaims.push(String(pattern));
  }

  const inventedMetric = (project.metrics || []).some(metric => /[%+]/.test(String(metric.value || '')));
  if (inventedMetric) unsupportedClaims.push('percentage_or_growth_metric_without_evidence');

  const inventedTestimonial = Boolean(
    project.testimonial_text || project.testimonial_author || project.testimonial_role,
  );
  if (inventedTestimonial) unsupportedClaims.push('testimonial_without_source_quote');

  makeCheck(
    checks,
    'truth.claim-boundary',
    'Project copy uses only conservative, evidence-bound claims',
    unsupportedClaims.length === 0,
    {
      unsupportedClaims,
      docsUsed: analysis.docsUsed,
      note: analysis.claims.note,
    },
  );
}

function extractObjectKeys(source, objectName) {
  const match = source.match(new RegExp(`const\\s+${objectName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!match) return [];
  const keys = [];
  const keyPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
  let keyMatch;
  while ((keyMatch = keyPattern.exec(match[1]))) keys.push(keyMatch[1]);
  return keys;
}

function extractAdminPayloadKeys(source) {
  const match = source.match(/const\s+payload\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!match) return [];
  const keys = [];
  const keyPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::|,)/gm;
  let keyMatch;
  while ((keyMatch = keyPattern.exec(match[1]))) keys.push(keyMatch[1]);
  return keys;
}

function extractServerNames(source, callName) {
  const names = [];
  const pattern = new RegExp(`server\\.${callName}\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
  let match;
  while ((match = pattern.exec(source))) names.push(match[1]);
  return names;
}

function missing(expected, actual) {
  const set = new Set(actual);
  return expected.filter(item => !set.has(item));
}

async function verifyDestinationContract(portfolioRoot, checks) {
  for (const rel of DESTINATION_FILES) {
    makeCheck(checks, `destination.file.${rel}`, `Mast3kMedia destination has ${rel}`, await exists(path.join(portfolioRoot, rel)));
  }

  const adminHtml = await readIfPresent(portfolioRoot, 'admin/index.html');
  const adminJs = await readIfPresent(portfolioRoot, 'admin/admin.js');
  const mcpJs = await readIfPresent(portfolioRoot, 'mcp-server.mjs');
  const adminPayloadFields = extractAdminPayloadKeys(adminJs);
  const mcpFields = extractObjectKeys(mcpJs, 'PROJECT_FIELDS');
  const toolNames = extractServerNames(mcpJs, 'tool');

  makeCheck(checks, 'destination.admin-payload-fields', 'Admin submits all supported project fields', missing(PROJECT_FIELDS, adminPayloadFields).length === 0, {
    missing: missing(PROJECT_FIELDS, adminPayloadFields),
    actual: adminPayloadFields,
  });
  makeCheck(checks, 'destination.admin-html-fields', 'Admin UI has controls for project fields', Object.values(ADMIN_FIELD_IDS).every(ids => ids.every(id => adminHtml.includes(`id="${id}"`) || adminHtml.includes(`id='${id}'`))), {
    missing: Object.fromEntries(
      Object.entries(ADMIN_FIELD_IDS)
        .map(([field, ids]) => [field, ids.filter(id => !adminHtml.includes(`id="${id}"`) && !adminHtml.includes(`id='${id}'`))])
        .filter(([, ids]) => ids.length),
    ),
  });
  makeCheck(checks, 'destination.mcp-fields', 'MCP supports every admin project field', missing(PROJECT_FIELDS, mcpFields).length === 0, {
    missing: missing(PROJECT_FIELDS, mcpFields),
    actual: mcpFields,
  });
  makeCheck(checks, 'destination.mcp-tools', 'MCP declares required portfolio tools', missing(REQUIRED_MCP_TOOLS, toolNames).length === 0, {
    missing: missing(REQUIRED_MCP_TOOLS, toolNames),
    actual: toolNames,
  });
}

async function ensurePortfolioDeps(portfolioRoot, checks) {
  const packageJson = path.join(portfolioRoot, 'package.json');
  if (!(await exists(packageJson))) {
    makeCheck(checks, 'destination.install.package-json', 'Mast3kMedia package.json exists', false);
    return;
  }
  const sqliteProbe = "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close(); console.log('better-sqlite3 ok')";
  const probe = await runCommand('node', ['-e', sqliteProbe], { cwd: portfolioRoot, timeoutMs: 30000, allowFailure: true });
  if (probe.code === 0) {
    makeCheck(checks, 'destination.install', 'Mast3kMedia dependencies load', true);
    return;
  }
  const install = await runCommand('npm', ['install'], { cwd: portfolioRoot, timeoutMs: 240000, allowFailure: true });
  const reprobe = await runCommand('node', ['-e', sqliteProbe], { cwd: portfolioRoot, timeoutMs: 30000, allowFailure: true });
  makeCheck(checks, 'destination.install', 'Mast3kMedia dependencies install and native deps load', install.code === 0 && reprobe.code === 0, {
    firstError: probe.stderr.slice(-1200) || probe.stdout.slice(-1200),
    installError: install.stderr.slice(-1200) || install.stdout.slice(-1200),
    reprobeError: reprobe.stderr.slice(-1200) || reprobe.stdout.slice(-1200),
  });
}

class McpStdioClient {
  constructor(repoDir) {
    this.repoDir = repoDir;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
  }

  async start() {
    this.child = spawn('node', ['mcp-server.mjs'], {
      cwd: this.repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    this.child.stdout.on('data', chunk => this.onData(chunk));
    this.child.stderr.on('data', chunk => { this.stderr += chunk.toString(); });
    this.child.on('close', code => {
      for (const { reject } of this.pending.values()) reject(new Error(`MCP server closed with ${code}`));
      this.pending.clear();
    });
    await new Promise((resolve, reject) => {
      this.child.once('spawn', resolve);
      this.child.once('error', reject);
    });
  }

  onData(chunk) {
    this.buffer += chunk.toString();
    let index;
    while ((index = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      if (!line.trim()) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message.id !== undefined && this.pending.has(message.id)) {
        const { resolve, reject, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result);
      }
    }
  }

  request(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++;
    const message = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}\n${this.stderr.slice(-2000)}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(message)}\n`);
    });
  }

  notify(method, params = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'mast3kmedia-repo-case', version: '1.0.0' },
    });
    this.notify('notifications/initialized', {});
    return result;
  }

  async close() {
    if (!this.child || this.child.killed) return;
    this.child.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function toolText(result) {
  return (result?.content || []).map(item => item.text || '').join('\n');
}

function parseToolJson(result) {
  const text = toolText(result).trim();
  if (!text) return null;
  const starts = [text.indexOf('{'), text.indexOf('[')].filter(index => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    try {
      return JSON.parse(text.slice(start));
    } catch {
      // Try the next JSON-looking offset.
    }
  }
  return null;
}

async function upsertProjectThroughMcp(portfolioRoot, project, checks) {
  const client = new McpStdioClient(portfolioRoot);
  const calls = [];
  const callTool = async (name, args) => {
    const result = await client.request('tools/call', { name, arguments: args });
    calls.push({ name, args: redactLargeDataUrls(args), isError: Boolean(result.isError), text: redactLargeDataUrls(toolText(result)).slice(0, 3000) });
    return result;
  };

  try {
    await client.start();
    await client.initialize();
    const tools = await client.request('tools/list');
    const toolNames = (tools.tools || []).map(tool => tool.name);
    makeCheck(checks, 'mcp.runtime-tools', 'Mast3kMedia MCP runtime exposes required tools', missing(REQUIRED_MCP_TOOLS, toolNames).length === 0, {
      missing: missing(REQUIRED_MCP_TOOLS, toolNames),
    });

    const existing = await callTool('get_project', { ref: project.slug });
    let action = 'create';
    let writeResult;
    if (existing.isError) {
      writeResult = await callTool('create_project', project);
    } else {
      action = 'update';
      writeResult = await callTool('update_project', { ref: project.slug, ...project });
    }

    if (writeResult.isError) throw new Error(toolText(writeResult));
    const saved = parseToolJson(await callTool('get_project', { ref: project.slug }));
    const badFields = PROJECT_FIELDS.filter(field => {
      if (field === 'metrics') return JSON.stringify(saved?.metrics || []) !== JSON.stringify(project.metrics || []);
      if (field === 'tags' || field === 'tech_stack') return JSON.stringify(saved?.[field] || []) !== JSON.stringify(project[field] || []);
      return (saved?.[field] ?? '') !== (project[field] ?? '');
    });
    makeCheck(checks, 'mcp.project-upsert', `Project ${action} through Mast3kMedia MCP`, badFields.length === 0, {
      action,
      slug: project.slug,
      badFields,
    });
    return { action, calls, saved };
  } catch (error) {
    makeCheck(checks, 'mcp.project-upsert', 'Project create/update through Mast3kMedia MCP', false, {
      error: error.message,
      stderr: client.stderr.slice(-3000),
      calls,
    });
    throw error;
  } finally {
    await client.close();
  }
}

function startPortfolioServer(portfolioRoot, port, adminUser, adminPass) {
  const state = { exited: false, code: null, signal: null };
  const child = spawn('node', ['server.js'], {
    cwd: portfolioRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ADMIN_USER: adminUser,
      ADMIN_PASS: adminPass,
      JWT_SECRET: `repo-case-secret-${Date.now()}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  child.on('exit', (code, signal) => {
    state.exited = true;
    state.code = code;
    state.signal = signal;
  });
  return { child, state, getOutput: () => output };
}

async function waitForHttp(url, timeoutMs = 20000, server = null) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    if (server?.state?.exited) {
      throw new Error(`Server exited before becoming reachable (code=${server.state.code}, signal=${server.state.signal})\n${server.getOutput().slice(-3000)}`);
    }
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}\n${server?.getOutput?.().slice(-3000) || ''}`);
}

async function ensurePlaywright(outputDir, checks) {
  const toolsDir = path.join(outputDir, 'tools', 'playwright');
  await fs.mkdir(toolsDir, { recursive: true });
  const packageJson = path.join(toolsDir, 'package.json');
  if (!(await exists(packageJson))) {
    await fs.writeFile(packageJson, JSON.stringify({ private: true, type: 'commonjs', dependencies: { playwright: 'latest' } }, null, 2));
  }
  const localPlaywright = path.join(toolsDir, 'node_modules', 'playwright');
  if (!(await exists(localPlaywright))) {
    const install = await runCommand('npm', ['install', '--silent'], { cwd: toolsDir, timeoutMs: 240000, allowFailure: true });
    makeCheck(checks, 'browser.playwright-install', 'Playwright package installed for evidence capture', install.code === 0, {
      stderr: install.stderr.slice(-1200),
    });
    if (install.code !== 0) throw new Error(`Could not install Playwright: ${install.stderr}`);
  }
  const requireFromTools = createRequire(path.join(toolsDir, 'package.json'));
  return requireFromTools('playwright');
}

async function launchChromium(chromium, outputDir, headed) {
  try {
    return await chromium.launch({ headless: !headed });
  } catch (error) {
    const bin = path.join(outputDir, 'tools', 'playwright', 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
    if (await exists(bin)) {
      const install = await runCommand(bin, ['install', 'chromium'], { timeoutMs: 240000, allowFailure: true });
      if (install.code !== 0) throw new Error(`Playwright browser install failed: ${install.stderr || install.stdout || error.message}`);
    }
    return chromium.launch({ headless: !headed });
  }
}

async function screenshot(page, screenshotsDir, name, fullPage = true) {
  const filePath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage });
  return filePath;
}

async function captureSourceMedia(sourceUrls, outputDir, checks, headed) {
  sourceUrls = [...new Set([].concat(sourceUrls).filter(Boolean))];
  const screenshotsDir = path.join(outputDir, 'screenshots');
  const videosDir = path.join(outputDir, 'videos');
  const rawVideoDir = path.join(videosDir, 'raw');
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(rawVideoDir, { recursive: true });

  const playwright = await ensurePlaywright(outputDir, checks);
  const browser = await launchChromium(playwright.chromium, outputDir, headed);
  const artifacts = { screenshots: [], videos: [], consoleErrors: [], pageErrors: [], sourceUrl: null };

  let thumbnailDataUrl = null;
  let captured = false;
  let usedSourceUrl = null;
  let lastError = null;

  for (const sourceUrl of sourceUrls) {
    const sourceContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 900 } },
    });
    const sourcePage = await sourceContext.newPage();
    sourcePage.on('console', msg => {
      if (msg.type() === 'error') artifacts.consoleErrors.push(msg.text());
    });
    sourcePage.on('pageerror', error => artifacts.pageErrors.push(error.message));
    try {
      await sourcePage.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sourcePage.waitForTimeout(1200);
      artifacts.screenshots.push(await screenshot(sourcePage, screenshotsDir, 'source-project'));
      const thumbPath = path.join(screenshotsDir, 'source-thumbnail.jpg');
      await sourcePage.screenshot({ path: thumbPath, type: 'jpeg', quality: 62, fullPage: false });
      const thumb = await fs.readFile(thumbPath);
      if (thumb.length <= 1_500_000) {
        thumbnailDataUrl = `data:image/jpeg;base64,${thumb.toString('base64')}`;
        artifacts.screenshots.push(thumbPath);
        makeCheck(checks, 'browser.source-thumbnail', 'Source screenshot embedded as project thumbnail', true, {
          bytes: thumb.length,
          sourceUrl,
        });
      } else {
        makeCheck(checks, 'browser.source-thumbnail', 'Source screenshot too large for project thumbnail; kept as artifact only', true, {
          bytes: thumb.length,
          sourceUrl,
        }, 'warn');
      }
      captured = true;
      usedSourceUrl = sourceUrl;
      makeCheck(checks, 'browser.source-evidence', 'Source project page screenshot captured', true, { sourceUrl });
    } catch (error) {
      lastError = error;
    } finally {
      const video = sourcePage.video();
      await sourceContext.close();
      if (video) {
        const safeName = captured ? 'source-project.webm' : `source-attempt-${artifacts.videos.length + 1}.webm`;
        const videoPath = path.join(videosDir, safeName);
        await video.saveAs(videoPath).catch(() => {});
        if (await exists(videoPath)) artifacts.videos.push(videoPath);
      }
    }
    if (captured) break;
  }

  if (!captured) {
    makeCheck(checks, 'browser.source-evidence', 'Source project page screenshot captured', false, {
      sourceUrls,
      error: lastError?.message || 'No source URL available',
    });
  }

  await browser.close();
  artifacts.sourceUrl = usedSourceUrl || sourceUrls[0] || null;
  return { artifacts, thumbnailDataUrl };
}

async function runDestinationEvidence(baseUrl, project, outputDir, checks, adminUser, adminPass, headed, prefix = 'mast3kmedia') {
  const screenshotsDir = path.join(outputDir, 'screenshots');
  const videosDir = path.join(outputDir, 'videos');
  const rawVideoDir = path.join(videosDir, 'raw');
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(rawVideoDir, { recursive: true });

  const playwright = await ensurePlaywright(outputDir, checks);
  const browser = await launchChromium(playwright.chromium, outputDir, headed);
  const artifacts = { screenshots: [], videos: [], consoleErrors: [], pageErrors: [] };

  const portfolioContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 1000 } },
  });
  const page = await portfolioContext.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') artifacts.consoleErrors.push(msg.text());
  });
  page.on('pageerror', error => artifacts.pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
    await page.fill('#loginUser', adminUser);
    await page.fill('#loginPass', adminPass);
    await page.click('#loginBtn');
    await page.locator('#appShell').waitFor({ state: 'visible', timeout: 10000 });
    await page.click('[data-view="projects"]');
    await page.locator('#projectSearch').fill(project.title);
    await page.locator('#projectsTable').getByText(project.title).waitFor({ timeout: 10000 });
    artifacts.screenshots.push(await screenshot(page, screenshotsDir, `${prefix}-admin-projects`));
    const row = page.locator('#projectsTable tbody tr').filter({ hasText: project.title }).first();
    await row.locator('.edit-btn').click();
    await page.locator('#fieldTitle').waitFor({ timeout: 10000 });
    artifacts.screenshots.push(await screenshot(page, screenshotsDir, `${prefix}-admin-edit`));

    if (project.status === 'published') {
      await page.goto(`${baseUrl}/case.html?slug=${encodeURIComponent(project.slug)}`, { waitUntil: 'networkidle' });
      await page.getByText(project.title).first().waitFor({ timeout: 10000 });
      artifacts.screenshots.push(await screenshot(page, screenshotsDir, `${prefix}-public-case`));
    }
    makeCheck(checks, `browser.${prefix}.destination-evidence`, 'Mast3kMedia admin/public evidence captured', true, { baseUrl, slug: project.slug });
  } catch (error) {
    makeCheck(checks, `browser.${prefix}.destination-evidence`, 'Mast3kMedia admin/public evidence captured', false, { error: error.message, baseUrl });
  } finally {
    const video = page.video();
    await portfolioContext.close();
    if (video) {
      const videoPath = path.join(videosDir, `${prefix}-case-flow.webm`);
      await video.saveAs(videoPath).catch(() => {});
      if (await exists(videoPath)) artifacts.videos.push(videoPath);
    }
  }
  await browser.close();

  makeCheck(checks, `browser.${prefix}.videos`, 'Browser videos were captured', artifacts.videos.length >= 1, { videos: artifacts.videos });
  makeCheck(checks, `browser.${prefix}.screenshots`, 'Browser screenshots were captured', artifacts.screenshots.length >= 2, { screenshots: artifacts.screenshots });
  return artifacts;
}

async function jsonRequest(baseUrl, method, route, body, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${route} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function upsertProductionProject(productionUrl, project, checks, adminUser, adminPass) {
  if (!productionUrl) {
    makeCheck(checks, 'production.skip', 'Production sync skipped because no production URL was configured', true, {}, 'warn');
    return null;
  }
  try {
    const login = await jsonRequest(productionUrl, 'POST', '/api/auth/login', { username: adminUser, password: adminPass });
    const projects = await jsonRequest(productionUrl, 'GET', '/api/admin/projects', undefined, login.token);
    const existing = Array.isArray(projects) ? projects.find(item => item.slug === project.slug) : null;
    const saved = existing
      ? await jsonRequest(productionUrl, 'PUT', `/api/admin/projects/${existing.id}`, project, login.token)
      : await jsonRequest(productionUrl, 'POST', '/api/admin/projects', project, login.token);
    const publicProject = await jsonRequest(productionUrl, 'GET', `/api/projects/${encodeURIComponent(project.slug)}`);
    const badFields = PROJECT_FIELDS.filter(field => {
      if (field === 'metrics') return JSON.stringify(publicProject.metrics || []) !== JSON.stringify(project.metrics || []);
      if (field === 'tags' || field === 'tech_stack') return JSON.stringify(publicProject[field] || []) !== JSON.stringify(project[field] || []);
      return (publicProject[field] ?? '') !== (project[field] ?? '');
    });
    makeCheck(checks, 'production.project-upsert', 'Production Mast3kMedia project created/updated and publicly readable', badFields.length === 0, {
      action: existing ? 'update' : 'create',
      id: saved.id,
      slug: saved.slug,
      badFields,
      productionUrl,
    });
    return {
      action: existing ? 'update' : 'create',
      saved: redactLargeDataUrls(saved),
      publicProject: redactLargeDataUrls(publicProject),
    };
  } catch (error) {
    makeCheck(checks, 'production.project-upsert', 'Production Mast3kMedia project created/updated and publicly readable', false, {
      error: error.message,
      productionUrl,
    });
    throw error;
  }
}

function formatCheck(check) {
  const status = check.severity === 'warn' ? 'WARN' : (check.passed ? 'PASS' : 'FAIL');
  return `| ${status} | ${check.id} | ${check.label.replace(/\|/g, '\\|')} |`;
}

function redactLargeDataUrls(value) {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.length > 200) {
      return `[data image URL ${value.length} chars; exact value stored in project.json]`;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(redactLargeDataUrls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactLargeDataUrls(entry)]));
  }
  return value;
}

async function writeReports(outputDir, report) {
  const failed = report.checks.filter(check => !check.passed && check.severity !== 'warn');
  const warned = report.checks.filter(check => check.severity === 'warn');
  await fs.writeFile(path.join(outputDir, 'project.json'), JSON.stringify(report.project, null, 2));
  const reportForDisplay = redactLargeDataUrls(report);
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(reportForDisplay, null, 2));
  const markdown = [
    '# Mast3kMedia Repo-To-Case Run',
    '',
    `Status: ${failed.length ? 'FAIL' : 'PASS'}`,
    `Target: ${reportForDisplay.target}`,
    `Source repo: ${reportForDisplay.repoDir}`,
    `Portfolio root: ${reportForDisplay.portfolioRoot}`,
    `Generated: ${reportForDisplay.generatedAt}`,
    '',
    `Project: ${reportForDisplay.project?.title || 'none'} (${reportForDisplay.project?.slug || 'no slug'})`,
    `MCP action: ${reportForDisplay.mcp?.action || 'not completed'}`,
    reportForDisplay.production ? `Production action: ${reportForDisplay.production.action || 'not completed'}` : 'Production action: not completed',
    `Status in portfolio: ${reportForDisplay.project?.status || 'unknown'}`,
    '',
    `Checks: ${report.checks.length - failed.length - warned.length} passed, ${failed.length} failed, ${warned.length} warnings.`,
    '',
    '## Findings',
    '',
    failed.length ? failed.map(check => `- FAIL ${check.id}: ${check.label} ${JSON.stringify(check.details)}`).join('\n') : '- No blocking failures.',
    warned.length ? `\n${warned.map(check => `- WARN ${check.id}: ${check.label} ${JSON.stringify(check.details)}`).join('\n')}` : '',
    '',
    '## Check Table',
    '',
    '| Status | ID | Check |',
    '| --- | --- | --- |',
    ...report.checks.map(formatCheck),
    '',
    '## Project Payload',
    '',
    '```json',
    JSON.stringify(reportForDisplay.project, null, 2),
    '```',
    '',
    '## Artifacts',
    '',
    ...(report.artifacts?.screenshots?.length ? report.artifacts.screenshots.map(file => `- Screenshot: ${file}`) : ['- Screenshots: none']),
    ...(report.artifacts?.videos?.length ? report.artifacts.videos.map(file => `- Video: ${file}`) : ['- Videos: none']),
    '',
  ].join('\n');
  await fs.writeFile(path.join(outputDir, 'report.md'), markdown);
}

function mergeArtifacts(...groups) {
  const merged = { screenshots: [], videos: [], consoleErrors: [], pageErrors: [] };
  for (const group of groups) {
    if (!group) continue;
    for (const key of ['screenshots', 'videos', 'consoleErrors', 'pageErrors']) {
      if (Array.isArray(group[key])) merged[key].push(...group[key]);
    }
    if (group.sourceUrl && !merged.sourceUrl) merged.sourceUrl = group.sourceUrl;
  }
  return merged;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputRoot = path.resolve(args.output || path.join(process.cwd(), 'mast3kmedia-repo-case'));
  const outputDir = path.join(outputRoot, stamp());
  await fs.mkdir(outputDir, { recursive: true });

  const checks = [];
  let repoDir = null;
  let analysis = null;
  let mcp = null;
  let production = null;
  let server = null;
  let baseUrl = null;
  let artifacts = { screenshots: [], videos: [] };

  try {
    const resolved = await resolveTarget(args.target, outputDir);
    repoDir = resolved.repoDir;
    analysis = await analyzeRepo(repoDir, args.target, args);
    makeCheck(checks, 'source.analysis', 'Source repository analyzed into portfolio payload', Boolean(analysis.project?.title && analysis.project?.description), {
      title: analysis.project?.title,
      stack: analysis.stack,
      liveUrl: analysis.liveUrl,
    });
    validateProjectTruthfulness(analysis, checks);

    if (!args.noBrowser) {
      const sourceCapture = await captureSourceMedia(
        [analysis.liveUrl, analysis.repoUrl, args.target],
        outputDir,
        checks,
        args.headed,
      );
      artifacts = mergeArtifacts(artifacts, sourceCapture.artifacts);
      if (sourceCapture.thumbnailDataUrl) analysis.project.thumbnail_url = sourceCapture.thumbnailDataUrl;
      else {
        makeCheck(checks, 'browser.source-thumbnail-fallback', 'Project thumbnail uses non-screenshot fallback URL', true, {
          thumbnail_url: analysis.project.thumbnail_url,
        }, 'warn');
      }
    } else {
      makeCheck(checks, 'browser.skip', 'Browser evidence skipped by flag', false, {}, 'warn');
    }

    await verifyDestinationContract(args.portfolioRoot, checks);
    await ensurePortfolioDeps(args.portfolioRoot, checks);
    await fs.writeFile(path.join(outputDir, 'project.json'), JSON.stringify(analysis.project, null, 2));

    mcp = await upsertProjectThroughMcp(args.portfolioRoot, analysis.project, checks);

    if (args.production) {
      production = await upsertProductionProject(args.productionUrl, analysis.project, checks, args.adminUser, args.adminPass);
    } else {
      makeCheck(checks, 'production.skip', 'Production sync skipped by flag', false, {}, 'warn');
    }

    const port = args.port || await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    server = startPortfolioServer(args.portfolioRoot, port, args.adminUser, args.adminPass);
    await waitForHttp(`${baseUrl}/api/projects`, 20000, server);
    makeCheck(checks, 'destination.server', 'Mast3kMedia local site starts after MCP update', true, { baseUrl });

    if (!args.noBrowser) {
      const localArtifacts = await runDestinationEvidence(
        baseUrl,
        analysis.project,
        outputDir,
        checks,
        args.adminUser,
        args.adminPass,
        args.headed,
        'mast3kmedia-local',
      );
      artifacts = mergeArtifacts(artifacts, localArtifacts);

      if (args.production) {
        const liveArtifacts = await runDestinationEvidence(
          args.productionUrl.replace(/\/$/, ''),
          analysis.project,
          outputDir,
          checks,
          args.adminUser,
          args.adminPass,
          args.headed,
          'mast3kmedia-live',
        );
        artifacts = mergeArtifacts(artifacts, liveArtifacts);
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      target: args.target,
      repoDir,
      portfolioRoot: args.portfolioRoot,
      baseUrl,
      analysis,
      project: analysis.project,
      mcp,
      production,
      artifacts,
      checks,
    };
    await writeReports(outputDir, report);
    const failed = checks.filter(check => !check.passed && check.severity !== 'warn');
    console.log(`Repo-to-case ${failed.length ? 'FAILED' : 'PASSED'}: ${path.join(outputDir, 'report.md')}`);
    console.log(`Project payload: ${path.join(outputDir, 'project.json')}`);
    console.log(`Mast3kMedia slug: ${analysis.project.slug}`);
    if (failed.length) {
      for (const check of failed) console.log(`FAIL ${check.id}: ${check.label}`);
      process.exitCode = 1;
    }
  } catch (error) {
    makeCheck(checks, 'run.unhandled-error', 'Repo-to-case run completed without unhandled errors', false, { error: error.stack || error.message });
    const report = {
      generatedAt: new Date().toISOString(),
      target: args.target,
      repoDir,
      portfolioRoot: args.portfolioRoot,
      baseUrl,
      analysis,
      project: analysis?.project || null,
      mcp,
      production,
      artifacts,
      checks,
    };
    await writeReports(outputDir, report);
    console.error(`Repo-to-case failed: ${error.message}`);
    console.error(`Report: ${path.join(outputDir, 'report.md')}`);
    process.exitCode = 1;
  } finally {
    if (server?.child && !server.child.killed) server.child.kill('SIGTERM');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
