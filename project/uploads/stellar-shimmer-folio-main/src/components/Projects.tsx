import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ExternalLink, Github, Monitor, Smartphone, Terminal, Code, ArrowUpRight, Search, X, Grid3x3, List, LayoutGrid, Tag, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePortal } from '@/contexts/PortalContext';
import type { Tables } from '@/integrations/supabase/types';
import StatusBadge from '@/components/StatusBadge';
import { PROJECT_STATUSES, normalizeStatus, statusLabels, type ProjectStatus } from '@/lib/projectStatus';
import HeroProject from '@/components/HeroProject';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

type Project = Tables<'projects'>;
type StatusFilter = 'all' | ProjectStatus;

const filters = ['All', 'Web App', 'Mobile', 'Open Source', 'API'];

const meshGradients = [
  'radial-gradient(ellipse at 20% 50%, hsl(239 84% 40% / 0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(263 70% 35% / 0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsl(43 96% 56% / 0.1) 0%, transparent 50%), linear-gradient(135deg, hsl(239 40% 12%) 0%, hsl(263 30% 8%) 100%)',
  'radial-gradient(ellipse at 30% 30%, hsl(43 80% 45% / 0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, hsl(239 84% 50% / 0.25) 0%, transparent 50%), linear-gradient(160deg, hsl(235 30% 10%) 0%, hsl(239 25% 8%) 100%)',
  'radial-gradient(ellipse at 80% 30%, hsl(160 60% 35% / 0.25) 0%, transparent 50%), radial-gradient(ellipse at 20% 70%, hsl(239 70% 45% / 0.2) 0%, transparent 50%), linear-gradient(135deg, hsl(235 30% 10%) 0%, hsl(200 20% 8%) 100%)',
  'radial-gradient(ellipse at 50% 20%, hsl(239 84% 55% / 0.3) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, hsl(270 60% 40% / 0.2) 0%, transparent 50%), radial-gradient(ellipse at 90% 60%, hsl(43 80% 50% / 0.08) 0%, transparent 40%), linear-gradient(135deg, hsl(250 30% 10%) 0%, hsl(235 25% 7%) 100%)',
  'radial-gradient(ellipse at 60% 40%, hsl(43 90% 50% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, hsl(239 80% 50% / 0.2) 0%, transparent 50%), linear-gradient(135deg, hsl(235 25% 10%) 0%, hsl(40 20% 7%) 100%)',
  'radial-gradient(ellipse at 40% 30%, hsl(220 80% 50% / 0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, hsl(239 70% 45% / 0.2) 0%, transparent 50%), linear-gradient(135deg, hsl(220 30% 10%) 0%, hsl(239 25% 7%) 100%)',
];

const categoryIcon: Record<string, React.ElementType> = {
  'Web App': Monitor,
  'Mobile': Smartphone,
  'API': Terminal,
  'Open Source': Code,
};

const categoryEmoji: Record<string, string> = {
  'Web App': '🌐',
  'Mobile': '📱',
  'API': '⚡',
  'Open Source': '🔓',
};

