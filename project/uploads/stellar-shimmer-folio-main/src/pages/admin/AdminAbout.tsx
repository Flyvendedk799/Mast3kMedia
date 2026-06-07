import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { FormSkeleton } from '@/components/admin/AdminSkeleton';

const AdminAbout = () => {
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [id, setId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('about_content').select('*').limit(1).single();
      if (data) {
        setId(data.id);
        setBio(data.bio);
        setProfileImageUrl(data.profile_image_url || '');
        setSkills((data.skills as string[]) || []);
      }
      setFetching(false);
    };
    fetch();
  }, []);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const save = async () => {
    setLoading(true);
    const payload = { bio, profile_image_url: profileImageUrl || null, skills: skills as any };
    if (id) {
      const { error } = await supabase.from('about_content').update(payload).eq('id', id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'About section updated!' });
    } else {
      const { error } = await supabase.from('about_content').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'About section saved!' });
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors";

  if (fetching) return <div><h1 className="text-2xl font-bold text-foreground mb-8">About Section</h1><FormSkeleton /></div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-8">About Section</h1>

      <div className="glass rounded-xl gradient-border p-4 sm:p-6 space-y-5 max-w-2xl">
        <MarkdownEditor label="Bio" value={bio} onChange={setBio} rows={6} />

        <ImageUpload label="Profile Image" value={profileImageUrl} onChange={setProfileImageUrl} folder="profile" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
          <div className="flex gap-2 mb-2">
            <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="Add skill..." className={inputClass} />
            <button onClick={addSkill} className="glass px-4 py-2 rounded-lg text-sm text-foreground hover:bg-muted/30 shrink-0">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                {s} <button onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} className="hover:text-destructive"><X size={12} /></button>
              </span>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={loading} className="glow-button px-6 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminAbout;
