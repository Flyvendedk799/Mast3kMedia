import { ExternalLink, Newspaper } from 'lucide-react';

export interface PressLinkItem {
  title: string;
  source?: string;
  url: string;
  date?: string;
}

interface PressLinksProps {
  items: PressLinkItem[];
}

const PressLinks = ({ items }: PressLinksProps) => {
  if (!items?.length) return null;
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          In the <span className="gradient-text">press</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">Articles, mentions, and external coverage.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((p, i) => (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl gradient-border p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 group flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Newspaper size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {p.source && <span className="text-[10px] font-mono uppercase tracking-wider text-accent">{p.source}</span>}
                  {p.date && <span className="text-[10px] text-muted-foreground/60">· {p.date}</span>}
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">{p.title}</h3>
              </div>
              <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PressLinks;
