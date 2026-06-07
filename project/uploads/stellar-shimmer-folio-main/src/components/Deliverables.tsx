import { Check, icons } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Deliverable = { title: string; desc?: string; icon?: string };

const getIcon = (name?: string): LucideIcon => {
  if (!name) return Check;
  return (icons as Record<string, LucideIcon>)[name] || Check;
};

const Deliverables = ({ items }: { items: Deliverable[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <section className="py-16" id="deliverables">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          What was <span className="gradient-text">delivered</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">The full scope shipped as part of this engagement.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d, i) => {
            const Icon = getIcon(d.icon);
            return (
              <div
                key={i}
                className="glass rounded-xl gradient-border p-5 flex gap-4 items-start hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{d.title}</h3>
                  {d.desc && <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Deliverables;
