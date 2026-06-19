'use strict';
/* ============================================================
   Mast3kMedia Admin Panel — full SPA
   ============================================================ */

// ── State ──────────────────────────────────────────────────────────────────────
const S = {
  token:    localStorage.getItem('m3k_token') || null,
  view:     'dashboard',
  projects: [],
  leads:    [],
  editId:   null,   // null = create, number = update
  tags:     [],
  tech:     [],
  metrics:  [],
  media:    [],
  blocks:   [],
  deleteTarget: null,
  filterStatus: '',
  filterQuery:  '',
};

// ── API ────────────────────────────────────────────────────────────────────────
const api = {
  headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${S.token}` };
  },
  async req(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      S.token = null;
      localStorage.removeItem('m3k_token');
      showLogin();
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  async login(u, p) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Forkert brugernavn eller adgangskode');
    return data;
  },
  me:          ()         => api.req('GET',    '/api/auth/me'),
  getStats:    ()         => api.req('GET',    '/api/admin/stats'),
  getProjects: ()         => api.req('GET',    '/api/admin/projects'),
  getLeads:    ()         => api.req('GET',    '/api/admin/leads'),
  createProject: (d)      => api.req('POST',   '/api/admin/projects', d),
  updateProject: (id, d)  => api.req('PUT',    `/api/admin/projects/${id}`, d),
  deleteProject: (id)     => api.req('DELETE', `/api/admin/projects/${id}`),
  setStatus:   (id, s)    => api.req('PATCH',  `/api/admin/projects/${id}/status`, { status: s }),
  setFeatured: (id, f)    => api.req('PATCH',  `/api/admin/projects/${id}/featured`, { featured: f }),
  async upload(file) {
    const res = await fetch('/api/admin/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${S.token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': file.name || 'upload',
      },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      S.token = null;
      localStorage.removeItem('m3k_token');
      showLogin();
    }
    if (!res.ok) throw new Error(data.error || `Upload fejlede (HTTP ${res.status})`);
    return data;
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

const esc = (s) => String(s ?? '')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('Z') ? '' : 'Z'));
  return d.toLocaleDateString('da-DK', { day:'numeric', month:'short', year:'numeric' });
};

// ── Toasts ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error:   '<path d="M18 6 6 18M6 6l12 12"/>',
    info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  };
  const t = el('div', `toast toast-${type}`);
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]||icons.info}</svg><span>${esc(msg)}</span>`;
  $('#toastContainer').appendChild(t);
  const dismiss = () => {
    t.classList.add('leaving');
    setTimeout(() => t.remove(), 300);
  };
  setTimeout(dismiss, 4000);
  t.addEventListener('click', dismiss);
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function showModal(title, body, onConfirm) {
  const modal = $('#deleteModal');
  $('#modalTitle').textContent = title;
  $('#modalBody').textContent  = body;
  modal.hidden = false;
  const cancel  = () => { modal.hidden = true; };
  const confirm = () => { modal.hidden = true; onConfirm(); };
  $('#modalCancel').onclick  = cancel;
  $('#modalConfirm').onclick = confirm;
  modal.onclick = (e) => { if (e.target === modal) cancel(); };
}

// ── Auth ───────────────────────────────────────────────────────────────────────
async function checkAuth() {
  if (!S.token) return showLogin();
  try {
    await api.me();
    showApp();
  } catch {
    S.token = null;
    localStorage.removeItem('m3k_token');
    showLogin();
  }
}

function showLogin() {
  $('#loginScreen').hidden = false;
  $('#appShell').hidden    = true;
}

function showApp() {
  $('#loginScreen').hidden = true;
  $('#appShell').hidden    = false;
  navigate(S.view);
}

function logout() {
  S.token = null;
  localStorage.removeItem('m3k_token');
  showLogin();
  toast('Logget ud', 'info');
}

// ── Login form ─────────────────────────────────────────────────────────────────
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  const txt = btn.querySelector('.btn-text');
  const spin= btn.querySelector('.btn-spinner');
  const errEl = $('#loginError');
  errEl.hidden = true;
  btn.disabled = true; txt.hidden = true; spin.hidden = false;

  const username = $('#loginUser').value.trim();
  const password = $('#loginPass').value;
  try {
    const res = await api.login(username, password);
    if (!res.token) throw new Error('Login svarede uden adgangstoken');
    S.token = res.token;
    localStorage.setItem('m3k_token', res.token);
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Forkert brugernavn eller adgangskode';
    errEl.hidden = false;
  } finally {
    btn.disabled = false; txt.hidden = false; spin.hidden = true;
  }
});

// ── Password toggle ────────────────────────────────────────────────────────────
$('.pw-toggle').addEventListener('click', () => {
  const input = $('#loginPass');
  input.type = input.type === 'password' ? 'text' : 'password';
});

// ── Logout ─────────────────────────────────────────────────────────────────────
$('#logoutBtn').addEventListener('click', logout);

// ── Sidebar toggle (mobile) ────────────────────────────────────────────────────
const sidebarOverlay = el('div', 'sidebar-overlay');
document.body.appendChild(sidebarOverlay);

