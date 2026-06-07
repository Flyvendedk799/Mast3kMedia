import { useRef, useCallback } from 'react';
import { ArrowUpRight, ExternalLink, Github, Sparkles } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import StatusBadge from '@/components/StatusBadge';

type Project = Tables<'projects'>;

interface Props {
  project: Project;
  onOpen: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const HeroProject = ({ project, onOpen }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(1200px) rotateX(${(0.5 - y) * 4}deg) rotateY(${(x - 0.5) * 4}deg) translateY(-2px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0)';
  }, []);

  return (
    <div className="max-w-6xl mx-auto mb-16">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-accent" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-accent/80">Pinned showcase</span>
        <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
      </div>

      <div
        ref={ref}
        onClick={onOpen}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="group relative grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          willChange: 'transform',
          transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* gradient top edge */}
        <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ background: 'linear-gradient(90deg, #6366F1, #F59E0B, #6366F1)' }} />

        {/* Visual */}
        <div className="relative lg:col-span-3 min-h-[280px] lg:min-h-[420px] overflow-hidden">
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt={project.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 30%, hsl(239 84% 50% / 0.4) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, hsl(43 96% 56% / 0.25) 0%, transparent 50%), linear-gradient(135deg, hsl(239 40% 12%) 0%, hsl(263 30% 8%) 100%)',
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/40 lg:to-background/70 pointer-events-none" />
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <StatusBadge status={project.status} />
            {project.featured && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">★ Featured</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative lg:col-span-2 p-6 sm:p-8 lg:p-10 flex flex-col justify-center gap-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">{project.category}</p>
          <h3 className="text-3xl lg:text-4xl font-heading font-extrabold text-white leading-tight group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          <p className="text-sm lg:text-base text-foreground/60 leading-relaxed line-clamp-4">{project.short_description}</p>

          {(project.tech_stack || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(project.tech_stack || []).slice(0, 6).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-foreground/60">{t}</span>
              ))}
              {(project.tech_stack || []).length > 6 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">+{project.tech_stack.length - 6}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(e as any); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
            >
              Explore project <ArrowUpRight size={16} />
            </button>
            {project.live_demo_url && (
              <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground p-2 transition-colors" aria-label="Live demo">
                <ExternalLink size={18} />
              </a>
            )}
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground p-2 transition-colors" aria-label="GitHub">
                <Github size={18} />
              </a>
            )}
          </div>
        </div>

        <style>{`
          .group:hover { border-color: rgba(99,102,241,0.3) !important; box-shadow: 0 30px 80px rgba(99,102,241,0.25), 0 0 30px rgba(245,158,11,0.1) !important; }
        `}</style>
      </div>
    </div>
  );
};

export default HeroProject;