const TiltCard = ({ children, className, style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(800px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 10}deg) scale3d(1.02, 1.02, 1.02) translateY(-4px)`;
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0)';
  }, []);

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} onClick={onClick} className={className}
      style={{ ...style, willChange: 'transform', transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.3s ease, box-shadow 0.3s ease' }}>
      {children}
    </div>
  );
};

const ProjectCard = ({ project, index, gradient, onClick }: { project: Project; index: number; gradient: string; onClick: (e: React.MouseEvent<HTMLDivElement>) => void }) => {
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const IconComp = categoryIcon[project.category] || Monitor;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <TiltCard
        onClick={onClick}
        className="group rounded-2xl overflow-hidden cursor-pointer h-full relative"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: 'none',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Gradient top border */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px] transition-opacity duration-300 opacity-70 group-hover:opacity-100"
          style={{ background: 'linear-gradient(90deg, #6366F1, #F59E0B, #6366F1)' }}
        />

        {/* Thumbnail */}
        <div className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: 220 }}>
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <>
              <div className="absolute inset-0" style={{ background: gradient }} />
              {/* Noise grain overlay */}
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  backgroundSize: '150px 150px',
                }}
              />
              <div className="relative flex flex-col items-center gap-3 z-10">
                <IconComp size={56} className="text-white/25 group-hover:text-white/40 group-hover:scale-110 transition-all duration-300" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
                <span className="text-xs text-white/20 font-mono">{categoryEmoji[project.category] || '💻'}</span>
              </div>
            </>
          )}
          {/* Status badge */}
          <div className="absolute top-3 left-3 z-20">
            <StatusBadge status={project.status} />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250 ease-out" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <span className="text-white font-semibold tracking-wide" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>
              View Project →
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-heading font-semibold text-white group-hover:text-primary transition-colors duration-300">{project.title}</h3>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-foreground/30 hover:text-foreground/70 transition-colors"><Github size={16} /></a>}
              {project.live_demo_url && <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer" className="text-foreground/30 hover:text-foreground/70 transition-colors"><ExternalLink size={16} /></a>}
            </div>
          </div>
          <p className="text-sm text-foreground/50 mb-4 leading-relaxed">{project.short_description}</p>
          <div className="flex flex-wrap gap-2">
            {(project.tech_stack || []).slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/8 backdrop-blur-sm text-foreground/60 hover:border-primary/40 hover:text-foreground/80 hover:shadow-[0_0_12px_hsl(239_84%_67%/0.1)] transition-all duration-300">{t}</span>
            ))}
            {(project.tech_stack || []).length > 3 && (
              <span className="text-xs px-3 py-1.5 rounded-full border border-primary/20" style={{ background: 'rgba(99,102,241,0.15)', color: 'rgb(165,170,255)' }}>+{project.tech_stack.length - 3}</span>
            )}
          </div>
        </div>
      </TiltCard>

      {/* Hover glow styles */}
      <style>{`
        .group:hover {
          border-color: rgba(99, 102, 241, 0.25) !important;
          box-shadow: 0 20px 60px rgba(99, 102, 241, 0.2), 0 0 20px rgba(99, 102, 241, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

type SortKey = 'order' | 'newest' | 'oldest' | 'featured' | 'az' | 'za';
type ViewMode = 'grid' | 'list' | 'compact';

const sortLabels: Record<SortKey, string> = {
  order: 'Default order',
  newest: 'Newest first',
  oldest: 'Oldest first',
  featured: 'Featured first',
  az: 'A → Z',
  za: 'Z → A',
};

const ProjectListRow = ({ project, index, onClick }: { project: Project; index: number; onClick: (e: React.MouseEvent<HTMLDivElement>) => void }) => {
  const IconComp = categoryIcon[project.category] || Monitor;
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden flex items-stretch gap-4 p-3 transition-all duration-300 hover:border-primary/30"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: `fadeInUp 0.5s ease ${index * 50}ms both`,
      }}
    >
      <div className="w-32 h-24 sm:w-44 sm:h-28 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-white/[0.04]">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <IconComp size={32} className="text-white/30" />
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-base font-heading font-semibold text-white truncate group-hover:text-primary transition-colors">{project.title}</h3>
          <StatusBadge status={project.status} size="xs" />
          {project.featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 shrink-0">★</span>}
        </div>
        <p className="text-xs text-foreground/50 mb-2 line-clamp-2">{project.short_description}</p>
        <div className="flex flex-wrap gap-1.5">
          {(project.tech_stack || []).slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-foreground/55">{t}</span>
          ))}
        </div>
      </div>
      <ArrowUpRight size={18} className="text-foreground/30 group-hover:text-primary self-center shrink-0 transition-colors" />
    </div>
  );
};

