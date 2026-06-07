import { Briefcase, Calendar, Clock, Target, Lightbulb, TrendingUp, User } from 'lucide-react';

export interface CaseStudy {
  problem?: string;
  solution?: string;
  outcome?: string;
  role?: string;
  client?: string;
  year?: string;
  duration?: string;
}

interface Props {
  data: CaseStudy;
}

const META_ICONS = {
  role: User,
  client: Briefcase,
  year: Calendar,
  duration: Clock,
};

const NARRATIVE_BLOCKS: { key: keyof CaseStudy; label: string; Icon: any; accent: string }[] = [
  { key: 'problem', label: 'The Problem', Icon: Target, accent: 'text-rose-300' },
  { key: 'solution', label: 'The Solution', Icon: Lightbulb, accent: 'text-primary' },
  { key: 'outcome', label: 'The Outcome', Icon: TrendingUp, accent: 'text-accent' },
];

const hasContent = (d: CaseStudy) =>
  !!(d.problem || d.solution || d.outcome || d.role || d.client || d.year || d.duration);

const CaseStudySection = ({ data }: Props) => {
  if (!data || !hasContent(data)) return null;

  const meta = (['role', 'client', 'year', 'duration'] as const).filter((k) => data[k]);

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-accent/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent/80">Case study</span>
        </div>

        {meta.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {meta.map((k) => {
              const Icon = META_ICONS[k];
              return (
                <div key={k} className="glass rounded-xl gradient-border p-4">
                  <div className="flex items-center gap-2 text-foreground/40 mb-1">
                    <Icon size={12} />
                    <span className="text-[10px] font-mono uppercase tracking-widest">{k}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{data[k]}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {NARRATIVE_BLOCKS.filter((b) => data[b.key]).map(({ key, label, Icon, accent }) => (
            <div key={key} className="glass rounded-xl gradient-border p-6 hover:-translate-y-1 transition-transform duration-500">
              <div className={`flex items-center gap-2 mb-3 ${accent}`}>
                <Icon size={16} />
                <span className="text-xs font-mono uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">{data[key]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudySection;
