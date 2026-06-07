import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

type Experience = Tables<'experiences'>;

const TimelineNode = ({ exp, index, total }: { exp: Experience; index: number; total: number }) => {
  const isLeft = index % 2 === 0;

  const cardContent = (
    <>
      <span
        className="inline-block mb-2 font-mono"
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#F59E0B',
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)',
          padding: '4px 12px',
          borderRadius: 20,
        }}
      >
        {exp.period}
      </span>
      <h3 className="text-lg font-heading font-semibold text-white mb-1">{exp.role}</h3>
      <p className="text-sm mb-3" style={{ color: '#6366F1', fontWeight: 600 }}>{exp.company}</p>
      <p className="text-sm text-foreground/50 leading-relaxed">{exp.description}</p>
    </>
  );

  const cardClasses = "rounded-xl p-6 text-left transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_24px_hsl(239_84%_67%/0.08)] group-hover:bg-white/[0.04]";

  const accentBorder = isLeft
    ? { borderLeft: '3px solid #6366F1', boxShadow: 'inset 4px 0 12px rgba(99,102,241,0.1)' }
    : { borderRight: '3px solid #6366F1', boxShadow: 'inset -4px 0 12px rgba(99,102,241,0.1)' };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    ...accentBorder,
  };

  const dot = (
    <div className="relative">
      <div
        className="w-4 h-4 rounded-full bg-primary"
        style={{
          boxShadow: '0 0 0 4px rgba(99,102,241,0.2), 0 0 0 8px rgba(99,102,241,0.1), 0 0 20px rgba(99,102,241,0.4)',
          animation: 'timeline-dot-pulse 2.5s ease-in-out infinite',
        }}
      />
    </div>
  );

  return (
    <div className="relative flex md:items-center group">
      {/* Desktop */}
      <div className={`hidden md:flex w-full items-center ${isLeft ? '' : 'flex-row-reverse'}`}>
        <div className={`w-5/12 ${isLeft ? 'pr-8' : 'pl-8'}`}>
          <div className={cardClasses} style={cardStyle}>
            {cardContent}
          </div>
        </div>
        <div className="w-2/12 flex justify-center relative">
          {dot}
        </div>
        <div className="w-5/12" />
      </div>

      {/* Mobile */}
      <div className="md:hidden flex gap-4 w-full">
        <div className="flex flex-col items-center">
          {dot}
          {index < total - 1 && (
            <div
              className="flex-1"
              style={{
                width: 2,
                background: 'linear-gradient(to bottom, rgba(99,102,241,0.8), rgba(245,158,11,0.6), rgba(99,102,241,0.8))',
                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
              }}
            />
          )}
        </div>
        <div className={`${cardClasses} mb-6 flex-1`} style={{ ...cardStyle, borderLeft: '3px solid #6366F1', borderRight: undefined, boxShadow: 'inset 4px 0 12px rgba(99,102,241,0.1)' }}>
          {cardContent}
        </div>
      </div>
    </div>
  );
};

const ExperienceSection = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('experiences').select('*').order('display_order');
      if (data) setExperiences(data);
    };
    fetch();
  }, []);

  if (experiences.length === 0) return null;

  return (
    <section id="experience" className="relative py-[120px] px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">Track Record</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>
        <ShimmerHeading
          text="Selected"
          accent="Engagements"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-16 text-white"
        />

        <div className="relative">
          {/* Timeline line */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
            style={{
              width: 2,
              background: 'linear-gradient(to bottom, rgba(99,102,241,0.8), rgba(245,158,11,0.6) 50%, rgba(99,102,241,0.8))',
              boxShadow: '0 0 8px rgba(99,102,241,0.5)',
              filter: 'blur(0.5px)',
            }}
          />
          <div className="space-y-12 md:space-y-16">
            {experiences.map((exp, i) => (
              <Reveal key={exp.id} variant={i % 2 === 0 ? 'right' : 'left'} delay={i * 90} distance={40}>
                <TimelineNode exp={exp} index={i} total={experiences.length} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes timeline-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}</style>
    </section>
  );
};

export default ExperienceSection;