$('#sidebarToggle').addEventListener('click', () => {
  const open = $('#sidebar').classList.toggle('open');
  sidebarOverlay.classList.toggle('show', open);
});
sidebarOverlay.addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigate(view, params = {}) {
  S.view = view;
  Object.assign(S, params);

  // Update sidebar active state
  $$('.snav-item[data-view]').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  // Show correct view
  const views = ['dashboardView','leadsView','projectsView','formView'];
  const map   = { dashboard:'dashboardView', leads:'leadsView', projects:'projectsView', form:'formView' };
  views.forEach(id => { $(`.view#${id}`) && ($(`.view#${id}`).hidden = (map[view] !== id)); });

  // Topbar title
  const titles = { dashboard: 'Dashboard', leads: 'Henvendelser', projects: 'Projekter', form: S.editId ? 'Rediger projekt' : 'Nyt projekt' };
  $('#topbarTitle').textContent = titles[view] || '';

  // Clear topbar actions
  $('#topbarActions').innerHTML = '';

  // Load view content
  if (view === 'dashboard') loadDashboard();
  if (view === 'leads')     loadLeads();
  if (view === 'projects')  loadProjects();
  if (view === 'form')      loadForm();

  // Attach topbar buttons for form
  if (view === 'form') {
    const actions = $('#topbarActions');
    const draftBtn = el('button','btn-outline','Gem kladde');
    const pubBtn   = el('button','btn-primary','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Publicer');
    draftBtn.onclick = () => submitForm('draft');
    pubBtn.onclick   = () => submitForm('published');
    actions.append(draftBtn, pubBtn);
  }
}

// Delegate nav clicks
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-view]');
  if (a && !a.closest('#projectForm')) {
    e.preventDefault();
    navigate(a.dataset.view);
  }
});

// ── Dashboard ──────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [stats, projects] = await Promise.all([api.getStats(), api.getProjects()]);
    S.projects = projects;

    // Stat cards
    $('#statTotal').textContent     = stats.total;
    $('#statPublished').textContent = stats.published;
    $('#statDrafts').textContent    = stats.drafts;
    $('#statFeatured').textContent  = stats.featured;
    $$('.stat-card.loading').forEach(c => c.classList.remove('loading'));

    // Badge
    const badge = $('#projectCount');
    if (badge) badge.textContent = stats.total;
    const leadBadge = $('#leadCount');
    if (leadBadge) leadBadge.textContent = stats.new_leads || stats.leads || '';

    // Recent projects table (last 5)
    renderProjectsTable($('#dashProjectsList'), projects.slice(0, 5), true);
  } catch (err) {
    toast('Kunne ikke hente data: ' + err.message, 'error');
  }
}

// ── Leads list ────────────────────────────────────────────────────────────────
async function loadLeads() {
  try {
    S.leads = await api.getLeads();
    const badge = $('#leadCount');
    if (badge) badge.textContent = S.leads.filter(l => l.status === 'new').length || '';
    renderLeadsTable($('#leadsTable'), S.leads);
  } catch (err) {
    toast('Kunne ikke hente henvendelser: ' + err.message, 'error');
  }
}

