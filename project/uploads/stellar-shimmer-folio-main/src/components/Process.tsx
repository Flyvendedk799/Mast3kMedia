import { Compass, Pencil, Layers, Code2, Rocket } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

const steps = [
  { icon: Compass, title: 'Discover', desc: 'A 30-min call to map the goal, users, and constraints. No deck, no fluff.' },
  { icon: Pencil, title: 'Define', desc: 'We turn the brief into a tight scope, success metrics, and a delivery plan.' },
  { icon: Layers, title: 'Design', desc: 'Interactive prototypes in Figma — reviewed live, iterated daily.' },
  { icon: Code2, title: 'Build', desc: 'Senior engineers shipping weekly. Direct Slack + Linear access throughout.' },
  { icon: Rocket, title: 'Launch', desc: 'Production hardening, analytics, and a hand-off your team can extend.' },
];

const Process = () => (
  <section id="process" className="relative py-[120px] px-6">
    <div className="max-w-6xl mx-auto">
      <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
        <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Process</span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
      </Reveal>

      <ShimmerHeading
        text="From kickoff to"
        accent="launch in 5 steps"
        className="text-3xl md:text-4xl font-heading font-extrabold mb-6 text-white"
      />

      <Reveal variant="up" delay={140}>
        <p className="text-foreground/50 text-base md:text-lg text-center mb-16 max-w-2xl mx-auto">
          A predictable rhythm built for shipping — not for status meetings.
        </p>
      </Reveal>

      <div className="relative grid md:grid-cols-5 gap-4">
        <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title} variant="up" delay={120 + i * 90}>
              <div className="relative text-center">
                <div className="relative w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/15 border border-primary/30 flex items-center justify-center backdrop-blur-md">
                  <Icon size={20} className="text-primary" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-primary/40 text-[10px] font-mono text-primary flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed px-2">{s.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default Process;