const ProjectCompactCard = ({ project, index, onClick }: { project: Project; index: number; onClick: (e: React.MouseEvent<HTMLDivElement>) => void }) => {
  const IconComp = categoryIcon[project.category] || Monitor;
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/30"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: `fadeInUp 0.5s ease ${index * 40}ms both`,
      }}
    >
      <div className="aspect-[4/3] overflow-hidden flex items-center justify-center bg-white/[0.03] relative">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <IconComp size={36} className="text-white/25" />
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={project.status} size="xs" />
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-heading font-semibold text-white truncate group-hover:text-primary transition-colors">{project.title}</h3>
        <p className="text-[11px] font-mono text-foreground/35 mt-0.5">{project.category}</p>
      </div>
    </div>
  );
};

const Projects = () => {
  const [active, setActive] = useState('All');
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<SortKey>(() => (typeof window !== 'undefined' && (localStorage.getItem('projects:sort') as SortKey)) || 'order');
  const [view, setView] = useState<ViewMode>(() => (typeof window !== 'undefined' && (localStorage.getItem('projects:view') as ViewMode)) || 'grid');
  const [userTouchedSort, setUserTouchedSort] = useState(false);
  const [userTouchedView, setUserTouchedView] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('projects:tags') || '[]')); } catch { return new Set(); }
  });
  const [tagMatchMode, setTagMatchMode] = useState<'any' | 'all'>(() => (typeof window !== 'undefined' && (localStorage.getItem('projects:tagMode') as 'any' | 'all')) || 'any');
  const [showAllTags, setShowAllTags] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (typeof window === 'undefined') return 'all';
    const v = localStorage.getItem('projects:status') as StatusFilter | null;
    return v && (v === 'all' || PROJECT_STATUSES.includes(v as ProjectStatus)) ? v : 'all';
  });
  const updateStatus = (s: StatusFilter) => { setStatusFilter(s); localStorage.setItem('projects:status', s); };
  const { triggerPortal } = usePortal();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('projects').select('*').order('display_order');
      if (data) setProjects(data);
    };
    fetch();
  }, []);

  // Load admin defaults; user's localStorage override (if they've changed) wins.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_settings').select('default_projects_view, default_projects_sort').limit(1).maybeSingle();
      if (!data) return;
      if (!userTouchedSort && !localStorage.getItem('projects:sort') && data.default_projects_sort) {
        setSort(data.default_projects_sort as SortKey);
      }
      if (!userTouchedView && !localStorage.getItem('projects:view') && data.default_projects_view) {
        setView(data.default_projects_view as ViewMode);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSort = (s: SortKey) => { setSort(s); setUserTouchedSort(true); localStorage.setItem('projects:sort', s); };
  const updateView = (v: ViewMode) => { setView(v); setUserTouchedView(true); localStorage.setItem('projects:view', v); };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [query]);

  const pinnedProject = useMemo(() => projects.find((p) => (p as any).pinned) || null, [projects]);
  const filtersActive = active !== 'All' || debouncedQuery.length > 0 || selectedTags.size > 0 || statusFilter !== 'all';
  const showHero = !!pinnedProject && !filtersActive;

  const filtered = useMemo(() => {
    let list = active === 'All' ? projects : projects.filter((p) => p.category === active);
    if (showHero && pinnedProject) {
      list = list.filter((p) => p.id !== pinnedProject.id);
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => normalizeStatus((p as any).status) === statusFilter);
    }
    if (debouncedQuery) {
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.short_description,
          p.description,
          ...(p.tech_stack || []),
          p.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(debouncedQuery);
      });
    }
    if (selectedTags.size > 0) {
      list = list.filter((p) => {
        const ts = (p.tech_stack || []);
        if (tagMatchMode === 'all') {
          return Array.from(selectedTags).every((t) => ts.includes(t));
        }
        return ts.some((t) => selectedTags.has(t));
      });
    }
    const sorted = [...list];
    switch (sort) {
      case 'newest': sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'featured': sorted.sort((a, b) => (Number(b.featured) - Number(a.featured)) || (a.display_order - b.display_order)); break;
      case 'az': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'za': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      default: break;
    }
    return sorted;
  }, [projects, active, debouncedQuery, sort, selectedTags, tagMatchMode, statusFilter, showHero, pinnedProject]);

  const statusCounts = useMemo(() => {
    const base = active === 'All' ? projects : projects.filter((p) => p.category === active);
    const counts = { all: base.length } as Record<StatusFilter, number>;
    PROJECT_STATUSES.forEach((s) => (counts[s] = 0));
    base.forEach((p) => { counts[normalizeStatus((p as any).status)] += 1; });
    return counts;
  }, [projects, active]);

  // Available tags (counted across category-filtered set so counts reflect what user can actually see)
  const tagCounts = useMemo(() => {
    const base = active === 'All' ? projects : projects.filter((p) => p.category === active);
    const counts = new Map<string, number>();
    base.forEach((p) => (p.tech_stack || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects, active]);

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      localStorage.setItem('projects:tags', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const clearTags = () => {
    setSelectedTags(new Set());
    localStorage.setItem('projects:tags', '[]');
  };

  const updateTagMode = (m: 'any' | 'all') => {
    setTagMatchMode(m);
    localStorage.setItem('projects:tagMode', m);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, project: Project, gradientKey: string) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    triggerPortal(project.id, rect, gradientKey);
  };

  return (
    <section id="projects" className="relative py-[120px] px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Selected Work</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>
        <ShimmerHeading
          text="Featured"
          accent="Projects"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-4 text-white"
        />
        <Reveal variant="up" delay={160}>
          <p className="text-foreground/50 text-base md:text-lg text-center mb-2 max-w-2xl mx-auto">
            A selection of work we've shipped — from web apps and APIs to internal tools and open source.
          </p>
          <p className="text-xs font-mono text-foreground/20 text-center mb-10">
            Click any card to enter its universe ✨
          </p>
        </Reveal>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6">
          <div
            className="relative flex items-center rounded-full transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <Search size={16} className="absolute left-4 text-foreground/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tech, keywords…"
              aria-label="Search projects"
              className="w-full bg-transparent text-sm text-foreground/90 placeholder:text-foreground/30 pl-11 pr-10 py-2.5 outline-none rounded-full focus:border-primary/40"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 text-foreground/40 hover:text-foreground/80 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {debouncedQuery && (
            <p className="text-xs font-mono text-foreground/30 text-center mt-3">
              {filtered.length} {filtered.length === 1 ? 'match' : 'matches'} for "{debouncedQuery}"
            </p>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                active === f
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-white/[0.04] text-foreground/50 border border-white/8 backdrop-blur-sm hover:text-foreground/70 hover:border-primary/30 hover:bg-primary/[0.06]'
              }`}
            >
              {f !== 'All' && <span className="mr-1.5">{categoryEmoji[f]}</span>}
              {f}
            </button>
          ))}
        </div>

        {/* Sort + view toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value as SortKey)}
              aria-label="Sort projects"
              className="appearance-none text-xs font-mono pl-4 pr-9 py-2 rounded-full bg-white/[0.04] border border-white/10 text-foreground/70 hover:text-foreground hover:border-primary/30 outline-none focus:border-primary/40 transition-colors cursor-pointer"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <option key={k} value={k} className="bg-background text-foreground">{sortLabels[k]}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px]">▼</span>
          </div>

          <div className="flex items-center rounded-full bg-white/[0.04] border border-white/10 p-1" style={{ backdropFilter: 'blur(12px)' }}>
            {([
              { k: 'grid' as ViewMode, Icon: Grid3x3, label: 'Grid view' },
              { k: 'list' as ViewMode, Icon: List, label: 'List view' },
              { k: 'compact' as ViewMode, Icon: LayoutGrid, label: 'Compact view' },
            ]).map(({ k, Icon, label }) => (
              <button
                key={k}
                onClick={() => updateView(k)}
                aria-label={label}
                aria-pressed={view === k}
                className={`p-1.5 rounded-full transition-all duration-200 ${view === k ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'text-foreground/50 hover:text-foreground/80'}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {(['all', ...PROJECT_STATUSES] as StatusFilter[]).map((s) => {
            const sel = statusFilter === s;
            const count = statusCounts[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                aria-pressed={sel}
                className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all duration-200 ${sel ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_hsl(239_84%_67%/0.2)]' : 'bg-white/[0.03] border-white/10 text-foreground/55 hover:border-primary/30 hover:text-foreground/85'}`}
                style={{ backdropFilter: 'blur(8px)' }}
              >
                {s === 'all' ? 'All status' : statusLabels[s as ProjectStatus]}
                <span className="opacity-50 ml-1.5">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tag chip filter */}
        {tagCounts.length > 0 && (
          <div className="max-w-4xl mx-auto mb-10">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Tag size={12} className="text-foreground/40" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">Filter by tech</span>
              {selectedTags.size > 0 && (
                <>
                  <div className="flex items-center rounded-full bg-white/[0.04] border border-white/10 p-0.5 ml-2" style={{ backdropFilter: 'blur(12px)' }}>
                    {(['any', 'all'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => updateTagMode(m)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${tagMatchMode === m ? 'bg-primary text-primary-foreground' : 'text-foreground/50 hover:text-foreground/80'}`}
                      >
                        Match {m}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={clearTags}
                    className="text-[10px] font-mono text-primary/80 hover:text-primary underline underline-offset-2 ml-auto"
                  >
                    Clear ({selectedTags.size})
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(showAllTags ? tagCounts : tagCounts.slice(0, 12)).map(([t, count]) => {
                const sel = selectedTags.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    aria-pressed={sel}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${sel ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_hsl(239_84%_67%/0.2)]' : 'bg-white/[0.03] border-white/10 text-foreground/60 hover:border-primary/30 hover:text-foreground/90'}`}
                    style={{ backdropFilter: 'blur(8px)' }}
                  >
                    {t} <span className="opacity-50 ml-1">{count}</span>
                  </button>
                );
              })}
              {tagCounts.length > 12 && (
                <button
                  onClick={() => setShowAllTags((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-foreground/50 hover:text-foreground/80 hover:border-primary/30 inline-flex items-center gap-1 transition-all"
                >
                  {showAllTags ? 'Show less' : `+${tagCounts.length - 12} more`}
                  <ChevronDown size={12} className={`transition-transform ${showAllTags ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>
        )}

        {showHero && pinnedProject && (
          <HeroProject
            project={pinnedProject}
            onOpen={(e) => handleCardClick(e, pinnedProject, meshGradients[0])}
          />
        )}

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🚀</div>
            <p className="text-foreground/40">No projects yet. The launchpad is empty!</p>
            <p className="text-xs text-foreground/20 mt-2">Add some from the admin panel.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-foreground/50">No projects match your search.</p>
            <button
              onClick={() => { setQuery(''); setActive('All'); clearTags(); }}
              className="text-xs font-mono text-primary/80 hover:text-primary mt-3 underline underline-offset-4"
            >
              Reset filters
            </button>
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            {filtered.map((project, i) => {
              const gradient = meshGradients[i % meshGradients.length];
              return (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  index={i}
                  onClick={(e) => handleCardClick(e, project, gradient)}
                />
              );
            })}
          </div>
        ) : view === 'compact' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((project, i) => {
              const gradient = meshGradients[i % meshGradients.length];
              return (
                <ProjectCompactCard
                  key={project.id}
                  project={project}
                  index={i}
                  onClick={(e) => handleCardClick(e, project, gradient)}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, i) => {
              const gradient = meshGradients[i % meshGradients.length];

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  gradient={gradient}
                  onClick={(e) => handleCardClick(e, project, gradient)}
                />
              );
            })}
          </div>
        )}

        <style>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </section>
  );
};

export default Projects;
