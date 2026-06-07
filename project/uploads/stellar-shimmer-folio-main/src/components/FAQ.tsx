import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

const faqs = [
  {
    q: 'How quickly can we start?',
    a: 'Most engagements kick off within 1–2 weeks of a signed proposal. Sprints can sometimes start the same week if a slot is open.',
  },
  {
    q: 'Do you work fixed-price or time & materials?',
    a: 'Sprints are fixed scope, fixed price. Product engagements use a monthly retainer with a clear backlog you control week to week.',
  },
  {
    q: 'Who actually does the work?',
    a: 'Senior designers and engineers — no juniors, no agencies-of-agencies. You work directly with the people writing the code.',
  },
  {
    q: 'Do we own the code and design files?',
    a: 'Yes, fully. Everything ships into your GitHub and Figma. We hand over a codebase your team can extend on day one.',
  },
  {
    q: 'Can you embed with our existing team?',
    a: 'Absolutely — our Embed tier is designed exactly for that. We slot into your Linear, Slack, and ceremonies.',
  },
  {
    q: 'What if it doesn\u2019t work out?',
    a: 'Sprints have a money-back guarantee for the first 5 days. Retainers can be paused or ended with 30 days notice. No long lock-ins.',
  },
];

const Item = ({ q, a, open, onClick, i }: { q: string; a: string; open: boolean; onClick: () => void; i: number }) => (
  <Reveal variant="up" delay={i * 60}>
    <div className="glass rounded-xl gradient-border overflow-hidden">
      <button
        onClick={onClick}
        className="w-full text-left flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm md:text-base font-semibold text-foreground">{q}</span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  </Reveal>
);

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-[120px] px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">FAQ</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>

        <ShimmerHeading
          text="Questions, before"
          accent="we get started"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-12 text-white"
        />

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Item key={f.q} {...f} i={i} open={open === i} onClick={() => setOpen(open === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
