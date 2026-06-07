import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X, ChevronUp, ChevronDown, Video, Search, Tag, Check } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import ImageUpload from '@/components/admin/ImageUpload';
import GalleryUpload from '@/components/admin/GalleryUpload';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import VideoUpload from '@/components/admin/VideoUpload';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { CardSkeleton } from '@/components/admin/AdminSkeleton';
import StatusBadge from '@/components/StatusBadge';
import { PROJECT_STATUSES, statusLabels, normalizeStatus, type ProjectStatus } from '@/lib/projectStatus';

type Project = Tables<'projects'>;

const categories = ['Web App', 'Mobile', 'Open Source', 'API'];

const TagLibrary = ({ projects, onRename, onDelete }: { projects: Project[]; onRename: (oldT: string, newT: string) => Promise<void>; onDelete: (t: string) => Promise<void> }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => (p.tech_stack || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);

  if (tagCounts.length === 0) return null;

  return (
    <div className="glass rounded-xl gradient-border p-4 mb-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={expanded}
      >
        <Tag size={14} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Tag library</span>
        <span className="text-[10px] text-muted-foreground/60">({tagCounts.length} unique)</span>
        <ChevronDown size={14} className={`text-muted-foreground ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tagCounts.map(([t, count]) => {
            const isEditing = editing === t;
            return (
              <div key={t} className="flex items-center gap-1 bg-muted/20 border border-border rounded-full pl-3 pr-1 py-0.5 text-xs">
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { onRename(t, renameValue); setEditing(null); }
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      className="bg-transparent outline-none text-foreground w-24"
                    />
                    <button
                      onClick={() => { onRename(t, renameValue); setEditing(null); }}
                      className="p-1 text-primary hover:text-primary/80"
                      aria-label="Confirm rename"
                    >
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Cancel">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-foreground">{t}</span>
                    <span className="text-muted-foreground/60 ml-1">{count}</span>
                    <button
                      onClick={() => { setEditing(t); setRenameValue(t); }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Rename ${t}`}
                    >
                      <Pencil size={11} />
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button className="p-1 text-muted-foreground hover:text-destructive transition-colors" aria-label={`Delete ${t}`}>
                          <Trash2 size={11} />
                        </button>
                      }
                      title={`Remove tag "${t}"?`}
                      description={`It will be removed from ${count} project(s). This won't delete the projects themselves.`}
                      onConfirm={() => onDelete(t)}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const emptyProject = {
  title: '', description: '', short_description: '', category: 'Web App',
  tech_stack: [] as string[], thumbnail_url: '', gallery_images: [] as string[],
  video_urls: [] as string[], preview_urls: [] as string[], hero_video_url: '',
  live_demo_url: '', github_url: '', featured: false, display_order: 0,
  status: 'live' as ProjectStatus,
  pinned: false,
  key_features: [] as { title: string; desc: string; icon: string }[],
  case_study: { problem: '', solution: '', outcome: '', role: '', client: '', year: '', duration: '' },
  metrics: [] as { label: string; value: string; prefix?: string; suffix?: string }[],
  testimonials: [] as { quote: string; author: string; role?: string; avatar_url?: string }[],
  tech_rationale: {} as Record<string, string>,
  timeline: [] as { date?: string; title: string; description?: string }[],
  process_gallery: [] as { url: string; caption?: string }[],
  related_project_ids: [] as string[],
  before_after: [] as { before: string; after: string; caption?: string }[],
  faq: [] as { question: string; answer: string }[],
  press_links: [] as { title: string; source?: string; url: string; date?: string }[],
  deliverables: [] as { title: string; desc?: string; icon?: string }[],
  budget: { range: '', model: '', duration: '', note: '' } as { range?: string; model?: string; duration?: string; note?: string },
};

const AdminProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [techInput, setTechInput] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDesc, setFeatureDesc] = useState('');
  const [featureIcon, setFeatureIcon] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [previewInput, setPreviewInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [listQuery, setListQuery] = useState('');
  const [defaultView, setDefaultView] = useState<string>('grid');
  const [defaultSort, setDefaultSort] = useState<string>('order');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setDefaultView(data.default_projects_view || 'grid');
      setDefaultSort(data.default_projects_sort || 'order');
    }
  };

  const saveSettings = async (view: string, sort: string) => {
    setSavingSettings(true);
    if (settingsId) {
      const { error } = await supabase.from('site_settings').update({ default_projects_view: view, default_projects_sort: sort }).eq('id', settingsId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Defaults saved' });
    } else {
      const { data, error } = await supabase.from('site_settings').insert({ default_projects_view: view, default_projects_sort: sort }).select().single();
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { if (data) setSettingsId(data.id); toast({ title: 'Defaults saved' }); }
    }
    setSavingSettings(false);
  };

  const fetchProjects = async () => {
    setFetching(true);
    const { data } = await supabase.from('projects').select('*').order('display_order');
    if (data) setProjects(data);
    setFetching(false);
  };

  useEffect(() => { fetchProjects(); fetchSettings(); }, []);

  const startEdit = (project: Project) => {
    setEditing(project.id);
    setForm({
      title: project.title, description: project.description,
      short_description: project.short_description, category: project.category,
      tech_stack: project.tech_stack || [], thumbnail_url: project.thumbnail_url || '',
      gallery_images: project.gallery_images || [],
      video_urls: (project as any).video_urls || [],
      preview_urls: (project as any).preview_urls || [],
      hero_video_url: (project as any).hero_video_url || '',
      live_demo_url: project.live_demo_url || '',
      github_url: project.github_url || '', featured: project.featured,
      display_order: project.display_order,
      status: normalizeStatus((project as any).status),
      pinned: !!(project as any).pinned,
      key_features: (project.key_features as any[]) || [],
      case_study: { ...emptyProject.case_study, ...((project as any).case_study || {}) },
      metrics: ((project as any).metrics as any[]) || [],
      testimonials: ((project as any).testimonials as any[]) || [],
      tech_rationale: ((project as any).tech_rationale as Record<string, string>) || {},
      timeline: ((project as any).timeline as any[]) || [],
      process_gallery: ((project as any).process_gallery as any[]) || [],
      related_project_ids: ((project as any).related_project_ids as string[]) || [],
      before_after: ((project as any).before_after as any[]) || [],
      faq: ((project as any).faq as any[]) || [],
      press_links: ((project as any).press_links as any[]) || [],
      deliverables: ((project as any).deliverables as any[]) || [],
      budget: { ...emptyProject.budget, ...((project as any).budget || {}) },
    });
  };

  const startNew = () => {
    setEditing('new');
    setForm({ ...emptyProject, display_order: projects.length });
  };

  const cancel = () => { setEditing(null); setForm(emptyProject); };

  const addTech = () => {
    if (techInput.trim()) {
      setForm({ ...form, tech_stack: [...form.tech_stack, techInput.trim()] });
      setTechInput('');
    }
  };

  const addFeature = () => {
    if (featureTitle.trim()) {
      setForm({ ...form, key_features: [...form.key_features, { title: featureTitle, desc: featureDesc, icon: featureIcon || 'Zap' }] });
      setFeatureTitle(''); setFeatureDesc(''); setFeatureIcon('');
    }
  };

  const addVideo = () => {
    if (videoInput.trim()) {
      setForm({ ...form, video_urls: [...form.video_urls, videoInput.trim()] });
      setVideoInput('');
    }
  };

  const addPreview = () => {
    if (previewInput.trim()) {
      setForm({ ...form, preview_urls: [...form.preview_urls, previewInput.trim()] });
      setPreviewInput('');
    }
  };

  const save = async () => {
    setLoading(true);
    const payload: any = {
      title: form.title, description: form.description, short_description: form.short_description,
      category: form.category, tech_stack: form.tech_stack,
      thumbnail_url: form.thumbnail_url || null, gallery_images: form.gallery_images,
      video_urls: form.video_urls, preview_urls: form.preview_urls,
      hero_video_url: form.hero_video_url || null,
      live_demo_url: form.live_demo_url || null, github_url: form.github_url || null,
      featured: form.featured, display_order: form.display_order,
      status: form.status,
      pinned: form.pinned,
      case_study: form.case_study as any,
      metrics: form.metrics as any,
      testimonials: form.testimonials as any,
      key_features: form.key_features as any,
      tech_rationale: form.tech_rationale as any,
      timeline: form.timeline as any,
      process_gallery: form.process_gallery as any,
      related_project_ids: form.related_project_ids,
      before_after: form.before_after as any,
      faq: form.faq as any,
      press_links: form.press_links as any,
      deliverables: form.deliverables as any,
      budget: form.budget as any,
    };

    // Enforce single pinned project: unpin all others first
    if (form.pinned) {
      const others = projects.filter((p) => (p as any).pinned && p.id !== editing);
      if (others.length > 0) {
        await Promise.all(others.map((p) => supabase.from('projects').update({ pinned: false } as any).eq('id', p.id)));
      }
    }

    if (editing === 'new') {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Project created!' });
    } else {
      const { error } = await supabase.from('projects').update(payload).eq('id', editing!);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Project updated!' });
    }
    setLoading(false);
    cancel();
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Project deleted' });
    fetchProjects();
  };

  const reorder = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= projects.length) return;
    const a = projects[index];
    const b = projects[swapIdx];
    await Promise.all([
      supabase.from('projects').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('projects').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
    fetchProjects();
  };

  // ---- Tag library helpers (Phase 3) ----
  const renameTagAcrossProjects = async (oldTag: string, newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || trimmed === oldTag) return;
    const affected = projects.filter((p) => (p.tech_stack || []).includes(oldTag));
    await Promise.all(
      affected.map((p) => {
        const next = Array.from(new Set((p.tech_stack || []).map((t) => (t === oldTag ? trimmed : t))));
        return supabase.from('projects').update({ tech_stack: next }).eq('id', p.id);
      }),
    );
    toast({ title: `Renamed "${oldTag}" → "${trimmed}"`, description: `${affected.length} project(s) updated` });
    fetchProjects();
  };

  const deleteTagAcrossProjects = async (tag: string) => {
    const affected = projects.filter((p) => (p.tech_stack || []).includes(tag));
    await Promise.all(
      affected.map((p) => {
        const next = (p.tech_stack || []).filter((t) => t !== tag);
        return supabase.from('projects').update({ tech_stack: next }).eq('id', p.id);
      }),
    );
    toast({ title: `Removed "${tag}"`, description: `From ${affected.length} project(s)` });
    fetchProjects();
  };

  const inputClass = "w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors";

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{editing === 'new' ? 'New Project' : 'Edit Project'}</h1>
          <button onClick={cancel} className="glass px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <X size={16} /> Cancel
          </button>
        </div>

        <div className="glass rounded-xl gradient-border p-4 sm:p-6 space-y-5 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Short Description</label>
            <input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className={inputClass} />
          </div>

          <MarkdownEditor label="Full Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={5} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload label="Thumbnail" value={form.thumbnail_url} onChange={(url) => setForm({ ...form, thumbnail_url: url })} folder="thumbnails" />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className={inputClass} />
            </div>
          </div>

          <GalleryUpload value={form.gallery_images} onChange={(urls) => setForm({ ...form, gallery_images: urls })} />

          {/* Hero Showreel */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Hero Showreel URL (autoplays muted on detail page)</label>
            <input
              value={form.hero_video_url}
              onChange={(e) => setForm({ ...form, hero_video_url: e.target.value })}
              placeholder="https://...mp4 or YouTube/Vimeo URL"
              className={inputClass}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Supports .mp4/.webm files, YouTube and Vimeo links. Leave empty to use the thumbnail.</p>
          </div>

          {/* Video Upload + URLs */}
          <VideoUpload value={form.video_urls} onChange={(urls) => setForm({ ...form, video_urls: urls })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Or add video by URL (YouTube, Vimeo, Loom)</label>
            <div className="flex gap-2">
              <input value={videoInput} onChange={(e) => setVideoInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
              <button onClick={addVideo} className="glass px-4 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">Add</button>
            </div>
          </div>

          {/* Live Preview URLs */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Live Preview URLs (iframe embeds)</label>
            <div className="flex gap-2 mb-2">
              <input value={previewInput} onChange={(e) => setPreviewInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreview())} placeholder="https://your-project.vercel.app" className={inputClass} />
              <button onClick={addPreview} className="glass px-4 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">Add</button>
            </div>
            <div className="space-y-2">
              {form.preview_urls.map((url, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 text-sm">
                  <span className="text-muted-foreground flex-1 truncate font-mono text-xs">{url}</span>
                  <button onClick={() => setForm({ ...form, preview_urls: form.preview_urls.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">GitHub URL</label>
              <input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Live Demo URL</label>
              <input value={form.live_demo_url} onChange={(e) => setForm({ ...form, live_demo_url: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} id="featured" className="accent-primary" />
              <label htmlFor="featured" className="text-sm text-foreground">Featured Project</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} id="pinned" className="accent-primary" />
              <label htmlFor="pinned" className="text-sm text-foreground">Pinned hero (only one)</label>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="status" className="text-sm text-foreground">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                className={inputClass}
                style={{ minWidth: 160 }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tech Stack</label>
            <div className="flex gap-2 mb-2">
              <input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())} placeholder="Add technology..." className={inputClass} />
              <button onClick={addTech} className="glass px-4 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tech_stack.map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  {t} <button onClick={() => setForm({ ...form, tech_stack: form.tech_stack.filter((_, idx) => idx !== i) })} className="hover:text-destructive"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Key Features</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input value={featureTitle} onChange={(e) => setFeatureTitle(e.target.value)} placeholder="Title" className={inputClass} />
              <input value={featureDesc} onChange={(e) => setFeatureDesc(e.target.value)} placeholder="Description" className={inputClass} />
              <div className="flex gap-2">
                <input value={featureIcon} onChange={(e) => setFeatureIcon(e.target.value)} placeholder="Icon" className={inputClass} />
                <button onClick={addFeature} className="glass px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">+</button>
              </div>
            </div>
            <div className="space-y-2">
              {form.key_features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 text-sm">
                  <span className="text-accent font-mono text-xs">{f.icon}</span>
                  <span className="text-foreground font-medium">{f.title}</span>
                  <span className="text-muted-foreground flex-1 hidden sm:block">{f.desc}</span>
                  <button onClick={() => setForm({ ...form, key_features: form.key_features.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Case Study */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground block uppercase tracking-wider">Case study</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['role', 'client', 'year', 'duration'] as const).map((k) => (
                <input
                  key={k}
                  placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={form.case_study[k] || ''}
                  onChange={(e) => setForm({ ...form, case_study: { ...form.case_study, [k]: e.target.value } })}
                  className={inputClass}
                />
              ))}
            </div>
            {(['problem', 'solution', 'outcome'] as const).map((k) => (
              <div key={k}>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">{k}</label>
                <textarea
                  rows={3}
                  value={form.case_study[k] || ''}
                  onChange={(e) => setForm({ ...form, case_study: { ...form.case_study, [k]: e.target.value } })}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Headline metrics (animated counters)</label>
            <div className="space-y-2">
              {form.metrics.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Label (e.g. Active users)" value={m.label} onChange={(e) => setForm({ ...form, metrics: form.metrics.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) })} className={`${inputClass} col-span-5`} />
                  <input placeholder="Prefix" value={m.prefix || ''} onChange={(e) => setForm({ ...form, metrics: form.metrics.map((x, idx) => idx === i ? { ...x, prefix: e.target.value } : x) })} className={`${inputClass} col-span-1`} />
                  <input placeholder="Value" value={m.value} onChange={(e) => setForm({ ...form, metrics: form.metrics.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                  <input placeholder="Suffix" value={m.suffix || ''} onChange={(e) => setForm({ ...form, metrics: form.metrics.map((x, idx) => idx === i ? { ...x, suffix: e.target.value } : x) })} className={`${inputClass} col-span-2`} />
                  <button onClick={() => setForm({ ...form, metrics: form.metrics.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, metrics: [...form.metrics, { label: '', value: '', prefix: '', suffix: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add metric</button>
          </div>

          {/* Testimonials */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Testimonials</label>
            <div className="space-y-3">
              {form.testimonials.map((t, i) => (
                <div key={i} className="bg-muted/15 rounded-lg p-3 space-y-2">
                  <textarea rows={2} placeholder="Quote" value={t.quote} onChange={(e) => setForm({ ...form, testimonials: form.testimonials.map((x, idx) => idx === i ? { ...x, quote: e.target.value } : x) })} className={inputClass} />
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input placeholder="Author" value={t.author} onChange={(e) => setForm({ ...form, testimonials: form.testimonials.map((x, idx) => idx === i ? { ...x, author: e.target.value } : x) })} className={`${inputClass} col-span-4`} />
                    <input placeholder="Role" value={t.role || ''} onChange={(e) => setForm({ ...form, testimonials: form.testimonials.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x) })} className={`${inputClass} col-span-4`} />
                    <input placeholder="Avatar URL" value={t.avatar_url || ''} onChange={(e) => setForm({ ...form, testimonials: form.testimonials.map((x, idx) => idx === i ? { ...x, avatar_url: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                    <button onClick={() => setForm({ ...form, testimonials: form.testimonials.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, testimonials: [...form.testimonials, { quote: '', author: '', role: '', avatar_url: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add testimonial</button>
          </div>

          {/* Tech Rationale (Phase 9) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Why this tech (per-tag rationale)</label>
            {form.tech_stack.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">Add tech stack tags above to write rationale for each.</p>
            ) : (
              <div className="space-y-2">
                {form.tech_stack.map((t) => (
                  <div key={t} className="grid grid-cols-12 gap-2 items-start">
                    <span className="col-span-3 text-xs font-mono text-primary px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg truncate">{t}</span>
                    <textarea
                      rows={2}
                      placeholder={`Why ${t}?`}
                      value={form.tech_rationale[t] || ''}
                      onChange={(e) => setForm({ ...form, tech_rationale: { ...form.tech_rationale, [t]: e.target.value } })}
                      className={`${inputClass} col-span-9`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline (Phase 10) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Project timeline / milestones</label>
            <div className="space-y-2">
              {form.timeline.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input placeholder="Date (e.g. Mar 2025)" value={m.date || ''} onChange={(e) => setForm({ ...form, timeline: form.timeline.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                  <input placeholder="Title" value={m.title} onChange={(e) => setForm({ ...form, timeline: form.timeline.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                  <input placeholder="Description (optional)" value={m.description || ''} onChange={(e) => setForm({ ...form, timeline: form.timeline.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) })} className={`${inputClass} col-span-5`} />
                  <button onClick={() => setForm({ ...form, timeline: form.timeline.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1 mt-2"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, timeline: [...form.timeline, { date: '', title: '', description: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add milestone</button>
          </div>

          {/* Process gallery (Phase 12) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Process gallery (BTS images)</label>
            <div className="space-y-2">
              {form.process_gallery.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input placeholder="Image URL" value={m.url} onChange={(e) => setForm({ ...form, process_gallery: form.process_gallery.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x) })} className={`${inputClass} col-span-5`} />
                  <input placeholder="Caption (optional)" value={m.caption || ''} onChange={(e) => setForm({ ...form, process_gallery: form.process_gallery.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x) })} className={`${inputClass} col-span-6`} />
                  <button onClick={() => setForm({ ...form, process_gallery: form.process_gallery.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1 mt-2"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, process_gallery: [...form.process_gallery, { url: '', caption: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add process image</button>
          </div>

          {/* Related projects (Phase 11) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Related projects (override smart picks)</label>
            <p className="text-[11px] text-muted-foreground/70">Leave empty to auto-pick by category & shared tech.</p>
            <div className="flex flex-wrap gap-2">
              {projects.filter((p) => p.id !== editing).map((p) => {
                const checked = form.related_project_ids.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      related_project_ids: checked
                        ? form.related_project_ids.filter((id) => id !== p.id)
                        : [...form.related_project_ids, p.id],
                    })}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      checked
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    {checked ? '✓ ' : ''}{p.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Before / After (Phase 13) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Before / After comparisons</label>
            <div className="space-y-3">
              {form.before_after.map((m, i) => (
                <div key={i} className="bg-muted/15 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input placeholder="Before image URL" value={m.before} onChange={(e) => setForm({ ...form, before_after: form.before_after.map((x, idx) => idx === i ? { ...x, before: e.target.value } : x) })} className={`${inputClass} col-span-5`} />
                    <input placeholder="After image URL" value={m.after} onChange={(e) => setForm({ ...form, before_after: form.before_after.map((x, idx) => idx === i ? { ...x, after: e.target.value } : x) })} className={`${inputClass} col-span-6`} />
                    <button onClick={() => setForm({ ...form, before_after: form.before_after.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1 mt-2"><X size={14} /></button>
                  </div>
                  <input placeholder="Caption (optional)" value={m.caption || ''} onChange={(e) => setForm({ ...form, before_after: form.before_after.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x) })} className={inputClass} />
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, before_after: [...form.before_after, { before: '', after: '', caption: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add comparison</button>
          </div>

          {/* FAQ (Phase 14) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">FAQ</label>
            <div className="space-y-2">
              {form.faq.map((m, i) => (
                <div key={i} className="bg-muted/15 rounded-lg p-3 space-y-2">
                  <input placeholder="Question" value={m.question} onChange={(e) => setForm({ ...form, faq: form.faq.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x) })} className={inputClass} />
                  <div className="flex gap-2">
                    <textarea rows={2} placeholder="Answer" value={m.answer} onChange={(e) => setForm({ ...form, faq: form.faq.map((x, idx) => idx === i ? { ...x, answer: e.target.value } : x) })} className={`${inputClass} flex-1`} />
                    <button onClick={() => setForm({ ...form, faq: form.faq.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive self-start mt-2"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, faq: [...form.faq, { question: '', answer: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add FAQ</button>
          </div>

          {/* Press links (Phase 15) */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Press / external links</label>
            <div className="space-y-2">
              {form.press_links.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input placeholder="Title" value={m.title} onChange={(e) => setForm({ ...form, press_links: form.press_links.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} className={`${inputClass} col-span-4`} />
                  <input placeholder="Source" value={m.source || ''} onChange={(e) => setForm({ ...form, press_links: form.press_links.map((x, idx) => idx === i ? { ...x, source: e.target.value } : x) })} className={`${inputClass} col-span-2`} />
                  <input placeholder="URL" value={m.url} onChange={(e) => setForm({ ...form, press_links: form.press_links.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                  <input placeholder="Date" value={m.date || ''} onChange={(e) => setForm({ ...form, press_links: form.press_links.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x) })} className={`${inputClass} col-span-2`} />
                  <button onClick={() => setForm({ ...form, press_links: form.press_links.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1 mt-2"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, press_links: [...form.press_links, { title: '', source: '', url: '', date: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add press link</button>
          </div>

          {/* Deliverables */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Deliverables / scope shipped</label>
            <div className="space-y-2">
              {form.deliverables.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input placeholder="Title (e.g. Design system)" value={d.title} onChange={(e) => setForm({ ...form, deliverables: form.deliverables.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x) })} className={`${inputClass} col-span-3`} />
                  <input placeholder="Description (optional)" value={d.desc || ''} onChange={(e) => setForm({ ...form, deliverables: form.deliverables.map((x, idx) => idx === i ? { ...x, desc: e.target.value } : x) })} className={`${inputClass} col-span-6`} />
                  <input placeholder="Icon (lucide name)" value={d.icon || ''} onChange={(e) => setForm({ ...form, deliverables: form.deliverables.map((x, idx) => idx === i ? { ...x, icon: e.target.value } : x) })} className={`${inputClass} col-span-2`} />
                  <button onClick={() => setForm({ ...form, deliverables: form.deliverables.filter((_, idx) => idx !== i) })} className="text-muted-foreground hover:text-destructive col-span-1 mt-2"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({ ...form, deliverables: [...form.deliverables, { title: '', desc: '', icon: '' }] })} className="glass px-3 py-1.5 rounded-lg text-xs text-foreground hover:bg-muted/30">+ Add deliverable</button>
          </div>

          {/* Budget transparency */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Budget transparency (optional)</label>
            <p className="text-[11px] text-muted-foreground/70">Shown publicly on the project page. Leave blank to hide the section.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input placeholder="Investment range (e.g. €18k – €30k)" value={form.budget.range || ''} onChange={(e) => setForm({ ...form, budget: { ...form.budget, range: e.target.value } })} className={inputClass} />
              <input placeholder="Engagement model (e.g. Fixed sprint)" value={form.budget.model || ''} onChange={(e) => setForm({ ...form, budget: { ...form.budget, model: e.target.value } })} className={inputClass} />
              <input placeholder="Duration (e.g. 6 weeks)" value={form.budget.duration || ''} onChange={(e) => setForm({ ...form, budget: { ...form.budget, duration: e.target.value } })} className={inputClass} />
            </div>
            <textarea rows={2} placeholder="Context / note (optional)" value={form.budget.note || ''} onChange={(e) => setForm({ ...form, budget: { ...form.budget, note: e.target.value } })} className={inputClass} />
          </div>


          <button onClick={save} disabled={loading || !form.title} className="glow-button px-6 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    );
  }

  const q = listQuery.trim().toLowerCase();
  const visibleProjects = q
    ? projects.filter((p) =>
        [p.title, p.short_description, p.category, ...(p.tech_stack || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : projects;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
        <button onClick={startNew} className="glow-button px-4 sm:px-5 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> <span className="hidden sm:inline">Add Project</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="glass rounded-xl gradient-border p-4 mb-5 flex flex-wrap items-center gap-4">
        <div className="text-xs text-muted-foreground">Visitor defaults</div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">View</label>
          <select
            value={defaultView}
            onChange={(e) => { setDefaultView(e.target.value); saveSettings(e.target.value, defaultSort); }}
            disabled={savingSettings}
            className="bg-muted/30 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="compact">Compact</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Sort</label>
          <select
            value={defaultSort}
            onChange={(e) => { setDefaultSort(e.target.value); saveSettings(defaultView, e.target.value); }}
            disabled={savingSettings}
            className="bg-muted/30 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="order">Default order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="featured">Featured first</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">Visitors who change these on the site keep their own choice.</span>
      </div>

      <TagLibrary projects={projects} onRename={renameTagAcrossProjects} onDelete={deleteTagAcrossProjects} />

      {projects.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search projects by title, tech, category…"
            className="w-full glass rounded-lg pl-9 pr-9 py-2 text-sm text-foreground bg-transparent border border-border outline-none focus:border-primary/40"
          />
          {listQuery && (
            <button onClick={() => setListQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {fetching ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl gradient-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No projects yet. Add your first one!</p>
          <button onClick={startNew} className="glow-button px-5 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm">Add Project</button>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="glass rounded-xl gradient-border p-12 text-center">
          <p className="text-muted-foreground">No projects match "{listQuery}".</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((p) => {
            const realIdx = projects.findIndex((proj) => proj.id === p.id);
            const reorderDisabled = !!q;
            return (
            <div key={p.id} className="glass rounded-xl gradient-border p-4 sm:p-5 flex items-center gap-3 group">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => reorder(realIdx, 'up')} disabled={reorderDisabled || realIdx === 0} title={reorderDisabled ? 'Clear search to reorder' : ''} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => reorder(realIdx, 'down')} disabled={reorderDisabled || realIdx === projects.length - 1} title={reorderDisabled ? 'Clear search to reorder' : ''} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5">
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{p.category}</span>
                  {p.featured && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Featured</span>}
                  <StatusBadge status={(p as any).status} size="xs" />
                  {(p as any).pinned && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">📌 Pinned</span>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{p.short_description}</p>
              </div>

              <div className="flex gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(p)} className="glass p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Pencil size={16} /></button>
                <ConfirmDialog
                  trigger={<button className="glass p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>}
                  title="Delete project?"
                  description={`"${p.title}" will be permanently deleted.`}
                  onConfirm={() => deleteProject(p.id)}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProjects;
