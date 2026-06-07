import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

interface RelatedProjectsProps {
  current: Project;
  all: Project[];
  selectedIds?: string[];
}

const scoreSimilarity = (a: Project, b: Project) => {
  let score = 0;
  if (a.category === b.category) score += 3;
  const aTech = new Set(a.tech_stack || []);
  (b.tech_stack || []).forEach((t) => { if (aTech.has(t)) score += 1; });
  return score;
};

const RelatedProjects = ({ current, all, selectedIds }: RelatedProjectsProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const related = useMemo(() => {
    const others = all.filter((p) => p.id !== current.id);
    if (selectedIds && selectedIds.length > 0) {
      const map = new Map(others.map((p) => [p.id, p]));
      const picked = selectedIds.map((id) => map.get(id)).filter(Boolean) as Project[];
      if (picked.length > 0) return picked.slice(0, 6);
    }
    return others
      .map((p) => ({ p, s: scoreSimilarity(current, p) }))
      .sort((a, b) => b.s - a.s || a.p.display_order - b.p.display_order)
      .slice(0, 6)
      .map(({ p }) => p);
  }, [all, current, selectedIds]);

  if (related.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Related <span className="gradient-text">projects</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">More work you might enjoy.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="glass rounded-full w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="glass rounded-full w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-2 px-2 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {related.map((p) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="snap-start shrink-0 w-[280px] sm:w-[320px] glass rounded-xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
            >
              <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 flex items-center justify-center">
                {p.thumbnail_url ? (
                  <img
                    src={p.thumbnail_url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <ImageIcon size={32} className="text-muted-foreground/30" />
                )}
              </div>
              <div className="p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent">{p.category}</span>
                <h3 className="text-base font-semibold text-foreground mt-1 group-hover:text-primary transition-colors">{p.title}</h3>
                {p.short_description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.short_description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProjects;