function renderLeadsTable(container, leads) {
  if (!leads.length) {
    container.innerHTML = '<div class="table-empty">Ingen henvendelser endnu.</div>';
    return;
  }

  const table = el('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Kontakt</th>
        <th>Projekt</th>
        <th>Rammer</th>
        <th>Brief</th>
        <th>Modtaget</th>
      </tr>
    </thead>
    <tbody>
      ${leads.map((lead) => `
        <tr>
          <td>
            <strong>${esc(lead.name || 'Ukendt')}</strong>
            <div class="muted small">${esc(lead.email)}</div>
            ${lead.company ? `<div class="muted small">${esc(lead.company)}</div>` : ''}
          </td>
          <td>
            <span class="status-badge">${esc(lead.project_type)}</span>
            <div class="muted small">${esc(lead.goal || '')}</div>
          </td>
          <td>
            <div class="muted small">Budget: ${esc(lead.budget || 'Ikke angivet')}</div>
            <div class="muted small">Tempo: ${esc(lead.timeline || 'Ikke angivet')}</div>
          </td>
          <td class="lead-brief">${esc(lead.brief || '')}</td>
          <td>${fmtDate(lead.created_at)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  container.innerHTML = '';
  container.appendChild(table);
}

// ── Projects list ──────────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    S.projects = await api.getProjects();
    renderFilteredProjects();
  } catch (err) {
    toast('Kunne ikke hente projekter: ' + err.message, 'error');
  }

  // New project button
  $('#newProjectBtn').onclick = () => navigate('form', { editId: null });

  // Search + filter
  $('#projectSearch').oninput = debounce(() => {
    S.filterQuery = $('#projectSearch').value.toLowerCase();
    renderFilteredProjects();
  }, 200);
  $('#statusFilter').onchange = () => {
    S.filterStatus = $('#statusFilter').value;
    renderFilteredProjects();
  };
}

function renderFilteredProjects() {
  const filtered = S.projects.filter(p => {
    const matchQ = !S.filterQuery || p.title.toLowerCase().includes(S.filterQuery) ||
                   (p.description || '').toLowerCase().includes(S.filterQuery) ||
                   (p.category || '').toLowerCase().includes(S.filterQuery);
    const matchS = !S.filterStatus || p.status === S.filterStatus;
    return matchQ && matchS;
  });
  renderProjectsTable($('#projectsTable'), filtered);
}

function renderProjectsTable(container, projects, compact = false) {
  if (!projects.length) {
    container.innerHTML = '<div class="table-empty">Ingen projekter fundet.</div>';
    return;
  }

  const table = el('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Titel</th>
        <th>Kategori</th>
        <th>Status</th>
        <th>Featured</th>
        ${!compact ? '<th>Sortér</th>' : ''}
        <th>Oprettet</th>
        <th style="text-align:right">Handlinger</th>
      </tr>
    </thead>
    <tbody id="${container.id}_tbody"></tbody>
  `;

  const tbody = table.querySelector('tbody');
  projects.forEach(p => {
    const tr = el('tr');
    const star = p.featured
      ? '<svg viewBox="0 0 24 24" fill="#00FF88" stroke="#00FF88" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    tr.innerHTML = `
      <td>
        <div class="td-title">${esc(p.title)}</div>
        ${p.slug ? `<div class="td-cat mono" style="margin-top:2px">/case/${esc(p.slug)}</div>` : ''}
      </td>
      <td class="td-cat">${esc(p.category)}</td>
      <td><span class="badge badge-${p.status}">${p.status === 'published' ? 'Publiceret' : 'Kladde'}</span></td>
      <td>
        <button class="star-btn ${p.featured ? 'on' : ''}" data-id="${p.id}" data-featured="${p.featured ? 1 : 0}" aria-label="Toggle featured">
          ${star}
        </button>
      </td>
      ${!compact ? `<td class="td-cat">${p.sort_order ?? 0}</td>` : ''}
      <td class="td-cat">${fmtDate(p.created_at)}</td>
      <td>
        <div class="td-actions">
          <button class="ico-btn edit-btn" data-id="${p.id}" title="Rediger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="ico-btn status-btn" data-id="${p.id}" data-status="${p.status}" title="${p.status === 'published' ? 'Sæt til kladde' : 'Publicer'}">
            ${p.status === 'published'
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/></svg>'
            }
          </button>
          <button class="ico-btn danger del-btn" data-id="${p.id}" data-title="${esc(p.title)}" title="Slet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Wire up table actions
  container.innerHTML = '';
  container.appendChild(table);

  // Edit
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => navigate('form', { editId: parseInt(btn.dataset.id) });
  });

  // Toggle status
  container.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = async () => {
      const newStatus = btn.dataset.status === 'published' ? 'draft' : 'published';
      try {
        await api.setStatus(btn.dataset.id, newStatus);
        toast(`Projekt ${newStatus === 'published' ? 'publiceret' : 'sat til kladde'}`, 'success');
        if (S.view === 'dashboard') loadDashboard();
        else loadProjects();
      } catch (err) { toast(err.message, 'error'); }
    };
  });

  // Toggle featured
  container.querySelectorAll('.star-btn').forEach(btn => {
    btn.onclick = async () => {
      const featured = btn.dataset.featured === '0';
      try {
        await api.setFeatured(btn.dataset.id, featured);
        toast(`${featured ? 'Tilføjet til' : 'Fjernet fra'} featured`, 'success');
        if (S.view === 'dashboard') loadDashboard();
        else loadProjects();
      } catch (err) { toast(err.message, 'error'); }
    };
  });

  // Delete
  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = () => {
      showModal(
        `Slet "${btn.dataset.title}"?`,
        'Projektet og alt dets indhold slettes permanent. Kan ikke fortrydes.',
        async () => {
          try {
            await api.deleteProject(btn.dataset.id);
            toast('Projekt slettet', 'success');
            if (S.view === 'dashboard') loadDashboard();
            else loadProjects();
          } catch (err) { toast(err.message, 'error'); }
        }
      );
    };
  });
}

