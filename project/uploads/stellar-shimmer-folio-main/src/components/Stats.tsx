import Reveal from '@/components/Reveal';

const stats = [
  { value: '40+', label: 'Products shipped' },
  { value: '€12M+', label: 'MRR generated for clients' },
  { value: '4.9 / 5', label: 'Avg. client NPS' },
  { value: '< 14 days', label: 'Average time to MVP' },
];

const Stats = () => (
  <section className="relative py-20 px-6">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {stats.map((s, i) => (
          <Reveal key={s.label} variant="up" delay={i * 80}>
            <div className="glass rounded-2xl gradient-border p-6 md:p-7 text-center hover:-translate-y-1 transition-transform duration-500">
              <div className="font-heading font-extrabold text-3xl md:text-4xl text-foreground stat-glow tabular-nums">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider mt-2">
                {s.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Stats;
