import Reveal from '@/components/Reveal';

const logos = [
  'Nordsk',
  'Hyperloop',
  'Voltaic',
  'Northwind',
  'Ember & Co',
  'Mercato',
  'Atlas Labs',
  'Helsinki Type',
  'Praxis',
  'Lumen',
];

const LogoMarquee = () => {
  return (
    <section className="relative py-16 overflow-hidden border-y border-white/[0.04]">
      <Reveal variant="fade">
        <p className="text-center text-[10px] tracking-[0.32em] uppercase text-foreground/35 mb-8">
          Trusted by teams shipping the next thing
        </p>
      </Reveal>

      <div className="relative">
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />

        <div className="flex gap-16 whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite', width: 'max-content' }}>
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <span
              key={i}
              className="font-heading font-bold text-2xl md:text-3xl text-foreground/30 hover:text-foreground/70 transition-colors duration-300 tracking-tight flex-shrink-0"
              style={{ letterSpacing: '-0.02em' }}
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoMarquee;
