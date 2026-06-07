import { useEffect, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar_url?: string;
}

interface Props {
  items: Testimonial[];
}

const Testimonials = ({ items }: Props) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-primary/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">What people say</span>
        </div>

        <div className="relative glass rounded-2xl gradient-border p-8 md:p-12 overflow-hidden">
          <Quote size={56} className="absolute -top-2 -left-2 text-primary/10" />

          <div className="relative" style={{ minHeight: 160 }}>
            {items.map((t, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-all duration-500 flex flex-col justify-center"
                style={{
                  opacity: idx === i ? 1 : 0,
                  transform: idx === i ? 'translateY(0)' : 'translateY(8px)',
                  pointerEvents: idx === i ? 'auto' : 'none',
                }}
              >
                <p className="text-lg md:text-xl text-foreground/85 leading-relaxed font-medium mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.author} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold text-foreground">
                      {t.author?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.author}</p>
                    {t.role && <p className="text-xs text-foreground/50">{t.role}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <div className="flex gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-8 bg-primary' : 'w-1.5 bg-white/15 hover:bg-white/30'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
                  aria-label="Previous"
                  className="p-2 rounded-full glass border border-white/10 text-foreground/60 hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setIdx((i) => (i + 1) % items.length)}
                  aria-label="Next"
                  className="p-2 rounded-full glass border border-white/10 text-foreground/60 hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
