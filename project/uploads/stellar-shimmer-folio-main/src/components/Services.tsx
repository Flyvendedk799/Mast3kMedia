import { ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';
import { tiers } from '@/data/serviceTiers';





const Services = () => {
  return (
    <section id="services" className="relative py-[120px] px-6">
      <div
        className="absolute pointer-events-none"
        style={{
          width: '900px', height: '600px',
          top: '10%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, hsl(239 84% 67% / 0.07) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Engagements</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>

        <ShimmerHeading
          text="How we"
          accent="work together"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-6 text-white"
        />

        <Reveal variant="up" delay={140}>
          <p className="text-foreground/50 text-base md:text-lg text-center mb-16 max-w-2xl mx-auto">
            Three ways to bring the studio in — from a focused sprint to a long-running embedded team.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <Reveal key={tier.name} variant="up" delay={120 + i * 100}>
                <div
                  className={`group relative h-full rounded-2xl p-7 flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                    tier.featured
                      ? 'bg-gradient-to-b from-primary/[0.08] to-transparent border border-primary/30 shadow-[0_0_40px_hsl(239_84%_67%/0.12)]'
                      : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/15'
                  }`}
                  style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                  {tier.featured && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] tracking-[0.18em] uppercase font-semibold bg-gradient-to-r from-primary to-accent text-background">
                      Most picked
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        tier.featured ? 'bg-primary/15 text-primary' : 'bg-white/5 text-foreground/70'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] tracking-[0.18em] uppercase text-foreground/40">
                      {tier.cadence}
                    </span>
                  </div>

                  <h3 className="font-heading text-2xl font-bold mb-1 text-foreground">{tier.name}</h3>
                  <p className="text-sm text-foreground/55 mb-6 leading-relaxed">{tier.tagline}</p>

                  <div className="mb-6 pb-6 border-b border-white/[0.06]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-heading font-extrabold text-4xl text-foreground tabular-nums">
                        {tier.price}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/70">
                        <Check size={15} className={`mt-0.5 flex-shrink-0 ${tier.featured ? 'text-primary' : 'text-foreground/40'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/services/${tier.slug}`}
                    className={`group/btn w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                      tier.featured
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'border border-white/12 text-foreground/80 hover:bg-white/[0.04] hover:text-foreground hover:border-white/25'
                    }`}
                  >
                    {tier.cta}
                    <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal variant="fade" delay={500}>
          <p className="text-center text-xs text-foreground/35 mt-10 tracking-wide">
            All engagements start with a free 30-minute discovery call. No deck. No fluff.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Services;
