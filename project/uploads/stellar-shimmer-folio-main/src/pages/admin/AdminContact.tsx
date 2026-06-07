import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { FormSkeleton } from '@/components/admin/AdminSkeleton';

const AdminContact = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [email, setEmail] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('social_links').select('*').limit(1).single();
      if (data) {
        setId(data.id);
        setGithubUrl(data.github_url || '');
        setLinkedinUrl(data.linkedin_url || '');
        setTwitterUrl(data.twitter_url || '');
        setEmail(data.email || '');
      }
      setFetching(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setLoading(true);
    const payload = { github_url: githubUrl, linkedin_url: linkedinUrl, twitter_url: twitterUrl, email };
    if (id) {
      const { error } = await supabase.from('social_links').update(payload).eq('id', id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Contact info updated!' });
    } else {
      const { error } = await supabase.from('social_links').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Contact info saved!' });
    }
    setLoading(false);
  };

  const inputClass = "w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground text-sm outline-none focus:border-primary transition-colors";

  if (fetching) return <div><h1 className="text-2xl font-bold text-foreground mb-8">Contact Info</h1><FormSkeleton /></div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-8">Contact Info</h1>

      <div className="glass rounded-xl gradient-border p-4 sm:p-6 space-y-5 max-w-2xl">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">GitHub URL</label>
          <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">LinkedIn URL</label>
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">X (Twitter) URL</label>
          <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/..." className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
        </div>

        <button onClick={save} disabled={loading} className="glow-button px-6 py-2.5 rounded-lg text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminContact;
