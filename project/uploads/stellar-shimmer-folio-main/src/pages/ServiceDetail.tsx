import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingOrbs from '@/components/FloatingOrbs';
import CustomCursor from '@/components/CustomCursor';
import { ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { getTier, tiers } from '@/data/serviceTiers';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const tier = getTier(slug);
  const [samples, setSamples] = useState<Project[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!tier) return;
    window.scrollTo(0, 0);
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('display_order')
        .limit(3);
      setSamples(data || []);
    })();
  }, [tier]);

  if (!tier) return <Navigate to="/#services" replace />;

  const Icon = tier.icon;
  const otherTiers = tiers.filter((t) => t.slug !== tier.slug);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay">
      <CustomCursor />
      <FloatingOrbs />
      <Navbar />

      <main className="relative z-10">
        <section className="pt-32 pb-12 px-6">
          <div className="max-w-5xl mx-auto">
            <Link
              to="/#services"
              className="glass rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-2 mb-10 hover:-translate-x-1 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> All services
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  tier.featured ? 'bg-primary/15 text-primary' : 'bg-white/5 text-foreground/70'
                }`}
              >
                <Icon size={24} />
              </div>
              <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                {tier.cadence}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-heading font-extrabold text-foreground mb-6 leading-tight">
              {tier.name}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-10 leading-relaxed">
              {tier.hero}
            </p>

            <div className="flex items-baseline gap-3 mb-10">
              <span className="font-heading font-extrabold text-5xl md:text-6xl gradient-text">{tier.price}</span>
              <span className="text-sm text-muted-foreground">{tier.cadence}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="https://cal.com/mast3kmedia/intro"
                target="_blank"
                rel="noopener noreferrer"
                className="glow-button px-7 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center gap-2"
              >
                Book a call <ArrowRight size={16} />
              </a>
              <Link
                to="/#contact"
                className="glass rounded-lg px-7 py-3 text-foreground font-semibold text-sm gradient-border inline-flex items-center gap-2 hover:bg-muted/30 transition-all"
              >
                Send a brief
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              What&apos;s <span className="gradient-text">included</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-10 max-w-2xl">Everything ships as part of the engagement — no add-ons.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {tier.includes.map((it, i) => (
                <div
                  key={i}
                  className="glass rounded-xl gradient-border p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <Check size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{it.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-10">
              Ideal <span className="gradient-text">for</span>
            </h2>
            <ul className="space-y-3 max-w-3xl">
              {tier.idealFor.map((line, i) => (
                <li
                  key={i}
                  className="glass rounded-xl gradient-border px-5 py-4 text-sm md:text-base text-foreground/85 flex items-start gap-3"
                >
                  <Check size={16} className="text-primary mt-1 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {samples.length > 0 && (
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-10">
                Recent <span className="gradient-text">work</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {samples.map((p) => (
                  <Link
                    key={p.id}
                    to={`/project/${p.id}`}
                    className="glass rounded-2xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
                  >
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                    <div className="p-4">
                      <div className="text-[10px] uppercase tracking-wider text-accent mb-1">{p.category}</div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {tier.faq.length > 0 && (
          <section className="py-20 px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-10">
                Common <span className="gradient-text">questions</span>
              </h2>
              <div className="space-y-3">
                {tier.faq.map((f, i) => (
                  <div key={i} className="glass rounded-xl gradient-border overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm font-semibold text-foreground">{f.q}</span>
                      <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-180 text-primary' : ''}`} />
                    </button>
                    <div className="grid transition-all duration-300" style={{ gridTemplateRows: openFaq === i ? '1fr' : '0fr' }}>
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative glass rounded-3xl gradient-border p-10 md:p-14 overflow-hidden text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to start your <span className="gradient-text">{tier.name}</span>?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Book a 30-minute call. We&apos;ll scope, price, and have a proposal in your inbox within one business day.
                </p>
                <a
                  href="https://cal.com/mast3kmedia/intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glow-button px-7 py-3 rounded-lg text-primary-foreground font-semibold text-sm inline-flex items-center gap-2"
                >
                  Book a call <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-border px-6">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-6">Other engagements</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {otherTiers.map((t) => {
                const TI = t.icon;
                return (
                  <Link
                    key={t.slug}
                    to={`/services/${t.slug}`}
                    className="glass rounded-xl gradient-border p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 text-foreground/70 flex items-center justify-center shrink-0">
                      <TI size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{t.tagline}</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceDetail;