// ── Project form ───────────────────────────────────────────────────────────────
function loadForm() {
  // Reset state
  S.tags    = [];
  S.tech    = [];
  S.metrics = [];
  S.media   = [];
  S.blocks  = [];

  const project = S.editId ? S.projects.find(p => p.id === S.editId) : null;

  if (project) {
    // Populate fields
    $('#fieldId').value            = project.id;
    $('#fieldTitle').value         = project.title;
    $('#fieldSlug').value          = project.slug;
    $('#fieldCategory').value      = project.category;
    $('#fieldYear').value          = project.year;
    $('#fieldClient').value        = project.client || '';
    $('#fieldSortOrder').value     = project.sort_order ?? 0;
    $('#fieldFeatured').checked    = !!project.featured;
    $('#fieldDescription').value   = project.description || '';
    $('#fieldLongDesc').value      = project.long_description || '';
    $('#fieldChallenge').value     = project.challenge || '';
    $('#fieldApproach').value      = project.approach || '';
    $('#fieldTestiText').value     = project.testimonial_text || '';
    $('#fieldTestiAuthor').value   = project.testimonial_author || '';
    $('#fieldTestiRole').value     = project.testimonial_role || '';
    $('#fieldThumb').value         = project.thumbnail_url || '';
    $('#fieldCaseUrl').value       = project.case_url || '';
    S.tags    = Array.isArray(project.tags)       ? [...project.tags]       : [];
    S.tech    = Array.isArray(project.tech_stack) ? [...project.tech_stack] : [];
    S.metrics = Array.isArray(project.metrics)    ? project.metrics.map(m => ({...m})) : [];
    S.media   = Array.isArray(project.media)      ? project.media.map(m => ({...m})) : [];
    S.blocks  = Array.isArray(project.blocks)     ? project.blocks.map(b => ({...b})) : [];
  } else {
    // Clear all fields
    $('#projectForm').reset();
    $('#fieldId').value = '';
    S.tags = []; S.tech = []; S.metrics = []; S.media = []; S.blocks = [];
    $('#fieldYear').value = new Date().getFullYear();
    $('#fieldSortOrder').value = 0;
  }

  renderTags();
  renderTech();
  renderMetrics();
  initMediaManager();
  renderMedia();
  initBlocksBuilder();
  renderBlocks();

  // Auto-slug from title
  $('#fieldTitle').oninput = () => {
    if (!$('#fieldSlug').dataset.manual) {
      $('#fieldSlug').value = slugify($('#fieldTitle').value);
    }
  };
  $('#fieldSlug').oninput = () => {
    $('#fieldSlug').dataset.manual = '1';
    $('#fieldSlug').value = slugify($('#fieldSlug').value);
  };

  // Thumbnail preview
  $('#fieldThumb').oninput = debounce(() => updateThumbPreview(), 500);
  updateThumbPreview();

  // Back button
  $('#formBackBtn').onclick = () => navigate('projects');

  // Save buttons
  $('#formSaveDraft').onclick   = () => submitForm('draft');
  $('#formSaveDraft2').onclick  = () => submitForm('draft');
  $('#formPublish').onclick     = () => submitForm('published');
  $('#formPublish2').onclick    = () => submitForm('published');

  // Add metric button
  $('#addMetricBtn').onclick = () => { S.metrics.push({ value:'', label:'' }); renderMetrics(); };

  // Scroll form to top
  $('#formView').scrollTop = 0;
}

function updateThumbPreview() {
  const url = $('#fieldThumb').value.trim();
  const preview = $('#thumbPreview');
  if (url) {
    preview.hidden = false;
    preview.innerHTML = `<img src="${esc(url)}" alt="Thumbnail preview" onerror="this.parentElement.hidden=true" />`;
  } else {
    preview.hidden = true;
  }
}

// ── Tag input ──────────────────────────────────────────────────────────────────
function wireTagInput(wrapId, displayId, stateKey, hiddenId) {
  const wrap    = $(`#${wrapId}`);
  const display = $(`#${displayId}`);
  const input   = wrap.querySelector('.tag-text-input');
  const hidden  = $(`#${hiddenId}`);
  const getValues = () => S[stateKey];

  function refresh() {
    const arr = getValues();
    display.innerHTML = arr.map((t, i) =>
      `<span class="tag-chip">${esc(t)}<button type="button" data-i="${i}" aria-label="Fjern ${esc(t)}">×</button></span>`
    ).join('');
    display.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => { arr.splice(parseInt(btn.dataset.i), 1); refresh(); };
    });
    hidden.value = JSON.stringify(arr);
  }

  const add = () => {
    const arr = getValues();
    const val = input.value.trim();
    if (val && !arr.includes(val)) { arr.push(val); refresh(); }
    input.value = '';
  };

  if (!wrap.dataset.wired) {
    input.addEventListener('keydown', (e) => {
      const arr = getValues();
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
      if (e.key === 'Backspace' && !input.value && arr.length) { arr.pop(); refresh(); }
    });
    input.addEventListener('blur', add);
    wrap.addEventListener('click', () => input.focus());
    wrap.dataset.wired = '1';
  }

  refresh();
}

function renderTags() { wireTagInput('tagsInput', 'tagsDisplay', 'tags', 'fieldTags'); }
function renderTech() { wireTagInput('techInput',  'techDisplay',  'tech',  'fieldTech'); }

