'use strict';
/* ============================================================
   Mast3kMedia Admin Panel — full SPA
   ============================================================ */

// ── State ──────────────────────────────────────────────────────────────────────
const S = {
  token:    localStorage.getItem('m3k_token') || null,
  view:     'dashboard',
  projects: [],
  editId:   null,   // null = create, number = update
  tags:     [],
  tech:     [],
  metrics:  [],
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
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  login:       (u, p)     => fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:u, password:p }) }).then(r => r.json()),
  me:          ()         => api.req('GET',    '/api/auth/me'),
  getStats:    ()         => api.req('GET',    '/api/admin/stats'),
  getProjects: ()         => api.req('GET',    '/api/admin/projects'),
  createProject: (d)      => api.req('POST',   '/api/admin/projects', d),
  updateProject: (id, d)  => api.req('PUT',    `/api/admin/projects/${id}`, d),
  deleteProject: (id)     => api.req('DELETE', `/api/admin/projects/${id}`),
  setStatus:   (id, s)    => api.req('PATCH',  `/api/admin/projects/${id}/status`, { status: s }),
  setFeatured: (id, f)    => api.req('PATCH',  `/api/admin/projects/${id}/featured`, { featured: f }),
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

const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

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
    if (res.error) throw new Error(res.error);
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
  const views = ['dashboardView','projectsView','formView'];
  const map   = { dashboard:'dashboardView', projects:'projectsView', form:'formView' };
  views.forEach(id => { $(`.view#${id}`) && ($(`.view#${id}`).hidden = (map[view] !== id)); });

  // Topbar title
  const titles = { dashboard: 'Dashboard', projects: 'Projekter', form: S.editId ? 'Rediger projekt' : 'Nyt projekt' };
  $('#topbarTitle').textContent = titles[view] || '';

  // Clear topbar actions
  $('#topbarActions').innerHTML = '';

  // Load view content
  if (view === 'dashboard') loadDashboard();
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

    // Recent projects table (last 5)
    renderProjectsTable($('#dashProjectsList'), projects.slice(0, 5), true);
  } catch (err) {
    toast('Kunne ikke hente data: ' + err.message, 'error');
  }
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
  } else {
    // Clear all fields
    $('#projectForm').reset();
    $('#fieldId').value = '';
    S.tags = []; S.tech = []; S.metrics = [];
    $('#fieldYear').value = new Date().getFullYear();
    $('#fieldSortOrder').value = 0;
  }

  renderTags();
  renderTech();
  renderMetrics();

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

  // Wire tag inputs
  wireTagInput('tagsInput', 'tagsDisplay', S.tags, 'fieldTags');
  wireTagInput('techInput',  'techDisplay',  S.tech,  'fieldTech');

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
function wireTagInput(wrapId, displayId, arr, hiddenId) {
  const wrap    = $(`#${wrapId}`);
  const display = $(`#${displayId}`);
  const input   = wrap.querySelector('.tag-text-input');
  const hidden  = $(`#${hiddenId}`);

  function refresh() {
    display.innerHTML = arr.map((t, i) =>
      `<span class="tag-chip">${esc(t)}<button type="button" data-i="${i}" aria-label="Fjern ${esc(t)}">×</button></span>`
    ).join('');
    display.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => { arr.splice(parseInt(btn.dataset.i), 1); refresh(); };
    });
    hidden.value = JSON.stringify(arr);
  }

  const add = () => {
    const val = input.value.trim();
    if (val && !arr.includes(val)) { arr.push(val); refresh(); }
    input.value = '';
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    if (e.key === 'Backspace' && !input.value && arr.length) { arr.pop(); refresh(); }
  });
  input.addEventListener('blur', add);
  wrap.addEventListener('click', () => input.focus());

  refresh();
}

function renderTags() { wireTagInput('tagsInput', 'tagsDisplay', S.tags, 'fieldTags'); }
function renderTech() { wireTagInput('techInput',  'techDisplay',  S.tech,  'fieldTech'); }

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

// ── Boot ───────────────────────────────────────────────────────────────────────
checkAuth();
