type Member = { name: string; role?: string; avatar_url?: string; link?: string };

const initials = (n: string) =>
  n.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const TeamCredits = ({ items }: { items: Member[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <section id="team" className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          The <span className="gradient-text">team</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-2xl">
          The people behind this engagement.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m, i) => {
            const inner = (
              <div className="glass rounded-xl gradient-border p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 transition-all duration-500 h-full">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name} className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                    {initials(m.name || '?')}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{m.name}</h3>
                  {m.role && <p className="text-xs text-muted-foreground truncate">{m.role}</p>}
                </div>
              </div>
            );
            return m.link ? (
              <a key={i} href={m.link} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <div key={i}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TeamCredits;
