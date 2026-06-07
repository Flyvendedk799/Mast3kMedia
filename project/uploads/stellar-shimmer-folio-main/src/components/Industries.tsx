import { Cloud, Banknote, HeartPulse, ShoppingBag, Brain, Gamepad2 } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

const verticals = [
  { icon: Cloud, name: 'SaaS', note: 'Onboarding, dashboards, billing' },
  { icon: Banknote, name: 'Fintech', note: 'Compliance, KYC, transaction UX' },
  { icon: HeartPulse, name: 'Health', note: 'HIPAA-aware patient flows' },
  { icon: ShoppingBag, name: 'E-commerce', note: 'Headless storefronts, CRO' },
  { icon: Brain, name: 'AI', note: 'LLM tooling, RAG, chat surfaces' },
  { icon: Gamepad2, name: 'Consumer', note: 'Social, gaming, lifestyle apps' },
];

const Industries = () => (
  <section id="industries" className="relative py-[120px] px-6">
    <div className="max-w-6xl mx-auto">
      <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
        <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Industries</span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
      </Reveal>

      <ShimmerHeading
        text="Built for"
        accent="ambitious teams"
        className="text-3xl md:text-4xl font-heading font-extrabold mb-6 text-white"
      />

      <Reveal variant="up" delay={140}>
        <p className="text-foreground/50 text-base md:text-lg text-center mb-16 max-w-2xl mx-auto">
          We ship across categories — but always with the same opinion: small senior teams beat big juniors ones.
        </p>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {verticals.map((v, i) => {
          const Icon = v.icon;
          return (
            <Reveal key={v.name} variant="up" delay={100 + i * 70}>
              <div className="group relative h-full rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06] hover:border-primary/30 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-500"
                style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={20} />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">{v.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{v.note}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default Industries;
