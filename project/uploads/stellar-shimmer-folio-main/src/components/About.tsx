import { useRef, useCallback, useEffect, useState } from 'react';
import { Code2, Palette, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Reveal from '@/components/Reveal';
import ShimmerHeading from '@/components/ShimmerHeading';

const fallbackBio = "Mast3kMedia is a small, senior team building beautiful, performant software end-to-end. We pair strategic design with rigorous engineering to turn ambitious ideas into polished products that ship.";
const fallbackSkills = ['Web Apps', 'Product Engineering', 'Design Systems', 'Cloud Infrastructure', 'Brand & Identity', 'AI Features'];

const frontendSkills = ['Web Apps', 'Marketing Sites', 'Design Systems', 'Brand & Identity', 'Motion & 3D', 'Prototyping'];
const backendSkills = ['Product Engineering', 'APIs & Integrations', 'Cloud Infrastructure', 'Data & Analytics', 'AI Features', 'DevOps & CI/CD'];

const traits = [
  { icon: Code2, label: 'Engineering' },
  { icon: Palette, label: 'Design' },
  { icon: Rocket, label: 'Strategy' },
];

const SkillChip = ({ name, category }: { name: string; category: 'frontend' | 'backend' }) => {
  const hoverBg = category === 'frontend' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.08)';
  const hoverShadow = category === 'frontend'
    ? '0 0 12px rgba(99,102,241,0.4)'
    : '0 0 12px rgba(245,158,11,0.35)';
  const hoverBorder = category === 'frontend'
    ? 'rgba(99,102,241,0.4)'
    : 'rgba(245,158,11,0.4)';

  return (
    <span
      className="px-4 py-2 rounded-full text-sm font-medium text-foreground/70 bg-white/[0.04] border border-white/8 backdrop-blur-sm cursor-default"
      style={{ transition: 'all 200ms ease' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = hoverBg;
        el.style.boxShadow = hoverShadow;
        el.style.borderColor = hoverBorder;
        el.style.color = 'rgba(255,255,255,0.9)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = 'rgba(255,255,255,0.04)';
        el.style.boxShadow = 'none';
        el.style.borderColor = 'rgba(255,255,255,0.08)';
        el.style.color = '';
      }}
    >
      {name}
    </span>
  );
};

const About = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [bio, setBio] = useState(fallbackBio);
  const [profileImage, setProfileImage] = useState('');
  const [skills, setSkills] = useState<string[]>(fallbackSkills);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('about_content').select('*').limit(1).single();
      if (data) {
        setBio(data.bio || fallbackBio);
        setProfileImage(data.profile_image_url || '');
        const s = data.skills as string[];
        setSkills(s && s.length > 0 ? s : fallbackSkills);
      }
    };
    fetchData();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  const firstSentenceEnd = bio.indexOf('. ');
  const leadText = firstSentenceEnd > 0 ? bio.slice(0, firstSentenceEnd + 1) : bio;
  const restText = firstSentenceEnd > 0 ? bio.slice(firstSentenceEnd + 2) : '';

  const dbSkillSet = new Set(skills.map(s => s.toLowerCase()));
  const activeFrontend = frontendSkills.filter(s => {
    const lower = s.toLowerCase();
    return dbSkillSet.has(lower) || fallbackSkills.map(f => f.toLowerCase()).includes(lower) || frontendSkills.includes(s);
  });
  const activeBackend = backendSkills.filter(s => {
    const lower = s.toLowerCase();
    return dbSkillSet.has(lower) || fallbackSkills.map(f => f.toLowerCase()).includes(lower) || backendSkills.includes(s);
  });

  return (
    <section id="about" className="relative py-[120px] px-6">
      {/* Decorative radial gradient */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '800px',
          height: '800px',
          top: '10%',
          left: '-15%',
          background: 'radial-gradient(circle, hsl(239 84% 67% / 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-5xl mx-auto">
        <Reveal variant="fade" className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <span className="text-xs font-mono text-foreground/30 tracking-widest uppercase">The Studio</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </Reveal>
        <ShimmerHeading
          text="About"
          accent="Us"
          className="text-3xl md:text-4xl font-heading font-extrabold mb-16 text-white"
        />

        <Reveal variant="up" delay={160} duration={900} distance={36}>
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="relative rounded-2xl border border-white/5 bg-white/[0.025] backdrop-blur-xl p-8 md:p-12 card-spotlight gradient-border-animated overflow-hidden"
          style={{ borderLeft: '2px solid rgba(99,102,241,0.3)' }}
        >
          {/* Top-left corner radial glow */}
          <div
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: 300,
              height: 300,
              background: 'radial-gradient(circle at top left, rgba(99,102,241,0.05), transparent 70%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Two-column layout */}
          <div className="relative flex flex-col md:flex-row gap-12 md:gap-16">
            {/* Left column — Avatar & traits */}
            <div className="md:w-[40%] flex flex-col items-center">
              {/* Avatar with gradient ring + pulsing outer ring */}
              <div className="relative group" style={{ animation: 'about-float 6s ease-in-out infinite' }}>
                {/* Pulsing outer ring */}
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: '-8px',
                    border: '1.5px solid rgba(245,158,11,0.4)',
                    animation: 'avatar-pulse 3s ease-in-out infinite',
                  }}
                />
                <div
                  className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(43 96% 56%))',
                    filter: 'blur(16px)',
                  }}
                />
                <div
                  className="relative w-[140px] h-[140px] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    padding: '3px',
                    background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(43 96% 56%))',
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: profileImage ? undefined : 'hsl(235 30% 8%)' }}
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="Mast3kMedia" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-heading font-bold gradient-text">M3</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Trait badges */}
              <div className="flex items-center gap-4 mt-8">
                {traits.map((trait) => (
                  <div key={trait.label} className="flex flex-col items-center gap-1.5 group/trait cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center text-foreground/40 group-hover/trait:text-primary group-hover/trait:border-primary/30 group-hover/trait:bg-primary/[0.06] transition-all duration-300">
                      <trait.icon size={28} />
                    </div>
                    <span className="relative text-[11px] font-medium text-foreground/30 group-hover/trait:text-foreground/50 transition-colors tracking-wide uppercase after:content-[''] after:absolute after:bottom-[-2px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[1.5px] after:bg-primary after:transition-all after:duration-200 group-hover/trait:after:w-full">
                      {trait.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — Bio text */}
            <div className="md:w-[60%] flex flex-col justify-center">
              <p className="text-[20px] font-medium text-foreground/70 leading-relaxed mb-4">
                {leadText}
              </p>
              {restText && (
                <p className="text-foreground/50 leading-relaxed whitespace-pre-line">
                  {restText}
                </p>
              )}
            </div>
          </div>

          {/* Skills grid */}
          <div className="relative mt-12 pt-10 border-t border-white/5">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-heading font-semibold uppercase tracking-wider mb-4" style={{ color: '#6366F1' }}>
                  Design & Interface
                  <span className="block mt-1.5 w-6 h-[2px] rounded-full" style={{ background: '#6366F1' }} />
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {activeFrontend.map((skill) => (
                    <SkillChip key={skill} name={skill} category="frontend" />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-heading font-semibold uppercase tracking-wider mb-4" style={{ color: '#F59E0B' }}>
                  Engineering & Platform
                  <span className="block mt-1.5 w-6 h-[2px] rounded-full" style={{ background: '#F59E0B' }} />
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {activeBackend.map((skill) => (
                    <SkillChip key={skill} name={skill} category="backend" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </Reveal>
      </div>

      <style>{`
        @keyframes about-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes avatar-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </section>
  );
};

export default About;
