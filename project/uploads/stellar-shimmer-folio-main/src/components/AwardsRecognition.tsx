import { Award } from 'lucide-react';

type AwardItem = { title: string; org?: string; year?: string; url?: string };

const AwardsRecognition = ({ items }: { items: AwardItem[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <section id="awards" className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-10">
          Awards & <span className="gradient-text">recognition</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a, i) => {
            const card = (
              <div className="relative glass rounded-xl gradient-border p-5 flex items-start gap-4 h-full hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/10 transition-all duration-500">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/25 to-primary/20 flex items-center justify-center shrink-0">
                  <Award size={18} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[a.org, a.year].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            );
            return a.url ? (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">{card}</a>
            ) : (
              <div key={i}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AwardsRecognition;
