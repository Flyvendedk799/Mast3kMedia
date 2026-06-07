import { Lightbulb } from 'lucide-react';

interface TechRationaleProps {
  techStack: string[];
  rationale: Record<string, string>;
}

const TechRationale = ({ techStack, rationale }: TechRationaleProps) => {
  const entries = (techStack || []).filter((t) => rationale?.[t]?.trim());
  if (entries.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Why this <span className="gradient-text">stack</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
          The reasoning behind each technology choice.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {entries.map((tech) => (
            <div
              key={tech}
              className="glass rounded-xl gradient-border p-5 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-500 group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Lightbulb size={16} className="text-primary" />
                </div>
                <span className="text-base font-semibold text-foreground">{tech}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{rationale[tech]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechRationale;
