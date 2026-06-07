import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X, ExternalLink, Eye, EyeOff } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { CardSkeleton } from '@/components/admin/AdminSkeleton';
import type { Tables } from '@/integrations/supabase/types';

type Post = Tables<'blog_posts'>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

const empty = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  tags: [] as string[],
  author: 'Mast3kMedia',
  published: false,
};

const AdminBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPosts = async () => {
    setFetching(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
    setFetching(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const startEdit = (p: Post) => {
    setEditing(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      content: p.content || '',
      cover_url: p.cover_url || '',
      tags: p.tags || [],
      author: p.author || 'Mast3kMedia',
      published: p.published,
    });
  };

  const startNew = () => {
    setEditing('new');
    setForm(empty);
  };

  const cancel = () => {
    setEditing(null);
    setForm(empty);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput('');
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const slug = form.slug.trim() || slugify(form.title);
    const payload: any = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt,
      content: form.content,
      cover_url: form.cover_url || null,
      tags: form.tags,
      author: form.author,
      published: form.published,
      published_at: form.published ? new Date().toISOString() : null,
    };

    if (editing === 'new') {
      const { error } = await supabase.from('blog_posts').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Post created' });
    } else {
      const existing = posts.find((p) => p.id === editing);
      // Don't overwrite published_at if it was already published
      if (existing?.published && existing.published_at && form.published) {
        payload.published_at = existing.published_at;
      }
      const { error } = await supabase.from('blog_posts').update(payload).eq('id', editing!);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Post updated' });
    }
    setSaving(false);
    cancel();
    fetchPosts();
  };

  const togglePublish = async (p: Post) => {
    const next = !p.published;
    const { error } = await supabase
      .from('blog_posts')
      .update({ published: next, published_at: next ? p.published_at || new Date().toISOString() : p.published_at })
      .eq('id', p.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: next ? 'Published' : 'Unpublished' });
    fetchPosts();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Post deleted' });
    fetchPosts();
  };

  const inputClass =
    'w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors';

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{editing === 'new' ? 'New Insight' : 'Edit Insight'}</h1>
          <button onClick={cancel} className="glass px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
            <X size={16} /> Cancel
          </button>
        </div>

        <div className="glass rounded-xl gradient-border p-4 sm:p-6 space-y-5 max-w-3xl">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <input
              value={form.title}
              onChange={(e) => {
                const t = e.target.value;
                setForm((f) => ({ ...f, title: t, slug: f.slug || slugify(t) }));
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              placeholder="auto-generated from title"
              className={inputClass}
            />
            <p className="text-[10px] text-muted-foreground mt-1">URL: /insights/{form.slug || 'your-slug'}</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Excerpt</label>
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className={inputClass}
              placeholder="One- or two-line summary shown on the listing page"
            />
          </div>

          <ImageUpload label="Cover image" value={form.cover_url} onChange={(url) => setForm({ ...form, cover_url: url })} folder="blog" />

          <MarkdownEditor label="Content (Markdown)" value={form.content} onChange={(v) => setForm({ ...form, content: v })} rows={18} />

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className={inputClass}
              />
              <button onClick={addTag} className="glass px-4 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  {t}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) })} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Author</label>
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputClass} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="accent-primary"
                />
                Published
              </label>
            </div>
          </div>

          <button onClick={save} disabled={saving || !form.title} className="glow-button px-6 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Insight'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Insights</h1>
        <button onClick={startNew} className="glow-button px-4 sm:px-5 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> <span className="hidden sm:inline">New Insight</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {fetching ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-xl gradient-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No insights yet. Write your first one!</p>
          <button onClick={startNew} className="glow-button px-5 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm">
            New Insight
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-xl gradient-border p-4 sm:p-5 flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{p.title}</h3>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      p.published
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/30 text-muted-foreground border-border'
                    }`}
                  >
                    {p.published ? 'Live' : 'Draft'}
                  </span>
                  {p.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{t}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground truncate font-mono">/insights/{p.slug}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.published && (
                  <a
                    href={`/insights/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="View"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button onClick={() => togglePublish(p)} className="glass p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title={p.published ? 'Unpublish' : 'Publish'}>
                  {p.published ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => startEdit(p)} className="glass p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil size={16} />
                </button>
                <ConfirmDialog
                  trigger={
                    <button className="glass p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={16} />
                    </button>
                  }
                  title="Delete post?"
                  description={`"${p.title}" will be permanently deleted.`}
                  onConfirm={() => remove(p.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
