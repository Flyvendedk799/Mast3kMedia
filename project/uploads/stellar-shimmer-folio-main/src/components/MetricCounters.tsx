import { useEffect, useRef, useState } from 'react';

export interface Metric {
  label: string;
  value: string;       // e.g. "10000", "99.9", "3.2"
  prefix?: string;     // e.g. "$", "+"
  suffix?: string;     // e.g. "k", "%", "x", "ms"
}

interface Props {
  metrics: Metric[];
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const Counter = ({ metric, start }: { metric: Metric; start: boolean }) => {
  const target = parseFloat(metric.value);
  const isNumber = !isNaN(target);
  const [display, setDisplay] = useState<string>(isNumber ? '0' : metric.value);

  useEffect(() => {
    if (!start || !isNumber) {
      if (!isNumber) setDisplay(metric.value);
      return;
    }
    const duration = 1400;
    const t0 = performance.now();
    const decimals = (metric.value.split('.')[1] || '').length;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = target * easeOutCubic(p);
      setDisplay(decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString());
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, isNumber, metric.value]);

  return (
    <div className="text-center">
      <div className="text-3xl md:text-5xl font-heading font-extrabold gradient-text leading-none tabular-nums">
        {metric.prefix || ''}{display}{metric.suffix || ''}
      </div>
      <div className="text-xs md:text-sm font-mono uppercase tracking-widest text-foreground/50 mt-2">{metric.label}</div>
    </div>
  );
};

const MetricCounters = ({ metrics }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!metrics || metrics.length === 0) return null;

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className="glass rounded-2xl gradient-border p-8 md:p-12 grid gap-8"
          style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}
        >
          {metrics.map((m, i) => (
            <Counter key={i} metric={m} start={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricCounters;
