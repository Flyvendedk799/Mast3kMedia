import { Circle } from 'lucide-react';

export interface TimelineEntry {
  date?: string;
  title: string;
  description?: string;
}

interface ProjectTimelineProps {
  entries: TimelineEntry[];
}

const ProjectTimeline = ({ entries }: ProjectTimelineProps) => {
  if (!entries?.length) return null;

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-10">
          Project <span className="gradient-text">timeline</span>
        </h2>
        <div className="relative max-w-3xl">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-primary/15 to-transparent" />
          <ol className="space-y-8">
            {entries.map((entry, i) => (
              <li key={i} className="relative pl-12 group">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border border-primary/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Circle size={8} className="text-primary fill-primary" />
                </div>
                {entry.date && (
                  <div className="text-xs font-mono uppercase tracking-wider text-accent mb-1">{entry.date}</div>
                )}
                <h3 className="text-base font-semibold text-foreground mb-1">{entry.title}</h3>
                {entry.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ProjectTimeline;
