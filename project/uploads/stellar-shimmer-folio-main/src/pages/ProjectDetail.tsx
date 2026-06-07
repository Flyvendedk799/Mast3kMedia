import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FloatingOrbs from '@/components/FloatingOrbs';
import CustomCursor from '@/components/CustomCursor';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StarField from '@/components/StarField';
import { resolveGradient } from '@/components/ProjectPortal';
import { useScrollDepth } from '@/hooks/useScrollDepth';
import { ArrowLeft, ExternalLink, Github, Image, ChevronRight, Play, Monitor, icons, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import MetricCounters from '@/components/MetricCounters';
import CaseStudySection from '@/components/CaseStudySection';
import Testimonials from '@/components/Testimonials';
import TechRationale from '@/components/TechRationale';
import ProjectTimeline from '@/components/ProjectTimeline';
import ProcessGallery from '@/components/ProcessGallery';
import RelatedProjects from '@/components/RelatedProjects';
import BeforeAfter from '@/components/BeforeAfter';
import ProjectFAQ from '@/components/ProjectFAQ';
import PressLinks from '@/components/PressLinks';
import ShowReel from '@/components/ShowReel';
import PreviewSandbox from '@/components/PreviewSandbox';
import VideoGallery from '@/components/VideoGallery';
import Deliverables from '@/components/Deliverables';
import BudgetTransparency from '@/components/BudgetTransparency';
import InquiryCTA from '@/components/InquiryCTA';
import ProjectTOC from '@/components/ProjectTOC';
import TeamCredits from '@/components/TeamCredits';
import AwardsRecognition from '@/components/AwardsRecognition';
import DownloadableAssets from '@/components/DownloadableAssets';
import ShareBar from '@/components/ShareBar';
import { readingTime } from '@/lib/readingTime';

type Project = Tables<'projects'>;

const getIcon = (name: string): LucideIcon => {
  return (icons as Record<string, LucideIcon>)[name] || ChevronRight;
};

// Extract YouTube/Vimeo embed URL
const getEmbedUrl = (url: string): string | null => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollY = useScrollDepth();
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalRevealed, setPortalRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'videos' | 'preview'>('overview');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const portalOverlayRef = useRef<HTMLDivElement>(null);

  const gradient = (location.state as any)?.gradient || '';

  useEffect(() => {
    setMounted(false);
    setPortalRevealed(false);
    setActiveTab('overview');
    setLightboxIdx(null);
    window.scrollTo(0, 0);
    const fetchData = async () => {
      const [{ data: proj }, { data: all }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id!).single(),
        supabase.from('projects').select('*').order('display_order'),
      ]);
      setProject(proj);
      setAllProjects(all || []);
      setLoading(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMounted(true);
          if (gradient) {
            setTimeout(() => setPortalRevealed(true), 50);
          }
        });
      });
    };
    fetchData();
  }, [id]);

  // Lock body scroll + keyboard nav while lightbox open
  useEffect(() => {
    if (lightboxIdx === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      const len = (project?.gallery_images || []).length;
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight' && len > 1) setLightboxIdx((i) => ((i ?? 0) + 1) % len);
      if (e.key === 'ArrowLeft' && len > 1) setLightboxIdx((i) => ((i ?? 0) - 1 + len) % len);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxIdx, project]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl gradient-text animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="relative min-h-screen bg-background overflow-x-hidden">
        <FloatingOrbs />
        <Navbar />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl gradient-border p-12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
            <Link to="/" className="glow-button px-6 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = allProjects.findIndex((p) => p.id === id);
  const nextProject = allProjects[(currentIndex + 1) % allProjects.length];
  const prevProject = allProjects[(currentIndex - 1 + allProjects.length) % allProjects.length];
  const features = (project.key_features as any[]) || [];
  const gallery = project.gallery_images || [];
  const metrics = ((project as any).metrics as any[]) || [];
  const caseStudy = ((project as any).case_study as any) || {};
  const testimonials = ((project as any).testimonials as any[]) || [];
  const techRationale = ((project as any).tech_rationale as Record<string, string>) || {};
  const timeline = ((project as any).timeline as any[]) || [];
  const processGallery = ((project as any).process_gallery as any[]) || [];
  const relatedIds = ((project as any).related_project_ids as string[]) || [];
  const beforeAfter = ((project as any).before_after as any[]) || [];
  const faq = ((project as any).faq as any[]) || [];
  const pressLinks = ((project as any).press_links as any[]) || [];
    const videoUrls = (project as any).video_urls || [];
    const previewUrls = (project as any).preview_urls || [];
    const deliverables = ((project as any).deliverables as any[]) || [];
    const budget = ((project as any).budget as any) || {};
    const team = ((project as any).team as any[]) || [];
    const awards = ((project as any).awards as any[]) || [];
    const downloads = ((project as any).downloads as any[]) || [];
    const hasBudget = !!(budget.range || budget.model || budget.duration || budget.note);
    const readMins = readingTime(
      [project.description, caseStudy?.problem, caseStudy?.solution, caseStudy?.outcome]
        .filter(Boolean)
        .join(' '),
    );
    const resolvedGradient = resolveGradient(gradient);

    const tocItems = activeTab === 'overview' ? [
      { id: 'top', label: 'Overview' },
      ...(metrics.length ? [{ id: 'metrics', label: 'Impact' }] : []),
      ...(caseStudy?.problem || caseStudy?.solution ? [{ id: 'case-study', label: 'Case study' }] : []),
      ...(features.length ? [{ id: 'features', label: 'Features' }] : []),
      ...(deliverables.length ? [{ id: 'deliverables', label: 'Deliverables' }] : []),
      ...(gallery.length ? [{ id: 'gallery-preview', label: 'Gallery' }] : []),
      ...(timeline.length ? [{ id: 'timeline', label: 'Timeline' }] : []),
      ...(hasBudget ? [{ id: 'budget', label: 'Budget' }] : []),
      ...(testimonials.length ? [{ id: 'testimonials', label: 'Testimonials' }] : []),
      ...(faq.length ? [{ id: 'faq', label: 'FAQ' }] : []),
      { id: 'inquiry', label: 'Start a project' },
    ] : [];

  // Build available tabs
  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: null },
  ];
  if (gallery.length > 0) tabs.push({ key: 'gallery', label: 'Gallery', icon: <Image size={14} />, count: gallery.length });
  if (videoUrls.length > 0) tabs.push({ key: 'videos', label: 'Videos', icon: <Play size={14} />, count: videoUrls.length });
  if (previewUrls.length > 0) tabs.push({ key: 'preview', label: 'Live Preview', icon: <Monitor size={14} />, count: previewUrls.length });

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Portal entrance overlay */}
      {gradient && (
        <div
          ref={portalOverlayRef}
          className={`fixed inset-0 z-[100] ${portalRevealed ? 'portal-entrance' : ''}`}
          style={{ background: resolvedGradient, pointerEvents: 'none' }}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-10" onClick={() => setLightboxIdx(null)} aria-label="Close">
            <X size={28} />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + gallery.length) % gallery.length); }}
                aria-label="Previous image"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % gallery.length); }}
                aria-label="Next image"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <img src={gallery[lightboxIdx]} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scale-in" onClick={(e) => e.stopPropagation()} />
          {gallery.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {gallery.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === lightboxIdx ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/60'}`}
                  aria-label={`Go to image ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <CustomCursor />
      <FloatingOrbs />
      <StarField />
      <Navbar />

      <main className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <ProjectTOC items={tocItems} />
        {/* Banner with parallax */}
        <section id="top" className="relative pt-24 pb-0">
          <div className="max-w-6xl mx-auto px-6">
            <button onClick={() => navigate('/')} className="glass rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-2 mb-8 hover:-translate-x-1 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Work
            </button>

            <div
              className="w-full rounded-2xl overflow-hidden"
              style={{ transform: `translate3d(0, ${scrollY * 0.1}px, 0)`, willChange: 'transform' }}
            >
              {(project as any).hero_video_url ? (
                <ShowReel url={(project as any).hero_video_url} poster={project.thumbnail_url || undefined} />
              ) : (
                <div className="w-full h-64 md:h-80 lg:h-96 glass gradient-border flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-2xl">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Image size={64} className="text-muted-foreground/30 mx-auto mb-3" />
                      <span className="text-sm text-muted-foreground/40">Project Banner</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Title & Meta */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <span className="text-xs font-mono text-accent tracking-wider mb-3 block">{project.category}</span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">{project.title}</h1>
              <div className="mb-6"><ShareBar title={project.title} readingMinutes={readMins} /></div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">{project.description}</p>

              <div className="flex flex-wrap gap-3 mb-8">
                {(project.tech_stack || []).map((t, i) => (
                  <span key={t} className={`px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 transition-all duration-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                    style={{ transitionDelay: `${400 + i * 60}ms` }}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                {project.live_demo_url && (
                  <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer" className="glow-button px-8 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center gap-2">
                    <ExternalLink size={16} /> Live Demo
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="glass rounded-lg px-8 py-3 text-foreground font-semibold text-sm gradient-border inline-flex items-center gap-2 hover:bg-muted/30 transition-all hover-glow">
                    <Github size={16} /> View Source
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Tabs */}
        {tabs.length > 1 && (
          <section className="pb-4">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
                <div className="flex gap-1 p-1 glass rounded-xl gradient-border w-max sm:w-fit">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'bg-primary/20 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted/30">{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Overview Tab — Metrics */}
        {activeTab === 'overview' && <div id="metrics"><MetricCounters metrics={metrics} /></div>}

        {/* Overview Tab — Case study */}
        {activeTab === 'overview' && <div id="case-study"><CaseStudySection data={caseStudy} /></div>}

        {/* Overview Tab — Features */}
        {activeTab === 'overview' && features.length > 0 && (
          <section id="features" className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className={`text-2xl md:text-3xl font-bold mb-10 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                Key <span className="gradient-text">Features</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {features.map((feature: any, i: number) => {
                  const Icon = getIcon(feature.icon);
                  return (
                    <div key={i} className={`glass rounded-xl gradient-border p-6 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-500 group ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                      style={{ transitionDelay: `${500 + i * 100}ms` }}>
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Overview Tab — Deliverables */}
        {activeTab === 'overview' && <Deliverables items={deliverables} />}

        {/* Overview Tab — Gallery Preview (show first few) */}
        {activeTab === 'overview' && gallery.length > 0 && (
          <section id="gallery-preview" className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Screenshots & <span className="gradient-text">Gallery</span>
                </h2>
                {gallery.length > 4 && (
                  <button onClick={() => setActiveTab('gallery')} className="text-sm text-primary hover:underline flex items-center gap-1">
                    View all {gallery.length} <ChevronRight size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gallery.slice(0, 6).map((url, i) => (
                  <div key={i} className="glass rounded-xl gradient-border overflow-hidden aspect-video hover:scale-[1.02] transition-all duration-500 group cursor-pointer"
                    style={{ perspective: '600px' }} onClick={() => setLightboxIdx(i)}>
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Overview Tab — Storytelling */}
        {activeTab === 'overview' && <TechRationale techStack={project.tech_stack || []} rationale={techRationale} />}
        {activeTab === 'overview' && <div id="timeline"><ProjectTimeline entries={timeline} /></div>}
        {activeTab === 'overview' && <BeforeAfter items={beforeAfter} />}
        {activeTab === 'overview' && <ProcessGallery items={processGallery} />}
        {activeTab === 'overview' && <BudgetTransparency data={budget} />}
        {activeTab === 'overview' && <TeamCredits items={team} />}
        {activeTab === 'overview' && <AwardsRecognition items={awards} />}
        {activeTab === 'overview' && <DownloadableAssets items={downloads} />}
        {activeTab === 'overview' && <div id="testimonials"><Testimonials items={testimonials} /></div>}
        {activeTab === 'overview' && <PressLinks items={pressLinks} />}
        {activeTab === 'overview' && <div id="faq"><ProjectFAQ items={faq} /></div>}
        {activeTab === 'overview' && <InquiryCTA projectTitle={project.title} />}

        {/* Gallery Tab — Full gallery */}
        {activeTab === 'gallery' && (
          <section className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-10">
                Full <span className="gradient-text">Gallery</span>
                <span className="text-sm font-normal text-muted-foreground ml-3">{gallery.length} images</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gallery.map((url, i) => (
                  <div key={i} className="glass rounded-xl gradient-border overflow-hidden aspect-video hover:scale-[1.02] transition-all duration-500 group cursor-pointer"
                    onClick={() => setLightboxIdx(i)}>
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <section className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-10">
                Project <span className="gradient-text">Videos</span>
              </h2>
              <VideoGallery urls={videoUrls} />
            </div>
          </section>
        )}

        {/* Live Preview Tab */}
        {activeTab === 'preview' && (
          <section className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-10">
                Live <span className="gradient-text">Preview</span>
              </h2>
              <div className="space-y-8">
                {previewUrls.map((url: string, i: number) => (
                  <PreviewSandbox key={i} url={url} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related projects */}
        <RelatedProjects current={project} all={allProjects} selectedIds={relatedIds} />

        {/* Prev / Next Nav */}
        {allProjects.length > 1 && nextProject && prevProject && (
          <section className="py-16 border-t border-border">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex flex-col sm:flex-row justify-between gap-6">
                <Link to={`/project/${prevProject.id}`} className="glass rounded-xl gradient-border p-6 flex-1 group hover:shadow-lg hover:shadow-primary/10 transition-all hover:-translate-y-1">
                  <span className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><ArrowLeft size={12} /> Previous</span>
                  <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{prevProject.title}</span>
                </Link>
                <Link to={`/project/${nextProject.id}`} className="glass rounded-xl gradient-border p-6 flex-1 text-right group hover:shadow-lg hover:shadow-primary/10 transition-all hover:-translate-y-1">
                  <span className="text-xs text-muted-foreground mb-2 block flex items-center justify-end gap-1">Next <ChevronRight size={12} /></span>
                  <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{nextProject.title}</span>
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProjectDetail;