// ── Metrics ────────────────────────────────────────────────────────────────────
function renderMetrics() {
  const container = $('#metricsRows');
  container.innerHTML = '';
  S.metrics.forEach((m, i) => {
    const row = el('div', 'metric-row');
    row.innerHTML = `
      <input type="text" placeholder="Nøgletal (f.eks. +64%)" value="${esc(m.value)}" data-mi="${i}" data-field="value" />
      <input type="text" placeholder="Label (f.eks. Stigning i brugere)" value="${esc(m.label)}" data-mi="${i}" data-field="label" />
      <button type="button" class="metric-del" data-del="${i}" aria-label="Slet nøgletal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll('input').forEach(inp => {
    inp.oninput = () => { S.metrics[inp.dataset.mi][inp.dataset.field] = inp.value; };
  });
  container.querySelectorAll('.metric-del').forEach(btn => {
    btn.onclick = () => { S.metrics.splice(parseInt(btn.dataset.del), 1); renderMetrics(); };
  });
}

// ── Media manager ────────────────────────────────────────────────────────────
const MEDIA_ROLES = ['hero','gallery','feature','before','after','device-desktop','device-mobile','demo'];

function inferProvider(url) {
  const u = String(url || '');
  if (/youtube\.com|youtu\.be/i.test(u)) return 'youtube';
  if (/vimeo\.com/i.test(u)) return 'vimeo';
  if (/\.(mp4|webm)(\?|#|$)/i.test(u)) return 'mp4';
  return 'file';
}

function initMediaManager() {
  const mgr = $('#mediaManager');
  if (mgr.dataset.wired) return;
  mgr.dataset.wired = '1';

  const input = $('#mediaUploadInput');
  const drop  = $('#mediaDropzone');

  // File input change
  input.addEventListener('change', () => {
    handleUploadFiles(input.files);
    input.value = '';
  });

  // Drag & drop
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.add('dragover');
  }));
  ['dragleave','dragend'].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('dragover');
  }));
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
  });

  // Add embed
  const addEmbed = () => {
    const url = $('#embedUrlInput').value.trim();
    if (!url) return;
    const provider = inferProvider(url);
    if (provider !== 'youtube' && provider !== 'vimeo') {
      toast('Indsæt en gyldig YouTube- eller Vimeo-URL', 'error');
      return;
    }
    S.media.push({ type: 'embed', provider, url, role: 'gallery', caption: '', alt: '' });
    $('#embedUrlInput').value = '';
    renderMedia();
  };
  $('#addEmbedBtn').onclick = addEmbed;
  $('#embedUrlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addEmbed(); }
  });

  // Raw JSON escape hatch — sync editor ⇒ array on edit (when leaving textarea)
  $('#fieldMedia').addEventListener('change', () => syncMediaFromRaw());
}

async function handleUploadFiles(fileList) {
  const files = [...(fileList || [])];
  for (const file of files) {
    if (!/^(image|video)\//.test(file.type)) {
      toast(`"${file.name}" er ikke et billede eller en video`, 'error');
      continue;
    }
    try {
      const res = await api.upload(file);
      S.media.push({
        type: res.type === 'video' ? 'video' : 'image',
        url: res.url,
        role: 'gallery',
        caption: '',
        alt: '',
      });
      renderMedia();
      toast(`"${file.name}" uploadet`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }
}

// Sync raw JSON textarea back into S.media
function syncMediaFromRaw() {
  const raw = $('#fieldMedia').value.trim();
  if (!raw) { S.media = []; renderMedia(); return; }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Case media skal være et JSON array');
    S.media = parsed.filter(i => i && i.url).map(normalizeMediaItem);
    $('#fieldMedia').classList.remove('error');
    renderMedia();
  } catch (err) {
    $('#fieldMedia').classList.add('error');
    toast(err.message || 'Case media er ikke gyldig JSON', 'error');
  }
}

function normalizeMediaItem(item) {
  const type = item.type === 'video' ? 'video' : (item.type === 'embed' ? 'embed' : 'image');
  const url  = String(item.url);
  const out = {
    type,
    url,
    role:    MEDIA_ROLES.includes(item.role) ? item.role : 'gallery',
    caption: item.caption ? String(item.caption) : '',
    alt:     item.alt ? String(item.alt) : '',
  };
  if (item.provider) out.provider = String(item.provider);
  else if (type === 'embed') out.provider = inferProvider(url);
  if (item.poster) out.poster = String(item.poster);
  return out;
}

// Render media item rows + keep raw JSON in sync (array ⇒ editor)
function renderMedia() {
  const list = $('#mediaList');
  const empty = $('#mediaEmpty');
  if (!list) return;
  list.innerHTML = '';
  empty.hidden = S.media.length > 0;

  S.media.forEach((m, i) => {
    const provider = m.provider || inferProvider(m.url);
    const isVisual = m.type === 'image';
    const isVideo  = m.type === 'video';
    let previewHtml;
    if (isVisual) {
      previewHtml = `<img src="${esc(m.url)}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('no-img')" />`;
    } else if (isVideo) {
      previewHtml = `<div class="media-badge mono">VIDEO</div>`;
    } else {
      previewHtml = `<div class="media-badge mono">${esc(provider.toUpperCase())}</div>`;
    }

    const row = el('div', 'media-item');
    row.innerHTML = `
      <div class="media-thumb">${previewHtml}</div>
      <div class="media-fields">
        <div class="media-fields-top">
          <span class="media-type mono">${esc(m.type)}</span>
          <select class="media-role" data-mi="${i}">
            ${MEDIA_ROLES.map(r => `<option value="${r}"${(m.role||'gallery')===r?' selected':''}>${r}</option>`).join('')}
          </select>
          <a class="media-url mono" href="${esc(m.url)}" target="_blank" rel="noopener" title="${esc(m.url)}">${esc(m.url)}</a>
        </div>
        <input type="text" class="media-caption" data-mi="${i}" placeholder="Billedtekst (caption)" value="${esc(m.caption || '')}" />
        <input type="text" class="media-alt" data-mi="${i}" placeholder="Alt-tekst (tilgængelighed)" value="${esc(m.alt || '')}" />
      </div>
      <div class="media-actions">
        <button type="button" class="ico-btn media-up" data-mi="${i}" title="Flyt op"${i===0?' disabled':''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
        <button type="button" class="ico-btn media-down" data-mi="${i}" title="Flyt ned"${i===S.media.length-1?' disabled':''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <button type="button" class="ico-btn danger media-del" data-mi="${i}" title="Fjern">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
    list.appendChild(row);
  });

  // Wire row controls
  list.querySelectorAll('.media-role').forEach(sel => {
    sel.onchange = () => { S.media[sel.dataset.mi].role = sel.value; writeMediaRaw(); };
  });
  list.querySelectorAll('.media-caption').forEach(inp => {
    inp.oninput = () => { S.media[inp.dataset.mi].caption = inp.value; writeMediaRaw(); };
  });
  list.querySelectorAll('.media-alt').forEach(inp => {
    inp.oninput = () => { S.media[inp.dataset.mi].alt = inp.value; writeMediaRaw(); };
  });
  list.querySelectorAll('.media-up').forEach(btn => {
    btn.onclick = () => { const i = +btn.dataset.mi; if (i>0) { [S.media[i-1],S.media[i]]=[S.media[i],S.media[i-1]]; renderMedia(); } };
  });
  list.querySelectorAll('.media-down').forEach(btn => {
    btn.onclick = () => { const i = +btn.dataset.mi; if (i<S.media.length-1) { [S.media[i+1],S.media[i]]=[S.media[i],S.media[i+1]]; renderMedia(); } };
  });
  list.querySelectorAll('.media-del').forEach(btn => {
    btn.onclick = () => { S.media.splice(+btn.dataset.mi, 1); renderMedia(); };
  });

  writeMediaRaw();
}

// Serialize S.media into the raw JSON escape-hatch textarea.
// Skip only while the user is actively typing in the raw field (avoid clobbering).
function writeMediaRaw() {
  const raw = $('#fieldMedia');
  if (!raw || document.activeElement === raw) return;
  raw.value = JSON.stringify(S.media, null, 2);
  raw.classList.remove('error');
}

// ── Blocks builder ─────────────────────────────────────────────────────────────
const BLOCK_TYPES = ['richtext','timeline','gallery','video','before_after','metrics','quote','embed'];
const BLOCK_LABELS = {
  richtext:'Rich text', timeline:'Tidslinje', gallery:'Galleri', video:'Video',
  before_after:'Før / efter', metrics:'Nøgletal', quote:'Citat', embed:'Embed',
};

function newBlock(type) {
  switch (type) {
    case 'timeline':     return { type, title:'', phases:[{ label:'', title:'', body:'', date:'' }] };
    case 'gallery':      return { type, title:'', layout:'grid', items:[] };
    case 'video':        return { type, title:'', items:[] };
    case 'before_after': return { type, title:'', before:{ url:'', label:'' }, after:{ url:'', label:'' } };
    case 'metrics':      return { type, title:'', items:[{ value:'', label:'' }] };
    case 'quote':        return { type, text:'', author:'', role:'' };
    case 'embed':        return { type, provider:'youtube', url:'', caption:'' };
    case 'richtext':
    default:             return { type:'richtext', eyebrow:'', title:'', body:'' };
  }
}

function initBlocksBuilder() {
  const b = $('#blocksBuilder');
  if (b.dataset.wired) return;
  b.dataset.wired = '1';
  $('#addBlockBtn').onclick = () => {
    S.blocks.push(newBlock($('#blockTypeSelect').value));
    renderBlocks();
  };
}

function renderBlocks() {
  const list = $('#blocksList');
  const empty = $('#blocksEmpty');
  if (!list) return;
  list.innerHTML = '';
  empty.hidden = S.blocks.length > 0;

  S.blocks.forEach((block, i) => {
    const card = el('div', 'block-card');
    card.innerHTML = `
      <div class="block-card-head">
        <span class="block-type mono">${esc(BLOCK_LABELS[block.type] || block.type)}</span>
        <div class="block-card-actions">
          <button type="button" class="ico-btn block-up" data-bi="${i}" title="Flyt op"${i===0?' disabled':''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button type="button" class="ico-btn block-down" data-bi="${i}" title="Flyt ned"${i===S.blocks.length-1?' disabled':''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button type="button" class="ico-btn danger block-del" data-bi="${i}" title="Fjern blok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="block-card-body" data-bi="${i}"></div>
    `;
    list.appendChild(card);
    renderBlockBody(card.querySelector('.block-card-body'), block, i);
  });

  list.querySelectorAll('.block-up').forEach(btn => {
    btn.onclick = () => { const i=+btn.dataset.bi; if (i>0) { [S.blocks[i-1],S.blocks[i]]=[S.blocks[i],S.blocks[i-1]]; renderBlocks(); } };
  });
  list.querySelectorAll('.block-down').forEach(btn => {
    btn.onclick = () => { const i=+btn.dataset.bi; if (i<S.blocks.length-1) { [S.blocks[i+1],S.blocks[i]]=[S.blocks[i],S.blocks[i+1]]; renderBlocks(); } };
  });
  list.querySelectorAll('.block-del').forEach(btn => {
    btn.onclick = () => { S.blocks.splice(+btn.dataset.bi, 1); renderBlocks(); };
  });

  writeBlocksRaw();
}

// Per-type field inputs
function renderBlockBody(container, block, i) {
  const txt = (label, key, ph='') =>
    `<div class="bf"><label>${label}</label><input type="text" data-bk="${key}" value="${esc(block[key]||'')}" placeholder="${esc(ph)}" /></div>`;
  const area = (label, key, ph='') =>
    `<div class="bf"><label>${label}</label><textarea rows="3" data-bk="${key}" placeholder="${esc(ph)}">${esc(block[key]||'')}</textarea></div>`;

  let html = '';
  switch (block.type) {
    case 'richtext':
      html = txt('Eyebrow','eyebrow') + txt('Titel','title') + area('Brødtekst','body','Markdown-lite: **fed**, linjeskift');
      break;
    case 'quote':
      html = area('Citat','text') + txt('Forfatter','author') + txt('Rolle','role');
      break;
    case 'embed':
      html = `<div class="bf"><label>Provider</label><select data-bk="provider">
        <option value="youtube"${block.provider==='youtube'?' selected':''}>YouTube</option>
        <option value="vimeo"${block.provider==='vimeo'?' selected':''}>Vimeo</option>
      </select></div>` + txt('URL','url','https://…') + txt('Caption','caption');
      break;
    case 'before_after':
      html = txt('Titel','title')
        + `<div class="bf-row">
             <div class="bf"><label>Før URL</label><input type="text" data-bk2="before.url" value="${esc(block.before?.url||'')}" placeholder="https://…" /></div>
             <div class="bf"><label>Før label</label><input type="text" data-bk2="before.label" value="${esc(block.before?.label||'')}" /></div>
           </div>
           <div class="bf-row">
             <div class="bf"><label>Efter URL</label><input type="text" data-bk2="after.url" value="${esc(block.after?.url||'')}" placeholder="https://…" /></div>
             <div class="bf"><label>Efter label</label><input type="text" data-bk2="after.label" value="${esc(block.after?.label||'')}" /></div>
           </div>`;
      break;
    case 'timeline':
      html = txt('Titel','title') + renderPhases(block, i);
      break;
    case 'gallery':
      html = txt('Titel','title')
        + `<div class="bf"><label>Layout</label><select data-bk="layout">
             <option value="grid"${block.layout==='grid'?' selected':''}>Grid</option>
             <option value="masonry"${block.layout==='masonry'?' selected':''}>Masonry</option>
           </select></div>`
        + renderBlockItems(block, i, 'gallery');
      break;
    case 'video':
      html = txt('Titel','title') + renderBlockItems(block, i, 'video');
      break;
    case 'metrics':
      html = txt('Titel','title') + renderMetricItems(block, i);
      break;
    default:
      html = `<p class="bf-note mono">Ukendt bloktype: ${esc(block.type)}</p>`;
  }
  container.innerHTML = html;
  wireBlockBody(container, block, i);
}

function renderPhases(block, i) {
  const phases = Array.isArray(block.phases) ? block.phases : [];
  return `<div class="phases">
    ${phases.map((p, pi) => `
      <div class="phase-row" data-pi="${pi}">
        <div class="bf-row">
          <div class="bf"><label>Label</label><input type="text" data-pk="label" value="${esc(p.label||'')}" placeholder="Fase 01" /></div>
          <div class="bf"><label>Dato</label><input type="text" data-pk="date" value="${esc(p.date||'')}" placeholder="2026-01" /></div>
        </div>
        <div class="bf"><label>Titel</label><input type="text" data-pk="title" value="${esc(p.title||'')}" placeholder="Discovery" /></div>
        <div class="bf"><label>Tekst</label><textarea rows="2" data-pk="body">${esc(p.body||'')}</textarea></div>
        <button type="button" class="btn-ghost phase-del" data-pi="${pi}">Fjern fase</button>
      </div>
    `).join('')}
    <button type="button" class="btn-ghost btn-add phase-add">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Tilføj fase
    </button>
  </div>`;
}

function renderBlockItems(block, i, kind) {
  const items = Array.isArray(block.items) ? block.items : [];
  return `<div class="block-items">
    ${items.map((it, ii) => `
      <div class="block-item-row" data-ii="${ii}">
        <input type="text" data-ik="url" value="${esc(it.url||'')}" placeholder="${kind==='video'?'Video/embed-URL':'Billede-URL'}" />
        <input type="text" data-ik="caption" value="${esc(it.caption||'')}" placeholder="Caption" />
        <button type="button" class="ico-btn danger item-del" data-ii="${ii}" title="Fjern">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('')}
    <button type="button" class="btn-ghost btn-add item-add">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Tilføj ${kind==='video'?'video':'billede'}
    </button>
  </div>`;
}

function renderMetricItems(block, i) {
  const items = Array.isArray(block.items) ? block.items : [];
  return `<div class="block-items">
    ${items.map((it, ii) => `
      <div class="block-item-row" data-ii="${ii}">
        <input type="text" data-ik="value" value="${esc(it.value||'')}" placeholder="Værdi (+64%)" />
        <input type="text" data-ik="label" value="${esc(it.label||'')}" placeholder="Label" />
        <button type="button" class="ico-btn danger item-del" data-ii="${ii}" title="Fjern">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('')}
    <button type="button" class="btn-ghost btn-add item-add">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Tilføj nøgletal
    </button>
  </div>`;
}

function wireBlockBody(container, block, i) {
  // Simple top-level keys
  container.querySelectorAll('[data-bk]').forEach(inp => {
    inp.oninput = inp.onchange = () => { block[inp.dataset.bk] = inp.value; writeBlocksRaw(); };
  });
  // Nested dotted keys (before.url etc.)
  container.querySelectorAll('[data-bk2]').forEach(inp => {
    inp.oninput = () => {
      const [parent, child] = inp.dataset.bk2.split('.');
      if (!block[parent] || typeof block[parent] !== 'object') block[parent] = {};
      block[parent][child] = inp.value;
      writeBlocksRaw();
    };
  });

  // Timeline phases
  if (block.type === 'timeline') {
    if (!Array.isArray(block.phases)) block.phases = [];
    container.querySelectorAll('.phase-row').forEach(row => {
      const pi = +row.dataset.pi;
      row.querySelectorAll('[data-pk]').forEach(inp => {
        inp.oninput = () => { block.phases[pi][inp.dataset.pk] = inp.value; writeBlocksRaw(); };
      });
      row.querySelector('.phase-del').onclick = () => { block.phases.splice(pi,1); renderBlocks(); };
    });
    const add = container.querySelector('.phase-add');
    if (add) add.onclick = () => { block.phases.push({ label:'', title:'', body:'', date:'' }); renderBlocks(); };
  }

  // Gallery/video/metrics items
  if (block.type === 'gallery' || block.type === 'video' || block.type === 'metrics') {
    if (!Array.isArray(block.items)) block.items = [];
    container.querySelectorAll('.block-item-row').forEach(row => {
      const ii = +row.dataset.ii;
      row.querySelectorAll('[data-ik]').forEach(inp => {
        inp.oninput = () => { block.items[ii][inp.dataset.ik] = inp.value; writeBlocksRaw(); };
      });
      row.querySelector('.item-del').onclick = () => { block.items.splice(ii,1); renderBlocks(); };
    });
    const add = container.querySelector('.item-add');
    if (add) add.onclick = () => {
      if (block.type === 'metrics') block.items.push({ value:'', label:'' });
      else block.items.push({ type: block.type === 'video' ? 'video' : 'image', url:'', caption:'' });
      renderBlocks();
    };
  }
}

// Serialize blocks into the hidden field
function writeBlocksRaw() {
  const f = $('#fieldBlocks');
  if (f) f.value = JSON.stringify(S.blocks);
}

// Build the cleaned media array for the payload
function collectMedia() {
  // Pull any pending raw-JSON edits the user is mid-typing in the advanced panel
  const raw = $('#fieldMedia');
  if (raw && document.activeElement === raw) syncMediaFromRaw();
  return S.media.filter(m => m && m.url).map(normalizeMediaItem);
}

// ── Form submission ────────────────────────────────────────────────────────────
async function submitForm(status) {
  const titleEl = $('#fieldTitle');
  if (!titleEl.value.trim()) {
    titleEl.classList.add('error');
    titleEl.focus();
    toast('Titel er påkrævet', 'error');
    return;
  }
  titleEl.classList.remove('error');

  // Collect tags/tech from inputs (in case user typed without pressing Enter)
  [
    { wrapId: 'tagsInput', arr: S.tags },
    { wrapId: 'techInput',  arr: S.tech },
  ].forEach(({ wrapId, arr }) => {
    const val = $(`#${wrapId} .tag-text-input`).value.trim();
    if (val && !arr.includes(val)) arr.push(val);
    $(`#${wrapId} .tag-text-input`).value = '';
  });

  const payload = {
    title:              $('#fieldTitle').value.trim(),
    slug:               $('#fieldSlug').value.trim(),
    category:           $('#fieldCategory').value,
    description:        $('#fieldDescription').value.trim(),
    long_description:   $('#fieldLongDesc').value.trim(),
    challenge:          $('#fieldChallenge').value.trim(),
    approach:           $('#fieldApproach').value.trim(),
    tags:               [...S.tags],
    tech_stack:         [...S.tech],
    client:             $('#fieldClient').value.trim(),
    year:               parseInt($('#fieldYear').value) || new Date().getFullYear(),
    status,
    featured:           $('#fieldFeatured').checked,
    sort_order:         parseInt($('#fieldSortOrder').value) || 0,
    metrics:            S.metrics.filter(m => m.value || m.label),
    testimonial_text:   $('#fieldTestiText').value.trim(),
    testimonial_author: $('#fieldTestiAuthor').value.trim(),
    testimonial_role:   $('#fieldTestiRole').value.trim(),
    thumbnail_url:      $('#fieldThumb').value.trim(),
    case_url:           $('#fieldCaseUrl').value.trim(),
    media:              collectMedia(),
    blocks:             S.blocks.map(b => ({ ...b })),
  };

  // Disable buttons
  const btns = $$('#formView button[type=submit], #formView .btn-primary, #formView .btn-outline');
  btns.forEach(b => b.disabled = true);

  try {
    const isEdit = !!S.editId;
    const result = isEdit
      ? await api.updateProject(S.editId, payload)
      : await api.createProject(payload);

    // Refresh cache
    S.projects = await api.getProjects();
    const badge = $('#projectCount');
    if (badge) badge.textContent = S.projects.length;

    toast(
      isEdit
        ? `"${result.title}" gemt${status === 'published' ? ' og publiceret' : ' som kladde'}`
        : `"${result.title}" oprettet${status === 'published' ? ' og publiceret' : ' som kladde'}`,
      'success'
    );
    navigate('projects');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btns.forEach(b => b.disabled = false);
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

$('#projectForm').addEventListener('submit', (e) => {
  e.preventDefault();
  submitForm('published');
});

// ── Boot ───────────────────────────────────────────────────────────────────────
checkAuth();
