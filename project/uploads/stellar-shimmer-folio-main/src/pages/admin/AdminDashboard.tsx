import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Eye, Clock, Star } from 'lucide-react';
import { StatSkeleton } from '@/components/admin/AdminSkeleton';

const AdminDashboard = () => {
  const [stats, setStats] = useState<{
    totalProjects: number;
    featuredCount: number;
    latestProject: string | null;
    totalExperiences: number;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const [projectsRes, expRes] = await Promise.all([
        supabase.from('projects').select('id, title, featured, created_at').order('created_at', { ascending: false }),
        supabase.from('experiences').select('id'),
      ]);
      const projects = projectsRes.data || [];
      setStats({
        totalProjects: projects.length,
        featuredCount: projects.filter((p) => p.featured).length,
        latestProject: projects[0]?.title || null,
        totalExperiences: expRes.data?.length || 0,
      });
    };
    fetch();
  }, []);

  const cards = stats
    ? [
        { icon: FolderKanban, label: 'Total Projects', value: stats.totalProjects, color: 'text-primary' },
        { icon: Star, label: 'Featured', value: stats.featuredCount, color: 'text-accent' },
        { icon: Eye, label: 'Page Views', value: '—', color: 'text-muted-foreground', sub: 'Analytics coming soon' },
        { icon: Clock, label: 'Experiences', value: stats.totalExperiences, color: 'text-primary' },
      ]
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {!cards
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : cards.map((c) => (
              <div key={c.label} className="glass rounded-xl gradient-border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <c.icon size={18} className={c.color} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
              </div>
            ))}
      </div>

      {stats?.latestProject && (
        <div className="glass rounded-xl gradient-border p-6">
          <h2 className="text-sm text-muted-foreground uppercase tracking-wider mb-3">Latest Project</h2>
          <p className="text-lg font-semibold text-foreground">{stats.latestProject}</p>
          <button
            onClick={() => navigate('/admin/projects')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Manage projects →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
