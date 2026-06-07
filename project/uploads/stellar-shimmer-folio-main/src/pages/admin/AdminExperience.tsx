import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { CardSkeleton } from '@/components/admin/AdminSkeleton';

type Experience = Tables<'experiences'>;

const emptyExp = { company: '', role: '', period: '', description: '', display_order: 0 };

const AdminExperience = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExp);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setFetching(true);
    const { data } = await supabase.from('experiences').select('*').order('display_order');
    if (data) setExperiences(data);
    setFetching(false);
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = (exp: Experience) => {
    setEditing(exp.id);
    setForm({ company: exp.company, role: exp.role, period: exp.period, description: exp.description, display_order: exp.display_order });
  };

  const save = async () => {
    setLoading(true);
    if (editing === 'new') {
      const { error } = await supabase.from('experiences').insert(form);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Experience added!' });
    } else {
      const { error } = await supabase.from('experiences').update(form).eq('id', editing!);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Experience updated!' });
    }
    setLoading(false);
    setEditing(null); setForm(emptyExp);
    fetchData();
  };

  const deleteExp = async (id: string) => {
    const { error } = await supabase.from('experiences').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Experience deleted' });
    fetchData();
  };

  const inputClass = "w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Experience</h1>
        <button onClick={() => { setEditing('new'); setForm({ ...emptyExp, display_order: experiences.length }); }} className="glow-button px-4 sm:px-5 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> <span className="hidden sm:inline">Add Experience</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      {editing && (
        <div className="glass rounded-xl gradient-border p-4 sm:p-6 space-y-4 max-w-2xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role *</label>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Company *</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Period *</label>
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2022 — Present" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Order</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className={inputClass} />
            </div>
          </div>
          <MarkdownEditor label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={3} />
          <div className="flex gap-3">
            <button onClick={save} disabled={loading || !form.role || !form.company || !form.period} className="glow-button px-5 py-2 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
              <Save size={16} /> {loading ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(null); setForm(emptyExp); }} className="glass px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {fetching ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div key={exp.id} className="glass rounded-xl gradient-border p-4 sm:p-5 flex items-center justify-between group">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{exp.role}</h3>
                <p className="text-sm text-primary">{exp.company} <span className="text-muted-foreground">• {exp.period}</span></p>
              </div>
              <div className="flex gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(exp)} className="glass p-2 rounded-lg text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                <ConfirmDialog
                  trigger={<button className="glass p-2 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>}
                  title="Delete experience?"
                  description={`"${exp.role} at ${exp.company}" will be permanently deleted.`}
                  onConfirm={() => deleteExp(exp.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminExperience;
