import { useEffect, useState } from 'react';

type Item = { id: string; label: string };

const ProjectTOC = ({ items }: { items: Item[] }) => {
  const [active, setActive] = useState<string>(items[0]?.id || '');

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <aside className="hidden xl:block fixed top-1/2 right-6 -translate-y-1/2 z-30 pointer-events-none">
      <nav className="glass rounded-2xl gradient-border p-3 pointer-events-auto max-w-[200px]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-2">On this page</div>
        <ul className="space-y-0.5">
          {items.map((it) => {
            const isActive = active === it.id;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  onClick={(e) => onClick(e, it.id)}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
                >
                  <span
                    className={`h-px transition-all ${
                      isActive ? 'w-4 bg-primary' : 'w-2 bg-muted-foreground/40 group-hover:w-3'
                    }`}
                  />
                  <span className="truncate">{it.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default ProjectTOC;
