export interface ProcessItem {
  url: string;
  caption?: string;
}

interface ProcessGalleryProps {
  items: ProcessItem[];
}

const ProcessGallery = ({ items }: ProcessGalleryProps) => {
  if (!items?.length) return null;

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Behind the <span className="gradient-text">process</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
          Sketches, iterations, and work-in-progress moments.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <figure
              key={i}
              className="glass rounded-xl gradient-border overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted/20">
                <img
                  src={item.url}
                  alt={item.caption || `Process ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              {item.caption && (
                <figcaption className="px-4 py-3 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessGallery;
