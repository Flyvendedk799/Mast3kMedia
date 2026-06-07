import { Download, FileText } from 'lucide-react';

type Asset = { label: string; url: string; kind?: string };

const DownloadableAssets = ({ items }: { items: Asset[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <section id="downloads" className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Downloadable <span className="gradient-text">assets</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
          Take the artefacts with you — case studies, brand books, decks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="glass rounded-xl gradient-border p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{a.label}</h3>
                {a.kind && <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{a.kind}</p>}
              </div>
              <Download size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DownloadableAssets;
