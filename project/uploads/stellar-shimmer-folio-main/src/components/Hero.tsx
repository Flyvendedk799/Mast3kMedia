import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUpRight, FolderOpen } from 'lucide-react';
import StarField from '@/components/StarField';
import { useMagnetic } from '@/hooks/useMagnetic';

const roles = [
  'Digital Product Studio',
  'Engineering · Design',
  'Interfaces & Systems',
  'Built in Denmark',
];

const AnimatedCounter = ({ target, label, delay }: { target: number; label: string; delay: number }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    const steps = 60;
    const inc = target / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        setCount(target);
        clearInterval(id);
      } else {
        setCount(Math.floor(cur));
      }
    }, duration / steps);
    return () => clearInterval(id);
  }, [started, target]);

  return (
    <div className="cursor-default">
      <div className="font-heading font-bold text-foreground tabular-nums" style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)', lineHeight: 1 }}>
        {count}
        <span className="text-primary">+</span>
      </div>
      <div className="text-[10px] text-foreground/40 mt-2 tracking-[0.18em] uppercase">{label}</div>
    </div>
  );
};

const Hero = () => {
  const [roleIndex, setRoleIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const primaryCta = useMagnetic<HTMLButtonElement>(0.25);
  const secondaryCta = useMagnetic<HTMLButtonElement>(0.2);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const current = roles[roleIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), 70);
      } else {
        timeout = setTimeout(() => setDeleting(true), 2200);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), 32);
      } else {
        setDeleting(false);
        setRoleIndex((i) => (i + 1) % roles.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, roleIndex]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden px-6 md:px-12 lg:px-16">
      <StarField />
      <div className="absolute inset-0 grid-bg grid-bg-fade pointer-events-none opacity-60" />
      <div className="aurora" style={{ top: '5%' }} />

      {/* Vertical edge accents */}
      <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-primary/15 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-accent/15 to-transparent pointer-events-none" />

      <div className={`relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Eyebrow */}
        <div className={`flex items-center gap-3 mb-10 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="h-px w-10 bg-foreground/30" />
          <span className="text-[10px] tracking-[0.32em] uppercase text-foreground/50">Studio · Est. 2026</span>
          <span className="h-px w-10 bg-foreground/30" />
        </div>

        {/* Status */}
        <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-sm mb-7 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[11px] text-foreground/55 tracking-wide">Booking new engagements — Q3</span>
        </div>

        {/* Name — large editorial */}
        <h1
          className={`font-heading font-extrabold mb-6 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{
            fontSize: 'clamp(4rem, 11vw, 10rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.05em',
            color: 'hsl(var(--foreground))',
          }}
        >
          Mast3k{' '}
          <span
            style={{
              background: 'linear-gradient(120deg, hsl(239, 84%, 72%) 0%, hsl(38, 92%, 60%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Media.
          </span>
        </h1>

        {/* Typewriter role */}
        <div className={`flex items-center justify-center gap-3 mb-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="h-px w-6 bg-primary/60" />
          <span className="text-base md:text-lg font-medium text-foreground/75 font-mono">{text}</span>
          <span className="w-[2px] h-5 bg-primary" style={{ animation: 'typewriter-blink 1s step-end infinite' }} />
          <span className="h-px w-6 bg-primary/60" />
        </div>

        {/* Bio */}
        <p className={`max-w-2xl mb-12 text-base md:text-lg leading-relaxed text-foreground/60 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          A digital product studio designing and engineering production software for ambitious teams — pairing rigorous craft with a meticulous eye for interface and motion.
        </p>

        {/* Stats */}
        <div className={`flex items-center gap-12 md:gap-16 mb-12 pb-10 border-b border-white/[0.06] transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <AnimatedCounter target={5} label="Years" delay={900} />
          <AnimatedCounter target={30} label="Shipped" delay={1100} />
          <AnimatedCounter target={15} label="Clients" delay={1300} />
        </div>

        {/* CTAs */}
        <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-700 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            ref={primaryCta}
            onClick={() => document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' })}
            className="group relative px-7 py-3.5 rounded-full font-medium text-sm tracking-wide flex items-center justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10"
            style={{ transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease', willChange: 'transform' }}
          >
            <FolderOpen size={16} />
            Selected Work
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          <button
            ref={secondaryCta}
            onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
            className="group rounded-full px-7 py-3.5 text-foreground/80 font-medium text-sm tracking-wide border border-white/12 hover:bg-white/[0.04] hover:text-foreground hover:border-white/25 flex items-center justify-center gap-2"
            style={{ transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease', willChange: 'transform' }}
          >
            How we work
            <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </button>
          <a
            href="https://cal.com/mast3kmedia/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-full px-7 py-3.5 text-foreground/70 hover:text-foreground font-medium text-sm tracking-wide flex items-center justify-center gap-2 transition-colors"
          >
            Book a call
            <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' })}
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/30 hover:text-foreground/70 transition-all z-10 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Scroll to about"
      >
        <span className="text-[10px] tracking-[0.28em] uppercase">Scroll</span>
        <ArrowDown size={16} className="animate-bounce" />
      </button>
    </section>
  );
};

export default Hero;
