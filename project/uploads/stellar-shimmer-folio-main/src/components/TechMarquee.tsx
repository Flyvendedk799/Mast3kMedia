const items = [
  'React', '·', 'TypeScript', '·', 'Next.js', '·', 'Tailwind', '·',
  'Three.js', '·', 'Node', '·', 'PostgreSQL', '·', 'Supabase', '·',
  'Framer', '·', 'Figma', '·', 'GSAP', '·', 'WebGL', '·', 'Vite',
];

const Row = () => (
  <div className="flex shrink-0 items-center gap-10 pr-10">
    {items.map((it, i) => (
      <span
        key={i}
        className={
          it === '·'
            ? 'text-primary/40 text-xl'
            : 'font-heading font-extrabold text-2xl md:text-4xl tracking-tight text-foreground/15 hover:text-foreground/60 transition-colors duration-300 cursor-default'
        }
        style={{ letterSpacing: '-0.02em' }}
      >
        {it}
      </span>
    ))}
  </div>
);

const TechMarquee = () => {
  return (
    <section
      aria-label="Technologies"
      className="relative py-12 overflow-hidden border-y border-white/[0.04]"
      style={{
        background:
          'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.025) 50%, transparent 100%)',
      }}
    >
      {/* edge fades */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10"
        style={{ background: 'linear-gradient(90deg, hsl(var(--background)) 0%, transparent 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10"
        style={{ background: 'linear-gradient(-90deg, hsl(var(--background)) 0%, transparent 100%)' }}
      />

      <div className="flex" style={{ animation: 'marquee 40s linear infinite' }}>
        <Row />
        <Row />
        <Row />
      </div>
    </section>
  );
};

export default TechMarquee;
